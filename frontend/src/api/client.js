export const TOKEN_KEY = 'token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const clearAuth = () => localStorage.removeItem(TOKEN_KEY);

export const handleUnauthorized = () => {
  clearAuth();
  window.location.replace('/login');
};

const BASE = import.meta.env?.VITE_API_BASE_URL ?? '/api';

/**
 * Native fetch wrapper for the application.
 * Automatically injects the Authorization token if present.
 * Redirects to /login on 401 Unauthorized responses.
 *
 * @param {string} path - The API endpoint path (e.g. '/dashboard')
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<Response>} The raw fetch Response object
 */
export default async function apiClient(path, options = {}) {
  const token = getToken();

  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = `${BASE}${path}`;
  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    handleUnauthorized();
    throw new Error('unauthorized');
  }

  return res;
}
