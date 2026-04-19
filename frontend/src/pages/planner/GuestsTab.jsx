import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import { plannerAPI } from '../../services/api';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Pencil, Trash2, Loader2, Upload, Users, CheckCircle } from 'lucide-react';

const RSVP_COLORS = { attending: '#4CAF92', pending: '#C9A84C', declined: '#D9534F' };
const MEALS = ['Chicken','Fish','Beef','Vegetarian','Vegan','Kids Meal'];
const emptyGuest = { full_name:'', email:'', phone:'', rsvp_status:'pending', meal_choice:'', dietary_restrictions:'', table_number:'' };

export default function GuestsTab({ plan }) {
  const [guests, setGuests]   = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(emptyGuest);
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('all');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef();

  const load = async () => {
    const [a, b] = await Promise.all([plannerAPI.listGuests(plan.planId), plannerAPI.guestSummary(plan.planId)]);
    setGuests(a.data);
    setSummary(b.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [plan.planId]);

  const openAdd  = () => { setForm(emptyGuest); setModal('add'); };
  const openEdit = (g) => { setForm({
    full_name: g.fullName, email: g.email||'', phone: g.phone||'', rsvp_status: g.rsvpStatus,
    meal_choice: g.mealChoice||'', dietary_restrictions: g.dietaryRestrictions||'', table_number: g.tableNumber||''
  }); setModal(g); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, table_number: form.table_number ? parseInt(form.table_number) : null };
      if (modal === 'add') await plannerAPI.addGuest(plan.planId, payload);
      else await plannerAPI.updateGuest(plan.planId, modal.guestId, payload);
      await load(); setModal(null);
    } catch(e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Remove this guest?')) return;
    await plannerAPI.deleteGuest(plan.planId, id);
    await load();
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const res = await plannerAPI.importGuests(plan.planId, fd);
      alert(`Imported ${res.data.imported} guests successfully!`);
      await load();
    } catch(err) {
      alert(err.response?.data?.message || 'Import failed');
    } finally { setImporting(false); e.target.value = ''; }
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([{ full_name:'Alice Uwimana', email:'alice@example.com', phone:'+250780000000', rsvp_status:'attending', meal_choice:'Chicken', dietary_restrictions:'', table_number:'1' }]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'guests_template.csv'; a.click();
  };

  const filtered = filter === 'all' ? guests : guests.filter(g => g.rsvpStatus === filter);

  const pieData = summary ? [
    { name: 'Attending', value: summary.attending },
    { name: 'Pending',   value: summary.pending },
    { name: 'Declined',  value: summary.declined },
  ].filter(d => d.value > 0) : [];

  const mealData = summary ? Object.entries(summary.meal_tally || {}).map(([name, value]) => ({ name, value })) : [];

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#C9A84C]" size={28} /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['Total', summary.total, '#2D2D2D'], ['Attending', summary.attending, '#4CAF92'], ['Pending', summary.pending, '#C9A84C'], ['Declined', summary.declined, '#D9534F']].map(([l, v, c]) => (
            <div key={l} className="bg-white rounded-2xl p-4 shadow-sm text-center">
              <p className="text-xs font-semibold text-[#5C5C5C]">{l}</p>
              <p className="text-3xl font-bold mt-1" style={{color: c}}>{v}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts row */}
      {(pieData.length > 0 || mealData.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pieData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#2D2D2D] text-sm mb-2">RSVP Status</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((e,i) => <Cell key={i} fill={RSVP_COLORS[e.name.toLowerCase()] || '#C9A84C'} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {mealData.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <h3 className="font-bold text-[#2D2D2D] text-sm mb-2">Meal Choices</h3>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart><Pie data={mealData} cx="50%" cy="50%" outerRadius={60} dataKey="value" label={({name,value}) => `${name} (${value})`} labelLine={false}>
                  {mealData.map((_, i) => <Cell key={i} fill={['#C9A84C','#4CAF92','#7C6AF7','#E8A4B8','#F5A623','#50E3C2'][i%6]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Actions bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {['all','attending','pending','declined'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter===s ? 'bg-[#C9A84C] text-white' : 'bg-white text-[#5C5C5C] hover:bg-[#EBE5DB]'}`}>
              {s === 'all' ? `All (${guests.length})` : s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EBE5DB] text-[#5C5C5C] rounded-xl text-xs font-semibold hover:bg-[#F5F0E8]">
            CSV Template
          </button>
          <label className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#EBE5DB] text-[#5C5C5C] rounded-xl text-xs font-semibold hover:bg-[#F5F0E8] cursor-pointer">
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
            Import CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d]">
            <Plus size={15} /> Add Guest
          </button>
        </div>
      </div>

      {/* Guest list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[#5C5C5C] text-sm">
            <Users className="mx-auto mb-2 text-[#C9A84C]" size={32} />
            No guests yet. Add guests or import from CSV.
          </div>
        ) : (
          <div className="divide-y divide-[#EBE5DB]">
            {filtered.map(g => (
              <div key={g.guestId} className="flex items-center gap-3 p-3.5 hover:bg-[#F5F0E8]">
                <div className="w-8 h-8 rounded-full bg-[#C9A84C15] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#C9A84C] text-xs font-bold">{g.fullName?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#2D2D2D] truncate">{g.fullName}</p>
                  <p className="text-xs text-[#5C5C5C]">{g.email || g.phone || '—'}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {g.mealChoice && <span className="text-xs bg-[#F5F0E8] px-2 py-0.5 rounded-full text-[#5C5C5C]">{g.mealChoice}</span>}
                  {g.tableNumber && <span className="text-xs bg-[#EBE5DB] px-2 py-0.5 rounded-full text-[#5C5C5C]">T{g.tableNumber}</span>}
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${rsvpPill(g.rsvpStatus)}`}>{g.rsvpStatus}</span>
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-[#EBE5DB]"><Pencil size={13} className="text-[#5C5C5C]" /></button>
                  <button onClick={() => del(g.guestId)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={13} className="text-[#D9534F]" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#2D2D2D] text-lg mb-4">{modal === 'add' ? 'Add Guest' : 'Edit Guest'}</h3>
            <div className="space-y-3">
              <Field label="Full Name *"><input value={form.full_name} onChange={e=>setForm(f=>({...f,full_name:e.target.value}))} className="input-field" placeholder="Guest name" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email"><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="input-field" /></Field>
                <Field label="Phone"><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className="input-field" /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="RSVP Status">
                  <select value={form.rsvp_status} onChange={e=>setForm(f=>({...f,rsvp_status:e.target.value}))} className="input-field">
                    {['pending','attending','declined'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Meal Choice">
                  <select value={form.meal_choice} onChange={e=>setForm(f=>({...f,meal_choice:e.target.value}))} className="input-field">
                    <option value="">— none —</option>
                    {MEALS.map(m=><option key={m}>{m}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Table #"><input type="number" value={form.table_number} onChange={e=>setForm(f=>({...f,table_number:e.target.value}))} className="input-field" /></Field>
                <Field label="Dietary Notes"><input value={form.dietary_restrictions} onChange={e=>setForm(f=>({...f,dietary_restrictions:e.target.value}))} className="input-field" /></Field>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#EBE5DB] rounded-xl text-sm font-semibold text-[#5C5C5C] hover:bg-[#F5F0E8]">Cancel</button>
              <button onClick={save} disabled={saving || !form.full_name.trim()} className="flex-1 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const rsvpPill = s => ({ attending: 'bg-green-50 text-green-600', pending: 'bg-[#C9A84C15] text-[#C9A84C]', declined: 'bg-red-50 text-red-500' }[s] || '');
function Field({ label, children }) { return <div><label className="block text-xs font-semibold text-[#2D2D2D] mb-1">{label}</label>{children}</div>; }
