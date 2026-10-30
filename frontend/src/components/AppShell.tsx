import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  Layers,
  Clock,
  Bell,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  Stethoscope,
  GraduationCap,
  Activity,
  Server,
  FileText,
  FlaskConical,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '@/app/AuthContext';
import { useToast } from '@/app/ToastContext';
import { notificationsApi, adminApi } from '@/api/client';
import type { Notification } from '@/types';

export function AppShell() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);

  // Load notifications
  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.list();
      if (res.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unread_count);
      }
    } catch {
      // safe fallback
    }
  };

  // Poll notifications periodically
  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Check fault lab flags for admin/notice
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      adminApi.getFaultFlags().then((res) => {
        if (res.data) {
          const active = Object.entries(res.data)
            .filter(([_, enabled]) => enabled)
            .map(([name]) => name);
          setActiveFaults(active);
        }
      }).catch(() => {});
    }
  }, [user, location.pathname]);

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      addToast({
        title: 'Notifications Cleared',
        description: 'All notifications marked as read',
        type: 'info',
      });
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast({
      title: 'Logged Out',
      description: 'You have been safely signed out.',
      type: 'info',
    });
    navigate('/login');
  };

  // Role-based navigation items
  const navItems = [
    // Student navigation
    ...(user?.role === 'STUDENT'
      ? [
          { label: 'My Dashboard', path: '/app/dashboard', icon: LayoutDashboard },
          { label: 'Services Catalogue', path: '/app/services', icon: Layers },
          { label: 'My Appointments', path: '/app/appointments', icon: Calendar },
          { label: 'Clinic Queue Ticket', path: '/app/clinic/queue', icon: Clock },
        ]
      : []),

    // Clinic staff navigation
    ...(user?.role === 'CLINIC_STAFF'
      ? [
          { label: 'Clinic Queue Desk', path: '/app/staff/clinic', icon: Stethoscope },
          { label: 'Services Catalogue', path: '/app/services', icon: Layers },
        ]
      : []),

    // Adviser navigation
    ...(user?.role === 'ADVISER'
      ? [
          { label: 'Advising Schedule', path: '/app/staff/advising', icon: GraduationCap },
          { label: 'Services Catalogue', path: '/app/services', icon: Layers },
        ]
      : []),

    // Admin navigation
    ...(user?.role === 'ADMIN'
      ? [
          { label: 'SOA Technical Console', path: '/app/admin/soa-console', icon: Server },
          { label: 'Service Registry', path: '/app/admin/services', icon: Layers },
          { label: 'Distributed Traces', path: '/app/admin/traces', icon: Activity },
          { label: 'Audit Trail', path: '/app/admin/audit', icon: FileText },
          { label: 'Fault Simulation Lab', path: '/app/admin/fault-lab', icon: FlaskConical },
          { label: 'Clinic Queue Desk', path: '/app/staff/clinic', icon: Stethoscope },
          { label: 'Advising Schedule', path: '/app/staff/advising', icon: GraduationCap },
          { label: 'Services Catalogue', path: '/app/services', icon: Layers },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex flex-col">
      {/* Active Fault Lab Banner (Visible to Admin if enabled) */}
      {activeFaults.length > 0 && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm z-50">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 animate-bounce" />
            <span>
              Fault Lab Active: Simulating [{activeFaults.join(', ')}] across SOA boundaries.
            </span>
          </div>
          <Link
            to="/app/admin/fault-lab"
            className="underline hover:text-navy-900 transition-colors"
          >
            Manage Faults
          </Link>
        </div>
      )}

      {/* Main Top Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-navy-800 flex items-center justify-center text-teal-400 group-hover:bg-navy-900 transition-colors shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-navy-900 text-base tracking-tight leading-none">
                  CampusConnect
                </span>
                <span className="block text-[10px] text-slate-400 font-medium">Service-Oriented Architecture</span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-lg text-slate-500 hover:text-navy-900 hover:bg-slate-100 transition-colors focus-visible:outline-teal-500"
                aria-label={`Notifications (${unreadCount} unread)`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-teal-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-200 py-3 z-50 animate-slide-up">
                  <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-navy-900">Notifications</h4>
                      {unreadCount > 0 && (
                        <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded-full border border-teal-200">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs hover:bg-slate-50 transition-colors ${
                            !n.read ? 'bg-teal-50/40 font-medium' : 'text-slate-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-navy-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile & Role Info */}
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-navy-900 leading-tight">
                  {user?.full_name}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {user?.role}
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-navy-800 text-white font-bold text-xs flex items-center justify-center ring-2 ring-slate-100">
                {user?.full_name?.charAt(0) || 'U'}
              </div>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm sticky top-24">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {user?.role === 'STUDENT' ? 'Student Workspace' : user?.role === 'ADMIN' ? 'SOA Administration' : 'Staff Operations'}
            </div>
            <nav className="space-y-1 mt-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-navy-800 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'
                    }`
                  }
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-100 px-3">
              <div className="text-[10px] text-slate-400 font-medium">Session Status</div>
              <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Session</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 bg-white h-full p-4 flex flex-col z-10 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <span className="font-bold text-navy-900 text-sm">Navigation Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-navy-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1 mt-4 flex-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold ${
                        isActive ? 'bg-navy-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
              <div className="pt-4 border-t border-slate-200">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

