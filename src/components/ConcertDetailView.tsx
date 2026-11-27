import React from 'react';
import { useApp } from '../context/AppContext';
import { formatDateLong } from '../utils/dateUtils';
import { ArrowLeft, CalendarDays, Clock3, MapPin, Ticket } from 'lucide-react';

export const ConcertDetailView: React.FC = () => {
  const {
    events,
    selectedEventSlug,
    setCheckoutEvent,
    currentUser,
    setIsAuthModalOpen,
    showToast,
    goBack,
    language,
  } = useApp();
  const isEn = language === 'en';
  const event = events.find((item) => item.slug === selectedEventSlug || item.id === selectedEventSlug);

  if (!event) {
    return (
      <div className="mx-auto min-h-[60vh] max-w-4xl px-5 py-16 text-white">
        <button type="button" onClick={goBack} className="mb-8 inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> {isEn ? 'Back' : 'Retour'}
        </button>
        <h1 className="text-2xl font-agrandir-extrabold">{isEn ? 'Event unavailable' : 'Concert indisponible'}</h1>
        <p className="mt-2 text-sm text-neutral-400">{isEn ? 'This event could not be found.' : 'Ce concert est introuvable ou n’est plus disponible.'}</p>
      </div>
    );
  }

  const handleBook = () => {
    if (!currentUser) {
      showToast(isEn ? 'Account required to book tickets.' : 'Connectez-vous pour réserver vos billets.', 'info');
      setCheckoutEvent(event);
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutEvent(event);
  };

  const availableCategories = ['sold_out', 'cancelled', 'completed'].includes(event.status)
    ? []
    : (event.categories || []).filter((category) => category.quota - category.sold > 0);
  const lowestPrice = availableCategories.length
    ? Math.min(...availableCategories.map((category) => category.price))
    : null;

  return (
    <article className="min-h-screen bg-black text-white">
      <div className="relative min-h-[48vh] sm:min-h-[58vh] overflow-hidden bg-[#111]">
        <img
          src={event.bannerImage || event.officialPoster}
          alt={event.title}
          className="absolute inset-0 h-full w-full object-cover grayscale"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="relative mx-auto flex min-h-[48vh] max-w-7xl flex-col justify-end px-5 pb-8 pt-20 sm:min-h-[58vh] sm:px-10 sm:pb-12 md:pl-[3.5rem]">
          <button type="button" onClick={goBack} className="absolute left-5 top-6 inline-flex items-center gap-2 text-xs text-white/80 hover:text-white sm:left-10">
            <ArrowLeft className="h-4 w-4" /> {isEn ? 'Back' : 'Retour'}
          </button>
          <p className="mb-3 text-[10px] uppercase tracking-[0.24em] text-neutral-300">{event.genre}</p>
          <h1 className="max-w-4xl text-4xl font-agrandir-extrabold leading-[0.98] tracking-tight sm:text-6xl">{event.title}</h1>
          <p className="mt-3 text-sm text-neutral-300 sm:text-base">{event.artist}</p>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:py-14">
        <div className="space-y-9">
          <section className="grid grid-cols-1 gap-5 border-y border-white/15 py-6 sm:grid-cols-3">
            <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-neutral-400" /><div><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Date' : 'Date'}</p><p className="mt-1 text-sm">{formatDateLong(event.date, language)}</p></div></div>
            <div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-4 w-4 text-neutral-400" /><div><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Doors / Start' : 'Ouverture / Début'}</p><p className="mt-1 text-sm">{event.doorsOpen || '—'} / {event.time || '—'}</p></div></div>
            <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-neutral-400" /><div><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Venue' : 'Lieu'}</p><p className="mt-1 text-sm">{event.venue}{event.city ? `, ${event.city}` : ''}</p>{event.address && <p className="mt-1 text-xs text-neutral-500">{event.address}</p>}</div></div>
          </section>
          {event.description && (
            <section>
              <h2 className="mb-3 text-lg font-agrandir-extrabold">{isEn ? 'About the event' : 'À propos du concert'}</h2>
              <p className="max-w-3xl whitespace-pre-line text-sm leading-7 text-neutral-300">{event.description}</p>
            </section>
          )}
          {event.categories?.length > 0 && (
            <section>
              <h2 className="mb-4 text-lg font-agrandir-extrabold">{isEn ? 'Ticket categories' : 'Catégories de billets'}</h2>
              <div className="divide-y divide-white/10 border-y border-white/10">
                {event.categories.map((category) => {
                  const remaining = Math.max(0, category.quota - category.sold);
                  return <div key={category.id} className="flex items-center justify-between gap-4 py-4">
                    <div className="min-w-0"><p className="text-sm font-agrandir-semibold">{category.name}</p>{category.description && <p className="mt-1 text-xs text-neutral-500">{category.description}</p>}<p className="mt-1 text-[11px] text-neutral-500">{remaining > 0 ? (isEn ? `${remaining} available` : `${remaining} disponible(s)`) : (isEn ? 'Sold out' : 'Épuisé')}</p></div>
                    <p className="shrink-0 text-sm font-agrandir-semibold tabular-nums">{category.price.toLocaleString('fr-FR')} {category.currency}</p>
                  </div>;
                })}
              </div>
            </section>
          )}
          {(event.infoline || event.organizerName) && (
            <section className="border-t border-white/10 pt-6">
              <h2 className="mb-3 text-lg font-agrandir-extrabold">{isEn ? 'Practical information' : 'Informations pratiques'}</h2>
              {event.organizerName && <p className="text-sm text-neutral-300">{isEn ? 'Organizer' : 'Organisateur'} : {event.organizerName}</p>}
              {event.infoline && <p className="mt-1 text-sm text-neutral-300">{isEn ? 'Information' : 'Contact'} : {event.infoline}</p>}
            </section>
          )}
        </div>

        <aside className="h-fit border border-white/15 bg-[#0b0b0b] p-5 sm:p-6 lg:sticky lg:top-8">
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{isEn ? 'Ticketing' : 'Billetterie'}</p>
          <p className="mt-3 text-2xl font-agrandir-extrabold">{lowestPrice !== null ? `Dès ${lowestPrice.toLocaleString('fr-FR')} F CFA` : (isEn ? 'Unavailable' : 'Indisponible')}</p>
          <p className="mt-2 text-xs leading-5 text-neutral-500">{availableCategories.length ? (isEn ? 'Availability depends on ticket category.' : 'La disponibilité dépend de la catégorie choisie.') : (isEn ? 'No ticket category is currently available.' : 'Aucune catégorie de billet n’est actuellement disponible.')}</p>
          <button type="button" onClick={handleBook} disabled={!availableCategories.length} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 bg-white px-4 text-xs font-agrandir-extrabold uppercase tracking-wider text-black transition-colors hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400">
            <Ticket className="h-4 w-4" /> {isEn ? 'Buy a ticket' : 'Acheter un ticket'}
          </button>
          {event.status === 'sold_out' && <p className="mt-3 text-center text-[11px] text-neutral-500">{isEn ? 'Public sale sold out' : 'Vente publique épuisée'}</p>}
        </aside>
      </div>
    </article>
  );
};
