import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MembershipCard } from '../types';
import {
  RotateCw,
  Maximize2,
  X,
  ShieldCheck,
  Download,
  Share2,
  Sparkles,
  QrCode as QrIcon
} from 'lucide-react';

interface DigitalMembershipCardProps {
  card: MembershipCard;
  qrDataUrl?: string | null;
  onRotateToken?: () => void;
  isRotatingToken?: boolean;
}

export const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  card,
  qrDataUrl,
  onRotateToken,
  isRotatingToken = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFullscreenQr, setIsFullscreenQr] = useState(false);

  // Clean member name without any titles or roles
  const cleanMemberName = (card.cardholderName || 'DYLAN BIENAO')
    .replace(/^(mr\.?|mme\.?|m\.|dr\.?|pr\.?|ceo|founder|vip|président|ambassadeur)\s+/i, '')
    .trim()
    .toUpperCase();

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `LUMAREEL_CARD_${card.cardNumber}_QR.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* 
        Conteneur standard CR-80 :
        Largeur 85.60 mm x Hauteur 53.98 mm (Ratio 1.586:1)
        Sur desktop : max-w-[420px] centré
        Sur smartphone : responsive avec aspect-ratio strictement conservé
      */}
      <div className="w-full max-w-[420px] px-2 sm:px-0">
        <div
          onClick={() => setIsFlipped((prev) => !prev)}
          className="relative w-full cursor-pointer perspective-[1200px] group transition-transform active:scale-[0.99]"
          style={{ aspectRatio: '85.6 / 53.98' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsFlipped((prev) => !prev);
            }
          }}
          aria-label={`Carte de membre ${card.cardNumber}. Cliquez pour retourner la carte.`}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* ============================================================= */}
            {/* RECTO — FACE PRINCIPALE ÉLÉGANTE ET MINIMALISTE               */}
            {/* ============================================================= */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] p-5 sm:p-7 flex flex-col justify-between overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.12)] border border-[#d4af37]/35 bg-[#050505]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              {/* Texture filigrane subtile & micro-grain de prestige */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.18) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%)',
                }}
              />

              {/* Ligne 1 (Haut) : Logo officiel LUMARÉEL & Mention discrète FOUNDERS EDITION */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <img
                    src="/assets/logo-lumareel.png"
                    alt="LUMARÉEL"
                    className="h-5 sm:h-6 w-auto object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-agrandir-bold tracking-[0.22em] text-[#d4af37] uppercase">
                  <span>FOUNDERS EDITION</span>
                </div>
              </div>

              {/* Ligne 2 (Centre) : Nom complet du membre (Identité principale pure) */}
              <div className="relative z-10 my-auto text-center px-2 py-1">
                <h2 className="text-lg sm:text-2xl font-agrandir-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] truncate">
                  {cleanMemberName}
                </h2>
                <div className="h-[1px] w-16 mx-auto bg-gradient-to-r from-transparent via-[#d4af37]/60 to-transparent mt-2" />
              </div>

              {/* Ligne 3 (Bas) : Numéro permanent de membre */}
              <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2.5">
                <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.2em] text-neutral-400 uppercase">
                  IDENTIFIANT PERMANENT
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm text-[#d4af37] tracking-widest">
                  {card.cardNumber}
                </span>
              </div>
            </div>

            {/* ============================================================= */}
            {/* VERSO — FACE QR CODE CONÇUE AUTOUR DU SCAN HAUTE SÉCURITÉ     */}
            {/* ============================================================= */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] p-4 sm:p-5 flex flex-col justify-between items-center overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.06)] border border-white/20 bg-[#070707]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {/* Texture subtile du verso */}
              <div className="absolute inset-0 bg-radial from-white/[0.04] via-transparent to-transparent pointer-events-none" />

              {/* Haut du verso : Logo discret & mention officielle */}
              <div className="relative z-10 w-full flex items-center justify-between px-1">
                <img
                  src="/assets/logo-lumareel.png"
                  alt="LUMARÉEL"
                  className="h-4 sm:h-5 w-auto object-contain opacity-80"
                />
                <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#d4af37] uppercase">
                  OFFICIAL QR CREDENTIAL
                </span>
              </div>

              {/* Centre du verso : QR Code parfaitement carré avec quiet zone blanche pure */}
              <div className="relative z-10 my-auto flex flex-col items-center">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white shadow-2xl ring-2 ring-[#d4af37]/40">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR Code de vérification pour ${card.cardNumber}`}
                      className="w-24 h-24 sm:w-28 sm:h-28 object-contain rounded-sm"
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-neutral-100 flex items-center justify-center text-neutral-400">
                      <QrIcon className="w-8 h-8 animate-pulse text-black" />
                    </div>
                  )}
                </div>
              </div>

              {/* Bas du verso : Numéro permanent de membre */}
              <div className="relative z-10 w-full flex items-center justify-between border-t border-white/10 pt-2 px-1">
                <span className="text-[8px] sm:text-[9px] font-mono text-neutral-400">
                  VÉRIFICATION OFFICIELLE
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm text-white tracking-widest">
                  {card.cardNumber}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Instructions & Boutons d'Action sous la carte */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setIsFlipped((prev) => !prev)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-200 hover:text-white transition-all cursor-pointer text-xs font-agrandir-semibold active:scale-95 shadow-md"
        >
          <RotateCw className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>{isFlipped ? 'Afficher le Recto' : 'Retourner la carte (Verso QR)'}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreenQr(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer text-xs font-agrandir-semibold active:scale-95"
        >
          <Maximize2 className="w-3.5 h-3.5 text-neutral-300" />
          <span>QR Plein Écran (Contrôle aux portes)</span>
        </button>
      </div>

      <p className="mt-2 text-[11px] text-neutral-500 font-agrandir-regular text-center">
        <span className="hidden sm:inline">Cliquez sur la carte pour la retourner</span>
        <span className="sm:hidden">Touchez la carte pour la retourner</span>
      </p>

      {/* MODAL QR CODE PLEIN ÉCRAN POUR SCAN RAPIDE AUX PORTES */}
      <AnimatePresence>
        {isFullscreenQr && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
            onClick={() => setIsFullscreenQr(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#101010] border border-[#d4af37]/40 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center space-y-5 shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setIsFullscreenQr(false)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <div className="text-[10px] font-agrandir-bold tracking-[0.25em] text-[#d4af37] uppercase">
                  LUMARÉEL CARD · CONTRÔLE D’ACCÈS
                </div>
                <h3 className="font-agrandir-extrabold text-lg text-white uppercase">
                  {cleanMemberName}
                </h3>
                <div className="font-mono text-xs text-neutral-400">
                  {card.cardNumber}
                </div>
              </div>

              {/* QR Code haute luminosité pour scan optique immédiat */}
              <div className="p-4 rounded-2xl bg-white shadow-2xl mx-auto w-fit">
                {qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Plein Écran"
                    className="w-56 h-56 object-contain"
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-emerald-400 font-agrandir-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Jeton cryptographique certifié 256 bits</span>
              </div>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-agrandir-bold text-white transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span>Enregistrer l'image</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
