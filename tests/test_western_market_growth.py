from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / ".github" / "scripts"
sys.path.insert(0, str(SCRIPTS))

import distribute_update  # noqa: E402
import social_growth_engine  # noqa: E402
import traffic_diagnosis  # noqa: E402


class WesternMarketGrowthTests(unittest.TestCase):
    def test_gsc_query_adds_a_country_filter(self):
        start = date(2026, 10, 1)
        end = date(2026, 10, 7)
        with mock.patch.object(traffic_diagnosis, "post_json", return_value={}) as post:
            traffic_diagnosis.gsc_query(
                "token",
                start,
                end,
                dimensions=["page"],
                row_limit=100,
                country="USA",
            )

        payload = post.call_args.args[1]
        self.assertEqual(
            payload["dimensionFilterGroups"][0]["filters"][0],
            {
                "dimension": "country",
                "operator": "equals",
                "expression": "usa",
            },
        )

    def test_western_country_page_signals_are_aggregated_with_market_breakdown(self):
        url = "https://nexusnovatools.com/jpg-to-pdf.html"
        values = {
            "USA": [{"keys": [url], "clicks": 2, "impressions": 80, "ctr": 0.025, "position": 5}],
            "GBR": [{"keys": [url], "clicks": 1, "impressions": 20, "ctr": 0.05, "position": 4}],
        }

        def fake_query(token, start, end, dimensions=None, row_limit=250, country=None):
            return {"rows": values.get(country, [])}

        with mock.patch.object(traffic_diagnosis, "gsc_query", side_effect=fake_query):
            rows, errors = traffic_diagnosis.gsc_western_page_signals(
                "token",
                date(2026, 10, 1),
                date(2026, 10, 7),
            )

        self.assertEqual(errors, [])
        row = next(item for item in rows if item["page"] == url)
        self.assertEqual(row["clicks"], 3)
        self.assertEqual(row["impressions"], 100)
        self.assertEqual(row["ctr"], 3.0)
        self.assertEqual(row["markets"], ["GBR", "USA"])
        self.assertEqual(row["market_breakdown"]["USA"]["clicks"], 2)

    def test_social_growth_uses_western_search_console_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            page = root / "jpg-to-pdf.html"
            page.write_text(
                '<html><head><title>JPG to PDF Converter</title>'
                '<meta name="description" content="Convert JPEG images to PDF with A4, US Letter and Legal options.">'
                '<link rel="canonical" href="https://nexusnovatools.com/jpg-to-pdf.html">'
                '</head><body><script type="application/ld+json">{"@type":"WebApplication"}</script></body></html>',
                encoding="utf-8",
            )
            traffic_path = root / "traffic.json"
            traffic_path.write_text(
                json.dumps({
                    "gsc": {
                        "western_market_pages": [{
                            "page": "https://nexusnovatools.com/jpg-to-pdf.html",
                            "clicks": 3,
                            "impressions": 100,
                            "markets": ["GBR", "USA"],
                        }],
                        "page_movers": {"gains": []},
                    },
                    "ga4": {"landing_pages": []},
                }),
                encoding="utf-8",
            )
            empty = root / "empty.json"
            with mock.patch.object(social_growth_engine, "ROOT", root), \
                 mock.patch.object(social_growth_engine, "ARTICLE", empty), \
                 mock.patch.object(social_growth_engine, "PULSE", empty), \
                 mock.patch.object(social_growth_engine, "TRAFFIC", traffic_path), \
                 mock.patch.object(social_growth_engine, "tracked_paths", return_value={"jpg-to-pdf.html"}):
                candidates = social_growth_engine.build_candidates()

        candidate = candidates["https://nexusnovatools.com/jpg-to-pdf.html"]
        self.assertEqual(candidate["source"], "western_market_gsc")
        self.assertTrue(any("USA, GBR" in reason or "GBR, USA" in reason for reason in candidate["reasons"]))
        self.assertGreaterEqual(candidate["score"], 90)

    def test_text_link_campaign_never_attaches_a_stale_image(self):
        item = {"instagram_image": "https://nexusnovatools.com/assets/generated/old-campaign.jpg"}
        with mock.patch.dict(os.environ, {"NEXUSNOVA_SOCIAL_TEXT_ONLY": "1"}):
            self.assertEqual(distribute_update.social_image_url(item), "")
        with mock.patch.dict(os.environ, {"NEXUSNOVA_SOCIAL_TEXT_ONLY": "0"}):
            self.assertEqual(distribute_update.social_image_url(item), item["instagram_image"])


if __name__ == "__main__":
    unittest.main()
