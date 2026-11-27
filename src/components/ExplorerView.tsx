import React from 'react';
import { useApp, PageView } from '../context/AppContext';
import { ArrowUpRight, Award, Camera, Clapperboard, Film, Lightbulb, Newspaper, Zap } from 'lucide-react';

export const ExplorerView: React.FC = () => {
  const { setCurrentPage, language } = useApp();
  const en = language === 'en';
  const go = (page: PageView) => setCurrentPage(page);
  const features = [
    { page: 'backstage' as PageView, n: '01', title: 'BACKSTAGE', desc: en ? 'Step inside the moments the audience never sees.' : 'Entrez dans les coulisses et découvrez ce que le public ne voit jamais.', cta: en ? 'Enter backstage' : 'Entrer dans les coulisses', icon: Clapperboard, bg: 'from-[#3a2b1d] via-[#17120e] to-[#090909]', color: 'text-[#E3C36A]' },
    { page: 'memories' as PageView, n: '02', title: en ? 'Concert memories' : 'Souvenirs de concerts', desc: en ? 'Relive the nights, the energy and the moments worth keeping.' : 'Revivez les soirées, l’énergie et les instants qui méritent de rester.', cta: en ? 'Relive the moments' : 'Revivre les moments', icon: Camera, bg: 'from-[#25333a] via-[#11191d] to-[#090909]', color: 'text-[#A9D5E5]' },
    { page: 'flash_drops' as PageView, n: '03', title: 'FLASH DROPS', desc: en ? 'Limited offers, surprise rewards and opportunities that disappear.' : 'Offres limitées, récompenses surprises et opportunités éphémères.', cta: en ? 'See current drops' : 'Voir les offres', icon: Zap, bg: 'from-[#45351b] via-[#1d170d] to-[#090909]', color: 'text-[#E3C36A]' },
  ];
  const links = [
    { page: 'rewards' as PageView, title: en ? 'Points & referrals' : 'Points & parrainage', desc: en ? 'Your activity, your rewards.' : 'Votre fidélité et vos avantages.', icon: Award },
    { page: 'suggestions' as PageView, title: en ? 'Your ideas' : 'Vos idées', desc: en ? 'Help shape the next LUMARÉEL experience.' : 'Imaginez les prochains événements avec nous.', icon: Lightbulb },
    { page: 'archive' as PageView, title: en ? 'Past productions' : 'Productions passées', desc: en ? 'Explore the LUMARÉEL collection.' : 'Retrouvez les productions LUMARÉEL.', icon: Film },
    { page: 'news' as PageView, title: en ? 'News & stories' : 'Actualités', desc: en ? 'What is happening at LUMARÉEL.' : 'Les dernières nouvelles de LUMARÉEL.', icon: Newspaper },
  ];
  return (
    <main className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-5 sm:pt-10 pb-24 text-white font-agrandir-regular">
      <header className="mb-9 sm:mb-12">
        <p className="mb-3 text-[10px] sm:text-xs font-agrandir-bold uppercase tracking-[.24em] text-[#D4AF37]">LUMARÉEL · DISCOVERY</p>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div><h1 className="text-4xl sm:text-6xl font-agrandir-extrabold tracking-[-.055em] leading-none">{en ? 'Explore' : 'Explorer'}<span className="text-[#D4AF37]">.</span></h1><p className="mt-4 max-w-xl text-sm sm:text-base leading-relaxed text-neutral-400">{en ? 'A closer look at the experiences, people and stories that make every LUMARÉEL night unique.' : 'Découvrez les expériences, les personnes et les histoires qui rendent chaque soirée LUMARÉEL unique.'}</p></div>
          <p className="max-w-[230px] text-xs leading-relaxed text-neutral-500 sm:text-right">{en ? 'Discover something new. Take part. Keep the memories.' : 'Découvrez. Participez. Vivez les moments.'}</p>
        </div>
      </header>
      <section className="mb-12 sm:mb-16">
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-3"><h2 className="text-xs font-agrandir-bold uppercase tracking-[.18em] text-neutral-300">{en ? 'Featured experiences' : 'Les expériences à découvrir'}</h2><span className="text-[10px] text-neutral-600">01 — 03</span></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {features.map(item => { const Icon = item.icon; return (
            <button key={item.page} type="button" onClick={() => go(item.page)} className={`group relative min-h-[245px] sm:min-h-[330px] overflow-hidden border border-white/10 bg-gradient-to-br text-left transition-all duration-300 hover:border-[#D4AF37]/50 hover:-translate-y-1 ${item.bg} p-5 sm:p-6`}>
              <span className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/10 transition-transform duration-700 group-hover:scale-125" /><span className="absolute -right-2 top-12 h-28 w-28 rounded-full border border-white/[.07]" />
              <span className="relative flex h-full min-h-[205px] sm:min-h-[280px] flex-col justify-between"><span className="flex items-start justify-between"><Icon className={item.color + ' h-7 w-7'} strokeWidth={1.5}/><span className="text-[10px] tracking-[.2em] text-white/40">{item.n}</span></span><span><span className="mb-3 block text-2xl sm:text-[27px] font-agrandir-extrabold leading-tight">{item.title}</span><span className="block max-w-[290px] text-xs sm:text-sm leading-relaxed text-white/60">{item.desc}</span><span className="mt-6 inline-flex items-center gap-2 text-[10px] font-agrandir-bold uppercase tracking-[.15em] text-white group-hover:text-[#E3C36A]">{item.cta}<ArrowUpRight className="h-4 w-4"/></span></span></span>
            </button>); })}
        </div>
      </section>
      <section><div className="mb-2 border-b border-white/10 pb-3"><h2 className="text-xs font-agrandir-bold uppercase tracking-[.18em] text-neutral-300">{en ? 'Community & journal' : 'Communauté & journal'}</h2></div><div className="divide-y divide-white/10">
        {links.map((item,index) => { const Icon=item.icon; return <button key={item.page} type="button" onClick={() => go(item.page)} className="group flex w-full items-center gap-4 py-5 text-left transition-colors hover:text-[#E3C36A]"><span className="w-7 shrink-0 text-[10px] text-neutral-600">0{index+1}</span><Icon className="h-5 w-5 shrink-0 text-[#D4AF37]" strokeWidth={1.6}/><span className="min-w-0 flex-1"><span className="block text-sm sm:text-base font-agrandir-bold text-white">{item.title}</span><span className="mt-1 block text-xs text-neutral-500">{item.desc}</span></span><ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-500 group-hover:text-[#D4AF37]"/></button>; })}
      </div></section>
    </main>
  );
};
