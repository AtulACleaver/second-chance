# college scorecard directory lookup and verified domain resolution
# identifies universities via the official us department of education college
# scorecard api and maps candidates to verified domain boundaries

import os
import re
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

from .policies import CURATED_SCHOOLS, get_curated_candidates

SCORECARD_ENDPOINT = "https://api.data.gov/ed/collegescorecard/v1/schools"
DEFAULT_TIMEOUT_SECONDS = 5.0
MAX_QUERY_LENGTH = 80
MAX_CANDIDATES = 10

# regex for basic valid domain label structure
DOMAIN_REGEX = re.compile(
    r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
)


def normalize_domain(raw_url: Optional[str]) -> Optional[str]:
    # extract and validate the hostname or domain from a url or bare domain string
    # strips schemes, paths, trailing slashes, and leading www
    # rejects strings with credentials, ports, or deceptive characters
    if not raw_url:
        return None

    raw = raw_url.strip()
    if not raw:
        return None

    # prepend scheme if absent for urllib parse
    if not (raw.startswith("http://") or raw.startswith("https://")):
        parsed = urlparse(f"https://{raw}")
    else:
        parsed = urlparse(raw)

    hostname = parsed.hostname
    if not hostname:
        return None

    hostname = hostname.lower().strip(".")

    # disallow credentials or unusual ports
    if parsed.username or parsed.password or parsed.port:
        return None

    # strip leading www if present
    if hostname.startswith("www."):
        hostname = hostname[4:]

    if not DOMAIN_REGEX.match(hostname):
        return None

    return hostname


def is_allowed_host(candidate_host: str, trusted_domain: str) -> bool:
    # validate that candidate_host strictly matches trusted_domain or its subdomains
    # enforces exact label boundaries to prevent suffix deception
    if not candidate_host or not trusted_domain:
        return False

    cand = candidate_host.lower().strip(".")
    trust = trusted_domain.lower().strip(".")

    # normalize out leading www
    if cand.startswith("www."):
        cand = cand[4:]
    if trust.startswith("www."):
        trust = trust[4:]

    # must be exact match or have a dot immediately before the trusted domain
    if cand == trust:
        return True

    return cand.endswith("." + trust)


def search_curated(query: str) -> List[Dict[str, Any]]:
    # search curated fallback records case-insensitively by name, short_name, or domain
    q = query.strip().lower()
    if not q:
        return []

    matches = []
    for school in CURATED_SCHOOLS.values():
        if (
            q in school["name"].lower()
            or q in school["short_name"].lower()
            or q in school["domain"].lower()
            or q in school["id"].lower()
        ):
            matches.append(
                {
                    "id": school["id"],
                    "name": school["name"],
                    "location": school["location"],
                    "domain": school["domain"],
                    "domain_status": school["domain_status"],
                }
            )
    return matches


