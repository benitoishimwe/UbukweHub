import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { transactionAPI, inventoryAPI, eventsAPI } from '../services/api';
import { Plus, ArrowLeftRight, Search, Loader, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TX_COLORS = {
  rent: 'bg-[#FFF3E0] text-[#E65100]',
  return: 'bg-[#E8F5EE] text-[#4A7C59]',
  wash: 'bg-[#E3F2FD] text-[#1565C0]',
  buy: 'bg-[#F3E5F5] text-[#7B1FA2]',
  lost: 'bg-[#FBE9E7] text-[#BF360C]',
  damage: 'bg-[#FBE9E7] text-[#BF360C]',
};

function NewTransactionModal({ onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState({ type: 'rent', item_id: '', event_id: '', quantity: 1, notes: '', return_date: '' });
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([inventoryAPI.list({ limit: 200 }), eventsAPI.list({ limit: 100 })]).then(([iRes, eRes]) => {
      setItems(iRes.data.items || []);
      setEvents(eRes.data.events || []);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, quantity: Number(form.quantity) };
      if (!payload.event_id) delete payload.event_id;
      if (!payload.return_date) delete payload.return_date;
      const { data } = await transactionAPI.create(payload);
      onSave(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const txTypes = ['rent', 'return', 'wash', 'buy', 'lost', 'damage'];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scale-in" data-testid="tx-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('transactions.new')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Transaction type pills */}
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-2">Transaction Type</label>
            <div className="flex flex-wrap gap-2">
              {txTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({...form, type})}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
                    form.type === type ? TX_COLORS[type] + ' ring-2 ring-offset-1 ring-current' : 'bg-[#F5F0E8] text-[#5C5C5C]'
                  }`}
                  data-testid={`tx-type-${type}`}
                >
                  {t(`transactions.${type}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('transactions.select_item')}</label>
            <select className="input-wedding" value={form.item_id} onChange={(e) => setForm({...form, item_id: e.target.value})} required data-testid="tx-item-select">
              <option value="">Select an item...</option>
              {items.map(i => <option key={i.item_id} value={i.item_id}>{i.name} (avail: {i.available})</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('transactions.select_event')} (optional)</label>
            <select className="input-wedding" value={form.event_id} onChange={(e) => setForm({...form, event_id: e.target.value})} data-testid="tx-event-select">
              <option value="">No event linked</option>
              {events.map(e => <option key={e.event_id} value={e.event_id}>{e.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('transactions.quantity')}</label>
              <input className="input-wedding" type="number" min="1" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} required data-testid="tx-qty-input" />
            </div>
            {(form.type === 'rent') && (
              <div>
                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('transactions.return_date')}</label>
                <input className="input-wedding" type="date" value={form.return_date} onChange={(e) => setForm({...form, return_date: e.target.value})} data-testid="tx-return-date" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('transactions.notes')}</label>
            <textarea className="input-wedding h-20 resize-none pt-2" placeholder="Optional notes..." value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} data-testid="tx-notes" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="tx-save-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { t } = useLang();
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const fetchTxs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const { data } = await transactionAPI.list(params);
      setTxs(data.transactions || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTxs(); }, [typeFilter]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('transactions.title')}</h1>
        <button onClick={() => setShowModal(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="new-tx-btn">
          <Plus size={18} /> {t('transactions.new')}
        </button>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['', 'rent', 'return', 'wash', 'buy', 'lost', 'damage'].map((type) => (
          <button
            key={type || 'all'}
            onClick={() => setTypeFilter(type)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              typeFilter === type ? 'bg-[#C9A84C] text-white' : 'bg-white border border-[#EBE5DB] text-[#5C5C5C] hover:border-[#C9A84C]'
            }`}
            data-testid={`filter-${type || 'all'}`}
          >
            {type || t('common.all')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <ArrowLeftRight size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('common.no_data')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBE5DB] overflow-hidden">
          <div className="hidden md:grid grid-cols-5 px-4 py-3 bg-[#F5F0E8] text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide">
            <span>Item</span><span>Type</span><span>Event</span><span>Staff</span><span>Date</span>
          </div>
          {txs.map((tx) => (
            <div key={tx.transaction_id} className="grid grid-cols-2 md:grid-cols-5 px-4 py-3 border-b border-[#F5F0E8] last:border-0 hover:bg-[#FCEAF005] items-center" data-testid="transaction-row">
              <div className="font-medium text-sm text-[#2D2D2D] truncate">{tx.item_name}</div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize inline-block w-fit ${TX_COLORS[tx.type] || 'bg-gray-100 text-gray-600'}`}>{tx.type}</span>
              <div className="hidden md:block text-sm text-[#5C5C5C] truncate">{tx.event_name || '—'}</div>
              <div className="hidden md:block text-sm text-[#5C5C5C] truncate">{tx.staff_name}</div>
              <div className="text-xs text-[#5C5C5C]">{new Date(tx.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NewTransactionModal onClose={() => setShowModal(false)} onSave={(tx) => { setTxs([tx, ...txs]); setShowModal(false); }} />}
    </div>
  );
}
