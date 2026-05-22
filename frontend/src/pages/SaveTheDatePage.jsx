import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Sparkles, Download, X, Upload, Trash2,
  Edit3, Send, RefreshCw, Eye, Calendar,
  MapPin, Users, ChevronRight, Link, Copy, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import SubscriptionGate from '../components/subscription/SubscriptionGate';
import api from '../services/api';

const TEMPLATES = [
  { id: 'elegant-floral',    name: 'Elegant Floral',      color: '#C9A84C', emoji: '🌸' },
  { id: 'modern-minimal',    name: 'Modern Minimal',       color: '#2D2D2D', emoji: '◼' },
  { id: 'rustic-garden',     name: 'Rustic Garden',        color: '#4A7C59', emoji: '🌿' },
  { id: 'rwandan-tradition', name: 'Rwandan Traditional',  color: '#D4A373', emoji: '🎨' },
  { id: 'corporate-clean',   name: 'Corporate Clean',      color: '#6B8E9B', emoji: '💼' },
];

const STATUS_STYLE = {
  published: 'bg-[#4A7C59] text-white',
  generated:  'bg-[#C9A84C20] text-[#9A7D2E]',
  draft:      'bg-[#EBE5DB] text-[#5C5C5C]',
};

// ─── Shared card preview ──────────────────────────────────────────────────────
function CardPreview({ design, height = 240 }) {
  const tc = (typeof design.textContent === 'object' && design.textContent) ? design.textContent : {};
  const ai = tc.aiGenerated || {};
  const primaryColor = (typeof design.style === 'object' && design.style?.primaryColor) || '#C9A84C';

  const names   = ai.coupleNames || tc.headline || design.title;
  const date    = ai.date    || tc.eventDate || '';
  const venue   = ai.venue   || tc.venue     || '';
  const tagline = ai.tagline || '';
  const template = TEMPLATES.find(t => t.id === design.templateId);

  if (design.uploadedPhoto) {
    return (
      <div className="relative w-full overflow-hidden rounded-t-2xl" style={{ height }}>
        <img src={design.uploadedPhoto} alt="Couple" className="w-full h-full object-cover" />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.78) 35%, rgba(255,255,255,0) 58%)' }}
        />
        <div className="absolute top-0 left-0 right-0 px-5 pt-5 text-center">
          <p className="text-[10px] font-semibold tracking-[4px]" style={{ color: primaryColor }}>SAVE THE DATE</p>
          <h3 className="text-2xl mt-2 font-serif italic text-[#2D2D2D] leading-tight">{names}</h3>
          {date  && <p className="text-xs text-[#5C5C5C] mt-1.5">{date}</p>}
          {venue && <p className="text-[10px] text-[#7A7A7A] mt-0.5">{venue}</p>}
          {tagline && <p className="text-[10px] italic mt-1" style={{ color: primaryColor }}>{tagline}</p>}
        </div>
      </div>
    );
  }

  if (design.generatedImageUrl) {
    return (
      <div className="rounded-t-2xl overflow-hidden bg-[#FDF8F0]" style={{ height }}>
        <img
          src={design.generatedImageUrl}
          alt={design.title}
          className="w-full h-full object-contain"
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center rounded-t-2xl px-6 text-center"
      style={{ height, background: `linear-gradient(135deg, ${primaryColor}14, ${primaryColor}2A)` }}
    >
      <p className="text-[10px] font-semibold tracking-[4px] mb-3" style={{ color: primaryColor }}>SAVE THE DATE</p>
      <h3 className="text-2xl font-serif italic text-[#2D2D2D] mb-2 leading-tight">{names || design.title}</h3>
      {date  && <p className="text-xs text-[#5C5C5C] mt-1">{date}</p>}
      {venue && <p className="text-[10px] text-[#9A9A9A] mt-0.5">{venue}</p>}
      {!date && !venue && (
        <p className="text-xs text-[#9A9A9A] mt-2">{template?.emoji || '✨'} {template?.name || 'Custom'}</p>
      )}
    </div>
  );
}

