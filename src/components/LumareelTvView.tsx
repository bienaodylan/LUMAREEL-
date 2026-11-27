import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  MediaHubItem,
  TV_CATEGORY_META,
  TvContentCategory,
  evaluateTvMediaAccess,
  getPublishedMediaItems,
  loadMediaHubItems,
  resolveTvCategory,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import {
  EMPTY_TV_ENTITLEMENT,
  TvEntitlementClient,
  TvPassPlanClient,
  TvWatchProgressEntry,
  fetchTvEntitlement,
  fetchTvPlans,
  loadTvWatchHistory,
  removeTvWatchProgress,
  subscribeTvWatchHistory,
} from '../utils/tvAccess';
import { BottomSheet, EditorialRow, ScrollReveal, SkeletonBlock, StatusBadge } from './ui/LumareelKit';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Info,
  Lock,
  Play,
  ShieldCheck,
  Tv,
  X,
} from 'lucide-react';

const CATEGORY_ORDER: TvContentCategory[] = [
  'originals',
  'concerts_live',
  'backstage',
  'interviews',
  'retrospectives',
];

function formatDateShort(iso?: string, isEn?: boolean): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatPrice(price: number, currency: string): string {
  return `${price.toLocaleString('fr-FR')} ${currency || 'FCFA'}`;
}

interface HorizontalShelfProps {
  kicker?: string;
  title: string;
  items: MediaHubItem[];
  entitlement: TvEntitlementClient;
  hasSpecificAccess: boolean;
  isEn: boolean;
  onOpenItem: (item: MediaHubItem) => void;
  progressById?: Record<string, TvWatchProgressEntry>;
  onRemoveProgress?: (mediaId: string) => void;
}

