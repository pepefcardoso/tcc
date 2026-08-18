import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../DashboardPage.jsx';
import { fetchDashboard } from '../../api/athletes.js';

vi.mock('../../api/athletes.js', () => ({
  fetchDashboard: vi.fn(),
}));

const renderWithRouter = (ui) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    fetchDashboard.mockReturnValue(new Promise(() => {}));
    renderWithRouter(<DashboardPage />);
    expect(screen.getByText(/loading dashboard/i)).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    fetchDashboard.mockRejectedValueOnce(new Error('Failed to load dashboard'));
    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/error: failed to load dashboard/i)).toBeInTheDocument();
    });
  });

  it('renders empty state when no athletes', async () => {
    fetchDashboard.mockResolvedValueOnce({ athletes: [], high_risk_athlete_ids: [] });
    renderWithRouter(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText(/no active athletes/i)).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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
            pse_pending: true,
          },
          acwr: { value: 1.6, zone: 'red' },
        },
        {
          athlete_id: 'a2',
          name: 'Athlete Two',
          latest_session: null,
          acwr: { value: null, zone: null },
        },
      ],
    };

    fetchDashboard.mockResolvedValueOnce(mockData);

    renderWithRouter(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText(/high risk alert/i)).toBeInTheDocument();
    });

    const allAthleteOneMentions = screen.getAllByText(/Athlete One/i);
    expect(allAthleteOneMentions.length).toBeGreaterThanOrEqual(1);

    expect(screen.getByText('1.60')).toBeInTheDocument();
    expect(screen.getByText(/pse pending/i)).toBeInTheDocument();

    expect(screen.getByText(/Athlete Two/i)).toBeInTheDocument();
    expect(screen.getByText(/N\/D/i)).toBeInTheDocument();
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
  });
});
