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
 * Présentation réaliste de la carte membre LUMARÉEL (format CR-80 85.6 × 53.98 mm, coins réalistes).
 * Strictement Noir & Blanc, réactif aux modes Clair et Sombre.
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
    ? '12 mo'
    : '12 mois';

  const issuedFormatted = card.validFrom
    ? new Date(card.validFrom).toLocaleDateString(locale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="flex flex-col items-center w-full select-none">
      <div className="relative w-full max-w-[390px] sm:max-w-[420px] flex flex-col items-center">
        {/* Halo doux neutre adapté au mode Clair / Sombre */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-4 top-4 bottom-20 rounded-full bg-gradient-to-b from-black/[0.06] via-black/[0.02] to-transparent dark:from-white/12 dark:via-white/[0.03] dark:to-transparent blur-3xl"
        />

        {/* Carte officielle format réel CR-80 avec coins réalistes (10-11px) */}
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
          aria-label={isEn ? 'Flip your LUMARÉEL card' : 'Retourner ta carte LUMARÉEL'}
        >
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* RECTO OFFICIEL */}
            <div
              className="absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-black ring-1 ring-black/15 dark:ring-white/15 shadow-[0_22px_50px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
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
              className="absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-black ring-1 ring-black/15 dark:ring-white/15 shadow-[0_22px_50px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
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

        {/* Identité sobre sous la carte */}
        <div className="relative z-10 mt-5 text-center space-y-1 max-w-full px-2">
          <div className="text-base sm:text-lg font-agrandir-extrabold text-[#111111] dark:text-white tracking-tight uppercase truncate">
            {cleanMemberName}
          </div>
          <div className="flex items-center justify-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-black/55 dark:text-white/55">
            <span className="inline-flex items-center gap-1.5 text-[#111111] dark:text-white font-agrandir-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#111111] dark:bg-white" />
              {isEn ? 'Active' : 'Active'}
            </span>
            <span aria-hidden="true" className="text-black/25 dark:text-white/25">
              ·
            </span>
            <span className="font-mono tabular-nums">
              {isEn ? 'Valid until' : 'Valable jusqu’en'} {expiryFormatted}
            </span>
          </div>
        </div>

        {/* Boutons circulaires minimalistes Noir & Blanc */}
        <div className="relative z-10 mt-6 flex items-start justify-center gap-8 sm:gap-10">
          <button
            type="button"
            onClick={() => setIsFlipped((prev) => !prev)}
            className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <span className="w-12 h-12 rounded-full bg-black/[0.05] group-hover:bg-black/[0.1] dark:bg-white/[0.08] dark:group-hover:bg-white/[0.15] active:scale-95 border border-black/10 dark:border-white/10 flex items-center justify-center text-[#111111] dark:text-white transition-all">
              <RotateCw className="w-4 h-4" />
            </span>
            <span className="text-[11px] text-black/65 group-hover:text-black dark:text-neutral-300 dark:group-hover:text-white transition-colors whitespace-nowrap">
              {isFlipped
                ? isEn
                  ? 'Front'
                  : 'Devant'
                : isEn
                ? 'Flip'
                : 'Retourner'}
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
                  ? 'bg-[#111111] text-white border-[#111111] dark:bg-white dark:text-black dark:border-white'
                  : 'bg-black/[0.05] group-hover:bg-black/[0.1] border-black/10 text-[#111111] dark:bg-white/[0.08] dark:group-hover:bg-white/[0.15] dark:border-white/10 dark:text-white'
              }`}
            >
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </span>
            <span className="text-[11px] text-black/65 group-hover:text-black dark:text-neutral-300 dark:group-hover:text-white transition-colors whitespace-nowrap">
              {isEn ? 'Card info' : 'Tes infos'}
            </span>
          </button>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex flex-col items-center gap-2 group cursor-pointer focus:outline-none disabled:opacity-50"
            >
              <span className="w-12 h-12 rounded-full bg-black/[0.05] group-hover:bg-black/[0.1] dark:bg-white/[0.08] dark:group-hover:bg-white/[0.15] active:scale-95 border border-black/10 dark:border-white/10 flex items-center justify-center text-[#111111] dark:text-white transition-all">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </span>
              <span className="text-[11px] text-black/65 group-hover:text-black dark:text-neutral-300 dark:group-hover:text-white transition-colors whitespace-nowrap">
                {isEn ? 'Refresh' : 'Actualiser'}
              </span>
            </button>
          )}
        </div>

        {/* Détails déroulants sobrement alignés */}
        <AnimatePresence initial={false}>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full overflow-hidden"
            >
              <dl className="mt-6 border-t border-black/10 dark:border-white/10 divide-y divide-black/10 dark:divide-white/10 text-xs text-left">
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-black/55 dark:text-neutral-400">
                    {isEn ? 'Name' : 'Ton nom'}
                  </dt>
                  <dd className="text-[#111111] dark:text-white font-agrandir-bold uppercase truncate">
                    {cleanMemberName}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-black/55 dark:text-neutral-400">
                    {isEn ? 'Status' : 'Statut'}
                  </dt>
                  <dd className="text-[#111111] dark:text-white font-agrandir-semibold">
                    {isEn ? 'Active' : 'Active'}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-black/55 dark:text-neutral-400">
                    {isEn ? 'Activated on' : 'Activée le'}
                  </dt>
                  <dd className="text-[#111111] dark:text-white font-mono tabular-nums">
                    {issuedFormatted}
                  </dd>
                </div>
                <div className="py-3 flex items-center justify-between gap-4">
                  <dt className="text-black/55 dark:text-neutral-400">
                    {isEn ? 'Valid until' : 'Valable jusqu’en'}
                  </dt>
                  <dd className="text-[#111111] dark:text-white font-mono tabular-nums">
                    {expiryFormatted}
                  </dd>
                </div>
              </dl>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
