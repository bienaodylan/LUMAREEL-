import React, { useState, useEffect, useRef } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWAInstallButton } from './PWAInstallButton';
import { AnimatePresence, motion } from 'framer-motion';
import { lockBodyScroll } from '../utils/scrollLock';
import {
  ArrowLeft,
  Camera,
  Check,
  ChevronRight,
  Clapperboard,
  CreditCard,
  Gift,
  Globe,
  Heart,
  Home,
  Menu,
  Mic2,
  Moon,
  Shield,
  Sun,
  Ticket,
  User,
  X,
} from 'lucide-react';

/**
 * Navbar.tsx — En-tête mobile épuré LUMARÉEL.
 * - À droite : icône compacte de langue (menu FR/EN) + icône Favoris (liste des concerts enregistrés).
 * - Sur le web mobile (!isStandalone) : tiroir latéral avec Mode Clair/Sombre et Langue en bas.
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
    theme,
    setTheme,
    events,
    favoriteEventIds,
    toggleFavoriteEvent,
    setSelectedEventSlug,
    setCheckoutEvent,
    t,
  } = useApp();
  const { isStandalone } = usePWAInstall();

  const [scrolled, setScrolled] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
    setLangMenuOpen(false);
    setFavoritesOpen(false);
  }, [currentPage]);

  useEffect(() => {
    if (!langMenuOpen) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [langMenuOpen]);

  useEffect(() => {
    if (!drawerOpen && !favoritesOpen) return;
    return lockBodyScroll();
  }, [drawerOpen, favoritesOpen]);

  const isEn = language === 'en';
  const isHome = currentPage === 'home' || currentPage === 'discover';
  if (currentPage === 'backstage' || currentPage === 'event_detail') return null;

  const isRootAppTab =
    isHome ||
    currentPage === 'client_space' ||
    currentPage === 'member_card' ||
    currentPage === 'card' ||
    currentPage === 'profile';

  if (isStandalone && !isHome && isRootAppTab) {
    return null;
  }

  const pageTitleMap: Partial<Record<PageView, string>> = {
    client_space: isEn ? 'My tickets' : 'Mes billets',
    event_detail: isEn ? 'Event details' : 'Détails du concert',
    member_card: 'LUMARÉEL Black Card',
    card: 'LUMARÉEL Black Card',
    profile: t('nav.account'),
    rewards: isEn ? 'Gift Points & Referrals' : 'Gift Points & Parrainage',
    flash_drops: isEn ? 'Gift Points & Referrals' : 'Gift Points & Parrainage',
    backstage: 'Backstage',
    memories: isEn ? 'Memories' : 'Souvenirs',
    suggestions: isEn ? 'Your Voice' : 'Ta Voix',
    organizers: isEn ? 'Organizers' : 'Organisateurs',
    card_verify: isEn ? 'Card Verification' : 'Vérification Carte',
  };

  const primaryNavItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: t('nav.home'), page: 'home', icon: Home },
    { label: isEn ? 'My tickets' : 'Mes billets', page: 'client_space', icon: Ticket },
    { label: 'LUMARÉEL Black Card', page: 'member_card', icon: CreditCard },
    { label: t('nav.account'), page: 'profile', icon: User },
  ];

  const clubDrawerItems: Array<{
    label: string;
    page: PageView;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: isEn ? 'Gift Points & Referrals' : 'Gift Points & Parrainage', page: 'rewards', icon: Gift },
    { label: 'Backstage', page: 'backstage', icon: Clapperboard },
    { label: isEn ? 'Memories' : 'Souvenirs', page: 'memories', icon: Camera },
    { label: isEn ? 'Your Voice' : 'Ta Voix', page: 'suggestions', icon: Mic2 },
  ];

  const isSuperAdmin =
    currentUser?.email?.toLowerCase() === 'bienaodylan428@gmail.com' ||
    currentUser?.role === 'super_admin';

  const navigateFromDrawer = (page: PageView) => {
    setDrawerOpen(false);
    setCurrentPage(page);
  };

  const favoriteEvents = events.filter((ev) => favoriteEventIds.includes(ev.id));
  const suggestedEvents = events.filter((ev) => ev.status !== 'draft').slice(0, 3);
  const currentTitle = pageTitleMap[currentPage];

  const formatShortEventDate = (date: string) => {
    const parsed = new Date(`${String(date || '').slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-40 md:hidden transition-all duration-200 px-4 sm:px-7 py-2 ${
          scrolled || !isHome
            ? 'bg-[#FBFBFD]/92 dark:bg-[#080808]/92 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/10'
            : 'bg-[#FBFBFD]/88 dark:bg-black/82 backdrop-blur-md'
        }`}
        style={{ paddingTop: 'max(0.55rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 min-h-[42px]">
          {/* ZONE GAUCHE */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-[78px]">
            {!isStandalone && (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label={isEn ? 'Open menu' : 'Ouvrir le menu'}
                className="w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/15 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/20 text-[#111111] dark:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <Menu className="w-[18px] h-[18px]" />
              </button>
            )}

            {canGoBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label={isEn ? 'Back' : 'Retour'}
                className="min-w-[38px] h-9 px-2.5 rounded-full border border-black/[0.08] dark:border-white/15 bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/10 dark:hover:bg-white/20 text-[#111111] dark:text-white flex items-center justify-center gap-1 text-xs font-agrandir-bold transition-colors cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                {isStandalone && <span>{isEn ? 'Back' : 'Retour'}</span>}
              </button>
            )}

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
                  className="h-7 w-auto object-contain invert dark:invert-0"
                />
              </button>
            )}
          </div>

          {/* ZONE CENTRALE : Logo sur l'accueil web mobile OU Titre de page */}
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
                  className="h-7 w-auto object-contain invert dark:invert-0"
                />
              </button>
            ) : currentTitle ? (
              <span className="text-xs sm:text-sm font-agrandir-extrabold tracking-tight truncate text-[#111111] dark:text-white">
                {currentTitle}
              </span>
            ) : null}
          </div>

          {/* ZONE DROITE : Petite icône Langue + Icône Favoris */}
          <div className="flex items-center justify-end gap-1.5 shrink-0 min-w-[78px]">
            {/* Sélecteur de langue compact (icône) */}
            <div ref={langMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setLangMenuOpen((open) => !open)}
                aria-label={isEn ? 'Select language' : 'Choisir la langue'}
                aria-expanded={langMenuOpen}
                className="relative w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/14 bg-black/[0.035] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.16] text-[#111111] dark:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                <Globe className="w-[17px] h-[17px]" strokeWidth={1.85} />
              </button>

              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 mt-2 w-36 rounded-2xl border border-black/[0.09] dark:border-white/14 bg-white dark:bg-[#121212] p-1.5 shadow-xl z-50"
                  >
                    {[
                      { code: 'fr' as const, label: 'Français' },
                      { code: 'en' as const, label: 'English' },
                    ].map((opt) => {
                      const active = language === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => {
                            setLanguage(opt.code);
                            setLangMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#111111] text-white dark:bg-white dark:text-black'
                              : 'text-[#2C2C2E] hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/10'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Icône Favoris */}
            <button
              type="button"
              onClick={() => {
                setLangMenuOpen(false);
                setFavoritesOpen(true);
              }}
              aria-label={isEn ? 'Favorites' : 'Favoris'}
              className="relative w-9 h-9 rounded-full border border-black/[0.08] dark:border-white/14 bg-black/[0.035] hover:bg-black/[0.08] dark:bg-white/[0.08] dark:hover:bg-white/[0.16] text-[#111111] dark:text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95"
            >
              <Heart
                className="w-[17px] h-[17px]"
                strokeWidth={1.85}
                fill={favoriteEvents.length > 0 ? 'currentColor' : 'none'}
              />
              {favoriteEvents.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-[9px] font-agrandir-extrabold flex items-center justify-center tabular-nums">
                  {favoriteEvents.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* PANNEAU FAVORIS */}
      <AnimatePresence>
        {favoritesOpen && (
          <div
            className="fixed inset-0 z-[75] md:hidden flex items-end justify-center"
            role="dialog"
            aria-modal="true"
            aria-label={isEn ? 'Favorites' : 'Favoris'}
          >
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFavoritesOpen(false)}
              aria-label={isEn ? 'Close favorites' : 'Fermer les favoris'}
              className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-sm"
            />

            <motion.section
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative z-10 w-full max-h-[82dvh] rounded-t-[26px] border-t border-black/[0.08] dark:border-white/14 bg-[#FBFBFD] dark:bg-[#0D0D0D] text-[#111111] dark:text-white flex flex-col shadow-2xl overflow-hidden"
              style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="pt-2.5 pb-1 flex justify-center">
                <span className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20" />
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.08] dark:border-white/10">
                <div>
                  <h2 className="font-agrandir-extrabold text-base tracking-tight">
                    {isEn ? 'Favorites' : 'Tes favoris'}
                  </h2>
                  <p className="text-[12px] text-[#6E6E73] dark:text-neutral-400">
                    {favoriteEvents.length > 0
                      ? isEn
                        ? `${favoriteEvents.length} saved concert${favoriteEvents.length > 1 ? 's' : ''}`
                        : `${favoriteEvents.length} concert${favoriteEvents.length > 1 ? 's' : ''} enregistré${favoriteEvents.length > 1 ? 's' : ''}`
                      : isEn
                        ? 'Keep the concerts you love close by'
                        : 'Garde tes concerts préférés sous la main'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFavoritesOpen(false)}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                  className="w-9 h-9 rounded-full bg-black/[0.06] dark:bg-white/10 flex items-center justify-center text-[#111111] dark:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-y-auto px-5 py-4 space-y-3">
                {favoriteEvents.length > 0 ? (
                  favoriteEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center gap-3 p-2.5 rounded-2xl border border-black/[0.07] dark:border-white/10 bg-white dark:bg-[#141414]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setFavoritesOpen(false);
                          setSelectedEventSlug(ev.slug || ev.id);
                          setCurrentPage('event_detail');
                        }}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-black/[0.06] dark:bg-white/10 shrink-0 cursor-pointer"
                      >
                        <img
                          src={ev.officialPoster || ev.bannerImage}
                          alt={ev.title || ev.artist}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => {
                            setFavoritesOpen(false);
                            setSelectedEventSlug(ev.slug || ev.id);
                            setCurrentPage('event_detail');
                          }}
                          className="block w-full text-left cursor-pointer"
                        >
                          <p className="font-agrandir-extrabold text-sm uppercase truncate text-[#111111] dark:text-white">
                            {ev.artist}
                          </p>
                          <p className="text-[11px] text-[#6E6E73] dark:text-neutral-400 truncate mt-0.5">
                            {formatShortEventDate(ev.date)} · {ev.venue}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFavoritesOpen(false);
                            setCheckoutEvent(ev);
                          }}
                          className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#111111] text-white dark:bg-white dark:text-black px-3 py-1 text-[10px] font-agrandir-extrabold uppercase tracking-[0.06em] cursor-pointer"
                        >
                          {isEn ? 'Buy tickets' : 'Acheter'}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleFavoriteEvent(ev.id)}
                        aria-label={isEn ? 'Remove from favorites' : 'Retirer des favoris'}
                        className="w-9 h-9 rounded-full bg-black/[0.05] dark:bg-white/10 flex items-center justify-center text-[#111111] dark:text-white shrink-0 cursor-pointer"
                      >
                        <Heart className="w-4 h-4 fill-current" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="space-y-4 py-2">
                    <p className="text-[13px] leading-relaxed text-[#6E6E73] dark:text-neutral-400">
                      {isEn
                        ? 'Tap the heart on any concert to save it here.'
                        : 'Appuie sur le cœur d’un concert pour le retrouver ici en un clin d’œil.'}
                    </p>

                    {suggestedEvents.length > 0 && (
                      <div className="space-y-2.5 pt-2 border-t border-black/[0.07] dark:border-white/10">
                        <p className="text-[11px] font-agrandir-bold uppercase tracking-[0.12em] text-[#86868B]">
                          {isEn ? 'Coming up soon' : 'À découvrir'}
                        </p>
                        {suggestedEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between gap-3 py-1.5"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={ev.officialPoster || ev.bannerImage}
                                alt={ev.artist}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-xl object-cover shrink-0 bg-black/5 dark:bg-white/10"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-agrandir-extrabold uppercase truncate">
                                  {ev.artist}
                                </p>
                                <p className="text-[11px] text-[#6E6E73] dark:text-neutral-400 truncate">
                                  {formatShortEventDate(ev.date)} · {ev.city}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleFavoriteEvent(ev.id)}
                              aria-label={isEn ? 'Add to favorites' : 'Ajouter aux favoris'}
                              className="w-9 h-9 rounded-full border border-black/[0.1] dark:border-white/15 flex items-center justify-center text-[#111111] dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/10 shrink-0 cursor-pointer"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      {/* Tiroir de navigation latéral GAUCHE (Web mobile) */}
      <AnimatePresence>
        {drawerOpen && !isStandalone && (
          <div className="fixed inset-0 z-[70] md:hidden flex justify-start">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-sm"
            />

            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              aria-label={isEn ? 'Navigation drawer' : 'Menu de navigation'}
              className="relative z-10 w-[84%] max-w-[320px] h-full bg-[#FBFBFD] dark:bg-[#090909] text-[#111111] dark:text-white border-r border-black/[0.08] dark:border-white/12 flex flex-col justify-between p-5 shadow-2xl overflow-y-auto"
              style={{
                paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))',
                paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="space-y-6">
                {/* En-tête tiroir */}
                <div className="flex items-center justify-between pb-4 border-b border-black/[0.08] dark:border-white/10">
                  <img
                    src="/assets/logo-lumareel.png"
                    alt="LUMARÉEL CO."
                    className="h-7 w-auto object-contain invert dark:invert-0"
                  />
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label={t('nav.close')}
                    className="w-10 h-10 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/8 dark:hover:bg-white/15 border border-black/[0.08] dark:border-white/10 flex items-center justify-center text-[#48484A] dark:text-neutral-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Principal */}
                <nav className="space-y-1">
                  <div className="px-3 pb-1 text-[10px] font-agrandir-bold tracking-[0.18em] text-[#86868B] uppercase">
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
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                            : 'text-[#2C2C2E] hover:bg-black/[0.05] dark:text-neutral-200 dark:hover:bg-white/8 font-agrandir-semibold'
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
                <nav className="space-y-1 pt-3 border-t border-black/[0.08] dark:border-white/10">
                  <div className="px-3 pb-1 text-[10px] font-agrandir-bold tracking-[0.18em] text-[#86868B] uppercase">
                    {isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL'}
                  </div>
                  {clubDrawerItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      currentPage === item.page ||
                      (item.page === 'rewards' && currentPage === 'flash_drops');
                    return (
                      <button
                        key={item.page}
                        type="button"
                        onClick={() => navigateFromDrawer(item.page)}
                        className={`w-full min-h-[44px] px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                            : 'text-[#2C2C2E] hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/8 font-agrandir-semibold'
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

                {isSuperAdmin && (
                  <nav className="pt-2 border-t border-black/[0.08] dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => navigateFromDrawer('admin')}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-left text-[#2C2C2E] hover:bg-black/[0.05] dark:text-neutral-300 dark:hover:bg-white/8 font-agrandir-semibold transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-3 text-sm">
                        <Shield className="w-4 h-4 shrink-0" />
                        <span>{t('nav.admin')}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
                    </button>
                  </nav>
                )}
              </div>

              {/* Pied du tiroir : Mode Clair/Sombre + Langue + Installer l'app */}
              <div className="pt-5 mt-5 border-t border-black/[0.08] dark:border-white/10 space-y-3.5">
                {/* Sélecteur Apparence */}
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-xs font-medium text-[#6E6E73] dark:text-neutral-400">
                    {isEn ? 'Theme' : 'Mode'}
                  </span>
                  <div className="flex items-center p-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.08] dark:border-white/10 text-[11px] font-agrandir-semibold">
                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`inline-flex items-center gap-1.5 min-h-[30px] px-2.5 rounded-full transition-colors cursor-pointer ${
                        theme === 'light'
                          ? 'bg-[#111111] text-white'
                          : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Light' : 'Clair'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`inline-flex items-center gap-1.5 min-h-[30px] px-2.5 rounded-full transition-colors cursor-pointer ${
                        theme === 'dark'
                          ? 'bg-white text-black'
                          : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Dark' : 'Sombre'}</span>
                    </button>
                  </div>
                </div>

                {/* Sélecteur Langue */}
                <div className="flex items-center justify-between gap-3 px-1">
                  <span className="text-xs font-medium text-[#6E6E73] dark:text-neutral-400">
                    {isEn ? 'Language' : 'Langue'}
                  </span>
                  <div className="flex items-center p-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.07] border border-black/[0.08] dark:border-white/10 text-[11px] font-agrandir-semibold">
                    <button
                      type="button"
                      onClick={() => setLanguage('fr')}
                      className={`min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                        language === 'fr'
                          ? 'bg-[#111111] text-white dark:bg-white dark:text-black'
                          : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      FR
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`min-h-[30px] px-3 rounded-full transition-colors cursor-pointer ${
                        language === 'en'
                          ? 'bg-[#111111] text-white dark:bg-white dark:text-black'
                          : 'text-[#6E6E73] dark:text-neutral-400 hover:text-[#111111] dark:hover:text-white'
                      }`}
                    >
                      EN
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <PWAInstallButton
                    variant="drawer"
                    onAfterAction={() => setDrawerOpen(false)}
                  />
                </div>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
