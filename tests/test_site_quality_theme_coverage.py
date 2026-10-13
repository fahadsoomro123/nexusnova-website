#!/usr/bin/env python3
"""Regression tests for shared production theme coverage detection."""
from __future__ import annotations

import importlib.util
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
