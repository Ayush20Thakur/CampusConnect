import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Stethoscope,
  GraduationCap,
  Calendar,
  Clock,
  Bell,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Layers,
  Activity,
  Cpu,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { DemoAccountsBanner } from '@/components/DemoAccountsBanner';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/app/ToastContext';

export function LandingPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleQuickDemoLogin = async (email: string, pass: string) => {
    try {
      const loggedInUser = await login(email, pass);
      addToast({
        title: 'Logged In Successfully',
        description: `Signed in as ${email}`,
        type: 'success',
      });
      if (loggedInUser?.role === 'ADMIN') {
        navigate('/app/admin/soa-console');
      } else if (loggedInUser?.role === 'CLINIC_STAFF') {
        navigate('/app/staff/clinic');
      } else if (loggedInUser?.role === 'ADVISER') {
        navigate('/app/staff/advising');
      } else {
        navigate('/app/dashboard');
      }
    } catch (err: any) {
      addToast({
        title: 'Login Error',
        description: err.message || 'Failed to sign in',
        type: 'error',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F7FB]">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headline and CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Service-Oriented Architecture in Action</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-900 tracking-tight leading-[1.1]">
                Your campus, <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-800 via-teal-600 to-teal-500">
                  connected.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
                One campus platform for appointments and queue visibility. Students schedule wellness checks with live queue tracking and book academic advising sessions—powered by reusable backend business services.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/login"
                  className="btn-primary px-6 py-3 text-sm font-semibold rounded-xl shadow-card-md hover:shadow-card-lg transition-all flex items-center gap-2"
                >
                  <span>Explore Demo Services</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="btn-outline px-6 py-3 text-sm font-semibold rounded-xl bg-white hover:bg-slate-50 transition-colors"
                >
                  See How It Works
                </a>
              </div>

              {/* Quick Trust badges */}
              <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Shared Services</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Real-Time Queues</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                  <span>Trace Visibility</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive UI Mock Preview */}
            <div className="lg:col-span-5">
              <div className="relative">
                {/* Glow accent */}
                <div className="absolute -inset-1.5 bg-gradient-to-r from-teal-500/20 to-navy-700/20 rounded-2xl blur-lg"></div>

                {/* Dashboard Mock Panel */}
                <div className="relative bg-white rounded-2xl border border-slate-200 shadow-card-lg overflow-hidden">
                  {/* Mock Window Header */}
                  <div className="bg-navy-900 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-300">
                      campusconnect.edu/app
                    </span>
                    <span className="text-[10px] text-teal-400 font-semibold uppercase">
                      Live Preview
                    </span>
                  </div>

                  {/* Mock Content */}
                  <div className="p-5 space-y-4">
                    {/* Welcome Banner */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <div className="text-xs font-semibold text-slate-400">Student Portal</div>
                        <div className="text-sm font-bold text-navy-900">Welcome, Alex Kim</div>
                      </div>
                      <span className="text-[11px] bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
                        2 Upcoming
                      </span>
                    </div>

                    {/* Active Clinic Ticket Card */}
                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-navy-800 to-navy-900 text-white shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                          <Stethoscope className="w-3 h-3" />
                          Campus Clinic Queue Ticket
                        </span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-semibold">
                          Waiting (1 ahead)
                        </span>
                      </div>
                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <div className="text-3xl font-extrabold tracking-tight font-mono text-white">
                            Q004
                          </div>
                          <div className="text-[11px] text-slate-300">Dr. Sarah Chen • Room 101</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-slate-300">Estimated Call</div>
                          <div className="text-xs font-semibold text-teal-300 font-mono">10:30 AM</div>
                        </div>
                      </div>
                    </div>

                    {/* Active Advising Appointment Card */}
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-navy-800" />
                          Academic Advising
                        </span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
                          Confirmed
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <div className="text-xs font-bold text-navy-900">
                            Course Planning & Degree Audit
                          </div>
                          <div className="text-[11px] text-slate-500">Prof. James Morgan • Office 214</div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">
                          Tomorrow 11:30
                        </span>
                      </div>
                    </div>

                    {/* Shared Microservice Trace Tag */}
                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-teal-600" />
                        <span>Appointment Core Service Reused</span>
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">trace_id: #8f3b21</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Credentials Quick-Access Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <DemoAccountsBanner onSelectAccount={handleQuickDemoLogin} />
      </section>

      {/* Two Consumer Services Section */}
      <section id="services" className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-2">
              Two Consumer Journeys
            </h2>
            <h3 className="text-3xl font-extrabold text-navy-900 tracking-tight">
              One Shared Platform, Tailored Experiences
            </h3>
            <p className="text-sm text-slate-600 mt-3">
              Campus Clinic and Academic Advising share common identity, scheduling, appointment management, notification, and audit capabilities—with clinic-specific queue tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Service Card 1: Campus Clinic */}
            <div className="card-md p-8 flex flex-col justify-between hover:shadow-card-lg transition-all border-slate-200">
              <div>
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mb-6">
                  <Stethoscope className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-bold text-navy-900">Campus Clinic</h4>
                  <span className="badge-teal font-semibold">Queue Enabled</span>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Medical consultations, triage, and health appointments. Students book available provider slots, automatically receive a queue ticket, and monitor estimated waiting times in real-time.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>Instant queue ticket generation upon confirmed booking</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>Real-time queue tracker showing patients ahead & call status</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
                    <span>Clinic staff desk for calling next patient and updating triage state</span>
                  </div>
                </div>
              </div>

              <Link
                to="/login"
                className="btn-primary w-full justify-center py-2.5 text-xs font-semibold"
              >
                Book Clinic Appointment
              </Link>
            </div>

            {/* Service Card 2: Academic Advising */}
            <div className="card-md p-8 flex flex-col justify-between hover:shadow-card-lg transition-all border-slate-200">
              <div>
                <div className="w-12 h-12 rounded-xl bg-navy-50 border border-navy-200 text-navy-800 flex items-center justify-center mb-6">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xl font-bold text-navy-900">Academic Advising</h4>
                  <span className="badge-navy font-semibold">Schedule Focused</span>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Degree planning, course prerequisites, and academic guidance sessions. Students choose advisers and time slots, manage reschedules, and review session notes without queue tickets.
                </p>

                <div className="space-y-3 mb-8">
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-navy-700 flex-shrink-0 mt-0.5" />
                    <span>Direct slot booking with specific faculty advisers</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-navy-700 flex-shrink-0 mt-0.5" />
                    <span>No queue overhead—designed purely for scheduled consultations</span>
                  </div>
                  <div className="flex items-start gap-2.5 text-xs text-slate-700">
                    <CheckCircle2 className="w-4 h-4 text-navy-700 flex-shrink-0 mt-0.5" />
                    <span>Adviser outcome tracking and appointment session notes</span>
                  </div>
                </div>
              </div>

              <Link
                to="/login"
                className="btn-outline w-full justify-center py-2.5 text-xs font-semibold"
              >
                Book Academic Advising
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-teal-700 mb-2">
              Student Journey
            </h2>
            <h3 className="text-3xl font-extrabold text-navy-900 tracking-tight">
              Simple, 4-Step Appointment Experience
            </h3>
            <p className="text-sm text-slate-600 mt-3">
              Clear visual feedback, deterministic smart suggestions, and dependable double-submit prevention.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Choose Service',
                desc: 'Select Campus Clinic or Academic Advising and review service policies & location.',
                icon: Layers,
              },
              {
                step: '02',
                title: 'Pick Available Slot',
                desc: 'Browse dynamic slots by provider and date, or select the earliest recommended time.',
                icon: Calendar,
              },
              {
                step: '03',
                title: 'Review & Confirm',
                desc: 'Double-submit protected booking with re-checked availability and idempotency keys.',
                icon: ShieldCheck,
              },
              {
                step: '04',
                title: 'Track & Attend',
                desc: 'Receive in-app confirmation, monitor live clinic queue status, or reschedule easily.',
                icon: Clock,
              },
            ].map((s) => (
              <div key={s.step} className="card p-6 relative">
                <div className="text-3xl font-extrabold font-mono text-slate-200 mb-4">
                  {s.step}
                </div>
                <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mb-4">
                  <s.icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-navy-900 mb-2">{s.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOA Architecture & Connected Services Section */}
      <section id="architecture" className="py-16 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-navy-50 border border-navy-200 text-navy-800 text-xs font-semibold">
                <Cpu className="w-3.5 h-3.5 text-navy-800" />
                <span>Modular Monolith SOA</span>
              </div>

              <h3 className="text-3xl font-extrabold text-navy-900 tracking-tight">
                Designed Around Reusable Business Services
              </h3>

              <p className="text-sm text-slate-600 leading-relaxed">
                Rather than deploying separate microservices that complicate local environments, CampusConnect implements a disciplined modular monolith with explicit SOA service boundaries, contracts, adapters, and correlation tracing.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-navy-900">Distributed Request Tracing</h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Every booking generates a correlation ID tracked across adapter, core appointment, queue, and notification layers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-navy-900">Fault Isolation & Safe Degradation</h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Notification delivery failures never roll back confirmed appointments. Tested via our Admin Fault Simulation Lab.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold text-navy-900">Idempotency & Concurrency Safety</h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Duplicate clicks replay existing bookings without double-booking slots or corrupting queue sequence counters.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SOA Services Diagram Box */}
            <div className="lg:col-span-6 bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center justify-between">
                <span>SOA Service Boundaries & Contracts</span>
                <span className="text-teal-600 font-mono text-[11px]">Flask + SQLite</span>
              </div>

              {/* Service boxes */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono text-slate-400">/api/v1/appointments</div>
                  <div className="text-xs font-bold text-navy-900 mt-1">Appointment Service</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Booking, cancel, reschedule</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono text-slate-400">/api/v1/availability</div>
                  <div className="text-xs font-bold text-navy-900 mt-1">Availability Service</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Slot management & overlap</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono text-slate-400">/api/v1/clinic/queue</div>
                  <div className="text-xs font-bold text-navy-900 mt-1">Clinic Queue Service</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Ticket Q001+ & status state</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono text-slate-400">/api/v1/notifications</div>
                  <div className="text-xs font-bold text-navy-900 mt-1">Notification Service</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Isolated async messages</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono text-slate-400">/api/v1/admin/audit</div>
                  <div className="text-xs font-bold text-navy-900 mt-1">Audit & Trace Service</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Correlation trace recorder</div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="text-[10px] font-mono text-slate-400">/api/v1/auth</div>
                  <div className="text-xs font-bold text-navy-900 mt-1">Identity & RBAC</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Server cookie sessions</div>
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 flex items-center justify-between">
                <span>View live service registry and health metrics</span>
                <Link
                  to="/login"
                  className="font-semibold underline hover:text-navy-900"
                >
                  Admin Console →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

