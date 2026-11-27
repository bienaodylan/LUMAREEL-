import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArchiveProduction } from '../types';
import { 
  Play, Image as ImageIcon, MapPin, X, ChevronLeft, ChevronRight, 
  Maximize2, Film, ArrowLeft, Clapperboard, Camera
} from 'lucide-react';
import { formatDateLong } from '../utils/dateUtils';

export const ArchiveView: React.FC = () => {
  const { archives, goBack, setCurrentPage, language, t } = useApp();
  const publicArchives = (archives || []).filter((item) => item.isPublished);

  // Active media mode per archive ('video' | 'photos')
  const [activeTab, setActiveTab] = useState<Record<string, 'video' | 'photos'>>({});
  // Inline playing video ID
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);
  // Fullscreen modal video/photo viewer
  const [modalItem, setModalItem] = useState<{
    archive: ArchiveProduction;
    mode: 'video' | 'photos';
    photoIndex?: number;
  } | null>(null);

  // Active photo index in inline photo viewer
  const [activePhotoIndex, setActivePhotoIndex] = useState<Record<string, number>>({});

  const getMediaMode = (id: string): 'video' | 'photos' => {
    return activeTab[id] || 'video';
  };

  const setMediaMode = (id: string, mode: 'video' | 'photos') => {
    setActiveTab((prev) => ({ ...prev, [id]: mode }));
    if (mode === 'photos' && activePlayingId === id) {
      setActivePlayingId(null);
    }
  };

  const handlePlayVideo = (archive: ArchiveProduction) => {
    setActivePlayingId(archive.id);
  };

  const handleOpenModal = (archive: ArchiveProduction, mode: 'video' | 'photos', photoIndex = 0) => {
    setModalItem({ archive, mode, photoIndex });
  };

  return (
    <div className="relative bg-transparent text-[#efefef] flex flex-col overflow-hidden select-none">
      
      {/* Downward spotlight beam in background matching user reference */}
      <div className="absolute inset-0 pointer-events-none flex justify-center overflow-hidden" aria-hidden="true">
        <div className="spotlight-beam absolute -top-10 w-[95vw] sm:w-[75vw] md:w-[60vw] h-[100vh] opacity-80" />
        <div className="absolute inset-0 bg-grain opacity-25 mix-blend-screen" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto w-full px-4 sm:px-8 lg:px-10 pt-5 sm:pt-10 pb-16 flex-1">
        <button
          type="button"
          onClick={goBack}
          className="hidden md:inline-flex items-center gap-2 text-xs text-neutral-400 hover:text-white transition-colors mb-5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{language === 'en' ? 'Back' : 'Retour'}</span>
        </button>

        <div className="text-[11px] font-agrandir-semibold tracking-[0.22em] text-neutral-400 uppercase mb-2">
          {t('archive.kicker')}
        </div>

        <div className="mb-4">
          <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl md:text-6xl tracking-tight text-white leading-[1.02] text-balance break-words">
            {t('archive.heroTitle1')}
          </h1>
          <h2 className="font-editorial-italic font-normal text-3xl sm:text-5xl md:text-6xl text-[#EDEDED] tracking-tight leading-[1.08] mt-1 text-balance break-words">
            {t('archive.heroTitle2')}
          </h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <p className="text-sm sm:text-[15px] text-neutral-400 font-agrandir-regular max-w-xl leading-relaxed">
            {t('archive.subtitle')}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCurrentPage('memories')}
              className="min-h-[38px] px-4 rounded-full border border-white/[0.16] hover:border-white/40 text-xs font-agrandir-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Memories</span>
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage('backstage')}
              className="min-h-[38px] px-4 rounded-full border border-white/[0.16] hover:border-white/40 text-xs font-agrandir-semibold text-white inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>BACKSTAGE</span>
            </button>
          </div>
        </div>

        {publicArchives.length === 0 ? (
          <div className="text-center py-16 bg-[#0E0E0E] border border-white/[0.12] p-8 my-6">
            <Film className="w-9 h-9 text-neutral-500 mx-auto mb-3" />
            <h3 className="font-agrandir-extrabold text-lg text-white mb-2">
              {t('archive.none')}
            </h3>
            <p className="font-agrandir-regular text-xs sm:text-sm text-neutral-400 max-w-sm mx-auto">
              {t('archive.noneDesc')}
            </p>
          </div>
        ) : (
          <div>
            {/* VUE MOBILE */}
            <div className="md:hidden space-y-4">
              {publicArchives.map((item) => {
                const isPlaying = activePlayingId === item.id;
                const photoList = item.photos && item.photos.length > 0 ? item.photos : [item.coverImage];
                const safeCover = item.coverImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg';

                return (
                  <article
                    key={item.id}
                    className="p-4 bg-[#0E0E0E] border border-white/[0.12] flex flex-col space-y-3"
                  >
                    {isPlaying && item.youtubeEmbedUrl ? (
                      <div className="aspect-[16/9] w-full overflow-hidden relative bg-black border border-white/[0.12]">
                        <iframe
                          src={item.youtubeEmbedUrl}
                          title={item.title}
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                        <button
                          type="button"
                          onClick={() => setActivePlayingId(null)}
                          className="absolute top-2 right-2 w-8 h-8 rounded-[4px] bg-black/80 text-white border border-white/20 flex items-center justify-center"
                          aria-label={t('archive.closeVideo')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3.5">
                        <button
                          type="button"
                          onClick={() => handlePlayVideo(item)}
                          className="w-36 aspect-[16/9] overflow-hidden relative bg-black shrink-0 cursor-pointer border border-white/[0.12] group"
                        >
                          <img
                            src={safeCover}
                            alt={item.title}
                            className="w-full h-full object-cover brightness-[0.88] group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <span className="w-8 h-8 rounded-full bg-black/65 backdrop-blur-sm flex items-center justify-center text-white">
                              <Play className="w-3.5 h-3.5 ml-0.5 fill-current" />
                            </span>
                          </div>
                        </button>

                        <div className="flex-1 min-w-0">
                          <h3
                            onClick={() => handlePlayVideo(item)}
                            className="font-agrandir-extrabold text-sm text-white leading-snug line-clamp-2 cursor-pointer"
                          >
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-neutral-300 mt-1 truncate">{item.venue}</p>
                          <p className="text-[11px] text-neutral-500 mt-0.5 truncate">
                            {item.date ? formatDateLong(item.date, language) : item.year} · {item.city}
                            {item.duration ? ` · ${item.duration}` : ''}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t border-white/[0.07]">
                      <button
                        type="button"
                        onClick={() => handleOpenModal(item, 'photos', 0)}
                        className="flex-1 min-h-[40px] rounded-[4px] bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 text-xs font-agrandir-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ImageIcon className="w-3.5 h-3.5 text-white" />
                        <span>
                          {t('archive.viewImages')} ({photoList.length})
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePlayVideo(item)}
                        className="min-h-[40px] px-4 rounded-[4px] bg-[#D4AF6A] text-black text-xs font-agrandir-extrabold flex items-center gap-1.5 hover:bg-[#DFBE7D] transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>{t('archive.play')}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* VUE DESKTOP */}
            <div className="hidden md:block space-y-8">
              {publicArchives.map((item) => {
                const currentMode = getMediaMode(item.id);
                const isPlaying = activePlayingId === item.id;
                const currentPhotoIdx = activePhotoIndex[item.id] || 0;
                const photoList = item.photos && item.photos.length > 0 ? item.photos : [item.coverImage];

                return (
                  <article
                    key={item.id}
                    className="p-6 sm:p-7 bg-[#0E0E0E] border border-white/[0.12] hover:border-white/25 transition-colors grid grid-cols-1 lg:grid-cols-12 gap-7 items-start group"
                  >
                  <div className="lg:col-span-7 flex flex-col space-y-4">
                    <div className="aspect-[16/9] w-full overflow-hidden relative bg-[#141414] border border-white/[0.12]">
                      {currentMode === 'video' && (
                        <>
                          {isPlaying && item.youtubeEmbedUrl ? (
                            <div className="w-full h-full relative">
                              <iframe
                                src={item.youtubeEmbedUrl}
                                title={item.title}
                                className="w-full h-full border-0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                              <button
                                type="button"
                                onClick={() => setActivePlayingId(null)}
                                className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-black/80 hover:bg-black text-white border border-white/20 cursor-pointer flex items-center justify-center z-20"
                                title={t('archive.closeVideo')}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handlePlayVideo(item)}
                              className="w-full h-full relative cursor-pointer group/thumb"
                            >
                              <img
                                src={item.coverImage}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover object-center brightness-[0.86] group-hover/thumb:brightness-100 group-hover/thumb:scale-[1.03] transition-all duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20 pointer-events-none" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-black/55 group-hover/thumb:bg-white text-white group-hover/thumb:text-black backdrop-blur-md border border-white/25 flex items-center justify-center transition-all duration-300">
                                  <Play className="w-6 h-6 ml-0.5 fill-current" />
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* MODE 2 : GALERIE PHOTOS / CARROUSEL D'IMAGES */}
                      {currentMode === 'photos' && (
                        <div className="w-full h-full relative group/photos">
                          <img
                            src={photoList[currentPhotoIdx] || item.coverImage}
                            alt={`${item.title} photo ${currentPhotoIdx + 1}`}
                            className="w-full h-full object-cover object-center transition-all duration-500"
                          />

                          {/* Lateral photo navigation buttons */}
                          {photoList.length > 1 && (
                            <>
                              <button
                                onClick={() =>
                                  setActivePhotoIndex((prev) => ({
                                    ...prev,
                                    [item.id]: (currentPhotoIdx - 1 + photoList.length) % photoList.length,
                                  }))
                                }
                                className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer shadow-lg backdrop-blur-md"
                                aria-label={t('archive.prevPhoto')}
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() =>
                                  setActivePhotoIndex((prev) => ({
                                    ...prev,
                                    [item.id]: (currentPhotoIdx + 1) % photoList.length,
                                  }))
                                }
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer shadow-lg backdrop-blur-md"
                                aria-label={t('archive.nextPhoto')}
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Photo counter badge */}
                          <div className="absolute bottom-3.5 right-3.5">
                            <span className="px-3 py-1 rounded-full bg-black/85 backdrop-blur-md text-xs font-mono text-white border border-white/20">
                              {currentPhotoIdx + 1} / {photoList.length} {t('archive.photos')}
                            </span>
                          </div>

                          {/* Fullscreen view trigger */}
                          <button
                            onClick={() => handleOpenModal(item, 'photos', currentPhotoIdx)}
                            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer shadow-lg backdrop-blur-md"
                            title={t('archive.enlargePhotos')}
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                    </div>

                    {/* ----------------- BOUTONS DE BASCULE (TOGGLE) -----------------
                        Sous le cadre média : "Voir la vidéo" et "Voir les photos"
                    ------------------------------------------------------------------ */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setMediaMode(item.id, 'video')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          currentMode === 'video'
                            ? 'bg-white text-black font-agrandir-extrabold shadow-lg'
                            : 'bg-white/5 hover:bg-white/10 text-[#aaa] hover:text-white border border-white/15'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{t('archive.watchVideo')}</span>
                      </button>

                      <button
                        onClick={() => setMediaMode(item.id, 'photos')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-agrandir-semibold uppercase tracking-wider transition-all cursor-pointer ${
                          currentMode === 'photos'
                            ? 'bg-white text-black font-agrandir-extrabold shadow-lg'
                            : 'bg-white/5 hover:bg-white/10 text-[#aaa] hover:text-white border border-white/15'
                        }`}
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>{t('archive.watchPhotos')} ({photoList.length})</span>
                      </button>
                    </div>

                  </div>

                  {/* ----------------- DROITE : BLOC INFORMATIONS ----------------- */}
                  <div className="lg:col-span-5 flex flex-col justify-between space-y-4 font-agrandir-regular">
                    
                    <div>
                      {/* Top Tag & Date */}
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <span className="text-xs text-[#888] font-agrandir-regular">
                          <strong className="font-agrandir-extrabold text-white">{item.date ? formatDateLong(item.date, language) : item.year}</strong>
                        </span>
                      </div>

                      {/* Grand Titre Monumental */}
                      <h3 className="font-agrandir-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight uppercase leading-tight mb-3">
                        {item.title}
                      </h3>

                      {/* Lieu & Ville */}
                      <div className="flex items-center gap-2 text-xs text-[#aaa] mb-4">
                        <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                        <span><strong className="font-agrandir-extrabold text-white">{item.venue}</strong> · {item.city} ({item.country})</span>
                      </div>

                      {/* Résumé Court */}
                      <p className="text-xs sm:text-sm text-[#bbb] font-light leading-relaxed mb-5">
                        {item.description}
                      </p>

                      {/* Artistes Associés */}
                      {item.artists && item.artists.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="text-[10px] text-[#777] uppercase tracking-wider font-agrandir-semibold">
                            {t('archive.artistsSceno')}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {item.artists.map((art, aIdx) => (
                              <span
                                key={aIdx}
                                className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-[#ccc]"
                              >
                                {art}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handlePlayVideo(item)}
                        className="min-h-[42px] px-5 rounded-[4px] bg-[#D4AF6A] text-black hover:bg-[#DFBE7D] font-agrandir-extrabold text-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isPlaying ? t('archive.playing') : t('archive.launchRecap')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenModal(item, 'video')}
                        className="w-10 h-10 rounded-[4px] bg-white/[0.06] hover:bg-white/[0.14] text-white border border-white/[0.12] flex items-center justify-center transition-colors cursor-pointer"
                        title={t('archive.fullscreenHint')}
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      </div>

      {/* MODALE PLEIN ÉCRAN MULTIMÉDIA */}
      {modalItem && (
        <div
          className="fixed inset-0 z-[90] bg-black/92 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8"
          onClick={() => setModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl bg-[#0E0E0E] border border-white/[0.12] overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
          >
            <div className="p-4 sm:p-6 border-b border-white/[0.12] flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white truncate">
                  {modalItem.archive.title}
                </h3>
                <p className="text-xs text-[#9A9A9A]">
                  {modalItem.archive.venue} · {modalItem.archive.date ? formatDateLong(modalItem.archive.date, language) : modalItem.archive.year}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalItem(null)}
                className="w-9 h-9 rounded-full bg-white/[0.08] hover:bg-white/[0.16] text-white flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title={t('archive.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center items-center overflow-y-auto">
              {modalItem.mode === 'video' ? (
                <div className="aspect-[16/9] w-full overflow-hidden bg-black">
                  <iframe
                    src={modalItem.archive.youtubeEmbedUrl || `https://www.youtube-nocookie.com/embed/ScMzIvxBSi4?autoplay=1&rel=0`}
                    title={modalItem.archive.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <div className="max-h-[70vh] flex flex-col items-center">
                  <img
                    src={(modalItem.archive.photos && modalItem.archive.photos[modalItem.photoIndex || 0]) || modalItem.archive.coverImage || '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg'}
                    alt={modalItem.archive.title}
                    className="max-h-[60vh] w-auto object-contain border border-white/[0.12]"
                  />
                  <div className="text-xs text-neutral-400 font-mono mt-3 tabular-nums">
                    {t('archive.photo')} {(modalItem.photoIndex || 0) + 1} {t('archive.of')} {(modalItem.archive.photos || []).length}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};