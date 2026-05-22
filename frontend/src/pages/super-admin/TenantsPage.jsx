import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import { Plus, Building2, CheckCircle, XCircle, ChevronRight, Loader } from 'lucide-react';

const TIER_COLORS = {
  free:    'bg-gray-100 text-gray-600',
  trial:   'bg-blue-50 text-blue-700',
  pro:     'bg-[#E8F5EE] text-[#4A7C59]',
  max:     'bg-teal-100 text-teal-700',
  wedding: 'bg-pink-100 text-pink-700',
  enterprise: 'bg-[#FBE9E7] text-[#BF360C]',
};

function CreateTenantModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', slug: '', subdomain: '', primary_color: '#C9A84C', subscription_tier: 'free' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await superAdminAPI.createTenant(form);
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', extra = {}) => (
    <div>
      <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
        {...extra}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold text-[#2D2D2D] mb-5">New Tenant</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {field('name', 'Company Name', 'text', { required: true, placeholder: "Acme Events" })}
          {field('slug', 'Slug', 'text', { required: true, placeholder: "acme-events" })}
          {field('subdomain', 'Subdomain (optional)', 'text', { placeholder: "acme" })}
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Plan</label>
            <select
              value={form.subscription_tier}
              onChange={e => setForm(f => ({ ...f, subscription_tier: e.target.value }))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            >
              <option value="free">Free — $0</option>
              <option value="pro">Pro — $29/mo</option>
              <option value="max">Max — $79/mo</option>
              <option value="wedding">Wedding — $49 once</option>
              <option value="trial">Trial (14-day)</option>
            </select>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-[#EBE5DB] rounded-xl hover:bg-[#F5F0E8] transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-[#C9A84C] text-white rounded-xl hover:bg-[#b8943f] transition-colors flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader size={13} className="animate-spin" />} Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await superAdminAPI.listTenants({ page: 0, size: 50 });
      setTenants(data.tenants ?? []);
      setTotal(data.total ?? 0);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]">Tenants</h1>
          <p className="text-sm text-[#5C5C5C]">{total} total organizations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-medium hover:bg-[#b8943f] transition-colors"
        >
          <Plus size={15} /> New Tenant
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader size={28} className="animate-spin text-[#C9A84C]" /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-[#EBE5DB] overflow-hidden">
          {tenants.length === 0 ? (
            <div className="text-center py-16 text-[#5C5C5C]">No tenants yet</div>
          ) : tenants.map(t => (
            <Link
              key={t.tenantId}
              to={`/super-admin/tenants/${t.tenantId}`}
              className="flex items-center gap-4 px-5 py-4 border-b border-[#F5F0E8] last:border-0 hover:bg-[#F5F0E8] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                <Building2 size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#2D2D2D] truncate">{t.name}</p>
                <p className="text-xs text-[#5C5C5C]">{t.slug}{t.subdomain ? ` · ${t.subdomain}` : ''}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${TIER_COLORS[t.subscriptionTier] ?? 'bg-gray-100 text-gray-600'}`}>
                {t.subscriptionTier}
              </span>
              {t.isActive
                ? <CheckCircle size={16} className="text-[#4A7C59] flex-shrink-0" />
                : <XCircle size={16} className="text-[#D9534F] flex-shrink-0" />}
              <ChevronRight size={16} className="text-[#A0A0A0] flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateTenantModal
          onClose={() => setShowCreate(false)}
          onCreated={t => setTenants(prev => [t, ...prev])}
        />
      )}
    </div>
  );
}
