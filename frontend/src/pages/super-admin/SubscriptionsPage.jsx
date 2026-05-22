import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { superAdminAPI } from '../../services/api';
import { toast } from 'sonner';
import {
  Loader, Search, ChevronRight, Zap, CheckCircle, XCircle,
  Mail, Gift, CreditCard, ToggleLeft, ToggleRight, Trash2,
  Send, Users, ExternalLink,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_PLANS = ['free', 'trial', 'pro', 'wedding', 'max', 'enterprise'];

const PLAN_META = {
  free:       { label: 'Free',       color: 'bg-gray-100 text-gray-600',     dot: 'bg-gray-400' },
  trial:      { label: 'Trial',      color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500' },
  pro:        { label: 'Pro',        color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  wedding:    { label: 'Wedding',    color: 'bg-pink-100 text-pink-700',     dot: 'bg-pink-500' },
  max:        { label: 'Max',        color: 'bg-teal-100 text-teal-700',     dot: 'bg-teal-600' },
  enterprise: { label: 'Enterprise', color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-600' },
};

const ALL_FEATURES = [
  { key: 'ai_assistant',        label: 'AI Assistant' },
  { key: 'save_the_date',       label: 'Save the Date' },
  { key: 'save_the_date_image', label: 'Save-the-Date Images' },
  { key: 'vendor_marketplace',  label: 'Vendor Marketplace' },
  { key: 'analytics',           label: 'Analytics' },
  { key: 'unlimited_events',    label: 'Unlimited Events' },
  { key: 'advanced_reports',    label: 'Advanced Reports' },
  { key: 'white_label',         label: 'White Label' },
  { key: 'api_access',          label: 'API Access' },
];

// Static defaults — mirrors backend featureGate.js PLAN_FEATURES
const STATIC_DEFAULTS = {
  max:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image'],
  enterprise: ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image'],
  pro:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image'],
  wedding:    ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'advanced_reports', 'save_the_date_image'],
  trial:      ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image'],
  free:       [],
};

// ── Small helpers ─────────────────────────────────────────────────────────────

function PlanBadge({ plan }) {
  const m = PLAN_META[plan] || { label: plan, color: 'bg-gray-100 text-gray-600' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${m.color}`}>
      {m.label}
    </span>
  );
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`bg-white rounded-2xl shadow-xl w-full ${wide ? 'max-w-lg' : 'max-w-sm'} animate-scale-in`}>
        <div className="px-6 py-4 border-b border-[#EBE5DB]">
          <h2 className="text-base font-bold text-[#2D2D2D]">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── Grant Plan Modal ──────────────────────────────────────────────────────────

function GrantPlanModal({ tenant, onClose, onSuccess }) {
  const [plan, setPlan] = useState(tenant.subscriptionTier || 'pro');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await superAdminAPI.grantPlan(tenant.tenantId, { plan });
      toast.success(`${tenant.name} upgraded to ${PLAN_META[plan]?.label || plan}`);
      onSuccess(plan);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant plan');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Grant Plan — ${tenant.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-2">Select Plan</label>
          <div className="grid grid-cols-2 gap-2">
            {ALL_PLANS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setPlan(p)}
                className={`px-3 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${
                  plan === p ? 'border-[#C9A84C] bg-[#FBF5E8] text-[#C9A84C]' : 'border-[#EBE5DB] text-[#5C5C5C] hover:border-[#C9A84C40]'
                }`}
              >
                {PLAN_META[p]?.label || p}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-[#5C5C5C] bg-[#F5F0E8] rounded-lg px-3 py-2">
          This instantly activates the <strong>{PLAN_META[plan]?.label}</strong> plan for <strong>{tenant.name}</strong> and sends an email notification to the tenant admin.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-full border border-[#EBE5DB] text-[#5C5C5C] text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 h-10 rounded-full bg-[#C9A84C] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5">
            {loading ? <Loader size={14} className="animate-spin" /> : <CreditCard size={14} />} Grant Plan
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Grant Trial Modal ─────────────────────────────────────────────────────────

function GrantTrialModal({ tenant, onClose, onSuccess }) {
  const [plan, setPlan] = useState('pro');
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(false);

  const expiresAt = new Date(Date.now() + days * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await superAdminAPI.grantTrial(tenant.tenantId, { plan, days });
      toast.success(`${days}-day ${PLAN_META[plan]?.label} trial granted to ${tenant.name}`);
      onSuccess(plan);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant trial');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Grant Trial — ${tenant.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-2">Trial Plan</label>
          <div className="grid grid-cols-3 gap-2">
            {['pro', 'wedding', 'max'].map(p => (
              <button key={p} type="button" onClick={() => setPlan(p)}
                className={`py-2 rounded-xl text-sm font-semibold border-2 transition-all ${plan === p ? 'border-[#C9A84C] bg-[#FBF5E8] text-[#C9A84C]' : 'border-[#EBE5DB] text-[#5C5C5C]'}`}>
                {PLAN_META[p].label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-2">Duration: <span className="text-[#C9A84C] font-bold">{days} days</span></label>
          <input type="range" min={1} max={90} value={days} onChange={e => setDays(+e.target.value)}
            className="w-full accent-[#C9A84C]" />
          <div className="flex justify-between text-xs text-[#9C9C9C] mt-1"><span>1 day</span><span>90 days</span></div>
        </div>
        <p className="text-xs text-[#5C5C5C] bg-[#F5F0E8] rounded-lg px-3 py-2">
          Trial ends <strong>{expiresAt}</strong>. User will be notified by email.
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-full border border-[#EBE5DB] text-[#5C5C5C] text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 h-10 rounded-full bg-[#4A7C59] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5">
            {loading ? <Loader size={14} className="animate-spin" /> : <Gift size={14} />} Start Trial
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Email Modal ───────────────────────────────────────────────────────────────

function EmailModal({ tenant, onClose }) {
  const [form, setForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await superAdminAPI.emailTenant(tenant.tenantId, form);
      toast.success(data.message || 'Email sent');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={`Email — ${tenant.name}`} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Subject</label>
          <input
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Important update about your account" required
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Message</label>
          <textarea
            rows={5}
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] resize-none"
            value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Write your message here..." required
          />
        </div>
        <p className="text-xs text-[#5C5C5C]">This will be sent to all active admin(s) of <strong>{tenant.name}</strong>.</p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 h-10 rounded-full border border-[#EBE5DB] text-[#5C5C5C] text-sm">Cancel</button>
          <button type="submit" disabled={loading} className="flex-1 h-10 rounded-full bg-[#1565C0] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-1.5">
            {loading ? <Loader size={14} className="animate-spin" /> : <Send size={14} />} Send Email
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Plans Tab ─────────────────────────────────────────────────────────────────

function PlansTab({ tenants, loading, onRefresh }) {
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { type, tenant }
  const [localTenants, setLocalTenants] = useState(tenants);

  useEffect(() => { setLocalTenants(tenants); }, [tenants]);

  const filtered = localTenants.filter(t =>
    t.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const handleGrantSuccess = (tenantId, newPlan) => {
    setLocalTenants(prev => prev.map(t => t.tenantId === tenantId ? { ...t, subscriptionTier: newPlan } : t));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-[#C9A84C]" /></div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C9C]" />
          <input
            className="w-full border border-[#EBE5DB] rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            placeholder="Search tenants..." value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-[#9C9C9C]">{filtered.length} tenant{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#EBE5DB]">
      <div className="bg-white min-w-[480px]">
        {/* Header row */}
        <div className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 px-4 py-2.5 bg-[#F9F7F2] text-[10px] font-bold text-[#9C9C9C] uppercase tracking-wide border-b border-[#EBE5DB]">
          <span>Tenant</span>
          <span>Plan</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-[#9C9C9C]">No tenants found</div>
        )}

        {filtered.map(tenant => (
          <div key={tenant.tenantId} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-4 items-center px-4 py-3 border-b border-[#F5F0E8] last:border-0 hover:bg-[#FDFAF5]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2D2D2D] truncate">{tenant.name}</p>
              <p className="text-xs text-[#9C9C9C] truncate">/{tenant.slug}</p>
            </div>
            <div>
              <PlanBadge plan={tenant.subscriptionTier || 'free'} />
            </div>
            <div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                tenant.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {tenant.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setModal({ type: 'plan', tenant })}
                title="Grant Plan"
                className="p-1.5 rounded-lg hover:bg-[#FBF5E8] text-[#C9A84C] transition-colors"
              >
                <CreditCard size={15} />
              </button>
              <button
                onClick={() => setModal({ type: 'trial', tenant })}
                title="Grant Trial"
                className="p-1.5 rounded-lg hover:bg-[#E8F5EE] text-[#4A7C59] transition-colors"
              >
                <Gift size={15} />
              </button>
              <button
                onClick={() => setModal({ type: 'email', tenant })}
                title="Email Tenant"
                className="p-1.5 rounded-lg hover:bg-[#E3F2FD] text-[#1565C0] transition-colors"
              >
                <Mail size={15} />
              </button>
              <Link
                to={`/super-admin/tenants/${tenant.tenantId}`}
                title="View Details"
                className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#9C9C9C] transition-colors"
              >
                <ExternalLink size={15} />
              </Link>
            </div>
          </div>
        ))}
      </div>
      </div>

      {modal?.type === 'plan' && (
        <GrantPlanModal
          tenant={modal.tenant}
          onClose={() => setModal(null)}
          onSuccess={(plan) => handleGrantSuccess(modal.tenant.tenantId, plan)}
        />
      )}
      {modal?.type === 'trial' && (
        <GrantTrialModal
          tenant={modal.tenant}
          onClose={() => setModal(null)}
          onSuccess={(plan) => handleGrantSuccess(modal.tenant.tenantId, plan)}
        />
      )}
      {modal?.type === 'email' && (
        <EmailModal tenant={modal.tenant} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ── Feature Gates Tab ─────────────────────────────────────────────────────────

function FeaturesTab({ dbFeatures, loading, onRefresh }) {
  const [toggling, setToggling] = useState(null); // "plan:featureKey"

  const handleToggle = async (plan, featureKey) => {
    const key = `${plan}:${featureKey}`;
    setToggling(key);
    try {
      const staticEnabled = STATIC_DEFAULTS[plan]?.includes(featureKey) || false;
      const dbRow = dbFeatures.find(r => r.plan === plan && r.featureKey === featureKey);
      const effective = dbRow ? dbRow.isEnabled : staticEnabled;
      const newEnabled = !effective;

      if (newEnabled === staticEnabled) {
        // Desired state matches static — delete override if it exists
        if (dbRow) {
          await superAdminAPI.deleteFeatureGate(dbRow.featureId);
        }
      } else {
        // Desired state differs from static — upsert DB override
        await superAdminAPI.upsertFeatureGate({ plan, featureKey, isEnabled: newEnabled });
      }
      onRefresh();
      toast.success(`${plan} / ${featureKey} updated`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally { setToggling(null); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader size={24} className="animate-spin text-[#C9A84C]" /></div>;

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-5 mb-4 text-xs text-[#5C5C5C]">
        <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-[#4A7C59]" /> Enabled (static default)</span>
        <span className="flex items-center gap-1.5"><CheckCircle size={13} className="text-[#C9A84C]" /> Enabled (DB override)</span>
        <span className="flex items-center gap-1.5"><XCircle size={13} className="text-[#D9534F]" /> Disabled (DB override)</span>
        <span className="flex items-center gap-1.5"><XCircle size={13} className="text-[#D1D5DB]" /> Disabled (static default)</span>
      </div>
      <p className="text-xs text-[#9C9C9C] mb-4">Click any cell to toggle. DB overrides take priority over static defaults.</p>

      {/* Matrix */}
      <div className="overflow-x-auto rounded-2xl border border-[#EBE5DB]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F9F7F2]">
              <th className="text-left px-4 py-3 text-xs font-bold text-[#9C9C9C] uppercase tracking-wide w-44 border-b border-[#EBE5DB]">Feature</th>
              {ALL_PLANS.map(p => (
                <th key={p} className="px-3 py-3 border-b border-[#EBE5DB] border-l border-l-[#F5F0E8]">
                  <PlanBadge plan={p} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_FEATURES.map((feat, fi) => (
              <tr key={feat.key} className={fi % 2 === 0 ? 'bg-white' : 'bg-[#FDFAF5]'}>
                <td className="px-4 py-2.5 text-xs font-semibold text-[#2D2D2D] border-r border-[#F5F0E8] whitespace-nowrap">{feat.label}</td>
                {ALL_PLANS.map(plan => {
                  const staticEnabled = STATIC_DEFAULTS[plan]?.includes(feat.key) || false;
                  const dbRow = dbFeatures.find(r => r.plan === plan && r.featureKey === feat.key);
                  const effective = dbRow ? dbRow.isEnabled : staticEnabled;
                  const isOverridden = !!dbRow;
                  const cellKey = `${plan}:${feat.key}`;
                  const isLoading = toggling === cellKey;

                  return (
                    <td key={plan} className="px-3 py-2.5 text-center border-l border-l-[#F5F0E8]">
                      <button
                        onClick={() => handleToggle(plan, feat.key)}
                        disabled={isLoading}
                        title={`${effective ? 'Disable' : 'Enable'} ${feat.label} for ${plan}${isOverridden ? ' (DB override)' : ' (static default)'}`}
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#F5F0E8] transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader size={13} className="animate-spin text-[#C9A84C]" />
                        ) : effective ? (
                          <CheckCircle size={16} className={isOverridden ? 'text-[#C9A84C]' : 'text-[#4A7C59]'} />
                        ) : (
                          <XCircle size={16} className={isOverridden ? 'text-[#D9534F]' : 'text-[#D1D5DB]'} />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex gap-4 text-xs text-[#9C9C9C]">
        <span>Total DB overrides: <strong className="text-[#2D2D2D]">{dbFeatures.length}</strong></span>
        <button onClick={onRefresh} className="text-[#C9A84C] hover:underline">Refresh</button>
      </div>
    </div>
  );
}

// ── Email Broadcast Tab ───────────────────────────────────────────────────────

function EmailBroadcastTab({ tenants }) {
  const [recipient, setRecipient] = useState('specific');
  const [tenantId, setTenantId] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [form, setForm] = useState({ subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (recipient === 'specific' && tenantId) {
        const { data } = await superAdminAPI.emailTenant(tenantId, form);
        toast.success(data.message || 'Email sent to tenant admins');
      } else if (recipient === 'custom' && customTo) {
        await superAdminAPI.sendEmail({ to: customTo, ...form });
        toast.success(`Email sent to ${customTo}`);
      } else if (recipient === 'all') {
        let count = 0;
        for (const t of tenants) {
          try {
            await superAdminAPI.emailTenant(t.tenantId, form);
            count++;
          } catch {}
        }
        toast.success(`Email sent to ${count} tenant(s)`);
      }
      setForm({ subject: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send email');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl">
      <form onSubmit={handleSend} className="bg-white rounded-2xl border border-[#EBE5DB] p-6 flex flex-col gap-4">
        {/* Recipient */}
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-2">Recipient</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { v: 'specific', l: 'Specific Tenant' },
              { v: 'custom',   l: 'Custom Email' },
              { v: 'all',      l: 'All Tenants' },
            ].map(({ v, l }) => (
              <button key={v} type="button" onClick={() => setRecipient(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  recipient === v ? 'border-[#C9A84C] bg-[#FBF5E8] text-[#C9A84C]' : 'border-[#EBE5DB] text-[#5C5C5C]'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {recipient === 'specific' && (
            <select
              className="mt-2 w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
              value={tenantId} onChange={e => setTenantId(e.target.value)} required
            >
              <option value="">Select tenant...</option>
              {tenants.map(t => <option key={t.tenantId} value={t.tenantId}>{t.name}</option>)}
            </select>
          )}
          {recipient === 'custom' && (
            <input
              type="email"
              className="mt-2 w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
              placeholder="user@example.com"
              value={customTo} onChange={e => setCustomTo(e.target.value)} required
            />
          )}
          {recipient === 'all' && (
            <p className="mt-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
              This will email all active admins of all {tenants.length} tenants.
            </p>
          )}
        </div>

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Subject</label>
          <input
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
            placeholder="Important update from Prani" required
          />
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Message</label>
          <textarea
            rows={6}
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C] resize-none"
            value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
            placeholder="Write your message here..." required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-full bg-[#C9A84C] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? <Loader size={15} className="animate-spin" /> : <Send size={15} />}
          Send Email
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [tab, setTab] = useState('plans');
  const [tenants, setTenants] = useState([]);
  const [dbFeatures, setDbFeatures] = useState([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);
  const [featuresLoading, setFeaturesLoading] = useState(true);

  const loadTenants = useCallback(async () => {
    setTenantsLoading(true);
    try {
      const { data } = await superAdminAPI.listTenants({ size: 200 });
      setTenants(data.tenants || data.data || []);
    } catch { toast.error('Failed to load tenants'); }
    setTenantsLoading(false);
  }, []);

  const loadFeatures = useCallback(async () => {
    setFeaturesLoading(true);
    try {
      const { data } = await superAdminAPI.features();
      setDbFeatures(Array.isArray(data) ? data : []);
    } catch {}
    setFeaturesLoading(false);
  }, []);

  useEffect(() => {
    loadTenants();
    loadFeatures();
  }, [loadTenants, loadFeatures]);

  const TABS = [
    { k: 'plans',    l: 'Plans & Trials',  icon: CreditCard },
    { k: 'features', l: 'Feature Gates',   icon: ToggleRight },
    { k: 'email',    l: 'Email Tenants',   icon: Mail },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]">Subscriptions & Features</h1>
          <p className="text-sm text-[#5C5C5C] mt-0.5">Manage plans, feature gates, and tenant communications</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-[#9C9C9C]">
          <span className="flex items-center gap-1"><Users size={13} /> {tenants.length} tenants</span>
          <span className="flex items-center gap-1"><ToggleRight size={13} /> {dbFeatures.length} DB overrides</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#EBE5DB] p-1 w-fit max-w-full overflow-x-auto mb-6">
        {TABS.map(({ k, l, icon: Icon }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === k ? 'bg-[#C9A84C] text-white' : 'text-[#5C5C5C] hover:bg-[#F5F0E8]'
            }`}
          >
            <Icon size={15} />{l}
          </button>
        ))}
      </div>

      {tab === 'plans' && <PlansTab tenants={tenants} loading={tenantsLoading} onRefresh={loadTenants} />}
      {tab === 'features' && <FeaturesTab dbFeatures={dbFeatures} loading={featuresLoading} onRefresh={loadFeatures} />}
      {tab === 'email' && <EmailBroadcastTab tenants={tenants} />}
    </div>
  );
}
