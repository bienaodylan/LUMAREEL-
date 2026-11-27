import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArchiveProduction } from '../types';
import { buildConcertMemoryAlbums, ConcertMemoryAlbum } from '../utils/communityStorage';
import { formatDateLong } from '../utils/dateUtils';
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Image as ImageIcon,
  MapPin,
  Play,
  X,
} from 'lucide-react';

interface ArchiveEventEntry {
  id: string;
  title: string;
  artist: string;
  dateLabel: string;
  year: string;
  venue: string;
  city: string;
  country: string;
  description: string;
  coverImage: string;
  artists: string[];
  youtubeEmbedUrl: string;
  duration?: string;
  photos: string[];
}

function mergePublicArchives(
  archives: ArchiveProduction[],
  albums: ConcertMemoryAlbum[],
  language: 'fr' | 'en'
): ArchiveEventEntry[] {
  const byId = new Map<string, ArchiveEventEntry>();

  for (const item of archives) {
    if (item.isPublished === false) continue;
    const photos = Array.isArray(item.photos) && item.photos.length > 0 ? item.photos : [item.coverImage];
    byId.set(item.id, {
      id: item.id,
      title: item.title,
      artist: (item.artists && item.artists[0]) || item.title,
      dateLabel: item.date ? formatDateLong(item.date, language) : item.year,
      year: item.year || (item.date ? item.date.slice(0, 4) : ''),
      venue: item.venue,
      city: item.city,
      country: item.country,
      description: item.description,
      coverImage: item.coverImage,
      artists: item.artists || [],
      youtubeEmbedUrl: item.youtubeEmbedUrl || '',
      duration: item.duration,
      photos,
    });
  }

  for (const album of albums) {
    if (byId.has(album.id)) continue;
    const photos =
      album.officialPhotos.length > 0
        ? album.officialPhotos.map((p) => p.url)
        : [album.coverImage];
    byId.set(album.id, {
      id: album.id,
      title: album.title,
      artist: album.artist || album.title,
      dateLabel: album.date,
      year: album.date.match(/\b20\d{2}\b/)?.[0] || '2026',
      venue: album.venue,
      city: album.city,
      country: 'Côte d’Ivoire',
      description: '',
      coverImage: album.coverImage,
      artists: album.artist ? [album.artist] : [],
      youtubeEmbedUrl: album.recapEmbedUrl,
      duration: album.recapDuration,
      photos,
    });
  }

  return Array.from(byId.values());
}

/**
 * ARCHIVES LUMARÉEL — Mémoire publique des événements passés.
 * Présentation éditoriale compacte (format KOMI) :
 * - Navigation par événements passés (affiches, infos, photos publiques, vidéos récapitulatives)
 * - Page récapitulative dédiée par concert
 * - Aucun contenu privé membre ou Black Card mélangé ici (réservé à Memories)
 */
