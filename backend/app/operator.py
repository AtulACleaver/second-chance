# operator-assisted agentboxd integration for second chance
# provides protected endpoints to prepare unaddressed drafts and inspect test conversations

import html
import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
import httpx
from pydantic import BaseModel, ConfigDict, Field

router = APIRouter(prefix="/api/operator", tags=["operator"])

AGENTBOXD_API_BASE = "https://api.agentboxd.com"
INBOX_ID_REGEX = re.compile(r"^[A-Za-z0-9_-]{1,128}$")


def is_operator_enabled() -> bool:
    # operator endpoints are disabled by default on public deployments
    return os.getenv("ENABLE_OPERATOR_API", "false").strip().lower() in ("true", "1", "yes")


def get_operator_token() -> str:
    # server-side operator authentication token
    return os.getenv("OPERATOR_TOKEN", "").strip()


def get_agentboxd_credentials() -> Dict[str, str]:
    # server-side agentboxd api key and inbox id
    return {
        "api_key": os.getenv("AGENTBOXD_API_KEY", "").strip(),
        "inbox_id": os.getenv("AGENTBOXD_INBOX_ID", "").strip(),
    }


def verify_operator_auth(
    authorization: Optional[str] = Header(default=None),
    x_operator_token: Optional[str] = Header(default=None),
) -> None:
    # check if operator api is enabled
    if not is_operator_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator API is disabled on this deployment.",
        )

    expected_token = get_operator_token()
    if not expected_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Operator authentication is not configured on this server.",
        )

    # extract token from Bearer header or X-Operator-Token header
    token = ""
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif x_operator_token:
        token = x_operator_token.strip()

    if not token or token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing operator authorization token.",
        )


def sanitize_message_text(raw_text: Optional[str]) -> str:
    # treat incoming email content as untrusted raw text; escape html
    if not raw_text:
        return ""
    # strip control characters except standard whitespace
    cleaned = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+", " ", str(raw_text))
    # escape html entities so frontend can safely render
    return html.escape(cleaned.strip())


class DraftCreateRequest(BaseModel):
    # draft payload adhering to documented agentboxd schema
    model_config = ConfigDict(extra="forbid")

    subject: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1, max_length=10000)
    to: Optional[str] = Field(default=None, max_length=320)
    sources: Optional[List[str]] = Field(default=None, max_length=30)


@router.get("/status")
def get_operator_status(
    auth: None = Depends(verify_operator_auth),
) -> Dict[str, Any]:
    # returns status of operator system and agentboxd configuration without exposing secrets
    creds = get_agentboxd_credentials()
    has_key = bool(creds["api_key"])
    has_inbox = bool(creds["inbox_id"]) and bool(INBOX_ID_REGEX.match(creds["inbox_id"]))

    return {
        "status": "ok",
        "operator_enabled": True,
        "agentboxd_configured": has_key and has_inbox,
        "demo_inbox_id": creds["inbox_id"] if has_inbox else None,
        "notice": "Private team-operated demo environment. Real human review required before sending.",
    }


@router.post("/drafts", status_code=status.HTTP_201_CREATED)
def post_operator_draft(
    req: DraftCreateRequest,
    auth: None = Depends(verify_operator_auth),
) -> Dict[str, Any]:
    # create an unaddressed draft in the configured agentboxd demo inbox
    creds = get_agentboxd_credentials()
    api_key = creds["api_key"]
    inbox_id = creds["inbox_id"]

    if not api_key or not inbox_id or not INBOX_ID_REGEX.match(inbox_id):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agentboxd credentials (AGENTBOXD_API_KEY, AGENTBOXD_INBOX_ID) are not configured.",
        )

    # sanitize subject line against crlf injection
    subject_clean = re.sub(r"[\r\n]+", " ", req.subject).strip()

    # validate sources if provided
    if req.sources:
        for src in req.sources:
            parts = urlsplit(src)
            if parts.scheme != "https" or not parts.hostname or parts.username or parts.password:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Source links must be valid HTTPS URLs without credentials.",
                )

    # format draft payload for documented agentboxd api (POST /v1/inboxes/:id/drafts)
    # never schedule or auto-send
    draft_payload: Dict[str, Any] = {
        "subject": subject_clean,
        "text": req.text.strip(),
    }
    if req.to and req.to.strip():
        draft_payload["to"] = [req.to.strip()]

    endpoint = f"{AGENTBOXD_API_BASE}/v1/inboxes/{inbox_id}/drafts"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "SecondChance-Operator/1.0",
    }

    try:
        with httpx.Client(timeout=15.0, follow_redirects=False) as client:
            resp = client.post(endpoint, json=draft_payload, headers=headers)

        if resp.status_code != 201:
            # report honest failure without leaking credentials or request headers
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Agentboxd API returned HTTP {resp.status_code}. Draft could not be created.",
            )

        resp_data = resp.json() if resp.text else {}
        draft_info = resp_data.get("draft", resp_data)

        return {
            "status": "draft_created",
            "message": "Unaddressed draft created in Agentboxd inbox for human review.",
            "draft_id": draft_info.get("id"),
            "inbox_id": inbox_id,
            "subject": subject_clean,
            "review_instructions": "Open the Agentboxd dashboard to review text, supply recipient address, and manually send.",
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Agentboxd connection failed: {type(exc).__name__}",
        )


