import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArchiveProduction } from '../types';
import { 
  Play, Image as ImageIcon, Calendar, MapPin, X, ChevronLeft, ChevronRight, 
  Maximize2, Volume2, Sparkles, Film, ArrowLeft
} from 'lucide-react';

export const ArchiveView: React.FC = () => {
  const { archives, setCurrentPage } = useApp();

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
    <div className="relative min-h-screen bg-[#060606] text-[#efefef] flex flex-col justify-between overflow-hidden select-none">
      
      {/* Downward spotlight beam in background matching user reference */}
      <div className="absolute inset-0 pointer-events-none flex justify-center overflow-hidden" aria-hidden="true">
        <div className="spotlight-beam absolute -top-10 w-[95vw] sm:w-[75vw] md:w-[60vw] h-[100vh] opacity-80" />
        <div className="absolute inset-0 bg-grain opacity-25 mix-blend-screen" />
      </div>

      {/* Main content container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-6 sm:px-10 lg:px-12 pt-28 sm:pt-32 pb-24 flex-1">
        
        {/* Navigation & Section kicker */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 text-xs font-agrandir-semibold text-[#888] hover:text-white uppercase tracking-wider transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour à l’accueil</span>
          </button>

          <div className="text-[11px] font-agrandir-regular tracking-[0.25em] text-[#d4af37] uppercase">
            ARCHIVE OFFICIELLE
          </div>
        </div>

        {/* Hero headline matching exact typography:
            "Les scènes" in bold white sans + "qu'on a fait vibrer." in italic serif */}
        <div className="mb-4">
          <h1 className="font-agrandir-extrabold text-5xl sm:text-7xl md:text-8xl tracking-tight text-white leading-[0.95] text-balance uppercase">
            Les scènes
          </h1>
          <h2 className="font-editorial-italic font-normal text-5xl sm:text-7xl md:text-8xl text-[#F2F2F2] tracking-tight leading-[1.05] mt-1 text-balance">
            qu’on a fait vibrer.
          </h2>
        </div>

        <p className="text-sm sm:text-base text-[#999] font-agrandir-regular font-light max-w-xl mb-14">
          Des artistes, des publics, des instants uniques captés à jamais.
        </p>

        {/* =========================================================================
            DISPOSITION DE LA LISTE : STYLE "HISTORIQUE YOUTUBE" VERTICAL
            Chaque ligne se divise en deux :
            - Bloc Média (Cadre 16:9 avec bouton Play ou Carrousel Photos) + Boutons Toggle
            - Bloc Informations (Titre, date, lieu, résumé court)
           ========================================================================= */}
        <div className="space-y-10 sm:space-y-12">
          {archives.map((item, idx) => {
            const currentMode = getMediaMode(item.id);
            const isPlaying = activePlayingId === item.id;
            const currentPhotoIdx = activePhotoIndex[item.id] || 0;
            const photoList = item.photos && item.photos.length > 0 ? item.photos : [item.coverImage];

            return (
              <div
                key={item.id}
                className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0c]/90 border border-white/10 hover:border-white/20 transition-all shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start group"
              >
                
                {/* ----------------- GAUCHE : BLOC MÉDIA (CADRE 16:9) ----------------- */}
                <div className="lg:col-span-7 flex flex-col space-y-4">
                  
                  {/* Cadre 16:9 immersif avec bords arrondis */}
                  <div className="aspect-[16/9] w-full rounded-2xl sm:rounded-3xl overflow-hidden relative bg-[#111111] border border-white/15 shadow-2xl">
                    
                    {/* MODE 1 : LECTEUR VIDÉO */}
                    {currentMode === 'video' && (
                      <>
                        {isPlaying && item.youtubeEmbedUrl ? (
                          // Lecteur Vidéo Intégré (Zéro redirection, reste sur LUMARÉEL)
                          <div className="w-full h-full relative">
                            <iframe
                              src={item.youtubeEmbedUrl}
                              title={item.title}
                              className="w-full h-full border-0 rounded-2xl sm:rounded-3xl"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                            {/* Bouton Fermer le lecteur pour revenir à la miniature */}
                            <button
                              onClick={() => setActivePlayingId(null)}
                              className="absolute top-3 right-3 p-2 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 cursor-pointer shadow-lg backdrop-blur-md transition-all z-20"
                              title="Fermer la vidéo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          // Couverture de l'archive avec bouton Play superposé
                          <div
                            onClick={() => handlePlayVideo(item)}
                            className="w-full h-full relative cursor-pointer group/thumb"
                          >
                            <img
                              src={item.coverImage}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-center filter brightness-[0.85] group-hover/thumb:brightness-100 group-hover/thumb:scale-105 transition-all duration-500"
                            />

                            {/* Dégradé cinématique */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                            {/* Bouton Play superposé au centre */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/20 group-hover/thumb:bg-white text-white group-hover/thumb:text-black backdrop-blur-md border border-white/30 flex items-center justify-center transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.8)] group-hover/thumb:scale-110">
                                <Play className="w-7 h-7 sm:w-8 sm:h-8 ml-1 fill-current" />
                              </div>
                            </div>

                            {/* Duration Badge */}
                            <div className="absolute bottom-3.5 right-3.5">
                              <span className="px-3 py-1 rounded-full bg-black/85 backdrop-blur-md text-xs font-mono text-white border border-white/20 uppercase font-semibold">
                                {item.duration || 'LIVE HD'}
                              </span>
                            </div>

                            {/* Pill Archive HD */}
                            <div className="absolute top-3.5 left-3.5">
                              <span className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-agrandir-semibold text-[#d4af37] border border-white/15 uppercase tracking-wider flex items-center gap-1.5">
                                <Film className="w-3 h-3" />
                                <span>RÉCAP VIDÉO 4K</span>
                              </span>
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
                              aria-label="Photo précédente"
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
                              aria-label="Photo suivante"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {/* Photo counter badge */}
                        <div className="absolute bottom-3.5 right-3.5">
                          <span className="px-3 py-1 rounded-full bg-black/85 backdrop-blur-md text-xs font-mono text-white border border-white/20">
                            {currentPhotoIdx + 1} / {photoList.length} PHOTOS
                          </span>
                        </div>

                        {/* Fullscreen view trigger */}
                        <button
                          onClick={() => handleOpenModal(item, 'photos', currentPhotoIdx)}
                          className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/70 hover:bg-black text-white border border-white/20 cursor-pointer shadow-lg backdrop-blur-md"
                          title="Agrandir les photos"
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
                      <span>Voir la vidéo</span>
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
                      <span>Voir les photos ({photoList.length})</span>
                    </button>
                  </div>

                </div>

                {/* ----------------- DROITE : BLOC INFORMATIONS ----------------- */}
                <div className="lg:col-span-5 flex flex-col justify-between space-y-4 font-agrandir-regular">
                  
                  <div>
                    {/* Top Tag & Date */}
                    <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-agrandir-semibold tracking-widest text-[#d4af37] uppercase">
                        ARCHIVE OFFICIELLE 0{idx + 1}
                      </span>
                      <span className="text-xs text-[#888] font-agrandir-regular">
                        {item.date || item.year}
                      </span>
                    </div>

                    {/* Grand Titre Monumental */}
                    <h3 className="font-agrandir-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight uppercase leading-tight mb-3">
                      {item.title}
                    </h3>

                    {/* Lieu & Ville */}
                    <div className="flex items-center gap-2 text-xs text-[#aaa] mb-4">
                      <MapPin className="w-3.5 h-3.5 text-[#d4af37] shrink-0" />
                      <span>{item.venue} · {item.city} ({item.country})</span>
                    </div>

                    {/* Résumé Court */}
                    <p className="text-xs sm:text-sm text-[#bbb] font-light leading-relaxed mb-5">
                      {item.description}
                    </p>

                    {/* Artistes Associés */}
                    {item.artists && item.artists.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] text-[#777] uppercase tracking-wider font-agrandir-semibold">
                          Artistes &amp; Scénographie
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

                  {/* Bouton de lancement instantané */}
                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <button
                      onClick={() => handlePlayVideo(item)}
                      className="px-6 py-2.5 rounded-full bg-white text-black hover:bg-[#eaeaea] font-agrandir-extrabold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-xl"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isPlaying ? 'En cours de lecture' : 'Lancer le récap'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenModal(item, 'video')}
                      className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-colors cursor-pointer"
                      title="Plein écran sans redirection"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* =========================================================================
          MODALE PLEIN ÉCRAN POUR LECTURE MULTIMÉDIA (ZÉRO REDIRECTION EXTERNE)
         ========================================================================= */}
      {modalItem && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
          
          <div className="relative w-full max-w-5xl bg-[#111] border border-white/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-agrandir-extrabold text-lg sm:text-xl text-white uppercase truncate max-w-xl">
                  {modalItem.archive.title}
                </h3>
                <p className="text-xs text-[#888]">
                  {modalItem.archive.venue} · {modalItem.archive.date || modalItem.archive.year}
                </p>
              </div>

              <button
                onClick={() => setModalItem(null)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 flex-1 flex flex-col justify-center items-center overflow-y-auto">
              {modalItem.mode === 'video' ? (
                <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
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
                    src={(modalItem.archive.photos && modalItem.archive.photos[modalItem.photoIndex || 0]) || modalItem.archive.coverImage}
                    alt={modalItem.archive.title}
                    className="max-h-[60vh] w-auto object-contain rounded-2xl border border-white/10"
                  />
                  <div className="text-xs text-[#888] font-mono mt-3">
                    Photo {(modalItem.photoIndex || 0) + 1} sur {(modalItem.archive.photos || []).length}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Footer matching LUMARÉEL aesthetic */}
      <footer className="relative z-10 w-full px-6 sm:px-10 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] font-agrandir-regular tracking-[0.2em] text-[#666] uppercase">
        <div>
          © 2026 ARÉEL GROUPE / LUMAREEL CO. · TOUS DROITS RÉSERVÉS
        </div>
        <div className="flex items-center gap-4 text-[#777]">
          <span className="hover:text-white transition-colors cursor-pointer">INSTAGRAM</span>
          <span>·</span>
          <span className="hover:text-white transition-colors cursor-pointer">TIKTOK</span>
          <span>·</span>
          <span className="hover:text-white transition-colors cursor-pointer">YOUTUBE OFFICIEL</span>
        </div>
      </footer>

    </div>
  );
};
