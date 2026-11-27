import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { formatDateLong } from '../utils/dateUtils';
import { buildConcertMemoryAlbums } from '../utils/communityStorage';
import {
  articleToDiscoverDetail,
  buildLumareelExperiences,
  experienceToDiscoverDetail,
} from '../utils/discoverCatalog';
import {
  HeroMedia,
  PosterCard,
  ScrollReveal,
  SkeletonBlock,
} from './ui/LumareelKit';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react';

function getMinPrice(ev: ConcertEvent): number | null {
  const prices = (ev.categories || [])
    .map((c) => Number(c.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

function getTicketingStatus(ev: ConcertEvent, isEn: boolean): {
  label: string;
  soldOut: boolean;
  limited: boolean;
} {
  const categories = ev.categories || [];
  if (categories.length === 0) {
    return {
      label: isEn ? 'Ticketing open' : 'Billetterie ouverte',
      soldOut: false,
      limited: false,
    };
  }
  const totalQuota = categories.reduce((sum, c) => sum + Number(c.quota || 0), 0);
  const totalSold = categories.reduce((sum, c) => sum + Number(c.sold || 0), 0);
  const remaining = Math.max(0, totalQuota - totalSold);

  if (totalQuota > 0 && remaining === 0) {
    return {
      label: isEn ? 'Sold out' : 'Complet',
      soldOut: true,
      limited: false,
    };
  }
  if (totalQuota > 0 && remaining / totalQuota <= 0.15) {
    return {
      label: isEn ? 'Limited seats' : 'Dernières places',
      soldOut: false,
      limited: true,
    };
  }
  return {
    label: isEn ? 'Ticketing open' : 'Billetterie ouverte',
    soldOut: false,
    limited: false,
  };
}

/**
 * 01 — Accueil LUMARÉEL
 * Page strictement événementielle et billetterie :
 * - En-tête logo dédiée (masquée au scroll bas, réapparaît au scroll haut)
 * - A. Événement principal (bannière plein cadre, infos clés, statut billetterie, réservation)
 * - B. Programmation (carrousel horizontal de tous les concerts à venir)
 * Aucun bloc autonome Communauté, Avantages, Memories, Backstage ou Black Card.
 */
export const HomeFeed: React.FC = () => {
  const {
    events,
    news,
    archives,
    isLoadingEvents,
    setSelectedMemoryAlbumId,
    setSelectedDiscoverItem,
    setCurrentPage,
    setCheckoutEvent,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [showAlerts, setShowAlerts] = useState(false);

  const [headerVisible, setHeaderVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);
  const concertsCarouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentY = Math.max(0, window.scrollY);
      const delta = currentY - lastScrollYRef.current;

      setIsScrolled(currentY > 24);

      if (currentY <= 24) {
        setHeaderVisible(true);
      } else if (delta > 6 && currentY > 56) {
        setHeaderVisible(false);
        setShowAlerts(false);
      } else if (delta < -6) {
        setHeaderVisible(true);
      }

      lastScrollYRef.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const publishedEvents = useMemo(
    () => (events || []).filter((e) => e.status !== 'draft'),
    [events]
  );

  const heroSlides = useMemo(() => {
    const featured = publishedEvents.filter((e) => e.isFeatured);
    return (featured.length > 0 ? featured : publishedEvents).slice(0, 3);
  }, [publishedEvents]);

  const [slideIdx, setSlideIdx] = useState(0);
  const activeHero = heroSlides[slideIdx] || publishedEvents[0] || null;
  const heroStatus = useMemo(
    () => (activeHero ? getTicketingStatus(activeHero, isEn) : null),
    [activeHero, isEn]
  );

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  const bookConcert = (ev: ConcertEvent) => {
    setCheckoutEvent(ev);
  };

  // Petite sélection réelle (2 à 3 éléments max) pour la section discrète « À découvrir »
  const homeDiscoverItems = useMemo(() => {
    const items: Array<{
      id: string;
      tag: string;
      title: string;
      subtitle: string;
      image: string;
      onOpen: () => void;
    }> = [];

    const publishedArchives = (archives || []).filter((a) => a.isPublished !== false);
    const albums = buildConcertMemoryAlbums(publishedArchives);
    const latestAlbum = albums[0];
    if (latestAlbum) {
      items.push({
        id: `hd_mem_${latestAlbum.id}`,
        tag: 'Memories',
        title: latestAlbum.artist || latestAlbum.title,
        subtitle: latestAlbum.date || (isEn ? 'Photos & aftermovie' : 'Photos & aftermovie'),
        image: latestAlbum.coverImage,
        onOpen: () => {
          setSelectedMemoryAlbumId(latestAlbum.id);
          setCurrentPage('memories');
        },
      });
    }

    const availableExp = buildLumareelExperiences(publishedEvents, language).find(
      (e) => e.status === 'available' || e.status === 'members_only'
    );
    if (availableExp) {
      items.push({
        id: `hd_exp_${availableExp.id}`,
        tag: isEn ? 'Experience' : 'Expérience',
        title: isEn ? availableExp.titleEn : availableExp.titleFr,
        subtitle: availableExp.dateLabel || (isEn ? 'Limited access' : 'Accès limité'),
        image: availableExp.image,
        onOpen: () => {
          setSelectedDiscoverItem(experienceToDiscoverDetail(availableExp, isEn));
          setCurrentPage('discover_detail');
        },
      });
    }

    const latestArticle = (news || [])[0];
    if (latestArticle) {
      items.push({
        id: `hd_news_${latestArticle.id}`,
        tag: latestArticle.category || (isEn ? 'Editorial' : 'Actualité'),
        title: latestArticle.title,
        subtitle: latestArticle.summary,
        image: latestArticle.imageUrl,
        onOpen: () => {
          setSelectedDiscoverItem(articleToDiscoverDetail(latestArticle, publishedEvents, isEn));
          setCurrentPage('discover_detail');
        },
      });
    }

    return items.slice(0, 3);
  }, [
    archives,
    publishedEvents,
    news,
    language,
    isEn,
    setSelectedMemoryAlbumId,
    setSelectedDiscoverItem,
    setCurrentPage,
  ]);

  const scrollConcertsCarousel = (direction: 'left' | 'right') => {
    const el = concertsCarouselRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth',
    });
  };

  const renderAlertsPanel = () => (
    <div className="ml-auto max-w-sm rounded-[20px] bg-[#0E0E0E]/96 backdrop-blur-xl border border-white/[0.12] p-4 shadow-2xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
          {isEn ? 'Event updates' : 'Actualité concerts'}
        </span>
        <button
          type="button"
          onClick={() => setShowAlerts(false)}
          aria-label={isEn ? 'Close' : 'Fermer'}
          className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-[#9A9A9A] hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" strokeWidth={1.6} />
        </button>
      </div>
      <div className="divide-y divide-white/[0.12] text-xs">
        {activeHero && (
          <button
            type="button"
            onClick={() => {
              setShowAlerts(false);
              bookConcert(activeHero);
            }}
            className="w-full py-2.5 text-left hover:text-[#D4AF6A] transition-colors cursor-pointer"
          >
            <p className="font-agrandir-extrabold text-white">
              {activeHero.artist || activeHero.title}
            </p>
            <p className="text-[#9A9A9A] mt-0.5">
              {formatDateLong(activeHero.date, language)}
              {activeHero.venue ? ` · ${activeHero.venue}` : ''}
            </p>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setShowAlerts(false);
            setCurrentPage('client_space');
          }}
          className="w-full py-2.5 text-left hover:text-[#D4AF6A] transition-colors cursor-pointer"
        >
          <p className="font-agrandir-extrabold text-white">
            {isEn ? 'My tickets' : 'Mes billets'}
          </p>
          <p className="text-[#9A9A9A] mt-0.5">
            {isEn ? 'Access your QR passes and bookings.' : 'Accédez à vos QR codes et réservations.'}
          </p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-black text-white font-agrandir-regular">
      {/* =====================================================================
          EN-TÊTE MOBILE DÉDIÉE AVEC LOGO LUMARÉEL
          (Masquée au scroll vers le bas · réapparaît dès qu'on remonte)
         ===================================================================== */}
      <header
        className={`fixed top-0 inset-x-0 z-40 md:hidden transition-all duration-300 ease-out will-change-transform ${
          headerVisible
            ? 'translate-y-0 opacity-100'
            : '-translate-y-full opacity-0 pointer-events-none'
        } ${
          isScrolled
            ? 'bg-black/92 backdrop-blur-xl border-b border-white/[0.10]'
            : 'bg-gradient-to-b from-black/85 via-black/45 to-transparent'
        }`}
        style={{ paddingTop: 'max(0.65rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="w-full px-5 pb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setCurrentPage('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            aria-label="LUMARÉEL — Accueil"
            className="flex items-center cursor-pointer active:opacity-80 transition-opacity"
          >
            <img
              src="/assets/logo-lumareel.png"
              alt="LUMARÉEL"
              className="h-6 w-auto object-contain"
            />
          </button>

          <button
            type="button"
            onClick={() => setShowAlerts((v) => !v)}
            aria-label={isEn ? 'Notifications' : 'Notifications'}
            className="w-10 h-10 rounded-full bg-black/55 hover:bg-white/15 backdrop-blur-md border border-white/[0.14] flex items-center justify-center text-white transition-colors cursor-pointer lum-press"
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.6} />
          </button>
        </div>

        {showAlerts && <div className="w-full px-5 pb-3">{renderAlertsPanel()}</div>}
      </header>

      {/* =====================================================================
          A. ÉVÉNEMENT PRINCIPAL — BANNIÈRE PLEIN CADRE SANS MARGE NI ARRONDIS
         ===================================================================== */}
      <HeroMedia
        imageUrl={activeHero?.bannerImage || activeHero?.officialPoster}
        alt={activeHero?.artist || activeHero?.title || 'LUMARÉEL'}
        heightClass="min-h-[520px] sm:min-h-[560px] lg:min-h-[600px]"
        className="w-full rounded-none"
      >
        {/* Cloche desktop */}
        <div className="relative z-20 w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-20 md:pt-6 flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowAlerts((v) => !v)}
            aria-label={isEn ? 'Notifications' : 'Notifications'}
            className="hidden md:flex w-10 h-10 rounded-full bg-black/55 hover:bg-white/15 backdrop-blur-md border border-white/[0.14] items-center justify-center text-white transition-colors cursor-pointer lum-press"
          >
            <Bell className="w-[18px] h-[18px]" strokeWidth={1.6} />
          </button>
        </div>

        {showAlerts && (
          <div className="hidden md:block relative z-30 w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 mt-2">
            {renderAlertsPanel()}
          </div>
        )}

        {/* Hiérarchie textuelle principale — Bas gauche */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-16 pb-8 sm:pb-11">
          {isLoadingEvents && !activeHero ? (
            <div className="max-w-xl space-y-3">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-14 w-80" />
              <SkeletonBlock className="h-5 w-64" />
            </div>
          ) : activeHero ? (
            <div className="max-w-2xl space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-[11px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#D4AF6A]">
                  {isEn ? 'NEXT EVENT' : 'PROCHAIN ÉVÉNEMENT'}
                </span>
                {heroStatus && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] ${
                      heroStatus.soldOut
                        ? 'bg-white/15 text-[#C8C8C8]'
                        : heroStatus.limited
                        ? 'bg-[#D4AF6A]/20 text-[#D4AF6A] border border-[#D4AF6A]/40'
                        : 'bg-[#0F2A1A]/90 text-[#7FE0A6]'
                    }`}
                  >
                    {heroStatus.label}
                  </span>
                )}
              </div>

              <h1 className="font-agrandir-extrabold text-[2.4rem] sm:text-6xl lg:text-7xl uppercase tracking-tight text-white leading-[0.96]">
                {activeHero.artist || activeHero.title}
              </h1>

              {activeHero.title &&
                activeHero.artist &&
                activeHero.title.toLowerCase() !== activeHero.artist.toLowerCase() && (
                  <p className="text-sm sm:text-base font-agrandir-semibold text-white/90">
                    {activeHero.title}
                  </p>
                )}

              <p className="text-xs sm:text-sm text-[#C8C8C8]">
                {formatDateLong(activeHero.date, language)}
                {activeHero.venue
                  ? ` · ${activeHero.venue}${activeHero.city ? `, ${activeHero.city}` : ''}`
                  : ''}
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={Boolean(heroStatus?.soldOut)}
                  onClick={() => bookConcert(activeHero)}
                  className="min-h-[46px] px-7 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] disabled:bg-white/15 disabled:text-[#9A9A9A] text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer disabled:cursor-not-allowed lum-press"
                >
                  {heroStatus?.soldOut
                    ? isEn
                      ? 'Sold out'
                      : 'Complet'
                    : isEn
                    ? 'Book tickets'
                    : 'Réserver'}
                </button>
              </div>

              {/* Indicateurs de slides */}
              {heroSlides.length > 1 && (
                <div className="pt-3 flex items-center gap-2">
                  {heroSlides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      onClick={() => setSlideIdx(idx)}
                      aria-label={slide.artist || slide.title}
                      className={`h-1 rounded-full transition-all cursor-pointer ${
                        idx === slideIdx
                          ? 'w-7 bg-white'
                          : 'w-4 bg-white/25 hover:bg-white/55'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-lg space-y-2">
              <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#D4AF6A]">
                LUMARÉEL
              </p>
              <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white leading-tight">
                {isEn ? 'Next lineup coming soon.' : 'La prochaine programmation arrive bientôt.'}
              </h1>
            </div>
          )}
        </div>
      </HeroMedia>

      {/* =====================================================================
          B. PROGRAMMATION — CARROUSEL HORIZONTAL DES CONCERTS À VENIR
         ===================================================================== */}
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-10 pt-9 pb-14">
        {publishedEvents.length > 0 ? (
          <ScrollReveal>
            <section className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A]">
                    {isEn ? 'LINEUP' : 'PROGRAMMATION'}
                  </p>
                  <h2 className="mt-1 font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                    {isEn ? 'Upcoming concerts' : 'Concerts à venir'}
                  </h2>
                </div>

                {publishedEvents.length > 1 && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollConcertsCarousel('left')}
                      aria-label={isEn ? 'Scroll left' : 'Défiler vers la gauche'}
                      className="w-9 h-9 rounded-full bg-[#0E0E0E] hover:bg-white/10 border border-white/[0.14] flex items-center justify-center text-white transition-colors cursor-pointer lum-press"
                    >
                      <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollConcertsCarousel('right')}
                      aria-label={isEn ? 'Scroll right' : 'Défiler vers la droite'}
                      className="w-9 h-9 rounded-full bg-[#0E0E0E] hover:bg-white/10 border border-white/[0.14] flex items-center justify-center text-white transition-colors cursor-pointer lum-press"
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
                    </button>
                  </div>
                )}
              </div>

              <div
                ref={concertsCarouselRef}
                className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scrollbar-hide -mx-4 px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
              >
                {publishedEvents.map((ev) => {
                  const minPrice = getMinPrice(ev);
                  const status = getTicketingStatus(ev, isEn);
                  return (
                    <PosterCard
                      key={ev.id}
                      imageUrl={ev.officialPoster || ev.bannerImage}
                      title={ev.artist || ev.title}
                      subtitle={`${formatDateLong(ev.date, language)}${ev.venue ? ` · ${ev.venue}` : ''}`}
                      badgeText={status.soldOut || status.limited ? status.label : undefined}
                      priceText={
                        status.soldOut
                          ? isEn
                            ? 'Sold out'
                            : 'Complet'
                          : minPrice
                          ? `${isEn ? 'from' : 'dès'} ${minPrice.toLocaleString('fr-FR')} FCFA`
                          : undefined
                      }
                      onClick={() => bookConcert(ev)}
                      className="w-[62vw] sm:w-[238px] md:w-[254px] lg:w-[268px] shrink-0 snap-start"
                    />
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        ) : (
          !isLoadingEvents && (
            <section className="py-10 border-t border-white/[0.12] text-center space-y-2">
              <p className="font-agrandir-extrabold text-base text-white">
                {isEn ? 'No upcoming concerts scheduled yet' : 'Aucun concert programmé pour le moment'}
              </p>
              <p className="text-xs text-[#9A9A9A]">
                {isEn
                  ? 'New dates will be announced right here as soon as ticketing opens.'
                  : 'Les prochaines dates apparaîtront ici dès l’ouverture de la billetterie.'}
              </p>
            </section>
          )
        )}

        {/* =====================================================================
            C. À DÉCOUVRIR — PETITE SECTION HORIZONTALE SECONDAIRE (2-3 CONTENUS RÉELS)
           ===================================================================== */}
        {homeDiscoverItems.length > 0 && (
          <ScrollReveal>
            <section className="mt-10 pt-7 border-t border-white/[0.10] space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight">
                  {isEn ? 'To discover' : 'À découvrir'}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentPage('explore')}
                  className="text-xs text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
                >
                  Discover
                </button>
              </div>

              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-4 px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
                {homeDiscoverItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onOpen}
                    className="group shrink-0 snap-start w-[252px] sm:w-[280px] rounded-[15px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.10] hover:border-white/25 p-2.5 text-left flex items-center gap-3 transition-colors cursor-pointer lum-press"
                  >
                    <div className="w-14 h-14 rounded-[11px] overflow-hidden bg-[#141414] border border-white/[0.08] shrink-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#D4AF6A] truncate">
                        {item.tag}
                      </p>
                      <p className="font-agrandir-extrabold text-xs sm:text-sm text-white truncate group-hover:text-[#D4AF6A] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#9A9A9A] truncate">
                        {item.subtitle}
                      </p>
                    </div>
                    <ChevronRight
                      className="w-4 h-4 text-[#666] group-hover:text-white shrink-0"
                      strokeWidth={1.6}
                    />
                  </button>
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}
      </div>
    </div>
  );
};