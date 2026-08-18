import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WeeklyLoadChart, { buildWeeklyChartData } from '../WeeklyLoadChart.jsx';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: '800px', height: '320px' }}>{children}</div>
    ),
  };
});

describe('buildWeeklyChartData', () => {
  it('returns empty array when sessions is null or empty', () => {
    expect(buildWeeklyChartData(null)).toEqual([]);
    expect(buildWeeklyChartData([])).toEqual([]);
  });

  it('returns empty array when no valid sessions exist', () => {
    const sessions = [
      { started_at: '2026-07-01T10:00:00Z', session_load: null },
      { started_at: '2026-07-02T10:00:00Z', session_load: 0 },
      { started_at: null, session_load: 100 },
    ];
    expect(buildWeeklyChartData(sessions)).toEqual([]);
  });

  it('groups sessions into correct ISO weeks and sums session_load', () => {
    const sessions = [
      { started_at: '2026-07-01T10:00:00Z', session_load: 100 },
      { started_at: '2026-07-02T10:00:00Z', session_load: 150 },
      { started_at: '2026-07-08T10:00:00Z', session_load: 200 },
    ];

    const result = buildWeeklyChartData(sessions);

    expect(result).toHaveLength(2);
    expect(result[0].weeklyLoad).toBe(250);
    expect(result[1].weeklyLoad).toBe(200);
  });

  it('computes rolling ACWR correctly', () => {
    const sessions = [
      { started_at: '2026-07-05T10:00:00Z', session_load: 250 },
      { started_at: '2026-07-12T10:00:00Z', session_load: 300 },
      { started_at: '2026-07-19T10:00:00Z', session_load: 280 },
      { started_at: '2026-07-26T10:00:00Z', session_load: 320 },
    ];

    const result = buildWeeklyChartData(sessions);
    expect(result).toHaveLength(4);

    expect(result[0].acwr).toBe(4);

    expect(result[3].acwr).toBe(1.113);
  });

  it('fills missing weeks with zero load', () => {
    const sessions = [
      { started_at: '2026-07-05T10:00:00Z', session_load: 250 },
      { started_at: '2026-07-19T10:00:00Z', session_load: 280 },
    ];

    const result = buildWeeklyChartData(sessions);
    expect(result).toHaveLength(3);
    expect(result[0].weeklyLoad).toBe(250);
    expect(result[1].weeklyLoad).toBe(0);
    expect(result[2].weeklyLoad).toBe(280);

    expect(result[2].acwr).toBe(2.1132);
  });

  it('sorts weeks chronologically', () => {
    const sessions = [
      { started_at: '2026-07-19T10:00:00Z', session_load: 280 },
      { started_at: '2026-07-05T10:00:00Z', session_load: 250 },
    ];

    const result = buildWeeklyChartData(sessions);
    expect(result[0].weeklyLoad).toBe(250);
    expect(result[result.length - 1].weeklyLoad).toBe(280);
  });
});

describe('WeeklyLoadChart Component', () => {
  it('renders empty notice when no valid sessions', () => {
    render(<WeeklyLoadChart sessions={[]} />);
    expect(screen.getByText(/no valid sessions/i)).toBeInTheDocument();
  });

  it('renders insufficient history notice when less than 4 weeks of data', () => {
    const sessions = [
      { started_at: '2026-07-05T10:00:00Z', session_load: 250 },
      { started_at: '2026-07-12T10:00:00Z', session_load: 300 },
    ];
    const { container } = render(<WeeklyLoadChart sessions={sessions} />);
    expect(screen.getByText(/requires at least 4 weeks of history/i)).toBeInTheDocument();
    expect(container.querySelector('.weekly-load-chart')).toBeInTheDocument();
  });

  it('renders without notice when >= 4 weeks of data', () => {
    const sessions = [
      { started_at: '2026-07-05T10:00:00Z', session_load: 250 },
      { started_at: '2026-07-12T10:00:00Z', session_load: 300 },
      { started_at: '2026-07-19T10:00:00Z', session_load: 280 },
      { started_at: '2026-07-26T10:00:00Z', session_load: 320 },
    ];
    const { container } = render(<WeeklyLoadChart sessions={sessions} />);
    expect(screen.queryByText(/requires at least 4 weeks of history/i)).not.toBeInTheDocument();
    expect(container.querySelector('.weekly-load-chart')).toBeInTheDocument();
  });
});
