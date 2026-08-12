import { Navigate } from 'react-router-dom';
import { getToken } from '../api/client.js';

export default function AuthGuardPlaceholder({ children }) {
  return getToken() ? children : <Navigate to="/login" replace />;
}
