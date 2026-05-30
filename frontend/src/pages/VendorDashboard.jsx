import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorMeAPI } from '../services/api';
import {
  Star, MessageSquare, Eye, AlertCircle, ChevronRight,
  CheckCircle, ExternalLink, Edit3, User, Clock, Loader2,
} from 'lucide-react';

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Catering', 'Venue', 'Flowers & Decor',
  'Music & Entertainment', 'Wedding Cake', 'Transportation', 'Hair & Makeup',
  'Event Planning', 'Lighting', 'Invitation & Stationery', 'Other',
];

const COUNTRIES = [
  'Afghanistan','Albania','Algeria','Andorra','Angola','Antigua and Barbuda','Argentina','Armenia','Australia','Austria',
  'Azerbaijan','Bahamas','Bahrain','Bangladesh','Barbados','Belarus','Belgium','Belize','Benin','Bhutan',
  'Bolivia','Bosnia and Herzegovina','Botswana','Brazil','Brunei','Bulgaria','Burkina Faso','Burundi',
  'Cabo Verde','Cambodia','Cameroon','Canada','Central African Republic','Chad','Chile','China','Colombia',
  'Comoros','Congo (Brazzaville)','Congo (Kinshasa)','Costa Rica','Croatia','Cuba','Cyprus','Czech Republic',
  'Denmark','Djibouti','Dominica','Dominican Republic','Ecuador','Egypt','El Salvador','Equatorial Guinea',
  'Eritrea','Estonia','Eswatini','Ethiopia','Fiji','Finland','France','Gabon','Gambia','Georgia','Germany',
  'Ghana','Greece','Grenada','Guatemala','Guinea','Guinea-Bissau','Guyana','Haiti','Honduras','Hungary',
  'Iceland','India','Indonesia','Iran','Iraq','Ireland','Israel','Italy','Jamaica','Japan','Jordan',
  'Kazakhstan','Kenya','Kiribati','Kuwait','Kyrgyzstan','Laos','Latvia','Lebanon','Lesotho','Liberia',
  'Libya','Liechtenstein','Lithuania','Luxembourg','Madagascar','Malawi','Malaysia','Maldives','Mali','Malta',
  'Marshall Islands','Mauritania','Mauritius','Mexico','Micronesia','Moldova','Monaco','Mongolia','Montenegro',
  'Morocco','Mozambique','Myanmar','Namibia','Nauru','Nepal','Netherlands','New Zealand','Nicaragua','Niger',
  'Nigeria','North Korea','North Macedonia','Norway','Oman','Pakistan','Palau','Panama','Papua New Guinea',
  'Paraguay','Peru','Philippines','Poland','Portugal','Qatar','Romania','Russia','Rwanda','Saint Kitts and Nevis',
  'Saint Lucia','Saint Vincent and the Grenadines','Samoa','San Marino','São Tomé and Príncipe','Saudi Arabia',
  'Senegal','Serbia','Seychelles','Sierra Leone','Singapore','Slovakia','Slovenia','Solomon Islands','Somalia',
  'South Africa','South Korea','South Sudan','Spain','Sri Lanka','Sudan','Suriname','Sweden','Switzerland',
  'Syria','Taiwan','Tajikistan','Tanzania','Thailand','Timor-Leste','Togo','Tonga','Trinidad and Tobago',
  'Tunisia','Turkey','Turkmenistan','Tuvalu','Uganda','Ukraine','United Arab Emirates','United Kingdom',
  'United States','Uruguay','Uzbekistan','Vanuatu','Vatican City','Venezuela','Vietnam','Yemen','Zambia','Zimbabwe',
];

