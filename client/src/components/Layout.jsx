import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { getEntityIconConfig, getRelativeTime } from '../pages/logs/LogsFeed';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  CheckSquare,
  ShoppingCart,
  Receipt,
  BarChart3,
  Activity,
  Menu,
  X,
  LogOut,
  User,
  Shield,
  Briefcase,
  Bell,
  CheckCheck,
  ExternalLink
} from 'lucide-react';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define All Navigation Links (with exact Phase 3 role access limits)
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'procurement_officer', 'manager'] },
    { name: 'Vendor Portal', path: '/vendor-portal', icon: LayoutDashboard, roles: ['vendor'] },
    { name: 'Vendors', path: '/vendors', icon: Briefcase, roles: ['admin', 'procurement_officer'] },
    { name: 'RFQs', path: '/rfqs', icon: FileText, roles: ['admin', 'procurement_officer', 'vendor'] },
    { name: 'Quotations', path: '/quotations', icon: ClipboardList, roles: ['admin', 'procurement_officer', 'vendor'] },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare, roles: ['admin', 'procurement_officer', 'manager'] },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, roles: ['admin', 'procurement_officer', 'vendor'] },
    { name: 'Invoices', path: '/invoices', icon: Receipt, roles: ['admin', 'procurement_officer', 'vendor'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'procurement_officer', 'manager'] },
    { name: 'Logs', path: '/logs', icon: Activity, roles: ['admin', 'procurement_officer', 'manager'] },
    { name: 'Users', path: '/admin/users', icon: Users, roles: ['admin'] },
  ];

  // Filter links by active user role
  const allowedNavItems = navItems.filter(item => item.roles.includes(user?.role));

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/25">Admin</span>;
      case 'procurement_officer':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/25">Procurement</span>;
      case 'manager':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Manager</span>;
      case 'vendor':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/25">Vendor Partner</span>;
      default:
        return null;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Notifications via React Query on 15s interval
  const { data: notifications = [], refetch: refetchNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/logs/notifications');
      return res.data;
    },
    refetchInterval: 15000,
    enabled: !!user
  });

  // Track Unread Count based on localstorage timestamp
  const [lastReadNotif, setLastReadNotif] = useState(
    localStorage.getItem('vb_last_read_notifications_at') || new Date(0).toISOString()
  );

  const unreadNotifs = notifications.filter(
    n => new Date(n.created_at) > new Date(lastReadNotif)
  );
  
  const unreadCount = unreadNotifs.length;

  const handleMarkAllRead = () => {
    const nowStr = new Date().toISOString();
    localStorage.setItem('vb_last_read_notifications_at', nowStr);
    setLastReadNotif(nowStr);
    toast.success('All notifications marked as read');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Sidebar - Desktop: Fixed, Mobile: Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 md:static print:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shadow-lg shadow-brand-600/35">
                <Shield className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">VendorBridge</span>
            </Link>
            {/* Close Hamburger on Mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Sidebar Panel Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-semibold uppercase">
              {user?.name?.substring(0, 2) || 'VB'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-500 font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-rose-950/40 hover:border-rose-900 border border-transparent transition-all duration-150"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/60 z-20 backdrop-blur-sm md:hidden print:hidden"
        ></div>
      )}

      {/* 2. Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 shadow-sm relative z-20 print:hidden">
          <div className="flex items-center gap-4">
            {/* Hamburger Trigger for Mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 md:hidden border border-slate-200 shadow-sm"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-slate-500 font-medium">
              <span>VendorBridge Portal</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-800 font-semibold capitalize">
                {location.pathname.substring(1).split('/')[0].replace('-', ' ') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell Dropdown Container */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-500 hover:bg-slate-50 relative border border-transparent hover:border-slate-200 transition-colors"
              >
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 text-[9px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center min-w-4 h-4 shadow-sm shadow-rose-500/20">
                    {unreadCount}
                  </span>
                )}
                <Bell className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden z-30 animate-in fade-in slide-in-from-top-3 duration-200">
                  {/* Header */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <span className="font-bold text-slate-800 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1"
                      >
                        <CheckCheck className="w-4 h-4" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* List of Notification Logs */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic">
                        No notifications to display.
                      </div>
                    ) : (
                      notifications.slice(0, 5).map((n) => {
                        const iconConfig = getEntityIconConfig(n.entity_type);
                        const IconComponent = iconConfig.icon;
                        const isUnread = new Date(n.created_at) > new Date(lastReadNotif);

                        return (
                          <div
                            key={n.id}
                            className={`p-3.5 flex items-start gap-3 transition-colors ${
                              isUnread ? 'bg-brand-50/20' : 'hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${iconConfig.bg}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="space-y-0.5 flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 leading-normal break-words">
                                {n.description}
                              </p>
                              <p className="text-[10px] text-slate-400 font-semibold">
                                {getRelativeTime(n.created_at)}
                              </p>
                            </div>
                            {isUnread && (
                              <span className="w-2 h-2 rounded-full bg-brand-500 shrink-0 mt-1"></span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer View All */}
                  <Link
                    to="/logs"
                    onClick={() => setNotifDropdownOpen(false)}
                    className="p-3 border-t border-slate-100 flex items-center justify-center gap-1 text-xs text-slate-500 font-bold hover:text-brand-600 hover:bg-slate-50 transition-colors"
                  >
                    View All Audit Logs
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Divider */}
            <span className="h-5 w-px bg-slate-200"></span>

            {/* Profile Info Header */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
                <div className="mt-0.5">{getRoleBadge(user?.role)}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold uppercase cursor-pointer hover:shadow-md transition-shadow">
                {user?.name?.substring(0, 2) || 'VB'}
              </div>
            </div>
          </div>
        </header>

        {/* 3. Main Outlet Container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
