import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import api, { eventsAPI, staffAPI, vendorsAPI, guestCheckinAPI } from '../../services/api';
import { X, FileText, Loader, Users, LayoutList, Camera, Calendar, MapPin, DollarSign, UserCheck, Pencil, Save, Trash2, ClipboardList, Plus, UserCircle, CheckCircle2, Circle, QrCode, Download, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  planning:  'bg-purple-100 text-purple-700',
  active:    'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-teal-100 text-teal-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const STATUSES = ['planning', 'active', 'confirmed', 'completed', 'cancelled'];

const TASK_STATUS_COLORS = {
  todo:        'bg-[#F3F4F6] text-[#4B5563]',
  in_progress: 'bg-[#FFF3E0] text-[#C9A84C]',
  done:        'bg-[#E8F5EE] text-[#4A7C59]',
};

const TASK_PRIORITY_COLORS = {
  low:    'text-[#6B7280]',
  medium: 'text-[#C9A84C]',
  high:   'text-[#EF4444]',
};

export default function EventDetailModal({ event, onClose, onUpdate }) {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading]         = useState(true);
  const [details, setDetails]         = useState(null);
  const [allStaff, setAllStaff]       = useState([]);
  const [allVendors, setAllVendors]   = useState([]);
  const [selectedStaff, setSelectedStaff]   = useState('');
  const [selectedVendor, setSelectedVendor] = useState('');
  const [error, setError]             = useState('');

  // Task state
  const [tasks, setTasks]             = useState([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [addingTask, setAddingTask]   = useState(false);
  const [assigningTask, setAssigningTask] = useState(null); // taskId being assigned

  const isClient = user?.role === 'client';
  const canManageTasks = ['tenant_admin', 'super_admin', 'event_manager', 'client'].includes(user?.role);

  // Edit state
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving]     = useState(false);
  const [editError, setEditError] = useState('');

  // Delete state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Guest check-in state
  const [qrData, setQrData] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [togglingCheckin, setTogglingCheckin] = useState(false);
  const canManageCheckin = ['tenant_admin', 'super_admin', 'event_manager'].includes(user?.role);

  const eventId = event.eventId || event.event_id;

  useEffect(() => {
    if (canManageCheckin) fetchQrData();
  }, [eventId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        // Self-serve users (no tenantId) use marketplace for vendors; staff list is empty
        const hasTenant = !!user?.tenantId;
        const vendorFetch = isClient
          ? Promise.resolve(null)
          : hasTenant
            ? vendorsAPI.list({ size: 100 })
            : api.get('/marketplace/vendors', { params: { size: 100 } });

        const fetches = [
          eventsAPI.get(eventId),
          (isClient || !hasTenant) ? Promise.resolve(null) : staffAPI.list({ size: 100 }),
          vendorFetch,
          eventsAPI.listTasks(eventId),
        ];
        const [evRes, stRes, vnRes, taskRes] = await Promise.allSettled(fetches);

        if (evRes.status === 'fulfilled') {
          setDetails(evRes.value.data);
        } else {
          setError('Failed to load event details.');
        }

        if (stRes.status === 'fulfilled' && stRes.value !== null) {
          const d = stRes.value.data;
          setAllStaff(d.staff || d.users || d.data || []);
        }

        if (vnRes.status === 'fulfilled' && vnRes.value !== null) {
          const d = vnRes.value.data;
          setAllVendors(d.vendors || d.data || []);
        }

        if (taskRes.status === 'fulfilled') {
          const d = taskRes.value.data;
          setTasks(Array.isArray(d) ? d : (d.tasks || d.data || []));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId]);

  const openEdit = () => {
    setEditForm({
      name:      details.name || '',
      eventDate: details.eventDate ? details.eventDate.slice(0, 10) : '',
      venue:     details.venue || '',
      clientName: details.clientName || '',
      budget:    details.budget != null ? String(details.budget) : '',
      guestCount: details.guestCount != null ? String(details.guestCount) : '',
      status:    details.status || 'planning',
      notes:     details.notes || '',
    });
    setEditError('');
    setEditing(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setEditError('');
    try {
      const payload = {
        name:       editForm.name,
        eventDate:  editForm.eventDate || null,
        venue:      editForm.venue || null,
        clientName: editForm.clientName || null,
        budget:     editForm.budget ? Number(editForm.budget) : null,
        guestCount: editForm.guestCount ? Number(editForm.guestCount) : null,
        status:     editForm.status,
        notes:      editForm.notes || null,
      };
      const { data } = await eventsAPI.update(eventId, payload);
      const updated = { ...details, ...payload, ...data };
      setDetails(updated);
      setEditing(false);
      toast.success('Event updated successfully');
      if (onUpdate) onUpdate(updated);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update event';
      setEditError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

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
      toast.error('Failed to download PDF');
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
    } catch (e) { toast.error('Failed to assign staff'); }
  };

  const handleRemoveStaff = async (staffId) => {
    const newIds = (details.staffIds || []).filter(id => id !== staffId);
    try {
      await eventsAPI.update(eventId, { staffIds: newIds });
      setDetails(prev => ({
        ...prev,
        staffIds: newIds,
        _assignedStaff: (prev._assignedStaff || allStaff.filter(s => prev.staffIds?.includes(s.userId || s.user_id)))
          .filter(s => (s.userId || s.user_id) !== staffId),
      }));
    } catch (e) { toast.error('Failed to remove staff'); }
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
    } catch (e) { toast.error('Failed to assign vendor'); }
  };

  const handleRemoveVendor = async (vendorId) => {
    const newIds = (details.vendorIds || []).filter(id => id !== vendorId);
    try {
      await eventsAPI.update(eventId, { vendorIds: newIds });
      setDetails(prev => ({
        ...prev,
        vendorIds: newIds,
        _assignedVendors: (prev._assignedVendors || allVendors.filter(v => prev.vendorIds?.includes(v.vendorId || v.vendor_id)))
          .filter(v => (v.vendorId || v.vendor_id) !== vendorId),
      }));
    } catch (e) { toast.error('Failed to remove vendor'); }
  };

  // ── Task handlers ────────────────────────────────────────────────────────────

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const payload = { title: newTaskTitle.trim() };
      if (newTaskAssignee) payload.assignedTo = newTaskAssignee;
      const { data } = await eventsAPI.createTask(eventId, payload);
      const created = data.task || data;

      // If an assignee was selected, call assign so a notification is created
      if (newTaskAssignee && created?.taskId) {
        try {
          const { data: assigned } = await eventsAPI.assignTask(created.taskId, newTaskAssignee);
          setTasks((prev) => [assigned, ...prev]);
        } catch {
          setTasks((prev) => [created, ...prev]);
        }
      } else {
        setTasks((prev) => [created, ...prev]);
      }

      setNewTaskTitle('');
      setNewTaskAssignee('');
      toast.success('Task created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  const handleAssignTask = async (taskId, assigneeId) => {
    if (assigningTask === taskId) return;
    setAssigningTask(taskId);
    try {
      const { data } = await eventsAPI.assignTask(taskId, assigneeId);
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, ...data, assignedTo: assigneeId } : t)));
      const staffMember = allStaff.find((s) => (s.userId || s.user_id) === assigneeId);
      toast.success(`Task assigned to ${staffMember?.name || 'staff member'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setAssigningTask(null);
    }
  };

  const handleTaskStatusCycle = async (taskId, currentStatus) => {
    const cycle = { todo: 'in_progress', in_progress: 'done', done: 'todo' };
    const newStatus = cycle[currentStatus] || 'todo';
    setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status: newStatus } : t)));
    try {
      await eventsAPI.updateTaskStatus(taskId, newStatus);
    } catch {
      setTasks((prev) => prev.map((t) => (t.taskId === taskId ? { ...t, status: currentStatus } : t)));
    }
  };

  const handleDeleteTask = async (taskId) => {
    setTasks((prev) => prev.filter((t) => t.taskId !== taskId));
    try {
      await eventsAPI.deleteTask(eventId, taskId);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await eventsAPI.delete(eventId);
      toast.success('Event deleted');
      if (onUpdate) onUpdate(null, eventId);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete event');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const fetchQrData = async () => {
    if (!canManageCheckin) return;
    setCheckinLoading(true);
    try {
      const [qrRes, ciRes] = await Promise.allSettled([
        guestCheckinAPI.getQr(eventId),
        guestCheckinAPI.getCheckins(eventId),
      ]);
      if (qrRes.status === 'fulfilled') setQrData(qrRes.value.data);
      if (ciRes.status === 'fulfilled') setCheckins(ciRes.value.data || []);
    } catch {
      // silently fail — guest check-in is optional
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleToggleCheckin = async () => {
    setTogglingCheckin(true);
    try {
      const { data } = await guestCheckinAPI.toggle(eventId, !qrData?.guestCheckinEnabled);
      setQrData((prev) => ({ ...prev, guestCheckinEnabled: data.guestCheckinEnabled }));
      toast.success(data.guestCheckinEnabled ? 'Guest check-in enabled' : 'Guest check-in disabled');
      if (!qrData?.qrDataUrl) fetchQrData();
    } catch {
      toast.error('Failed to update check-in setting');
    } finally {
      setTogglingCheckin(false);
    }
  };

  const handleDownloadQr = () => {
    if (!qrData?.qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrData.qrDataUrl;
    link.download = `checkin-qr-${eventId.substring(0, 8)}.png`;
    link.click();
  };

  const handleExportCsv = () => {
    if (!checkins.length) return;
    const rows = [['Name', 'Email', 'Checked In At']];
    checkins.forEach((c) => rows.push([c.guestName || '', c.email, new Date(c.checkedInAt).toLocaleString()]));
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checkins-${eventId.substring(0, 8)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
            <button onClick={openEdit} className="px-3 py-2 flex items-center gap-1.5 text-xs rounded-xl bg-[#4A7C5915] text-[#4A7C59] font-semibold hover:bg-[#4A7C5925] transition-colors">
              <Pencil size={14} /> Edit
            </button>
            <button onClick={handleDownloadReport} className="btn-gold px-3 py-2 flex items-center gap-1.5 text-xs">
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => setConfirmDelete(true)} className="p-2 text-[#D9534F] hover:bg-red-50 rounded-full transition-all">
              <Trash2 size={16} />
            </button>
            <button onClick={onClose} className="p-2 text-[#5C5C5C] hover:bg-[#EBE5DB] rounded-full transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* ── EDIT FORM ── */}
          {editing && (
            <form onSubmit={handleSaveEdit} className="bg-[#F9F6F0] rounded-2xl p-5 space-y-4 border border-[#EBE5DB]">
              <h3 className="font-bold text-[#2D2D2D] text-sm" style={{ fontFamily: 'Playfair Display,serif' }}>Edit Event Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Event Name *</label>
                  <input
                    className="input-wedding"
                    value={editForm.name}
                    onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Date</label>
                  <input
                    className="input-wedding"
                    type="date"
                    value={editForm.eventDate}
                    onChange={e => setEditForm(f => ({ ...f, eventDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Status</label>
                  <select
                    className="input-wedding"
                    value={editForm.status}
                    onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {STATUSES.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Venue</label>
                  <input
                    className="input-wedding"
                    placeholder="Kigali Serena Hotel"
                    value={editForm.venue}
                    onChange={e => setEditForm(f => ({ ...f, venue: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Client Name</label>
                  <input
                    className="input-wedding"
                    placeholder="Client name"
                    value={editForm.clientName}
                    onChange={e => setEditForm(f => ({ ...f, clientName: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Budget (RWF)</label>
                  <input
                    className="input-wedding"
                    type="number"
                    placeholder="10000000"
                    value={editForm.budget}
                    onChange={e => setEditForm(f => ({ ...f, budget: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Guest Count</label>
                  <input
                    className="input-wedding"
                    type="number"
                    placeholder="200"
                    value={editForm.guestCount}
                    onChange={e => setEditForm(f => ({ ...f, guestCount: e.target.value }))}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Notes</label>
                  <textarea
                    className="input-wedding resize-none"
                    rows={3}
                    placeholder="Additional notes..."
                    value={editForm.notes}
                    onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              {editError && <p className="text-sm text-[#D9534F]">{editError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 h-10 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-gold h-10 flex items-center justify-center gap-2 text-sm"
                >
                  {saving ? <Loader size={14} className="animate-spin" /> : <><Save size={14} /> Save Changes</>}
                </button>
              </div>
            </form>
          )}

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

          {/* Staff & Vendor assignments — hidden for clients (tenant-managed) */}
          {!isClient && <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

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
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#2D2D2D]">{s.name}</p>
                        <p className="text-xs text-[#5C5C5C] capitalize">{s.role}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveStaff(s.userId || s.user_id)}
                        className="p-1 text-[#5C5C5C] hover:text-[#D9534F] transition-colors"
                      >
                        <X size={14} />
                      </button>
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
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[#2D2D2D]">{v.name}</p>
                        <p className="text-xs text-[#5C5C5C]">{v.category}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveVendor(v.vendorId || v.vendor_id)}
                        className="p-1 text-[#5C5C5C] hover:text-[#D9534F] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>

          </div>}

          {/* ── TASKS ── */}
          <div>
            <h3 className="font-bold text-[#2D2D2D] mb-3 flex items-center gap-2 text-sm">
              <ClipboardList size={16} className="text-[#C9A84C]" /> Tasks ({tasks.length})
            </h3>

            {/* Add task form — admin/manager only */}
            {canManageTasks && (
              <form onSubmit={handleAddTask} className="flex flex-wrap gap-2 mb-3">
                <input
                  className="input-wedding flex-1 min-w-0 text-sm py-2"
                  placeholder="Task title…"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                {!isClient && (
                  <select
                    className="input-wedding text-sm py-2 min-w-[140px]"
                    value={newTaskAssignee}
                    onChange={(e) => setNewTaskAssignee(e.target.value)}
                  >
                    <option value="">Assign to (optional)</option>
                    {allStaff.map((s) => (
                      <option key={s.userId || s.user_id} value={s.userId || s.user_id}>{s.name}</option>
                    ))}
                  </select>
                )}
                <button
                  type="submit"
                  disabled={!newTaskTitle.trim() || addingTask}
                  className="bg-[#C9A84C] text-white px-4 rounded-lg font-semibold text-sm flex items-center gap-1 disabled:opacity-40"
                >
                  {addingTask ? <Loader size={13} className="animate-spin" /> : <Plus size={13} />} Add
                </button>
              </form>
            )}

            {/* Task list */}
            {tasks.length === 0 ? (
              <p className="text-xs text-[#5C5C5C] italic">No tasks yet. Add one above.</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const assignedStaffMember = task.assignedTo
                    ? allStaff.find((s) => (s.userId || s.user_id) === task.assignedTo)
                    : null;

                  return (
                    <div key={task.taskId} className="p-3 border border-[#EBE5DB] rounded-xl bg-[#FDFCFA]">
                      <div className="flex items-start gap-2">
                        {/* Status toggle */}
                        <button
                          onClick={() => handleTaskStatusCycle(task.taskId, task.status)}
                          className="mt-0.5 flex-shrink-0"
                          title={`Status: ${task.status}`}
                        >
                          {task.status === 'done'
                            ? <CheckCircle2 size={18} className="text-[#4A7C59]" />
                            : <Circle size={18} className={task.status === 'in_progress' ? 'text-[#C9A84C]' : 'text-[#D1D5DB]'} />
                          }
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-[#9CA3AF]' : 'text-[#2D2D2D]'}`}>
                            {task.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${TASK_STATUS_COLORS[task.status] || ''}`}>
                              {task.status?.replace('_', ' ')}
                            </span>
                            {task.dueDate && (
                              <span className="text-[11px] text-[#5C5C5C]">
                                Due {new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                              </span>
                            )}
                            {task.priority && task.priority !== 'medium' && (
                              <span className={`text-[11px] font-semibold capitalize ${TASK_PRIORITY_COLORS[task.priority]}`}>
                                {task.priority}
                              </span>
                            )}
                          </div>

                          {/* Assignment row */}
                          {canManageTasks ? (
                            <div className="flex items-center gap-2 mt-2">
                              <UserCircle size={13} className="text-[#9CA3AF] flex-shrink-0" />
                              {assigningTask === task.taskId ? (
                                <Loader size={13} className="animate-spin text-[#C9A84C]" />
                              ) : (
                                <select
                                  className="text-xs border border-[#EBE5DB] rounded-lg px-2 py-1 bg-white text-[#2D2D2D] focus:outline-none focus:border-[#C9A84C]"
                                  value={task.assignedTo || ''}
                                  onChange={(e) => e.target.value && handleAssignTask(task.taskId, e.target.value)}
                                >
                                  <option value="">Unassigned</option>
                                  {allStaff.map((s) => (
                                    <option key={s.userId || s.user_id} value={s.userId || s.user_id}>{s.name}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          ) : assignedStaffMember ? (
                            <p className="text-xs text-[#5C5C5C] mt-1 flex items-center gap-1">
                              <UserCircle size={12} /> {assignedStaffMember.name}
                            </p>
                          ) : null}
                        </div>

                        {canManageTasks && (
                          <button
                            onClick={() => handleDeleteTask(task.taskId)}
                            className="p-1 text-[#9CA3AF] hover:text-[#D9534F] transition-colors flex-shrink-0"
                            title="Delete task"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── GUEST CHECK-IN ── */}
          {canManageCheckin && (
            <div>
              <h3 className="font-bold text-[#2D2D2D] mb-3 flex items-center gap-2 text-sm">
                <QrCode size={16} className="text-[#C9A84C]" /> Guest Check-in
              </h3>

              {checkinLoading ? (
                <div className="flex items-center gap-2 text-sm text-[#5C5C5C]">
                  <Loader size={14} className="animate-spin" /> Loading check-in data...
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[#F9F6F0] rounded-xl border border-[#EBE5DB]">
                    <div>
                      <p className="text-sm font-semibold text-[#2D2D2D]">Enable QR Check-in</p>
                      <p className="text-xs text-[#5C5C5C]">Guests scan QR code and verify via email OTP</p>
                    </div>
                    <button
                      onClick={handleToggleCheckin}
                      disabled={togglingCheckin}
                      className="flex items-center gap-1"
                    >
                      {qrData?.guestCheckinEnabled
                        ? <ToggleRight size={28} className="text-[#4A7C59]" />
                        : <ToggleLeft size={28} className="text-[#9CA3AF]" />
                      }
                    </button>
                  </div>

                  {/* QR code */}
                  {qrData?.guestCheckinEnabled && qrData?.qrDataUrl && (
                    <div className="flex flex-col sm:flex-row gap-4 items-start">
                      <div className="border border-[#EBE5DB] rounded-xl p-3 bg-white">
                        <img src={qrData.qrDataUrl} alt="Check-in QR Code" className="w-40 h-40" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-semibold text-[#5C5C5C]">Check-in URL</p>
                        <p className="text-xs text-[#2D2D2D] break-all bg-[#F9F6F0] rounded-lg px-3 py-2 font-mono">
                          {qrData.checkinUrl}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={handleDownloadQr}
                            className="flex items-center gap-1.5 px-3 py-2 text-xs bg-[#C9A84C] text-white rounded-lg font-semibold hover:bg-[#b8933f]"
                          >
                            <Download size={12} /> Download QR
                          </button>
                          {checkins.length > 0 && (
                            <button
                              onClick={handleExportCsv}
                              className="flex items-center gap-1.5 px-3 py-2 text-xs border border-[#C9A84C] text-[#C9A84C] rounded-lg font-semibold hover:bg-[#C9A84C10]"
                            >
                              <Download size={12} /> Export CSV
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Checked-in guests list */}
                  {qrData?.guestCheckinEnabled && (
                    <div>
                      <p className="text-xs font-semibold text-[#5C5C5C] mb-2">
                        Checked-in Guests ({checkins.length})
                      </p>
                      {checkins.length === 0 ? (
                        <p className="text-xs text-[#5C5C5C] italic">No guests have checked in yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {checkins.map((ci) => (
                            <div key={ci.checkinId} className="flex items-center gap-3 p-2.5 bg-[#F9F6F0] rounded-lg border border-[#EBE5DB]">
                              <CheckCircle2 size={14} className="text-[#4A7C59] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-[#2D2D2D] truncate">{ci.guestName || ci.email}</p>
                                {ci.guestName && <p className="text-xs text-[#5C5C5C] truncate">{ci.email}</p>}
                              </div>
                              <p className="text-xs text-[#9CA3AF] shrink-0">
                                {new Date(ci.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-scale-in">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-[#D9534F]" />
            </div>
            <h3 className="text-lg font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Playfair Display,serif' }}>Delete Event?</h3>
            <p className="text-sm text-[#5C5C5C] mb-6">
              This will permanently delete <strong>{details.name}</strong> and all associated data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-10 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 h-10 rounded-full bg-[#D9534F] text-white font-semibold text-sm flex items-center justify-center"
              >
                {deleting ? <Loader size={14} className="animate-spin" /> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
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
