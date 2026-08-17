import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AthleteList from '../AthleteList.jsx';

describe('AthleteList Component', () => {
  const renderWithRouter = (ui) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders empty state when no athletes provided', () => {
    renderWithRouter(<AthleteList athletes={[]} />);
    expect(screen.getByText(/no athletes found/i)).toBeInTheDocument();
  });

  it('renders table headers correctly', () => {
    renderWithRouter(<AthleteList athletes={[{ id: '1', name: 'Test' }]} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Position')).toBeInTheDocument();
    expect(screen.getByText('Birth Date')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders active athlete correctly', () => {
    const athletes = [
      {
        id: '1',
        name: 'John Doe',
        position: 'Forward',
        birth_date: '1990-05-15',
        active: true,
      },
    ];

    renderWithRouter(<AthleteList athletes={athletes} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Forward')).toBeInTheDocument();
    expect(screen.getByText(/active/i)).toHaveClass('status-badge--active');
    expect(screen.queryByText(/inactive/i)).not.toBeInTheDocument();

    const link = screen.getByRole('link', { name: /view/i });
    expect(link).toHaveAttribute('href', '/athletes/1');
  });

  it('renders inactive athlete correctly', () => {
    const athletes = [
      {
        id: '2',
        name: 'Jane Smith',
        active: false,
      },
    ];

    renderWithRouter(<AthleteList athletes={athletes} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText(/inactive/i)).toHaveClass('status-badge--inactive');
    expect(screen.queryByText('Active', { exact: true })).not.toBeInTheDocument();
  });

  it('handles missing data gracefully', () => {
    const athletes = [
      {
        id: '3',
        name: 'Missing Info',
        active: true,
      },
    ];

    renderWithRouter(<AthleteList athletes={athletes} />);

    expect(screen.getByText('Missing Info')).toBeInTheDocument();
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBe(2);
  });

  it('calls onEdit when Edit button is clicked', async () => {
    const onEdit = vi.fn();
    const athletes = [{ id: '1', name: 'Test Athlete', active: true }];

    renderWithRouter(<AthleteList athletes={athletes} onEdit={onEdit} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(athletes[0]);
  });

  it('calls onInactivate when Inactivate button is clicked', async () => {
    const onInactivate = vi.fn();
    const athletes = [{ id: '1', name: 'Test Athlete', active: true }];

    renderWithRouter(<AthleteList athletes={athletes} onInactivate={onInactivate} />);
    
    const inactivateButton = screen.getByRole('button', { name: /inactivate/i });
    fireEvent.click(inactivateButton);

    expect(onInactivate).toHaveBeenCalledWith('1');
  });

  it('does not render Inactivate button for inactive athletes', () => {
    const onInactivate = vi.fn();
    const athletes = [{ id: '2', name: 'Inactive Athlete', active: false }];

    renderWithRouter(<AthleteList athletes={athletes} onInactivate={onInactivate} />);
    
    expect(screen.queryByRole('button', { name: /inactivate/i })).not.toBeInTheDocument();
  });
});
