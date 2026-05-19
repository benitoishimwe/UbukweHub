import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminAPI } from '../../services/api';
import { Building2, Users, LayoutDashboard, FileText, LogOut, ShieldAlert } from 'lucide-react';

const NAV = [
  { label: 'Dashboard', path: '/super-admin', icon: LayoutDashboard },
  { label: 'Tenants', path: '/super-admin/tenants', icon: Building2 },
  { label: 'Audit Logs', path: '/super-admin/audit-logs', icon: FileText },
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
    <div className="min-h-screen bg-[#F5F0E8] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-[#1A1A2E] flex flex-col py-6 px-4 flex-shrink-0">
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

      {/* Main content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {children ?? (
          <>
            <h1 className="text-2xl font-bold text-[#2D2D2D] mb-6">Platform Overview</h1>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard label="Total Tenants" value={stats?.total_tenants} icon={Building2} color="bg-[#C9A84C]" />
              <StatCard label="Active Tenants" value={stats?.active_tenants} icon={Building2} color="bg-[#4A7C59]" />
              <StatCard label="Total Users" value={stats?.total_users} icon={Users} color="bg-[#1565C0]" />
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#EBE5DB]">
              <h2 className="font-semibold text-[#2D2D2D] mb-4">Quick Actions</h2>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/super-admin/tenants"
                  className="px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#b8943f] transition-colors"
                >
                  Manage Tenants
                </Link>
                <Link
                  to="/super-admin/audit-logs"
                  className="px-4 py-2 border border-[#EBE5DB] text-[#2D2D2D] rounded-xl text-sm font-medium hover:bg-[#F5F0E8] transition-colors"
                >
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
