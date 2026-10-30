import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  RefreshCw,
  Plus,
  ShieldAlert,
  Lock,
  Unlock,
} from 'lucide-react';
import { advisingApi, availabilityApi, catalogApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { StatusBadge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import type { Appointment, AvailabilitySlot, Provider } from '@/types';

export function StaffAdvisingPage() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'APPOINTMENTS' | 'SLOTS'>('APPOINTMENTS');

  // Appointments state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Outcome modal state
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Slots state
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [addSlotModalOpen, setAddSlotModalOpen] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newSlotStartTime, setNewSlotStartTime] = useState('10:00');
  const [newSlotDuration, setNewSlotDuration] = useState('45');
  const [addingSlot, setAddingSlot] = useState(false);

  // Load appointments
  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await advisingApi.appointments();
      if (res.data) setAppointments(res.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading advising sessions',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Load slots for adviser
  const loadSlots = async () => {
    setSlotsLoading(true);
    try {
      const res = await availabilityApi.staffSlots();
      if (res.data) setSlots(res.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading schedule slots',
        description: err.message,
        type: 'error',
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
    loadSlots();
  }, []);

  const handleOpenOutcomeModal = (appt: Appointment) => {
    setSelectedAppt(appt);
    setOutcomeNotes(appt.outcome_notes || '');
  };

  const handleSaveOutcome = async (targetStatus: 'COMPLETED' | 'NO_SHOW') => {
    if (!selectedAppt) return;
    setStatusUpdating(true);
    try {
      await advisingApi.updateStatus(selectedAppt.id, targetStatus, outcomeNotes);
      addToast({
        title: 'Session Outcome Saved',
        description: `Consultation marked as ${targetStatus} with outcome notes.`,
        type: 'success',
      });
      setSelectedAppt(null);
      loadAppointments();
    } catch (err: any) {
      addToast({
        title: 'Update Failed',
        description: err.message,
        type: 'error',
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  // Block / Unblock slot
  const handleToggleBlockSlot = async (slot: AvailabilitySlot) => {
    try {
      if (slot.state === 'AVAILABLE') {
        await availabilityApi.blockSlot(slot.id);
        addToast({ title: 'Slot Blocked', description: 'Slot is no longer bookable.', type: 'info' });
      } else {
        await availabilityApi.unblockSlot(slot.id);
        addToast({ title: 'Slot Reopened', description: 'Slot is now available for students.', type: 'success' });
      }
      loadSlots();
    } catch (err: any) {
      addToast({ title: 'Action Failed', description: err.message, type: 'error' });
    }
  };

  // Add new availability slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSlot(true);
    try {
      // Resolve adviser provider ID from existing slots or providers
      const providerId = slots[0]?.provider_id;
      if (!providerId) {
        throw new Error('Could not identify provider ID for this account.');
      }

      const startDateTime = `${newSlotDate}T${newSlotStartTime}:00Z`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + parseInt(newSlotDuration) * 60 * 1000);

      await availabilityApi.addSlot({
        provider_id: providerId,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
      });

      addToast({
        title: 'Availability Slot Added',
        description: `Slot added on ${newSlotDate} at ${newSlotStartTime}`,
        type: 'success',
      });
      setAddSlotModalOpen(false);
      loadSlots();
    } catch (err: any) {
      addToast({
        title: 'Failed to Add Slot',
        description: err.message,
        type: 'error',
      });
    } finally {
      setAddingSlot(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-navy-700">
            Adviser Operations Desk
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            Academic Advising & Schedule
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Conduct degree audits, manage student consultation outcomes, and configure availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'SLOTS' && (
            <button
              onClick={() => setAddSlotModalOpen(true)}
              className="btn-primary text-xs font-semibold py-2 px-3 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Open Slot</span>
            </button>
          )}
          <button
            onClick={() => {
              loadAppointments();
              loadSlots();
            }}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 self-start sm:self-auto"
            title="Refresh schedule"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('APPOINTMENTS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'APPOINTMENTS'
              ? 'bg-navy-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Student Consultations ({appointments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SLOTS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'SLOTS'
              ? 'bg-navy-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Manage Availability Slots ({slots.length})</span>
        </button>
      </div>

      {/* Advising Notice Box */}
      <div className="bg-navy-50/60 border border-navy-200/80 rounded-xl p-4 flex items-start gap-3">
        <GraduationCap className="w-5 h-5 text-navy-800 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-navy-900 leading-relaxed">
          <strong>Advising Service Boundary:</strong> Advising sessions are strictly scheduled appointments. Unlike the Campus Clinic, no queue ticket or wait tracker is created—consultations occur directly at the scheduled slot time in the assigned office.
        </div>
      </div>

      {/* Tab 1: Student Consultations Table */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="card-md overflow-hidden border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-navy-900 flex items-center justify-between">
            <span>Scheduled Consultations & Session Outcomes</span>
            <span className="text-slate-400 font-mono text-[11px]">{appointments.length} total</span>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading advising sessions..." />
          ) : appointments.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No scheduled advising appointments found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Provider / Office</th>
                    <th className="py-3 px-4">Outcome Notes</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {appointments.map((appt) => (
                    <tr key={appt.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900">{appt.user_name || 'Student'}</div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                          {appt.notes ? `"${appt.notes}"` : 'Routine academic advisement'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {appt.start_at
                          ? new Date(appt.start_at).toLocaleDateString([], {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            }) +
                            ' ' +
                            new Date(appt.start_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {appt.provider_name}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-xs">
                        {appt.outcome_notes ? (
                          <div className="line-clamp-2 italic text-[11px] bg-slate-50 p-1.5 rounded border border-slate-200">
                            {appt.outcome_notes}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pending session</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={appt.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {appt.status === 'CONFIRMED' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleOpenOutcomeModal(appt)}
                              className="btn bg-blue-600 text-white hover:bg-blue-700 text-[11px] py-1 px-2.5"
                            >
                              Record Outcome
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAppt(appt);
                                setOutcomeNotes('Student did not show up for scheduled consultation.');
                                handleSaveOutcome('NO_SHOW');
                              }}
                              className="btn-ghost text-[11px] text-amber-700 hover:bg-amber-50 py-1 px-2"
                            >
                              No Show
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleOpenOutcomeModal(appt)}
                            className="text-[11px] text-teal-600 hover:underline"
                          >
                            View Notes
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Availability Slots Management Table */}
      {activeTab === 'SLOTS' && (
        <div className="card-md overflow-hidden border-slate-200">
          <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-navy-900 flex items-center justify-between">
            <span>My Availability Schedule Slots</span>
            <span className="text-slate-400 font-mono text-[11px]">{slots.length} slots loaded</span>
          </div>

          {slotsLoading ? (
            <LoadingSpinner label="Loading availability slots..." />
          ) : slots.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No slots configured. Click "Add Open Slot" to open up availability.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Time Window</th>
                    <th className="py-3 px-4">State</th>
                    <th className="py-3 px-4">Booking Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slots.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono text-navy-900 font-semibold">
                        {new Date(s.start_at).toLocaleDateString([], {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {new Date(s.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(s.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.state === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.state}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {s.is_booked ? (
                          <span className="badge-blue font-semibold">Booked</span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Unbooked</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!s.is_booked && (
                          <button
                            onClick={() => handleToggleBlockSlot(s)}
                            className="btn-ghost text-xs py-1 px-2.5 flex items-center gap-1 ml-auto"
                          >
                            {s.state === 'AVAILABLE' ? (
                              <>
                                <Lock className="w-3.5 h-3.5 text-rose-600" />
                                <span className="text-rose-600">Block</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-600">Unblock</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Record Consultation Outcome */}
      <Modal
        isOpen={Boolean(selectedAppt)}
        onClose={() => setSelectedAppt(null)}
        title="Consultation Session Outcome"
        description={`Record notes for ${selectedAppt?.user_name || 'Student'}`}
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400">Student Booking Request</span>
            <p className="text-navy-900">{selectedAppt?.notes || 'Routine consultation'}</p>
          </div>

          <div>
            <label className="label">Adviser Outcome Notes & Academic Audit Decisions</label>
            <textarea
              rows={4}
              placeholder="e.g. Conducted graduation audit. Approved CS420 elective course plan. Student is on track for May graduation."
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              className="input text-xs"
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setSelectedAppt(null)}
              className="btn-ghost text-xs"
              disabled={statusUpdating}
            >
              Cancel
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleSaveOutcome('NO_SHOW')}
                className="btn-ghost text-xs text-amber-700 hover:bg-amber-50"
                disabled={statusUpdating}
              >
                Mark No-Show
              </button>
              <button
                onClick={() => handleSaveOutcome('COMPLETED')}
                className="btn-primary text-xs font-semibold py-2 px-4 shadow-sm"
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Saving...' : 'Complete & Save Notes'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Availability Slot */}
      <Modal
        isOpen={addSlotModalOpen}
        onClose={() => setAddSlotModalOpen(false)}
        title="Add Open Advising Slot"
        description="Publish a new bookable consultation window for students."
      >
        <form onSubmit={handleCreateSlot} className="space-y-4">
          <div>
            <label className="label">Slot Date</label>
            <input
              type="date"
              required
              value={newSlotDate}
              onChange={(e) => setNewSlotDate(e.target.value)}
              className="input text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Time</label>
              <input
                type="time"
                required
                value={newSlotStartTime}
                onChange={(e) => setNewSlotStartTime(e.target.value)}
                className="input text-xs font-mono"
              />
            </div>
            <div>
              <label className="label">Duration (Minutes)</label>
              <select
                value={newSlotDuration}
                onChange={(e) => setNewSlotDuration(e.target.value)}
                className="input text-xs"
              >
                <option value="30">30 minutes</option>
                <option value="45">45 minutes (Standard)</option>
                <option value="60">60 minutes</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddSlotModalOpen(false)}
              className="btn-ghost text-xs"
              disabled={addingSlot}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingSlot}
              className="btn-primary text-xs font-semibold py-2 px-4"
            >
              {addingSlot ? 'Creating...' : 'Create Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
