import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  Camera,
  Check,
  MapPin,
  Ticket,
  X,
} from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';
import {
  MediaHubItem,
  VisualOverridesMap,
  getPublishedMediaItems,
  loadMediaHubItems,
  loadVisualOverrides,
  subscribeMediaHub,
} from '../utils/mediaHubStorage';
import { selectEventVisual } from '../utils/visualSelector';

/**
 * Page Concert dédiée — Centre de l'univers d'un événement LUMARÉEL.
 * Monochrome Noir & Blanc, sélection contextuelle intelligente des visuels,
 * billetterie existante préservée à 100 % et connexion directe aux médias
 * BACKSTAGE & MEMORIES associés.
 */
export const ConcertDetailView: React.FC = () => {
  const {
    events,
    selectedEventSlug,
    goBack,
    setCheckoutEvent,
    currentUser,
    setIsAuthModalOpen,
    setCurrentPage,
    setSelectedMediaId,
    language,
    t,
  } = useApp();

  const isEn = language === 'en';
  const event = events.find((e) => e.slug === selectedEventSlug) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    event?.categories[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [mediaItems, setMediaItems] = useState<MediaHubItem[]>(() => loadMediaHubItems());
  const [visualOverrides, setVisualOverrides] = useState<VisualOverridesMap>(() =>
    loadVisualOverrides()
  );

  useEffect(() => {
    return subscribeMediaHub(() => {
      setMediaItems(loadMediaHubItems());
      setVisualOverrides(loadVisualOverrides());
    });
  }, []);

  useEffect(() => {
    if (event?.categories?.[0]?.id) {
      setSelectedCategoryId(event.categories[0].id);
      setQuantity(1);
    }
  }, [event?.id]);

  const publishedMedia = useMemo(() => getPublishedMediaItems(mediaItems), [mediaItems]);

  const concertMemoriesItems = useMemo(() => {
    if (!event) return [];
    const matched = publishedMedia.filter(
      (m) =>
        m.placement === 'memories' &&
        (m.eventId === event.id ||
          (m.artistName &&
            m.artistName.toLowerCase().trim() === event.artist.toLowerCase().trim()))
    );
    return matched.length > 0
      ? matched.slice(0, 4)
      : publishedMedia.filter((m) => m.placement === 'memories').slice(0, 4);
  }, [publishedMedia, event]);

  if (!event) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-sm font-agrandir-regular text-neutral-400">{t('detail.notFound')}</p>
        <button
          type="button"
          onClick={goBack}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs font-agrandir-semibold border border-white/20 text-white rounded-full hover:border-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('nav.back')}</span>
        </button>
      </div>
    );
  }

  const primaryVisual = selectEventVisual(event, 'concert', publishedMedia, visualOverrides);
  const selectedCategory =
    event.categories.find((c) => c.id === selectedCategoryId) || event.categories[0];
  const remaining = selectedCategory ? selectedCategory.quota - selectedCategory.sold : 0;
  const totalPrice = selectedCategory ? selectedCategory.price * quantity : 0;

  const handleProceedToPurchase = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutEvent(event);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-5 sm:pt-10 pb-20 select-none font-agrandir-regular text-white">
      {/* Barre supérieure discrète : Retour desktop + Fermer */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={goBack}
          className="hidden md:inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('nav.back')}</span>
        </button>

        <button
          type="button"
          onClick={goBack}
          className="ml-auto w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.14] flex items-center justify-center text-neutral-300 hover:text-white transition-all cursor-pointer active:scale-95 group"
          aria-label={t('nav.close')}
          title={t('nav.close')}
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* SECTION PRINCIPALE : VISUEL + INFOS & BILLETTERIE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 pb-16 border-b border-white/[0.08]">
        {/* Colonne gauche (5 cols) : Visuel principal sélectionné contextuellement */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <div className="aspect-[3/4] rounded-[22px] bg-[#0E0E0E] border border-white/[0.12] overflow-hidden relative">
              <img
                src={primaryVisual.url}
                alt={`${event.artist} — ${event.title}`}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover ${primaryVisual.objectPositionClass}`}
              />
            </div>

            {event.description && (
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed pt-1">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* Colonne droite (7 cols) : Identité, Infos pratiques & Billetterie */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <p className="text-xs text-neutral-400 mb-2.5">
              <span className="text-white font-agrandir-semibold">
                {event.city}, {event.country}
              </span>
              {' · '}
              <span>
                {event.status === 'published' ? t('detail.openBookings') : t('detail.salesSoon')}
              </span>
            </p>

            <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight uppercase leading-[1.02] mb-6 text-balance">
              {event.artist} {t('home.inConcert')}
            </h1>

            {/* Informations pratiques (monochrome épuré) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 py-5 border-y border-white/[0.08] mb-8 text-xs">
              <div className="flex items-start gap-3.5">
                <Calendar className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-neutral-500 uppercase text-[10px] tracking-wider font-agrandir-semibold">
                    {t('detail.dateTime')}
                  </div>
                  <div className="text-white font-agrandir-semibold text-sm mt-0.5">
                    <strong className="font-agrandir-extrabold text-white">
                      {formatDateLong(event.date, language)}
                    </strong>{' '}
                    · <strong className="font-agrandir-extrabold text-white">{event.time}</strong>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    {t('detail.doorsOpen')} {event.doorsOpen}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MapPin className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                <div>
                  <div className="text-neutral-500 uppercase text-[10px] tracking-wider font-agrandir-semibold">
                    {t('detail.venueAccess')}
                  </div>
                  <div className="text-white font-agrandir-semibold text-sm mt-0.5">
                    <strong className="font-agrandir-extrabold text-white">{event.venue}</strong>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    {event.address || `${event.city}, ${event.country}`}
                  </div>
                </div>
              </div>
            </div>

            {/* ÉTAPE 1 : CATÉGORIES DE BILLETS */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs tracking-[0.18em] text-neutral-400 uppercase mb-4">
                <span className="font-agrandir-semibold text-white">{t('detail.step1')}</span>
              </div>

              <div className="space-y-3">
                {event.categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const catRemaining = Math.max(0, cat.quota - cat.sold);
                  const isSoldOut = catRemaining <= 0;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => !isSoldOut && setSelectedCategoryId(cat.id)}
                      className={`p-5 rounded-[18px] border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-[#D4AF6A] bg-[#141414]'
                          : isSoldOut
                          ? 'border-white/[0.08] bg-[#080808] opacity-40 cursor-not-allowed'
                          : 'border-white/[0.12] bg-[#0E0E0E] hover:border-white/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#D4AF6A] bg-[#D4AF6A]' : 'border-white/30'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                          </div>
                          <span className="font-agrandir-extrabold text-sm sm:text-base tracking-wide text-white uppercase">
                            {cat.name}
                          </span>
                        </div>

                        <span className="text-base sm:text-lg font-agrandir-extrabold text-white tabular-nums">
                          {cat.price.toLocaleString()} FCFA
                        </span>
                      </div>

                      <p className="text-xs text-neutral-400 pl-7 mb-2.5">{cat.description}</p>

                      {cat.perks && cat.perks.length > 0 && (
                        <div className="pl-7 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-300">
                          {cat.perks.map((perk, i) => (
                            <span key={i} className="inline-flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-white" />
                              <span>{perk}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ÉTAPE 2 : QUANTITÉ & PAIEMENT */}
            <div className="p-6 sm:p-7 rounded-[22px] bg-[#0E0E0E] border border-white/[0.12] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-agrandir-semibold tracking-wider text-white uppercase mb-1">
                    {t('detail.step2')}
                  </div>
                  <div className="text-[11px] text-[#9A9A9A]">{t('detail.selectQty')}</div>
                </div>
                <div className="flex items-center border border-white/20 bg-[#141414] rounded-full overflow-hidden w-fit">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label={t('detail.decreaseQty')}
                    className="w-11 h-11 text-white font-agrandir-semibold text-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-agrandir-extrabold text-white text-base tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(remaining, quantity + 1))}
                    disabled={quantity >= remaining}
                    aria-label={t('detail.increaseQty')}
                    className="w-11 h-11 text-white font-agrandir-semibold text-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/[0.12]" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#9A9A9A] tracking-widest uppercase font-agrandir-semibold">
                  {t('detail.totalPrice')}
                </span>
                <div className="text-right">
                  <div className="text-2xl sm:text-4xl font-agrandir-extrabold text-[#D4AF6A] tabular-nums">
                    {totalPrice.toLocaleString()} FCFA
                  </div>
                  <div className="text-xs text-[#9A9A9A] mt-0.5">{t('detail.feesIncluded')}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceedToPurchase}
                disabled={remaining <= 0 || event.status !== 'published'}
                className="w-full min-h-[50px] py-3.5 text-xs font-agrandir-extrabold tracking-[0.18em] uppercase text-black bg-[#D4AF6A] hover:bg-[#DFBE7D] rounded-full disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer lum-press"
              >
                <Ticket className="w-4 h-4" strokeWidth={1.6} />
                <span>
                  {remaining <= 0
                    ? isEn
                      ? 'Sold out'
                      : 'Complet'
                    : event.status !== 'published'
                    ? t('detail.salesSoon')
                    : t('detail.proceedPayment')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION CONNECTÉE : SOUVENIRS DU CONCERT */}
      {concertMemoriesItems.length > 0 && (
        <section className="pt-14 space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-5">
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white inline-flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-neutral-400" />
                <span>{isEn ? 'Photos & Memories' : 'Photos & Souvenirs'}</span>
              </h2>
              <button
                type="button"
                onClick={() => setCurrentPage('memories')}
                className="text-xs font-agrandir-semibold text-neutral-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>{isEn ? 'Open Memories' : 'Voir les souvenirs'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {concertMemoriesItems.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() => {
                    setSelectedMediaId(photo.id);
                    setCurrentPage('media_detail');
                  }}
                  className="group relative aspect-[4/3] rounded-[16px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] hover:border-white/30 cursor-pointer transition-colors"
                >
                  <img
                    src={photo.url}
                    alt={photo.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-[0.88] group-hover:scale-[1.04] transition-transform duration-500"
                  />
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
