# API contract v1

POST /api/compare accepts a JSON object with exactly these fields:
- applicant_type: first_year | transfer | unknown
- needs_aid: yes | no | unsure
- requested_aid: yes | no | unsure
- entry_year: 2027 | other | unknown

A 200 response contains scope, status and cards. Each card has id, name, short_name, tagline, admissions, aid, catch, evidence (string array), source_url, checked_on, cycle, actions (string array) and assessment. Never return an eligibility decision.

GET /api/health returns {"status":"ok"}. GET /api/universities returns the cards array for a default profile.
Invalid field values and extra fields return 422. Do not accept or save income or uploaded documents.

For the frontend only, frontend/src/fixture.json is one fictional card showing the response shape, not real university advice. Replace it with the real API before the live demo. Discuss contract changes with all three teammates first.
