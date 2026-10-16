#!/usr/bin/env python3
"""Structural audit for the NexusNova UI shell and article sitemap."""
import re
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
BASE="https://nexusnovatools.com/"

def meta(source, pattern):
    match=re.search(pattern,source,re.I|re.S)
    return match.group(1).strip() if match else ""

def fail(message):
    print("FAIL:",message)
    raise SystemExit(1)

core=(ROOT/"assets/js/search-core.js").read_text(encoding="utf-8-sig")
routes=re.findall(r'\{\s*title:"((?:[^"\\]|\\.)*)",\s*url:"((?:[^"\\]|\\.)*)",\s*type:"tool"',core)
if len(routes)!=108 or len({url for _,url in routes})!=108:
    fail(f"expected 108 unique indexed tool routes; found {len(routes)} records")
targets={url.lstrip("/") for _,url in routes}
for folder in ("tools","articles","guides"):
    targets.update(p.relative_to(ROOT).as_posix() for p in (ROOT/folder).glob("*.html"))
loaders=("nn-inner-shell.js","main.js","site-main.js","related-tools.js","analytics.js","tier1-tools.js")
problems=[]
for relative in sorted(targets):
    page=ROOT/relative
    if not page.is_file():
        problems.append(f"{relative}: indexed route file missing")
        continue
    source=page.read_text(encoding="utf-8-sig",errors="replace")
    if not re.search(r"<header\b|class=[\"'][^\"']*(?:nn-header|site-header|ti-header|global-header)",source,re.I) and not any(name in source for name in loaders):
        problems.append(f"{relative}: no visible header markup or shared shell loader")
    if not re.search(r"<footer\b|class=[\"'][^\"']*(?:nn-footer|site-footer|global-footer|footer)",source,re.I) and not any(name in source for name in loaders):
        problems.append(f"{relative}: no visible footer markup or shared shell loader")
    if not any(name in source for name in loaders) and "global-shell-guard.js" not in source:
        problems.append(f"{relative}: no global shell guard entry point")
if problems:
    fail("layout shell audit failed: "+"; ".join(problems[:12]))

expected=set()
for page in sorted((ROOT/"articles").glob("*.html")):
    source=page.read_text(encoding="utf-8-sig",errors="replace")
    title=meta(source,r"<title>\s*(.*?)\s*</title>")
    canonical=meta(source,r'<link\s+rel=["\']canonical["\']\s+href=["\']([^"\']+)')
    if not title or not canonical:
        continue
    canonical=canonical.rstrip("/")
    indexable="noindex" not in source[:5000].lower()
    page_url=(BASE+page.relative_to(ROOT).as_posix()).rstrip("/")
    if indexable and canonical==page_url and canonical.startswith(BASE+"articles/"):
        expected.add(canonical)
try:
    sitemap=ET.parse(ROOT/"sitemap.xml").getroot()
except ET.ParseError as error:
    fail(f"sitemap.xml is not valid XML: {error}")
ns={"sm":"http://www.sitemaps.org/schemas/sitemap/0.9"}
article_locs=[node.text.strip().rstrip("/") for node in sitemap.findall(".//sm:loc",ns) if node.text and "/articles/" in node.text]
actual=set(article_locs)
if len(article_locs)!=len(actual):
    fail("sitemap.xml contains duplicate article URLs")
if actual!=expected:
    fail(f"sitemap/article mismatch: expected={len(expected)} actual={len(actual)} missing={sorted(expected-actual)[:5]} stale={sorted(actual-expected)[:5]}")
guard=(ROOT/"assets/js/global-shell-guard.js").read_text(encoding="utf-8")
css=(ROOT/"assets/css/global-shell-repair.css").read_text(encoding="utf-8")
for token in ("ensureHeader","ensureFooter","ensureToolFaq","bindSearch","ensureRelatedTools","nn-global-search"):
    if token not in guard:
        fail("global guard missing repair marker: "+token)
for token in ("@media(max-width:760px)","min-width:0","color-scheme:light",".nn-global-shell-faq"):
    if token not in css:
        fail("responsive stylesheet missing marker: "+token)
print(f"PASS: global layout structural audit; tools={len(routes)}, target_pages={len(targets)}, articles={len(list((ROOT/'articles').glob('*.html')))}, guides={len(list((ROOT/'guides').glob('*.html')))}, sitemap_article_urls={len(actual)}; warnings=0")