// ─── Grid card ────────────────────────────────────────────────────────────────
function DesignCard({ design, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all cursor-pointer group"
    >
      <CardPreview design={design} height={220} />

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className="font-semibold text-[#2D2D2D] text-sm truncate">{design.title}</h3>
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[design.status] || STATUS_STYLE.draft}`}>
            {design.status}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[#9CA3AF]">
            {new Date(design.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <span className="flex items-center gap-1 text-xs text-[#C9A84C] font-medium group-hover:gap-2 transition-all">
            Open <ChevronRight size={12} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────
function DesignDetailModal({ design: initialDesign, onClose, onUpdate, onDelete }) {
  const [design, setDesign]       = useState(initialDesign);
  const [tab, setTab]             = useState('preview'); // 'preview' | 'edit'
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef(null);

  const tc = (typeof design.textContent === 'object' && design.textContent) ? design.textContent : {};
  const [editForm, setEditForm] = useState({
    title:     design.title || '',
    headline:  tc.headline  || '',
    eventDate: tc.eventDate || '',
    venue:     tc.venue     || '',
    rsvpInfo:  tc.rsvpInfo  || '',
    primaryColor: (typeof design.style === 'object' && design.style?.primaryColor) || '#C9A84C',
  });

  const setField = (key) => (e) => setEditForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch(`/save-the-date/${design.designId}`, {
        title: editForm.title,
        textContent: {
          ...tc,
          headline:  editForm.headline,
          eventDate: editForm.eventDate,
          venue:     editForm.venue,
          rsvpInfo:  editForm.rsvpInfo,
        },
        style: { ...(design.style || {}), primaryColor: editForm.primaryColor },
      });
      const updated = res.data;
      setDesign(updated);
      onUpdate(updated);
      setTab('preview');
      toast.success('Design saved');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/save-the-date/${design.designId}/generate`);
      const updated = res.data;
      setDesign(updated);
      onUpdate(updated);
      toast.success('AI design regenerated!');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    try {
      let res;
      if (design.status === 'published') {
        res = await api.post(`/save-the-date/${design.designId}/unpublish`);
      } else {
        res = await api.post(`/save-the-date/${design.designId}/publish`);
      }
      const updated = res.data;
      setDesign(updated);
      onUpdate(updated);
      toast.success(design.status === 'published' ? 'Design unpublished' : 'Design published! Share the link with guests.');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update status');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/save-the-date/${design.designId}`);
      onDelete(design.designId);
      onClose();
      toast.success('Design deleted');
    } catch {
      toast.error('Failed to delete design');
      setDeleting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('photo', file);
    try {
      const res = await api.post(`/save-the-date/${design.designId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = res.data;
      setDesign(updated);
      onUpdate(updated);
      toast.success('Photo updated');
    } catch {
      toast.error('Failed to upload photo');
    }
  };

  const ai = tc.aiGenerated || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EAE0]">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="font-bold text-[#2D2D2D] truncate" style={{ fontFamily: 'Georgia,serif', fontSize: 18 }}>
              {design.title}
            </h2>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_STYLE[design.status] || STATUS_STYLE.draft}`}>
              {design.status}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#9CA3AF] hover:text-[#2D2D2D] transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 px-6 pt-3 pb-0 border-b border-[#F0EAE0]">
          {[
            { key: 'preview', label: 'Preview', icon: Eye },
            { key: 'edit',    label: 'Edit',    icon: Edit3 },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === key
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#2D2D2D]'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Preview tab ── */}
          {tab === 'preview' && (
            <div className="flex flex-col md:flex-row gap-0">
              {/* Left: card preview */}
              <div className="md:w-[55%] bg-[#FAF7F2] flex items-center justify-center p-6">
                <div className="w-full max-w-xs rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
                  <CardPreview design={design} height={320} />
                  {/* Bottom strip */}
                  <div className="bg-white px-4 py-3 text-center border-t border-[#F0EAE0]">
                    <p className="text-[10px] text-[#9CA3AF]">
                      Created {new Date(design.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: info + actions */}
              <div className="md:w-[45%] p-6 flex flex-col gap-4">
                {/* Card details */}
                <div className="space-y-3">
                  {(ai.coupleNames || tc.headline) && (
                    <div className="flex items-start gap-2">
                      <Users size={14} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Couple</p>
                        <p className="text-sm font-medium text-[#2D2D2D]">{ai.coupleNames || tc.headline}</p>
                      </div>
                    </div>
                  )}
                  {(ai.date || tc.eventDate) && (
                    <div className="flex items-start gap-2">
                      <Calendar size={14} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Date</p>
                        <p className="text-sm font-medium text-[#2D2D2D]">{ai.date || tc.eventDate}</p>
                      </div>
                    </div>
                  )}
                  {(ai.venue || tc.venue) && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-[#C9A84C] mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">Venue</p>
                        <p className="text-sm font-medium text-[#2D2D2D]">{ai.venue || tc.venue}</p>
                      </div>
                    </div>
                  )}
                  {ai.tagline && (
                    <div className="p-3 rounded-xl bg-[#FDF8F0] italic text-sm text-[#5C5C5C]">
                      "{ai.tagline}"
                    </div>
                  )}
                </div>

                <hr className="border-[#F0EAE0]" />

                {/* Action buttons */}
                <div className="space-y-2.5">
                  <button
                    onClick={handleRegenerate}
                    disabled={generating}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#9A7D2E] transition-colors disabled:opacity-50"
                  >
                    {generating ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                    {generating ? 'Regenerating…' : 'Regenerate with AI'}
                  </button>

                  <div className="flex gap-2">
                    {/* Change photo */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#EBE5DB] rounded-xl text-xs text-[#5C5C5C] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
                    >
                      <Upload size={13} /> {design.uploadedPhoto ? 'Change Photo' : 'Add Photo'}
                    </button>
                    <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />

                    {/* Download */}
                    {design.generatedImageUrl && (
                      <a
                        href={design.generatedImageUrl}
                        download={`${design.title}.svg`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-[#EBE5DB] rounded-xl text-xs text-[#5C5C5C] hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors"
                      >
                        <Download size={13} /> Download
                      </a>
                    )}
                  </div>

                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-40 ${
                      design.status === 'published'
                        ? 'border border-[#4A7C59] text-[#4A7C59] hover:bg-[#E8F5EE]'
                        : 'border border-[#0F4C5C] text-[#0F4C5C] hover:bg-[#E8F4F8]'
                    }`}
                  >
                    {publishing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    {design.status === 'published' ? 'Unpublish' : 'Publish & Share'}
                  </button>
                </div>

                {/* Share link — only when published */}
                {design.status === 'published' && (() => {
                  const shareUrl = `${window.location.origin}/card/${design.designId}`;
                  const handleCopy = () => {
                    navigator.clipboard.writeText(shareUrl).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2500);
                    });
                  };
                  return (
                    <div className="rounded-xl border border-[#4A7C59]/30 bg-[#E8F5EE] p-3">
                      <p className="text-[10px] font-semibold text-[#4A7C59] uppercase tracking-wide mb-2 flex items-center gap-1">
                        <Link size={11} /> Shareable Link
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-xs text-[#2D2D2D] truncate font-mono bg-white rounded-lg px-2 py-1.5 border border-[#4A7C59]/20">
                          {shareUrl}
                        </p>
                        <button
                          onClick={handleCopy}
                          className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#4A7C59] text-white text-xs font-semibold hover:bg-[#3A6B49] transition-colors"
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <p className="text-[10px] text-[#4A7C59] mt-1.5">Anyone with this link can view the card</p>
                    </div>
                  );
                })()}

                <hr className="border-[#F0EAE0]" />

                {/* Delete */}
                {!confirmDelete ? (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#D9534F] hover:bg-[#FEF2F2] rounded-xl transition-colors"
                  >
                    <Trash2 size={13} /> Delete Design
                  </button>
                ) : (
                  <div className="bg-[#FEF2F2] rounded-xl p-3 text-center">
                    <p className="text-xs text-[#D9534F] font-medium mb-2">Delete this design permanently?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="flex-1 py-1.5 rounded-lg border border-[#EBE5DB] text-xs text-[#5C5C5C]"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="flex-1 py-1.5 rounded-lg bg-[#D9534F] text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Yes, Delete'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Edit tab ── */}
          {tab === 'edit' && (
            <div className="p-6 space-y-4 max-w-lg mx-auto">
              <p className="text-sm text-[#5C5C5C]">Edit the details and save — then regenerate the AI card to apply changes.</p>

              <div>
                <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Design Title</label>
                <input
                  value={editForm.title}
                  onChange={setField('title')}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] focus:border-[#C9A84C]"
                />
              </div>

              {[
                { key: 'headline',  label: 'Couple Names',  placeholder: 'e.g., Amina & Jean' },
                { key: 'eventDate', label: 'Event Date',     placeholder: 'e.g., 15 March 2026' },
                { key: 'venue',     label: 'Venue',          placeholder: 'e.g., The Grand Hotel, Paris' },
                { key: 'rsvpInfo',  label: 'RSVP Info',      placeholder: 'e.g., RSVP by 1 February' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">{label}</label>
                  <input
                    value={editForm[key]}
                    onChange={setField(key)}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] focus:border-[#C9A84C]"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-[#5C5C5C] mb-2">Card Color</label>
                <div className="flex gap-2">
                  {['#C9A84C', '#E8A4B8', '#4A7C59', '#6B8E9B', '#2D2D2D', '#D4A373'].map(c => (
                    <button
                      key={c}
                      onClick={() => setEditForm(f => ({ ...f, primaryColor: c }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${editForm.primaryColor === c ? 'border-[#2D2D2D] scale-110' : 'border-transparent hover:scale-105'}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setTab('preview')}
                  className="flex-1 py-2.5 rounded-xl border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:border-[#C9A84C]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#9A7D2E] disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#FDF8F0] flex items-center gap-2 text-xs text-[#9A7D2E]">
                <Sparkles size={13} />
                After saving, go to Preview and click <strong>Regenerate with AI</strong> to update the card design.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New design modal ─────────────────────────────────────────────────────────
function NewDesignModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    templateId: 'elegant-floral',
    textContent: { headline: '', eventDate: '', venue: '', rsvpInfo: '' },
    style: { primaryColor: '#C9A84C', layout: 'centered' },
    photo: null,
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setForm(f => ({ ...f, photo: null }));
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { photo, ...formData } = form;

      const res = await api.post('/save-the-date', formData);
      const designId = res.data?.designId || res.data?.design_id;
      if (!designId) throw new Error('No design ID returned');

      if (photo) {
        const fd = new FormData();
        fd.append('photo', photo);
        await api.post(`/save-the-date/${designId}/photo`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      await api.post(`/save-the-date/${designId}/generate`);

      const updated = await api.get(`/save-the-date/${designId}`);
      onCreated(updated.data);
      onClose();
      toast.success('Save-the-date created!');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to create design');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Georgia, serif' }}>
              New Save-the-Date
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex gap-1">
                {[1, 2, 3].map(s => (
                  <div key={s} className={`h-1.5 w-8 rounded-full transition-colors ${step >= s ? 'bg-[#C9A84C]' : 'bg-[#EBE5DB]'}`} />
                ))}
              </div>
              <button onClick={onClose} className="text-[#9A9A9A] hover:text-[#2D2D2D]"><X size={18} /></button>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Design Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Amina & John's Wedding"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-2">Choose Template</label>
                <div className="grid grid-cols-3 gap-2">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setForm(f => ({ ...f, templateId: t.id, style: { ...f.style, primaryColor: t.color } }))}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${form.templateId === t.id ? 'border-[#C9A84C] bg-[#C9A84C08]' : 'border-[#EBE5DB] hover:border-[#C9A84C80]'}`}
                    >
                      <div className="text-2xl mb-1">{t.emoji}</div>
                      <p className="text-[10px] text-[#5C5C5C] leading-tight">{t.name}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-[#5C5C5C] mb-2">AI will craft the card wording from these details.</p>
              {[
                { key: 'headline',  label: 'Couple Names', placeholder: 'e.g., Amina & Jean' },
                { key: 'eventDate', label: 'Event Date',   placeholder: 'e.g., 15 March 2026' },
                { key: 'venue',     label: 'Venue',        placeholder: 'e.g., The Grand Hotel, Paris' },
                { key: 'rsvpInfo',  label: 'RSVP Info',    placeholder: 'e.g., RSVP by 1 February' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-[#2D2D2D] mb-1">{label}</label>
                  <input
                    value={form.textContent[key]}
                    onChange={e => setForm(f => ({ ...f, textContent: { ...f.textContent, [key]: e.target.value } }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
                  />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Couple Photo</label>
                <p className="text-xs text-[#5C5C5C] mb-3">Upload a photo to feature prominently on your card.</p>
                {photoPreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={photoPreview} alt="Preview" className="w-full h-48 object-cover" />
                    <button onClick={removePhoto} className="absolute top-2 right-2 bg-white/90 rounded-full p-1 shadow-sm hover:bg-white">
                      <X size={14} className="text-[#E74C3C]" />
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-[#EBE5DB] rounded-xl cursor-pointer hover:border-[#C9A84C] hover:bg-[#FDF8F0] transition-all"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload size={24} className="text-[#C9A84C] mb-2" />
                    <p className="text-sm text-[#5C5C5C] font-medium">Click to upload couple photo</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">JPG, PNG, WEBP — up to 8 MB</p>
                  </div>
                )}
                <input ref={fileRef} type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2D2D2D] mb-2">Card Color</label>
                <div className="flex gap-2">
                  {['#C9A84C', '#E8A4B8', '#4A7C59', '#6B8E9B', '#2D2D2D', '#D4A373'].map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, style: { ...f.style, primaryColor: color } }))}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.style.primaryColor === color ? 'border-[#2D2D2D] scale-110' : 'border-transparent'}`}
                      style={{ background: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#FDF8F0] flex items-center gap-3">
                <Sparkles size={16} className="text-[#C9A84C] flex-shrink-0" />
                <p className="text-xs text-[#5C5C5C]">Llama Vision AI will craft the perfect wording and generate your card design.</p>
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {step > 1 && (
              <button onClick={() => setStep(s => s - 1)} className="flex-1 py-2.5 rounded-full border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:border-[#C9A84C]">
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                disabled={step === 1 && !form.title.trim()}
                className="flex-1 py-2.5 rounded-full bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#9A7D2E] disabled:opacity-40"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 py-2.5 rounded-full bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#9A7D2E] disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Sparkles size={14} />
                {loading ? 'Creating…' : 'Create & Generate'}
              </button>
            )}
            {step === 1 && (
              <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:border-[#C9A84C]">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SaveTheDatePage() {
  const [designs, setDesigns]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [activeDesign, setActiveDesign] = useState(null);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/save-the-date');
      const payload = res.data;
      const arr = Array.isArray(payload)
        ? payload
        : (payload.data || payload.designs || payload.content || []);
      setDesigns(Array.isArray(arr) ? arr : []);
    } catch {
      setDesigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDesigns(); }, []);

  const handleUpdate = (updated) => {
    setDesigns(prev => prev.map(d =>
      (d.designId || d.design_id) === (updated.designId || updated.design_id) ? updated : d
    ));
    // keep detail modal in sync
    if (activeDesign && (activeDesign.designId || activeDesign.design_id) === (updated.designId || updated.design_id)) {
      setActiveDesign(updated);
    }
  };

  const handleDelete = (designId) => {
    setDesigns(prev => prev.filter(d => (d.designId || d.design_id) !== designId));
    setActiveDesign(null);
  };

  return (
    <SubscriptionGate feature="save_the_date">
      <div className="p-4 md:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Georgia, serif' }}>
              Save-the-Date Studio
            </h1>
            <p className="text-[#5C5C5C] mt-1">AI-powered invitation cards with couple photo support</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-full font-semibold text-sm hover:bg-[#9A7D2E] transition-colors shadow-md"
          >
            <Plus size={16} /> New Design
          </button>
        </div>

        {/* Stats bar */}
        {!loading && designs.length > 0 && (
          <div className="flex gap-4 mb-6 text-sm text-[#5C5C5C]">
            <span><strong className="text-[#2D2D2D]">{designs.length}</strong> design{designs.length !== 1 ? 's' : ''}</span>
            <span>·</span>
            <span><strong className="text-[#4A7C59]">{designs.filter(d => d.status === 'published').length}</strong> published</span>
            <span>·</span>
            <span><strong className="text-[#C9A84C]">{designs.filter(d => d.status === 'generated').length}</strong> generated</span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-72 animate-pulse" />)}
          </div>
        ) : designs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="text-6xl mb-4">💌</div>
            <h3 className="text-xl font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Georgia, serif' }}>No designs yet</h3>
            <p className="text-[#5C5C5C] mb-6">Create your first AI-powered save-the-date with a couple photo</p>
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-[#C9A84C] text-white rounded-full font-semibold hover:bg-[#9A7D2E] transition-colors"
            >
              Create First Design
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {designs.map(d => (
              <DesignCard
                key={d.designId || d.design_id}
                design={d}
                onClick={() => setActiveDesign(d)}
              />
            ))}
          </div>
        )}

        {/* Modals */}
        {showModal && (
          <NewDesignModal
            onClose={() => setShowModal(false)}
            onCreated={d => { setDesigns(prev => [d, ...prev]); setActiveDesign(d); }}
          />
        )}

        {activeDesign && (
          <DesignDetailModal
            design={activeDesign}
            onClose={() => setActiveDesign(null)}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}
      </div>
    </SubscriptionGate>
  );
}
