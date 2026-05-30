import React, { useEffect, useState, useCallback } from 'react';
import { superAdminAPI } from '../../services/api';
import { Search, Users, Building2, FlaskConical, UserX, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const CATEGORIES = [
  { key: 'all',           label: 'All Users',        icon: Users,       color: 'text-[#2D2D2D]'  },
  { key: 'tenant_member', label: 'Tenant Members',   icon: Building2,   color: 'text-[#4A7C59]'  },
  { key: 'free_trial',    label: 'Free Trial',        icon: FlaskConical, color: 'text-[#C9A84C]' },
  { key: 'standalone',    label: 'Standalone Signups', icon: UserX,      color: 'text-[#1565C0]'  },
];

const ROLES = ['client', 'vendor', 'staff', 'event_manager', 'tenant_admin', 'super_admin'];

const ROLE_COLORS = {
  super_admin:   'bg-red-100 text-red-700',
  tenant_admin:  'bg-purple-100 text-purple-700',
  event_manager: 'bg-indigo-100 text-indigo-700',
  staff:         'bg-green-100 text-green-700',
  vendor:        'bg-yellow-100 text-yellow-700',
  client:        'bg-blue-100 text-blue-700',
};

const PLAN_COLORS = {
  free:       'bg-gray-100 text-gray-600',
  trial:      'bg-yellow-100 text-yellow-700',
  pro:        'bg-blue-100 text-blue-700',
  max:        'bg-purple-100 text-purple-700',
  wedding:    'bg-pink-100 text-pink-700',
  enterprise: 'bg-indigo-100 text-indigo-700',
};

const CAT_COLORS = {
  tenant_member: 'bg-green-50 text-green-700 border-green-200',
  free_trial:    'bg-yellow-50 text-yellow-700 border-yellow-200',
  standalone:    'bg-blue-50 text-blue-700 border-blue-200',
};

const CAT_LABELS = {
  tenant_member: 'Tenant Member',
  free_trial:    'Free Trial',
  standalone:    'Standalone',
};

function UserRow({ user }) {
  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <tr className="border-b border-[#F5F0E8] hover:bg-[#FAFAF8] transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2D2D2D] truncate">{user.name}</p>
            <p className="text-xs text-[#5C5C5C] truncate">{user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
          {user.role?.replace(/_/g, ' ')}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border ${CAT_COLORS[user.category] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            {CAT_LABELS[user.category] || user.category}
          </span>
          {user.category === 'free_trial' && user.trialDaysLeft !== null && (
            <span className={`text-[10px] font-semibold ${user.trialDaysLeft <= 3 ? 'text-red-500' : 'text-[#C9A84C]'}`}>
              {user.trialDaysLeft}d left
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {user.tenant ? (
          <div>
            <p className="text-sm font-medium text-[#2D2D2D] truncate max-w-[160px]">{user.tenant.name}</p>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold capitalize mt-0.5 ${PLAN_COLORS[user.tenant.subscriptionTier] || 'bg-gray-100 text-gray-600'}`}>
              {user.tenant.subscriptionTier}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#9CA3AF] italic">Standalone</span>
        )}
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-block w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-400'}`} title={user.isActive ? 'Active' : 'Inactive'} />
      </td>
      <td className="px-4 py-3 text-xs text-[#5C5C5C] whitespace-nowrap">
        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
      </td>
    </tr>
  );
}

export default function SuperAdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const SIZE = 50;

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [category, roleFilter, debouncedSearch]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: SIZE };
      if (category !== 'all') params.category = category;
      if (roleFilter) params.role = roleFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      const { data } = await superAdminAPI.listAllUsers(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, category, roleFilter, debouncedSearch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const totalPages = Math.ceil(total / SIZE);

  // Category counts from current full list (approximate — real counts would need a separate API call)
  const catCounts = { all: total };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>All Platform Users</h1>
          <p className="text-sm text-[#5C5C5C] mt-1">{total.toLocaleString()} total users across the platform</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:bg-[#F5F0E8] transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {CATEGORIES.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => setCategory(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              category === key
                ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                : 'bg-white text-[#5C5C5C] border-[#EBE5DB] hover:bg-[#F5F0E8]'
            }`}
          >
            <Icon size={14} className={category === key ? 'text-white' : color} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-[#EBE5DB] rounded-xl outline-none focus:border-[#C9A84C] focus:ring-2 focus:ring-[#C9A84C]/20 bg-white"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-sm border border-[#EBE5DB] rounded-xl outline-none focus:border-[#C9A84C] bg-white text-[#2D2D2D]"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="">All Roles</option>
          {ROLES.map(r => (
            <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#EBE5DB] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EBE5DB] bg-[#FAFAF8]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">Tenant / Plan</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">Active</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-[#F5F0E8]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="skeleton h-4 rounded w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#5C5C5C]">
                    <Users size={36} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map(u => <UserRow key={u.userId} user={u} />)
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#EBE5DB] bg-[#FAFAF8]">
            <p className="text-xs text-[#5C5C5C]">
              Showing {((page - 1) * SIZE) + 1}–{Math.min(page * SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-[#EBE5DB] text-[#5C5C5C] hover:bg-[#F5F0E8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-[#2D2D2D]">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-[#EBE5DB] text-[#5C5C5C] hover:bg-[#F5F0E8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
