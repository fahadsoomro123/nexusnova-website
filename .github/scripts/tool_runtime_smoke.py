from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
BASE = "http://127.0.0.1:8000"
SOURCE = (ROOT / "assets/js/search-core.js").read_text(encoding="utf-8")
OUT = ROOT / "quality-artifacts"
OUT.mkdir(exist_ok=True)
routes = re.findall(r'url:"([^"]+)", type:"tool"', SOURCE)
routes = list(dict.fromkeys(routes))

if len(routes) != 97:
    raise SystemExit(f"Expected 97 unique searchable tool routes, found {len(routes)}.")
missing = [route for route in routes if not (ROOT / route).is_file()]
if missing:
    raise SystemExit("Search index contains missing tool files: " + ", ".join(missing))

report = {"expected_tools": 97, "routes": [], "severe": [], "console_errors": [], "first_party_console_errors": []}
BASE_HOST = urlsplit(BASE).netloc
ACTION_WORDS = re.compile(
    r"\b(calculate|convert|generate|create|estimate|compress|resize|enhance|check|inspect|analyse|analyze|validate|format|encode|decode|hash|count|extract|merge|split|run|process|apply|compare|test)\b",
    re.I,
)
UNSAFE_WORDS = re.compile(r"\b(delete|remove|reset|clear|purchase|pay|connect|sign in|log in|logout|sign out)\b", re.I)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1365, "height": 900},
        permissions=["clipboard-read", "clipboard-write"],
    )
    context.add_init_script(
        "document.addEventListener('submit', function (event) { event.preventDefault(); }, true);"
    )

    for index, route in enumerate(routes, start=1):
        page = context.new_page()
        row = {
            "route": route,
            "status": 0,
            "inputs_exercised": 0,
            "selects_exercised": 0,
            "action_buttons_exercised": [],
            "console_errors": [],
            "first_party_console_errors": [],
            "page_errors": [],
            "local_resource_failures": [],
            "copy_button_exercised": None,
            "clipboard_text_length": 0,
        }

        def on_page_error(error):
            row["page_errors"].append(str(error)[:500])

        def on_console(message):
            if message.type != "error":
                return
            location = message.location or {}
            source_url = location.get("url", "") or ""
            item = {
                "text": message.text[:400],
                "source": source_url[:300],
            }
            row["console_errors"].append(item)
            report["console_errors"].append({"route": route, **item})
            if urlsplit(source_url).netloc == BASE_HOST:
                row["first_party_console_errors"].append(item)
                report["first_party_console_errors"].append({"route": route, **item})

        def on_response(response):
            parsed = urlsplit(response.url)
            if parsed.netloc == BASE_HOST and response.status >= 400:
                row["local_resource_failures"].append(
                    {"status": response.status, "url": response.url[:400]}
                )

        page.on("pageerror", on_page_error)
        page.on("console", on_console)
        page.on("response", on_response)

        try:
            response = page.goto(
                f"{BASE}/{route.lstrip('/')}",
                wait_until="domcontentloaded",
                timeout=12000,
            )
            row["status"] = response.status if response else 0
            if row["status"] != 200:
                row["page_errors"].append(f"Tool route returned HTTP {row['status']}.")

            try:
                page.wait_for_load_state("load", timeout=5000)
            except Exception:
                pass
            page.wait_for_timeout(100)

            # Exercise representative data entry without submitting forms or changing
            # remote accounts. Input/change events run the page's own listeners.
            inputs = page.locator(
                "input:not([type=hidden]):not([type=file]):"
                "not([type=checkbox]):not([type=radio]):not([type=button]):"
                "not([type=submit]):not([type=reset]), textarea"
            )
            changed = 0
            for input_index in range(min(inputs.count(), 3)):
                field = inputs.nth(input_index)
                try:
                    if not field.is_visible() or not field.is_enabled():
                        continue
                    field_type = (field.get_attribute("type") or "text").lower()
                    value = {
                        "number": "1",
                        "range": "1",
                        "email": "qa@example.com",
                        "url": "https://example.com",
                        "tel": "1234567",
                        "search": "test",
                        "password": "NexusNova-QA!2026-Strong",
                    }.get(field_type, "test")
                    if route == "unix-timestamp-converter.html":
                        value = "1792022400"
                    field.fill(value, timeout=700)
                    changed += 1
                except Exception:
                    # Disabled, masked, custom or non-editable controls are reported by
                    # the page itself; do not mistake locator limitations for crashes.
                    continue
            row["inputs_exercised"] = changed

            selects = page.locator("select")
            for select_index in range(min(selects.count(), 2)):
                control = selects.nth(select_index)
                try:
                    if not control.is_visible() or not control.is_enabled():
                        continue
                    options = control.locator("option")
                    target_value = None
                    for option_index in range(options.count()):
                        option = options.nth(option_index)
                        value = option.get_attribute("value")
                        disabled = option.get_attribute("disabled") is not None
                        if value and not disabled:
                            target_value = value
                            break
                    if target_value is not None:
                        control.select_option(target_value, timeout=700)
                        row["selects_exercised"] += 1
                except Exception:
                    continue

            # Click at most one non-destructive primary action. Native form submission
            # is intercepted above so this audit never sends a form to a remote service.
            buttons = page.locator("button, input[type=button], input[type=submit]")
            for button_index in range(min(buttons.count(), 20)):
                button = buttons.nth(button_index)
                try:
                    if not button.is_visible() or not button.is_enabled():
                        continue
                    label = " ".join([
                        button.inner_text(timeout=300) if button.evaluate("el => el.tagName") == "BUTTON" else "",
                        button.get_attribute("aria-label") or "",
                        button.get_attribute("title") or "",
                        button.get_attribute("value") or "",
                    ]).strip()
                    if not label or UNSAFE_WORDS.search(label) or not ACTION_WORDS.search(label):
                        continue
                    button.click(timeout=800)
                    row["action_buttons_exercised"].append(label[:120])
                    page.wait_for_timeout(80)
                    break
                except Exception:
                    continue

            # Try one visible copy control after the primary action. Clipboard access
            # is granted only to this local audit context; no copied data leaves the page.
            copy_buttons = page.locator("button, [role=button], input[type=button]")
            for copy_index in range(min(copy_buttons.count(), 30)):
                button = copy_buttons.nth(copy_index)
                try:
                    if not button.is_visible() or not button.is_enabled():
                        continue
                    tag = button.evaluate("el => el.tagName")
                    label = " ".join([
                        button.inner_text(timeout=300) if tag == "BUTTON" else "",
                        button.get_attribute("aria-label") or "",
                        button.get_attribute("title") or "",
                        button.get_attribute("value") or "",
                    ]).strip()
                    if not re.search(r"\bcopy\b", label, re.I):
                        continue
                    button.click(timeout=800)
                    row["copy_button_exercised"] = label[:120]
                    page.wait_for_timeout(80)
                    copied = page.evaluate("() => navigator.clipboard.readText()")
                    row["clipboard_text_length"] = len(copied or "")
                    if not (copied or "").strip():
                        row["page_errors"].append("Copy button produced an empty clipboard: " + label[:120])
                    break
                except Exception as error:
                    row["page_errors"].append(
                        "Copy button check failed: " + type(error).__name__ + ": " + str(error)[:220]
                    )
                    break

            # Give promise callbacks from input and button handlers a chance to surface.
            page.wait_for_timeout(100)
        except Exception as error:
            row["page_errors"].append(f"Page smoke failed: {type(error).__name__}: {str(error)[:350]}")
        finally:
            if row["status"] != 200:
                report["severe"].append(f"{route}: HTTP {row['status']}")
            if row["page_errors"]:
                report["severe"].append(f"{route}: " + " | ".join(row["page_errors"][:3]))
            if row["local_resource_failures"]:
                report["severe"].append(
                    f"{route}: local resource failure(s): " +
                    ", ".join(f"{item['status']} {item['url']}" for item in row["local_resource_failures"][:3])
                )
            if row["first_party_console_errors"]:
                report["severe"].append(
                    f"{route}: first-party console error(s): " +
                    " | ".join(item["text"] for item in row["first_party_console_errors"][:3])
                )
            report["routes"].append(row)
            page.close()

    context.close()
    browser.close()

