import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { superAdminAPI } from '../../services/api';
import {
  ArrowLeft, Users, Plus, Loader, CheckCircle, XCircle, Save,
  Mail, UserCheck, Copy, Check,
} from 'lucide-react';

// ── Add Tenant Admin Modal ──────────────────────────────────────────────────
function AddAdminModal({ tenantId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await superAdminAPI.createTenantAdmin(tenantId, form);
      onAdded(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Add Tenant Admin" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {['name', 'email', 'password'].map(key => (
          <div key={key}>
            <label className="block text-xs font-semibold text-[#5C5C5C] mb-1 capitalize">{key}</label>
            <input
              type={key === 'password' ? 'password' : 'text'} required
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
          </div>
        ))}
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalActions onClose={onClose} loading={loading} label="Create" />
      </form>
    </Modal>
  );
}

// ── Invite User Modal ────────────────────────────────────────────────────────
function InviteModal({ tenantId, onClose }) {
  const [form, setForm] = useState({ email: '', role: 'staff' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await superAdminAPI.inviteUser(tenantId, form);
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally { setLoading(false); }
  };

  if (sent) return (
    <Modal title="Invitation Sent" onClose={onClose}>
      <div className="text-center py-4">
        <CheckCircle size={40} className="text-[#4A7C59] mx-auto mb-3" />
        <p className="text-sm text-[#2D2D2D]">Invitation sent to <strong>{form.email}</strong></p>
        <p className="text-xs text-[#5C5C5C] mt-1">They'll receive an email with a link to create their account.</p>
        <button onClick={onClose} className="mt-5 px-5 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8943f] transition-colors">Done</button>
      </div>
    </Modal>
  );

  return (
    <Modal title="Invite Team Member" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Email</label>
          <input
            type="email" required value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="colleague@company.com"
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Role</label>
          <select
            value={form.role}
            onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
          >
            {['staff', 'client', 'vendor', 'tenant_admin'].map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <ModalActions onClose={onClose} loading={loading} label="Send Invite" />
      </form>
    </Modal>
  );
}

// ── Impersonate confirm dialog ────────────────────────────────────────────────
function ImpersonateModal({ user, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState('');

  const handleImpersonate = async () => {
    setLoading(true);
    try {
      const { data } = await superAdminAPI.impersonate(user.userId ?? user.user_id);
      setToken(data.token);
    } catch (err) {
      alert(err.response?.data?.message || 'Impersonation failed');
    } finally { setLoading(false); }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal title="Impersonate User" onClose={onClose}>
      {!token ? (
        <div className="flex flex-col gap-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-red-700">
            <strong>Warning:</strong> This creates a 1-hour token that grants full access as <strong>{user.name}</strong>.
            All actions taken will be logged with your super admin ID.
          </div>
          <p className="text-sm text-[#2D2D2D]">
            Impersonate <strong>{user.name}</strong> ({user.email}) — role: <strong>{user.role}</strong>?
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-[#EBE5DB] rounded-xl hover:bg-[#F5F0E8] transition-colors">Cancel</button>
            <button onClick={handleImpersonate} disabled={loading} className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-60">
              {loading && <Loader size={13} className="animate-spin" />} Confirm
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-[#5C5C5C]">1-hour impersonation token (copy and use as Bearer token or log in via the frontend dev tools):</p>
          <div className="bg-[#F5F0E8] rounded-xl p-3 font-mono text-xs break-all text-[#2D2D2D] max-h-28 overflow-y-auto">
            {token}
          </div>
          <button
            onClick={copyToken}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#2D2D2D] text-white rounded-xl hover:bg-black transition-colors self-end"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied!' : 'Copy Token'}
          </button>
          <button onClick={onClose} className="text-sm text-[#5C5C5C] hover:underline self-center">Close</button>
        </div>
      )}
    </Modal>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h2 className="text-lg font-bold text-[#2D2D2D] mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function ModalActions({ onClose, loading, label }) {
  return (
    <div className="flex justify-end gap-2 mt-2">
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-[#EBE5DB] rounded-xl hover:bg-[#F5F0E8] transition-colors">Cancel</button>
      <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-[#C9A84C] text-white rounded-xl hover:bg-[#b8943f] transition-colors flex items-center gap-2 disabled:opacity-60">
        {loading && <Loader size={13} className="animate-spin" />} {label}
      </button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TenantDetailsPage() {
  const { tenantId } = useParams();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null); // 'addAdmin' | 'invite' | {type:'impersonate', user}
  const [edits, setEdits] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, uRes] = await Promise.all([
        superAdminAPI.getTenant(tenantId),
        superAdminAPI.listTenantUsers(tenantId, { page: 0, size: 50 }),
      ]);
      setTenant(tRes.data);
      setEdits(tRes.data);
      setUsers(uRes.data.users ?? []);
    } catch {}
    setLoading(false);
  }, [tenantId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await superAdminAPI.updateTenant(tenantId, {
        name: edits.name, subdomain: edits.subdomain,
        primary_color: edits.primaryColor,
        subscription_tier: edits.subscriptionTier,
        subscription_status: edits.subscriptionStatus,
        is_active: edits.isActive,
      });
      setTenant(data);
    } catch {}
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Deactivate "${tenant?.name}"? All users will lose access.`)) return;
    try { await superAdminAPI.deactivateTenant(tenantId); navigate('/super-admin/tenants'); } catch {}
  };

  if (loading) return <div className="flex justify-center py-20"><Loader size={28} className="animate-spin text-[#C9A84C]" /></div>;
  if (!tenant) return <div className="text-center py-20 text-[#5C5C5C]">Tenant not found</div>;

  return (
    <div>
      <button onClick={() => navigate('/super-admin/tenants')} className="flex items-center gap-1 text-sm text-[#5C5C5C] hover:text-[#2D2D2D] mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Tenants
      </button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]">{tenant.name}</h1>
          <p className="text-sm text-[#5C5C5C]">/{tenant.slug}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={handleDeactivate} disabled={!tenant.isActive}
            className="px-4 py-2 text-sm border border-red-200 text-red-600 rounded-xl hover:bg-red-50 transition-colors disabled:opacity-40">
            Deactivate
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-[#C9A84C] text-white rounded-xl hover:bg-[#b8943f] transition-colors disabled:opacity-60">
            {saving ? <Loader size={13} className="animate-spin" /> : <Save size={13} />} Save
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Settings */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EBE5DB]">
          <h2 className="font-semibold text-[#2D2D2D] mb-4">Settings</h2>
          <div className="flex flex-col gap-4">
            {[['name', 'Name'], ['subdomain', 'Subdomain']].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">{label}</label>
                <input value={edits[key] ?? ''}
                  onChange={e => setEdits(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Plan</label>
                <select value={edits.subscriptionTier ?? 'free'}
                  onChange={e => setEdits(p => ({ ...p, subscriptionTier: e.target.value }))}
                  className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]">
                  {['free','trial','pro','enterprise'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Status</label>
                <select value={edits.subscriptionStatus ?? 'active'}
                  onChange={e => setEdits(p => ({ ...p, subscriptionStatus: e.target.value }))}
                  className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]">
                  {['active','cancelled','past_due','expired','suspended'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users panel */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#EBE5DB]">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="font-semibold text-[#2D2D2D] flex items-center gap-2">
              <Users size={16} /> Users ({users.length})
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setModal('invite')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#E8F5EE] text-[#4A7C59] rounded-lg hover:bg-[#d4eddf] transition-colors font-medium">
                <Mail size={12} /> Invite
              </button>
              <button onClick={() => setModal('addAdmin')}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-[#FBF5E8] text-[#C9A84C] rounded-lg hover:bg-[#f5e9c8] transition-colors font-medium">
                <Plus size={12} /> Add Admin
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
            {users.length === 0 && <p className="text-sm text-[#5C5C5C] text-center py-4">No users yet</p>}
            {users.map(u => (
              <div key={u.userId ?? u.user_id}
                className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-[#F5F0E8] group">
                <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">{u.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#2D2D2D] truncate">{u.name}</p>
                  <p className="text-xs text-[#5C5C5C] truncate">{u.email}</p>
                </div>
                <span className="text-xs text-[#5C5C5C] capitalize">{u.role}</span>
                {(u.isActive ?? u.is_active)
                  ? <CheckCircle size={13} className="text-[#4A7C59] flex-shrink-0" />
                  : <XCircle size={13} className="text-[#D9534F] flex-shrink-0" />}
                <button
                  onClick={() => setModal({ type: 'impersonate', user: u })}
                  title="Impersonate"
                  className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[#9A9A9A] hover:text-red-600">
                  <UserCheck size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === 'addAdmin' && (
        <AddAdminModal tenantId={tenantId} onClose={() => setModal(null)}
          onAdded={u => setUsers(prev => [u, ...prev])} />
      )}
      {modal === 'invite' && (
        <InviteModal tenantId={tenantId} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'impersonate' && (
        <ImpersonateModal user={modal.user} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
