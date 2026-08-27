from __future__ import annotations

import hashlib
import html
import json
import os
import re
import textwrap
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://nexusnovatools.com"
NOW = datetime.now(timezone.utc)
TODAY = NOW.date().isoformat()
HISTORY_PATH = ROOT / "assets/data/autopilot-history.json"
PULSE_PATH = ROOT / "assets/data/live-tech-pulse.json"
SITEMAP_PATH = ROOT / "sitemap-autopilot.xml"
REPORT_PATH = ROOT / "traffic-autopilot-report.json"
PUBLISH_PATH = ROOT / "autopilot-publish.json"
CHANGED_URLS_PATH = ROOT / "autopilot-changed-urls.txt"
INDEXNOW_KEY = "c9c42970f21e42d8a1c4bf79ce155852"

SOURCES = [
    {"name": "Google Search Central", "url": "https://developers.google.com/search/blog/rss.xml", "category": "Search & SEO", "weight": 5},
    {"name": "Chrome Releases", "url": "https://chromereleases.googleblog.com/feeds/posts/default", "category": "Browser", "weight": 5},
    {"name": "Google Security Blog", "url": "https://security.googleblog.com/feeds/posts/default", "category": "Security", "weight": 5},
    {"name": "GitHub Changelog", "url": "https://github.blog/changelog/feed/", "category": "Developer", "weight": 5},
    {"name": "GitHub Blog", "url": "https://github.blog/feed/", "category": "Developer", "weight": 3},
    {"name": "Cloudflare Blog", "url": "https://blog.cloudflare.com/rss/", "category": "Cloud", "weight": 4},
    {"name": "Microsoft Windows Blog", "url": "https://blogs.windows.com/feed/", "category": "Windows", "weight": 4},
    {"name": "OpenAI News", "url": "https://openai.com/news/rss.xml", "category": "AI", "weight": 5},
]

KEYWORDS = {
    "security": 6, "vulnerability": 6, "cve": 6, "malware": 6, "phishing": 5, "zero-day": 7,
    "search console": 7, "google search": 6, "seo": 5, "indexing": 5, "spam update": 7, "core update": 7,
    "ai": 3, "model": 3, "gpt": 5, "gemini": 5, "copilot": 4, "agent": 3, "inference": 4,
    "chrome": 4, "firefox": 4, "browser": 3, "webgpu": 5, "webassembly": 5,
    "github": 4, "codeql": 5, "actions": 4, "cloudflare": 4, "firebase": 4, "api": 3,
    "windows": 4, "android": 4, "driver": 3, "nvidia": 4, "amd": 4, "intel": 3, "gaming": 3,
    "privacy": 4, "passkey": 5, "encryption": 4, "oauth": 4, "token": 3,
}

BLOCKED = (
    "celebrity", "election", "politics", "horoscope", "gossip", "dating", "casino", "betting", "lottery",
)

TOOLS = [
    ("AI Token Calculator", "ai-token-calculator.html", "Estimate prompt and context-window token size."),
    ("Image to Text OCR", "image-to-text-ocr.html", "Extract text from screenshots and scanned images."),
    ("QR Code Scanner", "qr-code-scanner.html", "Decode QR codes and inspect links before opening."),
    ("Meta Tag Generator", "meta-tag-generator.html", "Build title, description and Open Graph tags."),
    ("Image Metadata Remover", "image-metadata-remover.html", "Create a clean image copy without common EXIF/GPS metadata."),
    ("AI VRAM Calculator", "ai-vram-calculator.html", "Estimate model-weight VRAM needs by parameter count and precision."),
    ("Password Strength Checker", "password-strength-checker.html", "Review password structure locally in the browser."),
]

