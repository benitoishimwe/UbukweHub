import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { vendorsAPI } from '../services/api';
import { Plus, Search, Star, Store, Phone, Mail, MapPin, Loader, X, Copy, CheckCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLORS = {
  catering: 'bg-orange-100 text-orange-700',
  decor: 'bg-pink-100 text-pink-700',
  music: 'bg-purple-100 text-purple-700',
  photography: 'bg-blue-100 text-blue-700',
  transport: 'bg-green-100 text-green-700',
};

function ContactVendorModal({ vendor, onClose }) {
  const [copied, setCopied] = useState('');

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const template = CATEGORY_COLORS[vendor.category];
  const rating = vendor.rating != null ? Number(vendor.rating) : null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
        {/* Header */}
        <div className="p-6 border-b border-[#EBE5DB] flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{vendor.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${template || 'bg-gray-100 text-gray-600'}`}>
                {vendor.category}
              </span>
              {vendor.isVerified && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium badge-active">Verified</span>
              )}
            </div>
            {rating !== null && (
              <div className="flex items-center gap-1 mt-1.5">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={12} className={s <= Math.round(rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#EBE5DB]'} />
                ))}
                <span className="text-xs text-[#5C5C5C] ml-0.5">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F5F0E8] text-[#5C5C5C]">
            <X size={18} />
          </button>
        </div>

        {/* Contact details */}
        <div className="p-6 space-y-3">
          {vendor.contactName && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
              <div className="flex items-center gap-2.5 text-sm text-[#2D2D2D]">
                <Store size={15} className="text-[#C9A84C]" />
                <div>
                  <p className="text-[10px] text-[#5C5C5C] leading-none mb-0.5">Contact Person</p>
                  <p className="font-medium">{vendor.contactName}</p>
                </div>
              </div>
            </div>
          )}

          {vendor.phone && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
              <div className="flex items-center gap-2.5 text-sm text-[#2D2D2D]">
                <Phone size={15} className="text-[#C9A84C]" />
                <div>
                  <p className="text-[10px] text-[#5C5C5C] leading-none mb-0.5">Phone</p>
                  <p className="font-medium">{vendor.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copy(vendor.phone, 'Phone')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C] transition-colors"
                  title="Copy phone"
                >
                  {copied === 'Phone' ? <CheckCheck size={14} className="text-[#4A7C59]" /> : <Copy size={14} />}
                </button>
                <a
                  href={`tel:${vendor.phone}`}
                  className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C] transition-colors"
                  title="Call"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {vendor.email && (
            <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
              <div className="flex items-center gap-2.5 text-sm text-[#2D2D2D]">
                <Mail size={15} className="text-[#C9A84C]" />
                <div>
                  <p className="text-[10px] text-[#5C5C5C] leading-none mb-0.5">Email</p>
                  <p className="font-medium">{vendor.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => copy(vendor.email, 'Email')}
                  className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C] transition-colors"
                  title="Copy email"
                >
                  {copied === 'Email' ? <CheckCheck size={14} className="text-[#4A7C59]" /> : <Copy size={14} />}
                </button>
                <a
                  href={`mailto:${vendor.email}?subject=Inquiry from Prani – ${vendor.name}`}
                  className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C] transition-colors"
                  title="Open email client"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {vendor.location && (
            <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-[#F5F0E8] text-sm text-[#2D2D2D]">
              <MapPin size={15} className="text-[#C9A84C] shrink-0" />
              <div>
                <p className="text-[10px] text-[#5C5C5C] leading-none mb-0.5">Location</p>
                <p className="font-medium">{vendor.location}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          {vendor.phone && (
            <a
              href={`tel:${vendor.phone}`}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full border-2 border-[#C9A84C] text-[#C9A84C] font-semibold text-sm hover:bg-[#C9A84C] hover:text-white transition-colors"
            >
              <Phone size={15} /> Call
            </a>
          )}
          {vendor.email && (
            <a
              href={`mailto:${vendor.email}?subject=Inquiry from Prani – ${vendor.name}`}
              className="flex-1 h-11 flex items-center justify-center gap-2 rounded-full btn-gold text-sm"
            >
              <Mail size={15} /> Send Email
            </a>
          )}
          {!vendor.phone && !vendor.email && (
            <p className="flex-1 text-center text-sm text-[#5C5C5C] py-2">No contact info available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function VendorCard({ vendor, onContact }) {
  return (
    <div className="card-wedding p-5" data-testid="vendor-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-[#2D2D2D] text-base" style={{fontFamily:'Playfair Display,serif'}}>{vendor.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={12} className={s <= Math.round(Number(vendor.rating)) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#EBE5DB]'} />
            ))}
            <span className="text-xs text-[#5C5C5C] ml-1">{vendor.rating != null ? Number(vendor.rating).toFixed(1) : '—'}</span>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-600'}`}>
          {vendor.category}
        </span>
      </div>
      <div className="space-y-1.5 text-sm text-[#5C5C5C]">
        {vendor.contactName && <p className="flex items-center gap-2"><Store size={14} />{vendor.contactName}</p>}
        {vendor.phone && <p className="flex items-center gap-2"><Phone size={14} />{vendor.phone}</p>}
        {vendor.email && <p className="flex items-center gap-2"><Mail size={14} />{vendor.email}</p>}
        {vendor.location && <p className="flex items-center gap-2"><MapPin size={14} />{vendor.location}</p>}
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F0E8]">
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${vendor.isVerified ? 'badge-active' : 'bg-gray-100 text-gray-500'}`}>
          {vendor.isVerified ? 'Verified' : 'Unverified'}
        </span>
        <button onClick={onContact} className="text-xs text-[#C9A84C] font-semibold hover:underline" data-testid="contact-vendor-btn">Contact</button>
      </div>
    </div>
  );
}

function AddVendorModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', category: 'catering', contactName: '', email: '', phone: '', location: 'Kigali, Rwanda', notes: '' });
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
              <input className="input-wedding" placeholder="Jean Doe" value={form.contactName} onChange={(e) => setForm({...form, contactName: e.target.value})} required data-testid="vendor-contact-input" />
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
  const [contactVendor, setContactVendor] = useState(null);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const { data } = await vendorsAPI.list(params);
      setVendors(data.data || data.vendors || []);
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
          {vendors.map(v => <VendorCard key={v.vendorId || v.vendor_id} vendor={v} onContact={() => setContactVendor(v)} />)}
        </div>
      )}
      {showModal && <AddVendorModal onClose={() => setShowModal(false)} onSave={(v) => { setVendors([v, ...vendors]); setShowModal(false); }} />}
      {contactVendor && <ContactVendorModal vendor={contactVendor} onClose={() => setContactVendor(null)} />}
    </div>
  );
}
