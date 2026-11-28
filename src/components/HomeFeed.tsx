import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ConcertEvent } from '../types';
import { ChevronLeft, ChevronRight, ArrowUpRight, CreditCard, Gift, Clapperboard, Camera, Mic2, Instagram, Facebook } from 'lucide-react';

const getEventTimestamp = (event: ConcertEvent) => {
  const rawDate = String(event.date || '').slice(0, 10);
  const rawTime = String(event.time || '20:00').slice(0, 8);
  const normalizedTime = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : rawTime.slice(0, 5);
  const timestamp = new Date(`${rawDate}T${normalizedTime}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : new Date(rawDate).getTime();
};

export const HomeFeed: React.FC = () => {
  const {
    events,
    setCurrentPage,
    setSelectedEventSlug,
    language,
    setCheckoutEvent,
  } = useApp();
  const { isStandalone } = usePWAInstall();
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
    const buyEvent = event;
    setCheckoutEvent(buyEvent);
  };
  const handleViewAll = () => setCurrentPage('discover');
  const handleViewDetails = (event: ConcertEvent) => {
    setSelectedEventSlug(event.slug || event.id);
    setCurrentPage('event_detail');
  };

  const quickAccessItems = [
    { id: 'black-card', title: 'LUMARÉEL BLACK CARD', subtitle: isEn ? 'Privileged access to LUMARÉEL' : 'Accès privilégié au Club', page: 'member_card' as const, icon: CreditCard },
    { id: 'gift', title: isEn ? 'GIFT POINTS & REFERRALS' : 'GIFT POINTS & PARRAINAGE', subtitle: isEn ? 'Rewards, surprises, flash sales & 500 FCFA per friend' : 'Récompenses, surprises, ventes flash & 500 F CFA par ami', page: 'rewards' as const, icon: Gift },
    { id: 'backstage', title: 'BACKSTAGE', subtitle: isEn ? 'Ballon, studio sessions & exclusive content' : 'Ballon, sessions studio & contenus exclusifs', page: 'backstage' as const, icon: Clapperboard },
    { id: 'memories', title: isEn ? 'MY MOMENTS' : 'MES MOMENTS', subtitle: isEn ? 'Official photos, recaps & shared memories' : 'Photos officielles, récaps & souvenirs partagés', page: 'memories' as const, icon: Camera },
    { id: 'voice', title: isEn ? 'YOUR VOICE' : 'TA VOIX', subtitle: isEn ? 'Suggest artists, venues & event ideas' : 'Proposez vos artistes, lieux & idées d’événements', page: 'suggestions' as const, icon: Mic2 },
  ];

  return (
    <div
      className={`home-editorial w-full max-w-full overflow-x-clip bg-[#050505] text-white flex flex-col justify-between h-[100dvh] overflow-y-hidden sm:h-auto sm:min-h-screen sm:overflow-y-visible ${
        isStandalone ? 'pb-[calc(4.6rem+env(safe-area-inset-bottom,0px))] sm:pb-0' : 'pb-[env(safe-area-inset-bottom,0px)] sm:pb-0'
      }`}
    >
      <section
        id="home-upcoming-events"
        className="home-events w-full shrink-0 pt-[calc(3.55rem+env(safe-area-inset-top,0px))] sm:pt-7"
      >
        <div className="mb-2 flex items-center justify-between border-b border-white/15 px-4 pb-1.5 sm:mb-3 sm:px-7 sm:pb-2.5 lg:px-10">
          <h2 className="text-[15px] font-agrandir-extrabold uppercase tracking-[-0.025em] sm:text-2xl">
            {isEn ? 'EVENTS' : 'ÉVÉNEMENTS'}
          </h2>
          <button
            type="button"
            onClick={handleViewAll}
            className="inline-flex min-h-8 items-center gap-1.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-65 cursor-pointer sm:min-h-9 sm:gap-2"
          >
            {isEn ? 'VIEW ALL' : 'VOIR TOUT'} <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
        </div>

        {activeSlides.length > 0 ? (
          <>
            <div className="hidden justify-end gap-2 px-7 pb-2 md:flex lg:px-10">
              <button type="button" onClick={() => scrollToSlide((currentSlideIndex - 1 + activeSlides.length) % activeSlides.length)} aria-label="Événement précédent" className="flex h-9 w-9 items-center justify-center border border-white/25 text-white hover:bg-white hover:text-black cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => scrollToSlide((currentSlideIndex + 1) % activeSlides.length)} aria-label="Événement suivant" className="flex h-9 w-9 items-center justify-center border border-white/25 text-white hover:bg-white hover:text-black cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div
              ref={featuredRowRef}
              onScroll={handleContainerScroll}
              className="home-events-track flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-1.5 pt-0.5 sm:gap-4 sm:px-7 sm:pb-3 sm:pt-1 lg:gap-5 lg:px-10"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {activeSlides.map((event, index) => (
                <div
                  key={event.id}
                  ref={(element) => { cardRefs.current[index] = element; }}
                  className="home-event-card w-[68vw] max-w-[280px] shrink-0 snap-start bg-transparent text-left sm:w-[42vw] sm:max-w-[390px] lg:w-[30vw]"
                >
                  <button
                    type="button"
                    onClick={() => handleViewDetails(event)}
                    className="home-event-media group block w-full overflow-hidden rounded-[14px] sm:rounded-[18px] bg-[#111] text-left cursor-pointer"
                    aria-label={`${event.artist} — ${isEn ? 'Event details' : 'Détails du concert'}`}
                  >
                    <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#111]">
                      <img
                        src={event.officialPoster || event.bannerImage}
                        alt={event.title || event.artist}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                    </div>
                  </button>
                  <div className="pt-2 sm:pt-3">
                    <h3 className="truncate text-sm font-agrandir-extrabold uppercase leading-tight tracking-[-0.02em] text-white sm:text-xl">
                      {event.artist} EN CONCERT
                    </h3>
                    <p className="mt-0.5 truncate text-[10px] font-agrandir-semibold text-white/60 sm:mt-1 sm:text-xs">
                      {event.venue}{event.city ? ` · ${event.city}` : ''} · {formatEventDate(event.date)}
                    </p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 sm:mt-3 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => handleBuyTickets(event)}
                        className="home-event-action inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-[10px] bg-white px-2 text-[9px] font-agrandir-extrabold uppercase tracking-[0.08em] text-black transition-colors hover:bg-white/85 cursor-pointer sm:min-h-11 sm:gap-2 sm:text-[10px]"
                      >
                        <span aria-hidden="true">▣</span> {isEn ? 'Buy tickets' : 'Acheter tickets'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewDetails(event)}
                        className="home-event-action inline-flex min-h-[38px] items-center justify-center rounded-[10px] border border-white/30 px-2 text-[9px] font-agrandir-extrabold uppercase tracking-[0.06em] text-white transition-colors hover:bg-white hover:text-black cursor-pointer sm:min-h-11 sm:text-[10px]"
                      >
                        {isEn ? 'Details' : 'Détails'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-4 py-6 text-xs uppercase tracking-wider text-white/50 sm:px-7 lg:px-10">
            {isEn ? 'No upcoming events at the moment.' : 'Aucun événement à venir pour le moment.'}
          </div>
        )}
      </section>

      <section
        className="home-quick-access mx-auto mt-2 w-full shrink-0 px-3 sm:mt-6 sm:px-7 lg:px-10"
        aria-label={isEn ? 'Quick access' : 'Accès rapide'}
      >
        <div className="overflow-hidden rounded-[20px] border border-white/12 bg-[#0b0b0b] px-3 sm:rounded-[26px] sm:border-white/15 sm:px-6">
          {quickAccessItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentPage(item.page)}
                className="group flex min-h-[44px] w-full items-center gap-3 border-b border-white/[0.08] py-1.5 text-left last:border-b-0 cursor-pointer sm:min-h-[84px] sm:gap-4 sm:border-white/10 sm:py-3.5"
              >
                <span
                  className={
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border ' +
                    (index === 0 ? 'border-white/25 bg-white/[0.09]' : 'border-white/10 bg-[#171717]') +
                    ' sm:h-[52px] sm:w-[52px] sm:rounded-[16px]'
                  }
                >
                  <Icon className="h-4 w-4 text-white/85 sm:h-[21px] sm:w-[21px]" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-agrandir-extrabold uppercase tracking-[0.08em] text-white sm:text-sm">
                    {item.title}
                  </span>
                  <span className="mt-0.5 hidden text-xs leading-snug text-neutral-400 sm:block">
                    {item.subtitle}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-white sm:h-5 sm:w-5" />
              </button>
            );
          })}
        </div>
      </section>

      <footer className="mx-auto mt-1.5 flex w-full max-w-6xl shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5 text-center sm:mt-8 sm:px-10 sm:py-7">
        <p className="text-[9px] uppercase tracking-[0.18em] text-neutral-500 sm:text-[10px]">
          © {new Date().getFullYear()} LUMARÉEL
        </p>
        <div className="flex items-center gap-3.5 text-neutral-400 sm:gap-5">
          <a href="https://www.instagram.com/lumareelco/" target="_blank" rel="noreferrer" aria-label="Instagram LUMARÉEL" className="transition-colors hover:text-white"><Instagram className="h-4 w-4 sm:h-5 sm:w-5" /></a>
          <a href="https://www.facebook.com/share/19oZK7vQvR/?mibextid=wwXIfr" target="_blank" rel="noreferrer" aria-label="Facebook LUMARÉEL" className="transition-colors hover:text-white"><Facebook className="h-4 w-4 sm:h-5 sm:w-5" /></a>
          <a href="https://www.tiktok.com/@lumareelco" target="_blank" rel="noreferrer" aria-label="TikTok LUMARÉEL" className="text-[10px] font-agrandir-extrabold uppercase tracking-wider transition-colors hover:text-white sm:text-[11px]">TikTok</a>
          <a href="https://www.snapchat.com/add/lumareelco" target="_blank" rel="noreferrer" aria-label="Snapchat LUMARÉEL" className="text-[10px] font-agrandir-extrabold uppercase tracking-wider transition-colors hover:text-white sm:text-[11px]">Snapchat</a>
        </div>
      </footer>
    </div>
  );
};

