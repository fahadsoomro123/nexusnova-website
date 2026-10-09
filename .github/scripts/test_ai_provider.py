import json
import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(__file__))
import ai_provider


class AiProviderTests(unittest.TestCase):
    def setUp(self):
        ai_provider._reset_status()

    def test_gemini_request_is_provider_compatible_and_secret_free_in_status(self):
        captured = {}

        def request(url, body, headers, timeout):
            captured.update(url=url, body=body, headers=headers, timeout=timeout)
            return {"candidates": [{"content": {"parts": [{"text": '{"ok": true}'}]}}]}

        with patch.object(ai_provider, "_request_json", side_effect=request):
            result = ai_provider._call_gemini("hello", "secret-key", "gemini-2.5-flash")

        self.assertEqual(result, {"ok": True})
        self.assertIn("/v1beta/models/gemini-2.5-flash:generateContent", captured["url"])
        self.assertEqual(captured["headers"], {"x-goog-api-key": "secret-key"})
        self.assertNotIn("thinkingLevel", captured["body"]["generationConfig"])

    def test_openai_request_uses_bearer_key_without_recording_it(self):
        captured = {}

        def request(url, body, headers, timeout):
            captured.update(url=url, body=body, headers=headers, timeout=timeout)
            return {"output_text": '{"ok": true}'}

        key = "test-key"
        with patch.object(ai_provider, "_request_json", side_effect=request):
            result = ai_provider._call_openai("hello", key, "gpt-test")

        self.assertEqual(result, {"ok": True})
        self.assertEqual(captured["headers"].get("Authorization"), "Bearer " + key)
        self.assertNotIn("test-key", json.dumps(ai_provider.status()))

    def test_default_gemini_path_uses_stable_model_and_records_safe_failure(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"}, clear=True), patch.object(
            ai_provider, "_call_gemini", return_value=None
        ):
            result = ai_provider.ai_json("Return JSON.")

        self.assertIsNone(result)
        self.assertEqual(ai_provider.status()["attempts"][0]["model"], "gemini-2.5-flash")
        self.assertNotIn("test-key", json.dumps(ai_provider.status()))


if __name__ == "__main__":
    unittest.main()
