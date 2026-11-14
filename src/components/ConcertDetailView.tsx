import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { ArrowLeft, ChevronLeft, Calendar, MapPin, ShieldCheck, Ticket, Check, X, Heart, Bell, BellRing, BellOff } from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';
import { getConcertReminderInfo } from '../utils/concertNotifications';

export const ConcertDetailView: React.FC = () => {
  const {
    events,
    selectedEventSlug,
    setCurrentPage,
    setCheckoutEvent,
    currentUser,
    setIsAuthModalOpen,
    language,
    t,
    isFavoriteEvent,
    toggleFavoriteEvent,
    notificationsEnabled,
    notificationPermission,
    requestNotificationPermission,
    notifiedEventIds,
    showToast,
  } = useApp();

  const event = events.find((e) => e.slug === selectedEventSlug) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    event?.categories[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  if (!event) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-sm font-agrandir-regular text-[#888]">Événement non trouvé.</p>
        <button
          onClick={() => setCurrentPage('home')}
          className="mt-4 px-4 py-2 text-xs font-agrandir-semibold border border-[#333] text-white rounded-xl hover:border-white transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    );
  }

  const selectedCategory = event.categories.find((c) => c.id === selectedCategoryId) || event.categories[0];
  const remaining = selectedCategory ? selectedCategory.quota - selectedCategory.sold : 0;
  const totalPrice = selectedCategory ? selectedCategory.price * quantity : 0;
  const isFavorited = isFavoriteEvent(event.id);
  const reminderInfo = getConcertReminderInfo(
    event,
    notifiedEventIds,
    notificationsEnabled,
    notificationPermission
  );

  const handleEnablePushFromDetail = async () => {
    const perm = await requestNotificationPermission();
    if (perm === 'granted') {
      showToast(
        language === 'en'
          ? 'Push notifications enabled! You will be alerted 30 minutes before the concert.'
          : 'Notifications push activées ! Vous serez alerté 30 minutes avant le début du concert.',
        'success'
      );
    } else if (perm === 'denied') {
      showToast(
        language === 'en'
          ? 'Browser notifications are blocked. Open Profile Preferences to view unblock instructions.'
          : 'Les notifications navigateur sont bloquées. Consultez vos Préférences dans Profil pour les débloquer.',
        'info'
      );
    }
  };

  const handleProceedToPurchase = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutEvent(event);
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-20 sm:pt-24 pb-20 select-none font-agrandir-regular">
      
      {/* Barre de retour supérieure avec flèche et croix de fermeture */}
      <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8 pb-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-bold tracking-wider text-white hover:border-white transition-all uppercase cursor-pointer backdrop-blur-md active:scale-95 shadow-md group"
          title="Retourner aux concerts"
        >
          <ArrowLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-0.5 transition-transform" />
          <span>RETOUR</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md group"
          title="Fermer et revenir à l'accueil"
          aria-label="Fermer"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5 text-neutral-300 group-hover:text-white group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14">
        
        {/* Left Column (5 cols): Artist Portrait */}
        <div className="lg:col-span-5">
          <div className="sticky top-28 space-y-4">
            <div className="aspect-[3/4] bg-[#121212] border border-white/15 rounded-3xl overflow-hidden relative shadow-2xl">
              <img
                src={event.artistPortrait && event.artistPortrait.trim() !== '' ? event.artistPortrait : (event.bannerImage || event.officialPoster || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg')}
                alt={`Photo de l'artiste — ${event.artist}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover filter contrast-105"
              />
              <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-agrandir-semibold tracking-[0.2em] text-[#d4af37] uppercase rounded-full border border-[#d4af37]/30 shadow-md flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                <span>{event.artist}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Information, Artist, Categories & Ticketing */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          
          <div>
            {/* Header info pills & Favori Rappel 30 min */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-agrandir-regular tracking-wider uppercase mb-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#aaa] text-[11px]">
                  {event.city}, {event.country}
                </span>
                <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] font-agrandir-semibold text-[11px]">
                  {event.status === 'published' ? t('detail.openBookings') : t('detail.salesSoon')}
                </span>
              </div>

              <button
                type="button"
                onClick={() => toggleFavoriteEvent(event.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-[11px] font-agrandir-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  isFavorited
                    ? 'bg-[#d4af37]/15 border-[#d4af37]/60 text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                    : 'bg-white/5 border-white/15 text-neutral-300 hover:text-white hover:border-white/40'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
                <span>{isFavorited ? 'Dans mes favoris' : 'Ajouter aux favoris'}</span>
              </button>
            </div>

            <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight uppercase leading-[1.02] mb-6 text-balance">
              {event.artist} EN CONCERT
            </h1>

            {/* Bandeau d'état du rappel 30 minutes avant pour les concerts favoris */}
            {isFavorited && (
              <div className="mb-6 p-4 rounded-2xl bg-[#111111] border border-[#d4af37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center shrink-0 mt-0.5">
                    {reminderInfo.status === 'paused' ? (
                      <BellOff className="w-4 h-4 text-neutral-400" />
                    ) : reminderInfo.status === 'scheduled' || reminderInfo.status === 'imminent' ? (
                      <BellRing className="w-4 h-4 text-[#d4af37]" />
                    ) : (
                      <Bell className="w-4 h-4 text-[#d4af37]" />
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-agrandir-bold text-white uppercase tracking-wide">
                      {reminderInfo.status === 'past'
                        ? 'Concert passé'
                        : reminderInfo.status === 'sent'
                        ? 'Alerte 30 minutes envoyée'
                        : reminderInfo.status === 'paused'
                        ? 'Rappels en pause dans vos préférences'
                        : `Rappel automatique prévu à ${reminderInfo.reminderTimeLabel}`}
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                      {reminderInfo.status === 'paused'
                        ? 'Réactivez les alertes dans votre Profil pour être notifié 30 min avant le début.'
                        : reminderInfo.status === 'scheduled_inapp' && notificationPermission !== 'granted'
                        ? 'Autorisez les notifications push pour recevoir l’alerte même hors onglet (30 min avant).'
                        : 'Vous recevrez une notification locale 30 minutes avant le début du concert.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {notificationPermission === 'default' && notificationsEnabled && (
                    <button
                      type="button"
                      onClick={handleEnablePushFromDetail}
                      className="px-3.5 py-2 rounded-full bg-[#d4af37] hover:bg-[#e5c158] text-black font-agrandir-extrabold text-[10px] uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Autoriser le push
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setCurrentPage('profile')}
                    className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] font-agrandir-semibold text-neutral-200 uppercase tracking-wider cursor-pointer transition-colors"
                  >
                    Gérer
                  </button>
                </div>
              </div>
            )}

            {/* Practical information grid with bold date and venue */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 sm:p-6 bg-[#0c0c0c] border border-white/10 rounded-2xl sm:rounded-3xl mb-8 text-xs font-agrandir-regular shadow-lg">
              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <div className="text-[#777] uppercase text-[10px] tracking-wider font-agrandir-semibold">{t('detail.dateTime')}</div>
                  <div className="text-white font-agrandir-semibold text-sm mt-0.5">
                    <strong className="font-agrandir-extrabold text-white">{formatDateLong(event.date, language)}</strong> · <strong className="font-agrandir-extrabold text-white">{event.time}</strong>
                  </div>
                  <div className="text-[#888] text-[11px] mt-0.5">{t('detail.doorsOpen')} {event.doorsOpen}</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-[#d4af37]" />
                </div>
                <div>
                  <div className="text-[#777] uppercase text-[10px] tracking-wider font-agrandir-semibold">{t('detail.venueAccess')}</div>
                  <div className="text-white font-agrandir-semibold text-sm mt-0.5">
                    <strong className="font-agrandir-extrabold text-white">{event.venue}</strong>
                  </div>
                  <div className="text-[#888] text-[11px] mt-0.5">{event.address || `${event.city}, ${event.country}`}</div>
                </div>
              </div>
            </div>

            {/* STEP 1: SELECT TICKET CATEGORY (Clean, no 'quotas contrôlés en temps réel') */}
            <div className="mb-8">
              <div className="flex items-center justify-between text-xs font-agrandir-regular tracking-[0.2em] text-[#AAA] uppercase mb-4">
                <span className="font-agrandir-semibold text-white">{t('detail.step1')}</span>
              </div>

              {/* Category cards */}
              <div className="space-y-3.5">
                {event.categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  const catRemaining = Math.max(0, cat.quota - cat.sold);
                  const isSoldOut = catRemaining <= 0;

                  return (
                    <div
                      key={cat.id}
                      onClick={() => !isSoldOut && setSelectedCategoryId(cat.id)}
                      className={`p-5 rounded-2xl sm:rounded-3xl border transition-all duration-300 cursor-pointer shadow-lg ${
                        isSelected
                          ? 'border-white bg-[#141414] ring-1 ring-white/30 shadow-white/5'
                          : isSoldOut
                          ? 'border-white/5 bg-[#090909] opacity-40 cursor-not-allowed'
                          : 'border-white/10 bg-[#0c0c0c] hover:border-white/30 hover:bg-[#111111]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-white bg-white' : 'border-white/30'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                          </div>
                          <span className="font-agrandir-extrabold text-sm sm:text-base tracking-wide text-white uppercase">
                            {cat.name}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-base sm:text-lg font-agrandir-extrabold text-white">
                            {cat.price.toLocaleString()} FCFA
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-agrandir-regular text-[#aaa] pl-7 mb-3">
                        {cat.description}
                      </p>

                      <div className="pl-7 flex flex-wrap items-center gap-2 text-[11px] font-agrandir-regular">
                        {cat.perks.map((perk, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/90"
                          >
                            <Check className="w-3 h-3 text-[#d4af37]" />
                            <span>{perk}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SÉLECTEUR DE QUANTITÉ ET TOTAL — SECTION UNIQUE */}
            <div className="mb-8 p-6 sm:p-8 bg-[#0e0e0e] border border-white/15 rounded-3xl space-y-6 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-agrandir-semibold tracking-wider text-white uppercase mb-1">
                    {t('detail.step2')}
                  </div>
                  <div className="text-[11px] text-[#777]">
                    Sélectionnez le nombre de billets
                  </div>
                </div>
                <div className="flex items-center border border-white/20 bg-[#161616] rounded-full overflow-hidden shadow-inner w-fit">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    aria-label="Diminuer la quantité"
                    className="w-12 h-12 text-white font-agrandir-semibold text-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-14 text-center font-agrandir-extrabold text-white text-base tabular-nums">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(remaining, quantity + 1))}
                    disabled={quantity >= remaining}
                    aria-label="Augmenter la quantité"
                    className="w-12 h-12 text-white font-agrandir-semibold text-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div className="flex items-center justify-between gap-4">
                <span className="text-xs text-[#888] tracking-widest uppercase font-agrandir-semibold">{t('detail.totalPrice')}</span>
                <div className="text-right">
                  <div className="text-3xl sm:text-4xl font-agrandir-extrabold text-white">
                    {totalPrice.toLocaleString()} FCFA
                  </div>
                  <div className="text-xs text-[#888] mt-0.5">
                    {t('detail.feesIncluded')}
                  </div>
                </div>
              </div>

              <button
                onClick={handleProceedToPurchase}
                disabled={remaining <= 0 || event.status !== 'published'}
                className="w-full py-4 text-xs font-agrandir-extrabold tracking-[0.2em] uppercase text-black bg-white hover:bg-[#EAEAEA] rounded-full disabled:bg-[#222] disabled:text-[#666] disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xl"
              >
                <Ticket className="w-4 h-4" />
                <span>
                  {event.status !== 'published'
                    ? t('detail.salesSoon')
                    : remaining <= 0
                    ? t('detail.categoryFull')
                    : t('detail.buyTicketsBtn')}
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] font-agrandir-regular text-[#777] pt-1">
                <ShieldCheck className="w-4 h-4 text-[#888]" />
                <span>{t('detail.secureBadge')}</span>
              </div>
            </div>

            {/* Bouton de retour en bas de page pour navigation fluide */}
            <div className="pt-4 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setCurrentPage('home')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-xs font-agrandir-semibold tracking-wider text-neutral-300 hover:text-white transition-all uppercase cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-[#d4af37]" />
                <span>Retourner à la programmation</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
