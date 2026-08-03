import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AthletesPage from './pages/AthletesPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import AthleteDetailPage from './pages/AthleteDetailPage.jsx';

const router = createBrowserRouter([
  { path: '/',          element: <Navigate to="/dashboard" replace /> },
  { path: '/login',     element: <LoginPage /> },
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/athletes',  element: <AthletesPage /> },
  { path: '/athletes/:id', element: <AthleteDetailPage /> },
  { path: '/sessions',  element: <SessionsPage /> },
]);

export default router;
