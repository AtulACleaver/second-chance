# evaluation and regression runner for profile rules and school research
# validates profile action sensitivity and failure state safety

import json
from pathlib import Path
import sys

# add backend to path for module imports
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.directory import is_allowed_host, normalize_domain, search_schools
from app.policies import get_curated_card
from app.research import conduct_research, is_safe_ip


def run_profile_evaluations() -> None:
    # evaluate fictional profiles against curated policy action expectations
    profiles_path = Path(__file__).parent / "profiles.json"
    profiles = json.loads(profiles_path.read_text(encoding="utf-8"))

    counts = {"tufts_rules": {"tp": 0, "fp": 0, "fn": 0, "tn": 0}, "cornell_rules": {"tp": 0, "fp": 0, "fn": 0, "tn": 0}}

    for row in profiles:
        prof = {
            "applicant_type": row["applicant_type"],
            "needs_aid": row["needs_aid"],
            "requested_aid": row["requested_aid"],
            "entry_year": row["entry_year"],
        }

        # evaluate tufts card
        tufts_card = get_curated_card("curated:tufts", profile=prof)
        has_tufts_action = False
        if tufts_card:
            has_tufts_action = any(a.startswith("Action needed:") for a in tufts_card.get("actions", []))

        expected_tufts = row["tufts_action"]
        if has_tufts_action and expected_tufts:
            counts["tufts_rules"]["tp"] += 1
        elif has_tufts_action and not expected_tufts:
            counts["tufts_rules"]["fp"] += 1
        elif not has_tufts_action and expected_tufts:
            counts["tufts_rules"]["fn"] += 1
        else:
            counts["tufts_rules"]["tn"] += 1

        # evaluate cornell card
        cornell_card = get_curated_card("curated:cornell", profile=prof)
        has_cornell_css = False
        if cornell_card:
            has_cornell_css = any("CSS Profile" in a and "submit" in a.lower() for a in cornell_card.get("actions", []))

        expected_cornell = row["cornell_css"]
        if has_cornell_css and expected_cornell:
            counts["cornell_rules"]["tp"] += 1
        elif has_cornell_css and not expected_cornell:
            counts["cornell_rules"]["fp"] += 1
        elif not has_cornell_css and expected_cornell:
            counts["cornell_rules"]["fn"] += 1
        else:
            counts["cornell_rules"]["tn"] += 1

    print("Profile Regression Results:")
    for rule_name, c in counts.items():
        print(f"  {rule_name}: TP={c['tp']} FP={c['fp']} FN={c['fn']} TN={c['tn']}")
        assert c["fp"] == 0, f"False positives detected in {rule_name}"
        assert c["fn"] == 0, f"False negatives detected in {rule_name}"


def run_safety_evaluations() -> None:
    # evaluate domain boundary checks and ssrf rejection scenarios
    print("\nSafety Verification Scenarios:")

    # 1 host boundary suffix test
    trusted = "princeton.edu"
    assert is_allowed_host("admission.princeton.edu", trusted) is True
    assert is_allowed_host("evilprinceton.edu", trusted) is False
    assert is_allowed_host("princeton.edu.attacker.com", trusted) is False
    print("  [PASS] Domain suffix boundary spoofing rejected")

    # 2 ssrf ip filter test
    assert is_safe_ip("169.254.169.254") is False
    assert is_safe_ip("127.0.0.1") is False
    assert is_safe_ip("10.0.0.1") is False
    assert is_safe_ip("8.8.8.8") is True
    print("  [PASS] SSRF and cloud metadata addresses rejected")

    # 3 missing domain test
    res = conduct_research(
        school_id="scorecard:0000",
        school_name="Unresolved College",
        trusted_domain=None,
    )
    assert res["status"] == "unavailable"
    assert res["cards"] == []
    print("  [PASS] Unresolved institution domain returns honest unavailable")


if __name__ == "__main__":
    run_profile_evaluations()
    run_safety_evaluations()
    print("\nAll evaluation suites completed successfully with zero regression failures")
