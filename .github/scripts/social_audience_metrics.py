from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social-audience-metrics.json"
TEXT = ROOT / "social-audience-report.txt"
HISTORY = ROOT / "assets/data/social-audience-history.json"
GRAPH = "https://graph.facebook.com/v26.0"


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "NexusNovaAudienceTracker/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read().decode("utf-8", errors="ignore")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")[:350]
        raise RuntimeError(f"HTTP {exc.code}: {detail or exc.reason}") from exc


def graph_get(path: str, token: str, fields: str = "") -> dict:
    query = {"access_token": token}
    if fields:
        query["fields"] = fields
    return get_json(f"{GRAPH}/{path.lstrip('/')}?{urllib.parse.urlencode(query)}")


def safe_int(value):
    try:
        return int(value)
    except Exception:
        return None


def resolve_meta(token: str, preferred_page: str) -> dict:
    data = graph_get("me/accounts", token, "id,name,access_token,instagram_business_account{id,username}")
    rows = data.get("data") if isinstance(data.get("data"), list) else []
    if not rows:
        raise RuntimeError("Meta token returned no Page assets")
    chosen = None
    if preferred_page:
        chosen = next((row for row in rows if str(row.get("id", "")) == preferred_page), None)
    if chosen is None:
        chosen = next((row for row in rows if (row.get("instagram_business_account") or {}).get("id")), rows[0])
    instagram = chosen.get("instagram_business_account") or {}
    return {
        "page_id": str(chosen.get("id", "")).strip(),
        "page_name": str(chosen.get("name", "")).strip(),
        "page_token": str(chosen.get("access_token", "")).strip() or token,
        "instagram_id": str(instagram.get("id", "")).strip(),
        "instagram_username": str(instagram.get("username", "")).strip(),
    }


def collect_meta(result: dict) -> None:
    token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
    preferred = os.getenv("FACEBOOK_PAGE_ID", "").strip()
    if not token:
        result["facebook"] = {"configured": False}
        result["instagram"] = {"configured": False}
        return
    try:
        assets = resolve_meta(token, preferred)
    except Exception as exc:
        err = str(exc)[:350]
        result["facebook"] = {"configured": True, "error": err}
        result["instagram"] = {"configured": True, "error": err}
        return

    page = {"configured": True, "page_id": assets["page_id"], "name": assets["page_name"]}
    try:
        data = graph_get(assets["page_id"], assets["page_token"], "name,fan_count,followers_count")
    except Exception:
        try:
            data = graph_get(assets["page_id"], assets["page_token"], "name,fan_count")
        except Exception as exc:
            page["error"] = str(exc)[:350]
            data = {}
    if data:
        page["name"] = str(data.get("name", page.get("name", "")))
        page["followers"] = safe_int(data.get("followers_count"))
        page["fans"] = safe_int(data.get("fan_count"))
    result["facebook"] = page

    ig = {"configured": bool(assets["instagram_id"]), "username": assets["instagram_username"]}
    if assets["instagram_id"]:
        try:
            data = graph_get(assets["instagram_id"], assets["page_token"], "username,followers_count,media_count")
            ig["username"] = str(data.get("username", ig.get("username", "")))
            ig["followers"] = safe_int(data.get("followers_count"))
            ig["media_count"] = safe_int(data.get("media_count"))
        except Exception as exc:
            ig["error"] = str(exc)[:350]
    result["instagram"] = ig


def collect_telegram(result: dict) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
    if not token or not chat:
        result["telegram"] = {"configured": False}
        return
    try:
        query = urllib.parse.urlencode({"chat_id": chat})
        data = get_json(f"https://api.telegram.org/bot{token}/getChatMemberCount?{query}")
        if not data.get("ok"):
            raise RuntimeError(str(data.get("description", "Telegram count request failed")))
        result["telegram"] = {"configured": True, "chat": chat, "members": safe_int(data.get("result"))}
    except Exception as exc:
        result["telegram"] = {"configured": True, "chat": chat, "error": str(exc)[:350]}


def metric_value(snapshot: dict, platform: str):
    row = snapshot.get(platform) if isinstance(snapshot, dict) else None
    if not isinstance(row, dict):
        return None
    for key in ("followers", "members", "fans"):
        value = safe_int(row.get(key))
        if value is not None:
            return value
    return None


def parse_stamp(row: dict):
    try:
        return datetime.fromisoformat(str(row.get("generated_at", "")).replace("Z", "+00:00"))
    except Exception:
        return None


def add_deltas(current: dict, history: list[dict]) -> dict:
    deltas = {}
    now = datetime.now(timezone.utc)
    previous = history[-1] if history else None
    seven = None
    for row in reversed(history):
        stamp = parse_stamp(row)
        if stamp and (now - stamp).total_seconds() >= 6 * 86400:
            seven = row
            break
    for platform in ("facebook", "instagram", "telegram"):
        cur = metric_value(current, platform)
        if cur is None:
            continue
        entry = {"current": cur}
        if previous:
            prev = metric_value(previous, platform)
            if prev is not None:
                entry["change_since_last_snapshot"] = cur - prev
        if seven:
            old = metric_value(seven, platform)
            if old is not None:
                entry["change_vs_7d_snapshot"] = cur - old
        deltas[platform] = entry
    return deltas


def main() -> None:
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    current = {"generated_at": now}
    collect_meta(current)
    collect_telegram(current)

    doc = {"version": 1, "snapshots": []}
    try:
        loaded = json.loads(HISTORY.read_text(encoding="utf-8"))
        if isinstance(loaded, dict):
            doc = loaded
    except Exception:
        pass
    history = doc.get("snapshots") if isinstance(doc.get("snapshots"), list) else []
    current["deltas"] = add_deltas(current, history)

    record = os.getenv("NEXUSNOVA_RECORD_AUDIENCE", "").strip() == "1"
    if record:
        history.append({k: v for k, v in current.items() if k != "deltas"})
        doc = {"version": 1, "snapshots": history[-120:]}
        HISTORY.parent.mkdir(parents=True, exist_ok=True)
        HISTORY.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    current["recorded_to_history"] = record
    OUT.write_text(json.dumps(current, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = ["NEXUSNOVA SOCIAL AUDIENCE TRACKER", "=" * 34]
    for platform in ("facebook", "instagram", "telegram"):
        row = current.get(platform, {})
        if not row.get("configured"):
            lines.append(f"- {platform}: not configured")
            continue
        if row.get("error"):
            lines.append(f"- {platform}: unavailable ({row['error']})")
            continue
        value = metric_value(current, platform)
        delta = (current.get("deltas") or {}).get(platform, {})
        detail = f"{value}" if value is not None else "count unavailable"
        if "change_since_last_snapshot" in delta:
            detail += f" | since last: {delta['change_since_last_snapshot']:+d}"
        if "change_vs_7d_snapshot" in delta:
            detail += f" | vs 7d: {delta['change_vs_7d_snapshot']:+d}"
        lines.append(f"- {platform}: {detail}")
    TEXT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
