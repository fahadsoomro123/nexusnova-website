from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "quality-artifacts"
OUT.mkdir(exist_ok=True)
PAGES = [
    ("home", "index.html"),
    ("tools", "tools.html"),
    ("trending", "trending-tools.html"),
    ("articles", "articles.html"),
    ("tech", "tech.html"),
    ("account", "register.html"),
    ("resume", "resume-builder.html"),
]
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "mobile": {"width": 390, "height": 844},
}


def main() -> None:
    report = {"pages": [], "severe": [], "warnings": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for mode, viewport in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport, device_scale_factor=1)
            for name, rel in PAGES:
                page = context.new_page()
                console_errors: list[str] = []
                page.on("console", lambda msg, store=console_errors: store.append(msg.text) if msg.type == "error" else None)
                url = f"http://127.0.0.1:8000/{rel}"
                try:
                    response = page.goto(url, wait_until="networkidle", timeout=30000)
                    status = response.status if response else 0
                    page.wait_for_timeout(500)
                    metrics = page.evaluate("""() => ({
                        sw: document.documentElement.scrollWidth,
                        cw: document.documentElement.clientWidth,
                        h1: document.querySelectorAll('h1').length,
                        header: !!document.querySelector('[data-header]'),
                        theme: document.documentElement.classList.contains('nexusnova-scifi'),
                        brokenImages: [...document.images].filter(i => {
                            const src = (i.getAttribute('src') || '').trim();
                            if (!src || i.hidden) return false;
                            const style = getComputedStyle(i);
                            if (style.display === 'none' || style.visibility === 'hidden') return false;
                            return i.complete && i.naturalWidth === 0;
                        }).length
                    })""")
                    if status >= 400 or status == 0:
                        report["severe"].append(f"{mode}/{rel}: HTTP {status}")
                    if metrics["sw"] > metrics["cw"] + 6:
                        report["severe"].append(f"{mode}/{rel}: horizontal overflow {metrics['sw']} > {metrics['cw']}")
                    if metrics["h1"] != 1 and rel not in {"register.html"}:
                        report["warnings"].append(f"{mode}/{rel}: H1 count {metrics['h1']}")
                    if not metrics["header"]:
                        report["severe"].append(f"{mode}/{rel}: shared header missing")
                    if not metrics["theme"]:
                        report["severe"].append(f"{mode}/{rel}: canonical premium theme class missing")
                    if metrics["brokenImages"]:
                        report["severe"].append(f"{mode}/{rel}: {metrics['brokenImages']} broken visible image(s)")
                    if console_errors:
                        report["warnings"].append(f"{mode}/{rel}: {len(console_errors)} console error(s)")
                    if rel == "index.html":
                        try:
                            page.wait_for_selector('[data-live-tech-pulse]', timeout=5000)
                        except Exception:
                            report["warnings"].append(f"{mode}/index.html: Live Tech Pulse did not mount")
                    page.screenshot(path=str(OUT / f"{mode}-{name}.png"), full_page=True)
                    report["pages"].append({"mode": mode, "page": rel, "status": status, **metrics})
                except Exception as exc:
                    report["severe"].append(f"{mode}/{rel}: browser check failed: {exc}")
                finally:
                    page.close()
            context.close()
        browser.close()
    (OUT / "browser-quality-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"pages": len(report["pages"]), "severe": len(report["severe"]), "warnings": len(report["warnings"])}, indent=2))
    if report["severe"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
