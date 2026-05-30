import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TrialBanner from './TrialBanner';
import NotificationBell from './NotificationBell';
import SupportWidget from './SupportWidget';
import PlaniLogo from './PlaniLogo';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useLang } from '../contexts/LanguageContext';
import {
  LayoutDashboard, Calendar, Package, ArrowLeftRight, Users, Store,
  BarChart3, ShieldCheck, Sparkles, Settings, LogOut, Menu, X,
  CreditCard, Heart, Image, MapPin, Briefcase, MessageSquare, Receipt,
} from 'lucide-react';

/**
 * Master nav item registry.
 *
 * roles     – which roles see this item (always visible to those roles)
 * featureKey – if set, the item is additionally hidden unless the tenant's
 *              subscription plan enables that feature
 * labelKey  – i18n key resolved via t(); use `label` for hardcoded strings
 */
const NAV_REGISTRY = [
  { key: 'dashboard',      path: '/dashboard',     labelKey: 'nav.dashboard',    icon: LayoutDashboard,
    roles: ['tenant_admin', 'event_manager', 'staff', 'client', 'vendor'] },

  { key: 'events',         path: '/events',         labelKey: 'nav.events',       icon: Calendar,
    roles: ['tenant_admin', 'event_manager', 'client'] },

  { key: 'planner',        path: '/planner',        label: 'Planner',             icon: Heart,
    roles: ['tenant_admin', 'event_manager', 'client'] },

  { key: 'inventory',      path: '/inventory',      labelKey: 'nav.inventory',    icon: Package,
    roles: ['tenant_admin', 'event_manager', 'staff'] },

  { key: 'transactions',   path: '/transactions',   labelKey: 'nav.transactions', icon: ArrowLeftRight,
    roles: ['tenant_admin', 'event_manager', 'staff'],
    featureKey: 'admin_pages', featureExemptRoles: ['tenant_admin', 'staff'] },

  { key: 'staff',          path: '/staff',          labelKey: 'nav.staff',        icon: Users,
    roles: ['tenant_admin', 'event_manager'] },

  { key: 'vendors',        path: '/vendors',        labelKey: 'nav.vendors',      icon: Store,
    roles: ['tenant_admin', 'event_manager'],
    featureKey: 'admin_pages', featureExemptRoles: ['tenant_admin'] },

  { key: 'marketplace',    path: '/marketplace',    label: 'Marketplace',         icon: MapPin,
    roles: ['event_manager', 'client', 'vendor'] },

  // ── Feature-gated items ───────────────────────────────────────────────────
  { key: 'ai',             path: '/ai',             labelKey: 'nav.ai',           icon: Sparkles,
    roles: ['tenant_admin', 'event_manager', 'client'], featureKey: 'ai_assistant' },

  { key: 'savethedate',    path: '/save-the-date',  label: 'Save the Date',       icon: Image,
    roles: ['tenant_admin', 'event_manager'],           featureKey: 'save_the_date' },

  { key: 'reports',        path: '/reports',        labelKey: 'nav.reports',      icon: BarChart3,
    roles: ['tenant_admin', 'event_manager'],           featureKey: 'advanced_reports' },

  // ── Tenant-admin only (also shown to event_manager on trial via admin_pages) ─
  { key: 'pricing',        path: '/pricing',        label: 'Pricing',             icon: CreditCard,
    roles: ['tenant_admin', 'event_manager'],
    featureKey: 'admin_pages', featureExemptRoles: ['tenant_admin'] },

  { key: 'admin',          path: '/admin',          labelKey: 'nav.admin',        icon: ShieldCheck,
    roles: ['tenant_admin', 'event_manager'],
    featureKey: 'admin_pages', featureExemptRoles: ['tenant_admin'] },

  { key: 'messages',       path: '/messages',       label: 'Messages',            icon: MessageSquare,
    roles: ['tenant_admin', 'event_manager', 'staff'] },

  { key: 'billing',        path: '/billing',        label: 'Billing',             icon: Receipt,
    roles: ['tenant_admin', 'event_manager'],
    featureKey: 'admin_pages', featureExemptRoles: ['tenant_admin'] },

  // ── Vendor-only ───────────────────────────────────────────────────────────
  { key: 'vendor_profile', path: '/vendor-profile', label: 'My Profile',          icon: Briefcase,
    roles: ['vendor'] },

  // ── Universal ─────────────────────────────────────────────────────────────
  { key: 'support',        path: '/support',        label: 'Support',             icon: MessageSquare,
    roles: ['tenant_admin', 'event_manager', 'staff', 'client'] },

  { key: 'settings',       path: '/settings',       labelKey: 'nav.settings',     icon: Settings,
    roles: ['tenant_admin', 'event_manager', 'staff', 'client', 'vendor'] },
];

