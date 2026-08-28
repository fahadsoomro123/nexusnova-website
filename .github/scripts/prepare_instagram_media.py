from __future__ import annotations

import json
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SITE_HOST = "nexusnovatools.com"
PUBLISH = ROOT / "autopilot-publish.json"


def main() -> None:
    if not PUBLISH.exists():
        print("No new article; Instagram image preparation skipped.")
        return

    item = json.loads(PUBLISH.read_text(encoding="utf-8"))
    image_url = str(item.get("image", "")).strip()
    parsed = urlparse(image_url)
    if parsed.scheme != "https" or parsed.netloc != SITE_HOST or not parsed.path:
        print("No NexusNova article image found; Instagram image preparation skipped.")
        return

    source = ROOT / parsed.path.lstrip("/")
    if not source.exists():
        print("Article image file is not available locally; Instagram image preparation skipped.")
        return

    target = source.with_name(source.stem + "-instagram.jpg")
    with Image.open(source) as img:
        rgb = img.convert("RGB")
        rgb.save(target, "JPEG", quality=92, optimize=True, progressive=True)

    item["instagram_image"] = f"https://{SITE_HOST}/{target.relative_to(ROOT).as_posix()}"
    PUBLISH.write_text(json.dumps(item, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared Instagram JPEG: {target.relative_to(ROOT).as_posix()}")


if __name__ == "__main__":
    main()
