from __future__ import annotations

import json
import os
import socket
import time
import urllib.error
import urllib.parse
import urllib.request

_STATUS: dict = {
    "provider": None,
    "model": None,
    "attempts": [],
}


def _reset_status() -> None:
    _STATUS.clear()
    _STATUS.update({"provider": None, "model": None, "attempts": []})


def _record(provider: str, model: str, ok: bool, reason: str | None = None) -> None:
    row = {"provider": provider, "model": model, "ok": ok}
    if reason:
        row["reason"] = reason[:220]
    _STATUS.setdefault("attempts", []).append(row)
    if ok:
        _STATUS["provider"] = provider
        _STATUS["model"] = model
    safe = f"AI provider {provider}/{model}: {'OK' if ok else 'failed'}"
    if reason:
        safe += f" - {reason[:180]}"
    print(safe)


def status() -> dict:
    return json.loads(json.dumps(_STATUS))


def _json_from_text(text: str) -> dict | None:
    text = (text or "").strip()
    if not text:
        return None
    if text.startswith("```"):
        text = text.strip("`").strip()
        if text.lower().startswith("json"):
            text = text[4:].lstrip()
    try:
        parsed = json.loads(text)
        return parsed if isinstance(parsed, dict) else None
    except Exception:
        pass
    decoder = json.JSONDecoder()
    for index, char in enumerate(text):
        if char != "{":
            continue
        try:
            parsed, _ = decoder.raw_decode(text[index:])
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            continue
    return None


def _request_json(url: str, body: dict, headers: dict[str, str], timeout: int) -> dict:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _gemini_text(payload: dict) -> str:
    chunks: list[str] = []
    for candidate in payload.get("candidates", []) or []:
        content = candidate.get("content") or {}
        for part in content.get("parts", []) or []:
            if part.get("thought") is True:
                continue
            if isinstance(part.get("text"), str):
                chunks.append(part["text"])
    return "\n".join(chunks)


def _openai_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    chunks: list[str] = []
    for output in payload.get("output", []) or []:
        for content in output.get("content", []) or []:
            if isinstance(content.get("text"), str):
                chunks.append(content["text"])
    return "\n".join(chunks)


def _failure_reason(exc: Exception) -> str:
    if isinstance(exc, urllib.error.HTTPError):
        detail = ""
        try:
            payload = json.loads(exc.read().decode("utf-8", errors="ignore"))
            error = payload.get("error") if isinstance(payload, dict) else None
            if isinstance(error, dict):
                detail = str(error.get("message") or error.get("status") or "")
        except Exception:
            detail = ""
        detail = " ".join(detail.split())[:150]
        return f"HTTP {exc.code}" + (f": {detail}" if detail else "")
    if isinstance(exc, (TimeoutError, socket.timeout)):
        return "request timeout"
    if isinstance(exc, urllib.error.URLError):
        reason = getattr(exc, "reason", None)
        if isinstance(reason, (TimeoutError, socket.timeout)):
            return "request timeout"
        return "network error"
    return exc.__class__.__name__


def _retryable(exc: Exception) -> bool:
    if isinstance(exc, (TimeoutError, socket.timeout)):
        return True
    if isinstance(exc, urllib.error.URLError) and isinstance(getattr(exc, "reason", None), (TimeoutError, socket.timeout)):
        return True
    return isinstance(exc, urllib.error.HTTPError) and exc.code in {408, 429, 500, 502, 503, 504}


def _call_gemini(prompt: str, key: str, model: str, timeout: int = 95) -> dict | None:
    endpoint = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + urllib.parse.quote(model, safe="-._")
        + ":generateContent"
    )
    payload = _request_json(
        endpoint,
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "maxOutputTokens": 5000,
                "thinkingConfig": {"thinkingLevel": "low"},
            },
        },
        {"x-goog-api-key": key},
        timeout=timeout,
    )
    return _json_from_text(_gemini_text(payload))


def _call_openai(prompt: str, key: str, model: str) -> dict | None:
    payload = _request_json(
        "https://api.openai.com/v1/responses",
        {
            "model": model,
            "input": prompt,
            "reasoning": {"effort": "low"},
            "max_output_tokens": 5000,
            "store": False,
        },
        {"Authorization": f"Bearer {key}"},
        timeout=100,
    )
    return _json_from_text(_openai_text(payload))


def _unique(values: list[str]) -> list[str]:
    out: list[str] = []
    for value in values:
        value = value.strip()
        if value and value not in out:
            out.append(value)
    return out


def ai_json(prompt: str) -> dict | None:
    """Gemini-first JSON generation with bounded model failover and OpenAI backup.

    The first configured/current Gemini model gets one retry for transient capacity
    or timeout failures. If it remains unusable, stable Flash fallbacks are tried
    before OpenAI. All attempts are recorded with secret-free diagnostics.
    """
    _reset_status()

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    configured_gemini = os.getenv("GEMINI_MODEL", "").strip()
    gemini_models = _unique([
        configured_gemini or "gemini-3.7-flash",
        "gemini-3.6-flash",
        "gemini-3.5-flash",
    ])

    if gemini_key:
        for model_index, gemini_model in enumerate(gemini_models):
            attempts = 2 if model_index == 0 else 1
            timeout = 105 if model_index == 0 else 75
            for attempt in range(attempts):
                try:
                    data = _call_gemini(prompt, gemini_key, gemini_model, timeout=timeout)
                    if isinstance(data, dict):
                        _record("gemini", gemini_model, True)
                        return data
                    _record("gemini", gemini_model, False, "invalid JSON response")
                    break
                except Exception as exc:
                    retryable = _retryable(exc)
                    _record("gemini", gemini_model, False, _failure_reason(exc))
                    if retryable and attempt + 1 < attempts:
                        time.sleep(5)
                        continue
                    break
    else:
        _record("gemini", gemini_models[0], False, "GEMINI_API_KEY not configured")

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    openai_model = os.getenv("OPENAI_MODEL", "").strip() or "gpt-5.6-luna"
    if openai_key:
        try:
            data = _call_openai(prompt, openai_key, openai_model)
            if isinstance(data, dict):
                _record("openai", openai_model, True)
                return data
            _record("openai", openai_model, False, "invalid JSON response")
        except Exception as exc:
            _record("openai", openai_model, False, _failure_reason(exc))
    else:
        _record("openai", openai_model, False, "OPENAI_API_KEY not configured")

    print("AI provider final status:", json.dumps(status(), ensure_ascii=False))
    return None
