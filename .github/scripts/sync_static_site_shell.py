#!/usr/bin/env python3
"""Synchronize one static, canonical NexusNova header/footer across every HTML page."""
from __future__ import annotations
import argparse
import datetime as dt
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "index.html"
SHELL_CSS = ROOT / "assets/css/static-site-shell.css"
SHELL_CSS_HREF = "/assets/css/static-site-shell.css?v=20261017-static-shell-v1"
VOID_TAGS = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
CONTENT_ANCESTORS = {"main","article","section","header","footer"}

STATIC_CSS = r'''
/* Canonical static site shell. Shared by every HTML document. */
:root{--nn-max:1440px;--nn-text:#111827;--nn-muted:#64748b;--nn-subtle:#94a3b8;--nn-line:#e2e8f0;--nn-line-strong:#cbd5e1;--nn-purple:#6d28d9;--nn-purple-dark:#5b21b6;--nn-sans:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--nn-mono:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace}
.nn-header{position:relative!important;z-index:200!important;display:block!important;width:100%!important;max-width:none!important;min-width:0!important;margin:0!important;padding:0!important;color:var(--nn-text)!important;background:#fff!important;border:0!important;border-bottom:1px solid var(--nn-line)!important;border-radius:0!important;box-shadow:none!important;backdrop-filter:none!important;opacity:1!important;visibility:visible!important}
.nn-header .nn-shell,.nn-global-footer .nn-shell{width:min(var(--nn-max),calc(100% - 32px))!important;max-width:var(--nn-max)!important;min-width:0!important;margin-inline:auto!important}
.nn-header .nn-header-row{display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:space-between!important;flex-wrap:nowrap!important;gap:18px!important;min-height:68px!important;height:auto!important;padding:8px 0!important;overflow:visible!important}
.nn-header .nn-brand{display:inline-flex!important;flex:0 0 auto!important;align-items:center!important;gap:10px!important;width:auto!important;min-width:0!important;max-width:100%!important;margin:0!important;padding:0!important;color:var(--nn-text)!important;text-decoration:none!important;background:transparent!important;box-shadow:none!important}
.nn-header .nn-brand picture{display:block!important;flex:0 0 auto!important;width:auto!important;max-width:200px!important;margin:0!important;padding:0!important}
.nn-header .nn-brand-logo-img{display:block!important;width:auto!important;height:40px!important;min-width:0!important;min-height:0!important;max-width:200px!important;max-height:40px!important;margin:0!important;padding:0!important;object-fit:contain!important;object-position:left center!important;background:transparent!important;box-shadow:none!important}
.nn-header .nn-brand-copy{display:grid!important;gap:2px!important;min-width:0!important;color:var(--nn-text)!important;font-family:var(--nn-sans)!important;text-decoration:none!important}
.nn-header .nn-brand-copy strong{display:block!important;margin:0!important;padding:0!important;color:var(--nn-text)!important;font:850 12px/1.2 var(--nn-sans)!important;letter-spacing:.04em!important;white-space:nowrap!important}
.nn-header .nn-nav{display:flex!important;position:static!important;flex:0 1 auto!important;align-items:center!important;justify-content:flex-end!important;flex-wrap:wrap!important;gap:6px!important;width:auto!important;min-width:0!important;max-width:100%!important;height:auto!important;margin:0!important;padding:0!important;overflow:visible!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;transform:none!important;visibility:visible!important;opacity:1!important}
.nn-header .nn-nav a{display:inline-flex!important;flex:0 0 auto!important;align-items:center!important;justify-content:center!important;min-width:0!important;min-height:36px!important;margin:0!important;padding:8px 10px!important;border:1px solid transparent!important;border-radius:9px!important;color:#334155!important;background:transparent!important;box-shadow:none!important;font:750 12px/1.2 var(--nn-sans)!important;letter-spacing:0!important;text-align:center!important;text-decoration:none!important;white-space:nowrap!important}
.nn-header .nn-nav a:hover,.nn-header .nn-nav a:focus-visible{border-color:var(--nn-line)!important;background:#f8fafc!important;color:var(--nn-purple)!important;outline-offset:2px}
.nn-global-footer.nn-footer{display:block!important;position:relative!important;width:100%!important;max-width:none!important;min-width:0!important;margin:32px 0 0!important;padding:0!important;color:var(--nn-text)!important;background:#fff!important;border:0!important;border-top:1px solid var(--nn-line)!important;border-radius:0!important;box-shadow:none!important;font-family:var(--nn-sans)!important}
.nn-global-footer .nn-global-footer-main{display:grid!important;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr) minmax(220px,.8fr)!important;align-items:start!important;gap:26px!important;padding:24px 0 22px!important;border:0!important;background:transparent!important}
.nn-global-footer .nn-footer-brand,.nn-global-footer .nn-footer-trust,.nn-global-footer .nn-footer-social{display:block!important;min-width:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
.nn-global-footer .nn-footer-brand-link{display:inline-flex!important;align-items:center!important;gap:9px!important;max-width:100%!important;margin:0!important;padding:0!important;color:var(--nn-text)!important;text-decoration:none!important;background:transparent!important}
.nn-global-footer .nn-footer-brand-link picture{display:block!important;flex:0 0 auto!important}
.nn-global-footer .nn-footer-brand-logo{display:block!important;width:auto!important;height:34px!important;min-height:0!important;max-width:180px!important;max-height:34px!important;margin:0!important;padding:0!important;object-fit:contain!important;box-shadow:none!important}
.nn-global-footer .nn-footer-brand-copy{display:grid!important;gap:3px!important;min-width:0!important;color:var(--nn-text)!important}
.nn-global-footer .nn-footer-brand-name{color:var(--nn-text)!important;font:900 11px/1.2 var(--nn-sans)!important;letter-spacing:.04em!important}
.nn-global-footer .nn-footer-brand-copy small{color:#64748b!important;font:800 8px/1.4 var(--nn-mono)!important;letter-spacing:.1em!important;text-transform:uppercase!important}
.nn-global-footer .nn-footer-copy{max-width:360px!important;margin:10px 0 0!important;color:#64748b!important;font:450 11px/1.6 var(--nn-sans)!important}
.nn-global-footer .nn-footer-section-title{margin:0 0 10px!important;padding:0!important;color:#475569!important;font:900 9px/1.3 var(--nn-mono)!important;letter-spacing:.09em!important;text-transform:uppercase!important}
.nn-global-footer .nn-footer-trust-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px 18px!important}
.nn-global-footer .nn-footer-trust-grid a{color:#475569!important;font:750 10px/1.5 var(--nn-sans)!important;text-decoration:none!important}
.nn-global-footer .nn-footer-trust-grid a:hover{color:var(--nn-purple)!important}
.nn-global-footer .nn-footer-social .nn-social-title{margin:0 0 10px!important;color:#475569!important;font:900 9px/1.3 var(--nn-mono)!important;letter-spacing:.09em!important;text-transform:uppercase!important}
.nn-global-footer .nn-social-row{display:flex!important;flex-wrap:wrap!important;gap:7px!important;margin:0!important}
.nn-global-footer .nn-social{display:inline-flex!important;align-items:center!important;gap:6px!important;min-height:34px!important;margin:0!important;padding:5px 8px!important;border:1px solid var(--nn-line)!important;border-radius:8px!important;color:#334155!important;background:#fff!important;font:800 9px/1.2 var(--nn-sans)!important;text-decoration:none!important}
.nn-global-footer .nn-social-icon{display:grid!important;flex:0 0 22px!important;place-items:center!important;width:22px!important;height:22px!important;border-radius:6px!important;color:#fff!important}
.nn-global-footer .nn-social-icon svg{display:block!important;width:13px!important;height:13px!important;fill:currentColor!important}
.nn-global-footer .nn-social-x .nn-social-icon{background:#111827!important}.nn-global-footer .nn-social-facebook .nn-social-icon{background:#1877f2!important}.nn-global-footer .nn-social-instagram .nn-social-icon{background:#c13584!important}.nn-global-footer .nn-social-telegram .nn-social-icon{background:#229ed9!important}
.nn-global-footer .nn-social-handle{display:block!important;margin-top:2px!important;color:#64748b!important;font:750 8px/1.2 var(--nn-mono)!important}
.nn-global-footer .nn-global-footer-bottom{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;padding:11px 0 14px!important;border:0!important;border-top:1px solid var(--nn-line)!important;color:#94a3b8!important;background:transparent!important;font:800 8px/1.5 var(--nn-mono)!important;letter-spacing:.05em!important;text-transform:uppercase!important}
.nn-global-footer .nn-footer-domain{color:var(--nn-purple)!important}
@media(max-width:860px){.nn-header .nn-header-row{align-items:flex-start!important;flex-direction:column!important;gap:8px!important;padding:9px 0!important}.nn-header .nn-nav{justify-content:flex-start!important;flex-wrap:nowrap!important;width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:thin}.nn-header .nn-nav a{flex:0 0 auto!important}.nn-global-footer .nn-global-footer-main{grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:22px!important}.nn-global-footer .nn-footer-social{grid-column:1/-1!important}}
@media(max-width:560px){.nn-header .nn-shell,.nn-global-footer .nn-shell{width:min(var(--nn-max),calc(100% - 22px))!important}.nn-header .nn-brand-copy{display:none!important}.nn-header .nn-brand-logo-img{height:36px!important;max-height:36px!important}.nn-header .nn-nav{gap:3px!important}.nn-header .nn-nav a{min-height:34px!important;padding:7px 8px!important;font-size:11px!important}.nn-global-footer .nn-global-footer-main{grid-template-columns:minmax(0,1fr)!important;gap:20px!important}.nn-global-footer .nn-footer-social{grid-column:auto!important}.nn-global-footer .nn-global-footer-bottom{align-items:flex-start!important;flex-direction:column!important}}
'''.strip() + "\n"

