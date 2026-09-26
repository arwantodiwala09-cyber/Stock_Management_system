import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const ProtectedRoute = () => {
  const { user, isInitialized, activeOrganization } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  // If user is logged in but hasn't selected an organization, and they are not currently on the select-org page
  if (!activeOrganization && location.pathname !== '/app/select-org') {
    return <Navigate to="/app/select-org" replace />;
  }

  return <Outlet />;
};

export const PublicRoute = () => {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return null; // Or a loading spinner
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return <Outlet />;
};
