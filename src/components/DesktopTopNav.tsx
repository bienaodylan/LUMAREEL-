import React, { useEffect, useRef, useState } from 'react';
import { useApp, PageView } from '../context/AppContext';
import { User, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * Navigation desktop horizontale en haut de page LUMARÉEL :
 * Logo officiel à gauche · 5 entrées centrées (soulignement or #D4AF6A actif) · langue & compte à droite.
 * Se masque automatiquement au scroll vers le bas et réapparaît dès que l'utilisateur remonte.
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

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    setIsVisible(true);
    lastScrollYRef.current = typeof window !== 'undefined' ? window.scrollY : 0;
  }, [currentPage]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollYRef.current;

      if (currentY <= 24) {
        setIsVisible(true);
      } else if (delta > 6 && currentY > 72) {
        setIsVisible(false);
      } else if (delta < -6) {
        setIsVisible(true);
      }
      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (['splash', 'gate_scanner', 'admin', 'booking'].includes(currentPage)) {
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
      active: currentPage === 'home' || currentPage === 'discover',
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
        'discover_detail',
        'backstage',
        'media_detail',
        'memories',
        'lumareel_tv',
        'archive',
        'privileged_access',
        'flash_drops',
        'suggestions',
        'organizers',
      ].includes(currentPage),
    },
    {
      id: 'black_card',
      page: 'member_card',
      label: 'LUMARÉEL Black Card',
      active: ['member_card', 'card', 'card_verify', 'rewards'].includes(currentPage),
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
    <header
      className={`hidden md:flex fixed top-0 inset-x-0 z-50 h-[72px] bg-black/94 backdrop-blur-xl border-b border-white/[0.12] transition-transform duration-300 ease-out will-change-transform ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}
    >
      <div className="w-full max-w-[1380px] mx-auto px-8 lg:px-10 flex items-center justify-between gap-6">
        {/* Gauche : Logo officiel LUMARÉEL */}
        <button
          type="button"
          onClick={() => {
            setCurrentPage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          aria-label="LUMARÉEL — Accueil"
          className="text-left cursor-pointer shrink-0 flex items-center group"
        >
          <img
            src="/assets/logo-lumareel.png"
            alt="LUMARÉEL"
            className="h-6 lg:h-7 w-auto object-contain group-hover:opacity-80 transition-opacity"
          />
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
          <div className="flex items-center rounded-full border border-white/[0.12] bg-[#0E0E0E] p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`min-h-[28px] px-2.5 rounded-full transition-colors cursor-pointer ${
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
              className={`min-h-[28px] px-2.5 rounded-full transition-colors cursor-pointer ${
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
              className="min-h-[36px] px-3.5 rounded-full border border-white/[0.12] bg-[#0E0E0E] hover:border-white/30 inline-flex items-center gap-2 text-xs text-white transition-colors cursor-pointer whitespace-nowrap lum-press"
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
              className="min-h-[36px] px-4 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black inline-flex items-center gap-1.5 text-xs font-agrandir-extrabold transition-colors cursor-pointer whitespace-nowrap lum-press"
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