export const ArchiveView: React.FC = () => {
  const {
    archives,
    selectedArchiveId,
    setSelectedArchiveId,
    setCurrentPage,
    language,
  } = useApp();

  const isEn = language === 'en';

  const publishedArchives = useMemo(
    () => (archives || []).filter((item) => item.isPublished !== false),
    [archives]
  );

  const fallbackAlbums = useMemo(
    () => buildConcertMemoryAlbums(publishedArchives),
    [publishedArchives]
  );

  const entries = useMemo(
    () => mergePublicArchives(publishedArchives, fallbackAlbums, language),
    [publishedArchives, fallbackAlbums, language]
  );

  const [activeId, setActiveId] = useState<string | null>(() => {
    if (!selectedArchiveId) return null;
    return entries.some((e) => e.id === selectedArchiveId) ? selectedArchiveId : null;
  });
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    if (selectedArchiveId) {
      const match = entries.find((e) => e.id === selectedArchiveId);
      setActiveId(match ? match.id : null);
      setIsVideoPlaying(false);
      setLightboxIdx(null);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } else {
      setActiveId(null);
    }
  }, [selectedArchiveId, entries]);

  const years = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.year) set.add(e.year);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (selectedYear === 'all') return entries;
    return entries.filter((e) => e.year === selectedYear);
  }, [entries, selectedYear]);

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeId) || null,
    [entries, activeId]
  );

  const openRecap = (id: string) => {
    setSelectedArchiveId(id);
    setActiveId(id);
    setIsVideoPlaying(false);
    setLightboxIdx(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const closeRecap = () => {
    setSelectedArchiveId(null);
    setActiveId(null);
    setIsVideoPlaying(false);
    setLightboxIdx(null);
  };

  // =========================================================================
  // PAGE RÉCAPITULATIVE D'UN CONCERT ARCHIVÉ
  // =========================================================================
  if (activeEntry) {
    const otherEntries = entries.filter((e) => e.id !== activeEntry.id).slice(0, 4);
    const embedSrc = activeEntry.youtubeEmbedUrl
      ? `${activeEntry.youtubeEmbedUrl}${
          activeEntry.youtubeEmbedUrl.includes('?') ? '&' : '?'
        }autoplay=1`
      : '';

    return (
      <div
        className="min-h-screen w-full max-w-[1040px] mx-auto px-5 sm:px-8 pb-24 bg-black text-white font-agrandir-regular"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* Retour Archives */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeRecap}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
            <span>Archives</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentPage('explore')}
            className="text-xs text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
          >
            Discover
          </button>
        </div>

        {/* En-tête compact + affiche proportionnée (pas de bannière démesurée) */}
        <article className="space-y-8">
          <section className="grid grid-cols-1 sm:grid-cols-12 gap-5 sm:gap-7 items-start">
            <div className="sm:col-span-4 max-w-[240px] sm:max-w-none w-full">
              <div className="aspect-[3/4] w-full rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                <img
                  src={activeEntry.coverImage}
                  alt={activeEntry.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="sm:col-span-8 space-y-4">
              <div className="space-y-1.5">
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  {isEn ? 'PUBLIC EVENT ARCHIVE' : 'ARCHIVE PUBLIQUE · ÉVÉNEMENT PASSÉ'}
                </p>
                <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl text-white tracking-tight leading-tight">
                  {activeEntry.artist}
                </h1>
                {activeEntry.title &&
                  activeEntry.title.toLowerCase() !== activeEntry.artist.toLowerCase() && (
                    <p className="text-sm sm:text-base text-[#C8C8C8] font-agrandir-semibold">
                      {activeEntry.title}
                    </p>
                  )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#C8C8C8] py-3 border-y border-white/[0.10]">
                <span>{activeEntry.dateLabel}</span>
                <span className="inline-flex items-center gap-1 text-[#9A9A9A]">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF6A]" strokeWidth={1.6} />
                  <span>
                    {activeEntry.venue}
                    {activeEntry.city ? `, ${activeEntry.city}` : ''}
                  </span>
                </span>
                <span className="text-[#9A9A9A]">
                  {activeEntry.photos.length} {isEn ? 'photos' : 'photos'}
                </span>
              </div>

              {activeEntry.description && (
                <p className="text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
                  {activeEntry.description}
                </p>
              )}

              {activeEntry.artists.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {activeEntry.artists.map((artistName) => (
                    <span
                      key={artistName}
                      className="px-2.5 py-1 rounded-full bg-[#0E0E0E] border border-white/[0.12] text-[11px] text-[#D0D0D0]"
                    >
                      {artistName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Vidéo récapitulative publique */}
          {activeEntry.youtubeEmbedUrl && (
            <section className="space-y-3 pt-4 border-t border-white/[0.10]">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white">
                  {isEn ? 'Official recap video' : 'Vidéo récapitulative'}
                </h2>
                {activeEntry.duration && (
                  <span className="text-[11px] font-mono text-[#9A9A9A]">
                    {activeEntry.duration}
                  </span>
                )}
              </div>

              <div className="relative aspect-[16/9] max-h-[420px] w-full rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                {isVideoPlaying ? (
                  <>
                    <iframe
                      src={embedSrc}
                      title={activeEntry.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <button
                      type="button"
                      onClick={() => setIsVideoPlaying(false)}
                      aria-label={isEn ? 'Close video' : 'Fermer la vidéo'}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/80 text-white border border-white/20 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsVideoPlaying(true)}
                    className="group w-full h-full relative cursor-pointer block"
                  >
                    <img
                      src={activeEntry.coverImage}
                      alt={activeEntry.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover brightness-[0.82] group-hover:scale-[1.02] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                      <span className="w-14 h-14 rounded-full bg-black/70 group-hover:bg-[#D4AF6A] text-white group-hover:text-black border border-white/25 flex items-center justify-center transition-colors">
                        <Play className="w-5 h-5 ml-0.5 fill-current" strokeWidth={1.6} />
                      </span>
                    </div>
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Galerie photos publiques */}
          {activeEntry.photos.length > 0 && (
            <section className="space-y-3 pt-4 border-t border-white/[0.10]">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white">
                  {isEn ? 'Public photo gallery' : 'Photos publiques'}
                </h2>
                <span className="text-xs text-[#9A9A9A] tabular-nums">
                  {activeEntry.photos.length} {isEn ? 'images' : 'photos'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {activeEntry.photos.map((photoUrl, idx) => (
                  <button
                    key={`${photoUrl}_${idx}`}
                    type="button"
                    onClick={() => setLightboxIdx(idx)}
                    className="group aspect-square rounded-[13px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] hover:border-white/30 cursor-pointer block"
                  >
                    <img
                      src={photoUrl}
                      alt={`${activeEntry.title} — ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Autres événements passés */}
          {otherEntries.length > 0 && (
            <section className="space-y-3 pt-6 border-t border-white/[0.10]">
              <h2 className="font-agrandir-extrabold text-base text-white">
                {isEn ? 'More past events' : 'Autres événements archivés'}
              </h2>
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
                {otherEntries.map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openRecap(ev.id)}
                    className="group shrink-0 snap-start w-[156px] text-left cursor-pointer block lum-press"
                  >
                    <div className="relative aspect-[3/4] rounded-[13px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/35 transition-colors">
                      <img
                        src={ev.coverImage}
                        alt={ev.artist}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
                      <div className="absolute inset-x-2.5 bottom-2">
                        <p className="font-agrandir-extrabold text-xs uppercase text-white truncate group-hover:text-[#D4AF6A] transition-colors">
                          {ev.artist}
                        </p>
                        <p className="text-[10px] text-[#C8C8C8] truncate">{ev.dateLabel}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </article>

        {/* Lightbox photo */}
        {lightboxIdx !== null && activeEntry.photos[lightboxIdx] && (
          <div
            className="fixed inset-0 z-[95] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}
          >
            <div className="max-w-4xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#C8C8C8] font-mono tabular-nums">
                  {lightboxIdx + 1} / {activeEntry.photos.length} · {activeEntry.artist}
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxIdx(null)}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative flex items-center justify-center">
                {activeEntry.photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIdx(
                        (lightboxIdx - 1 + activeEntry.photos.length) % activeEntry.photos.length
                      )
                    }
                    aria-label={isEn ? 'Previous' : 'Précédente'}
                    className="absolute left-2 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                <img
                  src={activeEntry.photos[lightboxIdx]}
                  alt={activeEntry.title}
                  referrerPolicy="no-referrer"
                  className="max-h-[76vh] w-auto rounded-[14px] object-contain"
                />
                {activeEntry.photos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxIdx((lightboxIdx + 1) % activeEntry.photos.length)}
                    aria-label={isEn ? 'Next' : 'Suivante'}
                    className="absolute right-2 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // INDEX DES ARCHIVES — NAVIGATION PAR ÉVÉNEMENTS PASSÉS (FORMAT ÉDITORIAL)
  // =========================================================================
  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-24 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="mb-7 space-y-4">
        <button
          type="button"
          onClick={() => setCurrentPage('explore')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>Discover</span>
        </button>

        <header className="space-y-1.5">
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#D4AF6A]">
            {isEn ? 'PAST EVENTS · PUBLIC RECAPS' : 'ÉVÉNEMENTS PASSÉS · MÉMOIRE PUBLIQUE'}
          </p>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-none">
            Archives
          </h1>
          <p className="text-xs sm:text-sm text-[#9A9A9A] max-w-xl">
            {isEn
              ? 'Posters, public photos, official recaps and details of past LUMARÉEL concerts.'
              : 'Affiches, photos publiques, vidéos et récapitulatifs des événements passés LUMARÉEL.'}
          </p>
        </header>

        {/* Filtre par année (uniquement s'il y a plusieurs années) */}
        {years.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
            <button
              type="button"
              onClick={() => setSelectedYear('all')}
              className={`min-h-[34px] px-3.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer ${
                selectedYear === 'all'
                  ? 'bg-white text-black font-agrandir-extrabold'
                  : 'border border-white/20 text-[#C8C8C8] hover:border-white/50 hover:text-white'
              }`}
            >
              {isEn ? 'All editions' : 'Toutes les éditions'}
            </button>
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                onClick={() => setSelectedYear(yr)}
                className={`min-h-[34px] px-3.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  selectedYear === yr
                    ? 'bg-white text-black font-agrandir-extrabold'
                    : 'border border-white/20 text-[#C8C8C8] hover:border-white/50 hover:text-white'
                }`}
              >
                {yr}
              </button>
            ))}
          </div>
        )}
      </div>

      {filteredEntries.length === 0 ? (
        <div className="py-14 px-6 text-center rounded-[18px] bg-[#0E0E0E] border border-white/[0.12] max-w-md mx-auto space-y-2">
          <Film className="w-7 h-7 text-[#D4AF6A] mx-auto" strokeWidth={1.6} />
          <p className="font-agrandir-extrabold text-sm text-white">
            {isEn ? 'No archived events yet' : 'Aucun événement archivé pour le moment'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.10] border-y border-white/[0.10]">
          {filteredEntries.map((ev) => (
            <button
              key={ev.id}
              type="button"
              onClick={() => openRecap(ev.id)}
              className="w-full py-4 flex items-center gap-4 text-left group cursor-pointer"
            >
              <div className="w-[74px] sm:w-[88px] aspect-[3/4] rounded-[13px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/35 shrink-0 transition-colors">
                <img
                  src={ev.coverImage}
                  alt={ev.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#D4AF6A] truncate">
                  {ev.dateLabel}
                </p>
                <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white group-hover:text-[#D4AF6A] transition-colors truncate">
                  {ev.artist}
                </h2>
                <p className="text-xs text-[#9A9A9A] truncate">
                  {ev.venue}
                  {ev.city ? `, ${ev.city}` : ''}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#C8C8C8]">
                  <span className="inline-flex items-center gap-1">
                    <ImageIcon className="w-3 h-3 text-[#9A9A9A]" strokeWidth={1.6} />
                    <span>{ev.photos.length} photos</span>
                  </span>
                  {ev.youtubeEmbedUrl && (
                    <span className="inline-flex items-center gap-1">
                      <Play className="w-3 h-3 text-[#D4AF6A]" strokeWidth={1.6} />
                      <span>{isEn ? 'Recap video' : 'Récap vidéo'}</span>
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight
                className="w-4 h-4 text-[#777] group-hover:text-white shrink-0 transition-colors"
                strokeWidth={1.6}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};