# safe research engine for official university policy retrieval
# fetches and extracts verbatim aid conditions from validated official domains only

from datetime import datetime, timezone
import html
import ipaddress
import os
import re
import socket
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import httpx

from .directory import is_allowed_host
from .policies import get_curated_card

TAVILY_SEARCH_ENDPOINT = "https://api.tavily.com/search"
MAX_PAGE_BYTES = 500000
MAX_REDIRECTS = 3
DEFAULT_FETCH_TIMEOUT = 5.0

# keywords signaling relevant financial aid conditions
AID_KEYWORDS = [
    "need-blind",
    "need-aware",
    "demonstrated need",
    "css profile",
    "isfaa",
    "international applicant",
    "international student",
    "financial aid",
    "grant",
]


def is_safe_ip(ip_str: str) -> bool:
    # verify that an ip address is public and routable
    # rejects private loopback link-local reserved or multicast addresses
    try:
        ip = ipaddress.ip_address(ip_str)
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            return False
        return True
    except ValueError:
        return False


def validate_url_target(url: str, trusted_domain: str) -> Tuple[bool, str]:
    # validate that a url uses https matches trusted host and resolves to safe ips
    if not url:
        return False, "missing url"

    try:
        parsed = urlparse(url)
    except Exception:
        return False, "invalid url structure"

    # only https is permitted for official fetch
    if parsed.scheme.lower() != "https":
        return False, "only https scheme allowed"

    # disallow credentials or non-standard ports
    if parsed.username or parsed.password:
        return False, "credentials in url forbidden"

    if parsed.port and parsed.port != 443:
        return False, "non-standard port forbidden"

    hostname = parsed.hostname
    if not hostname:
        return False, "missing hostname"

    # enforce domain boundary against trusted school domain
    if not is_allowed_host(hostname, trusted_domain):
        return False, f"hostname does not match trusted domain"

    # dns resolution check to prevent ssrf
    try:
        addr_info = socket.getaddrinfo(hostname, 443, proto=socket.IPPROTO_TCP)
        if not addr_info:
            return False, "dns resolution returned no addresses"

        for entry in addr_info:
            sockaddr = entry[4]
            ip_str = sockaddr[0]
            if not is_safe_ip(ip_str):
                return False, f"hostname resolved to disallowed ip address"

    except socket.gaierror:
        return False, "dns lookup failed"
    except Exception as exc:
        return False, f"dns verification error"

    return True, "ok"


def clean_html_to_text(raw_html: str) -> str:
    # strip scripts styles and tags from raw html to produce plain text
    # strip script and style tags completely
    stripped = re.sub(
        r"<(script|style|noscript|svg)[^>]*>.*?</\1>",
        " ",
        raw_html,
        flags=re.DOTALL | re.IGNORECASE,
    )
    # strip all remaining html tags
    stripped = re.sub(r"<[^>]+>", " ", stripped)
    # decode html entities
    decoded = html.unescape(stripped)
    # collapse whitespace
    collapsed = re.sub(r"\s+", " ", decoded).strip()
    return collapsed


def extract_aid_passages(text: str, max_passages: int = 3) -> List[str]:
    # extract short verbatim sentences containing relevant international aid keywords
    if not text:
        return []

    # split into sentences on common delimiters
    raw_sentences = re.split(r"(?<=[.!?])\s+", text)
    matched: List[str] = []
    seen: set = set()

    for raw_s in raw_sentences:
        s = raw_s.strip()
        # keep length bounded for concise evidence
        if len(s) < 30 or len(s) > 300:
            continue

        lower_s = s.lower()
        if any(kw in lower_s for kw in AID_KEYWORDS):
            if lower_s not in seen:
                seen.add(lower_s)
                matched.append(s)
                if len(matched) >= max_passages:
                    break

    return matched


def safe_fetch_page(
    url: str,
    trusted_domain: str,
    client: Optional[httpx.Client] = None,
    max_bytes: int = MAX_PAGE_BYTES,
    timeout: float = DEFAULT_FETCH_TIMEOUT,
) -> Tuple[Optional[str], Optional[str]]:
    # safely fetch official webpage content following bounded redirects with ssrf checks
    current_url = url
    http_client = client or httpx.Client(timeout=timeout, follow_redirects=False)

    for _ in range(MAX_REDIRECTS + 1):
        is_safe, reason = validate_url_target(current_url, trusted_domain)
        if not is_safe:
            return None, reason

        try:
            resp = http_client.get(
                current_url,
                headers={"User-Agent": "SecondChanceResearchBot/0.1.0"},
            )
        except Exception as exc:
            return None, f"network fetch error: {exc.__class__.__name__}"

        # handle redirects manually to check every destination against domain boundaries
        if resp.status_code in (301, 302, 303, 307, 308):
            loc = resp.headers.get("location")
            if not loc:
                return None, "redirect missing location header"
            current_url = urljoin(current_url, loc)
            continue

        if resp.status_code != 200:
            return None, f"server returned http {resp.status_code}"

        # verify content type is text or html
        content_type = resp.headers.get("content-type", "").lower()
        if "text/html" not in content_type and "text/plain" not in content_type:
            return None, "disallowed content type"

        raw_bytes = resp.content
        if len(raw_bytes) > max_bytes:
            raw_bytes = raw_bytes[:max_bytes]

        try:
            decoded_text = raw_bytes.decode(resp.encoding or "utf-8", errors="replace")
            return clean_html_to_text(decoded_text), None
        except Exception as exc:
            return None, f"decode error: {exc.__class__.__name__}"

    return None, "exceeded maximum redirects"


