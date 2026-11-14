import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MembershipCard } from '../types';
import {
  RotateCw,
  Cpu,
  Radio,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  CreditCard
} from 'lucide-react';

interface DigitalMembershipCardProps {
  card: MembershipCard;
  onRotateToken?: () => void;
  isRotatingToken?: boolean;
}

export const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  card,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Clean member name without any titles or roles
  const cleanMemberName = (card.cardholderName || 'DYLAN BIENAO')
    .replace(/^(mr\.?|mme\.?|m\.|dr\.?|pr\.?|ceo|founder|vip|président|ambassadeur)\s+/i, '')
    .trim()
    .toUpperCase();

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* 
        Conteneur standard CR-80 :
        Largeur 85.60 mm x Hauteur 53.98 mm (Ratio standardisé 1.586:1)
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
          aria-label={`Carte de membre sans contact ${card.cardNumber}. Cliquez pour retourner la carte.`}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* ============================================================= */}
            {/* RECTO — CARTE LUXE BANCAIRE AVEC PUCE CONTACT OR & NFC        */}
            {/* ============================================================= */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] p-5 sm:p-7 flex flex-col justify-between overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.12)] border border-[#d4af37]/40 bg-[#050505]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              {/* Texture subtile micro-brossée & halo doré */}
              <div
                className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at 80% 20%, rgba(212,175,55,0.20) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(255,255,255,0.06) 0%, transparent 50%)',
                }}
              />

              {/* Ligne 1 (Haut) : Logo officiel LUMARÉEL & Mention FOUNDERS EDITION */}
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

              {/* Ligne 2 : Puce intelligente EMV dorée gravée + Onde NFC sans contact */}
              <div className="relative z-10 flex items-center justify-between my-auto pt-1">
                {/* Microprocesseur à contacts dorés brossés (style carte bancaire de prestige) */}
                <div className="w-12 h-9 sm:w-14 sm:h-10 rounded-[6px] bg-gradient-to-br from-[#ffd778] via-[#d4af37] to-[#99751e] p-0.5 shadow-md border border-black/40 flex items-center justify-center relative overflow-hidden group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-[4px] border border-black/50 grid grid-cols-3 gap-0.5 p-0.5 bg-gradient-to-br from-amber-100/30 via-transparent to-black/30">
                    <div className="border-r border-b border-black/40 rounded-xs" />
                    <div className="border-b border-black/40 rounded-xs" />
                    <div className="border-l border-b border-black/40 rounded-xs" />
                    <div className="border-r border-black/40 rounded-xs" />
                    <div className="rounded-xs bg-[#c99a2c]/60" />
                    <div className="border-l border-black/40 rounded-xs" />
                    <div className="border-r border-t border-black/40 rounded-xs" />
                    <div className="border-t border-black/40 rounded-xs" />
                    <div className="border-l border-t border-black/40 rounded-xs" />
                  </div>
                </div>

                {/* Symbole d'onde Sans Contact */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/80">
                  <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
                  <span className="text-[8px] sm:text-[9px] font-mono tracking-widest text-[#d4af37] uppercase">
                    SANS CONTACT
                  </span>
                </div>
              </div>

              {/* Ligne 3 (Centre) : Nom complet du membre en grand */}
              <div className="relative z-10 text-left px-1 py-1">
                <div className="text-[7px] sm:text-[8px] font-mono tracking-[0.25em] text-neutral-400 uppercase">
                  TITULAIRE OFFICIEL
                </div>
                <h2 className="text-base sm:text-xl font-agrandir-extrabold uppercase tracking-wide text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)] truncate">
                  {cleanMemberName}
                </h2>
              </div>

              {/* Ligne 4 (Bas) : Numéro permanent de membre */}
              <div className="relative z-10 flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-[8px] sm:text-[9px] font-mono tracking-[0.2em] text-neutral-400 uppercase">
                  IDENTIFIANT PERMANENT
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm text-[#d4af37] tracking-widest">
                  {card.cardNumber}
                </span>
              </div>
            </div>

            {/* ============================================================= */}
            {/* VERSO — FACE PRIVILÈGE & CONCIERGERIE SANS CONTACT           */}
            {/* ============================================================= */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] p-4 sm:p-6 flex flex-col justify-between overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(255,255,255,0.06)] border border-white/20 bg-[#070707]"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {/* Bande magnétique satinée noire sur le haut */}
              <div className="-mx-6 -mt-4 sm:-mt-6 h-8 sm:h-9 bg-neutral-950 border-b border-white/10 flex items-center px-6">
                <span className="text-[7px] font-mono text-neutral-600 tracking-widest uppercase">
                  LUMARÉEL BLACK CARD · CERCLE PRIVÉ & HOSPITALITÉ
                </span>
              </div>

              {/* Zone centrale : Puce de prestige & Sceau d'authenticité */}
              <div className="relative z-10 my-auto py-2 flex items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
                    <span className="text-[9px] font-agrandir-bold text-white uppercase tracking-wider">
                      SCELLÉ DE SÉCURITÉ LUMARÉEL
                    </span>
                  </div>
                  <p className="text-[8px] sm:text-[9px] text-neutral-300 leading-snug font-agrandir-regular">
                    Identification automatique par simple effleurement aux portillons coupe-file, salons VIP et bars privés.
                  </p>
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[7px] font-mono text-[#888] uppercase tracking-wider">STATUT :</span>
                    <span className="font-mono text-[9px] font-bold text-[#d4af37] tracking-wider bg-black/50 px-2 py-0.5 rounded border border-[#d4af37]/30">
                      SÉRIE LIMITÉE 100 MEMBRES
                    </span>
                  </div>
                </div>

                {/* Sceau de sécurité / Hologramme doré */}
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 via-[#d4af37]/30 to-amber-700/20 border border-[#d4af37]/50 p-2 flex flex-col items-center justify-center text-center shrink-0 shadow-inner">
                  <Lock className="w-4 h-4 text-[#d4af37] mb-1" />
                  <span className="text-[6px] font-mono font-bold text-white tracking-widest uppercase">
                    CARTE OFFICIELLE
                  </span>
                </div>
              </div>

              {/* Bas du verso : Signature & Numéro */}
              <div className="relative z-10 border-t border-white/10 pt-2 flex items-center justify-between text-[7px] sm:text-[8px] font-mono text-neutral-400">
                <div className="flex items-center gap-2">
                  <span className="text-white">CONCIERGERIE PRIVÉE 24/7</span>
                  <span>·</span>
                  <span className="text-[#d4af37]">SANS CONTACT ACTIF</span>
                </div>
                <span className="font-mono font-bold text-white tracking-wider">
                  {card.cardNumber}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Instructions & Bouton d'action sous la carte */}
      <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <button
          type="button"
          onClick={() => setIsFlipped((prev) => !prev)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-neutral-200 hover:text-white transition-all cursor-pointer text-xs font-agrandir-semibold active:scale-95 shadow-md"
        >
          <RotateCw className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>{isFlipped ? 'Afficher le Recto (Puce Or)' : 'Retourner la carte (Verso de Prestige)'}</span>
        </button>
      </div>

      <p className="mt-2 text-[11px] text-neutral-500 font-agrandir-regular text-center">
        <span className="hidden sm:inline">Cliquez sur la carte pour la retourner</span>
        <span className="sm:hidden">Touchez la carte pour la retourner</span>
      </p>
    </div>
  );
};
