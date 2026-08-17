import { createBrowserRouter, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import AthletesPage from './pages/AthletesPage.jsx';
import SessionsPage from './pages/SessionsPage.jsx';
import AthleteDetailPage from './pages/AthleteDetailPage.jsx';
import AthleteCreatePage from './pages/AthleteCreatePage.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import AuthGuardPlaceholder from './components/AuthGuardPlaceholder.jsx';

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <AuthGuardPlaceholder>
        <AppLayout />
      </AuthGuardPlaceholder>
    ),
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/athletes', element: <AthletesPage /> },
      { path: '/athletes/new', element: <AthleteCreatePage /> },
      { path: '/athletes/:id', element: <AthleteDetailPage /> },
      { path: '/sessions', element: <SessionsPage /> },
    ],
  },
]);

export default router;
