import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  ArrowLeft,
  Stethoscope,
  GraduationCap,
  AlertCircle,
  CheckCircle2,
  Ticket,
  Activity,
  Layers,
  CalendarDays,
} from 'lucide-react';
import { appointmentsApi, availabilityApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { StatusBadge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import type { Appointment, AvailabilitySlot } from '@/types';

export function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  // Cancel state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  // Reschedule state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);
  const [newSlotId, setNewSlotId] = useState<number | null>(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  const loadAppointment = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await appointmentsApi.getById(id);
      if (res.data) setAppointment(res.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading appointment',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const handleCancel = async () => {
    if (!appointment) return;
    setCancelling(true);
    try {
      await appointmentsApi.cancel(appointment.id, cancelReason);
      addToast({
        title: 'Appointment Cancelled',
        description: 'Slot has been released back to availability.',
        type: 'info',
      });
      setCancelModalOpen(false);
      loadAppointment();
    } catch (err: any) {
      addToast({
        title: 'Cancellation Failed',
        description: err.message,
        type: 'error',
      });
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenReschedule = async () => {
    if (!appointment) return;
    setRescheduleModalOpen(true);
    setNewSlotId(null);
    setRescheduleError(null);
    try {
      const res = await availabilityApi.list({
        service_type: appointment.service_type_code || undefined,
        provider_id: appointment.provider_id,
      });
      if (res.data) {
        setAvailableSlots(res.data.filter((s) => s.state === 'AVAILABLE' && !s.is_booked));
      }
    } catch {
      setRescheduleError('Could not load alternative slots for this provider.');
    }
  };

  const handleConfirmReschedule = async () => {
    if (!appointment || !newSlotId) return;
    setRescheduleLoading(true);
    setRescheduleError(null);
    try {
      await appointmentsApi.reschedule(appointment.id, newSlotId);
      addToast({
        title: 'Appointment Rescheduled',
        description: 'New slot confirmed and updated across services.',
        type: 'success',
      });
      setRescheduleModalOpen(false);
      loadAppointment();
    } catch (err: any) {
      setRescheduleError(err.message || 'Reschedule failed. The slot may have been reserved.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading appointment details..." />;
  }

  if (!appointment) {
    return (
      <div className="card p-8 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-lg font-bold text-navy-900">Appointment Not Found</h2>
        <p className="text-xs text-slate-500">
          The requested appointment record does not exist or you do not have permission to view it.
        </p>
        <Link to="/app/appointments" className="btn-primary text-xs">
          Return to My Appointments
        </Link>
      </div>
    );
  }

  const isClinic = appointment.service_type_code === 'CLINIC';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <Link
        to="/app/appointments"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Appointments</span>
      </Link>

      {/* Main Detail Card */}
      <div className="card-md p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isClinic ? 'bg-teal-50 text-teal-700' : 'bg-navy-50 text-navy-800'
              }`}
            >
              {isClinic ? <Stethoscope className="w-5 h-5" /> : <GraduationCap className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {isClinic ? 'Medical Appointment' : 'Academic Consultation'}
              </span>
              <h1 className="text-lg font-bold text-navy-900">{appointment.service_type_name}</h1>
            </div>
          </div>
          <StatusBadge status={appointment.status} />
        </div>

        {/* Queue Ticket Banner if Clinic */}
        {appointment.queue_entry && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">
                  Clinic Queue Ticket
                </div>
                <div className="text-xl font-mono font-extrabold text-navy-900">
                  {appointment.queue_entry.ticket_number}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <StatusBadge status={appointment.queue_entry.status} />
              <Link
                to="/app/clinic/queue"
                className="btn-accent text-xs py-1.5 px-3 font-semibold"
              >
                Live Queue Tracker
              </Link>
            </div>
          </div>
        )}

        {/* Detailed Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Provider</span>
            <div className="font-bold text-navy-900 mt-1">{appointment.provider_name}</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Scheduled Time</span>
            <div className="font-bold font-mono text-navy-900 mt-1">
              {appointment.start_at
                ? new Date(appointment.start_at).toLocaleDateString([], {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  }) +
                  ' at ' +
                  new Date(appointment.start_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Appointment ID</span>
            <div className="font-mono text-slate-700 mt-1 truncate">{appointment.id}</div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Booked On</span>
            <div className="font-mono text-slate-700 mt-1">
              {new Date(appointment.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {appointment.notes && (
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">Student Request Notes</span>
            <p className="text-slate-700 mt-1">{appointment.notes}</p>
          </div>
        )}

        {/* Adviser Session Outcome Notes */}
        {appointment.outcome_notes && (
          <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-teal-900">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>Adviser Session Outcome & Decision Notes</span>
            </div>
            <p className="text-slate-800 mt-1 leading-relaxed whitespace-pre-line font-sans">
              {appointment.outcome_notes}
            </p>
          </div>
        )}

        {appointment.cancellation_reason && (
          <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 text-xs">
            <span className="text-[10px] font-semibold text-rose-500 uppercase">Cancellation Reason</span>
            <p className="text-rose-800 mt-1">{appointment.cancellation_reason}</p>
          </div>
        )}

        {/* Actions for Confirmed Bookings */}
        {appointment.status === 'CONFIRMED' && (
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={handleOpenReschedule}
              className="btn-outline text-xs font-semibold py-2 px-4 bg-white"
            >
              Reschedule
            </button>
            <button
              onClick={() => setCancelModalOpen(true)}
              className="btn-danger text-xs font-semibold py-2 px-4"
            >
              Cancel Appointment
            </button>
          </div>
        )}
      </div>

      {/* Reschedule Modal */}
      <Modal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Appointment"
        description={`Pick an alternative time slot with ${appointment.provider_name}`}
      >
        <div className="space-y-4">
          {rescheduleError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {rescheduleError}
            </div>
          )}

          <div>
            <label className="label">Available Alternative Slots</label>
            {availableSlots.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No other slots currently open for this provider.</p>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2">
                {availableSlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setNewSlotId(s.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs font-mono transition-colors ${
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
              onClick={() => setRescheduleModalOpen(false)}
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

      {/* Cancel Modal */}
      <Modal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Appointment"
        description="Are you sure you want to cancel this booking?"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            This will release the availability slot back to the shared calendar and terminate your queue position if this was a clinic appointment.
          </p>
          <div>
            <label className="label">Reason (optional)</label>
            <input
              type="text"
              placeholder="e.g. Personal schedule change"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="input text-xs"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              onClick={() => setCancelModalOpen(false)}
              className="btn-ghost text-xs"
              disabled={cancelling}
            >
              Keep
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="btn-danger text-xs font-semibold"
            >
              {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
