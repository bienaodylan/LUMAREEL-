import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { User as UserIcon } from 'lucide-react';

/**
 * Navbar.tsx — En-tête épuré et moderne LUMARÉEL CO.
 * Le menu tiroir mobile et le bouton hamburger ont été retirés conformément à la demande,
 * la navigation étant désormais intégralement assurée par la barre mobile flottante en bas de l'écran.
 */
export const Navbar: React.FC = () => {
  const { currentPage, setCurrentPage, currentUser, setIsAuthModalOpen, platformSettings } = useApp();
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

  // Menu desktop discret
  const navItems: Array<{ label: string; page: PageView }> = [
    { label: 'Accueil', page: 'home' },
    { label: 'Mes billets', page: 'client_space' },
    { label: 'Archives', page: 'archive' },
    { label: 'Actualités', page: 'news' },
  ];

  // Masqué sur l'écran d'accueil splash ou pendant le contrôle vigile plein écran
  if (currentPage === 'splash' || currentPage === 'gate_scanner') {
    return null;
  }

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 px-4 sm:px-8 md:px-12 py-3 sm:py-4 ${
        scrolled
          ? 'bg-black/85 backdrop-blur-xl border-b border-white/10 shadow-lg'
          : 'bg-gradient-to-b from-black/80 via-black/40 to-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Zone 1: Logo Officiel LUMARÉEL CO. (Dynamique) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2.5 group cursor-pointer focus:outline-none"
            aria-label={`${platformSettings.platformName} ${platformSettings.tagline} Accueil`}
          >
            {platformSettings.logoUrl ? (
              <img
                src={platformSettings.logoUrl}
                alt={platformSettings.platformName}
                className="w-8 h-8 rounded-full object-cover border border-white/30 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)] bg-black"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center font-agrandir-extrabold text-sm tracking-tighter text-white bg-white/5 backdrop-blur-sm group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                {platformSettings.logoMonogram || 'LR'}
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight uppercase leading-none group-hover:text-[#f0f0f0] transition-colors">
                {platformSettings.platformName || 'LUMARÉEL'}
              </span>
              <span className="text-[9px] font-agrandir-semibold tracking-[0.25em] text-[#999] uppercase leading-none mt-0.5">
                {platformSettings.tagline || 'CO.'}
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links Épurés (Bureau uniquement) */}
        <nav className="hidden lg:flex items-center gap-1.5 px-6 py-2 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/20 shadow-2xl text-xs font-agrandir-semibold tracking-wide text-white">
          {navItems.map((item, idx) => {
            const isActive = currentPage === item.page;
            return (
              <button
                key={`${item.page}-${idx}`}
                type="button"
                onClick={() => setCurrentPage(item.page)}
                className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
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

        {/* Zone 3: Horloge en direct Abidjan (Alignement propre) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 text-[11px] text-[#999] font-agrandir-regular tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
            <span>ABIDJAN {abidjanTime}</span>
          </div>
        </div>

      </div>
    </header>
  );
};
