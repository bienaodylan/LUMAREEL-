import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  MediaHubItem,
  getPublishedMediaItems,
  loadMediaHubItems,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import {
  downloadMediaAsset,
  isMemorySharingWindowOpen,
  markChallengeCompleted,
} from '../utils/communityStorage';
import {
  ArrowLeft,
  ArrowUpRight,
  Camera,
  Download,
  Lock,
  Play,
  Ticket,
} from 'lucide-react';

/**
 * Page dédiée de contenu média (BACKSTAGE / Photographie / Film éditorial).
 * Remplace l'ancienne fenêtre pop-up par une véritable expérience éditoriale
 * connectée au concert associé, aux autres coulisses et aux Memories.
 */
export const MediaDetailView: React.FC = () => {
  const {
    selectedMediaId,
    setSelectedMediaId,
    events,
    currentUser,
    setCurrentPage,
    setCheckoutEvent,
    goBack,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [allItems, setAllItems] = useState<MediaHubItem[]>(() => loadMediaHubItems());
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);

  useEffect(() => {
    return subscribeMediaHub(() => setAllItems(loadMediaHubItems()));
  }, []);

  useEffect(() => {
    setIsPlayingVideo(false);
  }, [selectedMediaId]);

  const publishedItems = useMemo(() => getPublishedMediaItems(allItems), [allItems]);

  const item = useMemo(
    () => publishedItems.find((m) => m.id === selectedMediaId) || publishedItems[0] || null,
    [publishedItems, selectedMediaId]
  );

  const hasBlackCard = Boolean(loadStoredMemberCard(currentUser?.email));

  useEffect(() => {
    if (item && (!item.membersOnly || hasBlackCard)) {
      const unlocked = markChallengeCompleted(currentUser, 'challenge_backstage');
      if (unlocked) {
        showToast(
          isEn
            ? 'Backstage challenge completed! +50 points earned.'
            : 'Défi Backstage validé ! +50 points crédités.',
          'success'
        );
      }
    }
  }, [item?.id]);

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
    return publishedEvents[0];
  }, [item, publishedEvents]);

  const relatedItems = useMemo(() => {
    if (!item) return [];
    return publishedItems
      .filter((m) => m.id !== item.id)
      .sort((a, b) => {
        const aSame = a.eventId && a.eventId === item.eventId ? 1 : 0;
        const bSame = b.eventId && b.eventId === item.eventId ? 1 : 0;
        return bSame - aSame;
      })
      .slice(0, 4);
  }, [publishedItems, item]);

  const handleDownload = async (media: MediaHubItem) => {
    if (!media.downloadable) return;
    if (media.placement === 'memories' && !isMemorySharingWindowOpen(media.date)) return;
    const ok = await downloadMediaAsset(media.url, `lumareel-${media.id}.jpg`);
    if (ok) {
      showToast(isEn ? 'Downloaded.' : 'Téléchargement terminé.', 'success');
    }
  };

  if (!item) {
    return (
      <div className="min-h-screen w-full max-w-4xl mx-auto px-4 sm:px-8 py-20 text-center text-white font-agrandir-regular">
        <p className="text-sm text-neutral-400">
          {isEn ? 'This media is not currently published.' : 'Ce contenu n’est pas publié actuellement.'}
        </p>
        <button
          type="button"
          onClick={goBack}
          className="mt-5 min-h-[42px] px-5 rounded-full bg-white text-black text-xs font-agrandir-extrabold cursor-pointer"
        >
          {isEn ? 'Go back' : 'Retour'}
        </button>
      </div>
    );
  }

  const locked = Boolean(item.membersOnly && !hasBlackCard);
  const title = isEn && item.titleEn ? item.titleEn : item.title;
  const description = isEn && item.descriptionEn ? item.descriptionEn : item.description;

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-20 text-white font-agrandir-regular">
      {/* Retour sobre */}
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
          {item.downloadable &&
            !locked &&
            item.mediaType === 'photo' &&
            (item.placement !== 'memories' || isMemorySharingWindowOpen(item.date)) && (
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
            onClick={() => setCurrentPage('memories')}
            className="min-h-[38px] px-4 rounded-full border border-white/[0.14] hover:border-white/40 text-xs font-agrandir-semibold text-neutral-300 hover:text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Memories</span>
          </button>
        </div>
      </div>

      {/* Zone Média Principale */}
      <section className="mb-8">
        <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-[#0A0A0A]">
          {locked ? (
            <>
              <img
                src={item.thumbnailUrl || item.url}
                alt={title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover brightness-[0.35] blur-[2px] scale-[1.02]"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-white" />
                </div>
                <div className="max-w-md space-y-1.5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-300">
                    LUMARÉEL Black Card
                  </p>
                  <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                    {isEn ? 'Exclusive member release' : 'Contenu réservé aux membres'}
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-300">
                    {isEn
                      ? 'Activate your LUMARÉEL Black Card to unlock private backstage episodes.'
                      : 'Activez votre LUMARÉEL Black Card pour débloquer les épisodes privés des loges.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage('member_card')}
                  className="min-h-[42px] px-5 rounded-full bg-white text-black hover:bg-neutral-200 text-xs font-agrandir-extrabold transition-colors cursor-pointer"
                >
                  {isEn ? 'Discover LUMARÉEL Black Card' : 'Découvrir la LUMARÉEL Black Card'}
                </button>
              </div>
            </>
          ) : item.mediaType === 'video' && item.embedUrl && isPlayingVideo ? (
            <iframe
              src={`${item.embedUrl}${item.embedUrl.includes('?') ? '&' : '?'}autoplay=1`}
              title={title}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div
              onClick={() => item.mediaType === 'video' && item.embedUrl && setIsPlayingVideo(true)}
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
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-black/55 group-hover:bg-white text-white group-hover:text-black backdrop-blur-md border border-white/25 flex items-center justify-center transition-colors">
                      <Play className="w-6 h-6 ml-0.5 fill-current" />
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* En-tête éditorial & liaison Concert */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-white/[0.08]">
        <div className="lg:col-span-8 space-y-4">
          <p className="text-xs text-neutral-400">
            <span className="text-white font-agrandir-semibold uppercase tracking-[0.16em]">
              {item.placement === 'memories' ? 'Memories' : 'Backstage'}
            </span>
            {item.tag ? ` · ${item.tag}` : ''}
            {item.placement !== 'memories' && item.duration ? ` · ${item.duration}` : ''}
            {` · ${item.date}`}
          </p>

          <h1 className="font-agrandir-extrabold text-2xl sm:text-4xl text-white tracking-tight leading-[1.08] text-balance">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed max-w-2xl">
            {description}
          </p>

          {item.notes && item.notes.length > 0 && (
            <ul className="pt-4 border-t border-white/[0.08] space-y-2.5">
              {item.notes.map((note, idx) => (
                <li key={idx} className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
                  {idx + 1}. {note}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Concert associé (connexion directe) */}
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
            {item.albumTitle && (
              <p>
                Album · <span className="text-neutral-300">{item.albumTitle}</span>
              </p>
            )}
          </div>
        </aside>
      </section>

      {/* Autres médias liés */}
      {relatedItems.length > 0 && (
        <section className="pt-10">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-agrandir-extrabold text-lg sm:text-xl text-white">
              {isEn ? 'Related media' : 'Autres médias liés'}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentPage('memories')}
              className="text-xs font-agrandir-semibold text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>{isEn ? 'All Memories' : 'Tout voir'}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5">
            {relatedItems.map((rel) => (
              <button
                key={rel.id}
                type="button"
                onClick={() => {
                  setSelectedMediaId(rel.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group text-left cursor-pointer"
              >
                <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-[#101010]">
                  <img
                    src={rel.thumbnailUrl || rel.url}
                    alt={rel.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                </div>
                <span className="block pt-2.5">
                  <span className="block text-[11px] text-neutral-500">
                    {rel.tag || (rel.placement === 'memories' ? 'Memories' : 'Backstage')} · {rel.date}
                  </span>
                  <span className="mt-0.5 block text-sm font-agrandir-extrabold text-white group-hover:text-neutral-300 transition-colors line-clamp-1">
                    {isEn && rel.titleEn ? rel.titleEn : rel.title}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
