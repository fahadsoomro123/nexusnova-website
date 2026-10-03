from __future__ import annotations

import argparse
import hashlib
import html as html_lib
import json
import os
import re
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import premium_social_campaign as creative_engine  # noqa: E402

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


def make_card(info: dict) -> tuple[str, str]:
    GENERATED.mkdir(parents=True, exist_ok=True)
    rel = f"assets/generated/tool-launch-{info['slug']}-1080x1350.jpg"
    out = ROOT / rel

    visual_direction = creative_engine.visual_direction(info)
    prompt = (
        f"Hyper-realistic 3D product advertisement for the NexusNova tool "
        f"'{info['title']}'. {visual_direction} "
        f"Use this page description as the factual visual brief: {info['description']} "
        "Premium purple technology aesthetic, photoreal materials, physically plausible "
        "studio lighting, realistic glass and metal surfaces, cinematic depth of field, "
        "high-end SaaS campaign photography/rendering, polished 4:5 composition. "
        "Show the actual use-case rather than a generic abstract dashboard. "
        "No readable text, no logo, no watermark, no celebrity/person likeness."
    )

    seed = int(hashlib.sha256(info["url"].encode("utf-8")).hexdigest()[:8], 16)
    background, provider = creative_engine.download_ai_background(prompt, seed)
    copy = {
        "kicker": "NEW TOOL",
        "platform_copy": {},
    }
    creative_engine.render_branded(background, info, copy, out)
    return rel, provider


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("file")
    args = parser.parse_args()

    info = tool_info(args.file)
    image_rel, image_provider = make_card(info)
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
        "social_image": f"https://nexusnovatools.com/{image_rel}",
        "hashtags": ["NexusNova", "OnlineTools", "FreeTools", "Productivity"],
        "platform_copy": {
            "telegram": f"🆕 New NexusNova tool: {info['title']}\n\n{summary}\n\nFree to use in your browser.",
            "facebook": f"🆕 New free NexusNova tool: {info['title']}\n\n{summary}\n\nTry it directly in your browser.",
            "instagram": f"New free tool: {info['title']}\n\n{summary}",
            "x": f"New free NexusNova tool: {info['title']} — {summary}",
        },
        "source_file": info["file"],
        "generated_image": image_rel,
        "image_provider": image_provider,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
