import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { staffAPI } from '../services/api';
import { Users, Plus, Search, Clock, Calendar, CheckCircle, User } from 'lucide-react';
import PlannerBoard from '../components/planner/PlannerBoard';
import OnboardingWizard from '../components/onboarding/OnboardingWizard';

function StaffCard({ member }) {
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
        <span className={`ml-auto px-2 py-1 rounded-full text-xs font-semibold capitalize ${member.is_active ? 'badge-active' : 'bg-gray-100 text-gray-500'}`}>
          {member.is_active ? 'Active' : 'Inactive'}
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
        <span className="text-xs text-[#5C5C5C] capitalize font-medium">{member.role}</span>
        <button className="text-xs text-[#C9A84C] font-semibold hover:underline" data-testid="view-staff-btn">View Profile</button>
      </div>
    </div>
  );
}



function CreateShiftModal({ staff, onClose, onSave }) {
  const [form, setForm] = useState({ staff_id: '', event_id: '', role: '', date: '', start_time: '08:00', end_time: '20:00' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await staffAPI.createShift(form);
      onSave(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in" data-testid="shift-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>Create Shift</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Staff Member</label>
            <select className="input-wedding" value={form.staff_id} onChange={(e) => setForm({ ...form, staff_id: e.target.value })} required data-testid="shift-staff-select">
              <option value="">Select staff...</option>
              {staff.map(s => <option key={s.user_id} value={s.user_id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Role / Task</label>
            <input className="input-wedding" placeholder="Event Coordinator" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required data-testid="shift-role-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Date (dd/mm/yyyy)</label>
              <input className="input-wedding" placeholder="15/03/2025" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required data-testid="shift-date-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Start – End</label>
              <div className="flex gap-1">
                <input className="input-wedding text-sm" type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                <input className="input-wedding text-sm" type="time" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="save-shift-btn">
              {loading ? <span className="animate-spin">⏳</span> : 'Save Shift'}
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

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [sRes, shRes] = await Promise.all([staffAPI.list(), staffAPI.shifts()]);
        setStaff(sRes.data.staff || []);
        setShifts(shRes.data.shifts || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleAssignmentChange = async (shiftId, staffId, staffName) => {
    // Optimistic UI update
    setShifts(prev => prev.map(s => s.shift_id === shiftId ? { ...s, staff_id: staffId, staff_name: staffName } : s));
    try {
      await staffAPI.updateShift(shiftId, { staff_id: staffId, staff_name: staffName });
    } catch (e) {
      console.error("Failed to assign staff", e);
      // Optional: Refetch on failure
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
              {filtered.map(m => <StaffCard key={m.user_id} member={m} />)}
            </div>
          )}
        </>
      ) : (
        <PlannerBoard staffList={staff} shiftsList={shifts} onAssignmentChange={handleAssignmentChange} />
      )}

      {showShiftModal && <CreateShiftModal staff={staff} onClose={() => setShowShiftModal(false)} onSave={(s) => { setShifts([...shifts, s]); setShowShiftModal(false); }} />}
      {showOnboarding && <OnboardingWizard onClose={() => setShowOnboarding(false)} onComplete={() => { setShowOnboarding(false); window.location.reload(); }} />}
    </div>
  );
}