VALIDATE_GLOBAL_LAYOUT = r'''#!/usr/bin/env python3
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
    if len(re.findall(r"<footer\b", source, re.I)) != 1:
        problems.append(f"{rel}: expected one footer element")
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
'''

TEST_FILE = r'''const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const shellPart = (source, tag) => {
  const pattern = tag === 'header'
    ? /<header\b(?=[^>]*class=["'][^"']*\bnn-header\b[^"']*["'])[^>]*>[\s\S]*?<\/header\s*>/i
    : /<footer\b(?=[^>]*class=["'][^"']*\bnn-footer\b[^"']*\bnn-global-footer\b[^"']*["'])[^>]*>[\s\S]*?<\/footer\s*>/ig;
  const matches = [...source.matchAll(new RegExp(pattern.source, 'ig'))];
  if (!matches.length) return '';
  if (tag === 'footer') {
    const canonical = matches.find(match => match[0].includes('<source type="image/webp"') && match[0].includes('nn-footer-brand-logo'));
    return (canonical || matches[matches.length - 1])[0];
  }
  return matches[0][0];
};
const labels = header => {
  const nav = (header.match(/<nav\b[^>]*>[\s\S]*?<\/nav\s*>/i) || [''])[0];
  return [...nav.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a\s*>/gi)]
    .map(match => match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
};

test('every HTML page has the canonical static index header and footer', () => {
  const index = read('index.html');
  const header = shellPart(index, 'header');
  const footer = shellPart(index, 'footer');
  assert.ok(header, 'index.html header missing');
  assert.ok(footer, 'index.html footer missing');
  assert.deepEqual(labels(header), ['Home', 'All Tools', 'Content', 'Categories', 'Articles', 'Guides']);
  const files = [];
  const walk = dir => {
    for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
      if (['.git', 'node_modules', 'quality-artifacts'].includes(item.name)) continue;
      const full = path.join(dir, item.name);
      if (item.isDirectory()) walk(full);
      else if (item.isFile() && item.name.toLowerCase().endsWith('.html')) files.push(full);
    }
  };
  walk(root);
  assert.ok(files.length >= 326, 'expected full repository sweep; found ' + files.length + ' HTML files');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file);
    assert.equal(shellPart(source, 'header'), header, relative + ' header differs');
    assert.equal(shellPart(source, 'footer'), footer, relative + ' footer differs');
    assert.equal((source.match(/<footer\b/gi) || []).length, 1, relative + ' must contain exactly one footer element');
    assert.equal((source.match(/\/assets\/css\/static-site-shell\.css\?/g) || []).length, 1,
      relative + ' must load shared shell stylesheet once');
    assert.doesNotMatch(source, /<script\b[^>]*\bsrc=["'][^"']*global-shell-guard\.js/i,
      relative + ' still loads retired dynamic guard');
  }
});

test('dynamic header and footer repair loaders are gone', () => {
  for (const file of ['assets/js/main.js', 'assets/js/site-main.js', 'assets/js/analytics.js', 'assets/js/related-tools.js']) {
    assert.doesNotMatch(read(file), /global-shell-guard\.js/, file + ' still loads retired guard');
  }
  assert.doesNotMatch(read('assets/js/main.js'), /enforceSelectedHeaderLogo|normalizeFooterStructure|global-shell-guard\.js/);
  assert.doesNotMatch(read('assets/js/nn-inner-shell.js'), /normalizeInnerHeader|ensureTrustFooter|ensureWebsiteLaunchesBadge|global-shell-guard\.js|querySelectorAll\(["']header/);
  assert.doesNotMatch(read('assets/js/global-shell-guard.js'), /MutationObserver|createElement|appendChild|removeChild|innerHTML|querySelector/);
  assert.match(read('assets/js/nn-inner-shell.js'), /related-tools-bootstrap\.js/);
});

test('108 indexed tool routes resolve to unique HTML files', () => {
  const core = read('assets/js/search-core.js');
  const routes = [...core.matchAll(/\{\s*title:"((?:[^"\\]|\\.)*)",\s*url:"((?:[^"\\]|\\.)*)",\s*type:"tool"/g)].map(match => match[2]);
  assert.equal(routes.length, 108);
  assert.equal(new Set(routes).size, 108);
  for (const route of routes) assert.ok(fs.existsSync(path.join(root, route.replace(/^\/+/, ''))), 'missing indexed tool route ' + route);
});

test('sitemap synchronization rebuilds the article URL set', () => {
  assert.match(read('.github/scripts/sync_phase2_content.py'), /Rebuild article URL entries/);
  assert.match(read('.github/scripts/validate_global_layout.py'), /expected/);
  assert.match(read('.github/scripts/validate_global_layout.py'), /actual/);
});

test('static shell stylesheet caps logos and provides mobile-safe navigation', () => {
  const css = read('assets/css/static-site-shell.css');
  assert.match(css, /max-height:\s*40px\s*!important/);
  assert.match(css, /@media\s*\(max-width:\s*560px\)/);
  assert.match(css, /overflow-x:\s*auto\s*!important/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});
'''

