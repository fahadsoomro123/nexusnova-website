from __future__ import annotations

import json
import os
import re
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import distribute_update as base  # noqa: E402
from buffer_publish import post_buffer_x  # noqa: E402

PUBLISH = ROOT / "social-growth-publish.json"
REPORT = ROOT / "social-distribution-report.json"


def tracked_url(item: dict, source: str) -> str:
    url = str(item.get("url", "")).strip()
    if not url:
        return ""
    parts = urllib.parse.urlsplit(url)
    query = dict(urllib.parse.parse_qsl(parts.query, keep_blank_values=True))
    query.update({
        "utm_source": source,
        "utm_medium": "social",
        "utm_campaign": str(item.get("campaign", "social_growth")).strip() or "social_growth",
        "utm_content": str(item.get("utm_content", item.get("format", "adaptive"))).strip() or "adaptive",
    })
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment))


def safe_error(exc: Exception) -> str:
    text = str(exc).replace("\n", " ").strip()
    text = re.sub(r"(?i)\b(access_token|refresh_token|api_key|authorization|token)\b(?:\s*[:=]\s*|\s+)[^&\s,;]+", r"\1=[redacted]", text)
    text = re.sub(r"(?i)\bBearer\s+[A-Za-z0-9._~+/-]+=*", "Bearer [redacted]", text)
    return text[:350]


def media_detail(result: dict) -> str:
    return "HD image attached" if result.get("image_attached") else "text/link fallback"


_PUBLIC_POST_HOSTS = {
    "t.me", "x.com", "twitter.com", "facebook.com", "instagram.com", "buffer.com",
}


def _safe_identifier(value) -> str:
    """Accept only short identifier-shaped values, never arbitrary provider payloads."""
    if isinstance(value, bool) or value is None:
        return ""
    candidate = str(value).strip()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:-]{0,179}", candidate):
        return ""
    return candidate


def _safe_public_post_url(value) -> str:
    """Keep only HTTPS URLs on known public social-provider domains; drop query/fragment."""
    candidate = str(value or "").strip()
    if not candidate or len(candidate) > 2048:
        return ""
    try:
        parts = urllib.parse.urlsplit(candidate)
        host = (parts.hostname or "").lower().rstrip(".")
        allowed = any(host == item or host.endswith("." + item) for item in _PUBLIC_POST_HOSTS)
        if parts.username or parts.password or parts.port not in (None, 443):
            return ""
        if parts.scheme.lower() != "https" or not allowed or not parts.path:
            return ""
        return urllib.parse.urlunsplit(("https", host, parts.path, "", ""))
    except ValueError:
        return ""


