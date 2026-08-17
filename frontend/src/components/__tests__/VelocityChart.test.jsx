import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import VelocityChart, { transformGpsSamples } from '../VelocityChart.jsx';

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: '800px', height: '300px' }}>{children}</div>
    ),
  };
});

describe('VelocityChart - transformGpsSamples', () => {
  it('returns empty array when input is empty or null', () => {
    expect(transformGpsSamples(null)).toEqual([]);
    expect(transformGpsSamples([])).toEqual([]);
  });

  it('transforms GPS samples correctly (t=0 at start, km/h speed)', () => {
    const gps = [
      { time: '2023-10-15T10:00:00Z', speed_ms: 0 },
      { time: '2023-10-15T10:01:00Z', speed_ms: 5.0 },
      { time: '2023-10-15T10:01:30Z', speed_ms: 7.0 },
    ];

    const result = transformGpsSamples(gps);

    expect(result).toEqual([
      { t: 0, speed: 0 },
      { t: 1, speed: 18.0 },
      { t: 1.5, speed: 25.2 },
    ]);
  });
});

describe('VelocityChart Component', () => {
  it('renders empty message when no GPS data provided', () => {
    render(<VelocityChart gps={[]} />);
    expect(screen.getByText(/no gps data available/i)).toBeInTheDocument();
  });

  it('renders chart when GPS data is provided', () => {
    const gps = [
      { time: '2023-10-15T10:00:00Z', speed_ms: 0 },
      { time: '2023-10-15T10:01:00Z', speed_ms: 5.0 },
    ];

    const { container } = render(<VelocityChart gps={gps} />);

    expect(container.querySelector('.velocity-chart')).toBeInTheDocument();
  });
});
