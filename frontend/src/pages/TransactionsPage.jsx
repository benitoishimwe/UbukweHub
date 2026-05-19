import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { transactionAPI, inventoryAPI, eventsAPI } from '../services/api';
import { Plus, ArrowLeftRight, Loader, Package, Calendar, User, X, Clock, Hash, RotateCcw } from 'lucide-react';

const TX_COLORS = {
  rent:    'bg-orange-50 text-orange-700 border border-orange-200',
  return:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
  wash:    'bg-blue-50 text-blue-700 border border-blue-200',
  buy:     'bg-purple-50 text-purple-700 border border-purple-200',
  lost:    'bg-red-50 text-red-700 border border-red-200',
  damage:  'bg-rose-50 text-rose-700 border border-rose-200',
};

const TX_LABELS = {
  rent:   'Rent Out',
  return: 'Return',
  wash:   'Log Wash',
  buy:    'Buy/Add',
  lost:   'Mark Lost',
  damage: 'Report Damage',
};

const TX_ICONS = {
  rent:   { icon: '📤', label: 'Rented Out' },
  return: { icon: '📥', label: 'Returned' },
  wash:   { icon: '🫧', label: 'Sent for Washing' },
  buy:    { icon: '🛒', label: 'Purchased' },
  lost:   { icon: '❌', label: 'Marked Lost' },
  damage: { icon: '⚠️', label: 'Damage Reported' },
};

