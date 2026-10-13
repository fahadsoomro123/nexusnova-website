from __future__ import annotations

import json
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".github" / "scripts"))
import update_live_tech_pulse as updater


class LiveTechPulseRefreshTests(unittest.TestCase):
    def setUp(self) -> None:
        self.now = datetime(2026, 10, 13, 12, 0, tzinfo=timezone.utc)

    def row(self, index: int, *, url: str | None = None, published: datetime | None = None) -> dict:
        return {
            "name": "Google Search Central",
            "url": url or f"https://developers.google.com/search/blog/fresh-story-{index}",
            "title": f"Fresh official search update {index}",
            "summary": "An official update with specific source details.",
            "published": published or self.now - timedelta(days=1),
            "category": "Search & SEO",
            "weight": 5,
            "score": 15,
        }

    def test_builds_current_payload_from_fresh_official_sources(self) -> None:
        rows = [
            self.row(1),
            self.row(2),
            self.row(3),
            self.row(4, published=self.now - timedelta(days=40)),
            self.row(5, url="https://example.com/not-an-official-source"),
            self.row(6, url="http://developers.google.com/insecure"),
        ]
        missing_date = self.row(7)
        missing_date["published"] = None
        rows.append(missing_date)

        payload = updater.build_payload(rows, self.now)

        self.assertEqual(payload["version"], 1)
        self.assertEqual(len(payload["items"]), 3)
        self.assertEqual(payload["top_stories"], payload["items"][:3])
        self.assertEqual(payload["generated_at"], "2026-10-13T12:00:00Z")
        self.assertTrue(all(item["source"] == "Google Search Central" for item in payload["items"]))
        self.assertFalse(any("example.com" in item["url"] for item in payload["items"]))

    def test_rejects_fewer_than_three_fresh_items(self) -> None:
        with self.assertRaisesRegex(ValueError, "at least 3 are required"):
            updater.build_payload([self.row(1), self.row(2)], self.now)

    def test_rejects_duplicate_urls_before_minimum_count(self) -> None:
        same_url = "https://developers.google.com/search/blog/duplicate"
        rows = [self.row(1, url=same_url), self.row(2, url=same_url), self.row(3, url=same_url)]
        with self.assertRaisesRegex(ValueError, "at least 3 are required"):
            updater.build_payload(rows, self.now)

    def test_does_not_overwrite_previous_payload_when_freshness_gate_fails(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "live-tech-pulse.json"
            original = '{"keep_existing_payload": true}\n'
            path.write_text(original, encoding="utf-8")
            with self.assertRaises(ValueError):
                updater.refresh_from_rows([self.row(1), self.row(2)], self.now, path)
            self.assertEqual(path.read_text(encoding="utf-8"), original)
            self.assertFalse(path.with_name(path.name + ".tmp").exists())

    def test_writes_valid_json_atomically_after_validation(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "live-tech-pulse.json"
            payload = updater.refresh_from_rows([self.row(1), self.row(2), self.row(3)], self.now, path)
            saved = json.loads(path.read_text(encoding="utf-8"))
            self.assertEqual(saved, payload)
            self.assertEqual(len(saved["items"]), 3)
            self.assertTrue(saved["generated_at"].endswith("Z"))


if __name__ == "__main__":
    unittest.main()
