import React, { useState, useEffect } from 'react';
import { plannerAPI } from '../services/api';
import { Heart, Loader2, Plus, LayoutDashboard, DollarSign, Users, MapPin, Palette, UtensilsCrossed } from 'lucide-react';
import OverviewTab from './planner/OverviewTab';
import BudgetTab from './planner/BudgetTab';
import GuestsTab from './planner/GuestsTab';
import VenuesTab from './planner/VenuesTab';
import ThemeTab from './planner/ThemeTab';
import MenuTab from './planner/MenuTab';

const TABS = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'budget',   label: 'Budget',   icon: DollarSign },
  { key: 'guests',   label: 'Guests',   icon: Users },
  { key: 'venues',   label: 'Venues',   icon: MapPin },
  { key: 'theme',    label: 'Theme',    icon: Palette },
  { key: 'menu',     label: 'Menu',     icon: UtensilsCrossed },
];

export default function PlannerPage() {
  const [plan, setPlan]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [tab, setTab]         = useState('overview');
  const [form, setForm]       = useState({ wedding_date: '', theme: 'Modern', total_budget: '' });

  useEffect(() => {
    plannerAPI.getCurrent()
      .then(r => setPlan(r.data))
      .catch(() => setPlan(null))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await plannerAPI.create({
        ...form,
        total_budget: form.total_budget ? parseFloat(form.total_budget) : 0,
      });
      setPlan(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create plan');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#C9A84C]" size={32} />
    </div>
  );

  if (!plan) return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
        <div className="w-20 h-20 rounded-2xl bg-[#C9A84C15] flex items-center justify-center mx-auto mb-4">
          <Heart className="text-[#C9A84C]" size={36} />
        </div>
        <h1 className="text-2xl font-bold text-[#2D2D2D] mb-1" style={{fontFamily:'Playfair Display,serif'}}>
          Smart Wedding Planner
        </h1>
        <p className="text-[#5C5C5C] text-sm mb-6">
          Plan every detail of your perfect day — budget, guests, venues, menu, and more.
        </p>
        <form onSubmit={handleCreate} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Wedding Date</label>
            <input type="date" value={form.wedding_date} onChange={e => setForm(f => ({...f, wedding_date: e.target.value}))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Theme Style</label>
            <select value={form.theme} onChange={e => setForm(f => ({...f, theme: e.target.value}))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]">
              {['Modern','Rustic','Beach','Garden','Traditional','Elegant','Bohemian','Minimalist'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Total Budget (RWF)</label>
            <input type="number" placeholder="e.g. 5000000" value={form.total_budget}
              onChange={e => setForm(f => ({...f, total_budget: e.target.value}))}
              className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]" />
          </div>
          <button type="submit" disabled={creating}
            className="w-full py-3 rounded-xl bg-[#C9A84C] text-white font-bold text-sm hover:bg-[#b8933d] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create My Wedding Plan
          </button>
        </form>
      </div>
    </div>
  );

  const TabComponent = { overview: OverviewTab, budget: BudgetTab, guests: GuestsTab, venues: VenuesTab, theme: ThemeTab, menu: MenuTab }[tab];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="bg-white border-b border-[#EBE5DB] px-4 flex-shrink-0">
        <div className="flex overflow-x-auto hide-scrollbar">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                tab === key
                  ? 'border-[#C9A84C] text-[#C9A84C]'
                  : 'border-transparent text-[#5C5C5C] hover:text-[#2D2D2D]'
              }`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        <TabComponent plan={plan} onPlanUpdate={setPlan} />
      </div>
    </div>
  );
}
