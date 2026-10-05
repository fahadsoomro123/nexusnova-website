from __future__ import annotations

import json
import os
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import distribute_update as base  # noqa: E402

PAYLOAD = ROOT / "premium-social-publish.json"
REPORT = ROOT / "premium-telegram-report.json"
PUBLISHED = ROOT / "assets/data/premium-social-published.json"
HISTORY = ROOT / "assets/data/premium-social-history.json"
PKT = timezone(timedelta(hours=5))
EXPECTED_PLATFORMS = {"x", "facebook", "instagram", "telegram"}


def parse_dt(value: str) -> datetime | None:
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except Exception:
        return None


def tracked_url(raw_url: str, campaign: str) -> str:
    raw_url = str(raw_url or "").strip()
    if not raw_url:
        return ""
    parts = urllib.parse.urlsplit(raw_url)
    query = dict(urllib.parse.parse_qsl(parts.query, keep_blank_values=True))
    query.update(
        {
            "utm_source": "telegram",
            "utm_medium": "social",
            "utm_campaign": campaign or "premium_social",
            "utm_content": "premium",
        }
    )
    return urllib.parse.urlunsplit(
        (parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment)
    )


def load_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path.exists() else fallback
    except Exception:
        return fallback


def today_slot_row(posts: list[dict], slot: int) -> dict | None:
    today = datetime.now(timezone.utc).astimezone(PKT).date()
    for row in reversed(posts):
        try:
            stamp = parse_dt(str(row.get("published_at") or ""))
            if stamp and stamp.astimezone(PKT).date() == today and int(row.get("slot", 0)) == slot:
                return row
        except Exception:
            continue
    return None


def platform_ok(row: dict | None, platform: str) -> bool:
    if not isinstance(row, dict):
        return False
    outcomes = row.get("outcomes") if isinstance(row.get("outcomes"), list) else []
    return any(str(item.get("platform") or "") == platform and bool(item.get("ok")) for item in outcomes)


def recovery_item(slot: int) -> dict:
    doc = load_json(HISTORY, {})
    rows = doc.get("posts") if isinstance(doc, dict) else []
    if not isinstance(rows, list):
        rows = []
    today = datetime.now(timezone.utc).astimezone(PKT).date()
    for row in reversed(rows):
        try:
            stamp = parse_dt(str(row.get("generated_at") or ""))
            if stamp and stamp.astimezone(PKT).date() == today and int(row.get("slot", 0)) == slot:
                return dict(row)
        except Exception:
            continue
    for row in reversed(rows):
        try:
            if int(row.get("slot", 0)) == slot:
                return dict(row)
        except Exception:
            continue
    raise RuntimeError(f"No premium social history available for Telegram recovery slot {slot}")


def build_message(item: dict, recovery_only: bool) -> tuple[str, str]:
    slot = int(item.get("slot", 0) or 0)
    copy = item.get("platform_copy") if isinstance(item.get("platform_copy"), dict) else {}
    title = str(item.get("title") or "NexusNova Tools").strip()
    body = str(
        copy.get("telegram")
        or copy.get("facebook")
        or item.get("hook")
        or title
    ).strip()
    hashtags = [str(x).lstrip("#") for x in (item.get("hashtags") or []) if str(x).strip()][:4]
    if recovery_only and not hashtags:
        hashtags = ["NexusNovaTools", "OnlineTools"]
    tags = " ".join(f"#{tag}" for tag in hashtags)

    campaign = str(item.get("campaign") or f"premium_social_slot_{slot}").strip()
    url = tracked_url(str(item.get("url") or ""), campaign)
    native_growth = slot in {2, 4}
    parts = [body]
    if not native_growth and url:
        parts.append(url)
    if tags:
        parts.append(tags)
    return "\n\n".join(part for part in parts if part).strip(), url


