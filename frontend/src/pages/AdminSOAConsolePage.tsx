import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Server,
  Layers,
  Activity,
  FileText,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Cpu,
  Code2,
  ShieldCheck,
  Stethoscope,
  GraduationCap,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { adminApi } from '@/api/client';
import { useToast } from '@/app/ToastContext';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ServiceMetadata } from '@/types';

export function AdminSOAConsolePage() {
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'POLICIES' | 'CONTRACTS' | 'HEALTH'>('REGISTRY');
  const [loading, setLoading] = useState(true);

  // Overview & charts
  const [overview, setOverview] = useState({
    appointments_today: 0,
    upcoming_bookings: 0,
    cancellations: 0,
    active_queue_entries: 0,
  });
  const [services, setServices] = useState<ServiceMetadata[]>([]);
  const [chartData, setChartData] = useState<{ date: string; clinic: number; advising: number }[]>([]);

  // Policies, contracts, health
  const [policies, setPolicies] = useState<Record<string, any>>({});
  const [contracts, setContracts] = useState<any[]>([]);
  const [contractSearch, setContractSearch] = useState('');
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: string; note: string }>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [overRes, svcRes, chartRes, polRes, contRes, healthRes] = await Promise.all([
        adminApi.overview(),
        adminApi.services(),
        adminApi.bookingsChart(7),
        adminApi.policies().catch(() => ({ data: {} })),
        adminApi.contracts().catch(() => ({ data: [] })),
        adminApi.health().catch(() => ({ data: {} })),
      ]);

      if (overRes.data) setOverview(overRes.data);
      if (svcRes.data) setServices(svcRes.data);
      if (polRes.data) setPolicies(polRes.data);
      if (contRes.data) setContracts(contRes.data as any[]);
      if (healthRes.data) setHealthChecks(healthRes.data);

      if (chartRes.data) {
        const grouped: Record<string, { date: string; clinic: number; advising: number }> = {};
        chartRes.data.forEach((item) => {
          const d = item.date;
          if (!grouped[d]) {
            grouped[d] = { date: d, clinic: 0, advising: 0 };
          }
          if (item.service === 'CLINIC') grouped[d].clinic += item.count;
          if (item.service === 'ADVISING') grouped[d].advising += item.count;
        });
        setChartData(Object.values(grouped));
      }
    } catch (err: any) {
      addToast({
        title: 'Error loading SOA console',
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

  if (loading) {
    return <LoadingSpinner label="Querying SOA service registry & contracts..." />;
  }

  const filteredContracts = contracts.filter((c) => {
    if (!contractSearch) return true;
    const q = contractSearch.toLowerCase();
    return (
      c.service.toLowerCase().includes(q) ||
      c.route.toLowerCase().includes(q) ||
      c.purpose.toLowerCase().includes(q) ||
      c.method.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
            System Administration
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
            SOA Technical Console
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Service-Oriented Architecture topology, service registry contracts, and cross-service metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/app/admin/fault-lab"
            className="btn-accent text-xs font-semibold py-2 px-3 shadow-sm flex items-center gap-1.5"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Fault Lab</span>
          </Link>
          <Link
            to="/app/admin/traces"
            className="btn-outline text-xs font-semibold py-2 px-3 bg-white flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Trace Explorer</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500"
            title="Refresh registry"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Today's Appointments</span>
          <div className="text-2xl font-extrabold font-mono text-navy-900 mt-1">
            {overview.appointments_today}
          </div>
          <span className="text-[10px] text-teal-600 font-medium">Clinic & Advising</span>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Upcoming Bookings</span>
          <div className="text-2xl font-extrabold font-mono text-navy-900 mt-1">
            {overview.upcoming_bookings}
          </div>
          <span className="text-[10px] text-slate-500">Reserved future slots</span>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Released / Cancelled</span>
          <div className="text-2xl font-extrabold font-mono text-rose-600 mt-1">
            {overview.cancellations}
          </div>
          <span className="text-[10px] text-slate-500">Slots freed</span>
        </div>

        <div className="card p-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Active Clinic Tickets</span>
          <div className="text-2xl font-extrabold font-mono text-amber-600 mt-1">
            {overview.active_queue_entries}
          </div>
          <span className="text-[10px] text-amber-700 font-medium">Waiting & Called</span>
        </div>
      </div>

      {/* Sub-Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('REGISTRY')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'REGISTRY' ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Service Registry & Ingestion</span>
        </button>

        <button
          onClick={() => setActiveTab('POLICIES')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'POLICIES' ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Service Policies Contrast</span>
        </button>

        <button
          onClick={() => setActiveTab('CONTRACTS')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'CONTRACTS' ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>API Contracts Explorer ({contracts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('HEALTH')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'HEALTH' ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Module Health Matrix</span>
        </button>
      </div>

      {/* Tab 1: Service Registry & Charts */}
      {activeTab === 'REGISTRY' && (
        <div className="space-y-6">
          {/* Chart: Cross-Service Booking Trends */}
          <div className="card-md p-6 border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                  <span>Cross-Service Appointment Volume (7-Day Trend)</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Demonstrates unified appointment-management service ingestion across both domains.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Endpoint: /api/v1/admin/charts</span>
            </div>

            <div className="h-64 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No historical booking trends recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '8px',
                        borderColor: '#CBD5E1',
                        fontSize: '12px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <Bar dataKey="clinic" name="Campus Clinic" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="advising" name="Academic Advising" fill="#183153" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* SOA Service Registry Table */}
          <div className="card-md overflow-hidden border-slate-200">
            <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-xs text-navy-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-teal-600" />
                <span>SOA Service Boundaries & Discovery Registry</span>
              </div>
              <span className="text-teal-700 font-mono text-[11px] font-semibold">
                {services.length} Registered Boundaries
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Service Name</th>
                    <th className="py-3 px-4">Base Path</th>
                    <th className="py-3 px-4">Owning Module</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Health Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {services.map((svc) => (
                    <tr key={svc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-navy-900">{svc.service_name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{svc.description}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-teal-700">{svc.base_path || '—'}</td>
                      <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                        {svc.owning_module || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">{svc.version}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Healthy
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Service Policies Contrast */}
      {activeTab === 'POLICIES' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Clinic Policy Card */}
            <div className="card-md p-6 border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                    <Stethoscope className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Campus Clinic Policy</h3>
                    <span className="text-[10px] text-slate-400 font-mono">ServiceCode: CLINIC</span>
                  </div>
                </div>
                <span className="badge-teal font-semibold">Queue Enabled</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Provider Class:</span>
                  <span className="font-semibold text-navy-900">{policies.CLINIC?.provider_type || 'Medical Staff'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Default Slot Duration:</span>
                  <span className="font-mono text-navy-900 font-semibold">{policies.CLINIC?.default_duration_minutes} min</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Cancellation Cutoff:</span>
                  <span className="font-mono text-navy-900 font-semibold">{policies.CLINIC?.cancellation_cutoff_hours} hours</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Generates Queue Ticket:</span>
                  <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Yes (Q001+)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Adapter Class:</span>
                  <span className="font-mono text-slate-600">ClinicAdapter</span>
                </div>
              </div>
            </div>

            {/* Advising Policy Card */}
            <div className="card-md p-6 border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-navy-50 text-navy-800 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy-900 text-sm">Academic Advising Policy</h3>
                    <span className="text-[10px] text-slate-400 font-mono">ServiceCode: ADVISING</span>
                  </div>
                </div>
                <span className="badge-navy font-semibold">Scheduled Consultation</span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Provider Class:</span>
                  <span className="font-semibold text-navy-900">{policies.ADVISING?.provider_type || 'Academic Adviser'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Default Slot Duration:</span>
                  <span className="font-mono text-navy-900 font-semibold">{policies.ADVISING?.default_duration_minutes} min</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Cancellation Cutoff:</span>
                  <span className="font-mono text-navy-900 font-semibold">{policies.ADVISING?.cancellation_cutoff_hours} hours</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Generates Queue Ticket:</span>
                  <span className="font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    No (Direct scheduled slot)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Adapter Class:</span>
                  <span className="font-mono text-slate-600">AdvisingAdapter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: API Contracts Explorer */}
      {activeTab === 'CONTRACTS' && (
        <div className="card-md p-6 border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-slate-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search contracts by service, route, or method..."
                value={contractSearch}
                onChange={(e) => setContractSearch(e.target.value)}
                className="input pl-9 text-xs"
              />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {filteredContracts.length} contract specifications
            </span>
          </div>

          <div className="space-y-3">
            {filteredContracts.map((c, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                        c.method === 'GET'
                          ? 'bg-blue-100 text-blue-700'
                          : c.method === 'POST'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {c.method}
                    </span>
                    <span className="font-mono font-bold text-navy-900">{c.route}</span>
                  </div>
                  <span className="text-[11px] text-teal-700 font-semibold">{c.service}</span>
                </div>

                <p className="text-slate-600">{c.purpose}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400">Allowed Roles: </span>
                    <span className="text-navy-900 font-semibold">{c.roles?.join(', ')}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">HTTP Statuses: </span>
                    <span className="text-navy-900">{c.status_codes?.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Module Health Matrix */}
      {activeTab === 'HEALTH' && (
        <div className="card-md p-6 border-slate-200 space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-navy-900">Single-Process Module Reachability Matrix</h2>
            <p className="text-xs text-slate-500">
              Demonstrates internal architectural service boundary integrity within the modular monolith.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(healthChecks).map(([name, check]) => (
              <div key={name} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-navy-900">{name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{check.note}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {check.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
