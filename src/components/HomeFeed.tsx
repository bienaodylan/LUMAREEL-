import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { ConcertEvent } from '../types';
import {
  ArrowUpRight,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  CreditCard,
  Facebook,
  Gift,
  Heart,
  Instagram,
  Mic2,
  Search,
  X,
} from 'lucide-react';

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
    searchQuery,
    setSearchQuery,
    isFavoriteEvent,
    toggleFavoriteEvent,
    showToast,
  } = useApp();
  const { isStandalone } = usePWAInstall();
  const isEn = language === 'en';

  const upcomingSlides = useMemo(
    () =>
      events
        .filter((event) => event.status !== 'draft' && getEventTimestamp(event) > Date.now())
        .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b)),
    [events]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const activeSlides = useMemo(() => {
    if (!normalizedQuery) return upcomingSlides;
    return upcomingSlides.filter((event) => {
      const haystack = [
        event.artist,
        event.title,
        event.subtitle,
        event.venue,
        event.city,
        event.genre,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [upcomingSlides, normalizedQuery]);

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
    const offset = cardRect.left - containerRect.left - 16;
    container.scrollBy({ left: offset, behavior: 'smooth' });
    window.setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 550);
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
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      setCurrentSlideIndex(closestIndex);
    });
  };

  const formatEventDate = (date: string) => {
    const parsed = new Date(`${String(date || '').slice(0, 10)}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleBuyTickets = (event: ConcertEvent) => {
    setCheckoutEvent(event);
  };

  const handleViewAll = () => setCurrentPage('discover');

  const handleViewDetails = (event: ConcertEvent) => {
    setSelectedEventSlug(event.slug || event.id);
    setCurrentPage('event_detail');
  };

  const handleToggleFavorite = (e: React.MouseEvent, event: ConcertEvent) => {
    e.stopPropagation();
    const wasFav = isFavoriteEvent(event.id);
    toggleFavoriteEvent(event.id);
    showToast(
      wasFav
        ? isEn
          ? 'Removed from favorites'
          : 'Retiré de tes favoris'
        : isEn
          ? 'Added to favorites'
          : 'Ajouté à tes favoris',
      'info'
    );
  };

  const quickAccessItems = [
    {
      id: 'black-card',
      title: 'LUMARÉEL BLACK CARD',
      subtitle: isEn ? 'Your VIP card & perks' : 'Ta carte VIP & tes avantages',
      page: 'member_card' as const,
      icon: CreditCard,
    },
    {
      id: 'gift',
      title: isEn ? 'GIFT POINTS & REFERRALS' : 'GIFT POINTS & PARRAINAGE',
      subtitle: isEn
        ? 'Rewards, surprises & 500 FCFA per friend'
        : 'Récompenses, surprises & 500 F par ami',
      page: 'rewards' as const,
      icon: Gift,
    },
    {
      id: 'backstage',
      title: 'BACKSTAGE',
      subtitle: isEn
        ? 'Ballon, studio sessions & exclusives'
        : 'Ballon, sessions studio & exclusivités',
      page: 'backstage' as const,
      icon: Clapperboard,
    },
    {
      id: 'memories',
      title: isEn ? 'MEMORIES' : 'SOUVENIRS',
      subtitle: isEn
        ? 'Official photos, recaps & event memories'
        : 'Photos officielles, récaps & souvenirs',
      page: 'memories' as const,
      icon: Camera,
    },
    {
      id: 'voice',
      title: isEn ? 'YOUR VOICE' : 'TA VOIX',
      subtitle: isEn
        ? 'Suggest artists, venues & event ideas'
        : 'Propose tes artistes, lieux & idées',
      page: 'suggestions' as const,
      icon: Mic2,
    },
  ];

  const filteredQuickAccess = useMemo(() => {
    if (!normalizedQuery) return quickAccessItems;
    const matches = quickAccessItems.filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(normalizedQuery)
    );
    return matches.length > 0 ? matches : quickAccessItems;
  }, [normalizedQuery, isEn]);

  return (
    <div
      className={`home-editorial w-full max-w-full overflow-x-clip bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white flex flex-col justify-between min-h-[100dvh] transition-colors duration-200 ${
        isStandalone
          ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
          : 'pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-0'
      }`}
    >
      <div className="w-full flex-1 flex flex-col">
        {/* BARRE DE RECHERCHE — entre l'en-tête et la première section */}
        <div className="w-full px-4 pt-[calc(4.15rem+env(safe-area-inset-top,0px))] pb-3 sm:px-7 sm:pt-7 sm:pb-4 lg:px-10">
          <label className="relative flex items-center w-full max-w-2xl">
            <Search
              className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#86868B] dark:text-white/45"
              strokeWidth={1.9}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isEn
                  ? 'Search a concert, an artist, a venue...'
                  : 'Rechercher un concert, un artiste, un lieu...'
              }
              aria-label={isEn ? 'Search' : 'Rechercher'}
              className="w-full h-11 rounded-2xl border border-black/[0.08] dark:border-white/[0.11] bg-black/[0.04] dark:bg-white/[0.07] pl-10 pr-10 text-[14px] text-[#111111] dark:text-white placeholder:text-[#86868B] dark:placeholder:text-white/45 outline-none focus:border-black/25 dark:focus:border-white/30 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label={isEn ? 'Clear search' : 'Effacer la recherche'}
                className="absolute right-2.5 w-7 h-7 rounded-full bg-black/[0.07] dark:bg-white/12 flex items-center justify-center text-[#48484A] dark:text-white/80 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        {/* SECTION ÉVÉNEMENTS — Premier événement large + aperçu du prochain concert pour l'intuition de scroll */}
        <section id="home-upcoming-events" className="home-events w-full shrink-0">
          <div className="mb-2.5 flex items-center justify-between border-b border-black/[0.09] dark:border-white/15 px-4 pb-2 sm:mb-3.5 sm:px-7 sm:pb-2.5 lg:px-10">
            <h2 className="text-[15px] font-agrandir-extrabold uppercase tracking-[-0.025em] sm:text-2xl">
              {isEn ? 'EVENTS' : 'ÉVÉNEMENTS'}
            </h2>
            <button
              type="button"
              onClick={handleViewAll}
              className="inline-flex min-h-8 items-center gap-1.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] text-[#111111] dark:text-white transition-opacity hover:opacity-65 cursor-pointer sm:min-h-9 sm:gap-2"
            >
              {isEn ? 'VIEW ALL' : 'VOIR TOUT'} <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          {activeSlides.length > 0 ? (
            <>
              <div className="hidden justify-end gap-2 px-7 pb-2 md:flex lg:px-10">
                <button
                  type="button"
                  onClick={() =>
                    scrollToSlide(
                      (currentSlideIndex - 1 + activeSlides.length) % activeSlides.length
                    )
                  }
                  aria-label="Événement précédent"
                  className="flex h-9 w-9 items-center justify-center border border-black/20 dark:border-white/25 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollToSlide((currentSlideIndex + 1) % activeSlides.length)}
                  aria-label="Événement suivant"
                  className="flex h-9 w-9 items-center justify-center border border-black/20 dark:border-white/25 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer transition-colors"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div
                ref={featuredRowRef}
                onScroll={handleContainerScroll}
                className="home-events-track flex snap-x snap-mandatory items-start gap-3 overflow-x-auto px-4 pb-2 pt-0.5 sm:gap-5 sm:px-7 sm:pb-3 sm:pt-1 lg:gap-6 lg:px-10"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activeSlides.map((event, index) => {
                  const favorited = isFavoriteEvent(event.id);
                  return (
                    <div
                      key={event.id}
                      ref={(element) => {
                        cardRefs.current[index] = element;
                      }}
                      className="home-event-card w-[84vw] max-w-[360px] shrink-0 snap-start bg-transparent text-left sm:w-[58vw] sm:max-w-[470px] lg:w-[44vw] lg:max-w-[540px]"
                    >
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => handleViewDetails(event)}
                          className="home-event-media group block w-full overflow-hidden rounded-[18px] sm:rounded-[20px] bg-black/[0.06] dark:bg-[#111] text-left cursor-pointer"
                          aria-label={`${event.artist} — ${isEn ? 'Event details' : 'Détails du concert'}`}
                        >
                          <div className="relative aspect-[4/3] sm:aspect-[16/10] w-full overflow-hidden bg-black/[0.06] dark:bg-[#111]">
                            <img
                              src={event.officialPoster || event.bannerImage}
                              alt={event.title || event.artist}
                              referrerPolicy="no-referrer"
                              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                            />
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(e, event)}
                          aria-label={
                            favorited
                              ? isEn
                                ? 'Remove from favorites'
                                : 'Retirer des favoris'
                              : isEn
                                ? 'Add to favorites'
                                : 'Ajouter aux favoris'
                          }
                          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                        >
                          <Heart
                            className="w-[17px] h-[17px]"
                            strokeWidth={1.9}
                            fill={favorited ? 'currentColor' : 'none'}
                          />
                        </button>
                      </div>

                      <div className="pt-2.5 sm:pt-3.5">
                        <h3 className="truncate text-[16px] font-agrandir-extrabold uppercase leading-tight tracking-[-0.02em] text-[#111111] dark:text-white sm:text-xl">
                          {event.artist} EN CONCERT
                        </h3>
                        <p className="mt-1 truncate text-[11px] font-agrandir-semibold text-[#6E6E73] dark:text-white/60 sm:text-xs">
                          {event.venue}
                          {event.city ? ` · ${event.city}` : ''} · {formatEventDate(event.date)}
                        </p>
                        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3.5 sm:gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleBuyTickets(event)}
                            className="home-event-action inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[12px] bg-[#111111] text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85 px-3 text-[10px] font-agrandir-extrabold uppercase tracking-[0.08em] transition-colors cursor-pointer sm:min-h-11 sm:gap-2"
                          >
                            <span aria-hidden="true">▣</span>{' '}
                            {isEn ? 'Buy tickets' : 'Acheter tickets'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewDetails(event)}
                            className="home-event-action inline-flex min-h-[42px] items-center justify-center rounded-[12px] border border-black/20 dark:border-white/30 px-3 text-[10px] font-agrandir-extrabold uppercase tracking-[0.06em] text-[#111111] dark:text-white transition-colors hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer sm:min-h-11"
                          >
                            {isEn ? 'Details' : 'Détails'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="px-4 py-8 text-xs text-[#6E6E73] dark:text-white/55 sm:px-7 lg:px-10 space-y-2.5">
              <p>
                {normalizedQuery
                  ? isEn
                    ? `No concert matches "${searchQuery}".`
                    : `Aucun concert trouvé pour « ${searchQuery} ».`
                  : isEn
                    ? 'No upcoming events at the moment.'
                    : 'Aucun événement à venir pour le moment.'}
              </p>
              {normalizedQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black px-3.5 py-1.5 text-[11px] font-medium cursor-pointer"
                >
                  {isEn ? 'Reset search' : 'Effacer la recherche'}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ACCÈS RAPIDE CLUB */}
        <section
          className="home-quick-access mx-auto mt-4 w-full shrink-0 px-3.5 sm:mt-7 sm:px-7 lg:px-10"
          aria-label={isEn ? 'Quick access' : 'Accès rapide'}
        >
          <div className="overflow-hidden rounded-[22px] border border-black/[0.08] dark:border-white/12 bg-white dark:bg-[#0b0b0b] px-3.5 sm:rounded-[26px] sm:border-black/[0.09] dark:sm:border-white/15 sm:px-6 transition-colors">
            {filteredQuickAccess.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentPage(item.page)}
                  className="group flex min-h-[52px] w-full items-center gap-3.5 border-b border-black/[0.07] dark:border-white/[0.08] py-2 text-left last:border-b-0 cursor-pointer sm:min-h-[82px] sm:gap-4 sm:border-black/[0.08] dark:sm:border-white/10 sm:py-3.5"
                >
                  <span
                    className={
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] border ' +
                      (index === 0
                        ? 'border-black/15 bg-black/[0.06] dark:border-white/25 dark:bg-white/[0.09]'
                        : 'border-black/[0.08] bg-[#F2F2F5] dark:border-white/10 dark:bg-[#171717]') +
                      ' sm:h-[52px] sm:w-[52px] sm:rounded-[16px]'
                    }
                  >
                    <Icon
                      className="h-[18px] w-[18px] text-[#111111] dark:text-white/85 sm:h-[21px] sm:w-[21px]"
                      strokeWidth={1.8}
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-agrandir-extrabold uppercase tracking-[0.07em] text-[#111111] dark:text-white sm:text-sm">
                      {item.title}
                    </span>
                    <span className="mt-0.5 hidden text-xs leading-snug text-[#6E6E73] dark:text-neutral-400 sm:block">
                      {item.subtitle}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#86868B] dark:text-neutral-500 transition-transform group-hover:translate-x-1 group-hover:text-[#111111] dark:group-hover:text-white sm:h-5 sm:w-5" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="hidden sm:flex mx-auto mt-8 w-full max-w-6xl shrink-0 items-center justify-between gap-3 border-t border-black/[0.08] dark:border-white/10 px-10 py-7 text-center">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#86868B] dark:text-neutral-500">
          © {new Date().getFullYear()} LUMARÉEL
        </p>
        <div className="flex items-center gap-5 text-[#6E6E73] dark:text-neutral-400">
          <a
            href="https://www.instagram.com/lumareelco/"
            target="_blank"
            rel="noreferrer"
            aria-label="Instagram LUMARÉEL"
            className="transition-colors hover:text-[#111111] dark:hover:text-white"
          >
            <Instagram className="h-5 w-5" />
          </a>
          <a
            href="https://www.facebook.com/share/19oZK7vQvR/?mibextid=wwXIfr"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook LUMARÉEL"
            className="transition-colors hover:text-[#111111] dark:hover:text-white"
          >
            <Facebook className="h-5 w-5" />
          </a>
          <a
            href="https://www.tiktok.com/@lumareelco"
            target="_blank"
            rel="noreferrer"
            aria-label="TikTok LUMARÉEL"
            className="text-[11px] font-agrandir-extrabold uppercase tracking-wider transition-colors hover:text-[#111111] dark:hover:text-white"
          >
            TikTok
          </a>
          <a
            href="https://www.snapchat.com/add/lumareelco"
            target="_blank"
            rel="noreferrer"
            aria-label="Snapchat LUMARÉEL"
            className="text-[11px] font-agrandir-extrabold uppercase tracking-wider transition-colors hover:text-[#111111] dark:hover:text-white"
          >
            Snapchat
          </a>
        </div>
      </footer>
    </div>
  );
};
