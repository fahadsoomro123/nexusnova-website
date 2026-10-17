from __future__ import annotations

import concurrent.futures
import json
import re
import struct
import time
import urllib.error
import urllib.parse
import urllib.request
import zlib
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path.cwd()
BASE = "http://127.0.0.1:8000"
PRODUCTION = "https://nexusnovatools.com"
ARTIFACT = ROOT / "quality-artifacts" / "sitewide-visual-logic-audit.json"
SCREENSHOT_DIR = ROOT / "quality-artifacts" / "sitewide-screenshots"
TOOL_PATTERN = re.compile(r'\{\s*title:"(?:[^"\\]|\\.)*",\s*url:"([^"]+)",\s*type:"tool"')
SITEMAP_NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
VIEWPORTS = [("mobile", 390, 844), ("desktop", 1440, 1000)]
SCHEMES = ["light", "dark"]

METRICS_JS = r"""
() => {
  const visible = el => {
    if (!(el instanceof Element)) return false;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && s.display !== 'none' &&
      s.visibility !== 'hidden' && Number(s.opacity || 1) > 0.05;
  };
  const selectors = {
    header: '[data-header], [data-nn-header], header.site-header, header.nn-header, header',
    nav: '[data-nav], [data-nn-nav], header nav, header [role="navigation"], .nn-nav',
    footer: 'footer',
    search: 'header input[type="search"], header [role="search"] input, form[role="search"] input, input[type="search"], [data-site-search], [data-search-trigger], button[aria-label*="search" i], button[class*="search" i]',
    categories: 'header nav a, header [role="navigation"] a, .nn-nav a, [data-category-nav] a',
    breadcrumb: 'nav[aria-label*="breadcrumb" i], .breadcrumb, [itemtype*="BreadcrumbList"]'
  };
  const exists = selector => [...document.querySelectorAll(selector)].some(visible);
  const present = selector => !!document.querySelector(selector);
  const typo = ['body', 'h1', 'p', 'button', 'input'].map(selector => {
    const el = document.querySelector(selector);
    if (!el || !visible(el)) return {selector, present: false};
    const s = getComputedStyle(el);
    return {
      selector, present: true, family: s.fontFamily.trim(),
      fontSize: parseFloat(s.fontSize) || 0,
      lineHeight: s.lineHeight === 'normal' ? null : (parseFloat(s.lineHeight) || 0),
      weight: s.fontWeight
    };
  });
  const brokenImages = [...document.images].filter(el =>
    visible(el) && el.complete && el.naturalWidth === 0 &&
    !/^(data:|blob:)/i.test(el.currentSrc || el.src || '')
  ).map(el => el.currentSrc || el.src).slice(0, 10);
  const clipped = [];
  for (const el of document.querySelectorAll('h1, h2, button, input, select, textarea, label')) {
    if (!visible(el)) continue;
    const s = getComputedStyle(el);
    // Tiny labels are commonly intentional screen-reader-only accessibility labels.
    if (el.tagName === 'LABEL' && el.clientWidth <= 2 && el.scrollWidth > el.clientWidth + 3) continue;
    if (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.textOverflow === 'ellipsis') {
      if (el.scrollWidth > el.clientWidth + 3 || el.scrollHeight > el.clientHeight + 3) {
        clipped.push({
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 90),
          width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight, scrollHeight: el.scrollHeight
        });
      }
    }
  }
  const allControls = [...document.querySelectorAll('input:not([type="hidden"]), textarea, select, button, [role="button"]')].filter(visible);
  const blockedControls = allControls.filter(el => !el.disabled && getComputedStyle(el).pointerEvents === "none")
    .map(el => ({text:(el.innerText || el.value || el.getAttribute("aria-label") || "").trim().slice(0,70),reason:"pointer-events:none"})).slice(0,8);
  const rgba = text => {
    const m = String(text).match(/rgba?\(([^)]+)\)/i);
    if (!m) return null;
    const parts = m[1].match(/[\d.]+%?/g);
    if (!parts || parts.length < 3) return null;
    const channel = v => v.endsWith('%') ? Math.max(0, Math.min(255, parseFloat(v) * 2.55)) : Math.max(0, Math.min(255, parseFloat(v)));
    return [channel(parts[0]), channel(parts[1]), channel(parts[2]), parts.length > 3 ? Math.max(0, Math.min(1, parseFloat(parts[3]))) : 1];
  };
  const luminance = c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const ratio = (a, b) => {
    const la = 0.2126*luminance(a[0]) + 0.7152*luminance(a[1]) + 0.0722*luminance(a[2]);
    const lb = 0.2126*luminance(b[0]) + 0.7152*luminance(b[1]) + 0.0722*luminance(b[2]);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const blend = (fg, bg) => [
    fg[0]*fg[3] + bg[0]*(1-fg[3]),
    fg[1]*fg[3] + bg[1]*(1-fg[3]),
    fg[2]*fg[3] + bg[2]*(1-fg[3]), 1
  ];
  const contrastIssues = [];
  let contrastChecked = 0;
  const candidates = [...document.querySelectorAll('h1,h2,h3,p,a,button,label,li,small,summary,th,td,figcaption')];
  for (const el of candidates) {
    if (!visible(el)) continue;
    const text = (el.innerText || el.value || '').trim();
    if (!text || text.length > 220) continue;
    let ancestor = el, opacity = 1, background = [255,255,255,1], skip = false;
    const chain = [];
    while (ancestor && ancestor instanceof Element) { chain.push(ancestor); ancestor = ancestor.parentElement; }
    chain.reverse();
    for (const node of chain) {
      const st = getComputedStyle(node);
      opacity *= Number(st.opacity || 1);
      if (st.backgroundImage && st.backgroundImage !== 'none') { skip = true; break; }
      const bg = rgba(st.backgroundColor);
      if (bg && bg[3] > 0) background = blend(bg, background);
    }
    if (skip || opacity < 0.72) continue;
    const fg = rgba(getComputedStyle(el).color);
    if (!fg || fg[3] < 0.72) continue;
    const effective = blend([fg[0], fg[1], fg[2], fg[3]*opacity], background);
    const contrast = ratio(effective, background);
    const st = getComputedStyle(el), fs = parseFloat(st.fontSize) || 16;
    const fw = parseInt(st.fontWeight, 10) || (st.fontWeight === 'bold' ? 700 : 400);
    const required = fs >= 24 || (fs >= 18.66 && fw >= 700) ? 3 : 4.5;
    contrastChecked++;
    if (contrast + 0.02 < required) {
      contrastIssues.push({
        tag: el.tagName.toLowerCase(), text: text.slice(0, 72),
        ratio: Math.round(contrast*100)/100, required,
        color: st.color,
        background: "rgb(" + Math.round(background[0]) + ", " + Math.round(background[1]) + ", " + Math.round(background[2]) + ")"
      });
    }
  }
  return {
    title: document.title.trim(),
    h1: document.querySelectorAll('h1').length,
    sw: document.documentElement.scrollWidth,
    cw: document.documentElement.clientWidth,
    header: exists(selectors.header),
    nav: present(selectors.nav),
    navVisible: exists(selectors.nav),
    menuButton: present('[data-nn-menu], [data-menu-btn], button.nn-menu, button.menu-btn'),
    menuButtonVisible: exists('[data-nn-menu], [data-menu-btn], button.nn-menu, button.menu-btn'),
    footer: exists(selectors.footer),
    search: exists(selectors.search),
    categories: present(selectors.categories),
    breadcrumb: exists(selectors.breadcrumb),
    fontStatus: document.fonts ? document.fonts.status : 'unsupported',
    typography: typo, brokenImages, clipped: clipped.slice(0, 8),
    blockedControls: blockedControls.slice(0, 8), controlCount: allControls.length,
    inputCount: [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')].filter(visible).length,
    contrastChecked, contrastIssues: contrastIssues.slice(0, 8),
    outputTexts: [...document.querySelectorAll('output, [aria-live], [id*="result" i], [class*="result" i], [id*="output" i], [class*="output" i], [data-result]')]
      .filter(el => visible(el) && !['INPUT','TEXTAREA','SCRIPT','STYLE'].includes(el.tagName))
      .map(el => (el.innerText || el.textContent || '').trim().slice(0, 400)).filter(Boolean).slice(0, 20)
  };
}
"""

