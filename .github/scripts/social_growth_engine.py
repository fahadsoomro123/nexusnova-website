from __future__ import annotations

import html
import json
import re
import subprocess
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://nexusnovatools.com"
PULSE = ROOT / "assets/data/live-tech-pulse.json"
TRAFFIC = ROOT / "traffic-diagnosis.json"
ARTICLE = ROOT / "autopilot-publish.json"
HISTORY = ROOT / "assets/data/social-growth-history.json"
OUT = ROOT / "social-growth-publish.json"
REPORT = ROOT / "social-growth-report.txt"
FEED_IMAGE = ROOT / "assets/generated/social-growth-feed.jpg"
VERTICAL_IMAGE = ROOT / "assets/generated/social-growth-vertical.jpg"

EXCLUDED_PATH_PARTS = {
    "privacy", "terms", "contact", "about", "login", "register", "cookie",
    "disclaimer", "editorial-team", "tool-methodology", "account", "auth",
}
GENERIC_SOCIAL_HUBS = {
    "/", "/index.html", "/articles.html", "/tools.html", "/popular-tools.html",
    "/categories.html", "/guides.html", "/calculator-tools.html", "/pdf-tools.html",
    "/image-tools.html", "/productivity-tools.html", "/network-tools.html",
    "/pakistan-tools.html", "/trending-tools.html", "/live.html", "/labs.html",
}
STOPWORDS = {
    "the", "and", "for", "with", "from", "your", "this", "that", "free",
    "online", "tool", "tools", "calculator", "converter", "guide", "nexusnova",
    "how", "what", "why", "into", "using", "use", "best", "quick",
}
FORMATS = ["quick_tip", "problem_solution", "tool_demo", "bookmark_worthy"]

# Curated, existing utility pages for English-speaking markets. Scores are
# ranking priors for campaign selection, not keyword-volume or traffic estimates.
# The actual destination must also be tracked, canonical, indexable and live.
WESTERN_EVERGREEN_TOOLS = [
    {
        "path": "/jpg-to-pdf.html",
        "score": 74,
        "summary": "Turn multiple JPG/JPEG photos into one PDF. Choose US Letter, Legal or A4, set orientation and margins, and keep the files in your browser.",
    },
    {
        "path": "/heic-to-jpg.html",
        "score": 72,
        "summary": "Convert up to 10 HEIC/HEIF iPhone photos to JPG in your browser and download one ZIP for upload forms, editors or shared folders.",
    },
    {
        "path": "/paper-size-converter.html",
        "score": 69,
        "summary": "Convert A4, US Letter and Legal paper sizes to pixel dimensions at your target DPI before preparing print files or forms.",
    },
    {
        "path": "/image-compressor.html",
        "score": 67,
        "summary": "Reduce JPG, PNG or WebP image dimensions and file size in your browser for upload limits and faster sharing.",
    },
    {
        "path": "/image-resizer.html",
        "score": 66,
        "summary": "Resize JPG, PNG or WebP images to exact pixel dimensions while preserving their proportions.",
    },
    {
        "path": "/webp-to-jpg.html",
        "score": 65,
        "summary": "Convert WebP images to JPG for apps, upload forms and software that expects JPEG files.",
    },
    {
        "path": "/image-metadata-remover.html",
        "score": 64,
        "summary": "Create a clean image copy without common EXIF, GPS or camera metadata before sharing photos.",
    },
    {
        "path": "/qr-code-scanner.html",
        "score": 63,
        "summary": "Decode a QR code from a screenshot or photo and inspect the text or URL before opening it.",
    },
    {
        "path": "/timezone-meeting-planner.html",
        "score": 62,
        "summary": "Compare time zones for scheduling remote meetings across the US, UK, Europe and other regions.",
    },
    {
        "path": "/meta-tag-generator.html",
        "score": 61,
        "summary": "Generate SEO titles, meta descriptions, canonical, robots, Open Graph and Twitter tags with live previews.",
    },
    {
        "path": "/ai-token-calculator.html",
        "score": 60,
        "summary": "Estimate approximate LLM token count and context use before sending text to an AI API.",
    },
]
_TRACKED_PATHS: set[str] | None = None


