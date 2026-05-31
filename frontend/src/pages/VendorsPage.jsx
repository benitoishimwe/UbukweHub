import React, { useEffect, useState, useCallback } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { vendorsAPI } from '../services/api';
import {
  Search, Star, Store, Phone, Mail, MapPin, Loader, X,
  Copy, CheckCheck, ExternalLink, CheckCircle, XCircle, Clock,
  Globe, StickyNote, Pencil, UserPlus,
} from 'lucide-react';
import { toast } from 'sonner';
import InviteVendorModal from '../components/InviteVendorModal';

const CATEGORY_COLORS = {
  catering:      'bg-orange-100 text-orange-700',
  decor:         'bg-pink-100 text-pink-700',
  music:         'bg-purple-100 text-purple-700',
  photography:   'bg-blue-100 text-blue-700',
  transport:     'bg-green-100 text-green-700',
  floristry:     'bg-rose-100 text-rose-700',
  entertainment: 'bg-violet-100 text-violet-700',
};

const STATUS_UI = {
  approved: { label: 'Approved',       cls: 'text-emerald-700 bg-emerald-50', Icon: CheckCircle },
  rejected: { label: 'Rejected',       cls: 'text-red-700 bg-red-50',         Icon: XCircle    },
  pending:  { label: 'Pending Review', cls: 'text-amber-700 bg-amber-50',     Icon: Clock      },
};

function approvalStatus(v) {
  if (v.approvedByAdmin) return 'approved';
  if (v.rejectedReason)  return 'rejected';
  return 'pending';
}

function isLive(v) {
  return v.isPublic && v.onboardingComplete && v.approvedByAdmin && v.isActive;
}

