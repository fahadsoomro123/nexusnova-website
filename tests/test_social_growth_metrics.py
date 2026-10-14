from pathlib import Path
import json
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))

import social_growth_metrics as metrics  # noqa: E402


class SocialCampaignMeasurementTests(unittest.TestCase):
    def test_recognizes_both_nexusnova_social_campaign_families(self):
        self.assertEqual(metrics.campaign_family("social_growth_20261014_tool"), "social-growth")
        self.assertEqual(metrics.campaign_family("premium_social_20261014_s1_tool"), "premium-social")
        self.assertIsNone(metrics.campaign_family("organic_search"))
        self.assertIsNone(metrics.campaign_family("(not set)"))

    def test_ga4_feedback_includes_premium_and_social_growth_campaigns(self):
        response = {
            "rows": [
                {
                    "dimensionValues": [{"value": "social_growth_20261014_ai-token-calculator"}],
                    "metricValues": [{"value": "1"}, {"value": "0"}, {"value": "1"}],
                },
                {
                    "dimensionValues": [{"value": "premium_social_20261014_s1_example-tool"}],
                    "metricValues": [{"value": "3"}, {"value": "2"}, {"value": "5"}],
                },
                {
                    "dimensionValues": [{"value": "organic_search"}],
                    "metricValues": [{"value": "999"}, {"value": "900"}, {"value": "1800"}],
                },
            ]
        }
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "metrics.json"
            diagnosis = Path(temp) / "diagnosis.json"
            diagnosis.write_text("{}", encoding="utf-8")
            with patch.object(metrics, "google_token", return_value=("fake-token", None)):
                with patch.object(metrics, "post_json", return_value=response):
                    with patch.object(metrics, "OUT", output), patch.object(metrics, "TRAFFIC", diagnosis):
                        metrics.main()
            payload = json.loads(output.read_text(encoding="utf-8"))
            by_name = {row["dimension"]: row for row in payload["campaigns"]}
            self.assertEqual(set(by_name), {
                "social_growth_20261014_ai-token-calculator",
                "premium_social_20261014_s1_example-tool",
            })
            self.assertEqual(by_name["premium_social_20261014_s1_example-tool"]["campaign_family"], "premium-social")
            self.assertEqual(by_name["premium_social_20261014_s1_example-tool"]["sessions"], 3.0)
            self.assertEqual(by_name["premium_social_20261014_s1_example-tool"]["engagedSessions"], 2.0)
            self.assertEqual(by_name["premium_social_20261014_s1_example-tool"]["engagementRate"], 66.7)
            saved = json.loads(diagnosis.read_text(encoding="utf-8"))
            self.assertEqual(saved["social_growth_metrics"]["campaign_count"], 2)


if __name__ == "__main__":
    unittest.main()
