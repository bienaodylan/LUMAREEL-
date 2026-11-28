import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { convertToYouTubeEmbed } from '../utils/mediaUtils';
import { ArrowLeft, Lock, Play, X } from 'lucide-react';

import ballonPitchImg from '../assets/images/backstage_ballon_pitch_1795857143980.jpg';
import dressingRoomImg from '../assets/images/backstage_artist_dressing_1795857144421.jpg';
import studioBoothImg from '../assets/images/backstage_studio_booth_1795857146499.jpg';
import stageBeamsImg from '../assets/images/backstage_stage_beams_1795857146120.jpg';
import soundcheckImg from '../assets/images/backstage_soundcheck_1795735706175.jpg';
import studioSessionImg from '../assets/images/backstage_studio_session_1795735706831.jpg';
import crowdMemoriesImg from '../assets/images/concert_memories_crowd_1795735706315.jpg';
import vipLoungeImg from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';
import vipMezzanineImg from '../assets/images/black_card_vip_mezzanine_1794694903429.jpg';
import nightBackstageImg from '../assets/images/black_card_hero_night_tall_1794694902515.jpg';

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

const PREVIEW_BACKSTAGE_ITEMS: DisplayMedia[] = [
  {
    id: 'demo-bs-hero',
    collection_id: null,
    title: '5 minutes avant la scène',
    description: 'Dans la loge avant l’ouverture des portes à l’Esplanade.',
    category: 'exclusives',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Jeune Lion · Loges',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: true,
    published_at: '2026-11-24T19:00:00Z',
    sourceUrl: dressingRoomImg,
    previewUrl: dressingRoomImg,
    allowed: true,
  },
  {
    id: 'demo-bs-ballon-1',
    collection_id: null,
    title: 'Match des Artistes · Cocody',
    description: 'Tournoi 5 contre 5 avant les fêtes avec tout le crew.',
    category: 'ballon',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: '04:12',
    artist_name: 'LUMARÉEL Crew',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: true,
    published_at: '2026-11-22T17:00:00Z',
    sourceUrl: ballonPitchImg,
    previewUrl: ballonPitchImg,
    allowed: true,
  },
  {
    id: 'demo-bs-ballon-2',
    collection_id: null,
    title: 'Échauffement avant la finale',
    description: 'Ambiance terrain et rires entre les balances.',
    category: 'ballon',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Wantché & Friends',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-20T16:30:00Z',
    sourceUrl: crowdMemoriesImg,
    previewUrl: crowdMemoriesImg,
    allowed: true,
  },
  {
    id: 'demo-bs-ballon-3',
    collection_id: null,
    title: 'Tirs au but · Coucher de soleil',
    description: 'Dernière séance de tirs au but sur le terrain de quartier.',
    category: 'ballon',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: '02:45',
    artist_name: 'Édition Novembre',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-18T18:00:00Z',
    sourceUrl: nightBackstageImg,
    previewUrl: nightBackstageImg,
    allowed: true,
  },
  {
    id: 'demo-bs-ballon-4',
    collection_id: null,
    title: 'Vestiaire d’après-match',
    description: 'Débrief et playlists dans les coulisses.',
    category: 'ballon',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Club Privé',
    event_id: null,
    access_tier: 'card',
    access_note: 'LUMARÉEL Black Card',
    is_featured: false,
    published_at: '2026-11-16T18:00:00Z',
    sourceUrl: vipMezzanineImg,
    previewUrl: vipMezzanineImg,
    allowed: false,
  },
  {
    id: 'demo-bs-studio-1',
    collection_id: null,
    title: 'Session Acoustique #04',
    description: 'Prise live une seule traite au studio de Treichville.',
    category: 'session_studio',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: '06:18',
    artist_name: 'Jamsco',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: true,
    published_at: '2026-11-23T21:00:00Z',
    sourceUrl: studioBoothImg,
    previewUrl: studioBoothImg,
    allowed: true,
  },
  {
    id: 'demo-bs-studio-2',
    collection_id: null,
    title: 'Freestyle de minuit',
    description: 'Captation brute autour de la console analogique.',
    category: 'session_studio',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: '03:50',
    artist_name: 'Tiakola · Studio',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-21T23:00:00Z',
    sourceUrl: studioSessionImg,
    previewUrl: studioSessionImg,
    allowed: true,
  },
  {
    id: 'demo-bs-studio-3',
    collection_id: null,
    title: 'Arrangements Live Band',
    description: 'Répétition des cuivres et percussions avant la tournée.',
    category: 'session_studio',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: '05:04',
    artist_name: 'Wantché',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-19T20:00:00Z',
    sourceUrl: soundcheckImg,
    previewUrl: soundcheckImg,
    allowed: true,
  },
  {
    id: 'demo-bs-studio-4',
    collection_id: null,
    title: 'Mixage final · Inédit',
    description: 'Extrait réservé aux détenteurs de la Black Card.',
    category: 'session_studio',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: '04:30',
    artist_name: 'Jeune Lion',
    event_id: null,
    access_tier: 'card',
    access_note: 'LUMARÉEL Black Card',
    is_featured: false,
    published_at: '2026-11-17T20:00:00Z',
    sourceUrl: stageBeamsImg,
    previewUrl: stageBeamsImg,
    allowed: false,
  },
  {
    id: 'demo-bs-excl-1',
    collection_id: null,
    title: 'Balance son · 2h avant les portes',
    description: 'Vue depuis les retours scène pendant le réglage lumières.',
    category: 'exclusives',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Palais de la Culture',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-23T15:00:00Z',
    sourceUrl: stageBeamsImg,
    previewUrl: stageBeamsImg,
    allowed: true,
  },
  {
    id: 'demo-bs-excl-2',
    collection_id: null,
    title: 'Salle vide avant le show',
    description: 'Le calme absolu juste avant l’arrivée de 5 000 personnes.',
    category: 'exclusives',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Esplanade · Abidjan',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-21T14:00:00Z',
    sourceUrl: vipLoungeImg,
    previewUrl: vipLoungeImg,
    allowed: true,
  },
  {
    id: 'demo-bs-excl-3',
    collection_id: null,
    title: 'Soundcheck de nuit',
    description: 'Tests micro et scénographie lumière en noir et blanc.',
    category: 'exclusives',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Équipe Technique',
    event_id: null,
    access_tier: 'free',
    access_note: null,
    is_featured: false,
    published_at: '2026-11-19T22:00:00Z',
    sourceUrl: soundcheckImg,
    previewUrl: soundcheckImg,
    allowed: true,
  },
  {
    id: 'demo-bs-excl-4',
    collection_id: null,
    title: 'After-show · Salon VIP',
    description: 'Rencontre privée réservée aux membres Black Card.',
    category: 'exclusives',
    media_type: 'image',
    storage_path: null,
    thumbnail_path: null,
    external_url: null,
    duration: null,
    artist_name: 'Accès Privé',
    event_id: null,
    access_tier: 'card',
    access_note: 'LUMARÉEL Black Card',
    is_featured: false,
    published_at: '2026-11-15T23:30:00Z',
    sourceUrl: vipMezzanineImg,
    previewUrl: vipMezzanineImg,
    allowed: false,
  },
];

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
            (item.media_type === 'image' && allowed
              ? storage?.data?.signedUrl || item.external_url || ''
              : '');

          return { ...item, sourceUrl, previewUrl, allowed };
        })
      );

      setItems(mapped);
      setCollections(collectionResult.data || []);
    } catch {
      // Fall back silently to preview content if Supabase table isn't populated yet
      setItems([]);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const effectiveItems = useMemo(
    () => (items.length > 0 ? items : PREVIEW_BACKSTAGE_ITEMS),
    [items]
  );

  const ballonItems = useMemo(
    () => effectiveItems.filter((item) => item.category === 'ballon'),
    [effectiveItems]
  );

  const studioItems = useMemo(
    () => effectiveItems.filter((item) => item.category === 'session_studio'),
    [effectiveItems]
  );

  const exclusiveItems = useMemo(
    () =>
      effectiveItems.filter(
        (item) => item.category !== 'ballon' && item.category !== 'session_studio'
      ),
    [effectiveItems]
  );

  const featured = useMemo(() => {
    if (section === 'ballon') return ballonItems.find((i) => i.is_featured) || ballonItems[0] || null;
    if (section === 'studio') return studioItems.find((i) => i.is_featured) || studioItems[0] || null;
    if (section === 'exclusives')
      return exclusiveItems.find((i) => i.is_featured) || exclusiveItems[0] || null;
    return effectiveItems.find((i) => i.is_featured) || effectiveItems[0] || null;
  }, [section, effectiveItems, ballonItems, studioItems, exclusiveItems]);

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
    return exclusiveItems.filter(
      (item) => !collectedIds.has(item.id) && item.id !== featured?.id
    );
  }, [exclusiveItems, collectionsWithMedia, featured?.id]);

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
    <div className="min-h-screen bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white pb-28 md:pb-16 transition-colors duration-200">
      {/* Top minimal bar */}
      <header className="sticky top-0 z-30 bg-[#FBFBFD]/88 dark:bg-black/84 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="mx-auto max-w-[1160px] px-3.5 sm:px-6 pt-3.5 pb-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={goBack}
              aria-label={isEn ? 'Back' : 'Retour'}
              className="md:hidden shrink-0 w-9 h-9 -ml-1.5 flex items-center justify-center rounded-full text-black/75 hover:text-black dark:text-white/80 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-agrandir-semibold text-base sm:text-lg tracking-tight text-[#111111] dark:text-white">
              Backstage
            </span>
          </div>

          <nav
            aria-label="Backstage"
            className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar"
          >
            {navItems.map((tab) => {
              const active = section === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSection(tab.id)}
                  className={`relative whitespace-nowrap py-1 text-[13px] sm:text-[14px] transition-colors cursor-pointer ${
                    active
                      ? 'text-[#111111] dark:text-white font-medium'
                      : 'text-black/45 hover:text-black/80 dark:text-white/45 dark:hover:text-white/80'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.span
                      layoutId="backstage-nav-underline"
                      className="absolute left-0 right-0 -bottom-0.5 h-[1.5px] bg-[#111111] dark:bg-white"
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1160px] px-3.5 sm:px-6 pt-3 sm:pt-5">
        {error && <p className="mb-4 text-sm text-black/55 dark:text-white/55">{error}</p>}

        {loading ? (
          <div className="space-y-6">
            <div className="w-full aspect-square sm:aspect-[16/9] max-h-[460px] rounded-[22px] bg-black/[0.06] dark:bg-white/[0.06] animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-[18px] bg-black/[0.05] dark:bg-white/[0.05] animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* À LA UNE HERO — Carré arrondi sur mobile, cinématique arrondi sur desktop */}
            {featured && (
              <section>
                <div
                  onClick={() => openMedia(featured)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') openMedia(featured);
                  }}
                  className="group relative w-full aspect-square sm:aspect-[16/9] max-h-[480px] overflow-hidden rounded-[22px] bg-[#0D0D0F] cursor-pointer"
                >
                  {featured.previewUrl ? (
                    <img
                      src={featured.previewUrl}
                      alt={featured.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1A1A1D] to-black" />
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />

                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 flex flex-col items-start gap-3">
                    <div className="space-y-0.5 max-w-xl">
                      {featured.artist_name && (
                        <p className="text-[12px] text-white/75">{featured.artist_name}</p>
                      )}
                      <h1 className="font-agrandir-extrabold text-xl sm:text-3xl tracking-tight text-white leading-tight">
                        {featured.title}
                      </h1>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openMedia(featured);
                      }}
                      className="inline-flex items-center gap-2 rounded-full bg-white text-black px-4 py-2 text-[12px] font-medium transition-opacity hover:opacity-90 cursor-pointer"
                    >
                      {!featured.allowed ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>
                            {getAccessLabel(featured, isEn) || (isEn ? 'Members' : 'Membres')}
                          </span>
                        </>
                      ) : featured.media_type === 'video' ? (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isEn ? 'Watch' : 'Regarder'}</span>
                        </>
                      ) : (
                        <span>{isEn ? 'Open' : 'Voir'}</span>
                      )}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* BALLON — Images carrées arrondies, espacement serré */}
            {(section === 'featured' || section === 'ballon') && ballonItems.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="font-agrandir-semibold text-[16px] sm:text-lg tracking-tight text-[#111111] dark:text-white">
                  Ballon
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                  {ballonItems.map((item) => (
                    <SquareMediaTile key={item.id} item={item} onOpen={openMedia} />
                  ))}
                </div>
              </section>
            )}

            {/* SESSIONS STUDIO — Images carrées arrondies, espacement serré */}
            {(section === 'featured' || section === 'studio') && studioItems.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="font-agrandir-semibold text-[16px] sm:text-lg tracking-tight text-[#111111] dark:text-white">
                  {isEn ? 'Studio Sessions' : 'Sessions Studio'}
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
                  {studioItems.map((item) => (
                    <SquareMediaTile
                      key={item.id}
                      item={item}
                      onOpen={openMedia}
                      showPlayBadge
                    />
                  ))}
                </div>
              </section>
            )}

            {/* EXCLUSIVITÉS & COLLECTIONS — Grille carrée arrondie et serrée */}
            {(section === 'featured' || section === 'exclusives') &&
              (collectionsWithMedia.length > 0 || uncollectedExclusives.length > 0) && (
                <div className="space-y-6 sm:space-y-8">
                  {collectionsWithMedia.map((col) => (
                    <section key={col.id} className="space-y-2.5">
                      <h2 className="font-agrandir-semibold text-[16px] sm:text-lg tracking-tight text-[#111111] dark:text-white">
                        {col.title}
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {col.items.map((item) => (
                          <SquareMediaTile key={item.id} item={item} onOpen={openMedia} />
                        ))}
                      </div>
                    </section>
                  ))}

                  {uncollectedExclusives.length > 0 && (
                    <section className="space-y-2.5">
                      <h2 className="font-agrandir-semibold text-[16px] sm:text-lg tracking-tight text-[#111111] dark:text-white">
                        {isEn ? 'Exclusives' : 'Exclusivités'}
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                        {uncollectedExclusives.map((item) => (
                          <SquareMediaTile key={item.id} item={item} onOpen={openMedia} />
                        ))}
                      </div>
                    </section>
                  )}
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
                  <p className="text-[12px] text-white/55 truncate">{selected.artist_name}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={isEn ? 'Close' : 'Fermer'}
                className="shrink-0 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-10 pb-8 gap-4">
              {selected.media_type === 'video' ? (
                selected.sourceUrl ? (
                  isDirectVideoUrl(selected.sourceUrl) ? (
                    <video
                      src={selected.sourceUrl}
                      poster={selected.previewUrl || undefined}
                      controls
                      autoPlay
                      playsInline
                      className="max-h-[82vh] max-w-full w-full sm:w-auto rounded-2xl bg-black"
                    />
                  ) : (
                    <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black">
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
                <>
                  <img
                    src={selected.sourceUrl || selected.previewUrl}
                    alt={selected.title}
                    referrerPolicy="no-referrer"
                    className="max-h-[76vh] max-w-full rounded-2xl object-contain"
                  />
                  {selected.description && (
                    <p className="text-[13px] text-white/65 text-center max-w-md px-3">
                      {selected.description}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SquareMediaTile: React.FC<{
  item: DisplayMedia;
  onOpen: (item: DisplayMedia) => void;
  showPlayBadge?: boolean;
}> = ({ item, onOpen, showPlayBadge = false }) => (
  <button
    type="button"
    onClick={() => onOpen(item)}
    className="group w-full text-left cursor-pointer"
  >
    <div className="relative aspect-square overflow-hidden rounded-[18px] bg-black/[0.06] dark:bg-[#111113]">
      {item.previewUrl ? (
        <img
          src={item.previewUrl}
          alt={item.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full bg-black/[0.05] dark:bg-[#161618]" />
      )}
      {!item.allowed ? (
        <span className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-white/90" />
        </span>
      ) : showPlayBadge || item.media_type === 'video' ? (
        <span className="absolute bottom-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 text-black flex items-center justify-center shadow-md transition-transform group-hover:scale-105">
          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
        </span>
      ) : null}
    </div>

    <p className="mt-1.5 text-[13px] font-medium text-[#111111] dark:text-white truncate leading-snug">
      {item.title}
    </p>
    {(item.artist_name || item.duration) && (
      <p className="text-[11px] text-black/50 dark:text-white/50 truncate">
        {[item.artist_name, item.duration].filter(Boolean).join(' · ')}
      </p>
    )}
  </button>
);
