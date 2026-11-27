import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Gift,
  Image as ImageIcon,
  Mic2,
  Play,
  Ticket,
} from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';

export const HomeFeed: React.FC = () => {
  const {
    events,
    setCurrentPage,
    setCheckoutEvent,
    archives,
    currentUser,
    setIsAuthModalOpen,
    showToast,
    language,
    setLanguage,
    t,
  } = useApp();

  const isEn = language === 'en';

  // Carousel state
  const featuredSlides = events.filter((e) => e.isFeatured && e.status !== 'draft');
  const activeSlides = featuredSlides.length > 0 ? featuredSlides : events.slice(0, 3);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  const featuredRowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  // Défilement automatique fluide vers un concert précis
  const scrollToSlide = (index: number) => {
    const container = featuredRowRef.current;
    const card = cardRefs.current[index];
    if (!container || !card) return;

    isProgrammaticScroll.current = true;
    setCurrentSlideIndex(index);

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollOffset = cardRect.left - containerRect.left - (containerRect.width - cardRect.width) / 2;

    container.scrollBy({ left: scrollOffset, behavior: 'smooth' });

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
  };

  // Détection en temps réel lors du scroll tactile ou souris sur téléphone/desktop
  const handleContainerScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const container = featuredRowRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      });

      if (closestIndex !== currentSlideIndex && closestIndex >= 0 && closestIndex < activeSlides.length) {
        setCurrentSlideIndex(closestIndex);
      }
    });
  };

  // Auto-play du carrousel avec défilement visible automatique
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      if (!isProgrammaticScroll.current) {
        setCurrentSlideIndex((prev) => {
          const next = (prev + 1) % activeSlides.length;
          scrollToSlide(next);
          return next;
        });
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [activeSlides.length]);

  const scrollFeaturedRow = (direction: 'left' | 'right') => {
    const newIndex =
      direction === 'left'
        ? currentSlideIndex === 0
          ? activeSlides.length - 1
          : currentSlideIndex - 1
        : (currentSlideIndex + 1) % activeSlides.length;
    scrollToSlide(newIndex);
  };

  const handleBookNow = (event: ConcertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast(
        isEn
          ? 'Account required to book tickets.'
          : 'Création de compte obligatoire pour réserver vos billets.',
        'info'
      );
      setCheckoutEvent(event);
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutEvent(event);
  };

  const handleSelectArtistSlide = (index: number) => {
    scrollToSlide(index);
  };

  const quickNavItems = [
    {
      id: 'rewards',
      page: 'rewards' as const,
      title: isEn ? 'Gifts, Points & Referrals' : 'Gifts, Points & Parrainage',
      subtitle: isEn
        ? 'Surprises, flash sales, points & 500 FCFA per friend'
        : 'Surprises, ventes flash, points & 500 F CFA par ami',
      icon: Gift,
      isGold: true,
    },
    {
      id: 'backstage',
      page: 'backstage' as const,
      title: 'Backstage',
      subtitle: isEn
        ? 'Soundchecks, studio sessions & exclusive drops'
        : 'Balances, sessions studio & contenus exclusifs',
      icon: Clapperboard,
    },
    {
      id: 'memories',
      page: 'memories' as const,
      title: isEn ? 'My Moments' : 'Mes Moments',
      subtitle: isEn
        ? 'Official photos, recaps & shared concert memories'
        : 'Photos officielles, récaps & souvenirs partagés',
      icon: Camera,
    },
    {
      id: 'suggestions',
      page: 'suggestions' as const,
      title: isEn ? 'Your Voice' : 'Ta Voix',
      subtitle: isEn
        ? 'Suggest artists, venues & vote on upcoming ideas'
        : 'Proposez vos artistes, lieux & idées d’événements',
      icon: Mic2,
    },
    {
      id: 'archive',
      page: 'archive' as const,
      title: t('home.archives'),
      subtitle: isEn
        ? 'Past LUMARÉEL stage productions & video recaps'
        : 'Productions scéniques passées & récaps vidéo',
      icon: Film,
    },
  ];

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-transparent text-[#FFFFFF] pb-16 select-none">
      {/* =========================================================================
          1. SECTION PRINCIPALE : PROGRAMMATION OFFICIELLE
         ========================================================================= */}
      <section className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:pt-12">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div className="min-w-0 pr-4">
            <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              {t('home.upcomingTitle')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center p-1 rounded-full bg-black/60 border border-white/15 text-[11px] font-agrandir-bold tracking-wider mr-1">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'fr' ? 'bg-white text-black font-agrandir-extrabold' : 'text-[#888] hover:text-white'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'en' ? 'bg-white text-black font-agrandir-extrabold' : 'text-[#888] hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
            <button
              type="button"
              onClick={() => scrollFeaturedRow('left')}
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5 active:scale-95"
              aria-label={t('home.prevConcert')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollFeaturedRow('right')}
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5 active:scale-95"
              aria-label={t('home.nextConcert')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={featuredRowRef}
          onScroll={handleContainerScroll}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pt-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeSlides.map((event, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <div
                key={event.id}
                ref={(el) => {
                  cardRefs.current[idx] = el;
                }}
                onClick={() => handleSelectArtistSlide(idx)}
                className="w-[calc(100vw-3.5rem)] max-w-[calc(100vw-3.5rem)] sm:w-[390px] sm:max-w-none md:w-[420px] shrink-0 cursor-pointer group snap-start transition-all duration-300 select-none"
              >
                {/* Image 16:9 avec bordure or sur le concert actif */}
                <div
                  className={`aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative transition-all duration-300 bg-[#111111] ${
                    isActive
                      ? 'ring-2 sm:ring-[2.5px] ring-[#d4af37] ring-offset-2 ring-offset-black shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.45)] scale-[1.01]'
                      : 'border border-white/10 hover:border-white/30 opacity-90 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <img
                    src={event.officialPoster || event.bannerImage}
                    alt={event.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter brightness-[0.95] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Informations concert + Bouton unique Acheter Tickets pleine largeur */}
                <div className="pt-4 flex flex-col gap-3.5">
                  <div className="px-0.5">
                    <h3
                      className={`font-agrandir-extrabold text-base sm:text-lg tracking-tight uppercase truncate transition-colors ${
                        isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                      }`}
                    >
                      {event.artist} {t('home.inConcert')}
                    </h3>
                    <p className="text-xs font-agrandir-regular text-neutral-300 truncate mt-1">
                      <strong
                        className={`font-agrandir-extrabold transition-colors ${
                          isActive ? 'text-white' : 'text-neutral-200'
                        }`}
                      >
                        {event.venue}
                      </strong>{' '}
                      ·{' '}
                      <strong
                        className={`font-agrandir-extrabold transition-colors ${
                          isActive ? 'text-white' : 'text-neutral-200'
                        }`}
                      >
                        {formatDateLong(event.date, language)}
                      </strong>
                    </p>
                  </div>

                  {/* Bouton unique Acheter Tickets pleine largeur */}
                  <button
                    type="button"
                    onClick={(e) => handleBookNow(event, e)}
                    className="w-full min-h-[48px] bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs sm:text-[13px] py-3.5 px-4 rounded-xl flex items-center justify-center gap-2.5 active:scale-[0.98] transition-all shadow-lg uppercase tracking-wider cursor-pointer"
                  >
                    <Ticket className="w-4 h-4 shrink-0" />
                    <span>{t('home.buyTickets')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          2. SECTION : NAVIGATION RAPIDE (CLUB LUMARÉEL)
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-5 sm:pt-8 relative z-20">
        <div className="rounded-[24px] bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/10 p-2 shadow-2xl">
          <div className="flex flex-col">
            {quickNavItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <React.Fragment key={item.id}>
                  {idx > 0 && <div className="h-px bg-white/5 mx-4 my-1" />}
                  <button
                    type="button"
                    onClick={() => setCurrentPage(item.page)}
                    className={`flex items-center justify-between w-full min-h-[58px] p-3 rounded-[16px] transition-colors cursor-pointer group ${
                      item.isGold ? 'hover:bg-[#d4af37]/10' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-inner ${
                          item.isGold
                            ? 'bg-[#d4af37]/15 border border-[#d4af37]/35 group-hover:bg-[#d4af37]/25'
                            : 'bg-[#181818] border border-white/5 group-hover:bg-white/10'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            item.isGold ? 'text-[#d4af37]' : 'text-[#aaa] group-hover:text-white'
                          }`}
                        />
                      </div>
                      <div className="text-left min-w-0">
                        <span className="text-xs font-agrandir-bold tracking-wider text-white uppercase block truncate">
                          {item.title}
                        </span>
                        <span className="text-[11px] text-neutral-400 block truncate mt-0.5">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                        item.isGold ? 'text-[#d4af37]' : 'text-[#555] group-hover:text-white'
                      }`}
                    />
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SECTION : ARCHIVES
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-14 sm:pt-20">
        <div className="mb-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">
              {t('home.archives')}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setCurrentPage('archive')}
            aria-label={t('home.archives')}
            className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 pb-5 scrollbar-none md:grid md:grid-cols-3 md:gap-6">
          {(archives || []).slice(0, 3).map((item) => {
            const safeCover =
              item.coverImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg';
            return (
              <div
                key={item.id}
                onClick={() => setCurrentPage('archive')}
                className="w-[76vw] sm:w-[320px] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col justify-between"
              >
                <div className="aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#111111] border border-white/15 group-hover:border-white/40 transition-all duration-300 shadow-xl group-hover:scale-[1.02]">
                  <img
                    src={safeCover}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center filter brightness-[0.88] group-hover:brightness-100 group-hover:scale-105 transition-all duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 shadow-2xl group-hover:scale-110">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/20 uppercase font-semibold">
                      {item.duration || t('home.liveHd')}
                    </span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold text-[#d4af37] border border-white/15 uppercase tracking-wider">
                      {t('home.videoRecap')}
                    </span>
                  </div>
                </div>
                <div className="pt-3 px-1">
                  <div className="text-[10px] font-agrandir-regular text-[#888] uppercase tracking-wider flex items-center gap-2 mb-1">
                    <strong className="font-agrandir-extrabold text-white">
                      {item.date ? formatDateLong(item.date, language) : item.year}
                    </strong>
                    <span>·</span>
                    <strong className="font-agrandir-extrabold text-white truncate">{item.venue}</strong>
                  </div>
                  <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight group-hover:text-white transition-colors truncate">
                    {item.title}
                  </h3>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage('archive');
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#d4af37] text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5 border border-[#d4af37]/30 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>{t('home.viewImages')}</span>
                    </button>
                    <span className="text-[10px] text-[#777] font-agrandir-regular">
                      {item.duration || t('home.liveHd')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};