import React, { useEffect, useMemo, useState } from 'react';
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
import { Bell, ChevronRight, X } from 'lucide-react';

function getMinPrice(ev: ConcertEvent): number | null {
  const prices = (ev.categories || [])
    .map((c) => Number(c.price))
    .filter((p) => Number.isFinite(p) && p > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

/**
 * 01 — Accueil LUMARÉEL
 * Arrondis modernes sur toutes les cartes et visuels, sans bouton « Découvrir » ni bloc Backstage :
 * tout l'après-concert et les coulisses vivent dans la partie Souvenirs.
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

  const discoverEvents = useMemo(() => {
    if (!activeHero) return publishedEvents;
    const others = publishedEvents.filter((e) => e.id !== activeHero.id);
    return others.length > 0 ? others : publishedEvents;
  }, [publishedEvents, activeHero]);

  const leadDiscoverEvent = discoverEvents[0] || activeHero;
  const secondaryDiscoverEvents = discoverEvents.slice(1);

  const openConcert = (ev: ConcertEvent) => {
    setSelectedEventSlug(ev.slug);
    setCurrentPage('concert_detail');
  };

  const openSouvenirs = () => {
    setSelectedMemoryAlbumId(featuredMemory?.id || null);
    setCurrentPage('memories');
  };

  return (
    <div className="min-h-screen w-full bg-black text-white font-agrandir-regular">
      {/* =====================================================================
          1. HERO — À L'AFFICHE (CADRE ARRONDI MODERNE)
         ===================================================================== */}
      <div
        className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-10 pt-3 sm:pt-5"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top, 0px))' }}
      >
        <HeroMedia
          imageUrl={activeHero?.bannerImage || activeHero?.officialPoster}
          alt={activeHero?.artist || activeHero?.title || 'LUMARÉEL'}
          heightClass="min-h-[500px] sm:min-h-[560px] lg:min-h-[600px]"
          className="rounded-[24px] sm:rounded-[28px] border border-white/[0.12] shadow-2xl"
        >
          {/* Barre supérieure mobile (LUMARÉEL + cloche) / cloche discrète desktop */}
          <header className="relative z-20 w-full px-5 sm:px-7 pt-5 sm:pt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="font-agrandir-extrabold text-sm tracking-[0.28em] text-white cursor-pointer md:invisible"
            >
              LUMARÉEL
            </button>

            <button
              type="button"
              onClick={() => setShowAlerts((v) => !v)}
              aria-label={isEn ? 'Notifications' : 'Notifications'}
              className="w-10 h-10 rounded-full bg-black/55 hover:bg-white/15 backdrop-blur-md border border-white/[0.14] flex items-center justify-center text-white transition-colors cursor-pointer lum-press"
            >
              <Bell className="w-[18px] h-[18px]" strokeWidth={1.6} />
            </button>
          </header>

          {/* Panneau d'alertes au clic sur la cloche */}
          {showAlerts && (
            <div className="relative z-30 w-full px-5 sm:px-7 mt-2">
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
          <div className="relative z-10 w-full px-5 sm:px-8 pt-20 pb-7 sm:pb-10">
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

                  {/* Indicateurs de slides arrondis */}
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
      </div>

      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-10 space-y-12 pt-10 pb-12">
        {/* ===================================================================
            2. CONCERTS À L'AFFICHE (GRANDE CARTE ARRONDIE + RAIL PORTRAITS ARRONDIS)
           =================================================================== */}
        {leadDiscoverEvent && (
          <ScrollReveal>
            <section className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  {isEn ? 'Upcoming concerts' : 'Prochains concerts'}
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentPage('explore')}
                  className="text-xs sm:text-sm font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
                >
                  {isEn ? 'See all' : 'Tout voir'}
                </button>
              </div>

              {/* Grande carte événement arrondie (22px) */}
              {(() => {
                const minPrice = getMinPrice(leadDiscoverEvent);
                return (
                  <button
                    type="button"
                    onClick={() => openConcert(leadDiscoverEvent)}
                    className="group relative w-full aspect-[16/10] sm:aspect-[21/9] rounded-[22px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] hover:border-white/25 text-left cursor-pointer block lum-press transition-colors"
                  >
                    <img
                      src={leadDiscoverEvent.bannerImage || leadDiscoverEvent.officialPoster}
                      alt={leadDiscoverEvent.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="font-agrandir-extrabold text-2xl sm:text-3xl uppercase text-white tracking-tight leading-none truncate">
                          {leadDiscoverEvent.artist || leadDiscoverEvent.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-[#C8C8C8] truncate">
                          {formatDateLong(leadDiscoverEvent.date, language)} · {leadDiscoverEvent.venue}
                        </p>
                      </div>
                      {minPrice && (
                        <span className="px-3.5 py-1.5 rounded-full bg-black/75 border border-white/[0.14] text-xs sm:text-sm font-agrandir-extrabold text-white whitespace-nowrap shrink-0 tabular-nums">
                          {isEn ? 'from' : 'dès'} {minPrice.toLocaleString('fr-FR')} FCFA
                        </span>
                      )}
                    </div>
                  </button>
                );
              })()}

              {/* Rail portraits horizontaux mobile -> grille 3-4 colonnes desktop */}
              {secondaryDiscoverEvents.length > 0 && (
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 lg:grid-cols-4">
                  {secondaryDiscoverEvents.map((ev) => (
                    <PosterCard
                      key={ev.id}
                      imageUrl={ev.officialPoster || ev.bannerImage}
                      title={ev.artist || ev.title}
                      subtitle={`${formatDateLong(ev.date, language)} · ${ev.genre || 'Concert'}`}
                      onClick={() => openConcert(ev)}
                      className="w-[46vw] sm:w-[220px] md:w-auto shrink-0 snap-start"
                    />
                  ))}
                </div>
              )}
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

              {/* Carte Souvenirs de concert arrondie (remplace Backstage) */}
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