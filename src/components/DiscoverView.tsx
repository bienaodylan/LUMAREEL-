import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  Search,
  Calendar,
  MapPin,
  Ticket,
  ArrowRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface MonthGroup {
  monthTitle: string;
  events: ConcertEvent[];
}

export const DiscoverView: React.FC = () => {
  const { events, setSelectedEventSlug, setCurrentPage, setCheckoutEvent } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedGenre, setSelectedGenre] = useState('all');

  const genres = ['all', ...Array.from(new Set(events.map((e) => e.genre)))];

  // Filter events
  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      search === '' ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.artist.toLowerCase().includes(search.toLowerCase()) ||
      e.venue.toLowerCase().includes(search.toLowerCase()) ||
      e.city.toLowerCase().includes(search.toLowerCase());

    const matchesCity = selectedCity === 'all' || e.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesGenre = selectedGenre === 'all' || e.genre === selectedGenre;

    return matchesSearch && matchesCity && matchesGenre;
  });

  // Sort chronologically
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Group events by Month & Year (Matching the "NOVEMBER 2026" header style from GoLive Asia screenshot)
  const monthGroups: MonthGroup[] = sortedEvents.reduce((acc: MonthGroup[], event) => {
    const eventDate = new Date(`${event.date}T12:00:00Z`);
    const monthFormatter = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
    const monthTitle = monthFormatter.format(eventDate).toUpperCase();

    const existingGroup = acc.find((g) => g.monthTitle === monthTitle);
    if (existingGroup) {
      existingGroup.events.push(event);
    } else {
      acc.push({ monthTitle, events: [event] });
    }
    return acc;
  }, []);

  const handleSelectEvent = (event: ConcertEvent) => {
    setSelectedEventSlug(event.slug);
    setCurrentPage('concert_detail');
  };

  const handleBookNow = (event: ConcertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckoutEvent(event);
  };

  // Helper to format date parts (Day of week, Day number, full date)
  const getDateParts = (dateStr: string) => {
    const d = new Date(`${dateStr}T12:00:00Z`);
    const dayOfWeek = d.toLocaleDateString('fr-FR', { weekday: 'short' }).toUpperCase().replace('.', '');
    const dayNumber = String(d.getDate()).padStart(2, '0');
    const fullDate = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    return { dayOfWeek, dayNumber, fullDate };
  };

  // Atmospheric gradient styling tailored to the 4 featured artists (Wantché, Tiakola, Jeune Lion, Jamsco)
  const getAmbientStyle = (artist: string) => {
    const name = artist.toUpperCase();
    if (name.includes('WANTCHÉ') || name.includes('WANTCHE')) {
      return 'from-teal-950/40 via-[#061413]/85 to-[#0b0b0b] border-teal-800/30 hover:border-teal-500/50';
    }
    if (name.includes('TIAKOLA')) {
      return 'from-indigo-950/45 via-[#0e091b]/85 to-[#0b0b0b] border-indigo-900/30 hover:border-indigo-500/50';
    }
    if (name.includes('LION')) {
      return 'from-amber-950/35 via-[#140e06]/85 to-[#0b0b0b] border-[#d4af37]/30 hover:border-[#d4af37]/60';
    }
    if (name.includes('JAMSCO')) {
      return 'from-rose-950/40 via-[#18090f]/85 to-[#0b0b0b] border-rose-900/30 hover:border-rose-500/50';
    }
    return 'from-zinc-900/40 via-[#121212]/85 to-[#0b0b0b] border-white/10 hover:border-white/30';
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#FFFFFF] pt-28 sm:pt-32 pb-24">
      
      {/* Top Header & Search Pills Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 mb-8 sm:mb-12">
        
        {/* Title & Slogan */}
        <div className="mb-6">
          <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
            CALENDRIER DES CONCERTS
          </div>
          <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl text-white tracking-tight uppercase leading-none">
            DÉCOUVRIR LES ÉVÉNEMENTS
          </h1>
        </div>

        {/* Floating Search & Filter Capsule Bar (matching GoLive style) */}
        <div className="rounded-3xl sm:rounded-full bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/20 p-2.5 sm:p-3 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#777] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un artiste, salle, date..."
              className="w-full bg-[#181818] border border-white/10 rounded-full pl-11 pr-4 py-2 text-xs text-white placeholder-[#666] focus:outline-none focus:border-white font-agrandir-regular"
            />
          </div>

          {/* Quick Selects with rounded-full */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Genre */}
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="bg-[#181818] border border-white/10 rounded-full px-4 py-2 text-xs text-white font-agrandir-regular uppercase cursor-pointer"
            >
              <option value="all">TOUS LES GENRES</option>
              {genres.filter(g => g !== 'all').map(g => (
                <option key={g} value={g}>{g.toUpperCase()}</option>
              ))}
            </select>

            {/* City */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-[#181818] border border-white/10 rounded-full px-4 py-2 text-xs text-white font-agrandir-regular uppercase cursor-pointer"
            >
              <option value="all">TOUTES LES VILLES</option>
              <option value="Abidjan">ABIDJAN</option>
              <option value="Paris">PARIS</option>
            </select>

            {(search || selectedCity !== 'all' || selectedGenre !== 'all') && (
              <button
                onClick={() => {
                  setSearch('');
                  setSelectedCity('all');
                  setSelectedGenre('all');
                }}
                className="text-[11px] text-[#aaa] hover:text-white uppercase font-agrandir-semibold px-3 py-1 cursor-pointer"
              >
                Réinitialiser
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Main Concerts List grouped by Month (Matching GoLive Asia screenshot layout) */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 space-y-12">
        
        {monthGroups.length === 0 ? (
          <div className="text-center py-24 rounded-3xl bg-[#0c0c0c] border border-white/10 p-8">
            <Calendar className="w-10 h-10 text-[#555] mx-auto mb-3" />
            <h3 className="font-agrandir-extrabold text-xl text-white uppercase mb-2">
              AUCUN CONCERT TROUVÉ
            </h3>
            <p className="font-agrandir-regular text-xs text-[#888] max-w-sm mx-auto mb-6">
              Aucun événement ne correspond à vos filtres actuels.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCity('all');
                setSelectedGenre('all');
              }}
              className="px-6 py-2.5 rounded-full bg-white text-black font-agrandir-semibold text-xs uppercase tracking-wider cursor-pointer"
            >
              Voir toute la programmation
            </button>
          </div>
        ) : (
          monthGroups.map((group) => (
            <section key={group.monthTitle} className="space-y-4">
              
              {/* Month Header (Matching "NOVEMBER 2026" from screenshot) */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-agrandir-extrabold tracking-[0.25em] text-[#888] uppercase">
                  {group.monthTitle}
                </span>
                <span className="h-[1px] flex-1 bg-white/10" />
              </div>

              {/* Stacked Wide Event Cards */}
              <div className="space-y-3 sm:space-y-4">
                {group.events.map((event) => {
                  const { dayOfWeek, dayNumber, fullDate } = getDateParts(event.date);
                  const minPrice = Math.min(...event.categories.map((c) => c.price));
                  const currency = 'FCFA';
                  const ambient = getAmbientStyle(event.artist);

                  return (
                    <div
                      key={event.id}
                      onClick={() => handleSelectEvent(event)}
                      className={`group relative rounded-2xl sm:rounded-3xl p-3 sm:p-5 bg-gradient-to-r ${ambient} border transition-all duration-300 hover:scale-[1.008] shadow-2xl cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 overflow-hidden`}
                    >
                      {/* Subtle Ambient Vignette / Spotlight inside Card */}
                      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

                      {/* Left Block : Date Widget + Artist Poster + Event Info */}
                      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1 min-w-0">
                        
                        {/* 1. Date Widget Box (Exact replica of "SUN 01" / "WED 04" / "FRI 06") */}
                        <div className="w-13 h-14 sm:w-16 sm:h-18 rounded-2xl bg-black/70 border border-white/15 backdrop-blur-md flex flex-col items-center justify-center shrink-0 shadow-lg group-hover:border-white/30 transition-colors">
                          <span className="text-[9px] sm:text-[10px] font-agrandir-semibold tracking-wider text-[#999] uppercase leading-none">
                            {dayOfWeek}
                          </span>
                          <span className="text-xl sm:text-2xl font-agrandir-extrabold text-white leading-none mt-1">
                            {dayNumber}
                          </span>
                        </div>

                        {/* 2. Artist Poster Thumbnail (Rounded rectangle) */}
                        <div className="w-full sm:w-40 md:w-48 aspect-[16/10] rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-[#161616] shrink-0 shadow-md">
                          <img
                            src={event.officialPoster || event.bannerImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.30_0f827a3a.jpeg'}
                            alt={event.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                        </div>

                        {/* 3. Event Details (Center info block matching screenshot) */}
                        <div className="flex-1 min-w-0">
                          
                          {/* Top Meta Line: CONCERT tag + Date & Time */}
                          <div className="flex flex-wrap items-center gap-2.5 text-xs mb-1.5">
                            <span className="rounded-full border border-emerald-500/50 bg-emerald-950/40 text-emerald-400 text-[10px] font-agrandir-semibold tracking-wider uppercase px-2.5 py-0.5 shadow-sm">
                              CONCERT
                            </span>

                            <div className="flex items-center gap-1.5 text-xs text-[#aaa] font-agrandir-regular">
                              <Calendar className="w-3.5 h-3.5 text-[#888]" />
                              <span>{event.time} · <strong className="font-agrandir-extrabold text-white">{fullDate}</strong></span>
                            </div>
                          </div>

                          {/* Massive Spaced Artist Name */}
                          <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl md:text-4xl text-white tracking-[0.04em] uppercase leading-tight truncate drop-shadow-md">
                            {event.artist} EN CONCERT
                          </h2>

                          {/* Venue Location with MapPin */}
                          <div className="flex items-center gap-1.5 text-xs text-[#ccc] font-agrandir-regular mt-2 truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                            <span className="truncate"><strong className="font-agrandir-extrabold text-white">{event.venue}</strong> ({event.city})</span>
                          </div>

                          {/* Ticket Price Badge Pill (Matching "TICKETS FROM RM 298") */}
                          <div className="mt-2.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-agrandir-semibold text-white backdrop-blur-sm shadow-sm">
                              <Ticket className="w-3.5 h-3.5 text-[#d4af37]" />
                              <span>BILLETS DÈS {minPrice.toLocaleString()} FCFA</span>
                            </span>
                          </div>

                        </div>

                      </div>

                      {/* Right Action Button : Pill VIEW MORE matching screenshot */}
                      <div className="relative z-10 flex items-center justify-end sm:justify-center gap-3 shrink-0 pt-2 sm:pt-0 border-t border-white/10 sm:border-t-0">
                        <button
                          onClick={() => handleSelectEvent(event)}
                          className="px-6 py-3 rounded-full bg-white/10 hover:bg-white text-white hover:text-black border border-white/20 font-agrandir-semibold text-xs tracking-widest uppercase flex items-center gap-2 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                        >
                          <span>VIEW MORE</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>

            </section>
          ))
        )}

      </main>

    </div>
  );
};
