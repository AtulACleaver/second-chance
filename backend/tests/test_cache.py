import os
import tempfile
from app.cache import get_cached_record, init_cache_db, set_cached_record


def test_cache_roundtrip():
    with tempfile.NamedTemporaryFile(suffix=".sqlite3", delete=False) as tf:
        db_path = tf.name

    try:
        init_cache_db(db_path)

        # verify miss on empty cache
        record, is_stale = get_cached_record("scorecard:123", db_path=db_path)
        assert record is None
        assert is_stale is False

        sample_cards = [
            {
                "id": "scorecard:123",
                "short_name": "Test University",
                "evidence": [{"quote": "Policy statement"}],
            }
        ]

        # persist record
        set_cached_record(
            school_id="scorecard:123",
            school_name="Test University",
            domain="test.edu",
            cards=sample_cards,
            db_path=db_path,
        )

        # verify cache hit
        rec, is_stale = get_cached_record(
            "scorecard:123", db_path=db_path, ttl_seconds=3600
        )
        assert rec is not None
        assert is_stale is False
        assert rec["school_name"] == "Test University"
        assert rec["domain"] == "test.edu"
        assert len(rec["cards"]) == 1

        # verify stale flag when ttl is 0
        rec_stale, is_stale_flag = get_cached_record(
            "scorecard:123", db_path=db_path, ttl_seconds=0
        )
        assert rec_stale is not None
        assert is_stale_flag is True

        # verify that profile-dependent actions are stripped before caching
        cards_with_actions = [
            {
                "id": "scorecard:123",
                "short_name": "Test University",
                "evidence": [{"quote": "Policy statement"}],
                "actions": ["Action needed: contact office immediately"],
                "profile": {"needs_aid": "yes"},
            }
        ]
        set_cached_record(
            school_id="scorecard:123",
            school_name="Test University",
            domain="test.edu",
            cards=cards_with_actions,
            db_path=db_path,
        )
        rec_clean, _ = get_cached_record("scorecard:123", db_path=db_path)
        assert rec_clean is not None
        cached_card = rec_clean["cards"][0]
        assert "actions" not in cached_card
        assert "profile" not in cached_card
        assert cached_card["evidence"] == [{"quote": "Policy statement"}]

    finally:
        if os.path.exists(db_path):
            os.remove(db_path)
