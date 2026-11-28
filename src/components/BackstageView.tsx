import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { ArrowLeft, Lock, Play, X } from 'lucide-react';

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

type BackstageSection = 'featured' | 'ballon' | 'studio' | 'exclusives';

const getAccessLabel = (item: DisplayMedia, isEn: boolean) => {
  if (item.access_note) return item.access_note;
  if (item.access_tier === 'card') return 'LUMARÉEL Black Card';
  if (item.access_tier === 'tv_pass') return 'LUMARÉEL TV Pass';
  if (item.access_tier === 'vip') return isEn ? 'VIP or Ticket' : 'Accès VIP ou billet';
  if (item.access_tier === 'club') return isEn ? 'Club Members' : 'Membres du Club';
  return '';
};

const isDirectVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(url) || url.includes('/storage/v1/object/sign/');

export const BackstageView: React.FC<{ embedded?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, goBack, showToast, language } = useApp();
  const isEn = language === 'en';

  const [items, setItems] = useState<DisplayMedia[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [section, setSection] = useState<BackstageSection>('featured');
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
          const previewUrl =
            thumb?.data?.signedUrl ||
            (item.media_type === 'image' && allowed ? storage?.data?.signedUrl || item.external_url || '' : '');

          return { ...item, sourceUrl, previewUrl, allowed };
        })
      );

      setItems(mapped);
      setCollections(collectionResult.data || []);
    } catch (err: any) {
      setError(
        err?.message || (isEn ? 'Unable to load Backstage.' : 'Impossible de charger Backstage.')
      );
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    void load();
  }, [load, currentUser?.id]);

  useEffect(() => {
    if (!selected) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  const ballonItems = useMemo(
    () => items.filter((item) => item.category === 'ballon'),
    [items]
  );

  const studioItems = useMemo(
    () => items.filter((item) => item.category === 'session_studio'),
    [items]
  );

  const exclusiveItems = useMemo(
    () =>
      items.filter(
        (item) => item.category !== 'ballon' && item.category !== 'session_studio'
      ),
    [items]
  );

  const featured = useMemo(() => {
    if (section === 'ballon') return ballonItems.find((i) => i.is_featured) || ballonItems[0] || null;
    if (section === 'studio') return studioItems.find((i) => i.is_featured) || studioItems[0] || null;
    if (section === 'exclusives') return exclusiveItems.find((i) => i.is_featured) || exclusiveItems[0] || null;
    return items.find((i) => i.is_featured) || items[0] || null;
  }, [section, items, ballonItems, studioItems, exclusiveItems]);

  const collectionsWithMedia = useMemo(() => {
    return collections
      .map((col) => ({
        ...col,
        items: exclusiveItems.filter((item) => item.collection_id === col.id),
      }))
      .filter((col) => col.items.length > 0);
  }, [collections, exclusiveItems]);

  const uncollectedExclusives = useMemo(() => {
    const collectedIds = new Set(collectionsWithMedia.flatMap((c) => c.items.map((i) => i.id)));
    return exclusiveItems.filter((item) => !collectedIds.has(item.id));
  }, [exclusiveItems, collectionsWithMedia]);

  const openMedia = (item: DisplayMedia) => {
    if (!item.allowed) {
      if (!currentUser) {
        setIsAuthModalOpen(true);
        return;
      }
      const tier = getAccessLabel(item, isEn);
      showToast(
        tier
          ? isEn
            ? `Reserved for ${tier}`
            : `Réservé : ${tier}`
          : isEn
            ? 'Restricted access'
            : 'Accès réservé',
        'info'
      );
      return;
    }
    setSelected(item);
  };

  const navItems: Array<{ id: BackstageSection; label: string }> = [
    { id: 'featured', label: isEn ? 'Featured' : 'À la une' },
    { id: 'ballon', label: 'Ballon' },
    { id: 'studio', label: isEn ? 'Studio Sessions' : 'Sessions Studio' },
    { id: 'exclusives', label: isEn ? 'Exclusives' : 'Exclusivités' },
  ];

  const embedUrl = useMemo(() => {
    if (!selected || selected.media_type !== 'video' || !selected.sourceUrl) return '';
    if (isDirectVideoUrl(selected.sourceUrl)) return '';
    return convertToYouTubeEmbed(selected.sourceUrl) || selected.sourceUrl;
  }, [selected]);

  return (
    <div className="min-h-screen bg-black text-white pb-28 md:pb-20">
      {/* Top minimal bar */}
      <header className="sticky top-0 z-30 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto max-w-[1160px] px-5 sm:px-8 pt-4 pb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={goBack}
              aria-label={isEn ? 'Back' : 'Retour'}
              className="md:hidden shrink-0 w-9 h-9 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-agrandir-semibold text-base sm:text-lg tracking-tight text-white">
              Backstage
            </span>
          </div>

          <nav
            aria-label="Backstage"
            className="flex items-center gap-5 sm:gap-7 overflow-x-auto no-scrollbar"
          >
            {navItems.map((tab) => {
              const active = section === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id)}
                  className={`relative whitespace-nowrap py-1 text-[13px] sm:text-[14px] transition-colors ${
                    active ? 'text-white font-medium' : 'text-white/45 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="backstage-nav-underline"
                      className="absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-white"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] px-5 sm:px-8 pt-4 sm:pt-6">
        {error && <p className="mb-6 text-sm text-white/55">{error}</p>}

        {loading ? (
          <div className="space-y-10">
            <div className="w-full aspect-[4/5] sm:aspect-[16/9] max-h-[540px] rounded-xl bg-white/[0.06] animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-square rounded-lg bg-white/[0.05] animate-pulse" />
              ))}
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="py-28 sm:py-36 text-center">
            <p className="text-[15px] text-white/50">
              {isEn
                ? 'Backstage content will appear here soon.'
                : 'Les contenus Backstage apparaîtront ici prochainement.'}
            </p>
          </div>
        ) : (
          <div className="space-y-14 sm:space-y-16">
            {/* À LA UNE HERO */}
            {featured && (
              <section>
                <div
                  onClick={() => openMedia(featured)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openMedia(featured);
                  }}
                  className="group relative w-full aspect-[4/5] sm:aspect-[16/9] max-h-[580px] overflow-hidden rounded-xl bg-[#0D0D0F] cursor-pointer"
                >
                  {featured.previewUrl ? (
                    <img
                      src={featured.previewUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1A1A1D] to-black" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 flex flex-col items-start gap-4">
                    <div className="space-y-1 max-w-xl">
                      {featured.artist_name && (
                        <p className="text-[13px] text-white/70">{featured.artist_name}</p>
                      )}
                      <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl tracking-tight text-white leading-tight">
                        {featured.title}
                      </h1>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMedia(featured);
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-white text-black px-5 py-2.5 text-[13px] font-medium transition-opacity hover:opacity-90"
                    >
                      {!featured.allowed ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{getAccessLabel(featured, isEn) || (isEn ? 'Members' : 'Membres')}</span>
                        </>
                      ) : featured.media_type === 'video' ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isEn ? 'Watch' : 'Regarder'}</span>
                        </>
                      ) : (
                        <span>{isEn ? 'Discover' : 'Découvrir'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* BALLON */}
            {(section === 'featured' || section === 'ballon') && ballonItems.length > 0 && (
              <section className="space-y-5">
                <h2 className="font-agrandir-semibold text-lg sm:text-xl tracking-tight text-white">
                  Ballon
                </h2>

                <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
                  {ballonItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openMedia(item)}
                      className="group shrink-0 w-[64vw] sm:w-[240px] text-left"
                    >
                      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#111113]">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#161618]" />
                        )}
                        {!item.allowed && (
                          <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-white/85" />
                          </span>
                        )}
                        {item.allowed && item.media_type === 'video' && (
                          <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center">
                            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[14px] font-medium text-white truncate">
                        {item.title}
                      </p>
                      {(item.artist_name || item.duration) && (
                        <p className="mt-0.5 text-[12px] text-white/50 truncate">
                          {[item.artist_name, item.duration].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* SESSIONS STUDIO */}
            {(section === 'featured' || section === 'studio') && studioItems.length > 0 && (
              <section className="space-y-5">
                <h2 className="font-agrandir-semibold text-lg sm:text-xl tracking-tight text-white">
                  {isEn ? 'Studio Sessions' : 'Sessions Studio'}
                </h2>

                <div className="flex gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-2 -mx-5 px-5 sm:mx-0 sm:px-0">
                  {studioItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => openMedia(item)}
                      className="group shrink-0 w-[56vw] sm:w-[220px] text-left"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg bg-[#111113]">
                        {item.previewUrl ? (
                          <img
                            src={item.previewUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="w-full h-full bg-[#161618]" />
                        )}
                        {!item.allowed ? (
                          <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
                            <Lock className="w-3.5 h-3.5 text-white/85" />
                          </span>
                        ) : (
                          <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center opacity-95 group-hover:scale-105 transition-transform">
                            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 text-[14px] font-medium text-white truncate">
                        {item.title}
                      </p>
                      {(item.artist_name || item.duration) && (
                        <p className="mt-0.5 text-[12px] text-white/50 truncate">
                          {[item.artist_name, item.duration].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* EXCLUSIVITÉS & COLLECTIONS */}
            {(section === 'featured' || section === 'exclusives') &&
              (collectionsWithMedia.length > 0 || uncollectedExclusives.length > 0) && (
                <div className="space-y-12">
                  {collectionsWithMedia.map((col) => (
                    <section key={col.id} className="space-y-5">
                      <h2 className="font-agrandir-semibold text-lg sm:text-xl tracking-tight text-white">
                        {col.title}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
                        {col.items.map((item) => (
                          <MediaWideTile key={item.id} item={item} onOpen={openMedia} />
                        ))}
                      </div>
                    </section>
                  ))}

                  {uncollectedExclusives.length > 0 && (
                    <section className="space-y-5">
                      <h2 className="font-agrandir-semibold text-lg sm:text-xl tracking-tight text-white">
                        {isEn ? 'Exclusives' : 'Exclusivités'}
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-8">
                        {uncollectedExclusives.map((item) => (
                          <MediaWideTile key={item.id} item={item} onOpen={openMedia} />
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

            {/* Empty filtered tab */}
            {((section === 'ballon' && ballonItems.length === 0) ||
              (section === 'studio' && studioItems.length === 0) ||
              (section === 'exclusives' && exclusiveItems.length === 0)) && (
              <div className="py-24 text-center">
                <p className="text-[15px] text-white/50">
                  {isEn ? 'Nothing published here yet.' : 'Aucun contenu disponible ici pour le moment.'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* LECTEUR PLEIN ÉCRAN NOIR PUR */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col"
          >
            <div className="flex items-center justify-between px-5 sm:px-8 py-4">
              <div className="min-w-0 pr-4">
                <p className="text-[15px] font-medium text-white truncate">{selected.title}</p>
                {selected.artist_name && (
                  <p className="text-[12px] text-white/50 truncate">{selected.artist_name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={isEn ? 'Close' : 'Fermer'}
                className="shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center px-3 sm:px-10 pb-8">
              {selected.media_type === 'video' ? (
                selected.sourceUrl ? (
                  isDirectVideoUrl(selected.sourceUrl) ? (
                    <video
                      src={selected.sourceUrl}
                      poster={selected.previewUrl || undefined}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[82vh] max-w-full w-full sm:w-auto rounded-lg bg-black"
                    />
                  ) : (
                    <div className="w-full max-w-5xl aspect-video rounded-lg overflow-hidden bg-black">
                      <iframe
                        src={embedUrl}
                        title={selected.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                        allowFullScreen
                        className="w-full h-full border-0"
                      />
                    </div>
                  )
                ) : (
                  <p className="text-sm text-white/50">
                    {isEn ? 'Video unavailable.' : 'Vidéo indisponible.'}
                  </p>
                )
              ) : selected.sourceUrl || selected.previewUrl ? (
                <img
                  src={selected.sourceUrl || selected.previewUrl}
                  alt={selected.title}
                  className="max-h-[84vh] max-w-full object-contain"
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MediaWideTile: React.FC<{
  item: DisplayMedia;
  onOpen: (item: DisplayMedia) => void;
}> = ({ item, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(item)}
    className="group w-full text-left"
  >
    <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-[#111113]">
      {item.previewUrl ? (
        <img
          src={item.previewUrl}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full bg-[#161618]" />
      )}
      {!item.allowed ? (
        <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-white/85" />
        </span>
      ) : item.media_type === 'video' ? (
        <span className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center">
          <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
        </span>
      ) : null}
    </div>

    <div className="mt-2.5 flex items-baseline justify-between gap-3">
      <p className="text-[14px] font-medium text-white truncate">{item.title}</p>
      {item.duration && (
        <span className="shrink-0 text-[12px] text-white/45 tabular-nums">{item.duration}</span>
      )}
    </div>
    {item.artist_name && (
      <p className="mt-0.5 text-[12px] text-white/50 truncate">{item.artist_name}</p>
    )}
  </button>
);
