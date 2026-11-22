import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  Ticket,
  Film,
  CreditCard,
  User,
  Shield,
  ChevronRight,
} from 'lucide-react';

/**
 * Navbar.tsx — En-tête mobile LUMARÉEL CO.
 * - Affiché sur la page d'accueil ('home' / 'discover') pour ne jamais masquer les boutons Retour des autres pages.
 * - Sur navigateur mobile (Safari / Chrome), propose un tiroir menu complet + bouton d'installation sur l'écran d'accueil.
 * - En mode application installée (standalone), la barre de navigation native en bas prend le relais et le bouton tiroir est masqué.
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
  const { isStandalone } = usePWAInstall();

  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermer le tiroir au changement de page
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPage]);

  // Affiché uniquement sur la page d'accueil
  if (currentPage !== 'home' && currentPage !== 'discover') {
    return null;
  }

  const isEn = language === 'en';
  const navItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string }>;
    isGold?: boolean;
  }> = [
    { label: t('nav.home'), page: 'home', icon: Home },
    { label: t('nav.orders'), page: 'client_space', icon: Ticket },
    { label: t('nav.archives'), page: 'archive', icon: Film },
    { label: t('nav.blackCard'), page: 'member_card', icon: CreditCard, isGold: true },
    { label: t('nav.account'), page: 'profile', icon: User },
  ];

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  const navigateFromDrawer = (page: PageView) => {
    setDrawerOpen(false);
    setCurrentPage(page);
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 md:hidden transition-all duration-300 px-4 sm:px-8 py-3 sm:py-4 ${
          scrolled
            ? 'bg-black/88 backdrop-blur-xl border-b border-white/10 shadow-lg'
            : 'bg-gradient-to-b from-black/85 via-black/45 to-transparent'
        }`}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Logo Officiel LUMARÉEL CO. */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="flex items-center group cursor-pointer focus:outline-none"
              aria-label={`${platformSettings.platformName || 'LUMARÉEL'} ${t('nav.home')}`}
            >
              <img
                src="/assets/logo-lumareel.png"
                alt={platformSettings.platformName || 'LUMARÉEL CO.'}
                className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-all duration-300 drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)]"
              />
            </button>
          </div>

          {/* Actions droite : Sélecteur FR/EN + Bouton Tiroir Menu (uniquement sur navigateur) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sélecteur de langue (Français / Anglais) */}
            <div className="flex items-center p-1 rounded-full bg-black/65 border border-white/15 backdrop-blur-md shadow-inner text-[11px] font-agrandir-bold tracking-wider">
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

            {/* Tiroir menu navigateur (Safari / Chrome) — remplacé par la barre du bas une fois installé */}
            {!isStandalone && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={isEn ? 'Open navigation menu' : 'Ouvrir le menu'}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tiroir de navigation latéral pour Safari / Chrome mobile */}
      <AnimatePresence>
        {drawerOpen && !isStandalone && (
          <div className="fixed inset-0 z-[60] md:hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              aria-label={isEn ? 'Navigation drawer' : 'Menu de navigation'}
              className="relative z-10 w-[84%] max-w-[320px] h-full bg-[#090909] border-l border-white/12 flex flex-col justify-between p-5 shadow-2xl overflow-y-auto"
              style={{
                paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="space-y-6">
                {/* En-tête tiroir */}
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <img
                    src="/assets/logo-lumareel.png"
                    alt="LUMARÉEL CO."
                    className="h-7 w-auto object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label={t('nav.close')}
                    className="w-10 h-10 rounded-full bg-white/8 hover:bg-white/15 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Destinations principales */}
                <nav className="space-y-1.5">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      currentPage === item.page ||
                      (item.page === 'home' && currentPage === 'discover');
                    return (
                      <button
                        key={item.page}
                        type="button"
                        onClick={() => navigateFromDrawer(item.page)}
                        className={`w-full min-h-[48px] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-black font-agrandir-extrabold'
                            : item.isGold
                            ? 'bg-[#d4af37]/10 text-[#d4af37] hover:bg-[#d4af37]/18 font-agrandir-bold'
                            : 'text-neutral-200 hover:bg-white/8 font-agrandir-semibold'
                        }`}
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{item.label}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                      </button>
                    );
                  })}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => navigateFromDrawer('admin')}
                      className="w-full min-h-[48px] px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-left text-neutral-300 hover:bg-white/8 font-agrandir-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-3 text-sm">
                        <Shield className="w-4 h-4 text-[#d4af37] shrink-0" />
                        <span>{t('nav.admin')}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                    </button>
                  )}
                </nav>
              </div>

              {/* Pied du tiroir : Installer l'app (PWA) */}
              <div className="pt-5 border-t border-white/10 space-y-3">
                <PWAInstallButton
                  variant="drawer"
                  onAfterAction={() => setDrawerOpen(false)}
                />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
