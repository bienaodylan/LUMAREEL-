import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, MapPin, X } from 'lucide-react';

/* ============================================================================
   1. ScrollReveal — Apparition discrète au scroll (fade + translateY 12px)
   ============================================================================ */
export const ScrollReveal: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = '', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 'some' }}
    transition={{ duration: 0.28, delay, ease: [0.22, 1, 0.36, 1] }}
    className={className}
  >
    {children}
  </motion.div>
);

/* ============================================================================
   2. SkeletonBlock — Chargements sombres (jamais de spinner seul)
   ============================================================================ */
export const SkeletonBlock: React.FC<{ className?: string }> = ({ className = 'h-24 w-full' }) => (
  <div aria-hidden="true" className={`lum-skeleton rounded-2xl border border-white/[0.06] ${className}`} />
);

/* ============================================================================
   3. SectionHeader — Surtitre or + titre ExtraBold + action droite
   ============================================================================ */
export interface SectionHeaderProps {
  kicker?: string;
  letter?: string;
  title?: string;
  actionLabel?: string;
  onAction?: () => void;
  goldDivider?: boolean;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  kicker,
  letter,
  title,
  actionLabel,
  onAction,
  goldDivider = false,
  className = '',
}) => (
  <div className={className}>
    {(letter || kicker) && (
      <div className="flex items-center gap-2.5 text-[11px] font-agrandir-extrabold uppercase tracking-[0.23em] mb-2">
        {letter && <span className="text-[#D4AF6A]">{letter}</span>}
        {kicker && <span className={letter ? 'text-white' : 'text-[#D4AF6A]'}>{kicker}</span>}
      </div>
    )}
    {(title || actionLabel) && (
      <div className="flex items-baseline justify-between gap-4">
        {title && (
          <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white tracking-tight">
            {title}
          </h2>
        )}
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="text-xs sm:text-sm font-agrandir-semibold text-[#9A9A9A] hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {actionLabel}
          </button>
        )}
      </div>
    )}
    {goldDivider && <div className="mt-3 h-px w-full bg-[#D4AF6A]/45" />}
  </div>
);

/* ============================================================================
   4. EditorialRow — Ligne éditoriale séparée par filets fins, numérotation or
   ============================================================================ */