def search_schools(
    query: str,
    api_key: Optional[str] = None,
    client: Optional[httpx.Client] = None,
) -> Dict[str, Any]:
    # search institutions by name using college scorecard with curated fallback
    clean_query = query.strip()[:MAX_QUERY_LENGTH]
    if not clean_query:
        return {"status": "ok", "candidates": []}

    curated_matches = search_curated(clean_query)
    scorecard_key = api_key or os.getenv("SCORECARD_API_KEY", "").strip()

    # if no scorecard api key is configured, return curated matches or explicit unavailable
    if not scorecard_key:
        if curated_matches:
            return {
                "status": "ok",
                "candidates": curated_matches,
                "message": "College Scorecard API key not configured; showing verified curated matches.",
            }
        return {
            "status": "unavailable",
            "candidates": [],
            "message": "College Scorecard directory unavailable (missing API key) and no curated match found.",
        }

    # query college scorecard api
    params = {
        "api_key": scorecard_key,
        "school.name": clean_query,
        "fields": "id,school.name,school.city,school.state,school.school_url",
        "per_page": MAX_CANDIDATES,
    }

    try:
        http_client = client or httpx.Client(timeout=DEFAULT_TIMEOUT_SECONDS)
        response = http_client.get(SCORECARD_ENDPOINT, params=params)

        if response.status_code != 200:
            # scorecard error with status code returning curated fallbacks
            return {
                "status": "ok" if curated_matches else "unavailable",
                "candidates": curated_matches,
                "message": f"Scorecard API returned HTTP {response.status_code}; showing curated fallbacks.",
            }

        data = response.json()
        results = data.get("results", [])

        candidates: List[Dict[str, Any]] = []
        seen_domains = set()

        # prioritize curated matches that matched the query
        for cm in curated_matches:
            candidates.append(cm)
            if cm.get("domain"):
                seen_domains.add(cm["domain"])

        for item in results:
            item_id = item.get("id")
            name = item.get("school.name")
            city = item.get("school.city") or ""
            state = item.get("school.state") or ""
            raw_url = item.get("school.school_url")

            location_parts = [p for p in (city, state) if p]
            location = ", ".join(location_parts) if location_parts else "Location unknown"

            norm_domain = normalize_domain(raw_url)
            domain_status = "directory" if norm_domain else "unknown"

            # skip duplicate if already represented by a curated match
            if norm_domain and norm_domain in seen_domains:
                continue

            candidates.append(
                {
                    "id": f"scorecard:{item_id}",
                    "name": name,
                    "location": location,
                    "domain": norm_domain,
                    "domain_status": domain_status,
                }
            )
            if norm_domain:
                seen_domains.add(norm_domain)

        return {
            "status": "ok",
            "candidates": candidates[:MAX_CANDIDATES],
        }

    except Exception as exc:
        # network outage or timeout
        return {
            "status": "ok" if curated_matches else "unavailable",
            "candidates": curated_matches,
            "message": f"Directory lookup failed: {exc.__class__.__name__}; showing curated fallbacks.",
        }


def resolve_school_identity(
    school_id: str,
    api_key: Optional[str] = None,
    client: Optional[httpx.Client] = None,
) -> Optional[Dict[str, Any]]:
    # resolve a selected candidate id server-side to its trusted record and domain
    # never trusts user-supplied urls or domains from the client
    if not school_id:
        return None

    sid = school_id.strip()

    # 1 curated match
    if sid.startswith("curated:") or sid in CURATED_SCHOOLS or sid in {"princeton", "cornell", "tufts"}:
        canon = CURATED_SCHOOLS.get(sid) or CURATED_SCHOOLS.get(f"curated:{sid}")
        if canon:
            return {
                "id": canon["id"],
                "name": canon["name"],
                "short_name": canon["short_name"],
                "domain": canon["domain"],
                "domain_status": canon["domain_status"],
                "location": canon["location"],
                "is_curated": True,
            }

    # 2 scorecard id resolution
    if sid.startswith("scorecard:"):
        numeric_id = sid.split(":", 1)[1]
        scorecard_key = api_key or os.getenv("SCORECARD_API_KEY", "").strip()
        if not scorecard_key:
            return None

        params = {
            "api_key": scorecard_key,
            "id": numeric_id,
            "fields": "id,school.name,school.city,school.state,school.school_url",
        }

        try:
            http_client = client or httpx.Client(timeout=DEFAULT_TIMEOUT_SECONDS)
            resp = http_client.get(SCORECARD_ENDPOINT, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("results", [])
                if results:
                    item = results[0]
                    norm_domain = normalize_domain(item.get("school.school_url"))
                    city = item.get("school.city") or ""
                    state = item.get("school.state") or ""
                    loc = ", ".join(p for p in (city, state) if p) or "Location unknown"
                    return {
                        "id": sid,
                        "name": item.get("school.name"),
                        "short_name": item.get("school.name"),
                        "domain": norm_domain,
                        "domain_status": "directory" if norm_domain else "unknown",
                        "location": loc,
                        "is_curated": False,
                    }
        except Exception:
            return None

    return None
