import React, { useEffect, useState, useRef } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { inventoryAPI } from '../services/api';
import {
  Plus, Search, QrCode, Package, RefreshCw, Loader,
  Edit2, X, Download, Printer,
} from 'lucide-react';

const CONDITION_COLOR = {
  good:        { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  fair:        { badge: 'bg-yellow-50 text-yellow-700',  dot: 'bg-yellow-500'  },
  poor:        { badge: 'bg-red-50 text-red-700',        dot: 'bg-red-500'     },
  maintenance: { badge: 'bg-red-50 text-red-700',        dot: 'bg-red-500'     },
  excellent:   { badge: 'bg-teal-50 text-teal-700',      dot: 'bg-teal-500'    },
};

// ── Item Detail Modal ────────────────────────────────────────────────────────
function ItemDetailModal({ item, onClose, onEdit, onDelete }) {
  const photo = item.photos?.[0];
  const cond  = CONDITION_COLOR[item.condition] || CONDITION_COLOR.good;
  const total = (item.available || 0) + (item.rented || 0) + (item.washing || 0);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    inventoryAPI.qrCodeData(item.itemId)
      .then(res => setQrData(res.data))
      .catch(() => {});
  }, [item.itemId]);

  const downloadQr = async () => {
    try {
      const res = await inventoryAPI.qrCode(item.itemId);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'image/png' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(qrData?.qrCode || item.itemId)}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const printQr = () => {
    if (!qrData) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>QR — ${item.name}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:40px}
      img{width:220px;height:220px}
      h2{margin:12px 0 4px;font-size:18px}
      p{color:#666;font-size:13px;font-family:monospace;margin:0}
      </style></head><body>
      <img src="${qrData.qrDataUrl}" />
      <h2>${item.name}</h2>
      <p>${qrData.qrCode}</p>
      <script>window.onload=()=>window.print()</script>
      </body></html>
    `);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Photo / header band */}
        <div className="relative h-44 bg-gradient-to-br from-[#F5F0E8] to-[#EBE5DB] flex items-center justify-center">
          {photo ? (
            <img src={photo} alt={item.name} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <Package size={52} className="text-[#C9A84C] opacity-40" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-[#2D2D2D] hover:bg-white transition-colors">
            <X size={16} />
          </button>
          <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${cond.badge}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cond.dot}`} />
            {item.condition}
          </span>
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h2 className="text-white font-bold text-lg leading-tight drop-shadow">{item.name}</h2>
            <p className="text-white/80 text-xs capitalize mt-0.5">{item.category}</p>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Stock grid */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Total',     value: item.quantity || total, color: 'text-[#2D2D2D]' },
              { label: 'Available', value: item.available,         color: 'text-emerald-600' },
              { label: 'Rented',    value: item.rented || 0,       color: 'text-orange-500' },
              { label: 'Washing',   value: item.washing || 0,      color: 'text-blue-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#F9F9FB] rounded-xl p-3 text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-[#9C9C9C] mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="flex gap-3">
            <div className="flex-1 bg-[#FFF8EC] rounded-xl p-3">
              <p className="text-[10px] text-[#9C9C9C] font-medium uppercase tracking-wide">Rental / day</p>
              <p className="text-base font-bold text-[#C9A84C] mt-0.5">
                {item.rentalPrice ? `${Number(item.rentalPrice).toLocaleString()} RWF` : '—'}
              </p>
            </div>
            <div className="flex-1 bg-[#F5F0E8] rounded-xl p-3">
              <p className="text-[10px] text-[#9C9C9C] font-medium uppercase tracking-wide">Purchase price</p>
              <p className="text-base font-bold text-[#2D2D2D] mt-0.5">
                {item.purchasePrice ? `${Number(item.purchasePrice).toLocaleString()} RWF` : '—'}
              </p>
            </div>
          </div>

          {/* QR Code section */}
          <div className="bg-[#F9F6F0] rounded-2xl p-4">
            <p className="text-xs font-bold text-[#2D2D2D] mb-3 flex items-center gap-1.5">
              <QrCode size={13} className="text-[#C9A84C]" /> Item QR Code
            </p>
            <div className="flex items-center gap-4">
              {/* QR image */}
              <div className="w-24 h-24 bg-white rounded-xl border border-[#EBE5DB] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                {qrData?.qrDataUrl
                  ? <img src={qrData.qrDataUrl} alt="QR" className="w-full h-full" />
                  : <Loader size={18} className="animate-spin text-[#C9A84C]" />
                }
              </div>
              {/* Code + actions */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[#5C5C5C] mb-1">Scan or type to find this item</p>
                <p className="font-mono text-sm font-bold text-[#2D2D2D] bg-white border border-[#EBE5DB] rounded-lg px-2.5 py-1.5 tracking-widest truncate">
                  {qrData?.qrCode || item.qrCode || '—'}
                </p>
                <div className="flex gap-2 mt-2">
                  <button onClick={downloadQr} disabled={!qrData} className="flex items-center gap-1 px-3 py-1.5 bg-[#C9A84C] text-white rounded-lg text-xs font-semibold hover:bg-[#b8933d] disabled:opacity-40">
                    <Download size={11} /> Download
                  </button>
                  <button onClick={printQr} disabled={!qrData} className="flex items-center gap-1 px-3 py-1.5 border border-[#EBE5DB] text-[#5C5C5C] rounded-lg text-xs font-semibold hover:border-[#C9A84C] disabled:opacity-40">
                    <Printer size={11} /> Print
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onDelete} className="flex-1 h-11 rounded-full border-2 border-red-100 text-red-500 font-medium text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-2">
              <X size={15} /> Delete
            </button>
            <button onClick={onEdit} className="flex-1 btn-gold h-11 flex items-center justify-center gap-2 text-sm">
              <Edit2 size={15} /> Edit Item
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add / Edit Item Modal ────────────────────────────────────────────────────
function ItemFormModal({ onClose, onSave, editItem = null }) {
  const { t } = useLang();
  const [form, setForm] = useState({
    name:          editItem?.name          || '',
    category:      editItem?.category      || 'furniture',
    quantity:      editItem?.quantity      || 1,
    condition:     editItem?.condition     || 'good',
    rentalPrice:   editItem?.rentalPrice   || 0,
    purchasePrice: editItem?.purchasePrice || 0,
    photos:        editItem?.photos        || [],
  });
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [photoPreview, setPhotoPreview] = useState(editItem?.photos?.[0] || null);
  const fileInputRef = useRef(null);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result);
      setForm((f) => ({ ...f, photos: [ev.target.result] }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name:          form.name,
        category:      form.category,
        quantity:      Number(form.quantity),
        condition:     form.condition,
        rentalPrice:   Number(form.rentalPrice),
        purchasePrice: Number(form.purchasePrice),
        photos:        form.photos.length ? form.photos : undefined,
      };
      const { data } = editItem
        ? await inventoryAPI.update(editItem.itemId, payload)
        : await inventoryAPI.create(payload);
      onSave(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" data-testid="add-item-modal">
        <div className="px-6 py-5 border-b border-[#EBE5DB] flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            {editItem ? 'Edit Item' : 'Add Item'}
          </h2>
          <button type="button" onClick={onClose} className="text-[#9C9C9C] hover:text-[#2D2D2D] transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Photo upload */}
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-2">Item Photo</label>
            <div
              className="relative h-36 rounded-xl border-2 border-dashed border-[#EBE5DB] flex flex-col items-center justify-center cursor-pointer hover:border-[#C9A84C] transition-colors overflow-hidden group"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <>
                  <img src={photoPreview} alt="preview" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <p className="text-white text-sm font-semibold">Change photo</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-[#F5F0E8] flex items-center justify-center mb-2">
                    <Package size={20} className="text-[#C9A84C]" />
                  </div>
                  <p className="text-sm text-[#5C5C5C] font-medium">Click to upload or take photo</p>
                  <p className="text-xs text-[#BEBEBE] mt-0.5">JPG, PNG, WEBP</p>
                </>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">{t('inventory.item_name')}</label>
            <input className="input-wedding" placeholder="Gold Chiavari Chairs" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="item-name-input" />
          </div>

          {/* Category + Quantity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">{t('inventory.category')}</label>
              <select className="input-wedding" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="item-category-select">
                {['furniture','audio','decor','linens','lighting','transport','catering','equipment'].map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">{t('inventory.qty')}</label>
              <input className="input-wedding" type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} data-testid="item-qty-input" />
            </div>
          </div>

          {/* Rental Price + Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">{t('inventory.rental_price')} (RWF)</label>
              <input className="input-wedding" type="number" min="0" value={form.rentalPrice} onChange={(e) => setForm({ ...form, rentalPrice: e.target.value })} data-testid="item-price-input" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5C5C5C] uppercase tracking-wide mb-1.5">{t('inventory.condition')}</label>
              <select className="input-wedding" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} data-testid="item-condition-select">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-11 rounded-full border-2 border-[#EBE5DB] text-[#5C5C5C] font-medium text-sm hover:border-[#C9A84C] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 btn-gold h-11 flex items-center justify-center text-sm" data-testid="save-item-btn">
              {loading ? <Loader size={16} className="animate-spin" /> : (editItem ? 'Save Changes' : 'Add Item')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Item Card ────────────────────────────────────────────────────────────────
function ItemCard({ item, onClick }) {
  const photo = item.photos?.[0];
  const cond  = CONDITION_COLOR[item.condition] || CONDITION_COLOR.good;
  const availPct = item.quantity > 0 ? Math.round((item.available / item.quantity) * 100) : 0;

  return (
    <div
      className="bg-white rounded-2xl border border-[#EBE5DB] overflow-hidden cursor-pointer group hover:shadow-lg hover:border-[#C9A84C40] transition-all duration-200"
      onClick={onClick}
      data-testid="inventory-item-card"
    >
      {/* Photo banner */}
      <div className="relative h-32 bg-gradient-to-br from-[#F5F0E8] to-[#EBE5DB] flex items-center justify-center overflow-hidden">
        {photo ? (
          <img src={photo} alt={item.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <Package size={36} className="text-[#C9A84C] opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        {/* condition dot */}
        <span className={`absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${cond.badge}`}>
          {item.condition}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-bold text-[#2D2D2D] text-sm leading-tight truncate">{item.name}</h3>
            <p className="text-xs text-[#9C9C9C] capitalize mt-0.5">{item.category}</p>
          </div>
          <p className="text-sm font-bold text-[#C9A84C] flex-shrink-0">
            {item.rentalPrice ? `${Number(item.rentalPrice).toLocaleString()}` : '—'}
            <span className="text-[9px] font-medium text-[#9C9C9C] block text-right">RWF/day</span>
          </p>
        </div>

        {/* Stock pills */}
        <div className="flex items-center gap-1.5 flex-wrap mb-3">
          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-semibold">
            {item.available} avail.
          </span>
          {item.rented > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[10px] font-semibold">
              {item.rented} rented
            </span>
          )}
          {item.washing > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold">
              {item.washing} washing
            </span>
          )}
        </div>

        {/* Availability bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#F5F0E8] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${availPct}%`,
                background: availPct > 60 ? '#4A7C59' : availPct > 30 ? '#C9A84C' : '#D9534F',
              }}
            />
          </div>
          <span className="text-[10px] text-[#9C9C9C] font-medium w-8 text-right">{availPct}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function InventoryPage() {
  const { t } = useLang();
  const [items, setItems]           = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [editItem, setEditItem]     = useState(null);
  const [scanning, setScanning]     = useState(false);
  const [scanInput, setScanInput]   = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search)   params.search   = search;
      if (category) params.category = category;
      const [itemsRes, statsRes] = await Promise.all([inventoryAPI.list(params), inventoryAPI.stats()]);
      setItems(itemsRes.data.items || []);
      setStats(statsRes.data || {});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [search, category]);

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      await inventoryAPI.delete(item.itemId);
      setItems(items.filter(i => i.itemId !== item.itemId));
      setDetailItem(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  const handleScan = async (e) => {
    e.preventDefault();
    try {
      const { data } = await inventoryAPI.scan(scanInput);
      setScanning(false);
      setScanInput('');
      setDetailItem(data);
    } catch { alert('Item not found'); }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            {t('inventory.title')}
          </h1>
          <p className="text-sm text-[#5C5C5C] mt-0.5">Click any item to view details</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setScanning(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 border-[#C9A84C] text-[#C9A84C] text-sm font-semibold hover:bg-[#FFF8EC] transition-colors" data-testid="scan-qr-btn">
            <QrCode size={16} /> {t('inventory.scan_qr')}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-gold px-5 py-2.5 flex items-center gap-2 text-sm" data-testid="add-item-btn">
            <Plus size={18} /> {t('inventory.add_item')}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Items', value: stats.total || 0,       color: 'bg-[#C9A84C]'  },
          { label: 'Available',   value: stats.available || 0,   color: 'bg-[#4A7C59]'  },
          { label: 'Rented',      value: stats.rented || 0,      color: 'bg-[#E65100]'  },
          { label: 'Maintenance', value: stats.maintenance || 0, color: 'bg-[#D9534F]'  },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-2xl p-4 text-white`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-xs font-medium text-white/80 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C9C]" />
          <input className="input-wedding pl-10" placeholder={t('inventory.search')} value={search} onChange={(e) => setSearch(e.target.value)} data-testid="inventory-search" />
        </div>
        <select className="input-wedding w-full sm:w-48" value={category} onChange={(e) => setCategory(e.target.value)} data-testid="category-filter">
          <option value="">{t('inventory.all_categories')}</option>
          {['furniture','audio','decor','linens','lighting','transport','catering','equipment'].map(c => (
            <option key={c} value={c} className="capitalize">{c}</option>
          ))}
        </select>
        <button onClick={fetchItems} className="p-2.5 rounded-xl border border-[#EBE5DB] hover:border-[#C9A84C] text-[#5C5C5C] hover:text-[#C9A84C] transition-colors" data-testid="refresh-inventory">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#F5F0E8] flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-[#C9A84C]" />
          </div>
          <h3 className="font-semibold text-[#2D2D2D] mb-1">{t('common.no_data')}</h3>
          <button onClick={() => setShowAdd(true)} className="mt-4 btn-gold px-6 py-2.5 text-sm">+ Add First Item</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(item => (
            <ItemCard key={item.itemId} item={item} onClick={() => setDetailItem(item)} />
          ))}
        </div>
      )}

      {/* QR Scan Modal */}
      {scanning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setScanning(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1 text-[#2D2D2D]">Scan QR Code</h3>
            <p className="text-sm text-[#5C5C5C] mb-4">Enter the QR code or barcode to look up an item.</p>
            <form onSubmit={handleScan} className="space-y-3">
              <input className="input-wedding text-center font-mono text-lg tracking-widest" placeholder="PRANI-XXXXXXXX" value={scanInput} onChange={(e) => setScanInput(e.target.value.toUpperCase())} autoFocus data-testid="qr-input" />
              <button type="submit" className="btn-gold w-full h-11 text-sm" data-testid="qr-search-btn">Find Item</button>
            </form>
          </div>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <ItemDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onEdit={() => { setEditItem(detailItem); setDetailItem(null); }}
          onDelete={() => handleDelete(detailItem)}
        />
      )}

      {/* Add modal */}
      {showAdd && (
        <ItemFormModal
          onClose={() => setShowAdd(false)}
          onSave={(item) => { setItems([item, ...items]); setShowAdd(false); fetchItems(); }}
        />
      )}

      {/* Edit modal */}
      {editItem && (
        <ItemFormModal
          editItem={editItem}
          onClose={() => setEditItem(null)}
          onSave={(updated) => {
            setItems(items.map(i => i.itemId === updated.itemId ? updated : i));
            setEditItem(null);
          }}
        />
      )}
    </div>
  );
}
