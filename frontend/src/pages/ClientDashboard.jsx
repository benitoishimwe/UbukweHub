import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventsAPI, plannerAPI, messagesAPI } from '../services/api';
import { toast } from 'sonner';
import {
  Calendar, Heart, Clock, ChevronRight, Sparkles, Camera, MessageCircle,
  Send, X, Loader2, CheckCheck,
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

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ status }) {
  const map = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    planning:  'bg-amber-50 text-amber-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-50 text-red-600',
    upcoming:  'bg-blue-50 text-blue-700',
    active:    'bg-green-50 text-green-700',
  };
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full capitalize ${map[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  );
}

// ─── Chat Modal ───────────────────────────────────────────────────────────────
function ChatModal({ user, onClose }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loading, setLoading]     = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesAPI.list({ size: 100 });
      setMessages(res.data?.messages || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark messages as read when chat opens
  const markRead = useCallback(async () => {
    try { await messagesAPI.markRead({ eventId: undefined }); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchMessages();
    markRead();
    // Poll every 5 seconds for new messages
    pollRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic = {
      messageId: `tmp-${Date.now()}`,
      senderId: user.userId,
      senderName: user.name,
      senderRole: user.role,
      content: text,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      await messagesAPI.send({ content: text });
      await fetchMessages();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      setInput(text);
      const msg = err.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const isMe = (msg) => msg.senderId === user.userId;
  const plannerRoles = ['tenant_admin', 'event_manager', 'staff'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
      <div className="w-full sm:w-[420px] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col" style={{ height: '80vh', maxHeight: 600 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F3F4F6] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0F4C5C] flex items-center justify-center">
              <MessageCircle size={17} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-[#111827] text-sm">Your Event Team</h3>
              <p className="text-[10px] text-[#6B7280]">Messages with your planner</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9F9FB]">
            <X size={18} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center mb-3">
                <MessageCircle size={24} className="text-[#9CA3AF]" />
              </div>
              <p className="text-sm font-semibold text-[#111827]">No messages yet</p>
              <p className="text-xs text-[#6B7280] mt-1">Send a message to your event team</p>
            </div>
          ) : (
            messages.map((msg) => {
              const mine = isMe(msg);
              const isPlanner = plannerRoles.includes(msg.senderRole);
              return (
                <div key={msg.messageId} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] ${mine ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    {!mine && (
                      <span className="text-[10px] text-[#6B7280] px-1 font-medium">
                        {msg.senderName} {isPlanner ? '· Planner' : ''}
                      </span>
                    )}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      mine
                        ? 'bg-[#0F4C5C] text-white rounded-br-sm'
                        : 'bg-[#F3F4F6] text-[#111827] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${mine ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
                      {mine && <CheckCheck size={12} className={msg.isRead ? 'text-[#0F4C5C]' : 'text-[#9CA3AF]'} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 border-t border-[#F3F4F6] flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 bg-[#F9F9FB] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30"
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center hover:bg-[#1A6B82] disabled:opacity-40 transition-colors flex-shrink-0"
          >
            {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export default function ClientDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [events, setEvents]     = useState([]);
  const [plan, setPlan]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread]     = useState(0);

  const firstName = user?.name?.split(' ')[0] || user?.name || 'there';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    (async () => {
      try {
        const [evRes, plRes, unreadRes] = await Promise.allSettled([
          eventsAPI.list({ limit: 10 }),
          plannerAPI.getCurrent(),
          messagesAPI.unreadCount(),
        ]);
        if (evRes.status === 'fulfilled') {
          const data = evRes.value.data;
          setEvents(Array.isArray(data) ? data : data.content ?? data.events ?? []);
        }
        if (plRes.status === 'fulfilled') setPlan(plRes.value.data);
        if (unreadRes.status === 'fulfilled') setUnread(unreadRes.value.data?.count || 0);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Poll unread count every 15s when chat is closed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (chatOpen) return;
    const id = setInterval(async () => {
      try {
        const res = await messagesAPI.unreadCount();
        setUnread(res.data?.count || 0);
      } catch { /* silent */ }
    }, 15000);
    return () => clearInterval(id);
  }, [chatOpen]);

  const upcomingEvents = events
    .filter(e => e.status !== 'completed' && e.status !== 'cancelled')
    .sort((a, b) => new Date(a.eventDate || a.event_date) - new Date(b.eventDate || b.event_date));

  const weddingDate = plan?.weddingDate || plan?.wedding_date;
  const countdown   = daysUntil(weddingDate);

  return (
    <>
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
              { icon: Calendar,  label: 'My Events',      path: '/events',      color: 'bg-amber-50  text-amber-600'  },
              { icon: Heart,     label: 'Wedding Planner', path: '/planner',    color: 'bg-rose-50   text-rose-500'   },
              { icon: Sparkles,  label: 'AI Assistant',   path: '/ai',          color: 'bg-violet-50 text-violet-600' },
              { icon: Camera,    label: 'Marketplace',    path: '/marketplace', color: 'bg-teal-50  text-teal-600'   },
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
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
              <button onClick={() => navigate('/events')} className="mt-3 text-xs text-[#C9A84C] font-semibold underline underline-offset-2">
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

        {/* Wedding Planner Promo */}
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

        {/* Message your planner — LIVE */}
        <button
          onClick={() => { setChatOpen(true); setUnread(0); }}
          className="w-full bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgb(0,0,0,0.04)] hover:shadow-[0_4px_20px_rgb(0,0,0,0.08)] transition-all flex items-center gap-3 text-left"
        >
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center">
              <MessageCircle size={18} className="text-[#0F4C5C]" />
            </div>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#DC2626] text-white text-[10px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#111827]">Message your planner</p>
            <p className="text-xs text-[#6B7280] truncate">
              {unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''}` : 'Chat directly with your event team'}
            </p>
          </div>
          <ChevronRight size={16} className="text-[#9CA3AF] flex-shrink-0" />
        </button>

      </div>

      {chatOpen && <ChatModal user={user} onClose={() => setChatOpen(false)} />}
    </>
  );
}
