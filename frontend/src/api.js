const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const message = data?.detail || data?.message || `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),
  searchSchools: (query) => request(`/api/schools?q=${encodeURIComponent(query)}`),
  research: (payload) => request('/api/research', { method: 'POST', body: JSON.stringify(payload) }),
};
