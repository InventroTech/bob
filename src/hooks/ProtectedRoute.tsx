import React from 'react';
import { useAuth } from './useAuth'; // Assuming useAuth is in the same directory
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectTo = '/auth' }) => {
  const { session, loading } = useAuth();

  if (loading) {
    // Optional: Show a loading spinner or skeleton screen while checking auth state
    return <div>Checking authentication...</div>;
  }

  if (!session) {
    // User not logged in, redirect to the specified path
    return <Navigate to={redirectTo} replace />;
  }

  // User is logged in, render the child routes
  return <Outlet />;
};

export default ProtectedRoute; 