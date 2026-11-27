import React from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import { ArrowRight, Ticket } from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';

export const UpcomingConcerts: React.FC = () => {
  const { events, setCheckoutEvent, language, t } = useApp();

  const handleBookNow = (event: ConcertEvent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCheckoutEvent(event);
  };

  const publishedEvents = events.filter((e) => e.status !== 'draft');

  return (
    <div className="max-w-7xl mx-auto px-6 pt-8 sm:pt-12 pb-16 select-none">
      
      {/* Header */}
      <div className="mb-14 border-b border-[#1c1c1c] pb-8">
        <div className="text-xs font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
          {t('upcoming.headerKicker')}
        </div>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase">
          {t('upcoming.mainTitle')}
        </h1>
        <p className="mt-3 text-sm font-agrandir-regular text-[#888] max-w-xl font-light">
          {t('upcoming.subtitle')}
        </p>
      </div>

      {/* Events Grid / Editorial Roster */}
      <div className="space-y-12">
        {publishedEvents.map((event, index) => {
          const totalQuota = event.categories.reduce((acc, cat) => acc + cat.quota, 0);
          const totalSold = event.categories.reduce((acc, cat) => acc + cat.sold, 0);
          const remaining = totalQuota - totalSold;
          const minPrice = Math.min(...event.categories.map((c) => c.price));

          return (
            <article
              key={event.id}
              onClick={() => handleBookNow(event)}
              className="group cursor-pointer border border-white/10 bg-[#0c0c0c] hover:border-white/30 rounded-3xl transition-all duration-300 p-6 sm:p-8 relative shadow-xl hover:shadow-2xl"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                
                {/* Visual: Official Concert Poster Preview */}
                <div className="lg:col-span-4 aspect-[3/4] bg-[#161616] border border-white/10 rounded-2xl overflow-hidden relative shadow-lg">
                  <img
                    src={event.officialPoster}
                    alt={`Affiche officielle — ${event.title}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1 text-[10px] font-agrandir-semibold tracking-widest text-white uppercase rounded-full border border-white/15">
                    {t('upcoming.officialPoster')}
                  </div>
                </div>

                {/* Content & Details */}
                <div className="lg:col-span-8 flex flex-col justify-between h-full">
                  <div>
                    {/* Index & Status */}
                    <div className="flex items-center justify-between text-xs font-agrandir-regular tracking-wider text-[#777] mb-3">
                      <span className="font-agrandir-semibold text-[#888]">0{index + 1} / {t('upcoming.officialSelection')}</span>
                      <span className="text-white font-agrandir-semibold px-3 py-0.5 rounded-full bg-white/10 border border-white/15 text-[11px]">
                        {event.status === 'sold_out'
                          ? t('upcoming.soldOut')
                          : remaining < 50
                          ? `${t('upcoming.lastSeats')} (${remaining})`
                          : t('upcoming.available')}
                      </span>
                    </div>

                    {/* Artist & Title */}
                    <h2 className="font-agrandir-extrabold text-2xl sm:text-4xl text-white tracking-tight mb-1 group-hover:text-[#FAFAFA] transition-colors uppercase">
                      {event.artist} {t('home.inConcert')}
                    </h2>
                    <div className="text-base sm:text-xl text-[#d4d4d4] font-agrandir-semibold mb-4 uppercase">
                      {event.title}
                    </div>

                    <p className="text-sm font-agrandir-regular text-[#888] leading-relaxed line-clamp-3 mb-6">
                      {event.description}
                    </p>

                    {/* Metadata row with bold date and venue */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 my-6 text-xs font-agrandir-regular text-[#aaa]">
                      <div>
                        <div className="text-[#666] text-[10px] uppercase tracking-wider mb-1 font-agrandir-semibold">{t('upcoming.dateTime')}</div>
                        <div className="text-white font-agrandir-semibold"><strong className="font-agrandir-extrabold text-white">{formatDateLong(event.date, language)}</strong> · {event.time}</div>
                      </div>
                      <div>
                        <div className="text-[#666] text-[10px] uppercase tracking-wider mb-1 font-agrandir-semibold">{t('upcoming.venue')}</div>
                        <div className="text-white font-agrandir-semibold"><strong className="font-agrandir-extrabold text-white">{event.venue}</strong></div>
                        <div className="text-[#777] text-[11px]">{event.city}, {event.country}</div>
                      </div>
                      <div>
                        <div className="text-[#666] text-[10px] uppercase tracking-wider mb-1 font-agrandir-semibold">{t('upcoming.startPrice')}</div>
                        <div className="text-white font-agrandir-extrabold text-sm">
                          {minPrice.toLocaleString()} FCFA
                        </div>
                      </div>
                    </div>

                    {/* Categories overview with rounded-full pills */}
                    <div className="mb-6">
                      <div className="text-[10px] font-agrandir-regular tracking-wider text-[#666] uppercase mb-2">
                        {t('upcoming.availableCategories')}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {event.categories.map((cat) => (
                          <div
                            key={cat.id}
                            className="text-xs font-agrandir-regular px-3.5 py-1 bg-[#141414] border border-white/10 rounded-full text-[#ccc] flex items-center"
                          >
                            <span>{cat.name}</span>
                            <span className="text-[#888] ml-2 font-agrandir-semibold">
                              {cat.price.toLocaleString()} FCFA
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action unique pleine largeur : Acheter tickets */}
                  <div className="pt-4 border-t border-white/10">
                    <button
                      onClick={(e) => handleBookNow(event, e)}
                      className="w-full px-6 py-3.5 text-xs font-agrandir-extrabold tracking-widest uppercase bg-white text-black hover:bg-[#EAEAEA] rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>{t('home.buyTickets')}</span>
                    </button>
                  </div>

                </div>

              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};
