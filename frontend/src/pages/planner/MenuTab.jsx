import React, { useState, useEffect } from 'react';
import { plannerAPI } from '../../services/api';
import { Plus, Pencil, Trash2, Loader2, CheckCircle, UtensilsCrossed } from 'lucide-react';

const COURSES = ['appetizer','main','dessert','drink'];
const COURSE_LABELS = { appetizer: '🥗 Appetizers', main: '🍖 Mains', dessert: '🍰 Desserts', drink: '🥂 Drinks' };
const empty = { course: 'main', name: '', description: '', dietary_info: '', is_final: false };

export default function MenuTab({ plan }) {
  const [items, setItems]     = useState([]);
  const [mealTally, setMealTally] = useState({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  const load = async () => {
    const [a, b] = await Promise.all([plannerAPI.listMenu(plan.planId), plannerAPI.mealSummary(plan.planId)]);
    setItems(a.data);
    setMealTally(b.data.meal_tally || {});
    setLoading(false);
  };

  useEffect(() => { load(); }, [plan.planId]);

  const openAdd  = () => { setForm({...empty, course: activeTab}); setModal('add'); };
  const openEdit = (item) => { setForm({ course: item.course, name: item.name, description: item.description||'', dietary_info: item.dietaryInfo||'', is_final: item.isFinal }); setModal(item); };

  const save = async () => {
    setSaving(true);
    try {
      if (modal === 'add') await plannerAPI.addMenuItem(plan.planId, form);
      else await plannerAPI.updateMenuItem(plan.planId, modal.itemId, form);
      await load(); setModal(null);
    } catch(e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Remove menu item?')) return;
    await plannerAPI.deleteMenuItem(plan.planId, id);
    await load();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#C9A84C]" size={28} /></div>;

  const byCourse = COURSES.reduce((acc, c) => ({ ...acc, [c]: items.filter(i => i.course === c) }), {});
  const courseItems = byCourse[activeTab] || [];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Meal tally from RSVPs */}
      {Object.keys(mealTally).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2D2D2D] text-sm mb-3">Guest Meal Choices (from RSVPs)</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(mealTally).map(([meal, count]) => (
              <div key={meal} className="flex items-center gap-2 bg-[#C9A84C15] px-3 py-2 rounded-xl">
                <span className="text-sm font-semibold text-[#2D2D2D]">{meal}</span>
                <span className="text-lg font-bold text-[#C9A84C]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course tabs */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="flex border-b border-[#EBE5DB]">
          {COURSES.map(c => (
            <button key={c} onClick={() => setActiveTab(c)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${activeTab===c ? 'bg-[#C9A84C10] text-[#C9A84C] border-b-2 border-[#C9A84C]' : 'text-[#5C5C5C] hover:bg-[#F5F0E8]'}`}>
              {COURSE_LABELS[c]}
              {byCourse[c].length > 0 && <span className="ml-1 text-[10px] bg-[#C9A84C] text-white rounded-full px-1.5 py-0.5">{byCourse[c].length}</span>}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-[#5C5C5C]">{COURSE_LABELS[activeTab]}</p>
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C] text-white rounded-xl text-xs font-semibold hover:bg-[#b8933d]">
              <Plus size={13} /> Add
            </button>
          </div>

          {courseItems.length === 0 ? (
            <div className="text-center py-8 text-[#5C5C5C] text-sm">
              <UtensilsCrossed className="mx-auto mb-2 text-[#C9A84C]" size={28} />
              No {activeTab} items yet.
            </div>
          ) : (
            <div className="space-y-2">
              {courseItems.map(item => (
                <div key={item.itemId} className={`flex items-center gap-3 p-3 rounded-xl border ${item.isFinal ? 'bg-[#4CAF9210] border-[#4CAF9230]' : 'bg-[#F5F0E8] border-transparent'}`}>
                  {item.isFinal && <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full flex-shrink-0">FINAL</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#2D2D2D]">{item.name}</p>
                    {item.description && <p className="text-xs text-[#5C5C5C] truncate">{item.description}</p>}
                    {item.dietaryInfo && <span className="text-[10px] bg-[#E8A4B820] text-[#E8A4B8] px-1.5 py-0.5 rounded-full font-semibold">{item.dietaryInfo}</span>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-[#EBE5DB]"><Pencil size={13} className="text-[#5C5C5C]" /></button>
                    <button onClick={() => del(item.itemId)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={13} className="text-[#D9534F]" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#2D2D2D] text-lg mb-4">{modal === 'add' ? 'Add Menu Item' : 'Edit Menu Item'}</h3>
            <div className="space-y-3">
              <F label="Course">
                <select value={form.course} onChange={e=>setForm(f=>({...f,course:e.target.value}))} className="input-field">
                  {COURSES.map(c => <option key={c} value={c}>{COURSE_LABELS[c]}</option>)}
                </select>
              </F>
              <F label="Dish Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" placeholder="e.g. Grilled Tilapia" /></F>
              <F label="Description"><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} className="input-field" rows={2} /></F>
              <F label="Dietary Info"><input value={form.dietary_info} onChange={e=>setForm(f=>({...f,dietary_info:e.target.value}))} className="input-field" placeholder="e.g. Gluten-free, Vegan" /></F>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_final} onChange={e=>setForm(f=>({...f,is_final:e.target.checked}))} className="accent-[#C9A84C]" />
                Mark as finalized
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#EBE5DB] rounded-xl text-sm font-semibold text-[#5C5C5C]">Cancel</button>
              <button onClick={save} disabled={saving || !form.name.trim()} className="flex-1 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d] disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function F({ label, children }) { return <div><label className="block text-xs font-semibold text-[#2D2D2D] mb-1">{label}</label>{children}</div>; }
