import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { ClubSpaceNav } from './club/ClubSpaceNav';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Play,
  X,
} from 'lucide-react';

type Collection = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sort_order: number;
};

type MediaItem = {
  id: string;
  collection_id: string | null;
  title: string;
  description: string;
  category: string;
  media_type: 'image' | 'video';
  storage_path: string | null;
  thumbnail_path: string | null;
  external_url: string | null;
  duration: string | null;
  artist_name: string | null;
  event_id: string | null;
  access_tier: string;
  access_note: string | null;
  is_featured: boolean;
  published_at: string | null;
};

type DisplayMedia = MediaItem & {
  sourceUrl: string;
  previewUrl: string;
  allowed: boolean;
};

const CATEGORY_ORDER = [
  'originals',
  'backstage',
  'session_studio',
  'interviews',
  'stories',
  'discover',
  'ballon',
] as const;

const CATEGORY_LABELS: Record<string, { fr: string; en: string }> = {
  ballon: { fr: 'Ballon', en: 'Ballon' },
  session_studio: { fr: 'Sessions Studio', en: 'Studio Sessions' },
  backstage: { fr: 'Backstage', en: 'Backstage' },
  interviews: { fr: 'Interviews', en: 'Interviews' },
  stories: { fr: 'Stories', en: 'Stories' },
  originals: { fr: 'LUMARÉEL Originals', en: 'LUMARÉEL Originals' },
  discover: { fr: 'À découvrir', en: 'Discover' },
};

const getCategoryLabel = (category: string, isEn: boolean) =>
  CATEGORY_LABELS[category]?.[isEn ? 'en' : 'fr'] || category;

const getAccessLabel = (item: DisplayMedia, isEn: boolean) => {
  if (item.access_note) return item.access_note;
  if (item.access_tier === 'card') return 'LUMARÉEL Black Card';
  if (item.access_tier === 'tv_pass') return 'LUMARÉEL TV Pass';
  if (item.access_tier === 'vip') return isEn ? 'VIP or Event Ticket' : 'Accès VIP ou billet';
  if (item.access_tier === 'club') return isEn ? 'Club Members' : 'Membres du Club';
  return isEn ? 'Open access' : 'Accès libre';
};

const isDirectVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url) || url.includes('/storage/v1/object/sign/');

