import React, {
  useEffect, useState, useRef, useCallback, useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { messagesAPI, eventMessagesAPI, eventsAPI } from '../services/api';
import { toast } from 'sonner';
import {
  MessageSquare, Send, Loader2, CheckCheck, Users, Search,
  ArrowLeft, Hash, Pin, PinOff, ListTodo, Paperclip, X,
  FileText, Image, File, CornerUpRight, ChevronRight,
  Bell, AtSign,
} from 'lucide-react';

// ─── Utilities ────────────────────────────────────────────────────────────────

function formatTime(d) {
  return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(d) {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
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
  if (role === 'vendor') return 'bg-purple-600';
  if (role === 'client') return 'bg-[#C9A84C]';
  return 'bg-[#6B7280]';
}

function eventStatusBadge(status) {
  const map = {
    planning:   'bg-blue-100 text-blue-700',
    confirmed:  'bg-green-100 text-green-700',
    completed:  'bg-gray-100 text-gray-600',
    cancelled:  'bg-red-100 text-red-600',
  };
  return map[status] || 'bg-gray-100 text-gray-500';
}

function mimeIcon(mimeType) {
  if (!mimeType) return <File size={16} />;
  if (mimeType.startsWith('image/')) return <Image size={16} className="text-blue-500" />;
  if (mimeType === 'application/pdf') return <FileText size={16} className="text-red-500" />;
  return <File size={16} className="text-gray-500" />;
}

function detectMentions(text) {
  return [...(text.match(/@([\w][\w .'-]{0,49})/g) || [])];
}

function highlightMentions(text) {
  return text.replace(/@([\w][\w .'-]{0,49})/g, '<span class="font-semibold text-[#0F4C5C]">@$1</span>');
}

const ADMIN_ROLES  = ['tenant_admin', 'super_admin'];
const CLIENT_ROLES = ['client'];

// ─── Attachment Preview ───────────────────────────────────────────────────────

function AttachmentBubble({ attachment }) {
  const isImage = attachment.mimeType?.startsWith('image/');
  if (isImage) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer"
        className="block max-w-[220px] rounded-xl overflow-hidden border border-[#E5E7EB] shadow-sm hover:opacity-90 transition-opacity mt-1">
        <img src={attachment.url} alt={attachment.filename} className="w-full h-auto max-h-52 object-cover" />
        <div className="px-2 py-1 bg-white text-[10px] text-[#6B7280] truncate">{attachment.filename}</div>
      </a>
    );
  }
  return (
    <a href={attachment.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 px-3 py-2.5 bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9F9FB] transition-colors mt-1 max-w-[220px]">
      <span className="shrink-0">{mimeIcon(attachment.mimeType)}</span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-[#374151] truncate">{attachment.filename}</p>
        <p className="text-[10px] text-[#9CA3AF]">{Math.round((attachment.size || 0) / 1024)} KB</p>
      </div>
    </a>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ message, eventId, onClose, onCreated }) {
  const [title, setTitle]       = useState(message.content?.slice(0, 100) || '');
  const [desc,  setDesc]        = useState('');
  const [due,   setDue]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [members, setMembers]   = useState([]);
  const [assignTo, setAssignTo] = useState('');

  useEffect(() => {
    eventsAPI.listTasks(eventId).then(r => {
      // load event members for assignment — use admin team endpoint as fallback
    }).catch(() => {});
    // Fetch event detail to get staff list
    eventsAPI.get(eventId).then(r => {
      const ev = r.data;
      const staffIds = Array.isArray(ev?.staffIds) ? ev.staffIds : [];
      if (staffIds.length) {
        // We don't have a bulk user fetch, so skip — user can leave blank
      }
    }).catch(() => {});
  }, [eventId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await eventMessagesAPI.createTask(eventId, message.messageId, {
        title: title.trim(),
        description: desc.trim() || undefined,
        dueDate: due || undefined,
        assignedTo: assignTo || undefined,
      });
      toast.success('Task created');
      onCreated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#111827] flex items-center gap-2">
            <ListTodo size={18} className="text-[#0F4C5C]" /> Create Task from Message
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]">
            <X size={16} className="text-[#6B7280]" />
          </button>
        </div>

        {/* Source message preview */}
        <div className="mb-4 bg-[#F9F9FB] border border-[#E5E7EB] rounded-xl p-3 text-xs text-[#6B7280] italic">
          "{message.content?.slice(0, 120)}{(message.content?.length || 0) > 120 ? '…' : ''}"
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Task Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              className="w-full bg-[#F3F4F6] rounded-xl px-3 py-2.5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30"
              placeholder="What needs to be done?" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2}
              className="w-full bg-[#F3F4F6] rounded-xl px-3 py-2.5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30 resize-none"
              placeholder="Optional description…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">Due Date</label>
            <input type="date" value={due} onChange={e => setDue(e.target.value)}
              className="w-full bg-[#F3F4F6] rounded-xl px-3 py-2.5 text-sm text-[#111827] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30" />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#E5E7EB] text-sm font-semibold text-[#374151] hover:bg-[#F9F9FB] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!title.trim() || saving}
              className="flex-1 py-2.5 rounded-xl bg-[#0F4C5C] text-white text-sm font-semibold hover:bg-[#1A6B82] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <ListTodo size={14} />}
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Thread Panel (replies) ───────────────────────────────────────────────────

function ThreadPanel({ parentMessage, eventId, currentUser, onClose }) {
  const [replies, setReplies]   = useState(parentMessage.replies || []);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const bottomRef               = useRef(null);

  const fetchReplies = useCallback(async () => {
    try {
      // Re-fetch the thread by loading all messages and filtering
      const res = await eventMessagesAPI.list(eventId, { page: 1, size: 200 });
      const parent = res.data?.messages?.find(m => m.messageId === parentMessage.messageId);
      if (parent) setReplies(parent.replies || []);
    } catch { /* silent */ }
  }, [eventId, parentMessage.messageId]);

  useEffect(() => {
    const id = setInterval(fetchReplies, 4000);
    return () => clearInterval(id);
  }, [fetchReplies]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [replies]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await eventMessagesAPI.send(eventId, {
        content: text,
        parentMessageId: parentMessage.messageId,
      });
      setInput('');
      await fetchReplies();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-80 border-l border-[#E5E7EB] flex flex-col bg-[#FAFAFA]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Thread</p>
          <p className="text-[10px] text-[#9CA3AF]">{replies.length} repl{replies.length === 1 ? 'y' : 'ies'}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]">
          <X size={15} className="text-[#6B7280]" />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${roleColor(parentMessage.senderRole)}`}>
            {initials(parentMessage.senderName)}
          </div>
          <span className="text-xs font-semibold text-[#374151]">{parentMessage.senderName}</span>
          <span className="text-[10px] text-[#9CA3AF]">{formatTime(parentMessage.createdAt)}</span>
        </div>
        <p className="text-sm text-[#374151] leading-relaxed">{parentMessage.content}</p>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {replies.map(r => {
          const isMe = r.senderId === currentUser.userId;
          return (
            <div key={r.messageId} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className={`w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center shrink-0 mt-0.5 ${roleColor(r.senderRole)}`}>
                  {initials(r.senderName)}
                </div>
              )}
              <div className={`max-w-[85%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                {!isMe && <span className="text-[10px] text-[#6B7280] px-1">{r.senderName}</span>}
                <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${isMe ? 'bg-[#0F4C5C] text-white' : 'bg-white border border-[#E5E7EB] text-[#111827]'}`}>
                  {r.content}
                </div>
                <span className="text-[10px] text-[#9CA3AF] px-1">{formatTime(r.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      <div className="border-t border-[#E5E7EB] bg-white px-3 py-2.5">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} maxLength={1000}
            placeholder="Reply in thread…"
            className="flex-1 bg-[#F3F4F6] rounded-xl px-3 py-2 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20" />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-8 h-8 rounded-xl bg-[#0F4C5C] flex items-center justify-center disabled:opacity-40">
            {sending ? <Loader2 size={13} className="text-white animate-spin" /> : <Send size={13} className="text-white" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Search Panel ─────────────────────────────────────────────────────────────

function SearchPanel({ eventId, onClose, onJumpTo }) {
  const [q, setQ]           = useState('');
  const [results, setRes]   = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef         = useRef(null);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setRes([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await eventMessagesAPI.search(eventId, q);
        setRes(res.data?.results || []);
      } catch { setRes([]); }
      finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [q, eventId]);

  return (
    <div className="w-80 border-l border-[#E5E7EB] flex flex-col bg-[#FAFAFA]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-white">
        <p className="text-sm font-semibold text-[#111827]">Search Messages</p>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F3F4F6]">
          <X size={15} className="text-[#6B7280]" />
        </button>
      </div>
      <div className="px-3 py-2.5 border-b border-[#E5E7EB] bg-white">
        <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-2">
          <Search size={13} className="text-[#9CA3AF]" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search this channel…"
            className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none" />
          {loading && <Loader2 size={13} className="animate-spin text-[#9CA3AF]" />}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && q.trim() && !loading && (
          <p className="text-xs text-[#9CA3AF] text-center py-8">No results for "{q}"</p>
        )}
        {results.map(r => (
          <button key={r.messageId} onClick={() => onJumpTo(r.messageId)}
            className="w-full text-left px-4 py-3 border-b border-[#F3F4F6] hover:bg-white transition-colors">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-semibold text-[#374151]">{r.senderName}</span>
              <span className="text-[10px] text-[#9CA3AF]">{formatTime(r.createdAt)}</span>
            </div>
            {r.snippet ? (
              <p className="text-xs text-[#6B7280] leading-relaxed"
                dangerouslySetInnerHTML={{ __html: r.snippet }} />
            ) : (
              <p className="text-xs text-[#6B7280] truncate">{r.content}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, currentUser, canPin, onPin, onReply, onCreateTask, highlighted }) {
  const [showActions, setShowActions] = useState(false);
  const attachments = Array.isArray(msg.attachments) ? msg.attachments : [];

  const mentionedContent = useMemo(() => {
    if (!msg.content) return null;
    const html = highlightMentions(msg.content);
    return { __html: html };
  }, [msg.content]);

  return (
    <div
      id={`msg-${msg.messageId}`}
      className={`flex gap-2.5 group ${isMe ? 'justify-end' : 'justify-start'} ${highlighted ? 'bg-yellow-50 rounded-xl -mx-2 px-2' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {!isMe && (
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5 ${roleColor(msg.senderRole)}`}>
          {initials(msg.senderName)}
        </div>
      )}

      <div className={`max-w-[68%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
        {!isMe && (
          <span className="text-[10px] text-[#6B7280] px-1 font-medium">{msg.senderName}</span>
        )}

        {/* Main bubble */}
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
          isMe ? 'bg-[#0F4C5C] text-white rounded-br-sm'
               : 'bg-white text-[#111827] rounded-bl-sm border border-[#E5E7EB]'
        }`}>
          {msg.isPinned && (
            <div className={`flex items-center gap-1 text-[10px] font-medium mb-1.5 ${isMe ? 'text-[#A0D4E0]' : 'text-[#C9A84C]'}`}>
              <Pin size={10} /> Pinned
            </div>
          )}
          {mentionedContent && (
            <p dangerouslySetInnerHTML={mentionedContent} />
          )}
          {attachments.map((att, i) => (
            <AttachmentBubble key={i} attachment={att} />
          ))}
          {msg.replies?.length > 0 && (
            <button onClick={() => onReply(msg)}
              className={`flex items-center gap-1 text-[10px] mt-2 ${isMe ? 'text-[#A0D4E0] hover:text-white' : 'text-[#0F4C5C] hover:text-[#1A6B82]'} transition-colors`}>
              <CornerUpRight size={10} /> {msg.replies.length} repl{msg.replies.length === 1 ? 'y' : 'ies'}
            </button>
          )}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-[#9CA3AF]">{formatTime(msg.createdAt)}</span>
          {isMe && <CheckCheck size={12} className="text-[#9CA3AF]" />}
        </div>
      </div>

      {/* Action buttons (hover) */}
      {showActions && (
        <div className={`flex items-center gap-0.5 self-center ${isMe ? 'order-first mr-1' : 'ml-1'}`}>
          <button onClick={() => onReply(msg)} title="Reply in thread"
            className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] shadow-sm transition-colors">
            <CornerUpRight size={12} className="text-[#6B7280]" />
          </button>
          <button onClick={() => onCreateTask(msg)} title="Create task"
            className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] shadow-sm transition-colors">
            <ListTodo size={12} className="text-[#6B7280]" />
          </button>
          {canPin && (
            <button onClick={() => onPin(msg)} title={msg.isPinned ? 'Unpin' : 'Pin'}
              className="p-1.5 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] shadow-sm transition-colors">
              {msg.isPinned ? <PinOff size={12} className="text-[#C9A84C]" /> : <Pin size={12} className="text-[#6B7280]" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ users }) {
  if (!users.length) return null;
  const names = users.map(u => u.name.split(' ')[0]).join(', ');
  return (
    <div className="flex items-center gap-2 px-4 py-1">
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <span key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
      <span className="text-xs text-[#9CA3AF] italic">{names} {users.length > 1 ? 'are' : 'is'} typing…</span>
    </div>
  );
}

// ─── Pinned Messages Banner ───────────────────────────────────────────────────

function PinnedBanner({ pinned, onJumpTo, canPin, onUnpin }) {
  const [open, setOpen] = useState(false);
  if (!pinned.length) return null;
  const latest = pinned[0];

  return (
    <div className="border-b border-[#E5E7EB] bg-[#FFFBEB] flex-shrink-0">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[#FFF8D6] transition-colors text-left">
        <Pin size={13} className="text-[#C9A84C] shrink-0" />
        <span className="text-xs text-[#374151] flex-1 truncate">
          <span className="font-semibold text-[#C9A84C]">{pinned.length} pinned</span>
          {' — '}{latest.senderName}: {latest.content?.slice(0, 60)}
        </span>
        <ChevronRight size={13} className={`text-[#9CA3AF] transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-[#FDE68A] bg-[#FFFDF0] px-4 py-2 space-y-1.5 max-h-48 overflow-y-auto">
          {pinned.map(p => (
            <div key={p.messageId} className="flex items-start justify-between gap-2 group">
              <button onClick={() => { onJumpTo(p.messageId); setOpen(false); }}
                className="flex-1 text-left">
                <span className="text-xs font-medium text-[#374151]">{p.senderName}: </span>
                <span className="text-xs text-[#6B7280]">{p.content?.slice(0, 80)}</span>
              </button>
              {canPin && (
                <button onClick={() => onUnpin(p)} title="Unpin"
                  className="p-1 rounded hover:bg-[#FDE68A] opacity-0 group-hover:opacity-100 transition-opacity">
                  <PinOff size={11} className="text-[#C9A84C]" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Event Chat Window ────────────────────────────────────────────────────────

function EventChatWindow({ channel, currentUser, onBack }) {
  const [messages, setMessages]     = useState([]);
  const [pinned,   setPinned]       = useState([]);
  const [loading,  setLoading]      = useState(true);
  const [input,    setInput]        = useState('');
  const [sending,  setSending]      = useState(false);
  const [typingUsers, setTyping]    = useState([]);
  const [thread,   setThread]       = useState(null);   // parent message for thread panel
  const [search,   setSearch]       = useState(false);
  const [taskMsg,  setTaskMsg]      = useState(null);   // message for task creation
  const [highlighted, setHighlighted] = useState(null); // messageId to highlight
  const [pendingFiles, setPendingFiles] = useState([]);  // staged uploads
  const [uploading, setUploading]   = useState(false);

  const bottomRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef     = useRef(null);
  const typingRef   = useRef(null);
  const typingDebounce = useRef(null);

  const canPin = ADMIN_ROLES.includes(currentUser.role) || currentUser.role === 'event_manager';

  const fetchMessages = useCallback(async () => {
    if (!channel) return;
    try {
      const res = await eventMessagesAPI.list(channel.eventId, { page: 1, size: 100 });
      setMessages(res.data?.messages || []);
      setPinned(res.data?.pinned || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [channel]);

  const fetchTyping = useCallback(async () => {
    if (!channel) return;
    try {
      const res = await eventMessagesAPI.getTyping(channel.eventId);
      setTyping(res.data?.typingUsers || []);
    } catch { /* silent */ }
  }, [channel]);

  const markRead = useCallback(async () => {
    if (!channel) return;
    try { await eventMessagesAPI.markRead(channel.eventId); } catch { /* silent */ }
  }, [channel]);

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    setMessages([]);
    setPinned([]);
    setThread(null);
    setSearch(false);

    fetchMessages();
    markRead();

    clearInterval(pollRef.current);
    clearInterval(typingRef.current);
    pollRef.current   = setInterval(() => { fetchMessages(); markRead(); }, 4000);
    typingRef.current = setInterval(fetchTyping, 2000);

    return () => {
      clearInterval(pollRef.current);
      clearInterval(typingRef.current);
    };
  }, [channel, fetchMessages, markRead, fetchTyping]);

  useEffect(() => {
    if (!highlighted) return;
    const el = document.getElementById(`msg-${highlighted}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const t = setTimeout(() => setHighlighted(null), 2500);
    return () => clearTimeout(t);
  }, [highlighted]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Handle typing indicator (debounce so we don't spam on every keystroke)
  const notifyTyping = useCallback(() => {
    clearTimeout(typingDebounce.current);
    typingDebounce.current = setTimeout(async () => {
      try { await eventMessagesAPI.setTyping(channel.eventId); } catch { /* silent */ }
    }, 400);
  }, [channel]);

  // File staging
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) toast.error('Some files exceed 10 MB limit');
    setPendingFiles(prev => [...prev, ...valid].slice(0, 5));
    e.target.value = '';
  };

  const removePendingFile = (idx) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text && !pendingFiles.length) return;
    if (sending) return;
    setSending(true);

    try {
      let attachments = [];

      // Upload pending files first
      if (pendingFiles.length) {
        setUploading(true);
        for (const file of pendingFiles) {
          const fd = new FormData();
          fd.append('file', file);
          const res = await eventMessagesAPI.uploadFile(channel.eventId, fd);
          if (res.data?.attachment) attachments.push(res.data.attachment);
        }
        setUploading(false);
      }

      await eventMessagesAPI.send(channel.eventId, {
        content: text || null,
        attachments: attachments.length ? attachments : undefined,
      });

      setInput('');
      setPendingFiles([]);
      await fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      setUploading(false);
    } finally {
      setSending(false);
    }
  };

  const handlePin = async (msg) => {
    try {
      await eventMessagesAPI.pin(channel.eventId, msg.messageId, !msg.isPinned);
      toast.success(msg.isPinned ? 'Message unpinned' : 'Message pinned');
      await fetchMessages();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to pin message');
    }
  };

  const jumpTo = (messageId) => {
    setSearch(false);
    setHighlighted(messageId);
  };

  if (!channel) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center text-center bg-[#F9F9FB]">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#E5E7EB] flex items-center justify-center mb-4 shadow-sm">
          <Hash size={28} className="text-[#D1D5DB]" />
        </div>
        <p className="text-sm font-semibold text-[#374151]">Select an event channel</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Pick an event from the left to open its chat</p>
      </div>
    );
  }

  // Group messages by day
  const grouped = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) {
      grouped.push({ type: 'day', label: formatDay(msg.createdAt), key: day });
      lastDay = day;
    }
    grouped.push({ type: 'msg', msg });
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 bg-[#F9F9FB]">
        {/* Channel header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-[#E5E7EB] flex-shrink-0">
          {onBack && (
            <button onClick={onBack}
              className="sm:hidden p-1.5 rounded-lg hover:bg-[#F3F4F6] -ml-1.5">
              <ArrowLeft size={18} className="text-[#374151]" />
            </button>
          )}
          <div className="w-8 h-8 rounded-lg bg-[#0F4C5C] flex items-center justify-center shrink-0">
            <Hash size={14} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-[#111827] truncate">{channel.name}</p>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize ${eventStatusBadge(channel.status)}`}>
                {channel.status}
              </span>
              {channel.eventDate && (
                <span className="text-[10px] text-[#9CA3AF]">
                  {new Date(channel.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <button onClick={() => { setSearch(s => !s); setThread(null); }}
            className={`p-2 rounded-lg transition-colors ${search ? 'bg-[#EFF6FF] text-[#0F4C5C]' : 'hover:bg-[#F3F4F6] text-[#6B7280]'}`}
            title="Search messages">
            <Search size={16} />
          </button>
        </div>

        {/* Pinned messages */}
        <PinnedBanner
          pinned={pinned}
          onJumpTo={jumpTo}
          canPin={canPin}
          onUnpin={handlePin}
        />

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 size={24} className="animate-spin text-[#C9A84C]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Hash size={28} className="text-[#D1D5DB] mb-3" />
              <p className="text-sm font-semibold text-[#374151]">No messages yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Be the first to send a message in this event channel</p>
            </div>
          ) : (
            grouped.map(item => {
              if (item.type === 'day') {
                return (
                  <div key={item.key} className="flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                    <span className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide px-2">{item.label}</span>
                    <div className="flex-1 h-px bg-[#E5E7EB]" />
                  </div>
                );
              }
              const { msg } = item;
              const isMe = msg.senderId === currentUser.userId;
              return (
                <MessageBubble
                  key={msg.messageId}
                  msg={msg}
                  isMe={isMe}
                  currentUser={currentUser}
                  canPin={canPin}
                  onPin={handlePin}
                  onReply={(m) => { setThread(m); setSearch(false); }}
                  onCreateTask={(m) => setTaskMsg(m)}
                  highlighted={highlighted === msg.messageId}
                />
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Typing indicator */}
        <TypingIndicator users={typingUsers} />

        {/* Pending file previews */}
        {pendingFiles.length > 0 && (
          <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB] px-4 pt-2.5">
            <div className="flex flex-wrap gap-2">
              {pendingFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs">
                  {f.type.startsWith('image/') ? <Image size={12} className="text-blue-500" /> : <FileText size={12} className="text-gray-500" />}
                  <span className="text-[#374151] max-w-[100px] truncate">{f.name}</span>
                  <button onClick={() => removePendingFile(i)} className="text-[#9CA3AF] hover:text-[#EF4444] ml-0.5">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 bg-white border-t border-[#E5E7EB] px-4 py-3">
          <form onSubmit={handleSend} className="flex items-end gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mb-0.5 ${roleColor(currentUser.role)}`}>
              {initials(currentUser.name)}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); notifyTyping(); }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                placeholder={`Message #${channel.name}…`}
                maxLength={2000}
                rows={1}
                className="w-full bg-[#F3F4F6] rounded-xl px-4 py-2.5 pr-10 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30 transition-all resize-none"
                style={{ minHeight: '42px', maxHeight: '120px', overflowY: 'auto' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  className="p-1 rounded-lg hover:bg-[#E5E7EB] text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                  <Paperclip size={14} />
                </button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" multiple hidden
              accept="image/*,.pdf,.xlsx,.xls,.csv"
              onChange={handleFileSelect} />
            <button type="submit" disabled={(!input.trim() && !pendingFiles.length) || sending || uploading}
              className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center hover:bg-[#1A6B82] disabled:opacity-40 transition-colors flex-shrink-0 shadow-sm">
              {sending || uploading
                ? <Loader2 size={16} className="text-white animate-spin" />
                : <Send size={16} className="text-white" />}
            </button>
          </form>
          <p className="text-[10px] text-[#9CA3AF] mt-1 pl-9">Enter to send · Shift+Enter for new line · @name to mention</p>
        </div>
      </div>

      {/* Side panels */}
      {thread && !search && (
        <ThreadPanel
          parentMessage={thread}
          eventId={channel.eventId}
          currentUser={currentUser}
          onClose={() => setThread(null)}
        />
      )}
      {search && !thread && (
        <SearchPanel
          eventId={channel.eventId}
          onClose={() => setSearch(false)}
          onJumpTo={jumpTo}
        />
      )}

      {/* Task modal */}
      {taskMsg && (
        <CreateTaskModal
          message={taskMsg}
          eventId={channel.eventId}
          onClose={() => setTaskMsg(null)}
          onCreated={() => setTaskMsg(null)}
        />
      )}
    </div>
  );
}

// ─── Channel sidebar ──────────────────────────────────────────────────────────

function ChannelSidebar({ channels, selectedId, onSelect, loading, mobileShowChat }) {
  const [q, setQ] = useState('');
  const filtered = channels.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className={`${mobileShowChat ? 'hidden sm:flex' : 'flex'} flex-col bg-white border-r border-[#E5E7EB] w-full sm:w-64 flex-shrink-0`}>
      <div className="px-3 py-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-2">
          <Search size={13} className="text-[#9CA3AF] shrink-0" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search events…"
            className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center pt-8">
            <Loader2 size={20} className="animate-spin text-[#C9A84C]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#9CA3AF] italic text-center pt-8 px-4">
            {channels.length === 0 ? 'No event channels available' : 'No matches'}
          </p>
        ) : (
          filtered.map(c => (
            <button key={c.eventId} onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#F9F9FB] transition-colors text-left ${
                selectedId === c.eventId ? 'bg-[#EFF6FF] border-r-2 border-[#0F4C5C]' : ''
              }`}>
              <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-lg bg-[#0F4C5C] flex items-center justify-center ${selectedId === c.eventId ? 'bg-[#0F4C5C]' : 'bg-[#E5E7EB]'}`}>
                  <Hash size={14} className={selectedId === c.eventId ? 'text-white' : 'text-[#6B7280]'} />
                </div>
                {c.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-bold flex items-center justify-center px-1">
                    {c.unreadCount > 99 ? '99+' : c.unreadCount}
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
                  {c.lastMessage
                    ? (c.lastMessage.content || '📎 Attachment')
                    : <span className="italic capitalize">{c.status}</span>}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── DM Thread (unchanged from original) ─────────────────────────────────────

function DMThread({ partner, currentUser, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
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
      messageId: `tmp-${Date.now()}`, senderId: currentUser.userId,
      senderName: currentUser.name, senderRole: currentUser.role,
      content: text, createdAt: new Date().toISOString(), isRead: false,
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
    } finally { setSending(false); }
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

  const grouped = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = new Date(msg.createdAt).toDateString();
    if (day !== lastDay) {
      grouped.push({ type: 'day', label: formatDay(msg.createdAt), key: day });
      lastDay = day;
    }
    grouped.push({ type: 'msg', msg });
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-[#F9F9FB]">
      <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        {onBack && (
          <button onClick={onBack}
            className="sm:hidden p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6]">
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
          grouped.map(item => {
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
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${roleColor(currentUser.role)}`}>
            {initials(currentUser.name)}
          </div>
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            placeholder={`Message ${partner.name}…`} maxLength={1000}
            className="flex-1 bg-[#F3F4F6] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30 transition-all" />
          <button type="submit" disabled={!input.trim() || sending}
            className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center hover:bg-[#1A6B82] disabled:opacity-40 transition-colors flex-shrink-0 shadow-sm">
            {sending ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Contact list (DM sidebar) ────────────────────────────────────────────────

function ContactList({ members, previews, selectedId, onSelect, loading, search, setSearch, mobileShowThread }) {
  const contacts = members.map(m => {
    const preview = previews.find(p => p.partner?.userId === m.userId);
    return { ...m, lastMessage: preview?.lastMessage, unreadCount: preview?.unreadCount || 0 };
  }).sort((a, b) => {
    if (a.lastMessage && b.lastMessage)
      return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
    if (a.lastMessage) return -1;
    if (b.lastMessage) return 1;
    const r = { tenant_admin: 0, super_admin: 0, event_manager: 1, staff: 2 };
    return (r[a.role] ?? 3) - (r[b.role] ?? 3);
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search team…"
            className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] outline-none" />
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
            <button key={c.userId} onClick={() => onSelect(c)}
              className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#F9F9FB] transition-colors text-left ${
                selectedId === c.userId ? 'bg-[#EFF6FF] border-r-2 border-[#0F4C5C]' : ''
              }`}>
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

// ─── Client Broadcast View ────────────────────────────────────────────────────

function ClientBroadcastView({ currentUser }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
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
                <p className="text-[10px] text-[#C9A84C]">client</p>
              </div>
            </div>
          ))}
          {clientCount === 0 && <p className="text-xs text-[#9CA3AF] italic text-center pt-4">No clients yet</p>}
        </div>
      </div>
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
            grouped.map(item => {
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
                        <span className={`ml-1 ${isClient ? 'text-[#C9A84C]' : 'text-[#0F4C5C]'}`}>· {msg.senderRole.replace(/_/g, ' ')}</span>
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
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              placeholder="Reply to your clients…" maxLength={1000}
              className="flex-1 bg-[#F3F4F6] rounded-xl px-4 py-2.5 text-sm text-[#111827] placeholder-[#9CA3AF] outline-none focus:ring-2 focus:ring-[#0F4C5C]/20 border border-transparent focus:border-[#0F4C5C]/30 transition-all" />
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user } = useAuth();
  const location  = useLocation();

  const isAdmin  = ADMIN_ROLES.includes(user?.role);
  const isClient = CLIENT_ROLES.includes(user?.role);

  // Tabs: 'channels' | 'team' | 'clients'
  const defaultTab = location.state?.tab || (isClient ? 'clients' : 'channels');
  const [activeTab, setActiveTab] = useState(defaultTab);

  // DM state
  const [members,  setMembers]   = useState([]);
  const [previews, setPreviews]  = useState([]);
  const [selected, setSelected]  = useState(null);
  const [dmSearch, setDmSearch]  = useState('');
  const [membersLoading, setMembersLoading] = useState(true);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [pendingPartnerId, setPendingPartnerId] = useState(location.state?.partnerId || null);

  // Channel state
  const [channels, setChannels]           = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [mobileShowChat, setMobileShowChat]   = useState(false);

  // Load DM team data
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

  // Load event channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await eventMessagesAPI.listChannels();
      setChannels(res.data?.channels || []);
    } catch { /* silent */ }
    finally { setChannelsLoading(false); }
  }, []);

  useEffect(() => {
    fetchTeamData();
    const dmId = setInterval(fetchTeamData, 5000);
    return () => clearInterval(dmId);
  }, [fetchTeamData]);

  useEffect(() => {
    fetchChannels();
    const chId = setInterval(fetchChannels, 8000);
    return () => clearInterval(chId);
  }, [fetchChannels]);

  // Auto-select DM partner when navigated from a notification
  useEffect(() => {
    if (!pendingPartnerId || membersLoading || members.length === 0) return;
    const partner = members.find(m => m.userId === pendingPartnerId);
    if (partner) {
      setSelected(partner);
      setMobileShowThread(true);
      setPendingPartnerId(null);
    }
  }, [members, membersLoading, pendingPartnerId]);

  const totalUnreadDMs = useMemo(() =>
    previews.reduce((acc, p) => acc + (p.unreadCount || 0), 0)
  , [previews]);

  const totalUnreadChannels = useMemo(() =>
    channels.reduce((acc, c) => acc + (c.unreadCount || 0), 0)
  , [channels]);

  const tabs = [
    { key: 'channels', label: 'Channels', icon: Hash, badge: totalUnreadChannels, show: !isClient },
    { key: 'team',     label: 'Team DMs', icon: Users, badge: totalUnreadDMs, show: !isClient },
    { key: 'clients',  label: 'Clients',  icon: MessageSquare, badge: 0, show: isAdmin || isClient },
  ].filter(t => t.show);

  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 0px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#E5E7EB] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-[#0F4C5C]">
            <MessageSquare size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[#111827] text-lg" style={{ fontFamily: 'Playfair Display,serif' }}>
              Messages
            </h1>
            <p className="text-xs text-[#6B7280]">Event channels, team DMs, client messages</p>
          </div>
        </div>

        {/* Tab switcher */}
        {tabs.length > 1 && (
          <div className="flex rounded-xl border border-[#E5E7EB] overflow-hidden text-xs font-semibold">
            {tabs.map(t => (
              <button key={t.key}
                onClick={() => { setActiveTab(t.key); setMobileShowThread(false); setMobileShowChat(false); }}
                className={`relative px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
                  activeTab === t.key ? 'bg-[#0F4C5C] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
                }`}>
                <t.icon size={12} />
                {t.label}
                {t.badge > 0 && (
                  <span className={`rounded-full text-[9px] font-bold px-1 min-w-[14px] text-center leading-[14px] ${
                    activeTab === t.key ? 'bg-white text-[#0F4C5C]' : 'bg-[#EF4444] text-white'
                  }`}>
                    {t.badge > 99 ? '99+' : t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* ── Event Channels ── */}
        {activeTab === 'channels' && (
          <>
            <ChannelSidebar
              channels={channels}
              selectedId={selectedChannel?.eventId}
              onSelect={c => { setSelectedChannel(c); setMobileShowChat(true); }}
              loading={channelsLoading}
              mobileShowChat={mobileShowChat}
            />
            <div className={`${!mobileShowChat ? 'hidden sm:flex' : 'flex'} flex-1 min-h-0 overflow-hidden`}>
              <EventChatWindow
                channel={selectedChannel}
                currentUser={user}
                onBack={() => setMobileShowChat(false)}
              />
            </div>
          </>
        )}

        {/* ── Team DMs ── */}
        {activeTab === 'team' && (
          <>
            <ContactList
              members={members}
              previews={previews}
              selectedId={selected?.userId}
              onSelect={m => { setSelected(m); setDmSearch(''); setMobileShowThread(true); }}
              loading={membersLoading}
              search={dmSearch}
              setSearch={setDmSearch}
              mobileShowThread={mobileShowThread}
            />
            <div className={`${!mobileShowThread ? 'hidden sm:flex' : 'flex'} flex-1 min-h-0 overflow-hidden`}>
              <DMThread
                partner={selected}
                currentUser={user}
                onBack={() => setMobileShowThread(false)}
              />
            </div>
          </>
        )}

        {/* ── Clients ── */}
        {activeTab === 'clients' && (
          <ClientBroadcastView currentUser={user} />
        )}
      </div>
    </div>
  );
}
