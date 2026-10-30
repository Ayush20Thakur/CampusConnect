import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Stethoscope,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  Pause,
  Play,
  MapPin,
  Bell,
} from 'lucide-react';
import { queueApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { StatusBadge } from '@/components/Badge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import type { QueueEntry } from '@/types';

export function ClinicQueueTrackerPage() {
  const { addToast } = useToast();

  const [queueEntry, setQueueEntry] = useState<QueueEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollingActive, setPollingActive] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const loadMyQueue = async () => {
    try {
      const res = await queueApi.myQueue();
      setQueueEntry(res.data ?? null);
      setLastRefreshed(new Date());
    } catch (err: any) {
      // not fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyQueue();
  }, []);

  // Polling every 5 seconds if active
  useEffect(() => {
    if (!pollingActive) return;
    const interval = setInterval(loadMyQueue, 5000);
    return () => clearInterval(interval);
  }, [pollingActive]);

  if (loading) {
    return <LoadingSpinner label="Checking your clinic queue ticket..." />;
  }

  if (!queueEntry) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <EmptyState
          icon={Clock}
          title="No Active Clinic Queue Ticket"
          description="You do not currently have a waiting or called clinic appointment ticket for today."
          actionText="Book a Clinic Appointment"
          onAction={() => (window.location.href = '/app/book/clinic')}
        />

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 flex items-start gap-2.5">
          <Stethoscope className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Note on Service Architecture:</strong> Queue tickets are only generated for <em>Campus Clinic</em> appointments. Academic Advising sessions do not utilize tickets as they are conducted as direct scheduled consultations.
          </span>
        </div>
      </div>
    );
  }

  const isCalled = queueEntry.status === 'CALLED';
  const isInService = queueEntry.status === 'IN_SERVICE';
  const isWaiting = queueEntry.status === 'WAITING';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header with Poll Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Live Queue Visibility
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            Clinic Queue Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status of your clinic consultation ticket.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPollingActive(!pollingActive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              pollingActive
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {pollingActive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Auto-Refresh (5s)</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Paused</span>
              </>
            )}
          </button>

          <button
            onClick={loadMyQueue}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            title="Refresh now"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Ticket Showcase Hero Card */}
      <div
        className={`card-md p-8 text-center space-y-6 relative overflow-hidden transition-all ${
          isCalled
            ? 'border-2 border-teal-500 ring-4 ring-teal-500/20 bg-teal-50/20'
            : 'border-slate-200'
        }`}
      >
        {isCalled && (
          <div className="bg-teal-600 text-white py-1.5 px-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 animate-pulse">
            <Bell className="w-4 h-4" />
            <span>It's Your Turn! Please Proceed to Consultation Desk</span>
          </div>
        )}

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Your Ticket Number
          </span>
          <div className="text-6xl sm:text-7xl font-extrabold font-mono tracking-tight text-navy-900 mt-2">
            {queueEntry.ticket_number}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <StatusBadge status={queueEntry.status} className="text-sm px-3 py-1" />
          </div>
        </div>

        {/* Position in Line Box */}
        <div className="max-w-xs mx-auto grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Ahead of You</div>
            <div className="text-2xl font-extrabold font-mono text-navy-900 mt-0.5">
              {queueEntry.ahead ?? 0}
            </div>
            <div className="text-[10px] text-slate-500">patient(s)</div>
          </div>

          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase">Est. Wait Time</div>
            <div className="text-2xl font-extrabold font-mono text-teal-700 mt-0.5">
              {queueEntry.ahead ? `${queueEntry.ahead * 15}m` : 'Next'}
            </div>
            <div className="text-[10px] text-slate-500">approximate</div>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-600 max-w-md mx-auto space-y-2 text-left bg-white p-4 rounded-xl border border-slate-200">
          <div className="font-bold text-navy-900 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" />
            <span>Wellness Center Reception, Room 101</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Please remain near the clinic lobby or monitor this page. When your ticket status changes to <strong>CALLED</strong>, present your student ID to the receptionist counter.
          </p>
        </div>

        <div className="text-[10px] text-slate-400 font-mono">
          Last updated at {lastRefreshed.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