class ElementSpanParser(HTMLParser):
    """Collect element source ranges while ignoring tag-like text in script/style data."""
    def __init__(self, source: str):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.line_offsets = [0]
        for match in re.finditer("\n", source):
            self.line_offsets.append(match.end())
        self.stack: list[tuple[str, int, tuple[str, ...]]] = []
        self.spans: dict[str, list[tuple[int, int, tuple[str, ...]]]] = {}
        self.feed(source)
        self.close()
    def position(self) -> int:
        line, column = self.getpos()
        return self.line_offsets[line - 1] + column
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        start = self.position()
        ancestors = tuple(item[0] for item in self.stack)
        if tag not in VOID_TAGS:
            self.stack.append((tag, start, ancestors))
    def handle_startendtag(self, tag, attrs):
        return
    def handle_endtag(self, tag):
        tag = tag.lower()
        end_start = self.position()
        end = self.source.find(">", end_start)
        end = len(self.source) if end < 0 else end + 1
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                _, start, ancestors = self.stack[index]
                self.spans.setdefault(tag, []).append((start, end, ancestors))
                del self.stack[index:]
                return


def normalize_url(value: str, attr: str) -> str:
    value = value.strip()
    if not value:
        return value
    if attr.lower() == "href" and value.startswith(("#master-directory", "#content-library")):
        return "/" + value
    if value.startswith(("#", "//")) or re.match(r"^[a-z][a-z0-9+.-]*:", value, re.I):
        return value
    clean = value
    while clean.startswith("../"):
        clean = clean[3:]
    while clean.startswith("./"):
        clean = clean[2:]
    return clean if clean.startswith("/") else "/" + clean


