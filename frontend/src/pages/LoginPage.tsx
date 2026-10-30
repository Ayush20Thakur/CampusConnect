import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Sparkles,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/app/ToastContext';
import { DemoAccountsBanner } from '@/components/DemoAccountsBanner';

export function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('alex.kim@students.edu');
  const [password, setPassword] = useState('student1234');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);
      addToast({
        title: 'Welcome Back',
        description: 'Signed in successfully.',
        type: 'success',
      });

      // Role-based destination
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
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (selectedEmail: string, selectedPass: string) => {
    setEmail(selectedEmail);
    setPassword(selectedPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Return Home Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to CampusConnect Overview</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-navy-800 text-teal-400 mb-4 shadow-card">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Sign in to CampusConnect
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access appointment bookings, queue tracker, and service consoles
          </p>
        </div>

        {/* Login Card */}
        <div className="card-md p-6 sm:p-8 space-y-6">
          {error && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Campus Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@campusconnect.edu"
                className="input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="label mb-0">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-xs font-semibold justify-center shadow-card"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          {/* Quick Demo Selector */}
          <div className="pt-4 border-t border-slate-100">
            <DemoAccountsBanner onSelectAccount={handleSelectDemoAccount} compact={true} />
          </div>
        </div>

        {/* Demo Disclaimer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Educational Demonstration System • Cookies used for session auth
        </p>
      </div>
    </div>
  );
}

