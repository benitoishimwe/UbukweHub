import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { SUPER_ADMIN_ROLE, TENANT_ADMIN_ROLE } from '../contexts/AuthContext';

const SUPER_ADMIN_ROOT = '/super-admin';
const ONBOARDING_PATH  = '/onboarding';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, tenantId } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9FB] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#0F4C5C] flex items-center justify-center shadow-lg">
            <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
          <p className="text-[#6B7280] font-medium" style={{fontFamily:'Poppins,sans-serif'}}>Loading Prani...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // super_admin always redirects to super-admin panel
  if (user.role === SUPER_ADMIN_ROLE && !location.pathname.startsWith(SUPER_ADMIN_ROOT)) {
    return <Navigate to={SUPER_ADMIN_ROOT} replace />;
  }

  // tenant_admin who hasn't completed onboarding goes to wizard
  if (
    user.role === TENANT_ADMIN_ROLE &&
    location.pathname !== ONBOARDING_PATH &&
    !localStorage.getItem('prani_onboarded_' + (tenantId ?? user.userId ?? user.user_id))
  ) {
    return <Navigate to={ONBOARDING_PATH} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