INTERACT_JS = r"""
() => {
  const visible = el => {
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && s.display !== 'none' &&
      s.visibility !== 'hidden' && !el.closest('header, nav, footer, form[role="search"]');
  };
  const fields = [...document.querySelectorAll('input:not([type="hidden"]), textarea, select')]
    .filter(el => visible(el) && !['button','submit','reset','image','file','checkbox','radio'].includes((el.type || '').toLowerCase()));
  let filled = 0;
  for (const el of fields) {
    const tag = el.tagName.toLowerCase(), type = (el.type || '').toLowerCase();
    if (tag === 'select') {
      const choice = [...el.options].find(o => !o.disabled && String(o.value).trim() !== '');
      if (choice) { el.value = choice.value; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); filled++; }
      continue;
    }
    if (type === 'range') {
      const min = el.min !== '' ? Number(el.min) : 0, max = el.max !== '' ? Number(el.max) : 100;
      el.value = String(min + (max-min)/2);
    } else if (type === 'number') {
      const min = el.min !== '' ? Number(el.min) : 1, max = el.max !== '' ? Number(el.max) : Math.max(100, min+10);
      el.value = String(Math.min(max, Math.max(min, min >= 0 ? (min === 0 ? 1 : min) : 1)));
    } else if (type === 'email') el.value = 'audit@example.com';
    else if (type === 'url') el.value = 'https://example.com/';
    else if (type === 'date') el.value = '2026-10-17';
    else if (type === 'time') el.value = '12:00';
    else if (type === 'color') el.value = '#445566';
    else el.value = '42';
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    filled++;
  }
  return {filled};
}
"""

