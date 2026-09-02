from __future__ import annotations

import hashlib
import html
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from ai_provider import ai_json, status as ai_status  # noqa: E402

SITE = "https://nexusnovatools.com"
OUT = ROOT / "premium-social-publish.json"
HISTORY = ROOT / "assets/data/premium-social-history.json"
GENERATED = ROOT / "assets/generated"

EXCLUDE = {
    "privacy", "terms", "contact", "about", "cookie", "disclaimer", "editorial-team",
    "login", "register", "auth", "account", "404", "sitemap", "llms",
}
ANGLES = {
    1: ("QUICK WIN", "Show a fast, practical result the visitor can get in under a minute."),
    2: ("SOLVE IT", "Frame a real everyday problem and show this NexusNova page as the clean solution."),
    3: ("PRO TIP", "Teach one useful trick or benefit without sounding salesy."),
    4: ("TOOL SPOTLIGHT", "Show what makes this utility worth bookmarking or sharing."),
    5: ("SMARTER WORKFLOW", "Position the page as a polished productivity shortcut with a clear CTA."),
}
PRIORITY_WORDS = {
    "pdf": 9, "image": 8, "qr": 8, "currency": 8, "gold": 8, "weather": 7,
    "calculator": 7, "meeting": 7, "resume": 7, "whatsapp": 7, "converter": 6,
    "network": 6, "dns": 6, "ssl": 6, "live": 6, "crypto": 6,
}


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def clean(value: str, limit: int = 500) -> str:
    value = html.unescape(re.sub(r"\s+", " ", str(value or ""))).strip()
    if len(value) <= limit:
        return value
    return value[: max(0, limit - 1)].rstrip(" ,.;:-") + "…"


def slot_number() -> int:
    raw = os.getenv("SOCIAL_SLOT", "").strip()
    try:
        value = int(raw)
    except Exception:
        value = 1
    return min(5, max(1, value))


