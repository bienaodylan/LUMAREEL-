import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  const [homeCms, setHomeCms] = useState<{
    searchPlaceholderFr?: string;
    searchPlaceholderEn?: string;
    announcementBanner?: string;
    announcementActive?: boolean;
  } | null>(null);
  const featuredRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/cms/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.homepage) setHomeCms(data.homepage);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
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
    const padLeft = parseFloat(window.getComputedStyle(container).paddingLeft) || 16;
    const offset = cardRect.left - containerRect.left - padLeft;
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
      className={`home-editorial w-full max-w-full overflow-x-clip bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white flex flex-col justify-between min-h-[100dvh] md:h-[100dvh] md:overflow-hidden transition-colors duration-200 ${
        isStandalone
          ? 'pb-[calc(5.15rem+env(safe-area-inset-bottom,0px))] md:pb-0'
          : 'pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:pb-0'
      }`}
    >
      <div className="w-full flex-1 flex flex-col justify-evenly md:justify-center gap-3 md:gap-5 pt-[calc(3.85rem+env(safe-area-inset-top,0px))] md:pt-5">
        {homeCms?.announcementActive && homeCms.announcementBanner && (
          <div className="w-full px-4 sm:px-7 lg:px-10 shrink-0">
            <div className="w-full max-w-2xl rounded-xl border border-black/10 dark:border-white/15 bg-black/[0.04] dark:bg-white/[0.06] px-3.5 py-1.5 text-xs font-agrandir-semibold text-[#111111] dark:text-white/90 truncate">
              {homeCms.announcementBanner}
            </div>
          </div>
        )}

        {/* SECTION ÉVÉNEMENTS — Affiches proportionnées pour tenir toute la rubrique dans l'écran sans scroll */}
        <section id="home-upcoming-events" className="home-events w-full shrink-0">
          <div className="mx-4 mb-2 flex items-center justify-between border-b border-black/[0.09] dark:border-white/15 pb-1.5 sm:mx-7 sm:mb-2.5 sm:pb-2 lg:mx-10">
            <h2 className="text-[14px] font-agrandir-extrabold uppercase tracking-[-0.025em] sm:text-xl">
              {isEn ? 'EVENTS' : 'ÉVÉNEMENTS'}
            </h2>
            <div className="flex items-center gap-3">
              {activeSlides.length > 1 && (
                <div className="hidden items-center gap-1.5 md:flex">
                  <button
                    type="button"
                    onClick={() =>
                      scrollToSlide(
                        (currentSlideIndex - 1 + activeSlides.length) % activeSlides.length
                      )
                    }
                    aria-label="Événement précédent"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/15 dark:border-white/20 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollToSlide((currentSlideIndex + 1) % activeSlides.length)}
                    aria-label="Événement suivant"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-black/15 dark:border-white/20 text-[#111111] dark:text-white hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={handleViewAll}
                className="inline-flex min-h-7 items-center gap-1.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] text-[#111111] dark:text-white transition-opacity hover:opacity-65 cursor-pointer sm:min-h-8 sm:gap-1.5 whitespace-nowrap"
              >
                {isEn ? 'VIEW ALL' : 'VOIR TOUT'} <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {activeSlides.length > 0 ? (
            <div
              ref={featuredRowRef}
              onScroll={handleContainerScroll}
              className="home-events-track flex snap-x snap-mandatory scroll-pl-4 scroll-pr-4 items-start gap-3 overflow-x-auto px-4 pb-1 pt-0.5 sm:scroll-pl-7 sm:scroll-pr-7 sm:gap-4 sm:px-7 lg:scroll-pl-10 lg:scroll-pr-10 lg:gap-5 lg:px-10"
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
                    className="home-event-card w-[78vw] max-w-[325px] shrink-0 snap-start bg-transparent text-left sm:w-[46vw] sm:max-w-[380px] lg:w-[34vw] lg:max-w-[420px]"
                  >
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => handleViewDetails(event)}
                        className="home-event-media group block w-full overflow-hidden rounded-[16px] sm:rounded-[18px] bg-black/[0.06] dark:bg-[#111] text-left cursor-pointer"
                        aria-label={`${event.artist} — ${isEn ? 'Event details' : 'Détails du concert'}`}
                      >
                        <div className="relative h-[clamp(112px,20dvh,180px)] sm:h-[clamp(145px,24dvh,215px)] md:h-[clamp(165px,27dvh,235px)] w-full overflow-hidden bg-black/[0.06] dark:bg-[#111]">
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
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white flex items-center justify-center transition-all active:scale-90 cursor-pointer"
                      >
                        <Heart
                          className="w-[15px] h-[15px]"
                          strokeWidth={1.9}
                          fill={favorited ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>

                    <div className="pt-2 sm:pt-2.5">
                      <h3 className="truncate text-[14px] font-agrandir-extrabold uppercase leading-tight tracking-[-0.02em] text-[#111111] dark:text-white sm:text-base">
                        {event.artist} EN CONCERT
                      </h3>
                      <p className="mt-0.5 truncate text-[11px] font-agrandir-semibold text-[#6E6E73] dark:text-white/60">
                        {event.venue}
                        {event.city ? ` · ${event.city}` : ''} · {formatEventDate(event.date)}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handleBuyTickets(event)}
                          className="home-event-action inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-[11px] bg-[#111111] text-white hover:bg-black/85 dark:bg-white dark:text-black dark:hover:bg-white/85 px-2.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.07em] transition-colors cursor-pointer sm:min-h-[40px] whitespace-nowrap"
                        >
                          <span aria-hidden="true">▣</span>{' '}
                          {isEn ? 'Buy tickets' : 'Acheter tickets'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleViewDetails(event)}
                          className="home-event-action inline-flex min-h-[38px] items-center justify-center rounded-[11px] border border-black/20 dark:border-white/30 px-2.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.06em] text-[#111111] dark:text-white transition-colors hover:bg-[#111111] hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer sm:min-h-[40px] whitespace-nowrap"
                        >
                          {isEn ? 'Details' : 'Détails'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-4 py-6 text-xs text-[#6E6E73] dark:text-white/55 sm:px-7 lg:px-10 space-y-2.5">
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

        {/* ACCÈS RAPIDE CLUB — Compact sur mobile, grille horizontale 5 colonnes sur desktop */}
        <section
          className="home-quick-access mx-auto w-full shrink-0 px-4 sm:px-7 lg:px-10"
          aria-label={isEn ? 'Quick access' : 'Accès rapide'}
        >
          <div className="overflow-hidden rounded-[20px] border border-black/[0.08] dark:border-white/12 bg-white dark:bg-[#0b0b0b] px-3 sm:rounded-[22px] sm:border-black/[0.09] dark:sm:border-white/15 md:px-0 md:grid md:grid-cols-5 md:divide-x md:divide-black/[0.07] dark:md:divide-white/10 transition-colors">
            {filteredQuickAccess.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentPage(item.page)}
                  className="group flex min-h-[44px] w-full items-center gap-3 border-b border-black/[0.07] dark:border-white/[0.08] py-1.5 text-left last:border-b-0 cursor-pointer md:border-b-0 md:flex-col md:items-start md:justify-between md:gap-2.5 md:p-4 md:min-h-[112px] md:hover:bg-black/[0.025] dark:md:hover:bg-white/[0.04] transition-colors"
                >
                  <span
                    className={
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border ' +
                      (index === 0
                        ? 'border-black/15 bg-black/[0.06] dark:border-white/25 dark:bg-white/[0.09]'
                        : 'border-black/[0.08] bg-[#F2F2F5] dark:border-white/10 dark:bg-[#171717]') +
                      ' md:h-9 md:w-9 md:rounded-[11px]'
                    }
                  >
                    <Icon
                      className="h-[16px] w-[16px] text-[#111111] dark:text-white/85 md:h-[18px] md:w-[18px]"
                      strokeWidth={1.8}
                    />
                  </span>
                  <span className="min-w-0 flex-1 md:w-full">
                    <span className="block truncate text-[11px] font-agrandir-extrabold uppercase tracking-[0.07em] text-[#111111] dark:text-white md:text-[12px]">
                      {item.title}
                    </span>
                    <span className="mt-0.5 hidden text-[11px] leading-snug text-[#6E6E73] dark:text-neutral-400 md:line-clamp-2">
                      {item.subtitle}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#86868B] dark:text-neutral-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[#111111] dark:group-hover:text-white md:hidden" />
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="hidden md:flex mx-auto w-full max-w-6xl shrink-0 items-center justify-between gap-3 border-t border-black/[0.08] dark:border-white/10 px-10 py-3.5 text-center">
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
            <Instagram className="h-4 w-4" />
          </a>
          <a
            href="https://www.facebook.com/share/19oZK7vQvR/?mibextid=wwXIfr"
            target="_blank"
            rel="noreferrer"
            aria-label="Facebook LUMARÉEL"
            className="transition-colors hover:text-[#111111] dark:hover:text-white"
          >
            <Facebook className="h-4 w-4" />
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