function VendorSetupCard({ user, onCreated }) {
  const [form, setForm] = useState({ name: user?.name || '', category: '', phone: '', location: '', country: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.category) { setError('Please select a business category'); return; }
    setLoading(true);
    setError('');
    try {
      await vendorMeAPI.init(form);
      const res = await vendorMeAPI.me();
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="card-wedding p-8 animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-[#E8F4F8] flex items-center justify-center mx-auto mb-3">
            <User size={28} className="text-[#0F4C5C]" />
          </div>
          <h2 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
            Set up your vendor profile
          </h2>
          <p className="text-sm text-[#5C5C5C] mt-1">Takes 30 seconds — you can update details anytime</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Business Name</label>
            <input
              className="input-wedding"
              placeholder={user?.name || 'Your business name'}
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Category <span className="text-[#D9534F]">*</span></label>
            <select
              className="input-wedding"
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
              required
            >
              <option value="">Select your service type…</option>
              {VENDOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Country <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
            <select
              className="input-wedding"
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
            >
              <option value="">Select your country…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Phone <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
              <input
                className="input-wedding"
                placeholder="+1 555 000 0000"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">City <span className="text-[#9CA3AF] font-normal">(optional)</span></label>
              <input
                className="input-wedding"
                placeholder="e.g. Paris, Lagos, Dubai…"
                value={form.location}
                onChange={e => setForm({ ...form, location: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-sm text-[#D9534F]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-gold h-12 flex items-center justify-center gap-2 text-sm font-semibold"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Start selling on Plani →'}
          </button>
        </form>
      </div>
    </div>
  );
}

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
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function StarRating({ rating, max = 5, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(rating) ? 'text-[#C9A84C] fill-[#C9A84C]' : 'text-[#D1D5DB]'}
        />
      ))}
    </div>
  );
}

function getMissingFields(vendor) {
  const missing = [];
  if (!vendor.profile?.bio) missing.push('Business description (bio)');
  if (!vendor.profile?.priceMin && !vendor.profile?.priceMax) missing.push('Pricing range');
  if (!vendor.portfolio?.length) missing.push('Portfolio photos');
  if (!vendor.profile?.isMarketplaceActive) missing.push('Activate marketplace listing');
  if (!vendor.profile?.website && !vendor.profile?.instagram) missing.push('Website or social media link');
  return missing;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProfileCard({ vendor }) {
  return (
    <div className="card-wedding p-6 animate-slide-up border-l-4 border-[#0F4C5C]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#0F4C5C] uppercase tracking-wide mb-1">
            Your Business
          </p>
          <h2
            className="text-xl font-bold text-[#2D2D2D] truncate"
            style={{ fontFamily: 'Playfair Display,serif' }}
          >
            {vendor.name}
          </h2>
          <p className="text-sm text-[#5C5C5C] capitalize mt-0.5">{vendor.category}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#5C5C5C]">
            {vendor.contactName && <span className="flex items-center gap-1"><User size={13} /> {vendor.contactName}</span>}
            {vendor.phone && <span>{vendor.phone}</span>}
            {vendor.email && <span>{vendor.email}</span>}
            {vendor.location && <span>{vendor.location}</span>}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {vendor.isVerified && (
            <span className="flex items-center gap-1 px-2.5 py-1 bg-[#E8F5EE] text-[#4A7C59] rounded-full text-xs font-semibold">
              <CheckCircle size={12} /> Verified
            </span>
          )}
          {vendor.profile?.isMarketplaceActive ? (
            <span className="px-2.5 py-1 bg-[#E8F4F8] text-[#0F4C5C] rounded-full text-xs font-semibold">
              Listed on Marketplace
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-[#F3F4F6] text-[#6B7280] rounded-full text-xs font-semibold">
              Not on Marketplace
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ProfileCompletionBanner({ missing }) {
  if (!missing.length) return null;
  return (
    <div className="flex items-start gap-3 bg-[#FFFBEB] border border-[#F59E0B] rounded-xl px-4 py-3 animate-fade-in">
      <AlertCircle size={18} className="text-[#D97706] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#92400E]">Complete your profile to attract more clients</p>
        <ul className="mt-1 space-y-0.5">
          {missing.map((f) => (
            <li key={f} className="text-xs text-[#92400E] flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-[#D97706] inline-block flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card-wedding p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#5C5C5C]">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>{value}</p>
      {sub && <p className="text-xs text-[#5C5C5C] mt-1">{sub}</p>}
    </div>
  );
}

function ReviewsList({ reviews, totalReviews }) {
  if (!reviews.length) {
    return (
      <div className="card-wedding p-6 animate-slide-up stagger-1">
        <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
          Recent Reviews
        </h2>
        <div className="text-center py-8 text-[#5C5C5C]">
          <Star size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No reviews yet.</p>
          <p className="text-xs mt-1">Share your marketplace link with clients to get feedback!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-wedding p-6 animate-slide-up stagger-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
          Recent Reviews
        </h2>
        {totalReviews > reviews.length && (
          <span className="text-xs text-[#5C5C5C]">{totalReviews} total</span>
        )}
      </div>
      <div className="space-y-4">
        {reviews.map((r) => (
          <div key={r.reviewId} className="border-b border-[#F5F0E8] last:border-0 pb-4 last:pb-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-[#0F4C5C] flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">
                    {r.user?.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-[#2D2D2D]">{r.user?.name || 'Anonymous'}</span>
              </div>
              <div className="flex items-center gap-2">
                <StarRating rating={r.rating} />
                <span className="text-xs text-[#5C5C5C]">{formatDate(r.createdAt)}</span>
              </div>
            </div>
            {r.title && <p className="text-sm font-medium text-[#2D2D2D] ml-9">{r.title}</p>}
            {r.body && <p className="text-sm text-[#5C5C5C] ml-9 mt-0.5 line-clamp-2">{r.body}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function InquiriesList({ inquiries, totalInquiries }) {
  if (!inquiries.length) {
    return (
      <div className="card-wedding p-6 animate-slide-up stagger-2">
        <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
          Recent Inquiries
        </h2>
        <div className="text-center py-8 text-[#5C5C5C]">
          <MessageSquare size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No inquiries yet.</p>
          <p className="text-xs mt-1">Clients can send you messages from your marketplace listing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-wedding p-6 animate-slide-up stagger-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>
          Recent Inquiries
        </h2>
        {totalInquiries > inquiries.length && (
          <span className="text-xs text-[#5C5C5C]">{totalInquiries} total</span>
        )}
      </div>
      <div className="space-y-3">
        {inquiries.map((inq) => (
          <div
            key={inq.inquiryId}
            className="flex items-start gap-3 py-3 border-b border-[#F5F0E8] last:border-0"
          >
            <div className="w-8 h-8 rounded-full bg-[#C9A84C]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare size={14} className="text-[#C9A84C]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[#2D2D2D] truncate">
                  {inq.user?.name || inq.user?.email || 'Unknown client'}
                </p>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap capitalize ${
                  inq.status === 'pending'
                    ? 'bg-[#FFF3E0] text-[#C9A84C]'
                    : inq.status === 'responded'
                    ? 'bg-[#E8F5EE] text-[#4A7C59]'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
                }`}>
                  {inq.status}
                </span>
              </div>
              {inq.message && (
                <p className="text-xs text-[#5C5C5C] mt-0.5 line-clamp-2">{inq.message}</p>
              )}
              <div className="flex items-center gap-3 mt-1 text-xs text-[#9CA3AF]">
                <span className="flex items-center gap-1"><Clock size={11} /> {formatDate(inq.createdAt)}</span>
                {inq.budget && <span>Budget: {inq.budget}</span>}
                {inq.eventDate && <span>Event: {formatDate(inq.eventDate)}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickActions({ vendorId, navigate }) {
  const actions = [
    {
      label: 'Edit Profile',
      description: 'Update your business details',
      icon: Edit3,
      color: 'bg-[#E8F4F8] text-[#0F4C5C]',
      action: () => navigate('/vendor-profile'),
    },
    {
      label: 'View Listing',
      description: 'See your marketplace page',
      icon: ExternalLink,
      color: 'bg-[#FFF3E0] text-[#C9A84C]',
      action: () => navigate('/marketplace'),
    },
  ];

  return (
    <div className="card-wedding p-6 animate-slide-up stagger-3">
      <h2 className="text-base font-bold text-[#2D2D2D] mb-4" style={{ fontFamily: 'Playfair Display,serif' }}>
        Quick Actions
      </h2>
      <div className="space-y-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className={`w-full flex items-center gap-3 p-3 rounded-xl hover:opacity-80 active:scale-[0.98] transition-all text-left ${a.color}`}
          >
            <a.icon size={18} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{a.label}</p>
              <p className="text-xs opacity-70">{a.description}</p>
            </div>
            <ChevronRight size={16} className="opacity-50" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vendor, setVendor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [reviewsMeta, setReviewsMeta] = useState({ total: 0 });
  const [inquiriesMeta, setInquiriesMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [noProfile, setNoProfile] = useState(false);

  useEffect(() => {
    (async () => {
      const [vendorRes, reviewsRes, inquiriesRes] = await Promise.allSettled([
        vendorMeAPI.me(),
        vendorMeAPI.reviews({ size: 5 }),
        vendorMeAPI.inquiries({ size: 5 }),
      ]);

      if (vendorRes.status === 'fulfilled') {
        setVendor(vendorRes.value.data);
      } else if (vendorRes.reason?.response?.status === 404) {
        setNoProfile(true);
      }

      if (reviewsRes.status === 'fulfilled') {
        const payload = reviewsRes.value.data;
        setReviews(payload?.data || []);
        setReviewsMeta(payload?.meta || { total: 0 });
      }

      if (inquiriesRes.status === 'fulfilled') {
        const payload = inquiriesRes.value.data;
        setInquiries(payload?.data || []);
        setInquiriesMeta(payload?.meta || { total: 0 });
      }

      setLoading(false);
    })();
  }, []);

  const missingFields = vendor ? getMissingFields(vendor) : [];
  const avgRating = vendor?.rating ? Number(vendor.rating) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in">
        <h1
          className="text-3xl md:text-4xl font-bold text-[#2D2D2D]"
          style={{ fontFamily: 'Playfair Display,serif' }}
        >
          {greeting()}, {vendor?.name || user?.name?.split(' ')[0] || 'Vendor'}
        </h1>
        <p className="text-[#5C5C5C] mt-1">
          {new Date().toLocaleDateString('en-RW', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Self-registration setup card */}
      {!loading && noProfile && (
        <VendorSetupCard user={user} onCreated={(v) => { setVendor(v); setNoProfile(false); }} />
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card-wedding p-6 animate-pulse h-28 bg-[#F5F0E8]" />
          ))}
        </div>
      ) : vendor ? (
        <>
          {/* Profile card */}
          <div className="mb-6">
            <ProfileCard vendor={vendor} />
          </div>

          {/* Profile completion warning */}
          {missingFields.length > 0 && (
            <div className="mb-6">
              <ProfileCompletionBanner missing={missingFields} />
            </div>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard
              icon={Star}
              label="Avg Rating"
              value={avgRating > 0 ? avgRating.toFixed(1) : '—'}
              sub={avgRating > 0 ? 'out of 5' : 'No ratings yet'}
              color="bg-[#C9A84C]"
            />
            <MetricCard
              icon={Star}
              label="Total Reviews"
              value={reviewsMeta.total}
              sub={reviewsMeta.total === 1 ? '1 review' : `${reviewsMeta.total} reviews`}
              color="bg-[#0F4C5C]"
            />
            <MetricCard
              icon={MessageSquare}
              label="Inquiries"
              value={inquiriesMeta.total}
              sub={inquiriesMeta.total === 1 ? '1 message' : `${inquiriesMeta.total} messages`}
              color="bg-[#7C3AED]"
            />
            <MetricCard
              icon={Eye}
              label="Profile Views"
              value="—"
              sub="Coming soon"
              color="bg-[#6B7280]"
            />
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: reviews + inquiries */}
            <div className="lg:col-span-2 space-y-6">
              <ReviewsList reviews={reviews} totalReviews={reviewsMeta.total} />
              <InquiriesList inquiries={inquiries} totalInquiries={inquiriesMeta.total} />
            </div>

            {/* Right: quick actions */}
            <div className="space-y-6">
              <QuickActions vendorId={vendor.vendorId} navigate={navigate} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
