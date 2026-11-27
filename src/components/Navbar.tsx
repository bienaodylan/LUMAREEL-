import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Clapperboard,
  CreditCard,
  Film,
  Gift,
  Home,
  Menu,
  Mic2,
  Shield,
  Ticket,
  User,
  X,
} from 'lucide-react';

/**
 * Navbar.tsx — En-tête mobile LUMARÉEL CO.
 * - Sur navigateur web mobile (!isStandalone) : affiché sur toutes les pages avec
 *   le tiroir menu en haut à gauche + un bouton Retour effectif dès qu'on quitte l'accueil.
 * - En mode application mobile installée (isStandalone) : en-tête épuré sur l'accueil
 *   et bouton Retour effectif en haut à gauche sur les pages secondaires.
 */
export const Navbar: React.FC = () => {
  const {
    currentPage,
    canGoBack,
    setCurrentPage,
    goBack,
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
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fermer le tiroir automatiquement à chaque navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [currentPage]);

  // Verrouiller le scroll arrière-plan quand le tiroir est ouvert
  useEffect(() => {
    if (!drawerOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [drawerOpen]);

  const isEn = language === 'en';
  const isHome = currentPage === 'home' || currentPage === 'discover';
  const isRootAppTab =
    isHome ||
    currentPage === 'client_space' ||
    currentPage === 'member_card' ||
    currentPage === 'card' ||
    currentPage === 'profile';

  // En mode app installée, on ne garde l'en-tête que sur l'accueil ou les sous-pages avec retour
  if (isStandalone && !isHome && isRootAppTab) {
    return null;
  }

  const pageTitleMap: Partial<Record<PageView, string>> = {
    client_space: t('nav.orders'),
    archive: t('nav.archives'),
    member_card: 'LUMARÉEL Black Card',
    card: 'LUMARÉEL Black Card',
    profile: t('nav.account'),
    rewards: isEn ? 'Gifts, Points & Referrals' : 'Gifts, Points & Parrainage',
    flash_drops: isEn ? 'Gifts, Points & Referrals' : 'Gifts, Points & Parrainage',
    backstage: 'Backstage',
    memories: isEn ? 'My Moments' : 'Mes Moments',
    suggestions: isEn ? 'Your Voice' : 'Ta Voix',
    organizers: isEn ? 'Organizers' : 'Organisateurs',
    card_verify: isEn ? 'Card Verification' : 'Vérification Carte',
  };

  const primaryNavItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string }>;
    isGold?: boolean;
  }> = [
    { label: t('nav.home'), page: 'home', icon: Home },
    { label: t('nav.orders'), page: 'client_space', icon: Ticket },
    { label: 'LUMARÉEL Black Card', page: 'member_card', icon: CreditCard, isGold: true },
    { label: t('nav.account'), page: 'profile', icon: User },
  ];

  const clubNavItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: isEn ? 'Gifts, Points & Referrals' : 'Gifts, Points & Parrainage', page: 'rewards', icon: Gift },
    { label: 'Backstage', page: 'backstage', icon: Clapperboard },
    { label: isEn ? 'My Moments' : 'Mes Moments', page: 'memories', icon: Camera },
    { label: isEn ? 'Your Voice' : 'Ta Voix', page: 'suggestions', icon: Mic2 },
    { label: t('nav.archives'), page: 'archive', icon: Film },
  ];

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  const navigateFromDrawer = (page: PageView) => {
    setDrawerOpen(false);
    setCurrentPage(page);
  };

  const currentTitle = pageTitleMap[currentPage];

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 md:hidden transition-all duration-300 px-3.5 sm:px-6 py-2.5 ${
          scrolled || !isHome
            ? 'bg-[#080808]/92 backdrop-blur-xl border-b border-white/10 shadow-lg'
            : 'bg-gradient-to-b from-black/85 via-black/45 to-transparent'
        }`}
        style={{ paddingTop: 'max(0.65rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-h-[44px]">
          {/* ZONE GAUCHE : Tiroir menu en haut à gauche (web mobile) + Retour effectif */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!isStandalone && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={isEn ? 'Open navigation drawer' : 'Ouvrir le menu'}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer active:scale-95"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {canGoBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label={isEn ? 'Go back' : 'Retour'}
                className="min-w-[40px] h-10 px-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center gap-1 text-white text-xs font-agrandir-bold transition-colors cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                {isStandalone && <span>{isEn ? 'Back' : 'Retour'}</span>}
              </button>
            )}

            {/* Logo à gauche uniquement en mode app sur l'accueil */}
            {isStandalone && isHome && (
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="flex items-center cursor-pointer focus:outline-none"
                aria-label={`${platformSettings.platformName || 'LUMARÉEL'} ${t('nav.home')}`}
              >
                <img
                  src="/assets/logo-lumareel.png"
                  alt={platformSettings.platformName || 'LUMARÉEL CO.'}
                  className="h-7 w-auto object-contain"
                />
              </button>
            )}
          </div>

          {/* ZONE CENTRALE : Logo sur l'accueil web mobile OU Titre de section sur les pages internes */}
          <div className="min-w-0 flex-1 flex justify-center px-1">
            {!isStandalone && isHome ? (
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="flex items-center cursor-pointer focus:outline-none"
                aria-label={`${platformSettings.platformName || 'LUMARÉEL'} ${t('nav.home')}`}
              >
                <img
                  src="/assets/logo-lumareel.png"
                  alt={platformSettings.platformName || 'LUMARÉEL CO.'}
                  className="h-7 w-auto object-contain"
                />
              </button>
            ) : currentTitle ? (
              <span className="text-xs sm:text-sm font-agrandir-extrabold text-white tracking-tight truncate">
                {currentTitle}
              </span>
            ) : null}
          </div>

          {/* ZONE DROITE : Sélecteur FR / EN compact */}
          <div className="flex items-center shrink-0">
            <div className="flex items-center p-0.5 rounded-full bg-black/70 border border-white/15 backdrop-blur-md text-[11px] font-agrandir-bold tracking-wider">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`min-h-[32px] px-2.5 rounded-full transition-colors cursor-pointer ${
                  language === 'fr'
                    ? 'bg-white text-black font-agrandir-extrabold'
                    : 'text-[#888] hover:text-white'
                }`}
                title="Passer en Français"
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`min-h-[32px] px-2.5 rounded-full transition-colors cursor-pointer ${
                  language === 'en'
                    ? 'bg-white text-black font-agrandir-extrabold'
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

      {/* Tiroir de navigation latéral GAUCHE pour navigateur web mobile (Safari / Chrome) */}
      <AnimatePresence>
        {drawerOpen && !isStandalone && (
          <div className="fixed inset-0 z-[70] md:hidden flex justify-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              aria-label={isEn ? 'Navigation drawer' : 'Menu de navigation'}
              className="relative z-10 w-[84%] max-w-[320px] h-full bg-[#090909] border-r border-white/12 flex flex-col justify-between p-5 shadow-2xl overflow-y-auto"
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

                {/* Principal */}
                <nav className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-agrandir-bold tracking-[0.18em] text-neutral-500 uppercase">
                    {isEn ? 'Main' : 'Principal'}
                  </div>
                  {primaryNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      currentPage === item.page ||
                      (item.page === 'home' && currentPage === 'discover') ||
                      (item.page === 'member_card' && currentPage === 'card');
                    return (
                      <button
                        key={item.page}
                        type="button"
                        onClick={() => navigateFromDrawer(item.page)}
                        className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-black font-agrandir-extrabold'
                            : item.isGold
                            ? 'bg-[#D4AF37]/10 text-[#D4AF37] hover:bg-[#D4AF37]/18 font-agrandir-bold'
                            : 'text-neutral-200 hover:bg-white/8 font-agrandir-semibold'
                        }`}
                      >
                        <span className="flex items-center gap-3 text-sm min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                      </button>
                    );
                  })}
                </nav>

                {/* Club LUMARÉEL */}
                <nav className="space-y-1 pt-2 border-t border-white/10">
                  <div className="px-3 pb-1 text-[10px] font-agrandir-bold tracking-[0.18em] text-neutral-500 uppercase">
                    {isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL'}
                  </div>
                  {clubNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      currentPage === item.page ||
                      (item.page === 'rewards' && currentPage === 'flash_drops');
                    return (
                      <button
                        key={item.page}
                        type="button"
                        onClick={() => navigateFromDrawer(item.page)}
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-black font-agrandir-extrabold'
                            : 'text-neutral-300 hover:bg-white/8 font-agrandir-semibold'
                        }`}
                      >
                        <span className="flex items-center gap-3 text-sm min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                      </button>
                    );
                  })}

                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => navigateFromDrawer('admin')}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-2xl flex items-center justify-between gap-3 text-left text-neutral-300 hover:bg-white/8 font-agrandir-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-3 text-sm">
                        <Shield className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span>{t('nav.admin')}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                    </button>
                  )}
                </nav>
              </div>

              {/* Pied du tiroir : Installer l'app */}
              <div className="pt-5 mt-5 border-t border-white/10">
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
