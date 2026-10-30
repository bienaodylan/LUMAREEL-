import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Film, Newspaper, User } from 'lucide-react';

/**
 * FloatingAppNavbar.tsx — Barre de navigation mobile flottante en forme de pilule (style Instagram).
 * Affiche UNIQUEMENT les icônes (sans texte) pour une interface épurée, moderne et ergonomique.
 * Effet translucide (glassmorphism) en verre dépoli laissant défiler le contenu en arrière-plan.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, customerOrders } = useApp();

  // Ne pas afficher sur le splash screen ou pendant le scan vigile plein écran
  if (currentPage === 'splash' || currentPage === 'gate_scanner') {
    return null;
  }

  // Calcul du nombre de billets actifs pour badge discret sur l'icône de billetterie
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
      label: 'Mes billets',
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
      label: 'Mon Profil',
      icon: User,
    },
  ];

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm pointer-events-none select-none">
      <nav
        aria-label="Navigation principale de l'application"
        className="pointer-events-auto mx-auto px-3 py-2 sm:px-4 sm:py-2.5 rounded-full bg-[#0a0a0a]/75 backdrop-blur-2xl border border-white/20 shadow-[0_16px_40px_rgba(0,0,0,0.85)] flex items-center justify-around transition-all duration-300"
      >
        {navItems.map((item) => {
          const isActive = currentPage === item.page;
          const Icon = item.icon;

          return (
            <button
              key={item.page}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              aria-label={item.label}
              title={item.label}
              className={`relative p-2.5 sm:p-3 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer group ${
                isActive
                  ? 'text-white'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {/* Fond translucide actif & lueur pour l'icône sélectionnée */}
              {isActive && (
                <span className="absolute inset-0 rounded-full bg-white/15 border border-white/25 shadow-[0_0_15px_rgba(255,255,255,0.15)] animate-fadeIn" />
              )}

              {/* Conteneur Icône & Badge */}
              <div className="relative z-10 flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${
                    isActive
                      ? 'scale-110 text-white stroke-[2.5] drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                      : 'group-hover:scale-110 stroke-[1.8] group-hover:text-white'
                  }`}
                />

                {/* Badge de notification pour les billets */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full bg-[#d4af37] text-black text-[9px] font-agrandir-extrabold leading-tight shadow-md">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Point indicateur discret sous l'icône active (style Instagram / iOS) */}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-[#d4af37] shadow-[0_0_4px_#d4af37]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
