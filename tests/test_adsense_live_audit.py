#!/usr/bin/env python3
"""Regression tests for live URL cache-busting in the AdSense reviewer audit."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "adsense_reviewer_audit", ROOT / "adsense_reviewer_audit.py"
)
AUDIT = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(AUDIT)


class FakeResponse:
    status = 200

    def __init__(self, url: str) -> None:
        self._url = url

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self) -> bytes:
        return b"<html><title>Fresh fixture</title></html>"

    def geturl(self) -> str:
        return self._url


class LiveAuditCacheBustTests(unittest.TestCase):
    @patch.object(AUDIT.urllib.request, "urlopen")
    def test_live_request_preserves_logical_url_and_adds_unique_no_cache_query(self, urlopen):
        original = "https://nexusnovatools.com/image-resizer.html?source=fixture"
        captured = []

        def fake_urlopen(request, timeout):
            captured.append((request, timeout))
            return FakeResponse(request.full_url)

        urlopen.side_effect = fake_urlopen

        first = AUDIT.fetch_live(original)
        second = AUDIT.fetch_live(original)

        self.assertEqual(first[0], original)
        self.assertEqual(second[0], original)
        self.assertEqual(first[1], 200)
        self.assertEqual(second[1], 200)
        self.assertEqual(first[3], "<html><title>Fresh fixture</title></html>")
        self.assertEqual(first[4], "")
        self.assertEqual(len(captured), 2)

        request_a, timeout_a = captured[0]
        request_b, timeout_b = captured[1]
        query_a = parse_qs(urlsplit(request_a.full_url).query)
        query_b = parse_qs(urlsplit(request_b.full_url).query)
        self.assertEqual(query_a.get("source"), ["fixture"])
        self.assertEqual(query_b.get("source"), ["fixture"])
        self.assertTrue(query_a.get("nn_audit", [""])[0])
        self.assertTrue(query_b.get("nn_audit", [""])[0])
        self.assertNotEqual(query_a["nn_audit"], query_b["nn_audit"])
        self.assertEqual(timeout_a, 25)
        self.assertEqual(timeout_b, 25)

        for request, _ in captured:
            headers = {name.lower(): value.lower() for name, value in request.header_items()}
            self.assertIn("no-store", headers["cache-control"])
            self.assertEqual(headers["pragma"], "no-cache")
            self.assertIn("NexusNova-AdSense-Reviewer-Audit/3.0", request.get_header("User-agent"))

        self.assertIn("nn_audit=", first[2])
        self.assertIn("nn_audit=", second[2])


    def test_approved_noindex_plan_has_72_live_audit_targets(self):
        targets = AUDIT.approved_noindex_urls()
        self.assertEqual(len(targets), 72)
        self.assertIn(AUDIT.BASE + "aqi-live.html", targets)
        self.assertIn(AUDIT.BASE + "crypto-live.html", targets)

    @patch.object(AUDIT, "approved_noindex_urls", return_value=["https://nexusnovatools.com/quarantine-fixture.html"])
    @patch.object(AUDIT, "fetch_live")
    def test_live_audit_blocks_a_quarantined_page_if_robots_says_index(self, fetch_live, _approved_urls):
        quarantined = "https://nexusnovatools.com/quarantine-fixture.html"

        def fake_live(url):
            if url.endswith(("robots.txt", "ads.txt")):
                return url, 200, url, "", ""
            if url == quarantined:
                body = '<html><head><meta name="robots" content="index,follow"></head><main><h1>Fixture</h1></main></html>'
            else:
                body = '<html><head><meta name="robots" content="noindex,follow"></head><main><h1>Fixture</h1></main></html>'
            return url, 200, url, body, ""

        fetch_live.side_effect = fake_live
        result = AUDIT.live_audit([])

        self.assertEqual(result["approved_noindex_targets"], 1)
        self.assertIn(
            {"type": "live_noindex_policy_violation", "url": quarantined},
            result["blockers"],
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
