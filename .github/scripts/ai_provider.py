from __future__ import annotations

import json
import os
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
    if isinstance(exc, urllib.error.URLError):
        return "network error"
    return exc.__class__.__name__


def _retryable(exc: Exception) -> bool:
    return isinstance(exc, urllib.error.HTTPError) and exc.code in {429, 500, 502, 503, 504}


def _call_gemini(prompt: str, key: str, model: str) -> dict | None:
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
                "maxOutputTokens": 3200,
                "thinkingConfig": {"thinkingLevel": "low"},
            },
        },
        {"x-goog-api-key": key},
        timeout=70,
    )
    return _json_from_text(_gemini_text(payload))


def _call_openai(prompt: str, key: str, model: str) -> dict | None:
    payload = _request_json(
        "https://api.openai.com/v1/responses",
        {
            "model": model,
            "input": prompt,
            "reasoning": {"effort": "low"},
            "max_output_tokens": 3200,
            "store": False,
        },
        {"Authorization": f"Bearer {key}"},
        timeout=90,
    )
    return _json_from_text(_openai_text(payload))


def ai_json(prompt: str) -> dict | None:
    """Gemini-first editorial JSON generation with OpenAI as failover only.

    Gemini gets a few bounded retries for transient capacity/rate-limit errors. A
    valid Gemini JSON response (including publish=false) is authoritative and does
    not trigger OpenAI. OpenAI is attempted only after Gemini is genuinely unusable.
    """
    _reset_status()

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()
    gemini_model = os.getenv("GEMINI_MODEL", "").strip() or "gemini-3.7-flash"
    if gemini_key:
        retry_delays = (5, 15)
        for attempt in range(3):
            try:
                data = _call_gemini(prompt, gemini_key, gemini_model)
                if isinstance(data, dict):
                    _record("gemini", gemini_model, True)
                    return data
                _record("gemini", gemini_model, False, "invalid JSON response")
                break
            except Exception as exc:
                retryable = _retryable(exc)
                _record("gemini", gemini_model, False, _failure_reason(exc))
                if retryable and attempt < len(retry_delays):
                    time.sleep(retry_delays[attempt])
                    continue
                break
    else:
        _record("gemini", gemini_model, False, "GEMINI_API_KEY not configured")

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    # Luna is deliberately the default failover: OpenAI should be a rare, lower-cost
    # backup rather than the normal path. OPENAI_MODEL can still override it.
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

    return None
