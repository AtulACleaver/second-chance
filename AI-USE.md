# AI use

Notion AI generated the initial repository scaffold, contract, and fictional fixture. Record each teammate’s actual human contributions, any additional AI assistance, and external sources here. If you use the separate reference implementation, disclose that too.

## Human Contributions & Ownership

### Atul
- **Backend & Core Services** (`backend/`):
  - Dependencies (`requirements.txt`)
  - Endpoints and request validation (`app/main.py`)
  - School identity and domains (`app/directory.py`)
  - Search, evidence gathering, and safe fetch (`app/research.py`)
  - Checked records and cache policy (`app/cache.py`)
  - Reviewed fallback records (`app/policies.py`)
  - Validation, safety, and research tests (`tests/`)
- **Evaluation** (`evaluation/`): Test cases and review results
- **Project Setup & Seed Data**:
  - Initial creation of `.gitignore` and `.env.example`
  - Seeding the initial API contract (`docs/CONTRACT.md`)
  - Seeding initial fixture data (`frontend/src/fixture.json`)

### Aryan
- **Documentation & Coordination**:
  - Maintenance of `README.md` and `AI-USE.md`
  - Maintenance of `.gitignore` and `.env.example` post-setup
  - Maintenance of API contract (`docs/CONTRACT.md`) with team agreement
- **Frontend Integration**:
  - Frontend-to-backend request helper (`frontend/src/api.js`)
  - Vite proxy review (`frontend/vite.config.js`)
  - Fixture data maintenance (`frontend/src/fixture.json`)
- **Tooling, Testing & CI**:
  - Smoke tests and sponsor draft scripts (`scripts/`)
  - CI workflow automation (`.github/workflows/`)

### Shashank
- **Frontend Implementation** (`frontend/`):
  - Package setup and configuration (`package.json`, `package-lock.json`, `index.html`)
  - Vite build configuration (`vite.config.js`)
  - React UI screens, view states, and components (`src/main.jsx`)
  - Visual styling and layout implementation (`src/style.css`)

## Repository Structure & Responsibility Matrix

```text
second-chance/
├── README.md                     # Aryan maintains, all supply accurate details
├── AI-USE.md                     # Aryan maintains, each person records their work
├── .gitignore                    # Atul creates, Aryan maintains after setup
├── .env.example                  # Atul creates, Aryan maintains; never put secrets here
├── backend/                      # Atul
│   ├── requirements.txt
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # Atul: endpoints and validation
│   │   ├── directory.py          # Atul: school identity and domains
│   │   ├── research.py           # Atul: search, evidence and safe fetch
│   │   ├── cache.py              # Atul: checked records and cache policy
│   │   └── policies.py           # Atul: reviewed fallback records
│   └── tests/                    # Atul: validation, safety and research tests
├── evaluation/                   # Atul: test cases and review results
├── frontend/                     # Shashank, except the two Aryan files below
│   ├── package.json
│   ├── package-lock.json
│   ├── index.html
│   ├── vite.config.js            # Shashank edits; Aryan reviews the proxy
│   └── src/
│       ├── main.jsx              # Shashank: React screens and states
│       ├── style.css             # Shashank: visual implementation
│       ├── fixture.json          # Atul seeds, Aryan maintains; fictional only
│       └── api.js                # Aryan: frontend-to-backend request helper
├── docs/
│   └── CONTRACT.md               # Atul seeds, Aryan maintains with team agreement
├── scripts/                      # Aryan: smoke test and optional sponsor draft
└── .github/workflows/            # Aryan: CI after tests and builds exist
```

## Agentboxd draft workflow

Notion AI assisted with the research-page export, Agentboxd draft script, documentation, and offline checks. The team must review and explain this code, record its actual contributions, and verify the provider connection before representing it as live.
