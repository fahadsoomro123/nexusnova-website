import html
import re
import urllib.parse
from pathlib import Path

HOSTS = {
    "Google Search Central": ("developers.google.com",),
    "Chrome Releases": ("chromereleases.googleblog.com",),
    "Google Security Blog": ("security.googleblog.com",),
    "GitHub Changelog": ("github.blog",),
    "GitHub Blog": ("github.blog",),
    "Cloudflare Blog": ("blog.cloudflare.com",),
    "Microsoft Windows Blog": ("blogs.windows.com", "microsoft.com"),
    "OpenAI News": ("openai.com",),
}
STOP = set("about after also and are for from has have how into its not now new one our out over the their this that these those through was when where which with you your what why will would can could should than then they them use using".split())


def terms(value):
    return {x for x in re.findall(r"[a-z0-9]+", str(value or "").lower()) if len(x) >= 3 and x not in STOP}


def approved_source(name, url):
    allowed = HOSTS.get(str(name or "").strip(), ())
    parsed = urllib.parse.urlparse(str(url or ""))
    host = (parsed.hostname or "").lower()
    return parsed.scheme == "https" and bool(host) and not parsed.username and not parsed.password and any(host == x or host.endswith("." + x) for x in allowed)


def generic_heading(heading, title):
    h = re.sub(r"[^a-z0-9]+", " ", str(heading or "").lower()).strip()
    if h in {"next steps", "practical next steps", "make this update useful", "turn the update into something useful"}:
        return True
    if h.startswith(("make this update useful", "turn the update into something useful")):
        return True
    if h.startswith("next steps "):
        tail, topic = terms(h[len("next steps "):]), terms(title)
        n = min(len(tail), len(topic))
        return bool(n and len(tail & topic) >= 2 and len(tail & topic) / n >= .7)
    return False


def shingles(value):
    words = re.findall(r"[a-z0-9]+", str(value or "").lower())
    return {tuple(words[i:i + 5]) for i in range(len(words) - 4)}


def find_duplicate(title, body, docs):
    a = terms(title)
    sa = shingles(body)
    norm = lambda v: re.sub(r"[^a-z0-9]+", " ", str(v).lower()).strip()
    for old_title, old_body in docs:
        b = terms(old_title)
        if norm(title) == norm(old_title):
            return old_title
        n = min(len(a), len(b))
        if len(a & b) >= 3 and n and len(a & b) / n >= .82:
            return old_title
        sb = shingles(old_body)
        n = min(len(sa), len(sb))
        if n >= 40 and len(sa & sb) >= 24 and len(sa & sb) / n >= .5:
            return old_title
    return None


def load_article_documents(article_dir):
    result = []
    if not article_dir.is_dir():
        return result
    for path in sorted(article_dir.glob("*.html")):
        raw = path.read_text(encoding="utf-8", errors="replace")
        main = re.search(r"<main\b[^>]*>(.*?)</main>", raw, re.I | re.S)
        body = main.group(1) if main else raw
        body = re.sub(r"<(script|style)\b[^>]*>.*?</\1>", " ", body, flags=re.I | re.S)
        h1 = re.search(r"<h1\b[^>]*>(.*?)</h1>", body, re.I | re.S)
        if not h1:
            continue
        title = html.unescape(re.sub(r"<[^>]+>", " ", h1.group(1))).strip()
        text = html.unescape(re.sub(r"<[^>]+>", " ", body))
        text = re.sub(r"\s+", " ", text).strip()
        if title and text:
            result.append((title, text))
    return result


def reject_reason(data, candidate, source_text, existing):
    if not isinstance(data, dict) or data.get("publish") is not True:
        return "model declined the draft"
    if not approved_source(candidate.get("name"), candidate.get("url")):
        return "source URL is outside the official-host allowlist"
    if len(str(source_text or "").strip()) < 800:
        return "source text is too short"
    title = html.unescape(re.sub(r"<[^>]+>", " ", str(data.get("title", "")))).strip()
    desc, deck = str(data.get("description", "")).strip(), str(data.get("deck", "")).strip()
    if not 25 <= len(title) <= 68:
        return "title must be 25–68 characters"
    if not 70 <= len(desc) <= 160:
        return "description must be 70–160 characters"
    if not 35 <= len(deck) <= 260:
        return "deck must be 35–260 characters"
    if len(terms(title) & terms(candidate.get("title", ""))) < 2:
        return "draft title is not grounded in the source title"
    sections = data.get("sections")
    if not isinstance(sections, list):
        return "sections are missing"
    clean_sections, headings, seen_paragraphs = [], set(), set()
    for section in sections[:6]:
        if not isinstance(section, dict):
            continue
        heading = str(section.get("heading", "")).strip()
        paras = section.get("paragraphs")
        if not heading or not isinstance(paras, list):
            continue
        paras = [str(p).strip() for p in paras[:4] if str(p).strip()]
        if not paras:
            continue
        for paragraph in paras:
            paragraph_key = re.sub(r"[^a-z0-9]+", " ", paragraph.lower()).strip()
            if paragraph_key in seen_paragraphs:
                return "repeated paragraph filler is not accepted"
            seen_paragraphs.add(paragraph_key)
        if generic_heading(heading, title):
            return "generic title-repeating heading: " + heading[:80]
        key = norm = re.sub(r"[^a-z0-9]+", " ", heading.lower()).strip()
        if key in headings:
            return "repeated section headings"
        headings.add(norm)
        clean_sections.append((heading, paras))
    if len(clean_sections) < 3:
        return "at least three substantive sections are required"
    raw_steps = data.get("steps")
    if not isinstance(raw_steps, list):
        return "practical steps are missing"
    steps = [str(x).strip() for x in raw_steps[:8] if str(x).strip()]
    if len(steps) < 2 or len({re.sub(r"[^a-z0-9]+", " ", x.lower()).strip() for x in steps}) < 2:
        return "at least two distinct practical steps are required"
    if any(len(x) < 25 or len(x) > 260 for x in steps):
        return "each practical step must be 25–260 characters"
    if any(re.search(r"\b(read more|learn more|stay informed|check back later|visit the source)\b", x, re.I) for x in steps):
        return "generic non-actionable steps are not accepted"
    parts = [title, desc, deck]
    for heading, paras in clean_sections:
        parts.extend([heading, *paras])
    parts.extend(steps)
    body = " ".join(parts)
    words = len(re.findall(r"[a-z0-9]+", body.lower()))
    if not 450 <= words <= 800:
        return f"substantive draft must be 450–800 words; found {words}"
    unique_shingles = len(shingles(body))
    if unique_shingles < 100 or unique_shingles / max(1, words - 4) < 0.30:
        return "draft repeats too much phrasing to demonstrate substantive depth"
    topic = terms(str(candidate.get("title", "")) + " " + str(candidate.get("summary", "")))
    if len(topic & terms(body)) < min(3, len(topic)):
        return "draft lacks topic-specific detail from the official source title and summary"
    if len(topic & terms(" ".join(steps))) < 2:
        return "practical steps are too generic for the source topic"
    duplicate = find_duplicate(title, body, existing)
    if duplicate:
        return "near-duplicate search intent/content overlaps: " + duplicate[:90]
    return None
