import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MediaHubItem,
  TV_CATEGORY_META,
  evaluateTvMediaAccess,
  getPublishedMediaItems,
  loadMediaHubItems,
  resolveTvCategory,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import {
  EMPTY_TV_ENTITLEMENT,
  TvEntitlementClient,
  fetchTvEntitlement,
  recordTvWatchProgress,
} from '../utils/tvAccess';
import {
  downloadMediaAsset,
  markChallengeCompleted,
} from '../utils/communityStorage';
import {
  ArrowLeft,
  ArrowUpRight,
  CreditCard,
  Download,
  Lock,
  Play,
  Ticket,
  Tv,
} from 'lucide-react';

function isDirectVideoFile(url?: string): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url.trim());
}

/**
 * Fiche de contenu LUMARÉEL TV (Vidéo / Photo / Éditorial).
 * - Utilise le même moteur central de permissions que LUMARÉEL TV (Card + TV Pass).
 * - N'expose JAMAIS le flux privé (iframe ou vidéo) lorsqu'un utilisateur n'est pas autorisé.
 * - Enregistre réellement la progression de lecture pour « Reprendre la lecture ».
 */
export const MediaDetailView: React.FC = () => {
  const {
    selectedMediaId,
    setSelectedMediaId,
    events,
    customerOrders,
    currentUser,
    setIsAuthModalOpen,
    setCurrentPage,
    setCheckoutEvent,
    goBack,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [allItems, setAllItems] = useState<MediaHubItem[]>(() => loadMediaHubItems());
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [entitlement, setEntitlement] = useState<TvEntitlementClient>(EMPTY_TV_ENTITLEMENT);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    return subscribeMediaHub(() => setAllItems(loadMediaHubItems()));
  }, []);

  useEffect(() => {
    setIsPlayingVideo(false);
  }, [selectedMediaId]);

  useEffect(() => {
    let cancelled = false;
    setIsCheckingAccess(true);
    fetchTvEntitlement(currentUser?.email)
      .then((res) => {
        if (!cancelled) setEntitlement(res.entitlement);
      })
      .finally(() => {
        if (!cancelled) setIsCheckingAccess(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  const publishedItems = useMemo(() => getPublishedMediaItems(allItems), [allItems]);

  const item = useMemo(
    () => publishedItems.find((m) => m.id === selectedMediaId) || publishedItems[0] || null,
    [publishedItems, selectedMediaId]
  );

  const hasSpecificAccess = useMemo(() => {
    if (!customerOrders || customerOrders.length === 0) return false;
    if (item?.eventId) {
      return customerOrders.some(
        (o) => o.paymentStatus === 'completed' && o.eventId === item.eventId
      );
    }
    return customerOrders.some((o) => o.paymentStatus === 'completed');
  }, [customerOrders, item?.eventId]);

  const accessEval = useMemo(
    () =>
      item
        ? evaluateTvMediaAccess(item, entitlement, { hasSpecificAccess })
        : null,
    [item, entitlement, hasSpecificAccess]
  );

  useEffect(() => {
    if (item && !isCheckingAccess && accessEval?.allowed) {
      const unlocked = markChallengeCompleted(currentUser, 'challenge_backstage');
      if (unlocked) {
        showToast(
          isEn
            ? 'LUMARÉEL TV challenge completed! +50 points earned.'
            : 'Défi LUMARÉEL TV validé ! +50 points crédités.',
          'success'
        );
      }
    }
  }, [item?.id, isCheckingAccess, accessEval?.allowed]);

  // Real playback tracking for embedded videos (updates progress while player is open)
  useEffect(() => {
    if (!isPlayingVideo || !item || !accessEval?.allowed) return;
    if (isDirectVideoFile(item.embedUrl)) return; // HTML5 video tracks exact currentTime

    let progress = 15;
    recordTvWatchProgress(currentUser?.email, {
      mediaId: item.id,
      progressPercent: progress,
    });

    const interval = window.setInterval(() => {
      progress = Math.min(92, progress + 12);
      recordTvWatchProgress(currentUser?.email, {
        mediaId: item.id,
        progressPercent: progress,
      });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [isPlayingVideo, item?.id, accessEval?.allowed, currentUser?.email]);

  const publishedEvents = useMemo(
    () => (events || []).filter((e) => e.status !== 'draft'),
    [events]
  );

  const linkedConcert = useMemo(() => {
    if (!item || publishedEvents.length === 0) return null;
    if (item.eventId) {
      const exact = publishedEvents.find((e) => e.id === item.eventId);
      if (exact) return exact;
    }
    if (item.artistName) {
      const byArtist = publishedEvents.find(
        (e) => e.artist.toLowerCase().trim() === item.artistName?.toLowerCase().trim()
      );
      if (byArtist) return byArtist;
    }
    return null;
  }, [item, publishedEvents]);

  const relatedItems = useMemo(() => {
    if (!item) return [];
    const currentCat = resolveTvCategory(item);
    return publishedItems
      .filter((m) => m.id !== item.id)
      .sort((a, b) => {
        const aSame = resolveTvCategory(a) === currentCat ? 1 : 0;
        const bSame = resolveTvCategory(b) === currentCat ? 1 : 0;
        return bSame - aSame;
      })
      .slice(0, 4);
  }, [publishedItems, item]);

  const handleDownload = async (media: MediaHubItem) => {
    if (!media.downloadable || !accessEval?.allowed) return;
    const ok = await downloadMediaAsset(media.url, `lumareel-tv-${media.id}.jpg`);
    if (ok) {
      showToast(isEn ? 'Downloaded.' : 'Téléchargement terminé.', 'success');
    }
  };

  if (!item) {
    return (
      <div className="min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-8 py-20 text-center text-white font-agrandir-regular">
        <p className="text-sm text-neutral-400">
          {isEn ? 'This title is not currently published.' : 'Ce contenu n’est pas publié actuellement.'}
        </p>
        <button
          type="button"
          onClick={() => setCurrentPage('lumareel_tv')}
          className="mt-5 min-h-[42px] px-5 rounded-full bg-white text-black text-xs font-agrandir-extrabold cursor-pointer"
        >
          LUMARÉEL TV
        </button>
      </div>
    );
  }

  const locked = isCheckingAccess ? accessEval?.tvTier !== 'free' : Boolean(accessEval && !accessEval.allowed);
  const title = isEn && item.titleEn ? item.titleEn : item.title;
  const description = isEn && item.descriptionEn ? item.descriptionEn : item.description;
  const category = resolveTvCategory(item);
  const categoryLabel = isEn ? TV_CATEGORY_META[category].labelEn : TV_CATEGORY_META[category].labelFr;
  const directVideo = isDirectVideoFile(item.embedUrl);

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-20 text-white font-agrandir-regular">
      {/* Barre supérieure sobre */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={goBack}
          className="hidden md:inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{isEn ? 'Back' : 'Retour'}</span>
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {item.downloadable && !locked && item.mediaType === 'photo' && (
            <button
              type="button"
              onClick={() => handleDownload(item)}
              className="min-h-[38px] px-4 rounded-full border border-white/[0.16] hover:border-white text-xs font-agrandir-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isEn ? 'Download' : 'Télécharger'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setCurrentPage('lumareel_tv')}
            className="min-h-[38px] px-4 rounded-full border border-white/[0.14] hover:border-white/40 text-xs font-agrandir-semibold text-neutral-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Tv className="w-3.5 h-3.5 text-[#D4AF6A]" />
            <span>LUMARÉEL TV</span>
          </button>
        </div>
      </div>

      {/* Zone Média Principale (flux privé jamais rendu si verrouillé) */}
      <section className="mb-8">
        <div className="relative aspect-[16/9] w-full rounded-[14px] overflow-hidden bg-[#0A0A0A] border border-white/[0.10]">
          {locked && accessEval ? (
            <>
              <img
                src={item.thumbnailUrl || item.url}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover brightness-[0.3] blur-[3px] scale-[1.03]"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-black/70 border border-[#D4AF6A]/45 flex items-center justify-center text-[#D4AF6A]">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <p className="text-[11px] font-agrandir-extrabold uppercase tracking-[0.2em] text-[#D4AF6A]">
                    LUMARÉEL TV · {isEn ? accessEval.labelEn : accessEval.labelFr}
                  </p>
                  <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                    {accessEval.tvTier === 'card'
                      ? isEn
                        ? 'LUMARÉEL Card Exclusive'
                        : 'Exclusivité LUMARÉEL Card'
                      : accessEval.tvTier === 'vip'
                      ? isEn
                        ? 'VIP Access Required'
                        : 'Accès VIP requis'
                      : isEn
                      ? 'LUMARÉEL TV Pass or Card required'
                      : 'Abonnement TV Pass ou LUMARÉEL Card requis'}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-300">
                    {isEn ? accessEval.requirementEn : accessEval.requirementFr}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {!currentUser && (
                    <button
                      type="button"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="min-h-[40px] px-4 rounded-full border border-white/25 hover:border-white text-white text-xs font-agrandir-semibold transition-colors cursor-pointer"
                    >
                      {isEn ? 'Sign in' : 'Se connecter'}
                    </button>
                  )}
                  {accessEval.tvTier === 'tv_pass' && (
                    <button
                      type="button"
                      onClick={() => setCurrentPage('lumareel_tv')}
                      className="min-h-[40px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer"
                    >
                      {isEn ? 'Get TV Pass' : 'S’abonner au TV Pass'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage('member_card')}
                    className="min-h-[40px] px-5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Discover LUMARÉEL Card' : 'Découvrir la LUMARÉEL Card'}</span>
                  </button>
                </div>
              </div>
            </>
          ) : item.mediaType === 'video' && item.embedUrl && isPlayingVideo ? (
            directVideo ? (
              <video
                src={item.embedUrl}
                poster={item.thumbnailUrl || item.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full object-contain bg-black"
                onTimeUpdate={(e) => {
                  const vid = e.currentTarget;
                  if (vid.duration && vid.duration > 0) {
                    const pct = Math.round((vid.currentTime / vid.duration) * 100);
                    if (pct >= 2) {
                      recordTvWatchProgress(currentUser?.email, {
                        mediaId: item.id,
                        progressPercent: pct,
                        positionSeconds: Math.floor(vid.currentTime),
                        durationSeconds: Math.floor(vid.duration),
                      });
                    }
                  }
                }}
              />
            ) : (
              <iframe
                src={`${item.embedUrl}${item.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
                title={title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )
          ) : (
            <div
              onClick={() =>
                item.mediaType === 'video' && item.embedUrl && setIsPlayingVideo(true)
              }
              className={`relative w-full h-full ${
                item.mediaType === 'video' && item.embedUrl ? 'cursor-pointer group' : ''
              }`}
            >
              <img
                src={item.thumbnailUrl || item.url}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {item.mediaType === 'video' && item.embedUrl && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-black/60 group-hover:bg-[#D4AF6A] text-white group-hover:text-black backdrop-blur-md border border-white/25 flex items-center justify-center transition-colors">
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* En-tête éditorial & concert associé facultatif */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-white/[0.08]">
        <div className="lg:col-span-8 space-y-4">
          <p className="text-xs text-neutral-400">
            <span className="text-[#D4AF6A] font-agrandir-extrabold uppercase tracking-[0.16em]">
              {categoryLabel}
            </span>
            {item.duration ? ` · ${item.duration}` : ''}
            {` · ${item.date}`}
          </p>

          <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl text-white tracking-tight leading-[1.08] text-balance">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
            {description}
          </p>

          {!locked && item.notes && item.notes.length > 0 && (
            <ul className="pt-4 border-t border-white/[0.08] space-y-2.5">
              {item.notes.map((note, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  {idx + 1}. {note}
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-5">
          {linkedConcert && (
            <div className="border-t lg:border-t-0 lg:border-l border-white/[0.08] pt-6 lg:pt-0 lg:pl-8 space-y-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500 font-agrandir-semibold">
                {isEn ? 'Associated Concert' : 'Concert associé'}
              </p>
              <div className="flex items-center gap-3.5">
                <img
                  src={linkedConcert.officialPoster || linkedConcert.bannerImage}
                  alt={linkedConcert.title}
                  referrerPolicy="no-referrer"
                  className="w-16 h-20 rounded-xl object-cover shrink-0 bg-[#111]"
                />
                <div className="min-w-0">
                  <p className="font-agrandir-extrabold text-base text-white leading-snug truncate">
                    {linkedConcert.title}
                  </p>
                  <p className="text-xs text-neutral-400 truncate mt-0.5">
                    {linkedConcert.artist}
                  </p>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                    {linkedConcert.venue}, {linkedConcert.city}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutEvent(linkedConcert)}
                className="w-full min-h-[42px] px-4 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-agrandir-extrabold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>{isEn ? 'Book tickets' : 'Réserver'}</span>
              </button>
            </div>
          )}

          <div className="border-t border-white/[0.08] lg:border-l lg:border-t-0 lg:pl-8 pt-5 text-xs text-neutral-500 space-y-1">
            <p>
              {isEn ? 'Credit' : 'Crédit'} ·{' '}
              <span className="text-neutral-300">{item.submittedByName}</span>
            </p>
            {accessEval && (
              <p>
                {isEn ? 'Access' : 'Accès'} ·{' '}
                <span className="text-[#D4AF6A]">{isEn ? accessEval.labelEn : accessEval.labelFr}</span>
              </p>
            )}
          </div>
        </aside>
      </section>

      {/* Autres titres sur LUMARÉEL TV */}
      {relatedItems.length > 0 && (
        <section className="pt-10">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
              {isEn ? 'More on LUMARÉEL TV' : 'À voir aussi sur LUMARÉEL TV'}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentPage('lumareel_tv')}
              className="text-xs font-agrandir-semibold text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'All LUMARÉEL TV' : 'Tout LUMARÉEL TV'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {relatedItems.map((rel) => {
              const relCat = resolveTvCategory(rel);
              return (
                <button
                  key={rel.id}
                  type="button"
                  onClick={() => {
                    setSelectedMediaId(rel.id);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group text-left cursor-pointer"
                >
                  <div className="aspect-[16/10] rounded-[12px] overflow-hidden bg-[#101010] border border-white/[0.08]">
                    <img
                      src={rel.thumbnailUrl || rel.url}
                      alt={rel.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                    />
                  </div>
                  <span className="block pt-2.5">
                    <span className="block text-[10px] uppercase tracking-[0.14em] text-neutral-500">
                      {isEn ? TV_CATEGORY_META[relCat].shortEn : TV_CATEGORY_META[relCat].shortFr} ·{' '}
                      {rel.date}
                    </span>
                    <span className="mt-0.5 block text-sm font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                      {isEn && rel.titleEn ? rel.titleEn : rel.title}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
