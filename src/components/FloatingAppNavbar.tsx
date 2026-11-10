import React, { useEffect, useState } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Film, User, CreditCard } from 'lucide-react';
import { motion } from 'framer-motion';

/** Navigation mobile flottante LUMARÉEL — cinq destinations, icônes seules. */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage } = useApp();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateScroll = () => setScrolled(window.scrollY > 20);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

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
      className="fixed inset-x-0 z-40 md:hidden pointer-events-none select-none w-full"
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}
    >
      <motion.nav
        aria-label="Navigation principale"
        animate={{
          width: scrolled ? 'min(280px, calc(100% - 32px))' : 'min(340px, calc(100% - 24px))',
          height: scrolled ? 48 : 60,
          backgroundColor: scrolled ? 'rgba(16,16,16,0.94)' : 'rgba(16,16,16,0.84)',
        }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-auto mx-auto grid max-w-[440px] grid-cols-5 items-center justify-between gap-1 rounded-full border border-white/[0.10] px-2 shadow-[0_10px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl"
        style={{ WebkitBackdropFilter: 'blur(18px)' }}
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
              className="relative flex h-[44px] min-w-0 flex-1 items-center justify-center overflow-visible rounded-full outline-none"
            >
              {isActive && (
                <motion.span
                  layoutId="activeFloatingNavbarPill"
                  className="absolute left-1/2 top-1/2 h-[40px] w-[calc(100%-8px)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#d4af37]/20 bg-[#29251b]/90 shadow-[inset_0_1px_0_rgba(212,175,55,0.08)]"
                  animate={{ height: scrolled ? 36 : 40, width: scrolled ? "calc(100% - 8px)" : "calc(100% - 8px)" }}
                  transition={{ type: 'spring', stiffness: 420, damping: 32, mass: 0.7 }}
                />
              )}
              <Icon
                aria-hidden="true"
                className={`relative z-10 transition-all duration-300 ${scrolled ? 'h-[19px] w-[19px]' : 'h-[22px] w-[22px]'} ${
                  isActive ? 'text-[#D4AF37] stroke-[2.35]' : 'text-neutral-300 stroke-[1.8]'
                }`}
              />
            </motion.button>
          );
        })}
      </motion.nav>
    </motion.div>
  );
};
