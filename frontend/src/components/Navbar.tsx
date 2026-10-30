import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, Calendar, Layers, ShieldCheck, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '@/app/AuthContext';

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-navy-800 flex items-center justify-center text-teal-400 group-hover:bg-navy-900 transition-colors shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-navy-900 text-lg tracking-tight flex items-center gap-1.5 leading-none">
              CampusConnect
              <span className="text-[10px] font-semibold uppercase bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded border border-teal-200">
                SOA Demo
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">Shared Campus Services</p>
          </div>
        </Link>

        {/* Navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <a href="#services" className="hover:text-navy-900 transition-colors">
            Our Services
          </a>
          <a href="#architecture" className="hover:text-navy-900 transition-colors">
            SOA Architecture
          </a>
          <a href="#how-it-works" className="hover:text-navy-900 transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-navy-900 transition-colors">
            Platform Capabilities
          </a>
        </nav>

        {/* Action button */}
        <div className="flex items-center gap-3">
          {user ? (
            <Link
              to={user.role === 'ADMIN' ? '/app/admin/soa-console' : user.role === 'CLINIC_STAFF' ? '/app/staff/clinic' : user.role === 'ADVISER' ? '/app/staff/advising' : '/app/dashboard'}
              className="btn-primary text-xs"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <Link to="/login" className="btn-primary text-xs flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In / Demo Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

