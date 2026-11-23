import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Home, Ticket, Film, User, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Barre de navigation native iOS/Android (Tab Bar).
 * S'affiche UNIQUEMENT lorsque l'application est lancée en mode application installée
 * (écran d'accueil / PWA standalone / App Store). Sur Safari ou Chrome classique,
 * la navigation passe par le tiroir menu (Navbar).
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language, t } = useApp();
  const { isStandalone } = usePWAInstall();

  // Uniquement en mode app installée (standalone) — jamais dans un navigateur classique
  if (!isStandalone) return null;
  if (currentPage === 'splash' || currentPage === 'gate_scanner' || currentPage === 'admin') {
    return null;
  }

  const isEn = language === 'en';
  const navItems: Array<{
    page: PageView;
    label: string;
    shortLines?: [string, string];
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { page: 'home', label: isEn ? 'Home' : 'Accueil', icon: Home },
    { page: 'client_space', label: isEn ? 'Tickets' : 'Billets', icon: Ticket },
    { page: 'archive', label: 'Archives', icon: Film },
    {
      page: 'member_card',
      label: 'LUMARÉEL Black Card',
      shortLines: ['LUMARÉEL', 'Black Card'],
      icon: CreditCard,
    },
    { page: 'profile', label: isEn ? 'Account' : 'Compte', icon: User },
  ];

  return (
    <motion.nav
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      aria-label={t('nav.mainNav')}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden select-none border-t border-white/12 bg-[#090909]/92 backdrop-blur-2xl"
      style={{
        WebkitBackdropFilter: 'blur(24px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 items-center px-1 pt-1.5 pb-1">
        {navItems.map((item) => {
          const isActive =
            currentPage === item.page ||
            (item.page === 'home' && currentPage === 'discover') ||
            (item.page === 'member_card' && currentPage === 'card');
          const Icon = item.icon;

          return (
            <motion.button
              key={item.page}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              whileTap={{ scale: 0.92 }}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 outline-none cursor-pointer"
            >
              <Icon
                aria-hidden="true"
                className={`h-[20px] w-[20px] shrink-0 transition-colors ${
                  isActive ? 'text-[#D4AF37] stroke-[2.35]' : 'text-neutral-400 stroke-[1.75]'
                }`}
              />
              <span
                className={`text-center leading-[1.08] tracking-tight max-w-full ${
                  item.shortLines ? 'text-[8.5px]' : 'text-[10px] truncate'
                } ${
                  isActive
                    ? 'font-agrandir-bold text-[#D4AF37]'
                    : 'font-agrandir-regular text-neutral-400'
                }`}
              >
                {item.shortLines ? (
                  <>
                    <span className="block">{item.shortLines[0]}</span>
                    <span className="block">{item.shortLines[1]}</span>
                  </>
                ) : (
                  item.label
                )}
              </span>
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
};
