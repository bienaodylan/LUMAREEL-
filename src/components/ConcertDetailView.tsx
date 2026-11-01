import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { ArrowLeft, Calendar, MapPin, ShieldCheck, Ticket, Check } from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';

export const ConcertDetailView: React.FC = () => {
  const { events, selectedEventSlug, setCurrentPage, setCheckoutEvent, currentUser, setIsAuthModalOpen, language, t } = useApp();

  const event = events.find((e) => e.slug === selectedEventSlug) || events[0];

  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    event?.categories[0]?.id || ''
  );
  const [quantity, setQuantity] = useState<number>(1);

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <p className="text-sm font-agrandir-regular text-[#888]">Événement non trouvé.</p>
        <button
          onClick={() => setCurrentPage('discover')}
          className="mt-4 px-4 py-2 text-xs font-agrandir-semibold border border-[#333] text-white"
        >
          Retour au catalogue
        </button>
      </div>
    );
  }

  const selectedCategory = event.categories.find((c) => c.id === selectedCategoryId) || event.categories[0];
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
    <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-24 sm:pt-28 pb-20 select-none font-agrandir-regular">
      
      {/* Back button with rounded capsule */}
      <button
        onClick={() => setCurrentPage('discover')}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-agrandir-regular tracking-widest text-[#aaa] hover:text-white hover:border-white/30 transition-all mb-8 uppercase cursor-pointer backdrop-blur-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>{t('detail.backToCatalog')}</span>
      </button>

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
            {/* Header info pills sans catégorie musicale */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs font-agrandir-regular tracking-wider uppercase mb-3">
              <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#aaa] text-[11px]">
                {event.city}, {event.country}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] font-agrandir-semibold text-[11px]">
                {event.status === 'published' ? t('detail.openBookings') : t('detail.salesSoon')}
              </span>
            </div>

            <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl md:text-6xl text-white tracking-tight uppercase leading-[1.02] mb-6 text-balance">
              {event.artist} EN CONCERT
            </h1>

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
                  const catRemaining = cat.quota - cat.sold;
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
                        <span className="ml-auto px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-agrandir-semibold text-[#888] uppercase">
                          {isSoldOut ? t('upcoming.soldOut') : `${catRemaining} ${t('detail.remaining')}`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STEP 2: SELECT QUANTITY */}
            <div className="mb-8 p-5 sm:p-6 bg-[#0c0c0c] border border-white/10 rounded-2xl sm:rounded-3xl shadow-lg">
              <div className="flex items-center justify-between text-xs font-agrandir-regular tracking-wider text-[#aaa] uppercase mb-4">
                <span className="font-agrandir-semibold text-white">{t('detail.step2')}</span>
                <span className="text-[11px] text-[#777]">{t('detail.maxLimit')}</span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Stepper */}
                <div className="flex items-center border border-white/20 bg-[#161616] rounded-full overflow-hidden shadow-inner w-fit">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-11 h-11 text-white font-agrandir-semibold text-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-agrandir-extrabold text-white text-base">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(Math.min(8, remaining), quantity + 1))}
                    disabled={quantity >= Math.min(8, remaining)}
                    className="w-11 h-11 text-white font-agrandir-semibold text-lg hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                  >
                    +
                  </button>
                </div>

                <div className="text-xs font-agrandir-regular text-[#999]">
                  {quantity > 1 ? `${quantity} ${t('detail.multipleTickets')}` : t('detail.singleTicket')}
                </div>
              </div>
            </div>

            {/* TOTAL CALCULATION & PURCHASE ACTION */}
            <div className="p-6 sm:p-8 bg-[#0e0e0e] border border-white/15 rounded-3xl space-y-5 shadow-2xl">
              <div className="flex items-baseline justify-between font-agrandir-regular">
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

              {/* Purchase button */}
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

          </div>

        </div>

      </div>

    </div>
  );
};
