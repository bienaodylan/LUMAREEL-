import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  buildConcertMemoryAlbums,
  computeUserPointsSummary,
  loadUserPointsState,
} from '../utils/communityStorage';
import {
  MediaHubItem,
  getPublishedMediaItems,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import {
  CountdownTimer,
  ScrollReveal,
  SectionHeader,
  Tabs,
} from './ui/LumareelKit';
import { ArrowRight, ChevronRight, Lightbulb, Play, Star } from 'lucide-react';

type ExplorerSectionTab = 'experiences' | 'communaute' | 'plus';
type ArchiveYearFilter = 'all' | '2026' | '2025' | 'concerts';

/**
 * 02 — Explorer (page complète dédiée, 0px sur les cartes/visuels).
 * A Expériences (Backstage, Souvenirs, Flash Drops),
 * B Communauté (Points & Parrainage, Boîte à suggestions),
 * C Pour aller plus loin (Archives filtrables).
 */
export const ExplorerView: React.FC = () => {
  const {
    events,
    archives,
    currentUser,
    customerOrders,
    setCurrentPage,
    setSelectedEventSlug,
    setSelectedMediaId,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [activeTab, setActiveTab] = useState<ExplorerSectionTab>('experiences');
  const [archiveFilter, setArchiveFilter] = useState<ArchiveYearFilter>('all');
  const [publishedMedia, setPublishedMedia] = useState<MediaHubItem[]>(() =>
    getPublishedMediaItems()
  );

  useEffect(() => {
    const sync = () => setPublishedMedia(getPublishedMediaItems());
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

  const featuredBackstage = useMemo(
    () => publishedMedia.find((m) => m.placement === 'backstage') || null,
    [publishedMedia]
  );

  const souvenirStripImages = useMemo(() => {
    const urls: string[] = [];
    for (const album of memoryAlbums) {
      if (album.coverImage && !urls.includes(album.coverImage)) {
        urls.push(album.coverImage);
      }
      if (urls.length >= 3) break;
    }
    while (urls.length < 3) {
      urls.push(
        [
          COMMUNITY_MEDIA.concertMemoriesCrowdImg,
          COMMUNITY_MEDIA.crowdArchiveImg,
          COMMUNITY_MEDIA.vipMezzanineImg,
        ][urls.length]
      );
    }
    return urls.slice(0, 3);
  }, [memoryAlbums]);

  const pointsSummary = useMemo(() => {
    const state = loadUserPointsState(currentUser);
    return computeUserPointsSummary(currentUser, customerOrders || [], state);
  }, [currentUser, customerOrders]);

  const filteredArchives = useMemo(() => {
    if (archiveFilter === 'all' || archiveFilter === 'concerts') return publishedArchives;
    return publishedArchives.filter(
      (a) => String(a.year) === archiveFilter || (a.date || '').includes(archiveFilter)
    );
  }, [publishedArchives, archiveFilter]);

  const scrollToAnchor = (tab: ExplorerSectionTab) => {
    setActiveTab(tab);
    const el = document.getElementById(`explorer-section-${tab}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const primaryEvent = publishedEvents[0];
  const secondaryEvent = publishedEvents[1] || publishedEvents[0];

  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-16 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.75rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* En-tête Explorer */}
      <header className="mb-8">
        <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#D4AF6A] mb-1.5">
          {isEn ? 'THE LUMARÉEL UNIVERSE' : 'L’UNIVERS LUMARÉEL'}
        </p>
        <h1 className="font-agrandir-extrabold text-4xl sm:text-5xl text-white tracking-tight leading-none">
          {isEn ? 'Explore' : 'Explorer'}
        </h1>

        <Tabs
          className="mt-6"
          activeId={activeTab}
          onChange={scrollToAnchor}
          items={[
            { id: 'experiences', label: isEn ? 'Experiences' : 'Expériences' },
            { id: 'communaute', label: isEn ? 'Community' : 'Communauté' },
            { id: 'plus', label: isEn ? 'Go further' : 'Aller plus loin' },
          ]}
        />
      </header>

      <div className="space-y-14">
        {/* ===================================================================
            A · EXPÉRIENCES (BACKSTAGE + SOUVENIRS + FLASH DROPS)
           =================================================================== */}
        <ScrollReveal>
          <section id="explorer-section-experiences" className="scroll-mt-24 space-y-8">
            <SectionHeader letter="A" kicker={isEn ? 'EXPERIENCES' : 'EXPÉRIENCES'} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 items-start">
              {/* Carte héroïque BACKSTAGE (0px corners) */}
              <button
                type="button"
                onClick={() => {
                  if (featuredBackstage) {
                    setSelectedMediaId(featuredBackstage.id);
                    setCurrentPage('media_detail');
                  } else {
                    setCurrentPage('backstage');
                  }
                }}
                className="lg:col-span-7 group relative w-full aspect-[4/5] sm:aspect-[16/10] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] text-left cursor-pointer block lum-press"
              >
                <img
                  src={
                    featuredBackstage?.thumbnailUrl ||
                    featuredBackstage?.url ||
                    COMMUNITY_MEDIA.backstageSoundcheckImg
                  }
                  alt="BACKSTAGE LUMARÉEL"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/35" />

                {/* Top row : EXCLUSIF + VIDÉO · COULISSES */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/80 text-[10px] font-agrandir-extrabold uppercase tracking-[0.16em] text-white">
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>{isEn ? 'EXCLUSIVE' : 'EXCLUSIF'}</span>
                  </span>
                  <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#C8C8C8]">
                    {isEn ? 'VIDEO · BACKSTAGE' : 'VIDÉO · COULISSES'}
                  </span>
                </div>

                {/* Bottom text */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 space-y-2">
                  <h2 className="font-agrandir-extrabold text-3xl sm:text-4xl uppercase tracking-tight text-white leading-none">
                    BACKSTAGE
                  </h2>
                  <p className="text-xs sm:text-sm text-[#C8C8C8] leading-relaxed max-w-md">
                    {isEn
                      ? 'Behind the curtain: soundchecks, dressing rooms, the minutes before stage.'
                      : 'L’envers du décor : préparatifs, loges, les minutes avant la scène.'}
                  </p>
                </div>
              </button>

              {/* Colonne droite Desktop / Suite Mobile : Souvenirs 3-bandes + Flash Drops */}
              <div className="lg:col-span-5 space-y-8">
                {/* Aperçu Souvenirs 3 colonnes (0px corners) */}
                <button
                  type="button"
                  onClick={() => setCurrentPage('memories')}
                  className="group w-full text-left cursor-pointer block space-y-3 lum-press"
                >
                  <div className="grid grid-cols-3 gap-1.5 overflow-hidden">
                    {souvenirStripImages.map((src, i) => (
                      <div
                        key={i}
                        className="aspect-[3/4] bg-[#0E0E0E] border border-white/[0.12] overflow-hidden"
                      >
                        <img
                          src={src}
                          alt={`Souvenir ${i + 1}`}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div>
                      <h3 className="font-agrandir-extrabold text-2xl text-white tracking-tight group-hover:text-[#D4AF6A] transition-colors">
                        {isEn ? 'Memories' : 'Souvenirs'}
                      </h3>
                      <p className="text-xs text-[#9A9A9A] mt-0.5">
                        {isEn
                          ? 'Relive every edition in pictures.'
                          : 'Revivre chaque édition, en images.'}
                      </p>
                    </div>
                    <ArrowRight
                      className="w-5 h-5 text-white group-hover:text-[#D4AF6A] transition-colors shrink-0"
                      strokeWidth={1.6}
                    />
                  </div>
                </button>

                {/* Flash Drops */}
                <div className="pt-4 border-t border-[#D4AF6A]/55 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-agrandir-extrabold text-xl text-white tracking-tight">
                      Flash Drops
                    </h3>
                    <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-[#D4AF6A]">
                      ● 2 {isEn ? 'ACTIVE' : 'ACTIFS'}
                    </span>
                  </div>

                  <div className="divide-y divide-white/[0.12]">
                    <button
                      type="button"
                      onClick={() => setCurrentPage('flash_drops')}
                      className="w-full py-3.5 flex items-center justify-between gap-4 text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                          {primaryEvent
                            ? `${isEn ? 'Presale' : 'Prévente'} ${primaryEvent.artist} — Carré Or`
                            : 'Prévente membres — Carré Or'}
                        </p>
                        <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                          {isEn
                            ? 'Black Card exclusive · limited quota'
                            : 'Réservé Black Card · quantité limitée'}
                        </p>
                      </div>
                      <CountdownTimer className="text-xs font-bold text-[#D4AF6A] shrink-0" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setCurrentPage('flash_drops')}
                      className="w-full py-3.5 flex items-center justify-between gap-4 text-left group cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                          {secondaryEvent
                            ? `${isEn ? 'Ticket opening' : 'Ouverture des ventes'} — ${secondaryEvent.artist}`
                            : 'Ouverture des ventes — Prochaine édition'}
                        </p>
                        <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                          {isEn ? 'Early access · 48h' : 'Accès anticipé · 48 h'}
                        </p>
                      </div>
                      <span className="text-xs font-agrandir-extrabold text-white shrink-0">
                        {isEn ? 'Soon' : 'Bientôt'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* ===================================================================
            B · COMMUNAUTÉ (POINTS & PARRAINAGE + BOÎTE À SUGGESTIONS)
           =================================================================== */}
        <ScrollReveal>
          <section id="explorer-section-communaute" className="scroll-mt-24 space-y-3">
            <SectionHeader letter="B" kicker={isEn ? 'COMMUNITY' : 'COMMUNAUTÉ'} />

            <div className="border-y border-white/[0.12] divide-y divide-white/[0.12]">
              <button
                type="button"
                onClick={() => setCurrentPage('rewards')}
                className="w-full py-4 sm:py-5 flex items-center justify-between gap-4 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Star className="w-5 h-5 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                  <div className="min-w-0">
                    <p className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors">
                      {isEn ? 'Points & Referrals' : 'Points & Parrainage'}
                    </p>
                    <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                      {isEn
                        ? 'Balance, rewards, referral code'
                        : 'Solde, récompenses, code de parrainage'}
                    </p>
                  </div>
                </div>
                <span className="font-agrandir-extrabold text-sm text-white tabular-nums shrink-0">
                  {pointsSummary.availablePoints.toLocaleString('fr-FR')} pts
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('suggestions')}
                className="w-full py-4 sm:py-5 flex items-center justify-between gap-4 text-left group cursor-pointer"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <Lightbulb className="w-5 h-5 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                  <div className="min-w-0">
                    <p className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors">
                      {isEn ? 'Suggestion Box' : 'Boîte à suggestions'}
                    </p>
                    <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                      {isEn
                        ? 'An idea for LUMARÉEL? Tell us.'
                        : 'Une idée pour LUMARÉEL ? Dites-le.'}
                    </p>
                  </div>
                </div>
                <ChevronRight
                  className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0 transition-colors"
                  strokeWidth={1.6}
                />
              </button>
            </div>
          </section>
        </ScrollReveal>

        {/* ===================================================================
            C · POUR ALLER PLUS LOIN (ARCHIVES FILTRABLES)
           =================================================================== */}
        <ScrollReveal>
          <section id="explorer-section-plus" className="scroll-mt-24 space-y-8">
            <SectionHeader letter="C" kicker={isEn ? 'GO FURTHER' : 'POUR ALLER PLUS LOIN'} />

            {/* Archives */}
            <div className="space-y-4">
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-agrandir-extrabold text-2xl text-white tracking-tight">
                  Archives
                </h2>
                <button
                  type="button"
                  onClick={() => setCurrentPage('archive')}
                  className="text-xs sm:text-sm font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
                >
                  {isEn ? 'See all' : 'Tout voir'}
                </button>
              </div>

              {/* Filtres pillules (Toutes · 2026 · 2025 · Concerts) */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {[
                  { id: 'all' as const, label: isEn ? 'All' : 'Toutes' },
                  { id: '2026' as const, label: '2026' },
                  { id: '2025' as const, label: '2025' },
                  { id: 'concerts' as const, label: 'Concerts' },
                ].map((pill) => {
                  const active = archiveFilter === pill.id;
                  return (
                    <button
                      key={pill.id}
                      type="button"
                      onClick={() => setArchiveFilter(pill.id)}
                      className={`min-h-[36px] px-4 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer lum-press ${
                        active
                          ? 'bg-white text-black font-agrandir-extrabold'
                          : 'border border-white/[0.16] text-[#C8C8C8] hover:border-white/50 hover:text-white'
                      }`}
                    >
                      {pill.label}
                    </button>
                  );
                })}
              </div>

              {filteredArchives.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredArchives.slice(0, 4).map((arch) => (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => setCurrentPage('memories')}
                      className="group text-left cursor-pointer block lum-press"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                        <img
                          src={arch.coverImage || COMMUNITY_MEDIA.crowdArchiveImg}
                          alt={arch.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                      </div>
                      <div className="pt-2.5">
                        <h3 className="font-agrandir-extrabold text-sm uppercase text-white truncate group-hover:text-[#D4AF6A] transition-colors">
                          {(arch.artists && arch.artists[0]) || arch.title}
                        </h3>
                        <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">
                          {isEn ? 'Edition' : 'Édition'} {arch.year}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9A9A9A] py-4">
                  {isEn
                    ? 'No archived edition for this filter.'
                    : 'Aucune édition archivée pour ce filtre.'}
                </p>
              )}
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};
