from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path("quality-artifacts")
OUT.mkdir(exist_ok=True)

PAGES = [
    ("home", "index.html"),
    ("tools", "tools.html"),
    ("categories", "categories.html"),
    ("articles", "articles.html"),
    ("guides", "guides.html"),
    ("tool-image", "image-compressor.html"),
    ("tool-fbr", "fbr-atl-status-checker.html"),
    ("tool-password", "password-generator.html"),
    ("article-detail", "articles/ai-photo-restoration-vs-enhancement.html"),
    ("guide-detail", "guides/ai-prompting.html"),
]
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "mobile": {"width": 390, "height": 844},
}
TRUST_HREFS = {
    "/terms.html",
    "/refund-policy.html",
    "/about.html",
    "/editorial-policy.html",
    "/tool-methodology.html",
    "/privacy.html",
    "/contact.html",
}

def main():
    report = {"pages": [], "failures": [], "warnings": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for mode, viewport in VIEWPORTS.items():
            context = browser.new_context(
                viewport=viewport,
                device_scale_factor=1,
                ignore_https_errors=False,
            )

            for name, rel in PAGES:
                page = context.new_page()
                console_errors = []
                page.on(
                    "console",
                    lambda msg, store=console_errors: store.append(msg.text)
                    if msg.type == "error" else None,
                )

                try:
                    response = page.goto(
                        f"http://127.0.0.1:8000/{rel}",
                        wait_until="networkidle",
                        timeout=30000,
                    )
                    status = response.status if response else 0
                    if status < 200 or status >= 400:
                        report["failures"].append(f"{mode}/{rel}: HTTP {status}")
                        continue

                    page.wait_for_timeout(250)

                    metrics = page.evaluate("""() => {
                        const footer = document.querySelector('footer');
                        const footerLinks = footer ? [...footer.querySelectorAll('a')].map(a => ({
                            text: (a.textContent || '').trim(),
                            href: a.getAttribute('href') || ''
                        })) : [];
                        return {
                            scrollWidth: document.documentElement.scrollWidth,
                            clientWidth: document.documentElement.clientWidth,
                            h1: document.querySelectorAll('h1').length,
                            header: !!document.querySelector('header, .site-header, .nn-header'),
                            footer: !!footer,
                            footerLinks,
                            bodyTextLength: (document.body.innerText || '').trim().length,
                        };
                    }""")

                    if metrics["scrollWidth"] > metrics["clientWidth"] + 6:
                        report["failures"].append(
                            f"{mode}/{rel}: horizontal overflow "
                            f"{metrics['scrollWidth']}/{metrics['clientWidth']}"
                        )

                    if not metrics["header"]:
                        report["failures"].append(f"{mode}/{rel}: header missing")
                    if not metrics["footer"]:
                        report["failures"].append(f"{mode}/{rel}: footer missing")
                    if metrics["bodyTextLength"] < 80:
                        report["failures"].append(f"{mode}/{rel}: suspiciously empty rendered body")

                    footer_hrefs = {item["href"] for item in metrics["footerLinks"]}
                    missing = sorted(TRUST_HREFS - footer_hrefs)
                    if missing:
                        report["failures"].append(
                            f"{mode}/{rel}: missing Trust footer links: {', '.join(missing)}"
                        )

                    if console_errors:
                        report["warnings"].append(
                            f"{mode}/{rel}: console errors: "
                            + " | ".join(dict.fromkeys(console_errors[:4]))
                        )

                    if mode == "mobile":
                        menu = page.locator("[data-menu-btn], [data-nn-menu], .menu-btn, .nn-menu")
                        if menu.count() and not menu.first.is_visible():
                            report["warnings"].append(
                                f"mobile/{rel}: menu control exists but is hidden"
                            )

                    artifact_dir = OUT / "staging-browser-render"
                    artifact_dir.mkdir(parents=True, exist_ok=True)
                    page.screenshot(
                        path=str(artifact_dir / f"{mode}-{name}.png"),
                        full_page=True,
                    )

                    report["pages"].append(
                        {"mode": mode, "page": rel, "status": status, **metrics}
                    )
                except Exception as exc:
                    report["failures"].append(f"{mode}/{rel}: {exc}")
                finally:
                    page.close()

            context.close()

        browser.close()

    summary = (
        f"Rendered checks: {len(report['pages'])}\n"
        f"Failures: {len(report['failures'])}\n"
        f"Warnings: {len(report['warnings'])}\n"
    )
    (OUT / "staging-browser-render-report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    (OUT / "staging-browser-render-summary.txt").write_text(summary, encoding="utf-8")
    print(summary)
    if report["failures"]:
        for item in report["failures"]:
            print("FAIL:", item)
        raise SystemExit(1)

if __name__ == "__main__":
    main()