def build_delivery_outcome(
    platform: str,
    result: dict | None,
    campaign: str,
    detail: str = "",
) -> dict:
    """Build a safe per-destination record without storing raw API responses or secrets."""
    result = result if isinstance(result, dict) else {}
    response = result.get("response")
    response = response if isinstance(response, dict) else {}
    ok = bool(result) and result.get("posted") is not False
    if response.get("ok") is False or response.get("success") is False or response.get("error"):
        ok = False

    provider = str(result.get("provider") or platform).strip()[:40]
    is_buffer_queue = platform == "x" and provider.lower() == "buffer"
    if not ok:
        delivery_state = "failed"
    elif platform == "webhook":
        delivery_state = "accepted"
    else:
        delivery_state = "published"

    post_id = ""
    post_url = ""
    provider_status = ""
    scheduled_for = ""
    if platform == "telegram":
        message = response.get("result") if isinstance(response.get("result"), dict) else {}
        post_id = _safe_identifier(message.get("message_id"))
        chat = message.get("chat") if isinstance(message.get("chat"), dict) else {}
        username = str(chat.get("username") or "").strip().lstrip("@")
        if post_id and re.fullmatch(r"[A-Za-z0-9_]{5,32}", username):
            post_url = f"https://t.me/{username}/{post_id}"
        post_url = post_url or _safe_public_post_url(
            message.get("permalink") or message.get("permalink_url") or message.get("post_url")
        )
    elif platform == "x" and is_buffer_queue:
        post_id = _safe_identifier(response.get("id") or response.get("post_id"))
        provider_status = _safe_identifier(response.get("status"))
        scheduled_for = str(response.get("dueAt") or "").strip()[:80]
        post_url = _safe_public_post_url(
            response.get("permalink") or response.get("permalink_url") or response.get("post_url")
        )
    elif platform == "x":
        data = response.get("data") if isinstance(response.get("data"), dict) else {}
        post_id = _safe_identifier(data.get("id") or response.get("id"))
        post_url = _safe_public_post_url(
            data.get("permalink") or data.get("permalink_url") or data.get("post_url")
            or response.get("permalink") or response.get("permalink_url") or response.get("post_url")
        )
    elif platform == "facebook":
        post_id = _safe_identifier(response.get("id") or response.get("post_id"))
        post_url = _safe_public_post_url(
            response.get("permalink") or response.get("permalink_url") or response.get("post_url")
        )
    elif platform == "instagram":
        post_id = _safe_identifier(response.get("id") or response.get("post_id"))
        post_url = _safe_public_post_url(
            response.get("permalink") or response.get("permalink_url") or response.get("post_url")
        )
    elif is_buffer_queue:
        post_id = _safe_identifier(response.get("id") or response.get("post_id"))
        provider_status = _safe_identifier(response.get("status"))
        scheduled_for = str(response.get("dueAt") or "").strip()[:80]
        post_url = _safe_public_post_url(
            response.get("permalink") or response.get("permalink_url") or response.get("post_url")
        )
    elif platform == "webhook":
        post_id = _safe_identifier(response.get("id") or response.get("post_id") or response.get("message_id"))
        post_url = _safe_public_post_url(
            response.get("permalink") or response.get("permalink_url") or response.get("post_url") or response.get("url")
        )
    else:
        post_id = _safe_identifier(response.get("id") or response.get("post_id"))
        post_url = _safe_public_post_url(
            response.get("permalink") or response.get("permalink_url") or response.get("post_url")
        )

    outcome = {
        "campaign": _safe_identifier(campaign),
        "platform": platform,
        "provider": provider,
        "ok": ok,
        "delivery_state": delivery_state,
        "detail": str(detail or "")[:350],
    }
    if post_id:
        outcome["post_id"] = post_id
    if post_url:
        outcome["post_url"] = post_url
    if provider_status:
        outcome["provider_status"] = provider_status
    if scheduled_for and delivery_state == "queued":
        outcome["scheduled_for"] = scheduled_for
    return outcome


