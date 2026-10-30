import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Bell,
  Stethoscope,
  GraduationCap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/app/ToastContext';
import { appointmentsApi, queueApi, notificationsApi } from '@/api/client';
import { StatusBadge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import type { Appointment, QueueEntry, Notification } from '@/types';

export function StudentDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [activeQueueEntry, setActiveQueueEntry] = useState<QueueEntry | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptRes, queueRes, notifRes] = await Promise.all([
        appointmentsApi.myAppointments(),
        queueApi.myQueue().catch(() => ({ data: null })),
        notificationsApi.list().catch(() => ({ data: { notifications: [], unread_count: 0 } })),
      ]);

      if (apptRes.data) setAppointments(apptRes.data);
      if (queueRes.data) setActiveQueueEntry(queueRes.data);
      if (notifRes.data) setNotifications(notifRes.data.notifications.slice(0, 5));
    } catch (err: any) {
      addToast({
        title: 'Error loading dashboard',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'CONFIRMED'
  );
  const completedAppointments = appointments.filter(
    (a) => a.status === 'COMPLETED'
  );

  const nextAppointment = upcomingAppointments[0];

  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    setCancelLoading(true);
    try {
      await appointmentsApi.cancel(cancellingAppt.id, cancelReason);
      addToast({
        title: 'Appointment Cancelled',
        description: 'Your slot has been released back to available scheduling.',
        type: 'info',
      });
      setCancellingAppt(null);
      setCancelReason('');
      loadData();
    } catch (err: any) {
      addToast({
        title: 'Cancellation Failed',
        description: err.message,
        type: 'error',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your campus dashboard..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Student Portal
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            Welcome back, {user?.full_name}!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your wellness clinic appointments and academic advising sessions.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/app/book/clinic"
            className="btn-primary text-xs font-semibold py-2 px-3 shadow-sm flex items-center gap-1.5"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Book Clinic</span>
          </Link>
          <Link
            to="/app/book/advising"
            className="btn-outline text-xs font-semibold py-2 px-3 bg-white hover:bg-slate-50 flex items-center gap-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Book Advising</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            title="Refresh dashboard"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Upcoming Bookings
            </div>
            <div className="text-2xl font-extrabold text-navy-900 mt-1 font-mono">
              {upcomingAppointments.length}
            </div>
            <div className="text-[11px] text-teal-600 mt-0.5 font-medium">
              Active scheduled slots
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Clinic Queue Status
            </div>
            <div className="text-2xl font-extrabold text-navy-900 mt-1 font-mono">
              {activeQueueEntry ? activeQueueEntry.ticket_number : '—'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {activeQueueEntry ? `${activeQueueEntry.ahead ?? 0} ahead in line` : 'No active queue ticket'}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-navy-50 border border-navy-200 text-navy-800 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="card p-5 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Recent Notifications
            </div>
            <div className="text-2xl font-extrabold text-navy-900 mt-1 font-mono">
              {notifications.filter((n) => !n.read).length}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Unread system updates
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <Bell className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Next Appointment Hero Card */}
      {nextAppointment ? (
        <div className="card-md p-6 bg-gradient-to-br from-white to-slate-50 border-slate-200">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Your Next Appointment
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-ping"></span>
            </div>
            <StatusBadge status={nextAppointment.status} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-700">
                {nextAppointment.service_type_code === 'CLINIC' ? (
                  <>
                    <Stethoscope className="w-4 h-4" />
                    <span>Campus Health Clinic</span>
                  </>
                ) : (
                  <>
                    <GraduationCap className="w-4 h-4" />
                    <span>Academic Advising Session</span>
                  </>
                )}
              </div>
              <h3 className="text-lg font-bold text-navy-900">
                {nextAppointment.provider_name || 'Staff Provider'}
              </h3>
              <p className="text-xs text-slate-500">
                {nextAppointment.notes || 'Routine consultation session'}
              </p>
            </div>

            <div className="space-y-1 bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-400">Scheduled Time</div>
              <div className="text-sm font-bold text-navy-900 font-mono">
                {nextAppointment.start_at
                  ? new Date(nextAppointment.start_at).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    }) +
                    ' at ' +
                    new Date(nextAppointment.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Time slot pending'}
              </div>
              {nextAppointment.queue_entry && (
                <div className="text-xs text-teal-700 font-semibold pt-1 border-t border-slate-100 mt-1 flex items-center justify-between">
                  <span>Queue Ticket:</span>
                  <span className="font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    {nextAppointment.queue_entry.ticket_number}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row md:flex-col gap-2 justify-center">
              {nextAppointment.queue_entry && (
                <Link
                  to="/app/clinic/queue"
                  className="btn-accent text-xs font-semibold py-2 justify-center shadow-sm"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Open Live Queue Tracker</span>
                </Link>
              )}
              <Link
                to={`/app/appointments/${nextAppointment.id}`}
                className="btn-outline text-xs font-semibold py-2 justify-center bg-white"
              >
                <span>View Details & Reschedule</span>
              </Link>
              <button
                onClick={() => setCancellingAppt(nextAppointment)}
                className="btn-ghost text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 py-1.5 justify-center"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Calendar}
          title="No Upcoming Appointments"
          description="You have no scheduled clinic visits or advising appointments at the moment."
          actionText="Book Your First Appointment"
          onAction={() => navigate('/app/services')}
        />
      )}

      {/* Recent Activity & Quick Links Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="card p-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-teal-600" />
              <span>Notifications & Activity</span>
            </h3>
            <span className="text-[11px] text-slate-400">In-App Safe Delivery</span>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 text-xs space-y-1 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-navy-900">{n.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600">{n.message}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Services Shortcut */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-sm text-navy-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Quick Services Access</span>
              </h3>
              <Link to="/app/services" className="text-xs font-semibold text-teal-600 hover:underline">
                View all →
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/app/book/clinic"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-teal-400 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-teal-100/50 text-teal-700 flex items-center justify-center mb-2 group-hover:bg-teal-500 group-hover:text-white transition-colors">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-navy-900">Campus Clinic</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Book consultation & get queue ticket
                </div>
              </Link>

              <Link
                to="/app/book/advising"
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-navy-400 transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-navy-100/50 text-navy-800 flex items-center justify-center mb-2 group-hover:bg-navy-800 group-hover:text-white transition-colors">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-navy-900">Academic Advising</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Degree planning with faculty advisers
                </div>
              </Link>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Need to reschedule? Go to <Link to="/app/appointments" className="text-teal-600 underline">My Appointments</Link> to pick another slot.
          </div>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancellingAppt)}
        onClose={() => setCancellingAppt(null)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this appointment?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Cancelling will release the slot back into the availability pool for other students and remove your clinic queue ticket if applicable.
          </p>

          <div>
            <label className="label">Reason for cancellation (optional)</label>
            <input
              type="text"
              placeholder="e.g. Conflict in schedule"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCancellingAppt(null)}
              className="btn-ghost text-xs"
              disabled={cancelLoading}
            >
              Keep Appointment
            </button>
            <button
              onClick={handleConfirmCancel}
              className="btn-danger text-xs font-semibold"
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