def merge_telegram_outcome(slot: int, campaign: str, ok: bool) -> None:
    doc = load_json(PUBLISHED, {})
    posts = doc.get("posts") if isinstance(doc, dict) else []
    if not isinstance(posts, list):
        posts = []

    row = today_slot_row(posts, slot)
    if row is None:
        row = {
            "published_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "slot": slot,
            "campaign": campaign,
            "successful_destinations": 0,
            "outcomes": [],
        }
        posts.append(row)

    outcomes = row.get("outcomes") if isinstance(row.get("outcomes"), list) else []
    merged: dict[str, bool] = {}
    for item in outcomes:
        platform = str(item.get("platform") or "").strip()
        if platform in EXPECTED_PLATFORMS:
            merged[platform] = merged.get(platform, False) or bool(item.get("ok"))
    merged["telegram"] = merged.get("telegram", False) or bool(ok)

    row["outcomes"] = [
        {"platform": platform, "ok": bool(merged.get(platform, False))}
        for platform in ("x", "facebook", "instagram", "telegram")
        if platform in merged
    ]
    row["successful_destinations"] = sum(1 for platform in EXPECTED_PLATFORMS if merged.get(platform, False))
    if not str(row.get("campaign") or "").strip():
        row["campaign"] = campaign

    PUBLISHED.parent.mkdir(parents=True, exist_ok=True)
    PUBLISHED.write_text(
        json.dumps({"version": 1, "posts": posts[-100:]}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    slot = int(os.getenv("SOCIAL_SLOT", "0") or 0)
    if slot not in range(1, 6):
        raise SystemExit("SOCIAL_SLOT must be 1-5")
    recovery_only = os.getenv("TELEGRAM_RECOVERY_ONLY", "").strip().lower() == "true"

    ledger = load_json(PUBLISHED, {})
    rows = ledger.get("posts") if isinstance(ledger, dict) else []
    if not isinstance(rows, list):
        rows = []
    existing = today_slot_row(rows, slot)

    attempted = False
    ok = False
    configured = bool(os.getenv("TELEGRAM_BOT_TOKEN", "").strip() and os.getenv("TELEGRAM_CHANNEL_ID", "").strip())
    detail = ""
    message_id = None

    if platform_ok(existing, "telegram"):
        ok = True
        detail = "already delivered; duplicate Telegram post skipped"
        item = recovery_item(slot) if recovery_only else load_json(PAYLOAD, {})
    else:
        item = recovery_item(slot) if recovery_only else load_json(PAYLOAD, {})
        if not isinstance(item, dict) or not item:
            detail = "premium social payload/history unavailable"
        elif not configured:
            detail = "TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID missing"
        else:
            token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
            chat_id = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
            campaign = str(item.get("campaign") or f"premium_social_slot_{slot}").strip()
            message, _ = build_message(item, recovery_only)
            image_url = f"https://nexusnovatools.com/assets/generated/premium-social-slot-{slot}.jpg"
            try:
                if not base.wait_for_public_image(image_url, attempts=12, delay=5):
                    raise RuntimeError("premium social image is not public")
                attempted = True
                result = base.post_telegram(token, chat_id, message, image_url)
                response = result.get("response") if isinstance(result, dict) else {}
                if not result.get("posted") or (isinstance(response, dict) and response.get("ok") is False):
                    raise RuntimeError("Telegram Bot API did not accept the post")
                payload = response.get("result") if isinstance(response, dict) else {}
                if isinstance(payload, dict):
                    message_id = payload.get("message_id")
                ok = True
                detail = f"Telegram Bot API accepted message_id={message_id}" if message_id else "Telegram Bot API accepted post"
            except Exception as exc:
                detail = str(exc).replace("\n", " ").strip()[:350]

    campaign = str(item.get("campaign") or f"premium_social_slot_{slot}").strip() if isinstance(item, dict) else f"premium_social_slot_{slot}"
    merge_telegram_outcome(slot, campaign, ok)

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "slot": slot,
        "campaign": campaign,
        "configured": configured,
        "recovery_only": recovery_only,
        "attempted": attempted,
        "ok": ok,
        "message_id": message_id,
        "detail": detail,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
