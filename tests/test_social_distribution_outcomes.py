from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))

import distribute_social_growth as publisher  # noqa: E402
import distribute_update as base  # noqa: E402


class SocialDistributionOutcomeTests(unittest.TestCase):
    def test_telegram_records_campaign_id_message_id_and_public_post_url(self) -> None:
        row = publisher.build_delivery_outcome(
            "telegram",
            {
                "posted": True,
                "response": {
                    "ok": True,
                    "result": {
                        "message_id": 812,
                        "chat": {"id": -100123, "username": "NexusNovaTools"},
                    },
                },
            },
            "social_growth_western_20261015_jpg_to_pdf",
            "text/link fallback",
        )
        self.assertTrue(row["ok"])
        self.assertEqual(row["delivery_state"], "published")
        self.assertEqual(row["campaign"], "social_growth_western_20261015_jpg_to_pdf")
        self.assertEqual(row["post_id"], "812")
        self.assertEqual(row["post_url"], "https://t.me/NexusNovaTools/812")

    def test_x_provider_post_id_is_extracted_without_raw_response(self) -> None:
        row = publisher.build_delivery_outcome(
            "x",
            {"posted": True, "response": {"data": {"id": "1900123456789", "text": "hello"}}},
            "campaign-1",
            "text/link fallback",
        )
        self.assertTrue(row["ok"])
        self.assertEqual(row["post_id"], "1900123456789")
        self.assertNotIn("response", row)
        self.assertNotIn("text", row)

    def test_buffer_queue_is_not_mislabeled_as_published(self) -> None:
        row = publisher.build_delivery_outcome(
            "x",
            {
                "posted": True,
                "provider": "buffer",
                "response": {
                    "id": "buffer-post-445",
                    "status": "pending",
                    "dueAt": "2026-10-15T12:00:00.000Z",
                    "text": "campaign copy",
                },
            },
            "campaign-2",
            "Buffer queue · text/link fallback",
        )
        self.assertTrue(row["ok"])
        self.assertEqual(row["delivery_state"], "queued")
        self.assertEqual(row["post_id"], "buffer-post-445")
        self.assertEqual(row["provider_status"], "pending")
        self.assertEqual(row["scheduled_for"], "2026-10-15T12:00:00.000Z")
        self.assertNotIn("post_url", row)

    def test_provider_error_and_missing_credentials_are_failures(self) -> None:
        failed_api = publisher.build_delivery_outcome(
            "telegram",
            {"posted": True, "response": {"ok": False, "description": "chat not found"}},
            "campaign-3",
            "chat not found",
        )
        missing = publisher.build_delivery_outcome("x", None, "campaign-3", "not configured")
        self.assertFalse(failed_api["ok"])
        self.assertEqual(failed_api["delivery_state"], "failed")
        self.assertFalse(missing["ok"])
        self.assertEqual(missing["delivery_state"], "failed")

    def test_private_or_unknown_hosts_are_not_saved_as_post_urls(self) -> None:
        row = publisher.build_delivery_outcome(
            "facebook",
            {
                "posted": True,
                "response": {
                    "id": "page_445",
                    "permalink_url": "https://example.invalid/internal?access_token=secret",
                    "access_token": "must-not-be-copied",
                },
            },
            "campaign-4",
        )
        self.assertTrue(row["ok"])
        self.assertEqual(row["post_id"], "page_445")
        self.assertNotIn("post_url", row)
        self.assertNotIn("access_token", str(row))
        self.assertNotIn("secret", str(row))

    def test_error_details_redact_token_values(self) -> None:
        detail = publisher.safe_error(
            RuntimeError("HTTP 403: access_token=SECRET123 Bearer abc.def/ghi")
        )
        self.assertNotIn("SECRET123", detail)
        self.assertNotIn("abc.def/ghi", detail)
        self.assertIn("[redacted]", detail)

    def test_instagram_published_media_identifier_is_returned(self) -> None:
        with (
            patch.object(base, "social_image_url", return_value="https://nexusnovatools.com/assets/generated/campaign.jpg"),
            patch.object(base, "wait_for_public_image", return_value=True),
            patch.object(base, "post_form", side_effect=[{"id": "container-9"}, {"id": "instagram-post-9"}]),
            patch.object(base, "get_json", return_value={"status_code": "FINISHED", "status": "Finished"}),
        ):
            result = base.post_instagram(
                {"title": "Useful image tool", "summary": "A concrete task", "hashtags": ["NexusNova"]},
                {"instagram_id": "ig-1", "page_token": "test-token"},
                "https://nexusnovatools.com/jpg-to-pdf.html?utm_source=instagram",
            )
        self.assertTrue(result["posted"])
        self.assertEqual(result["creation_id"], "container-9")
        self.assertEqual(result["response"]["id"], "instagram-post-9")
        outcome = publisher.build_delivery_outcome("instagram", result, "campaign-5")
        self.assertEqual(outcome["post_id"], "instagram-post-9")
        self.assertEqual(outcome["delivery_state"], "published")


if __name__ == "__main__":
    unittest.main(verbosity=2)
