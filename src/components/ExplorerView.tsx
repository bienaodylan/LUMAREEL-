import React, { useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  buildConcertMemoryAlbums,
  loadSuggestions,
  loadUserPointsState,
} from '../utils/communityStorage';
import {
  articleToDiscoverDetail,
  buildLumareelExperiences,
  experienceToDiscoverDetail,
  getExperienceStatusLabel,
  loadUserExperienceActions,
} from '../utils/discoverCatalog';
import { formatDateLong } from '../utils/dateUtils';
import { ScrollReveal, StatusBadge } from './ui/LumareelKit';
import { Icons } from './ui/Icons';
import { ArrowRight, ChevronLeft, ChevronRight, Tv } from 'lucide-react';

interface ArchivePreviewCard {
  id: string;
  artist: string;
  date: string;
  venue: string;
  photoCount: number;
  image: string;
}

/**
 * 02 — Discover LUMARÉEL
 * Hub éditorial compact (inspiration fonctionnelle KOMI) organisé par priorité :
 * 1. Contenus éditoriaux & découverte (+ accès dédié Memories)
 * 2. Archives — entrée prioritaire & visible des événements passés (affiches, récaps publics)
 * 3. Flash & Surprises
 * 4. Communauté
 * 5. Accès spéciaux, invitations, rencontres & expériences (partie inférieure, secondaire)
 * Aucune section « Dans les coulisses » redondante.
 */
