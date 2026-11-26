import React, { useState, useEffect } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Award,
  Camera,
  ChevronRight,
  Clapperboard,
  Compass,
  CreditCard,
  Film,
  Home,
  Lightbulb,
  Newspaper,
  Ticket,
  User,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Barre de navigation flottante mobile (App installée / standalone).
 * Chaque icône dispose de sa propre pilule avec une pilule active animée fluide
 * (ressort Framer Motion layoutId) et un tiroir Explorer flottant pour les rubriques Club.
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
    'backstage',
    'flash_drops',
    'memories',
    'suggestions',
    'archive',
    'news',
  ];
  const isClubActive = clubSheetOpen || clubPages.includes(currentPage);

  const navItems: Array<{
    id: string;
    page?: PageView;
    label: string;
    ariaLabel?: string;
    isActive: boolean;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
  }> = [
    {
      id: 'home',
      page: 'home',
      label: isEn ? 'Home' : 'Accueil',
      isActive: !clubSheetOpen && (currentPage === 'home' || currentPage === 'discover'),
      icon: Home,
      onClick: () => setCurrentPage('home'),
    },
    {
      id: 'tickets',
      page: 'client_space',
      label: isEn ? 'Tickets' : 'Billets',
      isActive: !clubSheetOpen && currentPage === 'client_space',
      icon: Ticket,
      onClick: () => setCurrentPage('client_space'),
    },
    {
      id: 'club',
      label: isEn ? 'Explore' : 'Club',
      ariaLabel: isEn ? 'Explore LUMARÉEL Club' : 'Explorer le Club LUMARÉEL',
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
      onClick: () => setCurrentPage('member_card'),
    },
    {
      id: 'profile',
      page: 'profile',
      label: isEn ? 'Account' : 'Compte',
      isActive: !clubSheetOpen && currentPage === 'profile',
      icon: User,
      onClick: () => setCurrentPage('profile'),
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
      label: isEn ? 'Points & Referrals' : 'Points & Parrainage',
      sub: isEn ? 'Earn points · 500 FCFA per friend' : 'Points fidélité · 500 F CFA par ami',
      icon: Award,
    },
    {
      page: 'backstage',
      label: 'BACKSTAGE',
      sub: isEn ? 'Soundchecks & exclusive studio drops' : 'Balances & contenus exclusifs',
      icon: Clapperboard,
    },
    {
      page: 'flash_drops',
      label: isEn ? 'Flash Sales & Surprises' : 'Ventes Flash & Surprises',
      sub: isEn ? 'Limited drops & daily member perks' : 'Offres éclair & récompenses surprises',
      icon: Zap,
    },
    {
      page: 'memories',
      label: isEn ? 'Concert Memories' : 'Souvenirs de concerts',
      sub: isEn ? 'Official photos, recaps & fan sharing' : 'Photos officielles, récaps & partages',
      icon: Camera,
    },
    {
      page: 'suggestions',
      label: isEn ? 'Suggestion Box' : 'Boîte à suggestions',
      sub: isEn ? 'Request artists, venues & event ideas' : 'Proposez des artistes, lieux & idées',
      icon: Lightbulb,
    },
    {
      page: 'archive',
      label: 'Archives',
      sub: isEn ? 'Past LUMARÉEL stage productions' : 'Productions scéniques passées',
      icon: Film,
    },
    {
      page: 'news',
      label: t('nav.news'),
      sub: isEn ? 'Official releases & announcements' : 'Communiqués et annonces officielles',
      icon: Newspaper,
    },
  ];

  return (
    <>
      {/* Feuille flottante Club & Expériences au-dessus de la barre */}
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
                bottom: 'calc(5.65rem + env(safe-area-inset-bottom, 0px))',
              }}
            >
              <div className="flex items-center justify-between px-2 pb-3 mb-2 border-b border-white/10">
                <span className="text-xs font-agrandir-extrabold uppercase tracking-[0.18em] text-[#D4AF37]">
                  {isEn ? 'LUMARÉEL Club & Experiences' : 'Club & Expériences LUMARÉEL'}
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
                  const active = currentPage === dest.page;
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
                          <div className={`text-[11px] truncate ${active ? 'text-neutral-700' : 'text-neutral-400'}`}>
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

      {/* Barre de navigation flottante avec pilule derrière chaque icône & transition ressort */}
      <motion.nav
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        aria-label={t('nav.mainNav')}
        className="fixed left-3 right-3 z-50 md:hidden select-none pointer-events-none"
        style={{
          bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="pointer-events-auto mx-auto max-w-md rounded-[28px] border border-white/15 bg-[#0e0e0e]/90 backdrop-blur-2xl px-2 py-2 shadow-[0_16px_44px_rgba(0,0,0,0.88)]"
          style={{ WebkitBackdropFilter: 'blur(26px)' }}
        >
          <div className="grid grid-cols-5 items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  whileTap={{ scale: 0.92 }}
                  aria-label={item.ariaLabel || item.label}
                  aria-current={item.isActive ? 'page' : undefined}
                  className="relative flex min-h-[50px] flex-col items-center justify-center gap-1 outline-none cursor-pointer"
                >
                  {/* Pilule dédiée derrière chaque icône + pilule active animée fluide */}
                  <div className="relative flex h-8 w-12 items-center justify-center rounded-full bg-white/[0.06] transition-colors">
                    {item.isActive && (
                      <motion.div
                        layoutId="lumareelFloatingIconPill"
                        transition={{
                          type: 'spring',
                          stiffness: 430,
                          damping: 32,
                          mass: 0.72,
                        }}
                        className="absolute inset-0 rounded-full bg-[#D4AF37] shadow-[0_4px_18px_rgba(212,175,55,0.45)]"
                      />
                    )}
                    <motion.div
                      animate={{
                        scale: item.isActive ? 1.08 : 1,
                        y: item.isActive ? -0.5 : 0,
                      }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="relative z-10 flex items-center justify-center"
                    >
                      <Icon
                        aria-hidden="true"
                        className={`h-[18px] w-[18px] shrink-0 transition-colors duration-200 ${
                          item.isActive
                            ? 'text-black stroke-[2.35]'
                            : 'text-neutral-300 stroke-[1.8]'
                        }`}
                      />
                    </motion.div>
                  </div>

                  <span
                    className={`text-center text-[10px] leading-none tracking-tight max-w-full truncate transition-colors duration-200 ${
                      item.isActive
                        ? 'font-agrandir-extrabold text-[#D4AF37]'
                        : 'font-agrandir-regular text-neutral-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.nav>
    </>
  );
};
