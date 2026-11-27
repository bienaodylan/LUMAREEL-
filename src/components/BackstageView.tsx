import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  MediaHubItem,
  getPublishedMediaItems,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import { loadStoredMemberCard } from '../utils/memberCardStorage';
import { PageHeader } from './ui/EditorialPrimitives';
import { ArrowUpRight, Lock, Play } from 'lucide-react';

/**
 * BACKSTAGE — Destination média monochrome unifiée regroupant Coulisses & Memories.
 * Miniatures 100 % dégagées : titres et repères placés proprement sous chaque visuel.
 */
export const BackstageView: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    currentUser,
    events,
    setCurrentPage,
    setSelectedMediaId,
    showToast,
    language,
  } = useApp();

  const isEn = language === 'en';
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
    setSelectedMediaId(item.id);
    setCurrentPage('media_detail');
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
    <div className={`w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-10 ${embedded ? "pt-0 pb-8" : "min-h-screen pt-4 sm:pt-9 pb-20"} text-white font-agrandir-regular`}>
      {!embedded && (
        <PageHeader
          compact
          eyebrow={isEn ? 'Inside LUMARÉEL' : 'Dans les coulisses'}
          title="BACKSTAGE"
        />
      )}

      {/* VUE 1 : COULISSES */}
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

      </div>
    </div>
  );
};
