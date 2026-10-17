#!/usr/bin/env python3
"""Static contract checks for the shared site shell and article sitemap."""
from __future__ import annotations
import re
import xml.etree.ElementTree as ET
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
BASE = "https://nexusnovatools.com/"
SHELL_CSS = "/assets/css/static-site-shell.css"
def fail(message):
    print("FAIL:", message)
    raise SystemExit(1)
def outer(source, name):
    pattern = re.compile(r"<" + name + r"\b[^>]*>[\s\S]*?</" + name + r"\s*>", re.I)
    matches = list(pattern.finditer(source))
    if name.lower() == "header":
        canonical = next((m for m in matches if '<source type="image/webp"' in m.group(0) and 'nn-brand-logo-img' in m.group(0)), None)
    elif name.lower() == "footer":
        canonical = next((m for m in matches if '<source type="image/webp"' in m.group(0) and 'nn-footer-brand-logo' in m.group(0)), None)
    else:
        canonical = None
    match = canonical or (matches[0] if matches else None)
    return match.group(0) if match else ""


def nav_labels(header):
    nav = outer(header, "nav")
    return [re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", raw)).strip()
            for raw in re.findall(r"<a\b[^>]*>([\s\S]*?)</a\s*>", nav, re.I)]
index_source = (ROOT / "index.html").read_text(encoding="utf-8")
expected_header, expected_footer = outer(index_source, "header"), outer(index_source, "footer")
if not expected_header or not expected_footer:
    fail("index.html must contain canonical static header and footer")
html_files = sorted(p for p in ROOT.rglob("*.html")
                    if not any(part in {".git", "node_modules", "quality-artifacts"} for part in p.parts))
if len(html_files) < 326:
    fail(f"expected all repository HTML pages; found only {len(html_files)}")
expected_nav = ["Home", "All Tools", "Content", "Categories", "Articles", "Guides"]
if nav_labels(expected_header) != expected_nav:
    fail(f"canonical navigation incorrect: {nav_labels(expected_header)!r}")
problems = []
for page in html_files:
    source = page.read_text(encoding="utf-8-sig", errors="replace")
    rel = page.relative_to(ROOT).as_posix()
    if outer(source, "header") != expected_header:
        problems.append(f"{rel}: header mismatch")
    if outer(source, "footer") != expected_footer:
        problems.append(f"{rel}: footer mismatch")
    if source.count(SHELL_CSS) != 1:
        problems.append(f"{rel}: static shell stylesheet missing or duplicated")
    if re.search(r"""<script\b[^>]*\bsrc=["'][^"']*global-shell-guard\.js""", source, re.I):
        problems.append(f"{rel}: retired dynamic shell guard still referenced")
for name in ("main.js", "site-main.js", "analytics.js", "related-tools.js"):
    source = (ROOT / "assets/js" / name).read_text(encoding="utf-8", errors="replace")
    if "global-shell-guard.js" in source:
        problems.append(f"assets/js/{name}: dynamic guard loader remains")
guard = (ROOT / "assets/js/global-shell-guard.js").read_text(encoding="utf-8", errors="replace")
if re.search(r"MutationObserver|createElement|appendChild|removeChild|innerHTML|querySelector", guard):
    problems.append("assets/js/global-shell-guard.js: disabled guard is not inert")
inner = (ROOT / "assets/js/nn-inner-shell.js").read_text(encoding="utf-8", errors="replace")
if re.search(r"""normalizeInnerHeader|ensureTrustFooter|ensureWebsiteLaunchesBadge|global-shell-guard\.js|querySelectorAll\(["']header""", inner):
    problems.append("assets/js/nn-inner-shell.js: shell normalization remains")
core = (ROOT / "assets/js/search-core.js").read_text(encoding="utf-8-sig")
routes = re.findall(r'\{\s*title:"((?:[^"\\]|\\.)*)",\s*url:"((?:[^"\\]|\\.)*)",\s*type:"tool"', core)
if len(routes) != 108 or len({url for _, url in routes}) != 108:
    problems.append(f"expected 108 unique indexed tool routes; found {len(routes)}")
expected = set()
for page in sorted((ROOT / "articles").glob("*.html")):
    source = page.read_text(encoding="utf-8-sig", errors="replace")
    title = re.search(r"<title>\s*(.*?)\s*</title>", source, re.I | re.S)
    canonical = re.search(r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)', source, re.I)
    if not title or not canonical:
        continue
    canonical_url = canonical.group(1).strip().rstrip("/")
    robots = re.search(r'<meta\s+name=["\']robots["\'][^>]*content=["\']([^"\']*)', source[:5000], re.I)
    indexable = not (robots and "noindex" in robots.group(1).lower())
    page_url = (BASE + page.relative_to(ROOT).as_posix()).rstrip("/")
    if indexable and canonical_url == page_url and canonical_url.startswith(BASE + "articles/"):
        expected.add(canonical_url)
try:
    sitemap = ET.parse(ROOT / "sitemap.xml").getroot()
except ET.ParseError as error:
    fail(f"sitemap.xml invalid: {error}")
ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
article_locs = [n.text.strip().rstrip("/") for n in sitemap.findall(".//sm:loc", ns)
                if n.text and "/articles/" in n.text]
actual = set(article_locs)
if len(article_locs) != len(actual):
    problems.append("sitemap.xml contains duplicate article URLs")
if actual != expected:
    problems.append(f"sitemap/article mismatch: expected={len(expected)} actual={len(actual)} "
                    f"missing={sorted(expected-actual)[:5]} stale={sorted(actual-expected)[:5]}")
if problems:
    fail("static layout contract failed: " + "; ".join(problems[:30]))
print(f"PASS: static site shell; html_files={len(html_files)}; nav_items=6; tools={len(routes)}; sitemap_article_urls={len(actual)}")
