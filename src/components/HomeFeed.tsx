import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { ChevronLeft, ChevronRight, ArrowUpRight, CreditCard, Gift, Clapperboard, Camera, Mic2, Instagram, Facebook } from 'lucide-react';

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

  const quickAccessItems = [
    { id: 'black-card', title: 'BLACK CARD', subtitle: 'Votre accès privilégié à LUMARÉEL', page: 'member_card' as const, icon: CreditCard },
    { id: 'gift', title: 'GIFTS, POINTS & PARRAINAGE', subtitle: 'Surprises, ventes flash, points & 500 F CFA par ami', page: 'flash_drops' as const, icon: Gift },
    { id: 'backstage', title: 'BACKSTAGE', subtitle: 'Balances, sessions studio & contenus exclusifs', page: 'backstage' as const, icon: Clapperboard },
    { id: 'memories', title: 'MES MOMENTS', subtitle: 'Photos officielles, récaps & souvenirs partagés', page: 'memories' as const, icon: Camera },
    { id: 'voice', title: 'TA VOIX', subtitle: 'Proposez vos artistes, lieux & idées d’événements', page: 'suggestions' as const, icon: Mic2 },
  ];

  return (
    <div className="home-editorial w-full min-h-screen max-w-full overflow-x-clip bg-[#050505] pb-0 text-white">
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

      <section className="home-quick-access mx-auto mt-7 w-full max-w-6xl px-4 sm:px-7 lg:px-10" aria-label={isEn ? "Quick access" : "Accès rapide"}>
        <div className="overflow-hidden rounded-[28px] border border-white/15 bg-[#0b0b0b] px-5 sm:px-8">
          {quickAccessItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button key={item.id} type="button" onClick={() => setCurrentPage(item.page)} className="group flex min-h-[104px] w-full items-center gap-4 border-b border-white/10 py-4 text-left last:border-b-0 sm:min-h-[132px] sm:gap-6 sm:py-5">
                <span className={"flex h-[62px] w-[62px] shrink-0 items-center justify-center rounded-[20px] border " + (index === 0 ? "border-white/25 bg-white/[0.09]" : "border-white/10 bg-[#171717]") + " sm:h-[76px] sm:w-[76px]"}>
                  <Icon className="h-7 w-7 text-white/85 sm:h-8 sm:w-8" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-agrandir-extrabold uppercase tracking-[0.09em] text-white sm:text-xl">{item.title}</span>
                  <span className="mt-1 block text-[11px] leading-snug text-neutral-400 sm:text-base">{item.subtitle}</span>
                </span>
                <ChevronRight className="h-6 w-6 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-white" />
              </button>
            );
          })}
        </div>
      </section>

      <footer className="mx-auto mt-8 flex w-full max-w-6xl flex-col items-center gap-4 border-t border-white/10 px-5 py-7 text-center sm:flex-row sm:justify-between sm:px-10">
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">© {new Date().getFullYear()} LUMARÉEL</p>
        <div className="flex items-center gap-5 text-neutral-400">
          <a href="https://www.instagram.com/lumareelco/" target="_blank" rel="noreferrer" aria-label="Instagram LUMARÉEL" className="transition-colors hover:text-white"><Instagram className="h-5 w-5" /></a>
          <a href="https://www.facebook.com/share/19oZK7vQvR/?mibextid=wwXIfr" target="_blank" rel="noreferrer" aria-label="Facebook LUMARÉEL" className="transition-colors hover:text-white"><Facebook className="h-5 w-5" /></a>
          <a href="https://www.tiktok.com/@lumareelco" target="_blank" rel="noreferrer" aria-label="TikTok LUMARÉEL" className="text-[11px] font-agrandir-extrabold uppercase tracking-wider transition-colors hover:text-white">TikTok</a><a href="https://www.snapchat.com/add/lumareelco" target="_blank" rel="noreferrer" aria-label="Snapchat LUMARÉEL" className="text-[11px] font-agrandir-extrabold uppercase tracking-wider transition-colors hover:text-white">Snapchat</a>
        </div>
      </footer>
    </div>
  );
};
