import React from 'react';
import type { AppointmentStatus, QueueStatus } from '@/types';
import { CheckCircle2, Clock, XCircle, AlertCircle, ArrowRight, UserCheck } from 'lucide-react';

interface StatusBadgeProps {
  status: AppointmentStatus | QueueStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const norm = status.toUpperCase();

  switch (norm) {
    case 'CONFIRMED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Confirmed
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 ${className}`}>
          <XCircle className="w-3.5 h-3.5 text-rose-500" />
          Cancelled
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 ${className}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          Completed
        </span>
      );
    case 'NO_SHOW':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 ${className}`}>
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          No Show
        </span>
      );
    case 'WAITING':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 ${className}`}>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          In Queue (Waiting)
        </span>
      );
    case 'CALLED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-300 animate-pulse ${className}`}>
          <ArrowRight className="w-3.5 h-3.5 text-teal-600" />
          Called to Counter
        </span>
      );
    case 'IN_SERVICE':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-800 border border-indigo-200 ${className}`}>
          <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
          In Consultation
        </span>
      );
    case 'SKIPPED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 ${className}`}>
          Skipped
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 ${className}`}>
          {status}
        </span>
      );
  }
}

