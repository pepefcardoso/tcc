import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient, { TOKEN_KEY } from '../api/client.js';
import './LoginPage.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiClient('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error('server_error');
      }

      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.message === 'unauthorized') {
        setError('Invalid email or password.');
      } else if (err.message === 'server_error') {
        setError('An unexpected error occurred. Please try again.');
      } else {
        setError('Unable to reach the server. Check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-root">
      <div className="login-card">
        <div className="login-logo">
          <span aria-hidden="true">⚡</span>
          <h1>Sports Dashboard</h1>
          <p>Sign in to your account</p>
        </div>
        <form id="login-form" className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input 
              id="login-email" 
              type="email" 
              className="login-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <input 
              id="login-password" 
              type="password" 
              className="login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          {error && <p id="login-error" className="login-error" role="alert">{error}</p>}
          <button id="login-submit" type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
