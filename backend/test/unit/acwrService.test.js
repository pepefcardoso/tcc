import { calculateAcwr } from '../../src/services/acwrService.js';
import { jest } from '@jest/globals';

describe('acwrService', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
  });

  it('AC-01: Full >28-day fixture produces correct ACWR', async () => {
    mockPool.query.mockImplementation((queryText, params) => {
      const days = params[2];
      if (days === 7) {
        return Promise.resolve({
          rows: [
            { session_load: 80 },
            { session_load: 90 },
            { session_load: 100 }
          ]
        });
      }
      if (days === 28) {
        return Promise.resolve({
          rows: [
            { session_load: 50 },
            { session_load: 60 },
            { session_load: 70 },
            { session_load: 80 },
            { session_load: 90 },
            { session_load: 100 }
          ]
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const refDate = new Date();
    const result = await calculateAcwr('a1', refDate, mockPool);

    expect(result.acute_load).toBe(270);
    expect(result.chronic_load).toBe(112.5);
    expect(result.acwr).toBe(2.4000);
    expect(result.sufficient_history).toBe(true);
  });

  it('AC-02: Zero chronic load (no 28-day history) returns null ACWR and sufficient_history: false', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });

    const result = await calculateAcwr('a1', new Date(), mockPool);

    expect(result.acute_load).toBe(0);
    expect(result.chronic_load).toBe(0);
    expect(result.acwr).toBeNull();
    expect(result.sufficient_history).toBe(false);
  });

  it('AC-03: Zero acute load (trained only >7 days ago) returns ACWR = 0', async () => {
    mockPool.query.mockImplementation((queryText, params) => {
      const days = params[2];
      if (days === 7) return Promise.resolve({ rows: [] });
      if (days === 28) return Promise.resolve({ rows: [{ session_load: 100 }] });
      return Promise.resolve({ rows: [] });
    });

    const result = await calculateAcwr('a1', new Date(), mockPool);

    expect(result.acute_load).toBe(0);
    expect(result.chronic_load).toBe(25);
    expect(result.acwr).toBe(0.0);
    expect(result.sufficient_history).toBe(true);
  });

  it('AC-04: Acute > chronic returns ACWR > 1.0', async () => {
    mockPool.query.mockImplementation((queryText, params) => {
      const days = params[2];
      if (days === 7) return Promise.resolve({ rows: [{ session_load: 200 }] });
      if (days === 28) return Promise.resolve({ rows: [{ session_load: 100 }, { session_load: 200 }] });
      return Promise.resolve({ rows: [] });
    });

    const result = await calculateAcwr('a1', new Date(), mockPool);
    expect(result.acwr).toBeGreaterThan(1.0);
  });

  it('AC-05: referenceDate parameter is forwarded to both DB calls', async () => {
    mockPool.query.mockResolvedValue({ rows: [] });
    const refDate = new Date('2024-01-01T00:00:00Z');

    await calculateAcwr('a1', refDate, mockPool);

    expect(mockPool.query).toHaveBeenCalledTimes(2);
    expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['a1', '2024-01-01T00:00:00.000Z', 7]);
    expect(mockPool.query).toHaveBeenCalledWith(expect.any(String), ['a1', '2024-01-01T00:00:00.000Z', 28]);
  });

  it('AC-06: sufficient_history is true when chronic > 0', async () => {
    mockPool.query.mockResolvedValue({ rows: [{ session_load: 1 }] });

    const result = await calculateAcwr('a1', new Date(), mockPool);
    expect(result.sufficient_history).toBe(true);
  });
});
