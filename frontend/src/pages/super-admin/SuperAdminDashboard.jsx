import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminAPI } from '../../services/api';
import { Building2, Users, LayoutDashboard, FileText, LogOut, ShieldAlert, CreditCard, FlaskConical, MessageSquare, UserX } from 'lucide-react';

const NAV = [
  { label: 'Dashboard',       path: '/super-admin',                    icon: LayoutDashboard },
  { label: 'All Users',       path: '/super-admin/users',              icon: Users },
  { label: 'Tenants',         path: '/super-admin/tenants',             icon: Building2 },
  { label: 'Subscriptions',   path: '/super-admin/subscriptions',       icon: CreditCard },
  { label: 'Support Tickets', path: '/super-admin/support',             icon: MessageSquare },
  { label: 'Test Accounts',   path: '/super-admin/test-accounts',       icon: FlaskConical },
  { label: 'Audit Logs',      path: '/super-admin/audit-logs',          icon: FileText },
];

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EBE5DB] flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-[#5C5C5C] font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#2D2D2D]">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    superAdminAPI.stats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isRoot = location.pathname === '/super-admin';

  return (
    <div className="h-screen overflow-hidden bg-[#F5F0E8] flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden bg-[#1A1A2E] flex items-center justify-between px-4 py-3 gap-2 flex-shrink-0">
        <div className="flex items-center gap-2 flex-shrink-0">
          <ShieldAlert size={18} className="text-[#C9A84C]" />
          <span className="text-white font-bold text-sm">Super Admin</span>
        </div>
        <nav className="flex items-center gap-1 overflow-x-auto">
          {NAV.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  active ? 'bg-[#C9A84C] text-white' : 'text-[#A0A0B0] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={13} />
                {label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="flex-shrink-0 p-1.5 rounded-lg text-[#A0A0B0] hover:text-white hover:bg-white/10 transition-colors"
          title="Log out"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Sidebar (desktop only) — fixed height, independently scrollable */}
      <aside className="hidden md:flex w-60 bg-[#1A1A2E] flex-col py-6 px-4 flex-shrink-0 h-full overflow-y-auto">
        <div className="flex items-center gap-2 px-2 mb-8">
          <ShieldAlert size={22} className="text-[#C9A84C]" />
          <span className="text-white font-bold text-sm">Super Admin</span>
        </div>

        <nav className="flex flex-col gap-1 flex-1">
          {NAV.map(({ label, path, icon: Icon }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#C9A84C] text-white'
                    : 'text-[#A0A0B0] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 pt-4 mt-4">
          <p className="text-xs text-[#A0A0B0] px-2 mb-1 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-[#A0A0B0] hover:text-white hover:bg-white/10 rounded-xl w-full transition-colors"
          >
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      {/* Main content — independently scrollable */}
      <main className="flex-1 min-w-0 h-full p-4 md:p-8 overflow-y-auto">
        {children ?? (
          <>
            <h1 className="text-2xl font-bold text-[#2D2D2D] mb-6">Platform Overview</h1>

            {/* Tenant stats */}
            <p className="text-xs font-semibold text-[#5C5C5C] uppercase tracking-wider mb-2">Tenants</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <StatCard label="Total Tenants" value={stats?.total_tenants} icon={Building2} color="bg-[#C9A84C]" />
              <StatCard label="Active Tenants" value={stats?.active_tenants} icon={Building2} color="bg-[#4A7C59]" />
            </div>

            {/* User stats */}
            <p className="text-xs font-semibold text-[#5C5C5C] uppercase tracking-wider mb-2">Users</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Users" value={stats?.total_users} icon={Users} color="bg-[#1565C0]" />
              <StatCard label="Tenant Members" value={stats?.tenant_users} icon={Building2} color="bg-[#4A7C59]" />
              <StatCard label="Free Trial" value={stats?.trial_users} icon={FlaskConical} color="bg-[#C9A84C]" />
              <StatCard label="Standalone" value={stats?.standalone_users} icon={UserX} color="bg-[#6B7280]" />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EBE5DB]">
              <h2 className="font-semibold text-[#2D2D2D] mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link to="/super-admin/users" className="px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#b8943f] transition-colors">
                  View All Users
                </Link>
                <Link to="/super-admin/tenants" className="px-4 py-2 border border-[#EBE5DB] text-[#2D2D2D] rounded-xl text-sm font-medium hover:bg-[#F5F0E8] transition-colors">
                  Manage Tenants
                </Link>
                <Link to="/super-admin/support" className="px-4 py-2 border border-[#EBE5DB] text-[#2D2D2D] rounded-xl text-sm font-medium hover:bg-[#F5F0E8] transition-colors">
                  Support Tickets
                </Link>
                <Link to="/super-admin/audit-logs" className="px-4 py-2 border border-[#EBE5DB] text-[#2D2D2D] rounded-xl text-sm font-medium hover:bg-[#F5F0E8] transition-colors">
                  View Audit Logs
                </Link>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
