#!/usr/bin/env python3
"""Preview or save an unaddressed student inquiry to a team-owned Agentboxd inbox.

Never sends mail. The handoff file comes from the Second Chance question export.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit

import httpx


def compact_text(value, limit):
    if not isinstance(value, str):
        raise ValueError("Expected text in handoff")
    value = re.sub(r"[\x00-\x1f\x7f]+", " ", value).strip()
    if not value or len(value) > limit:
        raise ValueError("Handoff text is empty or too long")
    return value


def make_draft(data):
    if not isinstance(data, dict) or data.get("version") != 1:
        raise ValueError("Unsupported handoff format")
    school = compact_text(data.get("school"), 200)
    questions = data.get("questions")
    if not isinstance(questions, list) or not 1 <= len(questions) <= 20:
        raise ValueError("Provide 1 to 20 questions")
    questions = [compact_text(q, 1000) for q in questions]
    sources = data.get("sources", [])
    if not isinstance(sources, list) or len(sources) > 30:
        raise ValueError("Invalid source list")
    clean_sources = []
    for source in sources:
        source = compact_text(source, 2048)
        parts = urlsplit(source)
        if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
            raise ValueError("Source links must be HTTPS URLs without credentials")
        if source not in clean_sources:
            clean_sources.append(source)
    body = (
        "Dear Financial Aid Office,\n\n"
        f"I am exploring undergraduate study at {school} as an international applicant. "
        "Could you help me clarify the following points?\n\n"
        + "\n".join(f"{i}. {q}" for i, q in enumerate(questions, 1))
        + "\n\n"
    )
    if clean_sources:
        body += "Pages I consulted:\n" + "\n".join(clean_sources) + "\n\n"
    body += "Thank you for your guidance.\n\n[Your name]"
    # No recipient, sending, or scheduling. A person must review and address it.
    return {"subject": f"Questions about international undergraduate financial aid at {school}", "text": body}


def save_draft(draft, api_key, inbox_id, client=None):
    if not api_key or not re.fullmatch(r"[A-Za-z0-9_-]{1,128}", inbox_id or ""):
        raise ValueError("Set AGENTBOXD_API_KEY and a valid AGENTBOXD_INBOX_ID")
    url = f"https://api.agentboxd.com/v1/inboxes/{inbox_id}/drafts"
    # Do not print the response body, credentials, or authorization header.
    if client is None:
        with httpx.Client(timeout=15.0, follow_redirects=False) as owned:
            response = owned.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=draft)
    else:
        response = client.post(url, headers={"Authorization": f"Bearer {api_key}"}, json=draft)
    if response.status_code != 201:
        raise RuntimeError(f"Agentboxd did not create a draft (HTTP {response.status_code})")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("handoff", type=Path, help="JSON downloaded from Second Chance")
    parser.add_argument("--create-draft", action="store_true", help="Create an unsent Agentboxd draft; default is preview only")
    args = parser.parse_args(argv)
    try:
        if args.handoff.stat().st_size > 100_000:
            raise ValueError("Handoff file exceeds 100 KB")
        draft = make_draft(json.loads(args.handoff.read_text(encoding="utf-8")))
        if args.create_draft:
            save_draft(draft, os.getenv("AGENTBOXD_API_KEY", "").strip(), os.getenv("AGENTBOXD_INBOX_ID", "").strip())
            print("Unaddressed draft created in Agentboxd. Review it and add the recipient. No email was sent.")
        else:
            print("PREVIEW ONLY. No request sent.\n")
            print(f"Subject: {draft['subject']}\n\n{draft['text']}")
    except (ValueError, OSError, json.JSONDecodeError, httpx.HTTPError, RuntimeError) as exc:
        # Network errors can contain request details; avoid logging them.
        if isinstance(exc, httpx.HTTPError):
            print("Agentboxd request failed. Check connection and try again.", file=sys.stderr)
        else:
            print(f"Could not prepare draft: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
