import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { MembershipCard } from '../types';
import { useApp } from '../context/AppContext';
import { RotateCw, Eye, EyeOff, RefreshCw } from 'lucide-react';

const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

interface DigitalMembershipCardProps {
  card: MembershipCard;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  onRotateToken?: () => void;
  isRotatingToken?: boolean;
}

/**
 * Présentation façon carte bancaire moderne (Apple Wallet / Revolut Metal).
 * Aucune boîte lourde, aucun texte superposé sur le visuel officiel recto/verso.
 */
export const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  card,
  onRefresh,
  isRefreshing = false,
}) => {
  const { language } = useApp();
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'fr-FR';
  const prefersReducedMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const cleanMemberName = (card.cardholderName || 'MEMBRE LUMARÉEL')
    .replace(/^(mr\.?|mme\.?|m\.|dr\.?|pr\.?|ceo|founder|vip|président|ambassadeur)\s+/i, '')
    .trim();

  const expiryFormatted = card.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString(locale, {
        month: '2-digit',
        year: '2-digit',
      })
    : isEn
    ? '3 Yrs'
    : '3 Ans';

  const issuedFormatted = card.validFrom
    ? new Date(card.validFrom).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const deliveryLabel = (() => {
    switch (card.physicalCardStatus) {
      case 'delivered':
        return isEn ? 'Delivered' : 'Livrée';
      case 'shipped':
        return isEn ? 'Out for delivery' : 'En cours de livraison';
      default:
        return isEn ? 'Delivery < 24h' : 'Livraison < 24h';
    }
  })();

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Scène ouverte façon application bancaire — aucune boîte autour de la carte */}
      <div className="relative w-full max-w-[400px] sm:max-w-[430px] flex flex-col items-center">
        {/* Éclairage ambiant très discret */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-4 top-4 bottom-20 rounded-full bg-gradient-to-b from-[#d4af37]/14 via-white/[0.03] to-transparent blur-3xl"
        />

        {/* Carte officielle CR-80 (ratio bancaire exact 85.6 / 53.98) */}
        <motion.div
          onClick={() => setIsFlipped((prev) => !prev)}
          whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
          className="relative z-10 w-full cursor-pointer perspective-[1400px]"
          style={{ aspectRatio: '85.6 / 53.98' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsFlipped((prev) => !prev);
            }
          }}
          aria-label={isEn ? 'Flip your LUMARÉEL Black Card' : 'Retourner votre Black Card LUMARÉEL'}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* RECTO OFFICIEL */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] bg-black border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.92),0_0_24px_rgba(212,175,55,0.08)] overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <img
                src={CARD_FRONT_IMG}
                alt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Face avant'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* VERSO OFFICIEL */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] bg-black border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <img
                src={CARD_BACK_IMG}
                alt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Face arrière'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Ligne d'identité sobre sous la carte (sans boîte, façon carte bancaire) */}
        <div className="relative z-10 mt-5 text-center space-y-1 max-w-full px-2">
          <div className="text-base sm:text-lg font-agrandir-extrabold text-white tracking-tight uppercase truncate">
            {cleanMemberName}
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-neutral-400">
            <span className="text-emerald-400 font-agrandir-semibold">
              {isEn ? 'Active' : 'Active'}
            </span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <span className="font-mono tabular-nums">
              {isEn ? 'Exp.' : 'Exp.'} {expiryFormatted}
            </span>
            <span aria-hidden="true" className="text-white/25">·</span>
            <span>{deliveryLabel}</span>
          </div>
        </div>

        {/* Boutons d'action circulaires façon application bancaire (Revolut / Apple Wallet) */}
        <div className="relative z-10 mt-6 flex items-start justify-center gap-8 sm:gap-10">
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <span className="w-12 h-12 rounded-full bg-white/[0.08] group-hover:bg-white/[0.15] active:scale-95 border border-white/10 flex items-center justify-center text-white transition-all">
              <RotateCw className="w-4 h-4 text-[#d4af37]" />
            </span>
            <span className="text-[11px] text-neutral-300 group-hover:text-white transition-colors whitespace-nowrap">
              {isFlipped
                ? isEn ? 'Front' : 'Devant'
                : isEn ? 'Flip' : 'Retourner'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <span
              className={`w-12 h-12 rounded-full active:scale-95 border flex items-center justify-center transition-all ${
                showDetails
                  ? 'bg-white text-black border-white'
                  : 'bg-white/[0.08] group-hover:bg-white/[0.15] border-white/10 text-white'
              }`}
            >
              {showDetails ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4 text-[#d4af37]" />
              )}
            </span>
            <span className="text-[11px] text-neutral-300 group-hover:text-white transition-colors whitespace-nowrap">
              {isEn ? 'Card details' : 'Infos carte'}
            </span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none disabled:opacity-50"
            >
              <span className="w-12 h-12 rounded-full bg-white/[0.08] group-hover:bg-white/[0.15] active:scale-95 border border-white/10 flex items-center justify-center text-white transition-all">
                <RefreshCw className={`w-4 h-4 text-[#d4af37] ${isRefreshing ? 'animate-spin' : ''}`} />
              </span>
              <span className="text-[11px] text-neutral-300 group-hover:text-white transition-colors whitespace-nowrap">
                {isEn ? 'Refresh' : 'Actualiser'}
              </span>
            </button>
          )}
        </div>

        {/* Détails bancaires déroulants — lignes fines sans boîte */}
        <AnimatePresence initial={false}>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full overflow-hidden"
            >
              <dl className="mt-6 border-t border-white/10 divide-y divide-white/10 text-xs text-left">
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-neutral-400">{isEn ? 'Cardholder' : 'Titulaire'}</dt>
                  <dd className="text-white font-agrandir-bold uppercase truncate">{cleanMemberName}</dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-neutral-400">{isEn ? 'Status' : 'Statut'}</dt>
                  <dd className="text-emerald-400 font-agrandir-semibold">
                    {isEn ? 'Active' : 'Active'}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-neutral-400">{isEn ? 'Issued' : 'Émise le'}</dt>
                  <dd className="text-white font-mono tabular-nums">{issuedFormatted}</dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-neutral-400">{isEn ? 'Valid until' : 'Valable jusqu’en'}</dt>
                  <dd className="text-white font-mono tabular-nums">{expiryFormatted}</dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-neutral-400">{isEn ? 'Physical card' : 'Carte physique'}</dt>
                  <dd className="text-[#d4af37] font-agrandir-semibold">{deliveryLabel}</dd>
                </div>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
