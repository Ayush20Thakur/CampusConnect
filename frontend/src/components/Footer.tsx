import React from 'react';
import { Sparkles, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';

export function Footer() {
  const { user } = useAuth();

  return (
    <footer className="bg-navy-900 text-slate-400 border-t border-navy-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand & Purpose */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">CampusConnect</span>
              <span className="text-[10px] bg-navy-800 text-teal-400 border border-teal-500/30 px-2 py-0.5 rounded">
                Educational SOA Prototype
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              One campus. Easier appointments. Better-connected services. Demonstrating Service-Oriented Architecture (SOA) principles through two distinct consumer applications sharing unified booking, availability, notifications, and auditing services.
            </p>
            <div className="mt-4 p-3 rounded-lg bg-navy-800/60 border border-navy-700 text-xs text-amber-300 flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Educational Prototype:</strong> Synthetic demo data only. Does not integrate with real health records, payment gateways, or student databases.
              </span>
            </div>
          </div>

          {/* User Journeys */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              Consumer Journeys
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={user ? "/app/book/clinic" : "/login"} className="hover:text-teal-400 transition-colors">
                  Campus Clinic Booking
                </Link>
              </li>
              <li>
                <Link to={user ? "/app/clinic/queue" : "/login"} className="hover:text-teal-400 transition-colors">
                  Clinic Live Queue Tracker
                </Link>
              </li>
              <li>
                <Link to={user ? "/app/book/advising" : "/login"} className="hover:text-teal-400 transition-colors">
                  Academic Advising Booking
                </Link>
              </li>
              <li>
                <Link to={user ? (user.role === 'ADVISER' || user.role === 'ADMIN' ? "/app/staff/advising" : "/app/appointments") : "/login"} className="hover:text-teal-400 transition-colors">
                  Adviser Schedule & Notes
                </Link>
              </li>
            </ul>
          </div>

          {/* Architecture & Admin */}
          <div>
            <h4 className="text-white font-semibold text-xs tracking-wider uppercase mb-3">
              SOA Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to={user?.role === 'ADMIN' ? "/app/admin/services" : "/login"} className="hover:text-teal-400 transition-colors">
                  SOA Service Registry
                </Link>
              </li>
              <li>
                <Link to={user?.role === 'ADMIN' ? "/app/admin/traces" : "/login"} className="hover:text-teal-400 transition-colors">
                  Distributed Request Traces
                </Link>
              </li>
              <li>
                <Link to={user?.role === 'ADMIN' ? "/app/admin/fault-lab" : "/login"} className="hover:text-teal-400 transition-colors">
                  Fault Simulation Lab
                </Link>
              </li>
              <li>
                <Link to={user?.role === 'ADMIN' ? "/app/admin/audit" : "/login"} className="hover:text-teal-400 transition-colors">
                  Audit & Compliance Log
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-navy-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© {new Date().getFullYear()} CampusConnect. Built with React, TypeScript, Tailwind CSS & Flask.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Modular Monolith SOA</span>
            <span>•</span>
            <span>Version 1.0.0</span>
            <span>•</span>
            <span className="text-teal-400">All Systems Operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

