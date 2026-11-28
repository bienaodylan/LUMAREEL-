import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowUpRight, Lock, Play, X } from 'lucide-react';

type Collection = { id: string; slug: string; title: string; description: string; sort_order: number };
type MediaItem = { id: string; collection_id: string | null; title: string; description: string; category: string; media_type: 'image' | 'video'; storage_path: string | null; thumbnail_path: string | null; external_url: string | null; duration: string | null; artist_name: string | null; event_id: string | null; access_tier: string; access_note: string | null; is_featured: boolean; published_at: string | null };
type DisplayMedia = MediaItem & { sourceUrl: string; previewUrl: string; allowed: boolean };

const categoryLabel: Record<string,string> = { ballon: 'BALLON', session_studio: 'SESSIONS STUDIO', backstage: 'BACKSTAGE', interviews: 'INTERVIEWS', stories: 'STORIES', originals: 'LUMARÉEL ORIGINALS', discover: 'À DÉCOUVRIR' };

export const BackstageView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, setCurrentPage, showToast, language } = useApp();
  const isEn = language === 'en';
  const [items, setItems] = useState<DisplayMedia[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [selected, setSelected] = useState<DisplayMedia | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [mediaResult, collectionResult] = await Promise.all([
        supabase.from('club_backstage_media').select('*').eq('status','published').order('is_featured',{ascending:false}).order('published_at',{ascending:false}),
        supabase.from('club_backstage_collections').select('id,slug,title,description,sort_order').eq('status','published').order('sort_order'),
      ]);
      if (mediaResult.error) throw mediaResult.error;
      if (collectionResult.error) throw collectionResult.error;
      const { data: auth } = await supabase.auth.getUser();
      const mapped = await Promise.all((mediaResult.data || []).map(async (item: MediaItem) => {
        const { data: accessData } = auth.user
          ? await supabase.rpc('club_can_access_media', { p_media_id: item.id })
          : { data: item.access_tier === 'free' };
        const allowed = Boolean(accessData);
        const storage = item.storage_path && allowed
          ? await supabase.storage.from('club-media').createSignedUrl(item.storage_path, 900)
          : null;
        const thumb = item.thumbnail_path
          ? await supabase.storage.from('club-media').createSignedUrl(item.thumbnail_path, 900)
          : null;
        const sourceUrl = storage?.data?.signedUrl || (allowed ? item.external_url || '' : '');
        const previewUrl = thumb?.data?.signedUrl || (allowed ? item.external_url || '' : '');
        return { ...item, sourceUrl, previewUrl, allowed };
      }));
      setItems(mapped);
      setCollections(collectionResult.data || []);
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Unable to load Backstage.' : 'Impossible de charger Backstage.'));
    } finally { setLoading(false); }
  }, [isEn]);

  useEffect(() => { void load(); }, [load, currentUser?.id]);

  const categories = useMemo(() => {
    const present = Array.from(new Set(items.map((item) => item.category)));
    return ['all', ...present];
  }, [items]);
  const visible = items.filter((item) => activeCategory === 'all' || item.category === activeCategory);
  const ballonItems = visible.filter((item) => item.category === 'ballon');
  const editorialItems = visible.filter((item) => item.category !== 'ballon');
  const featured = editorialItems.find((item) => item.is_featured) || editorialItems[0] || null;
  const rest = editorialItems.filter((item) => item.id !== featured?.id);
  const openMedia = (item: DisplayMedia) => {
    if (!item.allowed) {
      if (item.access_tier === 'club' && !currentUser) setIsAuthModalOpen(true);
      else if (item.access_tier === 'card' || item.access_tier === 'vip') setCurrentPage('member_card');
      else setIsAuthModalOpen(true);
      return;
    }
    setSelected(item);
  };

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pt-5 sm:pt-10 pb-16 text-white">
      <header className="mb-8 sm:mb-12">
        <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">LUMARÉEL CLUB · CONTENUS EXCLUSIFS</p>
        <h1 className="mt-3 max-w-4xl text-[clamp(2.4rem,8vw,5.5rem)] font-agrandir-extrabold leading-[0.92] tracking-tight">{isEn ? 'Everything behind the stage.' : 'Tout ce qui se passe derrière la scène.'}</h1>
        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">{isEn ? 'Artists, stories, moments and experiences the audience does not always get to see.' : 'Les artistes, les histoires, les instants et les expériences que le public ne voit pas toujours.'}</p>
      </header>

      {featured && (
        <section className="mb-10 sm:mb-14">
          <button onClick={() => openMedia(featured)} className="group relative block w-full overflow-hidden bg-[#111] text-left">
            <div className="aspect-[16/9] sm:aspect-[21/9] w-full">
              {featured.previewUrl ? <img src={featured.previewUrl} alt={featured.title} className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.02]"/> : <div className="h-full w-full bg-neutral-900"/>}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/15 to-transparent"/>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-9">
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-300">{categoryLabel[featured.category] || 'BACKSTAGE'} · {featured.access_tier !== 'free' ? (isEn ? 'MEMBERS' : 'MEMBRES') : 'LUMARÉEL'}</p>
              <h2 className="mt-2 max-w-3xl text-2xl sm:text-4xl font-agrandir-extrabold leading-tight">{featured.title}</h2>
              {featured.description && <p className="mt-2 max-w-2xl text-xs sm:text-sm text-neutral-300 line-clamp-2">{featured.description}</p>}
              <span className="mt-4 inline-flex items-center gap-2 text-xs font-agrandir-extrabold">{featured.allowed ? (isEn ? 'Watch' : 'Regarder') : (isEn ? 'Access required' : 'Accès requis')} <Play size={15}/></span>
            </div>
            {!featured.allowed && <span className="absolute right-4 top-4 h-10 w-10 rounded-full bg-black/65 flex items-center justify-center"><Lock size={17}/></span>}
          </button>
        </section>
      )}

      <div className="flex items-center gap-3 overflow-x-auto pb-4 border-b border-white/10 scrollbar-hide">
        <button onClick={() => setActiveCategory('all')} className={`shrink-0 text-xs ${activeCategory === 'all' ? 'text-white' : 'text-neutral-500'}`}>{isEn ? 'All' : 'Tout'}</button>
        {categories.filter((c) => c !== 'all').map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`shrink-0 text-xs ${activeCategory === category ? 'text-white' : 'text-neutral-500'}`}>{categoryLabel[category] || category}</button>)}
      </div>

      {loading ? <p className="py-16 text-center text-sm text-neutral-500">{isEn ? 'Loading content…' : 'Chargement des contenus…'}</p> : error ? <div className="py-10 text-sm text-neutral-400">{error}<button onClick={() => void load()} className="ml-2 underline">{isEn ? 'Retry' : 'Réessayer'}</button></div> : (
        <div className="space-y-12 py-8">
          {items.length === 0 ? <div className="py-16 text-center"><p className="text-2xl font-agrandir-extrabold">{isEn ? 'The next story is being prepared.' : 'La prochaine histoire se prépare.'}</p><p className="mt-3 text-sm text-neutral-500">{isEn ? 'No exclusive content has been published yet.' : 'Aucun contenu exclusif n’a encore été publié.'}</p></div> : (
            <>
              {collections.map((collection) => {
                const collectionItems = editorialItems.filter((item) => item.collection_id === collection.id);
                if (!collectionItems.length) return null;
                return <section key={collection.id}><div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{categoryLabel[collection.slug] || 'COLLECTION'}</p><h2 className="mt-2 text-xl sm:text-2xl font-agrandir-extrabold">{collection.title}</h2>{collection.description && <p className="mt-1 text-xs text-neutral-500">{collection.description}</p>}</div><span className="text-xs text-neutral-600">{collectionItems.length}</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">{collectionItems.map((item) => <MediaCard key={item.id} item={item} onOpen={openMedia} isEn={isEn}/>)}</div></section>;
              })}
              {rest.filter((item) => !item.collection_id).length > 0 && <section><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">{rest.filter((item) => !item.collection_id).map((item) => <MediaCard key={item.id} item={item} onOpen={openMedia} isEn={isEn}/>)}</div></section>}
              {ballonItems.length > 0 && <section className="border-t border-white/10 pt-8"><p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">UNIVERS À PART</p><h2 className="mt-2 mb-5 text-2xl font-agrandir-extrabold">Ballon</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">{ballonItems.map((item) => <MediaCard key={item.id} item={item} onOpen={openMedia} isEn={isEn}/>)}</div></section>}

            </>
          )}
        </div>
      )}

      {selected && <div className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-md flex items-center justify-center p-3 sm:p-8" role="dialog" aria-modal="true"><div className="w-full max-w-5xl"><div className="mb-4 flex justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-neutral-500">{categoryLabel[selected.category] || 'BACKSTAGE'}</p><h2 className="mt-1 text-xl sm:text-3xl font-agrandir-extrabold">{selected.title}</h2></div><button onClick={() => setSelected(null)} aria-label="Fermer" className="h-10 w-10 shrink-0 border border-white/20 flex items-center justify-center"><X size={18}/></button></div><div className="aspect-video bg-black">{selected.media_type === 'video' ? <video src={selected.sourceUrl} poster={selected.previewUrl || undefined} controls playsInline className="h-full w-full" /> : <img src={selected.sourceUrl} alt={selected.title} className="h-full w-full object-contain"/>}</div><p className="mt-4 text-sm text-neutral-400">{selected.description}</p></div></div>}
    </div>
  );
};

const MediaCard: React.FC<{ item: DisplayMedia; onOpen: (item: DisplayMedia) => void; isEn: boolean }> = ({ item, onOpen, isEn }) => (
  <article>
    <button onClick={() => onOpen(item)} className="group relative block w-full text-left">
      <div className="relative aspect-[16/10] overflow-hidden bg-[#111]">
        {item.previewUrl ? <img src={item.previewUrl} alt={item.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"/> : <div className="absolute inset-0 bg-neutral-900"/>}
        {!item.allowed && <span className="absolute inset-0 flex items-center justify-center bg-black/35"><Lock size={22}/></span>}
        {item.allowed && item.media_type === 'video' && <span className="absolute inset-0 flex items-center justify-center"><span className="h-12 w-12 rounded-full bg-black/60 flex items-center justify-center"><Play size={18}/></span></span>}
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-widest text-neutral-500">{categoryLabel[item.category] || 'BACKSTAGE'}{item.artist_name ? ` · ${item.artist_name}` : ''}</p>
      <h3 className="mt-1 text-base font-agrandir-extrabold leading-snug">{item.title}</h3>
      {item.description && <p className="mt-1 text-xs leading-5 text-neutral-500 line-clamp-2">{item.description}</p>}
    </button>
  </article>
);
