#!/usr/bin/env python3
"""Regression tests for shared production theme coverage detection."""
from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "site_quality_audit", ROOT / ".github" / "scripts" / "site_quality_audit.py"
)
AUDIT = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(AUDIT)

VALUE_SPEC = importlib.util.spec_from_file_location(
    "manual_value_audit", ROOT / ".github" / "scripts" / "manual_value_audit.py"
)
VALUE_AUDIT = importlib.util.module_from_spec(VALUE_SPEC)
assert VALUE_SPEC.loader is not None
VALUE_SPEC.loader.exec_module(VALUE_AUDIT)


class ThemeCoverageRegressionTests(unittest.TestCase):
    def test_shared_site_stylesheet_is_recognized_from_root_page(self):
        html = '<link rel="stylesheet" href="assets/css/site.css">'
        self.assertTrue(AUDIT.has_theme_coverage(html))

    def test_shared_site_stylesheet_is_recognized_from_nested_page(self):
        html = '<link rel="stylesheet" href="../assets/css/site.css">'
        self.assertTrue(AUDIT.has_theme_coverage(html))

    def test_existing_legacy_theme_assets_remain_supported(self):
        for asset in (
            "assets/css/scifi.css",
            "assets/js/main.js",
            "assets/css/humanproof.css",
        ):
            with self.subTest(asset=asset):
                self.assertTrue(AUDIT.has_theme_coverage(f'<link href="{asset}">'))

    def test_unrelated_page_is_not_automatically_theme_covered(self):
        html = '<link rel="stylesheet" href="assets/css/unrelated.css">'
        self.assertFalse(AUDIT.has_theme_coverage(html))


class HomepageCriticalPathRegressionTests(unittest.TestCase):
    """Keep the existing HumanProof hero and brand layout off the delayed shell path."""

    def test_existing_hero_assets_are_discovered_in_the_initial_document(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('assets/css/humanproof-home.css?v=20261015-v2" data-humanproof-loader', html)
        self.assertIn('assets/js/humanproof-home.js?v=20261015-v2" data-humanproof-loader defer', html)
        self.assertIn('assets/logo.png', html)

    def test_decorative_3d_work_waits_for_browser_idle_time(self):
        script = (ROOT / "assets" / "js" / "humanproof-home.js").read_text(encoding="utf-8")
        self.assertIn("window.requestIdleCallback(startV20,{timeout:1800})", script)
        self.assertIn("window.setTimeout(startV20,700)", script)


class HomepageConsentCriticalPathRegressionTests(unittest.TestCase):
    """Keep the privacy banner visible from the initial HTML, not a late external fetch."""

    def test_homepage_renders_consent_markup_before_header_without_external_loader(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        banner = html.index('data-nexusnova-consent')
        header = html.index('<header class="nn-header"')
        self.assertLess(banner, header)
        self.assertIn('<style id="nn-home-consent-critical-css">', html)
        self.assertIn('<script id="nn-home-consent-critical-init">', html)
        self.assertNotIn('assets/js/home-consent-ui.js', html)
        self.assertIn('data-nexusnova-consent-reopen', html)

    def test_static_banner_preserves_saved_choices_and_denies_ad_storage(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        for value in ("Accept all", "Basic only", "Reject optional", "Privacy choices"):
            self.assertIn(value, html)
        self.assertIn("nexusnova_analytics_consent_v2", html)
        self.assertIn("nexusnova_analytics_consent_v1", html)
        self.assertIn("window.__nexusnovaConsentUiReady = true", html)
        self.assertIn("ad_storage: 'denied'", html)
        self.assertIn("ad_user_data: 'denied'", html)
        self.assertIn("ad_personalization: 'denied'", html)
        self.assertIn("window.__nexusnovaLoadAnalytics", html)




class COLAEditorialAccuracyRegressionTests(unittest.TestCase):
    """Guard the published 2027 COLA rate and discovery copy against stale claims."""

    def test_calculator_uses_official_2027_rate_and_historical_reference(self):
        html = (ROOT / "social-security-cola-calculator-2027.html").read_text(encoding="utf-8")
        self.assertIn("Official 2027 COLA: 3.6%, announced by the Social Security Administration on October 14, 2026.", html)
        self.assertIn("3.6% — official 2027 COLA (SSA announcement, October 14, 2026)", html)
        self.assertIn("2.8% — actual 2026 COLA (historical reference)", html)
        self.assertNotIn("not yet listed on the SSA summary", html)

    def test_article_uses_official_rate_and_primary_sources(self):
        html = (ROOT / "articles" / "social-security-cola-2027-estimate.html").read_text(encoding="utf-8")
        self.assertIn("official <strong>3.6% COLA for 2027</strong>", html)
        self.assertIn("https://www.ssa.gov/news/en/press/releases/2026-10-14.html", html)
        self.assertIn("https://www.ssa.gov/news/en/cola/factsheets/2027.html", html)
        self.assertNotIn("had not yet listed an official 2027 percentage", html)

    def test_article_listing_and_machine_feed_use_current_title(self):
        listing = (ROOT / "articles.html").read_text(encoding="utf-8")
        self.assertIn("2027 Social Security COLA: Official 3.6% Rate and Payment Timing", listing)
        self.assertNotIn("2027 Social Security COLA Estimate: Latest Forecast", listing)

        feed = json.loads((ROOT / "articles.json").read_text(encoding="utf-8"))
        article = next(
            item for item in feed["items"]
            if item.get("url") == "https://nexusnovatools.com/articles/social-security-cola-2027-estimate.html"
        )
        self.assertEqual(article["title"], "2027 Social Security COLA: Official 3.6% Rate and Payment Dates")
        self.assertIn("The official 3.6% 2027 COLA, announced by SSA on October 14, 2026", article["description"])


class MetaDescriptionParserRegressionTests(unittest.TestCase):
    """Guard quoted HTML attributes against premature apostrophe truncation."""

    def test_apostrophe_inside_double_quoted_description_is_preserved(self):
        html = """<meta name="description" content="SSA's public summary includes the annual rate and a detailed explanation.">"""
        self.assertEqual(
            VALUE_AUDIT.meta_description(html),
            "SSA's public summary includes the annual rate and a detailed explanation.",
        )

    def test_description_attribute_order_is_not_significant(self):
        html = '<meta content="A distinct description with adequate search context." name="description">'
        self.assertEqual(
            VALUE_AUDIT.meta_description(html),
            "A distinct description with adequate search context.",
        )




if __name__ == "__main__":
    unittest.main(verbosity=2)