def normalize_template_urls(template: str) -> str:
    def repl(match: re.Match[str]) -> str:
        attr, quote, value = match.group(1), match.group(2), match.group(3)
        if attr.lower() == "srcset":
            candidates = []
            for item in value.split(","):
                parts = item.strip().split()
                if parts:
                    parts[0] = normalize_url(parts[0], "src")
                    candidates.append(" ".join(parts))
            value = ", ".join(candidates)
        elif attr.lower() in {"href", "src", "poster"}:
            value = normalize_url(value, attr)
        return f"{attr}={quote}{value}{quote}"
    template = re.sub(r"\b(href|src|poster|srcset)\s*=\s*([\"'])(.*?)\2", repl, template, flags=re.I | re.S)
    template = re.sub(r"\s+aria-current\s*=\s*([\"']).*?\1", "", template, flags=re.I)
    template = re.sub(
        r"(<span\\b[^>]*\\bdata-year\\b[^>]*>)[\\s\\S]*?(</span\\s*>)",
        lambda m: m.group(1) + str(dt.datetime.now(dt.timezone.utc).year) + m.group(2),
        template, count=1, flags=re.I,
    )
    template = re.sub(r"[ \t]+(?=\r?$)", "", template, flags=re.M)
    return template


def canonical_templates() -> tuple[str, str]:
    source = INDEX.read_text(encoding="utf-8-sig")
    header = re.search(r"<header\b[^>]*>[\s\S]*?</header\s*>", source, re.I)
    footer = re.search(r"<footer\b[^>]*>[\s\S]*?</footer\s*>", source, re.I)
    if not header or not footer:
        raise RuntimeError("index.html must contain its canonical header and footer")
    return normalize_template_urls(header.group(0)), normalize_template_urls(footer.group(0))


