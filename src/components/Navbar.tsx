import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Ticket as TicketIcon, User as UserIcon, Shield, Menu, X, PlusCircle, Search, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentPage, setCurrentPage, currentUser, setCurrentUser } = useApp();
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [abidjanTime, setAbidjanTime] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      setAbidjanTime(`${hours}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleRoleChange = (role: 'customer' | 'gate_agent' | 'super_admin') => {
    if (role === 'super_admin') {
      setCurrentUser({
        id: 'usr_admin_01',
        email: 'bienaodylan428@gmail.com',
        name: 'Directeur Artistique & Production',
        role: 'super_admin',
        emailVerified: true,
        createdAt: '2026-01-10T00:00:00Z',
      });
      setCurrentPage('admin');
    } else if (role === 'gate_agent') {
      setCurrentUser({
        id: 'usr_agent_01',
        email: 'scanner.porte1@lumareel.co',
        name: 'Agent Contrôle — Entrée A',
        role: 'gate_agent',
        emailVerified: true,
        createdAt: '2026-02-15T00:00:00Z',
      });
      setCurrentPage('gate_scanner');
    } else {
      setCurrentUser({
        id: 'usr_client_01',
        email: 'collecteur@lumareel.co',
        name: 'Alexandre V.',
        role: 'customer',
        emailVerified: true,
        createdAt: '2026-03-01T00:00:00Z',
      });
      setCurrentPage('client_space');
    }
    setRoleSwitcherOpen(false);
    setMobileMenuOpen(false);
  };

  const navItems: Array<{ label: string; page: PageView }> = [
    { label: 'Accueil', page: 'home' },
    { label: 'Découvrir', page: 'discover' },
    { label: 'Archives', page: 'archive' },
    { label: 'Actualités', page: 'news' },
  ];


  // Hidden on the standalone entry splash page
  if (currentPage === 'splash') {
    return null;
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-4 sm:px-8 md:px-12 py-3 sm:py-4 ${
        scrolled
          ? 'bg-black/80 backdrop-blur-lg border-b border-white/10'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Logo LUMARÉEL (Left) — Stylized brand emblem matching GoLive reference */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
            aria-label="LUMARÉEL CO. Accueil"
          >
            {/* Cyan/Orange stylized badge inspired by GoLive logo */}
            <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-agrandir-extrabold text-sm tracking-tighter text-white bg-white/5 backdrop-blur-sm group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              LR
            </div>
            <div className="flex flex-col text-left">
              <span className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight uppercase leading-none group-hover:text-[#f0f0f0] transition-colors">
                LUMARÉEL
              </span>
              <span className="text-[9px] font-agrandir-semibold tracking-[0.25em] text-[#999] uppercase leading-none mt-0.5">
                CO.
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Center Capsule - Rounded Pill matching GoLive Asia) */}
        <nav className="hidden lg:flex items-center gap-1 sm:gap-2 px-6 py-2 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/20 shadow-2xl text-xs font-agrandir-semibold tracking-wide text-white">
          {navItems.map((item, idx) => {
            const isActive = currentPage === item.page && (item.label !== 'Billetterie' || currentPage === 'home');
            return (
              <button
                key={`${item.page}-${idx}`}
                onClick={() => setCurrentPage(item.page)}
                className={`px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-black font-agrandir-extrabold shadow-md'
                    : 'text-[#d6d6d6] hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Account (Right Capsule - Rounded Pill) */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          
          {/* User Account Capsule Pill (Matching GoLive "Hi, faezz") */}
          <div className="relative">
            <button
              onClick={() => setRoleSwitcherOpen(!roleSwitcherOpen)}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] backdrop-blur-md border border-white/20 text-xs font-agrandir-semibold text-white tracking-wide transition-all shadow-xl cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">
                <UserIcon className="w-3 h-3 text-white" />
              </div>
              <span className="truncate max-w-[120px]">
                {currentUser ? `Hi, ${currentUser.name.split(' ')[0]}` : 'Mon Compte'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#aaa]" />
            </button>

            {/* Dropdown Menu */}
            {roleSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-[#0e0e0e] border border-white/20 rounded-2xl p-3 shadow-2xl z-50 text-xs font-agrandir-regular text-left backdrop-blur-xl animate-fadeIn">
                <div className="px-3 py-2 border-b border-white/10 mb-2">
                  <div className="text-[10px] text-[#777] uppercase tracking-widest font-agrandir-semibold">Connecté en tant que</div>
                  <div className="text-white font-agrandir-semibold truncate">{currentUser?.name}</div>
                  <div className="text-[11px] text-[#999] truncate">{currentUser?.email}</div>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setCurrentPage('client_space');
                      setRoleSwitcherOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/10 text-white flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <TicketIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Mes Billets &amp; Réservations</span>
                  </button>


                  <div className="border-t border-white/10 pt-2 mt-2">
                    <div className="text-[9px] text-[#666] px-3 py-1 uppercase tracking-widest font-agrandir-semibold">Portails Professionnels</div>
                    <button
                      onClick={() => handleRoleChange('gate_agent')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 text-[#bbb] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-blue-400" />
                      <span>Scanner Portes (Contrôle)</span>
                    </button>
                    <button
                      onClick={() => handleRoleChange('super_admin')}
                      className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-white/10 text-[#bbb] hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5 text-purple-400" />
                      <span>Administration Centrale</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Abidjan Live Clock Pill */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-full bg-black/40 border border-white/10 text-[11px] text-[#999] font-agrandir-regular tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
            <span>ABIDJAN {abidjanTime}</span>
          </div>

        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setCurrentPage('client_space')}
            className="p-2 rounded-full bg-white/10 border border-white/20 text-white"
            title="Mes billets"
          >
            <TicketIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-full bg-white/10 border border-white/20 text-white focus:outline-none"
            aria-label="Ouvrir le menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Menu (Rounded card) */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-3 p-5 rounded-3xl bg-[#0c0c0c]/95 backdrop-blur-xl border border-white/20 space-y-4 text-xs font-agrandir-semibold tracking-wide uppercase text-[#ddd] shadow-2xl">
          <div className="grid grid-cols-2 gap-2 pb-3 border-b border-white/10">
            {navItems.map((item, idx) => (
              <button
                key={`${item.page}-mob-${idx}`}
                onClick={() => {
                  setCurrentPage(item.page);
                  setMobileMenuOpen(false);
                }}
                className={`py-2.5 px-3 rounded-xl text-left transition-colors ${
                  currentPage === item.page ? 'bg-white text-black font-agrandir-extrabold' : 'bg-white/5 hover:bg-white/10 text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="pt-2 space-y-2">
            <button
              onClick={() => {
                setCurrentPage('client_space');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white flex items-center justify-between"
            >
              <span>Mon Compte &amp; Billets</span>
              <TicketIcon className="w-4 h-4 text-[#d4af37]" />
            </button>


            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleRoleChange('gate_agent')}
                className="flex-1 py-2 px-2 rounded-xl bg-white/5 text-[10px] text-[#aaa] text-center"
              >
                Scanner Portes
              </button>
              <button
                onClick={() => handleRoleChange('super_admin')}
                className="flex-1 py-2 px-2 rounded-xl bg-white/5 text-[10px] text-[#aaa] text-center"
              >
                Admin
              </button>
            </div>
          </div>
        </div>
      )}

    </header>
  );
};