/** Resolve translated or static label for a registry entry. */
function resolveLabel(item, t) {
  return item.labelKey ? t(item.labelKey) : item.label;
}

/**
 * Build the nav list for the current user:
 * 1. Keep only items whose roles include the user's role.
 * 2. For feature-gated items, additionally require isFeatureEnabled().
 */
function buildNavItems(role, t, isFeatureEnabled) {
  return NAV_REGISTRY
    .filter(item => item.roles.includes(role))
    .filter(item => {
      if (!item.featureKey) return true;
      if (item.featureExemptRoles?.includes(role)) return true;
      return isFeatureEnabled(item.featureKey);
    })
    .map(item => ({ ...item, label: resolveLabel(item, t) }));
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { isFeatureEnabled } = useSubscription();
  const { t, lang, switchLang, languages } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = buildNavItems(user?.role ?? '', t, isFeatureEnabled);
  const mobileItems = items.slice(0, 5);

  const SidebarContent = () => (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <Link to="/dashboard" className="flex items-center gap-2 group">
          <PlaniLogo size="md" />
        </Link>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-xl" style={{background:'rgba(15,76,92,0.06)'}}>
        <div className="flex items-center gap-2">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0F4C5C] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#111827] truncate">{user?.name}</p>
            <p className="text-xs text-[#0F4C5C] capitalize font-medium">{user?.role?.replace('_', ' ')}</p>
          </div>
          <NotificationBell />
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto mt-2">
        {items.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            onClick={() => setSidebarOpen(false)}
            className={`sidebar-link ${location.pathname === path ? 'active' : ''}`}
            data-testid={`nav-${path.replace(/\//g, '').replace(/-/g, '')}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#E5E7EB] space-y-1" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="px-2 pb-1">
          <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-1.5 px-1">Language</p>
          <div className="grid grid-cols-2 gap-1">
            {languages.map(({ code, flag, shortLabel }) => (
              <button
                key={code}
                onClick={() => switchLang(code)}
                data-testid={`lang-${code}`}
                className={`flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  lang === code
                    ? 'bg-[#0F4C5C] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]'
                }`}
              >
                <span>{flag}</span> {shortLabel}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-[#DC2626]"
          data-testid="logout-btn"
        >
          <LogOut size={18} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F9F9FB] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-[#E5E7EB] flex-shrink-0 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[60] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#F9F9FB]"
            >
              <X size={20} className="text-[#6B7280]" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top Header (mobile) */}
        <header className="lg:hidden glass-header px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[#E8F4F8]" data-testid="menu-btn">
              <Menu size={22} className="text-[#111827]" />
            </button>
            <PlaniLogo size="sm" />
          </div>
          <div className="flex items-center gap-1.5">
            <NotificationBell />
            <button
              onClick={() => {
                const idx = languages.findIndex(l => l.code === lang);
                switchLang(languages[(idx + 1) % languages.length].code);
              }}
              className="px-2.5 py-1 rounded-full bg-[#E8F4F8] text-[#0F4C5C] text-xs font-semibold flex items-center gap-1"
              data-testid="lang-toggle-mobile"
              title="Change language"
            >
              {languages.find(l => l.code === lang)?.flag}
              {languages.find(l => l.code === lang)?.shortLabel}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <TrialBanner />
          <div className="animate-fade-in">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="mobile-nav lg:hidden">
          <div className="flex items-center justify-around py-2">
            {mobileItems.map(({ path, label, icon: Icon }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                    active ? 'text-[#0F4C5C]' : 'text-[#6B7280]'
                  }`}
                  data-testid={`mobile-nav-${path.replace(/\//g, '')}`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium leading-none">{label.split(' ')[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <SupportWidget />
    </div>
  );
}
