import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ClipboardList, MessageSquare, X } from 'lucide-react';
import { notificationsAPI } from '../services/api';

const ICON_BY_TYPE = {
  task_assigned:  ClipboardList,
  message_seen:   MessageSquare,
  chat_mention:   MessageSquare,
};

function resolveNavTarget(n) {
  if (n.type === 'message_seen' && n.resourceType === 'user' && n.resourceId) {
    return { path: '/messages', state: { tab: 'team', partnerId: n.resourceId } };
  }
  if (n.type === 'chat_mention' && n.resourceType === 'channel_message') {
    return { path: '/messages', state: { tab: 'channels' } };
  }
  return null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [open, setOpen]                   = useState(false);
  const [pos, setPos]                     = useState({});
  const navigate = useNavigate();

  const bellRef     = useRef(null);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await notificationsAPI.list();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // silent fail — bell is non-critical
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchNotifications]);

  // Close on outside click — exclude both the bell and the portal dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        bellRef.current    && !bellRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Calculate the best fixed position for the dropdown relative to the bell.
  // When the bell is on the LEFT half (sidebar), left-anchor so the dropdown
  // opens rightward into the viewport. When on the RIGHT half (top bar),
  // right-anchor so it doesn't overflow off the right edge.
  const calcPos = () => {
    if (!bellRef.current) return;
    const rect = bellRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const dropW = Math.min(320, vw - 16);
    const top = rect.bottom + 8;

    if ((rect.left + rect.right) / 2 > vw / 2) {
      // Bell is on the right half — right-anchor
      const right = Math.max(8, vw - rect.right);
      setPos({ top, right });
    } else {
      // Bell is on the left half (sidebar) — left-anchor
      const left = Math.max(8, Math.min(rect.left, vw - dropW - 8));
      setPos({ top, left });
    }
  };

  // Recalculate on scroll/resize so the portal stays aligned
  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOpen = () => {
    calcPos();
    setOpen(v => !v);
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => (n.notificationId === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount(c => Math.max(0, c - 1));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.notificationId !== id));
    try { await notificationsAPI.dismiss(id); } catch {}
  };

  const handleClearAll = async () => {
    try {
      await notificationsAPI.clearAll();
      setNotifications(prev => prev.filter(n => !n.isRead));
    } catch {}
  };

  const handleNotificationClick = async (n) => {
    const target = resolveNavTarget(n);
    if (!target) return;
    setOpen(false);
    if (!n.isRead) {
      try {
        await notificationsAPI.markRead(n.notificationId);
        setNotifications(prev =>
          prev.map(x => x.notificationId === n.notificationId ? { ...x, isRead: true } : x)
        );
        setUnreadCount(c => Math.max(0, c - 1));
      } catch {}
    }
    navigate(target.path, { state: target.state });
  };

  return (
    <div ref={bellRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-[#F3F4F6] transition-colors"
        aria-label="Notifications"
      >
        <Bell size={20} className="text-[#374151]" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-0.5 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown rendered in document.body via portal — escapes overflow:hidden ancestors */}
      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            ...(pos.left  !== undefined ? { left:  pos.left  } : {}),
            ...(pos.right !== undefined ? { right: pos.right } : {}),
            zIndex: 9999,
          }}
          className="w-80 max-w-[calc(100vw-1rem)] bg-white rounded-2xl shadow-2xl border border-[#E5E7EB] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F3F4F6]">
            <h3 className="font-semibold text-sm text-[#111827]">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#0F4C5C] transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={14} /> Mark all read
                </button>
              )}
              {notifications.some(n => n.isRead) && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-[#EF4444] hover:text-[#DC2626] transition-colors"
                  title="Clear read notifications"
                >
                  Clear read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-[#F3F4F6]">
                <X size={14} className="text-[#9CA3AF]" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F9FAFB]">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-[#9CA3AF]">
                <Bell size={24} className="mx-auto mb-2 opacity-30" />
                No notifications yet
              </div>
            ) : (
              notifications.map(n => {
                const Icon = ICON_BY_TYPE[n.type] || Bell;
                const hasNav = !!resolveNavTarget(n);
                return (
                  <div
                    key={n.notificationId}
                    onClick={hasNav ? () => handleNotificationClick(n) : undefined}
                    className={`flex items-start gap-3 px-4 py-3 hover:bg-[#F9FAFB] transition-colors ${
                      !n.isRead ? 'bg-[#EFF6FF]' : ''
                    } ${hasNav ? 'cursor-pointer' : ''}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      !n.isRead ? 'bg-[#DBEAFE]' : 'bg-[#F3F4F6]'
                    }`}>
                      <Icon size={15} className={!n.isRead ? 'text-[#1D4ED8]' : 'text-[#9CA3AF]'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${!n.isRead ? 'font-semibold text-[#111827]' : 'text-[#374151]'}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-[#6B7280] mt-0.5 truncate">{n.body}</p>
                      )}
                      <p className="text-[11px] text-[#9CA3AF] mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {!n.isRead && (
                        <button
                          onClick={e => handleMarkRead(n.notificationId, e)}
                          className="p-1 rounded hover:bg-[#BFDBFE] transition-colors"
                          title="Mark as read"
                        >
                          <CheckCheck size={13} className="text-[#3B82F6]" />
                        </button>
                      )}
                      <button
                        onClick={e => handleDismiss(n.notificationId, e)}
                        className="p-1 rounded hover:bg-[#FEE2E2] transition-colors"
                        title="Dismiss"
                      >
                        <X size={12} className="text-[#9CA3AF] hover:text-[#EF4444]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
