import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AuthGuardPlaceholder from '../AuthGuardPlaceholder.jsx';

describe('AuthGuard Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderGuard = () => {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          <Route
            path="/dashboard"
            element={
              <AuthGuardPlaceholder>
                <div data-testid="protected-content">Protected Content</div>
              </AuthGuardPlaceholder>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders children when token exists', () => {
    localStorage.setItem('token', 'fake-jwt');
    
    renderGuard();
    
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
  });

  it('redirects to /login when token is missing', () => {
    
    renderGuard();
    
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
