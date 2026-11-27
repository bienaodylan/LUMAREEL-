import React, { useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  buildConcertMemoryAlbums,
  computeUserPointsSummary,
  loadUserPointsState,
} from '../utils/communityStorage';
import { ScrollReveal } from './ui/LumareelKit';
import { Icons } from './ui/Icons';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface SouvenirPosterCard {
  id: string;
  albumId: string;
  artist: string;
  date: string;
  venue: string;
  image: string;
}

/**
 * Explorer — Page complète épurée (Noir & Blanc dominant, arrondis modernes 18px).
 * - Zéro bloc Backstage ni Archives : tout l'univers concert vit dans Souvenirs
 * - Rail horizontal scrollable d'affiches concerts/artistes (Souvenirs -> Écran 07 direct)
 * - Catalogue visuel standardisé via la bibliothèque centralisée `Icons` (Noir & Blanc)
 */
export const ExplorerView: React.FC = () => {
  const {
    events,
    archives,
    currentUser,
    customerOrders,
    setCurrentPage,
    setSelectedMemoryAlbumId,
    setRewardsInitialMode,
    language,
  } = useApp();

  const isEn = language === 'en';
  const souvenirsRailRef = useRef<HTMLDivElement>(null);

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

  // Rail horizontal des concerts / artistes pour Souvenirs (chaque clic ouvre directement l'Écran 07)
  const souvenirPosters = useMemo<SouvenirPosterCard[]>(() => {
    const items: SouvenirPosterCard[] = memoryAlbums.map((album) => ({
      id: `album_${album.id}`,
      albumId: album.id,
      artist: album.artist || album.title,
      date: album.date,
      venue: album.venue,
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
        venue: ev.venue,
        image: img,
      });
    }

    return items;
  }, [memoryAlbums, publishedEvents]);

  const pointsSummary = useMemo(() => {
    const state = loadUserPointsState(currentUser);
    return computeUserPointsSummary(currentUser, customerOrders || [], state);
  }, [currentUser, customerOrders]);

  const scrollRail = (direction: 'left' | 'right') => {
    const el = souvenirsRailRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.72);
    el.scrollBy({
      left: direction === 'right' ? delta : -delta,
      behavior: 'smooth',
    });
  };

  const openConcertSouvenir = (albumId: string) => {
    setSelectedMemoryAlbumId(albumId);
    setCurrentPage('memories');
  };

  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.75rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* En-tête Explorer épuré */}
      <header className="mb-8">
        <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.26em] text-[#9A9A9A] mb-1.5">
          {isEn ? 'THE LUMARÉEL UNIVERSE' : 'L’UNIVERS LUMARÉEL'}
        </p>
        <h1 className="font-agrandir-extrabold text-4xl sm:text-5xl text-white tracking-tight leading-none">
          {isEn ? 'Explore' : 'Explorer'}
        </h1>
      </header>

      <div className="space-y-12">
        {/* ===================================================================
            1. SOUVENIRS DE CONCERT — RAIL HORIZONTAL D'AFFICHES CONCERT / ARTISTE
               (Scroll de droite à gauche · Clic direct vers l'Écran 07 du concert)
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-none">
                  {isEn ? 'Memories' : 'Souvenirs'}
                </h2>
                <p className="text-xs text-[#9A9A9A] mt-1.5">
                  {isEn
                    ? 'Tap a concert to open its official gallery.'
                    : 'Touchez un concert pour ouvrir sa page souvenir.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => scrollRail('left')}
                    aria-label={isEn ? 'Scroll left' : 'Défiler à gauche'}
                    className="w-9 h-9 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollRail('right')}
                    aria-label={isEn ? 'Scroll right' : 'Défiler à droite'}
                    className="w-9 h-9 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemoryAlbumId(null);
                    setCurrentPage('memories');
                  }}
                  className="text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer pl-2"
                >
                  {isEn ? 'All' : 'Tout voir'}
                </button>
              </div>
            </div>

            {/* Rail scrollable horizontalement (droite -> gauche) */}
            <div
              ref={souvenirsRailRef}
              className="flex gap-3.5 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-5 px-5 sm:mx-0 sm:px-0"
            >
              {souvenirPosters.map((poster) => (
                <button
                  key={poster.id}
                  type="button"
                  onClick={() => openConcertSouvenir(poster.albumId)}
                  className="group shrink-0 snap-start w-[44vw] sm:w-[215px] lg:w-[235px] text-left cursor-pointer block lum-press"
                >
                  <div className="relative aspect-[3/4] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/35 transition-colors">
                    <img
                      src={poster.image}
                      alt={poster.artist}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-85" />
                    <div className="absolute inset-x-3.5 bottom-3.5">
                      <p className="font-agrandir-extrabold text-sm sm:text-base uppercase tracking-tight text-white leading-tight truncate group-hover:text-[#D4AF6A] transition-colors">
                        {poster.artist}
                      </p>
                      <p className="text-[11px] text-[#C8C8C8] truncate mt-0.5">
                        {poster.date}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </ScrollReveal>

        {/* ===================================================================
            2. CATALOGUE VISUEL COMMUNAUTÉ & AVANTAGES (CENTRALIZED `Icons` B&W)
           =================================================================== */}
        <ScrollReveal>
          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Icons.Community size="sm" accent="mono" />
                <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-none">
                  {isEn ? 'Community & Perks' : 'Communauté & Avantages'}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* 01 · Mes points & Rewards Store */}
              <button
                type="button"
                onClick={() => {
                  setRewardsInitialMode('points');
                  setCurrentPage('rewards');
                }}
                className="group p-4 sm:p-5 rounded-[18px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/30 text-left flex flex-col justify-between min-h-[152px] transition-colors cursor-pointer lum-press"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icons.RewardsStore size="lg" accent="mono" />
                  <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                    {pointsSummary.availablePoints.toLocaleString('fr-FR')} pts
                  </span>
                </div>
                <div className="pt-4">
                  <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors leading-tight">
                    {isEn ? 'My Points' : 'Mes points'}
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">
                    Rewards Store
                  </p>
                </div>
              </button>

              {/* 02 · Parrainage */}
              <button
                type="button"
                onClick={() => {
                  setRewardsInitialMode('referral');
                  setCurrentPage('rewards');
                }}
                className="group p-4 sm:p-5 rounded-[18px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/30 text-left flex flex-col justify-between min-h-[152px] transition-colors cursor-pointer lum-press"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icons.Referral size="lg" accent="mono" />
                  <span className="text-[11px] font-mono font-bold text-white tabular-nums">
                    +200 pts
                  </span>
                </div>
                <div className="pt-4">
                  <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors leading-tight">
                    {isEn ? 'Referral' : 'Parrainage'}
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">
                    {isEn ? 'Invite & earn' : 'Inviter un proche'}
                  </p>
                </div>
              </button>

              {/* 03 · Flash Drops */}
              <button
                type="button"
                onClick={() => setCurrentPage('flash_drops')}
                className="group p-4 sm:p-5 rounded-[18px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/30 text-left flex flex-col justify-between min-h-[152px] transition-colors cursor-pointer lum-press"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icons.FlashDrops size="lg" accent="mono" />
                  <span className="text-[10px] font-mono uppercase text-[#9A9A9A]">
                    DROP
                  </span>
                </div>
                <div className="pt-4">
                  <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors leading-tight">
                    Flash Drops
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">
                    {isEn ? 'Limited drops' : 'Ventes éclair'}
                  </p>
                </div>
              </button>

              {/* 04 · Accès privilégié */}
              <button
                type="button"
                onClick={() => setCurrentPage('privileged_access')}
                className="group p-4 sm:p-5 rounded-[18px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/30 text-left flex flex-col justify-between min-h-[152px] transition-colors cursor-pointer lum-press"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icons.PriorityAccess size="lg" accent="mono" />
                  <span className="text-[10px] font-mono uppercase text-[#9A9A9A]">
                    VIP
                  </span>
                </div>
                <div className="pt-4">
                  <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors leading-tight">
                    {isEn ? 'Priority Access' : 'Accès privilégié'}
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">
                    {isEn ? 'Reserved quotas' : 'Quotas dédiés'}
                  </p>
                </div>
              </button>

              {/* 05 · Boîte à suggestions */}
              <button
                type="button"
                onClick={() => setCurrentPage('suggestions')}
                className="col-span-2 sm:col-span-1 group p-4 sm:p-5 rounded-[18px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] hover:border-white/30 text-left flex flex-col justify-between min-h-[132px] sm:min-h-[152px] transition-colors cursor-pointer lum-press"
              >
                <div className="flex items-start justify-between gap-2">
                  <Icons.Suggestions size="lg" accent="mono" />
                  <ChevronRight
                    className="w-4 h-4 text-[#9A9A9A] group-hover:text-white transition-colors"
                    strokeWidth={1.6}
                  />
                </div>
                <div className="pt-4">
                  <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white group-hover:text-[#D4AF6A] transition-colors leading-tight">
                    {isEn ? 'Suggestions' : 'Suggestions'}
                  </h3>
                  <p className="text-[11px] text-[#9A9A9A] mt-0.5 truncate">
                    {isEn ? 'Vote for artists' : 'Voter & proposer'}
                  </p>
                </div>
              </button>
            </div>
          </section>
        </ScrollReveal>
      </div>
    </div>
  );
};
