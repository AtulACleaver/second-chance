# sqlite cache for official university evidence records
# stores source passages links and retrieval timestamps with configurable ttl

from datetime import datetime, timezone
import json
import os
import sqlite3
from typing import Any, Dict, List, Optional, Tuple

DEFAULT_CACHE_PATH = "./second_chance.sqlite3"
DEFAULT_TTL_SECONDS = 86400


def get_db_path() -> str:
    # get configured sqlite cache database path with fallback for vercel serverless
    configured = os.getenv("CACHE_PATH", "").strip()
    if configured:
        return configured
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME") or not os.access(".", os.W_OK):
        return "/tmp/second_chance.sqlite3"
    return DEFAULT_CACHE_PATH


def init_cache_db(db_path: Optional[str] = None) -> None:
    # initialize sqlite table for evidence caching if not exists
    path = db_path or get_db_path()
    try:
        conn = sqlite3.connect(path)
        try:
            with conn:
                create_table_sql = (
                    "CREATE TABLE IF NOT EXISTS evidence_cache ("
                    "school_id TEXT PRIMARY KEY, "
                    "school_name TEXT NOT NULL, "
                    "domain TEXT, "
                    "cards_json TEXT NOT NULL, "
                    "retrieved_at TEXT NOT NULL, "
                    "status TEXT NOT NULL"
                    ")"
                )
                conn.execute(create_table_sql)
        finally:
            conn.close()
    except Exception:
        # safely ignore initialization errors on restricted storage
        pass


def strip_profile_data_for_cache(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    # strip profile choices and profile-dependent actions before saving to cache
    cleaned_cards: List[Dict[str, Any]] = []
    for card in cards:
        c = dict(card)
        # do not store profile-dependent actions or choices in shared cached records
        c.pop("actions", None)
        c.pop("profile", None)
        cleaned_cards.append(c)
    return cleaned_cards


def get_cached_record(
    school_id: str,
    db_path: Optional[str] = None,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> Tuple[Optional[Dict[str, Any]], bool]:
    # retrieve cached evidence record and determine whether it is within ttl or stale
    # returns tuple of record dict and is stale boolean
    try:
        path = db_path or get_db_path()
        init_cache_db(path)

        conn = sqlite3.connect(path)
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT school_id, school_name, domain, cards_json, retrieved_at, status FROM evidence_cache WHERE school_id = ?",
                (school_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None, False

            sid, sname, dom, cards_str, retrieved_at_str, _ = row
            cards = json.loads(cards_str)

            # parse timestamp and check age
            is_stale = False
            try:
                retrieved_dt = datetime.fromisoformat(retrieved_at_str.replace("Z", "+00:00"))
                now_dt = datetime.now(timezone.utc)
                age_seconds = (now_dt - retrieved_dt).total_seconds()
                if age_seconds > ttl_seconds:
                    is_stale = True
            except Exception:
                is_stale = True

            record = {
                "school_id": sid,
                "school_name": sname,
                "domain": dom,
                "cards": cards,
                "retrieved_at": retrieved_at_str,
            }
            return record, is_stale

        finally:
            conn.close()
    except Exception:
        # fallback to miss if cache read fails
        return None, False


def set_cached_record(
    school_id: str,
    school_name: str,
    domain: Optional[str],
    cards: List[Dict[str, Any]],
    db_path: Optional[str] = None,
    retrieved_at: Optional[str] = None,
) -> None:
    # persist valid verified source cards into sqlite cache
    if not cards:
        return

    try:
        path = db_path or get_db_path()
        init_cache_db(path)

        now_utc = retrieved_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        # cache only profile-independent evidence
        safe_cards = strip_profile_data_for_cache(cards)
        cards_str = json.dumps(safe_cards)

        conn = sqlite3.connect(path)
        try:
            with conn:
                upsert_sql = (
                    "INSERT INTO evidence_cache (school_id, school_name, domain, cards_json, retrieved_at, status) "
                    "VALUES (?, ?, ?, ?, ?, ?) "
                    "ON CONFLICT(school_id) DO UPDATE SET "
                    "school_name = excluded.school_name, "
                    "domain = excluded.domain, "
                    "cards_json = excluded.cards_json, "
                    "retrieved_at = excluded.retrieved_at, "
                    "status = excluded.status"
                )
                conn.execute(
                    upsert_sql,
                    (school_id, school_name, domain, cards_str, now_utc, "cached"),
                )
        finally:
            conn.close()
    except Exception:
        # safely skip persistence if cache write fails
        pass
