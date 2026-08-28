from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLISH = ROOT / "autopilot-publish.json"


def post_json(url: str, payload: dict, headers: dict[str, str] | None = None) -> dict:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "User-Agent": "NexusNovaTrafficAutopilot/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=25) as response:
        raw = response.read().decode("utf-8", errors="ignore")
        print(url.split("?")[0], response.status)
        return json.loads(raw) if raw else {}


def post_form(url: str, payload: dict) -> dict:
    body = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NexusNovaTrafficAutopilot/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        raw = response.read().decode("utf-8", errors="ignore")
        print(url.split("?")[0], response.status)
        return json.loads(raw) if raw else {}


def get_json(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "NexusNovaTrafficAutopilot/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        data = json.loads(response.read().decode("utf-8"))
        print(url.split("?")[0], response.status)
        return data


def oauth1_header(method: str, url: str, api_key: str, api_secret: str, access_token: str, access_secret: str) -> str:
    def enc(value: str) -> str:
        return urllib.parse.quote(str(value), safe="~-._")

    oauth = {
        "oauth_consumer_key": api_key,
        "oauth_nonce": secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": str(int(time.time())),
        "oauth_token": access_token,
        "oauth_version": "1.0",
    }
    normalized = "&".join(f"{enc(key)}={enc(value)}" for key, value in sorted(oauth.items()))
    base_string = "&".join([method.upper(), enc(url), enc(normalized)])
    signing_key = f"{enc(api_secret)}&{enc(access_secret)}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), base_string.encode(), hashlib.sha1).digest()
    ).decode()
    oauth["oauth_signature"] = signature
    return "OAuth " + ", ".join(f'{enc(key)}="{enc(value)}"' for key, value in sorted(oauth.items()))


def post_x(title: str, url: str) -> None:
    api_key = os.getenv("X_API_KEY", "").strip()
    api_secret = os.getenv("X_API_KEY_SECRET", "").strip()
    access_token = os.getenv("X_ACCESS_TOKEN", "").strip()
    access_secret = os.getenv("X_ACCESS_TOKEN_SECRET", "").strip()
    if not all((api_key, api_secret, access_token, access_secret)):
        return

    endpoint = "https://api.x.com/2/tweets"
    available_title = max(0, 275 - len(url) - 2)
    text = f"{title[:available_title]}\n\n{url}" if url else title[:275]
    auth = oauth1_header("POST", endpoint, api_key, api_secret, access_token, access_secret)
    post_json(endpoint, {"text": text}, {"Authorization": auth})


def resolve_meta_assets(token: str, preferred_page_id: str = "") -> dict:
    query = urllib.parse.urlencode({
        "fields": "id,name,access_token,instagram_business_account{id,username}",
        "access_token": token,
    })
    data = get_json(f"https://graph.facebook.com/v26.0/me/accounts?{query}")
    rows = data.get("data") if isinstance(data.get("data"), list) else []
    if not rows:
        raise RuntimeError("Meta token returned no Page assets")

    chosen = None
    if preferred_page_id:
        chosen = next((row for row in rows if str(row.get("id", "")) == preferred_page_id), None)
        if chosen is None:
            raise RuntimeError("Configured Facebook Page ID is not available to this Meta token")
    else:
        chosen = next((row for row in rows if (row.get("instagram_business_account") or {}).get("id")), rows[0])

    instagram = chosen.get("instagram_business_account") or {}
    return {
        "page_id": str(chosen.get("id", "")).strip(),
        "page_name": str(chosen.get("name", "")).strip(),
        "page_token": str(chosen.get("access_token", "")).strip() or token,
        "instagram_id": str(instagram.get("id", "")).strip(),
        "instagram_username": str(instagram.get("username", "")).strip(),
    }


def wait_for_public_image(url: str, attempts: int = 12, delay: int = 10) -> bool:
    for attempt in range(1, attempts + 1):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NexusNovaTrafficAutopilot/1.0"})
            with urllib.request.urlopen(req, timeout=20) as response:
                if 200 <= response.status < 300:
                    print(f"Instagram image reachable on attempt {attempt}.")
                    return True
        except Exception as exc:
            print(f"Instagram image not live yet ({attempt}/{attempts}): {exc}")
        if attempt < attempts:
            time.sleep(delay)
    return False


