import React, { useState, useEffect } from 'react';
import { plannerAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Pencil, Trash2, Loader2, CheckCircle, DollarSign } from 'lucide-react';

const CATEGORIES = ['Venue','Catering','Photography','Videography','Flowers','Music','Attire','Transport','Invitations','Decor','Honeymoon','Other'];
const STATUSES   = ['planned','booked','paid'];

const empty = { category: 'Venue', description: '', estimated_cost: '', actual_cost: '', status: 'planned', due_date: '', vendor_id: '' };

export default function BudgetTab({ plan }) {
  const [items, setItems]     = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'add' | item
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [filter, setFilter]   = useState('all');

  const load = async () => {
    const [a, b] = await Promise.all([plannerAPI.listBudget(plan.planId), plannerAPI.budgetSummary(plan.planId)]);
    setItems(a.data);
    setSummary(b.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [plan.planId]);

  const openAdd  = () => { setForm(empty); setModal('add'); };
  const openEdit = (item) => { setForm({
    category: item.category, description: item.description || '', estimated_cost: item.estimatedCost,
    actual_cost: item.actualCost || '', status: item.status, due_date: item.dueDate || '', vendor_id: item.vendorId || ''
  }); setModal(item); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, estimated_cost: parseFloat(form.estimated_cost) || 0, actual_cost: form.actual_cost ? parseFloat(form.actual_cost) : null };
      if (modal === 'add') await plannerAPI.addBudget(plan.planId, payload);
      else await plannerAPI.updateBudget(plan.planId, modal.itemId, payload);
      await load();
      setModal(null);
    } catch(e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await plannerAPI.deleteBudget(plan.planId, id);
    await load();
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);
  const chartData = (summary?.by_category || []).map(c => ({ name: c.category, estimated: Number(c.estimated)||0, actual: Number(c.actual)||0 }));

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#C9A84C]" size={28} /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Budget',   value: summary.total_budget,    color: '#2D2D2D' },
            { label: 'Estimated',      value: summary.total_estimated, color: '#C9A84C' },
            { label: 'Actual Spent',   value: summary.total_actual,    color: '#D9534F' },
            { label: 'Remaining',      value: summary.remaining,       color: '#4CAF92' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-[#5C5C5C]">{s.label}</p>
              <p className="text-xl font-bold mt-1 truncate" style={{color: s.color}}>
                {Number(s.value||0).toLocaleString()}
              </p>
              <p className="text-xs text-[#5C5C5C]">RWF</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2D2D2D] text-sm mb-4">Spending by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={14}>
              <XAxis dataKey="name" tick={{fontSize: 10}} />
              <YAxis tick={{fontSize: 10}} tickFormatter={v => `${Math.round(v/1000)}k`} />
              <Tooltip formatter={v => `${Number(v).toLocaleString()} RWF`} />
              <Bar dataKey="estimated" fill="#C9A84C40" name="Estimated" radius={[3,3,0,0]} />
              <Bar dataKey="actual"    fill="#C9A84C"   name="Actual"    radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {['all','planned','booked','paid'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter===s ? 'bg-[#C9A84C] text-white' : 'bg-white text-[#5C5C5C] hover:bg-[#EBE5DB]'}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d] transition-colors">
          <Plus size={15} /> Add Item
        </button>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[#5C5C5C] text-sm">
            <DollarSign className="mx-auto mb-2 text-[#C9A84C]" size={32} />
            No budget items yet. Click "Add Item" to start tracking.
          </div>
        ) : (
          <div className="divide-y divide-[#EBE5DB]">
            {filtered.map(item => (
              <div key={item.itemId} className="flex items-center gap-3 p-4 hover:bg-[#F5F0E8] transition-colors">
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${statusColor(item.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#C9A84C] bg-[#C9A84C15] px-2 py-0.5 rounded-full">{item.category}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusPill(item.status)}`}>{item.status}</span>
                  </div>
                  <p className="text-sm font-medium text-[#2D2D2D] mt-0.5 truncate">{item.description || item.category}</p>
                  {item.dueDate && <p className="text-xs text-[#5C5C5C]">Due {item.dueDate}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-[#2D2D2D]">{Number(item.estimatedCost||0).toLocaleString()} RWF</p>
                  {item.actualCost != null && (
                    <p className="text-xs text-[#D9534F]">Actual: {Number(item.actualCost).toLocaleString()}</p>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-[#EBE5DB]"><Pencil size={14} className="text-[#5C5C5C]" /></button>
                  <button onClick={() => del(item.itemId)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-[#D9534F]" /></button>
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
            <h3 className="font-bold text-[#2D2D2D] text-lg mb-4">{modal === 'add' ? 'Add Budget Item' : 'Edit Budget Item'}</h3>
            <div className="space-y-3">
              <FormRow label="Category">
                <select value={form.category} onChange={e => setForm(f=>({...f, category: e.target.value}))} className="input-field">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </FormRow>
              <FormRow label="Description">
                <input value={form.description} onChange={e => setForm(f=>({...f, description: e.target.value}))} placeholder="e.g. Kigali Serena Hotel" className="input-field" />
              </FormRow>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Estimated (RWF)">
                  <input type="number" value={form.estimated_cost} onChange={e => setForm(f=>({...f, estimated_cost: e.target.value}))} className="input-field" />
                </FormRow>
                <FormRow label="Actual (RWF)">
                  <input type="number" value={form.actual_cost} onChange={e => setForm(f=>({...f, actual_cost: e.target.value}))} className="input-field" placeholder="Leave blank" />
                </FormRow>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormRow label="Status">
                  <select value={form.status} onChange={e => setForm(f=>({...f, status: e.target.value}))} className="input-field">
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FormRow>
                <FormRow label="Due Date">
                  <input type="date" value={form.due_date} onChange={e => setForm(f=>({...f, due_date: e.target.value}))} className="input-field" />
                </FormRow>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#EBE5DB] rounded-xl text-sm font-semibold text-[#5C5C5C] hover:bg-[#F5F0E8]">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const statusColor = s => ({ planned: 'bg-[#C9A84C]', booked: 'bg-blue-400', paid: 'bg-green-400' }[s] || 'bg-gray-300');
const statusPill  = s => ({ planned: 'bg-[#C9A84C15] text-[#C9A84C]', booked: 'bg-blue-50 text-blue-600', paid: 'bg-green-50 text-green-600' }[s] || '');

function FormRow({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">{label}</label>
      {children}
    </div>
  );
}
