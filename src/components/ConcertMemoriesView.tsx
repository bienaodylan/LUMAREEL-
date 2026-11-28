import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, Download, Film, Images, MapPin, Play, Share2, X } from 'lucide-react';

type Album = { id: string; event_id: string; title: string; description: string; cover_path: string | null; recap_url: string | null; recap_duration: string | null };
type Photo = { id: string; album_id: string; storage_path: string; thumbnail_path: string | null; caption: string; media_type: 'image' | 'video'; downloadable: boolean; sort_order: number };
type DisplayPhoto = Photo & { url: string; downloadUrl: string };

export const ConcertMemoriesView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DisplayPhoto | null>(null);
  const [recapOpen, setRecapOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setAlbums([]); setPhotos([]); return; }
      const { data: albumRows, error: albumError } = await supabase.from('club_moment_albums').select('*').eq('status','published').order('created_at',{ascending:false});
      if (albumError) throw albumError;
      const nextAlbums = albumRows || [];
      setAlbums(nextAlbums);
      if (!nextAlbums.length) { setPhotos([]); setSelectedAlbum(null); return; }
      const ids = nextAlbums.map((album) => album.id);
      const { data: photoRows, error: photoError } = await supabase.from('club_moment_media').select('*').in('album_id', ids).order('sort_order');
      if (photoError) throw photoError;
      const mapped = await Promise.all((photoRows || []).map(async (photo: Photo) => {
        const previewPath = photo.thumbnail_path || photo.storage_path;
        const [preview, full] = await Promise.all([
          supabase.storage.from('club-media').createSignedUrl(previewPath, 900),
          photo.downloadable ? supabase.storage.from('club-media').createSignedUrl(photo.storage_path, 900) : Promise.resolve({ data: null, error: null }),
        ]);
        return { ...photo, url: preview.data?.signedUrl || '', downloadUrl: full.data?.signedUrl || '' };
      }));
      setPhotos(mapped);
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Unable to load your memories.' : 'Impossible de charger vos souvenirs.'));
    } finally { setLoading(false); }
  }, [isEn]);

  useEffect(() => { void load(); }, [load, currentUser?.id]);

  const selectedPhotos = useMemo(() => selectedAlbum ? photos.filter((photo) => photo.album_id === selectedAlbum.id) : [], [photos, selectedAlbum]);
  const download = async (photo: DisplayPhoto) => {
    if (!photo.downloadUrl) { showToast(isEn ? 'Download is unavailable.' : 'Téléchargement indisponible.', 'error'); return; }
    try {
      const response = await fetch(photo.downloadUrl);
      if (!response.ok) throw new Error('download_failed');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = objectUrl; link.download = `lumareel-${photo.id}`; link.click();
      URL.revokeObjectURL(objectUrl);
      showToast(isEn ? 'Photo downloaded.' : 'Photo téléchargée.', 'success');
    } catch { showToast(isEn ? 'Unable to download this photo.' : 'Impossible de télécharger cette photo.', 'error'); }
  };
  const shareAlbum = async (album: Album) => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ title: album.title, url }); return; } catch { /* cancelled */ } }
    try { await navigator.clipboard.writeText(url); showToast(isEn ? 'Link copied.' : 'Lien copié.', 'success'); } catch { showToast(isEn ? 'Share unavailable.' : 'Partage indisponible.', 'error'); }
  };

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pt-5 sm:pt-10 pb-16 text-white">
      <header className="mb-9 sm:mb-12">
        <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">LUMARÉEL CLUB · ARCHIVES PERSONNELLES</p>
        <h1 className="mt-3 max-w-4xl text-[clamp(2.5rem,8vw,5.5rem)] font-agrandir-extrabold leading-[0.94] tracking-tight">{isEn ? 'The moments that stay.' : 'Les moments qui restent.'}</h1>
        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">{isEn ? 'Find your events, official photographs and shared memories.' : 'Retrouvez vos événements, les images officielles et les souvenirs partagés avec LUMARÉEL.'}</p>
      </header>

      {!selectedAlbum && (
        <>
          <div className="mb-6 flex items-center gap-3"><Images size={18} className="text-neutral-500"/><h2 className="text-xl font-agrandir-extrabold">{isEn ? 'Your events' : 'Mes événements'}</h2><span className="text-xs text-neutral-600">{albums.length}</span></div>
          {loading ? <p className="py-16 text-center text-sm text-neutral-500">{isEn ? 'Finding your events…' : 'Recherche de vos événements…'}</p> : error ? <div className="py-10 text-sm text-neutral-400">{error}<button onClick={() => void load()} className="ml-2 underline">{isEn ? 'Retry' : 'Réessayer'}</button></div> : !albums.length ? <div className="border-y border-white/10 py-16 sm:py-24 text-center"><p className="text-2xl sm:text-3xl font-agrandir-extrabold">{isEn ? 'Your next memory is yet to come.' : 'Votre prochain souvenir reste à écrire.'}</p><p className="mt-3 max-w-lg mx-auto text-sm leading-6 text-neutral-500">{isEn ? 'Official albums appear here only for events linked to your verified tickets.' : 'Les albums officiels apparaissent ici uniquement pour les événements associés à vos billets vérifiés.'}</p><button onClick={() => setIsAuthModalOpen(true)} className="mt-6 text-xs underline underline-offset-4">{isEn ? 'Sign in to view your tickets' : 'Se connecter pour consulter mes billets'}</button></div> : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">{albums.map((album) => <AlbumCard key={album.id} album={album} onOpen={() => setSelectedAlbum(album)} />)}</div>
          )}
        </>
      )}

      {selectedAlbum && (
        <section>
          <div className="mb-6 flex items-center justify-between gap-3"><button onClick={() => { setSelectedAlbum(null); setSelectedPhoto(null); setRecapOpen(false); }} className="inline-flex min-h-11 items-center gap-2 text-xs text-neutral-300"><ArrowLeft size={16}/>{isEn ? 'All my events' : 'Tous mes événements'}</button><button onClick={() => void shareAlbum(selectedAlbum)} className="inline-flex min-h-10 items-center gap-2 border border-white/15 px-4 text-xs"><Share2 size={14}/>{isEn ? 'Share' : 'Partager'}</button></div>
          <header className="mb-8 border-b border-white/10 pb-6"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'YOUR EVENT' : 'VOTRE ÉVÉNEMENT'}</p><h2 className="mt-2 text-3xl sm:text-5xl font-agrandir-extrabold leading-tight">{selectedAlbum.title}</h2><p className="mt-3 text-sm text-neutral-400">{selectedAlbum.description}</p></header>
          {selectedAlbum.recap_url && <section className="mb-10"><div className="mb-3 flex items-center gap-2"><Film size={17}/><h3 className="font-agrandir-extrabold">{isEn ? 'Event recap' : 'Récapitulatif'}</h3>{selectedAlbum.recap_duration && <span className="ml-auto text-xs text-neutral-500">{selectedAlbum.recap_duration}</span>}</div><button onClick={() => setRecapOpen(true)} className="relative block w-full aspect-video bg-[#111] text-left"><div className="absolute inset-0 flex items-center justify-center"><span className="h-14 w-14 flex items-center justify-center rounded-full bg-white text-black"><Play size={20}/></span></div></button></section>}
          <div className="mb-5 flex items-center justify-between"><h3 className="text-lg font-agrandir-extrabold">{isEn ? 'Official photographs' : 'Photos officielles'}</h3><span className="text-xs text-neutral-500">{selectedPhotos.length}</span></div>
          {selectedPhotos.length ? <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">{selectedPhotos.map((photo) => <button key={photo.id} onClick={() => setSelectedPhoto(photo)} className="group relative aspect-[4/5] overflow-hidden bg-[#111]">{photo.url && <img src={photo.url} alt={photo.caption || selectedAlbum.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>}</button>)}</div> : <p className="py-12 text-sm text-neutral-500">{isEn ? 'The album is being prepared.' : 'L’album est en cours de préparation.'}</p>}
        </section>
      )}

      {selectedPhoto && <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-3 sm:p-8"><div className="w-full max-w-5xl"><div className="mb-3 flex justify-end gap-2"><button onClick={() => void download(selectedPhoto)} disabled={!selectedPhoto.downloadable} className="h-10 px-4 border border-white/20 inline-flex items-center gap-2 text-xs disabled:opacity-30"><Download size={14}/>{isEn ? 'Download' : 'Télécharger'}</button><button onClick={() => setSelectedPhoto(null)} aria-label="Fermer" className="h-10 w-10 border border-white/20 flex items-center justify-center"><X size={17}/></button></div><img src={selectedPhoto.url} alt={selectedPhoto.caption} className="max-h-[78vh] w-full object-contain"/><p className="mt-3 text-center text-sm text-neutral-400">{selectedPhoto.caption}</p></div></div>}
      {recapOpen && selectedAlbum?.recap_url && <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-3 sm:p-8"><div className="w-full max-w-5xl"><button onClick={() => setRecapOpen(false)} className="mb-3 ml-auto flex h-10 w-10 items-center justify-center border border-white/20"><X size={17}/></button><div className="aspect-video"><iframe src={selectedAlbum.recap_url} title={selectedAlbum.title} className="h-full w-full border-0" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/></div></div></div>}
    </div>
  );
};

const AlbumCard: React.FC<{ album: Album; onOpen: () => void }> = ({ album, onOpen }) => {
  const [cover, setCover] = useState('');
  useEffect(() => { let live = true; if (album.cover_path) supabase.storage.from('club-media').createSignedUrl(album.cover_path, 900).then(({ data }) => { if (live) setCover(data?.signedUrl || ''); }); return () => { live = false; }; }, [album.cover_path]);
  return <button onClick={onOpen} className="group block w-full text-left"><div className="aspect-[4/3] bg-[#111] overflow-hidden">{cover && <img src={cover} alt={album.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/>}</div><h3 className="mt-3 text-lg font-agrandir-extrabold">{album.title}</h3><p className="mt-1 text-xs text-neutral-500">{album.description}</p></button>;
};
