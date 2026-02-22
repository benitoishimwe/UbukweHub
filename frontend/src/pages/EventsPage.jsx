import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { eventsAPI } from '../services/api';
import { Plus, Search, Calendar, Users, MapPin, Loader, ChevronDown } from 'lucide-react';

const STATUS_COLORS = {
  planning: 'badge-planning',
  active: 'badge-active',
  completed: 'badge-completed',
  cancelled: 'bg-gray-100 text-gray-600',
};

function EventCard({ event, onClick }) {
  const score = event.greatness_score;
  return (
    <div
      className="card-wedding p-5 cursor-pointer"
      onClick={onClick}
      data-testid="event-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#2D2D2D] text-base truncate" style={{fontFamily:'Playfair Display,serif'}}>{event.name}</h3>
          <div className="flex items-center gap-1 text-[#5C5C5C] text-xs mt-1">
            <MapPin size={12} />{event.venue}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ml-2 capitalize ${STATUS_COLORS[event.status] || ''}`}>
          {event.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-[#5C5C5C]">
        <span className="flex items-center gap-1"><Calendar size={14} />{event.event_date}</span>
        <span className="flex items-center gap-1"><Users size={14} />{event.guest_count} guests</span>
      </div>
      {score !== null && score !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#EBE5DB] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${score}%`,
                background: score >= 80 ? '#4A7C59' : score >= 60 ? '#C9A84C' : '#D9534F'
              }}
            />
          </div>
          <span className="text-xs font-bold" style={{color: score >= 80 ? '#4A7C59' : score >= 60 ? '#C9A84C' : '#D9534F'}}>
            {score}%
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-medium text-[#5C5C5C]">Budget: {event.budget?.toLocaleString()} RWF</span>
        <span className="text-xs text-[#5C5C5C]">{event.staff_ids?.length || 0} staff</span>
      </div>
    </div>
  );
}

function EventFormModal({ onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', event_date: '', venue: '', client_name: '', budget: '', guest_count: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await eventsAPI.create({ ...form, budget: Number(form.budget), guest_count: Number(form.guest_count) });
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-scale-in" data-testid="event-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('events.new_event')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.event_name')}</label>
              <input className="input-wedding" placeholder="Uwase & Nkurunziza Wedding" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required data-testid="event-name-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.event_date')}</label>
              <input className="input-wedding" placeholder="dd/mm/yyyy" value={form.event_date} onChange={(e) => setForm({...form, event_date: e.target.value})} required data-testid="event-date-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.venue')}</label>
              <input className="input-wedding" placeholder="Kigali Serena Hotel" value={form.venue} onChange={(e) => setForm({...form, venue: e.target.value})} required data-testid="event-venue-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.client')}</label>
              <input className="input-wedding" placeholder="Client name" value={form.client_name} onChange={(e) => setForm({...form, client_name: e.target.value})} data-testid="event-client-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.guests')}</label>
              <input className="input-wedding" type="number" placeholder="200" value={form.guest_count} onChange={(e) => setForm({...form, guest_count: e.target.value})} data-testid="event-guests-input" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.budget')}</label>
              <input className="input-wedding" type="number" placeholder="10000000" value={form.budget} onChange={(e) => setForm({...form, budget: e.target.value})} data-testid="event-budget-input" />
            </div>
          </div>
          {error && <p className="text-sm text-[#D9534F]" data-testid="event-error">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="event-save-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const { t } = useLang();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await eventsAPI.list(params);
      setEvents(data.events || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [search, statusFilter]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('events.title')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="new-event-btn">
          <Plus size={18} /> {t('events.new_event')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
          <input
            className="input-wedding pl-10"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="event-search"
          />
        </div>
        <select
          className="input-wedding w-full sm:w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          data-testid="status-filter"
        >
          <option value="">{t('common.all')}</option>
          <option value="planning">{t('events.status.planning')}</option>
          <option value="active">{t('events.status.active')}</option>
          <option value="completed">{t('events.status.completed')}</option>
          <option value="cancelled">{t('events.status.cancelled')}</option>
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <Calendar size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('common.no_data')}</p>
          <button onClick={() => setShowModal(true)} className="mt-4 btn-gold px-6 py-2.5 text-sm" data-testid="create-first-event">Create your first event</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((ev) => (
            <EventCard key={ev.event_id} event={ev} onClick={() => setSelectedEvent(ev)} />
          ))}
        </div>
      )}

      {showModal && (
        <EventFormModal onClose={() => setShowModal(false)} onSave={(ev) => { setEvents([ev, ...events]); setShowModal(false); }} />
      )}
    </div>
  );
}
