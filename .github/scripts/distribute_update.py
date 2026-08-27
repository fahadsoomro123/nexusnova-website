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


def post_json(url: str, payload: dict, headers: dict[str, str] | None = None) -> None:
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "User-Agent": "NexusNovaTrafficAutopilot/1.0", **(headers or {})})
    with urllib.request.urlopen(req, timeout=25) as response:
        print(url.split("?")[0], response.status)


def post_form(url: str, payload: dict) -> None:
    body = urllib.parse.urlencode(payload).encode()
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/x-www-form-urlencoded", "User-Agent": "NexusNovaTrafficAutopilot/1.0"})
    with urllib.request.urlopen(req, timeout=25) as response:
        print(url.split("?")[0], response.status)


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
    # Keep the article URL intact; use a conservative raw-character budget.
    available_title = max(0, 275 - len(url) - 2)
    text = f"{title[:available_title]}\n\n{url}" if url else title[:275]
    auth = oauth1_header("POST", endpoint, api_key, api_secret, access_token, access_secret)
    post_json(endpoint, {"text": text}, {"Authorization": auth})


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

    fb_page = os.getenv("FACEBOOK_PAGE_ID", "").strip()
    fb_token = os.getenv("FACEBOOK_PAGE_ACCESS_TOKEN", "").strip()
    if fb_page and fb_token:
        try:
            post_form(f"https://graph.facebook.com/v24.0/{urllib.parse.quote(fb_page)}/feed", {"message": f"{title}\n\n{summary}", "link": url, "access_token": fb_token})
            sent += 1
        except Exception as exc:
            print("Facebook warning:", exc)

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
