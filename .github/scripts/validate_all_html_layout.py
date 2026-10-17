#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
import sys
import time
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
        self.tags: list[str] = []
        self.headers = 0
        self.footers = 0
        self.header_navs = 0
        self.header_searches = 0
        self.logo_images = 0
        self.article_links = 0
        self.robots = ""
        self.current_header_depth = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        self.tags.append(tag.lower())
        if tag.lower() == "header":
            self.headers += 1
            self.current_header_depth += 1
        elif tag.lower() == "footer":
            self.footers += 1
        elif tag.lower() == "nav" and self.current_header_depth:
            self.header_navs += 1
        elif self.current_header_depth and tag.lower() == "input" and attrs_dict.get("type", "").lower() == "search":
            self.header_searches += 1
        elif self.current_header_depth and tag.lower() == "form" and attrs_dict.get("role", "").lower() == "search":
            self.header_searches += 1
        if tag.lower() == "img":
            classes = set(attrs_dict.get("class", "").split())
            ident = f"{attrs_dict.get('id', '')} {attrs_dict.get('alt', '')}".lower()
            if classes & {"site-logo", "nav-logo", "nn-brand-logo-img", "nn-footer-brand-logo"} or "logo" in ident:
                self.logo_images += 1
        if tag.lower() == "a":
            href = attrs_dict.get("href", "")
            if re.search(r"(?:^|/)articles/[^/?#]+\.html(?:[?#].*)?$", href, re.I):
                self.article_links += 1
        if tag.lower() == "meta" and attrs_dict.get("name", "").lower() == "robots":
            self.robots = attrs_dict.get("content", "")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "header" and self.current_header_depth:
            self.current_header_depth -= 1
        if self.tags:
            self.tags.pop()


def html_files() -> list[Path]:
    paths: list[Path] = []
    paths.extend(sorted(ROOT.glob("*.html")))
    for folder in PUBLIC_FOLDERS:
        base = ROOT / folder
        if base.exists():
            paths.extend(sorted(base.rglob("*.html")))
    return sorted(set(paths))


def is_standalone_preview(parser: StructureParser, path: Path) -> bool:
    # Repository previews are deliberately standalone/noindex artifacts. They are
    # still scanned, but are not allowed to redefine the production shell contract.
    rel = path.relative_to(ROOT).as_posix()
    return "noindex" in parser.robots.lower() or rel.startswith(("homepage-", "humanproof-"))


def static_validate(path: Path) -> tuple[StructureParser, list[str]]:
    parser = StructureParser()
    text = path.read_text(encoding="utf-8", errors="replace")
    parser.feed(text)
    findings: list[str] = []
    rel = path.relative_to(ROOT).as_posix()
    preview = is_standalone_preview(parser, path)
    if not preview:
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
    sitemap = base_url.rstrip("/") + "/sitemap.xml"
    with urllib.request.urlopen(sitemap, timeout=20) as response:
        text = response.read().decode("utf-8", errors="replace")
    return sorted(dict.fromkeys(re.findall(r"<loc>(.*?)</loc>", text)))


def page_metrics(page, rel: str) -> dict:
    return page.evaluate(
        """
        () => {
          const visible = el => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity || 1) > 0.01;
          };
          const headers = [...document.querySelectorAll('header')].filter(visible);
          const header = headers[0] || null;
          const navs = header ? [...header.querySelectorAll('nav')].filter(visible) : [];
          const searches = header ? [...header.querySelectorAll('input[type="search"],form[role="search"] input')].filter(visible) : [];
          const logos = header ? [...header.querySelectorAll('img')].filter(visible).map(img => ({height: img.getBoundingClientRect().height, width: img.getBoundingClientRect().width, src: img.currentSrc || img.src})) : [];
          const articleLinks = [...document.querySelectorAll('a[href]')].map(a => new URL(a.getAttribute('href'), location.href).pathname).filter(p => /\/articles\/[^/]+\.html$/i.test(p));
          const footer = [...document.querySelectorAll('footer,[role="contentinfo"]')].filter(visible);
          return {
            headers: headers.length,
            navs: navs.length,
            searches: searches.length,
            logos,
            footers: footer.length,
            articleLinks: [...new Set(articleLinks)],
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            h1: document.querySelectorAll('h1').length,
            bodyClass: document.body.className
          };
        }
        """
    )


