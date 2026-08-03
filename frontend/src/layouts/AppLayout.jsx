import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import './AppLayout.css';

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="app-nav">
        <div className="app-nav__brand">⚡ Sports Dashboard</div>

        <button
          className="app-nav__hamburger"
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>

        <nav
          id="nav-menu"
          className={`app-nav__links ${menuOpen ? 'app-nav__links--open' : ''}`}
          role="navigation"
        >
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/athletes">Athletes</NavLink>
          <NavLink to="/sessions">Sessions</NavLink>
          <button className="app-nav__logout">Logout</button>
        </nav>
      </header>

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
