import React, { useEffect, useState, useCallback } from 'react';
import { superAdminAPI } from '../../services/api';
import { Search, Loader, ChevronLeft, ChevronRight } from 'lucide-react';

const ACTION_COLORS = {
  login: 'bg-blue-50 text-blue-700',
  logout: 'bg-gray-100 text-gray-600',
  mfa_login: 'bg-purple-50 text-purple-700',
  google_login: 'bg-indigo-50 text-indigo-700',
  password_change: 'bg-yellow-50 text-yellow-700',
  mfa_setup: 'bg-orange-50 text-orange-700',
  impersonate: 'bg-red-50 text-red-700',
  create: 'bg-green-50 text-green-700',
  update: 'bg-cyan-50 text-cyan-700',
  delete: 'bg-red-50 text-red-700',
};

function badge(action) {
  const cls = ACTION_COLORS[action] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {action}
    </span>
  );
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ action: '', resource: '', user_id: '' });

  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, size: PAGE_SIZE };
      if (filters.action)   params.action    = filters.action;
      if (filters.resource) params.resource  = filters.resource;
      if (filters.user_id)  params.user_id   = filters.user_id;
      const { data } = await superAdminAPI.auditLogs(params);
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const setFilter = (key, val) => {
    setPage(0);
    setFilters(f => ({ ...f, [key]: val }));
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]">Audit Logs</h1>
          <p className="text-sm text-[#5C5C5C] mt-0.5">{total.toLocaleString()} events across all tenants</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#EBE5DB] mb-5 flex flex-wrap gap-3">
        {[
          { key: 'action',   placeholder: 'Filter by action...' },
          { key: 'resource', placeholder: 'Filter by resource...' },
          { key: 'user_id',  placeholder: 'Filter by user ID...' },
        ].map(({ key, placeholder }) => (
          <div key={key} className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A9A]" />
            <input
              value={filters[key]}
              onChange={e => setFilter(key, e.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-3 py-2 text-sm border border-[#EBE5DB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#EBE5DB] overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-14">
            <Loader size={26} className="animate-spin text-[#C9A84C]" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-center text-[#5C5C5C] text-sm py-14">No audit logs found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EBE5DB] bg-[#FAFAF8]">
                  {['Timestamp', 'Action', 'Resource', 'Resource ID', 'User ID', 'IP'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.logId ?? log.log_id ?? i}
                      className="border-b border-[#EBE5DB] last:border-0 hover:bg-[#FAFAF8] transition-colors">
                    <td className="px-4 py-3 text-xs text-[#5C5C5C] whitespace-nowrap font-mono">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{badge(log.action)}</td>
                    <td className="px-4 py-3 text-xs text-[#2D2D2D]">{log.resource ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#5C5C5C] font-mono truncate max-w-[140px]">
                      {log.resourceId ?? log.resource_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5C5C5C] font-mono truncate max-w-[140px]">
                      {log.userId ?? log.user_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#5C5C5C] font-mono">{log.ipAddress ?? log.ip_address ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-[#5C5C5C]">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-xl border border-[#EBE5DB] hover:bg-[#F5F0E8] disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-xl border border-[#EBE5DB] hover:bg-[#F5F0E8] disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
