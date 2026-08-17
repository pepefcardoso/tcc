import apiClient from './client.js';

/**
 * Fetch sessions for a specific athlete.
 * @param {string} athleteId - The athlete ID.
 * @param {Object} [options]
 * @param {string} [options.from] - Start date (YYYY-MM-DD).
 * @param {string} [options.to] - End date (YYYY-MM-DD).
 * @returns {Promise<Session[]>}
 */
export async function fetchSessionsByAthlete(athleteId, { from, to } = {}) {
  const queryParams = new URLSearchParams();
  if (from) queryParams.append('from', from);
  if (to) queryParams.append('to', to);

  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
  const res = await apiClient(`/athletes/${athleteId}/sessions${queryString}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
