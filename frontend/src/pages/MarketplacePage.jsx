import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, Heart, HeartOff, Filter, ChevronRight } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const CATEGORIES = [
  { key: '', label: 'All' },
  { key: 'catering', label: 'Catering' },
  { key: 'decor', label: 'Decor' },
  { key: 'music', label: 'Music & DJ' },
  { key: 'photography', label: 'Photography' },
  { key: 'transport', label: 'Transport' },
  { key: 'venue', label: 'Venue' },
  { key: 'makeup', label: 'Makeup' },
  { key: 'flowers', label: 'Flowers' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'entertainment', label: 'Entertainment' },
];

export default function MarketplacePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, size: 12 });
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      const res = await api.get(`/marketplace/vendors?${params}`);
      setVendors(res.data.content || res.data);
      setTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [category, search, page]);

  const fetchFavorites = async () => {
    if (!user) return;
    try {
      const res = await api.get('/marketplace/favorites');
      setFavorites(new Set(res.data.vendor_ids || []));
    } catch {}
  };

  useEffect(() => { fetchVendors(); }, [fetchVendors]);
  useEffect(() => { fetchFavorites(); }, [user]);

  const toggleFavorite = async (e, vendorId) => {
    e.stopPropagation();
    if (!user) { navigate('/login'); return; }
    try {
      if (favorites.has(vendorId)) {
        await api.delete(`/marketplace/favorites/${vendorId}`);
        setFavorites(prev => { const s = new Set(prev); s.delete(vendorId); return s; });
      } else {
        await api.post(`/marketplace/favorites/${vendorId}`);
        setFavorites(prev => new Set([...prev, vendorId]));
      }
    } catch {}
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          Vendor Marketplace
        </h1>
        <p className="text-[#5C5C5C]">Discover and connect with verified event vendors in Rwanda</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)] mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C9C9C]" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search vendors by name..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] focus:border-[#C9A84C]"
          />
        </div>
        <select
          value={category}
          onChange={e => { setCategory(e.target.value); setPage(0); }}
          className="px-4 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40] bg-white text-[#2D2D2D]"
        >
          {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {CATEGORIES.map(c => (
          <button
            key={c.key}
            onClick={() => { setCategory(c.key); setPage(0); }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              category === c.key
                ? 'bg-[#C9A84C] text-white'
                : 'bg-white text-[#5C5C5C] border border-[#EBE5DB] hover:border-[#C9A84C]'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Vendor Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16 text-[#5C5C5C]">
          <ShoppingBag size={40} className="mx-auto mb-3 text-[#EBE5DB]" />
          <p>No vendors found for this search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {vendors.map(vendor => (
            <VendorCard
              key={vendor.vendor_id || vendor.vendorId}
              vendor={vendor}
              isFavorited={favorites.has(vendor.vendor_id || vendor.vendorId)}
              onFavorite={toggleFavorite}
              onClick={() => navigate(`/marketplace/vendors/${vendor.vendor_id || vendor.vendorId}`)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-full border border-[#EBE5DB] text-sm disabled:opacity-40">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-[#5C5C5C]">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-full border border-[#EBE5DB] text-sm disabled:opacity-40">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function VendorCard({ vendor, isFavorited, onFavorite, onClick }) {
  const id = vendor.vendor_id || vendor.vendorId;
  const rating = vendor.rating || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all cursor-pointer group"
    >
      {/* Image placeholder */}
      <div className="h-40 bg-gradient-to-br from-[#F5F0E8] to-[#EBE5DB] relative">
        <div className="absolute inset-0 flex items-center justify-center text-4xl">
          {getCategoryEmoji(vendor.category)}
        </div>
        {vendor.is_verified && (
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#4A7C59] text-white text-[10px] font-bold rounded-full">
            Verified
          </span>
        )}
        <button
          onClick={(e) => onFavorite(e, id)}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white transition-colors"
        >
          {isFavorited
            ? <Heart size={14} className="text-[#D9534F] fill-[#D9534F]" />
            : <Heart size={14} className="text-[#5C5C5C]" />}
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-[#2D2D2D] text-sm truncate">{vendor.name}</h3>
            <span className="text-xs text-[#C9A84C] capitalize font-medium">{vendor.category}</span>
          </div>
          {rating > 0 && (
            <div className="flex items-center gap-1 flex-shrink-0">
              <Star size={12} className="text-[#C9A84C] fill-[#C9A84C]" />
              <span className="text-xs font-semibold text-[#2D2D2D]">{rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {vendor.location && (
          <div className="flex items-center gap-1 mt-1.5 text-xs text-[#5C5C5C]">
            <MapPin size={10} />
            <span className="truncate">{vendor.location}</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[#5C5C5C]">
            {vendor.price_min ? `From RWF ${Number(vendor.price_min).toLocaleString()}` : 'Price on request'}
          </span>
          <ChevronRight size={14} className="text-[#C9A84C] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
}

function getCategoryEmoji(cat) {
  const map = { catering: '🍽️', decor: '🌸', music: '🎵', photography: '📸', transport: '🚗', venue: '🏛️', makeup: '💄', flowers: '💐', lighting: '💡', entertainment: '🎭' };
  return map[cat] || '✨';
}
