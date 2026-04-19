import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../../contexts/LanguageContext';
import { eventsAPI, staffAPI, vendorsAPI } from '../../services/api';
import { X, FileText, Loader, Users, LayoutList, Camera } from 'lucide-react';

export default function EventDetailModal({ event, onClose }) {
    const { t } = useLang();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [details, setDetails] = useState(null);
    const [allStaff, setAllStaff] = useState([]);
    const [allVendors, setAllVendors] = useState([]);

    // Assignment states
    const [selectedStaff, setSelectedStaff] = useState('');
    const [selectedVendor, setSelectedVendor] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [evRes, stRes, vnRes] = await Promise.all([
                    eventsAPI.get(event.event_id),
                    staffAPI.list(),
                    vendorsAPI.list()
                ]);
                setDetails(evRes.data);
                setAllStaff(stRes.data.staff || []);
                setAllVendors(vnRes.data.vendors || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [event.event_id]);

    const handleDownloadReport = async () => {
        try {
            const res = await eventsAPI.getReport(event.event_id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Event_${details.name.replace(/\s+/g, '_')}_Report.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Failed to download PDF", err);
        }
    };

    const handleAssignStaff = async () => {
        if (!selectedStaff) return;
        const newStaffIds = [...(details.staff_ids || []), selectedStaff];
        try {
            await eventsAPI.update(event.event_id, { staff_ids: newStaffIds });
            const addedStaff = allStaff.find(s => s.user_id === selectedStaff);
            setDetails(prev => ({
                ...prev,
                staff_ids: newStaffIds,
                staff: [...(prev.staff || []), addedStaff]
            }));
            setSelectedStaff('');
        } catch (e) { console.error(e); }
    };

    const handleAssignVendor = async () => {
        if (!selectedVendor) return;
        const newVendorIds = [...(details.vendor_ids || []), selectedVendor];
        try {
            await eventsAPI.update(event.event_id, { vendor_ids: newVendorIds });
            const addedVendor = allVendors.find(v => v.vendor_id === selectedVendor);
            setDetails(prev => ({
                ...prev,
                vendor_ids: newVendorIds,
                vendors: [...(prev.vendors || []), addedVendor]
            }));
            setSelectedVendor('');
        } catch (e) { console.error(e); }
    };

    if (loading || !details) {
        return (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-12 flex justify-center">
                    <Loader size={32} className="animate-spin text-[#C9A84C]" />
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl animate-scale-in flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-[#EBE5DB] flex justify-between items-start shrink-0 bg-[#F9F9F9] rounded-t-2xl">
                    <div>
                        <h2 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{details.name}</h2>
                        <p className="text-sm text-[#5C5C5C] mt-1">{details.event_date} · {details.venue}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => { onClose(); navigate(`/events/${event.event_id}/album`); }}
                            className="px-4 py-2 flex items-center gap-2 text-sm rounded-xl bg-[#C9A84C15] text-[#C9A84C] font-semibold hover:bg-[#C9A84C25] transition-colors"
                        >
                            <Camera size={16} /> Live Album
                        </button>
                        <button onClick={handleDownloadReport} className="btn-gold px-4 py-2 flex items-center gap-2 text-sm">
                            <FileText size={16} /> Export PDF
                        </button>
                        <button onClick={onClose} className="p-2 text-[#5C5C5C] hover:bg-[#EBE5DB] rounded-full transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    {/* Assignments Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Staff Assignment */}
                        <div>
                            <h3 className="font-bold text-[#2D2D2D] mb-4 flex items-center gap-2">
                                <Users size={18} className="text-[#C9A84C]" /> Assigned Staff
                            </h3>

                            <div className="flex gap-2 mb-4">
                                <select className="input-wedding flex-1 text-sm py-2" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
                                    <option value="">Select staff...</option>
                                    {allStaff.filter(s => !details.staff_ids?.includes(s.user_id)).map(s => (
                                        <option key={s.user_id} value={s.user_id}>{s.name} ({s.role})</option>
                                    ))}
                                </select>
                                <button onClick={handleAssignStaff} disabled={!selectedStaff} className="bg-[#4A7C59] text-white px-4 rounded-lg font-semibold text-sm disabled:opacity-50">Add</button>
                            </div>

                            <div className="space-y-2">
                                {details.staff?.length === 0 && <p className="text-xs text-[#5C5C5C] italic">No staff assigned yet.</p>}
                                {details.staff?.map(s => (
                                    <div key={s.user_id} className="p-3 border border-[#EBE5DB] rounded-lg bg-white flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-semibold text-[#2D2D2D]">{s.name}</p>
                                            <p className="text-xs text-[#5C5C5C] capitalize">{s.role}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Vendor Assignment */}
                        <div>
                            <h3 className="font-bold text-[#2D2D2D] mb-4 flex items-center gap-2">
                                <LayoutList size={18} className="text-[#C9A84C]" /> Assigned Vendors
                            </h3>

                            <div className="flex gap-2 mb-4">
                                <select className="input-wedding flex-1 text-sm py-2" value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)}>
                                    <option value="">Select vendor...</option>
                                    {allVendors.filter(v => !details.vendor_ids?.includes(v.vendor_id)).map(v => (
                                        <option key={v.vendor_id} value={v.vendor_id}>{v.name} - {v.category}</option>
                                    ))}
                                </select>
                                <button onClick={handleAssignVendor} disabled={!selectedVendor} className="bg-[#C9A84C] text-white px-4 rounded-lg font-semibold text-sm disabled:opacity-50">Add</button>
                            </div>

                            <div className="space-y-2">
                                {details.vendors?.length === 0 && <p className="text-xs text-[#5C5C5C] italic">No vendors assigned yet.</p>}
                                {details.vendors?.map(v => (
                                    <div key={v.vendor_id} className="p-3 border border-[#EBE5DB] rounded-lg bg-white flex justify-between items-center">
                                        <div>
                                            <p className="text-sm font-semibold text-[#2D2D2D]">{v.name}</p>
                                            <p className="text-xs text-[#5C5C5C] capitalize">{v.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
