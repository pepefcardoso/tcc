import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { uploadSession } from '../sessions.js';
import apiClient from '../client.js';

vi.mock('../client.js', () => ({
  default: vi.fn(),
}));

describe('sessions API - uploadSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('builds FormData with correct athlete_id and file fields', async () => {
    apiClient.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ session_id: '123' }),
    });

    const file = new File([''], 'test.ndjson');
    await uploadSession('abc-123', file);

    expect(apiClient).toHaveBeenCalledTimes(1);
    const [path, options] = apiClient.mock.calls[0];
    
    expect(path).toBe('/sessions/upload');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('athlete_id')).toBe('abc-123');
    expect(options.body.get('file')).toBe(file);
  });

  it('returns parsed JSON on ok response', async () => {
    const mockResponse = { session_id: '123', status: 'processed', metrics: { total_distance_m: 10 } };
    apiClient.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const file = new File([''], 'test.ndjson');
    const result = await uploadSession('abc', file);

    expect(result).toEqual(mockResponse);
  });

  it('throws enriched error on non-ok response', async () => {
    apiClient.mockResolvedValue({
      ok: false,
      status: 422,
      json: () => Promise.resolve({ message: 'Validation failed', error: 'validation_error' }),
    });

    const file = new File([''], 'test.ndjson');
    
    await expect(uploadSession('abc', file)).rejects.toThrow('Validation failed');
    
    try {
      await uploadSession('abc', file);
    } catch (err) {
      expect(err.status).toBe(422);
      expect(err.errorCode).toBe('validation_error');
    }
  });
});
