import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  let isAuthenticated = false;
  try {
    // useAuth may throw if rendered outside provider; handle gracefully
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const auth = useAuth();
    isAuthenticated = auth.isAuthenticated;
  } catch (err) {
    console.error('ProtectedRoute: useAuth error', err);
    return <Navigate to="/login" replace />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;