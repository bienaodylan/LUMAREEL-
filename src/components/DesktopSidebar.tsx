import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Archive, CreditCard, UserRound, Settings } from 'lucide-react';

/** Navigation desktop LUMARÉEL: sidebar fixe adaptée aux destinations réelles de l'application. */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, platformSettings, language, setLanguage, t } = useApp();
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const items: Array<{label:string; page:PageView; icon:React.ComponentType<{size?:number;strokeWidth?:number;fill?:string;className?:string}>}> = [
    {label: t('nav.home'), page:'home', icon:Home},
    {label: t('nav.orders'), page:'client_space', icon:Ticket},
    {label: t('nav.archives'), page:'archive', icon:Archive},
    {label: t('nav.blackCard'), page:'member_card', icon:CreditCard},
    {label: t('nav.account'), page:'profile', icon:UserRound},
  ];
  const go = (page:PageView) => setCurrentPage(page);
  return <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[244px] flex-col border-r border-[#dbdbdb] bg-white px-3 pb-5 pt-6 text-[#262626] dark:border-[#262626] dark:bg-black dark:text-white">
    <button onClick={()=>go('home')} aria-label={`LUMARÉEL ${t('nav.home')}`} className="mb-8 flex h-12 items-center px-3 cursor-pointer">
      <img src="/assets/logo-lumareel.png" alt={platformSettings.platformName || 'LUMARÉEL'} className="h-8 w-auto object-contain"/>
    </button>
    <nav className="flex flex-col gap-1">
      {items.map(({label,page,icon:Icon})=>{const active=currentPage===page;return <button key={page} onClick={()=>go(page)} aria-current={active?'page':undefined} className={`group flex h-12 items-center gap-4 rounded-lg px-3 text-left text-base transition-colors hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] cursor-pointer ${active?'font-bold':''}`}>
        <Icon size={24} strokeWidth={active?2.6:1.9} fill={active&&page==='home'?'currentColor':'none'} className="shrink-0 transition-transform group-hover:scale-105"/>
        <span>{label}</span>
      </button>})}
    </nav>
    <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-white/10">
      <div className="flex items-center justify-between px-3 py-1">
        <span className="text-xs text-neutral-500">{language === 'en' ? 'Language' : 'Langue'}</span>
        <div className="flex items-center p-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-agrandir-bold">
          <button
            type="button"
            onClick={() => setLanguage('fr')}
            className={`px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${language === 'fr' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
          >
            FR
          </button>
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-0.5 rounded-full cursor-pointer transition-colors ${language === 'en' ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'}`}
          >
            EN
          </button>
        </div>
      </div>
      <button onClick={()=>go('profile')} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-neutral-500 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] cursor-pointer"><Settings size={19}/><span>{t('nav.accountSettings')}</span></button>
    </div>
  </aside>;
};
