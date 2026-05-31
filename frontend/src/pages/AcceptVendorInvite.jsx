import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { vendorsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader, AlertTriangle, Store, CheckCircle2 } from 'lucide-react';

const CATEGORIES = [
  'catering', 'decor', 'music', 'photography', 'transport',
  'floristry', 'entertainment', 'venue', 'beauty', 'other',
];

export default function AcceptVendorInvite() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [form, setForm] = useState({
    name: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    category: 'catering',
    phone: '',
    location: '',
    country: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) { setPreviewError('No invitation token provided.'); return; }
    vendorsAPI.previewInvite(token)
      .then((r) => setPreview(r.data))
      .catch(() => setPreviewError('This invitation link is invalid or has expired.'));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setFormError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const { data } = await vendorsAPI.acceptInvite({
        token,
        name: form.name,
        password: form.password,
        businessName: form.businessName,
        category: form.category,
        phone: form.phone || undefined,
        location: form.location || undefined,
        country: form.country || undefined,
        description: form.description || undefined,
      });
      setSuccess(true);
      login(data.user, data.token);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1800);
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create your account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!token || previewError) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl text-center">
          <AlertTriangle size={40} className="text-[#D9534F] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-2">Invalid Invitation</h2>
          <p className="text-sm text-[#5C5C5C] mb-6">{previewError || 'No token provided.'}</p>
          <a href="/" className="btn-gold px-6 py-2.5 inline-block text-sm">Go to Plani</a>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <Loader size={32} className="animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-2">Welcome to Plani!</h2>
          <p className="text-sm text-[#5C5C5C]">Your vendor profile has been created. Redirecting to your dashboard…</p>
          <Loader size={20} className="animate-spin text-[#C9A84C] mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="p-6 border-b border-[#EBE5DB] text-center">
          <div className="w-12 h-12 bg-[#0F4C5C] rounded-xl flex items-center justify-center mx-auto mb-3">
            <Store size={24} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            Set Up Your Vendor Profile
          </h1>
          <p className="text-sm text-[#5C5C5C] mt-1">
            Invited by <strong>{preview.inviterName}</strong> from <strong>{preview.tenantName}</strong>
          </p>
          <p className="text-xs text-[#9C9C9C] mt-0.5">Account email: {preview.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-xl flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          {/* Account section */}
          <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-widest">Your Account</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Your Full Name <span className="text-red-500">*</span>
              </label>
              <input className="input-wedding" placeholder="Jean Uwimana" value={form.name} onChange={set('name')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Password <span className="text-red-500">*</span>
              </label>
              <input type="password" className="input-wedding" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input type="password" className="input-wedding" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
            </div>
          </div>

          {/* Business section */}
          <p className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-widest pt-2">Business Details</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input className="input-wedding" placeholder="Kigali Elite Catering" value={form.businessName} onChange={set('businessName')} required />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select className="input-wedding" value={form.category} onChange={set('category')} required>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Phone</label>
              <input className="input-wedding" placeholder="+250 788 000 000" value={form.phone} onChange={set('phone')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">City / Location</label>
              <input className="input-wedding" placeholder="Kigali, Rwanda" value={form.location} onChange={set('location')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Country</label>
              <input className="input-wedding" placeholder="Rwanda" value={form.country} onChange={set('country')} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Short Description</label>
              <textarea
                className="input-wedding w-full h-20 resize-none text-sm"
                placeholder="Tell event planners about your services…"
                value={form.description}
                onChange={set('description')}
              />
            </div>
          </div>

          <p className="text-xs text-[#9C9C9C]">
            Your profile will be reviewed by a Plani administrator before appearing in the public marketplace.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="w-full btn-gold h-12 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            {submitting ? <Loader size={18} className="animate-spin" /> : 'Create My Vendor Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
