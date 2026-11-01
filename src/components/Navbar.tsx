import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { User as UserIcon, Shield } from 'lucide-react';

/**
 * Navbar.tsx — En-tête épuré et moderne LUMARÉEL CO.
 * Dispose désormais d'un menu profil complet sur ordinateur ainsi que du sélecteur de langue complet FR / EN.
 */
export const Navbar: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    currentUser,
    platformSettings,
    language,
    setLanguage,
    t,
  } = useApp();

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Menu desktop
  const navItems: Array<{ label: string; page: PageView }> = [
    { label: t('nav.home'), page: 'home' },
    { label: t('nav.orders'), page: 'client_space' },
    { label: t('nav.archives'), page: 'archive' },
    { label: t('nav.news'), page: 'news' },
    { label: t('nav.profile'), page: 'profile' },
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
        
        {/* Zone 1: Logo Officiel LUMARÉEL CO. */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentPage('home')}
            className="flex items-center group cursor-pointer focus:outline-none"
            aria-label={`${platformSettings.platformName || 'LUMARÉEL'} Accueil`}
          >
            <img
              src="/assets/logo-lumareel.png"
              alt={platformSettings.platformName || 'LUMARÉEL CO.'}
              className="h-8 sm:h-9 md:h-10 w-auto object-contain group-hover:scale-105 transition-all duration-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
            />
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

        {/* Zone 3: Sélecteur de langue & Accès Profil sur Ordinateur */}
        <div className="flex items-center gap-2.5 shrink-0">
          
          {/* Bouton Profil dédié sur Ordinateur (Desktop) */}
          <button
            type="button"
            onClick={() => setCurrentPage('profile')}
            className={`hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer ${
              currentPage === 'profile'
                ? 'bg-white text-black border-white font-agrandir-extrabold shadow-md'
                : 'bg-white/5 border-white/15 text-neutral-200 hover:text-white hover:bg-white/10 hover:border-white/30'
            }`}
            title={t('profile.title')}
          >
            <UserIcon className="w-3.5 h-3.5 text-[#d4af37]" />
            <span className="text-xs font-agrandir-semibold tracking-wide">
              {currentUser?.name || t('nav.profile')}
            </span>
            {isSuperAdmin && (
              <span className="text-[9px] font-agrandir-extrabold text-[#d4af37] px-1.5 py-0.2 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 uppercase tracking-widest">
                Admin
              </span>
            )}
          </button>

          {/* Sélecteur de langue fonctionnel (Français / Anglais) */}
          <div className="flex items-center p-1 rounded-full bg-black/60 border border-white/15 backdrop-blur-md shadow-inner text-[11px] font-agrandir-bold tracking-wider">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                language === 'fr'
                  ? 'bg-white text-black font-agrandir-extrabold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
              title="Passer en Français"
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                language === 'en'
                  ? 'bg-white text-black font-agrandir-extrabold shadow-sm'
                  : 'text-[#888] hover:text-white'
              }`}
              title="Switch to English"
            >
              EN
            </button>
          </div>
        </div>

      </div>
    </header>
  );
};
