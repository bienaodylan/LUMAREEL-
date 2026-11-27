import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Camera,
  ChevronRight,
  Clapperboard,
  Compass,
  CreditCard,
  Film,
  Gift,
  Home,
  Mic2,
  Ticket,
  User,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Barre de navigation flottante mobile style Instagram (App installée / standalone).
 * Barre minimaliste avec icônes épurées et une unique pilule animée derrière l'élément actif seulement.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language, t } = useApp();
  const { isStandalone } = usePWAInstall();
  const [clubSheetOpen, setClubSheetOpen] = useState(false);

  useEffect(() => {
    setClubSheetOpen(false);
  }, [currentPage]);

  // Sur navigateur mobile web, le tiroir en haut à gauche gère la navigation.
  if (!isStandalone) return null;
  if (currentPage === 'splash' || currentPage === 'gate_scanner' || currentPage === 'admin') {
    return null;
  }

  const isEn = language === 'en';
  const clubPages: PageView[] = [
    'rewards',
    'flash_drops',
    'backstage',
    'memories',
    'suggestions',
    'archive',
  ];
  const isClubActive = clubSheetOpen || clubPages.includes(currentPage);

  const navItems: Array<{
    id: string;
    page?: PageView;
    label: string;
    ariaLabel: string;
    isActive: boolean;
    fillWhenActive?: boolean;
    icon: React.ComponentType<{ className?: string; fill?: string }>;
    onClick: () => void;
  }> = [
    {
      id: 'home',
      page: 'home',
      label: isEn ? 'Home' : 'Accueil',
      ariaLabel: isEn ? 'Home' : 'Accueil',
      isActive: !clubSheetOpen && (currentPage === 'home' || currentPage === 'discover'),
      fillWhenActive: true,
      icon: Home,
      onClick: () => {
        setClubSheetOpen(false);
        setCurrentPage('home');
      },
    },
    {
      id: 'tickets',
      page: 'client_space',
      label: isEn ? 'Tickets' : 'Billets',
      ariaLabel: isEn ? 'My Tickets' : 'Mes billets',
      isActive: !clubSheetOpen && currentPage === 'client_space',
      icon: Ticket,
      onClick: () => {
        setClubSheetOpen(false);
        setCurrentPage('client_space');
      },
    },
    {
      id: 'club',
      label: isEn ? 'Club' : 'Club',
      ariaLabel: isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL',
      isActive: isClubActive,
      icon: Compass,
      onClick: () => setClubSheetOpen((prev) => !prev),
    },
    {
      id: 'card',
      page: 'member_card',
      label: isEn ? 'Card' : 'Carte',
      ariaLabel: 'LUMARÉEL Black Card',
      isActive: !clubSheetOpen && (currentPage === 'member_card' || currentPage === 'card'),
      icon: CreditCard,
      onClick: () => {
        setClubSheetOpen(false);
        setCurrentPage('member_card');
      },
    },
    {
      id: 'profile',
      page: 'profile',
      label: isEn ? 'Account' : 'Compte',
      ariaLabel: isEn ? 'My Account' : 'Mon compte',
      isActive: !clubSheetOpen && currentPage === 'profile',
      icon: User,
      onClick: () => {
        setClubSheetOpen(false);
        setCurrentPage('profile');
      },
    },
  ];

  const clubDestinations: Array<{
    page: PageView;
    label: string;
    sub: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      page: 'rewards',
      label: isEn ? 'Gifts, Points & Referrals' : 'Gifts, Points & Parrainage',
      sub: isEn ? 'Surprises, flash sales, points & 500 FCFA/friend' : 'Surprises, ventes flash, points & 500 F CFA/ami',
      icon: Gift,
    },
    {
      page: 'backstage',
      label: 'Backstage',
      sub: isEn ? 'Soundchecks & exclusive studio drops' : 'Balances, studio & contenus exclusifs',
      icon: Clapperboard,
    },
    {
      page: 'memories',
      label: isEn ? 'My Moments' : 'Mes Moments',
      sub: isEn ? 'Official photos, recaps & shared memories' : 'Photos officielles, récaps & partages',
      icon: Camera,
    },
    {
      page: 'suggestions',
      label: isEn ? 'Your Voice' : 'Ta Voix',
      sub: isEn ? 'Request artists, venues & event ideas' : 'Proposez des artistes, lieux & idées',
      icon: Mic2,
    },
    {
      page: 'archive',
      label: 'Archives',
      sub: isEn ? 'Past LUMARÉEL stage productions' : 'Productions scéniques passées',
      icon: Film,
    },
  ];

  return (
    <>
      {/* Feuille flottante Club LUMARÉEL au-dessus de la barre */}
      <AnimatePresence>
        {clubSheetOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setClubSheetOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="fixed left-3 right-3 max-w-md mx-auto z-50 rounded-[28px] bg-[#101010]/96 backdrop-blur-2xl border border-white/15 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.9)] max-h-[70vh] overflow-y-auto"
              style={{
                bottom: 'calc(5.2rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/10">
                <span className="text-xs font-agrandir-extrabold uppercase tracking-[0.18em] text-[#D4AF37]">
                  {isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL'}
                </span>
                <button
                  type="button"
                  onClick={() => setClubSheetOpen(false)}
                  aria-label={t('nav.close')}
                  className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {clubDestinations.map((dest) => {
                  const Icon = dest.icon;
                  const active =
                    currentPage === dest.page ||
                    (dest.page === 'rewards' && currentPage === 'flash_drops');
                  return (
                    <button
                      key={dest.page}
                      type="button"
                      onClick={() => {
                        setClubSheetOpen(false);
                        setCurrentPage(dest.page);
                      }}
                      className={`w-full min-h-[52px] px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-white text-black'
                          : 'hover:bg-white/8 text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            active ? 'bg-black/10 text-black' : 'bg-white/8 text-[#D4AF37]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-agrandir-extrabold truncate">{dest.label}</div>
                          <div
                            className={`text-[11px] truncate ${
                              active ? 'text-neutral-700' : 'text-neutral-400'
                            }`}
                          >
                            {dest.sub}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Barre de navigation flottante façon Instagram : icônes épurées + pilule uniquement derrière l'élément actif */}
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        aria-label={t('nav.mainNav')}
        className="fixed left-4 right-4 z-50 md:hidden select-none pointer-events-none"
        style={{
          bottom: 'max(0.85rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="pointer-events-auto mx-auto max-w-[360px] rounded-full border border-white/14 bg-[#121212]/88 backdrop-blur-2xl px-1.5 py-1.5 shadow-[0_14px_40px_rgba(0,0,0,0.88)]"
          style={{ WebkitBackdropFilter: 'blur(28px)' }}
        >
          <div className="grid grid-cols-5 items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  whileTap={{ scale: 0.9 }}
                  aria-label={item.ariaLabel}
                  aria-current={item.isActive ? 'page' : undefined}
                  className="relative flex h-[44px] w-full items-center justify-center rounded-full outline-none cursor-pointer"
                >
                  {item.isActive && (
                    <motion.div
                      layoutId="lumareelInstagramActivePill"
                      transition={{
                        type: 'spring',
                        stiffness: 450,
                        damping: 33,
                        mass: 0.72,
                      }}
                      className="absolute inset-0.5 rounded-full bg-white/[0.16] ring-1 ring-inset ring-white/15"
                    />
                  )}
                  <motion.div
                    animate={{
                      scale: item.isActive ? 1.06 : 1,
                    }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    <Icon
                      aria-hidden="true"
                      fill={item.isActive && item.fillWhenActive ? 'currentColor' : 'none'}
                      className={`h-[22px] w-[22px] shrink-0 transition-colors duration-200 ${
                        item.isActive
                          ? 'text-white stroke-[2.2]'
                          : 'text-neutral-400 stroke-[1.75]'
                      }`}
                    />
                  </motion.div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </>
  );
};
