import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { eventsAPI, plannerAPI } from '../services/api';
import {
  Calendar, Heart, Clock, ChevronRight, Sparkles, Camera, MessageCircle,
} from 'lucide-react';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
}

function StatusBadge({ status }) {
  const map = {
    upcoming:   'bg-blue-50 text-blue-700',
    active:     'bg-green-50 text-green-700',
    completed:  'bg-gray-100 text-gray-600',
    cancelled:  'bg-red-50 text-red-600',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents]   = useState([]);
  const [plan, setPlan]       = useState(null);
  const [loading, setLoading] = useState(true);

  const firstName = user?.name?.split(' ')[0] || user?.name || 'there';

  useEffect(() => {
    (async () => {
      try {
        const [evRes, plRes] = await Promise.allSettled([
          eventsAPI.list({ limit: 10 }),
          plannerAPI.getCurrent(),
        ]);
        if (evRes.status === 'fulfilled') {
          const data = evRes.value.data;
          setEvents(Array.isArray(data) ? data : data.content ?? data.events ?? []);
        }
        if (plRes.status === 'fulfilled') {
          setPlan(plRes.value.data);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcomingEvents = events
    .filter(e => e.status !== 'completed' && e.status !== 'cancelled')
    .sort((a, b) => new Date(a.eventDate || a.event_date) - new Date(b.eventDate || b.event_date));

  const weddingDate = plan?.weddingDate || plan?.wedding_date;
  const countdown   = daysUntil(weddingDate);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
          {greeting()}, {firstName}
        </h1>
        <p className="text-[#5C5C5C] mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Wedding countdown */}
      {countdown !== null && countdown > 0 && (
        <div className="rounded-2xl p-5 text-white flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #C9A84C 0%, #8B6914 100%)' }}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Heart size={28} className="text-white fill-white" />
          </div>
          <div className="flex-1">
            <p className="text-white/80 text-sm font-medium">Wedding Countdown</p>
            <p className="text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              {countdown} <span className="text-2xl font-semibold">days to go</span>
            </p>
            <p className="text-white/70 text-xs mt-0.5">{formatDate(weddingDate)}</p>
          </div>
          <button
            onClick={() => navigate('/planner')}
            className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            View planner <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-[#5C5C5C] uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Calendar,       label: 'My Events',      path: '/events',    color: 'bg-amber-50  text-amber-600'  },
            { icon: Heart,          label: 'Wedding Planner', path: '/planner',   color: 'bg-rose-50   text-rose-500'   },
            { icon: Sparkles,       label: 'AI Assistant',   path: '/ai',        color: 'bg-violet-50 text-violet-600' },
            { icon: Camera,         label: 'Marketplace',    path: '/marketplace', color: 'bg-teal-50  text-teal-600'  },
          ].map(({ icon: Icon, label, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all flex flex-col items-center gap-2 text-center"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={20} />
              </div>
              <span className="text-xs font-semibold text-[#2D2D2D]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#5C5C5C] uppercase tracking-wide">Upcoming Events</h2>
          <button onClick={() => navigate('/events')} className="text-xs text-[#C9A84C] font-semibold flex items-center gap-0.5">
            View all <ChevronRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_12px_rgb(0,0,0,0.04)]">
            <Calendar size={32} className="mx-auto mb-2 text-[#EBE5DB]" />
            <p className="text-[#5C5C5C] text-sm">No upcoming events yet</p>
            <button
              onClick={() => navigate('/events')}
              className="mt-3 text-xs text-[#C9A84C] font-semibold underline underline-offset-2"
            >
              Browse events
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.slice(0, 4).map(event => {
              const date = event.eventDate || event.event_date;
              const days = daysUntil(date);
              return (
                <div
                  key={event.eventId || event.id}
                  onClick={() => navigate('/events')}
                  className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all cursor-pointer flex items-center gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#C9A84C15] flex items-center justify-center flex-shrink-0">
                    <Calendar size={20} className="text-[#C9A84C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-[#2D2D2D] text-sm truncate">{event.name}</h3>
                      <StatusBadge status={event.status} />
                    </div>
                    <p className="text-xs text-[#5C5C5C] mt-0.5">{formatDate(date)}</p>
                    {event.venue && <p className="text-xs text-[#9C9C9C] truncate">{event.venue}</p>}
                  </div>
                  {days !== null && days > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-[#C9A84C]" style={{ fontFamily: 'Playfair Display, serif' }}>{days}</p>
                      <p className="text-[10px] text-[#9C9C9C]">days</p>
                    </div>
                  )}
                  <ChevronRight size={16} className="text-[#C9A84C] flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Wedding Planner Promo (if no plan yet) */}
      {!loading && !plan && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgb(0,0,0,0.04)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#C9A84C15] flex items-center justify-center flex-shrink-0">
            <Heart size={22} className="text-[#C9A84C]" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-[#2D2D2D] text-sm">Start your Wedding Planner</h3>
            <p className="text-xs text-[#5C5C5C]">Manage budget, guests, venues, and more — all in one place.</p>
          </div>
          <button
            onClick={() => navigate('/planner')}
            className="flex-shrink-0 px-4 py-2 bg-[#C9A84C] text-white text-xs font-bold rounded-xl hover:bg-[#b8933d] transition-colors"
          >
            Get started
          </button>
        </div>
      )}

      {/* Message Planner placeholder */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.04)] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={18} className="text-blue-500" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#2D2D2D]">Message your planner</p>
          <p className="text-xs text-[#9C9C9C]">Coming soon — direct messaging with your event team</p>
        </div>
        <Clock size={14} className="text-[#C9C9C9]" />
      </div>

    </div>
  );
}
