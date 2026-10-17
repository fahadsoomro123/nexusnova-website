#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BASE = "http://127.0.0.1:8000"
ARTICLE_HUB = "articles.html"
PUBLIC_FOLDERS = ("tools", "articles", "guides")


class StructureParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.headers = 0
        self.footers = 0
        self.header_navs = 0
        self.header_searches = 0
        self.article_links = 0
        self.robots = ""
        self.current_header_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        lower = tag.lower()
        if lower == "header":
            self.headers += 1
            self.current_header_depth += 1
        elif lower == "footer":
            self.footers += 1
        elif lower == "nav" and self.current_header_depth:
            self.header_navs += 1
        elif self.current_header_depth and lower == "input" and attrs_dict.get("type", "").lower() == "search":
            self.header_searches += 1
        elif self.current_header_depth and lower == "form" and attrs_dict.get("role", "").lower() == "search":
            self.header_searches += 1
        if lower == "a":
            href = attrs_dict.get("href", "")
            if re.search(r"(?:^|/)articles/[^/?#]+\.html(?:[?#].*)?$", href, re.I):
                self.article_links += 1
        if lower == "meta" and attrs_dict.get("name", "").lower() == "robots":
            self.robots = attrs_dict.get("content", "")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "header" and self.current_header_depth:
            self.current_header_depth -= 1


def html_files() -> list[Path]:
    paths = sorted(ROOT.glob("*.html"))
    for folder in PUBLIC_FOLDERS:
        base = ROOT / folder
        if base.exists():
            paths.extend(sorted(base.rglob("*.html")))
    return sorted(set(paths))


def is_standalone_preview(parser: StructureParser, path: Path) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return "noindex" in parser.robots.lower() or rel == "404.html" or rel.startswith(("homepage-", "humanproof-", "image-compressor-compact-preview-"))


def static_validate(path: Path) -> tuple[StructureParser, list[str]]:
    parser = StructureParser()
    parser.feed(path.read_text(encoding="utf-8", errors="replace"))
    findings: list[str] = []
    rel = path.relative_to(ROOT).as_posix()
    if not is_standalone_preview(parser, path):
        if parser.headers > 1:
            findings.append(f"{rel}: source contains {parser.headers} header elements")
        if parser.header_navs > 1:
            findings.append(f"{rel}: source contains {parser.header_navs} navigation bars inside header")
        if parser.header_searches > 1:
            findings.append(f"{rel}: source contains {parser.header_searches} search controls inside header")
        if parser.footers < 1:
            findings.append(f"{rel}: source footer missing")
    return parser, findings


def live_sitemap_urls(base_url: str) -> list[str]:
    with urllib.request.urlopen(base_url.rstrip("/") + "/sitemap.xml", timeout=20) as response:
        text = response.read().decode("utf-8", errors="replace")
    return sorted(dict.fromkeys(re.findall(r"<loc>(.*?)</loc>", text)))


def page_metrics(page) -> dict:
    return page.evaluate(
        r"""
        () => {
          const visible = el => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0.01;
          };
          const headers = [...document.querySelectorAll('header')].filter(h => !h.parentElement?.closest('header') && visible(h));
          const header = headers[0] || null;
          const navs = header ? [...header.querySelectorAll('nav')] : [];
          const searches = header ? [...header.querySelectorAll('input[type="search"],form[role="search"] input')] : [];
          const logos = header ? [...header.querySelectorAll('img')].filter(visible).map(img => ({height: img.getBoundingClientRect().height, width: img.getBoundingClientRect().width, src: img.currentSrc || img.src})) : [];
          const articleLinks = [...document.querySelectorAll('a[href]')].map(a => new URL(a.getAttribute('href'), location.href).pathname).filter(p => /\/articles\/[^/]+\.html$/i.test(p));
          const footer = [...document.querySelectorAll('footer,[role="contentinfo"]')].filter(el => !el.parentElement?.closest('footer,[role="contentinfo"]') && visible(el));
          return {headers:headers.length,navs:navs.length,searches:searches.length,logos,footers:footer.length,articleLinks:[...new Set(articleLinks)],scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
        }
        """
    )


