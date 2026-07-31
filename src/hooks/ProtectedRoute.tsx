import React from 'react';
import { useAuth } from './useAuth'; // Assuming useAuth is in the same directory
import { Navigate, Outlet } from 'react-router-dom';
import ChatWidget from '@/components/chatbot/ChatWidget';

interface ProtectedRouteProps {
  redirectTo?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ redirectTo = '/auth' }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking authentication…
      </div>
    );
  }

  if (!session) {
    // User not logged in, redirect to the specified path
    return <Navigate to={redirectTo} replace />;
  }

  // User is logged in, render the child routes + floating assistant
  return (
    <>
      <Outlet />
      <ChatWidget />
    </>
  );
};

export default ProtectedRoute;
