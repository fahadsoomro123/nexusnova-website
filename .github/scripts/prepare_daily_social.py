from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ARTICLE_PAYLOAD = ROOT / 'autopilot-publish.json'
SOCIAL_PAYLOAD = ROOT / 'social-publish.json'
PULSE = ROOT / 'assets/data/live-tech-pulse.json'
IMAGE_PATH = ROOT / 'assets/generated/daily-social-card.jpg'
SITE = 'https://nexusnovatools.com'


def font(size: int, bold: bool = False):
    candidates = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, fnt, max_width: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ''
    for word in words:
        candidate = f'{current} {word}'.strip()
        box = draw.textbbox((0, 0), candidate, font=fnt)
        if box[2] - box[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def draw_card(title: str, summary: str, stamp: str) -> None:
    IMAGE_PATH.parent.mkdir(parents=True, exist_ok=True)
    size = 1080
    img = Image.new('RGB', (size, size), '#07111f')
    px = img.load()
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(7 + 7 * t)
        g = int(17 + 18 * t)
        b = int(31 + 24 * t)
        for x in range(size):
            glow = max(0.0, 1.0 - (((x - 820) ** 2 + (y - 170) ** 2) ** 0.5) / 850)
            px[x, y] = (min(255, r + int(9 * glow)), min(255, g + int(33 * glow)), min(255, b + int(48 * glow)))

    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((70, 70, 1010, 1010), radius=44, outline='#3a85b8', width=3, fill='#0b1727')
    draw.rounded_rectangle((96, 96, 984, 184), radius=28, fill='#10253a')

    brand = font(38, True)
    kicker = font(28, True)
    title_font = font(72, True)
    body = font(34, False)
    url_font = font(30, True)
    small = font(24, False)

    draw.text((126, 116), 'NEXUSNOVA TOOLS', font=brand, fill='#e8f6ff')
    draw.text((126, 225), 'FREE TOOL OF THE DAY', font=kicker, fill='#7ed7ff')

    y = 292
    for line in wrap(draw, title, title_font, 820)[:4]:
        draw.text((126, y), line, font=title_font, fill='#ffffff')
        y += 88

    y += 24
    for line in wrap(draw, summary, body, 820)[:5]:
        draw.text((126, y), line, font=body, fill='#c7d6e3')
        y += 50

    draw.rounded_rectangle((126, 840, 690, 918), radius=24, fill='#dff6ff')
    draw.text((158, 861), 'Try it free in your browser', font=url_font, fill='#07111f')
    draw.text((126, 946), 'nexusnovatools.com', font=url_font, fill='#7ed7ff')
    draw.text((774, 954), stamp, font=small, fill='#8295a7')
    img.save(IMAGE_PATH, 'JPEG', quality=92, optimize=True)


def main() -> None:
    if SOCIAL_PAYLOAD.exists():
        SOCIAL_PAYLOAD.unlink()
    if ARTICLE_PAYLOAD.exists():
        print('Article payload exists; daily tool fallback not needed.')
        return
    if os.getenv('NEXUSNOVA_DAILY_SOCIAL', '').strip() != '1':
        print('Daily social fallback disabled for this event.')
        return
    if not PULSE.exists():
        print('No live tech pulse available; daily social fallback skipped.')
        return

    data = json.loads(PULSE.read_text(encoding='utf-8'))
    tool = data.get('tool_of_day') or {}
    title = str(tool.get('title', '')).strip()
    rel_url = str(tool.get('url', '')).strip()
    summary = str(tool.get('summary', '')).strip()
    if not title or not rel_url:
        print('Tool of the day is incomplete; daily social fallback skipped.')
        return
    if not summary:
        summary = 'A focused browser utility for a quick everyday digital task.'

    absolute = rel_url if rel_url.startswith('http') else f"{SITE}/{rel_url.lstrip('/')}"
    stamp = datetime.now(timezone.utc).strftime('%d %b %Y')
    draw_card(title, summary, stamp)

    payload = {
        'kind': 'tool_of_day',
        'title': f'Tool of the day: {title}',
        'summary': summary,
        'url': absolute,
        'instagram_image': f'{SITE}/assets/generated/daily-social-card.jpg',
        'hashtags': ['NexusNova', 'OnlineTools', 'Productivity'],
        'generated_at': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
    }
    SOCIAL_PAYLOAD.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f"Prepared daily social fallback: {title}")


if __name__ == '__main__':
    main()
