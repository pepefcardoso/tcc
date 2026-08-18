import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PlayerLoadChart, { buildPlayerLoadCurve } from '../PlayerLoadChart.jsx';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: '800px', height: '300px' }}>{children}</div>
    ),
  };
});

describe('PlayerLoadChart - buildPlayerLoadCurve', () => {
  it('returns empty array when gps is null or empty', () => {
    expect(buildPlayerLoadCurve(null, 100)).toEqual([]);
    expect(buildPlayerLoadCurve([], 100)).toEqual([]);
  });

  it('returns empty array when gps length < 2', () => {
    expect(buildPlayerLoadCurve([{ time: '2023-10-15T10:00:00Z' }], 100)).toEqual([]);
  });

  it('returns empty array when totalPlayerLoad is invalid', () => {
    const gps = [{ time: '2023-10-15T10:00:00Z' }, { time: '2023-10-15T10:01:00Z' }];
    expect(buildPlayerLoadCurve(gps, null)).toEqual([]);
    expect(buildPlayerLoadCurve(gps, undefined)).toEqual([]);
    expect(buildPlayerLoadCurve(gps, 0)).toEqual([]);
    expect(buildPlayerLoadCurve(gps, -10)).toEqual([]);
  });

  it('builds monotonic curve starting at 0 and ending at exactly totalPlayerLoad', () => {
    const gps = [
      { time: '2023-10-15T10:00:00Z' },
      { time: '2023-10-15T10:01:00Z' },
      { time: '2023-10-15T10:02:00Z' },
      { time: '2023-10-15T10:03:00Z' },
    ];

    const result = buildPlayerLoadCurve(gps, 120.45);

    expect(result).toHaveLength(4);

    expect(result[0].t).toBe(0);
    expect(result[1].t).toBe(1);
    expect(result[2].t).toBe(2);
    expect(result[3].t).toBe(3);

    expect(result[0].pl).toBe(0);
    expect(result[1].pl).toBe(40.15);
    expect(result[2].pl).toBe(80.3);

    expect(result[3].pl).toBe(120.45);

    for (let i = 1; i < result.length; i++) {
      expect(result[i].pl).toBeGreaterThanOrEqual(result[i - 1].pl);
    }
  });
});

describe('PlayerLoadChart Component', () => {
  it('renders empty message when no data is available (empty gps)', () => {
    render(<PlayerLoadChart gps={[]} totalPlayerLoad={100} />);
    expect(screen.getByText(/no player load data available/i)).toBeInTheDocument();
  });

  it('renders empty message when no data is available (null totalPlayerLoad)', () => {
    render(<PlayerLoadChart gps={[{ time: 't1' }, { time: 't2' }]} totalPlayerLoad={null} />);
    expect(screen.getByText(/no player load data available/i)).toBeInTheDocument();
  });

  it('renders chart when valid data is provided', () => {
    const gps = [{ time: '2023-10-15T10:00:00Z' }, { time: '2023-10-15T10:01:00Z' }];

    const { container } = render(<PlayerLoadChart gps={gps} totalPlayerLoad={50} />);

    expect(container.querySelector('.player-load-chart')).toBeInTheDocument();
  });
});
