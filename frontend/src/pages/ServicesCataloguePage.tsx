import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  GraduationCap,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Layers,
  MapPin,
  HelpCircle,
} from 'lucide-react';
import { catalogApi } from '@/api/client';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { ServiceType, Provider } from '@/types';

export function ServicesCataloguePage() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, pRes] = await Promise.all([
          catalogApi.services(),
          catalogApi.providers(),
        ]);
        if (sRes.data) setServices(sRes.data);
        if (pRes.data) setProviders(pRes.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading service catalogue..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">
          Campus Service Directory
        </div>
        <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight mt-0.5">
          Available Campus Services
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Choose a service below to schedule your appointment. Each service utilizes shared campus availability and appointment management contracts with custom workflows.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Campus Clinic Card */}
        <div className="card-md p-6 flex flex-col justify-between border-slate-200 hover:shadow-card-lg transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center">
                <Stethoscope className="w-6 h-6" />
              </div>
              <span className="badge-teal font-semibold">Generates Queue Ticket</span>
            </div>

            <h2 className="text-xl font-bold text-navy-900">Campus Health Clinic</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Medical consultations, triage assessments, health screenings, and preventative care. Appointments automatically issue a digital queue ticket for real-time arrival and wait monitoring.
            </p>

            {/* Providers for this service */}
            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Service Providers
              </span>
              <div className="space-y-1.5">
                {providers
                  .filter((p) => p.service_type_code === 'CLINIC')
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy-900">{p.display_name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {p.location_label || 'Wellness Center'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Key Policies */}
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>30-minute standard consultation slots</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>Free cancellation up to 2 hours before slot time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>Includes real-time patient queue position tracking</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/app/book/clinic"
              className="btn-primary w-full py-2.5 text-xs font-semibold justify-center flex items-center gap-1.5 shadow-sm"
            >
              <span>Book Clinic Appointment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Academic Advising Card */}
        <div className="card-md p-6 flex flex-col justify-between border-slate-200 hover:shadow-card-lg transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-navy-50 border border-navy-200 text-navy-800 flex items-center justify-center">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="badge-navy font-semibold">Scheduled Consultations</span>
            </div>

            <h2 className="text-xl font-bold text-navy-900">Academic Advising</h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Course selection, degree progression audits, prerequisite evaluations, and academic standing consultations. Direct scheduled appointments without queue ticket overhead.
            </p>

            {/* Providers for this service */}
            <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Faculty Advisers
              </span>
              <div className="space-y-1.5">
                {providers
                  .filter((p) => p.service_type_code === 'ADVISING')
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-navy-900">{p.display_name}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {p.location_label || 'Faculty Hall'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Key Policies */}
            <div className="mt-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-navy-700 flex-shrink-0" />
                <span>45-minute comprehensive planning sessions</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-navy-700 flex-shrink-0" />
                <span>Free cancellation up to 4 hours before slot time</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-navy-700 flex-shrink-0" />
                <span>Adviser notes and outcomes recorded directly in system</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/app/book/advising"
              className="btn-outline w-full py-2.5 text-xs font-semibold justify-center flex items-center gap-1.5 bg-white shadow-sm"
            >
              <span>Book Advising Appointment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Architectural Note Box */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
        <Layers className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <strong className="text-navy-900">SOA Service Boundary Differentiation:</strong> Notice how Campus Clinic automatically initiates a queue entry upon confirmed booking via the <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-teal-700">ClinicAdapter</code>, while Academic Advising uses the <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-navy-800">AdvisingAdapter</code> to invoke the shared appointment capability without queue overhead.
        </div>
      </div>
    </div>
  );
}

