#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BASE = "https://nexusnovatools.com/"
DOMAIN = "nexusnovatools.com"
THIN_WORDS = 300
WARN_WORDS = 350

UNFINISHED_MARKERS = (
    "active development",
    "under construction",
    "coming soon",
    "work in progress",
    "flagship betas",
    "real working mvps",
    "release checks continue",
    "experimental does not mean fake",
    "experimental browser tools",
)
LEGACY_MARKERS = (
    "nexusnovaeveryday digital hub",
    "nexusnova everyday digital hub",
)
TRUST_FILES = {
    "privacy.html",
    "about.html",
    "contact.html",
    "terms.html",
    "disclaimer.html",
    "tool-methodology.html",
    "editorial-policy.html",
    "editorial-team.html",
}
SENSITIVE_HINTS = ("tax", "electricity", "zakat", "prayer", "finance", "emi")


class PageParser(HTMLParser):
    SKIP = {"script", "style", "svg", "noscript"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack: list[str] = []
        self.text: list[str] = []
        self.h1_count = 0
        self.robots = ""
        self.description = ""
        self.canonical = ""
        self.links: list[tuple[str, bool]] = []
        self.external_links = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        self.stack.append(tag)
        d = {str(k).lower(): (v or "") for k, v in attrs}
        if tag == "h1":
            self.h1_count += 1
        elif tag == "meta":
            name = d.get("name", "").lower()
            if name == "robots":
                self.robots = d.get("content", "")
            elif name == "description":
                self.description = d.get("content", "")
        elif tag == "link":
            rel = d.get("rel", "").lower()
            if "canonical" in rel:
                self.canonical = d.get("href", "")
        elif tag == "a":
            href = d.get("href", "").strip()
            if href:
                in_shell = "header" in self.stack or "footer" in self.stack or "nav" in self.stack
                self.links.append((href, in_shell))
                parsed = urllib.parse.urlparse(href)
                if parsed.scheme in {"http", "https"} and parsed.netloc and parsed.netloc != DOMAIN:
                    self.external_links += 1

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if self.stack:
            self.stack.pop()

    def handle_endtag(self, tag):
        tag = tag.lower()
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if any(tag in self.SKIP for tag in self.stack):
            return
        if data and data.strip():
            self.text.append(data.strip())

    @property
    def visible_text(self):
        return " ".join(self.text)

    @property
    def word_count(self):
        return len(re.findall(r"\b[\w’'-]+\b", self.visible_text, flags=re.UNICODE))

    @property
    def noindex(self):
        return "noindex" in self.robots.lower()


def parse_page(html: str) -> PageParser:
    p = PageParser()
    try:
        p.feed(html)
    except Exception:
        pass
    return p


def xml_locs(path: Path) -> list[str]:
    try:
        root = ET.parse(path).getroot()
    except Exception:
        return []
    locs = []
    for el in root.iter():
        if el.tag.endswith("loc") and el.text:
            locs.append(el.text.strip())
    return locs


def sitemap_files() -> list[Path]:
    out = []
    index = ROOT / "sitemap-index.xml"
    if index.exists():
        for loc in xml_locs(index):
            name = urllib.parse.urlparse(loc).path.lstrip("/")
            p = ROOT / name
            if p.exists() and p.suffix == ".xml":
                out.append(p)
    main = ROOT / "sitemap.xml"
    if main.exists() and main not in out:
        out.insert(0, main)
    return out


def url_to_local(url: str) -> Path | None:
    u = urllib.parse.urlparse(url)
    if u.netloc and u.netloc != DOMAIN:
        return None
    path = urllib.parse.unquote(u.path or "/")
    if path in {"", "/"}:
        return ROOT / "index.html"
    rel = path.lstrip("/")
    if rel.endswith("/"):
        rel += "index.html"
    return ROOT / rel


def canonical_expected(url: str) -> str:
    u = urllib.parse.urlparse(url)
    path = u.path or "/"
    return urllib.parse.urlunparse(("https", DOMAIN, path, "", "", ""))


def internal_target(source: Path, href: str) -> Path | None:
    href = href.strip()
    if not href or href.startswith(("#", "mailto:", "tel:", "javascript:", "data:")):
        return None
    u = urllib.parse.urlparse(href)
    if u.scheme in {"http", "https"}:
        if u.netloc != DOMAIN:
            return None
        return url_to_local(href)
    clean = urllib.parse.unquote(u.path)
    if not clean:
        return None
    if clean.startswith("/"):
        target = ROOT / clean.lstrip("/")
    else:
        target = source.parent / clean
    if str(clean).endswith("/"):
        target = target / "index.html"
    return target.resolve()


def sensitive_ok(path: Path, parser: PageParser) -> bool:
    name = path.name.lower()
    if not any(h in name for h in SENSITIVE_HINTS):
        return True
    text = parser.visible_text.lower()
    trust_hits = sum(token in text for token in ("estimate", "verify", "source", "methodology", "not official", "reference"))
    return trust_hits >= 2


def local_audit():
    blockers = []
    warnings = []
    pages = {}
    files = sitemap_files()
    sitemap_urls = []
    sitemap_membership: dict[str, list[str]] = {}

    for sf in files:
        for url in xml_locs(sf):
            if not url.startswith(BASE):
                continue
            sitemap_urls.append(url)
            sitemap_membership.setdefault(url, []).append(sf.name)

    unique_urls = list(dict.fromkeys(sitemap_urls))
    duplicates = {u: s for u, s in sitemap_membership.items() if len(s) > 1}

    for url in unique_urls:
        local = url_to_local(url)
        if not local or not local.exists():
            blockers.append({"type": "sitemap_missing_local_file", "url": url})
            continue
        try:
            html = local.read_text(encoding="utf-8")
        except Exception as exc:
            blockers.append({"type": "unreadable_html", "url": url, "detail": str(exc)})
            continue
        p = parse_page(html)
        pages[url] = {"file": str(local.relative_to(ROOT)), "words": p.word_count, "noindex": p.noindex}
        expected = canonical_expected(url)

        if p.noindex:
            blockers.append({"type": "noindex_in_sitemap", "url": url, "file": str(local.relative_to(ROOT))})
        if not p.canonical:
            blockers.append({"type": "missing_canonical", "url": url})
        elif p.canonical.rstrip("/") != expected.rstrip("/"):
            blockers.append({"type": "nonself_canonical", "url": url, "canonical": p.canonical, "expected": expected})
        if p.h1_count != 1:
            blockers.append({"type": "h1_count", "url": url, "count": p.h1_count})
        if not p.description.strip():
            blockers.append({"type": "missing_meta_description", "url": url})
        if p.word_count < THIN_WORDS:
            blockers.append({"type": "thin_indexable_page", "url": url, "words": p.word_count})
        elif p.word_count < WARN_WORDS:
            warnings.append({"type": "borderline_content_depth", "url": url, "words": p.word_count})

        low = p.visible_text.lower()
        for marker in UNFINISHED_MARKERS:
            if marker in low:
                blockers.append({"type": "unfinished_surface", "url": url, "marker": marker})
        for marker in LEGACY_MARKERS:
            if marker in low:
                blockers.append({"type": "legacy_branding", "url": url, "marker": marker})
        if not sensitive_ok(local, p):
            blockers.append({"type": "sensitive_page_trust_gap", "url": url})

        for href, in_shell in p.links:
            target = internal_target(local, href)
            if target is None:
                continue
            try:
                target.relative_to(ROOT.resolve())
            except ValueError:
                continue
            if not target.exists():
                blockers.append({"type": "broken_internal_link", "url": url, "href": href})
            if target.name == "app.html" and (in_shell or local.name == "index.html"):
                blockers.append({"type": "app_exposed_from_primary_surface", "url": url, "href": href})

    app = ROOT / "app.html"
    if app.exists():
        ap = parse_page(app.read_text(encoding="utf-8"))
        if not ap.noindex:
            blockers.append({"type": "app_not_noindex", "file": "app.html"})
        if any(urllib.parse.urlparse(u).path == "/app.html" for u in unique_urls):
            blockers.append({"type": "app_still_in_sitemap", "file": "app.html"})

    for trust in TRUST_FILES:
        pth = ROOT / trust
        if not pth.exists():
            blockers.append({"type": "missing_trust_page", "file": trust})

    for html_file in ROOT.rglob("*.html"):
        if any(part.startswith(".") for part in html_file.relative_to(ROOT).parts):
            continue
        try:
            p = parse_page(html_file.read_text(encoding="utf-8"))
        except Exception:
            continue
        if p.noindex:
            continue
        low = p.visible_text.lower()
        for marker in LEGACY_MARKERS:
            if marker in low:
                blockers.append({"type": "legacy_branding_any_indexable", "file": str(html_file.relative_to(ROOT)), "marker": marker})

    return {
        "sitemap_files": [p.name for p in files],
        "sitemap_entries": len(sitemap_urls),
        "unique_sitemap_urls": len(unique_urls),
        "duplicate_urls_across_sitemaps": duplicates,
        "pages": pages,
        "blockers": blockers,
        "warnings": warnings,
    }, unique_urls


def fetch_live(url: str):
    req = urllib.request.Request(url, headers={
        "User-Agent": "NexusNova-AdSense-Reviewer-Audit/2.0",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
    })
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            body = resp.read().decode("utf-8", "replace")
            return url, resp.status, resp.geturl(), body, ""
    except Exception as exc:
        status = getattr(exc, "code", 0) or 0
        return url, status, url, "", f"{type(exc).__name__}: {exc}"


def live_audit(urls: list[str]):
    blockers = []
    warnings = []
    results = {}
    targets = list(dict.fromkeys(urls + [BASE + x for x in sorted(TRUST_FILES)] + [BASE + "app.html", BASE + "robots.txt", BASE + "ads.txt"]))
    with ThreadPoolExecutor(max_workers=8) as pool:
        futs = {pool.submit(fetch_live, u): u for u in targets}
        for fut in as_completed(futs):
            url, status, effective, body, error = fut.result()
            row = {"status": status, "effective": effective, "error": error}
            if error or status != 200:
                blockers.append({"type": "live_http_failure", "url": url, "status": status, "error": error})
                results[url] = row
                continue
            if url.endswith(("robots.txt", "ads.txt")):
                results[url] = row
                continue
            p = parse_page(body)
            row.update({"words": p.word_count, "noindex": p.noindex, "canonical": p.canonical, "h1": p.h1_count})
            results[url] = row
            path = urllib.parse.urlparse(url).path
            in_sitemap = url in urls
            if in_sitemap:
                if p.noindex:
                    blockers.append({"type": "live_noindex_in_sitemap", "url": url})
                expected = canonical_expected(url)
                if not p.canonical or p.canonical.rstrip("/") != expected.rstrip("/"):
                    blockers.append({"type": "live_canonical_problem", "url": url, "canonical": p.canonical, "expected": expected})
                if p.h1_count != 1:
                    blockers.append({"type": "live_h1_count", "url": url, "count": p.h1_count})
                if p.word_count < THIN_WORDS:
                    blockers.append({"type": "live_thin_page", "url": url, "words": p.word_count})
                elif p.word_count < WARN_WORDS:
                    warnings.append({"type": "live_borderline_depth", "url": url, "words": p.word_count})
                low = p.visible_text.lower()
                for marker in UNFINISHED_MARKERS:
                    if marker in low:
                        blockers.append({"type": "live_unfinished_surface", "url": url, "marker": marker})
                for marker in LEGACY_MARKERS:
                    if marker in low:
                        blockers.append({"type": "live_legacy_branding", "url": url, "marker": marker})
            if path == "/app.html" and not p.noindex:
                blockers.append({"type": "live_app_not_noindex", "url": url})

    robots = results.get(BASE + "robots.txt", {})
    ads = results.get(BASE + "ads.txt", {})
    if robots.get("status") != 200:
        blockers.append({"type": "robots_unavailable"})
    if ads.get("status") != 200:
        blockers.append({"type": "ads_txt_unavailable"})
    return {"results": results, "blockers": blockers, "warnings": warnings}


def main():
    run_live = "--live" in sys.argv
    local, urls = local_audit()
    report = {"local": local}
    all_blockers = list(local["blockers"])
    all_warnings = list(local["warnings"])
    if run_live:
        live = live_audit(urls)
        report["live"] = live
        all_blockers.extend(live["blockers"])
        all_warnings.extend(live["warnings"])
    report["summary"] = {
        "blockers": len(all_blockers),
        "warnings": len(all_warnings),
        "status": "PASS" if not all_blockers else "FAIL",
    }
    Path("adsense-reviewer-audit.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(report["summary"], indent=2))
    if all_blockers:
        print("\nBLOCKERS:")
        for item in all_blockers:
            print("-", json.dumps(item, ensure_ascii=False))
        raise SystemExit(1)
    if all_warnings:
        print("\nWARNINGS:")
        for item in all_warnings:
            print("-", json.dumps(item, ensure_ascii=False))


if __name__ == "__main__":
    main()
