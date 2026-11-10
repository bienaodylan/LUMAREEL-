import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Film, User, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

/** Navigation mobile flottante LUMARÉEL — cinq destinations, icônes seules. */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage } = useApp();

  if (currentPage === 'splash' || currentPage === 'gate_scanner') return null;

  const navItems: Array<{ page: PageView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { page: 'home', label: 'Accueil', icon: Home },
    { page: 'client_space', label: 'Mes commandes', icon: Ticket },
    { page: 'archive', label: 'Archives', icon: Film },
    { page: 'member_card', label: 'Ma carte', icon: CreditCard },
    { page: 'profile', label: 'Mon compte', icon: User },
  ];

  return (
    <motion.div
      initial={{ y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
      className="fixed z-40 md:hidden pointer-events-none select-none"
      style={{
        left: '12px',
        right: '12px',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)',
      }}
    >
      <nav
        aria-label="Navigation principale"
        className="pointer-events-auto mx-auto grid grid-cols-5 items-center rounded-[24px] border border-white/[0.09] bg-[#101010]/85 px-1.5 shadow-[0_12px_34px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl"
        style={{ height: '66px', WebkitBackdropFilter: 'blur(18px)' }}
      >
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.page}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              whileTap={{ scale: 0.94 }}
              aria-label={item.label}
              title={item.label}
              className="relative flex h-full min-w-0 items-center justify-center overflow-visible rounded-xl outline-none"
            >
              {isActive && (
                <motion.span
                  layoutId="activeFloatingNavbarPill"
                  className="absolute left-1/2 top-1/2 h-[44px] w-[60px] -translate-x-1/2 -translate-y-1/2 rounded-[15px] border border-[#d4af37]/20 bg-[#29251b]/90 shadow-[inset_0_1px_0_rgba(212,175,55,0.08)]"
                  transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                />
              )}
              <Icon
                aria-hidden="true"
                className={`relative z-10 h-[21px] w-[21px] transition-colors duration-200 ${
                  isActive ? 'text-[#D4AF37] stroke-[2.15]' : 'text-neutral-400 stroke-[1.75]'
                }`}
              />
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
};