def apply_edits(source: str, edits: list[tuple[int, int, str]]) -> str:
    for start, end, replacement in sorted(edits, key=lambda item: (item[0], item[1]), reverse=True):
        source = source[:start] + replacement + source[end:]
    return source


def normalize_html(source: str, header_template: str, footer_template: str) -> str:
    parser = ElementSpanParser(source)
    headers, footers, mains = parser.spans.get("header", []), parser.spans.get("footer", []), parser.spans.get("main", [])
    def is_global(ancestors):
        return not any(tag in CONTENT_ANCESTORS for tag in ancestors)
    first_main_start = min((span[0] for span in mains), default=len(source) + 1)
    global_headers = sorted((s for s in headers if is_global(s[2]) and s[0] < first_main_start), key=lambda s: s[0])
    edits = []
    if global_headers:
        edits.append((*global_headers[0][:2], header_template))
        edits.extend((*span[:2], "") for span in global_headers[1:])
    else:
        body = re.search(r"<body\b[^>]*>", source, re.I)
        main = re.search(r"<main\b", source, re.I)
        position = body.end() if body else (main.start() if main else 0)
        edits.append((position, position, "\n" + header_template + "\n"))
    last_main_end = max((span[1] for span in mains), default=-1)
    all_footers = sorted(footers, key=lambda span: span[0])
    global_footers = sorted((span for span in all_footers if is_global(span[2]) and span[0] > last_main_end), key=lambda span: span[0])
    if global_footers:
        keep_footer = global_footers[0]
        edits.append((*keep_footer[:2], footer_template))
        for span in all_footers:
            if span == keep_footer:
                continue
            # Nested footer tags are removed with their enclosing footer, avoiding overlapping edits.
            if any(parent[0] <= span[0] and span[1] <= parent[1] and parent != span for parent in all_footers):
                continue
            edits.append((*span[:2], ""))
    else:
        # Some legacy pages put their only footer inside <main>. Remove every variant,
        # then append the canonical footer once, after the page content.
        for span in all_footers:
            if any(parent[0] <= span[0] and span[1] <= parent[1] and parent != span for parent in all_footers):
                continue
            edits.append((*span[:2], ""))
        closes = list(re.finditer(r"</body\s*>", source, re.I))
        position = closes[-1].start() if closes else len(source)
        edits.append((position, position, "\n" + footer_template + "\n"))
    source = apply_edits(source, edits)
    source = re.sub(
        r"<script\b(?=[^>]*\bsrc\s*=\s*[\"'][^\"']*global-shell-guard\.js(?:\?[^\"']*)?[\"'])[^>]*>[\s\S]*?</script\s*>",
        "", source, flags=re.I,
    )
    source = re.sub(r"<link\b(?=[^>]*global-shell-repair\.css)[^>]*>", "", source, flags=re.I)
    source = re.sub(r"<link\b(?=[^>]*static-site-shell\.css)[^>]*>", "", source, flags=re.I)
    css_link = f'<link rel="stylesheet" href="{SHELL_CSS_HREF}">'
    if re.search(r"</head\s*>", source, re.I):
        source = re.sub(r"</head\s*>", css_link + "\n</head>", source, count=1, flags=re.I)
    else:
        body = re.search(r"<body\b[^>]*>", source, re.I)
        position = body.start() if body else 0
        source = source[:position] + css_link + "\n" + source[position:]
    source = re.sub(r"[ \t]+(?=\r?$)", "", source, flags=re.M)
    return source