def main() -> None:
    if not PUBLISH.exists():
        print("No Social Growth v2 payload; falling back to standard social distributor.")
        base.main()
        return

    item = json.loads(PUBLISH.read_text(encoding="utf-8"))
    title = str(item.get("title", "NexusNova update")).strip()
    summary = str(item.get("summary", "")).strip()
    hook = str(item.get("hook", title)).strip()
    hashtags = list(item.get("hashtags") or ["NexusNova", "OnlineTools", "Productivity"])
    platform_copy = item.get("platform_copy") if isinstance(item.get("platform_copy"), dict) else {}
    outcomes: list[dict] = []

    campaign_id = str(item.get("campaign") or "").strip()

    def record(platform: str, result: dict | None, detail: str = "") -> None:
        outcome = build_delivery_outcome(platform, result, campaign_id, detail)
        outcomes.append(outcome)
        state = outcome["delivery_state"].upper()
        suffix = f" - {detail}" if detail else ""
        reference = f" · ref {outcome['post_id']}" if outcome.get("post_id") else ""
        print(f"{platform}: {state}{reference}{suffix}")

    image_url = base.social_image_url(item)
    image_ready = bool(image_url)
    if image_ready:
        image_ready = base.wait_for_public_image(image_url, attempts=18, delay=10)
        if not image_ready:
            print("HD social creative was not public in time; safe text/link fallbacks remain enabled.")
            image_url = ""

    tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    tg_chat = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
    if tg_token and tg_chat:
        try:
            url = tracked_url(item, "telegram")
            message = str(platform_copy.get("telegram") or f"{hook}\n\n{summary}\n\nTry it: ").strip()
            if url:
                message = f"{message}\n{url}".strip()
            result = base.post_telegram(tg_token, tg_chat, message, image_url)
            record("telegram", result, media_detail(result))
        except Exception as exc:
            record("telegram", None, safe_error(exc))
    else:
        record("telegram", None, "not configured")

    x_copy = str(platform_copy.get("x") or hook).strip()
    buffer_ready = bool(os.getenv("BUFFER_API_KEY", "").strip() and os.getenv("BUFFER_X_CHANNEL_ID", "").strip())
    x_names = ("X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")
    direct_x_ready = all(os.getenv(name, "").strip() for name in x_names)
    if buffer_ready:
        try:
            result = post_buffer_x(x_copy, tracked_url(item, "x"), hashtags, image_url=image_url)
            record("x", result, f"Buffer queue · {media_detail(result)}")
        except Exception as exc:
            record("x", None, safe_error(exc))
    elif direct_x_ready:
        try:
            result = base.post_x(x_copy, tracked_url(item, "x"), hashtags, image_url=image_url)
            record("x", result, f"direct X fallback · {media_detail(result)}")
        except Exception as exc:
            record("x", False, safe_error(exc))
    else:
        record("x", None, "not configured")

    meta_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
    preferred_page = os.getenv("FACEBOOK_PAGE_ID", "").strip()
    assets = None
    if meta_token:
        try:
            assets = base.resolve_meta_assets(meta_token, preferred_page)
        except Exception as exc:
            record("meta_assets", None, safe_error(exc))
    else:
        record("meta_assets", None, "not configured")

    if assets:
        try:
            fb_copy = str(platform_copy.get("facebook") or f"{hook}\n\n{summary}").strip()
            fb_tags = " ".join(f"#{tag.lstrip('#')}" for tag in hashtags[:3])
            fb_message = f"{fb_copy}\n\n{fb_tags}".strip()
            result = base.post_facebook(assets, fb_message, tracked_url(item, "facebook"), image_url)
            record("facebook", result, media_detail(result))
        except Exception as exc:
            record("facebook", None, safe_error(exc))

        if assets.get("instagram_id") and base.social_image_url(item):
            try:
                ig_item = dict(item)
                ig_item["title"] = str(platform_copy.get("instagram") or hook).strip()
                ig_item["summary"] = ""
                base.post_instagram(ig_item, assets, tracked_url(item, "instagram"))
                record("instagram", result, "HD image attached")
            except Exception as exc:
                record("instagram", None, safe_error(exc))
        else:
            record("instagram", None, "professional account or image unavailable")

    webhook = os.getenv("SOCIAL_WEBHOOK_URL", "").strip()
    if webhook:
        try:
            result = base.post_json(webhook, item)
            record("webhook", {"posted": True, "provider": "webhook", "response": result}, "Webhook accepted the campaign request")
        except Exception as exc:
            record("webhook", None, safe_error(exc))

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "campaign": item.get("campaign"),
        "format": item.get("format"),
        "url": item.get("url"),
        "image_url": base.social_image_url(item),
        "image_ready": image_ready,
        "outcomes": outcomes,
        # Backward-compatible count of provider-accepted submissions. Buffer queue
        # entries are reported separately and are not described as published posts.
        "successful_destinations": sum(1 for row in outcomes if row["ok"] and row["platform"] != "meta_assets"),
        "published_destinations": sum(1 for row in outcomes if row["ok"] and row["delivery_state"] == "published"),
        "queued_destinations": sum(1 for row in outcomes if row["ok"] and row["delivery_state"] == "queued"),
        "accepted_destinations": sum(1 for row in outcomes if row["ok"] and row["delivery_state"] == "accepted"),
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Successful destination submissions: {report['successful_destinations']}")
    print(f"Published: {report['published_destinations']} · queued: {report['queued_destinations']} · accepted by webhook: {report['accepted_destinations']}")


if __name__ == "__main__":
    main()