def validate_browser(base_url: str, urls: list[tuple[str, str]], live: bool, preview_paths: set[str]) -> dict:
    failures: list[str] = []
    warnings: list[str] = []
    checked = 0
    article_cards = 0
    article_count_text = False
    max_logo_height = 0.0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for label, rel in urls:
            preview = rel in preview_paths
            for viewport_name, width, height in (("desktop", 1440, 1000), ("mobile", 390, 844)):
                page = browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
                try:
                    target = rel if rel.startswith("http") else base_url.rstrip("/") + "/" + rel.lstrip("/")
                    response = page.goto(target, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_timeout(150)
                    status = response.status if response else 0
                    if status >= 400 or status == 0:
                        failures.append(f"{label}@{viewport_name}: HTTP {status}")
                        continue
                    metrics = page_metrics(page)
                    checked += 1
                    if not preview:
                        for logo in metrics["logos"]:
                            max_logo_height = max(max_logo_height, float(logo["height"]))
                            if logo["height"] > 40.5:
                                failures.append(f"{label}@{viewport_name}: logo height {logo['height']:.1f}px > 40px ({logo['src']})")
                        if metrics["headers"] != 1:
                            failures.append(f"{label}@{viewport_name}: visible top-level header count {metrics['headers']}")
                        if metrics["navs"] != 1:
                            failures.append(f"{label}@{viewport_name}: header nav count {metrics['navs']}")
                        if metrics["searches"] > 1:
                            failures.append(f"{label}@{viewport_name}: header search count {metrics['searches']}")
                        if metrics["footers"] != 1:
                            failures.append(f"{label}@{viewport_name}: visible footer count {metrics['footers']}")
                    if metrics["scrollWidth"] > metrics["clientWidth"] + 6:
                        finding = f"{label}@{viewport_name}: horizontal overflow {metrics['scrollWidth']} > {metrics['clientWidth']}"
                        (warnings if preview else failures).append(finding)
                    if rel == ARTICLE_HUB:
                        article_cards = len(metrics["articleLinks"])
                        article_count_text = bool(re.search(r"\b100\s+articles\b", page.locator("body").inner_text(), re.I))
                except Exception as exc:
                    failures.append(f"{label}@{viewport_name}: browser exception: {exc}")
                finally:
                    page.close()
        browser.close()
    if live and article_cards < 100:
        failures.append(f"live articles.html: {article_cards} unique article cards, expected 100")
    if live and not article_count_text:
        failures.append("live articles.html: missing visible '100 articles' count")
    return {"checked_viewports":checked,"failures":failures,"warnings":warnings,"max_logo_height":round(max_logo_height,2),"article_cards":article_cards,"article_count_text":article_count_text}


def main() -> int:
    argp = argparse.ArgumentParser()
    argp.add_argument("--base-url", default=DEFAULT_BASE)
    argp.add_argument("--live", action="store_true")
    args = argp.parse_args()
    files = html_files()
    if not files:
        print("FAIL: no HTML files found", file=sys.stderr)
        return 1
    static_findings: list[str] = []
    preview_paths: set[str] = set()
    for path in files:
        parsed, findings = static_validate(path)
        static_findings.extend(findings)
        if is_standalone_preview(parsed, path):
            preview_paths.add(path.relative_to(ROOT).as_posix())
    if args.live:
        urls = [(urlparse(url).path.lstrip("/") or "index.html", url) for url in live_sitemap_urls(args.base_url)]
        article_hub_url = args.base_url.rstrip("/") + "/articles.html"
        if not any(label == ARTICLE_HUB for label, _ in urls):
            urls.append((ARTICLE_HUB, article_hub_url))
        urls = sorted(dict(urls).items())
    else:
        urls = [(p.relative_to(ROOT).as_posix(), p.relative_to(ROOT).as_posix()) for p in files]
    browser_report = validate_browser(args.base_url, urls, args.live, preview_paths if not args.live else set())
    report = {"mode":"live" if args.live else "local","base_url":args.base_url,"html_files_scanned":len(files),"static_findings":static_findings,"preview_files":sorted(preview_paths),**browser_report}
    artifact = ROOT / "quality-artifacts" / "all-html-layout-validation.json"
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"HTML_LAYOUT_SCAN files={len(files)} viewports={browser_report['checked_viewports']} max_logo_height={browser_report['max_logo_height']} article_cards={browser_report['article_cards']}")
    for item in static_findings[:80]: print("FAIL_STATIC", item)
    for item in browser_report["warnings"][:80]: print("WARN_BROWSER", item)
    for item in browser_report["failures"][:120]: print("FAIL_BROWSER", item)
    if static_findings or browser_report["failures"]:
        print(f"HTML_LAYOUT_FAIL static={len(static_findings)} browser={len(browser_report['failures'])} warnings={len(browser_report['warnings'])}")
        return 1
    print(f"HTML_LAYOUT_PASS files={len(files)} viewports={browser_report['checked_viewports']} max_logo_height={browser_report['max_logo_height']} article_cards={browser_report['article_cards']} warnings={len(browser_report['warnings'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
