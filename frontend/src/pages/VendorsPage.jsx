import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { vendorsAPI } from '../services/api';
import { Plus, Search, Star, Store, Phone, Mail, MapPin, Loader } from 'lucide-react';

const CATEGORY_COLORS = {
  catering: 'bg-orange-100 text-orange-700',
  decor: 'bg-pink-100 text-pink-700',
  music: 'bg-purple-100 text-purple-700',
  photography: 'bg-blue-100 text-blue-700',
  transport: 'bg-green-100 text-green-700',
};

function VendorCard({ vendor }) {
  return (
    <div className="card-wedding p-5" data-testid="vendor-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-[#2D2D2D] text-base" style={{fontFamily:'Playfair Display,serif'}}>{vendor.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={12} className={s <= Math.round(vendor.rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#EBE5DB]'} />
            ))}
            <span className="text-xs text-[#5C5C5C] ml-1">{vendor.rating?.toFixed(1)}</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-600'}`}>
          {vendor.category}
        </span>
      </div>
      <div className="space-y-1.5 text-sm text-[#5C5C5C]">
        {vendor.contact_name && <p className="flex items-center gap-2"><Store size={14} />{vendor.contact_name}</p>}
        {vendor.phone && <p className="flex items-center gap-2"><Phone size={14} />{vendor.phone}</p>}
        {vendor.email && <p className="flex items-center gap-2"><Mail size={14} />{vendor.email}</p>}
        {vendor.location && <p className="flex items-center gap-2"><MapPin size={14} />{vendor.location}</p>}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F0E8]">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${vendor.is_verified ? 'badge-active' : 'bg-gray-100 text-gray-500'}`}>
          {vendor.is_verified ? 'Verified' : 'Unverified'}
        </span>
        <button className="text-xs text-[#C9A84C] font-semibold hover:underline" data-testid="contact-vendor-btn">Contact</button>
      </div>
    </div>
  );
}

function AddVendorModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', category: 'catering', contact_name: '', email: '', phone: '', location: 'Kigali, Rwanda', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await vendorsAPI.create(form);
      onSave(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in" data-testid="add-vendor-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>Add Vendor</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Vendor Name</label>
            <input className="input-wedding" placeholder="Kigali Events Catering" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required data-testid="vendor-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Category</label>
              <select className="input-wedding" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} data-testid="vendor-category-select">
                {['catering','decor','music','photography','transport','floristry','entertainment'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Contact Person</label>
              <input className="input-wedding" placeholder="Jean Doe" value={form.contact_name} onChange={(e) => setForm({...form, contact_name: e.target.value})} required data-testid="vendor-contact-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Phone</label>
              <input className="input-wedding" placeholder="+250788..." value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} data-testid="vendor-phone-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Email</label>
              <input className="input-wedding" type="email" placeholder="vendor@example.rw" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} data-testid="vendor-email-input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="save-vendor-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function VendorsPage() {
  const { t } = useLang();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await vendorsAPI.list(params);
      setVendors(data.vendors || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, [search, category]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('nav.vendors')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="add-vendor-btn">
          <Plus size={18} /> Add Vendor
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
          <input className="input-wedding pl-10" placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} data-testid="vendor-search" />
        </div>
        <select className="input-wedding w-full sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="vendor-category-filter">
          <option value="">All Categories</option>
          {['catering','decor','music','photography','transport'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <Store size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('common.no_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendors.map(v => <VendorCard key={v.vendor_id} vendor={v} />)}
        </div>
      )}
      {showModal && <AddVendorModal onClose={() => setShowModal(false)} onSave={(v) => { setVendors([v, ...vendors]); setShowModal(false); }} />}
    </div>
  );
}