const TvHorizontalShelf: React.FC<HorizontalShelfProps> = ({
  kicker,
  title,
  items,
  entitlement,
  hasSpecificAccess,
  isEn,
  onOpenItem,
  progressById,
  onRemoveProgress,
}) => {
  const railRef = useRef<HTMLDivElement>(null);

  if (items.length === 0) return null;

  const scrollRail = (dir: 'left' | 'right') => {
    const el = railRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.78);
    el.scrollBy({ left: dir === 'right' ? delta : -delta, behavior: 'smooth' });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          {kicker && (
            <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
              {kicker}
            </p>
          )}
          <h2 className="mt-0.5 font-agrandir-extrabold text-lg sm:text-xl text-white tracking-tight">
            {title}
          </h2>
        </div>

        {items.length > 2 && (
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => scrollRail('left')}
              aria-label={isEn ? 'Scroll left' : 'Défiler à gauche'}
              className="w-8 h-8 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
            </button>
            <button
              type="button"
              onClick={() => scrollRail('right')}
              aria-label={isEn ? 'Scroll right' : 'Défiler à droite'}
              className="w-8 h-8 rounded-full bg-[#0E0E0E] border border-white/[0.14] hover:border-white/40 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
        )}
      </div>

      <div
        ref={railRef}
        className="flex gap-3.5 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-1 -mx-5 px-5 sm:mx-0 sm:px-0"
      >
        {items.map((item) => {
          const itemTitle = isEn && item.titleEn ? item.titleEn : item.title;
          const access = evaluateTvMediaAccess(item, entitlement, { hasSpecificAccess });
          const cat = resolveTvCategory(item);
          const catLabel = isEn ? TV_CATEGORY_META[cat].shortEn : TV_CATEGORY_META[cat].shortFr;
          const progress = progressById?.[item.id];
          const badgeVariant =
            access.tvTier === 'free'
              ? 'valid'
              : access.tvTier === 'card' || access.tvTier === 'vip'
              ? 'retained'
              : 'study';

          return (
            <div
              key={item.id}
              className="group relative shrink-0 snap-start w-[min(78vw,262px)] sm:w-[308px]"
            >
              <button
                type="button"
                onClick={() => onOpenItem(item)}
                className="w-full text-left cursor-pointer block lum-press"
              >
                <div className="relative aspect-[16/9] w-full rounded-[12px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/35 transition-colors">
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={itemTitle}
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                      !access.allowed ? 'brightness-[0.55]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

                  <div className="absolute top-2.5 left-2.5">
                    <StatusBadge
                      variant={badgeVariant}
                      label={isEn ? access.labelEn : access.labelFr}
                    />
                  </div>

                  {item.duration && (
                    <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-[6px] bg-black/80 text-[10px] font-mono text-white tabular-nums">
                      {item.duration}
                    </span>
                  )}

                  {!access.allowed ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="w-10 h-10 rounded-full bg-black/75 border border-white/25 flex items-center justify-center text-[#D4AF6A]">
                        <Lock className="w-4 h-4" strokeWidth={1.7} />
                      </span>
                    </div>
                  ) : (
                    item.mediaType === 'video' && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg">
                          <Play className="w-4 h-4 ml-0.5 fill-current" strokeWidth={1.7} />
                        </span>
                      </div>
                    )
                  )}

                  {progress && progress.progressPercent > 0 && (
                    <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20">
                      <div
                        className="h-full bg-[#D4AF6A]"
                        style={{ width: `${Math.min(100, progress.progressPercent)}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="pt-2.5 space-y-0.5">
                  <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#9A9A9A] truncate">
                    {catLabel} · {item.date}
                  </p>
                  <h3 className="text-sm font-agrandir-extrabold text-white group-hover:text-[#D4AF6A] transition-colors line-clamp-1">
                    {itemTitle}
                  </h3>
                </div>
              </button>

              {progress && onRemoveProgress && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveProgress(item.id);
                  }}
                  aria-label={isEn ? 'Remove from Continue Watching' : 'Retirer de Reprendre'}
                  className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/75 border border-white/20 text-white/75 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

/**
 * LUMARÉEL TV — Plateforme de contenus exclusifs (streaming Apple TV / Netflix).
 * - Utilisateur autorisé (LUMARÉEL Card éligible OU TV Pass actif) : expérience streaming cinématique.
 * - Utilisateur sans accès : page de découverte premium avec aperçus, contenus verrouillés,
 *   avantages et souscription réelle au TV Pass ou LUMARÉEL Card (zéro paiement simulé).
 */
export const LumareelTvView: React.FC = () => {
  const {
    currentUser,
    customerOrders,
    setCurrentPage,
    setSelectedMediaId,
    setSelectedArchiveId,
    setIsAuthModalOpen,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
  const plansSectionRef = useRef<HTMLDivElement>(null);

  const [mediaItems, setMediaItems] = useState<MediaHubItem[]>(() => loadMediaHubItems());
  const [entitlement, setEntitlement] = useState<TvEntitlementClient>(EMPTY_TV_ENTITLEMENT);
  const [isLoadingAccess, setIsLoadingAccess] = useState(true);
  const [plans, setPlans] = useState<TvPassPlanClient[]>([]);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentChannels, setPaymentChannels] = useState<
    Array<{ id: string; label: string; type: string }>
  >([]);
  const [watchHistory, setWatchHistory] = useState<TvWatchProgressEntry[]>(() =>
    loadTvWatchHistory(currentUser?.email)
  );

  // TV Pass subscription sheet state
  const [isSubscribeSheetOpen, setIsSubscribeSheetOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('wave');
  const [subscriberPhone, setSubscriberPhone] = useState('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  // Sync media hub & watch history live
  useEffect(() => {
    const syncMedia = () => setMediaItems(loadMediaHubItems());
    syncMedia();
    return subscribeMediaHub(syncMedia);
  }, []);

  useEffect(() => {
    const syncHistory = () => setWatchHistory(loadTvWatchHistory(currentUser?.email));
    syncHistory();
    return subscribeTvWatchHistory(syncHistory);
  }, [currentUser?.email]);

  // Verify real server-side entitlement & active TV Pass plans
  useEffect(() => {
    let cancelled = false;
    setIsLoadingAccess(true);

    Promise.all([fetchTvPlans(), fetchTvEntitlement(currentUser?.email)])
      .then(([plansData, entData]) => {
        if (cancelled) return;
        if (plansData) {
          setPlans(plansData.plans);
          setPaymentReady(plansData.paymentReady);
          setPaymentChannels(plansData.channels);
          if (plansData.plans[0]) {
            setSelectedPlanId((prev) => prev || plansData.plans[0].id);
          }
        }
        setEntitlement(entData.entitlement);
        if (entData.paymentReady) {
          setPaymentReady(true);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAccess(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentUser?.email]);

  const publishedItems = useMemo(() => getPublishedMediaItems(mediaItems), [mediaItems]);

  const hasSpecificAccess = useMemo(
    () => (customerOrders || []).some((o) => o.paymentStatus === 'completed'),
    [customerOrders]
  );

  // Hero spotlight item
  const featuredItem = useMemo(() => {
    const explicit = publishedItems.find((i) => i.isFeaturedOnTv);
    if (explicit) return explicit;
    const firstVideo = publishedItems.find((i) => i.mediaType === 'video');
    return firstVideo || publishedItems[0] || null;
  }, [publishedItems]);

  // Continue Watching — strictly populated from real watch history
  const continueWatchingItems = useMemo(() => {
    if (!entitlement.hasAccess || watchHistory.length === 0) return [];
    const byId = new Map(publishedItems.map((i) => [i.id, i]));
    return watchHistory
      .map((entry) => byId.get(entry.mediaId))
      .filter((item): item is MediaHubItem => Boolean(item));
  }, [entitlement.hasAccess, watchHistory, publishedItems]);

  const progressById = useMemo(() => {
    const map: Record<string, TvWatchProgressEntry> = {};
    watchHistory.forEach((entry) => {
      map[entry.mediaId] = entry;
    });
    return map;
  }, [watchHistory]);

  // Category shelves
  const shelvesByCategory = useMemo(() => {
    const map: Record<TvContentCategory, MediaHubItem[]> = {
      originals: [],
      concerts_live: [],
      backstage: [],
      interviews: [],
      retrospectives: [],
    };
    publishedItems.forEach((item) => {
      const cat = resolveTvCategory(item);
      map[cat].push(item);
    });
    return map;
  }, [publishedItems]);

  // Recommendations based on watched categories + newest releases
  const recommendedItems = useMemo(() => {
    if (publishedItems.length <= 1) return [];
    const watchedCats = new Set(
      continueWatchingItems.map((item) => resolveTvCategory(item))
    );
    return [...publishedItems]
      .filter((i) => i.id !== featuredItem?.id)
      .sort((a, b) => {
        const aScore = watchedCats.has(resolveTvCategory(a)) ? 1 : 0;
        const bScore = watchedCats.has(resolveTvCategory(b)) ? 1 : 0;
        if (bScore !== aScore) return bScore - aScore;
        return Date.parse(b.createdAt || '') - Date.parse(a.createdAt || '');
      })
      .slice(0, 8);
  }, [publishedItems, continueWatchingItems, featuredItem?.id]);

  const openMediaItem = (item: MediaHubItem) => {
    setSelectedMediaId(item.id);
    setCurrentPage('media_detail');
  };

  const openSubscribeFlow = (planId?: string) => {
    if (planId) setSelectedPlanId(planId);
    if (!currentUser) {
      showToast(
        isEn
          ? 'Sign in to link your LUMARÉEL TV Pass to your account.'
          : 'Connectez-vous pour associer votre LUMARÉEL TV Pass à votre compte.',
        'info'
      );
      setIsAuthModalOpen(true);
      return;
    }
    setIsSubscribeSheetOpen(true);
  };

  const handleInitiateTvPassPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!paymentReady) {
      showToast(
        isEn
          ? 'Real payment processing (PayMeTrust) is not yet configured on the server.'
          : 'Le paiement réel PayMeTrust n’est pas encore configuré sur le serveur. Aucun abonnement ne peut être activé sans confirmation réelle.',
        'error'
      );
      return;
    }
    const chosenPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
    if (!chosenPlan) return;

    setIsSubmittingSub(true);
    try {
      const { data: sessionData } = isSupabaseConfigured
        ? await supabase.auth.getSession()
        : { data: { session: null } };
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        showToast(isEn ? 'Your session has expired. Please sign in again.' : 'Votre session a expiré. Reconnectez-vous avant de payer.', 'error');
        setIsAuthModalOpen(true);
        return;
      }
      const res = await fetch('/api/payments/paymetrust/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          kind: 'tv_pass',
          planId: chosenPlan.id,
          channel: selectedChannel,
          customerName: currentUser.name,
          customerEmail: currentUser.email,
          customerPhone: subscriberPhone.trim() || undefined,
          userId: currentUser.id,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        showToast(
          data?.error ||
            (isEn
              ? 'Unable to initiate real payment.'
              : 'Impossible d’initialiser le paiement réel.'),
          'error'
        );
        return;
      }

      if (data.transaction?.paymentUrl) {
        window.location.href = data.transaction.paymentUrl;
      } else {
        showToast(
          isEn
            ? 'Payment initiated. Waiting for real provider confirmation.'
            : 'Paiement initialisé. En attente de confirmation réelle du prestataire.',
          'info'
        );
        setIsSubscribeSheetOpen(false);
      }
    } catch {
      showToast(
        isEn ? 'Network error while initiating payment.' : 'Erreur réseau lors du paiement.',
        'error'
      );
    } finally {
      setIsSubmittingSub(false);
    }
  };

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0] || null;

  // Access status badge copy for authorized users
  const accessStatusBadge = useMemo(() => {
    if (!entitlement.hasAccess) return null;
    if (entitlement.source === 'lumareel_card' || entitlement.source === 'both') {
      return isEn
        ? 'Included · LUMARÉEL Card'
        : 'Inclus · LUMARÉEL Card';
    }
    const exp = formatDateShort(entitlement.subscriptionAccess.expiresAt, isEn);
    return exp
      ? isEn
        ? `TV Pass active · until ${exp}`
        : `TV Pass actif · jusqu’au ${exp}`
      : isEn
      ? 'TV Pass active'
      : 'TV Pass actif';
  }, [entitlement, isEn]);

  // Status notice when a user had an expired or revoked pass/card
  const inactiveNotice = useMemo(() => {
    if (entitlement.hasAccess || !currentUser) return null;
    const subStatus = entitlement.subscriptionAccess.status;
    if (subStatus === 'expired') {
      return isEn
        ? 'Your LUMARÉEL TV Pass has expired. Renew below to restore access.'
        : 'Votre LUMARÉEL TV Pass a expiré. Renouvelez votre abonnement pour retrouver l’accès.';
    }
    if (subStatus === 'revoked' || subStatus === 'cancelled') {
      return (
        entitlement.subscriptionAccess.reason ||
        (isEn
          ? 'Your LUMARÉEL TV Pass is no longer active.'
          : 'Votre LUMARÉEL TV Pass n’est plus actif.')
      );
    }
    if (
      entitlement.cardAccess.cardStatus &&
      entitlement.cardAccess.cardStatus !== 'active'
    ) {
      return isEn
        ? `Your LUMARÉEL Card status is "${entitlement.cardAccess.cardStatus}". Active card or TV Pass required.`
        : `Votre LUMARÉEL Card est au statut « ${entitlement.cardAccess.cardStatus} ». Une carte active ou un TV Pass est requis.`;
    }
    return null;
  }, [entitlement, currentUser, isEn]);

  // ============================================================================
  // LOADING STATE (DARK EDITORIAL SKELETON)
  // ============================================================================
  if (isLoadingAccess) {
    return (
      <div
        className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 bg-black text-white font-agrandir-regular space-y-8"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-8 w-32 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
        </div>
        <SkeletonBlock className="h-[340px] sm:h-[420px] w-full rounded-[16px]" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SkeletonBlock className="h-44 rounded-[12px]" />
          <SkeletonBlock className="h-44 rounded-[12px]" />
          <SkeletonBlock className="h-44 rounded-[12px]" />
        </div>
      </div>
    );
  }

  // ============================================================================
  // 1. EXPÉRIENCE STREAMING PREMIUM (UTILISATEUR AUTORISÉ : CARD OU TV PASS)
  // ============================================================================
  if (entitlement.hasAccess) {
    const heroTitle = featuredItem
      ? isEn && featuredItem.titleEn
        ? featuredItem.titleEn
        : featuredItem.title
      : 'LUMARÉEL TV';
    const heroDesc = featuredItem
      ? isEn && featuredItem.descriptionEn
        ? featuredItem.descriptionEn
        : featuredItem.description
      : '';
    const heroCat = featuredItem ? resolveTvCategory(featuredItem) : 'originals';

    return (
      <div
        className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 bg-black text-white font-agrandir-regular"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* Top bar sobre */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setCurrentPage('explore')}
              className="inline-flex items-center gap-1 text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
              <span>Discover</span>
            </button>
            <span className="text-white/20">·</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-agrandir-extrabold tracking-[0.14em] uppercase text-white">
              <Tv className="w-3.5 h-3.5 text-[#D4AF6A]" strokeWidth={1.7} />
              <span>LUMARÉEL TV</span>
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {accessStatusBadge && (
              <StatusBadge variant="retained" label={accessStatusBadge} />
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedArchiveId(null);
                setCurrentPage('archive');
              }}
              className="text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
            >
              Archives
            </button>
          </div>
        </div>

        {/* HERO SPOTLIGHT CINÉMATIQUE */}
        {featuredItem && (
          <section className="relative mb-10 rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
            <div className="relative aspect-[16/10] sm:aspect-[21/9] w-full">
              <img
                src={featuredItem.thumbnailUrl || featuredItem.url}
                alt={heroTitle}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10 max-w-2xl space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-agrandir-extrabold uppercase tracking-[0.22em] text-[#D4AF6A]">
                    {isEn ? TV_CATEGORY_META[heroCat].labelEn : TV_CATEGORY_META[heroCat].labelFr}
                  </span>
                  {featuredItem.duration && (
                    <span className="text-[11px] font-mono text-[#C8C8C8]">
                      · {featuredItem.duration}
                    </span>
                  )}
                  <span className="text-[11px] text-[#9A9A9A]">· {featuredItem.date}</span>
                </div>

                <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl lg:text-[42px] text-white tracking-tight leading-[1.04]">
                  {heroTitle}
                </h1>

                {heroDesc && (
                  <p className="text-xs sm:text-sm text-[#D0D0D0] leading-relaxed line-clamp-2 max-w-xl">
                    {heroDesc}
                  </p>
                )}

                <div className="pt-1 flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => openMediaItem(featuredItem)}
                    className="min-h-[42px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-xs sm:text-sm font-agrandir-extrabold inline-flex items-center gap-2 transition-colors cursor-pointer lum-press"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>{isEn ? 'Watch now' : 'Regarder'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openMediaItem(featuredItem)}
                    className="min-h-[42px] px-5 rounded-full bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.16] text-white text-xs sm:text-sm font-agrandir-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <Info className="w-4 h-4" strokeWidth={1.6} />
                    <span>{isEn ? 'Details' : 'Fiche'}</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RANGÉES HORIZONTALES STREAMING */}
        <div className="space-y-9">
          {/* Continue Watching — affiché UNIQUEMENT si l'utilisateur a une lecture en cours réelle */}
          {continueWatchingItems.length > 0 && (
            <ScrollReveal>
              <TvHorizontalShelf
                kicker={isEn ? 'PICK UP WHERE YOU LEFT OFF' : 'VOTRE LECTURE'}
                title={isEn ? 'Continue Watching' : 'Reprendre la lecture'}
                items={continueWatchingItems}
                entitlement={entitlement}
                hasSpecificAccess={hasSpecificAccess}
                isEn={isEn}
                onOpenItem={openMediaItem}
                progressById={progressById}
                onRemoveProgress={(mediaId) =>
                  setWatchHistory(removeTvWatchProgress(currentUser?.email, mediaId))
                }
              />
            </ScrollReveal>
          )}

          {/* Catégories Apple TV / Netflix */}
          {CATEGORY_ORDER.map((category) => {
            const catItems = shelvesByCategory[category];
            if (!catItems || catItems.length === 0) return null;
            return (
              <ScrollReveal key={category}>
                <TvHorizontalShelf
                  title={
                    isEn
                      ? TV_CATEGORY_META[category].labelEn
                      : TV_CATEGORY_META[category].labelFr
                  }
                  items={catItems}
                  entitlement={entitlement}
                  hasSpecificAccess={hasSpecificAccess}
                  isEn={isEn}
                  onOpenItem={openMediaItem}
                />
              </ScrollReveal>
            );
          })}

          {/* Recommandations */}
          {recommendedItems.length > 0 && (
            <ScrollReveal>
              <TvHorizontalShelf
                kicker={isEn ? 'SELECTED FOR YOU' : 'SÉLECTION'}
                title={isEn ? 'Recommended' : 'Recommandations'}
                items={recommendedItems}
                entitlement={entitlement}
                hasSpecificAccess={hasSpecificAccess}
                isEn={isEn}
                onOpenItem={openMediaItem}
              />
            </ScrollReveal>
          )}
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. PAGE DE DÉCOUVERTE PREMIUM (UTILISATEUR SANS ACCÈS ACTIF)
  // ============================================================================
  return (
    <div
      className="min-h-screen w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-20 bg-black text-white font-agrandir-regular"
      style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
    >
      {/* Top bar sobre */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage('explore')}
          className="inline-flex items-center gap-1 text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" strokeWidth={1.6} />
          <span>Discover</span>
        </button>

        <div className="flex items-center gap-3">
          {!currentUser && (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs font-agrandir-semibold text-[#D4AF6A] hover:text-white transition-colors cursor-pointer"
            >
              {isEn ? 'Already a member? Sign in' : 'Déjà abonné ? Connexion'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setSelectedArchiveId(null);
              setCurrentPage('archive');
            }}
            className="text-xs font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer"
          >
            Archives
          </button>
        </div>
      </div>

      {/* Notice d'expiration ou de révocation réelle si applicable */}
      {inactiveNotice && (
        <div className="mb-6 rounded-[14px] bg-[#161108] border border-[#D4AF6A]/35 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#D4AF6A] shrink-0 mt-0.5" />
          <p className="text-xs text-[#E8D5AE] leading-relaxed">{inactiveNotice}</p>
        </div>
      )}

      {/* HERO DE DÉCOUVERTE LUMARÉEL TV */}
      <section className="relative mb-10 rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
        <div className="relative min-h-[280px] sm:min-h-[410px] flex items-end">
          {featuredItem && (
            <img
              src={featuredItem.thumbnailUrl || featuredItem.url}
              alt="LUMARÉEL TV"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover brightness-[0.45]"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/65 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />

          <div className="relative z-10 w-full max-w-2xl p-4 sm:p-10 space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 text-[9px] sm:text-[10px] font-agrandir-extrabold uppercase tracking-[0.18em] sm:tracking-[0.24em] text-[#D4AF6A]">
              <Tv className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>{isEn ? 'EXCLUSIVE STREAMING PLATFORM' : 'PLATEFORME EXCLUSIVE'}</span>
            </div>

            <h1 className="font-agrandir-extrabold text-2xl sm:text-5xl text-white tracking-tight leading-[1.02]">
              LUMARÉEL TV
            </h1>

            <p className="text-xs sm:text-base text-[#D0D0D0] leading-relaxed max-w-xl">
              {isEn
                ? 'Original films, filmed concerts, backstage sessions, artist interviews, and curated retrospectives. Included with an eligible LUMARÉEL Card or available independently with the TV Pass.'
                : 'Originals, concerts filmés, coulisses, interviews d’artistes et rétrospectives exclusives. Inclus avec une LUMARÉEL Card éligible ou accessible indépendamment avec le LUMARÉEL TV Pass.'}
            </p>

            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (plans.length > 0) {
                    plansSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    openSubscribeFlow();
                  }
                }}
                className="min-h-[40px] sm:min-h-[44px] w-full sm:w-auto justify-center px-4 sm:px-6 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black text-[11px] sm:text-sm font-agrandir-extrabold inline-flex items-center gap-2 transition-colors cursor-pointer lum-press"
              >
                <Tv className="w-4 h-4" strokeWidth={1.8} />
                <span>{isEn ? 'Subscribe to TV Pass' : 'S’abonner à LUMARÉEL TV'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage('member_card')}
                className="min-h-[40px] sm:min-h-[44px] w-full sm:w-auto justify-center px-4 sm:px-5 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.18] text-white text-[11px] sm:text-sm font-agrandir-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#D4AF6A]" strokeWidth={1.6} />
                <span>{isEn ? 'Discover LUMARÉEL Card' : 'Découvrir la LUMARÉEL Card'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="space-y-12">
        {/* APERÇUS DU CATALOGUE (GRATUITS + VERROUILLÉS VISUELLEMENT) */}
        {publishedItems.length > 0 && (
          <ScrollReveal>
            <TvHorizontalShelf
              kicker={isEn ? 'CATALOGUE PREVIEW' : 'APERÇU DU CATALOGUE'}
              title={
                isEn
                  ? 'Available on LUMARÉEL TV'
                  : 'À découvrir sur LUMARÉEL TV'
              }
              items={publishedItems}
              entitlement={entitlement}
              hasSpecificAccess={hasSpecificAccess}
              isEn={isEn}
              onOpenItem={openMediaItem}
            />
          </ScrollReveal>
        )}

        {/* AVANTAGES DE L'ACCÈS PREMIUM (LIGNES ÉDITORIALES LUMARÉEL) */}
        <ScrollReveal>
          <section className="space-y-2">
            <div>
              <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                {isEn ? 'PREMIUM ACCESS' : 'AVANTAGES PREMIUM'}
              </p>
              <h2 className="mt-0.5 font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                {isEn ? 'What LUMARÉEL TV unlocks' : 'Ce que débloque LUMARÉEL TV'}
              </h2>
            </div>

            <div className="divide-y divide-white/[0.10] border-y border-white/[0.10]">
              <EditorialRow
                index="01"
                title={isEn ? 'LUMARÉEL Originals & Filmed Concerts' : 'LUMARÉEL Originals & Concerts filmés'}
                subtitle={
                  isEn
                    ? 'Full performances, director cuts, and editorial films crafted by LUMARÉEL.'
                    : 'Captations intégrales, films originaux et créations éditoriales LUMARÉEL.'
                }
              />
              <EditorialRow
                index="02"
                title={isEn ? 'Backstage & Artist Interviews' : 'Backstage & Interviews exclusives'}
                subtitle={
                  isEn
                    ? 'Soundchecks, studio arrangements, greenroom diaries, and behind-the-scenes stories.'
                    : 'Balances, sessions studio, carnets de loges et coulisses des tournées.'
                }
              />
              <EditorialRow
                index="03"
                title={isEn ? 'Included with eligible LUMARÉEL Card' : 'Inclus avec une LUMARÉEL Card éligible'}
                subtitle={
                  isEn
                    ? 'Cardholders with TV access included enter automatically—no extra TV Pass required.'
                    : 'Les titulaires d’une carte éligible accèdent directement sans abonnement supplémentaire.'
                }
                rightText={isEn ? 'Discover Card' : 'Voir la carte'}
                onClick={() => setCurrentPage('member_card')}
              />
              <EditorialRow
                index="04"
                title={isEn ? 'Independent TV Pass' : 'LUMARÉEL TV Pass indépendant'}
                subtitle={
                  isEn
                    ? 'Subscribe purely to LUMARÉEL TV without holding a physical card.'
                    : 'Accédez à toute la plateforme de streaming sans posséder de carte physique.'
                }
              />
            </div>
          </section>
        </ScrollReveal>

        {/* FORMULES LUMARÉEL TV PASS (CONFIGURÉES EN ADMINISTRATION) */}
        <ScrollReveal>
          <section ref={plansSectionRef} className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                  LUMARÉEL TV PASS
                </p>
                <h2 className="mt-0.5 font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
                  {isEn ? 'Choose your monthly pass' : 'Choisir votre pass mensuel'}
                </h2>
              </div>

              {!paymentReady && (
                <span className="text-[11px] text-[#9A9A9A] inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF6A]" />
                  <span>
                    {isEn
                      ? 'Online payment activation pending provider keys'
                      : 'Paiement en ligne en attente de configuration PayMeTrust'}
                  </span>
                </span>
              )}
            </div>

            <p className="text-[11px] text-[#9A9A9A]">{isEn ? '30 days of access · Manual renewal only · No automatic charge.' : '30 jours d’accès · Renouvellement manuel uniquement · Aucun prélèvement automatique.'}</p>

            {plans.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="rounded-[14px] bg-[#0E0E0E] border border-white/[0.12] p-5 sm:p-6 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#D4AF6A]">
                            {isEn
                              ? plan.billingCycleLabelEn || plan.billingCycleLabel
                              : plan.billingCycleLabel}
                          </p>
                          <h3 className="mt-0.5 font-agrandir-extrabold text-lg text-white">
                            {isEn && plan.nameEn ? plan.nameEn : plan.name}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-agrandir-extrabold text-xl text-white tabular-nums">
                            {formatPrice(plan.price, plan.currency)}
                          </p>
                          <p className="text-[11px] text-[#9A9A9A]">
                            {plan.durationDays} {isEn ? 'days' : 'jours'}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm text-[#C8C8C8] leading-relaxed">
                        {isEn && plan.descriptionEn ? plan.descriptionEn : plan.description}
                      </p>

                      <div className="pt-2 border-t border-white/[0.08] space-y-1 text-[11px] text-[#9A9A9A]">
                        <p>{plan.renewalPolicy}</p>
                        <p>{plan.conditions}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openSubscribeFlow(plan.id)}
                      className="w-full min-h-[42px] px-4 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold transition-colors cursor-pointer lum-press"
                    >
                      {isEn ? 'Subscribe to this pass' : 'Souscrire à cette formule'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[14px] bg-[#0E0E0E] border border-white/[0.12] p-6 text-xs text-[#9A9A9A]">
                {isEn
                  ? 'No active LUMARÉEL TV Pass plans are published yet. Configure plans in Administration.'
                  : 'Aucune formule LUMARÉEL TV Pass active n’est encore configurée depuis l’administration.'}
              </div>
            )}
          </section>
        </ScrollReveal>
      </div>

      {/* SHEET DE SOUSCRIPTION RÉELLE AU TV PASS (ZÉRO PAIEMENT SIMULÉ) */}
      <BottomSheet
        open={isSubscribeSheetOpen}
        onClose={() => setIsSubscribeSheetOpen(false)}
        title="LUMARÉEL TV Pass"
      >
        <form onSubmit={handleInitiateTvPassPayment} className="space-y-5">
          {selectedPlan && (
            <div className="rounded-[12px] bg-[#141414] border border-white/[0.10] p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-agrandir-extrabold text-white">
                  {isEn && selectedPlan.nameEn ? selectedPlan.nameEn : selectedPlan.name}
                </p>
                <p className="text-[11px] text-[#9A9A9A] mt-0.5">
                  {selectedPlan.durationDays} {isEn ? 'days' : 'jours'} · {selectedPlan.conditions}
                </p>
              </div>
              <span className="text-sm font-agrandir-extrabold text-[#D4AF6A] tabular-nums shrink-0">
                {formatPrice(selectedPlan.price, selectedPlan.currency)}
              </span>
            </div>
          )}

          {plans.length > 1 && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A]">
                {isEn ? 'Plan' : 'Formule'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`p-3 rounded-[10px] border text-left transition-colors cursor-pointer ${
                      selectedPlanId === p.id
                        ? 'bg-[#D4AF6A]/15 border-[#D4AF6A] text-white'
                        : 'bg-[#121212] border-white/[0.10] text-[#C8C8C8]'
                    }`}
                  >
                    <p className="text-xs font-agrandir-extrabold">{p.name}</p>
                    <p className="text-[11px] text-[#D4AF6A] tabular-nums mt-0.5">
                      {formatPrice(p.price, p.currency)}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!paymentReady ? (
            <div className="rounded-[12px] bg-[#161108] border border-[#D4AF6A]/35 p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#D4AF6A] text-xs font-agrandir-extrabold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  {isEn
                    ? 'Real payment confirmation required'
                    : 'Activation en ligne non disponible (paiement réel requis)'}
                </span>
              </div>
              <p className="text-xs text-[#D0D0D0] leading-relaxed">
                {isEn
                  ? 'PayMeTrust API credentials are not yet configured on this server. Subscriptions are never simulated or activated without confirmed payment. You can also access LUMARÉEL TV automatically with an eligible LUMARÉEL Card.'
                  : 'Les clés API PayMeTrust ne sont pas encore configurées sur ce serveur. Aucun paiement n’est simulé et aucun abonnement n’est activé sans confirmation réelle. Vous pouvez également accéder à LUMARÉEL TV avec une LUMARÉEL Card éligible.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsSubscribeSheetOpen(false);
                  setCurrentPage('member_card');
                }}
                className="mt-2 min-h-[38px] px-4 rounded-full bg-white text-black text-xs font-agrandir-extrabold cursor-pointer"
              >
                {isEn ? 'Discover LUMARÉEL Card' : 'Découvrir la LUMARÉEL Card'}
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A]">
                  {isEn ? 'Payment method (PayMeTrust)' : 'Moyen de paiement (PayMeTrust)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(paymentChannels.length > 0
                    ? paymentChannels
                    : [
                        { id: 'wave', label: 'Wave', type: 'mobile_money' },
                        { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
                        { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
                        { id: 'card', label: 'Visa / Mastercard', type: 'card' },
                      ]
                  ).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`min-h-[38px] px-3 rounded-[10px] border text-xs font-agrandir-semibold transition-colors cursor-pointer ${
                        selectedChannel === ch.id
                          ? 'bg-[#D4AF6A] text-black border-[#D4AF6A] font-agrandir-extrabold'
                          : 'bg-[#121212] text-[#D0D0D0] border-white/[0.12]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-agrandir-semibold uppercase tracking-[0.14em] text-[#9A9A9A]">
                  {isEn ? 'Phone number (optional)' : 'Téléphone Mobile Money (facultatif)'}
                </label>
                <input
                  type="tel"
                  value={subscriberPhone}
                  onChange={(e) => setSubscriberPhone(e.target.value)}
                  placeholder="+225 07 00 00 00 00"
                  className="w-full min-h-[42px] px-3.5 rounded-[10px] bg-[#121212] border border-white/[0.14] text-sm text-white placeholder-[#666] focus:outline-none focus:border-[#D4AF6A]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmittingSub}
                className="w-full min-h-[44px] px-5 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] disabled:opacity-50 text-black text-xs sm:text-sm font-agrandir-extrabold transition-colors cursor-pointer"
              >
                {isSubmittingSub
                  ? isEn
                    ? 'Redirecting to PayMeTrust…'
                    : 'Redirection vers PayMeTrust…'
                  : isEn
                  ? 'Continue to secure payment'
                  : 'Procéder au paiement sécurisé'}
              </button>
            </>
          )}
        </form>
      </BottomSheet>
    </div>
  );
};