OUTPUT_CHECK_JS = r"""
() => {
  const nodes = [...document.querySelectorAll('output, [aria-live], [id*="result" i], [class*="result" i], [id*="output" i], [class*="output" i], [data-result]')]
    .filter(el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' &&
        !['INPUT','TEXTAREA','SCRIPT','STYLE'].includes(el.tagName);
    });
  const text = nodes.map(el => (el.innerText || el.textContent || '').trim()).join('\n');
  const bad = [];
  for (const token of ['NaN', 'undefined', 'Infinity']) {
    if (new RegExp('(^|[^\\\\w])' + token + '([^\\\\w]|$)', 'i').test(text)) bad.push(token);
  }
  return {bad, outputs: nodes.length, preview: text.slice(0, 700)};
}
"""

def load_routes() -> tuple[list[str], list[str]]:
    core = (ROOT / "assets/js/search-core.js").read_text(encoding="utf-8")
    tools = TOOL_PATTERN.findall(core)
    if len(tools) != 108 or len(set(tools)) != 108:
        raise SystemExit(f"ROUTE_INVENTORY_FAIL expected 108 unique tool paths, found {len(tools)} records/{len(set(tools))} unique")
    missing_tools = [path for path in tools if not (ROOT / path.split("?", 1)[0].split("#", 1)[0]).is_file()]
    if missing_tools:
        raise SystemExit("TOOL_SOURCE_MISSING: " + ", ".join(missing_tools[:30]))
    root = ET.fromstring((ROOT / "sitemap.xml").read_text(encoding="utf-8"))
    urls = [
        (node.find("s:loc", SITEMAP_NS).text or "").strip()
        for node in root.findall("s:url", SITEMAP_NS)
        if node.find("s:loc", SITEMAP_NS) is not None and node.find("s:loc", SITEMAP_NS).text
    ]
    articles = sorted({
        urllib.parse.urlparse(url).path.lstrip("/")
        for url in urls
        if urllib.parse.urlparse(url).netloc == "nexusnovatools.com"
        and urllib.parse.urlparse(url).path.startswith("/articles/")
        and urllib.parse.urlparse(url).path.endswith(".html")
    })
    if len(articles) != 100:
        raise SystemExit(f"ARTICLE_INVENTORY_FAIL expected 100 article URLs in sitemap, found {len(articles)}")
    missing_articles = [path for path in articles if not (ROOT / path).is_file()]
    if missing_articles:
        raise SystemExit("ARTICLE_SOURCE_MISSING: " + ", ".join(missing_articles[:30]))
    return tools, articles


