import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SessionDetailPage from '../SessionDetailPage.jsx';
import { fetchSession, fetchSessionSamples } from '../../api/sessions.js';

vi.mock('../../api/sessions.js', () => ({
  fetchSession: vi.fn(),
  fetchSessionSamples: vi.fn(),
}));

vi.mock('../../components/VelocityChart.jsx', () => ({
  default: ({ gps }) => (
    <div data-testid="mock-velocity-chart">VelocityChart Mock - {gps?.length || 0} samples</div>
  ),
}));

describe('SessionDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = (id = '123') => {
    return render(
      <MemoryRouter initialEntries={[`/sessions/${id}`]}>
        <Routes>
          <Route path="/sessions/:id" element={<SessionDetailPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    fetchSession.mockReturnValue(new Promise(() => {}));
    fetchSessionSamples.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText(/loading session/i)).toBeInTheDocument();
  });

  it('renders error state if fetchSession fails', async () => {
    fetchSession.mockRejectedValue(new Error('Session fetch failed'));
    fetchSessionSamples.mockResolvedValue({ gps: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/session fetch failed/i)).toBeInTheDocument();
    });
  });

  it('renders successfully with metrics and chart', async () => {
    fetchSession.mockResolvedValue({
      id: '123',
      metrics: {
        total_distance_m: 5000,
        max_speed_kmh: 28.5,
        sprint_count: 5,
        player_load: 120.45,
      },
    });

    fetchSessionSamples.mockResolvedValue({
      gps: [{ time: '2023-10-15T10:00:00Z', speed_ms: 5 }],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Session Detail')).toBeInTheDocument();
    });

    expect(screen.getByText('5000 m')).toBeInTheDocument();
    expect(screen.getByText('28.5 km/h')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('120.5')).toBeInTheDocument();

    expect(screen.getByTestId('mock-velocity-chart')).toHaveTextContent('1 samples');
  });

  it('renders fallback dashes when metrics are null', async () => {
    fetchSession.mockResolvedValue({
      id: '123',
      metrics: null,
    });

    fetchSessionSamples.mockResolvedValue({ gps: [] });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Session Detail')).toBeInTheDocument();
    });

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(4);
  });
});