export const ExplorerView: React.FC = () => {
  const {
    currentUser,
    events,
    news,
    archives,
    setCurrentPage,
    setSelectedArchiveId,
    setSelectedMemoryAlbumId,
    setSelectedDiscoverItem,
    language,
  } = useApp();

  const isEn = language === 'en';
  const archivesRailRef = useRef<HTMLDivElement>(null);

  const publishedEvents = useMemo(
    () => (events || []).filter((e) => e.status !== 'draft'),
    [events]
  );

  const publishedArchives = useMemo(
    () => (archives || []).filter((a) => a.isPublished !== false),
    [archives]
  );

  const archiveAlbums = useMemo(
    () => buildConcertMemoryAlbums(publishedArchives),
    [publishedArchives]
  );

  const userActions = useMemo(
    () => loadUserExperienceActions(currentUser),
    [currentUser]
  );

  const bookedCounts = useMemo(() => {
    const map: Record<string, number> = {};
    userActions.forEach((a) => {
      map[a.experienceId] = (map[a.experienceId] || 0) + 1;
    });
    return map;
  }, [userActions]);

  const experiences = useMemo(
    () => buildLumareelExperiences(publishedEvents, language, bookedCounts),
    [publishedEvents, language, bookedCounts]
  );

  const suggestions = useMemo(() => loadSuggestions(), []);
  const topSuggestion = useMemo(
    () => [...suggestions].sort((a, b) => b.votes - a.votes)[0] || null,
    [suggestions]
  );

  const pointsState = useMemo(() => loadUserPointsState(currentUser), [currentUser]);
  const todayKey = new Date().toISOString().slice(0, 10);
  const surpriseClaimedToday = pointsState.lastSurpriseClaimDate === todayKey;

  const formattedToday = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
  const formattedTomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });

  // 1. Contenus éditoriaux & découverte (actualités + accès unique dédié à Memories)
  const editorialHighlights = useMemo(() => {
    const list: Array<{
      id: string;
      tag: string;
      title: string;
      meta: string;
      image: string;
      exclusive?: boolean;
      onOpen: () => void;
    }> = [];

    (news || []).slice(0, 4).forEach((article) => {
      list.push({
        id: `ed_news_${article.id}`,
        tag: article.category || (isEn ? 'Editorial' : 'Actualité'),
        title: article.title,
        meta: article.readTime ? `${article.date} · ${article.readTime}` : article.date,
        image: article.imageUrl,
        onOpen: () => {
          setSelectedDiscoverItem(articleToDiscoverDetail(article, publishedEvents, isEn));
          setCurrentPage('discover_detail');
        },
      });
    });

    return list;
  }, [news, publishedEvents, isEn, setSelectedDiscoverItem, setCurrentPage]);

  // 2. Rail Archives — Événements passés publics LUMARÉEL
  const archivePreviews = useMemo<ArchivePreviewCard[]>(() => {
    const byId = new Map<string, ArchivePreviewCard>();

    for (const item of publishedArchives) {
      byId.set(item.id, {
        id: item.id,
        artist: (item.artists && item.artists[0]) || item.title,
        date: item.date ? formatDateLong(item.date, language) : item.year,
        venue: item.venue || item.city,
        photoCount: Array.isArray(item.photos) && item.photos.length > 0 ? item.photos.length : 1,
        image: item.coverImage || COMMUNITY_MEDIA.concertMemoriesCrowdImg,
      });
    }

    for (const album of archiveAlbums) {
      if (byId.has(album.id)) continue;
      byId.set(album.id, {
        id: album.id,
        artist: album.artist || album.title,
        date: album.date,
        venue: album.venue || album.city,
        photoCount: Math.max(1, album.officialPhotos.length),
        image: album.coverImage || COMMUNITY_MEDIA.concertMemoriesCrowdImg,
      });
    }

    return Array.from(byId.values());
  }, [publishedArchives, archiveAlbums, language]);

  // 3. Opérations Flash & Surprises compactes (statuts réels, zéro faux compte à rebours)
  const flashStripItems = useMemo(() => {
    const items: Array<{
      id: string;
      badge: string;
      badgeVariant: 'valid' | 'study' | 'neutral';
      title: string;
      meta: string;
      image: string;
    }> = [
      {
        id: 'flash_drop_04',
        badge: surpriseClaimedToday
          ? isEn
            ? 'CLAIMED'
            : 'EXPIRÉ'
          : isEn
          ? 'ACTIVE'
          : 'ACTIF',
        badgeVariant: surpriseClaimedToday ? 'neutral' : 'valid',
        title: isEn ? 'Member Surprise Drop #04' : 'Surprise Drop #04',
        meta: isEn ? `Until ${formattedToday} · Members` : `Jusqu'au ${formattedToday} · Membres`,
        image: COMMUNITY_MEDIA.flashVipDropImg,
      },
      {
        id: 'flash_pass_lounge',
        badge: isEn ? 'ACTIVE' : 'ACTIF',
        badgeVariant: 'valid',
        title: isEn ? 'Flash Pass — Soundcheck & Lounge' : 'Pass Flash — Balances & Lounge',
        meta: `650 pts · ${isEn ? `Until ${formattedTomorrow}` : `Jusqu'au ${formattedTomorrow}`}`,
        image: COMMUNITY_MEDIA.backstageSoundcheckImg,
      },
    ];

    const firstLive = publishedEvents[0];
    if (firstLive) {
      items.push({
        id: `flash_evt_${firstLive.id}`,
        badge: isEn ? 'ACTIVE' : 'ACTIF',
        badgeVariant: 'valid',
        title: `${isEn ? 'Flash Sale' : 'Vente Flash'} · ${firstLive.artist || firstLive.title}`,
        meta: `${formatDateLong(firstLive.date, language)}`,
        image: firstLive.artistPortrait || firstLive.officialPoster || firstLive.bannerImage || COMMUNITY_MEDIA.vipMezzanineImg,
      });
    }

    return items;
  }, [publishedEvents, surpriseClaimedToday, formattedToday, formattedTomorrow, isEn, language]);

  // 5. Expériences, invitations & accès spéciaux (secondaires, partie inférieure)
  const compactExperiences = useMemo(() => experiences.slice(0, 4), [experiences]);

  const scrollArchivesRail = (direction: 'left' | 'right') => {
    const el = archivesRailRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'right' ? delta : -delta,
      behavior: 'smooth',
    });
  };

  const openArchiveEvent = (archiveId: string | null) => {
    setSelectedArchiveId(archiveId);
    setCurrentPage('archive');
  };

  const openLumareelTv = () => {
    setSelectedMemoryAlbumId(null);
    setCurrentPage('lumareel_tv');
  };

  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* EN-TÊTE ÉDITORIAL + ACCÈS DIRECTS NON REDONDANTS */}
      <header className="mb-7 space-y-4">
        <div>
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.26em] text-[#9A9A9A] mb-1">
            {isEn ? 'THE LUMARÉEL UNIVERSE' : 'L’UNIVERS LUMARÉEL'}
          </p>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-none">
            Discover
          </h1>
        </div>

        <nav
          aria-label={isEn ? 'Discover sections' : 'Univers Discover'}
          className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5 -mx-5 px-5 sm:mx-0 sm:px-0"
        >
          {[
            { label: 'Archives', onClick: () => openArchiveEvent(null), highlight: true },
            { label: 'LUMARÉEL TV', onClick: openLumareelTv },
            {
              label: 'Flash & Surprises',
              onClick: () => setCurrentPage('flash_drops'),
            },
            {
              label: isEn ? 'Community' : 'Communauté',
              onClick: () => setCurrentPage('suggestions'),
            },
            {
              label: isEn ? 'Experiences' : 'Expériences',
              onClick: () => setCurrentPage('privileged_access'),
            },
          ].map((navItem) => (
            <button
              key={navItem.label}
              type="button"
              onClick={navItem.onClick}
              className={`min-h-[34px] px-3.5 rounded-full text-xs font-agrandir-semibold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                navItem.highlight
                  ? 'bg-[#D4AF6A]/15 border border-[#D4AF6A]/45 text-[#D4AF6A] hover:bg-[#D4AF6A]/25'
                  : 'bg-[#0E0E0E] hover:bg-[#161616] border border-white/[0.12] hover:border-white/30 text-[#D0D0D0] hover:text-white'
              }`}
            >
              {navItem.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="space-y-9">
        {/* ===================================================================
            1. CONTENUS ÉDITORIAUX ET DÉCOUVERTE
           =================================================================== */}
        {editorialHighlights.length > 0 && (
          <ScrollReveal>
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white tracking-tight">
                  {isEn ? 'Editorial & Discovery' : 'À la une & Découverte'}
                </h2>
                <span className="text-[11px] text-[#9A9A9A]">
                  {isEn ? 'LUMARÉEL Selection' : 'Sélection LUMARÉEL'}
                </span>
              </div>

              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-5 px-5 sm:mx-0 sm:px-0">
                {editorialHighlights.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onOpen}
                    className="group shrink-0 snap-start w-[264px] sm:w-[292px] rounded-[16px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.11] hover:border-white/25 p-3 text-left flex items-center gap-3.5 transition-colors cursor-pointer lum-press"
                  >
                    <div className="relative w-[70px] h-[70px] rounded-[12px] overflow-hidden bg-[#141414] border border-white/[0.08] shrink-0">
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#D4AF6A] truncate">
                        {item.tag}
                      </p>
                      <p className="font-agrandir-extrabold text-xs sm:text-sm text-white leading-snug line-clamp-2 group-hover:text-[#D4AF6A] transition-colors">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-[#9A9A9A] truncate">{item.meta}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </ScrollReveal>
        )}

        {/* ===================================================================
            2. ARCHIVES — ENTRÉE PRIORITAIRE & VISIBLE (ÉVÉNEMENTS PASSÉS PUBLICS)
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#D4AF6A]">
                  {isEn ? 'PAST SHOWS' : 'CONCERTS PASSÉS'}
                </p>
                <h2 className="mt-0.5 font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  Archives
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {archivePreviews.length > 2 && (
                  <div className="hidden sm:flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => scrollArchivesRail('left')}
                      aria-label={isEn ? 'Scroll left' : 'Défiler à gauche'}
                      className="w-8 h-8 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollArchivesRail('right')}
                      aria-label={isEn ? 'Scroll right' : 'Défiler à droite'}
                      className="w-8 h-8 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => openArchiveEvent(null)}
                  className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isEn ? 'View all' : 'Tout voir'}
                </button>
              </div>
            </div>

            {archivePreviews.length > 0 ? (
              <div
                ref={archivesRailRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-5 px-5 sm:mx-0 sm:px-0"
              >
                {archivePreviews.map((poster) => (
                  <button
                    key={poster.id}
                    type="button"
                    onClick={() => openArchiveEvent(poster.id)}
                    className="group shrink-0 snap-start w-[148px] sm:w-[178px] text-left cursor-pointer block lum-press"
                  >
                    <div className="relative aspect-[3/4] w-full rounded-[15px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/35 transition-colors">
                      <img
                        src={poster.image}
                        alt={poster.artist}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/15 to-transparent" />
                      <div className="absolute inset-x-3 bottom-2.5">
                        <p className="font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-tight text-white leading-tight truncate group-hover:text-[#D4AF6A] transition-colors">
                          {poster.artist}
                        </p>
                        <p className="text-[10px] text-[#C8C8C8] truncate mt-0.5">
                          {poster.date}
                        </p>
                        <p className="text-[10px] text-[#9A9A9A] truncate">
                          {poster.venue} · {poster.photoCount} photos
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#9A9A9A] py-4">
                {isEn
                  ? 'Past LUMARÉEL concerts will appear here.'
                  : 'Les événements passés LUMARÉEL apparaîtront ici.'}
              </p>
            )}
          </section>
        </ScrollReveal>

        {/* ===================================================================
            2B. BANDEAU ÉDITORIAL COMPACT — LUMARÉEL TV (PORTE D'ENTRÉE UNIQUE)
           =================================================================== */}
        <ScrollReveal>
          <section aria-label="LUMARÉEL TV">
            <button
              type="button"
              onClick={openLumareelTv}
              className="group relative w-full rounded-[14px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] hover:border-[#D4AF6A]/45 text-left transition-colors cursor-pointer block lum-press"
            >
              <img
                src={COMMUNITY_MEDIA.backstageSoundcheckImg}
                alt="LUMARÉEL TV"
                referrerPolicy="no-referrer"
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-center opacity-50 group-hover:scale-[1.03] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/35" />

              <div className="relative z-10 px-5 py-5 sm:px-7 sm:py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1.5 max-w-lg">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.22em] text-[#D4AF6A]">
                    <Tv className="w-3.5 h-3.5" strokeWidth={1.7} />
                    <span>{isEn ? 'EXCLUSIVE VIDEOS' : 'VIDÉOS EXCLUSIVES'}</span>
                  </div>
                  <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight leading-none">
                    LUMARÉEL TV
                  </h2>
                  <p className="text-xs sm:text-sm text-[#C8C8C8] leading-snug">
                    {isEn
                      ? 'Live concerts, backstage vlogs & interviews.'
                      : 'Concerts filmés, coulisses et interviews.'}
                  </p>
                </div>

                <span className="self-start sm:self-center min-h-[38px] px-4 rounded-full bg-white group-hover:bg-[#D4AF6A] text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors shrink-0">
                  <span>{isEn ? 'Discover' : 'Découvrir'}</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                </span>
              </div>
            </button>
          </section>
        </ScrollReveal>

        {/* ===================================================================
            3. FLASH & SURPRISES
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#D4AF6A]">
                  {isEn ? 'LIMITED TIME' : 'OFFRES DU MOMENT'}
                </p>
                <h2 className="mt-0.5 font-agrandir-extrabold text-xl text-white tracking-tight">
                  Flash &amp; Surprises
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('flash_drops')}
                className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {isEn ? 'View all' : 'Tout voir'}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-5 px-5 sm:mx-0 sm:px-0">
              {flashStripItems.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => setCurrentPage('flash_drops')}
                  className="group shrink-0 snap-start w-[248px] sm:w-[276px] rounded-[16px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.11] hover:border-white/25 p-3 text-left flex items-center gap-3 transition-colors cursor-pointer lum-press"
                >
                  <div className="w-14 h-14 rounded-[12px] overflow-hidden bg-[#141414] border border-white/[0.08] shrink-0">
                    <img
                      src={op.image}
                      alt={op.title}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <StatusBadge variant={op.badgeVariant} label={op.badge} />
                    <p className="font-agrandir-extrabold text-xs sm:text-sm text-white truncate group-hover:text-[#D4AF6A] transition-colors">
                      {op.title}
                    </p>
                    <p className="text-[11px] text-[#9A9A9A] truncate">{op.meta}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ===================================================================
            4. COMMUNAUTÉ (COMPACT & DISCRET)
           =================================================================== */}
        <ScrollReveal>
          <section className="pt-2 border-t border-white/[0.10]">
            <button
              type="button"
              onClick={() => setCurrentPage('suggestions')}
              className="w-full py-4 flex items-center justify-between gap-4 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-[12px] bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 flex items-center justify-center shrink-0 transition-colors">
                  <Icons.Suggestions size="xs" accent="mono" className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                      {isEn ? 'Community' : 'Communauté'}
                    </h2>
                    <span className="text-[11px] font-mono text-[#9A9A9A] tabular-nums shrink-0">
                      {suggestions.length} {isEn ? 'proposals' : 'propositions'}
                    </span>
                  </div>
                  <p className="text-xs text-[#9A9A9A] truncate mt-0.5">
                    {topSuggestion
                      ? `${isEn ? 'Top voted:' : 'En tête :'} ${topSuggestion.title}`
                      : isEn
                      ? 'Suggest an artist, concert, city or concept and vote.'
                      : 'Proposer un artiste, un concert, une ville ou un concept et voter.'}
                  </p>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 text-xs font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors shrink-0">
                <span className="hidden sm:inline">{isEn ? 'Vote & suggest' : 'Voter & proposer'}</span>
                <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
              </span>
            </button>
          </section>
        </ScrollReveal>

        {/* ===================================================================
            5. ACCÈS SPÉCIAUX, INVITATIONS, RENCONTRES & EXPÉRIENCES (PARTIE INFÉRIEURE)
           =================================================================== */}
        <ScrollReveal>
          <section className="pt-2 border-t border-white/[0.10] space-y-3">
            <div className="flex items-baseline justify-between gap-3 pt-2">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A]">
                  {isEn ? 'INVITATIONS & MEETS' : 'INVITATIONS & RENCONTRES'}
                </p>
                <h2 className="mt-0.5 font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight">
                  {isEn ? 'Experiences' : 'Expériences'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage('privileged_access')}
                className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer shrink-0"
              >
                {isEn ? 'View all' : 'Tout voir'}
              </button>
            </div>

            <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {compactExperiences.map((exp) => {
                const statusMeta = getExperienceStatusLabel(exp.status, isEn);
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => {
                      setSelectedDiscoverItem(experienceToDiscoverDetail(exp, isEn));
                      setCurrentPage('discover_detail');
                    }}
                    className="w-full py-3 flex items-center gap-3 text-left group cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-[11px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] shrink-0">
                      <img
                        src={exp.image}
                        alt={isEn ? exp.titleEn : exp.titleFr}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    </div>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A]">
                          {isEn ? exp.categoryEn : exp.categoryFr}
                        </span>
                        <StatusBadge variant={statusMeta.variant} label={statusMeta.label} />
                      </div>
                      <h3 className="font-agrandir-extrabold text-xs sm:text-sm text-white leading-snug truncate group-hover:text-[#D4AF6A] transition-colors">
                        {isEn ? exp.titleEn : exp.titleFr}
                      </h3>
                    </div>

                    <ChevronRight
                      className="w-4 h-4 text-[#666] group-hover:text-white shrink-0 transition-colors"
                      strokeWidth={1.6}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};
