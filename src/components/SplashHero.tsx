import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowUpRight, Handshake, Info } from 'lucide-react';

export const SplashHero: React.FC = () => {
  const { enterPlatform, setCurrentPage } = useApp();
  const [showContactModal, setShowContactModal] = useState<boolean>(false);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showPartnersModal, setShowPartnersModal] = useState<boolean>(false);
  const [abidjanTime, setAbidjanTime] = useState<string>('17:17');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      setAbidjanTime(`${hours}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleNavigate = (page: 'home' | 'discover' | 'archive' | 'organizers' | 'news' | 'client_space') => {
    enterPlatform();
    setCurrentPage(page);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#000000] text-[#FFFFFF] flex flex-col justify-between overflow-hidden select-none">
      
      {/* Volumetric Stage Lighting Effect descending from the top center */}
      <div className="absolute inset-0 spotlight-beam opacity-40 pointer-events-none" aria-hidden="true" />
      <div className="absolute inset-0 spotlight-beam-secondary opacity-30 pointer-events-none" aria-hidden="true" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[380px] bg-white/[0.045] rounded-full blur-[150px] pointer-events-none ambient-aurora" aria-hidden="true" />
      <div className="absolute inset-0 bg-grain opacity-20 pointer-events-none mix-blend-screen" aria-hidden="true" />

      {/* 1. En-tête (Top Bar) : LUMAREEL CO. haut-gauche, ABIDJAN + ESPACE CLIENT haut-droite */}
      <header className="relative z-30 w-full px-6 sm:px-12 pt-7 sm:pt-9 flex items-center justify-between text-xs font-agrandir-regular tracking-[0.22em] uppercase text-[#777]">
        <button
          onClick={() => handleNavigate('home')}
          className="text-xs sm:text-sm font-agrandir-semibold text-white tracking-[0.25em] hover:text-[#d4af37] transition-colors cursor-pointer"
        >
          LUMAREEL CO.
        </button>

        <div className="flex items-center gap-4 text-xs font-agrandir-regular tracking-[0.2em]">
          <span className="text-[#888] font-agrandir-regular hidden sm:inline">
            ABIDJAN {abidjanTime}
          </span>
          <span className="text-[#333] hidden sm:inline">·</span>
          <button
            onClick={() => handleNavigate('client_space')}
            className="text-[#999] hover:text-white transition-colors cursor-pointer"
          >
            ESPACE CLIENT
          </button>
          <span className="text-[#333]">/</span>
          <button
            onClick={() => handleNavigate('client_space')}
            className="text-[#999] hover:text-white transition-colors cursor-pointer"
          >
            MES BILLETS
          </button>
        </div>
      </header>

      {/* 2. Élément Central (Hero) : Logo massif & Slogan */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center px-4 pt-4 sm:pt-8 text-center">
        <button
          onClick={() => handleNavigate('home')}
          className="group cursor-pointer focus:outline-none transition-transform duration-500 hover:scale-[1.015]"
          title="Cliquer pour entrer sur la plateforme"
          aria-label="Entrer sur la plateforme LUMARÉEL CO."
        >
          <div className="logo-sculpted-3d logo-glow font-agrandir-extrabold text-5xl sm:text-7xl md:text-8xl lg:text-[7.5rem] tracking-[-0.04em] uppercase leading-none select-none">
            LUMAREEL CO.
          </div>
          <div className="text-[11px] sm:text-xs font-agrandir-regular text-[#777] tracking-[0.35em] uppercase mt-4 sm:mt-5 transition-colors group-hover:text-white">
            La lumière avant le spectacle.
          </div>
        </button>
      </div>

      {/* 3. Menu de Navigation (Ancré dans le tiers inférieur, liste strictement verticale) */}
      <div className="relative z-20 w-full flex flex-col items-center justify-center pb-8 sm:pb-10 text-center">
        <nav aria-label="Menu Principal" className="flex flex-col items-center space-y-3.5 sm:space-y-4">
          
          {/* 1. DÉCOUVRIR */}
          <button
            onClick={() => handleNavigate('discover')}
            className="text-xs sm:text-sm font-agrandir-regular hover:font-agrandir-semibold text-[#888] hover:text-white tracking-[0.25em] uppercase transition-all cursor-pointer py-1"
          >
            DÉCOUVRIR
          </button>

          {/* 2. ARCHIVE */}
          <button
            onClick={() => handleNavigate('archive')}
            className="text-xs sm:text-sm font-agrandir-regular hover:font-agrandir-semibold text-[#888] hover:text-white tracking-[0.25em] uppercase transition-all cursor-pointer py-1"
          >
            ARCHIVE
          </button>

          {/* 3. PARTENAIRES */}
          <button
            onClick={() => setShowPartnersModal(true)}
            className="text-xs sm:text-sm font-agrandir-regular hover:font-agrandir-semibold text-[#888] hover:text-white tracking-[0.25em] uppercase transition-all cursor-pointer py-1"
          >
            PARTENAIRES
          </button>

          {/* 4. À PROPOS */}
          <button
            onClick={() => setShowAboutModal(true)}
            className="text-xs sm:text-sm font-agrandir-regular hover:font-agrandir-semibold text-[#888] hover:text-white tracking-[0.25em] uppercase transition-all cursor-pointer py-1"
          >
            À PROPOS
          </button>

          {/* 5. CONTACT */}
          <button
            onClick={() => setShowContactModal(true)}
            className="text-xs sm:text-sm font-agrandir-regular hover:font-agrandir-semibold text-[#888] hover:text-white tracking-[0.25em] uppercase transition-all cursor-pointer py-1"
          >
            CONTACT
          </button>


        </nav>
      </div>

      {/* 4. Pied de page (Footer) */}
      <div className="relative z-20 w-full flex flex-col items-center">
        {/* Bandeau d'information centré avec puce lumineuse */}
        <div className="mb-4 sm:mb-5 px-4 text-center">
          <button
            onClick={() => handleNavigate('home')}
            className="inline-flex items-center gap-2 text-[10px] sm:text-[11px] font-agrandir-regular tracking-[0.22em] text-[#888] hover:text-white uppercase transition-colors cursor-pointer"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_#d4af37] animate-pulse" />
            <span>PROCHAIN CONCERT · JEUNE LION · 19 DÉC. 2026 · J-53</span>
          </button>
        </div>

        {/* Bottom Bar collée en bas de l'écran */}
        <footer className="w-full px-6 sm:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] sm:text-[11px] font-agrandir-regular tracking-[0.22em] text-[#444] uppercase border-t border-[#121212]">
          <div className="text-left">
            <span>© 2026 ARÉEL GROUPE / LUMAREEL CO.</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 text-right">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#888] transition-colors"
            >
              INSTAGRAM
            </a>
            <span>·</span>
            <a
              href="https://tiktok.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#888] transition-colors"
            >
              TIKTOK
            </a>
            <span>·</span>
            <a
              href="https://snapchat.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#888] transition-colors"
            >
              SNAPCHAT
            </a>
          </div>
        </footer>
      </div>

      {/* MODAL : PARTENAIRES */}
      {showPartnersModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#222] p-8 sm:p-10 max-w-xl w-full text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <span className="text-xs font-agrandir-regular text-[#888] uppercase tracking-[0.25em] flex items-center gap-2">
                <Handshake className="w-3.5 h-3.5 text-[#d4af37]" />
                PARTENAIRES &amp; ALLIANCES
              </span>
              <button
                onClick={() => setShowPartnersModal(false)}
                className="text-xs text-[#888] hover:text-white uppercase font-agrandir-semibold tracking-wider cursor-pointer"
              >
                FERMER [X]
              </button>
            </div>

            <div>
              <h3 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-2">
                L’ÉCOSYSTÈME LUMARÉEL CO.
              </h3>
              <p className="text-xs font-agrandir-regular text-[#aaa] leading-relaxed">
                Nous collaborons avec les meilleures institutions scéniques, diffuseurs de billets et marques pour porter l'excellence scénique africaine et internationale.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-agrandir-regular border-t border-[#1a1a1a] pt-4">
              <div className="p-3 bg-[#111] border border-[#222]">
                <span className="text-[#d4af37] font-agrandir-semibold text-[10px] tracking-widest uppercase block mb-1">
                  LIEUX PARTENAIRES
                </span>
                <p className="text-white font-agrandir-semibold">Sofitel Abidjan Hôtel Ivoire</p>
                <p className="text-[#777] text-[11px]">Palais des Congrès &amp; Scène Piscine</p>
              </div>

              <div className="p-3 bg-[#111] border border-[#222]">
                <span className="text-[#d4af37] font-agrandir-semibold text-[10px] tracking-widest uppercase block mb-1">
                  SCÈNE XXL
                </span>
                <p className="text-white font-agrandir-semibold">Parc des Expositions d'Abidjan</p>
                <p className="text-[#777] text-[11px]">Hall 1 — 10 000+ places debout</p>
              </div>

              <div className="p-3 bg-[#111] border border-[#222]">
                <span className="text-[#d4af37] font-agrandir-semibold text-[10px] tracking-widest uppercase block mb-1">
                  COLLECTIFS ASSOCIÉS
                </span>
                <p className="text-white font-agrandir-semibold">Dope Music Hub &amp; Nyokobop</p>
                <p className="text-[#777] text-[11px]">Co-productions urbaines &amp; électro</p>
              </div>

              <div className="p-3 bg-[#111] border border-[#222]">
                <span className="text-[#d4af37] font-agrandir-semibold text-[10px] tracking-widest uppercase block mb-1">
                  TRANSACTIONS SÉCURISÉES
                </span>
                <p className="text-white font-agrandir-semibold">GeniusPay CI &amp; Wave</p>
                <p className="text-[#777] text-[11px]">Paiement instantané mobile &amp; cartes</p>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowPartnersModal(false);
                  handleNavigate('organizers');
                }}
                className="w-full py-3.5 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-[0.25em] hover:bg-[#eaeaea] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>PROPOSER UN PARTENARIAT OU UN ÉVÉNEMENT</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL : À PROPOS */}
      {showAboutModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a0a0a] border border-[#222] p-8 sm:p-10 max-w-xl w-full text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <span className="text-xs font-agrandir-regular text-[#888] uppercase tracking-[0.25em] flex items-center gap-2">
                <Info className="w-3.5 h-3.5 text-[#d4af37]" />
                À PROPOS DE LUMARÉEL CO.
              </span>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-xs text-[#888] hover:text-white uppercase font-agrandir-semibold tracking-wider cursor-pointer"
              >
                FERMER [X]
              </button>
            </div>

            <div>
              <h3 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-2">
                LA LUMIÈRE AVANT LE SPECTACLE.
              </h3>
              <p className="text-xs font-agrandir-regular text-[#ccc] leading-relaxed mb-3">
                Fondée par le groupe ARÉEL, LUMARÉEL CO. est une agence de direction artistique et de production exécutive de concerts basée entre Abidjan et Paris.
              </p>
              <p className="text-xs font-agrandir-regular text-[#888] leading-relaxed">
                Notre mission est d'offrir des expériences scéniques brutes, massives et immersives, propulsées par une ingénierie de billetterie cryptographique inviolable (anti-doublon, vérification temps réel en porte d'accès).
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center border-y border-[#1c1c1c] py-4">
              <div>
                <div className="font-agrandir-extrabold text-2xl text-white">35K+</div>
                <div className="text-[10px] text-[#666] tracking-widest uppercase mt-1">Spectateurs</div>
              </div>
              <div>
                <div className="font-agrandir-extrabold text-2xl text-[#d4af37]">100%</div>
                <div className="text-[10px] text-[#666] tracking-widest uppercase mt-1">Billets Certifiés</div>
              </div>
              <div>
                <div className="font-agrandir-extrabold text-2xl text-white">0</div>
                <div className="text-[10px] text-[#666] tracking-widest uppercase mt-1">Faux Billets</div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowAboutModal(false);
                handleNavigate('home');
              }}
              className="w-full py-3.5 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-[0.25em] hover:bg-[#eaeaea] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>EXPLORER LA BILLETTERIE OFFICIELLE</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MODAL : CONTACT */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0c0c0c] border border-[#222] p-8 sm:p-10 max-w-lg w-full text-left space-y-6">
            <div className="flex items-center justify-between border-b border-[#222] pb-4">
              <span className="text-xs font-agrandir-regular text-[#888] uppercase tracking-[0.25em]">
                CONTACT &amp; RELATIONS
              </span>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-xs text-[#888] hover:text-white uppercase font-agrandir-semibold tracking-wider cursor-pointer"
              >
                FERMER [X]
              </button>
            </div>

            <div>
              <h3 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-2">
                LUMARÉEL CO.
              </h3>
              <p className="text-xs font-agrandir-regular text-[#aaa] leading-relaxed">
                Production exécutive de concerts, billetterie certifiée et direction technique de spectacles.
              </p>
            </div>

            <div className="space-y-3 text-xs font-agrandir-regular text-[#ccc] border-t border-[#1a1a1a] pt-4">
              <div>
                <span className="text-[#666] block text-[10px] tracking-widest uppercase">Production &amp; Booking</span>
                <a href="mailto:production@lumareel.com" className="hover:text-white transition-colors">
                  production@lumareel.com
                </a>
              </div>
              <div>
                <span className="text-[#666] block text-[10px] tracking-widest uppercase">Support Billetterie</span>
                <a href="mailto:billetterie@lumareel.com" className="hover:text-white transition-colors">
                  billetterie@lumareel.com
                </a>
              </div>
              <div>
                <span className="text-[#666] block text-[10px] tracking-widest uppercase">Bureaux</span>
                <span>Plateau &amp; Cocody, Abidjan — Côte d'Ivoire / Paris — France</span>
              </div>
            </div>

            <button
              onClick={() => {
                setShowContactModal(false);
                handleNavigate('home');
              }}
              className="w-full py-3.5 bg-white text-black font-agrandir-semibold text-xs uppercase tracking-[0.25em] hover:bg-[#eaeaea] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>DÉCOUVRIR LES CONCERTS</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

