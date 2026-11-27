import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Clapperboard, User } from 'lucide-react';
import { motion } from 'framer-motion';

/** Navigation mobile LUMARÉEL : quatre destinations lisibles, les fonctions secondaires restent accessibles dans leur espace. */
export const FloatingAppNavbar: React.FC = () => {
  const { currentPage, setCurrentPage, language } = useApp();
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const backstagePages: PageView[] = ['backstage', 'memories'];
  const accountPages: PageView[] = ['profile', 'member_card', 'card', 'rewards', 'suggestions', 'flash_drops'];
  const explorePages: PageView[] = ['explore', 'archive', 'news', 'organizers'];
  const items = [
    { id: 'discover', page: 'home' as PageView, label: language === 'en' ? 'Discover' : 'Découvrir', icon: Home, active: currentPage === 'home' || currentPage === 'discover' || explorePages.includes(currentPage) },
    { id: 'tickets', page: 'client_space' as PageView, label: language === 'en' ? 'Tickets' : 'Billets', icon: Ticket, active: currentPage === 'client_space' || currentPage === 'concert_detail' },
    { id: 'backstage', page: 'backstage' as PageView, label: 'BACKSTAGE', icon: Clapperboard, active: backstagePages.includes(currentPage) },
    { id: 'account', page: 'profile' as PageView, label: language === 'en' ? 'My space' : 'Mon espace', icon: User, active: accountPages.includes(currentPage) },
  ];
  return <nav aria-label={language === 'en' ? 'Main navigation' : 'Navigation principale'} className="fixed bottom-[calc(.7rem+env(safe-area-inset-bottom,0px))] left-1/2 z-[70] flex w-[min(94vw,430px)] -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-[#111]/95 px-2 py-2 shadow-[0_12px_45px_rgba(0,0,0,.65)] backdrop-blur-xl md:hidden">
    {items.map(item => { const Icon=item.icon; return <button key={item.id} type="button" onClick={() => setCurrentPage(item.page)} aria-current={item.active ? 'page' : undefined} className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-2 py-2 text-[9px] transition-colors ${item.active ? 'text-black' : 'text-neutral-400 hover:text-white'}`}>
      {item.active && <motion.span layoutId="lumareel-active-nav" className="absolute inset-0 rounded-full bg-[#D4AF37]" transition={{ type:'spring', stiffness:420, damping:34 }}/>}
      <span className="relative z-10"><Icon size={18} strokeWidth={item.active ? 2.4 : 1.8}/></span><span className="relative z-10 whitespace-nowrap font-agrandir-bold">{item.label}</span>
    </button>; })}
  </nav>;
};
