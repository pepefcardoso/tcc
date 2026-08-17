import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
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
});
