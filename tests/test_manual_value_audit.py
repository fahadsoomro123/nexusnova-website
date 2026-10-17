#!/usr/bin/env python3
"""Regression tests for shared editorial boilerplate in the strict value audit."""
from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "manual_value_audit", ROOT / ".github" / "scripts" / "manual_value_audit.py"
)
AUDIT = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(AUDIT)


class SharedEditorialBoilerplateTests(unittest.TestCase):
    def test_exact_shared_safety_copy_is_excluded_from_uniqueness_signal(self):
        reusable = (
            "Copying an example unchanged: illustrative figures explain the method; "
            "they do not replace your own data."
        )
        article_specific = (
            "For a 0.1 litre-per-minute leak, estimate daily waste first, then apply "
            "the tariff and any sewerage charge used by the local supplier."
        )
        visible = f"{article_specific} {reusable}"
        distinctive = AUDIT.distinctive_content(visible)

        self.assertIn(article_specific, distinctive)
        self.assertNotIn("Copying an example unchanged", distinctive)
        self.assertIn("Copying an example unchanged", visible)

    def test_only_exact_allowlisted_sentences_are_filtered(self):
        standard = (
            "Verify important inputs with the original provider or official source."
        )
        near_match = (
            "Verify important inputs with the original provider or official source "
            "before comparing the current invoice."
        )
        self.assertEqual(AUDIT.distinctive_content(standard), "")
        self.assertEqual(AUDIT.distinctive_content(near_match), near_match)

    def test_allowlist_is_narrow_and_contains_known_repeated_templates(self):
        self.assertIn(
            "verify important inputs with the original provider or official source",
            AUDIT.SHARED_EDITORIAL_BOILERPLATE,
        )
        self.assertIn(
            "real results may change with rates fees timing usage eligibility and factors outside the model",
            AUDIT.SHARED_EDITORIAL_BOILERPLATE,
        )
        self.assertLessEqual(len(AUDIT.SHARED_EDITORIAL_BOILERPLATE), 20)


if __name__ == "__main__":
    unittest.main(verbosity=2)
