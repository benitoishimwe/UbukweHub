import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { messagesAPI } from '../services/api';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Loader2, CheckCheck, Users, Search,
  ShieldCheck, ChevronRight, ArrowLeft,
} from 'lucide-react';

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString())     return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function initials(name) {
  return (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function roleColor(role) {
  if (role === 'tenant_admin' || role === 'super_admin') return 'bg-[#0F4C5C]';
  if (role === 'event_manager') return 'bg-[#4A7C59]';
  return 'bg-[#C9A84C]';
}

const CLIENT_ROLES = ['client'];
const ADMIN_ROLES  = ['tenant_admin', 'super_admin'];
const STAFF_ROLES  = ['staff', 'event_manager'];

// ─── DM Thread view ───────────────────────────────────────────────────────────

function DMThread({ partner, currentUser, tenantMembers, onBack }) {
  const [messages, setMessages]  = useState([]);
  const [input, setInput]        = useState('');
  const [loading, setLoading]    = useState(true);
  const [sending, setSending]    = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const fetchMessages = useCallback(async () => {
    if (!partner) return;
    try {
      const res = await messagesAPI.conversation(partner.userId);
      setMessages(res.data?.messages || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [partner]);

  const markRead = useCallback(async () => {
    if (!partner) return;
    try { await messagesAPI.markConvRead(partner.userId); } catch { /* silent */ }
  }, [partner]);

  useEffect(() => {
    if (!partner) return;
    setLoading(true);
    setMessages([]);
    fetchMessages();
    markRead();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => { fetchMessages(); markRead(); }, 4000);
    return () => clearInterval(pollRef.current);
  }, [partner, fetchMessages, markRead]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending || !partner) return;
    setSending(true);
    const optimistic = {
      messageId: `tmp-${Date.now()}`,
      senderId:   currentUser.userId,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      content:    text,
      createdAt:  new Date().toISOString(),
      isRead:     false,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      await messagesAPI.sendDM({ recipientId: partner.userId, content: text });
      await fetchMessages();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      setInput(text);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!partner) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center text-center bg-[#F9F9FB]">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center mb-4 shadow-sm">
          <MessageSquare size={28} className="text-[#D1D5DB]" />
        </div>
        <p className="text-sm font-semibold text-[#374151]">Select a conversation</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Choose someone from the left to start messaging</p>
      </div>
    );
  }

  // Group messages by day
  const grouped = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) { grouped.push({ type: 'day', label: formatDay(msg.createdAt), key: day }); lastDay = day; }
    grouped.push({ type: 'msg', msg });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#F9F9FB]">
      {/* Thread header */}
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="sm:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} className="text-[#374151]" />
          </button>
        )}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${roleColor(partner.role)}`}>
          {initials(partner.name)}
        </div>
        <div>
          <p className="font-semibold text-sm text-[#111827]">{partner.name}</p>
          <p className="text-xs text-[#6B7280] capitalize">{partner.role.replace(/_/g, ' ')}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white mb-4 ${roleColor(partner.role)}`}>
              {initials(partner.name)}
            </div>
            <p className="text-sm font-semibold text-[#374151]">{partner.name}</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Say hello!</p>
          </div>
        ) : (
          grouped.map((item) => {
            if (item.type === 'day') {
              return (
                <div key={item.key} className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                  <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide px-2">{item.label}</span>
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                </div>
              );
            }
            const { msg } = item;
            const isMe = msg.senderId === currentUser.userId;
            return (
              <div key={msg.messageId} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                {!isMe && (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${roleColor(partner.role)}`}>
                    {initials(partner.name)}
                  </div>
                )}
                <div className={`max-w-[68%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isMe ? 'bg-[#0F4C5C] text-white rounded-br-sm'
                         : 'bg-white text-[#111827] rounded-bl-sm border border-[#E5E7EB]'
                  }`}>
                    {msg.content}
                  </div>
                  <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
                    {isMe && (
                      <CheckCheck size={12} className={msg.isRead ? 'text-[#C9A84C]' : 'text-[#9CA3AF]'} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB] px-4 py-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${roleColor(currentUser.role)}`}>
            {initials(currentUser.name)}
          </div>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={`Message ${partner.name}…`}
            maxLength={1000}
            className="flex-1 bg-[#F3F4F6] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center hover:bg-[#1A6B82] disabled:opacity-40 transition-colors flex-shrink-0 shadow-sm"
          >
            {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Contact list (left panel) ────────────────────────────────────────────────

function ContactList({ members, previews, selectedId, onSelect, loading, search, setSearch, mobileShowThread }) {
  // Merge members with preview data
  const contacts = members.map(m => {
    const preview = previews.find(p => p.partner?.userId === m.userId);
    return { ...m, lastMessage: preview?.lastMessage, unreadCount: preview?.unreadCount || 0 };
  }).sort((a, b) => {
    // Sort by last message time desc, then by role (admin first), then name
    if (a.lastMessage && b.lastMessage)
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    const roleOrder = { tenant_admin: 0, super_admin: 0, event_manager: 1, staff: 2 };
    return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
  });

  const filtered = contacts.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.role.replace(/_/g, ' ').includes(search.toLowerCase())
  );

  return (
    <div className={`${mobileShowThread ? 'hidden sm:flex' : 'flex'} flex-col bg-white border-r border-[#E5E7EB] w-full sm:w-64 flex-shrink-0`}>
      <div className="px-3 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-2">
          <Search size={13} className="text-[#9CA3AF] shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team…"
            className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Loader2 size={20} className="animate-spin text-[#C9A84C]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#9CA3AF] italic text-center pt-8 px-4">No team members found</p>
        ) : (
          filtered.map(c => (
            <button
              key={c.userId}
              onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#F9F9FB] transition-colors text-left ${
                selectedId === c.userId ? 'bg-[#EFF6FF] border-r-2 border-[#0F4C5C]' : ''
              }`}
            >
              <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white ${roleColor(c.role)}`}>
                  {initials(c.name)}
                </div>
                {c.unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center">
                    {c.unreadCount > 9 ? '9+' : c.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-semibold truncate ${c.unreadCount > 0 ? 'text-[#111827]' : 'text-[#374151]'}`}>
                    {c.name}
                  </span>
                  {c.lastMessage && (
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{timeAgo(c.lastMessage.createdAt)}</span>
                  )}
                </div>
                <p className={`text-[11px] truncate mt-0.5 ${c.unreadCount > 0 ? 'font-semibold text-[#374151]' : 'text-[#9CA3AF]'}`}>
                  {c.lastMessage ? c.lastMessage.content : <span className="italic capitalize">{c.role.replace(/_/g, ' ')}</span>}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Client broadcast view (admin only) ──────────────────────────────────────

function ClientBroadcastView({ currentUser }) {
  const [messages, setMessages]  = useState([]);
  const [input, setInput]        = useState('');
  const [loading, setLoading]    = useState(true);
  const [sending, setSending]    = useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await messagesAPI.clientMessages();
      setMessages(res.data?.messages || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const markRead = useCallback(async () => {
    try { await messagesAPI.markClientsRead(); } catch { /* silent */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages(); markRead();
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => { fetchMessages(); markRead(); }, 5000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages, markRead]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const optimistic = {
      messageId: `tmp-${Date.now()}`, senderId: currentUser.userId,
      senderName: currentUser.name, senderRole: currentUser.role,
      content: text, createdAt: new Date().toISOString(), isRead: false,
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    try {
      await messagesAPI.sendClientMsg({ content: text });
      await fetchMessages();
    } catch (err) {
      setMessages(prev => prev.filter(m => m.messageId !== optimistic.messageId));
      setInput(text);
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally { setSending(false); }
  };

  const grouped = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) { grouped.push({ type: 'day', label: formatDay(msg.createdAt), key: day }); lastDay = day; }
    grouped.push({ type: 'msg', msg });
  }

  const clientCount = [...new Set(messages.filter(m => CLIENT_ROLES.includes(m.senderRole)).map(m => m.senderId))].length;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Participants */}
      <div className="hidden lg:flex w-52 flex-col bg-white border-r border-[#E5E7EB]">
        <div className="px-4 py-3 border-b border-[#E5E7EB]">
          <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide flex items-center gap-1.5">
            <Users size={11} /> Clients
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {[...new Map(messages.filter(m => CLIENT_ROLES.includes(m.senderRole)).map(m => [m.senderId, m])).values()].map(m => (
            <div key={m.senderId} className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-[#F9F9FB]">
              <div className="w-7 h-7 rounded-full bg-[#C9A84C] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {initials(m.senderName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#111827] truncate">{m.senderName}</p>
                <p className="text-[10px] text-[#C9A84C] capitalize">client</p>
              </div>
            </div>
          ))}
          {clientCount === 0 && <p className="text-xs text-[#9CA3AF] italic text-center pt-4">No clients yet</p>}
        </div>
      </div>

      {/* Chat */}
      <div className="flex flex-col flex-1 min-h-0 bg-[#F9F9FB]">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-[#C9A84C]" /></div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <MessageSquare size={28} className="text-[#D1D5DB] mb-3" />
              <p className="text-sm font-semibold text-[#374151]">No messages yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Client messages will appear here</p>
            </div>
          ) : (
            grouped.map((item) => {
              if (item.type === 'day') {
                return (
                  <div key={item.key} className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide px-2">{item.label}</span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>
                );
              }
              const { msg } = item;
              const isMe     = msg.senderId === currentUser.userId;
              const isClient = CLIENT_ROLES.includes(msg.senderRole);
              return (
                <div key={msg.messageId} className={`flex gap-2.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                  {!isMe && (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${isClient ? 'bg-[#C9A84C]' : 'bg-[#0F4C5C]'}`}>
                      {initials(msg.senderName)}
                    </div>
                  )}
                  <div className={`max-w-[68%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-[10px] text-[#6B7280] px-1 font-medium">
                        {msg.senderName}
                        <span className={`ml-1 ${isClient ? 'text-[#C9A84C]' : 'text-[#0F4C5C]'}`}>
                          · {msg.senderRole.replace(/_/g, ' ')}
                        </span>
                      </span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isMe ? 'bg-[#0F4C5C] text-white rounded-br-sm'
                           : isClient ? 'bg-white text-[#111827] rounded-bl-sm border border-[#E5E7EB]'
                                      : 'bg-[#E8F4F8] text-[#111827] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
                      {isMe && <CheckCheck size={12} className={msg.isRead ? 'text-[#C9A84C]' : 'text-[#9CA3AF]'} />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB] px-4 py-3">
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0F4C5C] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {initials(currentUser.name)}
            </div>
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Reply to your clients…" maxLength={1000}
              className="flex-1 bg-[#F3F4F6] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30 transition-all"
            />
            <button type="submit" disabled={!input.trim() || sending}
              className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center hover:bg-[#1A6B82] disabled:opacity-40 transition-colors flex-shrink-0">
              {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();

  const isAdmin  = ADMIN_ROLES.includes(user?.role);
  const isClient = CLIENT_ROLES.includes(user?.role);

  // admin has two tabs; staff/client go directly to their view
  const [activeTab, setActiveTab] = useState('team'); // 'team' | 'clients'

  const [members,  setMembers]   = useState([]);
  const [previews, setPreviews]  = useState([]);
  const [selected, setSelected]  = useState(null);
  const [search,   setSearch]    = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [mobileShowThread, setMobileShowThread] = useState(false);

  const fetchTeamData = useCallback(async () => {
    if (isClient) return;
    try {
      const [mRes, pRes] = await Promise.all([
        messagesAPI.team(),
        messagesAPI.conversations(),
      ]);
      setMembers(mRes.data?.members || []);
      setPreviews(pRes.data?.conversations || []);
    } catch { /* silent */ }
    finally { setMembersLoading(false); }
  }, [isClient]);

  useEffect(() => {
    fetchTeamData();
    const id = setInterval(fetchTeamData, 5000);
    return () => clearInterval(id);
  }, [fetchTeamData]);

  const showTeam = !isClient && (isAdmin ? activeTab === 'team' : true);

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
            showTeam ? 'bg-[#4A7C59]' : 'bg-[#0F4C5C]'
          }`}>
            {showTeam ? <Users size={18} className="text-white" /> : <MessageSquare size={18} className="text-white" />}
          </div>
          <div>
            <h1 className="font-bold text-[#111827] text-lg" style={{ fontFamily: 'Playfair Display,serif' }}>
              {showTeam ? 'Team Chat' : isClient ? 'Messages' : 'Client Messages'}
            </h1>
            <p className="text-xs text-[#6B7280]">
              {showTeam ? `${members.length} team member${members.length !== 1 ? 's' : ''}` : 'Messages from your clients'}
            </p>
          </div>
        </div>

        {/* Admin tab switcher */}
        {isAdmin && (
          <div className="flex rounded-xl border border-[#E5E7EB] overflow-hidden text-xs font-semibold">
            <button
              onClick={() => { setActiveTab('clients'); setMobileShowThread(false); }}
              className={`px-3 py-1.5 transition-colors ${activeTab === 'clients' ? 'bg-[#0F4C5C] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
            >
              Clients
            </button>
            <button
              onClick={() => { setActiveTab('team'); setMobileShowThread(false); }}
              className={`px-3 py-1.5 transition-colors ${activeTab === 'team' ? 'bg-[#4A7C59] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'}`}
            >
              Team
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {isClient ? (
          // Clients see a simple view — their messages to admin
          <ClientBroadcastView currentUser={user} />
        ) : isAdmin && activeTab === 'clients' ? (
          // Admin "Clients" tab
          <ClientBroadcastView currentUser={user} />
        ) : (
          // Team DM view — staff + admin "Team" tab
          <>
            <ContactList
              members={members}
              previews={previews}
              selectedId={selected?.userId}
              onSelect={(m) => { setSelected(m); setSearch(''); setMobileShowThread(true); }}
              loading={membersLoading}
              search={search}
              setSearch={setSearch}
              mobileShowThread={mobileShowThread}
            />
            <div className={`${!mobileShowThread ? 'hidden sm:flex' : 'flex'} flex-1 min-h-0 overflow-hidden`}>
              <DMThread
                partner={selected}
                currentUser={user}
                tenantMembers={members}
                onBack={() => setMobileShowThread(false)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
