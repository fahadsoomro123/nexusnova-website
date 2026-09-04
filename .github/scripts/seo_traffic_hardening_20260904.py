from __future__ import annotations

import html as html_lib
import json
import re
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://nexusnovatools.com"
TODAY = "2026-09-04"
LOGO = f"{SITE}/assets/nexusnova-logo-512.svg"

TITLE_OVERRIDES = {
    "articles/jpg-png-webp-avif-guide.html": "JPG vs PNG vs WebP vs AVIF: Which Image Format Is Best?",
    "articles/hex-vs-rgb-colors.html": "HEX vs RGB Color Codes: Simple Beginner Guide",
    "articles/remove-exif-gps-metadata-photos.html": "Remove EXIF & GPS Metadata From Photos Before Sharing",
    "articles/unix-timestamps-explained.html": "Unix Timestamps Explained Without the Confusion",
    "articles/split-pdf-organize-pages.html": "How to Split a PDF and Keep Pages Organized",
    "guides/image-compression.html": "Compress Images Without Ruining Quality",
    "paper-size-converter.html": "Paper Size & DPI Converter: A4, Letter, Legal to Pixels",
    "timezone-meeting-planner.html": "Global Meeting Planner: Compare World Time Zones",
    "gaming-sensitivity-converter.html": "CS2 to Valorant Sensitivity Converter",
    "developer-tools.html": "Developer Tools: JSON, Base64, URL, UUID & SHA-256",
    "faq.html": "NexusNova Tools Help & FAQ: Privacy, Tools and Support",
}

DEPTH_SECTIONS = {
    "qr-code-scanner.html": """<section class="section" data-seo-traffic-depth><div class="container article"><h2>Get a cleaner QR scan from screenshots and photos</h2><p>Keep the full QR square visible and avoid tight cropping through the corner markers. A sharp screenshot usually scans more reliably than a blurred camera photo. If a photo fails, try better lighting, hold the camera straighter and make sure the code fills a useful part of the frame without cutting off its edges.</p><h2>Review links before you open them</h2><p>A QR code can contain a web address, plain text or another value. Decoding a code does not prove the destination is safe. Read the domain first, be cautious with shortened links, and do not enter passwords or payment details after an unexpected QR prompt. NexusNova displays decoded content before opening a link so you can make that check yourself.</p><p>Related: <a href="qr-code-generator.html">QR Code Generator</a> · <a href="tech/qr-code-phishing-quishing.html">QR phishing safety guide</a> · <a href="url-parser.html">URL Parser</a>.</p></div></section>""",
    "merge-pdf.html": """<section class="section" data-seo-traffic-depth><div class="container article"><h2>Merge PDFs in the order you actually need</h2><p>Before combining files, name or arrange the source documents in the sequence you want to read them. After the merge finishes, open the result and check the first page, the joins between files and the final page. That quick review catches accidental ordering mistakes before you share or archive the document.</p><h2>Large documents can be limited by the device</h2><p>PDF work can use a noticeable amount of browser memory, especially when many large files are combined on a phone. If a very large merge fails, try fewer files at a time or use a device with more available memory. Keep original copies until you have verified the merged output.</p><p>Related: <a href="split-pdf.html">Split PDF</a> · <a href="jpg-to-pdf.html">JPG to PDF</a> · <a href="text-to-pdf.html">Text to PDF</a>.</p></div></section>""",
    "percentage-change-calculator.html": """<section class="section" data-seo-traffic-depth><div class="container article"><h2>Percentage change compares a new value with the starting value</h2><p>The standard calculation is <strong>(new value − old value) ÷ old value × 100</strong>. A positive result means an increase and a negative result means a decrease. For example, moving from 80 to 100 is a 25% increase because the change of 20 is measured against the original 80.</p><h2>Zero needs special treatment</h2><p>If the old value is zero, ordinary percentage change is undefined because the formula would divide by zero. In that situation, report the absolute change or explain the before-and-after values instead of inventing a percentage. Also remember that reversing a percentage change does not usually produce the same percentage in the opposite direction because the base value changes.</p><p>Related: <a href="percentage-calculator.html">Percentage Calculator</a> · <a href="discount-calculator.html">Discount Calculator</a> · <a href="calculator.html">Calculator</a>.</p></div></section>""",
    "text-case-converter.html": """<section class="section" data-seo-traffic-depth><div class="container article"><h2>Choose case based on where the text will appear</h2><p>Uppercase can work for short labels, lowercase is useful for normalization, and title case is common for headings. Sentence case is usually easier to read in normal paragraphs. A case converter is most useful for repetitive formatting jobs where retyping every word would waste time.</p><h2>Proper names and acronyms still need a human check</h2><p>Automatic case conversion cannot always know that an acronym such as API should stay uppercase or that a brand uses unusual capitalization. After converting a headline, list or imported block of text, scan the result for names, abbreviations, product titles and words that intentionally break normal capitalization rules.</p><p>Related: <a href="word-counter.html">Word Counter</a> · <a href="random-picker.html">Random Picker</a> · <a href="tools.html">All Tools</a>.</p></div></section>""",
    "ai-vram-calculator.html": """<section class="section" data-seo-traffic-depth><div class="container article"><h2>VRAM estimates are planning numbers, not hardware guarantees</h2><p>Model weights are only one part of memory use. Precision, quantization, context length, KV cache, batch size, runtime buffers and the inference framework can all change the real requirement. Two setups using the same model can therefore consume different amounts of VRAM.</p><h2>Leave headroom for the runtime</h2><p>If an estimate lands very close to your GPU capacity, treat it as a warning rather than a promise that the model will fit. Practical deployments usually need headroom for the framework and temporary allocations. Lower precision, a shorter context or partial CPU offload may reduce GPU memory pressure, but each option can change speed or output behavior.</p><p>Related: <a href="ai-token-calculator.html">AI Token Calculator</a> · <a href="ai-prompt-builder.html">AI Prompt Builder</a> · <a href="articles/ai-token-count-context-window-guide.html">Tokens & context guide</a>.</p></div></section>""",
    "pomodoro-timer.html": """<section class="section" data-seo-traffic-depth><div class="container article"><h2>The classic 25/5 rhythm is a starting point</h2><p>A common Pomodoro cycle uses 25 minutes of focused work followed by a 5-minute break, but the useful part is the boundary around uninterrupted work. If 25 minutes is too short for your task, a 50/10 rhythm or another repeatable interval can be more practical.</p><h2>Use the timer to protect focus, not to create more admin</h2><p>Choose one concrete task before starting, silence avoidable notifications and use the break to move away from the work rather than opening another demanding task. Browser timers can also be affected by device sleep, aggressive battery saving or a closed tab, so keep that in mind for time-sensitive sessions.</p><p>Related: <a href="online-timer.html">Online Timer</a> · <a href="stopwatch.html">Stopwatch</a> · <a href="articles/pomodoro-focus-workflow.html">Pomodoro workflow guide</a>.</p></div></section>""",
}

