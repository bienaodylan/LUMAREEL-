import React, { useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ConcertMemoryAlbum,
  SharedConcertMemory,
  buildConcertMemoryAlbums,
  loadSharedMemories,
  markChallengeCompleted,
  saveSharedMemory,
} from '../utils/communityStorage';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Download,
  Film,
  Image as ImageIcon,
  MapPin,
  Play,
  Share2,
  Upload,
  X,
} from 'lucide-react';

export const ConcertMemoriesView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const { archives, currentUser, showToast, language } = useApp();
  const isEn = language === 'en';

  const albums = useMemo(() => buildConcertMemoryAlbums(archives), [archives]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null);
  const [sharedMemories, setSharedMemories] = useState<SharedConcertMemory[]>(() => loadSharedMemories());
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; caption: string } | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  // Formulaire de partage photo/vidéo par les participants
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadMediaType, setUploadMediaType] = useState<'photo' | 'video'>('photo');
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedAlbum: ConcertMemoryAlbum | null = useMemo(
    () => albums.find((a) => a.id === selectedAlbumId) || null,
    [albums, selectedAlbumId]
  );

  const albumSharedItems = useMemo(() => {
    if (!selectedAlbum) return [];
    const exact = sharedMemories.filter((m) => m.eventId === selectedAlbum.id);
    if (exact.length > 0) return exact;
    return sharedMemories.filter((m) => m.eventId === 'memory_abidjan_night');
  }, [selectedAlbum, sharedMemories]);

  const handleDownloadAsset = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
      showToast(isEn ? 'Memory downloaded to your device.' : 'Souvenir téléchargé sur votre appareil.', 'success');
    } catch {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(isEn ? 'Download started.' : 'Téléchargement lancé.', 'success');
    }
  };

  const handleShareAlbum = async (album: ConcertMemoryAlbum) => {
    const shareText = isEn
      ? `Relive ${album.title} at ${album.venue} — official photos & recap on LUMARÉEL.`
      : `Revivez ${album.title} à ${album.venue} — photos officielles et récap sur LUMARÉEL.`;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: album.title, text: shareText, url: shareUrl });
        return;
      } catch {
        // fallback below
      }
    }
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      showToast(isEn ? 'Memory page link copied.' : 'Lien de la page souvenir copié.', 'success');
    } catch {
      showToast(shareText, 'info');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/');
    setUploadMediaType(isVideo ? 'video' : 'photo');

    if (isVideo) {
      const objectUrl = URL.createObjectURL(file);
      setUploadPreviewUrl(objectUrl);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadPreviewUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePublishMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlbum) return;
    if (!uploadPreviewUrl) {
      showToast(isEn ? 'Select a photo or video to share.' : 'Choisissez une photo ou une vidéo à partager.', 'error');
      return;
    }

    setIsUploading(true);
    try {
      const entry: SharedConcertMemory = {
        id: `mem_${Date.now()}`,
        eventId: selectedAlbum.id,
        authorName: currentUser?.name || (isEn ? 'Concert Guest' : 'Participant'),
        mediaType: uploadMediaType,
        mediaUrl: uploadPreviewUrl,
        caption:
          uploadCaption.trim() ||
          (isEn ? `Live moment at ${selectedAlbum.title}` : `Instant live à ${selectedAlbum.title}`),
        createdAt: new Date().toISOString(),
      };
      const updated = saveSharedMemory(entry);
      setSharedMemories(updated);
      setUploadCaption('');
      setUploadPreviewUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      const challengeUnlocked = markChallengeCompleted(currentUser, 'challenge_memory');
      showToast(
        challengeUnlocked
          ? (isEn ? 'Memory shared! +100 challenge points added.' : 'Souvenir partagé ! +100 points défi ajoutés.')
          : (isEn ? 'Your concert memory is now live on this event page.' : 'Votre souvenir est publié sur la page de l’événement.'),
        'success'
      );
    } finally {
      setIsUploading(false);
    }
  };

  // =========================================================================
  // PAGE DÉDIÉE À UN CONCERT SPÉCIFIQUE
  // =========================================================================
  if (selectedAlbum) {
    return (
      <div className={`w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 ${embedded ? "pt-0 pb-8" : "min-h-screen pt-4 sm:pt-10 pb-20"} text-white font-agrandir-regular`}>
        {/* Retour vers la liste des concerts */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setSelectedAlbumId(null);
              setIsVideoPlaying(false);
            }}
            className="min-h-[44px] inline-flex items-center gap-2 text-xs sm:text-sm font-agrandir-bold text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isEn ? 'Back to My Moments' : 'Retour à Mes Moments'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleShareAlbum(selectedAlbum)}
            className="min-h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-agrandir-bold text-white flex items-center gap-2 cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{isEn ? 'Share page' : 'Partager'}</span>
          </button>
        </div>

        {/* En-tête de l'événement */}
        <header className="mb-10 pb-6 border-b border-white/10 space-y-3">
          <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
            <span className="text-[#FFFFFF] font-agrandir-bold uppercase tracking-wider">
              {isEn ? 'Event Memory Page' : 'Page Souvenir Officielle'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{selectedAlbum.date}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#FFFFFF]" />
              {selectedAlbum.venue}, {selectedAlbum.city}
            </span>
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-[1.03] text-balance">
            {selectedAlbum.title}
          </h1>
          <p className="text-sm text-neutral-400">{selectedAlbum.artist}</p>
        </header>

        {/* 1. VIDÉO RÉCAPITULATIVE & MEILLEURS MOMENTS */}
        <section className="mb-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
                {isEn ? 'Official Recap Video' : 'Vidéo récapitulative'}
              </h2>
              <span className="text-xs font-mono text-neutral-400">{selectedAlbum.recapDuration}</span>
            </div>

            <div className="aspect-[16/9] w-full rounded-3xl overflow-hidden bg-black border border-white/15 relative">
              {isVideoPlaying ? (
                <iframe
                  src={`${selectedAlbum.recapEmbedUrl}${selectedAlbum.recapEmbedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                  title={selectedAlbum.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsVideoPlaying(true)}
                  className="w-full h-full relative group cursor-pointer block text-left"
                >
                  <img
                    src={selectedAlbum.coverImage}
                    alt={selectedAlbum.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/20 group-hover:bg-white text-white group-hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-colors">
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Meilleurs moments */}
          <div className="lg:col-span-5 rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 space-y-4">
            <h2 className="font-agrandir-extrabold text-lg text-white">
              {isEn ? 'Best moments' : 'Les meilleurs moments'}
            </h2>
            <div className="divide-y divide-white/8">
              {selectedAlbum.highlights.map((hl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setIsVideoPlaying(true)}
                  className="w-full py-3.5 text-left group cursor-pointer flex items-start gap-3"
                >
                  <span className="font-mono text-xs text-[#FFFFFF] pt-0.5 shrink-0 tabular-nums">
                    {hl.time}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-agrandir-bold text-white group-hover:text-[#FFFFFF] transition-colors">
                      {isEn ? hl.titleEn : hl.titleFr}
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
                      {isEn ? hl.descEn : hl.descFr}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. PHOTOGRAPHIES OFFICIELLES + TÉLÉCHARGEMENT */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-agrandir-extrabold text-xl text-white">
              {isEn ? 'Official Photographs' : 'Photographies officielles'}
            </h2>
            <span className="text-xs text-neutral-400 tabular-nums">
              {selectedAlbum.officialPhotos.length} {isEn ? 'photos' : 'photos'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {selectedAlbum.officialPhotos.map((photo, idx) => {
              const caption = isEn ? photo.captionEn : photo.captionFr;
              return (
                <figure
                  key={idx}
                  className="rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto({ url: photo.url, caption })}
                    className="aspect-[4/3] w-full overflow-hidden bg-black cursor-pointer group block"
                  >
                    <img
                      src={photo.url}
                      alt={caption}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                    />
                  </button>
                  <figcaption className="p-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-neutral-300 truncate">{caption}</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadAsset(
                          photo.url,
                          `lumareel-${selectedAlbum.id}-photo-${idx + 1}.jpg`
                        )
                      }
                      className="min-h-[38px] px-3 rounded-xl bg-white/10 hover:bg-white hover:text-black text-white text-xs font-agrandir-bold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Download' : 'Télécharger'}</span>
                    </button>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        {/* 3. PARTAGER VOS PHOTOS & VIDÉOS + MUR DES PARTICIPANTS */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <form
            onSubmit={handlePublishMemory}
            className="lg:col-span-5 rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 space-y-4"
          >
            <div>
              <h2 className="font-agrandir-extrabold text-lg text-white">
                {isEn ? 'Share your photos & videos' : 'Partager vos photos et vidéos'}
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                {isEn
                  ? 'Add your live shots to this concert’s wall and earn +100 challenge points.'
                  : 'Publiez vos plus beaux clichés ou vidéos du concert et gagnez +100 points défi.'}
              </p>
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
              className="w-full min-h-[120px] rounded-2xl border border-dashed border-white/20 hover:border-[#FFFFFF] bg-black/60 flex flex-col items-center justify-center gap-2 p-4 text-center transition-colors cursor-pointer"
            >
              {uploadPreviewUrl ? (
                uploadMediaType === 'video' ? (
                  <video src={uploadPreviewUrl} className="max-h-36 rounded-xl" controls />
                ) : (
                  <img src={uploadPreviewUrl} alt="Preview" className="max-h-36 rounded-xl object-contain" />
                )
              ) : (
                <>
                  <Upload className="w-5 h-5 text-[#FFFFFF]" />
                  <span className="text-xs font-agrandir-bold text-white">
                    {isEn ? 'Choose a photo or video' : 'Choisir une photo ou vidéo'}
                  </span>
                  <span className="text-[11px] text-neutral-500">JPG, PNG, MP4, MOV</span>
                </>
              )}
            </button>

            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                {isEn ? 'Caption' : 'Légende du moment'}
              </label>
              <input
                type="text"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder={isEn ? 'Best moment from the front row...' : 'Meilleur moment depuis la fosse...'}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-black border border-white/15 text-sm text-white focus:border-[#FFFFFF] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full min-h-[46px] rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
            >
              {isEn ? 'Publish my memory' : 'Publier mon souvenir'}
            </button>
          </form>

          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-agrandir-extrabold text-lg text-white">
                {isEn ? 'Shared by attendees' : 'Souvenirs partagés par le public'}
              </h2>
              <span className="text-xs text-neutral-400 tabular-nums">
                {albumSharedItems.length} {isEn ? 'uploads' : 'partages'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {albumSharedItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 flex flex-col"
                >
                  <div className="aspect-[4/3] bg-black overflow-hidden">
                    {item.mediaType === 'video' ? (
                      <video src={item.mediaUrl} controls className="w-full h-full object-cover" />
                    ) : (
                      <img
                        src={item.mediaUrl}
                        alt={item.caption}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxPhoto({ url: item.mediaUrl, caption: item.caption })}
                      />
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-neutral-200 leading-relaxed">{item.caption}</p>
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{item.authorName}</span>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadAsset(
                            item.mediaUrl,
                            `lumareel-souvenir-${item.id}.${item.mediaType === 'video' ? 'mp4' : 'jpg'}`
                          )
                        }
                        className="text-[#FFFFFF] hover:underline cursor-pointer"
                      >
                        {isEn ? 'Download' : 'Télécharger'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Lightbox plein écran */}
        {lightboxPhoto && (
          <div className="fixed inset-0 z-[85] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs sm:text-sm text-neutral-300 truncate">{lightboxPhoto.caption}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadAsset(lightboxPhoto.url, 'lumareel-souvenir.jpg')}
                    className="min-h-[40px] px-3.5 rounded-full bg-white text-black text-xs font-agrandir-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Download' : 'Télécharger'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(null)}
                    aria-label={isEn ? 'Close' : 'Fermer'}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption}
                referrerPolicy="no-referrer"
                className="w-full max-h-[76vh] object-contain rounded-2xl border border-white/10"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VUE INDEX : LISTE DES CONCERTS PASSÉS (PAGES SOUVENIRS)
  // =========================================================================
  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-20 text-white font-agrandir-regular">
      {!embedded && (
      <header className="mb-8 pb-6 border-b border-white/10">
        <p className="text-xs tracking-[0.2em] text-[#FFFFFF] uppercase mb-2">
          {isEn ? 'After the Show · Concert Memories' : 'Après le Concert · Souvenirs Officiels'}
        </p>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-[1.02] text-balance">
          {isEn ? 'My Moments' : 'Mes Moments'}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mt-3 max-w-2xl leading-relaxed">
          {isEn
            ? 'Relive every concert with its dedicated album: official photos, best moments, recap videos, one-tap downloads, and community sharing.'
            : 'Revivez chaque concert avec sa page dédiée : photographies officielles, meilleurs moments, vidéos récapitulatives, téléchargement et partage entre participants.'}
        </p>
      </header>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {albums.map((album) => (
          <article
            key={album.id}
            onClick={() => setSelectedAlbumId(album.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedAlbumId(album.id); } }}
            className="group rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 hover:border-white/30 transition-colors cursor-pointer flex flex-col"
          >
            <div className="aspect-[16/10] relative bg-black overflow-hidden">
              <img
                src={album.coverImage}
                alt={album.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white">
                <span className="inline-flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  {album.officialPhotos.length} {isEn ? 'photos' : 'photos'}
                </span>
                <span className="inline-flex items-center gap-1 font-mono">
                  <Film className="w-3.5 h-3.5 text-[#FFFFFF]" />
                  {album.recapDuration}
                </span>
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
              <div className="space-y-1.5">
                <div className="text-xs text-neutral-400">
                  <span>{album.date}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{album.venue}</span>
                </div>
                <h2 className="font-agrandir-extrabold text-lg text-white leading-snug">
                  {album.title}
                </h2>
                <p className="text-xs text-neutral-400">{album.artist}</p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-agrandir-bold text-white group-hover:text-[#FFFFFF] transition-colors">
                <span className="inline-flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  {isEn ? 'Open memory page' : 'Ouvrir la page souvenir'}
                </span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
