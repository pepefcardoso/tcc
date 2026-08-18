import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AthleteCard from '../AthleteCard.jsx';

describe('AthleteCard', () => {
  const mockAthlete = {
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
  };

  const renderWithRouter = (ui) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders athlete name and link', () => {
    renderWithRouter(<AthleteCard athlete={mockAthlete} />);
    const link = screen.getByRole('link', { name: /Athlete One/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/athletes/a1');
  });

  it('renders AcwrBadge with correct zone class', () => {
    renderWithRouter(<AthleteCard athlete={mockAthlete} />);
    const badge = screen.getByText('1.60');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('acwr-badge--red');
  });

  it('renders N/D badge when acwr is null', () => {
    const noAcwrAthlete = { ...mockAthlete, acwr: { value: null, zone: null } };
    renderWithRouter(<AthleteCard athlete={noAcwrAthlete} />);
    const badge = screen.getByText('N/D');
    expect(badge).toBeInTheDocument();
  });

  it('renders metric rows formatting them correctly', () => {
    renderWithRouter(<AthleteCard athlete={mockAthlete} />);
    expect(screen.getByText('5000 m')).toBeInTheDocument();
    expect(screen.getByText('25.5 km/h')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('150.0')).toBeInTheDocument();
  });

  it('renders PSE pending pill when pse_pending is true', () => {
    renderWithRouter(<AthleteCard athlete={mockAthlete} />);
    expect(screen.getByText(/pse pending/i)).toBeInTheDocument();
  });

  it('does not render PSE pending pill when pse_pending is false', () => {
    const noPseAthlete = {
      ...mockAthlete,
      latest_session: { ...mockAthlete.latest_session, pse_pending: false },
    };
    renderWithRouter(<AthleteCard athlete={noPseAthlete} />);
    expect(screen.queryByText(/pse pending/i)).not.toBeInTheDocument();
  });

  it('renders "No sessions yet" when latest_session is null', () => {
    const noSessionAthlete = { ...mockAthlete, latest_session: null };
    renderWithRouter(<AthleteCard athlete={noSessionAthlete} />);
    expect(screen.getByText(/no sessions yet/i)).toBeInTheDocument();
  });

  it('does not render metric rows when latest_session is null', () => {
    const noSessionAthlete = { ...mockAthlete, latest_session: null };
    renderWithRouter(<AthleteCard athlete={noSessionAthlete} />);
    expect(screen.queryByText(/Distance:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Max Speed:/i)).not.toBeInTheDocument();
  });

  it('formats date correctly', () => {
    renderWithRouter(<AthleteCard athlete={mockAthlete} />);
    const expectedYear = '2023';
    const dateText = screen.getByText((content, element) => {
      return element.tagName.toLowerCase() === 'p' && content.includes(expectedYear);
    });
    expect(dateText).toBeInTheDocument();
  });
});
