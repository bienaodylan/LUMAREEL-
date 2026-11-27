import React, { useEffect, useRef } from 'react';
import { animate, motion, useInView, useMotionValue, useTransform } from 'framer-motion';
import { ArrowUpRight, Gift, MessageCircle, Sparkles, Star, Ticket, Users, Video } from 'lucide-react';
import imgFlash from '../assets/images/flash_vip_drop_1795735706997.jpg';
import imgCrowd from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import imgLounge from '../assets/images/black_card_vip_mezzanine_1794694903429.jpg';
import imgNight from '../assets/images/black_card_hero_night_tall_1794694902515.jpg';
import imgBackstage from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import imgMemories from '../assets/images/concert_memories_crowd_1795735706315.jpg';
import imgStage from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';
import imgHero from '../assets/images/dark_card_hero_backdrop_1795099845525.jpg';
import type { RewardsTab } from './RewardsHubView';

type PortalPage = 'backstage' | 'memories' | 'suggestions';

interface ExplorerItem {
  id: string;
  kind: 'tab' | 'portal';
  tab?: RewardsTab;
  page?: PortalPage;
  img: string;
  icon: React.ElementType;
  kickerFr: string;
  kickerEn: string;
  titleFr: string;
  titleEn: string;
}

const ITEMS: ExplorerItem[] = [
  { id: 'gifts', kind: 'tab', tab: 'gifts', img: imgFlash, icon: Gift, kickerFr: 'Surprises', kickerEn: 'Surprises', titleFr: 'Gifts & Ventes Flash', titleEn: 'Gifts & Flash Sales' },
  { id: 'points', kind: 'tab', tab: 'points', img: imgCrowd, icon: Star, kickerFr: 'Fidélité', kickerEn: 'Loyalty', titleFr: 'Points & Défis', titleEn: 'Points & Challenges' },
  { id: 'exchange', kind: 'tab', tab: 'exchange', img: imgLounge, icon: Ticket, kickerFr: 'Rewards Store', kickerEn: 'Rewards Store', titleFr: 'Échanger mes points', titleEn: 'Redeem my points' },
  { id: 'referral', kind: 'tab', tab: 'referral', img: imgNight, icon: Users, kickerFr: '500 F CFA / ami', kickerEn: '500 FCFA / friend', titleFr: 'Parrainage', titleEn: 'Referrals' },
  { id: 'backstage', kind: 'portal', page: 'backstage', img: imgBackstage, icon: Video, kickerFr: 'Exclusif', kickerEn: 'Exclusive', titleFr: 'Backstage', titleEn: 'Backstage' },
  { id: 'memories', kind: 'portal', page: 'memories', img: imgMemories, icon: Sparkles, kickerFr: 'Après le concert', kickerEn: 'After the show', titleFr: 'Souvenirs', titleEn: 'Memories' },
  { id: 'suggestions', kind: 'portal', page: 'suggestions', img: imgStage, icon: MessageCircle, kickerFr: 'Communauté', kickerEn: 'Community', titleFr: 'Ta Voix', titleEn: 'Your Voice' },
];

const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('fr-FR'));
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.4, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [inView, value, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
};

interface Props {
  isEn: boolean;
  points: number;
  creditFcfa: number;
  activeTab: RewardsTab;
  onSelectTab: (tab: RewardsTab) => void;
  onOpenPage: (page: PortalPage) => void;
}

