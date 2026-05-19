import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import {
  LayoutDashboard, Calendar, Package, ArrowLeftRight, Users, Store,
  BarChart3, ShieldCheck, Sparkles, Settings, LogOut, Menu, X, Bell, Globe,
  CreditCard, Heart, Image, MapPin, ChevronRight, Briefcase, Star, MessageSquare,
} from 'lucide-react';

/** Navigation items per role. Returns the items the given role should see. */
function getNavItems(t, role) {
  const all = {
    dashboard:      { path: '/dashboard',     label: t('nav.dashboard'),     icon: LayoutDashboard },
    events:         { path: '/events',         label: t('nav.events'),        icon: Calendar },
    planner:        { path: '/planner',        label: 'Planner',              icon: Heart },
    inventory:      { path: '/inventory',      label: t('nav.inventory'),     icon: Package },
    transactions:   { path: '/transactions',   label: t('nav.transactions'),  icon: ArrowLeftRight },
    staff:          { path: '/staff',          label: t('nav.staff'),         icon: Users },
    vendors:        { path: '/vendors',        label: t('nav.vendors'),       icon: Store },
    marketplace:    { path: '/marketplace',    label: 'Marketplace',          icon: MapPin },
    ai:             { path: '/ai',             label: t('nav.ai'),            icon: Sparkles },
    reports:        { path: '/reports',        label: t('nav.reports'),       icon: BarChart3 },
    savethedate:    { path: '/save-the-date',  label: 'Save the Date',        icon: Image },
    pricing:        { path: '/pricing',        label: 'Pricing',              icon: CreditCard },
    admin:          { path: '/admin',          label: t('nav.admin'),         icon: ShieldCheck },
    settings:       { path: '/settings',       label: t('nav.settings'),      icon: Settings },
    vendor_profile: { path: '/vendor-profile', label: 'My Profile',           icon: Briefcase },
  };

  const byRole = {
    tenant_admin:  ['dashboard','events','planner','inventory','transactions','staff','vendors','ai','reports','savethedate','pricing','admin','settings'],
    event_manager: ['dashboard','events','planner','inventory','staff','marketplace','ai','savethedate','settings'],
    staff:         ['dashboard','inventory','transactions','settings'],
    client:        ['dashboard','events','planner','ai','marketplace','settings'],
    vendor:        ['dashboard','vendor_profile','marketplace','settings'],
  };

  const keys = byRole[role] ?? ['dashboard','events','inventory','settings'];
  return keys.map(k => all[k]).filter(Boolean);
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { t, lang, switchLang } = useLang();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const items = getNavItems(t, user?.role);
  const mobileItems = items.slice(0, 5);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#E5E7EB]">
        <Link to="/dashboard" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#0F4C5C] flex items-center justify-center shadow-md group-hover:bg-[#1A6B82] transition-colors">
            <span className="text-white font-bold text-sm" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
          </div>
          <div>
            <h1 className="font-bold text-[#111827] text-base" style={{fontFamily:'Poppins,sans-serif'}}>Prani</h1>
            <p className="text-xs text-[#6B7280]">Event Planning</p>
          </div>
        </Link>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-xl" style={{background:'rgba(15,76,92,0.06)'}}>
        <div className="flex items-center gap-2">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0F4C5C] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#111827] truncate">{user?.name}</p>
            <p className="text-xs text-[#0F4C5C] capitalize font-medium">{user?.role?.replace('_',' ')}</p>
          </div>
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
            data-testid={`nav-${path.replace(/\//g,'').replace(/-/g,'')}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#E5E7EB] space-y-1">
        <button
          onClick={() => switchLang(lang === 'en' ? 'rw' : 'en')}
          className="sidebar-link w-full"
          data-testid="lang-toggle"
        >
          <Globe size={18} />
          <span>{lang === 'en' ? 'Kinyarwanda' : 'English'}</span>
        </button>
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
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-[#E5E7EB] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-2xl z-10">
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
            <span className="font-bold text-[#111827] text-base" style={{fontFamily:'Poppins,sans-serif'}}>Prani</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchLang(lang === 'en' ? 'rw' : 'en')}
              className="px-2 py-1 rounded-full bg-[#E8F4F8] text-[#0F4C5C] text-xs font-semibold"
              data-testid="lang-toggle-mobile"
            >
              {lang === 'en' ? 'RW' : 'EN'}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
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
                  data-testid={`mobile-nav-${path.replace(/\//g,'')}`}
                >
                  <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
                  <span className="text-[10px] font-medium leading-none">{label.split(' ')[0]}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
