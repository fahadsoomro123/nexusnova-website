from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[1] / ".github" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import search_growth_autopilot as growth  # noqa: E402


class SearchGrowthOpportunityTests(unittest.TestCase):
    def setUp(self) -> None:
        self.page = "https://nexusnovatools.com/steam-playtime-calculator.html"
        self.valid_file = Path(__file__)

    def row(self, *, query: str, page: str | None = None, impressions: float = 50,
            clicks: float = 0, ctr: float = 0, position: float = 7.2) -> dict:
        return {
            "keys": [query, page or self.page],
            "impressions": impressions,
            "clicks": clicks,
            "ctr": ctr,
            "position": position,
        }

    def test_ctr_report_flags_low_ctr_queries_visible_in_top_twenty(self) -> None:
        rows = [
            self.row(query="steam playtime calculator", impressions=166, ctr=0, position=7.2),
            self.row(query="playtime calculator hours", impressions=15, ctr=0, position=12.0),
        ]
        with mock.patch.object(growth, "local_file_for", return_value=self.valid_file):
            opportunities = growth.build_ctr_opportunities(rows)

        self.assertEqual([x["impressions"] for x in opportunities], [166.0, 15.0])
        self.assertTrue(all(x["opportunity_type"] == "low_ctr_high_visibility" for x in opportunities))
        self.assertEqual(opportunities[0]["confidence"], "moderate")
        self.assertEqual(opportunities[1]["confidence"], "very-low")
        self.assertEqual(opportunities[0]["page"], self.page)

    def test_ctr_report_excludes_insufficient_or_irrelevant_rows(self) -> None:
        rows = [
            self.row(query="too few impressions", impressions=9, ctr=0, position=7),
            self.row(query="position too low", impressions=90, ctr=0, position=35),
            self.row(query="healthy ctr", impressions=90, ctr=0.04, position=7),
        ]
        with mock.patch.object(growth, "local_file_for", return_value=self.valid_file):
            self.assertEqual(growth.build_ctr_opportunities(rows), [])

    def test_ranking_optimizer_candidates_remain_separate_and_stricter(self) -> None:
        rows = [
            self.row(query="strong ctr candidate", impressions=166, ctr=0, position=7.2),
            self.row(query="ranking candidate", impressions=25, ctr=0, position=22),
        ]
        with mock.patch.object(growth, "local_file_for", return_value=self.valid_file), mock.patch.object(
            growth, "MIN_IMPRESSIONS", 20
        ):
            opportunities = growth.build_opportunities(rows)
        self.assertEqual(len(opportunities), 1)
        self.assertEqual(opportunities[0]["query"], "ranking candidate")
        self.assertNotIn("opportunity_type", opportunities[0])


if __name__ == "__main__":
    unittest.main()
