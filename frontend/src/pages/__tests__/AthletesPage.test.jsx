import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AthletesPage from '../AthletesPage.jsx';
import { TOKEN_KEY } from '../../api/client.js';

global.fetch = vi.fn();

describe('AthletesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem(TOKEN_KEY, 'fake-token');
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <AthletesPage />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    fetch.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText(/loading athletes/i)).toBeInTheDocument();
  });

  it('renders error state on API failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Server error' }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('renders empty state when no athletes', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no athletes found/i)).toBeInTheDocument();
    });
  });

  it('renders athletes on success', async () => {
    const mockAthletes = [
      { id: '1', name: 'Athlete One', active: true },
      { id: '2', name: 'Athlete Two', active: true },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAthletes,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Athlete One')).toBeInTheDocument();
      expect(screen.getByText('Athlete Two')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/athletes'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer fake-token',
        }),
      })
    );
  });

  it('refetches with includeInactive when toggle is checked', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no athletes found/i)).toBeInTheDocument();
    });

    fetch.mockClear();

    const mockAthletes = [
      { id: '1', name: 'Active Athlete', active: true },
      { id: '2', name: 'Inactive Athlete', active: false },
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAthletes,
    });

    const toggle = screen.getByLabelText(/show inactive athletes/i);
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText('Inactive Athlete')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('?includeInactive=true'),
      expect.any(Object)
    );
  });
});
