import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AcwrAlertBanner from '../AcwrAlertBanner.jsx';

describe('AcwrAlertBanner', () => {
  const renderWithRouter = (ui) => {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
  };

  it('renders nothing when athletes is empty', () => {
    const { container } = renderWithRouter(<AcwrAlertBanner athletes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when athletes is null', () => {
    const { container } = renderWithRouter(<AcwrAlertBanner athletes={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders banner with alert role when athletes are present', () => {
    renderWithRouter(<AcwrAlertBanner athletes={[{ athlete_id: '1', name: 'John Doe' }]} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders heading text', () => {
    renderWithRouter(<AcwrAlertBanner athletes={[{ athlete_id: '1', name: 'John Doe' }]} />);
    expect(screen.getByText(/High Risk Alert — ACWR > 1.50/i)).toBeInTheDocument();
  });

  it('renders athlete name as a link', () => {
    renderWithRouter(<AcwrAlertBanner athletes={[{ athlete_id: '1', name: 'John Doe' }]} />);
    const link = screen.getByRole('link', { name: 'John Doe' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/athletes/1');
  });

  it('renders multiple athletes as links', () => {
    renderWithRouter(
      <AcwrAlertBanner
        athletes={[
          { athlete_id: '1', name: 'John Doe' },
          { athlete_id: '2', name: 'Jane Smith' },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'John Doe' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Jane Smith' })).toBeInTheDocument();
  });

  it('has aria-live polite attribute', () => {
    renderWithRouter(<AcwrAlertBanner athletes={[{ athlete_id: '1', name: 'John Doe' }]} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});
