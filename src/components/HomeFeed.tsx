import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import blackCardImage from '../assets/images/black_card_hero_banner_1795099705118.jpg';
import backstageImage from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import memoriesImage from '../assets/images/concert_memories_crowd_1795735706315.jpg';
import voiceImage from '../assets/images/backstage_studio_session_1795735706831.jpg';
import giftImage from '../assets/images/flash_vip_drop_1795735706997.jpg';

type QuickAccessItem = {
  id: string;
  title: string;
  page: 'member_card' | 'backstage' | 'memories' | 'suggestions' | 'flash_drops';
  image: string;
  position?: string;
};

const getEventTimestamp = (event: ConcertEvent) => {
  const rawDate = String(event.date || '').slice(0, 10);
  const rawTime = String(event.time || '20:00').slice(0, 8);
  const normalizedTime = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : rawTime.slice(0, 5);
  const timestamp = new Date(`${rawDate}T${normalizedTime}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : new Date(rawDate).getTime();
};

const EventCountdown: React.FC<{ event: ConcertEvent }> = ({ event }) => {
  const target = useMemo(() => getEventTimestamp(event), [event.date, event.time]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!Number.isFinite(target) || target <= now) return null;
  const remaining = Math.floor((target - now) / 1000);
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const pad = (value: number) => String(value).padStart(2, '0');

  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 bg-black/45 px-2.5 py-1.5 text-[10px] font-agrandir-semibold tracking-[0.08em] text-white backdrop-blur-sm sm:right-5 sm:top-5 sm:text-xs" aria-label="Compte à rebours avant le concert">
      {days > 0 && <span>{days}J</span>}
      <span>{pad(hours)}H</span><span>{pad(minutes)}M</span><span>{pad(seconds)}S</span>
    </div>
  );
};

export const HomeFeed: React.FC = () => {
  const {
    events,
    setCurrentPage,
    setSelectedEventSlug,
    language,
  } = useApp();
  const isEn = language === 'en';

  // Keep the existing event records intact; only present upcoming, non-draft productions here.
  const activeSlides = useMemo(
    () => events
      .filter((event) => event.status !== 'draft' && getEventTimestamp(event) > Date.now())
      .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b)),
    [events]
  );
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const featuredRowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  const scrollToSlide = (index: number) => {
    const container = featuredRowRef.current;
    const card = cardRefs.current[index];
    if (!container || !card) return;
    isProgrammaticScroll.current = true;
    setCurrentSlideIndex(index);
    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const offset = cardRect.left - containerRect.left - (container.clientWidth - cardRect.width) / 2;
    container.scrollBy({ left: offset, behavior: 'smooth' });
    window.setTimeout(() => { isProgrammaticScroll.current = false; }, 550);
  };

  const handleContainerScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      const container = featuredRowRef.current;
      if (!container) return;
      const center = container.getBoundingClientRect().left + container.clientWidth / 2;
      let closestIndex = 0;
      let minDistance = Infinity;
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const distance = Math.abs(center - (rect.left + rect.width / 2));
        if (distance < minDistance) { minDistance = distance; closestIndex = index; }
      });
      setCurrentSlideIndex(closestIndex);
    });
  };

  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = window.setInterval(() => {
      if (!isProgrammaticScroll.current) {
        setCurrentSlideIndex((previous) => {
          const next = (previous + 1) % activeSlides.length;
          scrollToSlide(next);
          return next;
        });
      }
    }, 7000);
    return () => window.clearInterval(interval);
  }, [activeSlides.length]);

  const handleViewAll = () => setCurrentPage('discover');
  const handleViewDetails = (event: ConcertEvent) => {
    setSelectedEventSlug(event.slug || event.id);
    setCurrentPage('event_detail');
  };

  const quickAccessItems: QuickAccessItem[] = [
    { id: 'black-card', title: 'BLACK CARD', page: 'member_card', image: blackCardImage, position: 'center 44%' },
    { id: 'backstage', title: 'BACKSTAGE', page: 'backstage', image: backstageImage },
    { id: 'memories', title: 'MEMORIES', page: 'memories', image: memoriesImage },
    { id: 'voice', title: 'TA VOIX', page: 'suggestions', image: voiceImage },
    { id: 'gift', title: 'GIFT & AVANTAGES', page: 'flash_drops', image: giftImage },
  ];

  return (
    <div className="home-editorial w-full min-h-screen max-w-full overflow-x-clip bg-[#050505] pb-0 text-white">
      <section className="home-hero relative isolate w-full overflow-hidden pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:pt-0">
        <div className="home-hero-frame relative h-[54svh] min-h-[340px] max-h-[720px] w-full overflow-hidden bg-[#111] sm:h-[62svh]">
          <img src={memoriesImage} alt={isEn ? 'Live concert atmosphere' : 'Ambiance de concert'} className="absolute inset-0 h-full w-full object-cover object-center" fetchPriority="high" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/15 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />
          <div className="absolute bottom-7 left-5 right-5 sm:bottom-12 sm:left-10 lg:bottom-16 lg:left-16">
            <h1 className="max-w-4xl text-[clamp(2.4rem,7.5vw,7rem)] font-agrandir-extrabold uppercase leading-[0.9] tracking-[-0.055em]">
              {isEn ? 'Live beyond the stage.' : 'Vivez au-delà de la scène.'}
            </h1>
            <button type="button" onClick={() => document.getElementById('home-upcoming-events')?.scrollIntoView({ behavior: 'smooth' })} className="mt-5 inline-flex min-h-10 items-center gap-4 border border-white bg-white px-4 text-[10px] font-agrandir-extrabold uppercase tracking-[0.13em] text-black transition-colors hover:bg-transparent hover:text-white">
              {isEn ? 'Explore events' : 'Découvrir les événements'} <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      <section id="home-upcoming-events" className="home-events w-full pt-5 sm:pt-7">
        <div className="mb-3 flex items-center justify-between border-b border-white/15 px-4 pb-2.5 sm:px-7 lg:px-10">
          <h2 className="text-lg font-agrandir-extrabold uppercase tracking-[-0.025em] sm:text-2xl">ÉVÉNEMENTS</h2>
          <button type="button" onClick={handleViewAll} className="inline-flex min-h-9 items-center gap-2 text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-65">
            VOIR TOUT <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>

        {activeSlides.length > 0 ? (
          <>
            <div className="hidden justify-end gap-2 px-7 pb-2 md:flex lg:px-10">
              <button type="button" onClick={() => scrollToSlide((currentSlideIndex - 1 + activeSlides.length) % activeSlides.length)} aria-label="Événement précédent" className="flex h-9 w-9 items-center justify-center border border-white/25 text-white hover:bg-white hover:text-black"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => scrollToSlide((currentSlideIndex + 1) % activeSlides.length)} aria-label="Événement suivant" className="flex h-9 w-9 items-center justify-center border border-white/25 text-white hover:bg-white hover:text-black"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div ref={featuredRowRef} onScroll={handleContainerScroll} className="home-events-track flex snap-x snap-mandatory items-stretch gap-2.5 overflow-x-auto px-0 pb-2 pt-1 sm:gap-4 lg:gap-5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {activeSlides.map((event, index) => (
                <button
                  key={event.id}
                  ref={(element) => { cardRefs.current[index] = element; }}
                  type="button"
                  onClick={() => handleViewDetails(event)}
                  className={`home-event-poster group relative block aspect-[4/5] w-[84vw] max-w-[440px] shrink-0 snap-start overflow-hidden bg-[#111] text-left sm:w-[48vw] lg:w-[32vw] ${index === currentSlideIndex ? 'opacity-100' : 'opacity-90'}`}
                  aria-label={`${event.artist} EN CONCERT — Découvrir`}
                >
                  <img src={event.officialPoster || event.bannerImage} alt={event.title || event.artist} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />
                  <EventCountdown event={event} />
                  <span className="absolute bottom-5 left-4 right-4 sm:bottom-7 sm:left-6">
                    <span className="block text-[clamp(1.2rem,3vw,2rem)] font-agrandir-extrabold uppercase leading-[0.95] tracking-[-0.025em] text-white">{event.artist}</span>
                    <span className="mt-1.5 block text-[9px] font-agrandir-semibold uppercase tracking-[0.22em] text-white/80">EN CONCERT</span>
                    <span className="mt-4 inline-flex items-center gap-2 border-b border-white pb-1 text-[9px] font-agrandir-extrabold uppercase tracking-[0.16em] text-white">DÉCOUVRIR <ArrowUpRight className="h-3.5 w-3.5" /></span>
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-xs uppercase tracking-wider text-white/50">{isEn ? 'No upcoming events at the moment.' : 'Aucun événement à venir pour le moment.'}</div>
        )}
      </section>

      <section className="home-quick-access mt-4 w-full overflow-hidden">
        <div className="home-quick-track flex w-full snap-x snap-mandatory items-stretch overflow-x-auto px-0 pb-1" aria-label={isEn ? 'Quick access' : 'Accès rapide'}>
          {quickAccessItems.map((item, index) => (
            <button key={item.id} type="button" onClick={() => setCurrentPage(item.page)} className={`home-quick-tile group relative h-[190px] w-[62vw] min-w-[210px] max-w-[330px] shrink-0 snap-start overflow-hidden border border-white/20 text-left sm:h-[230px] sm:w-[25vw] lg:h-[270px] lg:w-[20vw] ${index ? '-ml-3 sm:-ml-4' : ''}`} style={{ zIndex: index + 1 }} aria-label={item.title}>
              <img src={item.image} alt="" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${item.position || ''}`} />
              <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/5" />
              <span className="absolute bottom-4 left-4 right-3 text-[11px] font-agrandir-extrabold uppercase tracking-[0.12em] text-white sm:bottom-5 sm:left-5 sm:text-xs">{item.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-club mt-4 w-full pb-0">
        <div className="relative isolate min-h-[220px] w-full overflow-hidden border-y border-white/15 bg-[#111] sm:min-h-[290px]">
          <img src={blackCardImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/65 to-black/15" />
          <div className="relative flex min-h-[220px] flex-col items-start justify-center px-5 py-8 sm:min-h-[290px] sm:px-10 lg:px-16">
            <h2 className="text-3xl font-agrandir-extrabold uppercase leading-none tracking-[-0.04em] sm:text-5xl">LUMARÉEL CLUB</h2>
            <button type="button" onClick={() => setCurrentPage('rewards')} className="mt-5 inline-flex min-h-10 items-center gap-4 border border-white bg-white px-4 text-[9px] font-agrandir-extrabold uppercase tracking-[0.14em] text-black transition-colors hover:bg-transparent hover:text-white">
              {isEn ? 'Discover the Club' : 'Découvrir le Club'} <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
