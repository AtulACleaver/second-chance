import httpx
from app.research import (
    clean_html_to_text,
    conduct_research,
    extract_aid_passages,
    is_safe_ip,
    validate_url_target,
)


def test_is_safe_ip():
    # rejection of private loopback and link local ip addresses
    assert is_safe_ip("127.0.0.1") is False
    assert is_safe_ip("10.0.0.5") is False
    assert is_safe_ip("192.168.1.1") is False
    assert is_safe_ip("172.16.0.1") is False
    assert is_safe_ip("169.254.169.254") is False
    assert is_safe_ip("::1") is False
    assert is_safe_ip("invalid_ip") is False

    # acceptance of public routable ips
    assert is_safe_ip("93.184.216.34") is True
    assert is_safe_ip("8.8.8.8") is True


def test_clean_html_to_text():
    raw = "<html><head><script>alert(1)</script><style>body{color:red}</style></head><body><h1>Admissions &amp; Aid</h1><p>Princeton is need-blind for all students.</p></body></html>"
    cleaned = clean_html_to_text(raw)
    assert "alert(1)" not in cleaned
    assert "color:red" not in cleaned
    assert "Admissions & Aid" in cleaned
    assert "Princeton is need-blind for all students" in cleaned


def test_extract_aid_passages():
    sample_text = (
        "Welcome to our university website. "
        "Our admissions policy is completely need-blind for international undergraduates. "
        "All admitted students receive aid that meets 100% of demonstrated need without loans. "
        "Campus tours take place every Tuesday morning."
    )
    passages = extract_aid_passages(sample_text)
    assert len(passages) >= 2
    assert any("need-blind" in p.lower() for p in passages)
    assert any("demonstrated need" in p.lower() for p in passages)
    assert not any("campus tours" in p.lower() for p in passages)


def test_validate_url_target_safety():
    trusted = "princeton.edu"

    # reject http scheme
    ok, reason = validate_url_target("http://princeton.edu/aid", trusted)
    assert ok is False
    assert "only https" in reason

    # reject credentials
    ok, reason = validate_url_target("https://admin:pass@princeton.edu/aid", trusted)
    assert ok is False
    assert "credentials" in reason

    # reject non standard port
    ok, reason = validate_url_target("https://princeton.edu:8443/aid", trusted)
    assert ok is False
    assert "port" in reason

    # reject mismatched domain suffix
    ok, reason = validate_url_target("https://evilprinceton.edu/aid", trusted)
    assert ok is False
    assert "trusted domain" in reason


def test_conduct_research_curated_fallback():
    res = conduct_research(
        school_id="curated:princeton",
        school_name="Princeton University",
        trusted_domain="princeton.edu",
    )
    assert res["status"] == "fresh"
    assert len(res["cards"]) == 1
    assert res["cards"][0]["short_name"] == "Princeton"


def test_conduct_research_missing_domain():
    res = conduct_research(
        school_id="scorecard:999999",
        school_name="Mystery College",
        trusted_domain=None,
    )
    assert res["status"] == "unavailable"
    assert res["cards"] == []
    assert "verified official domain" in res["message"]


def test_conduct_research_live_flow_with_mock():
    trusted_domain = "mit.edu"
    target_url = "https://mit.edu/admissions/aid"

    sample_html = """
    <html><body>
        <h1>International Aid</h1>
        <p>MIT undergraduate admission is need-blind for all applicants, including international students.</p>
    </body></html>
    """

    def mock_handler(request: httpx.Request):
        if "tavily" in str(request.url):
            return httpx.Response(200, json={"results": [{"url": target_url}]})
        return httpx.Response(
            200,
            headers={"content-type": "text/html; charset=utf-8"},
            text=sample_html,
        )

    mock_transport = httpx.MockTransport(mock_handler)
    mock_client = httpx.Client(transport=mock_transport)

    res = conduct_research(
        school_id="scorecard:166683",
        school_name="Massachusetts Institute of Technology",
        trusted_domain=trusted_domain,
        api_key="mock_tavily_key",
        client=mock_client,
    )
    assert res["status"] == "fresh"
    assert len(res["cards"]) == 1
    card = res["cards"][0]
    assert len(card["evidence"]) >= 1
    assert "need-blind" in card["evidence"][0]["quote"].lower()
    assert card["evidence"][0]["source_url"] == target_url
