import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { Home, Ticket, Archive, CreditCard, UserRound, Search, Compass, Clapperboard, MessageCircle, Bell, Plus, Menu, Settings, LogOut, Sun, Moon, type LucideIcon } from 'lucide-react';

/** Navigation desktop LUMARÉEL: sidebar fixe adaptée aux destinations réelles de l'application. */
export const DesktopSidebar: React.FC = () => {
  const { currentPage, setCurrentPage, platformSettings } = useApp();
  if (['splash', 'gate_scanner', 'admin'].includes(currentPage)) return null;

  const items: Array<{label:string; page:PageView; icon:LucideIcon}> = [
    {label:'Accueil',page:'home',icon:Home},
    {label:'Mes commandes',page:'client_space',icon:Ticket},
    {label:'Archives',page:'archive',icon:Archive},
    {label:'Ma carte',page:'member_card',icon:CreditCard},
    {label:'Mon compte',page:'profile',icon:UserRound},
  ];
  const go = (page:PageView) => setCurrentPage(page);
  return <aside className="hidden md:flex fixed inset-y-0 left-0 z-40 w-[244px] flex-col border-r border-[#dbdbdb] bg-white px-3 pb-5 pt-6 text-[#262626] dark:border-[#262626] dark:bg-black dark:text-white">
    <button onClick={()=>go('home')} aria-label="LUMARÉEL accueil" className="mb-8 flex h-12 items-center px-3">
      <img src="/assets/logo-lumareel.png" alt={platformSettings.platformName || 'LUMARÉEL'} className="h-8 w-auto object-contain"/>
    </button>
    <nav className="flex flex-col gap-1">
      {items.map(({label,page,icon:Icon})=>{const active=currentPage===page;return <button key={page} onClick={()=>go(page)} aria-current={active?'page':undefined} className={`group flex h-12 items-center gap-4 rounded-lg px-3 text-left text-base transition-colors hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] ${active?'font-bold':''}`}>
        <Icon size={24} strokeWidth={active?2.6:1.9} fill={active&&page==='home'?'currentColor':'none'} className="shrink-0 transition-transform group-hover:scale-105"/>
        <span>{label}</span>
      </button>})}
    </nav>
    <div className="mt-auto flex flex-col gap-1">
      <button onClick={()=>go('profile')} className="group flex h-12 items-center gap-4 rounded-lg px-3 text-base hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"><Menu size={24} className="transition-transform group-hover:scale-105"/><span>Plus</span></button>
      <button onClick={()=>go('profile')} className="flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-neutral-500 hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a]"><Settings size={19}/><span>Paramètres du compte</span></button>
    </div>
  </aside>;
};
