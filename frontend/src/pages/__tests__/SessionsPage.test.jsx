import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SessionsPage from '../SessionsPage.jsx';

vi.mock('../../api/athletes.js', () => ({
  fetchAthletes: vi.fn(),
}));

vi.mock('../../api/sessions.js', () => ({
  fetchSessionsByAthlete: vi.fn(),
}));

vi.mock('../../components/NdjsonUploadModal.jsx', () => ({
  default: ({ open, onClose, onSuccess }) => (
    open ? (
      <div data-testid="upload-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={onSuccess}>Success</button>
      </div>
    ) : null
  ),
}));

import { fetchAthletes } from '../../api/athletes.js';
import { fetchSessionsByAthlete } from '../../api/sessions.js';

describe('SessionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <SessionsPage />
      </MemoryRouter>
    );
  };

  it('renders loading state initially', () => {
    fetchAthletes.mockReturnValue(new Promise(() => {}));

    renderPage();

    expect(screen.getByText(/loading sessions/i)).toBeInTheDocument();
  });

  it('renders error state if fetchAthletes fails', async () => {
    fetchAthletes.mockRejectedValue(new Error('API failed'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/error:/i)).toBeInTheDocument();
      expect(screen.getByText(/api failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('renders empty state when no athletes', async () => {
    fetchAthletes.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  it('renders sessions successfully and merges athlete name', async () => {
    const mockAthletes = [
      { id: 'a1', name: 'Alice' },
      { id: 'a2', name: 'Bob' },
    ];

    fetchAthletes.mockResolvedValue(mockAthletes);

    fetchSessionsByAthlete.mockImplementation((id) => {
      if (id === 'a1') {
        return Promise.resolve([
          { id: 's1', started_at: '2023-10-15T10:00:00Z', device_id: 'DEV-A' },
        ]);
      }
      if (id === 'a2') {
        return Promise.resolve([
          { id: 's2', started_at: '2023-10-16T10:00:00Z', device_id: 'DEV-B' },
        ]);
      }
      return Promise.resolve([]);
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('DEV-A')).toBeInTheDocument();
      expect(screen.getByText('DEV-B')).toBeInTheDocument();
    });
  });

  it('sorts sessions by date when header is clicked', async () => {
    const mockAthletes = [{ id: 'a1', name: 'Alice' }];
    fetchAthletes.mockResolvedValue(mockAthletes);
    fetchSessionsByAthlete.mockResolvedValue([
      { id: 's1', started_at: '2023-10-15T10:00:00Z', duration_minutes: 10 },
      { id: 's2', started_at: '2023-10-16T10:00:00Z', duration_minutes: 20 },
    ]);

    renderPage();

    await waitFor(() => {
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent(/20 min/i);
      expect(rows[2]).toHaveTextContent(/10 min/i);
    });

    const sortBtn = screen.getByRole('button', { name: /Date ▼/i });
    fireEvent.click(sortBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Date ▲/i })).toBeInTheDocument();
      const rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent(/10 min/i);
      expect(rows[2]).toHaveTextContent(/20 min/i);
    });
  });

  it('refetches when retry button is clicked', async () => {
    fetchAthletes.mockRejectedValueOnce(new Error('Failed first time'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    fetchAthletes.mockResolvedValueOnce([]);

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
    });
  });

  describe('Upload Session button', () => {
    it('shows upload session button', async () => {
      fetchAthletes.mockResolvedValue([]);
      renderPage();
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /upload session/i })).toBeInTheDocument();
      });
    });

    it('opens upload modal when clicked', async () => {
      fetchAthletes.mockResolvedValue([]);
      renderPage();

      let uploadBtn;
      await waitFor(() => {
        uploadBtn = screen.getByRole('button', { name: /upload session/i });
        expect(uploadBtn).toBeInTheDocument();
      });

      fireEvent.click(uploadBtn);
      expect(screen.getByTestId('upload-modal')).toBeInTheDocument();
    });
  });
});
