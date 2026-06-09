import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useCustomerAuth } from './CustomerAuthContext';

const CustomerProtectedRoute = () => {
  const { user, loading } = useCustomerAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070314] text-white flex items-center justify-center">
        <span className="text-white/60 text-sm">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default CustomerProtectedRoute;
