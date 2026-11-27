import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { ChevronLeft, ChevronRight, ArrowUpRight, Ticket } from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';
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

export const HomeFeed: React.FC = () => {
  const {
    events,
    setCurrentPage,
    setCheckoutEvent,
    setSelectedEventSlug,
    currentUser,
    setIsAuthModalOpen,
    showToast,
    language,
    setLanguage,
    t,
  } = useApp();
  const isEn = language === 'en';

  // The existing event source, filtering, carousel timing and booking handlers are preserved.
  const featuredSlides = events.filter((event) => event.isFeatured && event.status !== 'draft');
  const activeSlides = featuredSlides.length > 0 ? featuredSlides : events.slice(0, 3);
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
    const offset = cardRect.left - containerRect.left - (containerRect.width - cardRect.width) / 2;
    container.scrollBy({ left: offset, behavior: 'smooth' });
    window.setTimeout(() => { isProgrammaticScroll.current = false; }, 500);
  };

  const handleContainerScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
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
      if (closestIndex !== currentSlideIndex && closestIndex < activeSlides.length) {
        setCurrentSlideIndex(closestIndex);
      }
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

  const scrollFeaturedRow = (direction: 'left' | 'right') => {
    if (!activeSlides.length) return;
    const next = direction === 'left'
      ? (currentSlideIndex === 0 ? activeSlides.length - 1 : currentSlideIndex - 1)
      : (currentSlideIndex + 1) % activeSlides.length;
    scrollToSlide(next);
  };

  const handleBookNow = (event: ConcertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast(isEn ? 'Account required to book tickets.' : 'Création de compte obligatoire pour réserver vos billets.', 'info');
      setCheckoutEvent(event);
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutEvent(event);
  };

  const handleViewDetails = (event: ConcertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <div className="home-editorial min-h-screen w-full max-w-full overflow-x-clip bg-[#050505] text-white pb-16 select-none">
      {/* 01 — HERO */}
      <section className="home-hero relative isolate mx-auto w-full max-w-[1600px] px-3 sm:px-6 lg:px-10 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:pt-7">
        <div className="home-hero-frame relative min-h-[300px] h-[48svh] max-h-[590px] overflow-hidden bg-[#111]">
          <img
            src={memoriesImage}
            alt={isEn ? 'Live concert atmosphere' : 'Ambiance immersive de concert'}
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-black/5" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
          <div className="absolute left-5 right-5 bottom-6 sm:left-10 sm:bottom-10 lg:left-14 lg:bottom-14">
            <p className="mb-3 text-[9px] sm:text-[10px] uppercase tracking-[0.32em] text-white/75">LUMARÉEL · LIVE EXPERIENCES</p>
            <h1 className="max-w-3xl text-[clamp(2.2rem,7vw,5.8rem)] font-agrandir-extrabold uppercase leading-[0.92] tracking-[-0.055em]">
              {isEn ? 'Live beyond the stage.' : 'Vivez au-delà de la scène.'}
            </h1>
            <button
              type="button"
              onClick={() => document.getElementById('home-upcoming-events')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              className="mt-6 inline-flex min-h-11 items-center gap-5 border border-white/80 bg-white px-5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.16em] text-black transition-colors hover:bg-transparent hover:text-white"
            >
              {isEn ? 'Explore events' : 'Découvrir les événements'}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute right-5 top-5 hidden sm:block text-[9px] tracking-[0.24em] text-white/70">ABIDJAN · CULTURE · LIVE</div>
        </div>
      </section>

      {/* 02 — UPCOMING EVENTS: data, carousel mechanics and booking actions unchanged */}
      <section id="home-upcoming-events" className="home-section home-events relative z-10 mx-auto w-full max-w-[1600px] px-4 pt-8 sm:px-6 sm:pt-12 lg:px-10">
        <div className="mb-4 flex items-end justify-between border-b border-white/15 pb-3">
          <div className="min-w-0">
            <p className="mb-1 text-[9px] uppercase tracking-[0.25em] text-[#777]">LUMARÉEL · AGENDA</p>
            <h2 className="text-base font-agrandir-extrabold uppercase tracking-[-0.02em] sm:text-xl">{t('home.upcomingTitle')}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden items-center border border-white/15 text-[10px] tracking-wider md:flex">
              <button type="button" onClick={() => setLanguage('fr')} className={`px-3 py-2 transition-colors ${language === 'fr' ? 'bg-white text-black' : 'text-[#888] hover:text-white'}`}>FR</button>
              <button type="button" onClick={() => setLanguage('en')} className={`px-3 py-2 transition-colors ${language === 'en' ? 'bg-white text-black' : 'text-[#888] hover:text-white'}`}>EN</button>
            </div>
            <button type="button" onClick={() => scrollFeaturedRow('left')} aria-label={t('home.prevConcert')} className="flex h-9 w-9 items-center justify-center border border-white/25 text-white transition-colors hover:bg-white hover:text-black"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" onClick={() => scrollFeaturedRow('right')} aria-label={t('home.nextConcert')} className="flex h-9 w-9 items-center justify-center border border-white/25 text-white transition-colors hover:bg-white hover:text-black"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        <div
          ref={featuredRowRef}
          onScroll={handleContainerScroll}
          className="flex snap-x snap-mandatory items-start gap-4 overflow-x-auto pb-4 pt-2 scroll-smooth sm:gap-6"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeSlides.map((event, index) => {
            const isActive = index === currentSlideIndex;
            return (
              <article
                key={event.id}
                ref={(element) => { cardRefs.current[index] = element; }}
                onClick={() => scrollToSlide(index)}
                className="group w-[calc(100vw-3rem)] max-w-[calc(100vw-3rem)] shrink-0 snap-start cursor-pointer sm:w-[390px] sm:max-w-none lg:w-[420px]"
              >
                <div className={`relative aspect-[16/9] w-full overflow-hidden bg-[#111] transition-all duration-300 ${isActive ? 'outline outline-1 outline-white outline-offset-2' : 'opacity-85 hover:opacity-100'}`}>
                  <img src={event.officialPoster || event.bannerImage} alt={event.title} referrerPolicy="no-referrer" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                </div>
                <div className="flex flex-col gap-3 pt-4">
                  <div>
                    <h3 className="truncate text-sm font-agrandir-extrabold uppercase tracking-tight text-white sm:text-base">{event.artist} {t('home.inConcert')}</h3>
                    <p className="mt-1 truncate text-[11px] text-[#999]"><span className="text-white">{event.venue}</span> · {formatDateLong(event.date, language)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={(e) => handleBookNow(event, e)} className="flex min-h-11 items-center justify-center gap-2 bg-white px-3 text-[9px] font-agrandir-extrabold uppercase tracking-wide text-black transition-colors hover:bg-[#ddd] sm:text-[10px]">
                      <Ticket className="h-4 w-4" />{t('home.buyTickets')}
                    </button>
                    <button type="button" onClick={(e) => handleViewDetails(event, e)} className="min-h-11 border border-white/30 px-3 text-[9px] font-agrandir-semibold uppercase tracking-wide text-white transition-colors hover:bg-white hover:text-black sm:text-[10px]">
                      {isEn ? 'Event details' : 'Détails du concert'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* 03 — QUICK ACCESS: one horizontally scrollable visual ribbon */}
      <section className="home-quick-access mt-7 w-full overflow-hidden border-y border-white/15 py-5 sm:mt-10 sm:py-7" aria-label={isEn ? 'Quick access' : 'Accès rapide'}>
        <div className="mb-4 flex items-center justify-between px-4 sm:px-6 lg:px-10">
          <div>
            <p className="text-[9px] uppercase tracking-[0.26em] text-[#777]">EXPLORE LUMARÉEL</p>
            <h2 className="mt-1 text-sm font-agrandir-extrabold uppercase tracking-[0.08em] sm:text-base">{isEn ? 'Quick access' : 'Accès rapide'}</h2>
          </div>
          <span className="text-[9px] uppercase tracking-[0.18em] text-[#777]">{isEn ? 'Swipe to explore' : 'Glisser pour explorer'} <span aria-hidden="true">→</span></span>
        </div>
        <div className="home-quick-track flex w-full snap-x snap-mandatory items-stretch overflow-x-auto px-4 pb-2 sm:px-6 lg:px-10">
          {quickAccessItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentPage(item.page)}
              className={`home-quick-tile group relative h-[210px] w-[68vw] max-w-[310px] min-w-[230px] shrink-0 snap-start overflow-hidden border border-white/20 text-left transition-transform duration-500 hover:z-20 hover:-translate-y-1 sm:h-[250px] sm:w-[28vw] lg:h-[285px] lg:w-[23vw] ${index ? '-ml-5 sm:-ml-7' : ''}`}
              style={{ zIndex: index + 1 }}
              aria-label={item.title}
            >
              <img src={item.image} alt="" className={`absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 ${item.position || ''}`} />
              <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/5 transition-opacity group-hover:from-black/75" />
              <span className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-2 sm:bottom-5 sm:left-5">
                <span className="text-[11px] font-agrandir-extrabold uppercase tracking-[0.12em] text-white sm:text-xs">{item.title}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 04 — CLUB: visual invitation only; existing Club route and permissions remain untouched */}
      <section className="home-club mx-auto mt-8 w-full max-w-[1600px] px-4 pb-5 sm:mt-12 sm:px-6 lg:px-10">
        <div className="relative isolate min-h-[230px] overflow-hidden border border-white/15 bg-[#111] sm:min-h-[300px]">
          <img src={blackCardImage} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-55" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/20" />
          <div className="relative flex min-h-[230px] flex-col items-start justify-center px-6 py-9 sm:min-h-[300px] sm:px-12 lg:px-16">
            <p className="mb-3 text-[9px] uppercase tracking-[0.3em] text-white/60">LUMARÉEL · MEMBERS EXPERIENCE</p>
            <h2 className="text-3xl font-agrandir-extrabold uppercase leading-none tracking-[-0.04em] sm:text-5xl">LUMARÉEL CLUB</h2>
            <button
              type="button"
              onClick={() => setCurrentPage('rewards')}
              className="mt-6 inline-flex min-h-11 items-center gap-5 border border-white bg-white px-5 text-[9px] font-agrandir-extrabold uppercase tracking-[0.16em] text-black transition-colors hover:bg-transparent hover:text-white"
            >
              {isEn ? 'Discover the Club' : 'Découvrir le Club'}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
