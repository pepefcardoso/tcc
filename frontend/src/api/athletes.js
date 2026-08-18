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

/**
 * Create a new athlete.
 * @param {Object} data - The athlete data.
 * @returns {Promise<Athlete>}
 */
export async function createAthlete(data) {
  const res = await apiClient('/athletes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), {
      status: res.status,
      fields: body.fields ?? null,
    });
  }
  return res.json();
}

/**
 * Update an existing athlete.
 * @param {string} id - The athlete ID.
 * @param {Object} data - The athlete data.
 * @returns {Promise<Athlete>}
 */
export async function updateAthlete(id, data) {
  const res = await apiClient(`/athletes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), {
      status: res.status,
      fields: body.fields ?? null,
    });
  }
  return res.json();
}

/**
 * Inactivate an athlete.
 * @param {string} id - The athlete ID.
 * @returns {Promise<boolean>}
 */
export async function inactivateAthlete(id) {
  const res = await apiClient(`/athletes/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return true;
}

/**
 * Fetch the current ACWR for an athlete.
 * @param {string} athleteId - The athlete ID.
 * @returns {Promise<{athlete_id: string, acute_load: number, chronic_load: number, acwr: number, zone: string, sufficient_history: boolean}>}
 */
export async function fetchAthleteAcwr(athleteId) {
  const res = await apiClient(`/athletes/${athleteId}/acwr`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}
