import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Play,
  Share2,
  X,
} from 'lucide-react';
import crowdMemoriesImg from '../assets/images/concert_memories_crowd_1795735706315.jpg';
import concertsCrowdImg from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import soundcheckImg from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import studioSessionImg from '../assets/images/backstage_studio_session_1795735706831.jpg';
import vipLoungeImg from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';
import flashDropImg from '../assets/images/flash_vip_drop_1795735706997.jpg';
import dressingRoomImg from '../assets/images/backstage_artist_dressing_1795857144421.jpg';
import stageBeamsImg from '../assets/images/backstage_stage_beams_1795857146120.jpg';

type RawAlbum = {
  id: string;
  event_id: string;
  title: string;
  description: string;
  cover_path: string | null;
  recap_url: string | null;
  recap_duration: string | null;
  event?: {
    id?: string;
    title: string;
    artist: string;
    date: string;
    city: string;
    venue: string;
    official_poster?: string | null;
    banner_image?: string | null;
  } | null;
};

type RawPhoto = {
  id: string;
  album_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string;
  media_type: 'image' | 'video';
  downloadable: boolean;
  sort_order: number;
};

type MemoryPhoto = {
  id: string;
  url: string;
  sourceUrl: string;
  downloadUrl: string;
  caption?: string;
  mediaType: 'image' | 'video';
};

type MemoryEvent = {
  id: string;
  title: string;
  dateLabel: string;
  location: string;
  coverUrl: string;
  recapUrl: string;
  recapDuration: string;
  photos: MemoryPhoto[];
};

const PREVIEW_MEMORY_EVENTS: MemoryEvent[] = [
  {
    id: 'demo-mem-1',
    title: 'Nuit LUMARÉEL · Esplanade',
    dateLabel: '14 novembre 2026',
    location: 'Palais de la Culture · Abidjan',
    coverUrl: crowdMemoriesImg,
    recapUrl: 'https://www.youtube.com/watch?v=ScMzIvxBSi4',
    recapDuration: '03:48',
    photos: [
      { id: 'dm1-1', url: crowdMemoriesImg, sourceUrl: crowdMemoriesImg, downloadUrl: crowdMemoriesImg, mediaType: 'image' },
      { id: 'dm1-2', url: stageBeamsImg, sourceUrl: stageBeamsImg, downloadUrl: stageBeamsImg, mediaType: 'image' },
      { id: 'dm1-3', url: dressingRoomImg, sourceUrl: dressingRoomImg, downloadUrl: dressingRoomImg, mediaType: 'image' },
      { id: 'dm1-4', url: concertsCrowdImg, sourceUrl: concertsCrowdImg, downloadUrl: concertsCrowdImg, mediaType: 'image' },
      { id: 'dm1-5', url: soundcheckImg, sourceUrl: soundcheckImg, downloadUrl: soundcheckImg, mediaType: 'image' },
      { id: 'dm1-6', url: vipLoungeImg, sourceUrl: vipLoungeImg, downloadUrl: vipLoungeImg, mediaType: 'image' },
    ],
  },
  {
    id: 'demo-mem-2',
    title: 'Session Privée · Plateau',
    dateLabel: '26 octobre 2026',
    location: 'Lounge Panoramique · Abidjan',
    coverUrl: concertsCrowdImg,
    recapUrl: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
    recapDuration: '02:35',
    photos: [
      { id: 'dm2-1', url: concertsCrowdImg, sourceUrl: concertsCrowdImg, downloadUrl: concertsCrowdImg, mediaType: 'image' },
      { id: 'dm2-2', url: flashDropImg, sourceUrl: flashDropImg, downloadUrl: flashDropImg, mediaType: 'image' },
      { id: 'dm2-3', url: studioSessionImg, sourceUrl: studioSessionImg, downloadUrl: studioSessionImg, mediaType: 'image' },
      { id: 'dm2-4', url: vipLoungeImg, sourceUrl: vipLoungeImg, downloadUrl: vipLoungeImg, mediaType: 'image' },
    ],
  },
  {
    id: 'demo-mem-3',
    title: 'Black Card Showcase',
    dateLabel: '3 octobre 2026',
    location: 'Salle Lougah François · Abidjan',
    coverUrl: flashDropImg,
    recapUrl: '',
    recapDuration: '',
    photos: [
      { id: 'dm3-1', url: flashDropImg, sourceUrl: flashDropImg, downloadUrl: flashDropImg, mediaType: 'image' },
      { id: 'dm3-2', url: stageBeamsImg, sourceUrl: stageBeamsImg, downloadUrl: stageBeamsImg, mediaType: 'image' },
      { id: 'dm3-3', url: crowdMemoriesImg, sourceUrl: crowdMemoriesImg, downloadUrl: crowdMemoriesImg, mediaType: 'image' },
      { id: 'dm3-4', url: dressingRoomImg, sourceUrl: dressingRoomImg, downloadUrl: dressingRoomImg, mediaType: 'image' },
    ],
  },
];

const isDirectVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url) || url.includes('/storage/v1/object/sign/');

function inferExtension(urlOrPath: string, mimeType: string) {
  const clean = urlOrPath.split('?')[0];
  const fromPath = clean.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if (fromPath) return `.${fromPath}`;
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('webm')) return '.webm';
  return '.jpg';
}

function formatEventDate(dateStr?: string, isEn?: boolean) {
  if (!dateStr) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr.trim())) return dateStr;
  const parsed = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

async function triggerDownload(url: string, filenameBase: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('download_failed');
    const blob = await response.blob();
    const ext = inferExtension(url, blob.type || '');
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${filenameBase}${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
    return true;
  } catch {
    const link = document.createElement('a');
    link.href = url;
    link.download = filenameBase;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return false;
  }
}

export const ConcertMemoriesView: React.FC<{ embedded?: boolean }> = () => {
  const { archives, currentUser, showToast, language } = useApp();
  const isEn = language === 'en';

  const [clubAlbums, setClubAlbums] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [viewerChrome, setViewerChrome] = useState(true);
  const [activeRecap, setActiveRecap] = useState<MemoryEvent | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [downloadingBatch, setDownloadingBatch] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const loadClubAlbums = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setClubAlbums([]);
        return;
      }

      const { data: albumRows, error: albumError } = await supabase
        .from('club_moment_albums')
        .select('*, event:events(id,title,artist,date,city,venue,official_poster,banner_image)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (albumError || !albumRows?.length) {
        setClubAlbums([]);
        return;
      }

      const ids = albumRows.map((a: RawAlbum) => a.id);
      const { data: photoRows } = await supabase
        .from('club_moment_media')
        .select('*')
        .in('album_id', ids)
        .order('sort_order');

      const photosByAlbum: Record<string, MemoryPhoto[]> = {};
      await Promise.all(
        (photoRows || []).map(async (photo: RawPhoto) => {
          const previewPath = photo.thumbnail_path || photo.storage_path;
          const [preview, full] = await Promise.all([
            supabase.storage.from('club-media').createSignedUrl(previewPath, 900),
            photo.downloadable
              ? supabase.storage.from('club-media').createSignedUrl(photo.storage_path, 900)
              : Promise.resolve({ data: null }),
          ]);
          const previewUrl = preview.data?.signedUrl || '';
          const fullUrl = full.data?.signedUrl || '';
          if (!previewUrl && !fullUrl) return;
          if (!photosByAlbum[photo.album_id]) photosByAlbum[photo.album_id] = [];
          photosByAlbum[photo.album_id].push({
            id: photo.id,
            url: previewUrl || fullUrl,
            sourceUrl: photo.downloadable ? fullUrl || previewUrl : previewUrl,
            downloadUrl: photo.downloadable ? fullUrl || previewUrl : '',
            caption: photo.caption || '',
            mediaType: photo.media_type,
          });
        })
      );

      const resolved: MemoryEvent[] = await Promise.all(
        (albumRows as RawAlbum[]).map(async (album) => {
          let coverUrl = '';
          if (album.cover_path) {
            const { data: signed } = await supabase.storage
              .from('club-media')
              .createSignedUrl(album.cover_path, 900);
            coverUrl = signed?.signedUrl || '';
          }
          const albumPhotos = photosByAlbum[album.id] || [];
          if (!coverUrl) {
            coverUrl =
              albumPhotos[0]?.url ||
              album.event?.banner_image ||
              album.event?.official_poster ||
              '';
          }
          const loc = [album.event?.venue, album.event?.city].filter(Boolean).join(' · ');
          return {
            id: `club-${album.id}`,
            title: album.title || album.event?.title || 'LUMARÉEL',
            dateLabel: formatEventDate(album.event?.date, isEn),
            location: loc,
            coverUrl,
            recapUrl: album.recap_url || '',
            recapDuration: album.recap_duration || '',
            photos: albumPhotos,
          };
        })
      );

      setClubAlbums(resolved);
    } catch {
      setClubAlbums([]);
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void loadClubAlbums();
  }, [loadClubAlbums, currentUser?.id]);

  // Combine Club albums + real published Archives so Souvenirs is open to all members
  const allEvents = useMemo<MemoryEvent[]>(() => {
    const list: MemoryEvent[] = [...clubAlbums];
    const seenTitles = new Set(list.map((e) => e.title.trim().toLowerCase()));

    const publishedArchives = (archives || [])
      .filter((a) => a.isPublished !== false)
      .slice()
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

    for (const arch of publishedArchives) {
      const normalized = arch.title.trim().toLowerCase();
      if (seenTitles.has(normalized)) continue;
      seenTitles.add(normalized);

      const rawPhotos = (arch.photos || []).filter(Boolean);
      const photos: MemoryPhoto[] = rawPhotos.map((src, idx) => ({
        id: `arch-${arch.id}-${idx}`,
        url: src,
        sourceUrl: src,
        downloadUrl: src,
        mediaType: 'image',
      }));

      list.push({
        id: `arch-${arch.id}`,
        title: arch.title,
        dateLabel: formatEventDate(arch.date || arch.year, isEn),
        location: [arch.venue, arch.city].filter(Boolean).join(' · '),
        coverUrl: arch.coverImage || photos[0]?.url || '',
        recapUrl: arch.youtubeUrl || arch.youtubeEmbedUrl || '',
        recapDuration: arch.duration || '',
        photos,
      });
    }

    return list.length > 0 ? list : PREVIEW_MEMORY_EVENTS;
  }, [clubAlbums, archives, isEn]);

  const activeEvent = useMemo(
    () => allEvents.find((e) => e.id === selectedEventId) || null,
    [allEvents, selectedEventId]
  );

  const featuredEvent = allEvents[0] || null;
  const remainingEvents = allEvents.slice(1);
  const recapEvents = useMemo(() => allEvents.filter((e) => Boolean(e.recapUrl)), [allEvents]);

  const activePhoto =
    activeEvent && viewerIndex !== null ? activeEvent.photos[viewerIndex] || null : null;

  const navigateViewer = useCallback(
    (delta: number) => {
      if (!activeEvent || viewerIndex === null || activeEvent.photos.length === 0) return;
      const len = activeEvent.photos.length;
      setViewerIndex((viewerIndex + delta + len) % len);
    },
    [activeEvent, viewerIndex]
  );

  useEffect(() => {
    if (viewerIndex === null && !activeRecap) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewerIndex(null);
        setActiveRecap(null);
      } else if (viewerIndex !== null && e.key === 'ArrowRight') {
        navigateViewer(1);
      } else if (viewerIndex !== null && e.key === 'ArrowLeft') {
        navigateViewer(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewerIndex, activeRecap, navigateViewer]);

  const toggleSelectPhoto = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchDownload = async () => {
    if (!activeEvent || selectedIds.length === 0) return;
    setDownloadingBatch(true);
    const toDownload = activeEvent.photos.filter(
      (p) => selectedIds.includes(p.id) && Boolean(p.downloadUrl)
    );
    for (let i = 0; i < toDownload.length; i += 1) {
      const p = toDownload[i];
      await triggerDownload(
        p.downloadUrl,
        `lumareel-${activeEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${i + 1}`
      );
      await new Promise((r) => window.setTimeout(r, 180));
    }
    setDownloadingBatch(false);
    setSelectionMode(false);
    setSelectedIds([]);
    showToast(
      isEn ? `${toDownload.length} photo(s) downloaded` : `${toDownload.length} photo(s) téléchargée(s)`,
      'success'
    );
  };

  const handleSingleDownload = async (photo: MemoryPhoto) => {
    if (!photo.downloadUrl) return;
    await triggerDownload(photo.downloadUrl, `lumareel-souvenir-${photo.id}`);
    showToast(isEn ? 'Photo saved' : 'Photo téléchargée', 'success');
  };

  const handleSharePhoto = async (photo: MemoryPhoto) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: activeEvent?.title || 'LUMARÉEL',
          url: photo.sourceUrl,
        });
        return;
      } catch {
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(photo.sourceUrl);
      showToast(isEn ? 'Link copied' : 'Lien copié', 'success');
    } catch {
      showToast(isEn ? 'Unable to share' : 'Partage impossible', 'error');
    }
  };

  const recapEmbedUrl = useMemo(() => {
    if (!activeRecap?.recapUrl) return '';
    if (isDirectVideoUrl(activeRecap.recapUrl)) return '';
    return convertToYouTubeEmbed(activeRecap.recapUrl) || activeRecap.recapUrl;
  }, [activeRecap]);

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white pt-16 md:pt-12 pb-32 md:pb-24 transition-colors duration-200">
      <div className="mx-auto max-w-[1080px] px-5 sm:px-8">
        {!activeEvent ? (
          /* VUE PRINCIPALE SOUVENIRS */
          <div className="pt-4 sm:pt-8 space-y-12 sm:space-y-16">
            <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl tracking-tight text-[#111111] dark:text-white">
              {isEn ? 'Memories' : 'Souvenirs'}
            </h1>

            {loading && allEvents.length === 0 ? (
              <div className="w-full aspect-[4/3] sm:aspect-[16/9] rounded-xl bg-black/[0.05] dark:bg-white/[0.06] animate-pulse" />
            ) : allEvents.length === 0 ? (
              <p className="text-[15px] text-[#86868B] dark:text-white/50 py-16">
                {isEn
                  ? 'Event memories will appear here.'
                  : 'Les souvenirs des événements apparaîtront ici.'}
              </p>
            ) : (
              <>
                {/* Dernier événement mis en avant */}
                {featuredEvent && (
                  <section>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEventId(featuredEvent.id);
                        setSelectionMode(false);
                        setSelectedIds([]);
                      }}
                      className="group block w-full text-left cursor-pointer"
                    >
                      <div className="overflow-hidden rounded-xl bg-black/[0.05] dark:bg-white/[0.06]">
                        {featuredEvent.coverUrl ? (
                          <img
                            src={featuredEvent.coverUrl}
                            alt={featuredEvent.title}
                            className="w-full aspect-[4/3] sm:aspect-[16/9] object-cover transition-transform duration-700 group-hover:scale-[1.015]"
                          />
                        ) : (
                          <div className="w-full aspect-[16/9] bg-[#ECECEF] dark:bg-[#141414]" />
                        )}
                      </div>

                      <div className="mt-4 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                        <h2 className="font-agrandir-semibold text-xl sm:text-2xl tracking-tight text-[#111111] dark:text-white">
                          {featuredEvent.title}
                        </h2>
                        {featuredEvent.dateLabel && (
                          <p className="text-[13px] text-[#6E6E73] dark:text-white/55">{featuredEvent.dateLabel}</p>
                        )}
                      </div>
                    </button>
                  </section>
                )}

                {/* Autres événements */}
                {remainingEvents.length > 0 && (
                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-10">
                    {remainingEvents.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => {
                          setSelectedEventId(ev.id);
                          setSelectionMode(false);
                          setSelectedIds([]);
                        }}
                        className="group block w-full text-left cursor-pointer"
                      >
                        <div className="overflow-hidden rounded-xl bg-black/[0.05] dark:bg-white/[0.06]">
                          {ev.coverUrl ? (
                            <img
                              src={ev.coverUrl}
                              alt={ev.title}
                              className="w-full aspect-[4/3] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="w-full aspect-[4/3] bg-[#ECECEF] dark:bg-[#141414]" />
                          )}
                        </div>
                        <div className="mt-3 space-y-0.5">
                          <h3 className="font-agrandir-semibold text-[17px] tracking-tight text-[#111111] dark:text-white">
                            {ev.title}
                          </h3>
                          {ev.dateLabel && (
                            <p className="text-[13px] text-[#6E6E73] dark:text-white/55">{ev.dateLabel}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </section>
                )}

                {/* Récaps & Aftermovies — affiché uniquement si des vidéos existent */}
                {recapEvents.length > 0 && (
                  <section className="border-t border-black/[0.08] dark:border-white/[0.1] pt-10 space-y-5">
                    <h2 className="text-[13px] font-medium text-[#6E6E73] dark:text-white/55">
                      {isEn ? 'Recaps & Aftermovies' : 'Récaps & Aftermovies'}
                    </h2>
                    <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
                      {recapEvents.map((ev) => (
                        <button
                          key={`recap-${ev.id}`}
                          type="button"
                          onClick={() => setActiveRecap(ev)}
                          className="group shrink-0 w-[76vw] sm:w-[320px] text-left cursor-pointer"
                        >
                          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
                            {ev.coverUrl && (
                              <img
                                src={ev.coverUrl}
                                alt={ev.title}
                                className="w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.03]"
                              />
                            )}
                            <span className="absolute inset-0 flex items-center justify-center">
                              <span className="w-11 h-11 rounded-full bg-white/90 text-[#111111] flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              </span>
                            </span>
                          </div>
                          <div className="mt-2.5 flex items-baseline justify-between gap-2">
                            <p className="text-[14px] font-medium text-[#111111] dark:text-white truncate">
                              {ev.title}
                            </p>
                            {ev.recapDuration && (
                              <span className="shrink-0 text-[12px] text-[#86868B] dark:text-white/45 tabular-nums">
                                {ev.recapDuration}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        ) : (
          /* ALBUM PHOTO D'UN ÉVÉNEMENT */
          <div className="pt-3 sm:pt-6">
            <div className="flex items-center justify-between gap-4 pb-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId(null);
                  setSelectionMode(false);
                  setSelectedIds([]);
                }}
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#6E6E73] hover:text-[#111111] dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{isEn ? 'Memories' : 'Souvenirs'}</span>
              </button>

              <div className="flex items-center gap-4">
                {activeEvent.recapUrl && (
                  <button
                    type="button"
                    onClick={() => setActiveRecap(activeEvent)}
                    className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#111111] dark:text-white hover:opacity-70 transition-opacity cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isEn ? 'Recap' : 'Récap'}</span>
                  </button>
                )}

                {activeEvent.photos.some((p) => Boolean(p.downloadUrl)) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode((prev) => !prev);
                      setSelectedIds([]);
                    }}
                    className="text-[13px] font-medium text-[#6E6E73] hover:text-[#111111] dark:text-white/60 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {selectionMode
                      ? isEn
                        ? 'Done'
                        : 'Terminer'
                      : isEn
                        ? 'Select'
                        : 'Sélectionner'}
                  </button>
                )}
              </div>
            </div>

            <div className="pb-8 space-y-1">
              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-[#111111] dark:text-white">
                {activeEvent.title}
              </h1>
              {(activeEvent.dateLabel || activeEvent.location) && (
                <p className="text-[14px] text-[#6E6E73] dark:text-white/55">
                  {[activeEvent.dateLabel, activeEvent.location].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>

            {activeEvent.photos.length === 0 ? (
              <p className="text-[15px] text-[#86868B] dark:text-white/50 py-16">
                {isEn ? 'No photos in this album yet.' : 'Aucune photo disponible pour cet événement.'}
              </p>
            ) : (
              /* Grille naturelle sans recadrage forcé ni bordures */
              <div className="columns-2 sm:columns-3 gap-2 sm:gap-3 space-y-2 sm:space-y-3">
                {activeEvent.photos.map((photo, index) => {
                  const isSelected = selectedIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      onClick={() => {
                        if (selectionMode) {
                          toggleSelectPhoto(photo.id);
                        } else {
                          setViewerChrome(true);
                          setViewerIndex(index);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (selectionMode) toggleSelectPhoto(photo.id);
                          else {
                            setViewerChrome(true);
                            setViewerIndex(index);
                          }
                        }
                      }}
                      className="relative break-inside-avoid overflow-hidden rounded-[6px] bg-black/[0.04] dark:bg-white/[0.05] cursor-pointer group"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || activeEvent.title}
                        loading="lazy"
                        className={`w-full h-auto block transition-all duration-300 ${
                          selectionMode && isSelected ? 'opacity-80 scale-[0.985]' : 'group-hover:opacity-95'
                        }`}
                      />

                      {selectionMode && (
                        <span
                          className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#111111] text-white'
                              : 'bg-white/80 text-transparent border border-black/20'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BARRE FLOTTANTE DE TÉLÉCHARGEMENT MULTIPLE */}
      <AnimatePresence>
        {selectionMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 md:bottom-8 inset-x-0 z-40 flex justify-center px-4 pointer-events-none"
          >
            <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black px-5 py-2.5 shadow-2xl">
              <button
                type="button"
                disabled={downloadingBatch}
                onClick={handleBatchDownload}
                className="inline-flex items-center gap-2 text-[13px] font-medium disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {downloadingBatch
                    ? isEn
                      ? 'Downloading...'
                      : 'Téléchargement...'
                    : isEn
                      ? `Download (${selectedIds.length})`
                      : `Télécharger (${selectedIds.length})`}
                </span>
              </button>
              <span className="h-4 w-px bg-white/20 dark:bg-black/15" />
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-[12px] text-white/65 hover:text-white dark:text-black/60 dark:hover:text-black cursor-pointer"
              >
                {isEn ? 'Clear' : 'Effacer'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VISIONNEUSE PLEIN ÉCRAN NOIR PUR */}
      <AnimatePresence>
        {activeEvent && activePhoto && viewerIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black text-white select-none flex flex-col"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
              const delta = endX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(delta) > 45) {
                navigateViewer(delta < 0 ? 1 : -1);
              }
            }}
          >
            {/* Top bar */}
            <div
              className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 sm:px-8 py-4 transition-opacity duration-200 ${
                viewerChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <span className="text-[13px] text-white/65 tabular-nums">
                {viewerIndex + 1} / {activeEvent.photos.length}
              </span>
              <button
                type="button"
                onClick={() => setViewerIndex(null)}
                aria-label={isEn ? 'Close' : 'Fermer'}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Image principale */}
            <div
              onClick={() => setViewerChrome((v) => !v)}
              className="flex-1 flex items-center justify-center p-2 sm:p-10 cursor-pointer"
            >
              <img
                src={activePhoto.sourceUrl}
                alt={activePhoto.caption || activeEvent.title}
                className="max-h-[86vh] max-w-[96vw] object-contain"
              />
            </div>

            {/* Desktop arrows */}
            {activeEvent.photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => navigateViewer(-1)}
                  aria-label={isEn ? 'Previous' : 'Précédente'}
                  className={`hidden sm:flex absolute left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-opacity ${
                    viewerChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => navigateViewer(1)}
                  aria-label={isEn ? 'Next' : 'Suivante'}
                  className={`hidden sm:flex absolute right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition-opacity ${
                    viewerChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Bottom bar */}
            <div
              className={`absolute bottom-0 inset-x-0 z-20 flex items-center justify-center gap-6 px-6 py-6 transition-opacity duration-200 ${
                viewerChrome ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {activePhoto.downloadUrl && (
                <button
                  type="button"
                  onClick={() => handleSingleDownload(activePhoto)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/12 hover:bg-white/20 px-4 py-2 text-[13px] font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{isEn ? 'Download' : 'Télécharger'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSharePhoto(activePhoto)}
                aria-label={isEn ? 'Share' : 'Partager'}
                className="w-9 h-9 rounded-full bg-white/12 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LECTEUR RÉCAP PLEIN ÉCRAN NOIR PUR */}
      <AnimatePresence>
        {activeRecap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] bg-black text-white flex flex-col"
          >
            <div className="flex items-center justify-between px-5 sm:px-8 py-4">
              <p className="text-[15px] font-medium truncate pr-4">{activeRecap.title}</p>
              <button
                type="button"
                onClick={() => setActiveRecap(null)}
                aria-label={isEn ? 'Close' : 'Fermer'}
                className="shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-3 sm:px-10 pb-8">
              {isDirectVideoUrl(activeRecap.recapUrl) ? (
                <video
                  src={activeRecap.recapUrl}
                  poster={activeRecap.coverUrl || undefined}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[82vh] max-w-full w-full sm:w-auto rounded-lg bg-black"
                />
              ) : (
                <div className="w-full max-w-5xl aspect-video rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={recapEmbedUrl}
                    title={activeRecap.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
