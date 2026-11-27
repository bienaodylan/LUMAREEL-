import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { User, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Navigation desktop horizontale en haut de page LUMARÉEL :
 * Logo à gauche · 5 entrées centrées (soulignement or #D4AF6A actif) · langue & compte à droite.
 */
export const DesktopTopNav: React.FC = () => {
  const {
    currentPage,
    setCurrentPage,
    currentUser,
    setIsAuthModalOpen,
    language,
    setLanguage,
  } = useApp();

  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) {
    return null;
  }

  const isEn = language === 'en';

  const navItems: Array<{
    id: string;
    page: PageView;
    label: string;
    active: boolean;
  }> = [
    {
      id: 'home',
      page: 'home',
      label: isEn ? 'Home' : 'Accueil',
      active: currentPage === 'home' || currentPage === 'discover' || currentPage === 'concert_detail',
    },
    {
      id: 'tickets',
      page: 'client_space',
      label: isEn ? 'Tickets' : 'Billets',
      active: currentPage === 'client_space',
    },
    {
      id: 'explore',
      page: 'explore',
      label: isEn ? 'Explore' : 'Explorer',
      active: [
        'explore',
        'backstage',
        'media_detail',
        'memories',
        'archive',
        'rewards',
        'privileged_access',
        'flash_drops',
        'suggestions',
        'organizers',
      ].includes(currentPage),
    },
    {
      id: 'black_card',
      page: 'member_card',
      label: 'Black Card',
      active: ['member_card', 'card', 'card_verify'].includes(currentPage),
    },
    {
      id: 'account',
      page: 'profile',
      label: isEn ? 'Account' : 'Compte',
      active: [
        'profile',
        'contact',
        'contributor_studio',
        'about',
        'partners',
      ].includes(currentPage),
    },
  ];

  return (
    <header className="hidden md:flex fixed top-0 inset-x-0 z-50 h-[72px] bg-black/94 backdrop-blur-xl border-b border-white/[0.12]">
      <div className="w-full max-w-[1380px] mx-auto px-8 lg:px-10 flex items-center justify-between gap-6">
        {/* Gauche : Logo LUMARÉEL */}
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="text-left cursor-pointer shrink-0 whitespace-nowrap group"
        >
          <span className="font-agrandir-extrabold text-base tracking-[0.22em] text-white group-hover:text-[#D4AF6A] transition-colors">
            LUMARÉEL
          </span>
        </button>

        {/* Centre : 5 destinations exactes avec indicateur doré */}
        <nav
          aria-label={isEn ? 'Desktop navigation' : 'Navigation desktop'}
          className="flex items-center gap-7 lg:gap-9 h-full"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              aria-current={item.active ? 'page' : undefined}
              className={`relative h-full inline-flex items-center text-xs font-agrandir-extrabold tracking-[0.04em] whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                item.active ? 'text-white' : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              <span>{item.label}</span>
              {item.active && (
                <motion.span
                  layoutId="lumareel-desktop-gold-underline"
                  transition={{ type: 'spring', stiffness: 460, damping: 36 }}
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-[#D4AF6A]"
                />
              )}
            </button>
          ))}
        </nav>

        {/* Droite : Langue + Compte */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center border border-white/[0.12] bg-[#0E0E0E] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`min-h-[28px] px-2 rounded-[4px] transition-colors cursor-pointer ${
                language === 'fr'
                  ? 'bg-[#D4AF6A] text-black font-agrandir-extrabold'
                  : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`min-h-[28px] px-2 rounded-[4px] transition-colors cursor-pointer ${
                language === 'en'
                  ? 'bg-[#D4AF6A] text-black font-agrandir-extrabold'
                  : 'text-[#9A9A9A] hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {currentUser ? (
            <button
              type="button"
              onClick={() => setCurrentPage('profile')}
              className="min-h-[36px] px-3 rounded-[4px] border border-white/[0.12] bg-[#0E0E0E] hover:border-white/30 inline-flex items-center gap-2 text-xs text-white transition-colors cursor-pointer whitespace-nowrap lum-press"
            >
              <User className="w-3.5 h-3.5 text-[#D4AF6A]" strokeWidth={1.6} />
              <span className="max-w-[110px] truncate font-agrandir-semibold">
                {currentUser.name.split(' ')[0]}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="min-h-[36px] px-3.5 rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black inline-flex items-center gap-1.5 text-xs font-agrandir-extrabold transition-colors cursor-pointer whitespace-nowrap lum-press"
            >
              <LogIn className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>{isEn ? 'Sign in' : 'Connexion'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
