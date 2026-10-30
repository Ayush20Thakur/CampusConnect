import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  BellOff,
  RefreshCw,
  CheckCircle2,
  Play,
  Layers,
  ArrowRight,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import { adminApi, appointmentsApi, availabilityApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export function AdminFaultLabPage() {
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<Record<string, boolean>>({
    slot_conflict: false,
    notification_failure: false,
    duplicate_replay: false,
  });

  // Interactive Live Test state
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    correlationId: string | null;
    body: any;
  } | null>(null);

  const loadFlags = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getFaultFlags();
      if (res.data) setFlags(res.data);
    } catch (err: any) {
      addToast({
        title: 'Error loading fault flags',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFlags();
  }, []);

  const handleToggle = async (key: string) => {
    const newFlags = { ...flags, [key]: !flags[key] };
    try {
      const res = await adminApi.setFaultFlags(newFlags);
      if (res.data) setFlags(res.data);
      addToast({
        title: 'Fault Flag Updated',
        description: `${key} is now ${newFlags[key] ? 'ENABLED' : 'DISABLED'}`,
        type: newFlags[key] ? 'warning' : 'info',
      });
    } catch (err: any) {
      addToast({
        title: 'Failed to update flag',
        description: err.message,
        type: 'error',
      });
    }
  };

  // Run live simulated booking to see fault behavior
  const handleRunLiveTest = async () => {
    setTestRunning(true);
    setTestResult(null);

    try {
      // Find a slot
      const slotsRes = await availabilityApi.list({ service_type: 'CLINIC' });
      const availableSlot = slotsRes.data?.find((s) => s.state === 'AVAILABLE' && !s.is_booked);
      const slotId = availableSlot?.id || 1;
      const providerId = availableSlot?.provider_id || 1;

      const correlationId = crypto.randomUUID();
      const testRequestId = flags.duplicate_replay ? 'static-replay-idem-key' : crypto.randomUUID();

      const response = await fetch('/api/v1/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId,
        },
        credentials: 'include',
        body: JSON.stringify({
          service_type: 'CLINIC',
          slot_id: slotId,
          provider_id: providerId,
          request_id: testRequestId,
          notes: 'Automated Fault Lab Test Invocation',
        }),
      });

      const json = await response.json().catch(() => ({}));

      setTestResult({
        status: response.status,
        correlationId: response.headers.get('X-Correlation-ID') || correlationId,
        body: json,
      });

      if (response.ok) {
        addToast({
          title: 'Test Completed (Success)',
          description: `HTTP ${response.status} returned from SOA endpoint`,
          type: 'success',
        });
      } else {
        addToast({
          title: `Expected Fault Triggered (HTTP ${response.status})`,
          description: json.error?.message || 'Error response captured',
          type: 'warning',
        });
      }
    } catch (err: any) {
      setTestResult({
        status: 500,
        correlationId: null,
        body: { error: err.message },
      });
    } finally {
      setTestRunning(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading Fault Lab controls..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            Resilience Engineering
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            SOA Fault Simulation Lab
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate network partitions, slot contention, and partial service degradation to verify fault isolation.
          </p>
        </div>

        <button
          onClick={loadFlags}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 self-start sm:self-auto"
          title="Refresh flags"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Flag Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Flag 1: Slot Conflict */}
        <div className="card-md p-6 border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => handleToggle('slot_conflict')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flags.slot_conflict ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    flags.slot_conflict ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <h2 className="text-base font-bold text-navy-900">Simulate Slot Contention (409)</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Forces booking requests to fail with a documented <code className="bg-slate-100 px-1 py-0.5 rounded text-amber-800">SLOT_UNAVAILABLE</code> (HTTP 409) error. Verifies that the client receives the conflict payload cleanly without double-booking or corrupting state.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400">
            Target: AppointmentService.create_appointment
          </div>
        </div>

        {/* Flag 2: Notification Failure */}
        <div className="card-md p-6 border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center">
                <BellOff className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => handleToggle('notification_failure')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  flags.notification_failure ? 'bg-rose-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    flags.notification_failure ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <h2 className="text-base font-bold text-navy-900">Simulate Notification Failure (Safe Degradation)</h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Forces Notification Service invocation to throw an exception. Verifies <strong>fault isolation</strong>: the confirmed appointment and queue ticket are safely preserved and not rolled back.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400">
            Target: NotificationService.create_notification
          </div>
        </div>
      </div>

      {/* Live Interactive Verification Panel */}
      <div className="card-md p-6 border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-teal-600" />
              <span>Live Fault Verification Console</span>
            </h2>
            <p className="text-xs text-slate-500">
              Fire a test booking request to observe the system's fault isolation and response payload in real-time.
            </p>
          </div>

          <button
            onClick={handleRunLiveTest}
            disabled={testRunning}
            className="btn-primary text-xs font-semibold py-2 px-4 shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            {testRunning ? (
              <span>Executing Request...</span>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Execute Live Test Call</span>
              </>
            )}
          </button>
        </div>

        {/* Test Result Inspector */}
        {testResult ? (
          <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto space-y-2">
            <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800">
              <div>
                <span>HTTP Status: </span>
                <span
                  className={
                    testResult.status >= 200 && testResult.status < 300
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }
                >
                  {testResult.status}
                </span>
              </div>
              <div>
                <span>Correlation ID: </span>
                <span className="text-teal-400">{testResult.correlationId}</span>
              </div>
            </div>

            <pre className="text-[11px] leading-relaxed text-slate-200">
              {JSON.stringify(testResult.body, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
            Toggle fault flags above and click "Execute Live Test Call" to inspect the JSON response.
          </div>
        )}
      </div>
    </div>
  );
}