def post_instagram(item: dict, assets: dict) -> None:
    ig_id = assets.get("instagram_id", "")
    if not ig_id:
        raise RuntimeError("No connected Instagram professional account found")

    image_url = str(item.get("instagram_image", "")).strip()
    if not image_url:
        raise RuntimeError("No Instagram-safe article image was prepared")
    if not wait_for_public_image(image_url):
        raise RuntimeError("Instagram image did not become publicly reachable in time")

    title = str(item.get("title", "NexusNova tech update")).strip()
    summary = str(item.get("summary", "")).strip()
    article_url = str(item.get("url", "")).strip()
    caption = f"{title}\n\n{summary}\n\nRead more: {article_url}".strip()[:2200]
    token = assets.get("page_token", "")

    create = post_form(
        f"https://graph.facebook.com/v26.0/{urllib.parse.quote(ig_id)}/media",
        {"image_url": image_url, "caption": caption, "access_token": token},
    )
    creation_id = str(create.get("id", "")).strip()
    if not creation_id:
        raise RuntimeError("Instagram did not return a media container ID")

    finished = False
    for _ in range(10):
        query = urllib.parse.urlencode({"fields": "status_code,status", "access_token": token})
        status = get_json(f"https://graph.facebook.com/v26.0/{urllib.parse.quote(creation_id)}?{query}")
        code = str(status.get("status_code", "")).upper()
        if code == "FINISHED":
            finished = True
            break
        if code in {"ERROR", "EXPIRED"}:
            raise RuntimeError(f"Instagram media container status: {code}")
        time.sleep(3)
    if not finished:
        raise RuntimeError("Instagram media container did not finish processing in time")

    published = post_form(
        f"https://graph.facebook.com/v26.0/{urllib.parse.quote(ig_id)}/media_publish",
        {"creation_id": creation_id, "access_token": token},
    )
    if not published.get("id"):
        raise RuntimeError("Instagram media_publish did not return a media ID")


def main() -> None:
    if not PUBLISH.exists():
        print("No new article this run; social distribution skipped.")
        return
    item = json.loads(PUBLISH.read_text(encoding="utf-8"))
    title = item.get("title", "NexusNova tech update")
    summary = item.get("summary", "")
    url = item.get("url", "")
    message = f"{title}\n\n{summary}\n\n{url}".strip()

    sent = 0
    tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    tg_chat = os.getenv("TELEGRAM_CHANNEL_ID", "").strip()
    if tg_token and tg_chat:
        try:
            post_json(f"https://api.telegram.org/bot{tg_token}/sendMessage", {"chat_id": tg_chat, "text": message, "disable_web_page_preview": False})
            sent += 1
        except Exception as exc:
            print("Telegram warning:", exc)

    if all(os.getenv(name, "").strip() for name in ("X_API_KEY", "X_API_KEY_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")):
        try:
            post_x(title, url)
            sent += 1
        except Exception as exc:
            print("X warning:", exc)

    meta_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
    preferred_page = os.getenv("FACEBOOK_PAGE_ID", "").strip()
    assets = None
    if meta_token:
        try:
            assets = resolve_meta_assets(meta_token, preferred_page)
        except Exception as exc:
            print("Meta asset warning:", exc)

    if assets:
        try:
            post_form(
                f"https://graph.facebook.com/v26.0/{urllib.parse.quote(assets['page_id'])}/feed",
                {
                    "message": f"{title}\n\n{summary}",
                    "link": url,
                    "access_token": assets["page_token"],
                },
            )
            sent += 1
        except Exception as exc:
            print("Facebook warning:", exc)

        if assets.get("instagram_id"):
            try:
                post_instagram(item, assets)
                sent += 1
            except Exception as exc:
                print("Instagram warning:", exc)

    webhook = os.getenv("SOCIAL_WEBHOOK_URL", "").strip()
    if webhook:
        try:
            post_json(webhook, item)
            sent += 1
        except Exception as exc:
            print("Social webhook warning:", exc)

    print(f"Social destinations posted: {sent}. Unconfigured destinations are safely skipped.")


if __name__ == "__main__":
    main()
