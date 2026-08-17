import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAthletes, createAthlete, updateAthlete, inactivateAthlete } from '../athletes.js';

global.fetch = vi.fn();

describe('athletes API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAthletes', () => {
    it('fetches athletes list successfully', async () => {
      const mockData = [{ id: '1', name: 'Test Athlete' }];
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      });

      const data = await fetchAthletes();
      expect(data).toEqual(mockData);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes'),
        expect.any(Object)
      );
    });
  });

  describe('createAthlete', () => {
    it('creates athlete successfully', async () => {
      const payload = {
        name: 'New Athlete',
        birth_date: '2000-01-01',
        weight_kg: 70.5,
        height_m: 1.8,
      };
      const mockResponse = { id: '2', ...payload, active: true };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse,
      });

      const data = await createAthlete(payload);
      expect(data).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
        })
      );
    });

    it('throws validation error with fields on 422', async () => {
      const errorResponse = {
        message: 'Validation failed',
        fields: { name: 'Name is required' },
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => errorResponse,
      });

      try {
        await createAthlete({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.status).toBe(422);
        expect(error.fields).toEqual({ name: 'Name is required' });
      }
    });

    it('throws generic error on other status codes', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ message: 'Forbidden' }),
      });

      try {
        await createAthlete({});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Forbidden');
        expect(error.status).toBe(403);
      }
    });
  });

  describe('updateAthlete', () => {
    it('updates athlete successfully', async () => {
      const payload = { name: 'Updated Athlete' };
      const mockResponse = { id: '2', name: 'Updated Athlete', active: true };

      fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse,
      });

      const data = await updateAthlete('2', payload);
      expect(data).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes/2'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      );
    });

    it('throws validation error with fields on 422', async () => {
      const errorResponse = {
        message: 'Validation failed',
        fields: { name: 'Name must be 100 characters or fewer' },
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => errorResponse,
      });

      try {
        await updateAthlete('2', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Validation failed');
        expect(error.status).toBe(422);
        expect(error.fields).toEqual({ name: 'Name must be 100 characters or fewer' });
      }
    });

    it('throws generic error on other status codes', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      });

      try {
        await updateAthlete('99', {});
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Not Found');
        expect(error.status).toBe(404);
      }
    });
  });

  describe('inactivateAthlete', () => {
    it('inactivates athlete successfully', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => ({}),
      });

      const result = await inactivateAthlete('2');
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/athletes/2'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('throws error on failure', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not Found' }),
      });

      try {
        await inactivateAthlete('99');
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Not Found');
      }
    });
  });
});
