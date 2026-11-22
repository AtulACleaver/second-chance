// frontend-to-backend request helper for second chance v2 api
// producer: aryan | consumers: shashank (ui), aryan (integration & smoke)
// complies strictly with docs/CONTRACT.md

import fixture from './fixture.json';

const API_BASE = ((import.meta.env && import.meta.env.VITE_API_BASE_URL) || '').replace(/\/$/, '') + '/api';

/**
 * Health check endpoint
 * GET /api/health -> { status: "ok" }
 */
export async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) {
      return { status: 'offline', statusCode: res.status };
    }
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: err.message };
  }
}

/**
 * Institution directory lookup with curated fallbacks
 * GET /api/schools?q=NAME -> { status: "ok"|"unavailable", candidates: [...] }
 */
export async function searchSchools(query = '') {
  const clean = query.trim();
  if (!clean) {
    return { status: 'ok', candidates: [] };
  }

  const url = `${API_BASE}/schools?q=${encodeURIComponent(clean)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`School search failed with HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Default curated universities list for initial landing display
 * GET /api/universities -> [ cards ]
 */
export async function getCuratedUniversities() {
  const res = await fetch(`${API_BASE}/universities`);
  if (!res.ok) {
    throw new Error(`Universities fetch failed with HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Source-linked financial aid policy research
 * POST /api/research
 * Accepts: { school_id, profile: { applicant_type, needs_aid, requested_aid, entry_year }, refresh }
 * Returns: { school, status: "fresh"|"cached"|"stale"|"unavailable", message, cards: [...] }
 */
export async function conductResearch(args) {
  // Support both object arguments: { schoolId, profile, refresh } or { school_id, profile, refresh }
  const schoolId = args?.schoolId || args?.school_id;
  if (!schoolId) {
    throw new Error('schoolId is required to conduct research');
  }

  const payload = {
    school_id: schoolId.trim(),
    profile: args.profile || {
      applicant_type: 'unknown',
      needs_aid: 'unsure',
      requested_aid: 'unsure',
      entry_year: 'unknown',
    },
    refresh: Boolean(args.refresh),
  };

  const res = await fetch(`${API_BASE}/research`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 422) {
      throw new Error('422 Unprocessable: Request payload contained invalid or forbidden fields.');
    }
    if (res.status === 429) {
      throw new Error('429 Too Many Requests: Rate limit exceeded, please wait a moment.');
    }
    throw new Error(`Research request failed with HTTP ${res.status}`);
  }

  return await res.json();
}

/**
 * Returns the offline fictional contract fixture for isolated UI prototyping
 * Note: Contract strictly forbids implicit silent use in production
 */
export function getFictionalFixture() {
  return fixture;
}

/**
 * Helper to determine if a research result is the fictional fixture
 */
export function isFixture(data) {
  return data?.school?.id === 'curated:example';
}

// Unified api object for backward compatibility
export const api = {
  health: checkHealth,
  checkHealth,
  searchSchools,
  getCuratedUniversities,
  research: conductResearch,
  conductResearch,
  getFictionalFixture,
  isFixture,
};
