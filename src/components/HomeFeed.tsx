import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  Calendar,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Play,
  Image as ImageIcon,
  Newspaper,
  User
} from 'lucide-react';
import { formatDateLongFrench } from '../utils/dateUtils';

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

  const handleSelectArtistSlide = (index: number) => setCurrentSlideIndex(index);

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] pb-24 select-none">
      
      {/* =========================================================================
          1. SECTION PRINCIPALE : PROGRAMMATION OFFICIELLE
         ========================================================================= */}
      <section className="relative z-30 max-w-7xl mx-auto px-6 sm:px-12 pt-20 sm:pt-28">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div className="min-w-0 pr-4">
            <div className="text-[9px] sm:text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
            </div>
            <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              ÉVÉNEMENTS À VENIR
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
                </div>

                {/* Les informations, boutons et compte à rebours sous l'image */}
                <div className="pt-4 px-1 flex flex-col gap-4">
                  <div>
                    <h3 className={`font-agrandir-extrabold text-base sm:text-lg tracking-tight uppercase truncate transition-colors ${isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'}`}>
                      {event.artist} EN CONCERT
                    </h3>
                    <p className="text-xs font-agrandir-regular text-neutral-300 truncate mt-0.5">
                      <strong className="font-agrandir-extrabold text-white">{event.venue}</strong> · <strong className="font-agrandir-extrabold text-white">{formatDateLongFrench(event.date)}</strong>
                    </p>
                  </div>

                  {/* Boutons */}
                  <div className="flex items-center gap-3">
                    <button onClick={(e) => handleBookNow(event, e)} className="flex-1 bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-[10px] sm:text-xs py-3 px-2 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg uppercase tracking-wider">
                      <Ticket className="w-4 h-4" />
                      ACHETER TICKETS
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }} className="flex-1 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white font-agrandir-semibold text-[10px] sm:text-xs py-3 px-2 rounded-xl active:scale-95 transition-all uppercase tracking-wider">
                      DÉTAILS DU CONCERT
                    </button>
                  </div>

                  {/* Compte à rebours */}
                  <div className={`transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                    <p className="text-gray-400 text-[9px] font-agrandir-semibold tracking-widest mb-2 uppercase">
                      LE CONCERT DÉBUTE DANS
                    </p>
                    <div className="flex gap-2 sm:gap-3">
                      {[
                        { value: countdown.days, label: 'JOURS' },
                        { value: countdown.hours, label: 'HEURES' },
                        { value: countdown.minutes, label: 'MINUTES' },
                        { value: countdown.seconds, label: 'SECONDES', isYellow: true }
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
          2. SECTION : BLOC DE NAVIGATION RAPIDE
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-6 sm:pt-10 relative z-20">
        <div className="rounded-[24px] bg-[#0d0d0d]/90 backdrop-blur-xl border border-white/10 p-2 shadow-2xl">
          <div className="flex flex-col">

            {/* Menu 1 : Billetterie & Catalogue */}
            <button 
              onClick={() => setCurrentPage('discover')} 
              className="flex items-center justify-between w-full p-3 hover:bg-white/5 rounded-[16px] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-white/5 flex items-center justify-center group-hover:bg-[#d4af37]/20 group-hover:border-[#d4af37]/30 transition-all shadow-inner">
                  <Ticket className="w-4 h-4 text-[#aaa] group-hover:text-[#d4af37] transition-colors" />
                </div>
                <span className="text-[11px] sm:text-xs font-agrandir-semibold tracking-wider text-white uppercase">
                  Billetterie & Catalogue
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-white transition-colors" />
            </button>

            <div className="h-px bg-white/5 mx-4 my-1" />

            {/* Menu 2 : Archives */}
            <button 
              onClick={() => setCurrentPage('archive')} 
              className="flex items-center justify-between w-full p-3 hover:bg-white/5 rounded-[16px] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all shadow-inner">
                  <Play className="w-4 h-4 text-[#aaa] group-hover:text-white transition-colors" />
                </div>
                <span className="text-[11px] sm:text-xs font-agrandir-semibold tracking-wider text-white uppercase">
                  Archives 
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-white transition-colors" />
            </button>

            <div className="h-px bg-white/5 mx-4 my-1" />

            {/* Menu 3 : Actualités & Éditions */}
            <button 
              onClick={() => setCurrentPage('news')} 
              className="flex items-center justify-between w-full p-3 hover:bg-white/5 rounded-[16px] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all shadow-inner">
                  <Newspaper className="w-4 h-4 text-[#aaa] group-hover:text-white transition-colors" />
                </div>
                <span className="text-[11px] sm:text-xs font-agrandir-semibold tracking-wider text-white uppercase">
                  Actualités & Éditions
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-white transition-colors" />
            </button>

            <div className="h-px bg-white/5 mx-4 my-1" />

            {/* Menu 4 : Mon Profil & Paramètres */}
            <button 
              onClick={() => setCurrentPage('profile')} 
              className="flex items-center justify-between w-full p-3 hover:bg-white/5 rounded-[16px] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#181818] border border-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all shadow-inner">
                  <User className="w-4 h-4 text-[#aaa] group-hover:text-white transition-colors" />
                </div>
                <span className="text-[11px] sm:text-xs font-agrandir-semibold tracking-wider text-white uppercase">
                  Mon Profil & Paramètres
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#555] group-hover:text-white transition-colors" />
            </button>

          </div>
        </div>
      </section>

      {/* =========================================================================
          3. SECTION : ARCHIVES
         ========================================================================= */}
      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
        <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1"></div>
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
                    <strong className="font-agrandir-extrabold text-white">{item.date ? formatDateLongFrench(item.date) : item.year}</strong><span>·</span><strong className="font-agrandir-extrabold text-white truncate">{item.venue}</strong>
                  </div>
                  <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight group-hover:text-white transition-colors truncate">{item.title}</h3>
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
          4. SECTION : ACTUALITÉS
         ========================================================================= */}
      {news && news.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-16 sm:pt-20">
          <div className="mb-8 pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
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
                    <strong className="font-agrandir-bold text-white">{formatDateLongFrench(article.date)}</strong>
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