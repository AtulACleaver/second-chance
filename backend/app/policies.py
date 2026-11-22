# curated public policy statements and verified fallback records
# source-linked conditions for international undergraduate applicants
# all statements are verified against official university publications

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

CHECKED_ON = "2026-11-22"
CHECKED_AT_ISO = "2026-11-22T00:00:00Z"

CURATED_SCHOOLS: Dict[str, Dict[str, Any]] = {
    "curated:princeton": {
        "id": "curated:princeton",
        "name": "Princeton University",
        "short_name": "Princeton",
        "location": "Princeton, NJ",
        "domain": "princeton.edu",
        "domain_status": "curated",
        "inquiry_email": "pfaa@princeton.edu",
        "tagline": "Aid need does not disadvantage admission.",
        "admissions": "Need-blind for financial aid applicants.",
        "aid": "For admitted international students, demonstrated need is met. Qualifying aid is a grant, not a loan.",
        "catch": "The expected family contribution is based on Princeton's financial aid assessment. No academic or athletic merit scholarships.",
        "source_url": "https://admission.princeton.edu/apply/international-students",
        "evidence": [
            {
                "quote": "Princeton admission is need-blind",
                "source_url": "https://admission.princeton.edu/apply/international-students",
                "retrieved_at": CHECKED_AT_ISO,
                "source_type": "curated",
                "review_status": "team_reviewed",
                "scope": "International undergraduate first-year and transfer",
                "cycle": "2026-2027",
            },
            {
                "quote": "Financial aid awards cover the difference between Princeton’s costs and the amount your family is expected to contribute to your education.",
                "source_url": "https://admission.princeton.edu/apply/international-students",
                "retrieved_at": CHECKED_AT_ISO,
                "source_type": "curated",
                "review_status": "team_reviewed",
                "scope": "International undergraduate first-year and transfer",
                "cycle": "2026-2027",
            },
        ],
    },
    "curated:cornell": {
        "id": "curated:cornell",
        "name": "Cornell University",
        "short_name": "Cornell",
        "location": "Ithaca, NY",
        "domain": "cornell.edu",
        "domain_status": "curated",
        "inquiry_email": "finaid@cornell.edu",
        "tagline": "Your need can be considered in admission.",
        "admissions": "Need-aware for international applicants; financial need is one factor among many.",
        "aid": "Admitted international undergraduates' demonstrated need is met with grants and an annual work-study award, plus reasonable loans depending on total family income.",
        "catch": "International first-year and transfer applicants seeking grant or scholarship aid at any point must submit the CSS Profile when applying for admission.",
        "source_url": "https://finaid.cornell.edu/apply-aid/prospective-international-applicants",
        "evidence": [
            {
                "quote": "Cornell’s undergraduate admission process for international students* is \"need-aware\"",
                "source_url": "https://finaid.cornell.edu/apply-aid/prospective-international-applicants",
                "retrieved_at": CHECKED_AT_ISO,
                "source_type": "curated",
                "review_status": "team_reviewed",
                "scope": "International undergraduate first-year and transfer",
                "cycle": "2026-2027",
            },
            {
                "quote": "All first-year and transfer undergraduate international applicants* seeking Cornell grant or scholarship aid at any point during their undergraduate course of study must complete the CSS Profile when they apply for admission.",
                "source_url": "https://finaid.cornell.edu/apply-aid/prospective-international-applicants",
                "retrieved_at": CHECKED_AT_ISO,
                "source_type": "curated",
                "review_status": "team_reviewed",
                "scope": "International undergraduate first-year and transfer",
                "cycle": "2026-2027",
            },
        ],
    },
    "curated:tufts": {
        "id": "curated:tufts",
        "name": "Tufts University",
        "short_name": "Tufts",
        "location": "Medford, MA",
        "domain": "tufts.edu",
        "domain_status": "curated",
        "inquiry_email": "studentservices@tufts.edu",
        "tagline": "Ask for aid when you apply.",
        "admissions": "Check the current admissions policy for your circumstances; this prototype does not assess admission.",
        "aid": "Tufts says it meets admitted students' demonstrated financial need regardless of citizenship. Need depends on its assessment of family resources.",
        "catch": "International applicants must indicate their intention to apply for aid on the admission application. A free ISFAA is an option at application; admitted aid applicants are asked for the CSS Profile and get a fee waiver after admission.",
        "source_url": "https://admissions.tufts.edu/tuition-and-aid/applying-for-aid/international-student-aid",
        "evidence": [
            {
                "quote": "International students applying for financial aid must indicate their interest in applying for financial aid on the application at the time of submission.",
                "source_url": "https://admissions.tufts.edu/tuition-and-aid/applying-for-aid/international-student-aid",
                "retrieved_at": CHECKED_AT_ISO,
                "source_type": "curated",
                "review_status": "team_reviewed",
                "scope": "International undergraduate first-year and transfer",
                "cycle": "2026-2027",
            },
            {
                "quote": "The CSS Profile is not required at the time of application.",
                "source_url": "https://admissions.tufts.edu/tuition-and-aid/applying-for-aid/international-student-aid",
                "retrieved_at": CHECKED_AT_ISO,
                "source_type": "curated",
                "review_status": "team_reviewed",
                "scope": "International undergraduate first-year and transfer",
                "cycle": "2026-2027",
            },
        ],
    },
}

