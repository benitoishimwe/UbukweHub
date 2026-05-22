import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { staffAPI, eventsAPI } from '../services/api';
import {
  Clock, Calendar, CheckSquare, ArrowLeftRight, Scan,
  ChevronRight, MapPin, Briefcase, AlertCircle,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-RW', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatTime(t) {
  return t || '—';
}

const STATUS_COLORS = {
  todo:        'bg-[#F3F4F6] text-[#4B5563]',
  in_progress: 'bg-[#FFF3E0] text-[#C9A84C]',
  done:        'bg-[#E8F5EE] text-[#4A7C59]',
};

const TX_COLORS = {
  rent:   'bg-[#FFF3E0] text-[#E65100]',
  return: 'bg-[#E8F5EE] text-[#4A7C59]',
  wash:   'bg-[#E3F2FD] text-[#1565C0]',
  buy:    'bg-[#F3E5F5] text-[#7B1FA2]',
  lost:   'bg-[#FBE9E7] text-[#BF360C]',
  damage: 'bg-[#FBE9E7] text-[#BF360C]',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function TodayShiftCard({ shift }) {
  if (!shift) {
    return (
      <div className="card-wedding p-6 animate-slide-up flex flex-col items-center justify-center text-center gap-3 min-h-[140px]">
        <Calendar size={32} className="text-[#C9A84C] opacity-60" />
        <div>
          <p className="font-semibold text-[#2D2D2D]">No shift scheduled today</p>
          <p className="text-sm text-[#5C5C5C] mt-0.5">Enjoy your day off!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-wedding p-6 animate-slide-up border-l-4 border-[#C9A84C]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#C9A84C] uppercase tracking-wide mb-1">Today's Shift</p>
          <h3 className="text-lg font-bold text-[#2D2D2D] truncate" style={{ fontFamily: 'Playfair Display,serif' }}>
            {shift.event?.name || shift.staffName || 'Shift'}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#5C5C5C]">
            {shift.role && (
              <span className="flex items-center gap-1">
                <Briefcase size={13} /> {shift.role}
              </span>
            )}
            {(shift.startTime || shift.endTime) && (
              <span className="flex items-center gap-1">
                <Clock size={13} /> {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
              </span>
            )}
            {shift.event?.venue && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {shift.event.venue}
              </span>
            )}
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize whitespace-nowrap ${
          shift.status === 'completed' ? 'bg-[#E8F5EE] text-[#4A7C59]' : 'bg-[#FFF3E0] text-[#C9A84C]'
        }`}>
          {shift.status}
        </span>
      </div>
    </div>
  );
}

function UpcomingShifts({ shifts }) {
  if (!shifts.length) return null;
  return (
    <div className="card-wedding p-6 animate-slide-up stagger-1">
      <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
        Upcoming Shifts
      </h2>
      <div className="space-y-3">
        {shifts.slice(0, 3).map((s) => (
          <div key={s.shiftId} className="flex items-center justify-between gap-3 py-2 border-b border-[#F5F0E8] last:border-0">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#2D2D2D] truncate">
                {s.event?.name || s.role || 'Shift'}
              </p>
              <p className="text-xs text-[#5C5C5C]">
                {s.role && `${s.role} · `}{formatTime(s.startTime)}–{formatTime(s.endTime)}
              </p>
            </div>
            <p className="text-xs text-[#5C5C5C] whitespace-nowrap">{formatDate(s.date)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskList({ tasks, onToggle }) {
  const NEXT_STATUS = { todo: 'in_progress', in_progress: 'done', done: 'todo' };

  if (!tasks.length) {
    return (
      <div className="card-wedding p-6 animate-slide-up stagger-2">
        <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
          My Tasks
        </h2>
        <div className="text-center py-6 text-[#5C5C5C]">
          <CheckSquare size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tasks assigned to you</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-wedding p-6 animate-slide-up stagger-2">
      <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
        My Tasks
        <span className="ml-2 px-2 py-0.5 rounded-full bg-[#C9A84C20] text-[#C9A84C] text-xs font-bold align-middle">
          {tasks.filter(t => t.status !== 'done').length}
        </span>
      </h2>
      <div className="space-y-2.5">
        {tasks.map((task) => (
          <div key={task.taskId} className="flex items-start gap-3">
            <button
              onClick={() => onToggle(task.taskId, NEXT_STATUS[task.status] || 'todo')}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                task.status === 'done'
                  ? 'bg-[#4A7C59] border-[#4A7C59]'
                  : 'border-[#D1D5DB] hover:border-[#C9A84C]'
              }`}
              title="Cycle status"
            >
              {task.status === 'done' && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L4 7L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-[#9CA3AF]' : 'text-[#2D2D2D]'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                {task.event?.name && (
                  <span className="text-xs text-[#5C5C5C] bg-[#F5F0E8] px-1.5 py-0.5 rounded truncate max-w-[160px]">
                    {task.event.name}
                  </span>
                )}
                {task.dueDate && (
                  <span className="text-xs text-[#5C5C5C]">Due {formatDate(task.dueDate)}</span>
                )}
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize whitespace-nowrap ${STATUS_COLORS[task.status] || ''}`}>
              {task.status?.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    { label: 'Rent Out',  color: 'bg-[#FFF3E0] text-[#C9A84C]',   action: () => navigate('/transactions') },
    { label: 'Return',    color: 'bg-[#E8F5EE] text-[#4A7C59]',   action: () => navigate('/transactions') },
    { label: 'Scan QR',   color: 'bg-[#E3F2FD] text-[#1565C0]',   action: () => navigate('/inventory'), icon: Scan },
  ];
  return (
    <div className="card-wedding p-6 animate-slide-up stagger-1">
      <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
        Quick Actions
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className={`rounded-xl p-4 text-left font-semibold text-sm flex flex-col gap-2 hover:opacity-80 active:scale-95 transition-all ${a.color}`}
          >
            {a.icon && <a.icon size={18} />}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RecentTransactions({ transactions }) {
  const navigate = useNavigate();
  return (
    <div className="card-wedding p-6 animate-slide-up stagger-2 lg:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="text-base font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
          Recent Activity
        </h2>
        <button
          onClick={() => navigate('/transactions')}
          className="text-sm text-[#C9A84C] font-medium flex items-center gap-1 hover:gap-2 transition-all"
        >
          View All <ChevronRight size={16} />
        </button>
      </div>
      {!transactions.length ? (
        <div className="text-center py-8 text-[#5C5C5C]">
          <ArrowLeftRight size={28} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No recent activity</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.transactionId} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${TX_COLORS[tx.type] || 'bg-gray-100 text-gray-600'}`}>
                  {tx.type}
                </span>
                <p className="text-sm font-medium text-[#2D2D2D]">{tx.itemName || tx.item?.name || '—'}</p>
              </div>
              <p className="text-xs text-[#5C5C5C]">{new Date(tx.createdAt).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StaffDashboard() {
  const { user } = useAuth();
  const { t } = useLang();
  const [shifts, setShifts] = useState({ today: null, upcoming: [] });
  const [tasks, setTasks] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [shiftRes, taskRes, txRes] = await Promise.allSettled([
          staffAPI.myShifts(),
          eventsAPI.assignedToMe(),
          staffAPI.myRecentTransactions(),
        ]);

        let shiftsData = shiftRes.status === 'fulfilled'
          ? (shiftRes.value.data || { today: null, upcoming: [] })
          : { today: null, upcoming: [] };

        // Merge demo shifts from localStorage assigned to this user (fallback for unsynced demo shifts)
        if (user?.userId) {
          const demoShifts = JSON.parse(localStorage.getItem('prani_demo_shifts') || '[]');
          const mine = demoShifts.filter((s) => s.staffId === user.userId && s.date);
          if (mine.length > 0) {
            const todayStr = new Date().toDateString();
            const todayDemo = mine.find((s) => new Date(s.date).toDateString() === todayStr);
            const upcomingDemo = mine.filter((s) => new Date(s.date) > new Date() && new Date(s.date).toDateString() !== todayStr);
            if (!shiftsData.today && todayDemo) shiftsData = { ...shiftsData, today: todayDemo };
            if (upcomingDemo.length > 0) {
              shiftsData = {
                ...shiftsData,
                upcoming: [...shiftsData.upcoming, ...upcomingDemo].slice(0, 5),
              };
            }
          }
        }

        setShifts(shiftsData);
        if (taskRes.status === 'fulfilled')  setTasks(taskRes.value.data?.tasks || []);
        if (txRes.status === 'fulfilled')    setTransactions((txRes.value.data?.transactions) || []);
      } catch (e) {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.userId]);

  const handleToggleTask = useCallback(async (taskId, newStatus) => {
    setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t, status: newStatus } : t));
    try {
      await eventsAPI.updateTaskStatus(taskId, newStatus);
    } catch {
      setTasks((prev) => prev.map((t) => t.taskId === taskId ? { ...t } : t));
    }
  }, []);

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

      {error && (
        <div className="mb-6 flex items-center gap-2 text-sm text-[#BF360C] bg-[#FBE9E7] px-4 py-3 rounded-xl">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-wedding p-6 animate-pulse h-36 bg-[#F5F0E8]" />
          ))}
        </div>
      ) : (
        <>
          {/* Today's shift – full width */}
          <div className="mb-6">
            <TodayShiftCard shift={shifts.today} />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-1 space-y-6">
              <UpcomingShifts shifts={shifts.upcoming} />
              <QuickActions />
            </div>

            {/* Right column */}
            <div className="lg:col-span-2 space-y-6">
              <TaskList tasks={tasks} onToggle={handleToggleTask} />
              <RecentTransactions transactions={transactions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
