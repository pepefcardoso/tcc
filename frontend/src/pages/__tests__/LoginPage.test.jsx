import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import LoginPage from '../LoginPage.jsx';
import apiClient, { TOKEN_KEY } from '../../api/client.js';

vi.mock('../../api/client.js', async () => {
  const actual = await vi.importActual('../../api/client.js');
  return {
    ...actual,
    default: vi.fn(),
  };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );
  };

  it('renders form elements', () => {
    renderComponent();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows inline error on empty submit', () => {
    renderComponent();
    const btn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(btn);

    expect(screen.getByRole('alert')).toHaveTextContent(/please enter your email and password/i);
    expect(apiClient).not.toHaveBeenCalled();
  });

  it('shows inline error on 401 unauthorized', async () => {
    apiClient.mockRejectedValueOnce(new Error('unauthorized'));
    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
  });

  it('shows network error', async () => {
    apiClient.mockRejectedValueOnce(new Error('Failed to fetch'));
    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/unable to reach the server/i);
    });
  });

  it('shows generic error on 500', async () => {
    apiClient.mockResolvedValueOnce({ ok: false });
    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/an unexpected error occurred/i);
    });
  });

  it('successful login stores token and navigates', async () => {
    const mockToken = 'jwt-token-123';
    apiClient.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: { id: 'u1' } }),
    });

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(setItemSpy).toHaveBeenCalledWith(TOKEN_KEY, mockToken);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('button disabled during loading', async () => {
    let resolveApi;
    apiClient.mockReturnValueOnce(new Promise((resolve) => {
      resolveApi = resolve;
    }));

    renderComponent();
    
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@test.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
    const btn = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(btn);

    expect(btn).toBeDisabled();
    expect(btn).toHaveTextContent(/signing in/i);

    resolveApi({ ok: true, json: async () => ({ token: 'abc' }) });

    await waitFor(() => {
      expect(btn).not.toBeDisabled();
    });
  });
});
