import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Loader, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [form, setForm] = useState({ name: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!token) { setPreviewError('No invitation token provided.'); return; }
    authAPI.previewInvitation(token)
      .then(r => setPreview(r.data))
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
      const { data } = await authAPI.acceptInvitation({
        token,
        name: form.name,
        password: form.password,
      });
      login(data.user, data.token);
      navigate('/', { replace: true });
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token || previewError) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl text-center">
          <AlertTriangle size={40} className="text-[#D9534F] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-2">Invalid Invitation</h2>
          <p className="text-sm text-[#5C5C5C]">{previewError || 'No token provided.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full py-2.5 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#b8943f] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
        <Loader size={28} className="animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (preview.expired || preview.accepted) {
    return (
      <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl text-center">
          <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-2">
            {preview.accepted ? 'Already Accepted' : 'Invitation Expired'}
          </h2>
          <p className="text-sm text-[#5C5C5C]">
            {preview.accepted
              ? 'This invitation has already been used. Please log in.'
              : 'This invitation link has expired. Please ask for a new one.'}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-6 w-full py-2.5 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#b8943f] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-[#C9A84C]/10 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-[#C9A84C]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#2D2D2D] leading-tight">Join {preview.tenant_name}</h1>
            <p className="text-xs text-[#5C5C5C]">You're invited as <strong>{preview.role}</strong></p>
          </div>
        </div>

        <div className="bg-[#F5F0E8] rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-[#5C5C5C]">Signing up as</p>
          <p className="text-sm font-semibold text-[#2D2D2D]">{preview.email}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Full Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Min. 8 characters"
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Confirm Password</label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
              placeholder="Repeat password"
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#b8943f] transition-colors flex items-center justify-center gap-2 disabled:opacity-60 mt-1"
          >
            {submitting && <Loader size={14} className="animate-spin" />}
            Create Account & Join
          </button>
        </form>

        <p className="text-xs text-center text-[#5C5C5C] mt-5">
          Already have an account?{' '}
          <button onClick={() => navigate('/login')} className="text-[#C9A84C] hover:underline font-medium">
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
