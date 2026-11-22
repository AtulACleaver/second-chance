from unittest.mock import patch
from fastapi.testclient import TestClient
from app.cache import init_cache_db, set_cached_record
from app.main import app

client = TestClient(app)


def test_api_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_api_schools_search():
    res = client.get("/api/schools?q=princeton")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"
    assert len(data["candidates"]) >= 1
    assert data["candidates"][0]["id"] == "curated:princeton"


def test_api_research_endpoint_curated_flow():
    payload = {
        "school_id": "curated:tufts",
        "profile": {
            "applicant_type": "first_year",
            "needs_aid": "yes",
            "requested_aid": "no",
            "entry_year": "2027",
        },
        "refresh": True,
    }

    # first call returns fresh
    res = client.post("/api/research", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "fresh"
    assert data["school"]["id"] == "curated:tufts"
    assert len(data["cards"]) == 1
    card = data["cards"][0]
    assert card["short_name"] == "Tufts"
    assert any("Action needed:" in act for act in card["actions"])

    # second call with refresh false returns cached
    payload["refresh"] = False
    res_cached = client.post("/api/research", json=payload)
    assert res_cached.status_code == 200
    assert res_cached.json()["status"] == "cached"


def test_profile_actions_request_no_then_yes_returns_different_actions():
    # first request tufts with needs_aid=yes and requested_aid=no
    req_no = {
        "school_id": "curated:tufts",
        "profile": {
            "applicant_type": "first_year",
            "needs_aid": "yes",
            "requested_aid": "no",
            "entry_year": "2027",
        },
        "refresh": True,
    }
    res_no = client.post("/api/research", json=req_no)
    assert res_no.status_code == 200
    cards_no = res_no.json()["cards"]
    assert len(cards_no) == 1
    actions_no = cards_no[0]["actions"]
    assert any("Action needed:" in a for a in actions_no)
    assert not any("Your selection says you indicated an aid request" in a for a in actions_no)

    # second request tufts with needs_aid=yes and requested_aid=yes from cache
    req_yes = {
        "school_id": "curated:tufts",
        "profile": {
            "applicant_type": "first_year",
            "needs_aid": "yes",
            "requested_aid": "yes",
            "entry_year": "2027",
        },
        "refresh": False,
    }
    res_yes = client.post("/api/research", json=req_yes)
    assert res_yes.status_code == 200
    data_yes = res_yes.json()
    assert data_yes["status"] == "cached"
    cards_yes = data_yes["cards"]
    assert len(cards_yes) == 1
    actions_yes = cards_yes[0]["actions"]
    assert any("Your selection says you indicated an aid request" in a for a in actions_yes)
    assert not any("Action needed:" in a for a in actions_yes)
    assert actions_no != actions_yes


def test_profile_actions_reverse_order_yes_then_no_returns_different_actions():
    # first request tufts with needs_aid=yes and requested_aid=yes
    req_yes = {
        "school_id": "curated:tufts",
        "profile": {
            "applicant_type": "first_year",
            "needs_aid": "yes",
            "requested_aid": "yes",
            "entry_year": "2027",
        },
        "refresh": True,
    }
    res_yes = client.post("/api/research", json=req_yes)
    assert res_yes.status_code == 200
    cards_yes = res_yes.json()["cards"]
    actions_yes = cards_yes[0]["actions"]
    assert any("Your selection says you indicated an aid request" in a for a in actions_yes)
    assert not any("Action needed:" in a for a in actions_yes)

    # second request tufts with needs_aid=yes and requested_aid=no from cache
    req_no = {
        "school_id": "curated:tufts",
        "profile": {
            "applicant_type": "first_year",
            "needs_aid": "yes",
            "requested_aid": "no",
            "entry_year": "2027",
        },
        "refresh": False,
    }
    res_no = client.post("/api/research", json=req_no)
    assert res_no.status_code == 200
    data_no = res_no.json()
    assert data_no["status"] == "cached"
    cards_no = data_no["cards"]
    actions_no = cards_no[0]["actions"]
    assert any("Action needed:" in a for a in actions_no)
    assert not any("Your selection says you indicated an aid request" in a for a in actions_no)
    assert actions_yes != actions_no


def test_cache_hit_avoids_unnecessary_upstream_research():
    # seed cache with fresh research for tufts
    seed_payload = {
        "school_id": "curated:tufts",
        "profile": {"applicant_type": "first_year", "needs_aid": "yes"},
        "refresh": True,
    }
    seed_res = client.post("/api/research", json=seed_payload)
    assert seed_res.status_code == 200

    # patch conduct_research to ensure it is not called on cache hit
    with patch("app.main.conduct_research") as mock_research:
        cached_payload = {
            "school_id": "curated:tufts",
            "profile": {
                "applicant_type": "first_year",
                "needs_aid": "yes",
                "requested_aid": "no",
            },
            "refresh": False,
        }
        res = client.post("/api/research", json=cached_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "cached"
        mock_research.assert_not_called()
        # verify actions were still generated for the current profile
        actions = data["cards"][0]["actions"]
        assert any("Action needed:" in a for a in actions)


def test_stale_and_unavailable_behavior_unchanged():
    # 1 unknown school returns unavailable with empty cards
    unknown_res = client.post("/api/research", json={"school_id": "scorecard:999999"})
    assert unknown_res.status_code == 200
    unknown_data = unknown_res.json()
    assert unknown_data["status"] == "unavailable"
    assert unknown_data["cards"] == []

    # 2 stale cache fallback when upstream research fails
    # seed cache for a school
    seed_cards = [
        {
            "id": "curated:cornell",
            "short_name": "Cornell",
            "tagline": "Your need can be considered in admission.",
            "evidence": [{"quote": "Cornell is need-aware"}],
        }
    ]
    set_cached_record(
        school_id="curated:cornell",
        school_name="Cornell University",
        domain="cornell.edu",
        cards=seed_cards,
    )

    # simulate stale entry with failed live refresh
    with patch("app.main.get_cached_record") as mock_cache:
        mock_cache.return_value = (
            {
                "school_id": "curated:cornell",
                "school_name": "Cornell University",
                "domain": "cornell.edu",
                "cards": seed_cards,
                "retrieved_at": "2026-01-01T00:00:00Z",
            },
            True,  # is_stale
        )
        with patch("app.main.conduct_research") as mock_research:
            mock_research.return_value = {
                "school": {"id": "curated:cornell", "name": "Cornell University", "domain": "cornell.edu"},
                "status": "unavailable",
                "message": "upstream portal network error",
                "cards": [],
            }
            stale_payload = {
                "school_id": "curated:cornell",
                "profile": {"needs_aid": "yes", "entry_year": "2027"},
                "refresh": False,
            }
            res_stale = client.post("/api/research", json=stale_payload)
            assert res_stale.status_code == 200
            stale_data = res_stale.json()
            assert stale_data["status"] == "stale"
            assert "Live refresh unavailable" in stale_data["message"]
            assert len(stale_data["cards"]) == 1
            # verify current profile actions were populated on the stale card
            cornell_actions = stale_data["cards"][0]["actions"]
            assert any("submit the CSS Profile" in a for a in cornell_actions)


def test_api_research_rejects_extra_fields_and_invalid_values():
    # forbid extra pii fields like income
    bad_payload_extra = {
        "school_id": "curated:princeton",
        "profile": {"income": "100000"},
    }
    assert client.post("/api/research", json=bad_payload_extra).status_code == 422

    # forbid invalid enum choices
    bad_payload_enum = {
        "school_id": "curated:princeton",
        "profile": {"needs_aid": "definitely"},
    }
    assert client.post("/api/research", json=bad_payload_enum).status_code == 422


def test_api_research_unresolved_school_identity():
    payload = {"school_id": "nonexistent:9999"}
    res = client.post("/api/research", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "unavailable"
    assert data["cards"] == []


def test_api_universities_endpoint():
    res = client.get("/api/universities")
    assert res.status_code == 200
    cards = res.json()
    assert len(cards) == 3
    ids = {c["id"] for c in cards}
    assert ids == {"curated:princeton", "curated:cornell", "curated:tufts"}