RELATED = {
    "AI": [("AI Token Calculator", "../ai-token-calculator.html"), ("AI VRAM Calculator", "../ai-vram-calculator.html"), ("AI Prompt Builder", "../ai-prompt-builder.html")],
    "Search & SEO": [("Meta Tag Generator", "../meta-tag-generator.html"), ("Tool Methodology", "../tool-methodology.html"), ("Articles", "../articles.html")],
    "Security": [("Password Strength Checker", "../password-strength-checker.html"), ("QR Code Scanner", "../qr-code-scanner.html"), ("Image Metadata Remover", "../image-metadata-remover.html")],
    "Browser": [("Developer Tools", "../developer-tools.html"), ("Tech & Security", "../tech.html"), ("QR Code Scanner", "../qr-code-scanner.html")],
    "Developer": [("Developer Tools", "../developer-tools.html"), ("Unix Timestamp Converter", "../unix-timestamp-converter.html"), ("Meta Tag Generator", "../meta-tag-generator.html")],
    "Cloud": [("Developer Tools", "../developer-tools.html"), ("Tech & Security", "../tech.html"), ("Articles", "../articles.html")],
    "Windows": [("Gaming Tools", "../gaming.html"), ("Tech & Security", "../tech.html"), ("Articles", "../articles.html")],
}


class TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs) -> None:
        if tag in {"script", "style", "svg", "noscript"}:
            self.skip += 1

    def handle_endtag(self, tag: str) -> None:
        if tag in {"script", "style", "svg", "noscript"} and self.skip:
            self.skip -= 1

    def handle_data(self, data: str) -> None:
        if not self.skip:
            value = re.sub(r"\s+", " ", data).strip()
            if value:
                self.parts.append(value)


def request(url: str, *, data: bytes | None = None, headers: dict[str, str] | None = None, timeout: int = 20) -> bytes:
    base_headers = {"User-Agent": "NexusNovaTrafficAutopilot/1.0 (+https://nexusnovatools.com/)"}
    if headers:
        base_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=base_headers)
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def clean_text(value: str) -> str:
    value = html.unescape(re.sub(r"<[^>]+>", " ", value or ""))
    return re.sub(r"\s+", " ", value).strip()


def parse_date(value: str) -> datetime | None:
    value = (value or "").strip()
    if not value:
        return None
    try:
        dt = parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)
    except Exception:
        return None


def node_text(node: ET.Element | None) -> str:
    return "" if node is None else "".join(node.itertext()).strip()


def feed_entries(source: dict) -> list[dict]:
    try:
        raw = request(source["url"])
        root = ET.fromstring(raw)
    except Exception as exc:
        return [{"error": str(exc), "source": source["name"]}]

    entries: list[dict] = []
    items = root.findall(".//item")
    if items:
        for item in items[:25]:
            title = node_text(item.find("title"))
            link = node_text(item.find("link"))
            desc = node_text(item.find("description")) or node_text(item.find("{http://purl.org/rss/1.0/modules/content/}encoded"))
            date = node_text(item.find("pubDate")) or node_text(item.find("{http://purl.org/dc/elements/1.1/}date"))
            entries.append({"title": clean_text(title), "url": link.strip(), "summary": clean_text(desc), "published": parse_date(date), **source})
        return entries

    ns = {"a": "http://www.w3.org/2005/Atom"}
    atoms = root.findall(".//a:entry", ns) or root.findall(".//entry")
    for entry in atoms[:25]:
        title = node_text(entry.find("a:title", ns) or entry.find("title"))
        link = ""
        for link_node in entry.findall("a:link", ns) + entry.findall("link"):
            href = link_node.attrib.get("href", "")
            rel = link_node.attrib.get("rel", "alternate")
            if href and rel in {"alternate", ""}:
                link = href
                break
        summary_node = entry.find("a:summary", ns) or entry.find("a:content", ns) or entry.find("summary") or entry.find("content")
        date_node = entry.find("a:published", ns) or entry.find("a:updated", ns) or entry.find("published") or entry.find("updated")
        entries.append({"title": clean_text(title), "url": link.strip(), "summary": clean_text(node_text(summary_node)), "published": parse_date(node_text(date_node)), **source})
    return entries


