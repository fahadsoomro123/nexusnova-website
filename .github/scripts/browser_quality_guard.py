from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "quality-artifacts"

# Representative public surfaces, new topical hubs, account UI and trust pages.
# This remains intentionally smaller than the static crawl while exercising the
# shared runtime on both desktop and mobile.
PAGES = [
    ("home", "index.html"),
    ("tools", "tools.html"),
    ("categories", "categories.html"),
    ("pdf-hub", "pdf-tools.html"),
    ("image-hub", "image-tools.html"),
    ("calculator-hub", "calculator-tools.html"),
    ("productivity-hub", "productivity-tools.html"),
    ("pakistan-hub", "pakistan-tools.html"),
    ("labs", "labs.html"),
    ("trending", "trending-tools.html"),
    ("app", "app.html"),
    ("articles", "articles.html"),
    ("tech", "tech.html"),
    ("guides", "guides.html"),
    ("developer", "developer-tools.html"),
    ("register", "register.html"),
    ("account", "account.html"),
    ("privacy", "privacy.html"),
    ("terms", "terms.html"),
    ("faq", "faq.html"),
    ("resume", "resume-builder.html"),
]

VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "mobile": {"width": 390, "height": 844},
}


# The site intentionally contains more than one valid header template.
HEADER_SELECTOR = "[data-header], [data-nn-header], header.site-header, header.nn-header, header"
NAV_SELECTOR = "[data-nav], [data-nn-nav], header nav, header [role='navigation'], header .nav, .nn-nav"
MENU_BUTTON_SELECTOR = "[data-menu-btn], [data-nn-menu], button.menu-btn, button.nn-menu"
PAGE_READY_EXPRESSION = "document.readyState === 'complete'"
METRICS_EXPRESSION = """
() => {
    const header = document.querySelector('[data-header], [data-nn-header], header.site-header, header.nn-header, header');
    const nav = document.querySelector('[data-nav], [data-nn-nav], header nav, header [role="navigation"], header .nav, .nn-nav');
    const menuButton = document.querySelector('[data-menu-btn], [data-nn-menu], button.menu-btn, button.nn-menu');
    const navStyle = nav ? getComputedStyle(nav) : null;
    const buttonStyle = menuButton ? getComputedStyle(menuButton) : null;
    return {
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
        h1: document.querySelectorAll('h1').length,
        header: !!header,
        nav: !!nav,
        navVisible: !!nav && nav.getClientRects().length > 0 && navStyle.visibility !== 'hidden' && navStyle.display !== 'none',
        menuButton: !!menuButton,
        menuButtonVisible: !!menuButton && menuButton.getClientRects().length > 0 && buttonStyle.visibility !== 'hidden' && buttonStyle.display !== 'none',
        theme: document.documentElement.classList.contains('nexusnova-scifi') ||
            !!document.querySelector('link[data-nexusnova-scifi], link[href*="assets/css/site.css"], link[href*="../assets/css/site.css"], link[href*="assets/css/scifi.css"], link[href*="../assets/css/scifi.css"]'),
        pulseScript: [...document.scripts].some(script => script.src.includes('live-tech-pulse.js')),
        brokenImages: [...document.images].filter(i => {
            const src = (i.getAttribute('src') || '').trim();
            if (!src || i.hidden) return false;
            const style = getComputedStyle(i);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            return i.complete && i.naturalWidth === 0;
        }).length
    };
}
"""

def page_layout_findings(mode: str, rel: str, metrics: dict, status: int) -> tuple[list[str], list[str]]:
    """Enforce real browser defects without forcing every page into one shell."""
    severe: list[str] = []
    warnings: list[str] = []
    if status >= 400 or status == 0:
        severe.append(f"{mode}/{rel}: HTTP {status}")
    if metrics["sw"] > metrics["cw"] + 6:
        severe.append(f"{mode}/{rel}: horizontal overflow {metrics['sw']} > {metrics['cw']}")
    if metrics["h1"] != 1 and rel not in {"register.html"}:
        warnings.append(f"{mode}/{rel}: H1 count {metrics['h1']}")
    if not metrics["header"]:
        severe.append(f"{mode}/{rel}: shared header missing")
    if not metrics["nav"]:
        severe.append(f"{mode}/{rel}: shared navigation missing")
    if mode == "mobile" and metrics["nav"] and not metrics["menuButton"] and not metrics["navVisible"]:
        severe.append(f"{mode}/{rel}: navigation is hidden and no menu toggle is available")
    if not metrics["theme"]:
        severe.append(f"{mode}/{rel}: canonical theme stylesheet coverage missing")
    if metrics["brokenImages"]:
        severe.append(f"{mode}/{rel}: {metrics['brokenImages']} broken visible image(s)")
    return severe, warnings