function TransactionDetailModal({ tx, onClose }) {
  const meta = TX_ICONS[tx.type] || { icon: '📋', label: tx.type };
  const color = TX_COLORS[tx.type] || 'bg-gray-100 text-gray-600 border border-gray-200';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-2xl animate-slide-up">
        {/* Header strip */}
        <div className={`px-6 py-4 rounded-t-2xl flex items-center justify-between ${
          tx.type === 'rent'   ? 'bg-orange-50' :
          tx.type === 'return' ? 'bg-emerald-50' :
          tx.type === 'wash'   ? 'bg-blue-50' :
          tx.type === 'buy'    ? 'bg-purple-50' :
          tx.type === 'lost'   ? 'bg-red-50' :
          tx.type === 'damage' ? 'bg-rose-50' : 'bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{meta.icon}</span>
            <div>
              <p className="font-bold text-[#2D2D2D] text-base">{meta.label}</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{tx.type}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center hover:bg-white transition-colors">
            <X size={15} className="text-[#5C5C5C]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Item */}
          <div className="flex items-start gap-3 p-3.5 bg-[#F5F0E8] rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <Package size={18} className="text-[#C9A84C]" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-0.5">Item</p>
              <p className="font-bold text-[#2D2D2D] text-sm">{tx.itemName}</p>
              {tx.quantity > 1 && (
                <p className="text-xs text-[#C9A84C] font-semibold mt-0.5">×{tx.quantity} units</p>
              )}
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            {tx.eventName && (
              <div className="p-3 bg-[#F9F9FB] rounded-xl">
                <p className="text-xs text-[#5C5C5C] font-semibold mb-1 flex items-center gap-1">
                  <Calendar size={11} /> Event
                </p>
                <p className="text-sm font-medium text-[#2D2D2D] truncate">{tx.eventName}</p>
              </div>
            )}
            {tx.staffName && (
              <div className="p-3 bg-[#F9F9FB] rounded-xl">
                <p className="text-xs text-[#5C5C5C] font-semibold mb-1 flex items-center gap-1">
                  <User size={11} /> Staff
                </p>
                <p className="text-sm font-medium text-[#2D2D2D] truncate">{tx.staffName}</p>
              </div>
            )}
            <div className="p-3 bg-[#F9F9FB] rounded-xl">
              <p className="text-xs text-[#5C5C5C] font-semibold mb-1 flex items-center gap-1">
                <Hash size={11} /> Quantity
              </p>
              <p className="text-sm font-bold text-[#2D2D2D]">{tx.quantity}</p>
            </div>
            <div className="p-3 bg-[#F9F9FB] rounded-xl">
              <p className="text-xs text-[#5C5C5C] font-semibold mb-1 flex items-center gap-1">
                <Clock size={11} /> Date
              </p>
              <p className="text-sm font-medium text-[#2D2D2D]">
                {new Date(tx.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {tx.returnDate && (
              <div className="col-span-2 p-3 bg-[#FEF3C7] rounded-xl">
                <p className="text-xs text-[#D97706] font-semibold mb-1 flex items-center gap-1">
                  <RotateCcw size={11} /> Expected Return
                </p>
                <p className="text-sm font-medium text-[#2D2D2D]">
                  {new Date(tx.returnDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>

          {/* Transaction ID */}
          <p className="text-[10px] text-[#BEBEBE] text-center font-mono">
            ID: {tx.transactionId}
          </p>
        </div>
      </div>
    </div>
  );
}

function NewTransactionModal({ onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    type: 'rent',
    itemId: '',
    eventId: '',
    quantity: 1,
    notes: '',
    returnDate: '',
  });
  const [items, setItems] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.allSettled([
      inventoryAPI.list({ size: 200 }),
      eventsAPI.list({ size: 100 }),
    ]).then(([iResult, eResult]) => {
      if (iResult.status === 'fulfilled') {
        setItems(iResult.value.data.items || []);
      }
      if (eResult.status === 'fulfilled') {
        setEvents(eResult.value.data.events || []);
      }
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        type: form.type,
        itemId: form.itemId,
        quantity: Number(form.quantity),
      };
      if (form.eventId)    payload.eventId    = form.eventId;
      if (form.returnDate) payload.returnDate = form.returnDate;

      const { data } = await transactionAPI.create(payload);
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record transaction');
    } finally {
      setLoading(false);
    }
  };

  const txTypes = ['rent', 'return', 'wash', 'buy', 'lost', 'damage'];

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EBE5DB] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            New Transaction
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#5C5C5C] hover:text-[#2D2D2D] text-xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Type pills */}
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-2">
              Transaction Type
            </label>
            <div className="flex flex-wrap gap-2">
              {txTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setForm({ ...form, type })}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    form.type === type
                      ? TX_COLORS[type] + ' ring-2 ring-offset-1 ring-current font-bold'
                      : 'bg-[#F5F0E8] text-[#5C5C5C] hover:bg-[#EBE5DB]'
                  }`}
                >
                  {TX_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Item select */}
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">
              Select Item
            </label>
            <select
              className="input-wedding"
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
              required
            >
              <option value="">Select an item...</option>
              {items.map((i) => (
                <option key={i.itemId} value={i.itemId}>
                  {i.name} — {i.available} available
                </option>
              ))}
            </select>
          </div>

          {/* Event select */}
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">
              Link to Event <span className="normal-case font-normal text-[#9C9C9C]">(optional)</span>
            </label>
            <select
              className="input-wedding"
              value={form.eventId}
              onChange={(e) => setForm({ ...form, eventId: e.target.value })}
            >
              <option value="">No event linked</option>
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity + Return date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">
                Quantity
              </label>
              <input
                className="input-wedding"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </div>
            {form.type === 'rent' && (
              <div>
                <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">
                  Expected Return
                </label>
                <input
                  className="input-wedding"
                  type="date"
                  value={form.returnDate}
                  onChange={(e) => setForm({ ...form, returnDate: e.target.value })}
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm hover:border-[#C9A84C] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-gold h-11 flex items-center justify-center text-sm"
            >
              {loading ? <Loader size={16} className="animate-spin" /> : 'Save Transaction'}
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
  const [selectedTx, setSelectedTx] = useState(null);

  const fetchTxs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      const { data } = await transactionAPI.list(params);
      setTxs(data.transactions || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTxs(); }, [typeFilter]);

  const filters = [
    { value: '', label: 'All' },
    { value: 'rent',   label: 'Rent' },
    { value: 'return', label: 'Return' },
    { value: 'wash',   label: 'Wash' },
    { value: 'buy',    label: 'Buy' },
    { value: 'lost',   label: 'Lost' },
    { value: 'damage', label: 'Damage' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            Transactions
          </h1>
          <p className="text-sm text-[#5C5C5C] mt-1">Track inventory movements and activity</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm"
        >
          <Plus size={18} /> New Transaction
        </button>
      </div>

      {/* Type filter pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filters.map(({ value, label }) => (
          <button
            key={value || 'all'}
            onClick={() => setTypeFilter(value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-all ${
              typeFilter === value
                ? 'bg-[#C9A84C] text-white shadow-sm'
                : 'bg-white border border-[#EBE5DB] text-[#5C5C5C] hover:border-[#C9A84C]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight size={28} className="text-[#C9A84C]" />
          </div>
          <h3 className="font-semibold text-[#2D2D2D] mb-1">No transactions yet</h3>
          <p className="text-sm text-[#5C5C5C] mb-4">
            {typeFilter ? `No "${typeFilter}" transactions found.` : 'Record your first inventory movement.'}
          </p>
          {!typeFilter && (
            <button onClick={() => setShowModal(true)} className="btn-gold px-6 py-2.5 text-sm">
              + New Transaction
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#EBE5DB] overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-6 px-5 py-3 bg-[#F5F0E8] text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide border-b border-[#EBE5DB]">
            <span>Type</span>
            <span className="col-span-2">Item</span>
            <span>Event</span>
            <span>Staff / Qty</span>
            <span>Date</span>
          </div>

          {txs.map((tx) => (
            <div
              key={tx.transactionId}
              onClick={() => setSelectedTx(tx)}
              className="grid grid-cols-2 md:grid-cols-6 px-5 py-3.5 border-b border-[#F5F0E8] last:border-0 hover:bg-[#FDFBF7] transition-colors items-center cursor-pointer"
            >
              {/* Type badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize inline-block w-fit ${
                  TX_COLORS[tx.type] || 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                {tx.type}
              </span>

              {/* Item name */}
              <div className="col-span-1 md:col-span-2 flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
                  <Package size={13} className="text-[#C9A84C]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm text-[#2D2D2D] truncate">{tx.itemName}</p>
                  {tx.quantity > 1 && (
                    <p className="text-xs text-[#9C9C9C]">×{tx.quantity}</p>
                  )}
                </div>
              </div>

              {/* Event */}
              <div className="hidden md:flex items-center gap-1.5 text-sm text-[#5C5C5C] truncate">
                {tx.eventName ? (
                  <>
                    <Calendar size={13} className="flex-shrink-0 text-[#C9A84C]" />
                    <span className="truncate">{tx.eventName}</span>
                  </>
                ) : (
                  <span className="text-[#BEBEBE]">—</span>
                )}
              </div>

              {/* Staff / qty */}
              <div className="hidden md:flex items-center gap-1.5 text-sm text-[#5C5C5C]">
                {tx.staffName ? (
                  <>
                    <User size={13} className="flex-shrink-0" />
                    <span className="truncate">{tx.staffName}</span>
                  </>
                ) : (
                  <span className="text-[#BEBEBE]">—</span>
                )}
              </div>

              {/* Date */}
              <div className="text-xs text-[#9C9C9C]">
                {new Date(tx.createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewTransactionModal
          onClose={() => setShowModal(false)}
          onSave={(tx) => {
            setTxs([tx, ...txs]);
            setShowModal(false);
          }}
        />
      )}
      {selectedTx && (
        <TransactionDetailModal tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}
    </div>
  );
}
