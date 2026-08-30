from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "quality-artifacts"
OUT.mkdir(exist_ok=True)

# Keep this list focused on representative high-value routes while covering
# the main public surfaces, auth/account UI and legal/trust pages.
PAGES = [
    ("home", "index.html"),
    ("tools", "tools.html"),
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


def main() -> None:
    report = {"pages": [], "severe": [], "warnings": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for mode, viewport in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport, device_scale_factor=1)

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
                    page.wait_for_timeout(500)

                    metrics = page.evaluate(
                        """() => ({
                            sw: document.documentElement.scrollWidth,
                            cw: document.documentElement.clientWidth,
                            h1: document.querySelectorAll('h1').length,
                            header: !!document.querySelector('[data-header]'),
                            nav: !!document.querySelector('[data-nav]'),
                            menuButton: !!document.querySelector('[data-menu-btn]'),
                            theme: document.documentElement.classList.contains('nexusnova-scifi') || !!document.querySelector('link[data-nexusnova-scifi]'),
                            signin: !!document.querySelector('.nn-nav-signin'),
                            signup: !!document.querySelector('.nn-nav-signup'),
                            brokenImages: [...document.images].filter(i => {
                                const src = (i.getAttribute('src') || '').trim();
                                if (!src || i.hidden) return false;
                                const style = getComputedStyle(i);
                                if (style.display === 'none' || style.visibility === 'hidden') return false;
                                return i.complete && i.naturalWidth === 0;
                            }).length
                        })"""
                    )

                    if status >= 400 or status == 0:
                        report["severe"].append(f"{mode}/{rel}: HTTP {status}")
                    if metrics["sw"] > metrics["cw"] + 6:
                        report["severe"].append(
                            f"{mode}/{rel}: horizontal overflow {metrics['sw']} > {metrics['cw']}"
                        )
                    if metrics["h1"] != 1 and rel not in {"register.html"}:
                        report["warnings"].append(
                            f"{mode}/{rel}: H1 count {metrics['h1']}"
                        )
                    if not metrics["header"]:
                        report["severe"].append(f"{mode}/{rel}: shared header missing")
                    if not metrics["nav"]:
                        report["severe"].append(f"{mode}/{rel}: shared navigation missing")
                    if not metrics["menuButton"]:
                        report["severe"].append(f"{mode}/{rel}: menu button missing")
                    if not metrics["theme"]:
                        report["severe"].append(
                            f"{mode}/{rel}: canonical premium theme coverage missing"
                        )
                    if metrics["brokenImages"]:
                        report["severe"].append(
                            f"{mode}/{rel}: {metrics['brokenImages']} broken visible image(s)"
                        )

                    # Public/guest surfaces must expose the standard auth entry.
                    # account.html is a protected dashboard shell and intentionally
                    # uses its own signed-in/redirect behavior instead of guest auth CTAs.
                    if rel != "account.html" and (
                        not metrics["signin"] or not metrics["signup"]
                    ):
                        report["severe"].append(
                            f"{mode}/{rel}: guest Sign in / Sign up header actions missing"
                        )

                    if console_errors:
                        report["warnings"].append(
                            f"{mode}/{rel}: {len(console_errors)} console error(s)"
                        )

                    # Mobile navigation must be keyboard/click accessible and keep
                    # aria-expanded synchronized with the visible open state.
                    if mode == "mobile" and metrics["menuButton"] and metrics["nav"]:
                        button = page.locator("[data-menu-btn]")
                        nav = page.locator("[data-nav]")
                        box = button.bounding_box()
                        if not box or box["width"] < 36 or box["height"] < 36:
                            report["severe"].append(
                                f"mobile/{rel}: menu button touch target is smaller than 36px"
                            )

                        label = (button.get_attribute("aria-label") or "").strip()
                        if not label:
                            report["severe"].append(
                                f"mobile/{rel}: menu button missing aria-label"
                            )

                        button.focus()
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(100)
                        expanded = button.get_attribute("aria-expanded")
                        nav_open = nav.evaluate("el => el.classList.contains('open')")
                        if expanded != "true" or not nav_open:
                            report["severe"].append(
                                f"mobile/{rel}: Enter does not open nav with aria-expanded=true"
                            )

                        page.keyboard.press("Enter")
                        page.wait_for_timeout(100)
                        expanded = button.get_attribute("aria-expanded")
                        nav_open = nav.evaluate("el => el.classList.contains('open')")
                        if expanded != "false" or nav_open:
                            report["severe"].append(
                                f"mobile/{rel}: second Enter does not close nav cleanly"
                            )

                    if rel == "index.html":
                        try:
                            page.wait_for_selector("[data-live-tech-pulse]", timeout=5000)
                        except Exception:
                            report["warnings"].append(
                                f"{mode}/index.html: Live Tech Pulse did not mount"
                            )

                    page.screenshot(
                        path=str(OUT / f"{mode}-{name}.png"), full_page=True
                    )
                    report["pages"].append(
                        {"mode": mode, "page": rel, "status": status, **metrics}
                    )

                except Exception as exc:
                    report["severe"].append(
                        f"{mode}/{rel}: browser check failed: {exc}"
                    )
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
            },
            indent=2,
        )
    )
    if report["severe"]:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
