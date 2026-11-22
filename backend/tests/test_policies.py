from app.policies import (
    CURATED_SCHOOLS,
    build_curated_actions,
    get_curated_candidates,
    get_curated_card,
)


def test_curated_schools_structure():
    assert "curated:princeton" in CURATED_SCHOOLS
    assert "curated:cornell" in CURATED_SCHOOLS
    assert "curated:tufts" in CURATED_SCHOOLS

    for school_id, school in CURATED_SCHOOLS.items():
        assert school["id"] == school_id
        assert school["name"]
        assert school["domain"].endswith(".edu")
        assert school["domain_status"] == "curated"
        assert school["source_url"].startswith("https://")
        assert len(school["evidence"]) >= 1

        for ev in school["evidence"]:
            assert ev["quote"]
            assert ev["source_url"].startswith("https://")
            assert ev["retrieved_at"]
            assert ev["source_type"] == "curated"
            assert ev["review_status"] == "team_reviewed"


def test_get_curated_card_tufts_action_needed():
    card = get_curated_card(
        "curated:tufts",
        profile={"needs_aid": "yes", "requested_aid": "no", "applicant_type": "first_year"},
    )
    assert card is not None
    assert card["id"] == "curated:tufts"
    assert card["short_name"] == "Tufts"
    assert card["assessment"] == "Not evaluated"
    assert any("Action needed:" in act for act in card["actions"])


def test_get_curated_card_cornell_css_profile():
    card = get_curated_card(
        "curated:cornell",
        profile={"needs_aid": "yes", "requested_aid": "yes", "applicant_type": "first_year"},
    )
    assert card is not None
    assert any("CSS Profile" in act for act in card["actions"])


def test_get_curated_candidates():
    candidates = get_curated_candidates()
    assert len(candidates) == 3
    ids = {c["id"] for c in candidates}
    assert ids == {"curated:princeton", "curated:cornell", "curated:tufts"}
    assert all(c["domain_status"] == "curated" for c in candidates)