def png_fixture() -> bytes:
    def chunk(kind: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"\x00\x44\x88\xcc\xff")) + chunk(b"IEND", b"")


def pdf_fixture() -> bytes:
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length 39 >>\nstream\nBT /F1 12 Tf 20 90 Td (Audit fixture 42) Tj ET\nendstream",
    ]
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode())
        out.extend(obj + b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects)+1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode())
    out.extend(f"trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode())
    return bytes(out)


PNG = png_fixture()
PDF = pdf_fixture()
TEXT_FIXTURE = b"Audit fixture,42\nExample,1\n"


def attach_fixtures(page) -> int:
    count = 0
    for locator in page.locator('input[type="file"]').all():
        try:
            # Hidden file inputs may be activated by a visible upload button or label.
            accept = (locator.get_attribute("accept") or "").lower()
            if ".pdf" in accept or "application/pdf" in accept:
                payload, filename, mime = PDF, "audit-fixture.pdf", "application/pdf"
            elif ".csv" in accept or "text/csv" in accept:
                payload, filename, mime = b"name,value\nAudit,42\n", "audit-fixture.csv", "text/csv"
            elif ".txt" in accept or "text/plain" in accept:
                payload, filename, mime = TEXT_FIXTURE, "audit-fixture.txt", "text/plain"
            else:
                payload, filename, mime = PNG, "audit-fixture.png", "image/png"
            locator.set_input_files({"name": filename, "mimeType": mime, "buffer": payload}, timeout=1200)
            count += 1
        except Exception:
            continue
    return count


def action_buttons(page) -> list[tuple[str, str]]:
    candidates = page.evaluate(r"""
    () => {
      const visible = el => {
        const s=getComputedStyle(el), r=el.getBoundingClientRect();
        return r.width>0 && r.height>0 && s.display!=='none' && s.visibility!=='hidden' &&
          !el.closest('header,nav,footer,form[role="search"]');
      };
      const rx=/\b(calculate|convert|compute|generate|estimate|analy[sz]e|format|encode|decode|resize|compress|compare|extract|merge|split|validate|solve|count|run|apply|check|process|create|clean|inspect)\b/i;
      const skip=/\b(download|copy|share|login|sign in|pay|purchase|delete|erase|logout|sign out|open website|external)\b/i;
      const result=[];
      [...document.querySelectorAll('button,input[type="button"],input[type="submit"],[role="button"]')].forEach(el=>{
        if (!visible(el) || el.disabled) return;
        const text=(el.innerText||el.value||el.getAttribute('aria-label')||'').trim();
        if (!rx.test(text) || skip.test(text)) return;
        const form=el.closest('form');
        if(form && /^https?:/i.test(form.getAttribute('action')||'')) return;
        el.setAttribute('data-polish-audit-action', String(result.length));
        result.push({selector:'[data-polish-audit-action="' + result.length + '"]', text});
      });
      return result;
    }
    """)
    return [(row["selector"], row["text"]) for row in candidates]


def live_route_check(paths: list[str], commit: str) -> dict:
    def check(path: str) -> dict:
        url = f"{PRODUCTION}/{urllib.parse.quote(path, safe='/')}?visual_logic_audit={commit}"
        request = urllib.request.Request(url, headers={
            "User-Agent": "NexusNova-SitewideVisualLogicAudit/1.0",
            "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache",
        })
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                sample = response.read(512)
                return {"path": path, "status": response.status, "bytes_sampled": len(sample)}
        except urllib.error.HTTPError as exc:
            return {"path": path, "status": exc.code, "error": "HTTPError"}
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            return {"path": path, "status": 0, "error": type(exc).__name__}
    results = []
    for attempt in range(1, 4):
        with concurrent.futures.ThreadPoolExecutor(max_workers=24) as pool:
            results = list(pool.map(check, paths))
        failed = [row for row in results if row["status"] != 200]
        if not failed:
            break
        print(f"LIVE_ROUTE_WAIT attempt={attempt}/3 failed={len(failed)} of {len(paths)}")
        if attempt < 3:
            time.sleep(5)
    failures = [row for row in results if row["status"] != 200]
    return {"checked": len(results), "passed": len(results)-len(failures), "failed": failures}


def main() -> None:
    import os
    tools, articles = load_routes()
    routes = [("tool", path) for path in tools] + [("article", path) for path in articles]
    commit = os.environ.get("GITHUB_SHA", "local")
    errors: list[dict] = []
    warnings: list[dict] = []
    render_count = interacted_tools = fields_tested = buttons_tested = files_attached = 0
    contrast_samples = contrast_findings = screenshots = 0
    console_errors = Counter()
    SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
    ARTIFACT.parent.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for kind, path in routes:
            route_errors: list[str] = []
            route_warnings: list[str] = []
            for scheme in SCHEMES:
                for mode, width, height in VIEWPORTS:
                    page = browser.new_page(viewport={"width":width,"height":height}, color_scheme=scheme, reduced_motion="reduce")
                    page.set_default_timeout(2500)
                    page_errors: list[str] = []
                    local_console: list[str] = []
                    local_request_failures: list[str] = []
                    page.on("dialog", lambda dialog: dialog.dismiss())
                    page.on("pageerror", lambda exc: page_errors.append(str(exc)[:240]))
                    page.on("console", lambda msg: local_console.append(msg.text[:240]) if msg.type == "error" and "report-only Content Security Policy" not in msg.text else None)
                    page.on("requestfailed", lambda req: local_request_failures.append(req.url[:240]) if urllib.parse.urlparse(req.url).netloc in {"127.0.0.1","localhost"} else None)
                    route_url = f"{BASE}/{urllib.parse.quote(path, safe='/')}"
                    try:
                        response = page.goto(route_url, wait_until="domcontentloaded", timeout=16000)
                        if not response or response.status != 200:
                            route_errors.append(f"{mode}/{scheme}: HTTP {response.status if response else 0}")
                            page.close()
                            continue
                        try:
                            page.evaluate("() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1800))])")
                        except Exception:
                            pass
                        page.wait_for_timeout(60)
                        metrics = page.evaluate(METRICS_JS)
                        render_count += 1
                        contrast_samples += int(metrics["contrastChecked"])
                        contrast_findings += len(metrics["contrastIssues"])

                        if not metrics["title"]:
                            route_errors.append(f"{mode}/{scheme}: document title missing")
                        if metrics["h1"] != 1:
                            route_errors.append(f"{mode}/{scheme}: expected one H1, found {metrics['h1']}")
                        if metrics["sw"] > metrics["cw"] + 6:
                            route_errors.append(f"{mode}/{scheme}: horizontal overflow {metrics['sw']}/{metrics['cw']}")
                        if not metrics["header"]:
                            route_errors.append(f"{mode}/{scheme}: shared header missing")
                        if not metrics["nav"]:
                            route_errors.append(f"{mode}/{scheme}: shared navigation element missing")
                        if mode == "mobile" and metrics["nav"] and not metrics["navVisible"]:
                            if not metrics["menuButtonVisible"]:
                                route_errors.append(f"{mode}/{scheme}: mobile navigation collapsed without a visible menu button")
                            elif scheme == "light":
                                try:
                                    menu_button = page.locator('[data-nn-menu], [data-menu-btn], button.nn-menu, button.menu-btn').first
                                    menu_button.click(timeout=1600)
                                    page.wait_for_timeout(80)
                                    nav_open = page.evaluate("""() => {
                                      const nav = document.querySelector('[data-nav], [data-nn-nav], header nav, header [role="navigation"], .nn-nav');
                                      if (!nav) return false;
                                      const style = getComputedStyle(nav);
                                      return style.display !== 'none' && style.visibility !== 'hidden' && nav.getClientRects().length > 0;
                                    }""")
                                    if not nav_open:
                                        route_errors.append(f"{mode}/{scheme}: menu button did not reveal navigation")
                                    else:
                                        menu_button.click(timeout=1600)
                                        page.wait_for_timeout(40)
                                except Exception as exc:
                                    route_errors.append(f"{mode}/{scheme}: mobile menu toggle failed: {str(exc)[:160]}")
                        if not metrics["footer"]:
                            route_errors.append(f"{mode}/{scheme}: footer missing")
                        if not metrics["search"]:
                            route_warnings.append(f"{mode}/{scheme}: global search affordance not detected")
                        if not metrics["categories"]:
                            route_warnings.append(f"{mode}/{scheme}: category/navigation link elements missing")
                        if metrics["fontStatus"] != "loaded":
                            route_errors.append(f"{mode}/{scheme}: document fonts status is {metrics['fontStatus']}")
                        for typo in metrics["typography"]:
                            if not typo["present"]:
                                if typo["selector"] in {"body","h1"}:
                                    route_errors.append(f"{mode}/{scheme}: required typography target missing: {typo['selector']}")
                                continue
                            if not typo["family"] or typo["family"].lower() in {"initial","unset","revert"}:
                                route_errors.append(f"{mode}/{scheme}: invalid {typo['selector']} font-family")
                            fs, lh = typo["fontSize"], typo["lineHeight"]
                            if lh is not None and fs > 0 and (lh < fs*0.82 or lh > fs*3.25):
                                route_errors.append(f"{mode}/{scheme}: abnormal {typo['selector']} line-height {lh:g}px for {fs:g}px font")
                        if metrics["brokenImages"]:
                            route_errors.append(f"{mode}/{scheme}: broken visible images {metrics['brokenImages'][:3]}")
                        if metrics["clipped"]:
                            route_errors.append(f"{mode}/{scheme}: clipped visible UI text {metrics['clipped'][:3]}")
                        if metrics["blockedControls"]:
                            route_errors.append(f"{mode}/{scheme}: blocked controls {metrics['blockedControls'][:3]}")
                        if page_errors:
                            route_errors.extend(f"{mode}/{scheme}: JS exception {message}" for message in page_errors[:3])
                        for message in local_console:
                            console_errors[message] += 1
                        if local_request_failures:
                            route_errors.extend(f"{mode}/{scheme}: local resource failed {url}" for url in local_request_failures[:3])
                        if metrics["contrastIssues"]:
                            route_warnings.append(
                                f"{mode}/{scheme}: {len(metrics['contrastIssues'])} visible-text contrast issue(s), "
                                f"checked={metrics['contrastChecked']}, examples={metrics['contrastIssues'][:2]}"
                            )

                        if kind == "tool" and mode == "mobile" and scheme == "light":
                            files_attached += attach_fixtures(page)
                            fill_result = page.evaluate(INTERACT_JS)
                            fields_tested += int(fill_result.get("filled",0))
                            for selector, text in action_buttons(page):
                                try:
                                    page.locator(selector).click(timeout=1800, no_wait_after=True)
                                    buttons_tested += 1
                                    page.wait_for_timeout(70)
                                    output_check = page.evaluate(OUTPUT_CHECK_JS)
                                    if output_check["bad"]:
                                        route_errors.append(
                                            f"mobile/light: {text!r} produced invalid output {output_check['bad']} "
                                            f"in output container: {output_check['preview'][:180]!r}"
                                        )
                                except Exception as exc:
                                    route_errors.append(f"mobile/light: action {text!r} not clickable: {str(exc)[:180]}")
                            resets = page.evaluate(r"""
                            () => [...document.querySelectorAll('button,input[type="button"],[role="button"]')]
                              .filter(el => {
                                const s=getComputedStyle(el), r=el.getBoundingClientRect();
                                if(el.disabled||r.width<=0||r.height<=0||s.display==='none'||s.visibility==='hidden')return false;
                                if(el.closest('header,nav,footer,form[role="search"]'))return false;
                                return /\b(reset|clear inputs|clear fields|start over)\b/i.test((el.innerText||el.value||el.getAttribute('aria-label')||'').trim());
                              }).slice(0,1).map(el => {el.setAttribute('data-polish-audit-reset','1');return '[data-polish-audit-reset="1"]';})
                            """)
                            for reset_selector in resets:
                                try:
                                    page.locator(reset_selector).click(timeout=1500,no_wait_after=True)
                                    buttons_tested += 1
                                    page.wait_for_timeout(50)
                                    output_check = page.evaluate(OUTPUT_CHECK_JS)
                                    if output_check["bad"]:
                                        route_errors.append(f"mobile/light: reset produced invalid output {output_check['bad']}")
                                except Exception as exc:
                                    route_errors.append(f"mobile/light: reset control not clickable: {str(exc)[:160]}")
                            interacted_tools += 1
                        if route_errors and screenshots < 20:
                            try:
                                safe = re.sub(r"[^a-zA-Z0-9_-]+","-",path.replace("/","-")).strip("-")[:95]
                                page.screenshot(path=str(SCREENSHOT_DIR / f"{safe}-{mode}-{scheme}.png"),full_page=False,timeout=2500)
                                screenshots += 1
                            except Exception:
                                pass
                    except Exception as exc:
                        route_errors.append(f"{mode}/{scheme}: browser audit failed: {str(exc)[:240]}")
                    finally:
                        try: page.close()
                        except Exception: pass
            if route_errors:
                errors.append({"type":kind,"path":path,"findings":route_errors[:20]})
            if route_warnings:
                warnings.append({"type":kind,"path":path,"findings":route_warnings[:20]})
            done = len(errors) + len(warnings)
            if done and done % 25 == 0:
                print(f"AUDIT_PROGRESS rendered={render_count}/{len(routes)*4} errors={len(errors)} warning_pages={len(warnings)}")
        browser.close()

    live = live_route_check(tools + articles, commit)
    if live["failed"]:
        errors.append({
            "type":"production", "path":"all-routes",
            "findings":[f"{row['path']}: HTTP {row['status']} ({row.get('error','')})" for row in live["failed"][:80]],
        })
    report = {
        "commit":commit,
        "inventory":{"tools":len(tools),"articles":len(articles),"unique_routes":len(set(tools+articles))},
        "render_matrix":{"rendered_pages":render_count,"expected_renders":len(routes)*4,"viewports":[{"mode":m,"width":w,"height":h} for m,w,h in VIEWPORTS],"color_schemes":SCHEMES},
        "interactions":{"tool_pages_interacted":interacted_tools,"fields_tested":fields_tested,"action_buttons_clicked":buttons_tested,"local_file_fixtures_attached":files_attached},
        "typography_contrast":{"text_samples_checked":contrast_samples,"contrast_failure_samples":contrast_findings},
        "production_http":live,"errors":errors,"warnings":warnings,
        "console_error_messages":console_errors.most_common(30),"screenshots_saved":screenshots,
    }
    ARTIFACT.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    print(
        "SITEWIDE_VISUAL_LOGIC_AUDIT "
        f"tools={len(tools)} articles={len(articles)} renders={render_count}/{len(routes)*4} "
        f"tool_pages_interacted={interacted_tools} fields_tested={fields_tested} "
        f"action_buttons_clicked={buttons_tested} local_files_attached={files_attached} "
        f"contrast_samples={contrast_samples} contrast_failures={contrast_findings} "
        f"live_http_pass={live['passed']}/{live['checked']} errors={len(errors)} warning_pages={len(warnings)}"
    )
    print(f"AUDIT_ARTIFACT {ARTIFACT}")
    for item in errors[:100]:
        print(f"ERROR {item['type']} {item['path']}: " + " | ".join(item["findings"][:5]))
    for item in warnings[:100]:
        print(f"WARN {item['type']} {item['path']}: " + " | ".join(item["findings"][:3]))
    if errors or warnings:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
