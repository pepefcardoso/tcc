import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AcwrBadge from '../AcwrBadge.jsx';

describe('AcwrBadge', () => {
  describe('zone color rendering (4 boundary values per RF16)', () => {
    it.each([
      [0.79, 'blue', '0.79', 'acwr-badge--blue'],
      [0.8, 'green', '0.80', 'acwr-badge--green'],
      [1.31, 'yellow', '1.31', 'acwr-badge--yellow'],
      [1.51, 'red', '1.51', 'acwr-badge--red'],
    ])('value %s → zone %s → class %s', (value, zone, text, cls) => {
      render(<AcwrBadge value={value} zone={zone} />);
      const badge = screen.getByText(text);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass(cls);
    });
  });

  it('renders N/D badge when value and zone are null', () => {
    render(<AcwrBadge value={null} zone={null} />);
    const badge = screen.getByText('N/D');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('acwr-badge--none');
    expect(badge).toHaveAttribute('aria-label', 'ACWR — Insufficient history');
  });

  it('renders N/D badge when value is null', () => {
    render(<AcwrBadge value={null} zone="green" />);
    const badge = screen.getByText('N/D');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('acwr-badge--none');
  });

  it('renders N/D badge when zone is null', () => {
    render(<AcwrBadge value={1.0} zone={null} />);
    const badge = screen.getByText('N/D');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('acwr-badge--none');
  });

  it('sets correct aria-label for non-null zone', () => {
    render(<AcwrBadge value={1.25} zone="green" />);
    const badge = screen.getByText('1.25');
    expect(badge).toHaveAttribute('aria-label', 'ACWR 1.25 — green zone');
  });

  it('applies default md size class', () => {
    render(<AcwrBadge value={1.25} zone="green" />);
    const badge = screen.getByText('1.25');
    expect(badge).toHaveClass('acwr-badge--md');
  });

  it('applies sm size class when requested', () => {
    render(<AcwrBadge value={1.25} zone="green" size="sm" />);
    const badge = screen.getByText('1.25');
    expect(badge).toHaveClass('acwr-badge--sm');
  });

  it('formats values with 2 decimal places', () => {
    render(<AcwrBadge value={1} zone="green" />);
    expect(screen.getByText('1.00')).toBeInTheDocument();

    render(<AcwrBadge value={1.2} zone="green" />);
    expect(screen.getByText('1.20')).toBeInTheDocument();

    render(<AcwrBadge value={1.234} zone="green" />);
    expect(screen.getByText('1.23')).toBeInTheDocument();
  });
});
