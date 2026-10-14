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


class COLAEditorialAccuracyRegressionTests(unittest.TestCase):
    """Prevent scenario percentages from being re-labelled as an official SSA rate."""

    def test_calculator_labels_2027_percentages_as_hypothetical_scenarios(self):
        html = (ROOT / "social-security-cola-calculator-2027.html").read_text(encoding="utf-8")
        self.assertNotIn("Official 2027 COLA: 3.6%", html)
        self.assertNotIn("3.6% — official 2027 COLA", html)
        self.assertIn("3.6% — illustrative 2027 what-if scenario (not official)", html)
        self.assertIn("2.8% — actual 2026 COLA (historical reference, not the 2027 rate)", html)

    def test_article_does_not_claim_ssa_determined_3_6_percent(self):
        html = (ROOT / "articles" / "social-security-cola-2027-estimate.html").read_text(encoding="utf-8")
        self.assertNotIn("The official 2027 adjustment is <strong>3.6%</strong>", html)
        self.assertNotIn("Official 2027 COLA determined by SSA on October 14, 2026", html)
        self.assertIn("Illustrative what-if scenario; not an official rate", html)

    def test_article_listing_and_machine_feed_use_corrected_title(self):
        listing = (ROOT / "articles.html").read_text(encoding="utf-8")
        self.assertIn("2027 Social Security COLA: Official Status and Scenarios", listing)
        self.assertNotIn("2027 Social Security COLA Estimate: Latest Forecast", listing)

        feed = json.loads((ROOT / "articles.json").read_text(encoding="utf-8"))
        article = next(
            item for item in feed["items"]
            if item.get("url") == "https://nexusnovatools.com/articles/social-security-cola-2027-estimate.html"
        )
        self.assertEqual(article["title"], "2027 Social Security COLA: Official Status and Illustrative Scenarios")
        self.assertIn("had not yet listed an official 2027 percentage", article["description"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
