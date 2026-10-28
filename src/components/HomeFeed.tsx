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
  Play,
} from 'lucide-react';

export const HomeFeed: React.FC = () => {
  const {
    events,
    setSelectedEventSlug,
    setCurrentPage,
    setCheckoutEvent,
    news,
    archives,
  } = useApp();

  // Carousel state
  const featuredSlides = events.filter((e) => e.isFeatured && e.status !== 'draft');
  const activeSlides = featuredSlides.length > 0 ? featuredSlides : events.slice(0, 3);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const activeSlide = activeSlides[currentSlideIndex] || activeSlides[0];
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

  // Dynamic countdown calculating in real time for the currently active concert
  useEffect(() => {
    if (!activeSlide) return;

    // Build target timestamp from date (YYYY-MM-DD) and time (HH:mm)
    const timeStr = activeSlide.time ? (activeSlide.time.includes(':') ? activeSlide.time : `${activeSlide.time}:00`) : '18:00';
    const targetDate = new Date(`${activeSlide.date}T${timeStr}:00Z`).getTime();

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
  }, [activeSlide?.id, activeSlide?.date, activeSlide?.time]);

  // Auto-play carousel every 7s
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [activeSlides.length]);

  const nextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % activeSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  // Horizontal scroll container ref for "SÉLECTION OFFICIELLE"
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

  // Genre filter options
  const genres = ['all', ...Array.from(new Set(events.map((e) => e.genre)))];

  const handleSelectArtistSlide = (index: number) => {
    setCurrentSlideIndex(index);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] pb-24 select-none">
      
      {/* =========================================================================
          1. SECTION HERO (BANNIÈRE PRINCIPALE) — RÉFÉRENCE GOLIVE ASIA / THE WEEKND
          Bannière immersive avec tag CONCERT, nom monumental, SHOWTIMES, infoline,
          bouton d'action et les 4 blocs de compte à rebours numérique dynamique.
         ========================================================================= */}
      {activeSlide && (
        <section className="relative w-full h-[90vh] sm:h-[94vh] min-h-[660px] max-h-[920px] overflow-hidden bg-[#050505] flex flex-col justify-end pb-16 sm:pb-20">
          
          {/* Panoramic Backdrop Visual with smooth crossfade and warm stage atmosphere */}
          <div className="absolute inset-0">
            <img
              key={activeSlide.id}
              src={activeSlide.bannerImage || activeSlide.officialPoster}
              alt={activeSlide.artist}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter brightness-[0.74] contrast-[1.12] transition-all duration-1000 ease-out"
            />
            {/* Cinematic Multilayer Lighting & Vignette Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/40 to-black/60" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#000000]/85 via-transparent to-[#000000]/85" />
            {/* Subtle red/crimson ambient glow matching The Weeknd reference */}
            <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-red-600/[0.14] rounded-full blur-[140px] pointer-events-none" />
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

          {/* Slide Content Overlay (Exactly matching GoLive Asia reference) */}
          <div className="relative z-20 max-w-7xl mx-auto w-full px-6 sm:px-12 flex flex-col justify-end">
            
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 sm:gap-10">
              
              {/* Left Column : Tag, Massive Artist Title & Showtimes */}
              <div className="max-w-2xl text-left">
                
                {/* Pill Tag CONCERT */}
                <div className="mb-3.5">
                  <span className="inline-block rounded-full border border-red-500/70 bg-red-950/40 text-red-400 text-[11px] font-agrandir-semibold tracking-widest uppercase px-3.5 py-1 backdrop-blur-sm shadow-md">
                    CONCERT
                  </span>
                </div>

                {/* Massive Artist Name in monumental typography */}
                <h1 className="font-agrandir-extrabold text-5xl sm:text-7xl md:text-8xl text-white tracking-[-0.04em] uppercase leading-[0.9] text-balance mb-4 drop-shadow-[0_10px_25px_rgba(0,0,0,0.85)]">
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
                      <div className="text-xs font-agrandir-regular text-[#aaa] mt-0.5">
                        {activeSlide.venue} · {activeSlide.city}
                      </div>
                    </div>

                    {/* Infoline Column (matching reference layout) */}
                    {activeSlide.infoline && (
                      <div className="border-l border-white/20 pl-6 sm:pl-8">
                        <div className="text-[10px] font-agrandir-semibold text-[#888] uppercase tracking-wider">
                          INFOLINE BILLETTERIE
                        </div>
                        <div className="font-agrandir-semibold text-xs sm:text-sm text-[#ddd] tracking-tight mt-0.5">
                          {activeSlide.infoline}
                        </div>
                        <div className="text-[11px] font-agrandir-regular text-[#888]">
                          {activeSlide.doorsOpen ? `Ouverture portes ${activeSlide.doorsOpen}` : 'Accès dès 14H'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column : Action Button & Flip-style Digital Countdown */}
              <div className="flex flex-col items-start lg:items-end gap-5 shrink-0">
                
                {/* Action Row: Bookmark + Rounded Pill CTA button */}
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
                    className="px-8 py-3.5 rounded-full bg-[#3d4d63]/90 hover:bg-[#4d617d] text-white font-agrandir-semibold text-xs tracking-[0.18em] uppercase border border-white/20 backdrop-blur-md transition-all flex items-center gap-2.5 shadow-2xl hover:scale-105 active:scale-95 cursor-pointer"
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
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.days).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        JOURS
                      </span>
                    </div>

                    {/* Hours */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.hours).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        HEURES
                      </span>
                    </div>

                    {/* Minutes */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                        {String(countdown.minutes).padStart(2, '0')}
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-agrandir-regular text-[#888] tracking-widest uppercase mt-1">
                        MINUTES
                      </span>
                    </div>

                    {/* Seconds */}
                    <div className="flex flex-col items-center">
                      <div className="w-13 h-14 sm:w-15 sm:h-16 rounded-xl bg-black/70 border border-white/20 backdrop-blur-md flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
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
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentSlideIndex
                    ? 'w-6 h-1.5 bg-white'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Aller au concert ${idx + 1}`}
              />
            ))}
          </div>

        </section>
      )}

      {/* =========================================================================
          2. CARROUSEL DES ARTISTES (SÉLECTION OFFICIELLE)
          Nettoyé selon les instructions : PAS de "continue watching", PAS de barre
          de lecture vidéo, PAS de label "à l'écran". Uniquement les portraits épurés.
          Au clic, la bannière Hero et le compte à rebours basculent sur cet artiste.
         ========================================================================= */}
      <section className="relative z-30 max-w-7xl mx-auto px-6 sm:px-12 pt-8 sm:pt-12">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div>
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              PROGRAMMATION OFFICIELLE
            </div>
            <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">
              PROCHAINS CONCERTS
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scrollFeaturedRow('left')}
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5"
              aria-label="Faire défiler vers la gauche"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollFeaturedRow('right')}
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5"
              aria-label="Faire défiler vers la droite"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Horizontal Row with Ultra-Minimalist Portrait Cards */}
        <div
          ref={featuredRowRef}
          className="flex items-start gap-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory pt-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeSlides.map((event, idx) => {
            const isActive = idx === currentSlideIndex;

            return (
              <div
                key={event.id}
                onClick={() => handleSelectArtistSlide(idx)}
                className="w-[240px] sm:w-[290px] shrink-0 cursor-pointer group snap-start transition-all duration-300 select-none"
              >
                {/* 1. Carte épurée avec le portrait de l'artiste au format 16:9 / 16:10 */}
                <div
                  className={`aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative transition-all duration-300 bg-[#111111] ${
                    isActive
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-black shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,255,255,0.25)] scale-[1.02]'
                      : 'border border-white/10 hover:border-white/30 opacity-75 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <img
                    src={event.artistPortrait || event.officialPoster}
                    alt={event.artist}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-top filter brightness-[0.9] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500 ease-out"
                  />

                  {/* Dark subtle gradient at the bottom edge */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Top-Right Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="rounded-full bg-black/60 backdrop-blur-md text-[9px] font-agrandir-semibold px-2 py-0.5 tracking-wider text-[#d4af37] border border-white/15 uppercase">
                      {event.status === 'published' ? 'BILLETTERIE' : 'BIENTÔT'}
                    </span>
                  </div>
                </div>

                {/* 2. Textes épurés sous la carte */}
                <div className="pt-2.5 px-1">
                  <h3 className={`font-agrandir-extrabold text-sm sm:text-base tracking-tight uppercase truncate transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                  }`}>
                    {event.artist}
                  </h3>
                  <p className="text-xs font-agrandir-regular text-neutral-400 truncate mt-0.5">
                    {event.venue} · {event.date}
                  </p>
                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          3. SECTION RECHERCHE ET FILTRES : STRICTEMENT SOUS LE CARROUSEL "À LA UNE"
          Permet de garantir que le premier impact à l'ouverture du site soit 100% visuel.
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-10 sm:pt-14 relative z-20">
        <div className="rounded-3xl sm:rounded-full bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/15 p-3 sm:p-4 shadow-2xl">
          
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
          SECTION : ARCHIVES DES PRODUCTIONS PASSÉES (3 CADRES 16:9 HORIZONTAUX)
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
        
        <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              MÉMOIRE DES SCÈNES LUMARÉEL
            </div>
            <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase">
              ARCHIVES RÉCENTES &amp; RÉCAPS VIDÉO
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

        {/* Exactement 3 cadres disposés horizontalement (en ligne) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(archives || []).slice(0, 3).map((item) => (
            <div
              key={item.id}
              onClick={() => setCurrentPage('archive')}
              className="group cursor-pointer flex flex-col justify-between"
            >
              {/* Le Cadre 16:9 avec Couverture de l'archive et bouton Play */}
              <div className="aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#111111] border border-white/15 group-hover:border-white/40 transition-all duration-300 shadow-xl group-hover:scale-[1.02]">
                <img
                  src={item.coverImage}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center filter brightness-[0.88] group-hover:brightness-100 group-hover:scale-105 transition-all duration-500"
                />

                {/* Gradient sombre */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* Bouton Play stylisé au centre */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 shadow-2xl group-hover:scale-110">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </div>

                {/* Duration / Live Badge en bas à droite */}
                <div className="absolute bottom-3 right-3">
                  <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/20 uppercase font-semibold">
                    {item.duration || 'LIVE HD'}
                  </span>
                </div>

                {/* Pill ARCHIVE en haut à gauche */}
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold text-[#d4af37] border border-white/15 uppercase tracking-wider">
                    RÉCAP VIDÉO
                  </span>
                </div>
              </div>

              {/* Informations sous le cadre */}
              <div className="pt-3 px-1">
                <div className="text-[10px] font-agrandir-regular text-[#888] uppercase tracking-wider flex items-center gap-2 mb-1">
                  <span>{item.date || item.year}</span>
                  <span>·</span>
                  <span className="truncate">{item.venue}</span>
                </div>

                <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight group-hover:text-white transition-colors truncate">
                  {item.title}
                </h3>

                <p className="font-agrandir-regular text-xs text-[#888] line-clamp-2 mt-1 leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
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

    </div>
  );
};
