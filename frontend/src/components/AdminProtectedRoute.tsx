import { Navigate, Outlet } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

export function AdminProtectedRoute() {
  const { isAdmin } = useAdmin();
  return isAdmin ? <Outlet /> : <Navigate to="/login" replace />;
}
