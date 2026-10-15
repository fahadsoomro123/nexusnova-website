from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))

import social_growth_engine as engine  # noqa: E402
import today_traffic_pulse as pulse  # noqa: E402


class WesternOrganicDistributionTests(unittest.TestCase):
    def test_curated_destinations_are_existing_canonical_indexable_pages(self) -> None:
        self.assertGreaterEqual(len(engine.WESTERN_EVERGREEN_TOOLS), 8)
        for row in engine.WESTERN_EVERGREEN_TOOLS:
            with self.subTest(path=row["path"]):
                url = engine.SITE + row["path"]
                self.assertTrue(engine.is_public_indexable_page(url))
                self.assertNotIn(row["path"], engine.GENERIC_SOCIAL_HUBS)

    def test_generated_or_generic_pages_are_never_campaign_destinations(self) -> None:
        self.assertFalse(engine.is_public_indexable_page(engine.SITE + "/articles.html"))
        self.assertFalse(engine.is_public_indexable_page(engine.SITE + "/not-a-real-tool.html"))
        self.assertFalse(engine.is_public_indexable_page("https://example.com/jpg-to-pdf.html"))

    def test_fallback_pool_contains_specific_evergreen_tasks(self) -> None:
        pool = engine.build_candidates()
        for row in engine.WESTERN_EVERGREEN_TOOLS:
            with self.subTest(path=row["path"]):
                self.assertIn(engine.SITE + row["path"], pool)
                self.assertTrue(pool[engine.SITE + row["path"]]["summary"])

    def test_us_letter_pdf_copy_matches_actual_tool_options(self) -> None:
        item = {
            "title": "JPG to PDF Converter",
            "summary": next(
                row["summary"] for row in engine.WESTERN_EVERGREEN_TOOLS
                if row["path"] == "/jpg-to-pdf.html"
            ),
            "url": engine.SITE + "/jpg-to-pdf.html",
        }
        copy = engine.build_copy(item, "tool_demo")
        self.assertIn("US Letter", copy["hook"])
        self.assertIn("US Letter", copy["platform_copy"]["facebook"])
        self.assertIn("Legal or A4", copy["platform_copy"]["facebook"])

    def test_country_report_queries_a_settled_seven_day_window(self) -> None:
        sample = {
            "rows": [
                {
                    "dimensionValues": [{"value": "United States"}],
                    "metricValues": [{"value": "14"}],
                },
                {
                    "dimensionValues": [{"value": "United Kingdom"}],
                    "metricValues": [{"value": "6"}],
                },
            ]
        }
        with patch.object(pulse, "run_report", return_value=sample) as mocked:
            rows = pulse.top_countries_last_7d("test-token")
        mocked.assert_called_once_with(
            "test-token",
            "7daysAgo",
            "yesterday",
            ["sessions"],
            ["country"],
            limit=12,
        )
        self.assertEqual(rows[0], {"country": "United States", "sessions": 14.0})
        self.assertEqual(rows[1], {"country": "United Kingdom", "sessions": 6.0})


    def test_main_branch_push_runs_the_guarded_distribution_job(self) -> None:
        workflow = (ROOT / ".github" / "workflows" / "western-organic-distribution.yml").read_text(encoding="utf-8")
        distribution = workflow.split("  distribute:", 1)[1]
        condition = next(line.strip() for line in distribution.splitlines() if line.strip().startswith("if:"))
        self.assertIn("github.event_name == 'schedule'", condition)
        self.assertIn("github.event_name == 'push'", condition)
        self.assertIn("github.ref == 'refs/heads/main'", condition)
        for safety_gate in (
            "Prevent duplicate successful campaigns on the same UTC day",
            "Verify safe live destination and remove unpublished media links",
            "Wait for exact destination HTML to reach production",
            "Require at least one successful destination",
        ):
            with self.subTest(safety_gate=safety_gate):
                self.assertIn(safety_gate, distribution)


if __name__ == "__main__":
    unittest.main(verbosity=2)
