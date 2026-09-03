from __future__ import annotations

import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "quality-artifacts"
OUT.mkdir(exist_ok=True)

PAGES = ["register.html", "account.html"]
VIEWPORTS = {
    "desktop": {"width": 1440, "height": 1000},
    "mobile": {"width": 390, "height": 844},
}


def main() -> None:
    report: dict = {"pages": []}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for mode, viewport in VIEWPORTS.items():
            context = browser.new_context(viewport=viewport, device_scale_factor=1)
            for rel in PAGES:
                page = context.new_page()
                console_errors: list[dict] = []
                page_errors: list[str] = []
                failed_requests: list[dict] = []

                def on_console(msg) -> None:
                    if msg.type != "error":
                        return
                    console_errors.append({
                        "text": msg.text,
                        "location": msg.location,
                    })

                def on_request_failed(request) -> None:
                    failed_requests.append({
                        "url": request.url,
                        "failure": request.failure,
                        "resourceType": request.resource_type,
                    })

                page.on("console", on_console)
                page.on("pageerror", lambda exc: page_errors.append(str(exc)))
                page.on("requestfailed", on_request_failed)

                url = f"http://127.0.0.1:8000/{rel}"
                try:
                    response = page.goto(url, wait_until="networkidle", timeout=30000)
                    page.wait_for_timeout(1500)
                    entry = {
                        "mode": mode,
                        "page": rel,
                        "status": response.status if response else 0,
                        "finalUrl": page.url,
                        "consoleErrors": console_errors,
                        "pageErrors": page_errors,
                        "failedRequests": failed_requests,
                    }
                except Exception as exc:
                    entry = {
                        "mode": mode,
                        "page": rel,
                        "probeError": str(exc),
                        "finalUrl": page.url,
                        "consoleErrors": console_errors,
                        "pageErrors": page_errors,
                        "failedRequests": failed_requests,
                    }
                report["pages"].append(entry)
                page.close()
            context.close()
        browser.close()

    path = OUT / "auth-console-probe.json"
    path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
