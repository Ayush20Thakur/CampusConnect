import React, { useState, useEffect } from 'react';
import {
  Stethoscope,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Play,
  RotateCcw,
  SkipForward,
  UserCheck,
  RefreshCw,
  Calendar,
  Plus,
  Lock,
  Unlock,
} from 'lucide-react';
import { queueApi, availabilityApi, catalogApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { StatusBadge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Modal } from '@/components/Modal';
import type { QueueEntry, AvailabilitySlot, Provider } from '@/types';

export function StaffClinicQueuePage() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'QUEUE' | 'SLOTS'>('QUEUE');

  // Queue state
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Slots state
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);
  const [addSlotModalOpen, setAddSlotModalOpen] = useState(false);
  const [newSlotDate, setNewSlotDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newSlotStartTime, setNewSlotStartTime] = useState('09:00');
  const [newSlotDuration, setNewSlotDuration] = useState('30');
  const [addingSlot, setAddingSlot] = useState(false);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const res = await queueApi.staffQueue(date);
      if (res.data) setEntries(res.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading queue',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadClinicSlots = async () => {
    setSlotsLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        catalogApi.providers('CLINIC'),
        availabilityApi.staffSlots(selectedProviderId || undefined),
      ]);
      if (pRes.data) {
        setProviders(pRes.data);
        if (!selectedProviderId && pRes.data.length > 0) {
          setSelectedProviderId(pRes.data[0].id);
        }
      }
      if (sRes.data) setSlots(sRes.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading slots',
        description: err.message,
        type: 'error',
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
    loadClinicSlots();
  }, [date, selectedProviderId]);

  // Call Next Patient
  const handleCallNext = async () => {
    setActionLoading(true);
    try {
      const res = await queueApi.callNext(date);
      if (res.data) {
        addToast({
          title: 'Next Patient Called',
          description: `Ticket ${res.data.ticket_number} called to counter`,
          type: 'success',
        });
        loadQueue();
      } else {
        addToast({
          title: 'No Waiting Patients',
          description: 'No more waiting patients in queue for this date.',
          type: 'info',
        });
      }
    } catch (err: any) {
      addToast({
        title: 'Call Next Failed',
        description: err.message,
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Advance Status (e.g., CALLED -> IN_SERVICE, IN_SERVICE -> COMPLETED, etc.)
  const handleUpdateStatus = async (entryId: number, newStatus: string) => {
    setActionLoading(true);
    try {
      await queueApi.updateStatus(entryId, newStatus);
      addToast({
        title: 'Status Updated',
        description: `Ticket updated to ${newStatus}`,
        type: 'success',
      });
      loadQueue();
    } catch (err: any) {
      addToast({
        title: 'Transition Error',
        description: err.message,
        type: 'error',
      });
    } finally {
      setActionLoading(false);
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
        addToast({ title: 'Slot Reopened', description: 'Slot is now available for booking.', type: 'success' });
      }
      loadClinicSlots();
    } catch (err: any) {
      addToast({ title: 'Action Failed', description: err.message, type: 'error' });
    }
  };

  // Create Slot
  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId) return;
    setAddingSlot(true);
    try {
      const startDateTime = `${newSlotDate}T${newSlotStartTime}:00Z`;
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate.getTime() + parseInt(newSlotDuration) * 60 * 1000);

      await availabilityApi.addSlot({
        provider_id: selectedProviderId,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
      });

      addToast({
        title: 'Clinic Slot Published',
        description: `Published slot on ${newSlotDate} at ${newSlotStartTime}`,
        type: 'success',
      });
      setAddSlotModalOpen(false);
      loadClinicSlots();
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

  const waitingEntries = entries.filter((e) => e.status === 'WAITING');
  const calledEntries = entries.filter((e) => e.status === 'CALLED');
  const inServiceEntries = entries.filter((e) => e.status === 'IN_SERVICE');
  const completedEntries = entries.filter((e) => e.status === 'COMPLETED');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Clinic Operations Desk
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            Clinic Queue & Capacity Desk
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Control patient triage, call next in line, and manage provider consultation windows.
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex items-center gap-2">
          {activeTab === 'SLOTS' && (
            <button
              onClick={() => setAddSlotModalOpen(true)}
              className="btn-primary text-xs font-semibold py-2 px-3 shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Clinic Slot</span>
            </button>
          )}

          {activeTab === 'QUEUE' && (
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input text-xs max-w-[150px] font-mono py-1.5"
            />
          )}

          <button
            onClick={() => {
              loadQueue();
              loadClinicSlots();
            }}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('QUEUE')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'QUEUE'
              ? 'bg-navy-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Patient Queue Triage ({entries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SLOTS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'SLOTS'
              ? 'bg-navy-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Clinic Availability Slots ({slots.length})</span>
        </button>
      </div>

      {/* Tab 1: Queue Management */}
      {activeTab === 'QUEUE' && (
        <>
          {/* Quick Action & Stat Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Waiting</span>
              <div className="text-2xl font-extrabold font-mono text-amber-600 mt-1">
                {waitingEntries.length}
              </div>
            </div>

            <div className="card p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Called</span>
              <div className="text-2xl font-extrabold font-mono text-teal-600 mt-1">
                {calledEntries.length}
              </div>
            </div>

            <div className="card p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">In Service</span>
              <div className="text-2xl font-extrabold font-mono text-indigo-600 mt-1">
                {inServiceEntries.length}
              </div>
            </div>

            <div className="card p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Completed</span>
              <div className="text-2xl font-extrabold font-mono text-blue-600 mt-1">
                {completedEntries.length}
              </div>
            </div>
          </div>

          {/* Call Next Button Action Card */}
          <div className="bg-gradient-to-r from-teal-500 to-teal-700 text-white rounded-2xl p-6 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Call Next Patient to Counter</h2>
              <p className="text-xs text-teal-100 mt-0.5">
                Atomically transitions the next waiting ticket to CALLED and updates patient queue monitors.
              </p>
            </div>
            <button
              onClick={handleCallNext}
              disabled={actionLoading || waitingEntries.length === 0}
              className="btn bg-white text-teal-900 hover:bg-teal-50 text-xs font-bold py-3 px-6 rounded-xl shadow-sm disabled:opacity-50"
            >
              {actionLoading ? 'Calling...' : `Call Next Patient (${waitingEntries.length} waiting)`}
            </button>
          </div>

          {/* Queue Table */}
          <div className="card-md overflow-hidden border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-navy-900 flex items-center justify-between">
              <span>Active Patient Queue List</span>
              <span className="text-slate-400 font-mono text-[11px]">{entries.length} total tickets</span>
            </div>

            {loading ? (
              <LoadingSpinner label="Loading clinic queue..." />
            ) : entries.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-400">
                No queue entries found for this date.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Seq</th>
                      <th className="py-3 px-4">Ticket</th>
                      <th className="py-3 px-4">Patient Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-400">#{entry.sequence}</td>
                        <td className="py-3 px-4 font-mono font-bold text-navy-900">
                          {entry.ticket_number}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {entry.patient_name || 'Student Patient'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={entry.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {entry.status === 'WAITING' && (
                              <button
                                onClick={() => handleUpdateStatus(entry.id, 'CALLED')}
                                className="btn-accent text-[11px] py-1 px-2.5"
                                disabled={actionLoading}
                              >
                                Call
                              </button>
                            )}

                            {entry.status === 'CALLED' && (
                              <>
                                <button
                                  onClick={() => handleUpdateStatus(entry.id, 'IN_SERVICE')}
                                  className="btn-primary text-[11px] py-1 px-2.5"
                                  disabled={actionLoading}
                                >
                                  In Service
                                </button>
                                <button
                                  onClick={() => handleUpdateStatus(entry.id, 'SKIPPED')}
                                  className="btn-ghost text-[11px] text-slate-500 py-1 px-2 hover:bg-slate-100"
                                  disabled={actionLoading}
                                >
                                  Skip
                                </button>
                              </>
                            )}

                            {entry.status === 'IN_SERVICE' && (
                              <button
                                onClick={() => handleUpdateStatus(entry.id, 'COMPLETED')}
                                className="btn bg-blue-600 text-white hover:bg-blue-700 text-[11px] py-1 px-2.5"
                                disabled={actionLoading}
                              >
                                Complete
                              </button>
                            )}

                            {(entry.status === 'COMPLETED' || entry.status === 'SKIPPED') && (
                              <span className="text-[11px] text-slate-400 italic">Finished</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab 2: Clinic Slots Management */}
      {activeTab === 'SLOTS' && (
        <div className="card-md overflow-hidden border-slate-200 space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">Filter Provider:</span>
              <select
                value={selectedProviderId || ''}
                onChange={(e) => setSelectedProviderId(Number(e.target.value))}
                className="input text-xs max-w-xs"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name} ({p.location_label || 'Wellness Center'})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[11px] font-mono text-slate-400">{slots.length} slots loaded</span>
          </div>

          {slotsLoading ? (
            <LoadingSpinner label="Loading clinic slots..." />
          ) : slots.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No slots found for this provider. Click "Add Clinic Slot" above to publish consultation capacity.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
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

      {/* Modal: Add Clinic Slot */}
      <Modal
        isOpen={addSlotModalOpen}
        onClose={() => setAddSlotModalOpen(false)}
        title="Publish Clinic Availability Slot"
        description="Open up consultation capacity for student clinic appointments."
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
                <option value="15">15 minutes (Quick check)</option>
                <option value="30">30 minutes (Standard)</option>
                <option value="45">45 minutes</option>
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
              {addingSlot ? 'Publishing...' : 'Publish Slot'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