def load_json(path: Path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def clean_text(value: str, limit: int = 220) -> str:
    value = html.unescape(re.sub(r"\s+", " ", str(value or ""))).strip()
    if len(value) <= limit:
        return value
    return value[: max(0, limit - 1)].rstrip(" ,.;:-") + "…"


def canonical_url(url: str) -> str:
    raw = str(url or "").strip()
    if not raw:
        return ""
    if raw.startswith("/"):
        raw = SITE + raw
    elif not raw.startswith("http"):
        raw = SITE + "/" + raw.lstrip("/")
    parts = urlsplit(raw)
    if parts.netloc and parts.netloc != "nexusnovatools.com":
        return ""
    path = parts.path or "/"
    if path == "/index.html":
        path = "/"
    return urlunsplit(("https", "nexusnovatools.com", path, "", ""))


def is_generic_social_hub(url: str) -> bool:
    path = urlsplit(url).path or "/"
    return path.lower() in GENERIC_SOCIAL_HUBS


def tracked_paths() -> set[str]:
    global _TRACKED_PATHS
    if _TRACKED_PATHS is None:
        try:
            result = subprocess.run(
                ["git", "ls-files", "-z"],
                cwd=ROOT,
                check=True,
                capture_output=True,
            )
            _TRACKED_PATHS = {
                value.decode("utf-8", errors="replace")
                for value in result.stdout.split(b"\0")
                if value
            }
        except Exception:
            # Fail closed: never promote a generated/untracked page.
            _TRACKED_PATHS = set()
    return _TRACKED_PATHS


def is_public_indexable_page(url: str) -> bool:
    """Only permit existing canonical pages that are tracked and not noindex."""
    canonical = canonical_url(url)
    if not canonical or is_generic_social_hub(canonical):
        return False
    path = urlsplit(canonical).path or "/"
    rel = "index.html" if path == "/" else path.lstrip("/")
    if not rel.endswith(".html") or rel not in tracked_paths():
        return False
    target = ROOT / rel
    if not target.is_file():
        return False
    try:
        raw = target.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False

    for tag in re.findall(r'<meta\b[^>]*>', raw, flags=re.I):
        name = re.search(r'\bname\s*=\s*["\']([^"\']+)["\']', tag, flags=re.I)
        content = re.search(r'\bcontent\s*=\s*["\']([^"\']*)["\']', tag, flags=re.I)
        if name and name.group(1).strip().lower() == "robots" and content:
            if "noindex" in content.group(1).lower().split(","):
                return False

    canonical_href = ""
    for tag in re.findall(r'<link\b[^>]*>', raw, flags=re.I):
        rel_match = re.search(r'\brel\s*=\s*["\']([^"\']+)["\']', tag, flags=re.I)
        if not rel_match or "canonical" not in rel_match.group(1).lower().split():
            continue
        href_match = re.search(r'\bhref\s*=\s*["\']([^"\']+)["\']', tag, flags=re.I)
        if href_match:
            canonical_href = href_match.group(1).strip()
            break
    return bool(canonical_href and canonical_url(canonical_href) == canonical)


def is_dedicated_tool(url: str) -> bool:
    path = urlsplit(url).path or "/"
    rel = "index.html" if path == "/" else path.lstrip("/")
    if not rel.endswith(".html"):
        return False
    target = ROOT / rel
    if not target.exists() or not target.is_file():
        return False
    try:
        raw = target.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False
    compact = re.sub(r"\s+", "", raw)
    return '"@type":"WebApplication"' in compact


def local_html_metadata(url: str) -> tuple[str, str] | None:
    parts = urlsplit(url)
    path = parts.path or "/"
    lowered = path.lower()
    if any(part in lowered for part in EXCLUDED_PATH_PARTS):
        return None
    rel = "index.html" if path == "/" else path.lstrip("/")
    if not rel.endswith(".html"):
        return None
    target = ROOT / rel
    if not target.exists() or not target.is_file():
        return None
    try:
        text = target.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None
    title_match = re.search(r"<title[^>]*>(.*?)</title>", text, flags=re.I | re.S)
    desc_match = re.search(
        r"<meta[^>]+name=[\"']description[\"'][^>]+content=[\"']([^\"']+)",
        text,
        flags=re.I | re.S,
    )
    if not desc_match:
        desc_match = re.search(
            r"<meta[^>]+content=[\"']([^\"']+)[\"'][^>]+name=[\"']description[\"']",
            text,
            flags=re.I | re.S,
        )
    title = clean_text(re.sub(r"<[^>]+>", " ", title_match.group(1) if title_match else ""), 100)
    summary = clean_text(desc_match.group(1) if desc_match else "", 220)
    if not title:
        return None
    title = re.sub(r"\s*[|–—-]\s*NexusNova(?: Tools)?\s*$", "", title, flags=re.I).strip()
    return title, summary


def add_candidate(pool: dict[str, dict], url: str, title: str, summary: str, source: str, score: float, reason: str) -> None:
    url = canonical_url(url)
    if not url or not is_public_indexable_page(url):
        return
    if is_generic_social_hub(url):
        return
    metadata = local_html_metadata(url)
    if metadata:
        local_title, local_summary = metadata
        title = clean_text(title or local_title, 100)
        summary = clean_text(summary or local_summary, 220)
    else:
        title = clean_text(title, 100)
        summary = clean_text(summary, 220)
    if not title:
        return
    candidate_path = urlsplit(url).path or "/"
    if any(part in candidate_path.lower() for part in EXCLUDED_PATH_PARTS):
        return
    row = pool.get(url)
    if not row:
        dedicated_bonus = 24.0 if is_dedicated_tool(url) else 0.0
        reasons = [reason]
        if dedicated_bonus:
            reasons.append("dedicated interactive utility priority bonus")
        pool[url] = {
            "url": url,
            "title": title,
            "summary": summary or "A focused NexusNova browser utility for an everyday digital task.",
            "source": source,
            "score": float(score) + dedicated_bonus,
            "reasons": reasons,
        }
        return
    row["score"] += float(score)
    if reason not in row["reasons"]:
        row["reasons"].append(reason)
    if len(summary) > len(row.get("summary", "")):
        row["summary"] = summary


def build_candidates() -> dict[str, dict]:
    pool: dict[str, dict] = {}

    article = load_json(ARTICLE, {})
    if article:
        add_candidate(
            pool,
            article.get("url", ""),
            article.get("title", ""),
            article.get("summary", ""),
            "fresh_article",
            42,
            "fresh useful article created by today's traffic autopilot",
        )

    pulse = load_json(PULSE, {})
    tool = pulse.get("tool_of_day") or {}
    if tool:
        add_candidate(
            pool,
            tool.get("url", ""),
            tool.get("title", ""),
            tool.get("summary", ""),
            "tool_of_day",
            55,
            "curated Tool of the Day",
        )

    traffic = load_json(TRAFFIC, {})
    gains = (((traffic.get("gsc") or {}).get("page_movers") or {}).get("gains") or [])[:12]
    for row in gains:
        imp = max(0.0, float(row.get("impressions_delta", 0) or 0))
        clicks = max(0.0, float(row.get("current_clicks", 0) or 0))
        score = 24 + min(30, imp * 0.35) + min(15, clicks * 4)
        add_candidate(
            pool,
            row.get("page", ""),
            "",
            "",
            "gsc_momentum",
            score,
            f"Google Search momentum: +{round(imp, 1)} impressions",
        )

    landings = (((traffic.get("ga4") or {}).get("landing_pages") or []))[:20]
    for row in landings:
        path = str(row.get("dimension", "") or "").strip()
        if not path:
            continue
        sessions = max(0.0, float(row.get("sessions", 0) or 0))
        engaged = max(0.0, float(row.get("engagedSessions", 0) or 0))
        if sessions <= 0:
            continue
        engagement = engaged / sessions if sessions else 0
        if engaged <= 0:
            score = -8 - min(32, sessions * 4)
            reason = f"GA4 quality warning: {round(sessions, 1)} sessions / 0 engaged; zero-engagement penalty applied"
        elif engagement < 0.25:
            score = 8 + min(12, sessions * 0.8) + min(8, engagement * 8)
            reason = f"GA4 weak engagement: {round(sessions, 1)} sessions / {round(engaged, 1)} engaged"
        else:
            score = 22 + min(24, sessions * 1.5) + min(18, engagement * 18)
            reason = f"GA4 engaged landing-page signal: {round(sessions, 1)} sessions / {round(engaged, 1)} engaged"
        add_candidate(
            pool,
            path,
            "",
            "",
            "ga4_engagement",
            score,
            reason,
        )

    # Ensure one daily candidate exists even when GSC/GA4 credentials are unavailable.
    # Real GSC momentum and GA4 engagement still add score to matching pages above.
    for row in WESTERN_EVERGREEN_TOOLS:
        add_candidate(
            pool,
            row["path"],
            "",
            row["summary"],
            "western_evergreen",
            float(row["score"]),
            "curated English-language utility for US/Canada/UK/Australia use cases",
        )

    return pool


def campaign_performance(history: list[dict], traffic: dict) -> tuple[dict[str, float], dict[str, float]]:
    rows = (((traffic.get("ga4") or {}).get("social_campaigns") or []))
    by_campaign = {str(row.get("dimension", "")): row for row in rows if row.get("dimension")}
    url_bonus: dict[str, float] = defaultdict(float)
    format_score: dict[str, float] = defaultdict(float)
    for entry in history[-60:]:
        campaign = str(entry.get("campaign", ""))
        perf = by_campaign.get(campaign)
        if not perf:
            continue
        sessions = max(0.0, float(perf.get("sessions", 0) or 0))
        engaged = max(0.0, float(perf.get("engagedSessions", 0) or 0))
        if sessions <= 0:
            continue
        quality = sessions + 1.8 * engaged
        url = canonical_url(entry.get("url", ""))
        if url:
            url_bonus[url] += min(24.0, quality * 1.5)
        fmt = str(entry.get("format", ""))
        if fmt:
            format_score[fmt] += quality
    return dict(url_bonus), dict(format_score)


def apply_history(pool: dict[str, dict], history: list[dict], traffic: dict) -> None:
    now = datetime.now(timezone.utc)
    url_bonus, _ = campaign_performance(history, traffic)
    for row in pool.values():
        row["score"] += url_bonus.get(row["url"], 0)
        if url_bonus.get(row["url"], 0):
            row["reasons"].append("previous social campaign brought engaged website visits")

        last_seen_days = None
        for entry in reversed(history):
            if canonical_url(entry.get("url", "")) != row["url"]:
                continue
            try:
                stamp = datetime.fromisoformat(str(entry.get("generated_at", "")).replace("Z", "+00:00"))
                last_seen_days = (now - stamp).total_seconds() / 86400
            except Exception:
                last_seen_days = 0
            break
        if last_seen_days is None:
            continue
        row["days_since_last_social"] = round(last_seen_days, 1)
        if last_seen_days < 3:
            row["score"] -= 1000
            row["reasons"].append("hard repeat-protection cooldown (<3 days)")
        elif last_seen_days < 7:
            row["score"] -= 35
            row["reasons"].append("recent-post diversity penalty (<7 days)")
        elif last_seen_days < 14:
            row["score"] -= 12


def choose_format(history: list[dict], traffic: dict) -> str:
    _, performance = campaign_performance(history, traffic)
    recent = [str(row.get("format", "")) for row in history[-8:]]
    counts = {fmt: recent.count(fmt) for fmt in FORMATS}
    if performance and sum(performance.values()) >= 4:
        ranked = sorted(FORMATS, key=lambda fmt: (performance.get(fmt, 0), -counts[fmt]), reverse=True)
        if ranked:
            return ranked[0]
    return min(FORMATS, key=lambda fmt: (counts[fmt], -FORMATS.index(fmt)))


def slugify(value: str, limit: int = 38) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (value[:limit].rstrip("-") or "nexusnova")


def keyword_tags(title: str) -> list[str]:
    words = re.findall(r"[A-Za-z][A-Za-z0-9]{2,}", title)
    useful = []
    for word in words:
        key = word.lower()
        if key in STOPWORDS:
            continue
        tag = re.sub(r"[^A-Za-z0-9]", "", word.title())
        if tag and tag not in useful:
            useful.append(tag)
    return ["NexusNova", "OnlineTools", *useful[:3]][:5]


def build_copy(item: dict, fmt: str) -> dict:
    title = item["title"]
    summary = clean_text(item.get("summary", ""), 180)
    if fmt == "quick_tip":
        hook = f"Quick shortcut: {title}"
        kicker = "SAVE THIS SHORTCUT"
    elif fmt == "problem_solution":
        hook = f"Need {title}? Skip the manual hassle."
        kicker = "SOLVE IT FASTER"
    elif fmt == "tool_demo":
        hook = f"One useful browser tool: {title}"
        kicker = "TOOL DEMO"
    else:
        hook = f"Worth bookmarking: {title}"
        kicker = "BOOKMARK THIS"

    path = (urlsplit(item.get("url", "")).path or "").lower()
    market_hooks = {
        "/jpg-to-pdf.html": ("Turn phone photos into a US Letter, Legal or A4 PDF", "PRINT-READY PDF"),
        "/heic-to-jpg.html": ("Convert iPhone HEIC photos to JPG in one batch", "IPHONE PHOTO WORKFLOW"),
        "/paper-size-converter.html": ("Match US Letter, Legal or A4 to your target DPI", "PAPER SIZE CHECK"),
        "/image-compressor.html": ("Shrink images before upload size limits get in the way", "IMAGE SIZE CONTROL"),
        "/image-resizer.html": ("Resize images to exact pixels without stretching", "EXACT IMAGE DIMENSIONS"),
        "/webp-to-jpg.html": ("Make a WebP image work where JPEG is required", "IMAGE COMPATIBILITY"),
        "/image-metadata-remover.html": ("Remove common photo metadata before sharing", "PRIVACY CHECK"),
        "/qr-code-scanner.html": ("Read a QR code and inspect its URL before opening", "CHECK BEFORE OPENING"),
        "/timezone-meeting-planner.html": ("Find a meeting time that works across US and UK time zones", "REMOTE TEAM SCHEDULING"),
        "/meta-tag-generator.html": ("Build SEO and social preview tags with a live check", "PUBLISHING WORKFLOW"),
        "/ai-token-calculator.html": ("Estimate LLM tokens before an API request", "AI DEVELOPER TOOL"),
    }
    if path in market_hooks:
        hook, kicker = market_hooks[path]

    cta = "Try it free on NexusNova Tools"
    tags = keyword_tags(title)
    tag_text = " ".join(f"#{tag}" for tag in tags)
    return {
        "hook": clean_text(hook, 115),
        "kicker": kicker,
        "cta": cta,
        "hashtags": tags,
        "platform_copy": {
            "telegram": clean_text(f"⚡ {hook}\n\n{summary}\n\n{cta}:", 700),
            "facebook": clean_text(f"{hook}\n\n{summary}\n\nSave this for later. {cta}.", 900),
            "instagram": clean_text(f"{hook}\n\n{summary}\n\nSave this post for later. {cta}.\n\n{tag_text}", 1800),
            "x": clean_text(f"{hook} {summary}", 220),
        },
    }


def get_font(size: int, bold: bool = False):
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, text: str, font, width: int, max_lines: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        bbox = draw.textbbox((0, 0), candidate, font=font)
        if bbox[2] - bbox[0] <= width or not current:
            current = candidate
        else:
            lines.append(current)
            current = word
            if len(lines) >= max_lines:
                break
    if current and len(lines) < max_lines:
        lines.append(current)
    if words and lines:
        joined = " ".join(lines)
        original = " ".join(words)
        if len(joined) < len(original) and not lines[-1].endswith("…"):
            lines[-1] = lines[-1].rstrip(" ,.;:-") + "…"
    return lines[:max_lines]


def render_card(path: Path, width: int, height: int, item: dict, copy: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (width, height), "#07111f")
    draw = ImageDraw.Draw(img)
    margin = int(width * 0.075)
    card = (margin, margin, width - margin, height - margin)
    draw.rounded_rectangle(card, radius=46, fill="#0b1727", outline="#2c79a8", width=3)

    brand = get_font(max(30, width // 30), True)
    kicker_font = get_font(max(24, width // 37), True)
    hook_font = get_font(max(38, width // 18), True)
    title_font = get_font(max(44, width // 15), True)
    body_font = get_font(max(28, width // 30), False)
    cta_font = get_font(max(28, width // 30), True)
    small_font = get_font(max(21, width // 44), False)

    left = margin + 48
    right_width = width - left - margin - 48
    y = margin + 48
    draw.text((left, y), "NEXUSNOVA TOOLS", font=brand, fill="#e8f6ff")
    y += int(brand.size * 1.65) if hasattr(brand, "size") else 60
    draw.rounded_rectangle((left, y, left + min(right_width, 470), y + 62), radius=24, fill="#102b40")
    draw.text((left + 24, y + 14), copy["kicker"], font=kicker_font, fill="#7ed7ff")
    y += 105

    for line in wrap(draw, copy["hook"], hook_font, right_width, 3):
        draw.text((left, y), line, font=hook_font, fill="#ffffff")
        y += int(hook_font.size * 1.25) if hasattr(hook_font, "size") else 64

    y += 30
    for line in wrap(draw, item["title"], title_font, right_width, 3):
        draw.text((left, y), line, font=title_font, fill="#a9e7ff")
        y += int(title_font.size * 1.22) if hasattr(title_font, "size") else 76

    y += 32
    for line in wrap(draw, item.get("summary", ""), body_font, right_width, 5 if height > 1500 else 4):
        draw.text((left, y), line, font=body_font, fill="#c7d6e3")
        y += int(body_font.size * 1.45) if hasattr(body_font, "size") else 48

    footer_y = height - margin - 210
    draw.rounded_rectangle((left, footer_y, width - margin - 48, footer_y + 88), radius=28, fill="#e4f7ff")
    draw.text((left + 30, footer_y + 25), copy["cta"], font=cta_font, fill="#07111f")
    draw.text((left, footer_y + 118), "nexusnovatools.com", font=cta_font, fill="#7ed7ff")
    stamp = datetime.now(timezone.utc).strftime("%d %b %Y")
    draw.text((width - margin - 48 - 170, footer_y + 127), stamp, font=small_font, fill="#8295a7")

    img.save(path, "JPEG", quality=88, optimize=True, progressive=True)


def main() -> None:
    if OUT.exists():
        OUT.unlink()

    history_doc = load_json(HISTORY, {"version": 1, "posts": []})
    history = history_doc.get("posts") if isinstance(history_doc, dict) else []
    if not isinstance(history, list):
        history = []
    traffic = load_json(TRAFFIC, {})
    pool = build_candidates()
    apply_history(pool, history, traffic)

    ranked = sorted(pool.values(), key=lambda row: (row["score"], row["title"]), reverse=True)
    eligible = [row for row in ranked if row["score"] > -500]
    if not eligible:
        REPORT.write_text("Social Growth Engine: no eligible useful candidate today.\n", encoding="utf-8")
        print("Social Growth Engine: no eligible useful candidate today.")
        return

    selected = eligible[0]
    fmt = choose_format(history, traffic)
    copy = build_copy(selected, fmt)
    day = datetime.now(timezone.utc).strftime("%Y%m%d")
    campaign = f"social_growth_western_{day}_{slugify(selected['title'])}"

    render_card(FEED_IMAGE, 1080, 1350, selected, copy)
    render_card(VERTICAL_IMAGE, 1080, 1920, selected, copy)

    payload = {
        "kind": "social_growth",
        "title": selected["title"],
        "summary": selected["summary"],
        "url": selected["url"],
        "hook": copy["hook"],
        "cta": copy["cta"],
        "format": fmt,
        "campaign": campaign,
        "utm_content": fmt,
        "hashtags": copy["hashtags"],
        "platform_copy": copy["platform_copy"],
        "instagram_image": f"{SITE}/assets/generated/social-growth-feed.jpg",
        "vertical_image": f"{SITE}/assets/generated/social-growth-vertical.jpg",
        "selection_score": round(selected["score"], 2),
        "selection_reasons": selected["reasons"],
        "audience_focus": "English-language US, Canada, UK and Australia use cases; organic distribution is not geo-targeted",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
    }
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    history.append({
        "generated_at": payload["generated_at"],
        "campaign": campaign,
        "url": selected["url"],
        "title": selected["title"],
        "format": fmt,
        "source": selected["source"],
        "selection_score": payload["selection_score"],
    })
    history_doc = {"version": 2, "posts": history[-120:]}
    HISTORY.parent.mkdir(parents=True, exist_ok=True)
    HISTORY.write_text(json.dumps(history_doc, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    lines = [
        "NEXUSNOVA SOCIAL GROWTH ENGINE v2",
        "=" * 36,
        f"Selected: {selected['title']}",
        f"URL: {selected['url']}",
        f"Format: {fmt}",
        f"Campaign: {campaign}",
        f"Score: {payload['selection_score']}",
        "Reasons:",
        *[f"- {reason}" for reason in selected["reasons"]],
        "",
        "Top candidates:",
    ]
    for row in ranked[:8]:
        lines.append(f"- {row['score']:.1f} | {row['title']} | {row['url']}")
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