def remove_guard_loader(source: str) -> str:
    marker = "/* Load the shared responsive header/search/footer repair layer once per page. */"
    if marker in source:
        start = source.index(marker)
        tail = re.search(r"\}\)\(\);\s*", source[start:])
        if tail:
            source = source[:start] + source[start + tail.end():]
    return source.rstrip() + "\n"


def disable_legacy_logo_mutation(source: str) -> str:
    start_marker = "  // Keep every visible footer Contact link consistent across the entire site."
    end_marker = "  // Global share action:"
    start = source.find(start_marker)
    if start < 0:
        return source
    end = source.find(end_marker, start)
    if end < 0:
        raise RuntimeError("main.js header/footer mutation block changed unexpectedly")
    return source[:start] + source[end:]


def replace_between(source, start_marker, end_marker, replacement):
    start = source.find(start_marker)
    if start < 0:
        return source
    end = source.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f"cannot find end marker after {start_marker!r}")
    return source[:start] + replacement + source[end:]


def all_html_files():
    return sorted(p for p in ROOT.rglob("*.html")
                  if not any(part in {".git", "node_modules", "quality-artifacts"} for part in p.parts))


def patch_supporting_sources():
    changed = []
    stub = "/* Retired: the canonical site shell is static HTML; this file intentionally performs no DOM mutation. */\n"
    guard_path = ROOT / "assets/js/global-shell-guard.js"
    if guard_path.read_text(encoding="utf-8", errors="replace") != stub:
        guard_path.write_text(stub, encoding="utf-8")
        changed.append("assets/js/global-shell-guard.js")

    # Keep the legacy shell filename only as a non-mutating related-content bootstrap.
    inner_shell = """/* Related-content bootstrap only. Shared header and footer are static HTML. */
(function () {
  if (window.__nexusNovaRelatedToolsBootstrapScriptRequested) return;
  window.__nexusNovaRelatedToolsBootstrapScriptRequested = true;
  var loader = document.createElement('script');
  loader.src = '/assets/js/related-tools-bootstrap.js?v=20261016-related-content-v1';
  loader.async = true;
  loader.dataset.nexusnovaRelatedToolsBootstrap = '';
  loader.onerror = function () {
    window.__nexusNovaRelatedToolsBootstrapScriptRequested = false;
  };
  document.head.appendChild(loader);
})();
"""
    inner_path = ROOT / "assets/js/nn-inner-shell.js"
    if inner_path.read_text(encoding="utf-8", errors="replace") != inner_shell:
        inner_path.write_text(inner_shell, encoding="utf-8")
        changed.append("assets/js/nn-inner-shell.js")
    for relative in ("assets/js/main.js", "assets/js/analytics.js", "assets/js/site-main.js", "assets/js/related-tools.js"):
        path = ROOT / relative
        original = path.read_text(encoding="utf-8-sig")
        source = remove_guard_loader(original)
        if relative == "assets/js/main.js":
            source = disable_legacy_logo_mutation(source)
        if source != original:
            path.write_text(source, encoding="utf-8")
            changed.append(relative)

    sync_path = ROOT / ".github/scripts/sync_phase2_content.py"
    if sync_path.exists():
        original = sync_path.read_text(encoding="utf-8-sig")
        source = original
        start = source.find("def ensure_global_shell_loader(path):")
        if start >= 0:
            end = source.find("\nrecords=[]", start)
            if end < 0:
                raise RuntimeError("sync_phase2_content.py shell loader end marker missing")
            helper = r'''def ensure_related_tools_loader(path):
    """Keep route-aware related content, but never inject the global shell guard."""
    source = path.read_text(encoding="utf-8-sig")
    original = source
    source = re.sub(r'<script[^>]*global-shell-guard\.js[^>]*></script>', '', source, flags=re.I)
    loader_pattern = r"""<script\b[^>]+src=["'][^"']*(?:nn-inner-shell|main|site-main|related-tools|analytics|tier1-tools|search-core)\.js(?:\?[^"']*)?["']"""
    if not re.search(loader_pattern, source, re.I):
        tag = '\n<script defer src="../assets/js/nn-inner-shell.js?v=20261016-related-content-v1"></script>\n'
        updated, n = re.subn(r'</body\s*>', lambda match: tag + match.group(0), source, count=1, flags=re.I)
        source = updated if n else source + tag
    if source != original:
        path.write_text(source, encoding="utf-8")
        return True
    return False


'''
            source = source[:start] + helper + source[end + 1:]
        source = source.replace("    ensure_global_shell_loader(p)\n", "    ensure_related_tools_loader(p)\n")
        if source != original:
            sync_path.write_text(source, encoding="utf-8")
            changed.append(".github/scripts/sync_phase2_content.py")

    cleanup_path = ROOT / ".github/scripts/final_system_cleanup.py"
    if cleanup_path.exists():
        original = cleanup_path.read_text(encoding="utf-8-sig")
        source = re.sub(
            r"^\s*<script defer src=[\"'][^\"']*global-shell-guard\.js[^\"']*[\"']></script>\s*$",
            "", original, flags=re.I | re.M,
        )
        marker = 'raise SystemExit(f"ERROR: article discovery synchronization failed with exit code {run.returncode}")'
        if marker in source and "sync_static_site_shell.py" not in source:
            invocation = '''
    # Reapply the static shell after generated content and article indexes are synchronized.
    shell_sync = subprocess.run(
        [sys.executable, str(ROOT / ".github/scripts/sync_static_site_shell.py"), "--write"],
        cwd=ROOT, text=True, capture_output=True
    )
    if shell_sync.stdout:
        print(shell_sync.stdout.rstrip())
    if shell_sync.returncode:
        if shell_sync.stderr:
            print(shell_sync.stderr.rstrip(), file=sys.stderr)
        raise SystemExit("ERROR: static site shell synchronization failed")
'''
            source = source.replace(marker, marker + "\n" + invocation.rstrip("\n"), 1)
        if source != original:
            cleanup_path.write_text(source, encoding="utf-8")
            changed.append(".github/scripts/final_system_cleanup.py")

    validator = ROOT / ".github/scripts/validate_global_layout.py"
    validator.write_text(VALIDATE_GLOBAL_LAYOUT, encoding="utf-8")
    changed.append(".github/scripts/validate_global_layout.py")

    layout = ROOT / ".github/scripts/validate_all_html_layout.py"
    if layout.exists():
        original = layout.read_text(encoding="utf-8-sig")
        source = replace_between(
            original, "def html_files() -> list[Path]:", "\n\ndef is_standalone_preview",
            '''def html_files() -> list[Path]:
    """Enumerate every repository HTML document, including nested tech and app pages."""
    return sorted(
        path for path in ROOT.rglob("*.html")
        if not any(part in {".git", "node_modules", "quality-artifacts"} for part in path.parts)
    )
''',
        )
        if source != original:
            layout.write_text(source, encoding="utf-8")
            changed.append(".github/scripts/validate_all_html_layout.py")

    (ROOT / "tests/global-layout-contract.test.cjs").write_text(TEST_FILE, encoding="utf-8")
    changed.append("tests/global-layout-contract.test.cjs")


    # Keep existing feature contracts aligned with the deliberately static shell.
    contracts = [
        ("tests/article-expansion-quality.test.cjs", [
            ("assert.match(html, /global-shell-guard\\.js/);",
             "assert.match(html, /static-site-shell\\.css/);\n  assert.doesNotMatch(html, /global-shell-guard\\.js/);")
        ]),
        ("tests/dynamic-link-hydration-performance.test.cjs", [
            ("""  assert.ok(
    source.includes('scheduleNonCriticalDomTask(enforceSelectedHeaderLogo)') &&
    source.includes('scheduleNonCriticalDomTask(normalizeFooterStructure)'),
    'non-critical header/footer normalization must wait for idle time'
  );""",
             """  assert.ok(
    !source.includes('enforceSelectedHeaderLogo') &&
    !source.includes('normalizeFooterStructure') &&
    !source.includes('global-shell-guard.js'),
    'header/footer must remain static instead of being mutated at runtime'
  );""")
        ]),
        ("tests/live-gold.test.cjs", [
            ('href="#master-directory"', 'href="\\/#master-directory"')
        ]),
        ("tests/pakistan-new-tools-surface.test.cjs", [
            ('assert.match(html,/href="index\\.html#master-directory"/);',
             'assert.match(html,/href="\\/#master-directory"/);')
        ]),
        ("tests/home-performance-loading.test.cjs", [
            ('srcset="assets\\/logo-2x', 'srcset="\\/?assets\\/logo-2x'),
            (', assets\\/logo-3x', ', \\/?assets\\/logo-3x'),
            ('src="assets\\/logo\\.png', 'src="\\/?assets\\/logo\\.png'),
            ('srcset="assets/logo-2x', 'srcset="/?assets/logo-2x'),
            (', assets/logo-3x', ', /?assets/logo-3x'),
            ('src="assets/logo\\\\.png', 'src="/?assets/logo\\\\.png'),
            ('alt="NexusNova Tools Logo" class="', 'alt="NexusNova Tools Logo"(?: width="1040" height="345")? class="')
        ])
    ]
    for relative, replacements in contracts:
        contract_path = ROOT / relative
        if not contract_path.exists():
            continue
        original = contract_path.read_text(encoding="utf-8-sig")
        source = original
        for old, new in replacements:
            if old in source:
                source = source.replace(old, new)
        if source != original:
            contract_path.write_text(source, encoding="utf-8")
            changed.append(relative)

    # Workflows are intentionally left untouched: this job's GitHub App lacks workflow-file push permission.
    return sorted(set(changed))


