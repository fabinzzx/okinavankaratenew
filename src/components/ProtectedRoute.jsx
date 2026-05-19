import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, profile, availableProfiles, loading } = useAuth();

  console.log("[ProtectedRoute Trace] Evaluating route access:", {
    email: user?.email,
    role,
    isOnboarded: profile?.isOnboarded,
    hasMultipleProfiles: availableProfiles && availableProfiles.length > 1,
    loading,
    allowedRoles,
    currentPath: window.location.pathname
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-red"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect non-onboarded regular students to onboarding page (/joinus)
  const isAdmin = role === 'super_admin' || role === 'dojo_admin' || user.email === 'francisfabin860@gmail.com';
  const hasMultipleProfiles = availableProfiles && availableProfiles.length > 1;
  
  if (!isAdmin && !hasMultipleProfiles && (!profile || !profile.isOnboarded)) {
    console.log("[ProtectedRoute Trace] Redirecting to /joinus: User is not onboarded.");
    return <Navigate to="/joinus" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // If user's role isn't allowed, send them to their dashboard or home page
    if (role === 'super_admin' || role === 'dojo_admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