export interface EditorialRowProps {
  index?: string;
  title: string;
  subtitle?: string;
  rightText?: React.ReactNode;
  accentDot?: boolean;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export const EditorialRow: React.FC<EditorialRowProps> = ({
  index,
  title,
  subtitle,
  rightText,
  accentDot,
  icon,
  onClick,
  disabled = false,
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick, disabled } : {})}
      className={`w-full min-h-[56px] py-4 flex items-center justify-between gap-4 text-left group transition-colors ${
        onClick && !disabled ? 'cursor-pointer active:opacity-80' : ''
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className="flex items-start gap-4 min-w-0 flex-1">
        {index && (
          <span className="text-xs font-mono text-[#D4AF6A] tabular-nums w-6 pt-1 shrink-0">
            {index}
          </span>
        )}
        {icon && <span className="pt-0.5 shrink-0">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className="font-agrandir-extrabold text-base sm:text-lg text-white group-hover:text-[#D4AF6A] transition-colors leading-snug truncate">
            {title}
          </p>
          {subtitle && (
            <p className="text-xs text-[#9A9A9A] mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {rightText && (
          <span className="text-xs sm:text-sm text-[#9A9A9A] group-hover:text-[#C8C8C8] transition-colors whitespace-nowrap">
            {rightText}
          </span>
        )}
        {accentDot && <span className="w-2 h-2 rounded-full bg-[#D4AF6A]" aria-hidden="true" />}
      </div>
    </Tag>
  );
};

/* ============================================================================
   5. HeroMedia — Grand visuel plein cadre avec dégradé noir en bas
   ============================================================================ */
export interface HeroMediaProps {
  imageUrl?: string;
  alt: string;
  heightClass?: string;
  className?: string;
  children: React.ReactNode;
}

export const HeroMedia: React.FC<HeroMediaProps> = ({
  imageUrl,
  alt,
  heightClass = 'min-h-[540px] sm:min-h-[580px] lg:min-h-[620px]',
  className = '',
  children,
}) => (
  <section
    className={`relative w-full ${heightClass} flex flex-col justify-between overflow-hidden bg-[#0E0E0E] ${className}`}
  >
    {imageUrl ? (
      <img
        src={imageUrl}
        alt={alt}
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover object-[50%_20%] transition-all duration-700"
      />
    ) : (
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A2216] via-[#0E0E0E] to-black" />
    )}
    <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/25 to-black" />
    <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/25 to-transparent" />
    {children}
  </section>
);

/* ============================================================================
   6. PosterCard — Affiche verticale sans arrondi (0px) + dégradé noir en bas
   ============================================================================ */
export interface PosterCardProps {
  imageUrl?: string;
  title: string;
  subtitle?: string;
  priceText?: string;
  badgeText?: string;
  aspectClass?: string;
  onClick?: () => void;
  className?: string;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  imageUrl,
  title,
  subtitle,
  priceText,
  badgeText,
  aspectClass = 'aspect-[3/4]',
  onClick,
  className = '',
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group text-left cursor-pointer block lum-press ${className}`}
  >
    <div className={`relative ${aspectClass} w-full rounded-[18px] overflow-hidden bg-[#0E0E0E] border border-white/[0.12] group-hover:border-white/25 transition-colors`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-top group-hover:scale-[1.03] transition-transform duration-500"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-b from-[#221D15] to-[#0E0E0E]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-black/20" />
      {badgeText && (
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 text-[9px] font-agrandir-extrabold uppercase tracking-[0.14em] text-[#D4AF6A]">
          {badgeText}
        </span>
      )}
      <h3 className="absolute inset-x-3.5 bottom-3.5 font-agrandir-extrabold text-lg sm:text-xl uppercase text-white leading-[1.02] tracking-tight">
        {title}
      </h3>
    </div>
    {(subtitle || priceText) && (
      <div className="mt-2 space-y-0.5">
        {subtitle && <p className="text-xs text-[#9A9A9A] truncate">{subtitle}</p>}
        {priceText && (
          <p className="text-xs font-agrandir-extrabold text-[#D4AF6A] tabular-nums">{priceText}</p>
        )}
      </div>
    )}
  </button>
);

/* ============================================================================
   7. StatusBadge — Statuts exacts de la charte LUMARÉEL
   ============================================================================ */
export type LumareelStatusVariant =
  | 'valid'
  | 'study'
  | 'preparation'
  | 'retained'
  | 'neutral'
  | 'rejected'
  | 'paid'
  | 'points';

const STATUS_STYLES: Record<LumareelStatusVariant, string> = {
  valid: 'bg-[#0F2A1A] text-[#7FE0A6]',
  study: 'bg-[#1F2A3A] text-[#A9C7F0]',
  preparation: 'bg-[#D4AF6A] text-black',
  retained: 'bg-[#2A2112] text-[#D4AF6A]',
  neutral: 'bg-[#262626] text-[#C8C8C8]',
  rejected: 'bg-[#2A1417] text-[#F29AA4]',
  paid: 'bg-white text-black',
  points: 'bg-[#D4AF6A] text-black',
};

export const StatusBadge: React.FC<{
  variant: LumareelStatusVariant;
  label: string;
  dot?: boolean;
  className?: string;
}> = ({ variant, label, dot = false, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-agrandir-extrabold uppercase tracking-[0.12em] whitespace-nowrap leading-none ${STATUS_STYLES[variant]} ${className}`}
  >
    {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" aria-hidden="true" />}
    <span>{label}</span>
  </span>
);

/* ============================================================================
   8. Tabs — Onglets soulignés avec filet doré #D4AF6A
   ============================================================================ */
export interface TabItem<T extends string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({
  items,
  activeId,
  onChange,
  className = '',
}: {
  items: TabItem<T>[];
  activeId: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <nav className={`flex items-center gap-6 sm:gap-7 border-b border-white/[0.12] overflow-x-auto scrollbar-hide ${className}`}>
      {items.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative min-h-[44px] pb-3 pt-1 text-sm whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              active
                ? 'font-agrandir-extrabold text-white'
                : 'font-agrandir-semibold text-[#9A9A9A] hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {active && <span className="absolute inset-x-0 -bottom-[1px] h-[2px] bg-[#D4AF6A]" />}
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================================
   9. CountdownTimer — Compte à rebours temps réel tabulaire
   ============================================================================ */
export const CountdownTimer: React.FC<{
  initialSeconds?: number;
  spaced?: boolean;
  className?: string;
}> = ({ initialSeconds = 2 * 3600 + 14 * 60 + 9, spaced = false, className = '' }) => {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((prev) => (prev > 1 ? prev - 1 : initialSeconds));
    }, 1000);
    return () => window.clearInterval(id);
  }, [initialSeconds]);

  const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
  const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
  const s = String(remaining % 60).padStart(2, '0');

  return (
    <span className={`font-mono tabular-nums ${className}`}>
      {spaced ? `${h} : ${m} : ${s}` : `${h}:${m}:${s}`}
    </span>
  );
};

/* ============================================================================
   10. BottomSheet — Panneau glissant depuis le bas avec fond assombri
   ============================================================================ */
export const BottomSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  kicker?: string;
  children: React.ReactNode;
}> = ({ open, onClose, title, kicker, children }) => {
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[95] bg-black/82 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-[28px] sm:rounded-[24px] bg-[#0E0E0E] border-t sm:border border-white/[0.12] p-5 sm:p-6 shadow-2xl text-white"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />
            {(title || kicker) && (
              <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-white/[0.12]">
                <div className="min-w-0">
                  {kicker && (
                    <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A] mb-1">
                      {kicker}
                    </p>
                  )}
                  {title && (
                    <h3 className="font-agrandir-extrabold text-lg sm:text-xl text-white leading-tight">
                      {title}
                    </h3>
                  )}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fermer"
                  className="w-10 h-10 rounded-full bg-[#141414] hover:bg-white/15 border border-white/[0.12] flex items-center justify-center text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" strokeWidth={1.6} />
                </button>
              </div>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

/* ============================================================================
   11. QRTicket — Carte billet fidèle à la maquette 04 (0px, QR 236px blanc pur)
   ============================================================================ */
export interface QRTicketProps {
  eventTitle: string;
  dateTimeLine: string;
  status: 'valid' | 'used' | 'cancelled';
  qrDataUrl?: string;
  serialNumber: string;
  categoryName: string;
  holderName: string;
  venue: string;
  doorsLine: string;
  directionsUrl: string;
  isEn?: boolean;
  onOpenQrFullscreen?: () => void;
  onTransfer?: () => void;
}

export const QRTicket: React.FC<QRTicketProps> = ({
  eventTitle,
  dateTimeLine,
  status,
  qrDataUrl,
  serialNumber,
  categoryName,
  holderName,
  venue,
  doorsLine,
  directionsUrl,
  isEn = false,
  onOpenQrFullscreen,
  onTransfer,
}) => {
  const isValid = status === 'valid';
  const isCancelled = status === 'cancelled';

  return (
    <article className="rounded-[22px] bg-[#0E0E0E] border border-white/[0.12] overflow-hidden">
      {/* Bandeau supérieur à halo chaud discret */}
      <div className="relative px-5 sm:px-6 pt-5 pb-5 bg-gradient-to-br from-[#2B2214]/80 via-[#15120C]/90 to-[#0E0E0E] overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 right-6 w-44 h-44 rounded-full bg-[#D4AF6A]/15 blur-3xl"
        />

        <div className="relative z-10 flex items-center justify-end mb-3">
          {isValid ? (
            <StatusBadge variant="valid" dot label={isEn ? 'VALID' : 'VALIDE'} />
          ) : isCancelled ? (
            <StatusBadge variant="neutral" label={isEn ? 'TRANSFERRED' : 'TRANSFÉRÉ'} />
          ) : (
            <StatusBadge variant="retained" label={isEn ? 'SCANNED' : 'UTILISÉ'} />
          )}
        </div>

        <div className="relative z-10">
          <h2 className="font-agrandir-extrabold text-[1.8rem] sm:text-3xl uppercase tracking-tight text-white leading-[1.02]">
            {eventTitle}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#C8C8C8]">{dateTimeLine}</p>
        </div>
      </div>

      {/* Zone QR code grand format (~236px) sur fond blanc pur */}
      <div className="px-5 sm:px-6 pt-6 pb-5 text-center bg-[#0E0E0E]">
        {isCancelled ? (
          <div className="mx-auto w-[236px] h-[236px] rounded-[18px] bg-[#141414] border border-white/[0.12] flex flex-col items-center justify-center gap-2 p-6">
            <p className="text-xs font-agrandir-extrabold text-[#C8C8C8] uppercase">
              {isEn ? 'QR Code Revoked' : 'QR Code révoqué'}
            </p>
            <p className="text-[11px] text-[#9A9A9A] leading-snug">
              {isEn ? 'Reissued to the new holder.' : 'Réémis au nouveau titulaire.'}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenQrFullscreen}
            aria-label={isEn ? 'Open full-screen QR code' : 'Afficher le QR code en plein écran'}
            className="mx-auto w-[236px] h-[236px] rounded-[18px] bg-white p-3.5 flex items-center justify-center cursor-pointer lum-press shadow-lg"
          >
            {qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR ${serialNumber}`} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full rounded-xl bg-neutral-200 animate-pulse" />
            )}
          </button>
        )}

        <p className="mt-4 text-xs text-[#9A9A9A] leading-relaxed max-w-[270px] mx-auto">
          {isEn
            ? 'Present this code at the entrance · brightness automatically boosted'
            : "Présentez ce code à l'entrée · luminosité augmentée automatiquement"}
        </p>

        <p className="mt-3 font-mono text-xs sm:text-sm font-semibold tracking-[0.14em] text-white uppercase">
          N° {serialNumber}
        </p>
      </div>

      {/* Perforation en pointillés */}
      <div className="mx-5 sm:mx-6 border-t border-dashed border-white/[0.18]" />

      {/* Grille 2×2 des informations */}
      <div className="px-5 sm:px-6 py-5 grid grid-cols-2 gap-x-4 gap-y-4 text-left bg-[#0E0E0E]">
        <div className="min-w-0">
          <span className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#9A9A9A]">
            {isEn ? 'CATEGORY' : 'CATÉGORIE'}
          </span>
          <span className="mt-1 block text-sm sm:text-base font-agrandir-extrabold text-[#D4AF6A] truncate">
            {categoryName}
          </span>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#9A9A9A]">
            {isEn ? 'HOLDER' : 'TITULAIRE'}
          </span>
          <span className="mt-1 block text-sm sm:text-base font-agrandir-extrabold text-white truncate">
            {holderName}
          </span>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#9A9A9A]">
            {isEn ? 'VENUE' : 'LIEU'}
          </span>
          <span className="mt-1 block text-sm font-agrandir-extrabold text-white truncate">
            {venue}
          </span>
        </div>

        <div className="min-w-0">
          <span className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.18em] text-[#9A9A9A]">
            {isEn ? 'DOORS' : 'PORTES'}
          </span>
          <span className="mt-1 block text-sm font-agrandir-extrabold text-white truncate">
            {doorsLine}
          </span>
        </div>
      </div>

      {/* Actions scindées Transférer | Itinéraire */}
      <div className="grid grid-cols-2 border-t border-white/[0.12] divide-x divide-white/[0.12] bg-[#0B0B0B]">
        <button
          type="button"
          disabled={!isValid}
          onClick={onTransfer}
          className="min-h-[52px] px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-agrandir-extrabold text-white hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed lum-press"
        >
          <ArrowRight className="w-4 h-4 text-[#C8C8C8]" strokeWidth={1.6} />
          <span>{isEn ? 'Transfer' : 'Transférer'}</span>
        </button>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[52px] px-4 flex items-center justify-center gap-2 text-xs sm:text-sm font-agrandir-extrabold text-white hover:bg-white/[0.04] transition-colors lum-press"
        >
          <MapPin className="w-4 h-4 text-[#C8C8C8]" strokeWidth={1.6} />
          <span>{isEn ? 'Directions' : 'Itinéraire'}</span>
        </a>
      </div>
    </article>
  );
};
