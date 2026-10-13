#!/usr/bin/env python3
"""Offline tests for source-backed article draft safeguards."""
from __future__ import annotations

import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".github" / "scripts"))
import traffic_autopilot_editorial_guard as guard


def candidate():
    return {
        "title": "Chrome for Android security update",
        "summary": "Chrome Android browser fixes address security issues and version-specific compatibility checks.",
        "url": "https://chromereleases.googleblog.com/2026/10/chrome-android-security.html",
        "name": "Chrome Releases",
    }


def draft():
    paragraphs = [
        "Chrome for Android release notes identify the specific browser build and platform scope that the announcement covers. Open Chrome settings, locate About Chrome, and record the installed version. Compare this number with the Android-specific entry in the official Chrome release record rather than a desktop version. Release availability can vary by device and rollout schedule, so a general announcement alone does not prove every phone has received the build.",
        "Version comparisons are more reliable when platform, release channel, and date are considered together. A Chrome desktop Stable announcement may be published near an Android release while using a different build number. Keep those records separate when checking a reported problem, and do not assign a desktop security fix to Android unless the official source explicitly lists Android. When details are missing, record that limitation instead of inferring affected devices.",
        "Before troubleshooting a Chrome Android issue, record device model, Android version, Chrome build, and exact error text. Those details help separate a rollout delay from an app-specific or operating-system issue. If the published notes name a minimum version or affected channel, compare the installed build against that condition. Do not sideload packages from unofficial mirrors to force an update; use the trusted app distribution route and linked release details.",
        "If Chrome Android behaves differently after an update, first establish whether the same issue can be reproduced with the installed build. Record whether the problem affects one website or all browsing, then compare the result with the version-specific notes. That evidence is more useful than assuming a release caused an unrelated error. Avoid deleting profile data or changing security settings until the issue is understood.",
        "Managed Android devices may receive application updates on a schedule controlled by an organization. Check its supported update path and release policy before manually changing the browser build. A public Stable release note does not prove that every managed device should update immediately. If the source identifies a staged rollout, communicate the specific build and scope rather than describing the change as universally available.",
        "When documenting a possible security fix in Chrome for Android, separate confirmed source facts from local observations. Keep the official release URL, the device's Chrome build, the Android version, and any repeatable error. If the release notice does not name an affected platform or impact, do not infer those details. Recheck the official page for corrections before treating the initial report as definitive."
    ];
    return {
        "publish": True,
        "title": "Chrome for Android Security Update: Version Checks",
        "description": "Check the Chrome for Android build against official release details and record the device version before troubleshooting compatibility or security concerns.",
        "deck": "A practical way to verify a Chrome Android browser build against the official release record without assuming every device updates at the same time.",
        "sections": [
            {"heading": "Verify the Chrome Android build", "paragraphs": [paragraphs[0], paragraphs[1]]},
            {"heading": "Compare the correct release channel", "paragraphs": [paragraphs[2], paragraphs[3]]},
            {"heading": "Record details before troubleshooting", "paragraphs": [paragraphs[4], paragraphs[5]]},
        ],
        "steps": [
            "Open Chrome settings on Android, note the exact build, and compare it with the Android-specific official release record.",
            "After an available update completes, recheck the Chrome Android build and keep the Android version with any issue report.",
        ],
        "source_label": "Chrome Releases",
    }


class ArticleDraftGuardTests(unittest.TestCase):
    def test_official_source_host_is_allowed(self):
        self.assertTrue(guard.approved_source(candidate()["name"], candidate()["url"]))

    def test_http_or_unapproved_hosts_are_rejected(self):
        self.assertFalse(guard.approved_source("Chrome Releases", "http://chromereleases.googleblog.com/post"))
        self.assertFalse(guard.approved_source("Chrome Releases", "https://example.org/post"))

    def test_title_repeating_headings_are_rejected(self):
        self.assertTrue(guard.generic_heading("Next steps — Chrome for Android Security Update: Version Checks", draft()["title"]))
        self.assertTrue(guard.generic_heading("Make this update useful — Chrome for Android", draft()["title"]))

    def test_substantive_source_grounded_draft_passes_offline(self):
        reason = guard.reject_reason(draft(), candidate(), "official source details " * 100, [])
        self.assertIsNone(reason, reason)

    def test_generic_heading_rejects_draft_before_generation(self):
        data = draft()
        data["sections"][2]["heading"] = "Next steps — " + data["title"]
        reason = guard.reject_reason(data, candidate(), "official source details " * 100, [])
        self.assertIn("generic title-repeating", reason)

    def test_thin_draft_is_rejected(self):
        data = draft()
        data["sections"] = data["sections"][:2]
        reason = guard.reject_reason(data, candidate(), "official source details " * 100, [])
        self.assertIn("three substantive sections", reason)

    def test_near_duplicate_content_is_rejected(self):
        body = " ".join(
            f"Chrome Android security update official release build number {i} device compatibility check source detail verification action"
            for i in range(80)
        )
        self.assertEqual(guard.find_duplicate("Different heading", body, [("Existing article", body)]), "Existing article")

    def test_repeated_paragraph_padding_is_rejected(self):
        data = draft()
        repeated = "Chrome Android security update official release notes verify browser version " * 15
        for section in data["sections"]:
            section["paragraphs"] = [repeated]
        reason = guard.reject_reason(data, candidate(), "official source details " * 100, [])
        self.assertIn("repeated paragraph filler", reason)

    def test_near_duplicate_title_intent_is_rejected(self):
        self.assertEqual(guard.find_duplicate("GitHub Copilot Model Access Rules", "A different summary.", [("GitHub Copilot Model Access Rules", "old text")]), "GitHub Copilot Model Access Rules")


if __name__ == "__main__":
    unittest.main(verbosity=2)