def validate_browser(base_url: str, urls: list[tuple[str, str]], live: bool) -> dict:
    failures: list[str] = []
    checked = 0
    article_cards = 0
    article_count_text = False
    max_logo_height = 0.0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for label, rel in urls:
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
                    metrics = page_metrics(page, rel)
                    checked += 1
                    for logo in metrics["logos"]:
                        max_logo_height = max(max_logo_height, float(logo["height"]))
                        if logo["height"] > 40.5:
                            failures.append(f"{label}@{viewport_name}: logo height {logo['height']:.1f}px > 40px ({logo['src']})")
                    if not rel.endswith("/index.html") and rel not in {"index.html", "app.html"} and "homepage-" not in rel and "humanproof-" not in rel:
                        if metrics["headers"] != 1:
                            failures.append(f"{label}@{viewport_name}: visible header count {metrics['headers']}")
                        if metrics["navs"] != 1:
                            failures.append(f"{label}@{viewport_name}: visible header nav count {metrics['navs']}")
                        if metrics["searches"] > 1:
                            failures.append(f"{label}@{viewport_name}: visible header search count {metrics['searches']}")
                        if metrics["footers"] != 1:
                            failures.append(f"{label}@{viewport_name}: visible footer count {metrics['footers']}")
                    if metrics["scrollWidth"] > metrics["clientWidth"] + 6:
                        failures.append(f"{label}@{viewport_name}: horizontal overflow {metrics['scrollWidth']} > {metrics['clientWidth']}")
                    if rel == ARTICLE_HUB:
                        article_cards = len(metrics["articleLinks"])
                        article_count_text = bool(re.search(r"\b100\s+articles\b", page.locator("body").inner_text(), re.I))
                except Exception as exc:
                    failures.append(f"{label}@{viewport_name}: browser exception: {exc}")
                finally:
                    page.close()
        browser.close()
    if live and article_cards and article_cards < 100:
        failures.append(f"live articles.html: {article_cards} unique article cards, expected 100")
    if live and not article_count_text:
        failures.append("live articles.html: missing visible '100 articles' count")
    return {
        "checked_viewports": checked,
        "failures": failures,
        "max_logo_height": round(max_logo_height, 2),
        "article_cards": article_cards,
        "article_count_text": article_count_text,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default=DEFAULT_BASE)
    parser.add_argument("--live", action="store_true")
    args = parser.parse_args()

    static_findings: list[str] = []
    files = html_files()
    if not files:
        print("FAIL: no HTML files found", file=sys.stderr)
        return 1
    for path in files:
        _, findings = static_validate(path)
        static_findings.extend(findings)

    if args.live:
        live_urls = live_sitemap_urls(args.base_url)
        urls = []
        for url in live_urls:
            parsed = urlparse(url)
            urls.append((parsed.path.lstrip("/") or "index.html", url))
    else:
        urls = [(p.relative_to(ROOT).as_posix(), p.relative_to(ROOT).as_posix()) for p in files]

    browser_report = validate_browser(args.base_url, urls, args.live)
    report = {
        "mode": "live" if args.live else "local",
        "base_url": args.base_url,
        "html_files_scanned": len(files),
        "static_findings": static_findings,
        **browser_report,
    }
    artifact = ROOT / "quality-artifacts" / "all-html-layout-validation.json"
    artifact.parent.mkdir(parents=True, exist_ok=True)
    artifact.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"HTML_LAYOUT_SCAN files={len(files)} viewports={browser_report['checked_viewports']} max_logo_height={browser_report['max_logo_height']} article_cards={browser_report['article_cards']}")
    if static_findings:
        for item in static_findings[:80]:
            print("FAIL_STATIC", item)
    if browser_report["failures"]:
        for item in browser_report["failures"][:120]:
            print("FAIL_BROWSER", item)
    if static_findings or browser_report["failures"]:
        print(f"HTML_LAYOUT_FAIL static={len(static_findings)} browser={len(browser_report['failures'])}")
        return 1
    print(f"HTML_LAYOUT_PASS files={len(files)} viewports={browser_report['checked_viewports']} max_logo_height={browser_report['max_logo_height']} article_cards={browser_report['article_cards']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
