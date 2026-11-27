import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  buildConcertMemoryAlbums,
  loadSuggestions,
  loadUserPointsState,
} from '../utils/communityStorage';
import {
  MediaHubItem,
  getPublishedMediaItems,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
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
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MemoryPreviewCard {
  id: string;
  albumId: string;
  artist: string;
  date: string;
  image: string;
}

/**
 * 02 — Discover LUMARÉEL
 * Hub éditorial vivant (format magazine digital moderne, inspiré par les compositions mixtes compactes) :
 * - Barre d'accès rapide aux 4 univers (Memories · Expériences · Flash & Surprises · Communauté)
 * - Bandeau horizontal compact : Actualités, Sélections & Invitations (ouvre une page détaillée)
 * - Rail horizontal compact : Memories (concerts, coulisses, photos & vidéos)
 * - Flux vertical éditorial : Expériences, Rencontres, Invitations & Coulisses
 * - Bandeau horizontal compact : Flash & Surprises (statuts réels, sans compteurs fictifs)
 * - Entrée compacte & discrète : Communauté (proposer & voter)
 */
export const ExplorerView: React.FC = () => {
  const {
    currentUser,
    events,
    news,
    archives,
    setCurrentPage,
    setSelectedMemoryAlbumId,
    setSelectedMediaId,
    setSelectedDiscoverItem,
    language,
  } = useApp();

  const isEn = language === 'en';
  const memoriesRailRef = useRef<HTMLDivElement>(null);

  const [hubItems, setHubItems] = useState<MediaHubItem[]>(() => getPublishedMediaItems());

  useEffect(() => {
    const sync = () => setHubItems(getPublishedMediaItems());
    sync();
    return subscribeMediaHub(sync);
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

  // Rail Memories compact
  const memoryPreviews = useMemo<MemoryPreviewCard[]>(() => {
    const items: MemoryPreviewCard[] = memoryAlbums.map((album) => ({
      id: `album_${album.id}`,
      albumId: album.id,
      artist: album.artist || album.title,
      date: album.date,
      image: album.coverImage || COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    }));

    const fallbackAlbumId = memoryAlbums[0]?.id || 'dopelym';
    const existingKeys = new Set(items.map((it) => it.artist.trim().toLowerCase()));

    for (const ev of publishedEvents) {
      const artistKey = (ev.artist || ev.title || '').trim().toLowerCase();
      if (!artistKey || existingKeys.has(artistKey)) continue;
      const matchedAlbum = memoryAlbums.find((a) => {
        const hay = `${a.artist} ${a.title}`.toLowerCase();
        return hay.includes(artistKey) || artistKey.includes((a.artist || '').toLowerCase());
      });
      const img = ev.officialPoster || ev.artistPortrait || ev.bannerImage || ev.coverImage;
      if (!img) continue;
      existingKeys.add(artistKey);
      items.push({
        id: `event_${ev.id}`,
        albumId: matchedAlbum?.id || fallbackAlbumId,
        artist: ev.artist || ev.title,
        date: ev.date,
        image: img,
      });
    }

    return items;
  }, [memoryAlbums, publishedEvents]);

  // Sélection horizontale compacte : Actualités + Invitation/Expérience + Flash actif
  const editorialHighlights = useMemo(() => {
    const list: Array<{
      id: string;
      tag: string;
      title: string;
      meta: string;
      image: string;
      onOpen: () => void;
    }> = [];

    const firstExp = experiences.find((e) => e.status === 'available') || experiences[0];
    if (firstExp) {
      list.push({
        id: `hl_exp_${firstExp.id}`,
        tag: isEn ? firstExp.categoryEn : firstExp.categoryFr,
        title: isEn ? firstExp.titleEn : firstExp.titleFr,
        meta: firstExp.dateLabel || (isEn ? 'Available' : 'Disponible'),
        image: firstExp.image,
        onOpen: () => {
          setSelectedDiscoverItem(experienceToDiscoverDetail(firstExp, isEn));
          setCurrentPage('discover_detail');
        },
      });
    }

    (news || []).slice(0, 3).forEach((article) => {
      list.push({
        id: `hl_news_${article.id}`,
        tag: article.category || (isEn ? 'News' : 'Actualité'),
        title: article.title,
        meta: article.readTime ? `${article.date} · ${article.readTime}` : article.date,
        image: article.imageUrl,
        onOpen: () => {
          setSelectedDiscoverItem(articleToDiscoverDetail(article, publishedEvents, isEn));
          setCurrentPage('discover_detail');
        },
      });
    });

    const inviteExp = experiences.find((e) => e.id === 'private_listening');
    if (inviteExp) {
      list.push({
        id: `hl_inv_${inviteExp.id}`,
        tag: isEn ? 'Invitation' : 'Invitation',
        title: isEn ? inviteExp.titleEn : inviteExp.titleFr,
        meta: isEn ? 'On request' : 'Sur demande',
        image: inviteExp.image,
        onOpen: () => {
          setSelectedDiscoverItem(experienceToDiscoverDetail(inviteExp, isEn));
          setCurrentPage('discover_detail');
        },
      });
    }

    return list;
  }, [experiences, news, publishedEvents, isEn, setSelectedDiscoverItem, setCurrentPage]);

  // Flux vertical éditorial : sélection d'expériences + coulisses publiées
  const featuredExperiences = useMemo(() => experiences.slice(0, 3), [experiences]);
  const backstageHighlights = useMemo(() => hubItems.slice(0, 2), [hubItems]);

  // Opérations Flash & Surprises compactes (statuts réels, zéro faux compte à rebours)
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
        image: firstLive.officialPoster || firstLive.bannerImage || COMMUNITY_MEDIA.vipMezzanineImg,
      });
    }

    return items;
  }, [publishedEvents, surpriseClaimedToday, formattedToday, formattedTomorrow, isEn, language]);

  const scrollMemoriesRail = (direction: 'left' | 'right') => {
    const el = memoriesRailRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'right' ? delta : -delta,
      behavior: 'smooth',
    });
  };

  const openConcertMemories = (albumId: string | null) => {
    setSelectedMemoryAlbumId(albumId);
    setCurrentPage('memories');
  };

  const openMediaItem = (item: MediaHubItem) => {
    setSelectedMediaId(item.id);
    setCurrentPage('media_detail');
  };

  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* A. EN-TÊTE ÉDITORIAL + ACCÈS RAPIDES AUX 4 UNIVERS */}
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
            { label: 'Memories', onClick: () => openConcertMemories(null) },
            {
              label: isEn ? 'Experiences' : 'Expériences',
              onClick: () => setCurrentPage('privileged_access'),
            },
            {
              label: 'Flash & Surprises',
              onClick: () => setCurrentPage('flash_drops'),
            },
            {
              label: isEn ? 'Community' : 'Communauté',
              onClick: () => setCurrentPage('suggestions'),
            },
          ].map((navItem) => (
            <button
              key={navItem.label}
              type="button"
              onClick={navItem.onClick}
              className="min-h-[34px] px-3.5 rounded-full bg-[#0E0E0E] hover:bg-[#161616] border border-white/[0.12] hover:border-white/30 text-xs font-agrandir-semibold text-[#D0D0D0] hover:text-white whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              {navItem.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="space-y-9">
        {/* ===================================================================
            1. BANDEAU HORIZONTAL COMPACT : À LA UNE & ACTUALITÉS
           =================================================================== */}
        {editorialHighlights.length > 0 && (
          <ScrollReveal>
            <section className="space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white tracking-tight">
                  {isEn ? 'Featured & Editorial' : 'À la une & Sélections'}
                </h2>
                <span className="text-[11px] text-[#9A9A9A]">
                  {isEn ? 'Latest updates' : 'Sélection LUMARÉEL'}
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
                    <div className="w-[70px] h-[70px] rounded-[12px] overflow-hidden bg-[#141414] border border-white/[0.08] shrink-0">
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
            2. RAIL HORIZONTAL COMPACT : MEMORIES (CONCERTS, COULISSES, PHOTOS)
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#D4AF6A]">
                  {isEn ? 'CONCERTS · BACKSTAGE · MEDIA' : 'CONCERTS · COULISSES · SOUVENIRS'}
                </p>
                <h2 className="mt-0.5 font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  Memories
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollMemoriesRail('left')}
                    aria-label={isEn ? 'Scroll left' : 'Défiler à gauche'}
                    className="w-8 h-8 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollMemoriesRail('right')}
                    aria-label={isEn ? 'Scroll right' : 'Défiler à droite'}
                    className="w-8 h-8 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => openConcertMemories(null)}
                  className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer whitespace-nowrap"
                >
                  {isEn ? 'View all' : 'Tout voir'}
                </button>
              </div>
            </div>

            {memoryPreviews.length > 0 && (
              <div
                ref={memoriesRailRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-5 px-5 sm:mx-0 sm:px-0"
              >
                {memoryPreviews.map((poster) => (
                  <button
                    key={poster.id}
                    type="button"
                    onClick={() => openConcertMemories(poster.albumId)}
                    className="group shrink-0 snap-start w-[144px] sm:w-[174px] text-left cursor-pointer block lum-press"
                  >
                    <div className="relative aspect-[3/4] w-full rounded-[15px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/35 transition-colors">
                      <img
                        src={poster.image}
                        alt={poster.artist}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                      <div className="absolute inset-x-3 bottom-2.5">
                        <p className="font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-tight text-white leading-tight truncate group-hover:text-[#D4AF6A] transition-colors">
                          {poster.artist}
                        </p>
                        <p className="text-[10px] text-[#C8C8C8] truncate mt-0.5">
                          {poster.date}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* ===================================================================
            3. FLUX VERTICAL ÉDITORIAL : EXPÉRIENCES, INVITATIONS & COULISSES
           =================================================================== */}
        <ScrollReveal>
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Colonne principale : Expériences & Invitations (format vertical éditorial) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#D4AF6A]">
                    {isEn ? 'ACCESS · INVITATIONS · MEETS' : 'ACCÈS SPÉCIAUX · INVITATIONS · RENCONTRES'}
                  </p>
                  <h2 className="mt-0.5 font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                    {isEn ? 'Experiences' : 'Expériences'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('privileged_access')}
                  className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  {isEn ? 'All experiences' : 'Tout voir'}
                </button>
              </div>

              <div className="divide-y divide-white/[0.10] border-y border-white/[0.10]">
                {featuredExperiences.map((exp) => {
                  const statusMeta = getExperienceStatusLabel(exp.status, isEn);
                  return (
                    <button
                      key={exp.id}
                      type="button"
                      onClick={() => {
                        setSelectedDiscoverItem(experienceToDiscoverDetail(exp, isEn));
                        setCurrentPage('discover_detail');
                      }}
                      className="w-full py-3.5 flex items-center gap-3.5 text-left group cursor-pointer"
                    >
                      <div className="w-[76px] h-[76px] sm:w-[84px] sm:h-[84px] rounded-[14px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] shrink-0">
                        <img
                          src={exp.image}
                          alt={isEn ? exp.titleEn : exp.titleFr}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A]">
                            {isEn ? exp.categoryEn : exp.categoryFr}
                          </span>
                          <StatusBadge variant={statusMeta.variant} label={statusMeta.label} />
                        </div>
                        <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white leading-snug truncate group-hover:text-[#D4AF6A] transition-colors">
                          {isEn ? exp.titleEn : exp.titleFr}
                        </h3>
                        <p className="text-xs text-[#9A9A9A] line-clamp-1">
                          {isEn ? exp.shortDescEn : exp.shortDescFr}
                        </p>
                      </div>

                      <ChevronRight
                        className="w-4 h-4 text-[#777] group-hover:text-white shrink-0 transition-colors"
                        strokeWidth={1.6}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Colonne secondaire : Coulisses & Publications verticales */}
            {backstageHighlights.length > 0 && (
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#9A9A9A]">
                      {isEn ? 'INSIDE LUMARÉEL' : 'DANS LES COULISSES'}
                    </p>
                    <h2 className="mt-0.5 font-agrandir-extrabold text-xl text-white tracking-tight">
                      {isEn ? 'Stories & Backstage' : 'Publications & Coulisses'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => openConcertMemories(null)}
                    className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer shrink-0"
                  >
                    Memories
                  </button>
                </div>

                <div className="divide-y divide-white/[0.10] border-y border-white/[0.10]">
                  {backstageHighlights.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openMediaItem(item)}
                      className="w-full py-3.5 flex items-center gap-3.5 text-left group cursor-pointer"
                    >
                      <div className="w-[72px] h-[54px] rounded-[11px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] shrink-0">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={isEn ? item.titleEn || item.title : item.title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#D4AF6A] truncate">
                          {item.tag || (isEn ? 'Backstage' : 'Coulisses')}
                          {item.duration ? ` · ${item.duration}` : ''}
                        </p>
                        <h3 className="font-agrandir-extrabold text-sm text-white leading-snug line-clamp-1 group-hover:text-[#D4AF6A] transition-colors">
                          {isEn ? item.titleEn || item.title : item.title}
                        </h3>
                        <p className="text-xs text-[#9A9A9A] line-clamp-1">
                          {isEn ? item.descriptionEn || item.description : item.description}
                        </p>
                      </div>
                      <ChevronRight
                        className="w-4 h-4 text-[#777] group-hover:text-white shrink-0"
                        strokeWidth={1.6}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        </ScrollReveal>

        {/* ===================================================================
            4. BANDEAU HORIZONTAL COMPACT : FLASH & SURPRISES
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#D4AF6A]">
                  {isEn ? 'LIMITED WINDOWS' : 'OPPORTUNITÉS PONCTUELLES'}
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
            5. ENTRÉE COMPACTE : COMMUNAUTÉ (FAIBLE ENCOMBREMENT VISUEL)
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
      </div>
    </div>
  );
};
