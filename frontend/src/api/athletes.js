import apiClient from './client.js';

/**
 * Fetch the athlete list.
 * @param {boolean} includeInactive - If true, adds ?includeInactive=true to the request.
 * @returns {Promise<Athlete[]>}
 */
export async function fetchAthletes(includeInactive = false) {
  const query = includeInactive ? '?includeInactive=true' : '';
  const res = await apiClient(`/athletes${query}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
