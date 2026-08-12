import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient, { TOKEN_KEY, getToken, clearAuth, handleUnauthorized } from '../client.js';

globalThis.fetch = vi.fn();

describe('API Client Module', () => {
  let locationReplaceSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    const originalLocation = window.location;
    delete window.location;
    window.location = { ...originalLocation, replace: vi.fn() };
    locationReplaceSpy = window.location.replace;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('TOKEN_KEY is exported correctly', () => {
    expect(TOKEN_KEY).toBe('token');
  });

  it('getToken returns the token from localStorage', () => {
    localStorage.setItem('token', 'test-jwt');
    expect(getToken()).toBe('test-jwt');
  });

  it('clearAuth removes the token from localStorage', () => {
    localStorage.setItem('token', 'test-jwt');
    clearAuth();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('handleUnauthorized calls clearAuth and redirects to /login', () => {
    localStorage.setItem('token', 'test-jwt');
    handleUnauthorized();

    expect(localStorage.getItem('token')).toBeNull();
    expect(locationReplaceSpy).toHaveBeenCalledWith('/login');
  });

  it('attaches Authorization header when token is present', async () => {
    localStorage.setItem('token', 'test-jwt');
    fetch.mockResolvedValueOnce({ status: 200 });

    await apiClient('/test');

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jwt',
        },
      })
    );
  });

  it('does not attach Authorization header when token is absent', async () => {
    fetch.mockResolvedValueOnce({ status: 200 });

    await apiClient('/test');

    expect(fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
      })
    );
  });

  it('returns the Response object on 200 status', async () => {
    const mockResponse = { status: 200, json: async () => ({ ok: true }) };
    fetch.mockResolvedValueOnce(mockResponse);

    const res = await apiClient('/test');
    expect(res).toBe(mockResponse);
  });

  it('handles 401 Unauthorized by clearing token, redirecting, and throwing error', async () => {
    localStorage.setItem('token', 'test-jwt');
    fetch.mockResolvedValueOnce({ status: 401 });

    await expect(apiClient('/test')).rejects.toThrow('unauthorized');

    expect(localStorage.getItem('token')).toBeNull();
    expect(locationReplaceSpy).toHaveBeenCalledWith('/login');
  });

  it('passes through non-401 error responses unchanged', async () => {
    const mockResponse = { status: 403, statusText: 'Forbidden' };
    fetch.mockResolvedValueOnce(mockResponse);

    const res = await apiClient('/test');
    expect(res).toBe(mockResponse);
  });

  it('does not set Content-Type if body is FormData', async () => {
    fetch.mockResolvedValueOnce({ status: 200 });

    const formData = new FormData();
    formData.append('file', 'test');

    await apiClient('/upload', { method: 'POST', body: formData });

    expect(fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        headers: expect.not.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
  });
});
