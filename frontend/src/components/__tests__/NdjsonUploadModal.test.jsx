import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NdjsonUploadModal from '../NdjsonUploadModal.jsx';

vi.mock('../../api/athletes.js', () => ({
  fetchAthletes: vi.fn(),
}));

vi.mock('../../api/sessions.js', () => ({
  uploadSession: vi.fn(),
}));

import { fetchAthletes } from '../../api/athletes.js';
import { uploadSession } from '../../api/sessions.js';

describe('NdjsonUploadModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not render when open=false', () => {
    render(<NdjsonUploadModal open={false} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders form elements when open=true', async () => {
    fetchAthletes.mockResolvedValue([]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Upload NDJSON Session')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText(/Athlete \*/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/Session File/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows loading state while fetching athletes', () => {
    fetchAthletes.mockReturnValue(new Promise(() => {}));
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);
    expect(screen.getByText(/loading athletes/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
  });

  it('shows athletes in select dropdown', async () => {
    fetchAthletes.mockResolvedValue([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });

  it('shows error if athlete fetch fails', async () => {
    fetchAthletes.mockRejectedValue(new Error('Fetch failed'));
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /upload/i })).toBeDisabled();
    });
  });

  it('shows validation error if no athlete selected', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload/i })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));
    expect(screen.getByText('Please select an athlete')).toBeInTheDocument();
  });

  it('shows validation error if no file selected', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Athlete \*/i), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    expect(screen.getByText('Please choose an NDJSON file')).toBeInTheDocument();
  });

  it('shows validation error for wrong file extension', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Athlete \*/i), { target: { value: '1' } });

    const file = new File(['hello'], 'hello.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText(/Session File/i), { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    expect(screen.getByText('File must have a .ndjson extension')).toBeInTheDocument();
  });

  it('shows validation error for oversized file', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Athlete \*/i), { target: { value: '1' } });

    const file = new File([''], 'big.ndjson', { type: 'application/json' });
    Object.defineProperty(file, 'size', { value: 101 * 1024 * 1024 });

    fireEvent.change(screen.getByLabelText(/Session File/i), { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    expect(screen.getByText('File exceeds 100 MB maximum')).toBeInTheDocument();
  });

  it('shows success banner on processed status', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    uploadSession.mockResolvedValue({
      status: 'processed',
      metrics: {
        total_distance_m: 5000,
        max_speed_kmh: 25.5,
        sprint_count: 10,
        player_load: 150.2,
      },
    });

    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Athlete \*/i), { target: { value: '1' } });
    const file = new File(['{"data": 1}'], 'session.ndjson');
    fireEvent.change(screen.getByLabelText(/Session File/i), { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/uploaded and processed successfully/i)).toBeInTheDocument();
      expect(screen.getByText('5000 m')).toBeInTheDocument();
      expect(screen.getByText('25.5 km/h')).toBeInTheDocument();
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('150.2')).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows duplicate banner on duplicate_skipped status', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    uploadSession.mockResolvedValue({
      status: 'duplicate_skipped',
      metrics: { total_distance_m: 1234 },
    });

    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Athlete \*/i), { target: { value: '1' } });
    const file = new File([''], 'session.ndjson');
    fireEvent.change(screen.getByLabelText(/Session File/i), { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/already processed/i)).toBeInTheDocument();
      expect(screen.getByText('1234 m')).toBeInTheDocument();
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('shows global error when upload fails', async () => {
    fetchAthletes.mockResolvedValue([{ id: '1', name: 'Alice' }]);
    uploadSession.mockRejectedValue(new Error('Server crashed'));

    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Athlete \*/i), { target: { value: '1' } });
    const file = new File([''], 'session.ndjson');
    fireEvent.change(screen.getByLabelText(/Session File/i), { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /upload/i }));

    await waitFor(() => {
      expect(screen.getByText(/server crashed/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Session File/i)).toBeInTheDocument();
    });
  });

  it('calls onClose when cancel clicked', async () => {
    fetchAthletes.mockResolvedValue([]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('closes on escape key if not uploading', async () => {
    fetchAthletes.mockResolvedValue([]);
    render(<NdjsonUploadModal open={true} onClose={mockOnClose} onSuccess={mockOnSuccess} />);

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
