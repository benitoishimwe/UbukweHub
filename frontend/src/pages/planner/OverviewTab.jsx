import React, { useState, useEffect } from 'react';
import { plannerAPI } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Calendar, DollarSign, Users, MapPin, Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function OverviewTab({ plan }) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    plannerAPI.dashboard(plan.planId)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [plan.planId]);

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#C9A84C]" size={28} /></div>;

  const budget   = data?.budget || {};
  const guests   = data?.guests || {};
  const upcoming = data?.upcoming_payments || [];
  const daysLeft = data?.days_until_wedding;

  const spentPct = budget.total_budget > 0
    ? Math.min(100, Math.round((Number(budget.total_actual) / Number(budget.total_budget)) * 100))
    : 0;

  const rsvpPct = guests.total > 0
    ? Math.round((guests.attending / guests.total) * 100)
    : 0;

  const chartData = (budget.by_category || []).map(c => ({
    name: c.category,
    estimated: Number(c.estimated) || 0,
    actual: Number(c.actual) || 0,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Countdown hero */}
      <div className="bg-gradient-to-r from-[#C9A84C] to-[#b8933d] rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/70 text-sm font-medium">Your wedding in</p>
            <p className="text-5xl font-bold mt-1" style={{fontFamily:'Playfair Display,serif'}}>
              {daysLeft >= 0 ? daysLeft : '—'}
            </p>
            <p className="text-white/80 text-sm mt-1">days · {plan.theme} theme</p>
          </div>
          <div className="text-right">
            <Calendar size={40} className="text-white/30 ml-auto mb-2" />
            {data?.wedding_date && (
              <p className="text-sm font-semibold">{format(parseISO(data.wedding_date), 'MMMM d, yyyy')}</p>
            )}
          </div>
        </div>
        {/* Color swatches */}
        <div className="flex gap-2 mt-4">
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: plan.primaryColor}} />
            Primary
          </div>
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-medium">
            <div className="w-3 h-3 rounded-full" style={{backgroundColor: plan.secondaryColor}} />
            Secondary
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={DollarSign} label="Budget Used" value={`${spentPct}%`}
          sub={`${fmtNum(budget.total_actual)} / ${fmtNum(budget.total_budget)} RWF`}
          color="#C9A84C" progress={spentPct} />
        <KpiCard icon={Users} label="RSVPs In" value={`${rsvpPct}%`}
          sub={`${guests.attending || 0} attending · ${guests.total || 0} invited`}
          color="#4CAF92" progress={rsvpPct} />
        <KpiCard icon={TrendingUp} label="Budget Items" value={budget.total_count || 0}
          sub={`${budget.paid_count || 0} paid`} color="#7C6AF7" />
        <KpiCard icon={MapPin} label="Venues" value={data?.venue_count || 0}
          sub="shortlisted" color="#E8A4B8" />
      </div>

      {/* Budget breakdown chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2D2D2D] mb-4 text-sm">Budget by Category</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barSize={18} barGap={4}>
              <XAxis dataKey="name" tick={{fontSize: 11}} />
              <YAxis tick={{fontSize: 11}} tickFormatter={v => `${Math.round(v/1000)}k`} />
              <Tooltip formatter={(v) => `${fmtNum(v)} RWF`} />
              <Bar dataKey="estimated" fill="#C9A84C40" name="Estimated" radius={[4,4,0,0]} />
              <Bar dataKey="actual" fill="#C9A84C" name="Actual" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2D2D2D] mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-500" /> Upcoming Payments
          </h3>
          <div className="space-y-2">
            {upcoming.map(item => (
              <div key={item.itemId} className="flex items-center justify-between p-3 bg-[#F5F0E8] rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-[#2D2D2D]">{item.description || item.category}</p>
                  <p className="text-xs text-[#5C5C5C]">{item.category} · {statusBadge(item.status)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[#C9A84C]">{fmtNum(item.estimatedCost)} RWF</p>
                  {item.dueDate && <p className="text-xs text-[#5C5C5C]">Due {format(parseISO(item.dueDate), 'MMM d')}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guest RSVP breakdown */}
      {guests.total > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-[#2D2D2D] mb-4 text-sm">Guest RSVP Status</h3>
          <div className="flex gap-4">
            {[
              { label: 'Attending', value: guests.attending, color: '#4CAF92' },
              { label: 'Pending',   value: guests.pending,   color: '#C9A84C' },
              { label: 'Declined',  value: guests.declined,  color: '#D9534F' },
            ].map(s => (
              <div key={s.label} className="flex-1 text-center p-3 rounded-xl" style={{backgroundColor: s.color + '15'}}>
                <p className="text-2xl font-bold" style={{color: s.color}}>{s.value}</p>
                <p className="text-xs font-medium text-[#5C5C5C] mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, progress }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#5C5C5C]">{label}</p>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{backgroundColor: color + '20'}}>
          <Icon size={14} style={{color}} />
        </div>
      </div>
      <p className="text-2xl font-bold text-[#2D2D2D]">{value}</p>
      <p className="text-xs text-[#5C5C5C] mt-0.5 truncate">{sub}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1 bg-[#EBE5DB] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{width:`${progress}%`, backgroundColor: color}} />
        </div>
      )}
    </div>
  );
}

const fmtNum = (n) => n != null ? Number(n).toLocaleString() : '0';
const statusBadge = (s) => ({ planned: 'Planned', booked: 'Booked', paid: 'Paid' }[s] || s);
