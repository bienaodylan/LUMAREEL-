import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { MembershipCard } from '../types';
import { useApp } from '../context/AppContext';
import { RotateCw, CheckCircle2, Truck, Calendar } from 'lucide-react';

const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

interface DigitalMembershipCardProps {
  card: MembershipCard;
  onRotateToken?: () => void;
  isRotatingToken?: boolean;
}

/**
 * Carte noire officielle LUMARÉEL installée dans l'espace membre.
 * Affiche fidèlement les visuels officiels recto/verso (aucune puce visible, aucun numéro
 * superposé) dans un écrin élégant prêt pour mobile iOS/Android.
 */
export const DigitalMembershipCard: React.FC<DigitalMembershipCardProps> = ({
  card,
}) => {
  const { language } = useApp();
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'fr-FR';
  const prefersReducedMotion = useReducedMotion();
  const [isFlipped, setIsFlipped] = useState(false);

  const cleanMemberName = (card.cardholderName || 'MEMBRE LUMARÉEL')
    .replace(/^(mr\.?|mme\.?|m\.|dr\.?|pr\.?|ceo|founder|vip|président|ambassadeur)\s+/i, '')
    .trim();

  const expiryFormatted = card.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString(locale, {
        month: 'short',
        year: 'numeric',
      })
    : isEn
    ? '3 Years'
    : '3 Ans';

  const deliveryLabel = (() => {
    switch (card.physicalCardStatus) {
      case 'delivered':
        return isEn ? 'Delivered' : 'Livrée';
      case 'shipped':
        return isEn ? 'On the way (< 24h)' : 'En livraison (< 24h)';
      default:
        return isEn ? 'Delivery in < 24h' : 'Livraison en moins de 24h';
    }
  })();

  return (
    <div className="flex flex-col items-center w-full select-none">
      {/* Écrin de présentation de la carte installée */}
      <div className="relative w-full max-w-[440px] flex flex-col items-center">
        {/* Halo ambiant discret sous la carte */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-6 top-6 bottom-12 rounded-full bg-gradient-to-b from-[#d4af37]/15 via-white/[0.04] to-transparent blur-3xl"
        />

        {/* Carte officielle CR-80 (ratio exact 85.6 / 53.98) */}
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  y: [0, -5, 0],
                }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : {
                  duration: 5.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }
          }
          onClick={() => setIsFlipped((prev) => !prev)}
          className="relative z-10 w-full cursor-pointer perspective-[1400px] active:scale-[0.985] transition-transform"
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
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* RECTO OFFICIEL */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] bg-black border border-white/20 shadow-[0_28px_70px_rgba(0,0,0,0.92),0_0_32px_rgba(212,175,55,0.10)] overflow-hidden"
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
              {!prefersReducedMotion && (
                <motion.div
                  aria-hidden="true"
                  animate={{ x: ['-130%', '220%'] }}
                  transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                  className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                />
              )}
            </div>

            {/* VERSO OFFICIEL */}
            <div
              className="absolute inset-0 rounded-[18px] sm:rounded-[20px] bg-black border border-white/20 shadow-[0_28px_70px_rgba(0,0,0,0.92)] overflow-hidden"
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

        {/* Bouton discret recto/verso */}
        <button
          type="button"
          onClick={() => setIsFlipped((prev) => !prev)}
          className="relative z-10 mt-3 min-h-[40px] inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs text-neutral-300 hover:text-[#d4af37] transition-colors cursor-pointer"
        >
          <RotateCw className="w-3.5 h-3.5 text-[#d4af37]" />
          <span>
            {isFlipped
              ? isEn
                ? 'See front'
                : 'Voir devant'
              : isEn
              ? 'See back'
              : 'Voir derrière'}
          </span>
        </button>

        {/* Bandeau d'informations de la carte installée (sous la carte, jamais par-dessus) */}
        <div className="relative z-10 mt-3 w-full rounded-2xl bg-[#0d0d0d] border border-white/10 divide-y divide-white/10 text-left overflow-hidden">
          <div className="px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-neutral-400">
                {isEn ? 'Cardholder' : 'Titulaire'}
              </div>
              <div className="text-sm sm:text-base font-agrandir-extrabold text-white uppercase truncate mt-0.5">
                {cleanMemberName}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/12 border border-emerald-500/35 text-emerald-300 text-[11px] font-agrandir-bold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEn ? 'Active' : 'Active'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 divide-x divide-white/10">
            <div className="px-4 py-3 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-[#d4af37] shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-neutral-400">
                  {isEn ? 'Valid until' : 'Valable jusqu’en'}
                </div>
                <div className="text-xs font-agrandir-bold text-white truncate">
                  {expiryFormatted}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#d4af37] shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase text-neutral-400">
                  {isEn ? 'Physical card' : 'Carte physique'}
                </div>
                <div className="text-xs font-agrandir-bold text-white truncate">
                  {deliveryLabel}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
