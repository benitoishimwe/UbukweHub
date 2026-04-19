import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import {
  LayoutDashboard, Calendar, Package, ArrowLeftRight, Users, Store,
  BarChart3, ShieldCheck, Sparkles, Settings, LogOut, Menu, X, Bell, Globe, CreditCard
} from 'lucide-react';

const navItems = (t, role) => {
  const items = [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/events', label: t('nav.events'), icon: Calendar },
    { path: '/inventory', label: t('nav.inventory'), icon: Package },
    { path: '/transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
    { path: '/staff', label: t('nav.staff'), icon: Users },
    { path: '/vendors', label: t('nav.vendors'), icon: Store },
    { path: '/ai', label: t('nav.ai'), icon: Sparkles },
    { path: '/reports', label: t('nav.reports'), icon: BarChart3 },
    { path: '/pricing', label: 'Pricing', icon: CreditCard },
  ];
  if (role === 'admin') {
    items.push({ path: '/admin', label: t('nav.admin'), icon: ShieldCheck });
  }
  items.push({ path: '/settings', label: t('nav.settings'), icon: Settings });
  return items;
};

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

  const items = navItems(t, user?.role);
  const mobileItems = items.slice(0, 5);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#EBE5DB]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#C9A84C] flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-sm" style={{fontFamily:'Playfair Display,serif'}}>U</span>
          </div>
          <div>
            <h1 className="font-bold text-[#2D2D2D] text-base" style={{fontFamily:'Playfair Display,serif'}}>UbukweHub</h1>
            <p className="text-xs text-[#5C5C5C]">Wedding Platform</p>
          </div>
        </div>
      </div>

      {/* User pill */}
      <div className="px-4 py-3 mx-3 mt-3 rounded-xl bg-gradient-to-r from-[#C9A84C10] to-[#E8A4B810]">
        <div className="flex items-center gap-2">
          {user?.picture ? (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#C9A84C] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#2D2D2D] truncate">{user?.name}</p>
            <p className="text-xs text-[#C9A84C] capitalize font-medium">{user?.role}</p>
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
            data-testid={`nav-${path.replace('/', '')}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-[#EBE5DB] space-y-1">
        {/* Language toggle */}
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
          className="sidebar-link w-full text-[#D9534F]"
          data-testid="logout-btn"
        >
          <LogOut size={18} />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F5F0E8] overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 flex-col bg-white border-r border-[#EBE5DB] flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white h-full shadow-xl z-10">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#F5F0E8]"
            >
              <X size={20} className="text-[#5C5C5C]" />
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
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-[#F5F0E8]" data-testid="menu-btn">
              <Menu size={22} className="text-[#2D2D2D]" />
            </button>
            <span className="font-bold text-[#2D2D2D] text-base" style={{fontFamily:'Playfair Display,serif'}}>UbukweHub</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => switchLang(lang === 'en' ? 'rw' : 'en')}
              className="px-2 py-1 rounded-full bg-[#C9A84C15] text-[#C9A84C] text-xs font-semibold"
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
                    active ? 'text-[#C9A84C]' : 'text-[#5C5C5C]'
                  }`}
                  data-testid={`mobile-nav-${path.replace('/', '')}`}
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
