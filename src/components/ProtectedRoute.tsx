import { LoadingOverlay } from '@mantine/core';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = () => {
  const { session, loading } = useAuth();

  if (loading) return <LoadingOverlay visible zIndex={1000} overlayProps={{ blur: 2 }} />;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};