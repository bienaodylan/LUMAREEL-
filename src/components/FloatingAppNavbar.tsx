import React, { useEffect, useState } from 'react';
import { useApp, PageView } from '../context/AppContext';
import {
  ArrowUpRight, Award, Camera, Clapperboard, Compass, CreditCard,
  Film, Home, Lightbulb, Newspaper, Ticket, User, X, Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * Navigation mobile unifiée : barre flottante + espace Explorer éditorial.
 * La même expérience est utilisée dans le navigateur et en PWA.
 */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language, t } = useApp();
  const [explorerOpen, setExplorerOpen] = useState(false);
  const isEn = language === 'en';

  useEffect(() => setExplorerOpen(false), [currentPage]);

  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const explorerPages: PageView[] = ['rewards', 'backstage', 'flash_drops', 'memories', 'suggestions', 'archive', 'news'];
  const explorerActive = explorerPages.includes(currentPage);

  const navItems = [
    { id: 'home', label: isEn ? 'Home' : 'Accueil', icon: Home, active: currentPage === 'home' || currentPage === 'discover', action: () => setCurrentPage('home') },
    { id: 'tickets', label: isEn ? 'Tickets' : 'Billets', icon: Ticket, active: currentPage === 'client_space', action: () => setCurrentPage('client_space') },
    { id: 'explore', label: isEn ? 'Explore' : 'Explorer', icon: Compass, active: explorerOpen || explorerActive, action: () => setExplorerOpen(v => !v) },
    { id: 'card', label: isEn ? 'Black Card' : 'Carte', icon: CreditCard, active: currentPage === 'member_card' || currentPage === 'card', action: () => setCurrentPage('member_card') },
    { id: 'account', label: isEn ? 'Account' : 'Compte', icon: User, active: currentPage === 'profile', action: () => setCurrentPage('profile') },
  ];

  const go = (page: PageView) => {
    setExplorerOpen(false);
    setCurrentPage(page);
  };

  const experienceItems = [
    { page: 'backstage' as PageView, title: 'BACKSTAGE', subtitle: isEn ? 'Inside the experience' : 'Dans les coulisses', icon: Clapperboard, style: 'from-[#45321f] via-[#17120e] to-[#090909]', tag: isEn ? 'EXCLUSIVE' : 'EXCLUSIF' },
    { page: 'memories' as PageView, title: isEn ? 'Concert memories' : 'Souvenirs de concerts', subtitle: isEn ? 'Relive the best moments' : 'Revivez les meilleurs moments', icon: Camera, style: 'from-[#26333a] via-[#11191d] to-[#090909]', tag: isEn ? 'THE RECAP' : 'LES MOMENTS FORTS' },
    { page: 'flash_drops' as PageView, title: 'FLASH DROPS', subtitle: isEn ? 'Limited offers & surprises' : 'Offres limitées & surprises', icon: Zap, style: 'from-[#47351b] via-[#1b160d] to-[#090909]', tag: isEn ? 'LIMITED' : 'ÉDITION LIMITÉE' },
  ];

  const communityItems = [
    { page: 'rewards' as PageView, title: isEn ? 'Points & Referrals' : 'Points & Parrainage', subtitle: isEn ? 'Your loyalty, rewarded' : 'Votre fidélité récompensée', icon: Award },
    { page: 'suggestions' as PageView, title: isEn ? 'Suggestion box' : 'Boîte à suggestions', subtitle: isEn ? 'Artists, venues, ideas' : 'Artistes, lieux et concepts', icon: Lightbulb },
  ];

  const editorialItems = [
    { page: 'archive' as PageView, title: isEn ? 'Archives' : 'Archives', subtitle: isEn ? 'Past LUMARÉEL productions' : 'Les productions passées', icon: Film },
    { page: 'news' as PageView, title: isEn ? 'News & announcements' : 'Actualités', subtitle: isEn ? 'The latest from LUMARÉEL' : 'Les dernières nouvelles', icon: Newspaper },
  ];

  return (
    <>
      <AnimatePresence>
        {explorerOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <motion.button
              type="button"
              aria-label={t('nav.close')}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setExplorerOpen(false)}
              className="absolute inset-0 w-full bg-black/75 backdrop-blur-sm"
            />
            <motion.section
              initial={{ y: 36, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              aria-label={isEn ? 'Explore LUMARÉEL' : 'Explorer LUMARÉEL'}
              className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border-t border-white/10 bg-[#090909] shadow-[0_-20px_70px_rgba(0,0,0,.55)]"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-white/25" />
              <div className="flex items-start justify-between px-5 pb-4 pt-5">
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[.24em] text-[#D4AF37]">LUMARÉEL · DISCOVERY</p>
                  <h2 className="text-[30px] font-extrabold leading-none tracking-[-.05em] text-white">{isEn ? 'Explore' : 'Explorer'}</h2>
                  <p className="mt-2 text-xs text-neutral-400">{isEn ? 'Experiences, community and stories.' : 'Expériences, communauté et actualités.'}</p>
                </div>
                <button type="button" onClick={() => setExplorerOpen(false)} aria-label={t('nav.close')} className="flex h-9 w-9 items-center justify-center text-neutral-300 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 pb-5">
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[.2em] text-neutral-500">{isEn ? 'Experiences' : 'Les expériences'}</h3>
                    <span className="text-[10px] text-neutral-600">01 — 03</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {experienceItems.map((item, index) => {
                      const Icon = item.icon;
                      return (
                        <motion.button key={item.page} type="button" whileTap={{ scale: .97 }} onClick={() => go(item.page)} className="group min-w-0 text-left">
                          <div className={`relative flex aspect-[.78] flex-col justify-between overflow-hidden rounded-[17px] bg-gradient-to-br ${item.style} p-3 ring-1 ring-white/10 transition-transform group-hover:-translate-y-0.5`}>
                            <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full border border-white/10" />
                            <div className="absolute -right-2 top-5 h-16 w-16 rounded-full border border-white/10" />
                            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#E3C36A]"><Icon className="h-4 w-4" /></div>
                            <div className="relative">
                              <span className="mb-1 block text-[7px] font-bold tracking-[.15em] text-[#E3C36A]">{item.tag}</span>
                              <span className="block text-[11px] font-extrabold leading-tight text-white">{item.title}</span>
                              <span className="mt-1 block text-[9px] leading-snug text-white/55">{item.subtitle}</span>
                            </div>
                            <span className="absolute right-2.5 top-2.5 text-[8px] text-white/40">0{index + 1}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold uppercase tracking-[.2em] text-neutral-500">{isEn ? 'Community' : 'La communauté'}</h3>
                    <span className="text-[10px] text-neutral-600">{isEn ? 'TAKE PART' : 'PARTICIPEZ'}</span>
                  </div>
                  <div className="divide-y divide-white/10 border-y border-white/10">
                    {communityItems.map(item => {
                      const Icon = item.icon;
                      return <button key={item.page} type="button" onClick={() => go(item.page)} className="flex w-full items-center gap-3 py-3.5 text-left">
                        <Icon className="h-[18px] w-[18px] shrink-0 text-[#D4AF37]" />
                        <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-white">{item.title}</span><span className="mt-0.5 block text-[10px] text-neutral-500">{item.subtitle}</span></span>
                        <ArrowUpRight className="h-4 w-4 text-neutral-600" />
                      </button>;
                    })}
                  </div>
                </section>

                <section>
                  <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-neutral-500">{isEn ? 'Discover more' : 'Pour aller plus loin'}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {editorialItems.map(item => {
                      const Icon = item.icon;
                      return <button key={item.page} type="button" onClick={() => go(item.page)} className="flex min-h-[82px] items-center gap-3 border-b border-white/10 py-3 text-left">
                        <Icon className="h-5 w-5 shrink-0 text-neutral-400" />
                        <span className="min-w-0"><span className="block text-xs font-semibold text-white">{item.title}</span><span className="mt-1 block text-[9px] leading-snug text-neutral-500">{item.subtitle}</span></span>
                      </button>;
                    })}
                  </div>
                </section>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        aria-label={t('nav.mainNav')}
        className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(.65rem,env(safe-area-inset-bottom,0px))] pt-2 md:hidden"
      >
        <div className="pointer-events-auto mx-auto max-w-[390px] rounded-[25px] border border-white/[.12] bg-[#111111]/95 px-2 py-2 shadow-[0_10px_38px_rgba(0,0,0,.65)] backdrop-blur-2xl" style={{ WebkitBackdropFilter: 'blur(24px)' }}>
          <div className="grid grid-cols-5 items-center">
            {navItems.map(item => {
              const Icon = item.icon;
              return <button key={item.id} type="button" onClick={item.action} aria-label={item.label} aria-current={item.active ? 'page' : undefined} className="relative flex min-h-[48px] flex-col items-center justify-center gap-1 outline-none">
                <span className="relative flex h-8 w-12 items-center justify-center">
                  {item.active && <motion.span layoutId="lumareelFloatingActivePill" transition={{ type: 'spring', stiffness: 430, damping: 32, mass: .72 }} className="absolute inset-0 rounded-full bg-[#D4AF37] shadow-[0_3px_15px_rgba(212,175,55,.3)]" />}
                  <Icon className={`relative z-10 h-[19px] w-[19px] transition-colors ${item.active ? 'text-black stroke-[2.3]' : 'text-neutral-400 stroke-[1.8]'}`} />
                </span>
                <span className={`text-[9px] leading-none ${item.active ? 'font-bold text-[#E4C66F]' : 'text-neutral-500'}`}>{item.label}</span>
              </button>;
            })}
          </div>
        </div>
      </motion.nav>
    </>
  );
};
