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

  // Countdown state
  const [countdown, setCountdown] = useState({
    days: 52,
    hours: 18,
    minutes: 24,
    seconds: 4,
  });

  // Dynamic countdown calculating in real time for the currently active concert
  useEffect(() => {
    if (!activeSlide) return;
    const timeStr = activeSlide.time ? (activeSlide.time.includes(':') ? activeSlide.time : `${activeSlide.time}:00`) : '18:00';
    const targetDate = new Date(`${activeSlide.date}T${timeStr}:00Z`).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const diff = Math.max(0, targetDate - now);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
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
    const matchesSearch = searchQuery === '' || event.title.toLowerCase().includes(searchQuery.toLowerCase()) || event.artist.toLowerCase().includes(searchQuery.toLowerCase()) || event.venue.toLowerCase().includes(searchQuery.toLowerCase()) || event.city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = selectedGenre === 'all' || event.genre === selectedGenre;
    const matchesCity = selectedCity === 'all' || event.city.toLowerCase() === selectedCity.toLowerCase();
    const matchesOpen = !openOnly || event.status === 'published';
    return matchesSearch && matchesGenre && matchesCity && matchesOpen;
  });

  const genres = ['all', ...Array.from(new Set(events.map((e) => e.genre)))];
  const handleSelectArtistSlide = (index: number) => setCurrentSlideIndex(index);

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] pb-24 select-none">
      
      {/* =========================================================================
          1. NOUVELLE SECTION PRINCIPALE : PROGRAMMATION OFFICIELLE
          (Format 16:9 conservé avec boutons et compte à rebours ajoutés en dessous)
         ========================================================================= */}
      <section className="relative z-30 max-w-7xl mx-auto px-6 sm:px-12 pt-20 sm:pt-28">
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
            <button onClick={() => scrollFeaturedRow('left')} className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => scrollFeaturedRow('right')} className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div ref={featuredRowRef} className="flex items-start gap-6 overflow-x-auto pb-6 scrollbar-none snap-x snap-mandatory pt-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {activeSlides.map((event, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <div key={event.id} onClick={() => handleSelectArtistSlide(idx)} className="w-[85vw] sm:w-[400px] shrink-0 cursor-pointer group snap-start transition-all duration-300 select-none">
                
                {/* L'image 16:9 Intacte */}
                <div className={`aspect-[16/9] w-full rounded-3xl overflow-hidden relative transition-all duration-300 bg-[#111111] ${isActive ? 'ring-2 ring-[#d4af37] ring-offset-2 ring-offset-black shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(212,175,55,0.35)] scale-[1.02]' : 'border border-white/10 hover:border-white/30 opacity-80 hover:opacity-100 hover:scale-[1.01]'}`}>
                  <img src={event.officialPoster || event.bannerImage} alt={event.title} referrerPolicy="no-referrer" className="w-full h-full object-cover filter brightness-[0.95] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-2.5 right-2.5">
                    <span className="rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold px-2 py-0.5 tracking-wider text-[#d4af37] border border-[#d4af37]/30 uppercase">
                      {event.status === 'published' ? 'BILLETTERIE' : 'BIENTÔT'}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md border border-[#d4af37]/40 text-[9px] font-agrandir-semibold text-[#d4af37] uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-ping" />
                      <span>AFFICHÉ EN BANNIÈRE</span>
                    </div>
                  )}
                </div>

                {/* Ajout : Les informations, boutons et compte à rebours sous l'image */}
                <div className="pt-4 px-1 flex flex-col gap-4">
                  <div>
                    <h3 className={`font-agrandir-extrabold text-base sm:text-lg tracking-tight uppercase truncate transition-colors ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                      {event.artist} — {event.title}
                    </h3>
                    <p className="text-xs font-agrandir-regular text-neutral-400 truncate mt-0.5">
                      {event.venue} · {event.date}
                    </p>
                  </div>

                  {/* Boutons intégrés de l'image 8 */}
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => handleBookNow(event, e)} className="flex-1 bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-[10px] sm:text-xs py-3 px-2 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg uppercase tracking-wider">
                      <Ticket className="w-4 h-4" />
                      ACHETER TICKETS
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }} className="flex-1 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white font-agrandir-semibold text-[10px] sm:text-xs py-3 px-2 rounded-xl active:scale-95 transition-all uppercase tracking-wider">
                      DÉTAILS DU CONCERT
                    </button>
                  </div>

                  {/* Compte à rebours de l'image 8 (affiché pour le slide actif) */}
                  <div className={`transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-gray-400 text-[9px] font-agrandir-semibold tracking-widest mb-2 uppercase">
                      EVENT STARTS IN
                    </p>
                    <div className="flex gap-2 sm:gap-3">
                      {[
                        { value: countdown.days, label: 'DAYS' },
                        { value: countdown.hours, label: 'HOURS' },
                        { value: countdown.minutes, label: 'MINUTES' },
                        { value: countdown.seconds, label: 'SECONDS', isYellow: true }
                      ].map((time, i) => (
                        <div key={i} className="flex flex-col items-center flex-1">
                          <div className="w-full aspect-[4/3] rounded-xl bg-[#0a0a0a] border border-white/10 flex items-center justify-center shadow-inner mb-1.5">
                            <span className={`text-xl sm:text-2xl font-agrandir-extrabold ${time.isYellow ? 'text-[#d4af37]' : 'text-white'}`}>
                              {String(time.value).padStart(2, '0')}
                            </span>
                          </div>
                          <span className="text-[8px] text-[#777] font-agrandir-semibold tracking-widest uppercase">
                            {time.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          2. SECTION RECHERCHE ET FILTRES
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-6 sm:pt-10 relative z-20">
        <div className="rounded-3xl sm:rounded-full bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/15 p-3 sm:p-4 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-[#777] absolute left-4 top-1/2 -translate-y-1/2" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher un artiste, concert, lieu ou ville..." className="w-full bg-[#181818] border border-white/10 rounded-full pl-11 pr-4 py-2.5 text-xs text-white placeholder-[#666] focus:outline-none focus:border-white font-agrandir-regular" />
            </div>
            <div className="md:col-span-3">
              <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)} className="w-full bg-[#181818] border border-white/10 rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular uppercase tracking-wider">
                <option value="all">TOUS LES GENRES</option>
                {genres.filter(g => g !== 'all').map(g => <option key={g} value={g}>{g.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} className="w-full bg-[#181818] border border-white/10 rounded-full px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white font-agrandir-regular uppercase tracking-wider">
                <option value="all">TOUTES LES VILLES</option>
                <option value="Abidjan">ABIDJAN</option>
                <option value="Paris">PARIS</option>
              </select>
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
              <button onClick={() => setOpenOnly(!openOnly)} className={`w-full py-2.5 px-4 rounded-full border text-[11px] font-agrandir-semibold tracking-wider uppercase transition-colors cursor-pointer text-center ${openOnly ? 'bg-white text-black border-white shadow-md' : 'bg-[#181818] text-[#888] border-white/10 hover:text-white'}`}>
                {openOnly ? '✓ DISPONIBLES' : 'BILLETS OUVERTS'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION : BILLETTERIE OUVERTE
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
          <button onClick={() => setCurrentPage('discover')} className="text-xs font-agrandir-semibold tracking-widest text-[#aaa] hover:text-white uppercase flex items-center gap-1.5 transition-colors cursor-pointer px-4 py-2 rounded-full border border-white/10 bg-white/5">
            <span>VOIR TOUT LE CATALOGUE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-6 pb-5 -mx-6 px-6 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 scrollbar-none">
          {events.filter((e) => e.status === 'published').map((event) => {
            const totalQuota = event.categories.reduce((acc, c) => acc + c.quota, 0);
            const totalSold = event.categories.reduce((acc, c) => acc + c.sold, 0);
            const remaining = totalQuota - totalSold;
            const minPrice = Math.min(...event.categories.map((c) => c.price));
            const currency = event.categories[0]?.currency || 'XOF';
            const artistVisual = event.artistPortrait || event.officialPoster || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg';

            return (
              <div key={event.id} onClick={() => handleSelectEvent(event)} className="w-[74vw] sm:w-auto shrink-0 snap-start flex flex-col bg-[#0d0d0d] border border-white/10 hover:border-white/25 rounded-2xl sm:rounded-3xl p-3 sm:p-4 transition-all shadow-xl hover:shadow-2xl cursor-pointer group select-none">
                <div className="aspect-[4/3] w-full rounded-xl sm:rounded-2xl overflow-hidden relative bg-[#141414] border border-white/10">
                  <img src={artistVisual} alt={event.artist} referrerPolicy="no-referrer" className="w-full h-full object-cover object-top filter brightness-[0.92] contrast-[1.05] group-hover:scale-105 transition-transform duration-500 ease-out" />
                  <div className="absolute top-2.5 left-2.5 w-6 h-6 rounded-full bg-black/70 backdrop-blur-md text-[#d4af37] border border-[#d4af37]/40 flex items-center justify-center font-bold text-xs shadow-md">✓</div>
                  <div className="absolute bottom-2.5 right-2.5 rounded-md bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-0.5 text-[9px] font-agrandir-semibold text-white tracking-wider uppercase flex items-center gap-1 shadow-md">
                    <span>CONCERT</span>
                  </div>
                  {remaining < 150 && (
                    <div className="absolute top-2.5 right-2.5 rounded-full bg-black/70 backdrop-blur-md px-2 py-0.5 text-[8px] font-agrandir-semibold text-[#d4af37] border border-[#d4af37]/30">
                      {remaining} PLACES
                    </div>
                  )}
                </div>
                <div className="pt-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <h3 className="font-agrandir-extrabold text-sm sm:text-base text-white tracking-tight uppercase group-hover:text-[#f0f0f0] transition-colors truncate">
                        {event.artist} — {event.title}
                      </h3>
                      <button onClick={(e) => toggleBookmark(event.id, e)} className="p-1 text-[#888] hover:text-[#d4af37] transition-colors shrink-0">
                        <Bookmark className={`w-3.5 h-3.5 ${bookmarked[event.id] ? 'fill-[#d4af37] text-[#d4af37]' : ''}`} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#aaa] font-agrandir-regular mb-1">
                      <Calendar className="w-3.5 h-3.5 text-[#777] shrink-0" />
                      <span className="truncate">{event.date} · {event.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-agrandir-extrabold text-white mb-1">
                      <span className="text-[10px] text-[#777] font-agrandir-regular">À partir de</span>
                      <span className="text-[#d4af37]">{minPrice.toLocaleString()} {currency}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-[#888] font-agrandir-regular truncate mb-3">
                      <MapPin className="w-3.5 h-3.5 text-[#777] shrink-0" />
                      <span className="truncate">{event.city}, Côte d'Ivoire · {event.venue}</span>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <button onClick={(e) => handleBookNow(event, e)} className="w-full py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-colors shadow-lg flex items-center justify-center gap-1.5 cursor-pointer">
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
          SECTION : ARCHIVES
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
        <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">MÉMOIRE D'ESSAI</div>
            <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">ARCHIVES</h2>
          </div>
          <button onClick={() => setCurrentPage('archive')} className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-5 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-6 scrollbar-none">
          {(archives || []).slice(0, 3).map((item) => {
            const safeCover = item.coverImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg';
            return (
              <div key={item.id} onClick={() => setCurrentPage('archive')} className="w-[82vw] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col justify-between">
                <div className="aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#111111] border border-white/15 group-hover:border-white/40 transition-all duration-300 shadow-xl group-hover:scale-[1.02]">
                  <img src={safeCover} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover object-center filter brightness-[0.88] group-hover:brightness-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 shadow-2xl group-hover:scale-110">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/20 uppercase font-semibold">{item.duration || 'LIVE HD'}</span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold text-[#d4af37] border border-white/15 uppercase tracking-wider">RÉCAP VIDÉO</span>
                  </div>
                </div>
                <div className="pt-3 px-1">
                  <div className="text-[10px] font-agrandir-regular text-[#888] uppercase tracking-wider flex items-center gap-2 mb-1">
                    <span>{item.date || item.year}</span><span>·</span><span className="truncate">{item.venue}</span>
                  </div>
                  <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight group-hover:text-white transition-colors truncate">{item.title}</h3>
                  <p className="font-agrandir-regular text-xs text-[#888] line-clamp-2 mt-1 leading-relaxed">{item.description}</p>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                    <button onClick={(e) => { e.stopPropagation(); setCurrentPage('archive'); }} className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#d4af37] text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5 border border-[#d4af37]/30 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" /><span>Voir les images</span>
                    </button>
                    <span className="text-[10px] text-[#777] font-agrandir-regular">{item.duration || 'LIVE HD'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          SECTION : ACTUALITÉS
         ========================================================================= */}
      {news && news.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
          <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">ÉDITIONS &amp; COMMUNIQUÉS</div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">ACTUALITÉS</h2>
            </div>
            <button onClick={() => setCurrentPage('news')} className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-5 pb-5 -mx-6 px-6 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:gap-6 scrollbar-none">
            {news.slice(0, 3).map((article: any) => (
              <article key={article.id} onClick={() => setCurrentPage('news')} className="w-[82vw] md:w-auto shrink-0 snap-start bg-[#0b0b0b] border border-white/10 rounded-3xl p-6 hover:border-white/30 transition-all cursor-pointer flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-agrandir-regular tracking-wider uppercase text-[#777] mb-3">
                    <span className="text-[#d4af37] font-agrandir-semibold">{article.category}</span>
                    <span>{article.date}</span>
                  </div>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight mb-3 leading-snug">{article.title}</h3>
                  <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed line-clamp-3 mb-6">{article.summary}</p>
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