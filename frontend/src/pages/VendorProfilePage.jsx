import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vendorMeAPI } from '../services/api';
import {
  User, MapPin, Phone, Globe, Instagram, Facebook,
  DollarSign, CheckCircle, AlertCircle, Edit3, Save, X,
  Store, Star, Eye, ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'RWF', 'KES', 'UGX', 'TZS', 'NGN', 'GHS', 'ZAR'];

function Badge({ label, color }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#5C5C5C] mb-1 flex items-center gap-1">
        {Icon && <Icon size={12} />} {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] focus:border-[#C9A84C] bg-white text-[#2D2D2D] placeholder-[#9CA3AF]';

export default function VendorProfilePage() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noProfile, setNoProfile] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    contactName: '',
    phone: '',
    location: '',
    bio: '',
    website: '',
    instagram: '',
    facebook: '',
    priceMin: '',
    priceMax: '',
    currency: 'USD',
    isMarketplaceActive: false,
  });

  useEffect(() => {
    vendorMeAPI.me()
      .then((res) => {
        const v = res.data;
        setVendor(v);
        setForm({
          contactName:         v.contactName || '',
          phone:               v.phone || '',
          location:            v.location || '',
          bio:                 v.profile?.bio || '',
          website:             v.profile?.website || '',
          instagram:           v.profile?.instagram || '',
          facebook:            v.profile?.facebook || '',
          priceMin:            v.profile?.priceMin != null ? String(v.profile.priceMin) : '',
          priceMax:            v.profile?.priceMax != null ? String(v.profile.priceMax) : '',
          currency:            v.profile?.currency || 'USD',
          isMarketplaceActive: v.profile?.isMarketplaceActive ?? false,
        });
      })
      .catch(() => {
        setNoProfile(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        contactName:  form.contactName || undefined,
        phone:        form.phone       || undefined,
        location:     form.location    || undefined,
        bio:          form.bio         || undefined,
        website:      form.website     || undefined,
        instagram:    form.instagram   || undefined,
        facebook:     form.facebook    || undefined,
        currency:     form.currency    || undefined,
        isMarketplaceActive: form.isMarketplaceActive,
      };
      if (form.priceMin !== '') payload.priceMin = Number(form.priceMin);
      if (form.priceMax !== '') payload.priceMax = Number(form.priceMax);

      const res = await vendorMeAPI.updateMe(payload);
      setVendor(res.data);
      setEditing(false);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!vendor) return;
    setForm({
      contactName:         vendor.contactName || '',
      phone:               vendor.phone || '',
      location:            vendor.location || '',
      bio:                 vendor.profile?.bio || '',
      website:             vendor.profile?.website || '',
      instagram:           vendor.profile?.instagram || '',
      facebook:            vendor.profile?.facebook || '',
      priceMin:            vendor.profile?.priceMin != null ? String(vendor.profile.priceMin) : '',
      priceMax:            vendor.profile?.priceMax != null ? String(vendor.profile.priceMax) : '',
      currency:            vendor.profile?.currency || 'USD',
      isMarketplaceActive: vendor.profile?.isMarketplaceActive ?? false,
    });
    setEditing(false);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (noProfile) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-[#5C5C5C] hover:text-[#0F4C5C] mb-6 transition-colors">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div className="flex items-start gap-3 bg-[#FBE9E7] border border-[#EF9A9A] rounded-xl px-5 py-5">
          <AlertCircle size={20} className="text-[#BF360C] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[#BF360C]">No vendor profile linked to your account</p>
            <p className="text-xs text-[#BF360C] mt-0.5">Please contact an administrator to link your account to a vendor profile.</p>
          </div>
        </div>
      </div>
    );
  }

  const avgRating = vendor?.rating ? Number(vendor.rating).toFixed(1) : null;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate('/dashboard')} className="flex items-center gap-1.5 text-sm text-[#5C5C5C] hover:text-[#0F4C5C] mb-6 transition-colors">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            My Profile
          </h1>
          <p className="text-sm text-[#5C5C5C] mt-0.5">Manage your vendor business profile</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0F4C5C] text-white text-sm font-semibold hover:bg-[#1A6B82] transition-colors"
          >
            <Edit3 size={15} /> Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:bg-[#F9F9FB] transition-colors"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#B8962A] transition-colors disabled:opacity-60"
            >
              <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Business identity card (read-only) */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)] mb-5 border-l-4 border-[#0F4C5C]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wide mb-1">Business</p>
            <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
              {vendor.name}
            </h2>
            <p className="text-sm text-[#5C5C5C] capitalize mt-0.5">{vendor.category}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vendor.isVerified && (
              <Badge label="✓ Verified" color="bg-[#E8F5EE] text-[#4A7C59]" />
            )}
            {vendor.profile?.isMarketplaceActive
              ? <Badge label="Listed on Marketplace" color="bg-[#E8F4F8] text-[#0F4C5C]" />
              : <Badge label="Not on Marketplace" color="bg-[#F3F4F6] text-[#6B7280]" />
            }
            {avgRating && (
              <Badge label={`★ ${avgRating}`} color="bg-[#FFF3E0] text-[#C9A84C]" />
            )}
          </div>
        </div>
        <p className="text-xs text-[#9CA3AF] mt-3">Business name and category can only be changed by an administrator.</p>
      </div>

      {/* Editable sections */}
      <div className="space-y-5">

        {/* Contact info */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-[#2D2D2D] mb-4 flex items-center gap-2">
            <User size={16} className="text-[#0F4C5C]" /> Contact Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name" icon={User}>
              {editing ? (
                <input className={inputCls} value={form.contactName} onChange={set('contactName')} placeholder="Your name" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.contactName || <span className="text-[#9CA3AF]">Not set</span>}</p>
              )}
            </Field>
            <Field label="Phone" icon={Phone}>
              {editing ? (
                <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+1 234 567 8900" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.phone || <span className="text-[#9CA3AF]">Not set</span>}</p>
              )}
            </Field>
            <Field label="Location" icon={MapPin}>
              {editing ? (
                <input className={inputCls} value={form.location} onChange={set('location')} placeholder="City, Country" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.location || <span className="text-[#9CA3AF]">Not set</span>}</p>
              )}
            </Field>
            <Field label="Email (read-only)" icon={User}>
              <p className="text-sm text-[#9CA3AF] py-1">{vendor.email || '—'}</p>
            </Field>
          </div>
        </div>

        {/* About / Bio */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Store size={16} className="text-[#0F4C5C]" /> About Your Business
          </h3>
          <Field label="Bio / Description">
            {editing ? (
              <textarea
                className={`${inputCls} resize-none h-24`}
                value={form.bio}
                onChange={set('bio')}
                placeholder="Describe your services, experience, and what makes you unique…"
              />
            ) : (
              <p className="text-sm text-[#2D2D2D] py-1 whitespace-pre-wrap">
                {vendor.profile?.bio || <span className="text-[#9CA3AF]">No description added yet</span>}
              </p>
            )}
          </Field>
        </div>

        {/* Online presence */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-[#2D2D2D] mb-4 flex items-center gap-2">
            <Globe size={16} className="text-[#0F4C5C]" /> Online Presence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Website" icon={Globe}>
              {editing ? (
                <input className={inputCls} value={form.website} onChange={set('website')} placeholder="https://yoursite.com" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.profile?.website || <span className="text-[#9CA3AF]">Not set</span>}</p>
              )}
            </Field>
            <Field label="Instagram" icon={Instagram}>
              {editing ? (
                <input className={inputCls} value={form.instagram} onChange={set('instagram')} placeholder="@handle" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.profile?.instagram || <span className="text-[#9CA3AF]">Not set</span>}</p>
              )}
            </Field>
            <Field label="Facebook" icon={Facebook}>
              {editing ? (
                <input className={inputCls} value={form.facebook} onChange={set('facebook')} placeholder="Page name or URL" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.profile?.facebook || <span className="text-[#9CA3AF]">Not set</span>}</p>
              )}
            </Field>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <h3 className="text-sm font-bold text-[#2D2D2D] mb-4 flex items-center gap-2">
            <DollarSign size={16} className="text-[#0F4C5C]" /> Pricing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Minimum Price">
              {editing ? (
                <input className={inputCls} type="number" min="0" value={form.priceMin} onChange={set('priceMin')} placeholder="0" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">
                  {vendor.profile?.priceMin != null
                    ? Number(vendor.profile.priceMin).toLocaleString()
                    : <span className="text-[#9CA3AF]">Not set</span>}
                </p>
              )}
            </Field>
            <Field label="Maximum Price">
              {editing ? (
                <input className={inputCls} type="number" min="0" value={form.priceMax} onChange={set('priceMax')} placeholder="0" />
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">
                  {vendor.profile?.priceMax != null
                    ? Number(vendor.profile.priceMax).toLocaleString()
                    : <span className="text-[#9CA3AF]">Not set</span>}
                </p>
              )}
            </Field>
            <Field label="Currency">
              {editing ? (
                <select className={inputCls} value={form.currency} onChange={set('currency')}>
                  {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              ) : (
                <p className="text-sm text-[#2D2D2D] py-1">{vendor.profile?.currency || 'USD'}</p>
              )}
            </Field>
          </div>
        </div>

        {/* Marketplace visibility */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center">
                <Eye size={18} className="text-[#0F4C5C]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#2D2D2D]">Marketplace Listing</p>
                <p className="text-xs text-[#5C5C5C]">Show your business to clients browsing the marketplace</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={editing ? form.isMarketplaceActive : (vendor.profile?.isMarketplaceActive ?? false)}
                onChange={editing ? set('isMarketplaceActive') : undefined}
                disabled={!editing}
              />
              <div className="w-11 h-6 bg-[#D1D5DB] peer-focus:outline-none rounded-full peer peer-checked:bg-[#0F4C5C] after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>

      </div>

      {/* Save button (bottom, only in edit mode) */}
      {editing && (
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleCancel} className="px-5 py-2.5 rounded-xl border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:bg-[#F9F9FB]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#B8962A] disabled:opacity-60"
          >
            <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
