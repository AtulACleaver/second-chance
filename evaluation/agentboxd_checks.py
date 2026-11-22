"""Offline tests: python evaluation/agentboxd_checks.py"""
import importlib.util
import json
from pathlib import Path
import unittest
import httpx

spec = importlib.util.spec_from_file_location("agentboxd_draft", Path(__file__).resolve().parents[1] / "scripts" / "agentboxd_draft.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DraftChecks(unittest.TestCase):
    def setUp(self):
        self.handoff = {"version": 1, "school": "Fictional University", "questions": ["When is aid due?"], "sources": ["https://example.edu/aid"]}

    def test_preview_and_evidence(self):
        draft = module.make_draft(self.handoff)
        self.assertEqual(set(draft), {"subject", "text"})
        self.assertIn("When is aid due?", draft["text"])
        self.assertIn("https://example.edu/aid", draft["text"])
        self.assertNotIn("send_at", draft)
        self.assertNotIn("to", draft)

    def test_create_only_draft_with_documented_payload(self):
        requests = []
        def handler(req):
            requests.append(req)
            return httpx.Response(201, json={"draft": {"status": "draft"}})
        with httpx.Client(transport=httpx.MockTransport(handler)) as client:
            module.save_draft(module.make_draft(self.handoff), "example-key", "inbox_123", client)
        self.assertEqual(len(requests), 1)
        self.assertEqual(requests[0].method, "POST")
        self.assertEqual(requests[0].url.path, "/v1/inboxes/inbox_123/drafts")
        self.assertEqual(set(json.loads(requests[0].content)), {"subject", "text"})

    def test_rejects_bad_url_and_inbox(self):
        self.handoff["sources"] = ["https://user:secret@example.edu/"]
        with self.assertRaises(ValueError): module.make_draft(self.handoff)
        with self.assertRaises(ValueError): module.save_draft({}, "key", "../bad")

    def test_non_201_is_failure(self):
        with httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(403))) as client:
            with self.assertRaisesRegex(RuntimeError, "HTTP 403"):
                module.save_draft(module.make_draft(self.handoff), "key", "inbox_123", client)

    def test_school_cannot_inject_subject_lines(self):
        self.handoff["school"] = "Example\nBcc: anyone@example.com"
        self.assertNotIn("\n", module.make_draft(self.handoff)["subject"])


if __name__ == "__main__": unittest.main()