def infer_category(text: str, fallback: str) -> str:
    low = text.lower()
    if any(x in low for x in ("cve", "security", "vulnerability", "malware", "phishing", "passkey", "oauth")):
        return "Security"
    if any(x in low for x in ("search console", "google search", "seo", "indexing", "spam update", "core update")):
        return "Search & SEO"
    if any(x in low for x in ("gpt", "openai", "gemini", "copilot", " ai ", "model", "inference")):
        return "AI"
    if any(x in low for x in ("chrome", "firefox", "browser", "webgpu", "webassembly")):
        return "Browser"
    if any(x in low for x in ("github", "codeql", "actions", "developer", "api")):
        return "Developer"
    if "cloudflare" in low or "firebase" in low:
        return "Cloud"
    if any(x in low for x in ("windows", "android", "driver", "nvidia", "amd", "intel", "gaming")):
        return "Windows"
    return fallback


def score_item(item: dict) -> int:
    text = f" {item.get('title', '')} {item.get('summary', '')} ".lower()
    if any(word in text for word in BLOCKED):
        return -100
    score = int(item.get("weight", 0))
    for keyword, points in KEYWORDS.items():
        if keyword in text:
            score += points
    published = item.get("published")
    if isinstance(published, datetime):
        age = NOW - published
        if age <= timedelta(days=1):
            score += 7
        elif age <= timedelta(days=3):
            score += 5
        elif age <= timedelta(days=7):
            score += 3
        elif age > timedelta(days=35):
            score -= 8
    return score


