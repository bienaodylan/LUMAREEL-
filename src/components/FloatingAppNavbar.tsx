import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Film, Newspaper, User } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * FloatingAppNavbar.tsx — Barre de navigation inférieure moderne inspirée du design Meta / iOS.
 * Conteneur en forme de pilule, détaché des bords de l'écran (fixed bottom-6),
 * coins très arrondis (rounded-full), translucidité subtile (bg-black/40 backdrop-blur-xl),
 * animations fluides (framer-motion) avec ressort spring layoutId pour l'indicateur actif.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, customerOrders } = useApp();

  // Ne pas afficher sur le splash screen ou pendant le scan vigile plein écran
  if (currentPage === 'splash' || currentPage === 'gate_scanner') {
    return null;
  }

  // Calcul du nombre de billets actifs pour badge discret
  const activeTicketsCount = customerOrders.reduce((total, order) => {
    if (order.paymentStatus === 'completed' && order.tickets) {
      return total + order.tickets.length;
    }
    return total;
  }, 0);

  const navItems: Array<{
    page: PageView;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      page: 'home',
      label: 'Accueil',
      icon: Home,
    },
    {
      page: 'client_space',
      label: 'Mes commandes',
      icon: Ticket,
      badge: activeTicketsCount > 0 ? activeTicketsCount : undefined,
    },
    {
      page: 'archive',
      label: 'Archives',
      icon: Film,
    },
    {
      page: 'news',
      label: 'Actualités',
      icon: Newspaper,
    },
    {
      page: 'profile',
      label: 'Compte & Préférences',
      icon: User,
    },
  ];

  return (
    <motion.div
      initial={{ y: 35, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-6 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 z-40 max-w-sm mx-auto pointer-events-none select-none md:hidden"
    >
      <nav
        aria-label="Navigation principale Meta Style"
        className="pointer-events-auto mx-auto px-4 py-2 sm:py-2.5 rounded-full bg-black/45 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.75)] flex items-center justify-around transition-all duration-300"
      >
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.page}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              whileTap={{ scale: 0.88 }}
              whileHover={{ scale: 1.05 }}
              aria-label={item.label}
              title={item.label}
              className="relative p-2.5 sm:p-3 rounded-full flex items-center justify-center cursor-pointer group"
            >
              {/* Fond translucide actif avec ressort fluide spring layoutId */}
              {isActive && (
                <motion.span
                  layoutId="activeFloatingNavbarPill"
                  className="absolute inset-0 rounded-full bg-white/15 border border-white/20 shadow-[0_0_14px_rgba(255,255,255,0.2)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}

              {/* Conteneur Icône & Badge */}
              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 sm:w-5.5 sm:h-5.5 transition-colors duration-200 ${
                    isActive
                      ? 'text-white stroke-[2.3] drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]'
                      : 'text-neutral-400 group-hover:text-white stroke-[1.7]'
                  }`}
                />

                {/* Badge de notification pour les billets */}
                {item.badge !== undefined && item.badge > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-[#d4af37] text-black text-[9px] font-agrandir-extrabold leading-tight shadow-md"
                  >
                    {item.badge}
                  </motion.span>
                )}
              </div>

              {/* Point indicateur glissant sous l'icône active */}
              {isActive && (
                <motion.span
                  layoutId="activeFloatingNavbarDot"
                  className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_6px_#d4af37]"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
};
