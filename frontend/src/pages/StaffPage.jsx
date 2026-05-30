import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { staffAPI, adminAPI, vendorsAPI } from '../services/api';
import {
  Users, Search, Clock, Calendar, Mail, Briefcase,
  X, Shield, CheckCircle, XCircle, Edit2, Save, Loader, Link2,
  UserPlus, RefreshCw, KeyRound,
} from 'lucide-react';
import { toast } from 'sonner';
import PlannerBoard from '../components/planner/PlannerBoard';

const STAFF_ROLES = ['staff', 'event_manager'];

const ROLE_COLORS = {
  staff:         'bg-[#E8F5EE] text-[#4A7C59]',
  event_manager: 'bg-[#FCE4EC] text-[#C62828]',
  tenant_admin:  'bg-[#FFF3E0] text-[#E65100]',
  vendor:        'bg-[#F3E5F5] text-[#7B1FA2]',
  client:        'bg-[#E3F2FD] text-[#1565C0]',
};

const ROLE_OPTIONS = [
  { value: 'staff',         label: 'Staff' },
  { value: 'event_manager', label: 'Event Manager' },
];

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Catering', 'Decoration', 'Music & DJ',
  'Florist', 'Cake & Pastry', 'Transport', 'Beauty & Makeup', 'Venue',
  'MC / Host', 'Security', 'General',
];