def main() -> None:
    from playwright.sync_api import sync_playwright

    OUT.mkdir(exist_ok=True)
    report = {"pages": [], "severe": [], "warnings": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for mode, viewport in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport, device_scale_factor=1)

            # The production Worker intentionally does not allow localhost as an
            # auth origin. Mock only this read-only configuration request so the
            # local browser audit does not weaken production CORS or emit fake
            # console failures. Turnstile is disabled in this deterministic QA
            # context; real production auth/Turnstile behavior is tested elsewhere.
            def security_config(route):
                route.fulfill(
                    status=200,
                    content_type="application/json",
                    headers={"Access-Control-Allow-Origin": "*"},
                    body=json.dumps({
                        "ok": True,
                        "enabled": False,
                        "siteKey": "",
                        "action": "auth",
                    }),
                )

            context.route("**/api/auth/security-config", security_config)

            for name, rel in PAGES:
                page = context.new_page()
                console_errors: list[str] = []
                page.on(
                    "console",
                    lambda msg, store=console_errors: store.append(msg.text)
                    if msg.type == "error"
                    else None,
                )
                url = f"http://127.0.0.1:8000/{rel}"

                try:
                    response = page.goto(url, wait_until="networkidle", timeout=30000)
                    status = response.status if response else 0

                    # Shared site shell is loaded by a deferred runtime after HTML
                    # parsing. Measure the rendered state, not the pre-runtime DOM.
                    page.wait_for_function(PAGE_READY_EXPRESSION, timeout=8000)
                    page.wait_for_timeout(350)

                    metrics = page.evaluate(METRICS_EXPRESSION)

                    severe, warnings = page_layout_findings(mode, rel, metrics, status)
                    report["severe"].extend(severe)
                    report["warnings"].extend(warnings)
                    if rel == "register.html":
                        create_tabs = page.locator('[data-mode="register"]')
                        signin_tabs = page.locator('[data-mode="signin"]')
                        if create_tabs.count() != 1 or signin_tabs.count() != 1:
                            report["severe"].append(
                                f"{mode}/{rel}: account gateway Create Account / Sign In tabs missing"
                            )
                        else:
                            create_label = (create_tabs.inner_text() or "").strip().lower()
                            signin_label = (signin_tabs.inner_text() or "").strip().lower()
                            if "create" not in create_label or "sign in" not in signin_label:
                                report["severe"].append(
                                    f"{mode}/{rel}: account gateway tabs have unexpected labels"
                                )

                    if console_errors:
                        unique_errors = list(dict.fromkeys(console_errors))
                        detail = " | ".join(unique_errors[:4])
                        report["warnings"].append(
                            f"{mode}/{rel}: {len(console_errors)} console error(s): {detail}"
                        )

                    if mode == "mobile":
                        if metrics["menuButtonVisible"] and metrics["nav"]:
                            button = page.locator(MENU_BUTTON_SELECTOR).first()
                            nav = page.locator(NAV_SELECTOR).first()
                            box = button.bounding_box()
                            if not box or box["width"] < 36 or box["height"] < 36:
                                report["severe"].append(
                                    f"mobile/{rel}: menu button touch target is smaller than 36px"
                                )

                            label = (button.get_attribute("aria-label") or "").strip()
                            if not label:
                                report["severe"].append(f"mobile/{rel}: menu button missing aria-label")

                            button.focus()
                            page.keyboard.press("Enter")
                            page.wait_for_timeout(100)
                            expanded = button.get_attribute("aria-expanded")
                            nav_open = nav.evaluate("el => el.classList.contains('open') || el.classList.contains('is-open')")
                            if expanded != "true" or not nav_open:
                                report["severe"].append(
                                    f"mobile/{rel}: Enter does not open nav with aria-expanded=true"
                                )

                            page.keyboard.press("Enter")
                            page.wait_for_timeout(100)
                            expanded = button.get_attribute("aria-expanded")
                            nav_open = nav.evaluate("el => el.classList.contains('open') || el.classList.contains('is-open')")
                            if expanded != "false" or nav_open:
                                report["severe"].append(
                                    f"mobile/{rel}: second Enter does not close nav cleanly"
                                )
                        elif metrics["nav"] and not metrics["navVisible"]:
                            report["severe"].append(
                                f"mobile/{rel}: navigation is hidden and no visible menu toggle is available"
                            )

                    if rel == "index.html" and metrics["pulseScript"]:
                        page.evaluate("window.scrollBy(0, 1)")
                        try:
                            page.wait_for_selector("[data-live-tech-pulse]", timeout=5000)
                        except Exception:
                            report["warnings"].append(
                                f"{mode}/index.html: loaded Live Tech Pulse did not mount"
                            )

                    page.screenshot(path=str(OUT / f"{mode}-{name}.png"), full_page=True)
                    report["pages"].append(
                        {"mode": mode, "page": rel, "status": status, **metrics}
                    )

                except Exception as exc:
                    report["severe"].append(f"{mode}/{rel}: browser check failed: {exc}")
                finally:
                    page.close()

            context.close()

        browser.close()

    (OUT / "browser-quality-report.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    print(
        json.dumps(
            {
                "pages": len(report["pages"]),
                "severe": len(report["severe"]),
                "warnings": len(report["warnings"]),
                "authenticatedHeader": bool(report.get("authenticatedHeader")),
            },
            indent=2,
        )
    )
    if report["severe"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
