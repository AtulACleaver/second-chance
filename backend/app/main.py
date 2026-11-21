# fastapi application routing and validation for second chance v2 api
# provides health search and source-linked research endpoints

import os
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field

from .cache import get_cached_record, set_cached_record
from .directory import resolve_school_identity, search_schools
from .policies import get_curated_card
from .research import conduct_research

app = FastAPI(title="Second Chance", version="0.2.0")

# configure cors origins from environment
cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ApplicantProfile(BaseModel):
    # non-sensitive applicant profile choices
    model_config = ConfigDict(extra="forbid")

    applicant_type: Literal["first_year", "transfer", "unknown"] = "unknown"
    needs_aid: Literal["yes", "no", "unsure"] = "unsure"
    requested_aid: Literal["yes", "no", "unsure"] = "unsure"
    entry_year: Literal["2027", "other", "unknown"] = "unknown"


class ResearchRequest(BaseModel):
    # research request with candidate id and optional profile
    model_config = ConfigDict(extra="forbid")

    school_id: str = Field(..., min_length=1, max_length=100)
    profile: Optional[ApplicantProfile] = None
    refresh: bool = False


@app.get("/api/health")
def get_health() -> Dict[str, str]:
    # return simple service health status
    return {"status": "ok"}


@app.get("/api/schools")
def get_schools(q: str = Query(default="", max_length=80)) -> Dict[str, Any]:
    # search institutions by name via directory with curated fallbacks
    return search_schools(query=q)


@app.post("/api/research")
def post_research(req: ResearchRequest) -> Dict[str, Any]:
    # execute source-linked policy research on a selected institution
    sid = req.school_id.strip()

    # 1 resolve school identity server-side
    resolved = resolve_school_identity(sid)
    if not resolved:
        return {
            "school": {
                "id": sid,
                "name": "Unknown institution",
                "domain": None,
            },
            "status": "unavailable",
            "message": "Institution identity could not be verified in directory or curated records",
            "cards": [],
        }

    school_name = resolved["name"]
    domain = resolved.get("domain")
    profile_dict = req.profile.model_dump() if req.profile else None

    # 2 if refresh is not forced check existing cache
    cached_rec, is_stale = get_cached_record(sid)
    if not req.refresh and cached_rec and not is_stale:
        return {
            "school": {
                "id": sid,
                "name": school_name,
                "domain": domain,
            },
            "status": "cached",
            "message": "Loaded cached source records",
            "cards": cached_rec["cards"],
        }

    # 3 execute live research or curated lookup
    research_result = conduct_research(
        school_id=sid,
        school_name=school_name,
        trusted_domain=domain,
        profile=profile_dict,
    )

    if research_result["status"] == "fresh":
        # persist successful findings in cache
        set_cached_record(
            school_id=sid,
            school_name=school_name,
            domain=domain,
            cards=research_result["cards"],
        )
        return research_result

    # 4 if live research failed but previous cache exists return as visibly stale
    if cached_rec:
        return {
            "school": {
                "id": sid,
                "name": school_name,
                "domain": domain,
            },
            "status": "stale",
            "message": "Live refresh unavailable; retaining previous verified evidence",
            "cards": cached_rec["cards"],
        }

    # 5 honest unavailable state when no evidence can be verified
    return research_result


@app.get("/api/universities")
def get_universities() -> List[Dict[str, Any]]:
    # return curated cards list for default view compatibility
    princeton_card = get_curated_card("curated:princeton")
    cornell_card = get_curated_card("curated:cornell")
    tufts_card = get_curated_card("curated:tufts")
    return [c for c in (princeton_card, cornell_card, tufts_card) if c]