// ── Vendor Detail Modal (unified operations) ──────────────────────────────────
function VendorDetailModal({ vendor: init, onClose, onUpdated }) {
  const [vendor,       setVendor]       = useState(init);
  const [editing,      setEditing]      = useState(false);
  const [form,         setForm]         = useState({
    name:        init.name        || '',
    category:    init.category    || 'catering',
    contactName: init.contactName || '',
    email:       init.email       || '',
    phone:       init.phone       || '',
    location:    init.location    || '',
  });
  const [notes,        setNotes]        = useState(init.internalNotes || '');
  const [notesOpen,    setNotesOpen]    = useState(false);
  const [copied,       setCopied]       = useState('');
  const [editSaving,   setEditSaving]   = useState(false);
  const [notesSaving,  setNotesSaving]  = useState(false);
  const [approveSaving,setApproveSaving]= useState(false);
  const [rejectOpen,   setRejectOpen]   = useState(false);
  const [rejectReason, setRejectReason] = useState(init.rejectedReason || '');
  const [rejectSaving, setRejectSaving] = useState(false);

  const status = approvalStatus(vendor);
  const { label: statusLabel, cls: statusCls, Icon: StatusIcon } = STATUS_UI[status];
  const pal    = CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-600';
  const rating = vendor.rating != null ? Number(vendor.rating) : null;

  const update = (patch) => {
    const updated = { ...vendor, ...patch };
    setVendor(updated);
    onUpdated(updated);
  };

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    try {
      const { data } = await vendorsAPI.update(vendor.vendorId, form);
      update({ ...form, ...data });
      setEditing(false);
      toast.success('Vendor updated');
    } catch { toast.error('Failed to update vendor'); }
    finally { setEditSaving(false); }
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm({
      name:        vendor.name        || '',
      category:    vendor.category    || 'catering',
      contactName: vendor.contactName || '',
      email:       vendor.email       || '',
      phone:       vendor.phone       || '',
      location:    vendor.location    || '',
    });
  };

  const handleSaveNotes = async () => {
    setNotesSaving(true);
    try {
      await vendorsAPI.updateInternalNotes(vendor.vendorId, notes);
      update({ internalNotes: notes });
      setNotesOpen(false);
      toast.success('Notes saved');
    } catch { toast.error('Failed to save notes'); }
    finally { setNotesSaving(false); }
  };

  const handleApprove = async () => {
    setApproveSaving(true);
    try {
      const { data } = await vendorsAPI.approve(vendor.vendorId);
      update(data);
      toast.success(`${vendor.name} approved`);
    } catch { toast.error('Failed to approve vendor'); }
    finally { setApproveSaving(false); }
  };

  const handleReject = async () => {
    setRejectSaving(true);
    try {
      const { data } = await vendorsAPI.reject(vendor.vendorId, { reason: rejectReason });
      update(data);
      setRejectOpen(false);
      toast.success(`${vendor.name} rejected`);
    } catch { toast.error('Failed to reject vendor'); }
    finally { setRejectSaving(false); }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl animate-scale-in max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-[#EBE5DB] flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editing ? (
                <input
                  className="input-wedding font-bold text-lg"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              ) : (
                <h2 className="text-xl font-bold text-[#2D2D2D] truncate" style={{ fontFamily: 'Playfair Display,serif' }}>
                  {vendor.name}
                </h2>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {editing ? (
                  <select
                    className="input-wedding text-xs py-1 h-8 w-auto"
                    value={form.category}
                    onChange={e => setForm({ ...form, category: e.target.value })}
                  >
                    {['catering','decor','music','photography','transport','floristry','entertainment'].map(c => (
                      <option key={c} value={c} className="capitalize">{c}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${pal}`}>{vendor.category}</span>
                )}
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusCls}`}>
                  <StatusIcon size={11} /> {statusLabel}
                </span>
                {vendor.isVerified && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">Verified</span>
                )}
                {isLive(vendor) && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-600 bg-emerald-50">
                    <Globe size={10} /> Live
                  </span>
                )}
              </div>
              {rating !== null && (
                <div className="flex items-center gap-1 mt-1.5">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={12} className={s <= Math.round(rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#EBE5DB]'} />
                  ))}
                  <span className="text-xs text-[#5C5C5C] ml-1">{rating.toFixed(1)}</span>
                  {vendor.ratingCount > 0 && (
                    <span className="text-xs text-[#9C9C9C]">· {vendor.ratingCount} review{vendor.ratingCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              )}
            </div>

            {/* Edit / Close controls */}
            <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg hover:bg-[#F5F0E8] text-[#9C9C9C] hover:text-[#C9A84C] transition-colors"
                  title="Edit vendor"
                >
                  <Pencil size={15} />
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    className="px-3 py-1.5 text-xs rounded-lg border border-[#EBE5DB] text-[#5C5C5C] hover:bg-[#F5F0E8]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className="px-3 py-1.5 text-xs rounded-lg bg-[#C9A84C] text-white font-semibold flex items-center gap-1"
                  >
                    {editSaving ? <Loader size={12} className="animate-spin" /> : 'Save'}
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#F5F0E8] text-[#5C5C5C]">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">

          {/* Contact Information */}
          <section>
            <h3 className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-widest mb-3">Contact Information</h3>
            <div className="space-y-2">

              {/* Contact person */}
              <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
                <Store size={14} className="text-[#C9A84C] shrink-0" />
                {editing ? (
                  <input
                    className="flex-1 bg-transparent text-sm text-[#2D2D2D] outline-none placeholder-[#9C9C9C]"
                    placeholder="Contact person"
                    value={form.contactName}
                    onChange={e => setForm({ ...form, contactName: e.target.value })}
                  />
                ) : (
                  <div>
                    <p className="text-[10px] text-[#5C5C5C]">Contact Person</p>
                    <p className="text-sm font-medium text-[#2D2D2D]">{vendor.contactName || '—'}</p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Phone size={14} className="text-[#C9A84C] shrink-0" />
                  {editing ? (
                    <input
                      className="flex-1 bg-transparent text-sm text-[#2D2D2D] outline-none placeholder-[#9C9C9C]"
                      placeholder="+250788…"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#5C5C5C]">Phone</p>
                      <p className="text-sm font-medium text-[#2D2D2D]">{vendor.phone || '—'}</p>
                    </div>
                  )}
                </div>
                {!editing && vendor.phone && (
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => copy(vendor.phone, 'Phone')} className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C]">
                      {copied === 'Phone' ? <CheckCheck size={14} className="text-[#4A7C59]" /> : <Copy size={14} />}
                    </button>
                    <a href={`tel:${vendor.phone}`} className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C]">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Mail size={14} className="text-[#C9A84C] shrink-0" />
                  {editing ? (
                    <input
                      className="flex-1 bg-transparent text-sm text-[#2D2D2D] outline-none placeholder-[#9C9C9C]"
                      type="email"
                      placeholder="vendor@example.rw"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                    />
                  ) : (
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#5C5C5C]">Email</p>
                      <p className="text-sm font-medium text-[#2D2D2D] truncate">{vendor.email || '—'}</p>
                    </div>
                  )}
                </div>
                {!editing && vendor.email && (
                  <div className="flex gap-1 ml-2 shrink-0">
                    <button onClick={() => copy(vendor.email, 'Email')} className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C]">
                      {copied === 'Email' ? <CheckCheck size={14} className="text-[#4A7C59]" /> : <Copy size={14} />}
                    </button>
                    <a href={`mailto:${vendor.email}`} className="p-1.5 rounded-lg hover:bg-white text-[#5C5C5C] hover:text-[#C9A84C]">
                      <ExternalLink size={14} />
                    </a>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl bg-[#F5F0E8]">
                <MapPin size={14} className="text-[#C9A84C] shrink-0" />
                {editing ? (
                  <input
                    className="flex-1 bg-transparent text-sm text-[#2D2D2D] outline-none placeholder-[#9C9C9C]"
                    placeholder="Location"
                    value={form.location}
                    onChange={e => setForm({ ...form, location: e.target.value })}
                  />
                ) : (
                  <div>
                    <p className="text-[10px] text-[#5C5C5C]">Location</p>
                    <p className="text-sm font-medium text-[#2D2D2D]">{vendor.location || '—'}</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Approval & Actions */}
          <section>
            <h3 className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-widest mb-3">Approval &amp; Actions</h3>

            {vendor.rejectedReason && (
              <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mb-3 flex items-start gap-1.5">
                <XCircle size={12} className="shrink-0 mt-0.5" />
                <span>{vendor.rejectedReason}</span>
              </div>
            )}

            {/* Quick contact + approval row */}
            {!rejectOpen && (
              <div className="flex flex-wrap gap-2">
                {vendor.phone && (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBE5DB] text-[#5C5C5C] text-xs font-semibold hover:bg-[#F5F0E8] transition-colors"
                  >
                    <Phone size={13} /> Call
                  </a>
                )}
                {vendor.email && (
                  <a
                    href={`mailto:${vendor.email}`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#EBE5DB] text-[#5C5C5C] text-xs font-semibold hover:bg-[#F5F0E8] transition-colors"
                  >
                    <Mail size={13} /> Email
                  </a>
                )}
                <div className="ml-auto flex gap-2">
                  {status !== 'approved' && (
                    <button
                      onClick={handleApprove}
                      disabled={approveSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                    >
                      {approveSaving
                        ? <Loader size={12} className="animate-spin" />
                        : <><CheckCircle size={13} /> Approve</>
                      }
                    </button>
                  )}
                  {status !== 'rejected' && (
                    <button
                      onClick={() => setRejectOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-100 hover:bg-red-500 text-red-600 hover:text-white text-xs font-semibold transition-colors"
                    >
                      <XCircle size={13} /> Reject
                    </button>
                  )}
                  {status === 'rejected' && (
                    <button
                      onClick={handleApprove}
                      disabled={approveSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors"
                    >
                      {approveSaving ? <Loader size={12} className="animate-spin" /> : <><CheckCircle size={13} /> Re-approve</>}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Inline reject form */}
            {rejectOpen && (
              <div className="space-y-2 bg-red-50 p-4 rounded-xl">
                <p className="text-xs font-semibold text-red-700">Rejection reason (optional)</p>
                <textarea
                  className="input-wedding w-full h-20 resize-none text-sm"
                  placeholder="Incomplete profile, duplicate listing…"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setRejectOpen(false)}
                    className="flex-1 px-3 py-2 rounded-xl border border-[#EBE5DB] text-[#5C5C5C] text-xs font-semibold hover:bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={rejectSaving}
                    className="flex-1 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-semibold flex items-center justify-center transition-colors"
                  >
                    {rejectSaving ? <Loader size={12} className="animate-spin" /> : 'Confirm Reject'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Internal Notes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-semibold text-[#9C9C9C] uppercase tracking-widest">Internal Notes</h3>
              <button
                onClick={() => { setNotesOpen(!notesOpen); setNotes(vendor.internalNotes || ''); }}
                className="text-xs text-[#C9A84C] font-semibold hover:underline"
              >
                {notesOpen ? 'Close' : vendor.internalNotes ? 'Edit' : 'Add Note'}
              </button>
            </div>

            {!notesOpen && vendor.internalNotes && (
              <div className="flex items-start gap-2 bg-amber-50 px-3 py-2.5 rounded-xl">
                <StickyNote size={13} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">{vendor.internalNotes}</p>
              </div>
            )}
            {!notesOpen && !vendor.internalNotes && (
              <p className="text-xs text-[#9C9C9C] italic">No internal notes yet</p>
            )}

            {notesOpen && (
              <div className="space-y-2">
                <textarea
                  className="input-wedding w-full h-28 resize-none text-sm"
                  placeholder="Private notes about this vendor (not visible to them)…"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
                <p className="text-[10px] text-[#9C9C9C]">Only visible to tenant admins.</p>
                <button
                  onClick={handleSaveNotes}
                  disabled={notesSaving}
                  className="btn-gold h-9 px-5 text-xs font-semibold flex items-center gap-1.5"
                >
                  {notesSaving ? <Loader size={12} className="animate-spin" /> : 'Save Notes'}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}


// ── Vendor Card ───────────────────────────────────────────────────────────────
function VendorCard({ vendor, onClick }) {
  const status = approvalStatus(vendor);
  const live   = isLive(vendor);
  const { label, cls, Icon } = STATUS_UI[status];

  return (
    <div
      className="card-wedding p-5 cursor-pointer hover:shadow-md transition-shadow"
      data-testid="vendor-card"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#2D2D2D] text-base truncate" style={{fontFamily:'Playfair Display,serif'}}>{vendor.name}</h3>
          <div className="flex items-center gap-1 mt-1">
            {[1,2,3,4,5].map(s => <Star key={s} size={11} className={s <= Math.round(Number(vendor.rating || 0)) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#EBE5DB]'} />)}
            <span className="text-xs text-[#5C5C5C] ml-1">{vendor.rating != null ? Number(vendor.rating).toFixed(1) : '—'}</span>
            {vendor.ratingCount > 0 && <span className="text-xs text-[#9C9C9C]">({vendor.ratingCount})</span>}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize shrink-0 ml-2 ${CATEGORY_COLORS[vendor.category] || 'bg-gray-100 text-gray-600'}`}>
          {vendor.category}
        </span>
      </div>

      <div className="space-y-1 text-sm text-[#5C5C5C] mb-3">
        {vendor.contactName && <p className="flex items-center gap-2 truncate"><Store size={13} />{vendor.contactName}</p>}
        {vendor.phone       && <p className="flex items-center gap-2 truncate"><Phone size={13} />{vendor.phone}</p>}
        {vendor.location    && <p className="flex items-center gap-2 truncate"><MapPin size={13} />{vendor.location}</p>}
      </div>

      <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-3 ${cls}`}>
        <Icon size={13} />
        <span className="text-xs font-semibold">{label}</span>
        {live && <span className="ml-auto text-[10px] font-semibold flex items-center gap-1 text-emerald-600"><Globe size={10} /> Live</span>}
      </div>

      {status === 'rejected' && vendor.rejectedReason && (
        <p className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg mb-3 line-clamp-2">{vendor.rejectedReason}</p>
      )}

      {vendor.internalNotes && (
        <div className="flex items-start gap-1.5 bg-amber-50 px-2.5 py-1.5 rounded-lg mb-3">
          <StickyNote size={12} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 line-clamp-2">{vendor.internalNotes}</p>
        </div>
      )}

      <p className="text-xs text-[#C9A84C] font-semibold pt-2 border-t border-[#F5F0E8]">Click to manage →</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VendorsPage() {
  const { t } = useLang();
  const [vendors,      setVendors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [category,     setCategory]     = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInvite,   setShowInvite]   = useState(false);
  const [detailV,      setDetailV]      = useState(null);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)   params.search   = search;
      if (category) params.category = category;
      const { data } = await vendorsAPI.list(params);
      setVendors(data.data || data.vendors || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, category]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const patch = (updated) => {
    setVendors(prev => prev.map(v => v.vendorId === updated.vendorId ? { ...v, ...updated } : v));
    setDetailV(prev => prev?.vendorId === updated.vendorId ? { ...prev, ...updated } : prev);
  };

  const counts = {
    all:      vendors.length,
    approved: vendors.filter(v => approvalStatus(v) === 'approved').length,
    pending:  vendors.filter(v => approvalStatus(v) === 'pending').length,
    rejected: vendors.filter(v => approvalStatus(v) === 'rejected').length,
  };

  const displayed = statusFilter === 'all' ? vendors : vendors.filter(v => approvalStatus(v) === statusFilter);

  const TABS = [
    { key: 'all',      label: 'All'      },
    { key: 'approved', label: 'Approved' },
    { key: 'pending',  label: 'Pending'  },
    { key: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('nav.vendors')}</h1>
          {!loading && (
            <p className="text-sm text-[#5C5C5C] mt-0.5">
              {vendors.filter(isLive).length} live in marketplace · {counts.pending} pending review
            </p>
          )}
        </div>
        <button onClick={() => setShowInvite(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm">
          <UserPlus size={18} /> Invite Vendor
        </button>
      </div>

      {/* Search + category */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
          <input className="input-wedding" style={{ paddingLeft: '2.5rem' }} placeholder="Search vendors…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input-wedding w-full sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {['catering','decor','music','photography','transport','floristry','entertainment'].map(c => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
              statusFilter === tab.key ? 'bg-[#C9A84C] text-white shadow-sm' : 'bg-[#F5F0E8] text-[#5C5C5C] hover:bg-[#EBE5DB]'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              statusFilter === tab.key ? 'bg-white/30 text-white' : 'bg-[#EBE5DB] text-[#5C5C5C]'
            }`}>{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <Store size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('common.no_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map(v => (
            <VendorCard
              key={v.vendorId || v.vendor_id}
              vendor={v}
              onClick={() => setDetailV(v)}
            />
          ))}
        </div>
      )}

      {showInvite && (
        <InviteVendorModal onClose={() => setShowInvite(false)} />
      )}

      {detailV && (
        <VendorDetailModal
          vendor={detailV}
          onClose={() => setDetailV(null)}
          onUpdated={patch}
        />
      )}
    </div>
  );
}
