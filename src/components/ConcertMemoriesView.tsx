import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  ConcertMemoryAlbum,
  SharedConcertMemory,
  buildConcertMemoryAlbums,
  compressImageDataUrl,
  deleteSharedMemory,
  downloadMediaAsset,
  fileToDataUrl,
  isMemorySharingWindowOpen,
  loadSharedMemories,
  markChallengeCompleted,
  saveSharedMemory,
  shareMediaAsset,
} from '../utils/communityStorage';
import {
  MediaHubItem,
  getPublishedMediaItems,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import { BottomSheet, ScrollReveal, Tabs } from './ui/LumareelKit';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Play,
  Plus,
  Share2,
  Smartphone,
  Ticket,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface ConcertMemoriesViewProps {
  embedded?: boolean;
  onJumpToBackstage?: () => void;
}

type AlbumTab = 'official' | 'highlights' | 'videos' | 'coulisses' | 'participants';
type MemoriesFilter = 'all' | 'concerts' | 'coulisses' | 'photos' | 'videos';

const MAX_INLINE_VIDEO_BYTES = 3.5 * 1024 * 1024;

function downloadCollectorTicketPng(album: ConcertMemoryAlbum, holderName: string) {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(212, 175, 106, 0.45)';
    ctx.lineWidth = 2;
    ctx.strokeRect(56, 56, canvas.width - 112, canvas.height - 112);

    ctx.fillStyle = '#D4AF6A';
    ctx.font = '700 22px sans-serif';
    ctx.fillText('LUMARÉEL · BILLET SOUVENIR COLLECTOR', 110, 150);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 84px sans-serif';
    const title = (album.artist || album.title).toUpperCase().slice(0, 18);
    ctx.fillText(title, 110, 340);

    ctx.fillStyle = '#C8C8C8';
    ctx.font = '400 32px sans-serif';
    ctx.fillText(`${album.date}`, 110, 420);
    ctx.fillText(`${album.venue}, ${album.city}`, 110, 470);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(110, 860);
    ctx.lineTo(970, 860);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#9A9A9A';
    ctx.font = '600 22px sans-serif';
    ctx.fillText('TITULAIRE', 110, 940);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 38px sans-serif';
    ctx.fillText(holderName || 'Membre LUMARÉEL', 110, 995);

    ctx.fillStyle = '#D4AF6A';
    ctx.font = '700 26px monospace';
    ctx.fillText('VOUS Y ÉTIEZ · © LUMARÉEL', 110, 1180);

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `lumareel-collector-${album.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch {
    return false;
  }
}

export const ConcertMemoriesView: React.FC<ConcertMemoriesViewProps> = ({
  embedded = false,
}) => {
  const {
    archives,
    events,
    customerOrders,
    currentUser,
    previousPage,
    goBack,
    setCurrentPage,
    setCheckoutEvent,
    setSelectedMediaId,
    selectedMemoryAlbumId,
    setSelectedMemoryAlbumId,
    setHideBottomNav,
    showToast,
    language,
  } = useApp();
  const isEn = language === 'en';

  const albums = useMemo(() => buildConcertMemoryAlbums(archives), [archives]);
  const publishedEvents = useMemo(
    () => (events || []).filter((e) => e.status !== 'draft'),
    [events]
  );

  const [allHubMedia, setAllHubMedia] = useState<MediaHubItem[]>(() =>
    getPublishedMediaItems()
  );

  useEffect(() => {
    const sync = () => setAllHubMedia(getPublishedMediaItems());
    sync();
    return subscribeMediaHub(sync);
  }, []);

  const publishedHubMemories = useMemo(
    () => allHubMedia.filter((m) => m.placement === 'memories'),
    [allHubMedia]
  );

  const publishedBackstageMedia = useMemo(
    () => allHubMedia.filter((m) => m.placement === 'backstage'),
    [allHubMedia]
  );

  const [indexFilter, setIndexFilter] = useState<MemoriesFilter>('all');

  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(() => {
    if (!selectedMemoryAlbumId) return null;
    const match = albums.find((a) => a.id === selectedMemoryAlbumId);
    return match ? match.id : albums[0]?.id || null;
  });
  const [albumTab, setAlbumTab] = useState<AlbumTab>('official');

  // Ouvre directement la page Memories du concert lorsqu'un poster concert est cliqué depuis Discover
  useEffect(() => {
    if (selectedMemoryAlbumId) {
      const match = albums.find((a) => a.id === selectedMemoryAlbumId);
      setSelectedAlbumId(match ? match.id : albums[0]?.id || null);
      setAlbumTab('official');
      setIsVideoPlaying(false);
      setIsChapterVideoPlaying(false);
      setIsSelectingPhotos(false);
      setSelectedPhotoUrls([]);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, [selectedMemoryAlbumId, albums]);
  const [isSelectingPhotos, setIsSelectingPhotos] = useState(false);
  const [selectedPhotoUrls, setSelectedPhotoUrls] = useState<string[]>([]);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [isDownloadSheetOpen, setIsDownloadSheetOpen] = useState(false);

  const [sharedMemories, setSharedMemories] = useState<SharedConcertMemory[]>(() =>
    loadSharedMemories()
  );
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    url: string;
    caption: string;
    filename: string;
  } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isChapterVideoPlaying, setIsChapterVideoPlaying] = useState(false);

  // Formulaire de partage photo/vidéo par les participants
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadMediaType, setUploadMediaType] = useState<'photo' | 'video'>('photo');
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>('');
  const [isPreparingFile, setIsPreparingFile] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Masquer la barre flottante en mode Sélectionner (Maquette 07)
  useEffect(() => {
    setHideBottomNav(isSelectingPhotos);
    return () => setHideBottomNav(false);
  }, [isSelectingPhotos, setHideBottomNav]);

  const selectedAlbum: ConcertMemoryAlbum | null = useMemo(
    () => albums.find((a) => a.id === selectedAlbumId) || null,
    [albums, selectedAlbumId]
  );

  const nextAlbum: ConcertMemoryAlbum | null = useMemo(() => {
    if (!selectedAlbum || albums.length <= 1) return null;
    const idx = albums.findIndex((a) => a.id === selectedAlbum.id);
    return albums[(idx + 1) % albums.length] || null;
  }, [albums, selectedAlbum]);

  const resolveLinkedEvent = (album: ConcertMemoryAlbum): ConcertEvent | null => {
    if (publishedEvents.length === 0) return null;
    const albumHay = `${album.title} ${album.artist}`.toLowerCase();
    return (
      publishedEvents.find((ev) => {
        const artist = (ev.artist || '').trim().toLowerCase();
        const title = (ev.title || '').trim().toLowerCase();
        return (
          (artist.length >= 3 && albumHay.includes(artist)) ||
          (title.length >= 4 && albumHay.includes(title))
        );
      }) || null
    );
  };

  // Vérifie si l'utilisateur a assisté au concert (billet réel associé)
  const didAttendAlbum = (album: ConcertMemoryAlbum): boolean => {
    if (!customerOrders || customerOrders.length === 0) return false;
    const hay = `${album.title} ${album.artist}`.toLowerCase();
    return customerOrders.some((ord) => {
      if (ord.paymentStatus !== 'completed') return false;
      const evTitle = (ord.eventTitle || '').toLowerCase();
      return evTitle.length >= 3 && (hay.includes(evTitle) || evTitle.includes(album.artist.toLowerCase()));
    });
  };

  // Photos officielles strictement rattachées à ce concert précis
  const albumOfficialPhotos = useMemo(() => {
    if (!selectedAlbum) return [];
    const base = [...selectedAlbum.officialPhotos];
    const seen = new Set(base.map((p) => p.url));
    const normTitle = selectedAlbum.title.trim().toLowerCase();

    for (const item of publishedHubMemories) {
      if (item.mediaType !== 'photo') continue;
      const matchesId = item.eventId && item.eventId === selectedAlbum.id;
      const matchesTitle =
        item.albumTitle && item.albumTitle.trim().toLowerCase() === normTitle;
      if ((matchesId || matchesTitle) && !seen.has(item.url)) {
        seen.add(item.url);
        base.push({
          url: item.url,
          captionFr: item.title,
          captionEn: item.titleEn || item.title,
        });
      }
    }
    return base;
  }, [selectedAlbum, publishedHubMemories]);

  // Souvenirs partagés strictement rattachés à ce concert (zéro fuite entre concerts)
  const albumSharedItems = useMemo(() => {
    if (!selectedAlbum) return [];
    return sharedMemories.filter((m) => m.eventId === selectedAlbum.id);
  }, [selectedAlbum, sharedMemories]);

  const albumSharedVideos = useMemo(
    () => albumSharedItems.filter((m) => m.mediaType === 'video'),
    [albumSharedItems]
  );

  // Coulisses associées au concert (ou coulisses générales publiées)
  const albumCoulissesItems = useMemo(() => {
    if (!selectedAlbum) return [];
    const normTitle = selectedAlbum.title.trim().toLowerCase();
    const normArtist = (selectedAlbum.artist || '').trim().toLowerCase();
    const matched = publishedBackstageMedia.filter((item) => {
      if (item.eventId && item.eventId === selectedAlbum.id) return true;
      const hay = `${item.albumTitle || ''} ${item.artistName || ''} ${item.title}`.toLowerCase();
      return (normArtist.length >= 3 && hay.includes(normArtist)) || hay.includes(normTitle);
    });
    return matched.length > 0 ? matched : publishedBackstageMedia;
  }, [selectedAlbum, publishedBackstageMedia]);

  // Liste complète de photos pour navigation Précédent / Suivant dans la Lightbox
  const allIndexPhotos = useMemo(() => {
    const list: Array<{ url: string; caption: string; filename: string; albumLabel: string }> = [];
    const seen = new Set<string>();
    albums.forEach((album) => {
      album.officialPhotos.forEach((p, idx) => {
        if (seen.has(p.url)) return;
        seen.add(p.url);
        list.push({
          url: p.url,
          caption: isEn ? p.captionEn : p.captionFr,
          filename: `lumareel-${album.id}-photo-${idx + 1}.jpg`,
          albumLabel: album.artist || album.title,
        });
      });
    });
    allHubMedia.forEach((item) => {
      if (item.mediaType !== 'photo' || seen.has(item.url)) return;
      seen.add(item.url);
      list.push({
        url: item.url,
        caption: isEn && item.titleEn ? item.titleEn : item.title,
        filename: `lumareel-media-${item.id}.jpg`,
        albumLabel: item.albumTitle || item.date,
      });
    });
    return list;
  }, [albums, allHubMedia, isEn]);

  const activeLightboxGallery = useMemo(() => {
    if (selectedAlbum) {
      return [
        ...albumOfficialPhotos.map((p, idx) => ({
          url: p.url,
          caption: isEn ? p.captionEn : p.captionFr,
          filename: `lumareel-${selectedAlbum.id}-photo-${idx + 1}.jpg`,
        })),
        ...albumSharedItems
          .filter((i) => i.mediaType === 'photo')
          .map((i) => ({
            url: i.mediaUrl,
            caption: i.caption || i.authorName,
            filename: `lumareel-souvenir-${i.id}.jpg`,
          })),
      ];
    }
    return allIndexPhotos;
  }, [selectedAlbum, albumOfficialPhotos, albumSharedItems, allIndexPhotos, isEn]);

  const navigateLightbox = (direction: 'prev' | 'next') => {
    if (!lightboxPhoto || activeLightboxGallery.length <= 1) return;
    const idx = activeLightboxGallery.findIndex((p) => p.url === lightboxPhoto.url);
    if (idx === -1) return;
    const nextIdx =
      direction === 'next'
        ? (idx + 1) % activeLightboxGallery.length
        : (idx - 1 + activeLightboxGallery.length) % activeLightboxGallery.length;
    setLightboxPhoto(activeLightboxGallery[nextIdx]);
  };

  const handleDownload = async (url: string, filename: string) => {
    const ok = await downloadMediaAsset(url, filename);
    if (ok) {
      showToast(
        isEn ? 'Downloaded to your device.' : 'Téléchargé sur votre appareil.',
        'success'
      );
    } else {
      showToast(
        isEn ? 'Unable to download this file.' : 'Téléchargement impossible pour ce fichier.',
        'error'
      );
    }
  };

  const handleBatchDownload = async (explicitUrls?: string[]) => {
    if (!selectedAlbum) return;
    const urlsToDownload =
      explicitUrls && explicitUrls.length > 0
        ? explicitUrls
        : selectedPhotoUrls.length > 0
        ? selectedPhotoUrls
        : albumOfficialPhotos.slice(0, 6).map((p) => p.url);

    const targets = urlsToDownload.length > 0 ? urlsToDownload : [selectedAlbum.coverImage];

    let okCount = 0;
    for (let i = 0; i < targets.length; i += 1) {
      const ok = await downloadMediaAsset(
        targets[i],
        `lumareel-${selectedAlbum.id}-photo-${i + 1}.jpg`
      );
      if (ok) okCount += 1;
    }

    if (okCount > 0) {
      showToast(
        isEn
          ? `${okCount} photo${okCount > 1 ? 's' : ''} downloaded.`
          : `${okCount} photo${okCount > 1 ? 's' : ''} téléchargée${okCount > 1 ? 's' : ''}.`,
        'success'
      );
      setIsSelectingPhotos(false);
      setSelectedPhotoUrls([]);
      setIsDownloadSheetOpen(false);
    } else {
      showToast(
        isEn ? 'Unable to download.' : 'Téléchargement impossible.',
        'error'
      );
    }
  };

  const handleShareSelected = async () => {
    if (!selectedAlbum) return;
    const firstUrl = selectedPhotoUrls[0];
    if (!firstUrl) {
      await handleShareAlbum(selectedAlbum);
      return;
    }
    await handleShareItem({
      title: `${selectedAlbum.artist || selectedAlbum.title} — LUMARÉEL`,
      assetUrl: firstUrl,
      filename: `lumareel-${selectedAlbum.id}-selection.jpg`,
    });
    setIsSelectingPhotos(false);
    setSelectedPhotoUrls([]);
  };

  const handleShareAlbum = async (album: ConcertMemoryAlbum) => {
    const result = await shareMediaAsset({
      title: album.title,
      text: `${album.title} — ${album.venue}`,
    });
    if (result === 'copied') {
      showToast(isEn ? 'Link copied.' : 'Lien copié.', 'success');
    } else if (result === 'failed') {
      showToast(isEn ? 'Sharing unavailable.' : 'Partage indisponible.', 'info');
    }
  };

  const handleShareItem = async (params: {
    title: string;
    assetUrl: string;
    filename: string;
  }) => {
    const result = await shareMediaAsset({
      title: params.title,
      text: params.title,
      assetUrl: params.assetUrl,
      filename: params.filename,
    });
    if (result === 'copied') {
      showToast(isEn ? 'Link copied.' : 'Lien copié.', 'success');
    } else if (result === 'failed') {
      showToast(isEn ? 'Sharing unavailable.' : 'Partage indisponible.', 'info');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setUploadMediaType(isVideo ? 'video' : 'photo');
    setIsPreparingFile(true);

    try {
      if (isVideo) {
        if (file.size <= MAX_INLINE_VIDEO_BYTES) {
          const dataUrl = await fileToDataUrl(file);
          setUploadPreviewUrl(dataUrl);
        } else {
          const objectUrl = URL.createObjectURL(file);
          setUploadPreviewUrl(objectUrl);
        }
      } else {
        const compressed = await compressImageDataUrl(file, 1280, 0.78);
        setUploadPreviewUrl(compressed);
      }
    } catch {
      showToast(
        isEn
          ? 'Could not load this file. Try another photo or video.'
          : 'Impossible de charger ce fichier. Essayez une autre photo ou vidéo.',
        'error'
      );
      setUploadPreviewUrl('');
    } finally {
      setIsPreparingFile(false);
    }
  };

  const handlePublishMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlbum) return;
    if (!isMemorySharingWindowOpen(selectedAlbum.date)) return;
    if (!uploadPreviewUrl) {
      showToast(
        isEn
          ? 'Choose a photo or video first.'
          : 'Choisissez d’abord une photo ou une vidéo.',
        'error'
      );
      return;
    }

    setIsUploading(true);
    try {
      const entry: SharedConcertMemory = {
        id: `mem_${Date.now()}`,
        eventId: selectedAlbum.id,
        authorName: currentUser?.name || (isEn ? 'Guest' : 'Participant'),
        mediaType: uploadMediaType,
        mediaUrl: uploadPreviewUrl,
        caption: uploadCaption.trim(),
        createdAt: new Date().toISOString(),
      };
      const updated = saveSharedMemory(entry);
      setSharedMemories(updated);
      setUploadCaption('');
      setUploadPreviewUrl('');
      setIsAddSheetOpen(false);
      setAlbumTab('participants');
      if (fileInputRef.current) fileInputRef.current.value = '';

      const challengeUnlocked = markChallengeCompleted(currentUser, 'challenge_memory');
      showToast(
        challengeUnlocked
          ? isEn
            ? 'Memory published! +100 points.'
            : 'Souvenir publié ! +100 points.'
          : isEn
          ? 'Memory published.'
          : 'Souvenir publié.',
        'success'
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMemory = (id: string) => {
    const updated = deleteSharedMemory(id);
    setSharedMemories(updated);
    showToast(isEn ? 'Removed.' : 'Supprimé.', 'info');
  };

  const togglePhotoSelection = (url: string) => {
    setSelectedPhotoUrls((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  };

  // =========================================================================
  // PAGE DÉDIÉE À UN CONCERT (ÉCRANS 07 + 03 RÉUNIS — ZÉRO ARRONDI)
  // =========================================================================
  if (selectedAlbum) {
    const linkedEvent = resolveLinkedEvent(selectedAlbum);
    const canShareAndDownload = isMemorySharingWindowOpen(selectedAlbum.date);
    const attended = didAttendAlbum(selectedAlbum);
    const editionYear = selectedAlbum.date.match(/\b20\d{2}\b/)?.[0] || '2026';
    const embedSrc = selectedAlbum.recapEmbedUrl.includes('autoplay=1')
      ? selectedAlbum.recapEmbedUrl
      : `${selectedAlbum.recapEmbedUrl}${
          selectedAlbum.recapEmbedUrl.includes('?') ? '&' : '?'
        }autoplay=1`;

    const chapter1Photos = albumOfficialPhotos.slice(0, 3);
    const chapter3Photos =
      albumOfficialPhotos.length > 3 ? albumOfficialPhotos.slice(3) : albumOfficialPhotos;

    return (
      <div
        className={
          embedded
            ? 'w-full text-white font-agrandir-regular'
            : 'min-h-screen w-full bg-black text-white font-agrandir-regular pb-28'
        }
      >
        <div className={embedded ? '' : 'max-w-[1280px] mx-auto'}>
          {/* 1. HERO PHOTO PLEINE LARGEUR — arrondi 24px */}
          <div className="relative w-full aspect-[4/3] sm:aspect-[21/9] rounded-b-[24px] sm:rounded-[24px] bg-[#0E0E0E] overflow-hidden">
            <img
              src={selectedAlbum.coverImage}
              alt={selectedAlbum.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/25" />

            {/* Bouton retour circulaire haut-gauche + libellé haut-droite */}
            <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const cameFromExplorer = Boolean(selectedMemoryAlbumId) && previousPage === 'explore';
                  setSelectedMemoryAlbumId(null);
                  setSelectedAlbumId(null);
                  setAlbumTab('official');
                  setIsVideoPlaying(false);
                  setIsChapterVideoPlaying(false);
                  setIsSelectingPhotos(false);
                  setSelectedPhotoUrls([]);
                  setIsAddSheetOpen(false);
                  setIsDownloadSheetOpen(false);
                  if (cameFromExplorer) {
                    goBack();
                  }
                }}
                aria-label={isEn ? 'Back to memories' : 'Retour aux souvenirs'}
                className="w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/[0.18] backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={1.6} />
              </button>

              <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#C8C8C8]">
                {albumTab === 'highlights'
                  ? isEn
                    ? 'COVER · B&W PHOTO'
                    : 'COUVERTURE · PHOTO N&B'
                  : isEn
                  ? 'OFFICIAL PHOTO'
                  : 'PHOTO OFFICIELLE'}
              </span>
            </div>
          </div>

          {/* 2. CORPS PRINCIPAL */}
          <div className="px-4 sm:px-8 -mt-12 relative z-10 space-y-6 max-w-5xl mx-auto">
            {/* En-tête : SOUVENIRS DE CONCERT + Titre + Date/Lieu + Badge VOUS Y ÉTIEZ */}
            <header className="space-y-2">
              <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#D4AF6A]">
                {albumTab === 'highlights'
                  ? `SOUVENIRS · ÉDITION ${editionYear}`
                  : isEn
                  ? 'CONCERT MEMORIES'
                  : 'SOUVENIRS DE CONCERT'}
              </p>

              <h1 className="font-agrandir-extrabold text-[2.2rem] sm:text-5xl uppercase tracking-tight leading-[0.98] text-white">
                {selectedAlbum.artist || selectedAlbum.title}
              </h1>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <p className="text-xs sm:text-sm text-[#C8C8C8]">
                  {selectedAlbum.date} · {selectedAlbum.venue}, {selectedAlbum.city}
                </p>

                <div className="flex items-center gap-2">
                  {(attended || currentUser) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#D4AF6A]/65 bg-black/80 text-[#D4AF6A] text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em]">
                      <Check className="w-3 h-3" strokeWidth={1.8} />
                      <span>{isEn ? 'YOU WERE THERE' : 'VOUS Y ÉTIEZ'}</span>
                    </span>
                  )}
                  {linkedEvent && (
                    <button
                      type="button"
                      onClick={() => setCheckoutEvent(linkedEvent)}
                      className="px-3.5 py-1 rounded-full border border-white/25 hover:border-white text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] text-white cursor-pointer transition-colors"
                    >
                      {isEn ? 'Book tickets' : 'Réserver'}
                    </button>
                  )}
                </div>
              </div>
            </header>

            {/* 3. BARRE DES 3 TUILES D'ACTION (arrondi 16px — MASQUÉE APRÈS 7 JOURS) */}
            {canShareAndDownload && (
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsDownloadSheetOpen(true)}
                  className="min-h-[72px] rounded-[16px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer lum-press"
                >
                  <Download className="w-4 h-4" strokeWidth={1.6} />
                  <span className="text-xs font-agrandir-extrabold">
                    {isEn ? 'Download' : 'Télécharger'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShareAlbum(selectedAlbum)}
                  className="min-h-[72px] rounded-[16px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] text-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer lum-press"
                >
                  <Share2 className="w-4 h-4 text-[#C8C8C8]" strokeWidth={1.6} />
                  <span className="text-xs font-agrandir-extrabold">
                    {isEn ? 'Share' : 'Partager'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddSheetOpen((prev) => !prev)}
                  className="min-h-[72px] rounded-[16px] bg-[#0E0E0E] hover:bg-[#141414] border border-white/[0.12] text-white flex flex-col items-center justify-center gap-1.5 transition-colors cursor-pointer lum-press"
                >
                  <Plus className="w-4 h-4 text-[#C8C8C8]" strokeWidth={1.6} />
                  <span className="text-xs font-agrandir-extrabold">
                    {isEn ? 'Add' : 'Ajouter'}
                  </span>
                </button>
              </div>
            )}

            {/* Formulaire d'ajout de souvenir (arrondi 20px) */}
            {canShareAndDownload && isAddSheetOpen && (
              <form
                onSubmit={handlePublishMemory}
                className="rounded-[20px] bg-[#0E0E0E] border border-white/[0.12] p-4 sm:p-5 space-y-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-agrandir-extrabold text-sm text-white">
                    {isEn ? 'Add your photo or video' : 'Ajouter ma photo ou vidéo'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddSheetOpen(false)}
                    className="w-8 h-8 rounded-full bg-[#141414] border border-white/[0.12] flex items-center justify-center text-[#9A9A9A] hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.6} />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPreparingFile}
                  className="w-full min-h-[112px] rounded-[14px] border border-dashed border-white/25 hover:border-[#D4AF6A] bg-black flex flex-col items-center justify-center gap-2 p-3 text-center transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isPreparingFile ? (
                    <Loader2 className="w-5 h-5 text-[#D4AF6A] animate-spin" />
                  ) : uploadPreviewUrl ? (
                    uploadMediaType === 'video' ? (
                      <video
                        src={uploadPreviewUrl}
                        className="max-h-36 rounded-lg"
                        controls
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <img
                        src={uploadPreviewUrl}
                        alt="Preview"
                        className="max-h-36 rounded-lg object-contain"
                      />
                    )
                  ) : (
                    <>
                      <Upload className="w-5 h-5 text-[#D4AF6A]" strokeWidth={1.6} />
                      <span className="text-xs font-agrandir-semibold text-white">
                        {isEn ? 'Choose a photo or video' : 'Choisir une photo ou vidéo'}
                      </span>
                    </>
                  )}
                </button>

                <input
                  type="text"
                  value={uploadCaption}
                  onChange={(e) => setUploadCaption(e.target.value)}
                  placeholder={isEn ? 'Caption (optional)' : 'Légende (optionnel)'}
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/[0.16] text-sm text-white placeholder:text-[#9A9A9A] focus:border-[#D4AF6A] focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={isUploading || isPreparingFile || !uploadPreviewUrl}
                  className="w-full min-h-[46px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs transition-colors cursor-pointer disabled:opacity-40 lum-press"
                >
                  {isUploading
                    ? isEn
                      ? 'Publishing...'
                      : 'Publication...'
                    : isEn
                    ? 'Publish my memory'
                    : 'Publier mon souvenir'}
                </button>
              </form>
            )}

            {/* 4. AFTERMOVIE OFFICIEL — arrondi 18px, miniature dégagée */}
            {albumTab !== 'highlights' && (
              <section className="space-y-3 pt-1">
                <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
                  {isEn ? 'Official Aftermovie' : 'Aftermovie officiel'}
                </h2>

                <div className="aspect-[16/9] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] relative">
                  {isVideoPlaying ? (
                    <iframe
                      src={embedSrc}
                      title={selectedAlbum.title}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsVideoPlaying(true)}
                      aria-label={isEn ? 'Play official aftermovie' : "Lire l'aftermovie officiel"}
                      className="w-full h-full relative group cursor-pointer block"
                    >
                      <img
                        src={selectedAlbum.coverImage}
                        alt={selectedAlbum.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/55 group-hover:bg-[#D4AF6A] text-white group-hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors">
                          <Play className="w-6 h-6 ml-0.5 fill-current" strokeWidth={1.6} />
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              </section>
            )}

            {/* 5. ONGLETS ADAPTÉS AUX MÉDIAS RÉELLEMENT DISPONIBLES */}
            <Tabs<AlbumTab>
              activeId={albumTab}
              onChange={(next) => {
                setAlbumTab(next);
                if (next !== 'official') {
                  setIsSelectingPhotos(false);
                  setSelectedPhotoUrls([]);
                }
              }}
              items={[
                ...(albumOfficialPhotos.length > 0
                  ? [{ id: 'official' as const, label: isEn ? 'Official' : 'Officielles' }]
                  : []),
                { id: 'highlights' as const, label: isEn ? 'Highlights' : 'Meilleurs moments' },
                ...(albumCoulissesItems.length > 0
                  ? [{ id: 'coulisses' as const, label: isEn ? 'Backstage' : 'Coulisses' }]
                  : []),
                ...(albumSharedVideos.length > 0
                  ? [{ id: 'videos' as const, label: isEn ? 'Videos' : 'Vidéos' }]
                  : []),
                ...(albumSharedItems.length > 0 || canShareAndDownload
                  ? [{ id: 'participants' as const, label: isEn ? 'Community' : 'Participants' }]
                  : []),
              ]}
            />

            {/* ONGLET A : OFFICIELLES (MAQUETTE 07 — GRILLE 3 COLONNES CARRÉE 0px + SÉLECTIONNER) */}
            {albumTab === 'official' && (
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm text-[#9A9A9A]">
                    {albumOfficialPhotos.length}{' '}
                    {isEn ? 'official photos' : 'photos officielles'}
                  </span>

                  {canShareAndDownload && albumOfficialPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectingPhotos((prev) => !prev);
                        setSelectedPhotoUrls([]);
                      }}
                      className={`min-h-[34px] px-4 rounded-full border text-xs font-agrandir-extrabold transition-colors cursor-pointer ${
                        isSelectingPhotos
                          ? 'bg-[#D4AF6A] border-[#D4AF6A] text-black'
                          : 'border-white/25 text-white hover:border-white'
                      }`}
                    >
                      {isSelectingPhotos
                        ? isEn
                          ? 'Cancel'
                          : 'Annuler'
                        : isEn
                        ? 'Select'
                        : 'Sélectionner'}
                    </button>
                  )}
                </div>

                {albumOfficialPhotos.length > 0 ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-2.5">
                    {albumOfficialPhotos.map((photo, idx) => {
                      const caption = isEn ? photo.captionEn : photo.captionFr;
                      const filename = `lumareel-${selectedAlbum.id}-photo-${idx + 1}.jpg`;
                      const isSelected = selectedPhotoUrls.includes(photo.url);

                      return (
                        <button
                          key={`${photo.url}_${idx}`}
                          type="button"
                          onClick={() => {
                            if (isSelectingPhotos && canShareAndDownload) {
                              togglePhotoSelection(photo.url);
                            } else {
                              setLightboxPhoto({ url: photo.url, caption, filename });
                            }
                          }}
                          className={`group relative aspect-square rounded-[12px] overflow-hidden bg-[#0E0E0E] cursor-pointer block ${
                            isSelected ? 'ring-2 ring-inset ring-[#D4AF6A]' : ''
                          }`}
                        >
                          <img
                            src={photo.url}
                            alt={caption}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                          />
                          {isSelectingPhotos && canShareAndDownload && (
                            <span
                              className={`absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-[#D4AF6A] border-[#D4AF6A] text-black'
                                  : 'bg-black/65 border-white/65 text-transparent'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" strokeWidth={2} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-10 text-center text-xs text-[#9A9A9A]">
                    {isEn
                      ? 'Official photos for this concert will appear here.'
                      : 'Les photos officielles de ce concert apparaîtront ici.'}
                  </p>
                )}

                <p className="pt-3 text-center text-[11px] text-[#9A9A9A]">
                  {isEn
                    ? 'Official photos · © LUMARÉEL — personal use'
                    : 'Photos officielles · © LUMARÉEL — usage personnel'}
                </p>
              </section>
            )}

            {/* ONGLET B : MEILLEURS MOMENTS (MAQUETTE 03 — RÉCIT ÉDITORIAL EN 3 CHAPITRES, 0px) */}
            {albumTab === 'highlights' && (
              <article className="space-y-10 pt-1">
                <p className="text-base sm:text-lg text-[#C8C8C8] leading-relaxed max-w-xl">
                  {isEn
                    ? "We don't just stage concerts. We create memories. A look back at the night, from the first chord to the final encore."
                    : "On ne fait pas des concerts. On crée des souvenirs. Retour sur la nuit, du premier accord au dernier rappel."}
                </p>

                <div className="py-3.5 border-y border-white/[0.12] flex items-center gap-6 text-xs text-[#9A9A9A]">
                  <span>{albumOfficialPhotos.length} photos</span>
                  <span>
                    {1 + albumSharedVideos.length}{' '}
                    {isEn ? 'video(s)' : albumSharedVideos.length > 0 ? 'vidéos' : 'vidéo'}
                  </span>
                  <span>3 {isEn ? 'chapters' : 'chapitres'}</span>
                </div>

                {/* CHAPITRE I : L'arrivée (collage asymétrique 2+1, 0px) */}
                <ScrollReveal>
                  <section className="space-y-4">
                    <div>
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                        CHAPITRE I
                      </p>
                      <h2 className="mt-1 font-agrandir-extrabold text-2xl sm:text-3xl text-white">
                        {isEn ? 'Arrival' : "L'arrivée"}
                      </h2>
                    </div>

                    {chapter1Photos.length > 0 && (
                      <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxPhoto({
                              url: chapter1Photos[0].url,
                              caption: isEn
                                ? chapter1Photos[0].captionEn
                                : chapter1Photos[0].captionFr,
                              filename: `lumareel-${selectedAlbum.id}-ch1-1.jpg`,
                            })
                          }
                          className="col-span-7 aspect-[3/4] rounded-[16px] overflow-hidden bg-[#0E0E0E] cursor-pointer block"
                        >
                          <img
                            src={chapter1Photos[0].url}
                            alt={selectedAlbum.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500"
                          />
                        </button>

                        <div className="col-span-5 grid grid-rows-2 gap-2 sm:gap-2.5">
                          {[1, 2].map((slotIdx) => {
                            const p = chapter1Photos[slotIdx] || chapter1Photos[0];
                            return (
                              <button
                                key={slotIdx}
                                type="button"
                                onClick={() =>
                                  setLightboxPhoto({
                                    url: p.url,
                                    caption: isEn ? p.captionEn : p.captionFr,
                                    filename: `lumareel-${selectedAlbum.id}-ch1-${slotIdx + 1}.jpg`,
                                  })
                                }
                                className="w-full h-full rounded-[14px] overflow-hidden bg-[#0E0E0E] cursor-pointer block"
                              >
                                <img
                                  src={p.url}
                                  alt={selectedAlbum.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover hover:scale-[1.03] transition-transform duration-500"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Citation éditoriale */}
                    <blockquote className="pt-4 font-agrandir-extrabold text-xl sm:text-2xl text-white leading-snug max-w-xl">
                      «{' '}
                      {isEn
                        ? `An electric night at ${selectedAlbum.venue} — the entire crowd sang every word from start to finish.`
                        : `Une énergie rare à ${selectedAlbum.venue} — toute la salle a vibré du premier accord jusqu'au dernier rappel.`}
                      {' '}»
                    </blockquote>
                  </section>
                </ScrollReveal>

                {/* CHAPITRE II : Sur scène (lecteur vidéo 0px, miniature dégagée) */}
                <ScrollReveal>
                  <section className="space-y-4">
                    <div>
                      <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                        CHAPITRE II
                      </p>
                      <h2 className="mt-1 font-agrandir-extrabold text-2xl sm:text-3xl text-white">
                        {isEn ? 'On stage' : 'Sur scène'}
                      </h2>
                    </div>

                    <div className="aspect-[16/9] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] relative">
                      {isChapterVideoPlaying ? (
                        <iframe
                          src={embedSrc}
                          title={selectedAlbum.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsChapterVideoPlaying(true)}
                          aria-label={isEn ? 'Play stage video' : 'Lire la vidéo sur scène'}
                          className="w-full h-full relative group cursor-pointer block"
                        >
                          <img
                            src={selectedAlbum.coverImage}
                            alt={selectedAlbum.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/55 group-hover:bg-[#D4AF6A] text-white group-hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors">
                              <Play className="w-6 h-6 ml-0.5 fill-current" strokeWidth={1.6} />
                            </div>
                          </div>
                        </button>
                      )}
                    </div>
                  </section>
                </ScrollReveal>

                {/* CHAPITRE III : Meilleurs instants (0px) */}
                {chapter3Photos.length > 0 && (
                  <ScrollReveal>
                    <section className="space-y-4">
                      <div>
                        <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                          CHAPITRE III
                        </p>
                        <h2 className="mt-1 font-agrandir-extrabold text-2xl sm:text-3xl text-white">
                          {isEn ? 'Best moments' : 'Meilleurs instants'}
                        </h2>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {chapter3Photos.map((photo, idx) => {
                          const caption = isEn ? photo.captionEn : photo.captionFr;
                          return (
                            <button
                              key={`${photo.url}_ch3_${idx}`}
                              type="button"
                              onClick={() =>
                                setLightboxPhoto({
                                  url: photo.url,
                                  caption,
                                  filename: `lumareel-${selectedAlbum.id}-best-${idx + 1}.jpg`,
                                })
                              }
                              className="aspect-[4/3] rounded-[14px] overflow-hidden bg-[#0E0E0E] cursor-pointer block group"
                            >
                              <img
                                src={photo.url}
                                alt={caption}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                              />
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  </ScrollReveal>
                )}

                {/* PIED DU RÉCIT ÉDITORIAL : CTA Photos/Vidéos + Souvenir suivant → */}
                <div className="pt-6 border-t border-white/[0.12] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAlbumTab('official');
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="min-h-[48px] px-6 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm transition-colors cursor-pointer lum-press"
                  >
                    {isEn ? 'Photos, videos & downloads' : 'Photos, vidéos & téléchargements'}
                  </button>

                  {nextAlbum && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAlbumId(nextAlbum.id);
                        setAlbumTab('highlights');
                        setIsVideoPlaying(false);
                        setIsChapterVideoPlaying(false);
                        if (typeof window !== 'undefined') {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 min-h-[44px] text-xs sm:text-sm font-agrandir-extrabold text-white hover:text-[#D4AF6A] transition-colors cursor-pointer"
                    >
                      <span>
                        {isEn ? 'Next memory' : 'Souvenir suivant'} · {nextAlbum.artist || nextAlbum.title}
                      </span>
                      <ArrowRight className="w-4 h-4" strokeWidth={1.6} />
                    </button>
                  )}
                </div>
              </article>
            )}

            {/* ONGLET C : VIDÉOS */}
            {albumTab === 'videos' && (
              <section className="space-y-5">
                {albumSharedVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {albumSharedVideos.map((vid) => (
                      <article key={vid.id} className="space-y-2">
                        <div className="aspect-[16/9] rounded-[16px] overflow-hidden bg-black border border-white/[0.12]">
                          <video
                            src={vid.mediaUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2 text-xs text-[#9A9A9A]">
                          <span className="truncate">{vid.caption || vid.authorName}</span>
                          {canShareAndDownload && (
                            <button
                              type="button"
                              onClick={() =>
                                handleDownload(vid.mediaUrl, `lumareel-video-${vid.id}.mp4`)
                              }
                              className="text-[#C8C8C8] hover:text-white cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                            </button>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-xs sm:text-sm text-[#9A9A9A]">
                    {isEn
                      ? 'The official aftermovie is available above. Participant clips shared for this concert will also appear here.'
                      : "L'aftermovie officiel est disponible ci-dessus. Les vidéos partagées par les participants pour ce concert s'afficheront ici."}
                  </p>
                )}
              </section>
            )}

            {/* ONGLET C-BIS : COULISSES */}
            {albumTab === 'coulisses' && albumCoulissesItems.length > 0 && (
              <section className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {albumCoulissesItems.map((item) => {
                    const itemTitle = isEn && item.titleEn ? item.titleEn : item.title;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedMediaId(item.id);
                          setCurrentPage('media_detail');
                        }}
                        className="group text-left cursor-pointer block lum-press"
                      >
                        <div className="relative aspect-[16/10] w-full rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                          <img
                            src={item.thumbnailUrl || item.url}
                            alt={itemTitle}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                          />
                          {item.mediaType === 'video' && (
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                              <span className="w-11 h-11 rounded-full bg-black/65 border border-white/30 flex items-center justify-center text-white">
                                <Play className="w-4 h-4 ml-0.5 fill-current" strokeWidth={1.6} />
                              </span>
                            </div>
                          )}
                          {item.duration && (
                            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-mono text-white">
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <div className="pt-2.5 space-y-0.5">
                          <p className="text-sm font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                            {itemTitle}
                          </p>
                          <p className="text-xs text-[#9A9A9A] truncate">
                            {item.tag || (isEn ? 'Backstage' : 'Coulisses')} · {item.date}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ONGLET D : PARTICIPANTS (STRICTEMENT LIÉS À CE CONCERT + NOTE MODÉRATION) */}
            {albumTab === 'participants' && (
              <section className="space-y-5">
                <p className="text-xs text-[#9A9A9A] rounded-[14px] bg-[#0E0E0E] border border-white/[0.1] px-4 py-2.5">
                  {isEn
                    ? 'Attendee photos and clips are published after moderation.'
                    : 'Les photos des participants sont publiées après modération.'}
                </p>

                {albumSharedItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    {albumSharedItems.map((item) => {
                      const ext = item.mediaType === 'video' ? 'mp4' : 'jpg';
                      const filename = `lumareel-souvenir-${item.id}.${ext}`;
                      const canRemove =
                        canShareAndDownload &&
                        (!currentUser?.name || item.authorName === currentUser.name);

                      return (
                        <article key={item.id} className="space-y-2">
                          <div className="aspect-square rounded-[14px] bg-[#0E0E0E] border border-white/[0.12] overflow-hidden">
                            {item.mediaType === 'video' ? (
                              <video
                                src={item.mediaUrl}
                                controls
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <img
                                src={item.mediaUrl}
                                alt={item.caption || selectedAlbum.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover cursor-pointer hover:scale-[1.03] transition-transform duration-500"
                                onClick={() =>
                                  setLightboxPhoto({
                                    url: item.mediaUrl,
                                    caption: item.caption || item.authorName,
                                    filename,
                                  })
                                }
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[#9A9A9A]">
                            <span className="truncate">{item.authorName}</span>
                            {canShareAndDownload && (
                              <div className="flex items-center gap-2.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleShareItem({
                                      title: item.caption || selectedAlbum.title,
                                      assetUrl: item.mediaUrl,
                                      filename,
                                    })
                                  }
                                  className="hover:text-white cursor-pointer"
                                  aria-label={isEn ? 'Share' : 'Partager'}
                                >
                                  <Share2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownload(item.mediaUrl, filename)}
                                  className="hover:text-white cursor-pointer"
                                  aria-label={isEn ? 'Download' : 'Télécharger'}
                                >
                                  <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                                </button>
                                {canRemove && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMemory(item.id)}
                                    className="text-[#9A9A9A] hover:text-white cursor-pointer"
                                    aria-label={isEn ? 'Delete' : 'Supprimer'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center space-y-3 rounded-[20px] border border-white/[0.12] bg-[#0E0E0E] p-6">
                    <p className="text-xs sm:text-sm text-[#9A9A9A]">
                      {isEn
                        ? 'No attendee memories shared for this concert yet.'
                        : 'Aucun souvenir de participant partagé pour ce concert pour le moment.'}
                    </p>
                    {canShareAndDownload && (
                      <button
                        type="button"
                        onClick={() => setIsAddSheetOpen(true)}
                        className="min-h-[42px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs cursor-pointer lum-press"
                      >
                        {isEn ? 'Share the first memory' : 'Partager le premier souvenir'}
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* BARRE FLOTTANTE MODE SÉLECTIONNER (remplace la barre de navigation en bas) */}
        {isSelectingPhotos && canShareAndDownload && (
          <div
            className="fixed left-4 right-4 z-[85] max-w-md mx-auto rounded-[20px] bg-[#0E0E0E] border border-white/[0.16] px-4 py-3 flex items-center justify-between gap-3 shadow-2xl"
            style={{ bottom: 'max(24px, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="min-w-0">
              <p className="font-agrandir-extrabold text-xs sm:text-sm text-white truncate tabular-nums">
                {selectedPhotoUrls.length}{' '}
                {isEn
                  ? selectedPhotoUrls.length > 1
                    ? 'selected'
                    : 'selected'
                  : selectedPhotoUrls.length > 1
                  ? 'sélectionnées'
                  : 'sélectionnée'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSelectingPhotos(false);
                  setSelectedPhotoUrls([]);
                }}
                className="text-[11px] text-[#9A9A9A] hover:text-white cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Annuler'}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={selectedPhotoUrls.length === 0}
                onClick={handleShareSelected}
                className="min-h-[40px] px-4 rounded-full border border-white/25 hover:border-white text-white text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              >
                <Share2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{isEn ? 'Share' : 'Partager'}</span>
              </button>
              <button
                type="button"
                disabled={selectedPhotoUrls.length === 0}
                onClick={() => handleBatchDownload()}
                className="min-h-[40px] px-4 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40 lum-press"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>{isEn ? 'Download' : 'Télécharger'}</span>
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM SHEET TÉLÉCHARGEMENT — 4 CHOIX (MAQUETTE 07) */}
        <BottomSheet
          open={isDownloadSheetOpen}
          onClose={() => setIsDownloadSheetOpen(false)}
          kicker={selectedAlbum.artist || selectedAlbum.title}
          title={isEn ? 'Download memories' : 'Télécharger vos souvenirs'}
        >
          <div className="divide-y divide-white/[0.12] border-y border-white/[0.12]">
            <button
              type="button"
              onClick={() => handleBatchDownload()}
              className="w-full py-4 flex items-center justify-between gap-4 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <ImageIcon className="w-5 h-5 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors">
                    {isEn ? 'HD Photo Pack (ZIP)' : 'Pack photos HD (ZIP)'}
                  </p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    {albumOfficialPhotos.length} {isEn ? 'official captures' : 'clichés officiels'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0" strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDownloadSheetOpen(false);
                setIsVideoPlaying(true);
                showToast(
                  isEn
                    ? 'Official aftermovie ready for playback.'
                    : "Aftermovie officiel ouvert en lecture HD.",
                  'info'
                );
              }}
              className="w-full py-4 flex items-center justify-between gap-4 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Film className="w-5 h-5 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors">
                    Aftermovie (MP4)
                  </p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    {isEn ? 'Full HD official concert film' : 'Film officiel Full HD du concert'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0" strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() =>
                handleBatchDownload(albumOfficialPhotos.slice(0, 3).map((p) => p.url))
              }
              className="w-full py-4 flex items-center justify-between gap-4 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Smartphone className="w-5 h-5 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors">
                    {isEn ? 'Vertical story clips' : 'Clips verticaux'}
                  </p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    {isEn ? 'Ready for Instagram & TikTok stories' : 'Format 9:16 prêt pour vos stories'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0" strokeWidth={1.6} />
            </button>

            <button
              type="button"
              onClick={() => {
                const ok = downloadCollectorTicketPng(
                  selectedAlbum,
                  currentUser?.name || 'Membre LUMARÉEL'
                );
                setIsDownloadSheetOpen(false);
                showToast(
                  ok
                    ? isEn
                      ? 'Collector souvenir ticket downloaded.'
                      : 'Billet souvenir collector téléchargé.'
                    : isEn
                    ? 'Unable to generate ticket.'
                    : 'Impossible de générer le billet.',
                  ok ? 'success' : 'error'
                );
              }}
              className="w-full py-4 flex items-center justify-between gap-4 text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <Ticket className="w-5 h-5 text-[#D4AF6A] shrink-0" strokeWidth={1.6} />
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-sm text-white group-hover:text-[#D4AF6A] transition-colors">
                    {isEn ? 'Collector souvenir ticket' : 'Billet souvenir collector'}
                  </p>
                  <p className="text-xs text-[#9A9A9A] mt-0.5">
                    {isEn ? 'Personalized PNG keepsake' : 'Visuel souvenir personnalisé PNG'}
                  </p>
                </div>
              </div>
              <Download className="w-4 h-4 text-[#9A9A9A] group-hover:text-white shrink-0" strokeWidth={1.6} />
            </button>
          </div>
        </BottomSheet>

        {/* Lightbox plein écran avec navigation Précédent / Suivant */}
        {lightboxPhoto && (
          <div
            className="fixed inset-0 z-[95] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setLightboxPhoto(null)}
          >
            <div className="max-w-4xl w-full space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm text-[#C8C8C8] truncate">
                  {lightboxPhoto.caption}
                </span>
                <div className="flex items-center gap-2">
                  {canShareAndDownload && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          handleShareItem({
                            title: lightboxPhoto.caption || selectedAlbum.title,
                            assetUrl: lightboxPhoto.url,
                            filename: lightboxPhoto.filename,
                          })
                        }
                        className="min-h-[38px] px-4 rounded-full border border-white/25 hover:border-white text-white text-xs font-agrandir-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{isEn ? 'Share' : 'Partager'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownload(lightboxPhoto.url, lightboxPhoto.filename)
                        }
                        className="min-h-[38px] px-4 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                        <span>{isEn ? 'Download' : 'Télécharger'}</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(null)}
                    aria-label={isEn ? 'Close' : 'Fermer'}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" strokeWidth={1.6} />
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                {activeLightboxGallery.length > 1 && (
                  <button
                    type="button"
                    onClick={() => navigateLightbox('prev')}
                    aria-label={isEn ? 'Previous photo' : 'Photo précédente'}
                    className="absolute left-2 sm:left-3 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" strokeWidth={1.6} />
                  </button>
                )}

                <img
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.caption}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[76vh] rounded-[18px] object-contain"
                />

                {activeLightboxGallery.length > 1 && (
                  <button
                    type="button"
                    onClick={() => navigateLightbox('next')}
                    aria-label={isEn ? 'Next photo' : 'Photo suivante'}
                    className="absolute right-2 sm:right-3 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" strokeWidth={1.6} />
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
  // VUE INDEX MEMORIES — CENTRALISATION COMPLÈTE (CONCERTS · COULISSES · PHOTOS · VIDÉOS)
  // =========================================================================
  const allVideoItems = allHubMedia.filter((m) => m.mediaType === 'video');
  const filterTabs: Array<{ id: MemoriesFilter; label: string }> = [
    { id: 'all', label: isEn ? 'All' : 'Tout' },
    { id: 'concerts', label: 'Concerts' },
    { id: 'coulisses', label: isEn ? 'Backstage' : 'Coulisses' },
    { id: 'photos', label: 'Photos' },
    { id: 'videos', label: isEn ? 'Videos' : 'Vidéos' },
  ];

  return (
    <div
      className={
        embedded
          ? 'w-full text-white font-agrandir-regular'
          : 'min-h-screen w-full max-w-[1280px] mx-auto px-4 sm:px-8 md:px-10 pb-24 text-white font-agrandir-regular'
      }
      style={embedded ? undefined : { paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {!embedded && (
        <div className="mb-6 space-y-4">
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
              {isEn ? 'CONCERTS · BACKSTAGE · ARCHIVES' : 'CONCERTS · COULISSES · SOUVENIRS'}
            </p>
            <h1 className="text-[2.25rem] sm:text-5xl font-agrandir-extrabold tracking-tight leading-none text-white">
              Memories
            </h1>
          </header>

          {/* Filtres internes : Tout · Concerts · Coulisses · Photos · Vidéos */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
            {filterTabs.map((tab) => {
              const active = indexFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setIndexFilter(tab.id)}
                  className={`min-h-[36px] px-4 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'border border-white/20 text-[#C8C8C8] hover:border-white/50 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-12">
        {/* 1. CONCERTS & ARCHIVES ÉVÉNEMENTS */}
        {(indexFilter === 'all' || indexFilter === 'concerts') && (
          <section className="space-y-4">
            {indexFilter === 'all' && (
              <h2 className="text-lg sm:text-xl font-agrandir-extrabold text-white">
                {isEn ? 'Concerts & events' : 'Concerts & événements'}
              </h2>
            )}

            {albums.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
                {albums.map((album) => (
                  <button
                    key={album.id}
                    type="button"
                    onClick={() => {
                      setSelectedAlbumId(album.id);
                      setAlbumTab('official');
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="group text-left cursor-pointer block lum-press"
                  >
                    <div className="relative aspect-[3/4] sm:aspect-[16/10] w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                      <img
                        src={album.coverImage}
                        alt={album.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/75 border border-white/[0.14] text-[10px] font-agrandir-semibold text-white">
                        {album.officialPhotos.length} photos · Aftermovie
                      </span>
                    </div>
                    <div className="pt-3 space-y-0.5">
                      <h3 className="text-base font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                        {album.artist || album.title}
                      </h3>
                      <p className="text-xs text-[#9A9A9A] truncate">
                        {album.date} · {album.venue}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-14 px-6 text-center rounded-[20px] bg-[#0E0E0E] border border-white/[0.12] max-w-md mx-auto">
                <Camera className="mx-auto mb-3 h-7 w-7 text-[#D4AF6A]" strokeWidth={1.6} />
                <p className="text-sm font-agrandir-extrabold text-white">
                  {isEn ? 'Concert memories coming soon' : 'Souvenirs de concerts à venir'}
                </p>
              </div>
            )}
          </section>
        )}

        {/* 2. COULISSES (EX-BACKSTAGE CENTRALISÉ DANS MEMORIES) */}
        {(indexFilter === 'all' || indexFilter === 'coulisses') && (
          <section className={indexFilter === 'all' ? 'pt-8 border-t border-white/[0.12] space-y-4' : 'space-y-4'}>
            {indexFilter === 'all' && (
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-agrandir-extrabold text-white">
                  {isEn ? 'Backstage & behind the scenes' : 'Coulisses'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIndexFilter('coulisses')}
                  className="text-xs text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
                >
                  {isEn ? 'See all' : 'Tout voir'}
                </button>
              </div>
            )}

            {publishedBackstageMedia.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {publishedBackstageMedia.map((item) => {
                  const title = isEn && item.titleEn ? item.titleEn : item.title;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedMediaId(item.id);
                        setCurrentPage('media_detail');
                      }}
                      className="group text-left cursor-pointer block lum-press"
                    >
                      <div className="relative aspect-[16/10] w-full rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        {item.mediaType === 'video' && (
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <span className="w-11 h-11 rounded-full bg-black/65 border border-white/30 flex items-center justify-center text-white">
                              <Play className="w-4 h-4 ml-0.5 fill-current" strokeWidth={1.6} />
                            </span>
                          </div>
                        )}
                        {item.duration && (
                          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-mono text-white">
                            {item.duration}
                          </span>
                        )}
                      </div>
                      <div className="pt-2.5 space-y-0.5">
                        <h3 className="text-sm font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                          {title}
                        </h3>
                        <p className="text-xs text-[#9A9A9A] truncate">
                          {item.tag || (isEn ? 'Backstage' : 'Coulisses')} · {item.date}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-xs text-[#9A9A9A] rounded-[18px] bg-[#0E0E0E] border border-white/[0.12]">
                {isEn
                  ? 'No backstage content published yet.'
                  : 'Aucun contenu coulisses publié pour le moment.'}
              </p>
            )}
          </section>
        )}

        {/* 3. PHOTOS (GALERIE UNIFIÉE) */}
        {(indexFilter === 'all' || indexFilter === 'photos') && allIndexPhotos.length > 0 && (
          <section className={indexFilter === 'all' ? 'pt-8 border-t border-white/[0.12] space-y-4' : 'space-y-4'}>
            {indexFilter === 'all' && (
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg sm:text-xl font-agrandir-extrabold text-white">
                  {isEn ? 'Official photos' : 'Photos officielles'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIndexFilter('photos')}
                  className="text-xs text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
                >
                  {isEn ? 'See all' : 'Tout voir'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {(indexFilter === 'all' ? allIndexPhotos.slice(0, 8) : allIndexPhotos).map((photo, idx) => (
                <button
                  key={`${photo.url}_${idx}`}
                  type="button"
                  onClick={() => setLightboxPhoto(photo)}
                  className="group relative aspect-square rounded-[14px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] hover:border-white/30 cursor-pointer block"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 to-transparent text-left">
                    <p className="text-[11px] font-agrandir-semibold text-white truncate">
                      {photo.albumLabel}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 4. VIDÉOS (AFTERMOVIES + VIDÉOS COULISSES) */}
        {indexFilter === 'videos' && (
          <section className="space-y-5">
            {albums.length > 0 || allVideoItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {albums.map((album) => (
                  <button
                    key={`vid_album_${album.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedAlbumId(album.id);
                      setAlbumTab('official');
                      setIsVideoPlaying(true);
                      if (typeof window !== 'undefined') {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
                    className="group text-left cursor-pointer block lum-press"
                  >
                    <div className="relative aspect-[16/9] w-full rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                      <img
                        src={album.coverImage}
                        alt={album.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <span className="w-12 h-12 rounded-full bg-black/65 border border-white/30 flex items-center justify-center text-white">
                          <Play className="w-5 h-5 ml-0.5 fill-current" strokeWidth={1.6} />
                        </span>
                      </div>
                      <span className="absolute bottom-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/80 text-[10px] font-agrandir-semibold text-[#D4AF6A]">
                        Aftermovie
                      </span>
                    </div>
                    <div className="pt-2.5 space-y-0.5">
                      <h3 className="text-sm font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                        {album.artist || album.title}
                      </h3>
                      <p className="text-xs text-[#9A9A9A] truncate">
                        {album.date} · {album.venue}
                      </p>
                    </div>
                  </button>
                ))}

                {allVideoItems.map((item) => {
                  const title = isEn && item.titleEn ? item.titleEn : item.title;
                  return (
                    <button
                      key={`vid_hub_${item.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedMediaId(item.id);
                        setCurrentPage('media_detail');
                      }}
                      className="group text-left cursor-pointer block lum-press"
                    >
                      <div className="relative aspect-[16/9] w-full rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/30 transition-colors">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={title}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <span className="w-12 h-12 rounded-full bg-black/65 border border-white/30 flex items-center justify-center text-white">
                            <Play className="w-5 h-5 ml-0.5 fill-current" strokeWidth={1.6} />
                          </span>
                        </div>
                        {item.duration && (
                          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/80 text-[10px] font-mono text-white">
                            {item.duration}
                          </span>
                        )}
                      </div>
                      <div className="pt-2.5 space-y-0.5">
                        <h3 className="text-sm font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                          {title}
                        </h3>
                        <p className="text-xs text-[#9A9A9A] truncate">
                          {item.tag || (isEn ? 'Backstage' : 'Coulisses')} · {item.date}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-10 text-center text-xs text-[#9A9A9A] rounded-[18px] bg-[#0E0E0E] border border-white/[0.12]">
                {isEn ? 'No videos published yet.' : 'Aucune vidéo publiée pour le moment.'}
              </p>
            )}
          </section>
        )}
      </div>

      {/* Lightbox plein écran sur l'index Photos */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[95] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="max-w-4xl w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs sm:text-sm text-[#C8C8C8] truncate">
                {lightboxPhoto.caption}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleShareItem({
                      title: lightboxPhoto.caption || 'LUMARÉEL Memories',
                      assetUrl: lightboxPhoto.url,
                      filename: lightboxPhoto.filename,
                    })
                  }
                  className="min-h-[38px] px-4 rounded-full border border-white/25 hover:border-white text-white text-xs font-agrandir-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>{isEn ? 'Share' : 'Partager'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLightboxPhoto(null)}
                  aria-label={isEn ? 'Close' : 'Fermer'}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>
            </div>

            <div className="relative flex items-center justify-center">
              {activeLightboxGallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => navigateLightbox('prev')}
                  aria-label={isEn ? 'Previous photo' : 'Photo précédente'}
                  className="absolute left-2 sm:left-3 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" strokeWidth={1.6} />
                </button>
              )}

              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption}
                referrerPolicy="no-referrer"
                className="w-full max-h-[76vh] rounded-[18px] object-contain"
              />

              {activeLightboxGallery.length > 1 && (
                <button
                  type="button"
                  onClick={() => navigateLightbox('next')}
                  aria-label={isEn ? 'Next photo' : 'Photo suivante'}
                  className="absolute right-2 sm:right-3 z-10 w-10 h-10 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-5 h-5" strokeWidth={1.6} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
