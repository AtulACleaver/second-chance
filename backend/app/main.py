# fastapi application routing and validation for second chance v2 api
# provides health search and source-linked research endpoints

import os
from pathlib import Path
import traceback
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

# load local environment variables from file if present
env_file = Path(__file__).resolve().parents[2] / ".env"
if env_file.exists():
    with open(env_file, encoding="utf-8") as f:
        for raw_line in f:
            clean_line = raw_line.strip()
            if clean_line and not clean_line.startswith("#") and "=" in clean_line:
                env_key, env_val = clean_line.split("=", 1)
                os.environ.setdefault(env_key.strip(), env_val.strip())

from .cache import get_cached_record, set_cached_record
from .directory import resolve_school_identity, search_schools
from .policies import attach_curated_actions, get_curated_card
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


@app.exception_handler(Exception)
async def unhandled_exception_handler(req: Request, exc: Exception) -> JSONResponse:
    # catch unhandled exceptions and return structured json error
    return JSONResponse(
        status_code=500,
        content={"error": str(exc), "trace": traceback.format_exc()},
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
@app.get("/health")
def get_health() -> Dict[str, str]:
    # return simple service health status
    return {"status": "ok"}


@app.get("/api/schools")
@app.get("/schools")
def get_schools(q: str = Query(default="", max_length=80)) -> Dict[str, Any]:
    # search institutions by name via directory with curated fallbacks
    return search_schools(query=q)


@app.post("/api/research")
@app.post("/research")
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
        # generate curated actions using current request profile after reading cached evidence
        cards = [
            attach_curated_actions(sid, card, profile_dict)
            for card in cached_rec["cards"]
        ]
        return {
            "school": {
                "id": sid,
                "name": school_name,
                "domain": domain,
            },
            "status": "cached",
            "message": "Cached policy records",
            "cards": cards,
        }

    # 3 execute live research or curated lookup
    research_result = conduct_research(
        school_id=sid,
        school_name=school_name,
        trusted_domain=domain,
        profile=profile_dict,
    )

    if research_result["status"] == "fresh":
        # persist only profile-independent evidence in cache
        set_cached_record(
            school_id=sid,
            school_name=school_name,
            domain=domain,
            cards=research_result["cards"],
        )
        return research_result

    # 4 if live research failed but previous cache exists return as visibly stale
    if cached_rec:
        # generate curated actions using current request profile after reading cached evidence
        cards = [
            attach_curated_actions(sid, card, profile_dict)
            for card in cached_rec["cards"]
        ]
        return {
            "school": {
                "id": sid,
                "name": school_name,
                "domain": domain,
            },
            "status": "stale",
            "message": "Live refresh unavailable; retaining previous records",
            "cards": cards,
        }

    # 5 honest unavailable state when no evidence can be verified
    return research_result


@app.get("/api/universities")
@app.get("/universities")
def get_universities() -> List[Dict[str, Any]]:
    # return curated cards list for default view compatibility
    princeton_card = get_curated_card("curated:princeton")
    cornell_card = get_curated_card("curated:cornell")
    tufts_card = get_curated_card("curated:tufts")
    return [c for c in (princeton_card, cornell_card, tufts_card) if c]
