from __future__ import annotations

import argparse
import html as html_lib
import json
import re
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social-growth-publish.json"
GENERATED = ROOT / "assets" / "generated"


def strip_tags(value: str) -> str:
    return " ".join(html_lib.unescape(re.sub(r"<[^>]+>", " ", value)).split())


def extract(pattern: str, text: str) -> str:
    match = re.search(pattern, text, flags=re.I | re.S)
    return strip_tags(match.group(1)) if match else ""


def load_font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size)
        except Exception:
            pass
    return ImageFont.load_default()


def tool_info(file_name: str) -> dict:
    path = (ROOT / file_name).resolve()
    if path.parent != ROOT or path.suffix.lower() != ".html" or not path.exists():
        raise SystemExit("Only an existing root-level HTML file can be announced.")
    text = path.read_text(encoding="utf-8")
    if "WebApplication" not in text or "tool-card" not in text:
        raise SystemExit("Page does not look like a NexusNova dedicated browser tool.")

    title = extract(r"<h1[^>]*>(.*?)</h1>", text) or extract(r"<title[^>]*>(.*?)</title>", text)
    title = re.sub(r"\s*[|—-]\s*NexusNova Tools\s*$", "", title, flags=re.I).strip()
    description = extract(r"<meta\s+name=[\"']description[\"']\s+content=[\"'](.*?)[\"']", text)
    if not description:
        description = extract(r"<meta\s+content=[\"'](.*?)[\"']\s+name=[\"']description[\"']", text)
    if not title or not description:
        raise SystemExit("Tool page is missing a usable title or meta description.")

    slug = path.stem
    url = f"https://nexusnovatools.com/{slug}.html"
    return {"path": path, "file": file_name, "slug": slug, "title": title, "description": description, "url": url}


def make_card(info: dict) -> str:
    GENERATED.mkdir(parents=True, exist_ok=True)
    rel = f"assets/generated/tool-launch-{info['slug']}-1080x1350.png"
    out = ROOT / rel

    canvas = Image.new("RGB", (1080, 1350), (10, 17, 31))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle((70, 70, 1010, 1280), radius=52, fill=(19, 31, 52), outline=(72, 105, 160), width=3)
    draw.rounded_rectangle((110, 120, 455, 188), radius=28, fill=(35, 72, 118))
    draw.text((145, 136), "NEW FREE TOOL", font=load_font(30, True), fill=(245, 249, 255))

    title_font = load_font(70, True)
    body_font = load_font(36, False)
    brand_font = load_font(32, True)
    small_font = load_font(26, False)

    title_lines = textwrap.wrap(info["title"], width=22)[:4]
    y = 260
    for line in title_lines:
        draw.text((110, y), line, font=title_font, fill=(255, 255, 255))
        y += 86

    y += 28
    desc_lines = textwrap.wrap(info["description"], width=45)[:5]
    for line in desc_lines:
        draw.text((112, y), line, font=body_font, fill=(196, 210, 232))
        y += 50

    draw.rounded_rectangle((110, 1010, 970, 1130), radius=30, fill=(11, 22, 39), outline=(72, 105, 160), width=2)
    draw.text((145, 1040), "Open in your browser • No install needed", font=small_font, fill=(219, 230, 246))
    draw.text((110, 1195), "NEXUSNOVA TOOLS", font=brand_font, fill=(255, 255, 255))
    draw.text((110, 1240), "nexusnovatools.com", font=small_font, fill=(159, 183, 218))
    canvas.save(out, format="PNG", optimize=True)
    return rel


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file")
    args = parser.parse_args()

    info = tool_info(args.file)
    image_rel = make_card(info)
    campaign = f"tool_launch_{datetime.now(timezone.utc).strftime('%Y%m%d')}_{info['slug']}"
    summary = info["description"]
    payload = {
        "format": "new_tool_launch",
        "campaign": campaign,
        "utm_content": info["slug"],
        "title": f"New free tool: {info['title']}",
        "hook": f"Just launched: {info['title']}",
        "summary": summary,
        "url": info["url"],
        "instagram_image": f"https://nexusnovatools.com/{image_rel}",
        "hashtags": ["NexusNova", "OnlineTools", "FreeTools", "Productivity"],
        "platform_copy": {
            "telegram": f"🆕 New NexusNova tool: {info['title']}\n\n{summary}\n\nFree to use in your browser.",
            "facebook": f"🆕 New free NexusNova tool: {info['title']}\n\n{summary}\n\nTry it directly in your browser.",
            "instagram": f"New free tool: {info['title']}\n\n{summary}",
            "x": f"New free NexusNova tool: {info['title']} — {summary}",
        },
        "source_file": info["file"],
        "generated_image": image_rel,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
