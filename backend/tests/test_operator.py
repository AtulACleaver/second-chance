# test suite for protected agentboxd operator endpoints
# verifies authentication boundaries, safe plain-text sanitization, and documented api calls

import json
import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
import httpx

from app.main import app

client = TestClient(app)


class TestOperatorSecurity(unittest.TestCase):
    def test_disabled_by_default(self):
        # operator endpoints must be disabled by default on public deployments
        with patch.dict(os.environ, {"ENABLE_OPERATOR_API": "false"}, clear=False):
            resp = client.get("/api/operator/status")
            self.assertEqual(resp.status_code, 403)
            self.assertIn("disabled", resp.json()["detail"].lower())

    def test_missing_or_invalid_auth_token(self):
        # enabled operator endpoints must reject unauthorized requests
        env = {
            "ENABLE_OPERATOR_API": "true",
            "OPERATOR_TOKEN": "secret-operator-pass-2026",
        }
        with patch.dict(os.environ, env, clear=False):
            # No token
            r1 = client.get("/api/operator/status")
            self.assertEqual(r1.status_code, 401)

            # Invalid Bearer token
            r2 = client.get(
                "/api/operator/status",
                headers={"Authorization": "Bearer wrong-token"},
            )
            self.assertEqual(r2.status_code, 401)

            # Invalid X-Operator-Token header
            r3 = client.get(
                "/api/operator/status",
                headers={"X-Operator-Token": "bad-token"},
            )
            self.assertEqual(r3.status_code, 401)

    def test_valid_auth_status_check(self):
        # authorized operator can inspect system status
        env = {
            "ENABLE_OPERATOR_API": "true",
            "OPERATOR_TOKEN": "secret-operator-pass-2026",
            "AGENTBOXD_API_KEY": "demo-key",
            "AGENTBOXD_INBOX_ID": "inbox_test_123",
        }
        with patch.dict(os.environ, env, clear=False):
            resp = client.get(
                "/api/operator/status",
                headers={"Authorization": "Bearer secret-operator-pass-2026"},
            )
            self.assertEqual(resp.status_code, 200)
            data = resp.json()
            self.assertTrue(data["operator_enabled"])
            self.assertTrue(data["agentboxd_configured"])
            self.assertEqual(data["demo_inbox_id"], "inbox_test_123")

    def test_create_draft_unaddressed_flow(self):
        # creates an unaddressed draft via documented agentboxd api without auto-send
        recorded_requests = []

        def mock_handler(req: httpx.Request):
            recorded_requests.append(req)
            return httpx.Response(201, json={"draft": {"id": "draft_abc987", "status": "draft"}})

        mock_transport = httpx.MockTransport(mock_handler)
        orig_client = httpx.Client
        def client_factory(*args, **kwargs):
            return orig_client(transport=mock_transport)

        env = {
            "ENABLE_OPERATOR_API": "true",
            "OPERATOR_TOKEN": "secret-operator-pass-2026",
            "AGENTBOXD_API_KEY": "demo-key",
            "AGENTBOXD_INBOX_ID": "inbox_test_123",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch("app.operator.httpx.Client", side_effect=client_factory):
                payload = {
                    "subject": "Questions about financial aid at Cornell",
                    "text": "Dear Financial Aid Office,\n\n1. Is CSS Profile required?\n\nThank you.",
                    "sources": ["https://finaid.cornell.edu/apply"],
                }
                resp = client.post(
                    "/api/operator/drafts",
                    headers={"Authorization": "Bearer secret-operator-pass-2026"},
                    json=payload,
                )
                self.assertEqual(resp.status_code, 201)
                res_data = resp.json()
                self.assertEqual(res_data["status"], "draft_created")
                self.assertEqual(res_data["draft_id"], "draft_abc987")
                self.assertIn("human review", res_data["message"].lower())

        self.assertEqual(len(recorded_requests), 1)
        req = recorded_requests[0]
        self.assertEqual(req.method, "POST")
        self.assertEqual(req.url.path, "/v1/inboxes/inbox_test_123/drafts")
        req_json = json.loads(req.content)
        self.assertEqual(set(req_json.keys()), {"subject", "text"})
        self.assertNotIn("send_at", req_json)
        self.assertNotIn("to", req_json)

    def test_rejects_extra_fields_and_invalid_sources(self):
        # extra fields forbidden by pydantic; insecure http sources rejected
        env = {
            "ENABLE_OPERATOR_API": "true",
            "OPERATOR_TOKEN": "secret-operator-pass-2026",
            "AGENTBOXD_API_KEY": "demo-key",
            "AGENTBOXD_INBOX_ID": "inbox_test_123",
        }
        with patch.dict(os.environ, env, clear=False):
            # Extra fields
            r1 = client.post(
                "/api/operator/drafts",
                headers={"Authorization": "Bearer secret-operator-pass-2026"},
                json={"subject": "Test", "text": "Body", "send_immediately": True},
            )
            self.assertEqual(r1.status_code, 422)

            # Insecure source URL
            r2 = client.post(
                "/api/operator/drafts",
                headers={"Authorization": "Bearer secret-operator-pass-2026"},
                json={"subject": "Test", "text": "Body", "sources": ["http://insecure.edu/aid"]},
            )
            self.assertEqual(r2.status_code, 422)

    def test_inspect_threads_and_messages_sanitization(self):
        # messages are sanitized to escape html entities and clearly labeled as team tests
        mock_threads_resp = {
            "data": [
                {
                    "id": "thread_001",
                    "subject": "Inquiry about Cornell Aid <script>alert(1)</script>",
                    "snippet": "Hello financial aid office <b>bold</b>",
                    "message_count": 2,
                    "updated_at": "2026-11-22T20:00:00Z",
                }
            ]
        }
        mock_msgs_resp = {
            "data": [
                {
                    "id": "msg_001",
                    "direction": "inbound",
                    "from": "test-team-reply@example.org",
                    "subject": "Re: Inquiry <script>",
                    "text": "[TEAM TEST RESPONSE]\n\nHello, we received your inquiry. <img src=x onerror=alert()>",
                    "created_at": "2026-11-22T20:10:00Z",
                }
            ]
        }

        def mock_handler(req: httpx.Request):
            if req.url.path.endswith("/threads"):
                return httpx.Response(200, json=mock_threads_resp)
            if req.url.path.endswith("/messages"):
                return httpx.Response(200, json=mock_msgs_resp)
            return httpx.Response(404)

        mock_transport = httpx.MockTransport(mock_handler)
        orig_client = httpx.Client
        def client_factory(*args, **kwargs):
            return orig_client(transport=mock_transport)

        env = {
            "ENABLE_OPERATOR_API": "true",
            "OPERATOR_TOKEN": "secret-operator-pass-2026",
            "AGENTBOXD_API_KEY": "demo-key",
            "AGENTBOXD_INBOX_ID": "inbox_test_123",
        }
        with patch.dict(os.environ, env, clear=False):
            with patch("app.operator.httpx.Client", side_effect=client_factory):
                # 1. Inspect Threads
                r_th = client.get(
                    "/api/operator/threads",
                    headers={"Authorization": "Bearer secret-operator-pass-2026"},
                )
                self.assertEqual(r_th.status_code, 200)
                th_data = r_th.json()
                self.assertEqual(len(th_data["threads"]), 1)
                th = th_data["threads"][0]
                self.assertNotIn("<script>", th["subject"])
                self.assertIn("&lt;script&gt;", th["subject"])
                self.assertTrue(th["is_test_conversation"])
                self.assertEqual(th["label"], "TEAM TEST CONVERSATION")

                # 2. Inspect Thread Messages
                r_msg = client.get(
                    "/api/operator/threads/thread_001",
                    headers={"Authorization": "Bearer secret-operator-pass-2026"},
                )
                self.assertEqual(r_msg.status_code, 200)
                msg_data = r_msg.json()
                self.assertEqual(len(msg_data["messages"]), 1)
                m = msg_data["messages"][0]
                self.assertFalse(m["is_university_response"])
                self.assertEqual(m["sender_type"], "Team Test Mailbox")
                self.assertNotIn("<img", m["text"])
                self.assertIn("&lt;img", m["text"])


if __name__ == "__main__":
    unittest.main()
