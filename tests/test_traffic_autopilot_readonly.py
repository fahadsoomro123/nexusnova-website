from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

SCRIPTS = Path(__file__).resolve().parents[1] / ".github" / "scripts"
sys.path.insert(0, str(SCRIPTS))
import traffic_autopilot_runner as runner  # noqa: E402
import traffic_diagnosis as diagnosis  # noqa: E402
from ga4_site_scope import production_scoped_ga4_payload  # noqa: E402


class TrafficAutopilotReadOnlyTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.article = self.root / "articles" / "sample.html"
        self.article.parent.mkdir(parents=True)
        self.article.write_text(
            '<!doctype html><html><head><meta name="robots" content="index,follow,max-image-preview:large"></head><body>Sample</body></html>',
            encoding="utf-8",
        )
        self.url = "https://nexusnovatools.com/articles/sample.html"
        self.sitemap = self.root / "sitemap.xml"
        self.sitemap.write_text(
            '<?xml version="1.0"?><urlset><url><loc>'
            + self.url
            + "</loc><lastmod>2026-10-01</lastmod></url></urlset>\n",
            encoding="utf-8",
        )
        self.history = {
            "version": 1,
            "articles": [
                {
                    "path": "articles/sample.html",
                    "url": self.url,
                    "reviewed": True,
                }
            ],
        }
        self.root_patch = mock.patch.object(runner.core, "ROOT", self.root)
        self.root_patch.start()

    def tearDown(self) -> None:
        self.root_patch.stop()
        self.temp_dir.cleanup()

    def test_default_editorial_plan_does_not_mutate_article_or_sitemap(self) -> None:
        original_article = self.article.read_text(encoding="utf-8")
        original_sitemap = self.sitemap.read_text(encoding="utf-8")

        reviewed_history, report = runner.apply_editorial_review_state(self.history)
        proposed_removals = runner.sync_primary_sitemap(self.history)

        self.assertEqual(report["write_mode"], "dry_run")
        self.assertEqual(report["errors"], [])
        self.assertEqual(report["quarantined_pages_changed"], [])
        self.assertEqual(report["quarantined_pages_proposed"], ["articles/sample.html"])
        self.assertEqual(reviewed_history["articles"], [])
        self.assertEqual(proposed_removals, [self.url])
        self.assertEqual(self.article.read_text(encoding="utf-8"), original_article)
        self.assertEqual(self.sitemap.read_text(encoding="utf-8"), original_sitemap)

    def test_explicit_apply_mutates_only_the_isolated_fixture(self) -> None:
        _, report = runner.apply_editorial_review_state(self.history, apply_changes=True)
        removed = runner.sync_primary_sitemap(self.history, apply_changes=True)

        self.assertEqual(report["write_mode"], "explicit_apply")
        self.assertEqual(report["quarantined_pages_changed"], ["articles/sample.html"])
        self.assertEqual(removed, [self.url])
        article_text = self.article.read_text(encoding="utf-8").lower()
        self.assertIn('name="robots" content="noindex,follow,max-image-preview:large"', article_text)
        self.assertNotIn(self.url, self.sitemap.read_text(encoding="utf-8"))


    def test_ga4_report_scope_keeps_requested_dimensions_and_filters_canonical_host(self) -> None:
        original = {
            "dateRanges": [{"startDate": "2026-10-06", "endDate": "2026-10-12"}],
            "dimensions": [{"name": "landingPagePlusQueryString"}],
            "metrics": [{"name": "sessions"}],
        }
        scoped = production_scoped_ga4_payload(original)
        self.assertEqual(
            scoped["dimensions"],
            [{"name": "landingPagePlusQueryString"}, {"name": "hostName"}],
        )
        self.assertEqual(
            scoped["dimensionFilter"],
            {
                "filter": {
                    "fieldName": "hostName",
                    "stringFilter": {
                        "matchType": "EXACT",
                        "value": "nexusnovatools.com",
                        "caseSensitive": False,
                    },
                }
            },
        )
        self.assertNotIn("dimensionFilter", original)

    def test_traffic_diagnosis_applies_hostname_scope_to_each_ga4_report(self) -> None:
        from datetime import date

        with mock.patch.object(diagnosis, "GA4_PROPERTY_ID", "123"), mock.patch.object(
            diagnosis, "post_json", return_value={"rows": []}
        ) as post:
            diagnosis.ga4_report(
                "test-token",
                date(2026, 10, 6),
                date(2026, 10, 12),
                dimensions=["sessionSourceMedium"],
                metrics=["sessions"],
            )

        payload = post.call_args.args[1]
        self.assertEqual(
            payload["dimensions"],
            [{"name": "sessionSourceMedium"}, {"name": "hostName"}],
        )
        self.assertEqual(payload["dimensionFilter"]["filter"]["fieldName"], "hostName")
        self.assertEqual(
            payload["dimensionFilter"]["filter"]["stringFilter"]["value"],
            "nexusnovatools.com",
        )

    def test_traffic_autopilot_ga4_query_uses_shared_production_scope(self) -> None:
        source = (SCRIPTS / "traffic_autopilot.py").read_text(encoding="utf-8")
        self.assertIn("payload = production_scoped_ga4_payload({", source)

    def test_path_traversal_is_rejected_without_writing(self) -> None:
        outside = self.root / "outside.html"
        outside.write_text(
            '<html><head><meta name="robots" content="index,follow"></head></html>',
            encoding="utf-8",
        )
        history = {
            "articles": [
                {
                    "path": "../outside.html",
                    "url": "https://nexusnovatools.com/outside.html",
                    "reviewed": False,
                }
            ]
        }

        _, report = runner.apply_editorial_review_state(history)
        self.assertEqual(report["errors"], ["../outside.html: outside articles directory"])
        self.assertIn('content="index,follow"', outside.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
