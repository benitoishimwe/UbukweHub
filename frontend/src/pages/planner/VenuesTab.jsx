import React, { useState, useEffect } from 'react';
import { plannerAPI } from '../../services/api';
import { Plus, Pencil, Trash2, Loader2, MapPin, CheckCircle, Star } from 'lucide-react';

const empty = { name:'', address:'', contact_name:'', contact_phone:'', capacity:'', rental_fee:'', included_items:'', notes:'', is_selected: false };

export default function VenuesTab({ plan }) {
  const [venues, setVenues]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [form, setForm]       = useState(empty);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    const res = await plannerAPI.listVenues(plan.planId);
    setVenues(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [plan.planId]);

  const openAdd  = () => { setForm(empty); setModal('add'); };
  const openEdit = (v) => { setForm({
    name: v.name, address: v.address||'', contact_name: v.contactName||'', contact_phone: v.contactPhone||'',
    capacity: v.capacity||'', rental_fee: v.rentalFee||'', included_items: v.includedItems||'', notes: v.notes||'', is_selected: v.isSelected
  }); setModal(v); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, capacity: form.capacity ? parseInt(form.capacity) : null, rental_fee: form.rental_fee ? parseFloat(form.rental_fee) : null };
      if (modal === 'add') await plannerAPI.addVenue(plan.planId, payload);
      else await plannerAPI.updateVenue(plan.planId, modal.venueId, payload);
      await load(); setModal(null);
    } catch(e) { alert(e.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Remove this venue?')) return;
    await plannerAPI.deleteVenue(plan.planId, id);
    await load();
  };

  const toggleSelect = async (venue) => {
    await plannerAPI.updateVenue(plan.planId, venue.venueId, { ...venue, is_selected: !venue.isSelected });
    await load();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#C9A84C]" size={28} /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-[#5C5C5C]">{venues.length} venue{venues.length!==1?'s':''} shortlisted</p>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d]">
          <Plus size={15} /> Add Venue
        </button>
      </div>

      {venues.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
          <MapPin className="text-[#C9A84C] mx-auto mb-3" size={36} />
          <p className="text-[#5C5C5C] text-sm">No venues added yet. Start comparing options!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {venues.map(v => (
            <div key={v.venueId} className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all ${v.isSelected ? 'border-[#C9A84C]' : 'border-transparent'}`}>
              {v.isSelected && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C9A84C] mb-2">
                  <Star size={12} fill="currentColor" /> Selected Venue
                </div>
              )}
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-[#2D2D2D] text-base">{v.name}</h3>
                <div className="flex gap-1">
                  <button onClick={() => toggleSelect(v)} className={`p-1.5 rounded-lg transition-colors ${v.isSelected ? 'bg-[#C9A84C20]' : 'hover:bg-[#EBE5DB]'}`} title={v.isSelected ? 'Deselect' : 'Mark as selected'}>
                    <Star size={14} className={v.isSelected ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#5C5C5C]'} />
                  </button>
                  <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-[#EBE5DB]"><Pencil size={14} className="text-[#5C5C5C]" /></button>
                  <button onClick={() => del(v.venueId)} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-[#D9534F]" /></button>
                </div>
              </div>
              {v.address && <p className="text-xs text-[#5C5C5C] mt-1 flex items-center gap-1"><MapPin size={11} />{v.address}</p>}
              <div className="flex gap-3 mt-3 flex-wrap">
                {v.capacity && <Chip label={`${v.capacity} guests`} />}
                {v.rentalFee && <Chip label={`${Number(v.rentalFee).toLocaleString()} RWF`} gold />}
              </div>
              {v.contactName && <p className="text-xs text-[#5C5C5C] mt-2">Contact: {v.contactName} {v.contactPhone ? `· ${v.contactPhone}` : ''}</p>}
              {v.includedItems && <p className="text-xs text-[#5C5C5C] mt-1 italic">Includes: {v.includedItems}</p>}
              {v.notes && <p className="text-xs text-[#5C5C5C] mt-1 border-t border-[#EBE5DB] pt-2">{v.notes}</p>}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-[#2D2D2D] text-lg mb-4">{modal === 'add' ? 'Add Venue' : 'Edit Venue'}</h3>
            <div className="space-y-3">
              <F label="Venue Name *"><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input-field" /></F>
              <F label="Address"><textarea value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} className="input-field" rows={2} /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="Contact Name"><input value={form.contact_name} onChange={e=>setForm(f=>({...f,contact_name:e.target.value}))} className="input-field" /></F>
                <F label="Contact Phone"><input value={form.contact_phone} onChange={e=>setForm(f=>({...f,contact_phone:e.target.value}))} className="input-field" /></F>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <F label="Capacity (guests)"><input type="number" value={form.capacity} onChange={e=>setForm(f=>({...f,capacity:e.target.value}))} className="input-field" /></F>
                <F label="Rental Fee (RWF)"><input type="number" value={form.rental_fee} onChange={e=>setForm(f=>({...f,rental_fee:e.target.value}))} className="input-field" /></F>
              </div>
              <F label="Included Items"><input value={form.included_items} onChange={e=>setForm(f=>({...f,included_items:e.target.value}))} className="input-field" placeholder="e.g. Tables, chairs, lighting" /></F>
              <F label="Notes"><textarea value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} className="input-field" rows={2} /></F>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.is_selected} onChange={e=>setForm(f=>({...f,is_selected:e.target.checked}))} className="accent-[#C9A84C]" />
                Mark as selected venue
              </label>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-[#EBE5DB] rounded-xl text-sm font-semibold text-[#5C5C5C] hover:bg-[#F5F0E8]">Cancel</button>
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

const Chip = ({ label, gold }) => (
  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${gold ? 'bg-[#C9A84C20] text-[#C9A84C]' : 'bg-[#F5F0E8] text-[#5C5C5C]'}`}>{label}</span>
);
function F({ label, children }) { return <div><label className="block text-xs font-semibold text-[#2D2D2D] mb-1">{label}</label>{children}</div>; }
