from __future__ import annotations

import json
import os
import sys
import time
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
NATIVE_GROWTH_SLOTS = {2, 4}


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


def image_label(item: dict) -> str:
    provider = str(item.get("image_provider", "")).strip().lower()
    if provider.startswith("pollinations-"):
        return "fresh AI image"
    if provider == "cached-ai-library":
        return "cached AI image"
    if provider == "emergency-branded":
        return "premium branded fallback"
    return provider or "image"


def post_facebook_native(assets: dict, message: str, image_url: str) -> dict:
    page_id = urllib.parse.quote(str(assets.get("page_id", "")).strip())
    token = str(assets.get("page_token", "")).strip()
    if not page_id or not token:
        raise RuntimeError("Facebook Page asset is incomplete")
    if image_url:
        try:
            result = base.post_form(
                f"https://graph.facebook.com/v26.0/{page_id}/photos",
                {
                    "url": image_url,
                    "caption": message,
                    "published": "true",
                    "access_token": token,
                },
            )
            return {"posted": True, "image_attached": True, "response": result}
        except Exception as exc:
            print("Facebook native image warning; posting native text fallback:", exc)
    result = base.post_form(
        f"https://graph.facebook.com/v26.0/{page_id}/feed",
        {"message": message, "access_token": token},
    )
    return {"posted": True, "image_attached": False, "response": result}


def post_instagram_native(assets: dict, caption: str, image_url: str, hashtags: list[str]) -> dict:
    ig_id = str(assets.get("instagram_id", "")).strip()
    token = str(assets.get("page_token", "")).strip()
    if not ig_id or not token:
        raise RuntimeError("Instagram professional account is incomplete")
    tags = " ".join(f"#{tag.lstrip('#')}" for tag in hashtags[:5])
    final_caption = f"{caption.strip()}\n\n{tags}".strip()[:2200]
    create = base.post_form(
        f"https://graph.facebook.com/v26.0/{urllib.parse.quote(ig_id)}/media",
        {"image_url": image_url, "caption": final_caption, "access_token": token},
    )
    creation_id = str(create.get("id", "")).strip()
    if not creation_id:
        raise RuntimeError("Instagram did not return a media container ID")

    finished = False
    for _ in range(10):
        query = urllib.parse.urlencode({"fields": "status_code,status", "access_token": token})
        status = base.get_json(
            f"https://graph.facebook.com/v26.0/{urllib.parse.quote(creation_id)}?{query}"
        )
        code = str(status.get("status_code", "")).upper()
        if code == "FINISHED":
            finished = True
            break
        if code in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram media container status: {code}")
        time.sleep(3)
    if not finished:
        raise RuntimeError("Instagram media container did not finish processing in time")

    published = base.post_form(
        f"https://graph.facebook.com/v26.0/{urllib.parse.quote(ig_id)}/media_publish",
        {"creation_id": creation_id, "access_token": token},
    )
    if not str(published.get("id", "")).strip():
        raise RuntimeError("Instagram media publish returned no media ID")
    return {"posted": True, "image_attached": True, "response": published}


def main() -> None:
    if not PAYLOAD.exists():
        raise SystemExit("premium-social-publish.json is missing")
    item = json.loads(PAYLOAD.read_text(encoding="utf-8"))
    slot = int(item.get("slot", 0) or 0)
    native_growth = slot in NATIVE_GROWTH_SLOTS
    image_url = base.social_image_url(item)
    if not image_url:
        raise SystemExit("Premium social image URL missing")
    if not base.wait_for_public_image(image_url, attempts=24, delay=10):
        raise SystemExit("Premium social image never became public; refusing image-less publishing")

    copy = item.get("platform_copy") if isinstance(item.get("platform_copy"), dict) else {}
    hashtags = [str(x).lstrip("#") for x in (item.get("hashtags") or []) if str(x).strip()][:5]
    outcomes: list[dict] = []
    label = image_label(item)
    objective = "native-follower-growth" if native_growth else "website-traffic"

    def record(platform: str, ok: bool, detail: str = "") -> None:
        row = {"platform": platform, "ok": ok, "detail": detail}
        outcomes.append(row)
        print(platform, "posted" if ok else "failed/skipped", detail)

    buffer_ready = bool(os.getenv("BUFFER_API_KEY", "").strip() and os.getenv("BUFFER_X_CHANNEL_ID", "").strip())
    if buffer_ready:
        try:
            result = post_buffer_x_now(
                str(copy.get("x") or item.get("hook") or item.get("title") or "NexusNova Tools"),
                "" if native_growth else tracked_url(item, "x"),
                hashtags,
                image_url=image_url,
                ai_assisted=label in {"fresh AI image", "cached AI image"},
            )
            detail = f"Buffer shareNow · {objective} · {label}" if result.get("image_attached") else f"Buffer shareNow · {objective} · image fallback"
            record("x", bool(result.get("posted")), detail)
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
            if native_growth:
                result = post_facebook_native(assets, fb_message, image_url)
            else:
                result = base.post_facebook(assets, fb_message, tracked_url(item, "facebook"), image_url)
            record("facebook", True, f"{objective} · {label}" if result.get("image_attached") else f"{objective} · text/link fallback")
        except Exception as exc:
            record("facebook", False, safe_error(exc))

        if assets.get("instagram_id"):
            try:
                ig_caption = str(copy.get("instagram") or item.get("hook") or item.get("title")).strip()
                if native_growth:
                    post_instagram_native(assets, ig_caption, image_url, hashtags)
                else:
                    ig_item = dict(item)
                    ig_item["title"] = ig_caption
                    ig_item["summary"] = ""
                    ig_item["hashtags"] = hashtags
                    base.post_instagram(ig_item, assets, tracked_url(item, "instagram"))
                record("instagram", True, f"{objective} · {label}")
            except Exception as exc:
                record("instagram", False, safe_error(exc))
        else:
            record("instagram", False, "No connected Instagram professional account")

    successful = sum(1 for row in outcomes if row["ok"] and row["platform"] != "meta_assets")
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "campaign": item.get("campaign"),
        "slot": slot,
        "objective": objective,
        "url": item.get("url"),
        "external_link_published": not native_growth,
        "image_url": image_url,
        "image_provider": item.get("image_provider"),
        "image_label": label,
        "outcomes": outcomes,
        "successful_destinations": successful,
    }
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    if successful == 0:
        raise SystemExit("Premium social publishing reached zero destinations")


if __name__ == "__main__":
    main()
