from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://nexusnovatools.com"
KEY = "c9c42970f21e42d8a1c4bf79ce155852"
URLS_PATH = ROOT / "autopilot-changed-urls.txt"


def main() -> None:
    if not URLS_PATH.exists():
        print("No changed URL list; skipping IndexNow.")
        return
    urls = [line.strip() for line in URLS_PATH.read_text(encoding="utf-8").splitlines() if line.strip().startswith(SITE)]
    urls = list(dict.fromkeys(urls))[:100]
    if not urls:
        print("No eligible URLs; skipping IndexNow.")
        return
    time.sleep(12)
    payload = json.dumps({"host": "nexusnovatools.com", "key": KEY, "keyLocation": f"{SITE}/{KEY}.txt", "urlList": urls}).encode()
    req = urllib.request.Request("https://api.indexnow.org/indexnow", data=payload, headers={"Content-Type": "application/json", "User-Agent": "NexusNovaTrafficAutopilot/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            print(f"IndexNow accepted {len(urls)} URL(s): HTTP {response.status}")
    except Exception as exc:
        print(f"IndexNow submission warning: {exc}")


if __name__ == "__main__":
    main()