export const ClubExplorer: React.FC<Props> = ({ isEn, points, creditFcfa, activeTab, onSelectTab, onOpenPage }) => {
  const handle = (item: ExplorerItem) => {
    if (item.kind === 'portal' && item.page) return onOpenPage(item.page);
    if (item.tab) {
      onSelectTab(item.tab);
      requestAnimationFrame(() =>
        document.getElementById('club-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      );
    }
  };

  return (
    <div className="mb-10">
      {/* HERO CINÉMATIQUE */}
      <section className="relative -mx-4 sm:mx-0 overflow-hidden sm:rounded-[2rem] min-h-[340px] sm:min-h-[420px] flex items-end">
        <motion.img
          src={imgHero}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ scale: 1.18, opacity: 0 }}
          animate={{ scale: 1.04, opacity: 0.55 }}
          transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/10" />
        <motion.div
          aria-hidden
          className="absolute -top-24 right-[-10%] w-[420px] h-[420px] rounded-full bg-[#D4AF37]/20 blur-[120px]"
          animate={{ opacity: [0.35, 0.7, 0.35], scale: [1, 1.12, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="relative w-full px-5 sm:px-10 pb-8 sm:pb-10 pt-24">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-[11px] tracking-[0.32em] uppercase text-[#D4AF37] mb-3"
          >
            {isEn ? 'LUMARÉEL Club' : 'Club LUMARÉEL'}
          </motion.p>
          <h1 className="font-agrandir-extrabold text-4xl sm:text-6xl leading-[0.98] tracking-tight overflow-hidden">
            {(isEn ? ['Explore', 'the Club.'] : ['Explorez', 'le Club.']).map((line, i) => (
              <motion.span
                key={line}
                className="block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                {line}
              </motion.span>
            ))}
          </h1>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="mt-6 inline-flex items-center gap-6 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/10 px-5 py-3.5"
          >
            <div>
              <div className="text-[11px] text-neutral-400">{isEn ? 'Points' : 'Points'}</div>
              <div className="text-2xl sm:text-3xl font-agrandir-extrabold text-[#D4AF37] tabular-nums leading-tight">
                <CountUp value={points} /> <span className="text-sm text-neutral-300">pts</span>
              </div>
            </div>
            <div className="h-9 w-px bg-white/15" />
            <div>
              <div className="text-[11px] text-neutral-400">{isEn ? 'Ticketing credit' : 'Crédit billetterie'}</div>
              <div className="text-xl sm:text-2xl font-agrandir-extrabold tabular-nums leading-tight">
                <CountUp value={creditFcfa} /> <span className="text-xs text-neutral-400">F CFA</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* RAIL EXPLORER */}
      <div className="flex items-end justify-between mt-9 mb-4">
        <h2 className="font-agrandir-extrabold text-lg sm:text-xl">{isEn ? 'Explore' : 'Explorer'}</h2>
        <span className="text-[11px] text-neutral-500">{isEn ? 'Swipe →' : 'Faites défiler →'}</span>
      </div>
      <div className="-mx-4 sm:-mx-8 lg:-mx-10 px-4 sm:px-8 lg:px-10 flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          const active = item.kind === 'tab' && item.tab === activeTab;
          return (
            <motion.button
              key={item.id}
              type="button"
              onClick={() => handle(item)}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative snap-start shrink-0 w-[62vw] max-w-[230px] sm:w-[220px] aspect-[3/4] rounded-3xl overflow-hidden text-left cursor-pointer border transition-colors ${
                active ? 'border-[#D4AF37] shadow-[0_0_0_1px_#D4AF37,0_20px_60px_-20px_rgba(212,175,55,0.5)]' : 'border-white/10'
              }`}
            >
              <img
                src={item.img}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute top-3 left-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center">
                <Icon className={`w-4 h-4 ${active ? 'text-[#D4AF37]' : 'text-white'}`} />
              </div>
              {item.kind === 'portal' && (
                <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-white/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              )}
              <div className="absolute bottom-0 inset-x-0 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF37] mb-1">{isEn ? item.kickerEn : item.kickerFr}</p>
                <p className="font-agrandir-extrabold text-lg leading-tight">{isEn ? item.titleEn : item.titleFr}</p>
              </div>
              {active && (
                <motion.span layoutId="club-active" className="absolute bottom-0 left-4 right-4 h-[3px] rounded-full bg-[#D4AF37]" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
