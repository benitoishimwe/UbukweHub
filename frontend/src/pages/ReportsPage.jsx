import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { adminAPI, transactionAPI, eventsAPI, inventoryAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { BarChart3, Download, TrendingUp, Package, Calendar, ArrowLeftRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#C9A84C', '#E8A4B8', '#4A7C59', '#6B8E9B', '#D9534F', '#D4A373'];

export default function ReportsPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [txStats, setTxStats] = useState({});
  const [invStats, setInvStats] = useState({});
  const [evStats, setEvStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        // Use accessible endpoints for all roles
        const [tRes, iRes, eRes] = await Promise.allSettled([
          transactionAPI.stats(), inventoryAPI.stats(), eventsAPI.stats()
        ]);
        const txData = tRes.status === 'fulfilled' ? tRes.value.data : {};
        const invData = iRes.status === 'fulfilled' ? iRes.value.data : {};
        const evData = eRes.status === 'fulfilled' ? eRes.value.data : {};
        setTxStats(txData);
        setInvStats(invData);
        setEvStats(evData);
        // Admin-only extended stats
        if (user?.role === 'admin') {
          const aRes = await adminAPI.stats().catch(() => ({ data: {} }));
          setStats(aRes.data || {});
        } else {
          // Build stats from accessible endpoints for non-admin
          setStats({
            total_events: evData.total || 0,
            total_inventory: invData.total || 0,
            total_transactions: txData.total || 0,
            total_users: 0,
            users_by_role: {}
          });
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [user]);

  const txChartData = txStats.by_type ? Object.entries(txStats.by_type).map(([type, count]) => ({ type, count })) : [];
  const invCatData = invStats.categories || [];
  const userRoleData = stats.users_by_role ? Object.entries(stats.users_by_role).map(([role, count]) => ({ role, count })) : [];

  const handleExport = () => {
    const data = {
      generated_at: new Date().toISOString(),
      platform: 'UbukweHub',
      stats,
      transaction_stats: txStats,
      inventory_stats: invStats,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ubukwehub-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('nav.reports')}</h1>
        <button onClick={handleExport} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border-2 border-[#C9A84C] text-[#C9A84C] text-sm font-semibold hover:bg-[#C9A84C10]" data-testid="export-report-btn">
          <Download size={16} /> {t('common.export')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Calendar, label: 'Total Events', value: stats.total_events || 0, color: 'text-[#C9A84C]' },
          { icon: Package, label: 'Inventory Items', value: stats.total_inventory || 0, color: 'text-[#E8A4B8]' },
          { icon: ArrowLeftRight, label: 'Transactions', value: stats.total_transactions || 0, color: 'text-[#4A7C59]' },
          { icon: TrendingUp, label: 'Total Users', value: stats.total_users || 0, color: 'text-[#6B8E9B]' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card-wedding p-5" data-testid={`report-stat-${label.toLowerCase().replace(' ', '-')}`}>
            <Icon size={22} className={color} />
            <p className="text-2xl font-bold text-[#2D2D2D] mt-2" style={{fontFamily:'Playfair Display,serif'}}>{value}</p>
            <p className="text-xs text-[#5C5C5C] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transactions by Type */}
        <div className="card-wedding p-6">
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>Transactions by Type</h2>
          {txChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={txChartData} margin={{top:5, right:10, left:0, bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F5F0E8" />
                <XAxis dataKey="type" tick={{fontSize:12, fill:'#5C5C5C'}} />
                <YAxis tick={{fontSize:12, fill:'#5C5C5C'}} />
                <Tooltip contentStyle={{borderRadius:'12px', border:'1px solid #EBE5DB', boxShadow:'0 4px 20px rgba(0,0,0,0.08)'}} />
                <Bar dataKey="count" fill="#C9A84C" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-[#5C5C5C] text-sm">{loading ? 'Loading...' : 'No transaction data'}</div>
          )}
        </div>

        {/* Inventory by Category */}
        <div className="card-wedding p-6">
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>Inventory by Category</h2>
          {invCatData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie data={invCatData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="count">
                    {invCatData.map((entry, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {invCatData.map((c, i) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{background: COLORS[i % COLORS.length]}} />
                      <span className="text-[#2D2D2D] capitalize text-xs">{c.category}</span>
                    </div>
                    <span className="font-bold text-[#2D2D2D] text-xs">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-[#5C5C5C] text-sm">{loading ? 'Loading...' : 'No inventory data'}</div>
          )}
        </div>

        {/* Users by Role */}
        <div className="card-wedding p-6">
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>Users by Role</h2>
          <div className="space-y-3">
            {userRoleData.map(({ role, count }) => (
              <div key={role} className="flex items-center gap-3">
                <span className="text-sm text-[#2D2D2D] capitalize w-16 font-medium">{role}</span>
                <div className="flex-1 h-3 bg-[#EBE5DB] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[#C9A84C]" style={{width: `${(count / (stats.total_users || 1)) * 100}%`}} />
                </div>
                <span className="text-sm font-bold text-[#2D2D2D] w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Availability */}
        <div className="card-wedding p-6">
          <h2 className="text-lg font-bold text-[#2D2D2D] mb-4" style={{fontFamily:'Playfair Display,serif'}}>Inventory Availability</h2>
          <div className="space-y-4">
            {[
              { label: 'Available', value: invStats.available || 0, color: '#4A7C59', total: invStats.total || 1 },
              { label: 'Rented', value: invStats.rented || 0, color: '#C9A84C', total: invStats.total || 1 },
              { label: 'Maintenance', value: invStats.maintenance || 0, color: '#D9534F', total: invStats.total || 1 },
            ].map(({ label, value, color, total }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-[#2D2D2D] font-medium">{label}</span>
                  <span className="text-sm font-bold" style={{color}}>{value}</span>
                </div>
                <div className="h-2.5 bg-[#EBE5DB] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{width: `${(value / total) * 100}%`, background: color}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
