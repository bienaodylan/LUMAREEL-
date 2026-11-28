import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FolderPlus,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiFetchJson, getAuthHeaders } from '../lib/apiClient';

interface SouvenirPhoto {
  id: string;
  photoKey: string;
  photoUrl: string;
  title: string;
  caption: string;
  artist: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  albumId: string;
  aspectRatio: number;
  downloadable: boolean;
  tags: string[];
  createdAt: string;
}

interface SouvenirCollection {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverUrl: string;
  isEditorial: boolean;
  photoKeys: string[];
  createdAt: string;
  updatedAt: string;
}

type DiscoveryTab = 'all' | 'concerts' | 'artists' | 'collections' | 'mine';

export const ConcertMemoriesView: React.FC = () => {
  const { currentUser, setIsAuthModalOpen, language, showToast } = useApp();
  const isEn = language === 'en';

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<SouvenirPhoto[]>([]);
  const [editorialCollections, setEditorialCollections] = useState<SouvenirCollection[]>([]);
  const [personalCollections, setPersonalCollections] = useState<SouvenirCollection[]>([]);

  const [activeTab, setActiveTab] = useState<DiscoveryTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);

  // Immersive fullscreen lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  // Save-to-collection modal state
  const [savingPhoto, setSavingPhoto] = useState<SouvenirPhoto | null>(null);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [creatingCollection, setCreatingCollection] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/souvenirs/feed', { headers });
      const data = await res.json();
      if (res.ok && data?.success) {
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
        setEditorialCollections(
          Array.isArray(data.editorialCollections) ? data.editorialCollections : []
        );
        setPersonalCollections(
          Array.isArray(data.personalCollections) ? data.personalCollections : []
        );
      }
    } catch {
      // keep existing state on transient error
    } finally {
      setLoading(false);
    }
  }, [currentUser?.email]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  // Derived groupings for Concerts & Artists discovery views
  const concertsList = useMemo(() => {
    const map = new Map<
      string,
      { eventId: string; eventTitle: string; artist: string; eventDate: string; eventVenue: string; cover: string; count: number }
    >();
    for (const p of photos) {
      const prev = map.get(p.eventId);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(p.eventId, {
          eventId: p.eventId,
          eventTitle: p.eventTitle,
          artist: p.artist,
          eventDate: p.eventDate,
          eventVenue: p.eventVenue,
          cover: p.photoUrl,
          count: 1,
        });
      }
    }
    return Array.from(map.values());
  }, [photos]);

  const artistsList = useMemo(() => {
    const map = new Map<string, { artist: string; cover: string; count: number }>();
    for (const p of photos) {
      const prev = map.get(p.artist);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(p.artist, { artist: p.artist, cover: p.photoUrl, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [photos]);

  const savedPhotoKeys = useMemo(() => {
    const set = new Set<string>();
    personalCollections.forEach((c) => c.photoKeys.forEach((k) => set.add(k)));
    return set;
  }, [personalCollections]);

  const activeCollection = useMemo(() => {
    if (!selectedCollectionId) return null;
    return (
      editorialCollections.find((c) => c.id === selectedCollectionId) ||
      personalCollections.find((c) => c.id === selectedCollectionId) ||
      null
    );
  }, [selectedCollectionId, editorialCollections, personalCollections]);

  const visiblePhotos = useMemo(() => {
    let list = photos;

    if (activeCollection) {
      const keySet = new Set(activeCollection.photoKeys);
      list = list.filter((p) => keySet.has(p.photoKey));
    } else if (selectedConcertId) {
      list = list.filter((p) => p.eventId === selectedConcertId);
    } else if (selectedArtist) {
      list = list.filter((p) => p.artist === selectedArtist);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.title, p.caption, p.artist, p.eventTitle, p.eventVenue, ...(p.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [photos, activeCollection, selectedConcertId, selectedArtist, searchQuery]);

  const activeLightboxPhoto =
    lightboxIndex !== null && visiblePhotos[lightboxIndex] ? visiblePhotos[lightboxIndex] : null;

  const sameConcertPhotos = useMemo(() => {
    if (!activeLightboxPhoto) return [];
    return photos.filter(
      (p) => p.eventId === activeLightboxPhoto.eventId && p.id !== activeLightboxPhoto.id
    );
  }, [activeLightboxPhoto, photos]);

  const linkedEditorialCollection = useMemo(() => {
    if (!activeLightboxPhoto) return null;
    return (
      editorialCollections.find((c) => c.photoKeys.includes(activeLightboxPhoto.photoKey)) || null
    );
  }, [activeLightboxPhoto, editorialCollections]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxIndex(null);
      else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) =>
          prev === null ? null : (prev + 1) % Math.max(visiblePhotos.length, 1)
        );
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) =>
          prev === null
            ? null
            : (prev - 1 + Math.max(visiblePhotos.length, 1)) % Math.max(visiblePhotos.length, 1)
        );
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightboxIndex, visiblePhotos.length]);

  const resetFilters = (tab: DiscoveryTab) => {
    setActiveTab(tab);
    setSelectedConcertId(null);
    setSelectedArtist(null);
    setSelectedCollectionId(null);
  };

  const openSaveDrawer = (e: React.MouseEvent, photo: SouvenirPhoto) => {
    e.stopPropagation();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn
          ? 'Sign in to save souvenirs into your personal collections.'
          : 'Connecte-toi pour enregistrer ce souvenir dans tes collections.',
        'info'
      );
      return;
    }
    setSavingPhoto(photo);
  };

  const handleTogglePhotoInCollection = async (collectionId: string, photoKey: string) => {
    try {
      const data = await apiFetchJson<{
        collection: SouvenirCollection;
        saved: boolean;
      }>(`/api/member/collections/${encodeURIComponent(collectionId)}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ photoKey }),
      });
      setPersonalCollections((prev) =>
        prev.map((c) => (c.id === collectionId ? data.collection : c))
      );
      showToast(
        data.saved
          ? isEn
            ? 'Saved to collection'
            : 'Enregistré dans ta collection'
          : isEn
            ? 'Removed from collection'
            : 'Retiré de la collection',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Erreur lors de la sauvegarde.', 'error');
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionTitle.trim()) return;
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCreatingCollection(true);
    try {
      const data = await apiFetchJson<{ collection: SouvenirCollection }>(
        '/api/member/collections',
        {
          method: 'POST',
          body: JSON.stringify({
            title: newCollectionTitle.trim(),
            initialPhotoKey: savingPhoto?.photoKey,
          }),
        }
      );
      setPersonalCollections((prev) => [data.collection, ...prev]);
      setNewCollectionTitle('');
      showToast(
        isEn ? 'Collection created!' : 'Collection créée !',
        'success'
      );
    } catch (err: any) {
      showToast(err?.message || 'Impossible de créer cette collection.', 'error');
    } finally {
      setCreatingCollection(false);
    }
  };

  const handleDeletePersonalCollection = async (collectionId: string) => {
    try {
      await apiFetchJson(`/api/member/collections/${encodeURIComponent(collectionId)}`, {
        method: 'DELETE',
      });
      setPersonalCollections((prev) => prev.filter((c) => c.id !== collectionId));
      if (selectedCollectionId === collectionId) setSelectedCollectionId(null);
      showToast(isEn ? 'Collection removed.' : 'Collection supprimée.', 'info');
    } catch (err: any) {
      showToast(err?.message || 'Erreur de suppression.', 'error');
    }
  };

  const handleDownloadPhoto = (photo: SouvenirPhoto) => {
    const a = document.createElement('a');
    a.href = photo.photoUrl;
    a.download = `lumareel-${photo.artist.toLowerCase().replace(/\s+/g, '-')}-${photo.id}.jpg`;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSharePhoto = async (photo: SouvenirPhoto) => {
    const shareUrl = `${window.location.origin}/?page=memories&photo=${encodeURIComponent(photo.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${photo.title} — LUMARÉEL`,
          text: `${photo.artist} · ${photo.eventTitle}`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast(isEn ? 'Link copied!' : 'Lien du souvenir copié !', 'success');
      }
    } catch {
      // user cancelled share
    }
  };

  const showGridDirectly =
    activeTab === 'all' ||
    Boolean(selectedConcertId) ||
    Boolean(selectedArtist) ||
    Boolean(selectedCollectionId);

  const tabs: { id: DiscoveryTab; label: string }[] = [
    { id: 'all', label: isEn ? 'All' : 'Tout' },
    { id: 'concerts', label: 'Concerts' },
    { id: 'artists', label: isEn ? 'Artists' : 'Artistes' },
    { id: 'collections', label: 'Collections' },
    { id: 'mine', label: isEn ? 'My collections' : 'Mes collections' },
  ];

  return (
    <div className="min-h-screen w-full bg-[#FBFBFD] text-[#111111] dark:bg-[#050505] dark:text-white pt-6 sm:pt-8 pb-28 sm:pb-20 px-3 sm:px-6 lg:px-10 font-agrandir-regular transition-colors duration-200">
      <div className="max-w-[1440px] mx-auto space-y-5">
        {/* Barre de découverte légère, centrée sur l'image */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 md:pb-0">
            {tabs.map((tab) => {
              const active = activeTab === tab.id && !selectedConcertId && !selectedArtist && !selectedCollectionId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => resetFilters(tab.id)}
                  className={`shrink-0 min-h-[38px] px-4 rounded-full text-xs sm:text-[13px] transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                      : 'text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white font-agrandir-semibold hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <label className="relative flex items-center w-full md:w-72">
            <Search className="pointer-events-none absolute left-3.5 w-4 h-4 text-black/40 dark:text-white/40" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value && activeTab !== 'all') setActiveTab('all');
              }}
              placeholder={isEn ? 'Search artist, concert...' : 'Artiste, concert, lieu...'}
              className="w-full h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.07] pl-10 pr-9 text-xs sm:text-sm outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/25 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 w-6 h-6 rounded-full flex items-center justify-center text-black/50 dark:text-white/60 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </label>
        </div>

        {/* Fil d'Ariane discret lorsqu'on explore un concert, un artiste ou une collection */}
        {(selectedConcertId || selectedArtist || activeCollection) && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedConcertId(null);
                  setSelectedArtist(null);
                  setSelectedCollectionId(null);
                }}
                className="w-9 h-9 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center shrink-0 hover:bg-black/[0.1] dark:hover:bg-white/[0.14] transition cursor-pointer"
                aria-label={isEn ? 'Back' : 'Retour'}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h1 className="font-agrandir-extrabold text-lg sm:text-xl truncate">
                  {activeCollection?.title ||
                    selectedArtist ||
                    concertsList.find((c) => c.eventId === selectedConcertId)?.eventTitle}
                </h1>
                {activeCollection?.description && (
                  <p className="text-xs text-black/55 dark:text-white/55 truncate">
                    {activeCollection.description}
                  </p>
                )}
              </div>
            </div>
            <span className="text-xs text-black/45 dark:text-white/45 shrink-0 tabular-nums">
              {visiblePhotos.length} {visiblePhotos.length > 1 ? 'photos' : 'photo'}
            </span>
          </div>
        )}

        {/* ÉTAT CHARGEMENT */}
        {loading ? (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4 space-y-3 sm:space-y-4">
            {[260, 340, 210, 320, 280, 230, 350, 250].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}px` }}
                className="break-inside-avoid rounded-2xl bg-black/[0.06] dark:bg-white/[0.06] animate-pulse"
              />
            ))}
          </div>
        ) : showGridDirectly ? (
          /* GRILLE MASONRY INSPIRÉE DE PINTEREST — L'IMAGE AVANT TOUT */
          visiblePhotos.length > 0 ? (
            <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 sm:gap-4">
              {visiblePhotos.map((photo, idx) => {
                const isSaved = savedPhotoKeys.has(photo.photoKey);
                return (
                  <figure
                    key={photo.id}
                    onClick={() => setLightboxIndex(idx)}
                    className="group relative mb-3 sm:mb-4 break-inside-avoid overflow-hidden rounded-2xl bg-black/[0.06] dark:bg-white/[0.05] cursor-zoom-in"
                  >
                    <img
                      src={photo.photoUrl}
                      alt={photo.title}
                      loading="lazy"
                      className="w-full h-auto block object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />

                    {/* Overlay discret au survol uniquement — zéro texte permanent qui pollue la photo */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

                    {/* Bouton Enregistrer discret */}
                    <button
                      type="button"
                      onClick={(e) => openSaveDrawer(e, photo)}
                      aria-label={isEn ? 'Save souvenir' : 'Enregistrer ce souvenir'}
                      className={`absolute top-2.5 right-2.5 min-h-[34px] px-3 rounded-full text-[11px] font-agrandir-extrabold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                        isSaved
                          ? 'bg-white text-black shadow-lg opacity-100'
                          : 'bg-black/65 text-white backdrop-blur-md opacity-90 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-black/85'
                      }`}
                    >
                      <Bookmark
                        className="w-3.5 h-3.5"
                        fill={isSaved ? 'currentColor' : 'none'}
                        strokeWidth={2}
                      />
                      <span className="hidden sm:inline">
                        {isSaved ? (isEn ? 'Saved' : 'Enregistré') : isEn ? 'Save' : 'Enregistrer'}
                      </span>
                    </button>

                    {/* Légende minimale au survol */}
                    <figcaption className="pointer-events-none absolute inset-x-3 bottom-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <p className="text-xs font-agrandir-extrabold truncate">{photo.artist}</p>
                      <p className="text-[11px] text-white/75 truncate">{photo.title}</p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center space-y-2">
              <p className="text-sm font-agrandir-semibold text-black/60 dark:text-white/60">
                {isEn ? 'No memories match this filter yet.' : 'Aucun souvenir trouvé pour cette sélection.'}
              </p>
            </div>
          )
        ) : activeTab === 'concerts' ? (
          /* DÉCOUVERTE PAR CONCERTS */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {concertsList.map((concert) => (
              <button
                key={concert.eventId}
                type="button"
                onClick={() => setSelectedConcertId(concert.eventId)}
                className="group relative aspect-[4/5] sm:aspect-[4/3] overflow-hidden rounded-2xl text-left cursor-pointer"
              >
                <img
                  src={concert.cover}
                  alt={concert.eventTitle}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute inset-x-4 bottom-4 text-white">
                  <p className="text-[11px] text-white/70">{concert.artist} · {concert.count} photos</p>
                  <h2 className="mt-0.5 font-agrandir-extrabold text-base sm:text-lg leading-tight">
                    {concert.eventTitle}
                  </h2>
                  <p className="mt-1 text-[11px] text-white/65">{concert.eventVenue}</p>
                </div>
              </button>
            ))}
          </div>
        ) : activeTab === 'artists' ? (
          /* DÉCOUVERTE PAR ARTISTES */
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {artistsList.map((item) => (
              <button
                key={item.artist}
                type="button"
                onClick={() => setSelectedArtist(item.artist)}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl text-left cursor-pointer"
              >
                <img
                  src={item.cover}
                  alt={item.artist}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute inset-x-3.5 bottom-3.5 text-white">
                  <h2 className="font-agrandir-extrabold text-lg sm:text-xl leading-none">{item.artist}</h2>
                  <p className="mt-1 text-[11px] text-white/70">{item.count} souvenirs</p>
                </div>
              </button>
            ))}
          </div>
        ) : activeTab === 'collections' ? (
          /* COLLECTIONS ÉDITORIALES LUMARÉEL */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {editorialCollections.map((col) => {
              const thumbs = col.photoKeys
                .map((k) => photos.find((p) => p.photoKey === k)?.photoUrl)
                .filter(Boolean) as string[];
              const mainCover = col.coverUrl || thumbs[0] || '';
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedCollectionId(col.id)}
                  className="group text-left space-y-2.5 cursor-pointer"
                >
                  <div className="grid grid-cols-3 gap-1 h-56 sm:h-64 rounded-2xl overflow-hidden bg-black/[0.06] dark:bg-white/[0.06]">
                    <div className="col-span-2 h-full overflow-hidden">
                      {mainCover && (
                        <img
                          src={mainCover}
                          alt={col.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="grid grid-rows-2 gap-1 h-full">
                      <div className="overflow-hidden bg-black/10 dark:bg-white/10">
                        {thumbs[1] && (
                          <img src={thumbs[1]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="overflow-hidden bg-black/10 dark:bg-white/10">
                        {thumbs[2] && (
                          <img src={thumbs[2]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="px-0.5">
                    <h2 className="font-agrandir-extrabold text-base">{col.title}</h2>
                    <p className="text-xs text-black/55 dark:text-white/55 line-clamp-1">
                      {col.photoKeys.length} souvenirs · {col.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          /* MES COLLECTIONS PERSONNELLES */
          <div className="space-y-6">
            {!currentUser ? (
              <div className="py-20 text-center space-y-4">
                <p className="text-sm text-black/60 dark:text-white/60">
                  {isEn
                    ? 'Sign in to create your own personal Souvenirs collections.'
                    : 'Connecte-toi pour enregistrer tes souvenirs préférés et créer tes propres collections.'}
                </p>
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="min-h-[44px] px-6 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-xs font-agrandir-extrabold cursor-pointer"
                >
                  {isEn ? 'Sign in' : 'Se connecter'}
                </button>
              </div>
            ) : (
              <>
                <form
                  onSubmit={handleCreateCollection}
                  className="flex flex-col sm:flex-row gap-2.5 max-w-lg"
                >
                  <input
                    type="text"
                    value={newCollectionTitle}
                    onChange={(e) => setNewCollectionTitle(e.target.value)}
                    placeholder={
                      isEn ? 'New collection (e.g. Didi B 2026)...' : 'Nouvelle collection (ex. Concert Didi B)...'
                    }
                    className="flex-1 min-h-[44px] rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-4 text-sm outline-none"
                  />
                  <button
                    type="submit"
                    disabled={creatingCollection || !newCollectionTitle.trim()}
                    className="min-h-[44px] px-5 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-xs font-agrandir-extrabold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isEn ? 'Create' : 'Créer'}</span>
                  </button>
                </form>

                {personalCollections.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <FolderPlus className="w-7 h-7 mx-auto text-black/35 dark:text-white/35" />
                    <p className="text-sm text-black/55 dark:text-white/55">
                      {isEn
                        ? 'Save any concert photo to start your first collection.'
                        : 'Enregistre une photo depuis la galerie pour démarrer ta première collection.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {personalCollections.map((col) => {
                      const thumbs = col.photoKeys
                        .map((k) => photos.find((p) => p.photoKey === k)?.photoUrl)
                        .filter(Boolean) as string[];
                      return (
                        <div key={col.id} className="group space-y-2">
                          <div
                            onClick={() => setSelectedCollectionId(col.id)}
                            className="grid grid-cols-3 gap-1 h-52 rounded-2xl overflow-hidden bg-black/[0.06] dark:bg-white/[0.06] cursor-pointer"
                          >
                            <div className="col-span-2 h-full overflow-hidden">
                              {thumbs[0] ? (
                                <img
                                  src={thumbs[0]}
                                  alt={col.title}
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-black/35 dark:text-white/35">
                                  Vide
                                </div>
                              )}
                            </div>
                            <div className="grid grid-rows-2 gap-1 h-full">
                              <div className="overflow-hidden bg-black/5 dark:bg-white/5">
                                {thumbs[1] && (
                                  <img src={thumbs[1]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div className="overflow-hidden bg-black/5 dark:bg-white/5">
                                {thumbs[2] && (
                                  <img src={thumbs[2]} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between gap-2 px-0.5">
                            <button
                              type="button"
                              onClick={() => setSelectedCollectionId(col.id)}
                              className="text-left min-w-0 cursor-pointer"
                            >
                              <h3 className="font-agrandir-extrabold text-sm truncate">{col.title}</h3>
                              <p className="text-[11px] text-black/50 dark:text-white/50">
                                {col.photoKeys.length} {col.photoKeys.length > 1 ? 'souvenirs' : 'souvenir'}
                              </p>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeletePersonalCollection(col.id)}
                              aria-label={isEn ? 'Delete collection' : 'Supprimer la collection'}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-black/40 hover:text-red-500 dark:text-white/40 dark:hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* VIEWER PLEIN ÉCRAN IMMERSIF (LIGHTBOX + SWIPE + ACTIONS)            */}
      {/* =================================================================== */}
      {activeLightboxPhoto && lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl text-white flex flex-col overflow-y-auto"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
            touchStartX.current = null;
            if (Math.abs(dx) > 45) {
              setLightboxIndex((prev) => {
                if (prev === null) return null;
                return dx < 0
                  ? (prev + 1) % visiblePhotos.length
                  : (prev - 1 + visiblePhotos.length) % visiblePhotos.length;
              });
            }
          }}
        >
          {/* Top bar */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 to-transparent">
            <button
              type="button"
              onClick={() => setLightboxIndex(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              aria-label={isEn ? 'Close' : 'Fermer'}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => openSaveDrawer(e, activeLightboxPhoto)}
                className={`min-h-[40px] px-4 rounded-full text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition cursor-pointer ${
                  savedPhotoKeys.has(activeLightboxPhoto.photoKey)
                    ? 'bg-white text-black'
                    : 'bg-white/15 hover:bg-white/25 text-white'
                }`}
              >
                <Bookmark
                  className="w-3.5 h-3.5"
                  fill={savedPhotoKeys.has(activeLightboxPhoto.photoKey) ? 'currentColor' : 'none'}
                />
                <span>
                  {savedPhotoKeys.has(activeLightboxPhoto.photoKey)
                    ? isEn
                      ? 'Saved'
                      : 'Enregistré'
                    : isEn
                      ? 'Save'
                      : 'Enregistrer'}
                </span>
              </button>
              {activeLightboxPhoto.downloadable && (
                <button
                  type="button"
                  onClick={() => handleDownloadPhoto(activeLightboxPhoto)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                  aria-label={isEn ? 'Download' : 'Télécharger'}
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleSharePhoto(activeLightboxPhoto)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
                aria-label={isEn ? 'Share' : 'Partager'}
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center image + prev/next controls */}
          <div className="relative flex-1 flex items-center justify-center px-4 sm:px-14 py-2 min-h-[55vh]">
            {visiblePhotos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === null
                      ? null
                      : (prev - 1 + visiblePhotos.length) % visiblePhotos.length
                  )
                }
                className="hidden sm:flex absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition cursor-pointer"
                aria-label={isEn ? 'Previous' : 'Précédente'}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            <img
              src={activeLightboxPhoto.photoUrl}
              alt={activeLightboxPhoto.title}
              className="max-h-[72vh] max-w-full w-auto rounded-2xl object-contain shadow-2xl"
            />

            {visiblePhotos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev === null ? null : (prev + 1) % visiblePhotos.length
                  )
                }
                className="hidden sm:flex absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center transition cursor-pointer"
                aria-label={isEn ? 'Next' : 'Suivante'}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Metadata & Concert/Collection exploration strip */}
          <div className="w-full max-w-4xl mx-auto px-5 py-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-white/10 pt-5">
              <div className="space-y-1">
                <p className="text-xs text-white/55">
                  {activeLightboxPhoto.artist} · {activeLightboxPhoto.eventDate} · {activeLightboxPhoto.eventVenue}
                </p>
                <h2 className="font-agrandir-extrabold text-xl sm:text-2xl">
                  {activeLightboxPhoto.title}
                </h2>
                {activeLightboxPhoto.caption && (
                  <p className="text-sm text-white/70 max-w-xl">{activeLightboxPhoto.caption}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxIndex(null);
                    setSelectedCollectionId(null);
                    setSelectedArtist(null);
                    setSelectedConcertId(activeLightboxPhoto.eventId);
                  }}
                  className="min-h-[38px] px-4 rounded-full bg-white/10 hover:bg-white/20 text-xs font-agrandir-semibold cursor-pointer"
                >
                  {isEn ? 'All concert photos' : 'Tout le concert'}
                </button>
                {linkedEditorialCollection && (
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxIndex(null);
                      setSelectedConcertId(null);
                      setSelectedArtist(null);
                      setSelectedCollectionId(linkedEditorialCollection.id);
                    }}
                    className="min-h-[38px] px-4 rounded-full bg-white/10 hover:bg-white/20 text-xs font-agrandir-semibold cursor-pointer"
                  >
                    {linkedEditorialCollection.title}
                  </button>
                )}
              </div>
            </div>

            {sameConcertPhotos.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                  {isEn ? 'From the same concert' : 'Du même concert'}
                </p>
                <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                  {sameConcertPhotos.map((p) => {
                    const targetIdx = visiblePhotos.findIndex((vp) => vp.id === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (targetIdx >= 0) setLightboxIndex(targetIdx);
                          else {
                            setSelectedConcertId(p.eventId);
                            setLightboxIndex(0);
                          }
                        }}
                        className="shrink-0 w-20 h-24 rounded-xl overflow-hidden opacity-75 hover:opacity-100 transition cursor-pointer"
                      >
                        <img src={p.photoUrl} alt={p.title} className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TIROIR / MODALE ENREGISTRER DANS UNE COLLECTION                     */}
      {/* =================================================================== */}
      {savingPhoto && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSavingPhoto(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#111113] text-[#111111] dark:text-white p-5 sm:p-6 space-y-5 shadow-2xl border border-black/10 dark:border-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={savingPhoto.photoUrl}
                  alt={savingPhoto.title}
                  className="w-11 h-11 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="font-agrandir-extrabold text-sm truncate">
                    {isEn ? 'Save to collection' : 'Enregistrer dans une collection'}
                  </h3>
                  <p className="text-xs text-black/50 dark:text-white/50 truncate">
                    {savingPhoto.artist} · {savingPhoto.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSavingPhoto(null)}
                className="w-8 h-8 rounded-full bg-black/[0.06] dark:bg-white/10 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {personalCollections.map((col) => {
                const isIn = col.photoKeys.includes(savingPhoto.photoKey);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => void handleTogglePhotoInCollection(col.id, savingPhoto.photoKey)}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] dark:bg-white/[0.06] dark:hover:bg-white/[0.1] transition cursor-pointer"
                  >
                    <div className="text-left min-w-0">
                      <p className="text-sm font-agrandir-semibold truncate">{col.title}</p>
                      <p className="text-[11px] text-black/45 dark:text-white/45">
                        {col.photoKeys.length} {col.photoKeys.length > 1 ? 'souvenirs' : 'souvenir'}
                      </p>
                    </div>
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        isIn
                          ? 'bg-[#111111] text-white dark:bg-white dark:text-black'
                          : 'border border-black/20 dark:border-white/25'
                      }`}
                    >
                      {isIn && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleCreateCollection} className="flex gap-2 pt-2 border-t border-black/10 dark:border-white/10">
              <input
                type="text"
                value={newCollectionTitle}
                onChange={(e) => setNewCollectionTitle(e.target.value)}
                placeholder={isEn ? 'Create new collection...' : 'Nouvelle collection...'}
                className="flex-1 min-h-[42px] rounded-full bg-black/[0.05] dark:bg-white/[0.08] px-4 text-xs sm:text-sm outline-none"
              />
              <button
                type="submit"
                disabled={creatingCollection || !newCollectionTitle.trim()}
                className="min-h-[42px] px-4 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black text-xs font-agrandir-extrabold disabled:opacity-40 cursor-pointer"
              >
                {isEn ? 'Create' : 'Créer'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
