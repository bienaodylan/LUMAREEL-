import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  COMMUNITY_MEDIA,
  buildConcertMemoryAlbums,
  markChallengeCompleted,
} from '../utils/communityStorage';
import {
  MediaHubItem,
  getPublishedMediaItems,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { ConcertMemoriesView } from './ConcertMemoriesView';
import { ArchiveView } from './ArchiveView';
import { PageHeader, SegmentedControl } from './ui/EditorialPrimitives';
import { ArrowUpRight, Lock, Play } from 'lucide-react';

type BackstageSection = 'coulisses' | 'memories' | 'archives';

/**
 * BACKSTAGE — Destination média monochrome unifiée regroupant Coulisses & Memories.
 * Miniatures 100 % dégagées : titres et repères placés proprement sous chaque visuel.
 */
export const BackstageView: React.FC = () => {
  const {
    currentUser,
    events,
    archives,
    setCurrentPage,
    setCheckoutEvent,
    setSelectedMediaId,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
  const [section, setSection] = useState<BackstageSection>('coulisses');
  const [publishedMedia, setPublishedMedia] = useState<MediaHubItem[]>(() =>
    getPublishedMediaItems()
  );

  useEffect(() => {
    const sync = () => setPublishedMedia(getPublishedMediaItems());
    sync();
    return subscribeMediaHub(sync);
  }, []);

  const hasBlackCard = Boolean(loadStoredMemberCard(currentUser?.email));

  const backstageItems = useMemo(
    () => publishedMedia.filter((item) => item.placement === 'backstage'),
    [publishedMedia]
  );

  const publishedEvents = useMemo(
    () => (events || []).filter((e) => e.status !== 'draft'),
    [events]
  );

  const memoryAlbums = useMemo(() => buildConcertMemoryAlbums(archives), [archives]);

  const resolveLinkedConcert = (item: MediaHubItem): ConcertEvent | null => {
    if (publishedEvents.length === 0) return null;
    if (item.eventId) {
      const exact = publishedEvents.find((ev) => ev.id === item.eventId);
      if (exact) return exact;
    }
    if (item.artistName) {
      const byArtist = publishedEvents.find(
        (ev) => ev.artist.toLowerCase() === item.artistName!.toLowerCase()
      );
      if (byArtist) return byArtist;
    }
    return null;
  };

  const handleOpenMediaPage = (item: MediaHubItem) => {
    const unlocked = markChallengeCompleted(currentUser, 'challenge_backstage');
    if (unlocked) {
      showToast(
        isEn
          ? 'Backstage challenge completed! +50 points earned.'
          : 'Défi Backstage validé ! +50 points crédités.',
        'success'
      );
    }
    setSelectedMediaId(item.id);
    setCurrentPage('media_detail');
  };

  const handleGoToConcert = (ev: ConcertEvent) => {
    setCheckoutEvent(ev);
  };

  const leadItem = backstageItems[0];
  const secondaryPair = backstageItems.slice(1, 3);
  const extraItems = backstageItems.slice(3);

  const renderMediaThumbBadge = (item: MediaHubItem, locked: boolean, large = false) => {
    if (!locked && item.mediaType !== 'video') return null;
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className={`${
            large ? 'w-14 h-14' : 'w-10 h-10'
          } rounded-full bg-black/55 group-hover:bg-white text-white group-hover:text-black backdrop-blur-md border border-white/25 flex items-center justify-center transition-colors`}
        >
          {locked ? (
            <Lock className={large ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
          ) : (
            <Play className={`${large ? 'w-5 h-5' : 'w-3.5 h-3.5'} ml-0.5 fill-current`} />
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-9 pb-20 text-white font-agrandir-regular">
      <PageHeader
        compact
        eyebrow={isEn ? 'Inside LUMARÉEL' : 'Dans les coulisses'}
        title="BACKSTAGE"
        action={
          <SegmentedControl<BackstageSection>
            value={section}
            onChange={setSection}
            layoutId="lumareel-backstage-switch"
            pill
            options={[
              { id: 'coulisses', label: isEn ? 'Behind the Scenes' : 'Coulisses' },
              { id: 'memories', label: 'Memories' },
              { id: 'archives', label: 'Archives' },
            ]}
          />
        }
      />

      {/* VUE 1 : COULISSES */}
      {section === 'coulisses' && (
        <div className="space-y-9 sm:space-y-12">
          {/* MOBILE FIRST-FOLD : Rail horizontal — Miniatures dégagées */}
          <section className="md:hidden">
            <div className="flex overflow-x-auto snap-x snap-mandatory gap-3.5 pb-2 scrollbar-hide -mx-4 px-4">
              {backstageItems.map((item) => {
                const locked = Boolean(item.membersOnly && !hasBlackCard);
                const linkedConcert = resolveLinkedConcert(item);
                const title = isEn && item.titleEn ? item.titleEn : item.title;
                return (
                  <article
                    key={item.id}
                    onClick={() => handleOpenMediaPage(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenMediaPage(item);
                      }
                    }}
                    className="w-[72vw] max-w-[280px] shrink-0 snap-start group cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {renderMediaThumbBadge(item, locked)}
                    </div>
                    <div className="pt-2.5 space-y-0.5">
                      <p className="text-[11px] text-neutral-500 truncate">
                        {linkedConcert ? linkedConcert.title : item.tag || 'BACKSTAGE'}
                        {item.membersOnly ? ' · Black Card' : ''}
                      </p>
                      <h2 className="font-agrandir-extrabold text-sm text-white leading-snug line-clamp-2">
                        {title}
                      </h2>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* MOBILE SUITE : Passerelle Memories */}
          {memoryAlbums[0] && (
            <section className="md:hidden">
              <button
                type="button"
                onClick={() => setSection('memories')}
                className="group w-full text-left cursor-pointer block"
              >
                <div className="aspect-[16/9] w-full overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                  <img
                    src={memoryAlbums[0].coverImage}
                    alt={memoryAlbums[0].title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="pt-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-neutral-500">
                      MEMORIES
                    </p>
                    <h3 className="mt-0.5 font-agrandir-extrabold text-base text-white truncate">
                      {memoryAlbums[0].title}
                    </h3>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-white shrink-0" />
                </div>
              </button>
            </section>
          )}

          {/* DESKTOP — GRILLE ÉDITORIALE MINIATURES DÉGAGÉES */}
          {leadItem && (
            <section className="hidden md:grid md:grid-cols-12 gap-6 items-start">
              {(() => {
                const linkedConcert = resolveLinkedConcert(leadItem);
                const title = isEn && leadItem.titleEn ? leadItem.titleEn : leadItem.title;
                const locked = Boolean(leadItem.membersOnly && !hasBlackCard);
                return (
                  <article
                    onClick={() => handleOpenMediaPage(leadItem)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenMediaPage(leadItem);
                      }
                    }}
                    className="md:col-span-7 group cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                      <img
                        src={leadItem.thumbnailUrl || leadItem.url}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {renderMediaThumbBadge(leadItem, locked, true)}
                    </div>
                    <div className="pt-3.5 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-neutral-500">
                          {linkedConcert ? linkedConcert.title : leadItem.tag || 'BACKSTAGE'} ·{' '}
                          {leadItem.date}
                        </p>
                        <h2 className="mt-1 font-agrandir-extrabold text-xl lg:text-2xl text-white leading-snug tracking-tight group-hover:text-neutral-300 transition-colors">
                          {title}
                        </h2>
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-neutral-500 group-hover:text-white transition-colors shrink-0 mt-1" />
                    </div>
                  </article>
                );
              })()}

              <div className="md:col-span-5 grid grid-cols-1 gap-6">
                {secondaryPair.map((item) => {
                  const linkedConcert = resolveLinkedConcert(item);
                  const title = isEn && item.titleEn ? item.titleEn : item.title;
                  const locked = Boolean(item.membersOnly && !hasBlackCard);
                  return (
                    <article
                      key={item.id}
                      onClick={() => handleOpenMediaPage(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleOpenMediaPage(item);
                        }
                      }}
                      className="group cursor-pointer"
                    >
                      <div className="relative aspect-[16/9] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={title}
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        {renderMediaThumbBadge(item, locked)}
                      </div>
                      <div className="pt-2.5">
                        <p className="text-[11px] text-neutral-500 truncate">
                          {linkedConcert ? linkedConcert.title : item.tag || 'BACKSTAGE'} ·{' '}
                          {item.date}
                        </p>
                        <h3 className="mt-0.5 font-agrandir-extrabold text-base text-white leading-snug line-clamp-1 group-hover:text-neutral-300 transition-colors">
                          {title}
                        </h3>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}

          {/* DESKTOP SUITE : Médias supplémentaires + Passerelle directe Memories */}
          <section className="hidden md:grid md:grid-cols-12 gap-6 items-start">
            {extraItems.slice(0, 1).map((item) => {
              const locked = Boolean(item.membersOnly && !hasBlackCard);
              const title = isEn && item.titleEn ? item.titleEn : item.title;
              return (
                <article
                  key={item.id}
                  onClick={() => handleOpenMediaPage(item)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleOpenMediaPage(item);
                    }
                  }}
                  className="md:col-span-5 group cursor-pointer"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    {renderMediaThumbBadge(item, locked)}
                  </div>
                  <div className="pt-3">
                    <p className="text-[11px] text-neutral-500">
                      {item.membersOnly ? 'LUMARÉEL Black Card' : item.tag || 'BACKSTAGE'}
                    </p>
                    <h3 className="mt-0.5 font-agrandir-extrabold text-base text-white leading-snug group-hover:text-neutral-300 transition-colors">
                      {title}
                    </h3>
                  </div>
                </article>
              );
            })}

            {memoryAlbums[0] && (
              <button
                type="button"
                onClick={() => setSection('memories')}
                className={`${
                  extraItems.length > 0 ? 'md:col-span-7' : 'md:col-span-12'
                } group text-left cursor-pointer block`}
              >
                <div className="aspect-[16/10] w-full overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                  <img
                    src={memoryAlbums[0].coverImage}
                    alt={memoryAlbums[0].title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="pt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.18em] text-neutral-500">
                      MEMORIES · {memoryAlbums[0].date}
                    </p>
                    <h3 className="mt-0.5 font-agrandir-extrabold text-lg lg:text-xl text-white leading-tight group-hover:text-neutral-300 transition-colors truncate">
                      {memoryAlbums[0].title}
                    </h3>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-neutral-500 group-hover:text-white transition-colors shrink-0 mt-1" />
                </div>
              </button>
            )}
          </section>

          {/* Grille additionnelle si l'admin a publié davantage de médias Backstage */}
          {extraItems.length > 1 && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {extraItems.slice(1).map((item) => {
                const locked = Boolean(item.membersOnly && !hasBlackCard);
                const title = isEn && item.titleEn ? item.titleEn : item.title;
                return (
                  <article
                    key={item.id}
                    onClick={() => handleOpenMediaPage(item)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpenMediaPage(item);
                      }
                    }}
                    className="group cursor-pointer"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#0E0E0E] border border-white/[0.12]">
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      {renderMediaThumbBadge(item, locked)}
                    </div>
                    <div className="pt-2.5">
                      <p className="text-[11px] text-neutral-500">
                        {item.tag || 'BACKSTAGE'} · {item.date}
                      </p>
                      <h3 className="mt-0.5 font-agrandir-extrabold text-sm sm:text-base text-white line-clamp-1 group-hover:text-neutral-300 transition-colors">
                        {title}
                      </h3>
                    </div>
                  </article>
                );
              })}
            </section>
          )}

          {/* Liaison directe vers les concerts associés */}
          {publishedEvents.length > 0 && (
            <section className="pt-4 border-t border-white/[0.08]">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white">
                  {isEn ? 'Linked concerts' : 'Concerts associés'}
                </h2>
                <button
                  type="button"
                  onClick={() => setSection('archives')}
                  className="text-xs font-agrandir-semibold text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>{isEn ? 'Archives' : 'Archives'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex overflow-x-auto snap-x gap-3 pb-1 scrollbar-hide">
                {publishedEvents.slice(0, 4).map((ev) => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => handleGoToConcert(ev)}
                    className="group shrink-0 snap-start flex items-center gap-3 bg-[#0E0E0E] border border-white/[0.12] hover:border-[#D4AF6A]/60 p-2.5 pr-4 transition-colors cursor-pointer max-w-[280px]"
                  >
                    <img
                      src={ev.officialPoster || ev.bannerImage || COMMUNITY_MEDIA.crowdArchiveImg}
                      alt={ev.title}
                      referrerPolicy="no-referrer"
                      className="w-11 h-14 object-cover shrink-0"
                    />
                    <span className="min-w-0 text-left">
                      <span className="block text-[10px] text-neutral-400 font-agrandir-semibold truncate">
                        {ev.city || 'Abidjan'}
                      </span>
                      <span className="block text-xs font-agrandir-extrabold text-white truncate group-hover:text-neutral-300 transition-colors">
                        {ev.title}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* VUE 2 : MEMORIES INTÉGRÉ DANS BACKSTAGE */}
      {section === 'memories' && (
        <ConcertMemoriesView embedded onJumpToBackstage={() => setSection('coulisses')} />
      )}

      {section === 'archives' && <ArchiveView embedded />}
    </div>
  );
};
