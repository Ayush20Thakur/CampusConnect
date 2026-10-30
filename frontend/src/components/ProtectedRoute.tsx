import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner label="Authenticating session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="card-md p-8 max-w-lg mx-auto text-center space-y-4 my-12 border-rose-200">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-navy-900">Access Restricted (403)</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your current account role (<strong className="font-mono text-navy-800">{user.role}</strong>) does not have authorization to view this administrative console or service.
        </p>
        <div className="pt-2">
          <Link
            to={
              user.role === 'ADMIN'
                ? '/app/admin/soa-console'
                : user.role === 'CLINIC_STAFF'
                ? '/app/staff/clinic'
                : user.role === 'ADVISER'
                ? '/app/staff/advising'
                : '/app/dashboard'
            }
            className="btn-primary text-xs"
          >
            Go to Your Authorized Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

