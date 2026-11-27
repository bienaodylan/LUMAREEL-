import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { formatDateLong } from '../utils/dateUtils';
import {
  COMMUNITY_MEDIA,
  buildConcertMemoryAlbums,
} from '../utils/communityStorage';
import {
  CountdownTimer,
  HeroMedia,
  PosterCard,
  ScrollReveal,
  SkeletonBlock,
} from './ui/LumareelKit';
import { Icons } from './ui/Icons';
import { Bell, ChevronLeft, ChevronRight, X } from 'lucide-react';

function getMinPrice(ev: ConcertEvent): number | null {
  const prices = (ev.categories || [])
    .map((c) => Number(c.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * 01 — Accueil LUMARÉEL
 * - En-tête dédiée avec logo officiel LUMARÉEL : masquée au scroll bas, réapparaît au scroll haut.
 * - Première section : bannière plein cadre (edge-to-edge) sans marge latérale ni arrondi.
 * - Concerts à venir : carrousel horizontal unique regroupant tous les concerts (scroll droite -> gauche).
 * - À ne pas manquer : Flash Drop + Souvenirs (aucun bloc Backstage ni bouton Découvrir).
 */
export const HomeFeed: React.FC = () => {
  const {
    events,
    archives,
    isLoadingEvents,
    setSelectedEventSlug,
    setSelectedMemoryAlbumId,
    setCurrentPage,
    setCheckoutEvent,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [showAlerts, setShowAlerts] = useState(false);

  // En-tête mobile avec logo : se cache en scrollant vers le bas, réapparaît en remontant
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

  const publishedArchives = useMemo(
    () => (archives || []).filter((a) => a.isPublished !== false),
    [archives]
  );

  const memoryAlbums = useMemo(
    () => buildConcertMemoryAlbums(publishedArchives),
    [publishedArchives]
  );
  const featuredMemory = memoryAlbums[0] || null;

  const heroSlides = useMemo(() => {
    const featured = publishedEvents.filter((e) => e.isFeatured);
    return (featured.length > 0 ? featured : publishedEvents).slice(0, 3);
  }, [publishedEvents]);

  const [slideIdx, setSlideIdx] = useState(0);
  const activeHero = heroSlides[slideIdx] || publishedEvents[0] || null;

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const id = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % heroSlides.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [heroSlides.length]);

  const openConcert = (ev: ConcertEvent) => {
    setSelectedEventSlug(ev.slug);
    setCurrentPage('concert_detail');
  };

  const openSouvenirs = () => {
    setSelectedMemoryAlbumId(featuredMemory?.id || null);
    setCurrentPage('memories');
  };

  const scrollConcertsCarousel = (direction: 'left' | 'right') => {
    const el = concertsCarouselRef.current;
    if (!el) return;
    const step = Math.max(260, Math.round(el.clientWidth * 0.72));
    el.scrollBy({
      left: direction === 'right' ? step : -step,
      behavior: 'smooth',
    });
  };

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

        {/* Panneau d'alertes mobile */}
        {showAlerts && (
          <div className="w-full px-5 pb-3">
            <div className="ml-auto max-w-sm rounded-[20px] bg-[#0E0E0E]/96 backdrop-blur-xl border border-white/[0.12] p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  {isEn ? 'Alerts & Releases' : 'Alertes & Sorties'}
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
                <button
                  type="button"
                  onClick={() => {
                    setShowAlerts(false);
                    setCurrentPage('flash_drops');
                  }}
                  className="w-full py-2.5 text-left hover:text-[#D4AF6A] transition-colors cursor-pointer"
                >
                  <p className="font-agrandir-extrabold text-white">
                    {isEn ? 'Members presale live' : 'Prévente membres en cours'}
                  </p>
                  <p className="text-[#9A9A9A] mt-0.5">
                    {activeHero
                      ? `${activeHero.artist} — Carré Or & VIP`
                      : 'Flash Drop LUMARÉEL'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlerts(false);
                    openSouvenirs();
                  }}
                  className="w-full py-2.5 text-left hover:text-[#D4AF6A] transition-colors cursor-pointer"
                >
                  <p className="font-agrandir-extrabold text-white">
                    {isEn ? 'Concert memories available' : 'Souvenirs de concerts en ligne'}
                  </p>
                  <p className="text-[#9A9A9A] mt-0.5">
                    {isEn
                      ? 'Official photos & aftermovies ready.'
                      : 'Photos officielles et aftermovies disponibles.'}
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* =====================================================================
          1. HERO — BANNIÈRE PLEIN CADRE SANS MARGE LATÉRALE NI ARRONDIS
         ===================================================================== */}
      <HeroMedia
        imageUrl={activeHero?.bannerImage || activeHero?.officialPoster}
        alt={activeHero?.artist || activeHero?.title || 'LUMARÉEL'}
        heightClass="min-h-[560px] sm:min-h-[600px] lg:min-h-[650px]"
        className="w-full rounded-none"
      >
        {/* Cloche d'alertes desktop (le logo est dans DesktopTopNav au-dessus) */}
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

        {/* Panneau d'alertes desktop */}
        {showAlerts && (
          <div className="hidden md:block relative z-30 w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 mt-2">
            <div className="ml-auto max-w-sm rounded-[20px] bg-[#0E0E0E]/96 backdrop-blur-xl border border-white/[0.12] p-4 shadow-2xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  {isEn ? 'Alerts & Releases' : 'Alertes & Sorties'}
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
                <button
                  type="button"
                  onClick={() => {
                    setShowAlerts(false);
                    setCurrentPage('flash_drops');
                  }}
                  className="w-full py-2.5 text-left hover:text-[#D4AF6A] transition-colors cursor-pointer"
                >
                  <p className="font-agrandir-extrabold text-white">
                    {isEn ? 'Members presale live' : 'Prévente membres en cours'}
                  </p>
                  <p className="text-[#9A9A9A] mt-0.5">
                    {activeHero
                      ? `${activeHero.artist} — Carré Or & VIP`
                      : 'Flash Drop LUMARÉEL'}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAlerts(false);
                    openSouvenirs();
                  }}
                  className="w-full py-2.5 text-left hover:text-[#D4AF6A] transition-colors cursor-pointer"
                >
                  <p className="font-agrandir-extrabold text-white">
                    {isEn ? 'Concert memories available' : 'Souvenirs de concerts en ligne'}
                  </p>
                  <p className="text-[#9A9A9A] mt-0.5">
                    {isEn
                      ? 'Official photos & aftermovies ready.'
                      : 'Photos officielles et aftermovies disponibles.'}
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenu principal Hero — Bas gauche */}
        <div className="relative z-10 w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-20 pb-8 sm:pb-12">
          {isLoadingEvents && !activeHero ? (
            <div className="max-w-xl space-y-3">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-14 w-80" />
              <SkeletonBlock className="h-5 w-64" />
            </div>
          ) : (
            activeHero && (
              <div className="max-w-2xl space-y-3.5">
                <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.26em] text-[#D4AF6A]">
                  {isEn ? 'FEATURED' : 'À L’AFFICHE'}
                </p>

                <h1 className="font-agrandir-extrabold text-[2.45rem] sm:text-6xl lg:text-7xl uppercase tracking-tight text-white leading-[0.96]">
                  {activeHero.artist || activeHero.title}
                </h1>

                <p className="text-xs sm:text-sm text-[#C8C8C8]">
                  Concert · {activeHero.venue}, {activeHero.city || 'Abidjan'} —{' '}
                  {formatDateLong(activeHero.date, language)}
                </p>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckoutEvent(activeHero)}
                    className="min-h-[46px] px-7 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer lum-press"
                  >
                    {isEn ? 'Book now' : 'Réserver'}
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
            )
          )}
        </div>
      </HeroMedia>

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-10 space-y-12 pt-10 pb-12">
        {/* ===================================================================
            2. CONCERTS À VENIR — CARROUSEL HORIZONTAL UNIQUEMENT (TOUS LES CONCERTS)
           =================================================================== */}
        {publishedEvents.length > 0 && (
          <ScrollReveal>
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  {isEn ? 'Upcoming concerts' : 'Concerts à venir'}
                </h2>

                <div className="flex items-center gap-2.5">
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

                  <button
                    type="button"
                    onClick={() => setCurrentPage('explore')}
                    className="text-xs sm:text-sm font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {isEn ? 'See all' : 'Tout voir'}
                  </button>
                </div>
              </div>

              {/* Carrousel horizontal scrollable droite -> gauche avec tous les concerts */}
              <div
                ref={concertsCarouselRef}
                className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 pb-2 scrollbar-hide -mx-4 px-4 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0"
              >
                {publishedEvents.map((ev) => {
                  const minPrice = getMinPrice(ev);
                  return (
                    <PosterCard
                      key={ev.id}
                      imageUrl={ev.officialPoster || ev.bannerImage}
                      title={ev.artist || ev.title}
                      subtitle={`${formatDateLong(ev.date, language)} · ${ev.venue || ev.genre || 'Concert'}`}
                      priceText={
                        minPrice
                          ? `${isEn ? 'from' : 'dès'} ${minPrice.toLocaleString('fr-FR')} FCFA`
                          : undefined
                      }
                      onClick={() => openConcert(ev)}
                      className="w-[62vw] sm:w-[240px] md:w-[258px] lg:w-[272px] shrink-0 snap-start"
                    />
                  );
                })}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ===================================================================
            3. À NE PAS MANQUER (FLASH DROP + SOUVENIRS DE CONCERT — ZÉRO BACKSTAGE)
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                {isEn ? 'Do not miss' : 'À ne pas manquer'}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
              {/* Carte Flash Drop arrondie */}
              <button
                type="button"
                onClick={() => setCurrentPage('flash_drops')}
                className="lg:col-span-7 w-full rounded-[20px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/25 p-5 sm:p-6 text-left group cursor-pointer flex flex-col justify-between gap-4 transition-colors lum-press"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2 min-w-0">
                    <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                      FLASH DROP · {isEn ? 'LIVE NOW' : 'EN COURS'}
                    </p>
                    <h3 className="font-agrandir-extrabold text-lg sm:text-2xl text-white leading-snug group-hover:text-[#D4AF6A] transition-colors">
                      {activeHero
                        ? `${isEn ? 'Members presale' : 'Prévente membres'} ${activeHero.artist} — Carré Or`
                        : isEn
                        ? 'Members presale — Limited seats'
                        : 'Prévente membres — Carré Or'}
                    </h3>
                  </div>
                  <Icons.FlashDrops size="md" className="w-10 h-10 shrink-0" />
                </div>

                <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-[#9A9A9A]">
                    {isEn ? 'Ends in' : 'Se termine dans'}
                  </span>
                  <CountdownTimer
                    spaced
                    className="font-agrandir-extrabold text-sm text-white tracking-wider"
                  />
                </div>
              </button>

              {/* Carte Souvenirs de concert arrondie */}
              <button
                type="button"
                onClick={openSouvenirs}
                className="lg:col-span-5 w-full rounded-[20px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/25 p-4 sm:p-5 flex items-center gap-4 text-left group cursor-pointer transition-colors lum-press"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-24 rounded-[14px] overflow-hidden bg-[#141414] border border-white/[0.12] shrink-0">
                  <img
                    src={
                      featuredMemory?.coverImage ||
                      COMMUNITY_MEDIA.concertMemoriesCrowdImg
                    }
                    alt={featuredMemory?.artist || 'Souvenirs de concert'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#9A9A9A]">
                    {isEn ? 'MEMORIES' : 'SOUVENIRS'}
                  </p>
                  <p className="font-agrandir-extrabold text-sm sm:text-base text-white leading-snug line-clamp-2 group-hover:text-[#D4AF6A] transition-colors">
                    {featuredMemory
                      ? `${featuredMemory.artist || featuredMemory.title} — ${
                          isEn ? 'Photos & Aftermovie' : 'Photos & Aftermovie'
                        }`
                      : isEn
                      ? 'Official concert photos & videos'
                      : 'Photos officielles et vidéos de concerts'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-xs text-[#C8C8C8] group-hover:text-white transition-colors">
                    <span>{isEn ? 'Open memories' : 'Voir les souvenirs'}</span>
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.6} />
                  </span>
                </div>
              </button>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};