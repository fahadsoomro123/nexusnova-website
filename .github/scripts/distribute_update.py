from __future__ import annotations

import json
import os
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

    x_token = os.getenv("X_ACCESS_TOKEN", "").strip()
    if x_token:
        try:
            x_text = f"{title}\n\n{url}"
            post_json("https://api.x.com/2/tweets", {"text": x_text[:275]}, {"Authorization": f"Bearer {x_token}"})
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
