import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DashboardPage from '../DashboardPage.jsx';

global.fetch = vi.fn();

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    fetch.mockReturnValue(new Promise(() => {}));
    render(<DashboardPage />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    fetch.mockResolvedValueOnce({ ok: false });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/error: failed to load dashboard/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no athletes', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ athletes: [], high_risk_athlete_ids: [] })
    });
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no active athletes/i)).toBeInTheDocument();
    });
  });

  it('renders athletes and high risk alert', async () => {
    const mockData = {
      high_risk_athlete_ids: ['a1'],
      athletes: [
        {
          athlete_id: 'a1',
          name: 'Athlete One',
          latest_session: {
            date: '2023-10-10T10:00:00Z',
            total_distance_m: 5000,
            max_speed_kmh: 25.5,
            sprint_count: 3,
            player_load: 150,
            pse_pending: true
          },
          acwr: { value: 1.6, zone: 'red' }
        },
        {
          athlete_id: 'a2',
          name: 'Athlete Two',
          latest_session: null,
          acwr: { value: null, zone: null }
        }
      ]
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/high risk alert/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Athlete One/i)[0]).toBeInTheDocument();

    expect(screen.getAllByText(/Athlete One/i)[1]).toBeInTheDocument();
    expect(screen.getByText('1.60')).toBeInTheDocument();
    expect(screen.getByText(/pse pending/i)).toBeInTheDocument();

    expect(screen.getByText(/Athlete Two/i)).toBeInTheDocument();
    expect(screen.getByText(/N\/A/i)).toBeInTheDocument();
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
  });
});