report_path = OUT / "tool-runtime-report.json"
report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
summary = {
    "tools_expected": report["expected_tools"],
    "tools_loaded": len(report["routes"]),
    "input_events_exercised": sum(row["inputs_exercised"] for row in report["routes"]),
    "select_events_exercised": sum(row["selects_exercised"] for row in report["routes"]),
    "primary_actions_exercised": sum(bool(row["action_buttons_exercised"]) for row in report["routes"]),
    "copy_buttons_exercised": sum(bool(row["copy_button_exercised"]) for row in report["routes"]),
    "successful_clipboard_copies": sum(row["clipboard_text_length"] > 0 for row in report["routes"]),
    "page_errors": sum(len(row["page_errors"]) for row in report["routes"]),
    "console_errors_recorded": len(report["console_errors"]),
    "first_party_console_errors": len(report["first_party_console_errors"]),
    "local_resource_failures": sum(len(row["local_resource_failures"]) for row in report["routes"]),
    "severe": len(report["severe"]),
    "report": str(report_path.relative_to(ROOT)),
}
print(json.dumps(summary, indent=2))
if len(report["routes"]) != 97 or report["severe"]:
    for finding in report["severe"][:80]:
        print("TOOL RUNTIME FAIL:", finding)
    raise SystemExit("Tool runtime smoke failed; inspect tool-runtime-report.json.")
