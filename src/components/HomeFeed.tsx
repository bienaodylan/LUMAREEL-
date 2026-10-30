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
  Image as ImageIcon,
} from 'lucide-react';

export const HomeFeed: React.FC = () => {
  const {
    events,
    setSelectedEventSlug,
    setCurrentPage,
    setCheckoutEvent,
    news,
    archives,
    currentUser,
    setIsAuthModalOpen,
    showToast,
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
    if (!currentUser) {
      showToast('Création de compte obligatoire pour réserver vos billets.', 'info');
      setCheckoutEvent(event);
      setIsAuthModalOpen(true);
      return;
    }
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
      {/* =========================================================================
          1. SECTION HERO (BANNIÈRE PRINCIPALE — RÉFÉRENCE GOLIVE ASIA / THE WEEKND)
          Prend tout l'écran avec uniquement la photo de l'artiste en fond immersif.
          En bas : Tag CONCERT, nom monumental de l'artiste, SHOWTIMES, bouton
          d'action et compte à rebours dynamique (DAYS, HOURS, MINUTES, SECONDS).
         ========================================================================= */}
      {activeSlide && (
        <section
          onClick={() => handleSelectEvent(activeSlide)}
          className="relative w-full h-[88vh] min-h-[660px] max-h-[920px] overflow-hidden bg-black flex items-end justify-center cursor-pointer select-none group"
        >
          {/* 1. Visuel de Fond Immersif : Photo de l'artiste en plein écran */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              key={activeSlide.id}
              src={activeSlide.artistPortrait || activeSlide.bannerImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg'}
              alt={activeSlide.artist}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-center filter brightness-[0.88] contrast-[1.05] transition-all duration-700 ease-out"
            />
          </div>

          {/* Dégradés cinématiques : fondu sombre vers le haut pour la navbar et vers le bas pour les informations */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />
          <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-10 opacity-60" />

          {/* Boutons de navigation gauche / droite (< et >) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevSlide();
            }}
            className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
            aria-label="Artiste précédent"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              nextSlide();
            }}
            className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
            aria-label="Artiste suivant"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          {/* Contenu Superposé en bas de la bannière (Style GoLive / The Weeknd) */}
          <div className="relative z-20 max-w-7xl w-full mx-auto px-6 sm:px-12 pb-14 sm:pb-16 flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            
            {/* Colonne Gauche : Titre monumental & Showtimes */}
            <div className="max-w-2xl space-y-4">
              
              {/* Badge Tag CONCERT */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/25 bg-black/40 backdrop-blur-md text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#d4af37] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                <span>CONCERT OFFICIEL</span>
              </div>

              {/* Nom Monumental de l'Artiste */}
              <h1 className="font-agrandir-extrabold text-4xl sm:text-6xl md:text-7xl text-white tracking-tighter uppercase leading-[0.95] drop-shadow-[0_10px_25px_rgba(0,0,0,0.8)]">
                {activeSlide.artist}
              </h1>

              {/* Showtimes & Lieu */}
              <div className="pt-1">
                <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#888] uppercase mb-1">
                  SHOWTIMES
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm sm:text-base font-agrandir-bold text-white">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#d4af37]" />
                    <span>{activeSlide.date}</span>
                    <span className="text-[#888] font-agrandir-regular text-xs">· {activeSlide.time}</span>
                  </div>
                  <span className="text-[#555] hidden sm:inline">|</span>
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-neutral-300 font-agrandir-regular">
                    <MapPin className="w-4 h-4 text-[#d4af37]" />
                    <span>{activeSlide.venue}, {activeSlide.city}</span>
                  </div>
                </div>
              </div>

              {/* Bouton d'action billetterie */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={(e) => handleBookNow(activeSlide, e)}
                  className="px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all duration-300 shadow-2xl flex items-center gap-2 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <Ticket className="w-4 h-4" />
                  <span>Acheter tickets</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectEvent(activeSlide);
                  }}
                  className="px-5 py-3 rounded-xl bg-black/60 hover:bg-black/90 border border-white/20 backdrop-blur-md text-white font-agrandir-semibold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Détails du concert
                </button>
              </div>

            </div>

            {/* Colonne Droite : Compte à rebours numérique dynamique (Référence GoLive) */}
            <div className="lg:text-right shrink-0">
              <div className="text-[10px] font-agrandir-semibold tracking-[0.25em] text-[#888] uppercase mb-2">
                EVENT STARTS IN
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Jours */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                    {String(countdown.days).padStart(2, '0')}
                  </div>
                  <span className="text-[9px] font-agrandir-semibold uppercase tracking-widest text-[#777] mt-1.5">
                    DAYS
                  </span>
                </div>

                {/* Heures */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                    {String(countdown.hours).padStart(2, '0')}
                  </div>
                  <span className="text-[9px] font-agrandir-semibold uppercase tracking-widest text-[#777] mt-1.5">
                    HOURS
                  </span>
                </div>

                {/* Minutes */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-white shadow-xl">
                    {String(countdown.minutes).padStart(2, '0')}
                  </div>
                  <span className="text-[9px] font-agrandir-semibold uppercase tracking-widest text-[#777] mt-1.5">
                    MINUTES
                  </span>
                </div>

                {/* Secondes */}
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 flex items-center justify-center font-agrandir-extrabold text-2xl sm:text-3xl text-[#d4af37] shadow-xl">
                    {String(countdown.seconds).padStart(2, '0')}
                  </div>
                  <span className="text-[9px] font-agrandir-semibold uppercase tracking-widest text-[#777] mt-1.5">
                    SECONDS
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* Indicateurs de diapositives en bas au centre */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15">
            {activeSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlideIndex(idx);
                }}
                className={`transition-all rounded-full cursor-pointer ${
                  idx === currentSlideIndex
                    ? 'w-6 h-1.5 bg-[#d4af37]'
                    : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                }`}
                aria-label={`Aller au concert ${idx + 1}`}
              />
            ))}
          </div>

        </section>
      )}

      {/* =========================================================================
          2. SECTION : PROCHAINS CONCERTS (AFFICHES OFFICIELLES DES CONCERTS)
          Ici, ce sont les AFFICHES OFFICIELLES de chaque concert qui sont affichées
          (Wantché, Tiakola, Jeune Lion, Jamsco).
          Au clic sur l'affiche, la bannière Hero du haut affiche le portrait de l'artiste !
         ========================================================================= */}
      <section className="relative z-30 max-w-7xl mx-auto px-6 sm:px-12 pt-10 sm:pt-14">
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div className="min-w-0 pr-4">
            <div className="text-[9px] sm:text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              PROGRAMMATION OFFICIELLE
            </div>
            <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              PROCHAIN CONCERT
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

        {/* Scrollable Horizontal Row with Official Concert Posters */}
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
                className="w-[260px] sm:w-[320px] shrink-0 cursor-pointer group snap-start transition-all duration-300 select-none"
              >
                {/* 1. Carte AFFICHE OFFICIELLE DU CONCERT au ratio 16:9 */}
                <div
                  className={`aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative transition-all duration-300 bg-[#111111] ${
                    isActive
                      ? 'ring-2 ring-[#d4af37] ring-offset-2 ring-offset-black shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.35)] scale-[1.02]'
                      : 'border border-white/10 hover:border-white/30 opacity-80 hover:opacity-100 hover:scale-[1.01]'
                  }`}
                >
                  <img
                    src={event.officialPoster || event.bannerImage}
                    alt={event.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover filter brightness-[0.95] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500 ease-out"
                  />

                  {/* Dark subtle gradient at the bottom edge */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                  {/* Top-Right Badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold px-2 py-0.5 tracking-wider text-[#d4af37] border border-[#d4af37]/30 uppercase">
                      {event.status === 'published' ? 'BILLETTERIE' : 'BIENTÔT'}
                    </span>
                  </div>

                  {/* Bouton indicateur 'À l'écran' si actif */}
                  {isActive && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#d4af37]/40 text-[9px] font-agrandir-semibold text-[#d4af37] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-ping" />
                      <span>AFFICHÉ EN BANNIÈRE</span>
                    </div>
                  )}
                </div>

                {/* 2. Textes épurés sous l'affiche */}
                <div className="pt-2.5 px-1">
                  <h3 className={`font-agrandir-extrabold text-sm sm:text-base tracking-tight uppercase truncate transition-colors ${
                    isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                  }`}>
                    {event.artist} — {event.title}
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

        {/* Mobile Horizontal Carousel with 74vw peek cards, Desktop Grid */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 pb-5 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 scrollbar-none">
          {events
            .filter((e) => e.status === 'published')
            .map((event) => {
              const totalQuota = event.categories.reduce((acc, c) => acc + c.quota, 0);
              const totalSold = event.categories.reduce((acc, c) => acc + c.sold, 0);
              const remaining = totalQuota - totalSold;
              const minPrice = Math.min(...event.categories.map((c) => c.price));
              const currency = event.categories[0]?.currency || 'XOF';
              // Image de l'artiste ou affiche verticale gérable depuis l'admin
              const artistVisual = event.artistPortrait || event.officialPoster || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg';

              return (
                <div
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="w-[74vw] sm:w-auto shrink-0 snap-start flex flex-col bg-[#0d0d0d] border border-white/10 hover:border-white/25 rounded-2xl sm:rounded-3xl p-3 sm:p-4 transition-all shadow-xl hover:shadow-2xl cursor-pointer group select-none"
                >
                  {/* 1. Cadre Image (Ratio 4:3 inspiré de la référence Tikerama avec bords arrondis) */}
                  <div className="aspect-[4/3] w-full rounded-xl sm:rounded-2xl overflow-hidden relative bg-[#141414] border border-white/10">
                    <img
                      src={artistVisual}
                      alt={event.artist}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.05] group-hover:scale-105 transition-transform duration-500 ease-out"
                    />

                    {/* Badge Officiel / Vérifié en haut à gauche (style luxe monochrome & doré) */}
                    <div className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-black/70 backdrop-blur-md text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center font-bold text-xs shadow-md">
                      ✓
                    </div>

                    {/* Tag Catégorie en bas à droite (style épuré luxe) */}
                    <div className="absolute bottom-2.5 right-2.5 rounded-md bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[9px] font-agrandir-semibold text-white tracking-wider uppercase flex items-center gap-1 shadow-md">
                      <span>CONCERT</span>
                    </div>

                    {/* Badge Places restantes */}
                    {remaining < 150 && (
                      <div className="absolute top-2.5 right-2.5 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 text-[8px] font-agrandir-semibold text-[#d4af37] border border-[#d4af37]/30">
                        {remaining} PLACES
                      </div>
                    )}
                  </div>

                  {/* 2. Bloc Informations & Prix sous l'image */}
                  <div className="pt-3 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Titre & Favori */}
                      <div className="flex items-start justify-between gap-1.5 mb-1.5">
                        <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white tracking-tight uppercase group-hover:text-[#f0f0f0] transition-colors truncate">
                          {event.artist} — {event.title}
                        </h3>
                        <button
                          onClick={(e) => toggleBookmark(event.id, e)}
                          className="p-1 text-[#888] hover:text-[#d4af37] transition-colors shrink-0"
                          title="Ajouter aux favoris"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${bookmarked[event.id] ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
                        </button>
                      </div>

                      {/* Date et Heure */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#aaa] font-agrandir-regular mb-1">
                        <Calendar className="w-3.5 h-3.5 text-[#777] shrink-0" />
                        <span className="truncate">{event.date} · {event.time}</span>
                      </div>

                      {/* Prix "À partir de" (Épuré blanc et accent doré) */}
                      <div className="flex items-center gap-1.5 text-xs font-agrandir-extrabold text-white mb-1">
                        <span className="text-[10px] text-[#777] font-agrandir-regular">À partir de</span>
                        <span className="text-[#d4af37]">{minPrice.toLocaleString()} {currency}</span>
                      </div>

                      {/* Lieu et Ville */}
                      <div className="flex items-center gap-1.5 text-[11px] text-[#888] font-agrandir-regular truncate mb-3">
                        <MapPin className="w-3.5 h-3.5 text-[#777] shrink-0" />
                        <span className="truncate">{event.city}, Côte d'Ivoire · {event.venue}</span>
                      </div>
                    </div>

                    {/* Bouton Acheter tickets (Blanc haut contraste luxe) & Footer Organisateur */}
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <button
                        onClick={(e) => handleBookNow(event, e)}
                        className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-colors shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Acheter tickets</span>
                      </button>

                      <div className="flex items-center justify-between text-[9px] text-[#777] font-agrandir-regular px-0.5">
                        <span className="truncate">Publié par <strong>LUMARÉEL CO.</strong></span>
                        <span className="text-[#d4af37]">✓ Certifié</span>
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
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
              MÉMOIRE D'ESSAI
            </div>
            <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">
              ARCHIVES
            </h2>
          </div>

          <button
            onClick={() => setCurrentPage('archive')}
            aria-label="Accéder à l'ensemble des archives"
            className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Exactement 3 cadres disposés horizontalement avec défilement et aperçu mobile (82vw) */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-5 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-6 scrollbar-none">
          {(archives || []).slice(0, 3).map((item) => {
            const safeCover = item.coverImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg';

            return (
              <div
                key={item.id}
                onClick={() => setCurrentPage('archive')}
                className="w-[82vw] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col justify-between"
              >
                {/* Le Cadre 16:9 avec Couverture de l'archive et bouton Play */}
                <div className="aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#111111] border border-white/15 group-hover:border-white/40 transition-all duration-300 shadow-xl group-hover:scale-[1.02]">
                  <img
                    src={safeCover}
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

                  {/* Bouton Voir les images sous le cadre */}
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage('archive');
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#d4af37] text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5 border border-[#d4af37]/30 transition-colors"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Voir les images</span>
                    </button>

                    <span className="text-[10px] text-[#777] font-agrandir-regular">
                      {item.duration || 'LIVE HD'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          SECTION : ACTUALITÉS & COMMUNIQUÉS OFFICIELS (CADRES ARRONDIS & PEEK MOBILE)
         ========================================================================= */}
      {news && news.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
          
          <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
                ÉDITIONS &amp; COMMUNIQUÉS
              </div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">
                ACTUALITÉS
              </h2>
            </div>

            <button
              onClick={() => setCurrentPage('news')}
              aria-label="Consulter toutes les actualités"
              className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-5 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-6 scrollbar-none">
            {news.slice(0, 3).map((article: any) => (
              <article
                key={article.id}
                onClick={() => setCurrentPage('news')}
                className="w-[82vw] md:w-auto shrink-0 snap-start bg-[#0b0b0b] border border-white/10 rounded-3xl p-6 hover:border-white/30 transition-all cursor-pointer flex flex-col justify-between shadow-xl"
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
