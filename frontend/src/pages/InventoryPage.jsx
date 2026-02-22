import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { inventoryAPI } from '../services/api';
import { Plus, Search, QrCode, Package, RefreshCw, Loader } from 'lucide-react';

const CONDITION_BADGE = { good: 'badge-available', fair: 'bg-yellow-100 text-yellow-700', poor: 'badge-maintenance', maintenance: 'badge-maintenance' };

function ItemCard({ item, onAction }) {
  return (
    <div className="card-wedding p-4" data-testid="inventory-item-card">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-[#F5F0E8] flex items-center justify-center flex-shrink-0">
          <Package size={22} className="text-[#C9A84C]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[#2D2D2D] text-sm truncate">{item.name}</h3>
          <p className="text-xs text-[#5C5C5C] capitalize">{item.category}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="badge-available px-2 py-0.5 rounded-full text-xs font-medium">{item.available} {item.available === 1 ? 'available' : 'avail.'}</span>
            {item.rented > 0 && <span className="badge-rented px-2 py-0.5 rounded-full text-xs font-medium">{item.rented} rented</span>}
            {item.washing > 0 && <span className="badge-washing px-2 py-0.5 rounded-full text-xs font-medium">{item.washing} washing</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#F5F0E8]">
        <div>
          <p className="text-xs text-[#5C5C5C]">Rental / day</p>
          <p className="text-sm font-bold text-[#C9A84C]">{item.rental_price?.toLocaleString()} RWF</p>
        </div>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${CONDITION_BADGE[item.condition] || 'bg-gray-100 text-gray-600'}`}>{item.condition}</span>
          <button
            onClick={() => onAction(item)}
            className="px-3 py-1 rounded-full bg-[#C9A84C] text-white text-xs font-semibold hover:bg-[#B39340]"
            data-testid="item-action-btn"
          >
            Action
          </button>
        </div>
      </div>
      <div className="mt-2">
        <p className="text-xs text-[#5C5C5C] font-mono">{item.qr_code}</p>
      </div>
    </div>
  );
}

function AddItemModal({ onClose, onSave }) {
  const { t } = useLang();
  const [form, setForm] = useState({ name: '', category: 'furniture', quantity: 1, condition: 'good', rental_price: 0, purchase_price: 0, supplier: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await inventoryAPI.create({ ...form, quantity: Number(form.quantity), rental_price: Number(form.rental_price), purchase_price: Number(form.purchase_price) });
      onSave(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in" data-testid="add-item-modal">
        <div className="p-6 border-b border-[#EBE5DB]">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('inventory.add_item')}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('inventory.item_name')}</label>
            <input className="input-wedding" placeholder="Gold Chiavari Chairs" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} required data-testid="item-name-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('inventory.category')}</label>
              <select className="input-wedding" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} data-testid="item-category-select">
                {['furniture','audio','decor','linens','lighting','transport','catering','equipment'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('inventory.qty')}</label>
              <input className="input-wedding" type="number" min="1" value={form.quantity} onChange={(e) => setForm({...form, quantity: e.target.value})} data-testid="item-qty-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('inventory.rental_price')}</label>
              <input className="input-wedding" type="number" value={form.rental_price} onChange={(e) => setForm({...form, rental_price: e.target.value})} data-testid="item-price-input" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('inventory.condition')}</label>
              <select className="input-wedding" value={form.condition} onChange={(e) => setForm({...form, condition: e.target.value})} data-testid="item-condition-select">
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">{t('inventory.supplier')}</label>
            <input className="input-wedding" placeholder="Supplier name" value={form.supplier} onChange={(e) => setForm({...form, supplier: e.target.value})} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm">{t('common.cancel')}</button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="save-item-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : t('common.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanInput, setScanInput] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category) params.category = category;
      const [itemsRes, statsRes] = await Promise.all([inventoryAPI.list(params), inventoryAPI.stats()]);
      setItems(itemsRes.data.items || []);
      setStats(statsRes.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [search, category]);

  const handleScan = async (e) => {
    e.preventDefault();
    try {
      const { data } = await inventoryAPI.scan(scanInput);
      setScanning(false);
      setScanInput('');
      alert(`Found: ${data.name} (${data.available} available)`);
    } catch { alert('Item not found'); }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{t('inventory.title')}</h1>
        <div className="flex gap-2">
          <button onClick={() => setScanning(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-[#C9A84C] text-[#C9A84C] text-sm font-semibold hover:bg-[#C9A84C10]" data-testid="scan-qr-btn">
            <QrCode size={16} /> {t('inventory.scan_qr')}
          </button>
          <button onClick={() => setShowModal(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="add-item-btn">
            <Plus size={18} /> {t('inventory.add_item')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items', value: stats.total || 0, color: 'bg-[#C9A84C]' },
          { label: 'Available', value: stats.available || 0, color: 'bg-[#4A7C59]' },
          { label: 'Rented', value: stats.rented || 0, color: 'bg-[#E65100]' },
          { label: 'Maintenance', value: stats.maintenance || 0, color: 'bg-[#D9534F]' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-4 text-white`} data-testid={`inv-stat-${s.label.toLowerCase().replace(' ','-')}`}>
            <p className="text-2xl font-bold" style={{fontFamily:'Playfair Display,serif'}}>{s.value}</p>
            <p className="text-xs font-medium text-white/80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]" />
          <input className="input-wedding pl-10" placeholder={t('inventory.search')} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="inventory-search" />
        </div>
        <select className="input-wedding w-full sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-filter">
          <option value="">{t('inventory.all_categories')}</option>
          {['furniture','audio','decor','linens','lighting','transport','catering','equipment'].map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
        <button onClick={fetchItems} className="p-2.5 rounded-xl border border-[#EBE5DB] hover:border-[#C9A84C] text-[#5C5C5C]" data-testid="refresh-inventory">
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <Package size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{t('common.no_data')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => <ItemCard key={item.item_id} item={item} onAction={(i) => console.log('action', i)} />)}
        </div>
      )}

      {/* QR Scan Modal */}
      {scanning && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setScanning(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4 text-[#2D2D2D]">Scan or Enter QR Code</h3>
            <form onSubmit={handleScan} className="space-y-3">
              <input
                className="input-wedding text-center font-mono text-lg"
                placeholder="QR-XXXXXXXX"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value.toUpperCase())}
                autoFocus
                data-testid="qr-input"
              />
              <button type="submit" className="btn-gold w-full h-11 text-sm" data-testid="qr-search-btn">Find Item</button>
            </form>
          </div>
        </div>
      )}

      {showModal && <AddItemModal onClose={() => setShowModal(false)} onSave={(item) => { setItems([item, ...items]); setShowModal(false); }} />}
    </div>
  );
}
