import React, { useEffect, useState } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Compass,
  CreditCard,
  Home,
  Ticket,
  User,
  X,
  Award,
  Zap,
  Camera,
  Lightbulb,
  Film,
  ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Barre de navigation flottante mobile style Instagram (App installée / standalone).
 * Barre minimaliste avec icônes épurées et une unique pilule animée derrière l'élément actif seulement.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language, t } = useApp();
  const [clubOpen, setClubOpen] = useState(false);
  const { isStandalone } = usePWAInstall();

  // Lock the page behind the Club sheet while preserving scrolling inside the sheet.
  useEffect(() => {
    if (!clubOpen) return;
    const body = document.body;
    const html = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    return () => {
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
    };
  }, [clubOpen]);
  // Sur navigateur mobile web, le tiroir en haut à gauche gère la navigation.
  if (!isStandalone) return null;
  if (currentPage === 'splash' || currentPage === 'gate_scanner' || currentPage === 'admin') {
    return null;
  }

  const isEn = language === 'en';
  const clubPages = [
    'rewards',
    'flash_drops',
    'backstage',
    'memories',
    'suggestions',
  ];
  const isClubActive = clubOpen || clubPages.includes(currentPage);

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
      isActive: !clubOpen && (currentPage === 'home' || currentPage === 'discover'),
      fillWhenActive: true,
      icon: Home,
      onClick: () => {
        setClubOpen(false); setCurrentPage('home');
      },
    },
    {
      id: 'tickets',
      page: 'client_space',
      label: isEn ? 'Tickets' : 'Billets',
      ariaLabel: isEn ? 'My Tickets' : 'Mes billets',
      isActive: currentPage === 'client_space',
      icon: Ticket,
      onClick: () => {
        setClubOpen(false); setCurrentPage('client_space');
      },
    },
    {
      id: 'club',
      label: isEn ? 'Club' : 'Club',
      ariaLabel: isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL',
      isActive: isClubActive,
      icon: Compass,
      onClick: () => {
        setClubOpen((open) => !open);
      },
    },
    {
      id: 'card',
      page: 'member_card',
      label: isEn ? 'Card' : 'Carte',
      ariaLabel: 'LUMARÉEL Black Card',
      isActive: (currentPage === 'member_card' || currentPage === 'card'),
      icon: CreditCard,
      onClick: () => {
        setClubOpen(false); setCurrentPage('member_card');
      },
    },
    {
      id: 'profile',
      page: 'profile',
      label: isEn ? 'Account' : 'Compte',
      ariaLabel: isEn ? 'My Account' : 'Mon compte',
      isActive: currentPage === 'profile',
      icon: User,
      onClick: () => {
        setClubOpen(false); setCurrentPage('profile');
      },
    },
  ];



  return (
    <>
      {/* Barre de navigation flottante façon Instagram : icônes épurées + pilule uniquement derrière l'élément actif */}
      {clubOpen && (
        <div className="fixed inset-0 z-[40] flex items-end justify-center overscroll-none md:items-center" role="dialog" aria-modal="true" aria-label="LUMARÉEL Club">
          <button type="button" className="absolute inset-0 bg-black/55 dark:bg-black/75 backdrop-blur-md" onClick={() => setClubOpen(false)} aria-label="Fermer le Club" />
          <motion.section initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 36, opacity: 0 }} className="relative z-[45] mb-[calc(5.4rem+env(safe-area-inset-bottom,0px))] max-h-[calc(100svh-7.5rem-env(safe-area-inset-bottom,0px))] w-[calc(100%-1.25rem)] max-w-[520px] overflow-y-auto overscroll-contain rounded-[24px] border border-black/[0.08] dark:border-white/15 bg-white dark:bg-[#101010] px-4 pb-3 pt-4 shadow-2xl md:mb-0">
            <div className="mb-2 flex items-center justify-between border-b border-black/[0.08] dark:border-white/10 pb-3">
              <h2 className="text-[12px] font-agrandir-extrabold uppercase tracking-[0.14em] text-[#111111] dark:text-white">LUMARÉEL CLUB</h2>
              <button type="button" onClick={() => setClubOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06] dark:bg-[#242424] text-[#111111] dark:text-white" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            {[
              { title: isEn ? "Gift Points & Referrals" : "Gift Points & Parrainage", subtitle: isEn ? "Rewards · 500 FCFA per friend" : "Récompenses · 500 F par ami invité", icon: Award, page: "rewards" as PageView },
              { title: "BACKSTAGE", subtitle: isEn ? "Artists · behind the scenes · Studio Sessions" : "Artistes · coulisses · Sessions Studio", icon: Film, page: "backstage" as PageView },
              { title: isEn ? "Memories" : "Souvenirs", subtitle: isEn ? "Events · photos · recaps" : "Événements · photos · récaps", icon: Camera, page: "memories" as PageView },
              { title: isEn ? "Your Voice" : "Ta Voix", subtitle: isEn ? "Artists · venues · event ideas" : "Propose tes artistes, lieux & idées", icon: Lightbulb, page: "suggestions" as PageView },
            ].map((item) => {
              const Icon = item.icon;
              return <button key={item.title} type="button" onClick={() => { setClubOpen(false); setCurrentPage(item.page); }} className="flex min-h-[68px] w-full items-center gap-3 border-b border-black/[0.07] dark:border-white/[0.07] py-2.5 text-left last:border-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.05] dark:bg-[#202020]"><Icon className="h-[19px] w-[19px] text-[#111111] dark:text-neutral-200" strokeWidth={1.8} /></span>
                <span className="min-w-0 flex-1"><span className="block break-words text-[12px] font-agrandir-extrabold leading-tight text-[#111111] dark:text-white">{item.title}</span><span className="mt-1 block text-[10px] leading-tight text-[#6E6E73] dark:text-neutral-400">{item.subtitle}</span></span>
                <ChevronRight className="h-[17px] w-[17px] shrink-0 text-[#86868B] dark:text-neutral-500" />
              </button>;
            })}
          </motion.section>
        </div>
      )}
      <motion.nav
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        aria-label={t('nav.mainNav')}
        className="fixed left-3 right-3 z-50 md:hidden select-none pointer-events-none"
        style={{
          bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div
          className="pointer-events-auto mx-auto max-w-[396px] rounded-full border border-black/[0.10] dark:border-white/14 bg-white/92 dark:bg-[#121212]/90 backdrop-blur-2xl px-2 py-2 shadow-[0_12px_36px_rgba(0,0,0,0.14)] dark:shadow-[0_14px_42px_rgba(0,0,0,0.88)]"
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
                  className="relative flex h-[50px] w-full items-center justify-center rounded-full outline-none cursor-pointer"
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
                      className="absolute inset-0.5 rounded-full bg-black/[0.08] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.16] dark:ring-white/15"
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
                      className={`h-[24px] w-[24px] shrink-0 transition-colors duration-200 ${
                        item.isActive
                          ? 'text-[#111111] dark:text-white stroke-[2.2]'
                          : 'text-[#86868B] dark:text-neutral-400 stroke-[1.75]'
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
