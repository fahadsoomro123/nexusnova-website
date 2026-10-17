#!/usr/bin/env python3
"""Regression tests for template-aware browser quality rules."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "browser_quality_guard", ROOT / ".github" / "scripts" / "browser_quality_guard.py"
)
GUARD = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(GUARD)


def metrics(**overrides):
    result = {
        "sw": 390, "cw": 390, "h1": 1, "header": True, "nav": True,
        "navVisible": True, "menuButton": False, "menuButtonVisible": False,
        "theme": True, "pulseScript": False, "brokenImages": 0,
    }
    result.update(overrides)
    return result


class BrowserQualityRuleRegressionTests(unittest.TestCase):
    def test_current_and_legacy_shell_selectors_are_supported(self):
        self.assertIn("data-header", GUARD.HEADER_SELECTOR)
        self.assertIn("nn-header", GUARD.HEADER_SELECTOR)
        self.assertIn("data-nav", GUARD.NAV_SELECTOR)
        self.assertIn("nn-nav", GUARD.NAV_SELECTOR)
        self.assertIn("data-menu-btn", GUARD.MENU_BUTTON_SELECTOR)
        self.assertIn("data-nn-menu", GUARD.MENU_BUTTON_SELECTOR)

    def test_desktop_page_needs_neither_hamburger_nor_account_ctas(self):
        severe, warnings = GUARD.page_layout_findings("desktop", "index.html", metrics(), 200)
        self.assertEqual(severe, [])
        self.assertEqual(warnings, [])

    def test_mobile_visible_navigation_needs_no_toggle(self):
        severe, warnings = GUARD.page_layout_findings("mobile", "index.html", metrics(navVisible=True), 200)
        self.assertEqual(severe, [])
        self.assertEqual(warnings, [])

    def test_mobile_hidden_navigation_without_toggle_still_fails(self):
        severe, _ = GUARD.page_layout_findings("mobile", "categories.html", metrics(navVisible=False), 200)
        self.assertTrue(any("navigation is hidden" in item for item in severe))

    def test_real_http_overflow_theme_and_image_defects_remain_blocking(self):
        severe, _ = GUARD.page_layout_findings(
            "mobile", "categories.html",
            metrics(navVisible=False, brokenImages=1, theme=False, sw=420), 503
        )
        self.assertTrue(any("HTTP 503" in item for item in severe))
        self.assertTrue(any("horizontal overflow" in item for item in severe))
        self.assertTrue(any("canonical theme stylesheet coverage missing" in item for item in severe))
        self.assertTrue(any("broken visible image" in item for item in severe))

    def test_readiness_wait_does_not_depend_on_old_css_class(self):
        self.assertIn("document.readyState", GUARD.PAGE_READY_EXPRESSION)
        self.assertNotIn("nexusnova-scifi')", GUARD.PAGE_READY_EXPRESSION)

    def test_inline_and_page_specific_styles_count_as_theme_coverage(self):
        self.assertIn("document.querySelector('style", GUARD.METRICS_EXPRESSION)
        self.assertIn("flagship-home-refinement.css", GUARD.METRICS_EXPRESSION)
        homepage = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
        self.assertIn("<style", homepage)

    def test_pulse_mount_is_required_only_when_page_loads_script(self):
        homepage = (ROOT / "index.html").read_text(encoding="utf-8", errors="replace")
        self.assertNotIn("live-tech-pulse.js", homepage)
        self.assertNotIn("data-live-tech-pulse", homepage)
        source = (ROOT / ".github" / "scripts" / "browser_quality_guard.py").read_text(encoding="utf-8")
        self.assertIn('rel == "index.html" and metrics["pulseScript"]', source)

    def test_registration_gateway_tab_check_is_preserved(self):
        source = (ROOT / ".github" / "scripts" / "browser_quality_guard.py").read_text(encoding="utf-8")
        self.assertIn('data-mode="register"', source)
        self.assertIn('data-mode="signin"', source)


    def test_guides_page_uses_static_scrollable_mobile_navigation(self):
        guides = (ROOT / "guides.html").read_text(encoding="utf-8", errors="replace")
        shell = (ROOT / "assets" / "css" / "static-site-shell.css").read_text(encoding="utf-8")

        self.assertIn('<nav class="nn-nav" id="nn-primary-nav" aria-label="Primary navigation">', guides)
        for href in ['href="/"', 'href="/#master-directory"', 'href="/categories.html"',
                     'href="/articles.html"', 'href="/guides.html"']:
            self.assertIn(href, guides)

        # Static nav must not depend on a removed hamburger button or menu-toggle runtime.
        self.assertNotIn('data-nn-menu', guides)
        self.assertNotIn('toggleMenu', guides)
        self.assertIn('assets/css/static-site-shell.css', guides)
        self.assertRegex(
            shell,
            r'@media\(max-width:860px\)[^\n]*\.nn-header \.nn-nav\{[^}]*overflow-x:auto!important',
        )

if __name__ == "__main__":
    unittest.main(verbosity=2)