def search_tavily_leads(
    school_name: str,
    trusted_domain: str,
    api_key: Optional[str] = None,
    client: Optional[httpx.Client] = None,
) -> List[str]:
    # perform basic tavily search restricted strictly to the verified school domain
    key = api_key or os.getenv("TAVILY_API_KEY", "").strip()
    if not key:
        return []

    query = f"{school_name} international undergraduate financial aid need blind need aware css profile"
    payload = {
        "api_key": key,
        "query": query,
        "search_depth": "basic",
        "include_domains": [trusted_domain],
        "max_results": 5,
        "auto_parameters": False,
    }

    try:
        http_client = client or httpx.Client(timeout=DEFAULT_FETCH_TIMEOUT)
        resp = http_client.post(TAVILY_SEARCH_ENDPOINT, json=payload)
        if resp.status_code != 200:
            return []

        data = resp.json()
        results = data.get("results", [])

        valid_urls: List[str] = []
        for r in results:
            url = r.get("url")
            if not url:
                continue
            parsed = urlparse(url)
            if parsed.hostname and is_allowed_host(parsed.hostname, trusted_domain):
                valid_urls.append(url)

        return valid_urls

    except Exception:
        return []


def conduct_research(
    school_id: str,
    school_name: str,
    trusted_domain: Optional[str],
    profile: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
    client: Optional[httpx.Client] = None,
) -> Dict[str, Any]:
    # execute end to end research returning cards and status
    # 1 check if this is a curated school record
    curated_card = get_curated_card(school_id, profile)
    if curated_card:
        return {
            "school": {
                "id": school_id,
                "name": school_name,
                "domain": trusted_domain,
            },
            "status": "fresh",
            "message": "Loaded verified curated policy records for institution",
            "cards": [curated_card],
        }

    # 2 if no trusted domain is identified stop and return unavailable
    if not trusted_domain:
        return {
            "school": {
                "id": school_id,
                "name": school_name,
                "domain": None,
            },
            "status": "unavailable",
            "message": "Cannot research school without verified official domain",
            "cards": [],
        }

    # 3 search tavily for official candidate urls on trusted domain
    candidate_urls = search_tavily_leads(
        school_name=school_name,
        trusted_domain=trusted_domain,
        api_key=api_key,
        client=client,
    )

    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    extracted_evidence: List[Dict[str, Any]] = []

    # 4 safely fetch official pages and extract verbatim aid passages
    for target_url in candidate_urls:
        page_text, err = safe_fetch_page(
            url=target_url,
            trusted_domain=trusted_domain,
            client=client,
        )
        if not page_text:
            continue

        passages = extract_aid_passages(page_text, max_passages=2)
        for passage in passages:
            extracted_evidence.append(
                {
                    "quote": passage,
                    "source_url": target_url,
                    "retrieved_at": now_utc,
                    "source_type": "live",
                    "review_status": "unreviewed",
                    "scope": "International undergraduate aid",
                    "cycle": "Current published webpage",
                }
            )

        if len(extracted_evidence) >= 3:
            break

    if not extracted_evidence:
        return {
            "school": {
                "id": school_id,
                "name": school_name,
                "domain": trusted_domain,
            },
            "status": "unavailable",
            "message": f"No official international undergraduate aid policy evidence found on {trusted_domain}",
            "cards": [],
        }

    card = {
        "id": school_id,
        "short_name": school_name,
        "tagline": "Discovered live aid statements from official university source",
        "evidence": extracted_evidence,
        "actions": [
            "Review the exact quoted policy passages above on the official university website",
            "Contact international undergraduate admissions to verify requirements for your specific cycle",
        ],
        "assessment": "Not evaluated",
    }

    return {
        "school": {
            "id": school_id,
            "name": school_name,
            "domain": trusted_domain,
        },
        "status": "fresh",
        "message": "Retrieved live source-linked evidence from verified university host",
        "cards": [card],
    }
