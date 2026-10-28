import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Search,
  Ticket,
  ArrowRight,
  Bookmark,
  Sparkles,
  ShieldCheck,
  Check,
  Flame,
  Clock,
  Layers,
} from 'lucide-react';

export const HomeFeed: React.FC = () => {
  const {
    events,
    setSelectedEventSlug,
    setCurrentPage,
    setCheckoutEvent,
    news,
  } = useApp();

  // Carousel state
  const featuredSlides = events.filter((e) => e.isFeatured && e.status !== 'draft');
  const activeSlides = featuredSlides.length > 0 ? featuredSlides : events.slice(0, 3);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedCity, setSelectedCity] = useState('all');
  const [openOnly, setOpenOnly] = useState(false);

  // Countdown state for Jeune Lion / Active slide
  const [countdown, setCountdown] = useState({
    days: 52,
    hours: 18,
    minutes: 24,
    seconds: 4,
  });

  useEffect(() => {
    const targetDate = new Date('2026-12-19T20:30:00Z').getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setCountdown({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-play carousel
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [activeSlides.length]);

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  // Horizontal scroll container ref for "À la une"
  const featuredRowRef = useRef<HTMLDivElement>(null);
  const scrollFeaturedRow = (direction: 'left' | 'right') => {
    if (featuredRowRef.current) {
      const scrollAmount = direction === 'left' ? -420 : 420;
      featuredRowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleSelectEvent = (event: ConcertEvent) => {
    setSelectedEventSlug(event.slug);
    setCurrentPage('concert_detail');
  };

  const handleBookNow = (event: ConcertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckoutEvent(event);
  };

  const toggleBookmark = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarked((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  // Filtered events
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      searchQuery === '' ||
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.city.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const matchesCity = selectedCity === 'all' || event.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesOpen = !openOnly || event.status === 'published';

    return matchesSearch && matchesGenre && matchesCity && matchesOpen;
  });

  // Genres available dynamically from seeded events
  const genres = ['all', ...Array.from(new Set(events.map((e) => e.genre)))];

  // Current featured slide
  const activeSlide = activeSlides[currentSlideIndex] || activeSlides[0];

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] pb-24 select-none">
      
      {/* =========================================================================
          SECTION HERO : BANNIÈRE COLLÉE À L'EN-TÊTE (STYLE GOLIVE ASIA / THE WEEKND)
          Cette bannière remonte jusqu'au bord supérieur de l'écran et sert d'arrière-plan à la barre de navigation.
         ========================================================================= */}
      {activeSlide && (
        <section className="relative w-full h-[90vh] sm:h-[94vh] min-h-[640px] max-h-[920px] overflow-hidden bg-[#050505]">
          
          {/* Panoramic Backdrop Visual with dramatic stage red/amber gradient inspired by The Weeknd reference */}
          <div className="absolute inset-0">
            <img
              src={activeSlide.bannerImage || activeSlide.officialPoster}
              alt={activeSlide.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.12] transition-all duration-1000 ease-out"
            />
            {/* Cinematic Multilayer Lighting & Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/80 via-transparent to-[#000000]/80" />
            {/* Subtle red/crimson ambient glow matching The Weeknd atmosphere */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/[0.12] rounded-full blur-[140px] pointer-events-none" />
          </div>

          {/* Lateral Circular Navigation Buttons (< and >) */}
          <button
            onClick={prevSlide}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/80 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-xl"
            aria-label="Concert précédent"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={nextSlide}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/80 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-xl"
            aria-label="Concert suivant"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Slide Content Overlay (Positioned in lower portion, exactly matching GoLive Asia reference) */}
          <div className="relative z-20 max-w-7xl mx-auto h-full px-6 sm:px-12 flex flex-col justify-end pb-16 sm:pb-20">
            
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 sm:gap-10">
              
              {/* Left Column : Tag, Massive Artist Title & Showtimes */}
              <div className="max-w-2xl text-left">
                
                {/* Pill Tag CONCERT (Bords arrondis avec contour fin) */}
                <div className="mb-3.5">
                  <span className="inline-block rounded-full border border-red-500/70 bg-red-950/40 text-red-400 text-[11px] font-agrandir-semibold tracking-widest uppercase px-3.5 py-1 backdrop-blur-sm shadow-md">
                    CONCERT
                  </span>
                </div>

                {/* Massive Artist Name in monumental typography */}
                <h1 className="font-agrandir-extrabold text-5xl sm:text-7xl md:text-8xl text-white tracking-[-0.04em] uppercase leading-[0.9] text-balance mb-4 drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                  {activeSlide.artist}
                </h1>

                {/* SHOWTIMES Section */}
                <div className="mt-4">
                  <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-2">
                    SHOWTIMES
                  </div>

                  <div className="flex flex-wrap items-start gap-8 sm:gap-12">
                    {/* Primary Date */}
                    <div>
                      <div className="font-agrandir-extrabold text-base sm:text-xl text-white tracking-tight">
                        {activeSlide.date}
                        <span className="text-xs sm:text-sm font-agrandir-regular text-[#aaa] ml-2">
                          {activeSlide.time} (GMT)
                        </span>
                      </div>
                      <div className="text-xs font-agrandir-regular text-[#999] mt-0.5">
                        {activeSlide.venue} · {activeSlide.city}
                      </div>
                    </div>

                    {/* Day 2 Column (as seen in GoLive Asia screenshot) */}
                    <div className="border-l border-white/15 pl-6 sm:pl-8">
                      <div className="text-[10px] font-agrandir-semibold text-[#888] uppercase tracking-wider">
                        JOUR 2
                      </div>
                      <div className="font-agrandir-semibold text-xs sm:text-sm text-[#ccc] tracking-tight mt-0.5">
                        20 Décembre 2026
                      </div>
                      <div className="text-[11px] font-agrandir-regular text-[#777]">
                        {activeSlide.time} (GMT)
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column : Action Pill Button & Flip-style Digital Countdown */}
              <div className="flex flex-col items-start lg:items-end gap-5 shrink-0">
                
                {/* Action Row: Bookmark pill + Rounded CTA button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => toggleBookmark(activeSlide.id, e)}
                    className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-lg"
                    title="Sauvegarder cet événement"
                  >
                    <Bookmark
                      className={`w-4 h-4 transition-colors ${
                        bookmarked[activeSlide.id] ? 'fill-white text-white' : 'text-[#bbb]'
                      }`}
                    />
                  </button>

                  <button
                    onClick={(e) => handleBookNow(activeSlide, e)}
                    className="px-8 py-3.5 rounded-full bg-[#3d4d63]/85 hover:bg-[#4d617d] text-white font-agrandir-semibold text-xs tracking-[0.18em] uppercase border border-white/20 backdrop-blur-md transition-all flex items-center gap-2.5 shadow-2xl cursor-pointer"
                  >
                    <Ticket className="w-4 h-4 text-[#d4af37]" />
                    <span>
                      {activeSlide.status === 'published' ? 'BILLETTERIE OUVERTE' : 'BILLETS BIENTÔT'}
                    </span>
                  </button>
                </div>

                {/* Digital Countdown Box (Matching GoLive Asia "EVENT STARTS IN" with flip rounded blocks) */}
                <div className="w-full sm:w-auto flex flex-col items-start lg:items-end">
                  <div className="text-[10px] font-agrandir-regular tracking-[0.22em] text-[#888] uppercase mb-2">
                    LE CONCERT COMMENCE DANS
                  </div>

                  {/* 4 Flip Rounded Tiles: DAYS / HOURS / MINUTES / SECONDS */}
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    
                    {/* Days */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.days).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        JOURS
                      </span>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        HEURES
                      </span>
                    </div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.minutes).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        MINUTES
                      </span>
                    </div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/60 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.seconds).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        SECONDES
                      </span>
                    </div>

                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Carousel Slide Indicators Pill at bottom center */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`transition-all rounded-full ${
                  idx === currentSlideIndex
                    ? 'w-6 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Aller au slide ${idx + 1}`}
              />
            ))}
          </div>

        </section>
      )}

      {/* =========================================================================
          SECTION RECHERCHE & FILTRES (POD FLOTTANT AVEC BORDS ARRONDIS)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 -mt-10 sm:-mt-12 relative z-30">
        <div className="rounded-3xl sm:rounded-full bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/20 p-3 sm:p-4 shadow-2xl">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            
            {/* Search Input (5 cols) */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#777] absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un artiste, concert, lieu ou ville..."
                className="w-full bg-[#181818] border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#666] focus:outline-none focus:border-white font-agrandir-regular"
              />
            </div>

            {/* Genre Filter (3 cols) */}
            <div className="md:col-span-3">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular uppercase tracking-wider"
              >
                <option value="all">TOUS LES GENRES</option>
                {genres.filter(g => g !== 'all').map(g => (
                  <option key={g} value={g}>{g.toUpperCase()}</option>
                ))}
              </select>
            </div>

            {/* City Filter (2 cols) */}
            <div className="md:col-span-2">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular uppercase tracking-wider"
              >
                <option value="all">TOUTES LES VILLES</option>
                <option value="Abidjan">ABIDJAN</option>
                <option value="Paris">PARIS</option>
              </select>
            </div>

            {/* Availability checkbox (2 cols) */}
            <div className="md:col-span-2 flex items-center justify-end">
              <button
                onClick={() => setOpenOnly(!openOnly)}
                className={`w-full py-2.5 px-4 rounded-full border text-[11px] font-agrandir-semibold tracking-wider uppercase transition-colors cursor-pointer text-center ${
                  openOnly
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-[#181818] text-[#888] border-white/10 hover:text-white'
                }`}
              >
                {openOnly ? '✓ DISPONIBLES' : 'BILLETS OUVERTS'}
              </button>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION : À LA UNE (RANGÉE HORIZONTALE STREAMING AVEC CADRE DÉTACHÉ ARRONDIS)
          Selon les instructions : image de l'artiste arrondie + cadre détaché arrondi en dessous.
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
        
        {/* Row Header with navigation buttons */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
          <div>
            <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              SÉLECTION OFFICIELLE &amp; CURATION
            </div>
            <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              À LA UNE
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollFeaturedRow('left')}
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-[#888] hover:text-white transition-colors cursor-pointer bg-white/5"
              aria-label="Faire défiler vers la gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollFeaturedRow('right')}
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-[#888] hover:text-white transition-colors cursor-pointer bg-white/5"
              aria-label="Faire défiler vers la droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Row with detached rounded cards */}
        <div
          ref={featuredRowRef}
          className="flex items-start gap-6 overflow-x-auto pb-6 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredEvents.map((event) => {
            const minPrice = Math.min(...event.categories.map((c) => c.price));
            const currency = event.categories[0]?.currency || 'XOF';

            return (
              <div
                key={event.id}
                onClick={() => handleSelectEvent(event)}
                className="w-[280px] sm:w-[320px] shrink-0 flex flex-col cursor-pointer group snap-start"
              >
                {/* 1. Image de l'artiste avec bords arrondis (rounded-3xl) */}
                <div className="aspect-[3/4] w-full rounded-3xl overflow-hidden relative shadow-2xl border border-white/10 group-hover:border-white/30 transition-all duration-500 bg-[#121212]">
                  <img
                    src={event.officialPoster}
                    alt={event.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  
                  {/* Floating rounded pills on image */}
                  <div className="absolute top-3.5 left-3.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-agrandir-semibold tracking-wider text-white border border-white/15 uppercase">
                    {event.organizerType === 'lumareel' ? 'LUMARÉEL CO.' : 'PARTENAIRE'}
                  </div>

                  <div className="absolute top-3.5 right-3.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[9px] font-agrandir-semibold tracking-wider text-[#d4af37] border border-white/15 uppercase">
                    {event.status === 'published' ? 'BILLETTERIE OUVERTE' : 'VENTES BIENTÔT'}
                  </div>
                </div>

                {/* 2. Cadre détaché avec des bords arrondis (rounded-2xl) en bas */}
                <div className="mt-3.5 p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-[#0e0e0e] border border-white/10 group-hover:border-white/25 transition-all shadow-xl flex flex-col justify-between group-hover:bg-[#131313]">
                  <div>
                    {/* Nom de l'artiste */}
                    <h3 className="font-agrandir-extrabold text-lg sm:text-xl text-white tracking-tight uppercase group-hover:text-white transition-colors truncate">
                      {event.artist}
                    </h3>

                    {/* Titre ou sous-titre */}
                    <div className="text-xs font-agrandir-semibold text-[#888] uppercase tracking-wide truncate mt-0.5">
                      {event.title}
                    </div>

                    {/* Lieu & Ville */}
                    <div className="flex items-center gap-1.5 text-xs text-[#ddd] font-agrandir-semibold mt-2.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                      <span className="truncate">{event.venue}</span>
                      <span className="text-[#666]">({event.city})</span>
                    </div>

                    {/* Date et Heure */}
                    <div className="flex items-center gap-1.5 text-xs text-[#888] font-agrandir-regular mt-1">
                      <Calendar className="w-3.5 h-3.5 text-[#666] shrink-0" />
                      <span>{event.date} · {event.time}</span>
                    </div>
                  </div>

                  {/* Ligne inférieure : Badge CONCERT arrondi + Prix & Bouton Réserver */}
                  <div className="pt-3.5 mt-3.5 border-t border-white/10 flex items-center justify-between gap-2">
                    <span className="rounded-full border border-emerald-500/50 bg-emerald-950/20 text-emerald-400 text-[10px] font-agrandir-semibold tracking-wider uppercase px-2.5 py-0.5">
                      CONCERT
                    </span>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-agrandir-semibold text-white">
                        {minPrice.toLocaleString()} {currency}
                      </span>
                      <button
                        onClick={(e) => handleBookNow(event, e)}
                        className="rounded-full px-3.5 py-1.5 bg-white text-black font-agrandir-semibold text-[11px] uppercase tracking-wider hover:bg-[#e0e0e0] transition-colors flex items-center gap-1 cursor-pointer shadow-md"
                      >
                        <Ticket className="w-3 h-3" />
                        <span>RÉSERVER</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          SECTION : BILLETTERIE OUVERTE (GRILLE AVEC CADRE DÉTACHÉ ARRONDIS)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
        
        <div className="mb-8 pb-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              ACCÈS INSTANTANÉ AUX PLACES
            </div>
            <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              BILLETTERIE OUVERTE
            </h2>
          </div>

          <button
            onClick={() => setCurrentPage('discover')}
            className="text-xs font-agrandir-semibold tracking-widest text-[#aaa] hover:text-white uppercase flex items-center gap-1.5 transition-colors cursor-pointer px-4 py-2 rounded-full border border-white/10 bg-white/5"
          >
            <span>VOIR TOUT LE CATALOGUE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Grid Layout with detached rounded cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {events
            .filter((e) => e.status === 'published')
            .map((event) => {
              const totalQuota = event.categories.reduce((acc, c) => acc + c.quota, 0);
              const totalSold = event.categories.reduce((acc, c) => acc + c.sold, 0);
              const remaining = totalQuota - totalSold;
              const minPrice = Math.min(...event.categories.map((c) => c.price));
              const currency = event.categories[0]?.currency || 'XOF';

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="flex flex-col cursor-pointer group"
                >
                  {/* 1. Image de l'artiste avec bords arrondis (rounded-3xl) */}
                  <div className="aspect-[3/4] w-full rounded-3xl overflow-hidden relative shadow-2xl border border-white/10 group-hover:border-white/30 transition-all duration-500 bg-[#121212]">
                    <img
                      src={event.officialPoster}
                      alt={event.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover filter contrast-105 group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                    
                    <div className="absolute top-3.5 left-3.5 rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[10px] font-agrandir-semibold tracking-wider text-white border border-white/15 uppercase">
                      {event.organizerType === 'lumareel' ? 'PRODUIT PAR LUMARÉEL' : event.organizerName}
                    </div>

                    <div className="absolute top-3.5 right-3.5 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-[9px] font-agrandir-semibold tracking-wider text-[#d4af37] border border-white/15 uppercase">
                      {remaining < 80 ? `DERNIÈRES PLACES (${remaining})` : 'DISPONIBLE'}
                    </div>
                  </div>

                  {/* 2. Cadre détaché avec bords arrondis */}
                  <div className="mt-3.5 p-5 rounded-3xl bg-[#0e0e0e] border border-white/10 group-hover:border-white/25 transition-all shadow-xl flex flex-col justify-between group-hover:bg-[#131313]">
                    <div>
                      <h3 className="font-agrandir-extrabold text-xl text-white tracking-tight uppercase group-hover:text-white transition-colors truncate">
                        {event.artist}
                      </h3>

                      <div className="text-xs font-agrandir-semibold text-[#888] uppercase tracking-wide truncate mt-0.5">
                        {event.title}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#ddd] font-agrandir-semibold mt-3 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                        <span className="truncate">{event.venue}</span>
                        <span className="text-[#666]">({event.city})</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-[#888] font-agrandir-regular mt-1">
                        <Calendar className="w-3.5 h-3.5 text-[#666] shrink-0" />
                        <span>{event.date} · {event.time}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="rounded-full border border-emerald-500/50 bg-emerald-950/20 text-emerald-400 text-[10px] font-agrandir-semibold tracking-wider uppercase px-2.5 py-0.5">
                        CONCERT
                      </span>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-agrandir-semibold text-white">
                          {minPrice.toLocaleString()} {currency}
                        </span>
                        <button
                          onClick={(e) => handleBookNow(event, e)}
                          className="rounded-full px-4 py-1.5 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-wider hover:bg-[#e0e0e0] transition-colors flex items-center gap-1 cursor-pointer shadow-md"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                          <span>RÉSERVER</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
        </div>

      </section>

      {/* =========================================================================
          SECTION : ARCHIVES DES PRODUCTIONS PASSÉES (CADRES ARRONDIS)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
        
        <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              MÉMOIRE DES SCÈNES LUMARÉEL
            </div>
            <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              ARCHIVES DE CONCERTS
            </h2>
          </div>

          <button
            onClick={() => setCurrentPage('archive')}
            className="text-xs font-agrandir-semibold tracking-widest text-[#aaa] hover:text-white uppercase flex items-center gap-1.5 transition-colors cursor-pointer px-4 py-2 rounded-full border border-white/10 bg-white/5"
          >
            <span>VOIR TOUTES LES ARCHIVES</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            onClick={() => setCurrentPage('archive')}
            className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 hover:border-white/30 transition-colors cursor-pointer group shadow-xl"
          >
            <div className="text-[10px] font-agrandir-regular text-[#666] uppercase tracking-widest mb-2">
              18 JUILLET 2026 · SOFITEL IVOIRE
            </div>
            <h3 className="font-agrandir-extrabold text-xl text-white uppercase group-hover:text-white mb-2">
              TRK EN CONCERT
            </h3>
            <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
              Soirée live fondatrice organisée au Palais des Congrès, 13 médias d'archives captés.
            </p>
          </div>

          <div
            onClick={() => setCurrentPage('archive')}
            className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 hover:border-white/30 transition-colors cursor-pointer group shadow-xl"
          >
            <div className="text-[10px] font-agrandir-regular text-[#666] uppercase tracking-widest mb-2">
              25 JUILLET 2026 · PARC EXPOSITIONS
            </div>
            <h3 className="font-agrandir-extrabold text-xl text-white uppercase group-hover:text-white mb-2">
              DOPELYM EN CONCERT
            </h3>
            <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
              Show électro-rap sur scène XXL avec dispositif sonore spatialisé.
            </p>
          </div>

          <div
            onClick={() => setCurrentPage('archive')}
            className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 hover:border-white/30 transition-colors cursor-pointer group shadow-xl"
          >
            <div className="text-[10px] font-agrandir-regular text-[#666] uppercase tracking-widest mb-2">
              29 JUILLET 2023 · LYCÉE CLASSIQUE
            </div>
            <h3 className="font-agrandir-extrabold text-xl text-white uppercase group-hover:text-white mb-2">
              LETO EN CONCERT
            </h3>
            <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed">
              La soirée pionnière qui a posé l'identité scénique et la radicalité de LUMARÉEL.
            </p>
          </div>
        </div>

      </section>

      {/* =========================================================================
          SECTION : ACTUALITÉS & COMMUNIQUÉS OFFICIELS (CADRES ARRONDIS)
         ========================================================================= */}
      {news && news.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
          
          <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
                COMMUNIQUÉS &amp; NOTES DE PRODUCTION
              </div>
              <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
                ACTUALITÉS
              </h2>
            </div>

            <button
              onClick={() => setCurrentPage('news')}
              className="text-xs font-agrandir-semibold tracking-widest text-[#aaa] hover:text-white uppercase flex items-center gap-1.5 transition-colors cursor-pointer px-4 py-2 rounded-full border border-white/10 bg-white/5"
            >
              <span>TOUTES LES ACTUALITÉS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.slice(0, 3).map((article: any) => (
              <article
                key={article.id}
                onClick={() => setCurrentPage('news')}
                className="bg-[#0b0b0b] border border-white/10 rounded-3xl p-6 hover:border-white/30 transition-all cursor-pointer flex flex-col justify-between shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-agrandir-regular tracking-wider uppercase text-[#777] mb-3">
                    <span className="text-[#d4af37] font-agrandir-semibold">{article.category}</span>
                    <span>{article.date}</span>
                  </div>

                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight mb-3 leading-snug">
                    {article.title}
                  </h3>

                  <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed line-clamp-3 mb-6">
                    {article.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 text-[11px] font-agrandir-semibold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>LIRE LE COMMUNIQUÉ</span>
                  <span className="text-[#666] font-agrandir-regular">{article.readTime}</span>
                </div>
              </article>
            ))}
          </div>

        </section>
      )}

      {/* =========================================================================
          BANNER INVITATION ORGANISATEURS (CADRE ARRONDIS)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-20">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#111111] via-[#0a0a0a] to-[#121212] border border-white/15 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 shadow-2xl">
          <div className="max-w-2xl">
            <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#d4af37] uppercase mb-2">
              ESPACE PROFESSIONNEL
            </div>
            <h3 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white uppercase tracking-tight mb-3">
              VOUS PRODUISEZ UN CONCERT ? VENDEZ VOS BILLETS SUR LUMARÉEL.
            </h3>
            <p className="font-agrandir-regular text-xs sm:text-sm text-[#888] leading-relaxed">
              Bénéficiez de notre protocole inviolable anti-double scan, de la visibilité sur notre catalogue et de versements sécurisés multi-devises.
            </p>
          </div>

          <button
            onClick={() => setCurrentPage('organizers')}
            className="px-8 py-4 rounded-full bg-white text-black font-agrandir-semibold text-xs uppercase tracking-widest hover:bg-[#eaeaea] transition-all whitespace-nowrap cursor-pointer shrink-0 shadow-2xl"
          >
            DÉCOUVRIR L'ESPACE ORGANISATEURS →
          </button>
        </div>
      </section>

    </div>
  );
};
