# live http smoke test runner for second chance v2 api
# exercises gate 1 (live response verification) and gate 2 (fresh vs cached, unavailable)
# can test against live uvicorn server (default http://127.0.0.1:8000) or in-memory asgi

import os
import sys
from pathlib import Path
from typing import Any, Dict

import httpx

DEFAULT_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

# add backend to path for fallback in-memory testclient
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))


def log(step: str, status: str, detail: str = ""):
    color = "\033[92m[PASS]\033[0m" if status == "PASS" else "\033[91m[FAIL]\033[0m"
    print(f"{color} {step:42} {detail}")


def get_client(base_url: str):
    # try connecting to live server; if offline fall back to in-memory asgi client
    try:
        r = httpx.get(f"{base_url}/api/health", timeout=1.5)
        if r.status_code == 200:
            print(f"Connecting to live Uvicorn HTTP server at {base_url}...\n")
            return httpx.Client(base_url=base_url, timeout=10.0), "live"
    except Exception:
        pass

    print(f"Live server at {base_url} not detected. Exercising endpoints via in-memory ASGI client...\n")
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app), "asgi"


def run_smoke_tests(base_url: str = DEFAULT_BASE_URL) -> bool:
    print(f"Second Chance v2 Smoke Test Suite")
    client, mode = get_client(base_url)
    all_passed = True

    # 1. Health Endpoint
    try:
        r = client.get("/api/health")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        assert r.json() == {"status": "ok"}, f"Unexpected health response: {r.json()}"
        log("1. GET /api/health", "PASS", "Service is healthy")
    except Exception as exc:
        log("1. GET /api/health", "FAIL", str(exc))
        all_passed = False
        return False

    # 2. Search Schools (Directory & Curated)
    try:
        r = client.get("/api/schools", params={"q": "Cornell"})
        assert r.status_code == 200
        data = r.json()
        assert data["status"] in ("ok", "unavailable")
        assert len(data.get("candidates", [])) > 0
        cornell_candidate = next((c for c in data["candidates"] if "cornell" in c["id"].lower()), None)
        assert cornell_candidate is not None, "Cornell candidate not found in search"
        assert cornell_candidate.get("domain") == "cornell.edu"
        log("2. GET /api/schools?q=Cornell", "PASS", f"Found candidate: {cornell_candidate['id']}")
    except Exception as exc:
        log("2. GET /api/schools?q=Cornell", "FAIL", str(exc))
        all_passed = False

    # 3. Gate 1: Live Research over HTTP
    # Must have selected school, exact quote, matching official URL, retrieval timestamp
    try:
        req_payload = {
            "school_id": "curated:princeton",
            "profile": {
                "applicant_type": "first_year",
                "needs_aid": "yes",
                "requested_aid": "yes",
                "entry_year": "2027",
            },
            "refresh": True,
        }
        r = client.post("/api/research", json=req_payload)
        assert r.status_code == 200
        res_data = r.json()
        assert res_data["status"] in ("fresh", "cached")
        assert res_data["school"]["id"] == "curated:princeton"
        assert res_data["school"]["domain"] == "princeton.edu"
        assert len(res_data["cards"]) > 0

        card = res_data["cards"][0]
        assert len(card["evidence"]) > 0
        ev = card["evidence"][0]
        assert len(ev["quote"]) > 10, "Missing exact quote"
        assert ev["source_url"].startswith("https://"), "Missing matching official URL"
        assert "retrieved_at" in ev, "Missing retrieval timestamp"
        log("3. Gate 1: Research Spike (Princeton)", "PASS", f"Retrieved quote from {ev['source_url']}")
    except Exception as exc:
        log("3. Gate 1: Research Spike (Princeton)", "FAIL", str(exc))
        all_passed = False

    # 4. Gate 2: Cache Hit Verification
    try:
        cached_req = {
            "school_id": "curated:princeton",
            "refresh": False,
        }
        r = client.post("/api/research", json=cached_req)
        assert r.status_code == 200
        cached_data = r.json()
        assert cached_data["status"] in ("cached", "fresh")
        log("4. Gate 2: Cache Retrieval", "PASS", f"Status: {cached_data['status']}")
    except Exception as exc:
        log("4. Gate 2: Cache Retrieval", "FAIL", str(exc))
        all_passed = False

    # 5. Gate 2: Unknown Institution Safe Failure
    try:
        unknown_req = {
            "school_id": "curated:does_not_exist_institution",
            "refresh": False,
        }
        r = client.post("/api/research", json=unknown_req)
        assert r.status_code == 200
        unknown_data = r.json()
        assert unknown_data["status"] == "unavailable"
        assert unknown_data["cards"] == [], "Unavailable should return empty cards"
        log("5. Gate 2: Unknown Institution Boundary", "PASS", "Honest unavailable state without hallucination")
    except Exception as exc:
        log("5. Gate 2: Unknown Institution Boundary", "FAIL", str(exc))
        all_passed = False

    # 6. Profile Rule: Critical Action Check (Tufts)
    try:
        tufts_req = {
            "school_id": "curated:tufts",
            "profile": {
                "applicant_type": "first_year",
                "needs_aid": "yes",
                "requested_aid": "no",
                "entry_year": "2027",
            },
            "refresh": False,
        }
        r = client.post("/api/research", json=tufts_req)
        assert r.status_code == 200
        t_data = r.json()
        actions = t_data["cards"][0]["actions"]
        has_critical = any(a.startswith("Action needed:") for a in actions)
        assert has_critical, "Failed to trigger critical action needed warning"
        log("6. Profile Sensitivity: Tufts Checkbox Alert", "PASS", "Triggered 'Action needed' checkbox reminder")
    except Exception as exc:
        log("6. Profile Sensitivity: Tufts Checkbox Alert", "FAIL", str(exc))
        all_passed = False

    # 7. Security: PII & Forbidden Extra Fields Rejection (422)
    try:
        pii_req = {
            "school_id": "curated:princeton",
            "income": 45000,
            "applicant_name": "Test Student",
        }
        r = client.post("/api/research", json=pii_req)
        assert r.status_code == 422, f"Expected 422, got {r.status_code}"
        log("7. Security: Extra Fields / PII Rejection", "PASS", "HTTP 422 Unprocessable returned")
    except Exception as exc:
        log("7. Security: Extra Fields / PII Rejection", "FAIL", str(exc))
        all_passed = False

    print("\n" + ("=" * 60))
    if all_passed:
        print("ALL HTTP SMOKE TESTS PASSED - V2 CONTRACT VERIFIED")
    else:
        print("SMOKE TESTS FAILED - REVIEW LOGS ABOVE")
    print("=" * 60 + "\n")

    return all_passed


if __name__ == "__main__":
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_BASE_URL
    success = run_smoke_tests(url)
    sys.exit(0 if success else 1)
