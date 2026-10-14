from pathlib import Path
import sys
import unittest
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))

import premium_social_resilient as resilient  # noqa: E402
import publish_premium_social as publisher  # noqa: E402
import premium_telegram_publish as telegram  # noqa: E402


class PremiumSocialFallbackTests(unittest.TestCase):
    def test_native_visual_has_delivery_dimensions_and_color(self):
        image = resilient._native_background("PDF merge online document tool", 123)
        self.assertEqual(image.size, (1536, 1920))
        self.assertEqual(image.mode, "RGB")

    def test_topic_changes_the_visual_not_only_the_caption(self):
        pdf = resilient._native_background("PDF merge online document tool", 91)
        qr = resilient._native_background("QR code scan tool", 91)
        self.assertIsNotNone(ImageChops.difference(pdf, qr).getbbox())

    def test_provider_outage_uses_topic_matched_native_visual(self):
        with patch.object(resilient, "_original_download", side_effect=RuntimeError("provider unavailable")):
            with patch.object(resilient, "_cached_ai", return_value=None):
                image, provider = resilient.resilient_download("calendar date calculator", 7)
        self.assertEqual(provider, "emergency-branded")
        self.assertEqual(image.size, (1536, 1920))

    def test_exact_cached_ai_has_priority_over_native_fallback(self):
        cached = Image.new("RGB", (768, 960), (13, 25, 44))
        with patch.object(resilient, "_original_download", side_effect=RuntimeError("provider unavailable")):
            with patch.object(resilient, "_cached_ai", return_value=(cached, "cached-ai-exact")):
                image, provider = resilient.resilient_download("same visual prompt", 8)
        self.assertIs(image, cached)
        self.assertEqual(provider, "cached-ai-exact")

    def test_fallback_is_not_mislabeled_as_ai(self):
        campaign = (ROOT / ".github" / "scripts" / "premium_social_campaign.py").read_text(encoding="utf-8")
        workflow = (ROOT / ".github" / "workflows" / "premium-social-daily.yml").read_text(encoding="utf-8")
        self.assertIn('visual_label = "NATIVE VISUAL" if image_provider == "emergency-branded" else "AI VISUAL"', campaign)
        self.assertIn("'emergency-branded'", workflow)
        self.assertIn("topic-matched native creative required", workflow)


class PremiumSocialTrafficLinkTests(unittest.TestCase):
    def test_all_scheduled_slots_are_link_enabled(self):
        # Slot 2/4 previously omitted tracked URLs, turning successful publishing into
        # follower-only activity instead of website referral traffic.
        self.assertEqual(publisher.NATIVE_GROWTH_SLOTS, set())
        self.assertEqual(telegram.NATIVE_GROWTH_SLOTS, set())

    def test_tracked_urls_keep_campaign_and_slot_utm_across_platforms(self):
        item = {
            "url": "https://nexusnovatools.com/guides/unit-conversion.html",
            "campaign": "premium_social_20261014_s4_unit-conversion-made-practic",
            "utm_content": "premium_s4",
        }
        expected_campaign = item["campaign"]
        for source in ("x", "facebook", "instagram"):
            tracked = publisher.tracked_url(item, source)
            query = parse_qs(urlsplit(tracked).query)
            self.assertEqual(query["utm_source"], [source])
            self.assertEqual(query["utm_medium"], ["social"])
            self.assertEqual(query["utm_campaign"], [expected_campaign])
            self.assertEqual(query["utm_content"], ["premium_s4"])

        message, tracked = telegram.build_message(
            {
                **item,
                "slot": 4,
                "platform_copy": {"telegram": "Use the unit conversion guide and verify the formula."},
                "hashtags": ["UnitConversion"],
            },
            recovery_only=False,
        )
        query = parse_qs(urlsplit(tracked).query)
        self.assertIn(tracked, message)
        self.assertEqual(query["utm_source"], ["telegram"])
        self.assertEqual(query["utm_medium"], ["social"])
        self.assertEqual(query["utm_campaign"], [expected_campaign])
        self.assertEqual(query["utm_content"], ["premium_s4"])


if __name__ == "__main__":
    unittest.main()
