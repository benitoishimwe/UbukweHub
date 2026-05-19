import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../contexts/LanguageContext';
import { eventsAPI, staffAPI, vendorsAPI } from '../../services/api';
import { X, FileText, Loader, Users, LayoutList, Camera, Calendar, MapPin, DollarSign, UserCheck } from 'lucide-react';

const STATUS_COLORS = {
  planning:  'bg-purple-100 text-purple-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default function EventDetailModal({ event, onClose }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [details, setDetails]         = useState(null);
  const [allStaff, setAllStaff]       = useState([]);
  const [allVendors, setAllVendors]   = useState([]);
  const [selectedStaff, setSelectedStaff]   = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [error, setError]             = useState('');

  const eventId = event.eventId || event.event_id;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [evRes, stRes, vnRes] = await Promise.allSettled([
          eventsAPI.get(eventId),
          staffAPI.list({ size: 100 }),
          vendorsAPI.list({ size: 100 }),
        ]);

        if (evRes.status === 'fulfilled') {
          setDetails(evRes.value.data);
        } else {
          setError('Failed to load event details.');
        }

        if (stRes.status === 'fulfilled') {
          const d = stRes.value.data;
          setAllStaff(d.staff || d.users || d.data || []);
        }

        if (vnRes.status === 'fulfilled') {
          const d = vnRes.value.data;
          setAllVendors(d.vendors || d.data || []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const handleDownloadReport = async () => {
    try {
      const res = await eventsAPI.getReport(eventId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Event_${(details?.name || 'report').replace(/\s+/g, '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download PDF', err);
    }
  };

  const handleAssignStaff = async () => {
    if (!selectedStaff) return;
    const current = details.staffIds || [];
    const newIds = [...current, selectedStaff];
    try {
      await eventsAPI.update(eventId, { staffIds: newIds });
      const added = allStaff.find(s => (s.userId || s.user_id) === selectedStaff);
      setDetails(prev => ({ ...prev, staffIds: newIds, _assignedStaff: [...(prev._assignedStaff || []), added] }));
      setSelectedStaff('');
    } catch (e) { console.error(e); }
  };

  const handleAssignVendor = async () => {
    if (!selectedVendor) return;
    const current = details.vendorIds || [];
    const newIds = [...current, selectedVendor];
    try {
      await eventsAPI.update(eventId, { vendorIds: newIds });
      const added = allVendors.find(v => (v.vendorId || v.vendor_id) === selectedVendor);
      setDetails(prev => ({ ...prev, vendorIds: newIds, _assignedVendors: [...(prev._assignedVendors || []), added] }));
      setSelectedVendor('');
    } catch (e) { console.error(e); }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-12 flex justify-center">
          <Loader size={32} className="animate-spin text-[#C9A84C]" />
        </div>
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <p className="text-[#D9534F] font-medium mb-4">{error || 'Event not found.'}</p>
          <button onClick={onClose} className="btn-gold px-6 py-2 text-sm">Close</button>
        </div>
      </div>
    );
  }

  const staffIds   = details.staffIds   || [];
  const vendorIds  = details.vendorIds  || [];
  const assignedStaff   = details._assignedStaff   || allStaff.filter(s => staffIds.includes(s.userId || s.user_id));
  const assignedVendors = details._assignedVendors || allVendors.filter(v => vendorIds.includes(v.vendorId || v.vendor_id));

  const score = details.greatnessScore;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl animate-scale-in flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-[#EBE5DB] flex justify-between items-start shrink-0 bg-[#F9F6F0] rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{details.name}</h2>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_COLORS[details.status] || 'bg-gray-100 text-gray-600'}`}>
                {details.status}
              </span>
            </div>
            <p className="text-sm text-[#5C5C5C]">{details.eventTypeSlug || 'Event'}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => { onClose(); navigate(`/events/${eventId}/album`); }}
              className="px-3 py-2 flex items-center gap-1.5 text-xs rounded-xl bg-[#C9A84C15] text-[#C9A84C] font-semibold hover:bg-[#C9A84C25] transition-colors"
            >
              <Camera size={14} /> Live Album
            </button>
            <button onClick={handleDownloadReport} className="btn-gold px-3 py-2 flex items-center gap-1.5 text-xs">
              <FileText size={14} /> PDF
            </button>
            <button onClick={onClose} className="p-2 text-[#5C5C5C] hover:bg-[#EBE5DB] rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* Key details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <InfoCard icon={<Calendar size={15} />} label="Date"
              value={details.eventDate ? new Date(details.eventDate).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }) : '—'} />
            <InfoCard icon={<MapPin size={15} />} label="Venue" value={details.venue || '—'} />
            <InfoCard icon={<Users size={15} />} label="Guests" value={`${details.guestCount ?? 0} guests`} />
            <InfoCard icon={<DollarSign size={15} />} label="Budget" value={details.budget ? `${Number(details.budget).toLocaleString()} RWF` : '—'} />
          </div>

          {/* Greatness score */}
          {score != null && (
            <div className="bg-[#F9F6F0] rounded-xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-lg"
                style={{ background: score >= 80 ? '#4A7C5920' : score >= 60 ? '#C9A84C20' : '#D9534F20',
                         color: score >= 80 ? '#4A7C59' : score >= 60 ? '#C9A84C' : '#D9534F' }}>
                {score}%
              </div>
              <div>
                <p className="text-sm font-bold text-[#2D2D2D]">Wedding Greatness Score</p>
                <div className="w-40 h-1.5 bg-[#EBE5DB] rounded-full mt-1 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: score >= 80 ? '#4A7C59' : score >= 60 ? '#C9A84C' : '#D9534F' }} />
                </div>
              </div>
            </div>
          )}

          {/* Client + Notes */}
          {(details.clientName || details.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {details.clientName && (
                <div className="bg-[#F9F6F0] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#5C5C5C] mb-1">Client</p>
                  <p className="text-sm font-medium text-[#2D2D2D]">{details.clientName}</p>
                </div>
              )}
              {details.notes && (
                <div className="bg-[#F9F6F0] rounded-xl p-4">
                  <p className="text-xs font-semibold text-[#5C5C5C] mb-1">Notes</p>
                  <p className="text-sm text-[#2D2D2D] line-clamp-3">{details.notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Staff & Vendor assignments */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Staff */}
            <div>
              <h3 className="font-bold text-[#2D2D2D] mb-3 flex items-center gap-2 text-sm">
                <UserCheck size={16} className="text-[#C9A84C]" /> Assigned Staff ({staffIds.length})
              </h3>
              <div className="flex gap-2 mb-3">
                <select className="input-wedding flex-1 text-sm py-2" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                  <option value="">Add staff...</option>
                  {allStaff.filter(s => !staffIds.includes(s.userId || s.user_id)).map(s => (
                    <option key={s.userId || s.user_id} value={s.userId || s.user_id}>{s.name} ({s.role})</option>
                  ))}
                </select>
                <button onClick={handleAssignStaff} disabled={!selectedStaff} className="bg-[#4A7C59] text-white px-4 rounded-lg font-semibold text-sm disabled:opacity-40">Add</button>
              </div>
              <div className="space-y-2">
                {assignedStaff.length === 0
                  ? <p className="text-xs text-[#5C5C5C] italic">No staff assigned yet.</p>
                  : assignedStaff.map(s => s && (
                    <div key={s.userId || s.user_id} className="p-3 border border-[#EBE5DB] rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C9A84C20] flex items-center justify-center text-sm font-bold text-[#C9A84C]">
                        {s.name?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#2D2D2D]">{s.name}</p>
                        <p className="text-xs text-[#5C5C5C] capitalize">{s.role}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Vendors */}
            <div>
              <h3 className="font-bold text-[#2D2D2D] mb-3 flex items-center gap-2 text-sm">
                <LayoutList size={16} className="text-[#C9A84C]" /> Assigned Vendors ({vendorIds.length})
              </h3>
              <div className="flex gap-2 mb-3">
                <select className="input-wedding flex-1 text-sm py-2" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                  <option value="">Add vendor...</option>
                  {allVendors.filter(v => !vendorIds.includes(v.vendorId || v.vendor_id)).map(v => (
                    <option key={v.vendorId || v.vendor_id} value={v.vendorId || v.vendor_id}>{v.name} — {v.category}</option>
                  ))}
                </select>
                <button onClick={handleAssignVendor} disabled={!selectedVendor} className="bg-[#C9A84C] text-white px-4 rounded-lg font-semibold text-sm disabled:opacity-40">Add</button>
              </div>
              <div className="space-y-2">
                {assignedVendors.length === 0
                  ? <p className="text-xs text-[#5C5C5C] italic">No vendors assigned yet.</p>
                  : assignedVendors.map(v => v && (
                    <div key={v.vendorId || v.vendor_id} className="p-3 border border-[#EBE5DB] rounded-xl flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#C9A84C20] flex items-center justify-center">
                        <LayoutList size={14} className="text-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#2D2D2D]">{v.name}</p>
                        <p className="text-xs text-[#5C5C5C]">{v.category}</p>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="bg-[#F9F6F0] rounded-xl p-3">
      <div className="flex items-center gap-1.5 text-[#5C5C5C] mb-1">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="text-sm font-medium text-[#2D2D2D] truncate">{value}</p>
    </div>
  );
}
