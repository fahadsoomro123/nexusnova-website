from __future__ import annotations

import json
import os
import sys
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

import distribute_update as base  # noqa: E402
from buffer_publish import post_buffer_x_now  # noqa: E402

PAYLOAD = ROOT / "premium-social-publish.json"
REPORT = ROOT / "premium-social-report.json"


def tracked_url(item: dict, source: str) -> str:
    raw = str(item.get("url", "")).strip()
    if not raw:
        return ""
    parts = urllib.parse.urlsplit(raw)
    query = dict(urllib.parse.parse_qsl(parts.query, keep_blank_values=True))
    query.update({
        "utm_source": source,
        "utm_medium": "social",
        "utm_campaign": str(item.get("campaign", "premium_social")),
        "utm_content": str(item.get("utm_content", "premium")),
    })
    return urllib.parse.urlunsplit((parts.scheme, parts.netloc, parts.path, urllib.parse.urlencode(query), parts.fragment))


def safe_error(exc: Exception) -> str:
    return str(exc).replace("\n", " ").strip()[:350]


def main() -> None:
    if not PAYLOAD.exists():
        raise SystemExit("premium-social-publish.json is missing")
    item = json.loads(PAYLOAD.read_text(encoding="utf-8"))
    image_url = base.social_image_url(item)
    if not image_url:
        raise SystemExit("Premium social image URL missing")
    if not base.wait_for_public_image(image_url, attempts=24, delay=10):
        raise SystemExit("Premium AI image never became public; refusing image-less publishing")

    copy = item.get("platform_copy") if isinstance(item.get("platform_copy"), dict) else {}
    hashtags = [str(x).lstrip("#") for x in (item.get("hashtags") or []) if str(x).strip()][:5]
    outcomes: list[dict] = []

    def record(platform: str, ok: bool, detail: str = "") -> None:
        row = {"platform": platform, "ok": ok, "detail": detail}
        outcomes.append(row)
        print(platform, "posted" if ok else "failed/skipped", detail)

    buffer_ready = bool(os.getenv("BUFFER_API_KEY", "").strip() and os.getenv("BUFFER_X_CHANNEL_ID", "").strip())
    if buffer_ready:
        try:
            result = post_buffer_x_now(
                str(copy.get("x") or item.get("hook") or item.get("title") or "NexusNova Tools"),
                tracked_url(item, "x"),
                hashtags,
                image_url=image_url,
                ai_assisted=True,
            )
            record("x", bool(result.get("posted")), "Buffer shareNow · AI image" if result.get("image_attached") else "Buffer shareNow · image fallback")
        except Exception as exc:
            record("x", False, safe_error(exc))
    else:
        record("x", False, "BUFFER_API_KEY or channel ID missing; direct paid X API intentionally disabled")

    meta_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
    preferred_page = os.getenv("FACEBOOK_PAGE_ID", "").strip()
    assets = None
    if meta_token:
        try:
            assets = base.resolve_meta_assets(meta_token, preferred_page)
        except Exception as exc:
            record("meta_assets", False, safe_error(exc))
    else:
        record("meta_assets", False, "Meta token not configured")

    if assets:
        try:
            fb_tags = " ".join(f"#{tag}" for tag in hashtags[:3])
            fb_message = f"{str(copy.get('facebook') or item.get('hook') or item.get('title')).strip()}\n\n{fb_tags}".strip()
            result = base.post_facebook(assets, fb_message, tracked_url(item, "facebook"), image_url)
            record("facebook", True, "AI image" if result.get("image_attached") else "link fallback")
        except Exception as exc:
            record("facebook", False, safe_error(exc))

        if assets.get("instagram_id"):
            try:
                ig_item = dict(item)
                ig_item["title"] = str(copy.get("instagram") or item.get("hook") or item.get("title")).strip()
                ig_item["summary"] = ""
                ig_item["hashtags"] = hashtags
                base.post_instagram(ig_item, assets, tracked_url(item, "instagram"))
                record("instagram", True, "AI image")
            except Exception as exc:
                record("instagram", False, safe_error(exc))
        else:
            record("instagram", False, "No connected Instagram professional account")

    successful = sum(1 for row in outcomes if row["ok"] and row["platform"] != "meta_assets")
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "campaign": item.get("campaign"),
        "slot": item.get("slot"),
        "url": item.get("url"),
        "image_url": image_url,
        "image_provider": item.get("image_provider"),
        "outcomes": outcomes,
        "successful_destinations": successful,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if successful == 0:
        raise SystemExit("Premium social publishing reached zero destinations")


if __name__ == "__main__":
    main()
