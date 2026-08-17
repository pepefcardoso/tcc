import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SessionList from '../SessionList.jsx';

describe('SessionList Component', () => {
  const renderWithRouter = (ui) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders empty state when no sessions provided', () => {
    renderWithRouter(<SessionList sessions={[]} />);
    expect(screen.getByText(/no sessions found/i)).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    renderWithRouter(<SessionList sessions={[{ id: '1' }]} />);
    expect(screen.getByText('Athlete')).toBeInTheDocument();
    expect(screen.getByText('Device ID')).toBeInTheDocument();
    expect(screen.getByText(/Date/i)).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('Sync Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders synced badge and session details correctly', () => {
    const sessions = [
      {
        id: '1',
        athleteName: 'John Doe',
        device_id: 'DEV-123',
        started_at: '2023-10-15T10:00:00Z',
        duration_minutes: 45,
        sync_status: 'processed',
      },
    ];

    renderWithRouter(<SessionList sessions={sessions} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('DEV-123')).toBeInTheDocument();
    expect(screen.getByText(/45 min/i)).toBeInTheDocument();
    expect(screen.getByText(/Synced/i)).toHaveClass('status-badge--synced');

    const link = screen.getByRole('link', { name: /view/i });
    expect(link).toHaveAttribute('href', '/sessions/1');
  });

  it('renders processing badge correctly', () => {
    const sessions = [{ id: '2', sync_status: 'processing' }];
    renderWithRouter(<SessionList sessions={sessions} />);
    expect(screen.getByText(/Processing/i)).toHaveClass('status-badge--processing');
  });

  it('renders pending badge correctly', () => {
    const sessions = [{ id: '3', sync_status: 'pending' }];
    renderWithRouter(<SessionList sessions={sessions} />);
    expect(screen.getByText(/Pending/i)).toHaveClass('status-badge--pending');
  });

  it('handles missing data with fallback dashes', () => {
    const sessions = [{ id: '4', sync_status: 'unknown_status' }];
    renderWithRouter(<SessionList sessions={sessions} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(4);
    expect(screen.getByText(/Unknown/i)).toHaveClass('status-badge--pending');
  });

  it('calls onSort with "date" when date header is clicked', () => {
    const onSortMock = vi.fn();
    renderWithRouter(<SessionList sessions={[{ id: '1' }]} onSort={onSortMock} sortDir="desc" />);

    const sortBtn = screen.getByRole('button', { name: /Date ▼/i });
    fireEvent.click(sortBtn);

    expect(onSortMock).toHaveBeenCalledWith('date');
  });

  it('displays ascending arrow when sortDir is asc', () => {
    renderWithRouter(<SessionList sessions={[{ id: '1' }]} sortDir="asc" />);
    expect(screen.getByRole('button', { name: /Date ▲/i })).toBeInTheDocument();
  });
});
