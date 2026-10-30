import React, { useState, useEffect } from 'react';
import {
  Activity,
  FileText,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Layers,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import { adminApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { AuditEvent, RequestTraceStep } from '@/types';

export function AdminAuditTracePage() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'TRACES' | 'AUDIT'>('TRACES');
  const [loading, setLoading] = useState(true);

  // Traces data
  const [traces, setTraces] = useState<
    { correlation_id: string; step_count: number; started_at: string }[]
  >([]);
  const [selectedCorrelationId, setSelectedCorrelationId] = useState<string | null>(null);
  const [traceSteps, setTraceSteps] = useState<RequestTraceStep[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);

  // Audit data
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadInitial = async () => {
    setLoading(true);
    try {
      const [traceRes, auditRes] = await Promise.all([
        adminApi.traces(1),
        adminApi.auditEvents(1),
      ]);

      if (traceRes.data?.traces) {
        setTraces(traceRes.data.traces);
        if (traceRes.data.traces.length > 0 && !selectedCorrelationId) {
          loadStepsForCorrelation(traceRes.data.traces[0].correlation_id);
        }
      }

      if (auditRes.data?.events) {
        setAuditEvents(auditRes.data.events);
      }
    } catch (err: any) {
      addToast({
        title: 'Error loading traces & audit',
        description: err.message,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStepsForCorrelation = async (cid: string) => {
    setSelectedCorrelationId(cid);
    setDrillDownLoading(true);
    try {
      const res = await adminApi.traces(undefined, cid);
      if (res.data?.steps) {
        setTraceSteps(res.data.steps);
      }
    } catch (err: any) {
      addToast({
        title: 'Failed to fetch trace details',
        description: err.message,
        type: 'error',
      });
    } finally {
      setDrillDownLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading request traces and audit logs..." />;
  }

  const filteredAuditEvents = auditEvents.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.event_type.toLowerCase().includes(q) ||
      e.actor_name.toLowerCase().includes(q) ||
      (e.entity_type && e.entity_type.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            Observability & Compliance
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            Distributed Traces & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end request waterfall across service boundaries linked by unique correlation IDs.
          </p>
        </div>

        <button
          onClick={loadInitial}
          className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 self-start sm:self-auto"
          title="Refresh logs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('TRACES')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'TRACES'
              ? 'bg-navy-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Distributed Traces ({traces.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'AUDIT'
              ? 'bg-navy-800 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Trail ({auditEvents.length})</span>
        </button>
      </div>

      {/* Tab 1: Request Traces Waterfall */}
      {activeTab === 'TRACES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Traces List Column */}
          <div className="lg:col-span-5 card-md p-4 space-y-3 border-slate-200">
            <div className="text-xs font-bold text-navy-900 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span>Recent Request Traces</span>
              <span className="text-[11px] text-slate-400 font-mono">By Correlation ID</span>
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
              {traces.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No trace steps recorded.</p>
              ) : (
                traces.map((t) => (
                  <button
                    key={t.correlation_id}
                    onClick={() => loadStepsForCorrelation(t.correlation_id)}
                    className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                      selectedCorrelationId === t.correlation_id
                        ? 'bg-teal-50/50 border-teal-500 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-xs font-bold text-navy-900 truncate max-w-[200px]">
                        {t.correlation_id}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(t.started_at).toLocaleTimeString()} • {t.step_count} step(s)
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Drill Down Waterfall View */}
          <div className="lg:col-span-7 card-md p-6 border-slate-200 space-y-4">
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                  Waterfall Execution Flow
                </span>
                <h2 className="text-xs font-mono font-bold text-navy-900 truncate max-w-sm mt-0.5">
                  Correlation ID: {selectedCorrelationId || 'None Selected'}
                </h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {traceSteps.length} SOA Steps
              </span>
            </div>

            {drillDownLoading ? (
              <LoadingSpinner label="Loading step waterfall..." />
            ) : traceSteps.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Select a trace on the left to inspect its cross-service step timeline.
              </div>
            ) : (
              <div className="space-y-3">
                {traceSteps.map((step) => {
                  const isError = step.outcome === 'ERROR';

                  return (
                    <div
                      key={step.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                        isError
                          ? 'bg-rose-50/40 border-rose-200'
                          : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 font-mono text-[10px] font-bold text-slate-600 flex items-center justify-center">
                            {step.sequence}
                          </span>
                          <span className="font-bold text-navy-900">{step.service_name}</span>
                          <span className="text-[11px] text-slate-400">→</span>
                          <span className="font-mono text-teal-700">{step.operation}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isError
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {step.outcome}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500">
                            {step.duration_ms ?? 0}ms
                          </span>
                        </div>
                      </div>

                      {/* Safe Metadata tags */}
                      {Object.keys(step.safe_metadata || {}).length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-2 font-mono text-[10px] text-slate-600 overflow-x-auto">
                          {JSON.stringify(step.safe_metadata)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Audit Trail Log */}
      {activeTab === 'AUDIT' && (
        <div className="card-md overflow-hidden border-slate-200 space-y-4 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search audit events by type, actor, or entity..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {filteredAuditEvents.length} events logged
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4 font-mono">Correlation ID</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditEvents.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-navy-900">
                      {evt.event_type}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">{evt.actor_name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {evt.entity_type ? `${evt.entity_type} #${evt.entity_id || ''}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {evt.outcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 truncate max-w-[150px]">
                      {evt.correlation_id || '—'}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
                      {new Date(evt.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

