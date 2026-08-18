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

/**
 * Upload an NDJSON session file.
 * @param {string} athleteId - The ID of the athlete.
 * @param {File} file - The NDJSON file to upload.
 * @returns {Promise<Object>} The uploaded session result containing session_id, status, and metrics.
 */
export async function uploadSession(athleteId, file) {
  const formData = new FormData();
  formData.append('athlete_id', athleteId);
  formData.append('file', file);

  const res = await apiClient('/sessions/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), {
      status: res.status,
      errorCode: body.error ?? null,
    });
  }
  return res.json();
}

/**
 * Fetch a specific session by ID.
 * @param {string} sessionId - The session ID.
 * @returns {Promise<Object>}
 */
export async function fetchSession(sessionId) {
  const res = await apiClient(`/sessions/${sessionId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch GPS samples for a session.
 * @param {string} sessionId - The session ID.
 * @param {number} [downsample=10] - Downsampling factor.
 * @returns {Promise<Object>}
 */
export async function fetchSessionSamples(sessionId, downsample = 10) {
  const qs = downsample ? `?downsample=${downsample}` : '';
  const res = await apiClient(`/sessions/${sessionId}/samples${qs}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Update the Perceived Exertion (PSE) for a session.
 * @param {string} sessionId - The session ID.
 * @param {number} pse - The PSE value (1-10).
 * @returns {Promise<Object>} The updated session data including session_load and acwr.
 */
export async function patchSessionPse(sessionId, pse) {
  const res = await apiClient(`/sessions/${sessionId}/pse`, {
    method: 'PATCH',
    body: JSON.stringify({ pse }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message ?? `HTTP ${res.status}`), {
      status: res.status,
      errorCode: body.error ?? null,
    });
  }
  return res.json();
}