def local_metadata(url: str) -> dict | None:
    parts = urlsplit(url)
    if parts.netloc != "nexusnovatools.com":
        return None
    path = parts.path or "/"
    lowered = path.lower()
    if any(word in lowered for word in EXCLUDE):
        return None
    rel = "index.html" if path == "/" else path.lstrip("/")
    target = ROOT / rel
    if not target.exists() or not target.is_file() or target.suffix.lower() != ".html":
        return None
    text = target.read_text(encoding="utf-8", errors="ignore")
    if re.search(r"<meta[^>]+name=[\"']robots[\"'][^>]+content=[\"'][^\"']*noindex", text, re.I):
        return None
    title_match = re.search(r"<title[^>]*>(.*?)</title>", text, re.I | re.S)
    desc_match = re.search(r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)", text, re.I | re.S)
    if not desc_match:
        desc_match = re.search(r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+name=[\"']description[\"']", text, re.I | re.S)
    title = clean(re.sub(r"<[^>]+>", " ", title_match.group(1) if title_match else ""), 100)
    title = re.sub(r"\s*[|–—-]\s*NexusNova(?: Tools)?\s*$", "", title, flags=re.I).strip()
    description = clean(desc_match.group(1) if desc_match else "", 230)
    if not title:
        return None
    return {"url": f"{SITE}{path}", "path": path, "title": title, "summary": description}


def sitemap_urls() -> list[str]:
    urls: list[str] = []
    for sitemap in sorted(ROOT.glob("sitemap*.xml")):
        try:
            root = ET.fromstring(sitemap.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            continue
        for node in root.iter():
            if node.tag.rsplit("}", 1)[-1] != "loc" or not node.text:
                continue
            value = node.text.strip()
            if value.startswith(SITE) and value not in urls:
                urls.append(value)
    return urls


def recent_age_days(history: list[dict], url: str, now: datetime) -> float | None:
    for row in reversed(history):
        if str(row.get("url", "")).split("?", 1)[0] != url:
            continue
        stamp = row.get("generated_at") or row.get("published_at")
        try:
            parsed = datetime.fromisoformat(str(stamp).replace("Z", "+00:00"))
            return max(0.0, (now - parsed).total_seconds() / 86400)
        except Exception:
            return 0.0
    return None


def choose_candidate(slot: int) -> dict:
    now = datetime.now(timezone.utc)
    history_doc = load_json(HISTORY, {"version": 1, "posts": []})
    history = history_doc.get("posts") if isinstance(history_doc, dict) else []
    if not isinstance(history, list):
        history = []

    rows: list[dict] = []
    for url in sitemap_urls():
        item = local_metadata(url)
        if not item:
            continue
        age = recent_age_days(history, item["url"], now)
        if age is not None and age < 4:
            continue
        lowered = f"{item['title']} {item['path']}".lower()
        score = 20.0
        score += sum(weight for word, weight in PRIORITY_WORDS.items() if word in lowered)
        if age is None:
            score += 22
        else:
            score += min(18, age * 1.4)
        entropy = hashlib.sha256(f"{now:%Y-%m-%d}:{slot}:{item['url']}".encode()).digest()[0] / 255
        score += entropy * 7
        item["score"] = round(score, 2)
        rows.append(item)

    if not rows:
        for url in sitemap_urls():
            item = local_metadata(url)
            if item:
                item["score"] = 1
                rows.append(item)
    if not rows:
        raise SystemExit("Premium social campaign: no safe indexable page candidate found")
    rows.sort(key=lambda row: row["score"], reverse=True)
    return rows[0]


def fetch_trends(limit: int = 12) -> list[str]:
    req = urllib.request.Request(
        "https://trends.google.com/trending/rss?geo=PK",
        headers={"User-Agent": "NexusNovaPremiumSocial/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            root = ET.fromstring(response.read())
        values: list[str] = []
        for item in root.findall(".//item"):
            title = clean(item.findtext("title") or "", 100)
            if title and title not in values:
                values.append(title)
            if len(values) >= limit:
                break
        return values
    except Exception as exc:
        print("Trend feed unavailable; using evergreen relevance only:", exc)
        return []


def fallback_copy(item: dict, slot: int) -> dict:
    kicker, _ = ANGLES[slot]
    title = item["title"]
    summary = clean(item.get("summary", ""), 165)
    keyword = re.sub(r"[^A-Za-z0-9]", "", title.split()[0].title()) or "Productivity"
    tags = ["NexusNova", "OnlineTools", keyword]
    hook = clean(f"{title} — a faster way to handle the task without extra installs.", 190)
    return {
        "hook": hook,
        "kicker": kicker,
        "hashtags": tags,
        "platform_copy": {
            "x": hook,
            "facebook": clean(f"{title}\n\n{summary}\n\nA practical browser-based shortcut from NexusNova Tools. Try it and save it for later.", 700),
            "instagram": clean(f"{title}\n\n{summary}\n\nA clean browser shortcut worth saving. Explore it on NexusNova Tools.", 1500),
        },
        "image_prompt": f"Premium futuristic editorial technology visual representing {title}; clean cinematic composition, dark navy and electric cyan ambience, sophisticated glass interfaces, realistic depth, no readable text, no logos, no watermark, no people, professional SaaS campaign aesthetic.",
        "copy_provider": "deterministic",
    }


def build_copy(item: dict, slot: int, trends: list[str]) -> dict:
    kicker, angle = ANGLES[slot]
    prompt = f"""You are the senior social-media creative director for NexusNova Tools.
Create one premium campaign for this exact page.

PAGE TITLE: {item['title']}
PAGE DESCRIPTION: {item.get('summary','')}
PAGE URL: {item['url']}
CONTENT ANGLE: {angle}
CURRENT GOOGLE TRENDS PAKISTAN HEADLINES (use only if DIRECTLY relevant; otherwise ignore): {json.dumps(trends, ensure_ascii=False)}

Return JSON only with exactly these keys:
{{
  "hook": "...",
  "x": "...",
  "facebook": "...",
  "instagram": "...",
  "hashtags": ["..."],
  "image_prompt": "..."
}}

Rules:
- Professional, premium, useful, human copy. No fake claims, no fake urgency, no engagement bait.
- X copy max 190 characters BEFORE the URL and hashtags are added.
- Facebook copy 180-650 characters. Instagram copy 220-1300 characters.
- 3 to 5 concise hashtags. Always include NexusNova. Use a current-trend hashtag only when the trend is genuinely relevant to this page.
- Do not put URLs inside the platform copy; the publisher adds tracked links.
- Image prompt must describe a high-end 4:5 social visual related to the page: cinematic, polished SaaS/editorial quality, dark premium technology aesthetic, strong visual metaphor, no readable text, no logo, no watermark, no celebrity/person likeness.
"""
    data = ai_json(prompt)
    if not isinstance(data, dict):
        return fallback_copy(item, slot)

    tags: list[str] = []
    for raw in data.get("hashtags") or []:
        tag = re.sub(r"[^A-Za-z0-9_]", "", str(raw).lstrip("#"))[:30]
        if tag and tag.lower() not in {x.lower() for x in tags}:
            tags.append(tag)
    if not any(tag.lower() == "nexusnova" for tag in tags):
        tags.insert(0, "NexusNova")
    tags = tags[:5]
    if len(tags) < 3:
        tags.extend(x for x in ["OnlineTools", "Productivity"] if x not in tags)

    image_prompt = clean(data.get("image_prompt", ""), 900)
    if not image_prompt:
        image_prompt = fallback_copy(item, slot)["image_prompt"]
    return {
        "hook": clean(data.get("hook") or data.get("x") or item["title"], 200),
        "kicker": kicker,
        "hashtags": tags[:5],
        "platform_copy": {
            "x": clean(data.get("x") or data.get("hook") or item["title"], 190),
            "facebook": clean(data.get("facebook") or item.get("summary") or item["title"], 700),
            "instagram": clean(data.get("instagram") or item.get("summary") or item["title"], 1500),
        },
        "image_prompt": image_prompt,
        "copy_provider": ai_status(),
    }


def get_font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            pass
    return ImageFont.load_default()


def download_ai_background(prompt: str, seed: int) -> tuple[Image.Image, str]:
    prompt = clean(prompt, 800)
    encoded = urllib.parse.quote(prompt, safe="")
    key = os.getenv("POLLINATIONS_API_KEY", "").strip()
    attempts: list[tuple[str, dict[str, str], str]] = []
    if key:
        attempts.append((
            f"https://gen.pollinations.ai/image/{encoded}?model=flux&width=1536&height=1920&enhance=true&nologo=true&seed={seed}",
            {"Authorization": f"Bearer {key}"},
            "pollinations-flux-key",
        ))
    for model in ("flux", "zimage", "klein"):
        attempts.append((
            f"https://image.pollinations.ai/prompt/{encoded}?model={model}&width=1536&height=1920&enhance=true&nologo=true&seed={seed}",
            {},
            f"pollinations-{model}-free",
        ))

    last_error: Exception | None = None
    for url, headers, provider in attempts:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "NexusNovaPremiumSocial/1.0", **headers})
            with urllib.request.urlopen(req, timeout=120) as response:
                content_type = str(response.headers.get("Content-Type", "")).lower()
                raw = response.read(16 * 1024 * 1024)
            if not raw or (content_type and "image/" not in content_type):
                raise RuntimeError(f"unexpected image response: {content_type}")
            image = Image.open(io.BytesIO(raw)).convert("RGB")
            if min(image.size) < 700:
                raise RuntimeError(f"AI image too small: {image.size}")
            print("AI social background generated via", provider, image.size)
            return image, provider
        except Exception as exc:
            last_error = exc
            print(provider, "failed:", exc)
    raise RuntimeError(f"AI-only creative gate: free image generation failed; refusing non-AI fallback ({last_error})")


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_width: int, max_lines: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        box = draw.textbbox((0, 0), candidate, font=font)
        if box[2] - box[0] <= max_width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
            if len(lines) >= max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    return lines[:max_lines]


def render_branded(background: Image.Image, item: dict, copy: dict, target: Path) -> None:
    base = ImageOps.fit(background, (1080, 1350), method=Image.Resampling.LANCZOS)
    base = ImageEnhance.Contrast(base).enhance(1.08)
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for y in range(650, 1350):
        alpha = int(18 + 190 * ((y - 650) / 700))
        od.rectangle((0, y, 1080, y + 1), fill=(3, 10, 22, min(220, alpha)))
    od.rounded_rectangle((64, 62, 1016, 172), radius=34, fill=(4, 14, 30, 185), outline=(126, 225, 255, 120), width=2)
    composed = Image.alpha_composite(base.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(composed)

    brand_font = get_font(36, True)
    small_font = get_font(25, True)
    title_font = get_font(58, True)
    body_font = get_font(29, False)
    cta_font = get_font(29, True)

    draw.text((100, 92), "NEXUSNOVA TOOLS", font=brand_font, fill=(242, 250, 255, 255))
    draw.text((785, 101), "AI VISUAL", font=small_font, fill=(151, 227, 255, 255))

    draw.text((78, 845), copy["kicker"], font=small_font, fill=(132, 231, 255, 255))
    y = 900
    for line in wrap(draw, item["title"], title_font, 900, 3):
        draw.text((78, y), line, font=title_font, fill=(255, 255, 255, 255))
        y += 70
    summary = clean(item.get("summary", ""), 150)
    if summary:
        for line in wrap(draw, summary, body_font, 900, 2):
            draw.text((80, y + 10), line, font=body_font, fill=(214, 226, 238, 255))
            y += 42
    draw.rounded_rectangle((78, 1232, 610, 1300), radius=30, fill=(235, 247, 255, 236))
    draw.text((112, 1249), "Explore free • nexusnovatools.com", font=cta_font, fill=(8, 27, 46, 255))

    target.parent.mkdir(parents=True, exist_ok=True)
    composed.convert("RGB").save(target, "JPEG", quality=93, optimize=True, progressive=True)


def main() -> None:
    if OUT.exists():
        OUT.unlink()
    slot = slot_number()
    item = choose_candidate(slot)
    trends = fetch_trends()
    copy = build_copy(item, slot, trends)

    now = datetime.now(timezone.utc)
    seed = int(hashlib.sha256(f"{now:%Y-%m-%d}:{slot}:{item['url']}".encode()).hexdigest()[:8], 16)
    background, image_provider = download_ai_background(copy["image_prompt"], seed)
    image_path = GENERATED / f"premium-social-slot-{slot}.jpg"
    render_branded(background, item, copy, image_path)
    version = f"{now:%Y%m%d}-{slot}-{seed % 100000}"
    image_url = f"{SITE}/assets/generated/{image_path.name}?v={version}"
    campaign = f"premium_social_{now:%Y%m%d}_s{slot}_{re.sub(r'[^a-z0-9]+','-',item['title'].lower()).strip('-')[:28]}"

    payload = {
        "kind": "premium_social",
        "generated_at": now.isoformat().replace("+00:00", "Z"),
        "slot": slot,
        "title": item["title"],
        "summary": item.get("summary", ""),
        "url": item["url"],
        "hook": copy["hook"],
        "hashtags": copy["hashtags"],
        "platform_copy": copy["platform_copy"],
        "campaign": campaign,
        "utm_content": f"premium_s{slot}",
        "instagram_image": image_url,
        "social_image": image_url,
        "image_provider": image_provider,
        "copy_provider": copy["copy_provider"],
        "trend_inputs": trends,
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    history_doc = load_json(HISTORY, {"version": 1, "posts": []})
    posts = history_doc.get("posts") if isinstance(history_doc, dict) else []
    if not isinstance(posts, list):
        posts = []
    posts.append({
        "generated_at": payload["generated_at"],
        "slot": slot,
        "url": item["url"],
        "title": item["title"],
        "campaign": campaign,
        "image_provider": image_provider,
    })
    HISTORY.parent.mkdir(parents=True, exist_ok=True)
    HISTORY.write_text(json.dumps({"version": 1, "posts": posts[-500:]}, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"selected": item["url"], "slot": slot, "campaign": campaign, "image": image_url, "image_provider": image_provider}, indent=2))


if __name__ == "__main__":
    main()