@router.get("/threads")
def get_operator_threads(
    limit: int = Query(default=10, ge=1, le=50),
    auth: None = Depends(verify_operator_auth),
) -> Dict[str, Any]:
    # list conversations from the configured demo inbox
    creds = get_agentboxd_credentials()
    api_key = creds["api_key"]
    inbox_id = creds["inbox_id"]

    if not api_key or not inbox_id or not INBOX_ID_REGEX.match(inbox_id):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agentboxd credentials (AGENTBOXD_API_KEY, AGENTBOXD_INBOX_ID) are not configured.",
        )

    endpoint = f"{AGENTBOXD_API_BASE}/v1/inboxes/{inbox_id}/threads"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "SecondChance-Operator/1.0",
    }

    try:
        with httpx.Client(timeout=15.0, follow_redirects=False) as client:
            resp = client.get(endpoint, headers=headers, params={"limit": limit})

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Agentboxd API returned HTTP {resp.status_code} while fetching threads.",
            )

        data = resp.json()
        raw_threads = data.get("data", []) if isinstance(data, dict) else []

        sanitized_threads = []
        for th in raw_threads:
            sanitized_threads.append({
                "id": str(th.get("id", "")),
                "subject": sanitize_message_text(th.get("subject", "No subject")),
                "snippet": sanitize_message_text(th.get("snippet", "")),
                "message_count": th.get("message_count", 1),
                "updated_at": th.get("updated_at"),
                "is_test_conversation": True,
                "label": "TEAM TEST CONVERSATION",
            })

        return {
            "status": "ok",
            "inbox_id": inbox_id,
            "threads": sanitized_threads,
            "disclaimer": "These conversations are for demonstration testing with a team-owned mailbox. They are not official university responses.",
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve conversation threads: {type(exc).__name__}",
        )


@router.get("/threads/{thread_id}")
def get_operator_thread_messages(
    thread_id: str,
    auth: None = Depends(verify_operator_auth),
) -> Dict[str, Any]:
    # inspect actual messages inside a specific test conversation
    creds = get_agentboxd_credentials()
    api_key = creds["api_key"]
    inbox_id = creds["inbox_id"]

    if not api_key or not inbox_id or not INBOX_ID_REGEX.match(inbox_id):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Agentboxd credentials (AGENTBOXD_API_KEY, AGENTBOXD_INBOX_ID) are not configured.",
        )

    clean_tid = thread_id.strip()
    if not INBOX_ID_REGEX.match(clean_tid):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid thread ID format.",
        )

    # Query messages for this thread in the configured inbox
    endpoint = f"{AGENTBOXD_API_BASE}/v1/inboxes/{inbox_id}/messages"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "User-Agent": "SecondChance-Operator/1.0",
    }

    try:
        with httpx.Client(timeout=15.0, follow_redirects=False) as client:
            resp = client.get(endpoint, headers=headers, params={"thread_id": clean_tid})

        if resp.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Agentboxd API returned HTTP {resp.status_code} while fetching messages.",
            )

        data = resp.json()
        raw_msgs = data.get("data", []) if isinstance(data, dict) else []

        sanitized_msgs = []
        for m in raw_msgs:
            sender = m.get("from", "Unknown sender")
            is_inbound = m.get("direction") == "inbound"
            sanitized_msgs.append({
                "id": str(m.get("id", "")),
                "direction": m.get("direction", "outbound"),
                "sender": sanitize_message_text(sender),
                "to": [sanitize_message_text(r) for r in m.get("to", [])] if isinstance(m.get("to"), list) else [],
                "subject": sanitize_message_text(m.get("subject", "")),
                "text": sanitize_message_text(m.get("text", "")),
                "created_at": m.get("created_at"),
                "sender_type": "Team Test Mailbox" if is_inbound else "Agentboxd Draft Outbox",
                "is_university_response": False,
            })

        return {
            "status": "ok",
            "thread_id": clean_tid,
            "inbox_id": inbox_id,
            "messages": sanitized_msgs,
            "notice": "All messages are rendered in safe plain text. Content represents team test correspondence, NOT a university response.",
        }

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to retrieve thread messages: {type(exc).__name__}",
        )