def normalize_title(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def collect_trends() -> tuple[list[dict], list[str]]:
    pool: list[dict] = []
    errors: list[str] = []
    for source in SOURCES:
        for item in feed_entries(source):
            if item.get("error"):
                errors.append(f"{item['source']}: {item['error']}")
                continue
            if not item.get("title") or not item.get("url", "").startswith("http"):
                continue
            item["category"] = infer_category(f"{item['title']} {item['summary']}", item["category"])
            item["score"] = score_item(item)
            pool.append(item)

    pool.sort(key=lambda row: (row["score"], row.get("published") or datetime(1970, 1, 1, tzinfo=timezone.utc)), reverse=True)
    seen: set[str] = set()
    selected: list[dict] = []
    category_counts: dict[str, int] = {}
    for item in pool:
        if item["score"] < 7:
            continue
        key = normalize_title(item["title"])
        if not key or key in seen:
            continue
        if category_counts.get(item["category"], 0) >= 2:
            continue
        seen.add(key)
        category_counts[item["category"]] = category_counts.get(item["category"], 0) + 1
        selected.append(item)
        if len(selected) >= 8:
            break
    return selected, errors


def load_json(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return fallback


def public_item(item: dict) -> dict:
    published = item.get("published")
    return {
        "title": item["title"],
        "url": item["url"],
        "source": item["name"],
        "category": item["category"],
        "published": published.isoformat().replace("+00:00", "Z") if isinstance(published, datetime) else "",
        "summary": (item.get("summary") or "")[:260],
        "score": item["score"],
    }


def write_pulse(items: list[dict]) -> dict:
    old = load_json(PULSE_PATH, {"items": []})
    public = [public_item(item) for item in items]
    if len(public) < 3:
        known = {row.get("url") for row in public}
        for row in old.get("items", []):
            if row.get("url") not in known:
                public.append(row)
            if len(public) >= 8:
                break
    tool = TOOLS[int(hashlib.sha256(TODAY.encode()).hexdigest(), 16) % len(TOOLS)]
    payload = {
        "version": 1,
        "generated_at": NOW.isoformat().replace("+00:00", "Z"),
        "items": public[:8],
        "top_stories": public[:3],
        "tool_of_day": {"title": tool[0], "url": tool[1], "summary": tool[2]},
    }
    PULSE_PATH.parent.mkdir(parents=True, exist_ok=True)
    PULSE_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return payload


def fetch_source_text(url: str) -> str:
    try:
        raw = request(url, timeout=25).decode("utf-8", errors="ignore")
    except Exception:
        return ""
    parser = TextExtractor()
    try:
        parser.feed(raw)
    except Exception:
        return ""
    text = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
    return text[:24000]


def response_text(payload: dict) -> str:
    if isinstance(payload.get("output_text"), str):
        return payload["output_text"]
    chunks: list[str] = []
    for out in payload.get("output", []):
        for content in out.get("content", []):
            text = content.get("text")
            if isinstance(text, str):
                chunks.append(text)
    return "\n".join(chunks)


def ai_json(prompt: str) -> dict | None:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not key:
        return None
    model = os.getenv("OPENAI_MODEL", "gpt-5.6").strip() or "gpt-5.6"
    body = json.dumps({"model": model, "input": prompt, "temperature": 0.2, "max_output_tokens": 3200}).encode()
    try:
        raw = request(
            "https://api.openai.com/v1/responses",
            data=body,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            timeout=90,
        )
        text = response_text(json.loads(raw))
        match = re.search(r"\{.*\}", text, re.S)
        return json.loads(match.group(0)) if match else None
    except Exception:
        return None


def slugify(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value[:72].rstrip("-") or f"tech-update-{TODAY}"


def escape(value: str) -> str:
    return html.escape(value, quote=True)


def render_hero_png(slug: str, title: str, category: str) -> str | None:
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        return None
    out_dir = ROOT / "assets/generated"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{slug}-1280x720.png"
    img = Image.new("RGB", (1280, 720), (246, 248, 255))
    px = img.load()
    for y in range(720):
        for x in range(1280):
            t = x / 1279
            u = y / 719
            px[x, y] = (int(246 - 30 * t + 8 * u), int(248 - 18 * t + 4 * u), int(255 - 2 * t))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((70, 64, 1210, 656), radius=48, fill=(255, 255, 255), outline=(214, 220, 242), width=3)
    draw.ellipse((925, 70, 1190, 335), fill=(231, 226, 255))
    draw.ellipse((1010, 240, 1240, 470), fill=(220, 246, 255))
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf",
    ]
    font_path = next((p for p in font_paths if Path(p).exists()), None)
    title_font = ImageFont.truetype(font_path, 56) if font_path else ImageFont.load_default()
    meta_font = ImageFont.truetype(font_path, 24) if font_path else ImageFont.load_default()
    brand_font = ImageFont.truetype(font_path, 28) if font_path else ImageFont.load_default()
    draw.text((120, 118), "NEXUSNOVA TOOLS", font=brand_font, fill=(65, 52, 130))
    draw.rounded_rectangle((120, 180, 120 + max(190, len(category) * 17), 230), radius=25, fill=(238, 233, 255))
    draw.text((142, 192), category.upper(), font=meta_font, fill=(92, 62, 190))
    wrapped = textwrap.wrap(title, width=34)[:4]
    y = 285
    for line in wrapped:
        draw.text((120, y), line, font=title_font, fill=(25, 31, 55))
        y += 70
    draw.text((120, 595), f"Source-backed tech brief • {TODAY}", font=meta_font, fill=(91, 101, 128))
    img.save(path, "PNG", optimize=True)
    return f"assets/generated/{path.name}"


def choose_article_candidate(items: list[dict], history: dict) -> dict | None:
    used_urls = {row.get("source_url") for row in history.get("articles", [])}
    used_titles = {normalize_title(row.get("title", "")) for row in history.get("articles", [])}
    for item in items:
        published = item.get("published")
        if item["score"] < 14:
            continue
        if isinstance(published, datetime) and NOW - published > timedelta(days=4):
            continue
        if item["url"] in used_urls or normalize_title(item["title"]) in used_titles:
            continue
        return item
    return None


def build_article(candidate: dict, history: dict, gsc_context: list[dict]) -> dict | None:
    source_text = fetch_source_text(candidate["url"])
    if len(source_text) < 800:
        return None
    query_context = "\n".join(f"- {x.get('query')} | impressions {x.get('impressions')} | position {x.get('position')}" for x in gsc_context[:12]) or "No Search Console query data is connected."
    prompt = f"""
You are the NexusNova Tools editorial automation. Produce ONE useful, source-backed technology brief for a practical browser-tools and technology website.

Hard rules:
- Use only factual claims supported by SOURCE MATERIAL below. Do not invent dates, versions, impacts, quotes, benchmarks or affected products.
- Paraphrase; do not copy sentences from the source. No quote longer than 10 words.
- Explain why the update matters and give cautious practical next steps only when the source supports them.
- No clickbait, no exaggerated urgency, no ranking claims, no keyword stuffing.
- If the source is too thin to create a useful standalone page, set publish=false.
- 450-800 words total.
- Return JSON only.

Return this shape:
{{
  "publish": true,
  "title": "clear title under 68 characters",
  "description": "specific meta description under 160 characters",
  "deck": "one-sentence intro",
  "sections": [{{"heading":"...","paragraphs":["...","..."]}}],
  "steps": ["practical step", "practical step"],
  "source_label": "official source name"
}}

TOPIC CATEGORY: {candidate['category']}
SOURCE: {candidate['name']}
SOURCE URL: {candidate['url']}
SOURCE TITLE: {candidate['title']}
PUBLISHED: {candidate.get('published')}
FEED SUMMARY: {candidate.get('summary','')}

SEARCH-CONSOLE CONTEXT (use only to understand audience wording; never fabricate search demand):
{query_context}

SOURCE MATERIAL:
{source_text}
"""
    data = ai_json(prompt)
    if not data or data.get("publish") is not True:
        return None
    title = clean_text(str(data.get("title", "")))[:100]
    description = clean_text(str(data.get("description", "")))[:160]
    deck = clean_text(str(data.get("deck", "")))[:260]
    sections = data.get("sections") if isinstance(data.get("sections"), list) else []
    steps = data.get("steps") if isinstance(data.get("steps"), list) else []
    if not title or not description or len(sections) < 2:
        return None
    slug = slugify(title)
    page = ROOT / "articles" / f"{slug}.html"
    if page.exists():
        return None
    image_rel = render_hero_png(slug, title, candidate["category"])
    if not image_rel:
        return None
    image_url = f"{SITE}/{image_rel}"
    related = RELATED.get(candidate["category"], RELATED["Developer"])
    section_html = []
    for section in sections[:6]:
        heading = clean_text(str(section.get("heading", "")))
        paragraphs = section.get("paragraphs") if isinstance(section.get("paragraphs"), list) else []
        if not heading or not paragraphs:
            continue
        body = "".join(f"<p>{escape(clean_text(str(p)))}</p>" for p in paragraphs[:4] if clean_text(str(p)))
        if body:
            section_html.append(f"<h2>{escape(heading)}</h2>{body}")
    steps_html = ""
    clean_steps = [clean_text(str(x)) for x in steps if clean_text(str(x))][:8]
    if clean_steps:
        steps_html = "<h2>Practical next steps</h2><ol>" + "".join(f"<li>{escape(x)}</li>" for x in clean_steps) + "</ol>"
    related_html = "".join(f'<a class="btn" href="{escape(url)}">{escape(label)}</a>' for label, url in related)
    published_iso = TODAY
    canonical = f"{SITE}/articles/{slug}.html"
    schema = {
        "@context": "https://schema.org",
        "@graph": [
            {"@type": "Article", "headline": title, "description": description, "image": [image_url], "datePublished": published_iso, "dateModified": published_iso, "author": {"@type": "Organization", "name": "NexusNova Editorial Team", "url": f"{SITE}/editorial-team.html"}, "publisher": {"@type": "Organization", "name": "NexusNova Tools", "url": f"{SITE}/"}, "mainEntityOfPage": canonical},
            {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"}, {"@type": "ListItem", "position": 2, "name": "Articles", "item": f"{SITE}/articles.html"}, {"@type": "ListItem", "position": 3, "name": title, "item": canonical}]},
        ],
    }
    source_label = clean_text(str(data.get("source_label") or candidate["name"]))
    page_html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)} — NexusNova Tools</title><meta name="description" content="{escape(description)}"><meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#f5f7fb"><link rel="canonical" href="{escape(canonical)}"><link rel="alternate" type="application/rss+xml" title="NexusNova Tools Updates" href="{SITE}/feed.xml"><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="NexusNova Tools"><meta property="og:title" content="{escape(title)}"><meta property="og:description" content="{escape(description)}"><meta property="og:url" content="{escape(canonical)}"><meta property="og:image" content="{escape(image_url)}"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="720"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="../assets/css/site.css"><link rel="stylesheet" href="../assets/css/scifi.css" data-nexusnova-scifi><link rel="stylesheet" href="../assets/css/motion.css" data-nexusnova-motion><script type="application/ld+json">{escape(json.dumps(schema, ensure_ascii=False))}</script></head>
<body><header class="site-header" data-header><div class="container nav-wrap"><a class="brand" href="../index.html" aria-label="NexusNova Tools home"><span class="brand-mark">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-label="Open navigation">☰</button><nav class="nav" data-nav aria-label="Primary navigation"></nav></div></header>
<main><section class="page-hero"><div class="container article"><span class="kicker">{escape(candidate['category'].upper())} • SOURCE-BACKED UPDATE</span><h1>{escape(title)}</h1><p>{escape(deck)}</p><p class="mini-note">Published {escape(published_iso)} • NexusNova Editorial Team</p></div></section><section class="section"><div class="container article"><img src="../{escape(image_rel)}" alt="{escape(title)}" width="1280" height="720" style="width:100%;height:auto;border-radius:28px;margin-bottom:28px" loading="eager">{''.join(section_html)}{steps_html}<div class="notice"><strong>Primary source:</strong> <a href="{escape(candidate['url'])}" rel="noopener noreferrer">{escape(source_label)}</a>. This brief is generated from an official-source monitoring workflow and is checked by NexusNova's automated quality gate before publication.</div><div class="cta" style="margin-top:32px"><div><span class="kicker">RELATED NEXUSNOVA TOOLS</span><h2>Turn the update into something useful.</h2></div><div class="hero-actions">{related_html}</div></div></div></section></main>
<footer class="site-footer"><div class="container footer-console"><div><a class="brand" href="../index.html"><span class="brand-mark">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><p class="footer-copy">Free browser tools and practical technology explainers.</p></div><div><div class="footer-title">Explore</div><div class="footer-links"><a href="../articles.html">Articles</a><a href="../tech.html">Tech & Security</a><a href="../tools.html">Tools</a></div></div><div><div class="footer-title">Trust</div><div class="footer-links"><a href="../editorial-team.html">Editorial Team</a><a href="../editorial-policy.html">Editorial Policy</a><a href="../privacy.html">Privacy</a></div></div></div><div class="container footer-bottom"><span>© <span data-year></span> NexusNova Tools.</span><span>NEXUSNOVATOOLS.COM</span></div></footer><script src="../assets/js/main.js" defer></script></body></html>'''
    # JSON-LD must not be HTML-escaped inside script.
    page_html = page_html.replace(escape(json.dumps(schema, ensure_ascii=False)), json.dumps(schema, ensure_ascii=False).replace("</", "<\\/"))
    page.write_text(page_html, encoding="utf-8")
    return {
        "title": title,
        "description": description,
        "summary": deck or description,
        "slug": slug,
        "url": canonical,
        "path": f"articles/{slug}.html",
        "image": image_url,
        "source_url": candidate["url"],
        "source": candidate["name"],
        "category": candidate["category"],
        "date": TODAY,
    }


def managed_block(text: str, start: str, end: str, content: str, insertion: str | None = None) -> str:
    block = f"{start}\n{content}\n{end}"
    if start in text and end in text:
        return re.sub(re.escape(start) + r".*?" + re.escape(end), block, text, flags=re.S)
    if insertion and insertion in text:
        return text.replace(insertion, insertion + block, 1)
    return text.rstrip() + "\n\n" + block + "\n"


def update_discovery(history: dict) -> None:
    articles = history.get("articles", [])[:20]
    cards = []
    for row in articles[:12]:
        cards.append(f'<a class="article-card" data-autopilot-article="1" href="{escape(row["path"])}"><span class="tag">AUTO • {escape(row["category"].upper())}</span><h3>{escape(row["title"])}</h3><p>{escape(row["summary"])}</p><span class="card-link">Read article →</span></a>')
    hub = ROOT / "articles.html"
    hub_text = hub.read_text(encoding="utf-8")
    hub_text = managed_block(hub_text, "<!-- NEXUSNOVA_AUTOPILOT_ARTICLES_START -->", "<!-- NEXUSNOVA_AUTOPILOT_ARTICLES_END -->", "".join(cards), '<div class="article-grid">')
    hub.write_text(hub_text, encoding="utf-8")

    rss_items = []
    for row in articles[:10]:
        rss_items.append(f'''    <item><title>{escape(row["title"])}</title><link>{escape(row["url"])}</link><guid isPermaLink="true">{escape(row["url"])}</guid><pubDate>{datetime.fromisoformat(row["date"]).strftime("%a, %d %b %Y 00:00:00 +0000")}</pubDate><description>{escape(row["summary"])}</description></item>''')
    feed = ROOT / "feed.xml"
    feed_text = feed.read_text(encoding="utf-8")
    feed_text = managed_block(feed_text, "    <!-- NEXUSNOVA_AUTOPILOT_RSS_START -->", "    <!-- NEXUSNOVA_AUTOPILOT_RSS_END -->", "\n".join(rss_items), "    <language>en</language>\n")
    feed.write_text(feed_text, encoding="utf-8")

    urls = "\n".join(f'  <url><loc>{escape(row["url"])}</loc><lastmod>{escape(row["date"])}</lastmod></url>' for row in articles)
    SITEMAP_PATH.write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n', encoding="utf-8")

    sitemap_index = ROOT / "sitemap-index.xml"
    index_text = sitemap_index.read_text(encoding="utf-8")
    line = f"  <sitemap><loc>{SITE}/sitemap-autopilot.xml</loc></sitemap>"
    if line not in index_text:
        index_text = index_text.replace("</sitemapindex>", f"{line}\n</sitemapindex>")
        sitemap_index.write_text(index_text, encoding="utf-8")

    llms = ROOT / "llms.txt"
    llms_text = llms.read_text(encoding="utf-8")
    llms_content = "## Latest source-backed tech briefs\n" + "\n".join(f'- {row["title"]}: {row["url"]}' for row in articles[:12])
    llms_text = managed_block(llms_text, "<!-- NEXUSNOVA_AUTOPILOT_LLMS_START -->", "<!-- NEXUSNOVA_AUTOPILOT_LLMS_END -->", llms_content)
    llms.write_text(llms_text, encoding="utf-8")


def google_signals() -> tuple[list[dict], dict]:
    raw = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        return [], {"connected": False, "reason": "GOOGLE_SERVICE_ACCOUNT_JSON not configured"}
    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
    except Exception as exc:
        return [], {"connected": False, "reason": f"google-auth unavailable: {exc}"}
    try:
        info = json.loads(raw)
        creds = service_account.Credentials.from_service_account_info(info, scopes=["https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/analytics.readonly"])
        creds.refresh(Request())
        token = creds.token
    except Exception as exc:
        return [], {"connected": False, "reason": f"credential error: {exc}"}

    report: dict = {"connected": True}
    opportunities: list[dict] = []
    site_url = os.getenv("GSC_SITE_URL", "sc-domain:nexusnovatools.com").strip()
    start = (NOW.date() - timedelta(days=28)).isoformat()
    end = (NOW.date() - timedelta(days=2)).isoformat()
    try:
        endpoint = "https://searchconsole.googleapis.com/webmasters/v3/sites/" + urllib.parse.quote(site_url, safe="") + "/searchAnalytics/query"
        body = json.dumps({"startDate": start, "endDate": end, "dimensions": ["query", "page"], "rowLimit": 500}).encode()
        raw_resp = request(endpoint, data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
        rows = json.loads(raw_resp).get("rows", [])
        for row in rows:
            keys = row.get("keys", ["", ""])
            query = keys[0] if keys else ""
            page = keys[1] if len(keys) > 1 else ""
            impressions = float(row.get("impressions", 0))
            clicks = float(row.get("clicks", 0))
            ctr = float(row.get("ctr", 0))
            position = float(row.get("position", 0))
            if impressions >= 20 and position <= 25 and (ctr < 0.035 or 5 <= position <= 20):
                opportunities.append({"query": query, "page": page, "impressions": round(impressions, 1), "clicks": round(clicks, 1), "ctr": round(ctr, 4), "position": round(position, 1)})
        opportunities.sort(key=lambda x: (x["impressions"], -x["position"]), reverse=True)
        report["gsc"] = {"rows": len(rows), "opportunities": opportunities[:40]}
    except Exception as exc:
        report["gsc"] = {"error": str(exc)}

    prop = os.getenv("GA4_PROPERTY_ID", "").strip()
    if prop:
        try:
            endpoint = f"https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport"
            body = json.dumps({"dateRanges": [{"startDate": "28daysAgo", "endDate": "yesterday"}], "dimensions": [{"name": "landingPagePlusQueryString"}], "metrics": [{"name": "sessions"}, {"name": "engagedSessions"}, {"name": "screenPageViews"}], "limit": 100}).encode()
            raw_resp = request(endpoint, data=body, headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
            data = json.loads(raw_resp)
            report["ga4"] = {"rowCount": data.get("rowCount", 0), "rows": data.get("rows", [])[:25]}
        except Exception as exc:
            report["ga4"] = {"error": str(exc)}
    else:
        report["ga4"] = {"connected": False, "reason": "GA4_PROPERTY_ID not configured"}
    return opportunities, report


def main() -> None:
    history = load_json(HISTORY_PATH, {"version": 1, "articles": [], "seo_refresh": {}})
    trends, feed_errors = collect_trends()
    pulse = write_pulse(trends)
    opportunities, analytics_report = google_signals()
    candidate = choose_article_candidate(trends, history)
    published = build_article(candidate, history, opportunities) if candidate else None
    changed_urls = [f"{SITE}/", f"{SITE}/articles.html"]
    if published:
        history.setdefault("articles", []).insert(0, published)
        history["articles"] = history["articles"][:60]
        changed_urls.append(published["url"])
        PUBLISH_PATH.write_text(json.dumps(published, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    elif PUBLISH_PATH.exists():
        PUBLISH_PATH.unlink()
    HISTORY_PATH.parent.mkdir(parents=True, exist_ok=True)
    HISTORY_PATH.write_text(json.dumps(history, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    update_discovery(history)
    CHANGED_URLS_PATH.write_text("\n".join(dict.fromkeys(changed_urls)) + "\n", encoding="utf-8")
    report = {
        "run_at": NOW.isoformat().replace("+00:00", "Z"),
        "trend_items_selected": len(pulse.get("items", [])),
        "feed_errors": feed_errors,
        "article_published": published,
        "article_candidate": public_item(candidate) if candidate else None,
        "analytics": analytics_report,
        "search_opportunities": opportunities[:20],
        "safety": {"max_articles_per_run": 1, "minimum_article_score": 14, "source_allowlist_only": True, "no_publish_when_source_too_thin": True},
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({"trend_items": len(pulse.get("items", [])), "published": published["url"] if published else None, "gsc_connected": analytics_report.get("connected", False), "feed_errors": len(feed_errors)}, indent=2))


if __name__ == "__main__":
    main()
