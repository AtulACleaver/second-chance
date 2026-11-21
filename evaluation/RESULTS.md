# Evaluation Results and Test Suite Report

This document records the evaluation methodology, regression test suite outcomes, and research boundary test cases for Second Chance v2.

## 1. Profile Sensitivity Regression Suite (`profiles.json`)

We evaluated 10 fictional applicant profiles across distinct permutations of:
- `applicant_type`: `first_year`, `transfer`, `unknown`
- `needs_aid`: `yes`, `no`, `unsure`
- `requested_aid`: `yes`, `no`, `unsure`
- `entry_year`: `2027`, `other`, `unknown`

### Results Matrix

| Metric | Target Rule | True Positives (TP) | False Positives (FP) | False Negatives (FN) | True Negatives (TN) | Accuracy |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **Tufts Critical Action** | Flags `Action needed:` if aid is needed but was marked `no` on application | 2 | 0 | 0 | 8 | 100% |
| **Cornell CSS Requirement** | Flags imperative CSS Profile submission if aid is needed | 5 | 0 | 0 | 5 | 100% |

> **Note on evaluation scope:** Fictional profiles serve as regression fixtures to prevent logic drift. They do not represent real applicant records or replace official institutional guidance.

---

## 2. Institutional Research & Safety Test Cases

We tested the backend directory and research pipeline against a matrix of representative institutional cases, boundary checks, and failure recovery modes:

| Test Case | Candidate / Input | Expected Status | Result | Notes |
| :--- | :--- | :---: | :---: | :--- |
| **Curated Fallback (Need-blind)** | `curated:princeton` (`princeton.edu`) | `fresh` / `cached` | Pass | Exact quotes with official source URLs; met need with grant not loan |
| **Curated Fallback (Need-aware)** | `curated:cornell` (`cornell.edu`) | `fresh` / `cached` | Pass | Verified CSS Profile requirement for international aid applicants |
| **Curated Fallback (Critical Action)** | `curated:tufts` (`tufts.edu`) | `fresh` / `cached` | Pass | Identifies required aid checkbox at time of initial admission application |
| **Scorecard Directory Lookup** | `Columbia University` | `ok` (candidate) | Pass | Directory maps to `scorecard:190150`, extracts clean domain `columbia.edu` |
| **Missing Directory Key** | `SCORECARD_API_KEY=""` | `ok` / `unavailable` | Pass | Curated matches still offered; honest unavailable if no match |
| **Domain Suffix Attack** | `evilprinceton.edu` | Rejected | Pass | Label boundary check prevents substring deception |
| **Subdomain Hijack Attack** | `princeton.edu.attacker.com` | Rejected | Pass | Requires exact host match or valid preceding dot |
| **SSRF Link-Local / Metadata** | `169.254.169.254` | Rejected | Pass | Cloud instance metadata IP rejected by safe IP verification |
| **SSRF Loopback** | `127.0.0.1` | Rejected | Pass | Loopback addresses rejected; no internal port scanning |
| **Insecure Scheme** | `http://princeton.edu` | Rejected | Pass | Non-HTTPS official fetch requests rejected |
| **Disallowed Extra Fields (PII)** | `{"income": "$50,000"}` | `422 Unprocessable` | Pass | Extra and sensitive fields forbidden by Pydantic v2 schema |
| **Unresolved School Identity** | Unknown ID with no domain | `unavailable` | Pass | No policy is fabricated; returns honest explanation |
| **Cache Hit Recovery** | Repeat request within 24h TTL | `cached` | Pass | Serves verified evidence without unnecessary upstream network calls |
| **Stale Cache Recovery** | Simulated refresh failure with existing cache | `stale` | Pass | Retains earlier evidence visibly dated; does not overwrite valid cache |

---

## 3. How to Run the Evaluation

From the repository root:

```bash
source .venv/bin/activate
python evaluation/run.py
```
