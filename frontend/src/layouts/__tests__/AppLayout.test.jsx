import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from '../AppLayout.jsx';
import { clearAuth, handleUnauthorized } from '../../api/client.js';

vi.mock('../../api/client.js', () => ({
  clearAuth: vi.fn(),
  handleUnauthorized: vi.fn(),
}));

describe('AppLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderLayout = (initialRoute = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <AppLayout />
      </MemoryRouter>
    );
  };

  it('renders nav links', () => {
    renderLayout();
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /athletes/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sessions/i })).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderLayout();
    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  });

  it('logout calls clearAuth and redirects', () => {
    renderLayout();
    const logoutBtn = screen.getByRole('button', { name: /logout/i });

    fireEvent.click(logoutBtn);

    expect(clearAuth).toHaveBeenCalledTimes(1);
    expect(handleUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('hamburger toggles mobile menu', () => {
    renderLayout();
    const hamburger = screen.getByRole('button', { name: /toggle navigation/i });
    const navMenu = screen.getByRole('navigation');

    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(navMenu).not.toHaveClass('app-nav__links--open');

    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    expect(navMenu).toHaveClass('app-nav__links--open');

    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    expect(navMenu).not.toHaveClass('app-nav__links--open');
  });

  it('nav menu closes on route change', () => {
    renderLayout();
    const hamburger = screen.getByRole('button', { name: /toggle navigation/i });

    fireEvent.click(hamburger);
    expect(hamburger).toHaveAttribute('aria-expanded', 'true');

    const athletesLink = screen.getByRole('link', { name: /athletes/i });
    fireEvent.click(athletesLink);

    expect(hamburger).toHaveAttribute('aria-expanded', 'false');
  });
});
