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
    setCheckoutEvent,
  } = useApp();
  const isEn = language === 'en';

  // Keep the existing event records intact; only present upcoming, non-draft productions here.
  const activeSlides = useMemo(
    () => events
      .filter((event) => event.status !== 'draft' && getEventTimestamp(event) > Date.now())
      .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b)),
    [events]
  );
  // Event navigation is intentionally user-controlled; no autoplay timer is registered.
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const featuredRowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
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

  const heroSlides = activeSlides;
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const heroRowRef = useRef<HTMLDivElement>(null);
  const scrollHeroTo = (index: number) => {
    const container = heroRowRef.current;
    if (!container || heroSlides.length === 0) return;
    const nextIndex = Math.max(0, Math.min(index, heroSlides.length - 1));
    container.scrollTo({ left: nextIndex * container.clientWidth, behavior: 'smooth' });
    setHeroSlideIndex(nextIndex);
  };
  const handleHeroScroll = () => {
    const container = heroRowRef.current;
    if (!container) return;
    const nextIndex = Math.round(container.scrollLeft / Math.max(container.clientWidth, 1));
    setHeroSlideIndex(Math.max(0, Math.min(nextIndex, heroSlides.length - 1)));
  };
  const heroEvent = heroSlides[heroSlideIndex] || heroSlides[0] || null;
  const formatEventDate = (date: string) => {
    const parsed = new Date(`${String(date || '').slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const handleBuyTickets = (event: ConcertEvent) => {
    // The existing checkout flow is opened directly, without changing the event record.
    const buyEvent = event;
    setCheckoutEvent(buyEvent);
  };
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
        {heroSlides.length > 0 ? (
          <div className="relative w-full">
            <div
              ref={heroRowRef}
              onScroll={handleHeroScroll}
              className="flex w-full snap-x snap-mandatory overflow-x-auto"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollBehavior: 'smooth' }}
              aria-label={isEn ? 'Featured concerts' : 'Concerts à découvrir'}
            >
              {heroSlides.map((event) => (
                <article key={event.id} className="home-hero-frame relative h-[66svh] min-h-[470px] max-h-[820px] w-full shrink-0 snap-start overflow-hidden bg-[#111] sm:h-[72svh]">
                  <img
                    src={event.artistPortrait || event.bannerImage || event.officialPoster}
                    alt={event.artist}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    fetchPriority="high"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/10" />
                  <EventCountdown event={event} />
                  <div className="absolute bottom-8 left-5 right-5 max-w-3xl sm:bottom-12 sm:left-10 lg:bottom-16 lg:left-16">
                    <h1 className="text-[clamp(2.5rem,7vw,6.5rem)] font-agrandir-extrabold uppercase leading-[0.88] tracking-[-0.055em]">
                      {event.artist}
                    </h1>
                    <p className="mt-3 text-xs font-agrandir-extrabold uppercase tracking-[0.3em] text-white sm:text-sm">EN CONCERT</p>
                    <div className="mt-5">
                      <button type="button" onClick={() => handleViewDetails(event)} className="inline-flex min-h-11 items-center gap-3 bg-white px-5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.16em] text-black transition-colors hover:bg-white/80">
                        {isEn ? 'Discover' : 'Découvrir'} <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {heroSlides.length > 1 && (
              <>
                <div className="absolute bottom-4 right-5 z-20 flex items-center gap-2 sm:bottom-6 sm:right-8">
                  <span className="text-[10px] font-agrandir-semibold tracking-[0.18em] text-white/75 tabular-nums">{String(heroSlideIndex + 1).padStart(2, '0')} / {String(heroSlides.length).padStart(2, '0')}</span>
                  <button type="button" onClick={() => scrollHeroTo(heroSlideIndex - 1)} disabled={heroSlideIndex === 0} aria-label={isEn ? 'Previous featured concert' : 'Concert précédent'} className="hidden h-9 w-9 items-center justify-center border border-white/45 text-white transition-colors hover:bg-white hover:text-black disabled:opacity-30 sm:flex"><ChevronLeft className="h-4 w-4" /></button>
                  <button type="button" onClick={() => scrollHeroTo(heroSlideIndex + 1)} disabled={heroSlideIndex >= heroSlides.length - 1} aria-label={isEn ? 'Next featured concert' : 'Concert suivant'} className="hidden h-9 w-9 items-center justify-center border border-white/45 text-white transition-colors hover:bg-white hover:text-black disabled:opacity-30 sm:flex"><ChevronRight className="h-4 w-4" /></button>
                </div>
                <div className="absolute bottom-5 left-5 z-20 flex gap-1.5 sm:hidden">
                  {heroSlides.map((event, index) => (
                    <button key={event.id} type="button" onClick={() => scrollHeroTo(index)} aria-label={`${isEn ? 'Go to concert' : 'Aller au concert'} ${index + 1}`} className={`h-1 transition-all ${index === heroSlideIndex ? 'w-6 bg-white' : 'w-2 bg-white/45'}`} />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex min-h-[55svh] items-end bg-[#111] px-5 pb-12 sm:px-10">
            <h1 className="text-5xl font-agrandir-extrabold uppercase">{isEn ? 'Live beyond the stage.' : 'Vivez au-delà de la scène.'}</h1>
          </div>
        )}
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
            <div ref={featuredRowRef} onScroll={handleContainerScroll} className="home-events-track flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-3 pt-1 sm:gap-4 sm:px-7 lg:gap-5 lg:px-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {activeSlides.map((event, index) => (
                <div
                  key={event.id}
                  ref={(element) => { cardRefs.current[index] = element; }}
                  className="home-event-card w-[78vw] max-w-[390px] shrink-0 snap-start bg-transparent text-left sm:w-[42vw] lg:w-[30vw]"
                >
                  <button type="button" onClick={() => handleViewDetails(event)} className="group block w-full overflow-hidden bg-[#111] text-left" aria-label={`${event.artist} — ${isEn ? 'Event details' : 'Détails du concert'}`}>
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#111]">
                      <img src={event.officialPoster || event.bannerImage} alt={event.title || event.artist} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
                    </div>
                  </button>
                  <div className="pt-3">
                    <h3 className="truncate text-base font-agrandir-extrabold uppercase leading-tight tracking-[-0.02em] text-white sm:text-xl">{event.artist} EN CONCERT</h3>
                    <p className="mt-1 truncate text-[11px] font-agrandir-semibold text-white/65 sm:text-xs">{event.venue}{event.city ? ` · ${event.city}` : ''} · {formatEventDate(event.date)}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => handleBuyTickets(event)} className="inline-flex min-h-11 items-center justify-center gap-2 bg-white px-2 text-[9px] font-agrandir-extrabold uppercase tracking-[0.08em] text-black transition-colors hover:bg-white/85 sm:text-[10px]">
                        <span aria-hidden="true">▣</span> {isEn ? 'Buy tickets' : 'Acheter tickets'}
                      </button>
                      <button type="button" onClick={() => handleViewDetails(event)} className="inline-flex min-h-11 items-center justify-center border border-white/35 px-2 text-[9px] font-agrandir-extrabold uppercase tracking-[0.06em] text-white transition-colors hover:bg-white hover:text-black sm:text-[10px]">
                        {isEn ? 'Concert details' : 'Détails du concert'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-8 text-xs uppercase tracking-wider text-white/50">{isEn ? 'No upcoming events at the moment.' : 'Aucun événement à venir pour le moment.'}</div>
        )}
      </section>

      <section className="home-quick-access mt-4 w-full overflow-hidden" aria-label={isEn ? 'Quick access' : 'Accès rapide'}>
        <div className="home-quick-track flex w-full flex-col gap-1.5 px-0 pb-1">
          {quickAccessItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              className="home-quick-tile group relative flex h-14 min-h-14 w-full items-center overflow-hidden border-y border-white/20 text-left sm:h-16 sm:min-h-16"
              aria-label={item.title}
            >
              <img
                src={item.image}
                alt=""
                className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03] ${item.position || ''}`}
              />
              <span className="absolute inset-0 bg-black/55 transition-colors duration-300 group-hover:bg-black/40" />
              <span className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-black/10" />
              <span className="relative z-10 px-4 text-[10px] font-agrandir-extrabold uppercase tracking-[0.16em] text-white sm:px-6 sm:text-xs">
                {item.title}
              </span>
              <ArrowUpRight className="relative z-10 ml-auto mr-4 h-4 w-4 text-white/85 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 sm:mr-6" />
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
