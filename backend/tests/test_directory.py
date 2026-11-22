import httpx
from app.directory import (
    is_allowed_host,
    normalize_domain,
    resolve_school_identity,
    search_curated,
    search_schools,
)


def test_normalize_domain():
    assert normalize_domain("https://www.princeton.edu/apply") == "princeton.edu"
    assert normalize_domain("http://cornell.edu/") == "cornell.edu"
    assert normalize_domain("admissions.tufts.edu") == "admissions.tufts.edu"
    assert normalize_domain("www.harvard.edu") == "harvard.edu"

    # rejection of invalid / deceptive domains
    assert normalize_domain("http://user:pass@princeton.edu") is None
    assert normalize_domain("http://princeton.edu:8080") is None
    assert normalize_domain("not a domain") is None
    assert normalize_domain("") is None
    assert normalize_domain(None) is None


def test_is_allowed_host_boundaries():
    trusted = "princeton.edu"

    # valid matches
    assert is_allowed_host("princeton.edu", trusted) is True
    assert is_allowed_host("www.princeton.edu", trusted) is True
    assert is_allowed_host("admission.princeton.edu", trusted) is True
    assert is_allowed_host("finaid.admission.princeton.edu", trusted) is True

    # suffix attacks and impersonation must fail
    assert is_allowed_host("evilprinceton.edu", trusted) is False
    assert is_allowed_host("princeton.edu.attacker.com", trusted) is False
    assert is_allowed_host("fakeprinceton.edu", trusted) is False
    assert is_allowed_host("attacker-princeton.edu", trusted) is False
    assert is_allowed_host("", trusted) is False


def test_search_curated():
    matches = search_curated("princeton")
    assert len(matches) == 1
    assert matches[0]["id"] == "curated:princeton"

    matches_all = search_curated("university")
    assert len(matches_all) >= 2


def test_search_schools_without_api_key():
    # curated match returns ok
    res_curated = search_schools("Tufts", api_key="")
    assert res_curated["status"] == "ok"
    assert len(res_curated["candidates"]) >= 1
    assert res_curated["candidates"][0]["id"] == "curated:tufts"

    # non-matching search returns honest unavailable
    res_unknown = search_schools("Nonexistent University 12345", api_key="")
    assert res_unknown["status"] == "unavailable"
    assert res_unknown["candidates"] == []


def test_search_schools_with_mock_client():
    mock_payload = {
        "results": [
            {
                "id": 186131,
                "school.name": "Princeton University",
                "school.city": "Princeton",
                "school.state": "NJ",
                "school.school_url": "www.princeton.edu",
            },
            {
                "id": 190150,
                "school.name": "Columbia University in the City of New York",
                "school.city": "New York",
                "school.state": "NY",
                "school.school_url": "www.columbia.edu",
            },
        ]
    }

    def mock_handler(request: httpx.Request):
        return httpx.Response(200, json=mock_payload)

    mock_transport = httpx.MockTransport(mock_handler)
    mock_client = httpx.Client(transport=mock_transport)

    res = search_schools("Columbia", api_key="dummy_key", client=mock_client)
    assert res["status"] == "ok"
    cand_ids = [c["id"] for c in res["candidates"]]
    assert "scorecard:190150" in cand_ids

    columbia = next(c for c in res["candidates"] if c["id"] == "scorecard:190150")
    assert columbia["domain"] == "columbia.edu"
    assert columbia["domain_status"] == "directory"
    assert columbia["location"] == "New York, NY"


def test_resolve_school_identity():
    # curated
    curated = resolve_school_identity("curated:princeton")
    assert curated is not None
    assert curated["domain"] == "princeton.edu"
    assert curated["is_curated"] is True

    # unknown
    assert resolve_school_identity("unknown:999") is None
