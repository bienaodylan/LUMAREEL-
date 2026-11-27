import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Compass,
  CreditCard,
  Home,
  Ticket,
  User,
} from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Barre de navigation flottante mobile style Instagram (App installée / standalone).
 * Barre minimaliste avec icônes épurées et une unique pilule animée derrière l'élément actif seulement.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language, t } = useApp();
  const { isStandalone } = usePWAInstall();
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
  const isClubActive = clubPages.includes(currentPage);

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
      isActive: (currentPage === 'home' || currentPage === 'discover'),
      fillWhenActive: true,
      icon: Home,
      onClick: () => {
        setCurrentPage('home');
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
        setCurrentPage('client_space');
      },
    },
    {
      id: 'club',
      label: isEn ? 'Club' : 'Club',
      ariaLabel: isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL',
      isActive: isClubActive,
      icon: Compass,
      onClick: () => {
        setCurrentPage('rewards');
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
        setCurrentPage('member_card');
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
        setCurrentPage('profile');
      },
    },
  ];



  return (
    <>
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