export const BackstageView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, setCurrentPage, goBack, showToast, language } = useApp();
  const isEn = language === 'en';

  const [items, setItems] = useState<DisplayMedia[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selected, setSelected] = useState<DisplayMedia | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [mediaResult, collectionResult] = await Promise.all([
        supabase
          .from('club_backstage_media')
          .select('*')
          .eq('status', 'published')
          .order('is_featured', { ascending: false })
          .order('published_at', { ascending: false }),
        supabase
          .from('club_backstage_collections')
          .select('id,slug,title,description,sort_order')
          .eq('status', 'published')
          .order('sort_order'),
      ]);

      if (mediaResult.error) throw mediaResult.error;
      if (collectionResult.error) throw collectionResult.error;

      const { data: auth } = await supabase.auth.getUser();
      const mapped = await Promise.all(
        (mediaResult.data || []).map(async (item: MediaItem) => {
          const { data: accessData } = auth.user
            ? await supabase.rpc('club_can_access_media', { p_media_id: item.id })
            : { data: item.access_tier === 'free' };
          const allowed = Boolean(accessData);

          const [storage, thumb] = await Promise.all([
            item.storage_path && allowed
              ? supabase.storage.from('club-media').createSignedUrl(item.storage_path, 900)
              : Promise.resolve({ data: null }),
            item.thumbnail_path
              ? supabase.storage.from('club-media').createSignedUrl(item.thumbnail_path, 900)
              : Promise.resolve({ data: null }),
          ]);

          const sourceUrl = storage?.data?.signedUrl || (allowed ? item.external_url || '' : '');
          const previewUrl = thumb?.data?.signedUrl || (allowed ? item.external_url || '' : '');

          return { ...item, sourceUrl, previewUrl, allowed };
        })
      );

      setItems(mapped);
      setCollections(collectionResult.data || []);
    } catch (err: any) {
      setError(
        err?.message ||
          (isEn ? 'Unable to load Backstage.' : 'Impossible de charger Backstage.')
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);

  // Fermer le lecteur avec la touche Échap
  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const presentCategories = useMemo(() => {
    const set = new Set(items.map((item) => item.category));
    const ordered = CATEGORY_ORDER.filter((cat) => set.has(cat));
    const extras = Array.from(set).filter((cat) => !CATEGORY_ORDER.includes(cat as any));
    return ['all', ...ordered, ...extras];
  }, [items]);

  const ballonItems = useMemo(
    () => items.filter((item) => item.category === 'ballon'),
    [items]
  );

  const studioItems = useMemo(
    () => items.filter((item) => item.category === 'session_studio'),
    [items]
  );

  const featured = useMemo(() => {
    const pool = activeCategory === 'all' ? items : items.filter((i) => i.category === activeCategory);
    return pool.find((item) => item.is_featured) || pool[0] || null;
  }, [items, activeCategory]);

  const filteredItems = useMemo(() => {
    if (activeCategory === 'all') return items;
    return items.filter((item) => item.category === activeCategory);
  }, [items, activeCategory]);

  const extraCategoryRails = useMemo(() => {
    const categoriesToGroup = ['originals', 'backstage', 'interviews', 'stories', 'discover'];
    return categoriesToGroup
      .map((cat) => ({
        category: cat,
        title: getCategoryLabel(cat, isEn),
        items: items.filter((item) => item.category === cat && !item.collection_id),
      }))
      .filter((group) => group.items.length > 0);
  }, [items, isEn]);

  const openMedia = (item: DisplayMedia) => {
    if (!item.allowed) {
      const requirement =
        item.access_note ||
        (item.access_tier === 'card'
          ? isEn
            ? 'This content is reserved for LUMARÉEL Black Card holders.'
            : 'Ce contenu est réservé aux détenteurs de la LUMARÉEL Black Card.'
          : item.access_tier === 'tv_pass'
            ? isEn
              ? 'A LUMARÉEL TV Pass is required to access this content.'
              : 'Un TV Pass LUMARÉEL est requis pour accéder à ce contenu.'
            : item.access_tier === 'vip'
              ? isEn
                ? 'VIP access or a valid event ticket is required.'
                : 'Un accès VIP ou un billet valide est requis.'
              : isEn
                ? 'Sign in to access this exclusive Club content.'
                : 'Connectez-vous pour accéder à ce contenu exclusif du Club.');
      showToast(requirement, 'info');
      if (item.access_tier === 'club' || !currentUser) {
        setIsAuthModalOpen(true);
      } else if (item.access_tier === 'card' || item.access_tier === 'vip') {
        setCurrentPage('member_card');
      }
      return;
    }
    setSelected(item);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white pb-20">
      {/* En-tête mobile immersif (Navbar globale masquée sur Backstage) */}
      <div
        className="sticky top-0 z-30 md:hidden flex items-center justify-between gap-3 px-4 py-3 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}
      >
        <button
          type="button"
          onClick={goBack}
          aria-label={isEn ? 'Go back' : 'Retour'}
          className="h-9 px-3 rounded-full bg-white/[0.08] border border-white/15 inline-flex items-center gap-1.5 text-xs text-white cursor-pointer"
        >
          <ArrowLeft size={15} />
          <span>{isEn ? 'Back' : 'Retour'}</span>
        </button>
        <span className="text-[11px] font-agrandir-extrabold uppercase tracking-[0.22em] text-white">
          BACKSTAGE
        </span>
        <span className="w-14" aria-hidden="true" />
      </div>

      {/* Navigation inter-espaces du Club */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-3 sm:pt-7">
        <ClubSpaceNav active="backstage" />
      </div>

      {/* A. HERO IMMERSIF */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-7 sm:pt-10 pb-8 sm:pb-12">
        {featured ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full overflow-hidden bg-[#0e0e0e] border border-white/10"
          >
            <button
              type="button"
              onClick={() => openMedia(featured)}
              className="group relative block w-full text-left cursor-pointer"
            >
              <div className="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9] w-full overflow-hidden bg-[#0e0e0e]">
                {featured.previewUrl ? (
                  <img
                    src={featured.previewUrl}
                    alt={featured.title}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-[#161616] to-[#060606]" />
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/15" />

              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-14 flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-2.5 text-[10px] uppercase tracking-[0.22em] text-neutral-300">
                  <span>{getCategoryLabel(featured.category, isEn)}</span>
                  {featured.artist_name && (
                    <>
                      <span className="text-neutral-600">·</span>
                      <span>{featured.artist_name}</span>
                    </>
                  )}
                  {featured.duration && (
                    <>
                      <span className="text-neutral-600">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={11} />
                        {featured.duration}
                      </span>
                    </>
                  )}
                </div>

                <h1 className="mt-3 max-w-3xl text-3xl sm:text-5xl lg:text-6xl font-agrandir-extrabold leading-[0.96] tracking-tight text-white">
                  {featured.title}
                </h1>

                {featured.description && (
                  <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-6 text-neutral-300 line-clamp-2 sm:line-clamp-3">
                    {featured.description}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="min-h-11 px-6 bg-white text-black text-xs font-agrandir-extrabold uppercase tracking-[0.12em] inline-flex items-center gap-2 transition-colors group-hover:bg-neutral-200">
                    {featured.allowed ? (
                      <>
                        <Play size={14} fill="currentColor" />
                        {featured.media_type === 'video'
                          ? isEn
                            ? 'Watch'
                            : 'Regarder'
                          : isEn
                            ? 'Discover'
                            : 'Découvrir'}
                      </>
                    ) : (
                      <>
                        <Lock size={14} />
                        {getAccessLabel(featured, isEn)}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </button>
          </motion.div>
        ) : (
          <motion.header
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="border-b border-white/10 pb-10 sm:pb-14 pt-3 sm:pt-6"
          >
            <p className="text-[10px] uppercase tracking-[0.26em] text-neutral-500">
              LUMARÉEL CLUB · BACKSTAGE
            </p>
            <h1 className="mt-4 max-w-4xl text-[clamp(2.35rem,7.8vw,5.4rem)] font-agrandir-extrabold leading-[0.93] tracking-[-0.03em] text-white">
              {isEn ? 'Everything behind the stage.' : 'Tout ce qui se passe derrière la scène.'}
            </h1>
            <p className="mt-5 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">
              {isEn
                ? 'Behind-the-scenes stories, artists, studio sessions and exclusive experiences the public does not always see.'
                : 'Les coulisses, les artistes, les sessions, les histoires et les expériences que le public ne voit pas forcément.'}
            </p>
          </motion.header>
        )}
      </section>

      {/* Filtres d'univers */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide border-b border-white/10 pb-3.5 text-xs">
          {(presentCategories.length > 1
            ? presentCategories
            : ['all', 'ballon', 'session_studio', 'originals', 'backstage', 'interviews', 'stories']
          ).map((cat) => {
            const active = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 tracking-[0.06em] transition-colors cursor-pointer ${
                  active
                    ? 'text-white font-agrandir-extrabold'
                    : 'text-neutral-500 hover:text-neutral-200 font-agrandir-semibold'
                }`}
              >
                {cat === 'all' ? (isEn ? 'All' : 'Tout') : getCategoryLabel(cat, isEn)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Corps éditorial */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-10 space-y-14 sm:space-y-16">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 py-8">
            <div className="aspect-[16/10] lum-skeleton" />
            <div className="aspect-[16/10] lum-skeleton" />
            <div className="aspect-[16/10] lum-skeleton" />
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
        ) : activeCategory !== 'all' ? (
          /* Vue filtrée sur une catégorie précise */
          <section>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                  BACKSTAGE
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">
                  {getCategoryLabel(activeCategory, isEn)}
                </h2>
              </div>
              <span className="text-xs text-neutral-600 tabular-nums">{filteredItems.length}</span>
            </div>

            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
                {filteredItems.map((item) => (
                  <BackstageCard key={item.id} item={item} onOpen={openMedia} isEn={isEn} />
                ))}
              </div>
            ) : (
              <div className="border-t border-white/10 py-14 text-center">
                <p className="text-lg font-agrandir-extrabold text-white">
                  {activeCategory === 'ballon'
                    ? 'Ballon'
                    : getCategoryLabel(activeCategory, isEn)}
                </p>
                <p className="mt-2 text-sm text-neutral-500">
                  {isEn
                    ? 'No content has been published in this section yet.'
                    : 'Aucun contenu n’a encore été publié dans cette rubrique.'}
                </p>
              </div>
            )}
          </section>
        ) : (
          /* Vue complète Backstage : Ballon · Sessions Studio · Collections & Contenus exclusifs */
          <>
            {/* B. BALLON (appellation exacte conservée) */}
            <section className="space-y-6">
              <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                    01 · RUBRIQUE
                  </p>
                  <h2 className="mt-2 text-2xl sm:text-4xl font-agrandir-extrabold tracking-tight">
                    Ballon
                  </h2>
                </div>
                {ballonItems.length > 0 && (
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {ballonItems.length}
                  </span>
                )}
              </div>

              {ballonItems.length > 0 ? (
                <MediaRail items={ballonItems} onOpen={openMedia} isEn={isEn} variant="editorial" />
              ) : (
                <div className="border border-white/10 bg-[#080808] px-6 py-10 sm:py-12">
                  <p className="text-sm text-neutral-400">
                    {isEn
                      ? 'No Ballon content has been published yet.'
                      : 'Aucun contenu Ballon n’est encore publié pour le moment.'}
                  </p>
                </div>
              )}
            </section>

            {/* C. SESSIONS STUDIO */}
            <section className="space-y-6">
              <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">
                    02 · MUSIQUE & PERFORMANCES
                  </p>
                  <h2 className="mt-2 text-2xl sm:text-4xl font-agrandir-extrabold tracking-tight">
                    {isEn ? 'Studio Sessions' : 'Sessions Studio'}
                  </h2>
                  <p className="mt-1.5 text-xs sm:text-sm text-neutral-500">
                    {isEn
                      ? 'Performances, acoustic sessions, lives, collaborations and studio recordings.'
                      : 'Performances, lives, sessions acoustiques, collaborations et enregistrements en studio.'}
                  </p>
                </div>
                {studioItems.length > 0 && (
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {studioItems.length}
                  </span>
                )}
              </div>

              {studioItems.length > 0 ? (
                <MediaRail items={studioItems} onOpen={openMedia} isEn={isEn} variant="studio" />
              ) : (
                <div className="border border-white/10 bg-[#080808] px-6 py-10 sm:py-12">
                  <p className="text-sm text-neutral-400">
                    {isEn
                      ? 'No Studio Sessions have been published yet.'
                      : 'Aucune Session Studio n’est encore publiée pour le moment.'}
                  </p>
                </div>
              )}
            </section>

            {/* D. CONTENUS EXCLUSIFS — COLLECTIONS & CATÉGORIES */}
            {collections.map((collection) => {
              const collectionItems = items.filter((item) => item.collection_id === collection.id);
              if (!collectionItems.length) return null;
              return (
                <section key={collection.id} className="space-y-6">
                  <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                        COLLECTION
                      </p>
                      <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">
                        {collection.title}
                      </h2>
                      {collection.description && (
                        <p className="mt-1.5 text-xs sm:text-sm text-neutral-500 max-w-2xl">
                          {collection.description}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-neutral-500 tabular-nums">
                      {collectionItems.length}
                    </span>
                  </div>
                  <MediaRail items={collectionItems} onOpen={openMedia} isEn={isEn} />
                </section>
              );
            })}

            {extraCategoryRails.map((group) => (
              <section key={group.category} className="space-y-6">
                <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                      {isEn ? 'EXCLUSIVE CONTENT' : 'CONTENUS EXCLUSIFS'}
                    </p>
                    <h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">
                      {group.title}
                    </h2>
                  </div>
                  <span className="text-xs text-neutral-500 tabular-nums">
                    {group.items.length}
                  </span>
                </div>
                <MediaRail items={group.items} onOpen={openMedia} isEn={isEn} />
              </section>
            ))}

            {items.length === 0 && (
              <section className="border-t border-white/10 pt-10">
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                  03 · {isEn ? 'EXCLUSIVE CONTENT' : 'CONTENUS EXCLUSIFS'}
                </p>
                <div className="mt-4 border border-white/10 bg-[#080808] px-6 py-14 text-center">
                  <p className="text-xl sm:text-2xl font-agrandir-extrabold text-white">
                    {isEn ? 'The next story is in production.' : 'Les prochains contenus se préparent.'}
                  </p>
                  <p className="mt-2.5 max-w-lg mx-auto text-sm leading-6 text-neutral-500">
                    {isEn
                      ? 'LUMARÉEL Originals, interviews, backstage films and exclusive stories will appear here as soon as they are published.'
                      : 'LUMARÉEL Originals, interviews, coulisses et stories exclusives apparaîtront ici dès leur publication.'}
                  </p>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* E. LECTEUR FLUIDE PLEIN ÉCRAN */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[110] bg-black/96 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={selected.title}
            onClick={() => setSelected(null)}
          >
            <div
              className="w-full max-w-5xl space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">
                    {getCategoryLabel(selected.category, isEn)}
                    {selected.artist_name ? ` · ${selected.artist_name}` : ''}
                    {selected.duration ? ` · ${selected.duration}` : ''}
                  </p>
                  <h2 className="mt-1.5 text-xl sm:text-3xl font-agrandir-extrabold leading-tight text-white">
                    {selected.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  aria-label={isEn ? 'Close player' : 'Fermer le lecteur'}
                  className="h-10 w-10 shrink-0 border border-white/20 hover:border-white flex items-center justify-center text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="aspect-video w-full bg-black border border-white/10 overflow-hidden">
                {selected.media_type === 'video' ? (
                  isDirectVideoUrl(selected.sourceUrl) ? (
                    <video
                      src={selected.sourceUrl}
                      poster={selected.previewUrl || undefined}
                      controls
                      autoPlay
                      playsInline
                      className="h-full w-full bg-black"
                    />
                  ) : (
                    <iframe
                      src={convertToYouTubeEmbed(selected.sourceUrl)}
                      title={selected.title}
                      className="h-full w-full border-0"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  )
                ) : (
                  <img
                    src={selected.sourceUrl || selected.previewUrl}
                    alt={selected.title}
                    className="h-full w-full object-contain bg-black"
                  />
                )}
              </div>

              {selected.description && (
                <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                  {selected.description}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MediaRail: React.FC<{
  items: DisplayMedia[];
  onOpen: (item: DisplayMedia) => void;
  isEn: boolean;
  variant?: 'default' | 'studio' | 'editorial';
}> = ({ items, onOpen, isEn, variant = 'default' }) => {
  const railRef = useRef<HTMLDivElement>(null);

  const scrollRail = (dir: -1 | 1) => {
    const el = railRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(300, el.clientWidth * 0.72), behavior: 'smooth' });
  };

  return (
    <div className="relative group/rail">
      {items.length > 2 && (
        <div className="hidden md:flex justify-end gap-2 mb-4">
          <button
            type="button"
            onClick={() => scrollRail(-1)}
            aria-label={isEn ? 'Previous' : 'Précédent'}
            className="h-9 w-9 border border-white/15 hover:border-white text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollRail(1)}
            aria-label={isEn ? 'Next' : 'Suivant'}
            className="h-9 w-9 border border-white/15 hover:border-white text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      <div
        ref={railRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scrollbar-hide pb-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`shrink-0 snap-start ${
              variant === 'studio'
                ? 'w-[76vw] sm:w-[320px] lg:w-[360px]'
                : 'w-[80vw] sm:w-[360px] lg:w-[410px]'
            }`}
          >
            <BackstageCard item={item} onOpen={onOpen} isEn={isEn} variant={variant} />
          </div>
        ))}
      </div>
    </div>
  );
};

const BackstageCard: React.FC<{
  item: DisplayMedia;
  onOpen: (item: DisplayMedia) => void;
  isEn: boolean;
  variant?: 'default' | 'studio' | 'editorial';
}> = ({ item, onOpen, isEn, variant = 'default' }) => (
  <article>
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group block w-full text-left cursor-pointer"
    >
      <div
        className={`relative overflow-hidden bg-[#111] ${
          variant === 'studio' ? 'aspect-[4/3]' : 'aspect-[16/10]'
        }`}
      >
        {item.previewUrl ? (
          <img
            src={item.previewUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 bg-[#121212]" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />

        {item.duration && (
          <span className="absolute right-3 bottom-3 bg-black/80 px-2 py-0.5 text-[10px] font-mono text-white">
            {item.duration}
          </span>
        )}

        {!item.allowed ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55 backdrop-blur-[2px] px-4 text-center">
            <Lock size={18} className="text-white" />
            <span className="text-[10px] uppercase tracking-[0.16em] text-neutral-200">
              {getAccessLabel(item, isEn)}
            </span>
          </span>
        ) : (
          item.media_type === 'video' && (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="h-12 w-12 rounded-full bg-black/65 border border-white/25 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110">
                <Play size={16} fill="currentColor" />
              </span>
            </span>
          )
        )}
      </div>

      <div className="mt-3.5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500 truncate">
          {getCategoryLabel(item.category, isEn)}
          {item.artist_name ? ` · ${item.artist_name}` : ''}
        </p>
        <h3 className="mt-1.5 text-base sm:text-lg font-agrandir-extrabold leading-snug text-white group-hover:opacity-80 transition-opacity">
          {item.title}
        </h3>
        {item.description && (
          <p className="mt-1.5 text-xs leading-5 text-neutral-500 line-clamp-2">
            {item.description}
          </p>
        )}
      </div>
    </button>
  </article>
);
