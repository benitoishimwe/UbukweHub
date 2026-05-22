import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { eventsAPI, staffAPI } from '../services/api';
import {
  Calendar, Users, Plus, ChevronRight, CheckSquare,
  Clock, MapPin, TrendingUp, Star,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card-wedding p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#5C5C5C] font-medium">{label}</p>
          <p className="text-3xl font-bold text-[#2D2D2D] mt-1" style={{ fontFamily: 'Playfair Display,serif' }}>{value}</p>
          {sub && <p className="text-xs text-[#5C5C5C] mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    planning: 'bg-blue-100 text-blue-700',
    active:   'bg-green-100 text-green-700',
    completed:'bg-gray-100 text-gray-600',
    cancelled:'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status ?? 'unknown'}
    </span>
  );
}

export default function EventManagerDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.good_morning');
    if (h < 18) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
  };

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsRes, eventsRes, shiftsRes] = await Promise.allSettled([
          eventsAPI.stats(),
          eventsAPI.list({ size: 5, page: 1 }),
          staffAPI.shifts({ date: today }),
        ]);

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data ?? {});
        }
        if (eventsRes.status === 'fulfilled') {
          const payload = eventsRes.value.data ?? {};
          setUpcomingEvents(payload.events ?? (Array.isArray(payload) ? payload : []));
        }
        if (shiftsRes.status === 'fulfilled') {
          const payload = shiftsRes.value.data ?? {};
          const shifts = payload.shifts ?? (Array.isArray(payload) ? payload : []);
          setTodayShifts(shifts.slice(0, 5));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const quickActions = [
    { label: 'New Event',    color: 'bg-[#F3E5F5] text-[#7B1FA2]', action: () => navigate('/events'), icon: Plus },
    { label: 'View Events',  color: 'bg-[#E8F5EE] text-[#4A7C59]', action: () => navigate('/events'), icon: Calendar },
    { label: 'Assign Staff', color: 'bg-[#E3F2FD] text-[#1565C0]', action: () => navigate('/staff'),  icon: Users },
    { label: 'AI Planner',   color: 'bg-[#FFF3E0] text-[#C9A84C]', action: () => navigate('/ai'),     icon: Star },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-[#5C5C5C] mt-1">
          {new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Active Events"
          value={loading ? '…' : (stats.active ?? 0)}
          sub={`${stats.planning ?? 0} in planning`}
          color="bg-[#C9A84C]"
        />
        <StatCard
          icon={CheckSquare}
          label="Completed"
          value={loading ? '…' : (stats.completed ?? 0)}
          sub="All time"
          color="bg-[#4A7C59]"
        />
        <StatCard
          icon={Users}
          label="Staff on Duty"
          value={loading ? '…' : todayShifts.length}
          sub="Today"
          color="bg-[#6B8E9B]"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card-wedding p-6 animate-slide-up stagger-1" data-testid="quick-actions">
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className={`rounded-xl p-4 text-left font-semibold text-sm flex flex-col gap-2 hover:opacity-80 active:scale-95 transition-all ${qa.color}`}
              >
                <qa.icon size={20} />
                {qa.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card-wedding p-6 animate-slide-up stagger-2 lg:col-span-2" data-testid="upcoming-events">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>Upcoming Events</h2>
            <button onClick={() => navigate('/events')} className="text-sm text-[#C9A84C] font-medium flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight size={16} />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl bg-[#F5F0E8] animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8 text-[#5C5C5C]">
              <Calendar size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No events yet</p>
              <button
                onClick={() => navigate('/events')}
                className="mt-3 px-4 py-2 bg-[#0F4C5C] text-white rounded-lg text-sm font-medium hover:bg-[#1A6B82]"
              >
                Create First Event
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event) => (
                <div
                  key={event.event_id ?? event.id}
                  onClick={() => navigate('/events')}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#F9F9FB] hover:bg-[#F0F0F5] cursor-pointer transition-colors"
                  data-testid="event-row"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0">
                      <Calendar size={18} className="text-[#C9A84C]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#2D2D2D] truncate">{event.name}</p>
                      <p className="text-xs text-[#5C5C5C] flex items-center gap-1">
                        {event.venue && <><MapPin size={10} /> {event.venue} · </>}
                        {event.event_date
                          ? new Date(event.event_date).toLocaleDateString()
                          : 'No date set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {event.guest_count && (
                      <span className="text-xs text-[#5C5C5C] hidden sm:inline">
                        {event.guest_count} guests
                      </span>
                    )}
                    <StatusBadge status={event.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff on Duty Today */}
      {!loading && todayShifts.length > 0 && (
        <div className="mt-6 card-wedding p-6 animate-slide-up stagger-3" data-testid="staff-on-duty">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <h2 className="text-lg font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
              Staff on Duty Today
            </h2>
            <button onClick={() => navigate('/staff')} className="text-sm text-[#C9A84C] font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Manage <ChevronRight size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayShifts.map((shift, i) => (
              <div key={shift.shift_id ?? i} className="flex items-center gap-3 p-3 rounded-xl bg-[#F9F9FB]">
                <div className="w-9 h-9 rounded-full bg-[#0F4C5C] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {(shift.staff_name ?? shift.name ?? '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#2D2D2D] truncate">
                    {shift.staff_name ?? shift.name ?? 'Unknown'}
                  </p>
                  <p className="text-xs text-[#5C5C5C] flex items-center gap-1">
                    <Clock size={10} />
                    {shift.start_time ?? shift.shiftStart ?? '—'} – {shift.end_time ?? shift.shiftEnd ?? '—'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Planner CTA */}
      <div className="mt-6 bg-gradient-to-r from-[#0F4C5C] to-[#1A6B82] rounded-2xl p-6 text-white animate-slide-up stagger-4" data-testid="ai-planner-cta">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Playfair Display,serif' }}>AI Event Planner</h3>
            <p className="text-white/80 text-sm">Generate checklists, timelines, and seating plans</p>
          </div>
          <button
            onClick={() => navigate('/ai')}
            className="px-4 py-2 bg-white text-[#0F4C5C] rounded-full font-semibold text-sm hover:bg-white/90 transition-all flex items-center gap-2"
            data-testid="open-planner-btn"
          >
            <TrendingUp size={16} /> Open Planner
          </button>
        </div>
      </div>
    </div>
  );
}