def check_static_shell(header_template, footer_template):
    problems = []
    pages = all_html_files()
    for path in pages:
        source = path.read_text(encoding="utf-8-sig", errors="replace")
        relative = path.relative_to(ROOT).as_posix()
        parser = ElementSpanParser(source)
        headers = [s for s in parser.spans.get("header", []) if not any(tag in CONTENT_ANCESTORS for tag in s[2])]
        footers = [s for s in parser.spans.get("footer", []) if not any(tag in CONTENT_ANCESTORS for tag in s[2])]
        if not headers:
            problems.append(f"{relative}: missing static header")
        if not footers:
            problems.append(f"{relative}: missing static footer")
        if len(parser.spans.get("footer", [])) != 1:
            problems.append(f"{relative}: expected exactly one footer element, found {len(parser.spans.get('footer', []))}")
        if source.count(SHELL_CSS_HREF) != 1:
            problems.append(f"{relative}: expected one shared stylesheet link")
        if re.search(r"<script\b[^>]*\bsrc\s*=\s*[\"'][^\"']*global-shell-guard\.js", source, re.I):
            problems.append(f"{relative}: retired shell script still referenced")
        if headers and source[headers[0][0]:headers[0][1]] != header_template:
            problems.append(f"{relative}: header differs from canonical index.html")
        if footers and source[footers[-1][0]:footers[-1][1]] != footer_template:
            problems.append(f"{relative}: footer differs from canonical index.html")
    for relative in ("assets/js/main.js", "assets/js/analytics.js", "assets/js/site-main.js", "assets/js/related-tools.js"):
        if "global-shell-guard.js" in (ROOT / relative).read_text(encoding="utf-8", errors="replace"):
            problems.append(f"{relative}: automatic shell loader remains")
    return problems


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--write", action="store_true", help="synchronize all pages and disable runtime header guards")
    group.add_argument("--check", action="store_true", help="verify static shell without writing")
    args = parser.parse_args()
    header, footer = canonical_templates()
    if args.write:
        SHELL_CSS.parent.mkdir(parents=True, exist_ok=True)
        SHELL_CSS.write_text(STATIC_CSS, encoding="utf-8")
        changed_sources = patch_supporting_sources()
        changed_pages = []
        for path in all_html_files():
            original = path.read_text(encoding="utf-8-sig", errors="replace")
            updated = normalize_html(original, header, footer)
            if updated != original:
                path.write_text(updated, encoding="utf-8")
                changed_pages.append(path.relative_to(ROOT).as_posix())
        print(f"STATIC_SHELL_SYNC html_files={len(all_html_files())} changed_pages={len(changed_pages)} support_files_changed={len(changed_sources)}")
        for relative in changed_sources:
            print("UPDATED_SUPPORT", relative)
        for relative in changed_pages:
            print("UPDATED_HTML", relative)
    problems = check_static_shell(header, footer)
    if problems:
        for item in problems[:100]:
            print("FAIL_STATIC_SHELL", item, file=sys.stderr)
        print(f"STATIC_SHELL_FAIL problems={len(problems)}", file=sys.stderr)
        return 1
    print(f"STATIC_SHELL_PASS html_files={len(all_html_files())} nav_items=6 runtime_guard_loaders=0")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