# aliases for backward compatibility and simple key lookups
CURATED_ALIASES = {
    "princeton": "curated:princeton",
    "cornell": "curated:cornell",
    "tufts": "curated:tufts",
}


def canonical_school_id(school_id: str) -> str:
    # normalize input school id to canonical form
    lowered = school_id.strip().lower()
    return CURATED_ALIASES.get(lowered, lowered)


def build_curated_actions(
    school_id: str,
    applicant_type: str = "unknown",
    needs_aid: str = "unsure",
    requested_aid: str = "unsure",
    entry_year: str = "unknown",
) -> List[str]:
    # generate neutral profile-sensitive action items based on curated policy
    canon = canonical_school_id(school_id)
    actions: List[str] = []

    if canon == "curated:princeton":
        actions.append(
            "Check Princeton's aid application and its deadline for your entry year and applicant type."
        )
    elif canon == "curated:cornell":
        if applicant_type == "unknown":
            actions.append(
                "Confirm whether you are a first-year or transfer applicant; this summary covers those groups."
            )
        if needs_aid == "yes":
            actions.append(
                "If you seek Cornell grant or scholarship aid at any point, submit the CSS Profile when applying for admission."
            )
        elif needs_aid == "unsure":
            actions.append(
                "Decide whether you may need Cornell grant or scholarship aid at any point; check the CSS rule before applying."
            )
        else:
            actions.append(
                "If you may need Cornell grant or scholarship aid later, check the CSS requirement before applying."
            )

        if entry_year == "2027":
            actions.append(
                "Check Cornell's Fall 2027 priority date for your application round: early decision, regular decision, or transfer."
            )
        else:
            actions.append(
                "Find the priority date for your own entry year and application round; dates shown for Fall 2027 may not apply."
            )
    elif canon == "curated:tufts":
        if needs_aid == "yes" and requested_aid == "no":
            actions.append(
                "Action needed: if your application is not yet submitted, indicate that you intend to apply for aid. If already submitted, contact Tufts immediately about your circumstances."
            )
        elif needs_aid != "no" and requested_aid == "unsure":
            actions.append(
                "Check whether you indicated aid on your admission application. Ask Tufts if you are unsure."
            )
        elif needs_aid == "yes" and requested_aid == "yes":
            actions.append(
                "Your selection says you indicated an aid request. Confirm your actual application and check the aid forms."
            )
        else:
            actions.append(
                "If you expect to need aid, check the requirement to request it when applying for admission."
            )
        actions.append(
            "At application, check the free ISFAA option. Tufts asks admitted international aid applicants for CSS and provides a waiver after admission."
        )
    else:
        actions.append("Check the institution's official international student financial aid page for specific deadlines and forms.")

    return actions


def get_curated_evidence(school_id: str) -> Optional[Dict[str, Any]]:
    # return profile-independent evidence card for curated institution
    canon = canonical_school_id(school_id)
    policy = CURATED_SCHOOLS.get(canon)
    if not policy:
        return None

    return {
        "id": policy["id"],
        "short_name": policy["short_name"],
        "tagline": policy["tagline"],
        "inquiry_email": policy.get("inquiry_email"),
        "evidence": policy["evidence"],
        "assessment": "Not evaluated",
    }


def attach_curated_actions(
    school_id: str,
    card: Dict[str, Any],
    profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    # attach actions generated for the current request profile to an evidence card
    canon = canonical_school_id(school_id)
    c = dict(card)
    prof = profile or {}

    if canon in CURATED_SCHOOLS or c.get("id") in CURATED_SCHOOLS:
        target_id = canon if canon in CURATED_SCHOOLS else c.get("id", school_id)
        c["actions"] = build_curated_actions(
            target_id,
            applicant_type=prof.get("applicant_type", "unknown"),
            needs_aid=prof.get("needs_aid", "unsure"),
            requested_aid=prof.get("requested_aid", "unsure"),
            entry_year=prof.get("entry_year", "unknown"),
        )
    elif "actions" not in c or not c["actions"]:
        c["actions"] = [
            "Review the exact quoted policy passages above on the official university website",
            "Contact international undergraduate admissions to verify requirements for your specific cycle",
        ]
    return c


def get_curated_card(school_id: str, profile: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
    # return full evidence card with actions for curated institution
    base = get_curated_evidence(school_id)
    if not base:
        return None
    return attach_curated_actions(school_id, base, profile)


def get_curated_candidates() -> List[Dict[str, Any]]:
    # return all curated schools as candidate objects for directory lookup
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "location": s["location"],
            "domain": s["domain"],
            "domain_status": s["domain_status"],
            "inquiry_email": s.get("inquiry_email"),
        }
        for s in CURATED_SCHOOLS.values()
    ]
