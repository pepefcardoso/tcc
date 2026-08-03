import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import AppLayout from '../../layouts/AppLayout.jsx';

describe('AppLayout Component', () => {
  const renderWithRouter = () => {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route
              path="/dashboard"
              element={<div data-testid="test-child">Dashboard Content</div>}
            />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders the brand text', () => {
    renderWithRouter();
    expect(screen.getByText('⚡ Sports Dashboard')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Athletes')).toBeInTheDocument();
    expect(screen.getByText('Sessions')).toBeInTheDocument();
  });

  it('renders a hamburger button for mobile', () => {
    renderWithRouter();
    const button = screen.getByLabelText('Toggle navigation');
    expect(button).toBeInTheDocument();
  });

  it('renders a logout button', () => {
    renderWithRouter();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('renders children via Outlet', () => {
    renderWithRouter();
    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });
});
