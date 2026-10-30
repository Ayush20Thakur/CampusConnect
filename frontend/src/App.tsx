import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './app/AuthContext';
import { ToastProvider } from './app/ToastContext';
import { AppShell } from './components/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';

// Pages
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { ServicesCataloguePage } from './pages/ServicesCataloguePage';
import { BookingWizardPage } from './pages/BookingWizardPage';
import { MyAppointmentsPage } from './pages/MyAppointmentsPage';
import { AppointmentDetailPage } from './pages/AppointmentDetailPage';
import { ClinicQueueTrackerPage } from './pages/ClinicQueueTrackerPage';
import { StaffClinicQueuePage } from './pages/StaffClinicQueuePage';
import { StaffAdvisingPage } from './pages/StaffAdvisingPage';
import { AdminSOAConsolePage } from './pages/AdminSOAConsolePage';
import { AdminFaultLabPage } from './pages/AdminFaultLabPage';
import { AdminAuditTracePage } from './pages/AdminAuditTracePage';

function RoleHomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/app/admin/soa-console" replace />;
  if (user.role === 'CLINIC_STAFF') return <Navigate to="/app/staff/clinic" replace />;
  if (user.role === 'ADVISER') return <Navigate to="/app/staff/advising" replace />;
  return <Navigate to="/app/dashboard" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Authenticated Workspace Routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              {/* Common Catalog */}
              <Route path="services" element={<ServicesCataloguePage />} />

              {/* Student Routes */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="book/:serviceType"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <BookingWizardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appointments"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <MyAppointmentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="appointments/:id"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <AppointmentDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="clinic/queue"
                element={
                  <ProtectedRoute allowedRoles={['STUDENT', 'ADMIN']}>
                    <ClinicQueueTrackerPage />
                  </ProtectedRoute>
                }
              />

              {/* Clinic Staff Routes */}
              <Route
                path="staff/clinic"
                element={
                  <ProtectedRoute allowedRoles={['CLINIC_STAFF', 'ADMIN']}>
                    <StaffClinicQueuePage />
                  </ProtectedRoute>
                }
              />

              {/* Adviser Staff Routes */}
              <Route
                path="staff/advising"
                element={
                  <ProtectedRoute allowedRoles={['ADVISER', 'ADMIN']}>
                    <StaffAdvisingPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin / SOA Console Routes */}
              <Route
                path="admin/soa-console"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminSOAConsolePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/services"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminSOAConsolePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/traces"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAuditTracePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/audit"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminAuditTracePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/fault-lab"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <AdminFaultLabPage />
                  </ProtectedRoute>
                }
              />

              {/* Default Role-Aware Redirect within /app */}
              <Route index element={<RoleHomeRedirect />} />
            </Route>

            {/* Fallback 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

