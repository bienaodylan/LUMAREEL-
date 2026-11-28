import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { ClubSpaceNav } from './club/ClubSpaceNav';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Images,
  Play,
  Share2,
  X,
} from 'lucide-react';

type AlbumEventInfo = {
  id?: string;
  title: string;
  artist: string;
  date: string;
  city: string;
  venue: string;
  official_poster?: string | null;
  banner_image?: string | null;
};

type Album = {
  id: string;
  event_id: string;
  title: string;
  description: string;
  cover_path: string | null;
  coverUrl?: string;
  recap_url: string | null;
  recap_duration: string | null;
  event?: AlbumEventInfo | null;
};

type Photo = {
  id: string;
  album_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  caption: string;
  media_type: 'image' | 'video';
  downloadable: boolean;
  sort_order: number;
};

type DisplayPhoto = Photo & {
  url: string;
  sourceUrl: string;
  downloadUrl: string;
};

type MomentsViewTab = 'events' | 'recaps' | 'favorites';

function getFavoritesStorageKey(userId: string) {
  return `lumareel_moments_favorites_${userId}`;
}

function inferExtension(storagePath: string, mimeType: string) {
  const fromPath = storagePath.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  if (fromPath) return `.${fromPath}`;
  if (mimeType.includes('png')) return '.png';
  if (mimeType.includes('webp')) return '.webp';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('webm')) return '.webm';
  return '.jpg';
}

