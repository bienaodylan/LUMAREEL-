import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { CreditCard, Home, Compass, Ticket, UserRound } from 'lucide-react';

/** Navigation desktop courte ; Explorer ouvre une destination dédiée. */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, platformSettings, language, setLanguage, t } = useApp();
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;
  const items = [
    { label: t('nav.home'), page: 'home' as PageView, icon: Home },
    { label: t('nav.orders'), page: 'client_space' as PageView, icon: Ticket },
    { label: language === 'en' ? 'Explore' : 'Explorer', page: 'explore' as PageView, icon: Compass },
    { label: 'LUMARÉEL Black Card', page: 'member_card' as PageView, icon: CreditCard },
    { label: t('nav.account'), page: 'profile' as PageView, icon: UserRound },
  ];
  const activeFor = (page: PageView) => currentPage === page || (page === 'home' && currentPage === 'discover') || (page === 'member_card' && currentPage === 'card') || (page === 'explore' && ['rewards','backstage','flash_drops','memories','suggestions','archive','news'].includes(currentPage));
  return <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-white/[.08] bg-[#080808] px-4 pb-5 pt-7 text-white md:flex">
    <button type="button" onClick={() => setCurrentPage('home')} aria-label={`LUMARÉEL ${t('nav.home')}`} className="mb-10 flex h-10 shrink-0 items-center px-2"><img src="/assets/logo-lumareel.png" alt={platformSettings.platformName || 'LUMARÉEL'} className="h-7 w-auto object-contain"/></button>
    <nav className="space-y-1">{items.map(({label,page,icon:Icon}) => { const active=activeFor(page); return <button key={page} type="button" onClick={() => setCurrentPage(page)} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] transition-colors ${active ? 'bg-white/[.08] font-semibold text-white' : 'text-neutral-400 hover:bg-white/[.05] hover:text-white'}`}><Icon size={19} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-[#D4AF37]' : ''}/><span className="min-w-0 flex-1 truncate">{label}</span>{active && <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]"/>}</button>; })}</nav>
    <div className="mt-auto space-y-4 border-t border-white/[.08] pt-4"><div className="flex items-center justify-between px-2"><span className="text-[10px] text-neutral-600">{language === 'en' ? 'Language' : 'Langue'}</span><div className="flex items-center gap-1 text-[10px]"><button type="button" onClick={() => setLanguage('fr')} className={`px-2 py-1 ${language === 'fr' ? 'font-bold text-[#D4AF37]' : 'text-neutral-500'}`}>FR</button><button type="button" onClick={() => setLanguage('en')} className={`px-2 py-1 ${language === 'en' ? 'font-bold text-[#D4AF37]' : 'text-neutral-500'}`}>EN</button></div></div><button type="button" onClick={() => setCurrentPage('profile')} className="flex h-9 w-full items-center gap-3 px-2 text-xs text-neutral-500 hover:text-white"><UserRound size={16}/><span>{t('nav.accountSettings')}</span></button></div>
  </aside>;
};
