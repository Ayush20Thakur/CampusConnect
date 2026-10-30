import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  Stethoscope,
  GraduationCap,
  Filter,
  RefreshCw,
  MoreVertical,
  XCircle,
  CalendarDays,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { appointmentsApi, availabilityApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { StatusBadge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import type { Appointment, AvailabilitySlot } from '@/types';

export function MyAppointmentsPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>('ALL');

  // Cancel state
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Reschedule state
  const [reschedulingAppt, setReschedulingAppt] = useState<Appointment | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [newSlotId, setNewSlotId] = useState<number | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.myAppointments();
      if (res.data) setAppointments(res.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading appointments',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  // Filter list
  const filteredAppointments = appointments.filter((a) => {
    if (filter === 'ALL') return true;
    return a.status === filter;
  });

  // Handle Cancel
  const handleConfirmCancel = async () => {
    if (!cancellingAppt) return;
    setCancelLoading(true);
    try {
      await appointmentsApi.cancel(cancellingAppt.id, cancelReason);
      addToast({
        title: 'Appointment Cancelled',
        description: 'Slot has been released.',
        type: 'info',
      });
      setCancellingAppt(null);
      setCancelReason('');
      loadAppointments();
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

  // Open Reschedule Modal & load slots
  const handleOpenReschedule = async (appt: Appointment) => {
    setReschedulingAppt(appt);
    setNewSlotId(null);
    setRescheduleError(null);
    try {
      const res = await availabilityApi.list({
        service_type: appt.service_type_code || undefined,
        provider_id: appt.provider_id,
      });
      if (res.data) {
        setAvailableSlots(res.data.filter((s) => s.state === 'AVAILABLE' && !s.is_booked));
      }
    } catch {
      setRescheduleError('Could not load alternative slots for this provider.');
    }
  };

  // Submit Reschedule
  const handleConfirmReschedule = async () => {
    if (!reschedulingAppt || !newSlotId) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      await appointmentsApi.reschedule(reschedulingAppt.id, newSlotId);
      addToast({
        title: 'Appointment Rescheduled',
        description: 'New time slot confirmed.',
        type: 'success',
      });
      setReschedulingAppt(null);
      loadAppointments();
    } catch (err: any) {
      setRescheduleError(err.message || 'Reschedule failed. The slot may have been taken.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your appointments..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Student Appointments
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            My Appointments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review your upcoming bookings, reschedule sessions, or cancel reservations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/app/services" className="btn-primary text-xs font-semibold py-2 px-3 shadow-sm">
            Book New
          </Link>
          <button
            onClick={loadAppointments}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            title="Refresh list"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {(['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === tab
                ? 'bg-navy-800 text-white'
                : 'text-slate-600 hover:bg-slate-200/60'
            }`}
          >
            {tab === 'ALL' ? 'All Bookings' : tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No Appointments Found"
          description={`No ${filter !== 'ALL' ? filter.toLowerCase() : ''} appointments match your filter selection.`}
          actionText="Explore Campus Services"
          onAction={() => navigate('/app/services')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((appt) => {
            const isClinic = appt.service_type_code === 'CLINIC';

            return (
              <div
                key={appt.id}
                className="card p-5 flex flex-col justify-between hover:border-slate-300 transition-all border-slate-200"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isClinic ? 'bg-teal-50 text-teal-700' : 'bg-navy-50 text-navy-800'
                        }`}
                      >
                        {isClinic ? <Stethoscope className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                      </div>
                      <span className="text-xs font-bold text-navy-900">
                        {isClinic ? 'Campus Clinic' : 'Academic Advising'}
                      </span>
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>

                  <div className="py-3 space-y-1.5">
                    <div className="text-sm font-bold text-navy-900">
                      {appt.provider_name || 'Staff Provider'}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {appt.start_at
                          ? new Date(appt.start_at).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            }) +
                            ' at ' +
                            new Date(appt.start_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Unscheduled'}
                      </span>
                    </div>

                    {appt.notes && (
                      <p className="text-xs text-slate-500 line-clamp-1 italic">
                        "{appt.notes}"
                      </p>
                    )}

                    {/* Queue Ticket if Clinic */}
                    {appt.queue_entry && (
                      <div className="mt-2 p-2 rounded-lg bg-teal-50/70 border border-teal-200/80 flex items-center justify-between text-xs">
                        <span className="text-teal-800 font-semibold">Queue Ticket:</span>
                        <span className="font-mono font-bold text-teal-900">
                          {appt.queue_entry.ticket_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/app/appointments/${appt.id}`}
                    className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  {appt.status === 'CONFIRMED' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenReschedule(appt)}
                        className="btn-ghost text-xs py-1 px-2 text-navy-800 hover:bg-slate-100"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => setCancellingAppt(appt)}
                        className="btn-ghost text-xs py-1 px-2 text-rose-600 hover:bg-rose-50"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Modal */}
      <Modal
        isOpen={Boolean(cancellingAppt)}
        onClose={() => setCancellingAppt(null)}
        title="Cancel Appointment"
        description="Release this slot and remove clinic queue status."
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Confirming cancellation will release this booking and notify the provider.
          </p>
          <div>
            <label className="label">Cancellation Reason</label>
            <input
              type="text"
              placeholder="e.g. Schedule conflict"
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
              Keep
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

      {/* Reschedule Modal */}
      <Modal
        isOpen={Boolean(reschedulingAppt)}
        onClose={() => setReschedulingAppt(null)}
        title="Reschedule Appointment"
        description={`Pick a new slot with ${reschedulingAppt?.provider_name}`}
      >
        <div className="space-y-4">
          {rescheduleError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {rescheduleError}
            </div>
          )}

          <div>
            <label className="label">Select Alternative Slot</label>
            {availableSlots.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No other slots currently open for this provider.</p>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                {availableSlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewSlotId(s.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs font-mono transition-colors ${
                      newSlotId === s.id
                        ? 'bg-navy-800 text-white font-bold'
                        : 'hover:bg-slate-100 text-navy-900'
                    }`}
                  >
                    {new Date(s.start_at).toLocaleDateString([], {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    •{' '}
                    {new Date(s.start_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setReschedulingAppt(null)}
              className="btn-ghost text-xs"
              disabled={rescheduleLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReschedule}
              disabled={!newSlotId || rescheduleLoading}
              className="btn-primary text-xs font-semibold"
            >
              {rescheduleLoading ? 'Updating Slot...' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