// ─── Invite User Modal ────────────────────────────────────────────────────────
function InviteUserModal({ onClose, onInvited }) {
  const [form, setForm] = useState({ email: '', role: 'staff', name: '' });
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // { email, invitationLink }
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    setSaving(true);
    try {
      const res = await adminAPI.inviteUser({ email: form.email.trim(), role: form.role, name: form.name.trim() || undefined });
      setResult({ email: form.email.trim(), invitationLink: res.data?.invitationLink });
      onInvited?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (!result?.invitationLink) return;
    navigator.clipboard.writeText(result.invitationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden">
        <div className="px-6 py-5 border-b border-[#EBE5DB] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            {result ? 'Invitation Created' : 'Invite Team Member'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center text-[#5C5C5C] hover:bg-[#EBE5DB]">
            <X size={16} />
          </button>
        </div>

        {result ? (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={28} className="text-[#4A7C59] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#2D2D2D]">Invitation created for <strong>{result.email}</strong></p>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {result.invitationLink
                    ? 'Email is not configured — copy the link below and share it manually.'
                    : 'An invitation email has been sent to the recipient.'}
                </p>
              </div>
            </div>
            {result.invitationLink && (
              <div className="bg-[#F5F0E8] rounded-xl p-3">
                <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Invitation Link</p>
                <p className="text-xs text-[#2D2D2D] font-mono break-all leading-relaxed">{result.invitationLink}</p>
                <button
                  onClick={copyLink}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C] text-white rounded-lg text-xs font-semibold hover:bg-[#b8943f] transition-colors"
                >
                  {copied ? <CheckCircle size={12} /> : <UserPlus size={12} />}
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            )}
            <button onClick={onClose} className="w-full btn-gold h-10 text-sm font-semibold">Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-[#6B7280]">
              An invitation link will be created. They'll set their own password when they accept.
            </p>
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Email Address *</label>
              <input
                type="email"
                className="input-wedding"
                placeholder="colleague@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Role</label>
              <select className="input-wedding" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Name <span className="normal-case font-normal text-[#9C9C9C]">(optional)</span></label>
              <input
                className="input-wedding"
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm hover:border-[#C9A84C]">Cancel</button>
              <button type="submit" disabled={saving} className="flex-1 btn-gold h-11 flex items-center justify-center gap-2 text-sm font-semibold">
                {saving ? <Loader size={14} className="animate-spin" /> : <UserPlus size={14} />}
                Send Invite
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Link Vendor Modal ────────────────────────────────────────────────────────
function LinkVendorModal({ user, onClose, onLinked }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    vendorsAPI.list({ size: 100 }).then(res => {
      setVendors(res.data?.vendors || res.data?.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleLink = async () => {
    if (!selectedVendorId) return;
    setLinking(true);
    try {
      await adminAPI.linkVendor(user.userId, selectedVendorId);
      toast.success('Account linked to vendor profile');
      onLinked();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link vendor');
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
        <div className="px-6 py-5 border-b border-[#EBE5DB] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>Link to Vendor Profile</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[#F5F0E8] flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-[#5C5C5C]">
            Select an existing vendor profile to link to <strong>{user.name}</strong>.
          </p>
          {loading ? (
            <div className="flex justify-center py-4"><Loader size={20} className="animate-spin text-[#C9A84C]" /></div>
          ) : vendors.length === 0 ? (
            <p className="text-sm text-[#9C9C9C] text-center py-4">No vendor profiles found.</p>
          ) : (
            <select className="input-wedding" value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}>
              <option value="">Select a vendor profile...</option>
              {vendors.map(v => (
                <option key={v.vendorId} value={v.vendorId}>{v.name} — {v.category}</option>
              ))}
            </select>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 h-10 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] text-sm font-medium">Cancel</button>
            <button onClick={handleLink} disabled={!selectedVendorId || linking}
              className="flex-1 btn-gold h-10 flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40">
              {linking ? <Loader size={14} className="animate-spin" /> : <Link2 size={14} />}
              Link Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Profile Modal ──────────────────────────────────────────────────────
function StaffProfileModal({ member, onClose, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [resending, setResending] = useState(false);
  const [resettingPwd, setResettingPwd] = useState(false);
  const [showLinkVendor, setShowLinkVendor] = useState(false);
  const [form, setForm] = useState({
    name: member.name || '',
    role: member.role || 'staff',
    vendorCategory: 'General',
    availability: member.availability || '',
    skills: (member.skills || []).join(', '),
    certifications: (member.certifications || []).join(', '),
  });
  const [current, setCurrent] = useState(member);

  const initials = current.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const joined = current.createdAt ? new Date(current.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        role: form.role,
        availability: form.availability.trim() || null,
        skills: form.skills.split(',').map(s => s.trim()).filter(Boolean),
        certifications: form.certifications.split(',').map(s => s.trim()).filter(Boolean),
      };
      if (form.role === 'vendor') payload.vendorCategory = form.vendorCategory;
      const res = await adminAPI.updateUser(current.userId, payload);
      const updated = { ...current, ...res.data };
      setCurrent(updated);
      onUpdated(updated);
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    setToggling(true);
    try {
      const fn = current.isActive !== false ? adminAPI.deactivateUser : adminAPI.activateUser;
      const res = await fn(current.userId);
      const updated = { ...current, isActive: res.data.isActive };
      setCurrent(updated);
      onUpdated(updated);
      toast.success(updated.isActive ? 'User activated' : 'User deactivated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setToggling(false);
    }
  };

  const handleResendInvite = async () => {
    setResending(true);
    try {
      await adminAPI.resendInvite(current.userId);
      toast.success(`Invitation resent to ${current.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend invitation');
    } finally {
      setResending(false);
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm(`Send a temporary password to ${current.email}?`)) return;
    setResettingPwd(true);
    try {
      await adminAPI.resetPassword(current.userId);
      toast.success(`Temporary password sent to ${current.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResettingPwd(false);
    }
  };

  const cancelEdit = () => {
    setForm({
      name: current.name || '',
      role: current.role || 'staff',
      availability: current.availability || '',
      skills: (current.skills || []).join(', '),
      certifications: (current.certifications || []).join(', '),
    });
    setEditing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#0F4C5C] to-[#1A7A8A] px-6 pt-6 pb-14 relative flex-shrink-0">
          <div className="flex items-center absolute top-4 right-4 gap-2">
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors">
                <Edit2 size={12} /> Edit
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            {current.picture ? (
              <img src={current.picture} alt={current.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/40" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#C9A84C] flex items-center justify-center border-2 border-white/40">
                <span className="text-white text-xl font-bold">{initials}</span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Playfair Display,serif' }}>{current.name}</h2>
              <p className="text-white/70 text-sm mt-0.5">{current.email}</p>
            </div>
          </div>
        </div>

        {/* Status badges */}
        <div className="px-6 -mt-5 mb-3 flex items-center gap-2 flex-shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize shadow-md ${ROLE_COLORS[current.role] || 'bg-gray-100 text-gray-600'}`}>
            {current.role?.replace('_', ' ')}
          </span>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1 transition-all hover:opacity-80 ${current.isActive !== false ? 'bg-[#E8F5EE] text-[#4A7C59]' : 'bg-gray-100 text-gray-500'}`}
          >
            {toggling ? <Loader size={10} className="animate-spin" /> : current.isActive !== false ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {current.isActive !== false ? 'Active' : 'Inactive'}
          </button>
        </div>

        {/* Scrollable body */}
        <div className="px-6 pb-6 overflow-y-auto flex-1">
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Full Name</label>
                <input className="input-wedding" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Role</label>
                <select className="input-wedding" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {[
                    { value: 'staff',         label: 'Staff' },
                    { value: 'event_manager', label: 'Event Manager' },
                    { value: 'tenant_admin',  label: 'Admin' },
                    { value: 'vendor',        label: 'Vendor' },
                    { value: 'client',        label: 'Client' },
                  ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              {form.role === 'vendor' && (
                <div>
                  <label className="block text-xs font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Business Category</label>
                  <select className="input-wedding" value={form.vendorCategory} onChange={(e) => setForm({ ...form, vendorCategory: e.target.value })}>
                    {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Availability</label>
                <input className="input-wedding" placeholder="e.g. Mon–Fri, 9am–5pm" value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Skills <span className="normal-case font-normal text-[#9C9C9C]">(comma separated)</span></label>
                <input className="input-wedding" placeholder="Photography, Catering, MC" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#9C9C9C] uppercase tracking-wide mb-1.5">Certifications <span className="normal-case font-normal text-[#9C9C9C]">(comma separated)</span></label>
                <input className="input-wedding" placeholder="First Aid, Food Safety" value={form.certifications} onChange={(e) => setForm({ ...form, certifications: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={cancelEdit} className="flex-1 h-10 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] text-sm font-medium hover:border-[#C9A84C]">Cancel</button>
                <button type="button" onClick={handleSave} disabled={saving} className="flex-1 btn-gold h-10 flex items-center justify-center gap-2 text-sm font-semibold">
                  {saving ? <Loader size={15} className="animate-spin" /> : <Save size={15} />} Save Changes
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { icon: Mail,      label: 'Email',        value: current.email },
                { icon: Briefcase, label: 'Role',         value: current.role?.replace('_', ' '), className: 'capitalize' },
                { icon: Calendar,  label: 'Joined',       value: joined },
                ...(current.availability ? [{ icon: Clock, label: 'Availability', value: current.availability }] : []),
                ...(current.mfaEnabled !== undefined ? [{
                  icon: Shield, label: '2FA Security',
                  value: current.mfaEnabled ? 'Enabled' : 'Not enabled',
                  className: current.mfaEnabled ? 'text-[#4A7C59]' : 'text-[#9C9C9C]',
                }] : []),
              ].map(({ icon: Icon, label, value, className: cls }) => (
                <div key={label} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-[#C9A84C]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide">{label}</p>
                    <p className={`text-[#2D2D2D] font-medium ${cls || ''}`}>{value}</p>
                  </div>
                </div>
              ))}

              {current.skills?.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {current.skills.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-full bg-[#F5F0E8] text-[#5C5C5C] text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {current.certifications?.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-2">Certifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {current.certifications.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[#4A7C59] text-xs font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin actions */}
              <div className="pt-3 border-t border-[#F5F0E8] space-y-2">
                <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-2">Admin Actions</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleResendInvite}
                    disabled={resending}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#E5E7EB] text-[#374151] hover:bg-[#F9F9FB] text-xs font-semibold transition-colors"
                  >
                    {resending ? <Loader size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    Resend Invite
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={resettingPwd}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 text-xs font-semibold transition-colors"
                  >
                    {resettingPwd ? <Loader size={11} className="animate-spin" /> : <KeyRound size={11} />}
                    Reset Password
                  </button>
                </div>
              </div>

              {/* Vendor linking */}
              {current.role === 'vendor' && (
                <div className="pt-3 border-t border-[#F5F0E8]">
                  <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-2">Vendor Profile</p>
                  <button
                    onClick={() => setShowLinkVendor(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[#C9A84C50] text-[#C9A84C] text-sm font-semibold hover:bg-[#C9A84C08] transition-colors"
                  >
                    <Link2 size={15} /> Link to Vendor Profile
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showLinkVendor && (
        <LinkVendorModal user={current} onClose={() => setShowLinkVendor(false)} onLinked={() => onUpdated(current)} />
      )}
    </div>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────
function StaffCard({ member, onViewProfile }) {
  const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="card-wedding p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onViewProfile(member)} data-testid="staff-card">
      <div className="flex items-center gap-3 mb-3">
        {member.picture ? (
          <img src={member.picture} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E6C975] flex items-center justify-center">
            <span className="text-white font-bold">{initials}</span>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#2D2D2D] text-sm truncate">{member.name}</h3>
          <p className="text-xs text-[#5C5C5C] truncate">{member.email}</p>
        </div>
        <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-semibold capitalize ${member.isActive !== false ? 'badge-active' : 'bg-gray-100 text-gray-500'}`}>
          {member.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      </div>
      {member.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {member.skills.slice(0, 3).map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-[#F5F0E8] text-[#5C5C5C] text-xs font-medium">{s}</span>
          ))}
          {member.skills.length > 3 && (
            <span className="px-2 py-0.5 rounded-full bg-[#F5F0E8] text-[#9C9C9C] text-xs">+{member.skills.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F0E8]">
        <span className={`text-xs font-semibold capitalize px-2 py-1 rounded-full ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
          {member.role?.replace('_', ' ')}
        </span>
        <span className="text-xs text-[#C9A84C] font-semibold">View Profile →</span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
  const { t } = useLang();
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('staff');
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const loadStaff = async () => {
    setLoading(true);
    const [sRes, shRes] = await Promise.allSettled([
      adminAPI.users({ size: 200 }),
      staffAPI.shifts(),
    ]);
    if (sRes.status === 'fulfilled') {
      const all = sRes.value.data?.users || sRes.value.data || [];
      setStaff(all.filter(u => STAFF_ROLES.includes(u.role)));
    }
    const realShifts = shRes.status === 'fulfilled'
      ? (shRes.value.data?.shifts || shRes.value.data?.data || [])
      : [];
    let demoShifts = JSON.parse(localStorage.getItem('plani_demo_shifts') || '[]');

    // Auto-persist demo shifts that already have a staffId assigned
    const unsynced = demoShifts.filter(s => s.staffId);
    for (const demo of unsynced) {
      try {
        const { data } = await staffAPI.createShift({
          staffId: demo.staffId, staffName: demo.staffName ?? null,
          role: demo.role || '', date: demo.date,
          startTime: demo.startTime || null, endTime: demo.endTime || null,
          eventId: demo.eventId || null,
        });
        demoShifts = demoShifts.filter(s => s.shiftId !== demo.shiftId);
        localStorage.setItem('plani_demo_shifts', JSON.stringify(demoShifts));
        realShifts.push(data);
      } catch {
        // still offline or backend error — leave in localStorage
      }
    }

    setShifts([...realShifts, ...demoShifts]);
    setLoading(false);
  };

  useEffect(() => { loadStaff(); }, []);

  const _persistDemoShift = async (demoShift, overrides = {}) => {
    const { data } = await staffAPI.createShift({
      staffId:   overrides.staffId   ?? demoShift.staffId   ?? null,
      staffName: overrides.staffName ?? demoShift.staffName ?? null,
      role:      demoShift.role      || '',
      date:      demoShift.date,
      startTime: demoShift.startTime || null,
      endTime:   demoShift.endTime   || null,
      eventId:   demoShift.eventId   || null,
    });
    const demo = JSON.parse(localStorage.getItem('plani_demo_shifts') || '[]');
    localStorage.setItem('plani_demo_shifts', JSON.stringify(demo.filter(s => s.shiftId !== demoShift.shiftId)));
    return data;
  };

  const handleAssignmentChange = async (shiftId, staffId, staffName) => {
    setShifts(prev => prev.map(s => s.shiftId === shiftId ? { ...s, staffId, staffName } : s));
    if (shiftId.startsWith('demo-')) {
      const demoShift = shifts.find(s => s.shiftId === shiftId);
      if (demoShift) {
        try {
          const realShift = await _persistDemoShift(demoShift, { staffId, staffName });
          setShifts(prev => prev.map(s => s.shiftId === shiftId ? realShift : s));
          toast.success('Shift saved to database');
        } catch {
          const demo = JSON.parse(localStorage.getItem('plani_demo_shifts') || '[]');
          localStorage.setItem('plani_demo_shifts', JSON.stringify(
            demo.map(s => s.shiftId === shiftId ? { ...s, staffId, staffName } : s)
          ));
          toast.warning('Assignment saved locally — will sync when server is available');
        }
      }
    } else {
      try { await staffAPI.updateShift(shiftId, { staffId, staffName }); } catch (e) { console.error(e); }
    }
  };

  const handleShiftUpdate = async (shiftId, fields) => {
    setShifts(prev => prev.map(s => s.shiftId === shiftId ? { ...s, ...fields } : s));
    if (shiftId.startsWith('demo-')) {
      const demoShift = { ...shifts.find(s => s.shiftId === shiftId), ...fields };
      if (demoShift.staffId) {
        try {
          const realShift = await _persistDemoShift(demoShift);
          setShifts(prev => prev.map(s => s.shiftId === shiftId ? realShift : s));
          return;
        } catch {}
      }
      const demo = JSON.parse(localStorage.getItem('plani_demo_shifts') || '[]');
      localStorage.setItem('plani_demo_shifts', JSON.stringify(demo.map(s => s.shiftId === shiftId ? { ...s, ...fields } : s)));
    } else {
      await staffAPI.updateShift(shiftId, fields);
    }
  };

  const handleShiftDelete = async (shiftId) => {
    setShifts(prev => prev.filter(s => s.shiftId !== shiftId));
    if (shiftId.startsWith('demo-')) {
      const demo = JSON.parse(localStorage.getItem('plani_demo_shifts') || '[]');
      localStorage.setItem('plani_demo_shifts', JSON.stringify(demo.filter(s => s.shiftId !== shiftId)));
    } else {
      await staffAPI.deleteShift(shiftId);
    }
  };

  const filtered = staff.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{t('staff.title')}</h1>
          <p className="text-sm text-[#9C9C9C] mt-0.5">Staff & Event Managers</p>
        </div>
        <button onClick={() => setShowInvite(true)} className="px-5 py-2 rounded-full border-2 border-[#C9A84C] text-[#C9A84C] font-semibold text-sm hover:bg-[#C9A84C10] flex items-center gap-2 transition-all" data-testid="invite-staff-btn">
          <UserPlus size={18} /> Invite Staff
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-[#EBE5DB] p-1 w-fit mb-6">
        {[{ key: 'staff', label: t('staff.title'), icon: Users }, { key: 'shifts', label: t('staff.shifts'), icon: Calendar }].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-[#C9A84C] text-white' : 'text-[#5C5C5C] hover:bg-[#F5F0E8]'}`} data-testid={`tab-${key}`}>
            <Icon size={16} />{label}
          </button>
        ))}
      </div>

      {tab === 'staff' ? (
        <>
          <div className="relative mb-4 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
            <input className="input-wedding pl-10" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="staff-search" />
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="skeleton h-36 rounded-2xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-[#9C9C9C]">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No staff members yet</p>
              <p className="text-sm mt-1">Invite your first team member to get started</p>
              <button onClick={() => setShowInvite(true)} className="mt-4 btn-gold px-6 py-2.5 text-sm flex items-center gap-2 mx-auto">
                <UserPlus size={16} /> Invite Staff
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(m => <StaffCard key={m.userId} member={m} onViewProfile={setSelectedMember} />)}
            </div>
          )}
        </>
      ) : (
        <PlannerBoard
          staffList={staff}
          shiftsList={shifts}
          onAssignmentChange={handleAssignmentChange}
          onShiftsGenerated={(newShifts) => {
            const existing = JSON.parse(localStorage.getItem('plani_demo_shifts') || '[]');
            localStorage.setItem('plani_demo_shifts', JSON.stringify([...existing, ...newShifts]));
            setShifts(prev => [...prev, ...newShifts]);
          }}
          onShiftUpdate={handleShiftUpdate}
          onShiftDelete={handleShiftDelete}
        />
      )}

      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onInvited={loadStaff}
        />
      )}
      {selectedMember && (
        <StaffProfileModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onUpdated={(updated) => {
            setStaff(prev => prev.map(s => s.userId === updated.userId ? { ...s, ...updated } : s));
            setSelectedMember(prev => ({ ...prev, ...updated }));
          }}
        />
      )}
    </div>
  );
}
