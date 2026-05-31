import React, { useState } from 'react';
import { X, Mail, Loader, Send } from 'lucide-react';
import { vendorsAPI } from '../services/api';
import { toast } from 'sonner';

export default function InviteVendorModal({ onClose }) {
  const [form, setForm] = useState({ email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await vendorsAPI.inviteVendor({ email: form.email.trim(), message: form.message.trim() || undefined });
      toast.success(`Invitation sent to ${form.email}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
        <div className="p-6 border-b border-[#EBE5DB] flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
              Invite Vendor
            </h2>
            <p className="text-xs text-[#5C5C5C] mt-0.5">
              The vendor will receive an email to set up their own profile.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F5F0E8] text-[#5C5C5C]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
              Vendor Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C9C]" />
              <input
                type="email"
                className="input-wedding pl-9"
                placeholder="vendor@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">
              Personal Message <span className="text-[#9C9C9C] font-normal">(optional)</span>
            </label>
            <textarea
              className="input-wedding w-full h-24 resize-none text-sm"
              placeholder="Tell them why you're inviting them to Plani…"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>

          <div className="bg-[#F5F0E8] rounded-xl p-3 text-xs text-[#5C5C5C]">
            <p className="font-semibold text-[#2D2D2D] mb-1">What happens next?</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>The vendor receives an invitation email from Plani</li>
              <li>They click the link and create their own vendor profile</li>
              <li>Once registered, you can connect them to events</li>
            </ul>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm hover:bg-[#F5F0E8] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-gold h-11 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : <><Send size={15} /> Send Invite</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
