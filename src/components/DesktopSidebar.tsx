import React, { useState } from 'react';
import { useApp, PageView } from '../context/AppContext';
import {
  Archive, ArrowUpRight, Award, Camera, Clapperboard, Compass,
  CreditCard, Film, Home, Lightbulb, Newspaper, Settings, Ticket,
  UserRound, Zap,
} from 'lucide-react';

/** Navigation desktop compacte, alignée sur l'expérience mobile. */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, platformSettings, language, setLanguage, t } = useApp();
  const [explorerOpen, setExplorerOpen] = useState(false);
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const isEn = language === 'en';
  const explorerPages: PageView[] = ['rewards', 'backstage', 'flash_drops', 'memories', 'suggestions', 'archive', 'news'];
  const explorerActive = explorerPages.includes(currentPage);
  const mainItems = [
    { label: t('nav.home'), page: 'home' as PageView, icon: Home },
    { label: t('nav.orders'), page: 'client_space' as PageView, icon: Ticket },
    { label: 'LUMARÉEL Black Card', page: 'member_card' as PageView, icon: CreditCard },
    { label: t('nav.account'), page: 'profile' as PageView, icon: UserRound },
  ];
  const groups = [
    { title: isEn ? 'EXPERIENCES' : 'EXPÉRIENCES', items: [
      { label: 'BACKSTAGE', page: 'backstage' as PageView, icon: Clapperboard },
      { label: 'Flash Drops', page: 'flash_drops' as PageView, icon: Zap },
      { label: isEn ? 'Concert memories' : 'Souvenirs de concerts', page: 'memories' as PageView, icon: Camera },
    ]},
    { title: isEn ? 'COMMUNITY' : 'COMMUNAUTÉ', items: [
      { label: isEn ? 'Points & Referrals' : 'Points & Parrainage', page: 'rewards' as PageView, icon: Award },
      { label: isEn ? 'Suggestion box' : 'Boîte à suggestions', page: 'suggestions' as PageView, icon: Lightbulb },
    ]},
    { title: isEn ? 'THE JOURNAL' : 'LE JOURNAL', items: [
      { label: 'Archives', page: 'archive' as PageView, icon: Film },
      { label: isEn ? 'News' : 'Actualités', page: 'news' as PageView, icon: Newspaper },
    ]},
  ];

  const activeFor = (page: PageView) => currentPage === page || (page === 'home' && currentPage === 'discover') || (page === 'member_card' && currentPage === 'card');

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-white/[.08] bg-[#080808] px-4 pb-5 pt-7 text-white md:flex">
      <button type="button" onClick={() => setCurrentPage('home')} aria-label={`LUMARÉEL ${t('nav.home')}`} className="mb-10 flex h-10 shrink-0 items-center px-2">
        <img src="/assets/logo-lumareel.png" alt={platformSettings.platformName || 'LUMARÉEL'} className="h-7 w-auto object-contain" />
      </button>

      <nav className="space-y-1">
        {mainItems.map(({ label, page, icon: Icon }) => {
          const active = activeFor(page);
          return <button key={page} type="button" onClick={() => { setExplorerOpen(false); setCurrentPage(page); }} aria-current={active ? 'page' : undefined} className={`group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] transition-colors ${active ? 'bg-white/[.08] font-semibold text-white' : 'text-neutral-400 hover:bg-white/[.05] hover:text-white'}`}>
            <Icon size={19} strokeWidth={active ? 2.3 : 1.8} className={active ? 'text-[#D4AF37]' : ''} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {active && <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />}
          </button>;
        })}

        <button type="button" onClick={() => setExplorerOpen(v => !v)} aria-expanded={explorerOpen} className={`mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-[13px] transition-colors ${explorerOpen || explorerActive ? 'bg-white/[.08] font-semibold text-white' : 'text-neutral-400 hover:bg-white/[.05] hover:text-white'}`}>
          <Compass size={19} className={explorerOpen || explorerActive ? 'text-[#D4AF37]' : ''} />
          <span className="flex-1">{isEn ? 'Explore' : 'Explorer'}</span>
          <span className={`text-xs transition-transform ${explorerOpen ? 'rotate-90' : ''}`}>›</span>
        </button>
      </nav>

      {explorerOpen && <div className="mt-3 space-y-5 border-l border-white/10 pl-3">
        {groups.map(group => <section key={group.title}>
          <h3 className="mb-2 text-[9px] font-bold tracking-[.2em] text-neutral-600">{group.title}</h3>
          <div className="space-y-1">
            {group.items.map(({ label, page, icon: Icon }) => {
              const active = currentPage === page;
              return <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[11px] ${active ? 'font-semibold text-[#D4AF37]' : 'text-neutral-400 hover:text-white'}`}>
                <Icon size={15} /><span className="min-w-0 flex-1 truncate">{label}</span>{active && <ArrowUpRight size={12} />}
              </button>;
            })}
          </div>
        </section>)}
      </div>}

      <div className="mt-auto space-y-4 border-t border-white/[.08] pt-4">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] text-neutral-600">{isEn ? 'Language' : 'Langue'}</span>
          <div className="flex items-center gap-1 text-[10px]">
            <button type="button" onClick={() => setLanguage('fr')} className={`px-2 py-1 ${language === 'fr' ? 'font-bold text-[#D4AF37]' : 'text-neutral-500'}`}>FR</button>
            <button type="button" onClick={() => setLanguage('en')} className={`px-2 py-1 ${language === 'en' ? 'font-bold text-[#D4AF37]' : 'text-neutral-500'}`}>EN</button>
          </div>
        </div>
        <button type="button" onClick={() => setCurrentPage('profile')} className="flex h-9 w-full items-center gap-3 px-2 text-xs text-neutral-500 hover:text-white">
          <Settings size={16} /><span>{t('nav.accountSettings')}</span>
        </button>
      </div>
    </aside>
  );
};
