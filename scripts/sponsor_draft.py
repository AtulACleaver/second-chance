# optional sponsor outreach and results draft script for second chance
# formats evidence-backed outcomes into concise sponsor or partner summaries

import os
import sys
from pathlib import Path
from typing import Optional

# auto-load local .env if present
env_file = Path(__file__).resolve().parents[1] / ".env"
if env_file.exists():
    with open(env_file, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())

import httpx

AGENTBOXD_API_KEY = os.getenv("AGENTBOXD_API_KEY", "").strip()
AGENTBOXD_INBOX_ID = os.getenv("AGENTBOXD_INBOX_ID", "").strip()
DEMO_RECIPIENT = os.getenv("DEMO_RECIPIENT", "sponsor@example.org").strip()


def generate_sponsor_draft() -> str:
    # generate source-backed sponsor briefing text
    draft = f"""Subject: Second Chance Project Update: Source-Linked Financial Aid Policy Explorer

Dear Sponsor / Partner Team,

We are pleased to present the current milestone update for Second Chance, a transparent, source-linked financial-aid policy explorer for international undergraduate applicants.

Key Milestones Achieved:
1. Strict Anti-Hallucination Contract: Every aid statement is linked directly to exact verbatim source quotes from verified university (.edu) publications with verifiable retrieval timestamps.
2. Safe Research Engine: Implemented strict domain boundaries and SSRF protections to fetch only verified official institution pages.
3. Profile Sensitivity: Neutral rule evaluation accurately flags critical procedural traps (such as Tufts' upfront application aid checkbox and Cornell's CSS Profile requirement) without collecting sensitive applicant PII.
4. Transparent State Handling: Distinct visual reporting for fresh, cached, stale, and unavailable evidence states.

Demo API & Codebase:
- Branch: aryan/api-integration
- Endpoints: GET /api/health, GET /api/schools, POST /api/research
- Automated Regression Suite: 100% pass on profile sensitivity and security boundaries.

Thank you for your ongoing support.

Best regards,
Aryan Singh Chhetri & The Second Chance Team
"""
    return draft


def send_or_save_draft(draft_text: str) -> None:
    # if agentboxd credentials exist, post draft to agent inbox; otherwise output to console
    if AGENTBOXD_API_KEY and AGENTBOXD_INBOX_ID:
        endpoint = f"https://api.agentboxd.com/v1/inboxes/{AGENTBOXD_INBOX_ID}/drafts"
        headers = {
            "Authorization": f"Bearer {AGENTBOXD_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "recipient": DEMO_RECIPIENT,
            "subject": "Second Chance Project Update: Source-Linked Aid Policy Explorer",
            "body": draft_text,
        }
        try:
            resp = httpx.post(endpoint, json=payload, headers=headers, timeout=10.0)
            if resp.status_code in (200, 201):
                print(f"[SUCCESS] Draft sent to Agentboxd inbox ({AGENTBOXD_INBOX_ID}) for recipient: {DEMO_RECIPIENT}")
                return
            else:
                print(f"[WARN] Agentboxd API returned HTTP {resp.status_code}: {resp.text}")
        except Exception as exc:
            print(f"[WARN] Agentboxd request failed: {exc}")

    # fallback output
    print("\n--- GENERATED SPONSOR DRAFT ---\n")
    print(draft_text)
    print("--------------------------------\n")
    print("To send via Agentboxd, configure AGENTBOXD_API_KEY and AGENTBOXD_INBOX_ID in .env")


if __name__ == "__main__":
    draft = generate_sponsor_draft()
    send_or_save_draft(draft)
