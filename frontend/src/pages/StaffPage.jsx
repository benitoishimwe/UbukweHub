import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { staffAPI, adminAPI } from '../services/api';
import { Users, Plus, Search, Clock, Calendar, User, Mail, Briefcase, X, Shield, CheckCircle, XCircle } from 'lucide-react';
import PlannerBoard from '../components/planner/PlannerBoard';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';

const ROLE_COLORS = {
  staff: 'bg-[#E8F5EE] text-[#4A7C59]',
  admin: 'bg-[#E3F2FD] text-[#1565C0]',
  tenant_admin: 'bg-[#FFF3E0] text-[#E65100]',
  vendor: 'bg-[#F3E5F5] text-[#7B1FA2]',
  event_manager: 'bg-[#FCE4EC] text-[#C62828]',
};

function StaffProfileModal({ member, onClose }) {
  const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const joined = member.createdAt ? new Date(member.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden">
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-[#0F4C5C] to-[#1A7A8A] px-6 pt-6 pb-16 relative">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors">
            <X size={16} />
          </button>
          <div className="flex items-center gap-4">
            {member.picture ? (
              <img src={member.picture} alt={member.name} className="w-16 h-16 rounded-full object-cover border-2 border-white/40" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#C9A84C] flex items-center justify-center border-2 border-white/40">
                <span className="text-white text-xl font-bold">{initials}</span>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Playfair Display,serif' }}>{member.name}</h2>
              <p className="text-white/70 text-sm mt-0.5">{member.email}</p>
            </div>
          </div>
        </div>

        {/* Role badge floating */}
        <div className="px-6 -mt-6 mb-4 flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold capitalize shadow-md ${ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-600'}`}>
            {member.role?.replace('_', ' ')}
          </span>
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center gap-1 ${member.isActive !== false ? 'bg-[#E8F5EE] text-[#4A7C59]' : 'bg-gray-100 text-gray-500'}`}>
            {member.isActive !== false ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {member.isActive !== false ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Info rows */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide">Email</p>
                <p className="text-[#2D2D2D] font-medium">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                <Briefcase size={14} className="text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide">Role</p>
                <p className="text-[#2D2D2D] font-medium capitalize">{member.role?.replace('_', ' ')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                <Calendar size={14} className="text-[#C9A84C]" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide">Joined</p>
                <p className="text-[#2D2D2D] font-medium">{joined}</p>
              </div>
            </div>

            {member.availability && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-[#C9A84C]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide">Availability</p>
                  <p className="text-[#2D2D2D] font-medium">{member.availability}</p>
                </div>
              </div>
            )}

            {member.mfaEnabled !== undefined && (
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                  <Shield size={14} className="text-[#C9A84C]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide">2FA Security</p>
                  <p className={`font-medium ${member.mfaEnabled ? 'text-[#4A7C59]' : 'text-[#9C9C9C]'}`}>
                    {member.mfaEnabled ? 'Enabled' : 'Not enabled'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Skills */}
          {member.skills?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {member.skills.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-[#F5F0E8] text-[#5C5C5C] text-xs font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {member.certifications?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-wide mb-2">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {member.certifications.map((c) => (
                  <span key={c} className="px-2.5 py-1 rounded-full bg-[#E8F5EE] text-[#4A7C59] text-xs font-medium">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StaffCard({ member, onViewProfile }) {
  const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="card-wedding p-5" data-testid="staff-card">
      <div className="flex items-center gap-3 mb-3">
        {member.picture ? (
          <img src={member.picture} alt={member.name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E6C975] flex items-center justify-center">
            <span className="text-white font-bold">{initials}</span>
          </div>
        )}
        <div>
          <h3 className="font-bold text-[#2D2D2D] text-sm">{member.name}</h3>
          <p className="text-xs text-[#5C5C5C]">{member.email}</p>
        </div>
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold capitalize ${member.isActive !== false ? 'badge-active' : 'bg-gray-100 text-gray-500'}`}>
          {member.isActive !== false ? 'Active' : 'Inactive'}
        </span>
      </div>
      {member.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {member.skills.map((s) => (
            <span key={s} className="px-2 py-0.5 rounded-full bg-[#F5F0E8] text-[#5C5C5C] text-xs font-medium">{s}</span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F0E8]">
        <span className="text-xs text-[#5C5C5C] capitalize font-medium">{member.role?.replace('_', ' ')}</span>
        <button onClick={() => onViewProfile(member)} className="text-xs text-[#C9A84C] font-semibold hover:underline" data-testid="view-staff-btn">View Profile</button>
      </div>
    </div>
  );
}

function CreateShiftModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState({ staffId: '', role: '', date: '', startTime: '08:00', endTime: '20:00' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await staffAPI.createShift({
        staffId: form.staffId,
        role: form.role,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create shift');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in overflow-hidden" data-testid="shift-modal">
        <div className="px-6 py-5 border-b border-[#EBE5DB] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>Create Shift</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F0E8] flex items-center justify-center text-[#5C5C5C] hover:bg-[#EBE5DB]">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Staff Member</label>
            <select className="input-wedding" value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} required>
              <option value="">Select staff...</option>
              {staff.map(s => <option key={s.userId} value={s.userId}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Role / Task</label>
            <input className="input-wedding" placeholder="Event Coordinator" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Date</label>
            <input className="input-wedding" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">Shift Hours</label>
            <div className="flex items-center gap-3 p-3 bg-[#F9F9FB] rounded-xl border border-[#EBE5DB]">
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-[#5C5C5C] mb-1">START</p>
                <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} className="w-full text-sm font-semibold text-[#2D2D2D] bg-transparent outline-none border-none" />
              </div>
              <div className="w-px h-8 bg-[#EBE5DB]" />
              <div className="flex-1">
                <p className="text-[10px] font-semibold text-[#5C5C5C] mb-1">END</p>
                <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} className="w-full text-sm font-semibold text-[#2D2D2D] bg-transparent outline-none border-none" />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm hover:border-[#C9A84C]">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm font-semibold">
              {loading ? <span className="animate-spin mr-1">⏳</span> : null} Save Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const { t } = useLang();
  const [staff, setStaff] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('staff');
  const [search, setSearch] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [sRes, shRes] = await Promise.allSettled([
        adminAPI.users({ size: 100 }),
        staffAPI.shifts(),
      ]);
      if (sRes.status === 'fulfilled') setStaff(sRes.value.data.users || []);
      if (shRes.status === 'fulfilled') setShifts(shRes.value.data.shifts || shRes.value.data.data || []);
      setLoading(false);
    })();
  }, []);

  const handleAssignmentChange = async (shiftId, staffId, staffName) => {
    setShifts(prev => prev.map(s => s.shiftId === shiftId ? { ...s, staffId, staffName } : s));
    try {
      await staffAPI.updateShift(shiftId, { staffId, staffName });
    } catch (e) {
      console.error('Failed to assign staff', e);
    }
  };

  const filtered = staff.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{t('staff.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowOnboarding(true)} className="px-5 py-2 rounded-full border-2 border-[#C9A84C] text-[#C9A84C] font-semibold text-sm hover:bg-[#C9A84C10] flex items-center gap-2 transition-all" data-testid="onboard-staff-btn">
            <User size={18} /> Onboard Staff
          </button>
          <button onClick={() => setShowShiftModal(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="new-shift-btn">
            <Plus size={18} /> {t('staff.new_shift')}
          </button>
        </div>
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(m => <StaffCard key={m.userId} member={m} onViewProfile={setSelectedMember} />)}
            </div>
          )}
        </>
      ) : (
        <PlannerBoard staffList={staff} shiftsList={shifts} onAssignmentChange={handleAssignmentChange} />
      )}

      {showShiftModal && <CreateShiftModal staff={staff} onClose={() => setShowShiftModal(false)} onSave={(s) => { setShifts([...shifts, s]); setShowShiftModal(false); }} />}
      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} onComplete={() => { setShowOnboarding(false); window.location.reload(); }} />}
      {selectedMember && <StaffProfileModal member={selectedMember} onClose={() => setSelectedMember(null)} />}
    </div>
  );
}
