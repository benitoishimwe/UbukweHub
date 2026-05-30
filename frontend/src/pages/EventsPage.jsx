import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { eventsAPI } from '../services/api';
import { Plus, Search, Calendar, Users, MapPin, Loader } from 'lucide-react';
import EventDetailModal from '../components/events/EventDetailModal';

const STATUS_COLORS = {
  planning: 'badge-planning',
  active: 'badge-active',
  completed: 'badge-completed',
  cancelled: 'bg-gray-100 text-gray-600',
};

function EventCard({ event, onClick }) {
  const score = event.greatnessScore;
  return (
    <div
      className="card-wedding p-5 cursor-pointer"
      onClick={onClick}
      data-testid="event-card"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#2D2D2D] text-base truncate" style={{ fontFamily: 'Playfair Display,serif' }}>{event.name}</h3>
          <div className="flex items-center gap-1 text-[#5C5C5C] text-xs mt-1">
            <MapPin size={12} />{event.venue}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ml-2 capitalize ${STATUS_COLORS[event.status] || ''}`}>
          {event.status}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-[#5C5C5C]">
        <span className="flex items-center gap-1">
          <Calendar size={14} />
          {event.eventDate ? new Date(event.eventDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
        </span>
        <span className="flex items-center gap-1"><Users size={14} />{event.guestCount ?? 0} guests</span>
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
          <span className="text-xs font-bold" style={{ color: score >= 80 ? '#4A7C59' : score >= 60 ? '#C9A84C' : '#D9534F' }}>
            {score}%
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs font-medium text-[#5C5C5C]">
          Budget: {event.budget ? Number(event.budget).toLocaleString() + ' RWF' : '—'}
        </span>
        <span className="text-xs text-[#5C5C5C]">{event.staffIds?.length || 0} staff</span>
      </div>
    </div>
  );
}

function EventFormModal({ onClose, onSave, isClient }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', eventDate: '', venue: '', clientName: '', budget: '', currency: 'RWF', guestCount: '', eventTypeSlug: '' });
  const [eventTypes, setEventTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    eventsAPI.getTypes().then(res => setEventTypes(res.data || [])).catch(() => {});
  }, []);

  const isWedding = form.eventTypeSlug === 'wedding';
  const namePlaceholder = isWedding ? 'e.g. Uwase & Nkurunziza Wedding' : 'e.g. Annual Company Gala';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await eventsAPI.create({
        name: form.name,
        eventDate: form.eventDate || undefined,
        venue: form.venue || undefined,
        clientName: form.clientName || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        currency: form.currency || 'RWF',
        guestCount: form.guestCount ? Number(form.guestCount) : undefined,
        eventTypeSlug: form.eventTypeSlug || undefined,
      });
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-scale-in" data-testid="event-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{t('events.new_event')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Event Type</label>
              <select
                className="input-wedding"
                value={form.eventTypeSlug}
                onChange={(e) => setForm({ ...form, eventTypeSlug: e.target.value, name: '' })}
                data-testid="event-type-select"
              >
                <option value="">Select event type…</option>
                {eventTypes.map(et => (
                  <option key={et.slug} value={et.slug}>{et.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.event_name')}</label>
              <input
                className="input-wedding"
                placeholder={namePlaceholder}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                data-testid="event-name-input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.event_date')}</label>
              <input className="input-wedding" type="date" value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required data-testid="event-date-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.venue')}</label>
              <input className="input-wedding" placeholder="Kigali Serena Hotel" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required data-testid="event-venue-input" />
            </div>
            {!isClient && (
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.client')}</label>
                <input className="input-wedding" placeholder="Client name" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} data-testid="event-client-input" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('events.guests')}</label>
              <input className="input-wedding" type="number" placeholder="200" value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} data-testid="event-guests-input" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Budget ({form.currency})</label>
              <div className="grid gap-2" style={{ gridTemplateColumns: '140px 1fr' }}>
                <select
                  className="input-wedding"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  data-testid="event-currency-select"
                >
                  <option value="RWF">RWF (Frw)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <input
                  className="input-wedding"
                  type="number"
                  placeholder="0"
                  min="0"
                  value={form.budget}
                  onChange={(e) => setForm({ ...form, budget: e.target.value })}
                  data-testid="event-budget-input"
                />
              </div>
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
  const { isClient } = useAuth();
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchEvents(); }, [search, statusFilter]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{t('events.title')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="new-event-btn">
          <Plus size={18} /> {t('events.new_event')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2.5 flex-1 bg-white border border-[#EBE5DB] rounded-xl px-3.5 focus-within:border-[#C9A84C] focus-within:ring-2 focus-within:ring-[#C9A84C]/20 transition-all">
          <Search size={18} className="text-[#5C5C5C] flex-shrink-0" />
          <input
            className="flex-1 py-2.5 text-sm text-[#2D2D2D] placeholder-[#9CA3AF] outline-none bg-transparent"
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
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
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
            <EventCard key={ev.eventId} event={ev} onClick={() => setSelectedEvent(ev)} />
          ))}
        </div>
      )}

      {showModal && (
        <EventFormModal isClient={isClient} onClose={() => setShowModal(false)} onSave={(ev) => { setEvents([ev, ...events]); setShowModal(false); }} />
      )}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={(updated, deletedId) => {
            if (!updated && deletedId) {
              // Event was deleted
              setEvents(prev => prev.filter(e => e.eventId !== deletedId));
              setSelectedEvent(null);
            } else if (updated) {
              // Event was edited
              setEvents(prev => prev.map(e => e.eventId === updated.eventId ? { ...e, ...updated } : e));
              setSelectedEvent(updated);
            }
          }}
        />
      )}
    </div>
  );
}