function formatMomentDate(dateStr?: string, isEn?: boolean) {
  if (!dateStr) return '';
  const parsed = new Date(`${String(dateStr).slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export const ConcertMemoriesView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, customerOrders, events, setIsAuthModalOpen, setCurrentPage, showToast, language } = useApp();
  const isEn = language === 'en';

  const [isSignedIn, setIsSignedIn] = useState(false);
  const [authUserId, setAuthUserId] = useState<string>('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState<MomentsViewTab>('events');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [lightboxPool, setLightboxPool] = useState<DisplayPhoto[]>([]);
  const [activeRecapAlbum, setActiveRecapAlbum] = useState<Album | null>(null);

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([]);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const touchStartX = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setIsSignedIn(false);
        setAuthUserId('');
        setAlbums([]);
        setPhotos([]);
        setSelectedAlbum(null);
        return;
      }

      setIsSignedIn(true);
      setAuthUserId(auth.user.id);

      try {
        const storedFavs = localStorage.getItem(getFavoritesStorageKey(auth.user.id));
        setFavoriteIds(storedFavs ? JSON.parse(storedFavs) : []);
      } catch {
        setFavoriteIds([]);
      }

      // RLS enforces strictly private.user_has_event_access(event_id) — never exposes unowned events.
      const { data: albumRows, error: albumError } = await supabase
        .from('club_moment_albums')
        .select('*, event:events(id,title,artist,date,city,venue,official_poster,banner_image)')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (albumError) throw albumError;

      const resolvedAlbums: Album[] = await Promise.all(
        (albumRows || []).map(async (album: Album) => {
          let coverUrl = '';
          if (album.cover_path) {
            const { data: signed } = await supabase.storage
              .from('club-media')
              .createSignedUrl(album.cover_path, 900);
            coverUrl = signed?.signedUrl || '';
          }
          if (!coverUrl) {
            coverUrl = album.event?.official_poster || album.event?.banner_image || '';
          }
          return { ...album, coverUrl };
        })
      );

      setAlbums(resolvedAlbums);

      if (!resolvedAlbums.length) {
        setPhotos([]);
        setSelectedAlbum(null);
        return;
      }

      const ids = resolvedAlbums.map((album) => album.id);
      const { data: photoRows, error: photoError } = await supabase
        .from('club_moment_media')
        .select('*')
        .in('album_id', ids)
        .order('sort_order');

      if (photoError) throw photoError;

      const mappedPhotos: DisplayPhoto[] = await Promise.all(
        (photoRows || []).map(async (photo: Photo) => {
          const previewPath = photo.thumbnail_path || photo.storage_path;
          const [preview, full] = await Promise.all([
            supabase.storage.from('club-media').createSignedUrl(previewPath, 900),
            photo.downloadable
              ? supabase.storage.from('club-media').createSignedUrl(photo.storage_path, 900)
              : Promise.resolve({ data: null }),
          ]);
          const fullUrl = full.data?.signedUrl || '';
          const previewUrl = preview.data?.signedUrl || '';
          return {
            ...photo,
            url: previewUrl,
            sourceUrl: photo.downloadable ? fullUrl || previewUrl : previewUrl,
            downloadUrl: photo.downloadable ? fullUrl : '',
          };
        })
      );

      setPhotos(mappedPhotos);
    } catch (err: any) {
      setError(
        err?.message ||
          (isEn ? 'Unable to load your memories.' : 'Impossible de charger vos souvenirs.')
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);

  // Real verified member events without a published album yet (strictly from this user's completed orders)
  const memberEventsAwaitingAlbum = useMemo(() => {
    if (!isSignedIn || !customerOrders?.length) return [];
    const albumEventIds = new Set(albums.map((a) => a.event_id));
    const seen = new Set<string>();
    const list: Array<{ id: string; title: string; date: string; venue?: string; poster?: string }> = [];

    for (const order of customerOrders) {
      if (order.paymentStatus !== 'completed' || !order.eventId) continue;
      if (albumEventIds.has(order.eventId) || seen.has(order.eventId)) continue;
      seen.add(order.eventId);
      const matched = events.find((e) => e.id === order.eventId);
      list.push({
        id: order.eventId,
        title: matched?.title || order.eventTitle || 'Événement LUMARÉEL',
        date: matched?.date || order.eventDate || '',
        venue: matched ? `${matched.venue}${matched.city ? ` · ${matched.city}` : ''}` : undefined,
        poster: matched?.officialPoster || matched?.bannerImage || undefined,
      });
    }
    return list;
  }, [isSignedIn, customerOrders, albums, events]);

  const photoCountByAlbum = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of photos) {
      map[p.album_id] = (map[p.album_id] || 0) + 1;
    }
    return map;
  }, [photos]);

  const selectedAlbumPhotos = useMemo(
    () => (selectedAlbum ? photos.filter((photo) => photo.album_id === selectedAlbum.id) : []),
    [photos, selectedAlbum]
  );

  const downloadableAlbumPhotos = useMemo(
    () => selectedAlbumPhotos.filter((p) => p.downloadable && Boolean(p.downloadUrl)),
    [selectedAlbumPhotos]
  );

  const recapAlbums = useMemo(() => albums.filter((album) => Boolean(album.recap_url)), [albums]);

  const favoritePhotos = useMemo(
    () => photos.filter((photo) => favoriteIds.includes(photo.id)),
    [photos, favoriteIds]
  );

  const activeLightboxPhoto =
    lightboxIndex !== null && lightboxPool[lightboxIndex] ? lightboxPool[lightboxIndex] : null;

  const openLightbox = (pool: DisplayPhoto[], index: number) => {
    setLightboxPool(pool);
    setLightboxIndex(index);
  };

  const navigateLightbox = useCallback(
    (delta: -1 | 1) => {
      setLightboxIndex((prev) => {
        if (prev === null || lightboxPool.length === 0) return prev;
        return (prev + delta + lightboxPool.length) % lightboxPool.length;
      });
    },
    [lightboxPool.length]
  );

  // Navigation clavier dans le lightbox (Flèches + Échap)
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowRight') navigateLightbox(1);
      else if (e.key === 'ArrowLeft') navigateLightbox(-1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIndex, navigateLightbox]);

  useEffect(() => {
    if (!activeRecapAlbum) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveRecapAlbum(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeRecapAlbum]);

  const toggleFavorite = (photoId: string) => {
    if (!authUserId) return;
    setFavoriteIds((prev) => {
      const exists = prev.includes(photoId);
      const next = exists ? prev.filter((id) => id !== photoId) : [photoId, ...prev];
      try {
        localStorage.setItem(getFavoritesStorageKey(authUserId), JSON.stringify(next));
      } catch {
        // ignore storage quota errors
      }
      return next;
    });
  };

  const togglePhotoSelection = (photo: DisplayPhoto) => {
    if (!photo.downloadable || !photo.downloadUrl) {
      showToast(
        isEn ? 'This image is not downloadable.' : 'Cette image n’est pas téléchargeable.',
        'info'
      );
      return;
    }
    setSelectedPhotoIds((current) =>
      current.includes(photo.id) ? current.filter((id) => id !== photo.id) : [...current, photo.id]
    );
  };

  const selectAllDownloadable = () => {
    if (selectedPhotoIds.length === downloadableAlbumPhotos.length) {
      setSelectedPhotoIds([]);
    } else {
      setSelectedPhotoIds(downloadableAlbumPhotos.map((p) => p.id));
    }
  };

  const downloadSinglePhoto = async (photo: DisplayPhoto) => {
    if (!photo.downloadUrl) {
      showToast(isEn ? 'Download is unavailable.' : 'Téléchargement indisponible.', 'error');
      return;
    }
    try {
      const response = await fetch(photo.downloadUrl);
      if (!response.ok) throw new Error('download_failed');
      const blob = await response.blob();
      const ext = inferExtension(photo.storage_path, blob.type);
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `lumareel-moment-${photo.id.slice(0, 8)}${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
      showToast(isEn ? 'Photo downloaded.' : 'Photo téléchargée.', 'success');
    } catch {
      showToast(
        isEn ? 'Unable to download this photo.' : 'Impossible de télécharger cette photo.',
        'error'
      );
    }
  };

  const downloadSelectedPhotos = async () => {
    const chosen = selectedAlbumPhotos.filter(
      (photo) => selectedPhotoIds.includes(photo.id) && photo.downloadable && photo.downloadUrl
    );
    if (!chosen.length) {
      showToast(
        isEn ? 'No downloadable photo selected.' : 'Aucune photo téléchargeable sélectionnée.',
        'error'
      );
      return;
    }

    let completed = 0;
    setBatchProgress({ current: 0, total: chosen.length });
    try {
      for (const photo of chosen) {
        const response = await fetch(photo.downloadUrl);
        if (!response.ok) throw new Error('download_failed');
        const blob = await response.blob();
        const ext = inferExtension(photo.storage_path, blob.type);
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `lumareel-moment-${photo.id.slice(0, 8)}${ext}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
        completed += 1;
        setBatchProgress({ current: completed, total: chosen.length });
        await new Promise((resolve) => window.setTimeout(resolve, 260));
      }
      showToast(
        isEn ? `${completed} photo(s) downloaded.` : `${completed} photo(s) téléchargée(s).`,
        'success'
      );
      setSelectionMode(false);
      setSelectedPhotoIds([]);
    } catch {
      showToast(
        isEn
          ? `${completed} photo(s) downloaded; some failed.`
          : `${completed} photo(s) téléchargée(s), certaines ont échoué.`,
        'error'
      );
    } finally {
      setBatchProgress(null);
    }
  };

  const shareAlbum = async (album: Album) => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${album.title} · LUMARÉEL`, url });
        return;
      } catch {
        // cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(isEn ? 'Link copied.' : 'Lien copié.', 'success');
    } catch {
      showToast(isEn ? 'Share unavailable.' : 'Partage indisponible.', 'error');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pt-3 sm:pt-8 pb-24 text-white bg-black">
      <ClubSpaceNav active="memories" className="mb-8 sm:mb-12" />

      {/* A. HERO SIMPLE — ESTHÉTIQUE GALERIE PHOTOGRAPHIE */}
      {!selectedAlbum && (
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="pb-8 sm:pb-12 border-b border-white/10"
        >
          <p className="text-[10px] uppercase tracking-[0.26em] text-neutral-500">
            LUMARÉEL CLUB · {isEn ? 'PERSONAL ARCHIVE' : 'MES MOMENTS'}
          </p>
          <h1 className="mt-4 max-w-4xl text-[clamp(2.35rem,7.5vw,5.2rem)] font-agrandir-extrabold leading-[0.94] tracking-[-0.03em] text-white">
            {isEn ? 'The moments that stay.' : 'Les moments qui restent.'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">
            {isEn
              ? 'Find your events, official photography and memories shared with LUMARÉEL.'
              : 'Retrouvez vos événements, les images officielles et les souvenirs partagés avec LUMARÉEL.'}
          </p>

          {isSignedIn && (
            <div className="mt-7 flex items-center gap-6 overflow-x-auto scrollbar-hide text-xs">
              {(
                [
                  {
                    id: 'events',
                    label: isEn ? 'My events' : 'Mes événements',
                    count: albums.length,
                  },
                  {
                    id: 'recaps',
                    label: isEn ? 'Recaps' : 'Récaps',
                    count: recapAlbums.length,
                  },
                  {
                    id: 'favorites',
                    label: isEn ? 'Saved memories' : 'Souvenirs favoris',
                    count: favoritePhotos.length,
                  },
                ] as const
              ).map((tab) => {
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 pb-1.5 inline-flex items-center gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'text-white font-agrandir-extrabold border-b border-white'
                        : 'text-neutral-500 hover:text-neutral-300 font-agrandir-semibold'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="text-[10px] text-neutral-600 tabular-nums">{tab.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </motion.header>
      )}

      {/* VUE GÉNÉRALE : MES ÉVÉNEMENTS / RÉCAPS / SOUVENIRS FAVORIS */}
      {!selectedAlbum && (
        <div className="pt-9 sm:pt-12">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="aspect-[4/3] lum-skeleton" />
              <div className="aspect-[4/3] lum-skeleton" />
              <div className="aspect-[4/3] lum-skeleton" />
            </div>
          ) : error ? (
            <div className="border border-white/15 p-6 text-sm text-neutral-400 flex items-center justify-between gap-4">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="underline underline-offset-4 text-white cursor-pointer"
              >
                {isEn ? 'Retry' : 'Réessayer'}
              </button>
            </div>
          ) : !isSignedIn ? (
            <div className="border-y border-white/10 py-16 sm:py-24 text-center">
              <Images size={22} className="mx-auto text-neutral-600" />
              <h2 className="mt-5 text-2xl sm:text-3xl font-agrandir-extrabold text-white">
                {isEn ? 'Your personal event gallery.' : 'Votre galerie personnelle d’événements.'}
              </h2>
              <p className="mt-3 max-w-lg mx-auto text-sm leading-6 text-neutral-500">
                {isEn
                  ? 'Sign in to access official photo galleries and recaps linked exclusively to the events you attended.'
                  : 'Connectez-vous pour retrouver les galeries photos officielles et les récapitulatifs liés uniquement aux événements auxquels vous avez participé.'}
              </p>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="mt-7 min-h-12 px-7 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.12em] hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                {isEn ? 'Sign in' : 'Se connecter'}
              </button>
            </div>
          ) : activeTab === 'events' ? (
            /* B. MES ÉVÉNEMENTS */
            <div className="space-y-12">
              {albums.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-7 gap-y-12">
                  {albums.map((album) => {
                    const count = photoCountByAlbum[album.id] || 0;
                    return (
                      <article key={album.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAlbum(album);
                            setSelectionMode(false);
                            setSelectedPhotoIds([]);
                          }}
                          className="group block w-full text-left cursor-pointer"
                        >
                          <div className="relative aspect-[4/3] bg-[#0e0e0e] overflow-hidden border border-white/10">
                            {album.coverUrl ? (
                              <img
                                src={album.coverUrl}
                                alt={album.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-neutral-700">
                                <Images size={28} />
                              </div>
                            )}
                            {album.recap_url && (
                              <span className="absolute left-3 bottom-3 bg-black/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-white inline-flex items-center gap-1.5">
                                <Film size={11} />
                                {isEn ? 'Recap' : 'Récap'}
                              </span>
                            )}
                          </div>

                          <div className="mt-4">
                            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                              <span>{formatMomentDate(album.event?.date, isEn)}</span>
                              <span className="tabular-nums text-neutral-400">
                                {count} {count > 1 ? 'photos' : 'photo'}
                              </span>
                            </div>
                            <h3 className="mt-1.5 text-lg sm:text-xl font-agrandir-extrabold text-white leading-snug group-hover:opacity-75 transition-opacity">
                              {album.title}
                            </h3>
                            {(album.event?.venue || album.event?.city || album.description) && (
                              <p className="mt-1 text-xs text-neutral-500 truncate">
                                {album.event?.venue
                                  ? `${album.event.venue}${album.event.city ? ` · ${album.event.city}` : ''}`
                                  : album.description}
                              </p>
                            )}
                          </div>
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="border-y border-white/10 py-16 sm:py-24 text-center">
                  <p className="text-2xl sm:text-3xl font-agrandir-extrabold text-white">
                    {isEn ? 'Your next memory is yet to be written.' : 'Votre prochain souvenir reste à écrire.'}
                  </p>
                  <p className="mt-3 max-w-lg mx-auto text-sm leading-6 text-neutral-500">
                    {isEn
                      ? 'Official photo galleries appear here only for events linked to your verified LUMARÉEL tickets.'
                      : 'Les albums photos officiels apparaissent ici uniquement pour les événements associés à vos billets vérifiés LUMARÉEL.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setCurrentPage('discover')}
                    className="mt-7 min-h-11 px-6 border border-white/25 hover:border-white text-xs font-agrandir-extrabold uppercase tracking-[0.12em] text-white transition-colors cursor-pointer"
                  >
                    {isEn ? 'Discover upcoming events' : 'Découvrir les prochains événements'}
                  </button>
                </div>
              )}

              {/* Événements du membre dont l'album officiel n'est pas encore publié */}
              {memberEventsAwaitingAlbum.length > 0 && (
                <section className="pt-8 border-t border-white/10">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500 mb-5">
                    {isEn ? 'UPCOMING OR PREPARING GALLERIES' : 'ALBUMS EN PRÉPARATION POUR VOS ÉVÉNEMENTS'}
                  </p>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {memberEventsAwaitingAlbum.map((ev) => (
                      <div
                        key={ev.id}
                        className="border border-white/10 bg-[#070707] p-4 flex items-center gap-4"
                      >
                        <div className="h-14 w-14 shrink-0 bg-[#121212] overflow-hidden">
                          {ev.poster && (
                            <img
                              src={ev.poster}
                              alt={ev.title}
                              className="h-full w-full object-cover opacity-75"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-agrandir-extrabold text-white truncate">
                            {ev.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-neutral-500 truncate">
                            {formatMomentDate(ev.date, isEn)}
                            {ev.venue ? ` · ${ev.venue}` : ''}
                          </p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-neutral-400">
                            {isEn ? 'Official gallery coming soon' : 'Galerie officielle bientôt disponible'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          ) : activeTab === 'recaps' ? (
            /* D. RÉCAPS VIDÉO */
            recapAlbums.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-8">
                {recapAlbums.map((album) => (
                  <article key={album.id}>
                    <button
                      type="button"
                      onClick={() => setActiveRecapAlbum(album)}
                      className="group block w-full text-left cursor-pointer"
                    >
                      <div className="relative aspect-video bg-[#0f0f0f] overflow-hidden border border-white/10">
                        {album.coverUrl && (
                          <img
                            src={album.coverUrl}
                            alt={album.title}
                            loading="lazy"
                            className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                            <Play size={20} fill="currentColor" />
                          </span>
                        </div>
                        {album.recap_duration && (
                          <span className="absolute right-3 bottom-3 bg-black/80 px-2.5 py-0.5 text-[10px] font-mono text-white">
                            {album.recap_duration}
                          </span>
                        )}
                      </div>
                      <p className="mt-3.5 text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        {isEn ? 'OFFICIAL RECAP' : 'RÉCAPITULATIF OFFICIEL'} ·{' '}
                        {formatMomentDate(album.event?.date, isEn)}
                      </p>
                      <h3 className="mt-1 text-xl font-agrandir-extrabold text-white">
                        {album.title}
                      </h3>
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="border-y border-white/10 py-16 text-center">
                <Film size={22} className="mx-auto text-neutral-600" />
                <p className="mt-4 text-lg font-agrandir-extrabold text-white">
                  {isEn ? 'No recaps published for your events yet.' : 'Aucun récapitulatif disponible pour le moment.'}
                </p>
                <p className="mt-2 max-w-md mx-auto text-sm text-neutral-500">
                  {isEn
                    ? 'Aftermovies and official event highlights linked to your tickets will appear here.'
                    : 'Les aftermovies et vidéos officielles des événements auxquels vous avez participé apparaîtront ici.'}
                </p>
              </div>
            )
          ) : /* E. SOUVENIRS PARTAGÉS & FAVORIS */
          favoritePhotos.length > 0 ? (
            <div className="space-y-6">
              <p className="text-xs text-neutral-500">
                {favoritePhotos.length}{' '}
                {isEn ? 'saved photograph(s) from your events.' : 'photo(s) enregistrée(s) dans vos favoris.'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {favoritePhotos.map((photo, index) => (
                  <div key={photo.id} className="group relative aspect-[4/5] bg-[#111] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => openLightbox(favoritePhotos, index)}
                      className="block h-full w-full cursor-pointer"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || 'LUMARÉEL'}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(photo.id)}
                      aria-label={isEn ? 'Remove from favorites' : 'Retirer des favoris'}
                      className="absolute right-2.5 top-2.5 h-8 w-8 bg-black/70 text-white flex items-center justify-center cursor-pointer"
                    >
                      <Bookmark size={14} fill="currentColor" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border-y border-white/10 py-16 text-center">
              <Bookmark size={22} className="mx-auto text-neutral-600" />
              <p className="mt-4 text-lg font-agrandir-extrabold text-white">
                {isEn ? 'No saved favorites yet.' : 'Aucun souvenir enregistré en favori.'}
              </p>
              <p className="mt-2 max-w-md mx-auto text-sm text-neutral-500">
                {isEn
                  ? 'Open one of your event albums and bookmark your favorite photographs to keep them right here.'
                  : 'Ouvrez l’album d’un événement et enregistrez vos clichés préférés pour les retrouver ici.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* C. VUE DÉTAILLÉE D'UN ALBUM — GALERIE PHOTOGRAPHIE MINIMALISTE */}
      {selectedAlbum && (
        <section className="space-y-10">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedAlbum(null);
                setLightboxIndex(null);
                setSelectionMode(false);
                setSelectedPhotoIds([]);
              }}
              className="inline-flex min-h-10 items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={15} />
              <span>{isEn ? 'All my events' : 'Tous mes événements'}</span>
            </button>

            <button
              type="button"
              onClick={() => void shareAlbum(selectedAlbum)}
              className="inline-flex min-h-10 items-center gap-2 border border-white/15 hover:border-white px-4 text-xs text-white transition-colors cursor-pointer"
            >
              <Share2 size={13} />
              <span>{isEn ? 'Share' : 'Partager'}</span>
            </button>
          </div>

          <header className="border-b border-white/10 pb-8">
            <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              {formatMomentDate(selectedAlbum.event?.date, isEn)}
              {selectedAlbum.event?.venue ? ` · ${selectedAlbum.event.venue}` : ''}
              {selectedAlbum.event?.city ? ` · ${selectedAlbum.event.city}` : ''}
            </p>
            <h2 className="mt-2.5 text-3xl sm:text-5xl font-agrandir-extrabold leading-[0.98] tracking-tight text-white">
              {selectedAlbum.title}
            </h2>
            {selectedAlbum.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
                {selectedAlbum.description}
              </p>
            )}
          </header>

          {/* Récapitulatif vidéo de l'événement */}
          {selectedAlbum.recap_url && (
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-agrandir-extrabold uppercase tracking-[0.2em] text-neutral-400 inline-flex items-center gap-2">
                  <Film size={14} />
                  {isEn ? 'Official Recap' : 'Récapitulatif officiel'}
                </h3>
                {selectedAlbum.recap_duration && (
                  <span className="text-xs font-mono text-neutral-500">
                    {selectedAlbum.recap_duration}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setActiveRecapAlbum(selectedAlbum)}
                className="group relative block w-full aspect-video sm:aspect-[21/9] bg-[#0e0e0e] overflow-hidden border border-white/10 text-left cursor-pointer"
              >
                {selectedAlbum.coverUrl && (
                  <img
                    src={selectedAlbum.coverUrl}
                    alt={selectedAlbum.title}
                    className="h-full w-full object-cover opacity-75 transition-transform duration-700 group-hover:scale-[1.02]"
                  />
                )}
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                  <span className="h-14 w-14 rounded-full bg-white text-black flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                    <Play size={20} fill="currentColor" />
                  </span>
                </div>
              </button>
            </section>
          )}

          {/* Barre de contrôle de la galerie officielle */}
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <h3 className="text-lg sm:text-xl font-agrandir-extrabold text-white">
                  {isEn ? 'Official photographs' : 'Photos officielles'}
                </h3>
                <span className="text-xs text-neutral-500 tabular-nums">
                  {selectedAlbumPhotos.length}
                </span>
              </div>

              {selectedAlbumPhotos.length > 0 && (
                <div className="flex items-center gap-2">
                  {selectionMode && downloadableAlbumPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={selectAllDownloadable}
                      className="min-h-9 border border-white/15 hover:border-white px-3 text-[11px] text-neutral-300 hover:text-white transition-colors cursor-pointer"
                    >
                      {selectedPhotoIds.length === downloadableAlbumPhotos.length
                        ? isEn
                          ? 'Clear'
                          : 'Tout désélectionner'
                        : isEn
                          ? 'Select all'
                          : 'Tout sélectionner'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectionMode((prev) => !prev);
                      setSelectedPhotoIds([]);
                    }}
                    className={`min-h-9 px-3.5 text-[11px] transition-colors cursor-pointer ${
                      selectionMode
                        ? 'bg-white text-black font-agrandir-extrabold'
                        : 'border border-white/20 hover:border-white text-white'
                    }`}
                  >
                    {selectionMode
                      ? isEn
                        ? 'Done'
                        : 'Terminer'
                      : isEn
                        ? 'Select'
                        : 'Sélectionner'}
                  </button>
                </div>
              )}
            </div>

            {/* Grille photographique épurée */}
            {selectedAlbumPhotos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {selectedAlbumPhotos.map((photo, index) => {
                  const isChosen = selectedPhotoIds.includes(photo.id);
                  const isFav = favoriteIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={`group relative aspect-[4/5] overflow-hidden bg-[#111] ${
                        selectionMode && !photo.downloadable ? 'opacity-35' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          selectionMode
                            ? togglePhotoSelection(photo)
                            : openLightbox(selectedAlbumPhotos, index)
                        }
                        className="block h-full w-full cursor-pointer"
                      >
                        {photo.url && (
                          <img
                            src={photo.url}
                            alt={photo.caption || selectedAlbum.title}
                            loading="lazy"
                            className={`h-full w-full object-cover transition-transform duration-500 ${
                              isChosen ? 'scale-[0.94] opacity-80' : 'group-hover:scale-[1.03]'
                            }`}
                          />
                        )}
                      </button>

                      {selectionMode ? (
                        <button
                          type="button"
                          onClick={() => togglePhotoSelection(photo)}
                          aria-label={isChosen ? 'Désélectionner' : 'Sélectionner'}
                          className={`absolute right-2.5 top-2.5 h-6 w-6 flex items-center justify-center border transition-colors cursor-pointer ${
                            isChosen
                              ? 'bg-white text-black border-white'
                              : 'bg-black/65 text-transparent border-white/60'
                          }`}
                        >
                          {isChosen && <Check size={14} strokeWidth={2.5} />}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(photo.id);
                          }}
                          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          className={`absolute right-2.5 top-2.5 h-8 w-8 flex items-center justify-center bg-black/65 text-white transition-opacity cursor-pointer ${
                            isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus:opacity-100'
                          }`}
                        >
                          <Bookmark size={14} fill={isFav ? 'currentColor' : 'none'} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-14 text-center text-sm text-neutral-500 border-y border-white/10">
                {isEn
                  ? 'Official photographs for this event are being prepared.'
                  : 'Les photos officielles de cet événement sont en cours de préparation.'}
              </p>
            )}
          </div>
        </section>
      )}

      {/* BARRE FLOTTANTE DE TÉLÉCHARGEMENT MULTIPLE */}
      <AnimatePresence>
        {selectionMode && selectedPhotoIds.length > 0 && (
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="fixed inset-x-4 bottom-20 md:bottom-8 z-50 mx-auto max-w-md bg-[#111]/95 backdrop-blur-xl border border-white/20 px-4 py-3 flex items-center justify-between gap-4 shadow-2xl"
          >
            <span className="text-xs text-neutral-300 tabular-nums">
              {batchProgress
                ? isEn
                  ? `Downloading ${batchProgress.current}/${batchProgress.total}…`
                  : `Téléchargement ${batchProgress.current}/${batchProgress.total}…`
                : `${selectedPhotoIds.length} ${
                    isEn ? 'selected' : selectedPhotoIds.length > 1 ? 'sélectionnées' : 'sélectionnée'
                  }`}
            </span>
            <button
              type="button"
              disabled={Boolean(batchProgress)}
              onClick={() => void downloadSelectedPhotos()}
              className="min-h-10 px-4 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.08em] inline-flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Download size={14} />
              <span>{isEn ? 'Download' : 'Télécharger'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX PLEIN ÉCRAN AVEC NAVIGATION FLUIDE (CLAVIER / FLÈCHES / SWIPE) */}
      <AnimatePresence>
        {activeLightboxPhoto && lightboxIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[120] bg-black/98 flex flex-col justify-between p-4 sm:p-6 select-none"
            role="dialog"
            aria-modal="true"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
              const diff = endX - touchStartX.current;
              touchStartX.current = null;
              if (Math.abs(diff) > 45) {
                navigateLightbox(diff < 0 ? 1 : -1);
              }
            }}
          >
            {/* Barre supérieure minimaliste */}
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-mono text-neutral-400 tabular-nums">
                {String(lightboxIndex + 1).padStart(2, '0')} /{' '}
                {String(lightboxPool.length).padStart(2, '0')}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite(activeLightboxPhoto.id)}
                  aria-label={isEn ? 'Save favorite' : 'Enregistrer en favori'}
                  className="h-10 w-10 border border-white/20 hover:border-white flex items-center justify-center text-white cursor-pointer"
                >
                  <Bookmark
                    size={15}
                    fill={favoriteIds.includes(activeLightboxPhoto.id) ? 'currentColor' : 'none'}
                  />
                </button>
                <button
                  type="button"
                  disabled={!activeLightboxPhoto.downloadable}
                  onClick={() => void downloadSinglePhoto(activeLightboxPhoto)}
                  className="h-10 px-4 border border-white/20 hover:border-white inline-flex items-center gap-2 text-xs text-white disabled:opacity-30 cursor-pointer"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">{isEn ? 'Download' : 'Télécharger'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                  className="h-10 w-10 border border-white/20 hover:border-white flex items-center justify-center text-white cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Zone centrale image / vidéo + flèches */}
            <div className="relative flex-1 flex items-center justify-center my-4 min-h-0">
              {lightboxPool.length > 1 && (
                <button
                  type="button"
                  onClick={() => navigateLightbox(-1)}
                  aria-label={isEn ? 'Previous photo' : 'Photo précédente'}
                  className="absolute left-0 sm:left-2 z-10 h-11 w-11 bg-black/65 border border-white/15 hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {activeLightboxPhoto.media_type === 'video' ? (
                <video
                  key={activeLightboxPhoto.id}
                  src={activeLightboxPhoto.sourceUrl || activeLightboxPhoto.url}
                  controls
                  playsInline
                  className="max-h-[78vh] max-w-full object-contain"
                />
              ) : (
                <img
                  key={activeLightboxPhoto.id}
                  src={activeLightboxPhoto.sourceUrl || activeLightboxPhoto.url}
                  alt={activeLightboxPhoto.caption || 'LUMARÉEL'}
                  className="max-h-[78vh] max-w-full object-contain"
                />
              )}

              {lightboxPool.length > 1 && (
                <button
                  type="button"
                  onClick={() => navigateLightbox(1)}
                  aria-label={isEn ? 'Next photo' : 'Photo suivante'}
                  className="absolute right-0 sm:right-2 z-10 h-11 w-11 bg-black/65 border border-white/15 hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Légende sobre */}
            <div className="min-h-[24px] text-center">
              {activeLightboxPhoto.caption && (
                <p className="text-xs sm:text-sm text-neutral-400">
                  {activeLightboxPhoto.caption}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LECTEUR VIDÉO RÉCAPITULATIF */}
      <AnimatePresence>
        {activeRecapAlbum?.recap_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/96 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            onClick={() => setActiveRecapAlbum(null)}
          >
            <div className="w-full max-w-5xl space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                    {isEn ? 'OFFICIAL RECAP' : 'RÉCAPITULATIF OFFICIEL'}
                  </p>
                  <h3 className="mt-1 text-xl font-agrandir-extrabold text-white">
                    {activeRecapAlbum.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRecapAlbum(null)}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                  className="h-10 w-10 border border-white/20 hover:border-white flex items-center justify-center text-white cursor-pointer"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="aspect-video w-full bg-black border border-white/10">
                {/\.(mp4|webm|mov)(\?|$)/i.test(activeRecapAlbum.recap_url) ? (
                  <video
                    src={activeRecapAlbum.recap_url}
                    controls
                    autoPlay
                    playsInline
                    className="h-full w-full"
                  />
                ) : (
                  <iframe
                    src={convertToYouTubeEmbed(activeRecapAlbum.recap_url)}
                    title={activeRecapAlbum.title}
                    className="h-full w-full border-0"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
