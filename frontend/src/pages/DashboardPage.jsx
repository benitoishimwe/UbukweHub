import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { inventoryAPI, eventsAPI, transactionAPI, staffAPI } from '../services/api';
import { Package, Calendar, Users, ArrowLeftRight, TrendingUp, AlertCircle, ChevronRight, Plus, Scan } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color, testId }) {
  return (
    <div className="card-wedding p-5 animate-slide-up" data-testid={testId}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#5C5C5C] font-medium">{label}</p>
          <p className="text-3xl font-bold text-[#2D2D2D] mt-1" style={{fontFamily:'Playfair Display,serif'}}>{value}</p>
          {sub && <p className="text-xs text-[#5C5C5C] mt-1">{sub}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ events: {}, inventory: {}, transactions: {}, staff: {} });
  const [recentTxs, setRecentTxs] = useState([]);
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
        const [evRes, invRes, txRes, stRes] = await Promise.allSettled([
          eventsAPI.stats(), inventoryAPI.stats(), transactionAPI.stats(), staffAPI.stats()
        ]);
        setStats({
          events: evRes.status === 'fulfilled' ? evRes.value.data : {},
          inventory: invRes.status === 'fulfilled' ? invRes.value.data : {},
          transactions: txRes.status === 'fulfilled' ? txRes.value.data : {},
          staff: stRes.status === 'fulfilled' ? stRes.value.data : {},
        });
        const txData = txRes.status === 'fulfilled' ? txRes.value.data : {};
        setRecentTxs(txData.recent || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const txTypeColors = {
    rent: 'bg-[#FFF3E0] text-[#E65100]',
    return: 'bg-[#E8F5EE] text-[#4A7C59]',
    wash: 'bg-[#E3F2FD] text-[#1565C0]',
    buy: 'bg-[#F3E5F5] text-[#7B1FA2]',
    lost: 'bg-[#FBE9E7] text-[#BF360C]',
    damage: 'bg-[#FBE9E7] text-[#BF360C]',
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-[#5C5C5C] mt-1">{new Date().toLocaleDateString('en-RW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Calendar} label={t('dashboard.total_events')} value={loading ? '…' : (stats.events.total || 0)} sub={`${stats.events.active || 0} active`} color="bg-[#C9A84C]" testId="stat-events" />
        <StatCard icon={Package} label={t('dashboard.inventory_items')} value={loading ? '…' : (stats.inventory.total || 0)} sub={`${stats.inventory.available || 0} available`} color="bg-[#E8A4B8]" testId="stat-inventory" />
        <StatCard icon={ArrowLeftRight} label="Transactions" value={loading ? '…' : (stats.transactions.total || 0)} sub={`${stats.transactions.by_type?.rent || 0} rented`} color="bg-[#6B8E9B]" testId="stat-transactions" />
        <StatCard icon={Users} label={t('dashboard.staff_on_duty')} value={loading ? '…' : (stats.staff.total || 0)} sub={`${stats.staff.utilization || 0}% utilization`} color="bg-[#4A7C59]" testId="stat-staff" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="card-wedding p-6 animate-slide-up stagger-1" data-testid="quick-actions">
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>{t('dashboard.quick_actions')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t('transactions.rent'), color: 'bg-[#FFF3E0] text-[#C9A84C]', action: () => navigate('/transactions'), testId: 'quick-rent' },
              { label: t('transactions.return'), color: 'bg-[#E8F5EE] text-[#4A7C59]', action: () => navigate('/transactions'), testId: 'quick-return' },
              { label: t('inventory.scan_qr'), color: 'bg-[#E3F2FD] text-[#1565C0]', action: () => navigate('/inventory'), testId: 'quick-scan', icon: Scan },
              { label: t('events.new_event'), color: 'bg-[#F3E5F5] text-[#7B1FA2]', action: () => navigate('/events'), testId: 'quick-event', icon: Plus },
            ].map((qa) => (
              <button
                key={qa.label}
                onClick={qa.action}
                className={`rounded-xl p-4 text-left font-semibold text-sm flex flex-col gap-2 hover:opacity-80 active:scale-95 transition-all ${qa.color}`}
                data-testid={qa.testId}
              >
                {qa.icon ? <qa.icon size={20} /> : null}
                {qa.label}
              </button>
            ))}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="card-wedding p-6 animate-slide-up stagger-2 lg:col-span-2" data-testid="recent-transactions">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('dashboard.recent_transactions')}</h2>
            <button onClick={() => navigate('/transactions')} className="text-sm text-[#C9A84C] font-medium flex items-center gap-1 hover:gap-2 transition-all">
              View All <ChevronRight size={16} />
            </button>
          </div>
          {recentTxs.length === 0 ? (
            <div className="text-center py-8 text-[#5C5C5C]">
              <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('common.no_data')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTxs.map((tx) => (
                <div key={tx.transaction_id} className="flex items-center justify-between py-2 border-b border-[#F5F0E8] last:border-0" data-testid="tx-row">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${txTypeColors[tx.type] || 'bg-gray-100 text-gray-600'}`}>
                      {tx.type}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-[#2D2D2D]">{tx.item_name}</p>
                      <p className="text-xs text-[#5C5C5C]">{tx.staff_name}</p>
                    </div>
                  </div>
                  <p className="text-xs text-[#5C5C5C]">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wedding Greatness Teaser */}
      <div className="mt-6 bg-gradient-to-r from-[#C9A84C] to-[#E6C975] rounded-2xl p-6 text-white animate-slide-up stagger-3" data-testid="greatness-teaser">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-1" style={{fontFamily:'Playfair Display,serif'}}>{t('dashboard.wedding_greatness')}</h3>
            <p className="text-white/80 text-sm">AI-powered score across 6 key metrics</p>
          </div>
          <button
            onClick={() => navigate('/ai')}
            className="px-4 py-2 bg-white text-[#C9A84C] rounded-full font-semibold text-sm hover:bg-white/90 transition-all flex items-center gap-2"
            data-testid="view-greatness-btn"
          >
            <TrendingUp size={16} /> Calculate Score
          </button>
        </div>
      </div>
    </div>
  );
}
