import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArchiveProduction } from '../types';
import {
  buildConcertMemoryAlbums,
  compressImageDataUrl,
  ConcertMemoryAlbum,
  deleteSharedMemory,
  downloadMediaAsset,
  fileToDataUrl,
  loadSharedMemories,
  markChallengeCompleted,
  saveSharedMemory,
  SharedConcertMemory,
  shareMediaAsset,
} from '../utils/communityStorage';
import { formatDateLong } from '../utils/dateUtils';
import { isDirectVideoUrl } from '../utils/mediaHubStorage';
import { BottomSheet, Tabs } from './ui/LumareelKit';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Image as ImageIcon,
  Play,
  Plus,
  Share,
  Sparkles,
  Trash2,
  Upload,
  Video,
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

type SouvenirTabId = 'official' | 'highlights' | 'videos' | 'participants';

interface LightboxMediaItem {
  url: string;
  mediaType: 'photo' | 'video';
  caption: string;
  authorName?: string;
  memoryId?: string;
}

function normalizeMatchText(value?: string): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function mergePublicArchives(
  archives: ArchiveProduction[],
  albums: ConcertMemoryAlbum[],
  language: 'fr' | 'en'
): ArchiveEventEntry[] {
  const byId = new Map<string, ArchiveEventEntry>();
  const albumById = new Map(albums.map((album) => [album.id, album]));

  for (const item of archives) {
    if (item.isPublished === false) continue;
    const rawPhotos =
      Array.isArray(item.photos) && item.photos.length > 0 ? item.photos : [item.coverImage];
    const photos = Array.from(new Set(rawPhotos.filter(Boolean)));
    const matchedAlbum = albumById.get(item.id);
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
      coverImage: item.coverImage || photos[0] || '',
      artists: item.artists || [],
      youtubeEmbedUrl: item.youtubeEmbedUrl || matchedAlbum?.recapEmbedUrl || '',
      duration: item.duration || matchedAlbum?.recapDuration,
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
 * ARCHIVES LUMARÉEL — Page souvenirs par concert & index des événements passés.
 */
export const ArchiveView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    archives,
    customerOrders,
    currentUser,
    setIsAuthModalOpen,
    selectedArchiveId,
    setSelectedArchiveId,
    setCurrentPage,
    showToast,
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
  const [activeTab, setActiveTab] = useState<SouvenirTabId>('official');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Sélection multiple de photos officielles
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // Lightbox générique (photos officielles ou souvenirs participants)
  const [lightboxItems, setLightboxItems] = useState<LightboxMediaItem[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Souvenirs partagés par les participants
  const [sharedMemories, setSharedMemories] = useState<SharedConcertMemory[]>(() =>
    loadSharedMemories()
  );
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [uploadAuthor, setUploadAuthor] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>('');
  const [uploadMediaType, setUploadMediaType] = useState<'photo' | 'video'>('photo');
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (selectedArchiveId) {
      const match = entries.find((e) => e.id === selectedArchiveId);
      setActiveId(match ? match.id : null);
      setActiveTab('official');
      setIsVideoPlaying(false);
      setIsSelectMode(false);
      setSelectedPhotoUrls([]);
      setLightboxIdx(null);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    } else {
      setActiveId(null);
    }
  }, [selectedArchiveId, entries]);

  useEffect(() => {
    if (lightboxIdx === null || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight' && lightboxItems.length > 1) {
        setLightboxIdx((prev) => (prev === null ? null : (prev + 1) % lightboxItems.length));
      } else if (e.key === 'ArrowLeft' && lightboxItems.length > 1) {
        setLightboxIdx((prev) =>
          prev === null ? null : (prev - 1 + lightboxItems.length) % lightboxItems.length
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIdx, lightboxItems.length]);

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

  const hasAttendedActiveConcert = useMemo(() => {
    if (!activeEntry || !customerOrders || customerOrders.length === 0) return false;
    const targetArtist = normalizeMatchText(activeEntry.artist);
    const targetTitle = normalizeMatchText(activeEntry.title);
    return customerOrders.some((order) => {
      if (order.paymentStatus !== 'completed') return false;
      if (order.eventId === activeEntry.id) return true;
      const orderTitle = normalizeMatchText(order.eventTitle);
      if (!orderTitle) return false;
      return (
        (targetArtist.length >= 3 && orderTitle.includes(targetArtist)) ||
        (targetTitle.length >= 4 && orderTitle.includes(targetTitle))
      );
    });
  }, [activeEntry, customerOrders]);

  const participantMemoriesForEvent = useMemo(() => {
    if (!activeEntry) return [];
    return sharedMemories.filter((m) => m.eventId === activeEntry.id);
  }, [sharedMemories, activeEntry]);

  const participantVideosForEvent = useMemo(
    () => participantMemoriesForEvent.filter((m) => m.mediaType === 'video'),
    [participantMemoriesForEvent]
  );

  const openRecap = (id: string) => {
    setSelectedArchiveId(id);
    setActiveId(id);
    setActiveTab('official');
    setIsVideoPlaying(false);
    setIsSelectMode(false);
    setSelectedPhotoUrls([]);
    setLightboxIdx(null);
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const closeRecap = () => {
    setSelectedArchiveId(null);
    setActiveId(null);
    setIsVideoPlaying(false);
    setIsSelectMode(false);
    setSelectedPhotoUrls([]);
    setLightboxIdx(null);
  };

  const togglePhotoSelection = (url: string) => {
    setSelectedPhotoUrls((prev) =>
      prev.includes(url) ? prev.filter((item) => item !== url) : [...prev, url]
    );
  };

  const handleToggleSelectMode = () => {
    setIsSelectMode((prev) => {
      if (prev) {
        setSelectedPhotoUrls([]);
      }
      return !prev;
    });
  };

  const openLightbox = (items: LightboxMediaItem[], index: number) => {
    setLightboxItems(items);
    setLightboxIdx(index);
  };

  const handleDownloadAction = async (overrideUrls?: string[]) => {
    if (!activeEntry || isDownloading) return;
    const slug = (activeEntry.artist || activeEntry.title || 'lumareel')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .replace(/^-|-$/g, '');

    const targets =
      overrideUrls && overrideUrls.length > 0
        ? overrideUrls
        : selectedPhotoUrls.length > 0
          ? selectedPhotoUrls
          : [activeEntry.coverImage || activeEntry.photos[0]].filter(Boolean);

    if (targets.length === 0) return;

    setIsDownloading(true);
    try {
      let downloaded = 0;
      for (let i = 0; i < targets.length; i++) {
        const suffix = targets.length > 1 ? `-${i + 1}` : '';
        const ok = await downloadMediaAsset(targets[i], `lumareel-${slug}${suffix}.jpg`);
        if (ok) downloaded += 1;
      }

      if (downloaded > 0) {
        showToast(
          downloaded > 1
            ? isEn
              ? `${downloaded} photos downloaded.`
              : `${downloaded} photos téléchargées.`
            : isEn
              ? 'Official concert photo downloaded.'
              : 'Photo officielle téléchargée.',
          'success'
        );
        if (selectedPhotoUrls.length > 0 && !overrideUrls) {
          setIsSelectMode(false);
          setSelectedPhotoUrls([]);
        }
      } else {
        showToast(
          isEn ? 'Unable to download this media.' : 'Impossible de télécharger ce média.',
          'error'
        );
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShareAction = async (assetUrl?: string, customTitle?: string) => {
    if (!activeEntry) return;
    const shareTitle = customTitle || `LUMARÉEL — ${activeEntry.artist}`;
    const shareText = isEn
      ? `Concert memories · ${activeEntry.artist} (${activeEntry.dateLabel})`
      : `Souvenirs de concert · ${activeEntry.artist} (${activeEntry.dateLabel})`;
    const slug = (activeEntry.artist || 'concert')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase();

    const result = await shareMediaAsset({
      title: shareTitle,
      text: shareText,
      assetUrl: assetUrl || activeEntry.coverImage,
      filename: `lumareel-${slug}.jpg`,
    });

    if (result === 'copied') {
      showToast(
        isEn ? 'Link copied to clipboard.' : 'Lien copié dans le presse-papiers.',
        'success'
      );
    } else if (result === 'shared') {
      showToast(isEn ? 'Memory shared.' : 'Souvenir partagé.', 'success');
    } else {
      showToast(isEn ? 'Sharing unavailable on this device.' : 'Partage indisponible ici.', 'info');
    }
  };

  const handleOpenAddSheet = () => {
    setUploadAuthor(currentUser?.name || '');
    setUploadCaption('');
    setUploadPreviewUrl('');
    setUploadMediaType('photo');
    setIsAddSheetOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    if (isVideo && file.size > 12 * 1024 * 1024) {
      showToast(
        isEn
          ? 'Please select a short video under 12 MB.'
          : 'Sélectionnez une courte vidéo de moins de 12 Mo.',
        'error'
      );
      return;
    }

    setIsProcessingUpload(true);
    try {
      if (isVideo) {
        const dataUrl = await fileToDataUrl(file);
        setUploadMediaType('video');
        setUploadPreviewUrl(dataUrl);
      } else {
        const compressed = await compressImageDataUrl(file, 1280, 0.8);
        setUploadMediaType('photo');
        setUploadPreviewUrl(compressed);
      }
    } catch {
      showToast(
        isEn ? 'Could not read the selected file.' : 'Impossible de lire le fichier sélectionné.',
        'error'
      );
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleSubmitParticipantMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEntry) return;
    if (!uploadPreviewUrl) {
      showToast(
        isEn ? 'Please choose a photo or video first.' : 'Choisissez une photo ou une vidéo.',
        'info'
      );
      return;
    }

    const author =
      uploadAuthor.trim() ||
      currentUser?.name ||
      (isEn ? 'LUMARÉEL Participant' : 'Participant LUMARÉEL');

    const memory: SharedConcertMemory = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      eventId: activeEntry.id,
      authorName: author,
      mediaType: uploadMediaType,
      mediaUrl: uploadPreviewUrl,
      caption:
        uploadCaption.trim() ||
        (isEn ? `Live moment · ${activeEntry.artist}` : `Souvenir live · ${activeEntry.artist}`),
      createdAt: new Date().toISOString(),
    };

    const updated = saveSharedMemory(memory);
    setSharedMemories(updated);

    if (currentUser) {
      markChallengeCompleted(currentUser, 'challenge_memory');
    }

    setIsAddSheetOpen(false);
    setUploadPreviewUrl('');
    setUploadCaption('');
    setActiveTab(uploadMediaType === 'video' ? 'videos' : 'participants');
    showToast(
      isEn ? 'Your concert memory has been added!' : 'Votre souvenir a été ajouté au concert !',
      'success'
    );
  };

  const handleDeleteParticipantMemory = (memoryId: string) => {
    const updated = deleteSharedMemory(memoryId);
    setSharedMemories(updated);
    setLightboxIdx(null);
    showToast(isEn ? 'Memory removed.' : 'Souvenir supprimé.', 'info');
  };

  // =========================================================================
  // PAGE SOUVENIRS D'UN CONCERT (MAQUETTE 07 ADAPTÉE AU FORMAT ARRONDI)
  // =========================================================================
  if (activeEntry) {
    const otherEntries = entries.filter((e) => e.id !== activeEntry.id);
    const embedSrc = activeEntry.youtubeEmbedUrl
      ? `${activeEntry.youtubeEmbedUrl}${
          activeEntry.youtubeEmbedUrl.includes('?') ? '&' : '?'
        }autoplay=1`
      : '';

    const officialLightboxList: LightboxMediaItem[] = activeEntry.photos.map((url, idx) => ({
      url,
      mediaType: 'photo',
      caption: `${activeEntry.artist} — ${idx + 1}`,
    }));

    const participantLightboxList: LightboxMediaItem[] = participantMemoriesForEvent.map((m) => ({
      url: m.mediaUrl,
      mediaType: m.mediaType,
      caption: m.caption,
      authorName: m.authorName,
      memoryId: m.id,
    }));

    const highlightPhotos = activeEntry.photos.slice(0, 6);
    const activeLightboxItem =
      lightboxIdx !== null && lightboxItems[lightboxIdx] ? lightboxItems[lightboxIdx] : null;

    return (
      <div
        className="min-h-screen w-full max-w-[920px] mx-auto px-4 sm:px-6 pb-28 bg-black text-white font-agrandir-regular"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* 1. HERO CINÉMATIQUE ARRONDI */}
        <section className="relative w-full min-h-[340px] sm:min-h-[410px] rounded-[24px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] flex flex-col justify-between">
          {activeEntry.coverImage ? (
            <img
              src={activeEntry.coverImage}
              alt={activeEntry.title}
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-[#2A2216] via-[#12100C] to-black" />
          )}

          {/* Dégradé cinématique vers le noir pur */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-black/95" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_25%,rgba(212,175,106,0.16),transparent_60%)]"
          />

          {/* Barre supérieure : retour circulaire + libellé PHOTO OFFICIELLE */}
          <div className="relative z-10 flex items-center justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5">
            <button
              type="button"
              onClick={closeRecap}
              aria-label={isEn ? 'Back to Archives' : 'Retour aux archives'}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-colors cursor-pointer lum-press"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={1.8} />
            </button>

            <span className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-white/10 text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-white/80">
              {isEn ? 'OFFICIAL PHOTO' : 'PHOTO OFFICIELLE'}
            </span>
          </div>

          {/* En-tête éditorial bas de hero */}
          <div className="relative z-10 px-5 sm:px-7 pb-5 sm:pb-7 pt-24 space-y-2">
            <p className="text-[10px] sm:text-[11px] font-agrandir-extrabold uppercase tracking-[0.24em] text-[#D4AF6A]">
              {isEn ? 'CONCERT MEMORIES' : 'SOUVENIRS DE CONCERT'}
            </p>

            <h1 className="font-agrandir-extrabold text-[2rem] sm:text-[2.85rem] uppercase text-white tracking-tight leading-[0.96]">
              {activeEntry.artist}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <p className="text-xs sm:text-sm text-[#C8C8C8]">
                {activeEntry.dateLabel}
                {activeEntry.venue ? ` · ${activeEntry.venue}` : ''}
                {activeEntry.city ? `, ${activeEntry.city}` : ''}
              </p>

              {hasAttendedActiveConcert && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 border border-[#D4AF6A]/75 text-[10px] font-agrandir-extrabold uppercase tracking-[0.14em] text-[#D4AF6A] shrink-0">
                  <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
                  <span>{isEn ? 'YOU WERE THERE' : 'VOUS Y ÉTIEZ'}</span>
                </span>
              )}
            </div>
          </div>
        </section>

        {/* 2. BARRE DES 3 ACTIONS PRINCIPALES (TÉLÉCHARGER / PARTAGER / AJOUTER) */}
        <section className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-3">
          <button
            type="button"
            disabled={isDownloading}
            onClick={() => handleDownloadAction()}
            className="min-h-[70px] sm:min-h-[74px] px-3 py-3 rounded-[15px] bg-[#D4AF6A] hover:bg-[#dfc07f] text-black flex flex-col items-center justify-center gap-1.5 font-agrandir-extrabold text-xs sm:text-[13px] transition-colors cursor-pointer disabled:opacity-60 lum-press"
          >
            <Download className="w-[18px] h-[18px]" strokeWidth={2} />
            <span className="truncate max-w-full">
              {selectedPhotoUrls.length > 0
                ? `${isEn ? 'Download' : 'Télécharger'} (${selectedPhotoUrls.length})`
                : isEn
                  ? 'Download'
                  : 'Télécharger'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleShareAction()}
            className="min-h-[70px] sm:min-h-[74px] px-3 py-3 rounded-[15px] bg-[#121212] hover:bg-[#191919] border border-white/[0.12] hover:border-white/25 text-white flex flex-col items-center justify-center gap-1.5 font-agrandir-extrabold text-xs sm:text-[13px] transition-colors cursor-pointer lum-press"
          >
            <Share className="w-[18px] h-[18px]" strokeWidth={1.8} />
            <span>{isEn ? 'Share' : 'Partager'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddSheet}
            className="min-h-[70px] sm:min-h-[74px] px-3 py-3 rounded-[15px] bg-[#121212] hover:bg-[#191919] border border-white/[0.12] hover:border-white/25 text-white flex flex-col items-center justify-center gap-1.5 font-agrandir-extrabold text-xs sm:text-[13px] transition-colors cursor-pointer lum-press"
          >
            <Plus className="w-[18px] h-[18px]" strokeWidth={2} />
            <span>{isEn ? 'Add' : 'Ajouter'}</span>
          </button>
        </section>

        {/* 3. AFTERMOVIE OFFICIEL */}
        {activeEntry.youtubeEmbedUrl && (
          <section className="mt-7 space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white tracking-tight">
                {isEn ? 'Official aftermovie' : 'Aftermovie officiel'}
              </h2>
              <span className="text-xs font-mono text-[#9A9A9A] tabular-nums">
                {activeEntry.duration || '02:45'}
              </span>
            </div>

            <div className="relative aspect-[16/9] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10]">
              {isVideoPlaying ? (
                <>
                  {isDirectVideoUrl(activeEntry.youtubeEmbedUrl) ? (
                    <video
                      src={activeEntry.youtubeEmbedUrl}
                      poster={activeEntry.coverImage}
                      controls
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain bg-black"
                    />
                  ) : (
                    <iframe
                      src={embedSrc}
                      title={activeEntry.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setIsVideoPlaying(false)}
                    aria-label={isEn ? 'Close video' : 'Fermer la vidéo'}
                    className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVideoPlaying(true)}
                  className="group w-full h-full relative cursor-pointer block text-left"
                >
                  <img
                    src={activeEntry.coverImage}
                    alt={activeEntry.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-[0.55] group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(212,175,106,0.24),rgba(0,0,0,0.72)_78%)]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/55 backdrop-blur-md group-hover:bg-[#D4AF6A] text-white group-hover:text-black border border-white/30 group-hover:border-[#D4AF6A] flex items-center justify-center transition-all duration-300 shadow-lg">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5 fill-current" strokeWidth={1.6} />
                    </span>
                  </div>
                  <span className="absolute left-4 bottom-3.5 text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-white/75">
                    {isEn ? 'RECAP VIDEO' : 'VIDÉO RÉCAPITULATIVE'}
                  </span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* 4. ONGLETS MÉDIAS (OFFICIELLES / MEILLEURS MOMENTS / VIDÉOS / PARTICIPANTS) */}
        <section className="mt-7 space-y-4">
          <Tabs<SouvenirTabId>
            activeId={activeTab}
            onChange={(tab) => {
              setActiveTab(tab);
              if (tab !== 'official') {
                setIsSelectMode(false);
                setSelectedPhotoUrls([]);
              }
            }}
            items={[
              { id: 'official', label: isEn ? 'Official' : 'Officielles' },
              { id: 'highlights', label: isEn ? 'Highlights' : 'Meilleurs moments' },
              { id: 'videos', label: isEn ? 'Videos' : 'Vidéos' },
              { id: 'participants', label: isEn ? 'Participants' : 'Participants' },
            ]}
          />

          {/* ONGLET 1 : OFFICIELLES */}
          {activeTab === 'official' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-[#9A9A9A] tabular-nums">
                  {isSelectMode
                    ? selectedPhotoUrls.length > 0
                      ? isEn
                        ? `${selectedPhotoUrls.length} selected`
                        : `${selectedPhotoUrls.length} sélectionnée${selectedPhotoUrls.length > 1 ? 's' : ''}`
                      : isEn
                        ? 'Tap photos to select'
                        : 'Touchez les photos à sélectionner'
                    : isEn
                      ? `${activeEntry.photos.length} official photos`
                      : `${activeEntry.photos.length} photos officielles`}
                </span>

                <div className="flex items-center gap-2">
                  {isSelectMode && selectedPhotoUrls.length > 0 && (
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownloadAction()}
                      className="px-3.5 py-1.5 rounded-full bg-[#D4AF6A] hover:bg-[#dfc07f] text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer"
                    >
                      {isEn
                        ? `Download (${selectedPhotoUrls.length})`
                        : `Télécharger (${selectedPhotoUrls.length})`}
                    </button>
                  )}

                  {activeEntry.photos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleSelectMode}
                      className={`px-4 py-1.5 rounded-full text-xs font-agrandir-extrabold transition-colors cursor-pointer ${
                        isSelectMode
                          ? 'bg-white text-black'
                          : 'bg-[#111111] border border-white/20 hover:border-white/40 text-white'
                      }`}
                    >
                      {isSelectMode
                        ? isEn
                          ? 'Cancel'
                          : 'Annuler'
                        : isEn
                          ? 'Select'
                          : 'Sélectionner'}
                    </button>
                  )}
                </div>
              </div>

              {activeEntry.photos.length === 0 ? (
                <div className="py-12 px-5 rounded-[18px] bg-[#0E0E0E] border border-white/[0.10] text-center space-y-2">
                  <ImageIcon className="w-6 h-6 text-[#D4AF6A] mx-auto" strokeWidth={1.6} />
                  <p className="text-sm font-agrandir-extrabold text-white">
                    {isEn ? 'Official photos arriving soon' : 'Photos officielles bientôt disponibles'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {activeEntry.photos.map((photoUrl, idx) => {
                    const isSelected = selectedPhotoUrls.includes(photoUrl);
                    return (
                      <button
                        key={`${photoUrl}_${idx}`}
                        type="button"
                        onClick={() => {
                          if (isSelectMode) {
                            togglePhotoSelection(photoUrl);
                          } else {
                            openLightbox(officialLightboxList, idx);
                          }
                        }}
                        className={`group relative aspect-square rounded-[13px] overflow-hidden bg-[#0E0E0E] border transition-all cursor-pointer block ${
                          isSelected
                            ? 'border-[#D4AF6A] ring-2 ring-[#D4AF6A]/45'
                            : 'border-white/[0.10] hover:border-white/30'
                        }`}
                      >
                        <img
                          src={photoUrl}
                          alt={`${activeEntry.artist} — ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className={`w-full h-full object-cover transition-transform duration-500 ${
                            isSelected ? 'scale-[0.96]' : 'group-hover:scale-[1.04]'
                          }`}
                        />
                        {isSelectMode && (
                          <span
                            className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                              isSelected
                                ? 'bg-[#D4AF6A] border-[#D4AF6A] text-black'
                                : 'bg-black/65 border-white/45 text-transparent'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <p className="pt-2 text-center text-[11px] sm:text-xs text-[#9A9A9A]">
                {isEn
                  ? 'Official photos · © LUMARÉEL — personal use'
                  : 'Photos officielles · © LUMARÉEL — usage personnel'}
              </p>
            </div>
          )}

          {/* ONGLET 2 : MEILLEURS MOMENTS */}
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              {(activeEntry.description || activeEntry.artists.length > 0) && (
                <div className="rounded-[18px] bg-[#0E0E0E] border border-white/[0.10] p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-[10px] font-agrandir-extrabold uppercase tracking-[0.2em] text-[#D4AF6A]">
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.8} />
                    <span>{isEn ? 'CONCERT NOTES' : 'RÉCIT DE LA SOIRÉE'}</span>
                  </div>
                  {activeEntry.description && (
                    <p className="text-xs sm:text-sm text-[#D0D0D0] leading-relaxed">
                      {activeEntry.description}
                    </p>
                  )}
                  {activeEntry.artists.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {activeEntry.artists.map((artistName) => (
                        <span
                          key={artistName}
                          className="px-3 py-1 rounded-full bg-black border border-white/[0.12] text-[11px] font-agrandir-semibold text-[#D8D8D8]"
                        >
                          {artistName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {highlightPhotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {highlightPhotos.map((photoUrl, idx) => (
                    <button
                      key={`hl_${photoUrl}_${idx}`}
                      type="button"
                      onClick={() => openLightbox(officialLightboxList, idx)}
                      className={`group relative rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] hover:border-[#D4AF6A]/45 cursor-pointer block text-left ${
                        idx === 0 ? 'col-span-2 sm:col-span-2 aspect-[16/10]' : 'aspect-square'
                      }`}
                    >
                      <img
                        src={photoUrl}
                        alt={`${activeEntry.artist} — ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                      <span className="absolute left-3 bottom-2.5 text-[10px] font-agrandir-extrabold uppercase tracking-[0.16em] text-[#D4AF6A]">
                        #{String(idx + 1).padStart(2, '0')} · {activeEntry.artist}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET 3 : VIDÉOS */}
          {activeTab === 'videos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-[#9A9A9A] tabular-nums">
                  {(activeEntry.youtubeEmbedUrl ? 1 : 0) + participantVideosForEvent.length}{' '}
                  {isEn ? 'video(s)' : 'vidéo(s)'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddSheet}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111111] border border-white/20 hover:border-white/40 text-xs font-agrandir-extrabold text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Add a video' : 'Ajouter une vidéo'}</span>
                </button>
              </div>

              {activeEntry.youtubeEmbedUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setIsVideoPlaying(true);
                    if (typeof window !== 'undefined') {
                      window.scrollTo({ top: 320, behavior: 'smooth' });
                    }
                  }}
                  className="w-full p-3 rounded-[16px] bg-[#0E0E0E] border border-white/[0.12] hover:border-[#D4AF6A]/45 flex items-center gap-3.5 text-left group transition-colors cursor-pointer"
                >
                  <div className="relative w-28 sm:w-36 aspect-video rounded-[12px] overflow-hidden bg-black shrink-0">
                    <img
                      src={activeEntry.coverImage}
                      alt={activeEntry.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover brightness-75 group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-9 h-9 rounded-full bg-black/70 group-hover:bg-[#D4AF6A] text-white group-hover:text-black flex items-center justify-center transition-colors">
                        <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                      </span>
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[10px] font-agrandir-extrabold uppercase tracking-[0.18em] text-[#D4AF6A]">
                      {isEn ? 'OFFICIAL RECAP' : 'AFTERMOVIE OFFICIEL'}
                    </p>
                    <p className="font-agrandir-extrabold text-sm sm:text-base text-white truncate">
                      {activeEntry.artist} — {activeEntry.venue}
                    </p>
                    <p className="text-xs text-[#9A9A9A] font-mono">
                      {activeEntry.duration || '02:45'}
                    </p>
                  </div>
                </button>
              )}

              {participantVideosForEvent.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {participantVideosForEvent.map((vid) => (
                    <div
                      key={vid.id}
                      className="rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]"
                    >
                      <video
                        src={vid.mediaUrl}
                        controls
                        playsInline
                        className="w-full aspect-video bg-black object-cover"
                      />
                      <div className="px-3.5 py-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-agrandir-extrabold text-white truncate">
                            {vid.caption}
                          </p>
                          <p className="text-[11px] text-[#9A9A9A] truncate">{vid.authorName}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteParticipantMemory(vid.id)}
                          aria-label={isEn ? 'Delete' : 'Supprimer'}
                          className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-red-500/20 text-[#9A9A9A] hover:text-red-300 flex items-center justify-center cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !activeEntry.youtubeEmbedUrl && (
                  <div className="py-12 px-5 rounded-[18px] bg-[#0E0E0E] border border-white/[0.10] text-center space-y-2.5">
                    <Video className="w-6 h-6 text-[#D4AF6A] mx-auto" strokeWidth={1.6} />
                    <p className="text-sm font-agrandir-extrabold text-white">
                      {isEn ? 'No videos yet' : 'Aucune vidéo partagée pour le moment'}
                    </p>
                  </div>
                )
              )}
            </div>
          )}

          {/* ONGLET 4 : PARTICIPANTS */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs sm:text-sm text-[#9A9A9A] tabular-nums">
                  {participantMemoriesForEvent.length}{' '}
                  {isEn ? 'participant memories' : 'souvenirs de participants'}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAddSheet}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#111111] border border-white/20 hover:border-white/40 text-xs font-agrandir-extrabold text-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Add' : 'Ajouter'}</span>
                </button>
              </div>

              {participantMemoriesForEvent.length === 0 ? (
                <div className="py-10 px-6 rounded-[18px] bg-[#0E0E0E] border border-white/[0.10] text-center space-y-3">
                  <div className="w-11 h-11 rounded-full bg-[#161616] border border-white/[0.12] flex items-center justify-center mx-auto">
                    <Camera className="w-5 h-5 text-[#D4AF6A]" strokeWidth={1.7} />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <p className="font-agrandir-extrabold text-sm sm:text-base text-white">
                      {isEn ? 'Share your point of view' : 'Partagez votre point de vue'}
                    </p>
                    <p className="text-xs text-[#9A9A9A] leading-relaxed">
                      {isEn
                        ? 'Add your best photos or short clips from this concert to the community gallery.'
                        : 'Ajoutez vos meilleures photos ou courtes vidéos de ce concert à la galerie des participants.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleOpenAddSheet}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#D4AF6A] hover:bg-[#dfc07f] text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer lum-press"
                  >
                    <Plus className="w-4 h-4" strokeWidth={2.2} />
                    <span>{isEn ? 'Add a memory' : 'Ajouter un souvenir'}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {participantMemoriesForEvent.map((mem, idx) => (
                    <button
                      key={mem.id}
                      type="button"
                      onClick={() => openLightbox(participantLightboxList, idx)}
                      className="group relative aspect-square rounded-[13px] overflow-hidden bg-[#0E0E0E] border border-white/[0.10] hover:border-[#D4AF6A]/45 cursor-pointer block text-left"
                    >
                      {mem.mediaType === 'video' ? (
                        <>
                          <video
                            src={mem.mediaUrl}
                            muted
                            playsInline
                            className="w-full h-full object-cover brightness-85"
                          />
                          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 border border-white/25 flex items-center justify-center text-white">
                            <Play className="w-3 h-3 ml-0.5 fill-current" />
                          </span>
                        </>
                      ) : (
                        <img
                          src={mem.mediaUrl}
                          alt={mem.caption}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-2.5 pb-2 pt-5">
                        <p className="text-[10px] font-agrandir-extrabold text-white truncate">
                          {mem.authorName}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* 5. AUTRES ÉVÉNEMENTS ARCHIVÉS (EN BAS DE PAGE) */}
        {otherEntries.length > 0 && (
          <section className="mt-10 pt-7 border-t border-white/[0.10] space-y-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight">
                {isEn ? 'Other archived events' : 'Autres événements archivés'}
              </h2>
              <button
                type="button"
                onClick={closeRecap}
                className="text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
              >
                {isEn ? 'View all' : 'Voir tout'}
              </button>
            </div>

            <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1">
              {otherEntries.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => openRecap(ev.id)}
                  className="group shrink-0 snap-start w-[150px] sm:w-[168px] text-left cursor-pointer block lum-press"
                >
                  <div className="relative aspect-[3/4] rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-[#D4AF6A]/45 transition-colors">
                    <img
                      src={ev.coverImage}
                      alt={ev.artist}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute inset-x-3 bottom-2.5 space-y-0.5">
                      <p className="font-agrandir-extrabold text-xs sm:text-[13px] uppercase text-white truncate group-hover:text-[#D4AF6A] transition-colors">
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

        {/* BOTTOM SHEET — AJOUTER UN SOUVENIR PARTICIPANT */}
        <BottomSheet
          open={isAddSheetOpen}
          onClose={() => setIsAddSheetOpen(false)}
          kicker={isEn ? 'PARTICIPANT GALLERY' : 'GALERIE PARTICIPANTS'}
          title={isEn ? `Add a memory · ${activeEntry.artist}` : `Ajouter un souvenir · ${activeEntry.artist}`}
        >
          <form onSubmit={handleSubmitParticipantMemory} className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {uploadPreviewUrl ? (
              <div className="relative rounded-[16px] overflow-hidden bg-black border border-white/[0.12]">
                {uploadMediaType === 'video' ? (
                  <video
                    src={uploadPreviewUrl}
                    controls
                    playsInline
                    className="w-full max-h-[260px] object-contain bg-black"
                  />
                ) : (
                  <img
                    src={uploadPreviewUrl}
                    alt="Aperçu"
                    className="w-full max-h-[260px] object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setUploadPreviewUrl('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  aria-label={isEn ? 'Remove file' : 'Retirer le fichier'}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/80 text-white border border-white/20 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={isProcessingUpload}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-9 px-4 rounded-[18px] bg-[#141414] hover:bg-[#1A1A1A] border border-dashed border-white/20 hover:border-[#D4AF6A]/60 flex flex-col items-center justify-center gap-2 text-center transition-colors cursor-pointer"
              >
                <span className="w-11 h-11 rounded-full bg-black border border-white/[0.12] flex items-center justify-center text-[#D4AF6A]">
                  <Upload className="w-5 h-5" strokeWidth={1.8} />
                </span>
                <span className="text-xs sm:text-sm font-agrandir-extrabold text-white">
                  {isProcessingUpload
                    ? isEn
                      ? 'Preparing file...'
                      : 'Préparation du média...'
                    : isEn
                      ? 'Choose a photo or short video'
                      : 'Choisir une photo ou courte vidéo'}
                </span>
                <span className="text-[11px] text-[#9A9A9A]">
                  JPG, PNG, WEBP, MP4 (max 12 Mo)
                </span>
              </button>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A] mb-1.5">
                  {isEn ? 'Your name' : 'Votre prénom / nom'}
                </label>
                <input
                  type="text"
                  value={uploadAuthor}
                  onChange={(e) => setUploadAuthor(e.target.value)}
                  placeholder={isEn ? 'e.g. Aminata K.' : 'Ex. Aminata K.'}
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#141414] border border-white/[0.12] focus:border-[#D4AF6A] outline-none text-sm text-white placeholder:text-[#666]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A] mb-1.5">
                  {isEn ? 'Caption (optional)' : 'Légende (optionnel)'}
                </label>
                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder={
                    isEn ? 'Best moment of the night...' : 'Un moment fort de la soirée...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[#141414] border border-white/[0.12] focus:border-[#D4AF6A] outline-none text-sm text-white placeholder:text-[#666]"
                />
              </div>
            </div>

            {!currentUser && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-[12px] bg-[#141414] border border-white/[0.08]">
                <span className="text-[11px] text-[#9A9A9A]">
                  {isEn
                    ? 'Sign in to earn loyalty points.'
                    : 'Connectez-vous pour cumuler vos points.'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddSheetOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="text-[11px] font-agrandir-extrabold text-[#D4AF6A] hover:underline whitespace-nowrap cursor-pointer"
                >
                  {isEn ? 'Sign in' : 'Connexion'}
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={!uploadPreviewUrl || isProcessingUpload}
              className="w-full min-h-[48px] rounded-[14px] bg-[#D4AF6A] hover:bg-[#dfc07f] text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed lum-press"
            >
              {isEn ? 'Publish memory' : 'Publier le souvenir'}
            </button>
          </form>
        </BottomSheet>

        {/* LIGHTBOX MÉDIA PLEIN ÉCRAN */}
        {activeLightboxItem && lightboxIdx !== null && (
          <div
            className="fixed inset-0 z-[95] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(null)}
          >
            <div className="max-w-4xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-[#C8C8C8] font-mono tabular-nums truncate">
                    {lightboxIdx + 1} / {lightboxItems.length} · {activeLightboxItem.caption}
                  </p>
                  {activeLightboxItem.authorName && (
                    <p className="text-[11px] text-[#D4AF6A] truncate">
                      {activeLightboxItem.authorName}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {activeLightboxItem.mediaType === 'photo' && (
                    <button
                      type="button"
                      onClick={() => handleDownloadAction([activeLightboxItem.url])}
                      aria-label={isEn ? 'Download' : 'Télécharger'}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-[#D4AF6A] text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      handleShareAction(activeLightboxItem.url, activeLightboxItem.caption)
                    }
                    aria-label={isEn ? 'Share' : 'Partager'}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Share className="w-4 h-4" />
                  </button>

                  {activeLightboxItem.memoryId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteParticipantMemory(activeLightboxItem.memoryId!)}
                      aria-label={isEn ? 'Delete' : 'Supprimer'}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/30 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setLightboxIdx(null)}
                    aria-label={isEn ? 'Close' : 'Fermer'}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                {lightboxItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxIdx((lightboxIdx - 1 + lightboxItems.length) % lightboxItems.length)
                    }
                    aria-label={isEn ? 'Previous' : 'Précédente'}
                    className="absolute left-2 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}

                {activeLightboxItem.mediaType === 'video' ? (
                  <video
                    src={activeLightboxItem.url}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[76vh] w-auto rounded-[16px] bg-black"
                  />
                ) : (
                  <img
                    src={activeLightboxItem.url}
                    alt={activeLightboxItem.caption}
                    referrerPolicy="no-referrer"
                    className="max-h-[76vh] w-auto rounded-[16px] object-contain"
                  />
                )}

                {lightboxItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setLightboxIdx((lightboxIdx + 1) % lightboxItems.length)}
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
      className={`${embedded ? 'w-full' : 'min-h-screen'} w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-24 bg-black text-white font-agrandir-regular`}
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="mb-7 space-y-4">
        {!embedded && <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>Retour</span>
        </button>}

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