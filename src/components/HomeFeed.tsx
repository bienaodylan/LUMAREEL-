import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ConcertEvent } from '../types';
import {
  Award,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Crown,
  Image as ImageIcon,
  Lightbulb,
  Newspaper,
  Play,
  Ticket,
  User,
  Zap,
} from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';

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
    language,
    setLanguage,
    t,
  } = useApp();

  // Carousel state
  const featuredSlides = events.filter((e) => e.isFeatured && e.status !== 'draft');
  const activeSlides = featuredSlides.length > 0 ? featuredSlides : events.slice(0, 3);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const activeSlide = activeSlides[currentSlideIndex] || activeSlides[0];

const calculateEventCountdown = (dateStr?: string, timeStr?: string) => {
  if (!dateStr) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const safeTime = timeStr ? (timeStr.includes(':') ? timeStr : `${timeStr}:00`) : '18:00';
  let targetDate = 0;
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-').map(Number);
    const [h, min] = safeTime.split(':').map(Number);
    targetDate = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1, h || 0, min || 0, 0).getTime();
  } else {
    targetDate = new Date(`${dateStr} ${safeTime}`).getTime();
  }
  const now = Date.now();
  const diff = Math.max(0, targetDate - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
};

const EventCardCountdown: React.FC<{
  dateStr?: string;
  timeStr?: string;
  isActive: boolean;
  t: (key: string) => string;
}> = ({ dateStr, timeStr, isActive, t }) => {
  const [cd, setCd] = useState(() => calculateEventCountdown(dateStr, timeStr));

  useEffect(() => {
    setCd(calculateEventCountdown(dateStr, timeStr));
    const interval = setInterval(() => {
      setCd(calculateEventCountdown(dateStr, timeStr));
    }, 1000);
    return () => clearInterval(interval);
  }, [dateStr, timeStr]);

  return (
    <div className={`transition-all duration-300 ${isActive ? 'opacity-100 scale-[1.005]' : 'opacity-80'}`}>
      <p className={`text-[9px] font-agrandir-semibold tracking-widest mb-2 uppercase transition-colors ${isActive ? 'text-[#d4af37]' : 'text-neutral-400'}`}>
        {t('home.startsIn')}
      </p>
      <div className="flex gap-2 sm:gap-3">
        {[
          { value: cd.days, label: t('home.days') },
          { value: cd.hours, label: t('home.hours') },
          { value: cd.minutes, label: t('home.minutes') },
          { value: cd.seconds, label: t('home.seconds'), isYellow: true },
        ].map((time, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div className={`w-full aspect-[4/3] rounded-xl bg-[#0a0a0a] border transition-all duration-300 flex items-center justify-center shadow-inner mb-1.5 ${
              isActive 
                ? 'border-[#d4af37]/50 shadow-[0_0_15px_rgba(212,175,55,0.25)]' 
                : 'border-white/10'
            }`}>
              <span className={`text-xl sm:text-2xl font-agrandir-extrabold transition-colors ${time.isYellow || isActive ? 'text-[#d4af37]' : 'text-white'}`}>
                {String(time.value).padStart(2, '0')}
              </span>
            </div>
            <span className={`text-[8px] font-agrandir-semibold tracking-widest uppercase transition-colors ${isActive ? 'text-[#ddd]' : 'text-[#777]'}`}>
              {time.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

  const featuredRowRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isProgrammaticScroll = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  // Défilement automatique fluide vers un concert précis
  const scrollToSlide = (index: number) => {
    const container = featuredRowRef.current;
    const card = cardRefs.current[index];
    if (!container || !card) return;

    isProgrammaticScroll.current = true;
    setCurrentSlideIndex(index);

    const containerRect = container.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollOffset = cardRect.left - containerRect.left - (containerRect.width - cardRect.width) / 2;

    container.scrollBy({ left: scrollOffset, behavior: 'smooth' });

    setTimeout(() => {
      isProgrammaticScroll.current = false;
    }, 500);
  };

  // Détection en temps réel lors du scroll tactile ou souris sur téléphone/desktop
  const handleContainerScroll = () => {
    if (isProgrammaticScroll.current) return;
    if (scrollRafRef.current) {
      cancelAnimationFrame(scrollRafRef.current);
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      const container = featuredRowRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      cardRefs.current.forEach((card, idx) => {
        if (!card) return;
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(containerCenter - cardCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      });

      if (closestIndex !== currentSlideIndex && closestIndex >= 0 && closestIndex < activeSlides.length) {
        setCurrentSlideIndex(closestIndex);
      }
    });
  };

  // Auto-play du carrousel avec défilement visible automatique
  useEffect(() => {
    if (activeSlides.length <= 1) return;
    const interval = setInterval(() => {
      if (!isProgrammaticScroll.current) {
        setCurrentSlideIndex((prev) => {
          const next = (prev + 1) % activeSlides.length;
          scrollToSlide(next);
          return next;
        });
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [activeSlides.length]);

  const scrollFeaturedRow = (direction: 'left' | 'right') => {
    const newIndex = direction === 'left' 
      ? (currentSlideIndex === 0 ? activeSlides.length - 1 : currentSlideIndex - 1)
      : (currentSlideIndex + 1) % activeSlides.length;
    scrollToSlide(newIndex);
  };

  const handleSelectEvent = (event: ConcertEvent) => {
    setSelectedEventSlug(event.slug);
    setCurrentPage('concert_detail');
  };

  const handleBookNow = (event: ConcertEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast(language === 'en' ? 'Account required to book tickets.' : 'Création de compte obligatoire pour réserver vos billets.', 'info');
      setCheckoutEvent(event);
      setIsAuthModalOpen(true);
      return;
    }
    setCheckoutEvent(event);
  };

  const handleSelectArtistSlide = (index: number) => {
    scrollToSlide(index);
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-clip bg-transparent text-[#FFFFFF] pb-16 select-none">
      
      {/* =========================================================================
          1. SECTION PRINCIPALE : PROGRAMMATION OFFICIELLE
         ========================================================================= */}
      <section className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] md:pt-12">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
          <div className="min-w-0 pr-4">
            <h2 className="font-agrandir-extrabold text-base sm:text-lg text-white tracking-tight uppercase whitespace-nowrap overflow-hidden text-ellipsis">
              {t('home.upcomingTitle')}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center p-1 rounded-full bg-black/60 border border-white/15 text-[11px] font-agrandir-bold tracking-wider mr-1">
              <button
                type="button"
                onClick={() => setLanguage('fr')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'fr' ? 'bg-white text-black font-agrandir-extrabold' : 'text-[#888] hover:text-white'
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                  language === 'en' ? 'bg-white text-black font-agrandir-extrabold' : 'text-[#888] hover:text-white'
                }`}
              >
                EN
              </button>
            </div>
            <button 
              onClick={() => scrollFeaturedRow('left')} 
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5 active:scale-95"
              aria-label={t('home.prevConcert')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => scrollFeaturedRow('right')} 
              className="p-2.5 rounded-full border border-white/20 hover:border-white text-neutral-300 hover:text-white transition-colors cursor-pointer bg-white/5 active:scale-95"
              aria-label={t('home.nextConcert')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div 
          ref={featuredRowRef} 
          onScroll={handleContainerScroll}
          className="flex items-start gap-4 sm:gap-6 overflow-x-auto pb-6 scrollbar-none snap-x snap-mandatory pt-2 scroll-smooth" 
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {activeSlides.map((event, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <div 
                key={event.id} 
                ref={(el) => { cardRefs.current[idx] = el; }}
                onClick={() => handleSelectArtistSlide(idx)} 
                className="w-[82vw] max-w-[340px] sm:w-[380px] sm:max-w-none md:w-[420px] shrink-0 cursor-pointer group snap-start transition-all duration-300 select-none"
              >
                
                {/* Image 16:9 avec bordure jaune / or automatique dès que le concert est sélectionné ou au scroll */}
                <div className={`aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative transition-all duration-300 bg-[#111111] ${
                  isActive 
                    ? 'ring-2 sm:ring-[2.5px] ring-[#d4af37] ring-offset-2 ring-offset-black shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(212,175,55,0.45)] scale-[1.01]' 
                    : 'border border-white/10 hover:border-white/30 opacity-90 hover:opacity-100 hover:scale-[1.01]'
                }`}>
                  <img 
                    src={event.officialPoster || event.bannerImage} 
                    alt={event.title} 
                    referrerPolicy="no-referrer" 
                    className="w-full h-full object-cover filter brightness-[0.95] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500 ease-out" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Les informations : Artiste EN CONCERT + Lieu et Date en gras */}
                <div className="pt-4 px-1 flex flex-col gap-4">
                  <div>
                    <h3 className={`font-agrandir-extrabold text-base sm:text-lg tracking-tight uppercase truncate transition-colors ${
                      isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                    }`}>
                      {event.artist} {t('home.inConcert')}
                    </h3>
                    <p className="text-xs font-agrandir-regular text-neutral-300 truncate mt-1">
                      <strong className={`font-agrandir-extrabold transition-colors ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                        {event.venue}
                      </strong> · <strong className={`font-agrandir-extrabold transition-colors ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                        {formatDateLong(event.date, language)}
                      </strong>
                    </p>
                  </div>

                  {/* Boutons d'action */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => handleBookNow(event, e)} 
                      className="flex-1 bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-[10px] sm:text-xs py-3 px-2 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg uppercase tracking-wider cursor-pointer"
                    >
                      <Ticket className="w-4 h-4" />
                      {t('home.buyTickets')}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }} 
                      className="flex-1 bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white font-agrandir-semibold text-[10px] sm:text-xs py-3 px-2 rounded-xl active:scale-95 transition-all uppercase tracking-wider cursor-pointer"
                    >
                      {t('home.concertDetails')}
                    </button>
                  </div>

                  {/* Compte à rebours dynamique éclairci automatiquement */}
                  <EventCardCountdown dateStr={event.date} timeStr={event.time} isActive={isActive} t={t} />
                </div>

              </div>
            );
          })}
        </div>
      </section>

      {/* =========================================================================
          2. NAVIGATION RAPIDE — accès visuels aux services LUMARÉEL
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-7 sm:pt-10 relative z-20">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="mb-1 text-[9px] font-agrandir-bold uppercase tracking-[.2em] text-[#D4AF37]">LUMARÉEL</p><h2 className="text-lg sm:text-xl font-agrandir-extrabold uppercase tracking-tight text-white">{language === 'en' ? 'Quick access' : 'Accès rapide'}</h2></div>
          <button type="button" onClick={() => setCurrentPage('explore')} className="text-[10px] sm:text-xs font-agrandir-bold uppercase tracking-wider text-neutral-400 hover:text-[#D4AF37]">{language === 'en' ? 'Explore all' : 'Tout explorer'} <span aria-hidden="true">↗</span></button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button type="button" onClick={() => setCurrentPage('member_card')} className="group relative min-h-[142px] sm:min-h-[175px] overflow-hidden border border-[#D4AF37]/25 bg-gradient-to-br from-[#3b2e17] via-[#17130b] to-[#090909] p-4 sm:p-5 text-left transition-all hover:border-[#D4AF37]/60"><Crown className="mb-5 h-6 w-6 text-[#D4AF37]"/><span className="block text-sm sm:text-base font-agrandir-extrabold uppercase text-white">{t('home.cardTitle')}</span><span className="mt-1 block text-[10px] text-white/50">{language === 'en' ? 'Your exclusive membership' : 'Votre accès privilégié'}</span><span className="absolute bottom-4 right-4 text-[#D4AF37]">↗</span></button>
          <button type="button" onClick={() => setCurrentPage('backstage')} className="group relative min-h-[142px] sm:min-h-[175px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#29231d] via-[#15120f] to-[#090909] p-4 sm:p-5 text-left transition-all hover:border-white/30"><Clapperboard className="mb-5 h-6 w-6 text-[#D4AF37]"/><span className="block text-sm sm:text-base font-agrandir-extrabold uppercase text-white">BACKSTAGE</span><span className="mt-1 block text-[10px] text-white/50">{language === 'en' ? 'Inside the show' : 'Dans les coulisses'}</span><span className="absolute bottom-4 right-4 text-white/50">↗</span></button>
          <button type="button" onClick={() => setCurrentPage('flash_drops')} className="group relative min-h-[142px] sm:min-h-[175px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#392b16] via-[#17130c] to-[#090909] p-4 sm:p-5 text-left transition-all hover:border-[#D4AF37]/50"><Zap className="mb-5 h-6 w-6 text-[#D4AF37]"/><span className="block text-sm sm:text-base font-agrandir-extrabold uppercase text-white">FLASH DROPS</span><span className="mt-1 block text-[10px] text-white/50">{language === 'en' ? 'Limited offers & surprises' : 'Offres limitées & surprises'}</span><span className="absolute bottom-4 right-4 text-white/50">↗</span></button>
          <button type="button" onClick={() => setCurrentPage('memories')} className="group relative min-h-[142px] sm:min-h-[175px] overflow-hidden border border-white/10 bg-gradient-to-br from-[#203038] via-[#11191d] to-[#090909] p-4 sm:p-5 text-left transition-all hover:border-white/30"><Camera className="mb-5 h-6 w-6 text-[#a9d5e5]"/><span className="block text-sm sm:text-base font-agrandir-extrabold text-white">{language === 'en' ? 'MEMORIES' : 'SOUVENIRS'}</span><span className="mt-1 block text-[10px] text-white/50">{language === 'en' ? 'Relive the highlights' : 'Revivez les meilleurs moments'}</span><span className="absolute bottom-4 right-4 text-white/50">↗</span></button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-white/10 pb-5">
          <button type="button" onClick={() => setCurrentPage('rewards')} className="text-[10px] sm:text-xs text-neutral-400 hover:text-white">{language === 'en' ? 'Points & referrals' : 'Points & parrainage'} ↗</button>
          <button type="button" onClick={() => setCurrentPage('suggestions')} className="text-[10px] sm:text-xs text-neutral-400 hover:text-white">{language === 'en' ? 'Share an idea' : 'Proposer une idée'} ↗</button>
          <button type="button" onClick={() => setCurrentPage('archive')} className="text-[10px] sm:text-xs text-neutral-400 hover:text-white">{t('home.archives')} ↗</button>
          <button type="button" onClick={() => setCurrentPage('news')} className="text-[10px] sm:text-xs text-neutral-400 hover:text-white">{t('home.newsEditions')} ↗</button>
          <button type="button" onClick={() => setCurrentPage('client_space')} className="text-[10px] sm:text-xs text-neutral-400 hover:text-white">{t('home.bookingsCatalog')} ↗</button>
          <button type="button" onClick={() => setCurrentPage('profile')} className="text-[10px] sm:text-xs text-neutral-400 hover:text-white">{t('home.profileSettings')} ↗</button>
        </div>
      </section>

      {/* =========================================================================
          3. SECTION : ARCHIVES
         ========================================================================= */}
      <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-14 sm:pt-20">
        <div className="mb-6 pb-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">
              {t('home.archives')}
            </h2>
          </div>
          <button onClick={() => setCurrentPage('archive')} className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 pb-5 scrollbar-none md:grid md:grid-cols-3 md:gap-6">
          {(archives || []).slice(0, 3).map((item) => {
            const safeCover = item.coverImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg';
            return (
              <div key={item.id} onClick={() => setCurrentPage('archive')} className="w-[76vw] sm:w-[320px] md:w-auto shrink-0 snap-start group cursor-pointer flex flex-col justify-between">
                <div className="aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#111111] border border-white/15 group-hover:border-white/40 transition-all duration-300 shadow-xl group-hover:scale-[1.02]">
                  <img src={safeCover} alt={item.title} referrerPolicy="no-referrer" className="w-full h-full object-cover object-center filter brightness-[0.88] group-hover:brightness-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white text-white hover:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 shadow-2xl group-hover:scale-110">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-mono text-white border border-white/20 uppercase font-semibold">{item.duration || t('home.liveHd')}</span>
                  </div>
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-agrandir-semibold text-[#d4af37] border border-white/15 uppercase tracking-wider">{t('home.videoRecap')}</span>
                  </div>
                </div>
                <div className="pt-3 px-1">
                  <div className="text-[10px] font-agrandir-regular text-[#888] uppercase tracking-wider flex items-center gap-2 mb-1">
                    <strong className="font-agrandir-extrabold text-white">{item.date ? formatDateLong(item.date, language) : item.year}</strong><span>·</span><strong className="font-agrandir-extrabold text-white truncate">{item.venue}</strong>
                  </div>
                  <h3 className="font-agrandir-extrabold text-base text-white uppercase tracking-tight group-hover:text-white transition-colors truncate">{item.title}</h3>
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                    <button onClick={(e) => { e.stopPropagation(); setCurrentPage('archive'); }} className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[#d4af37] text-[10px] font-agrandir-semibold uppercase tracking-wider flex items-center gap-1.5 border border-[#d4af37]/30 transition-colors">
                      <ImageIcon className="w-3.5 h-3.5 text-[#d4af37]" /><span>{t('home.viewImages')}</span>
                    </button>
                    <span className="text-[10px] text-[#777] font-agrandir-regular">{item.duration || t('home.liveHd')}</span>
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
        <section className="w-full max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-14 sm:pt-20">
          <div className="mb-6 pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight uppercase">
                {t('nav.news')}
              </h2>
            </div>
            <button onClick={() => setCurrentPage('news')} className="w-9 h-9 rounded-full border border-white/15 hover:border-white text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer bg-white/5 shadow-sm">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 pb-5 scrollbar-none md:grid md:grid-cols-3 md:gap-6">
            {news.slice(0, 3).map((article: any) => (
              <article key={article.id} onClick={() => setCurrentPage('news')} className="w-[76vw] sm:w-[320px] md:w-auto shrink-0 snap-start bg-[#0b0b0b] border border-white/10 rounded-3xl p-6 hover:border-white/30 transition-all cursor-pointer flex flex-col justify-between shadow-xl">
                <div>
                  <div className="flex items-center justify-between text-[10px] font-agrandir-regular tracking-wider uppercase text-[#777] mb-3">
                    <span className="text-[#d4af37] font-agrandir-semibold">{article.category}</span>
                    <strong className="font-agrandir-bold text-white">{formatDateLong(article.date, language)}</strong>
                  </div>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-tight mb-3 leading-snug">{article.title}</h3>
                  <p className="font-agrandir-regular text-xs text-[#888] leading-relaxed line-clamp-3 mb-6">{article.summary}</p>
                </div>
                <div className="pt-3 border-t border-white/10 text-[11px] font-agrandir-semibold text-white uppercase tracking-wider flex items-center justify-between">
                  <span>{t('home.readRelease')}</span>
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