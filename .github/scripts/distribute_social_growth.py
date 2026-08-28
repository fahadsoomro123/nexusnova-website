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
    return text[:350]


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

    def record(platform: str, ok: bool, detail: str = "") -> None:
        outcomes.append({"platform": platform, "ok": ok, "detail": detail})
        print(f"{platform}: {'posted' if ok else 'skipped/failed'}{f' - {detail}' if detail else ''}")

    tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    tg_chat = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
    if tg_token and tg_chat:
        try:
            url = tracked_url(item, "telegram")
            message = str(platform_copy.get("telegram") or f"{hook}\n\n{summary}\n\nTry it: ").strip()
            if url:
                message = f"{message}\n{url}".strip()
            base.post_json(
                f"https://api.telegram.org/bot{tg_token}/sendMessage",
                {"chat_id": tg_chat, "text": message, "disable_web_page_preview": False},
            )
            record("telegram", True)
        except Exception as exc:
            record("telegram", False, safe_error(exc))
    else:
        record("telegram", False, "not configured")

    x_names = ("X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")
    if all(os.getenv(name, "").strip() for name in x_names):
        try:
            x_copy = str(platform_copy.get("x") or hook).strip()
            base.post_x(x_copy, tracked_url(item, "x"), hashtags)
            record("x", True)
        except Exception as exc:
            record("x", False, safe_error(exc))
    else:
        record("x", False, "not configured")

    meta_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
    preferred_page = os.getenv("FACEBOOK_PAGE_ID", "").strip()
    assets = None
    if meta_token:
        try:
            assets = base.resolve_meta_assets(meta_token, preferred_page)
        except Exception as exc:
            record("meta_assets", False, safe_error(exc))
    else:
        record("meta_assets", False, "not configured")

    if assets:
        try:
            fb_copy = str(platform_copy.get("facebook") or f"{hook}\n\n{summary}").strip()
            fb_tags = " ".join(f"#{tag.lstrip('#')}" for tag in hashtags[:3])
            base.post_form(
                f"https://graph.facebook.com/v26.0/{urllib.parse.quote(assets['page_id'])}/feed",
                {
                    "message": f"{fb_copy}\n\n{fb_tags}".strip(),
                    "link": tracked_url(item, "facebook"),
                    "access_token": assets["page_token"],
                },
            )
            record("facebook", True)
        except Exception as exc:
            record("facebook", False, safe_error(exc))

        if assets.get("instagram_id") and item.get("instagram_image"):
            try:
                ig_item = dict(item)
                ig_item["title"] = str(platform_copy.get("instagram") or hook).strip()
                ig_item["summary"] = ""
                # base.post_instagram handles public-media availability and publish status checks.
                base.post_instagram(ig_item, assets, tracked_url(item, "instagram"))
                record("instagram", True)
            except Exception as exc:
                record("instagram", False, safe_error(exc))
        else:
            record("instagram", False, "professional account or image unavailable")

    webhook = os.getenv("SOCIAL_WEBHOOK_URL", "").strip()
    if webhook:
        try:
            base.post_json(webhook, item)
            record("webhook", True)
        except Exception as exc:
            record("webhook", False, safe_error(exc))

    report = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "campaign": item.get("campaign"),
        "format": item.get("format"),
        "url": item.get("url"),
        "outcomes": outcomes,
        "successful_destinations": sum(1 for row in outcomes if row["ok"] and row["platform"] != "meta_assets"),
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Social Growth v2 successful destinations: {report['successful_destinations']}")


if __name__ == "__main__":
    main()
