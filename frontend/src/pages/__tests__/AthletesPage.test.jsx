import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AthletesPage from '../AthletesPage.jsx';
import { TOKEN_KEY } from '../../api/client.js';

vi.mock('../../api/athletes.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    updateAthlete: vi.fn(),
    inactivateAthlete: vi.fn(),
  };
});
import { updateAthlete, inactivateAthlete } from '../../api/athletes.js';

describe('AthletesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    localStorage.setItem(TOKEN_KEY, 'fake-token');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it('opens edit modal, saves, and updates list', async () => {
    const mockAthletes = [
      {
        id: '1',
        name: 'Athlete One',
        active: true,
        birth_date: '1995-10-15',
        weight_kg: 80.5,
        height_m: 1.85,
      },
    ];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockAthletes });
    updateAthlete.mockResolvedValueOnce({ id: '1', name: 'Athlete Updated', active: true });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Athlete One')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByRole('dialog', { name: /edit athlete/i })).toBeInTheDocument();

    const nameInput = screen.getByLabelText(/name \*/i);
    fireEvent.change(nameInput, { target: { value: 'Athlete Updated' } });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Athlete Updated')).toBeInTheDocument();
    });

    expect(screen.queryByText('Athlete One')).not.toBeInTheDocument();
  });

  it('inactivates athlete and removes from list when includeInactive is false', async () => {
    const mockAthletes = [{ id: '1', name: 'Athlete to Delete', active: true }];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockAthletes });
    inactivateAthlete.mockResolvedValueOnce(true);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Athlete to Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /inactivate/i }));

    expect(window.confirm).toHaveBeenCalled();
    expect(inactivateAthlete).toHaveBeenCalledWith('1');

    await waitFor(() => {
      expect(screen.queryByText('Athlete to Delete')).not.toBeInTheDocument();
      expect(screen.getByText(/no athletes found/i)).toBeInTheDocument();
    });
  });

  it('inactivates athlete and marks inactive when includeInactive is true', async () => {
    const mockAthletes = [{ id: '1', name: 'Athlete to Delete', active: true }];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockAthletes });
    inactivateAthlete.mockResolvedValueOnce(true);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Athlete to Delete')).toBeInTheDocument();
    });

    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockAthletes });

    fireEvent.click(screen.getByLabelText(/show inactive athletes/i));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /inactivate/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /inactivate/i }));

    await waitFor(() => {
      expect(screen.getByText('Athlete to Delete')).toBeInTheDocument();
      expect(screen.getByText(/inactive/i, { selector: '.status-badge' })).toBeInTheDocument();
    });
  });

  it('shows error if inactivate fails', async () => {
    const mockAthletes = [{ id: '1', name: 'Athlete to Delete', active: true }];
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockAthletes });
    inactivateAthlete.mockRejectedValueOnce(new Error('Failed to delete'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Athlete to Delete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /inactivate/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete/i)).toBeInTheDocument();
    });
  });
});
