import React, { useState } from 'react';
import { KeyRound, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

export interface DemoAccount {
  role: string;
  label: string;
  email: string;
  pass: string;
  desc: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'STUDENT',
    label: 'Student',
    email: 'alex.kim@students.edu',
    pass: 'student1234',
    desc: 'Book appointments, track clinic queue ticket, receive notifications',
  },
  {
    role: 'CLINIC_STAFF',
    label: 'Clinic Staff',
    email: 'clinic.staff@campusconnect.edu',
    pass: 'staff1234',
    desc: 'Manage clinic queue, call next patient, advance status',
  },
  {
    role: 'ADVISER',
    label: 'Academic Adviser',
    email: 'j.morgan@campusconnect.edu',
    pass: 'adviser1234',
    desc: 'View advising calendar, conduct sessions, manage outcomes',
  },
  {
    role: 'ADMIN',
    label: 'System Admin',
    email: 'admin@campusconnect.edu',
    pass: 'admin1234',
    desc: 'SOA Technical Console, service registry, trace explorer, fault injection',
  },
];

interface DemoAccountsBannerProps {
  onSelectAccount?: (email: string, pass: string) => void;
  compact?: boolean;
}

export function DemoAccountsBanner({ onSelectAccount, compact = false }: DemoAccountsBannerProps) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const handleCopy = (email: string, pass: string) => {
    navigator.clipboard.writeText(`${email}\n${pass}`);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-teal-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-800">
            Demo Environment Accounts
          </h3>
          <span className="bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Synthetic Data
          </span>
        </div>
        {compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-slate-500 hover:text-navy-800 flex items-center gap-1"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {expanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {DEMO_ACCOUNTS.map((acc) => (
            <div
              key={acc.email}
              className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between hover:border-teal-400 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900">{acc.label}</span>
                  <span className="text-[10px] text-slate-400 font-mono">pw: {acc.pass}</span>
                </div>
                <div className="text-xs font-mono text-teal-700 truncate mt-0.5">{acc.email}</div>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{acc.desc}</p>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                {onSelectAccount && (
                  <button
                    type="button"
                    onClick={() => onSelectAccount(acc.email, acc.pass)}
                    className="text-[11px] font-medium text-teal-600 hover:text-teal-800 hover:underline"
                  >
                    Use Account
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleCopy(acc.email, acc.pass)}
                  className="ml-auto text-[11px] text-slate-400 hover:text-navy-800 flex items-center gap-1"
                  title="Copy email & password"
                >
                  {copiedEmail === acc.email ? (
                    <>
                      <Check className="w-3 h-3 text-green-600" />
                      <span className="text-green-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