ASTRA_PATH = ROOT / "tech/gpt-6-astra-2026.html"
ASTRA_URL = f"{SITE}/tech/gpt-6-astra-2026.html"
ASTRA_TITLE = "GPT-6 Astra: What OpenAI Announced and Who Gets Access"

ASTRA_HTML = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>GPT-6 Astra: What OpenAI Announced and Who Gets Access</title>
<meta name="description" content="OpenAI introduced GPT-6 Astra on September 3, 2026. See what changed, the current limited rollout, safety notes and what users should expect next.">
<meta name="robots" content="index,follow,max-image-preview:large"><meta name="theme-color" content="#f5f7fb">
<link rel="canonical" href="https://nexusnovatools.com/tech/gpt-6-astra-2026.html"><link rel="icon" href="../assets/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="article"><meta property="og:site_name" content="NexusNova Tools"><meta property="og:title" content="GPT-6 Astra: What OpenAI Announced and Who Gets Access"><meta property="og:description" content="A practical summary of OpenAI's September 3 GPT-6 Astra announcement, rollout and safety information."><meta property="og:url" content="https://nexusnovatools.com/tech/gpt-6-astra-2026.html"><meta property="og:image" content="https://nexusnovatools.com/assets/nexusnova-logo-512.svg"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="GPT-6 Astra: What OpenAI Announced and Who Gets Access"><meta name="twitter:description" content="OpenAI introduced GPT-6 Astra on September 3, 2026. See what changed, the current limited rollout, safety notes and what users should expect next."><meta name="twitter:image" content="https://nexusnovatools.com/assets/nexusnova-logo-512.svg">
<link rel="stylesheet" href="../assets/css/site.css"><link rel="stylesheet" href="../assets/css/scifi.css" data-nexusnova-scifi><link rel="stylesheet" href="../assets/css/motion.css" data-nexusnova-motion>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Article","headline":"GPT-6 Astra: What OpenAI Announced and Who Gets Access","description":"A practical summary of OpenAI's September 3, 2026 GPT-6 Astra announcement, limited rollout and safety information.","image":{"@type":"ImageObject","url":"https://nexusnovatools.com/assets/nexusnova-logo-512.svg","width":512,"height":512},"datePublished":"2026-09-04","dateModified":"2026-09-04","author":{"@type":"Organization","name":"NexusNova Editorial Team","url":"https://nexusnovatools.com/editorial-team.html","logo":{"@type":"ImageObject","url":"https://nexusnovatools.com/assets/nexusnova-logo-512.svg"}},"publisher":{"@type":"Organization","name":"NexusNova Tools","url":"https://nexusnovatools.com/","logo":{"@type":"ImageObject","url":"https://nexusnovatools.com/assets/nexusnova-logo-512.svg"}},"mainEntityOfPage":"https://nexusnovatools.com/tech/gpt-6-astra-2026.html"},{"@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://nexusnovatools.com/"},{"@type":"ListItem","position":2,"name":"Tech & Security","item":"https://nexusnovatools.com/tech.html"},{"@type":"ListItem","position":3,"name":"GPT-6 Astra","item":"https://nexusnovatools.com/tech/gpt-6-astra-2026.html"}]}]}</script></head>
<body><header class="site-header" data-header><div class="container nav-wrap"><a class="brand" href="../index.html" aria-label="NexusNova Tools home"><span class="brand-mark">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><button class="menu-btn" type="button" data-menu-btn aria-expanded="false" aria-label="Open navigation">☰</button><nav class="nav" data-nav aria-label="Primary navigation"><a href="../index.html">Home</a><a href="../tools.html">Tools</a><a href="../categories.html">Categories</a><a href="../labs.html">Labs</a><a href="../live.html">LIVE</a><a href="../articles.html">Articles</a><a href="../guides.html">Guides</a></nav></div></header>
<main><section class="page-hero"><div class="container"><div class="breadcrumb"><a href="../index.html">Home</a> / <a href="../tech.html">Tech & Security</a> / GPT-6 Astra</div><span class="kicker">OPENAI // SEPTEMBER 2026</span><h1>GPT-6 Astra: what OpenAI announced and who gets access</h1><p class="article-meta" data-editorial-attribution>Editorial owner: <a href="../editorial-team.html">NexusNova Editorial Team</a> · Updated 4 September 2026</p><p>OpenAI announced GPT-6 Astra on September 3, 2026. The important detail for most people is that the launch is a limited rollout first, not an instant switch for every ChatGPT user.</p></div></section>
<section class="section"><div class="container article"><h2>What OpenAI says GPT-6 Astra is for</h2><p>OpenAI describes Astra as a model designed for demanding work that can span multiple steps rather than a single short prompt. The official ChatGPT release notes highlight improvements in coding, research, computer use and complex multi-step tasks. OpenAI also says Astra can work across common productivity outputs such as documents, spreadsheets and presentations when those capabilities are available in the product experience.</p><p>That does not mean every workflow becomes automatic or error-free. Model output still needs review, especially when a task involves current facts, external systems, financial decisions, security-sensitive actions or irreversible changes.</p><h2>Access is limited at launch</h2><p>The September 3 release note says Astra is initially rolling out to a limited set of organizations. OpenAI says broader access is planned over the following days, so an account that does not show Astra yet is not necessarily misconfigured. Availability can vary by account, plan, organization and product rollout stage.</p><p>The safest way to check access is inside the official ChatGPT product and OpenAI release notes. Avoid third-party downloads that claim to install or unlock a new OpenAI model; ChatGPT model availability is controlled through the service, not by a random desktop or Android installer.</p><h2>Why the safety notes matter</h2><p>OpenAI published a separate safety overview alongside the Astra announcement. The company says it evaluated the model across areas including cyber capabilities and other misuse risks before the limited rollout. For users, the practical takeaway is simple: stronger computer-use and multi-step capabilities can be useful, but they also make permission boundaries, account security and review of consequential actions more important.</p><p>If an AI system can act on websites or files, give it only the access needed for the task. Check destination domains, review generated commands or edits, and keep a human confirmation step for actions that send money, publish content, delete data, change credentials or affect production systems.</p><h2>What changed for everyday AI work</h2><p>Astra's announcement points toward a shift from isolated chat answers to longer workflows where the model can reason across research, code and structured artifacts. For a student or office user, that may mean turning a research brief into a document or table. For a developer, it may mean handling a longer coding task with more context. For a business team, it may mean combining analysis and artifact creation inside one workflow.</p><p>The useful question is not whether a model has a new name; it is whether the new capability reduces real steps without lowering accuracy or control. Start with a task you already understand, compare the result with your existing workflow and keep source checking in place.</p><h2>Do prompts or token planning still matter?</h2><p>Yes. Better models can reduce some prompt friction, but clear goals, relevant context and sensible limits still help. Large inputs can contain stale or conflicting information, and a model can only work with the instructions, files and tools it is allowed to use. For rough prompt-size planning, the <a href="../ai-token-calculator.html">NexusNova AI Token Calculator</a> can help estimate text size before you send a long prompt. The <a href="../ai-prompt-builder.html">AI Prompt Builder</a> can help structure a task into goal, context, constraints and output format.</p><h2>What to do if Astra is not visible yet</h2><ol><li>Check the official ChatGPT model picker or product notice for your account.</li><li>Read the current OpenAI release notes rather than relying on screenshots from other accounts.</li><li>Do not pay an unknown third party to “activate” the model.</li><li>Keep using the model available to you and move the workflow later if Astra becomes available and actually improves the task.</li></ol><h2>Official sources</h2><p>This explainer is based on OpenAI's own September 2026 materials: <a href="https://help.openai.com/en/articles/6825453-chatgpt-release-notes" rel="noopener noreferrer">ChatGPT Release Notes</a>, <a href="https://openai.com/index/safety-overview-gpt-6-astra/" rel="noopener noreferrer">GPT-6 Astra safety overview</a>, and <a href="https://openai.com/index/path-to-astra/" rel="noopener noreferrer">Path to Astra</a>. Rollout details can change, so those official pages are the source of truth for current availability.</p><h2>Bottom line</h2><p>GPT-6 Astra is a real OpenAI release announced on September 3, but access is intentionally staged. The most useful response is to follow the official rollout, test it on work you can verify and treat stronger computer-use or multi-step abilities as a reason for better review and permissions—not as a reason to remove oversight.</p></div></section></main>
<footer class="site-footer"><div class="container footer-console"><div><a class="brand" href="../index.html"><span class="brand-mark">N</span><span class="brand-copy"><strong>NEXUSNOVA TOOLS</strong><small>FAST EVERYDAY UTILITIES</small></span></a><p class="footer-copy">Practical browser tools and clear technology explainers.</p></div><div><div class="footer-title">Explore</div><div class="footer-links"><a href="../tech.html">Tech & Security</a><a href="../smart-tools.html">Smart Tools</a><a href="../articles.html">Articles</a></div></div><div><div class="footer-title">Trust</div><div class="footer-links"><a href="../editorial-team.html">Editorial Team</a><a href="../editorial-policy.html">Editorial Policy</a><a href="../privacy.html">Privacy</a></div></div></div><div class="container footer-bottom"><span>© <span data-year></span> NexusNova Tools.</span><span>NEXUSNOVATOOLS.COM</span></div></footer><script src="../assets/js/main.js" defer></script></body></html>
"""

SKIP_DIRS = {".git", "node_modules", "vendor", "ota", "downloads", "nexusnova-dev-ai", "cloudflare", "functions", "assets"}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def write_if_changed(path: Path, text: str) -> bool:
    old = read(path) if path.exists() else None
    if old == text:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return True


def noindex(text: str) -> bool:
    return bool(re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\'][^"\']*noindex', text, re.I))


def set_title(text: str, title: str) -> str:
    safe = html_lib.escape(title, quote=False)
    text = re.sub(r"<title>.*?</title>", f"<title>{safe}</title>", text, count=1, flags=re.I | re.S)
    text = set_meta(text, "property", "og:title", title)
    text = set_meta(text, "name", "twitter:title", title)
    return text


def set_meta(text: str, kind: str, key: str, value: str) -> str:
    safe = html_lib.escape(value, quote=True)
    pattern = re.compile(rf'(<meta\s+{kind}=["\']{re.escape(key)}["\'][^>]*content=["\'])([^"\']*)(["\'][^>]*>)', re.I)
    if pattern.search(text):
        return pattern.sub(lambda m: m.group(1) + safe + m.group(3), text, count=1)
    return text


def trim_description(text: str) -> str:
    pattern = re.compile(r'(<meta\s+name=["\']description["\'][^>]*content=["\'])([^"\']*)(["\'][^>]*>)', re.I)
    m = pattern.search(text)
    if not m:
        return text
    desc = html_lib.unescape(m.group(2)).strip()
    if len(desc) <= 160:
        return text
    clipped = desc[:155].rsplit(" ", 1)[0].rstrip(" ,.;:-") + "."
    text = pattern.sub(lambda x: x.group(1) + html_lib.escape(clipped, quote=True) + x.group(3), text, count=1)
    text = set_meta(text, "name", "twitter:description", clipped)
    return text


def ensure_org_logos(node):
    changed = False
    if isinstance(node, dict):
        types = node.get("@type")
        is_org = types == "Organization" or (isinstance(types, list) and "Organization" in types)
        if is_org and not node.get("logo"):
            node["logo"] = {"@type": "ImageObject", "url": LOGO}
            changed = True
        for value in list(node.values()):
            if ensure_org_logos(value):
                changed = True
    elif isinstance(node, list):
        for value in node:
            if ensure_org_logos(value):
                changed = True
    return changed


def ensure_article_images(node):
    changed = False
    if isinstance(node, dict):
        types = node.get("@type")
        is_article = types in {"Article", "NewsArticle", "BlogPosting"} if isinstance(types, str) else bool(isinstance(types, list) and {"Article", "NewsArticle", "BlogPosting"}.intersection(types))
        if is_article and not node.get("image"):
            node["image"] = {"@type": "ImageObject", "url": LOGO, "width": 512, "height": 512}
            changed = True
        for value in list(node.values()):
            if ensure_article_images(value):
                changed = True
    elif isinstance(node, list):
        for value in node:
            if ensure_article_images(value):
                changed = True
    return changed


def repair_schema(text: str) -> str:
    if noindex(text):
        return text
    pat = re.compile(r'(<script\s+type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)', re.I | re.S)
    def repl(match):
        raw = match.group(2).strip()
        try:
            data = json.loads(raw)
        except Exception:
            return match.group(0)
        changed = ensure_org_logos(data) | ensure_article_images(data)
        if not changed:
            return match.group(0)
        return match.group(1) + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + match.group(3)
    return pat.sub(repl, text)


def clean_indexable_metadata() -> list[str]:
    changed = []
    for path in ROOT.rglob("*.html"):
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        rel = path.relative_to(ROOT).as_posix()
        text = read(path)
        if noindex(text):
            continue
        original = text
        if rel in TITLE_OVERRIDES:
            text = set_title(text, TITLE_OVERRIDES[rel])
        else:
            tm = re.search(r"<title>(.*?)</title>", text, re.I | re.S)
            if tm:
                title = html_lib.unescape(re.sub(r"<[^>]+>", "", tm.group(1))).strip()
                if len(title) > 60:
                    shortened = re.sub(r"\s*[|—–-]\s*NexusNova(?: Tools)?\s*$", "", title, flags=re.I).strip()
                    if 30 <= len(shortened) <= 60:
                        text = set_title(text, shortened)
        text = trim_description(text)
        if any(part in {"articles", "guides", "tech"} for part in path.parts):
            text = repair_schema(text)
        if rel in DEPTH_SECTIONS and "data-seo-traffic-depth" not in text:
            if "</main>" not in text:
                raise RuntimeError(f"Missing </main> in {rel}")
            text = text.replace("</main>", DEPTH_SECTIONS[rel] + "</main>", 1)
        if text != original:
            write_if_changed(path, text)
            changed.append(rel)
    return changed


def add_astra_hub_card(path: Path, marker: str, card: str) -> None:
    text = read(path)
    if "gpt-6-astra-2026.html" in text:
        return
    if marker not in text:
        raise RuntimeError(f"Hub marker missing in {path.name}")
    text = text.replace(marker, marker + card, 1)
    write_if_changed(path, text)


def add_itemlist_entry(path: Path, item_name: str, item_url: str) -> None:
    text = read(path)
    if item_url in text:
        return
    pat = re.compile(r'(<script\s+type=["\']application/ld\+json["\'][^>]*>)(.*?)(</script>)', re.I | re.S)
    def repl(match):
        try:
            data = json.loads(match.group(2).strip())
        except Exception:
            return match.group(0)
        graphs = data.get("@graph", []) if isinstance(data, dict) else []
        for node in graphs:
            if isinstance(node, dict) and node.get("@type") == "ItemList":
                items = node.get("itemListElement") or []
                for row in items:
                    if isinstance(row, dict) and isinstance(row.get("position"), int):
                        row["position"] += 1
                items.insert(0, {"@type": "ListItem", "position": 1, "name": item_name, "url": item_url})
                node["itemListElement"] = items
                node["numberOfItems"] = len(items)
                return match.group(1) + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + match.group(3)
        return match.group(0)
    new = pat.sub(repl, text, count=1)
    if new == text:
        raise RuntimeError(f"ItemList not updated in {path.name}")
    write_if_changed(path, new)


def sitemap_entry(url: str, lastmod: str) -> str:
    return f"  <url><loc>{xml_escape(url)}</loc><lastmod>{lastmod}</lastmod></url>"


def upsert_sitemap(path: Path, urls: list[str], lastmod: str = TODAY) -> None:
    text = read(path)
    for url in urls:
        loc_re = re.compile(rf'<url><loc>{re.escape(url)}</loc>(?:<lastmod>[^<]+</lastmod>)?</url>')
        replacement = f"<url><loc>{url}</loc><lastmod>{lastmod}</lastmod></url>"
        if loc_re.search(text):
            text = loc_re.sub(replacement, text, count=1)
        else:
            if "</urlset>" not in text:
                raise RuntimeError(f"Invalid sitemap: {path.name}")
            text = text.replace("</urlset>", sitemap_entry(url, lastmod) + "\n</urlset>", 1)
    write_if_changed(path, text)


def main() -> None:
    ASTRA_PATH.parent.mkdir(parents=True, exist_ok=True)
    write_if_changed(ASTRA_PATH, ASTRA_HTML)

    changed = clean_indexable_metadata()

    tech_card = '<a class="article-card" href="tech/gpt-6-astra-2026.html"><span class="tag">NEW • OPENAI</span><h3>GPT-6 Astra: What OpenAI Announced and Who Gets Access</h3><p>What changed, who has access first, the official safety notes and what users should do if Astra is not visible yet.</p><span class="card-link">Read explainer →</span></a>'
    add_astra_hub_card(ROOT / "tech.html", '<div class="article-grid">', tech_card)
    add_itemlist_entry(ROOT / "tech.html", ASTRA_TITLE, ASTRA_URL)

    articles_card = '\n<a class="article-card" href="tech/gpt-6-astra-2026.html"><span class="tag">NEW • OPENAI</span><h3>GPT-6 Astra: What OpenAI Announced</h3><p>OpenAI announced Astra on September 3. Here is the current rollout, capability summary and safety context from official sources.</p><span class="card-link">Read explainer →</span></a>\n'
    add_astra_hub_card(ROOT / "articles.html", '<!-- NEXUSNOVA_AUTOPILOT_ARTICLES_END -->', articles_card)
    add_itemlist_entry(ROOT / "articles.html", ASTRA_TITLE, ASTRA_URL)

    priority = [
        ASTRA_URL,
        f"{SITE}/labs.html", f"{SITE}/pulse.html", f"{SITE}/magic-drop.html", f"{SITE}/xray.html", f"{SITE}/widgets.html",
        f"{SITE}/steam-playtime-calculator.html", f"{SITE}/paper-size-converter.html", f"{SITE}/qr-code-scanner.html",
        f"{SITE}/merge-pdf.html", f"{SITE}/percentage-change-calculator.html", f"{SITE}/text-case-converter.html",
        f"{SITE}/ai-vram-calculator.html", f"{SITE}/pomodoro-timer.html",
    ]
    upsert_sitemap(ROOT / "sitemap.xml", priority)
    upsert_sitemap(ROOT / "sitemap-recent.xml", priority)
    upsert_sitemap(ROOT / "sitemap-new-tools.xml", [f"{SITE}/labs.html", f"{SITE}/pulse.html", f"{SITE}/magic-drop.html", f"{SITE}/xray.html", f"{SITE}/widgets.html"])

    # Basic self-checks before the repository's heavier audits run.
    for rel, title in TITLE_OVERRIDES.items():
        text = read(ROOT / rel)
        if f"<title>{html_lib.escape(title, quote=False)}</title>" not in text:
            raise RuntimeError(f"Title override failed: {rel}")
    for rel in DEPTH_SECTIONS:
        text = read(ROOT / rel)
        if text.count("data-seo-traffic-depth") != 1:
            raise RuntimeError(f"Depth section count wrong: {rel}")
    if not ASTRA_PATH.exists() or "OpenAI" not in read(ASTRA_PATH):
        raise RuntimeError("Astra article missing")
    print(f"Traffic hardening changed {len(changed)} existing HTML files plus Astra/hubs/sitemaps.")


if __name__ == "__main__":
    main()
