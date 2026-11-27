import React from 'react';
import { motion } from 'framer-motion';

export type IllustrationSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type IllustrationAccent = 'mono' | 'gold';

export interface IconIllustrationProps {
  className?: string;
  size?: IllustrationSize;
  accent?: IllustrationAccent;
  animated?: boolean;
}

const SIZE_CLASSES: Record<IllustrationSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
};

function resolveClass(size: IllustrationSize | undefined, className?: string): string {
  if (className) return className;
  return SIZE_CLASSES[size || 'lg'];
}

function accentFill(accent: IllustrationAccent = 'mono'): string {
  return accent === 'gold' ? '#D4AF6A' : '#FFFFFF';
}

/**
 * Bibliothèque centralisée `Icons` — Illustrations architecturales LUMARÉEL.
 * Direction strictement monochrome Noir & Blanc (#FFFFFF / #0E0E0E) conçue pour
 * réduire la densité textuelle dans les écrans Communauté, Parrainage et Catalogue.
 */

const CommunityIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <circle cx="24" cy="17" r="5" stroke="#FFFFFF" strokeWidth="1.5" />
      <path
        d="M15 35C15 29.8 19 26 24 26C29 26 33 29.8 33 35"
        stroke="#FFFFFF"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12.5" cy="20.5" r="3.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" />
      <path
        d="M7 34C7 30.6 9.4 28 12.5 28"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="35.5" cy="20.5" r="3.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" />
      <path
        d="M41 34C41 30.6 38.6 28 35.5 28"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="24" cy="17" r="1.6" fill={fill} />
    </motion.svg>
  );
};

const CatalogIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <rect x="8" y="8" width="14" height="14" rx="3.5" stroke="#FFFFFF" strokeWidth="1.5" />
      <rect x="26" y="8" width="14" height="14" rx="3.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" />
      <rect x="8" y="26" width="14" height="14" rx="3.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" />
      <rect x="26" y="26" width="14" height="14" rx="3.5" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="15" cy="15" r="2.2" fill={fill} />
      <line x1="30" y1="33" x2="36" y2="33" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
    </motion.svg>
  );
};

const RewardsStoreIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <rect x="6" y="14" width="30" height="20" rx="5" stroke="#FFFFFF" strokeWidth="1.5" />
      <line
        x1="26"
        y1="15"
        x2="26"
        y2="33"
        stroke="#FFFFFF"
        strokeOpacity="0.38"
        strokeWidth="1.2"
        strokeDasharray="2.5 2.5"
      />
      <rect x="11" y="20" width="10" height="2" rx="1" fill="#FFFFFF" fillOpacity="0.85" />
      <rect x="11" y="25" width="7" height="1.5" rx="0.75" fill="#FFFFFF" fillOpacity="0.35" />
      <motion.path
        d="M36 9L37.5 13.5L42 15L37.5 16.5L36 21L34.5 16.5L30 15L34.5 13.5L36 9Z"
        fill={fill}
        animate={animated ? { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] } : undefined}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '36px 15px' }}
      />
    </motion.svg>
  );
};

const ReferralIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <circle cx="18" cy="24" r="10.5" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="30" cy="24" r="10.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.5" />
      <motion.circle
        cx="24"
        cy="24"
        r="3"
        fill={fill}
        animate={animated ? { scale: [1, 1.15, 1] } : undefined}
        transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transformOrigin: '24px 24px' }}
      />
      <circle cx="15" cy="21" r="1.5" fill="#FFFFFF" fillOpacity="0.8" />
      <circle cx="33" cy="27" r="1.5" fill="#FFFFFF" fillOpacity="0.55" />
    </motion.svg>
  );
};

const FlashDropsIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <circle
        cx="24"
        cy="24"
        r="16"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="1.4"
        strokeDasharray="4 3"
      />
      <circle cx="24" cy="24" r="12" stroke="#FFFFFF" strokeWidth="1.5" />
      <motion.path
        d="M25.5 14.5L18.5 25H24L22.5 33.5L29.5 23H24L25.5 14.5Z"
        fill={fill}
        animate={animated ? { opacity: [0.8, 1, 0.8] } : undefined}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.svg>
  );
};

const PriorityAccessIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <path
        d="M12 38V21C12 14.3726 17.3726 9 24 9C30.6274 9 36 14.3726 36 21V38"
        stroke="#FFFFFF"
        strokeWidth="1.5"
      />
      <path
        d="M17 38V22C17 18.134 20.134 15 24 15C27.866 15 31 18.134 31 22V38"
        stroke="#FFFFFF"
        strokeOpacity="0.35"
        strokeWidth="1.2"
      />
      <line x1="9" y1="38" x2="39" y2="38" stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.6" fill={fill} />
      <line x1="24" y1="26.5" x2="24" y2="33" stroke={fill} strokeWidth="1.6" strokeLinecap="round" />
    </motion.svg>
  );
};

const SuggestionsIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const strokeAccent = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <rect x="20" y="10" width="8" height="15" rx="4" stroke="#FFFFFF" strokeWidth="1.5" />
      <path
        d="M14.5 22C14.5 27.2467 18.7533 31.5 24 31.5C29.2467 31.5 33.5 27.2467 33.5 22"
        stroke="#FFFFFF"
        strokeOpacity="0.85"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line x1="24" y1="31.5" x2="24" y2="38" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="18" y1="38" x2="30" y2="38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <motion.path
        d="M36 14.5C37.8 16.3 37.8 19.7 36 21.5"
        stroke={strokeAccent}
        strokeWidth="1.6"
        strokeLinecap="round"
        animate={animated ? { opacity: [0.4, 1, 0.4] } : undefined}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.path
        d="M12 14.5C10.2 16.3 10.2 19.7 12 21.5"
        stroke={strokeAccent}
        strokeWidth="1.6"
        strokeLinecap="round"
        animate={animated ? { opacity: [0.4, 1, 0.4] } : undefined}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
      />
    </motion.svg>
  );
};

const ConcertMemoriesIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <rect x="8" y="12" width="32" height="24" rx="5" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="6.5" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="2.2" fill={fill} />
      <circle cx="34" cy="17" r="1.4" fill="#FFFFFF" fillOpacity="0.7" />
    </motion.svg>
  );
};

const SurpriseGiftIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'lg',
  accent = 'mono',
  animated = true,
}) => {
  const fill = accentFill(accent);
  return (
    <motion.svg
      viewBox="0 0 48 48"
      fill="none"
      className={resolveClass(size, className)}
      initial={false}
      whileHover={animated ? { scale: 1.05 } : undefined}
      transition={{ duration: 0.2 }}
      aria-hidden="true"
    >
      <rect x="10" y="20" width="28" height="18" rx="4" stroke="#FFFFFF" strokeWidth="1.5" />
      <rect x="8" y="15" width="32" height="6" rx="2.5" stroke="#FFFFFF" strokeWidth="1.5" />
      <line x1="24" y1="15" x2="24" y2="38" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" />
      <path
        d="M24 15C21 10 15.5 9.5 15.5 13C15.5 14.5 18 15 24 15ZM24 15C27 10 32.5 9.5 32.5 13C32.5 14.5 30 15 24 15Z"
        stroke={fill}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </motion.svg>
  );
};

const ArtistVoteIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'md',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <rect x="6" y="16" width="24" height="13" rx="3.5" stroke="#FFFFFF" strokeWidth="1.4" />
      <path d="M13 11L18 6L23 11" stroke={fill} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="18" y1="6.5" x2="18" y2="19" stroke={fill} strokeWidth="1.6" strokeLinecap="round" />
      <line x1="12" y1="24" x2="24" y2="24" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
};

const EarnTicketIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <rect x="4" y="10" width="28" height="16" rx="4" stroke="#FFFFFF" strokeWidth="1.4" />
      <line x1="23" y1="10.5" x2="23" y2="25.5" stroke="#FFFFFF" strokeOpacity="0.38" strokeWidth="1.2" strokeDasharray="2 2" />
      <circle cx="13" cy="18" r="2.2" fill={fill} />
    </svg>
  );
};

const EarnReferralIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <circle cx="13.5" cy="18" r="7.5" stroke="#FFFFFF" strokeWidth="1.4" />
      <circle cx="22.5" cy="18" r="7.5" stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.4" />
      <circle cx="18" cy="18" r="2.2" fill={fill} />
    </svg>
  );
};

const EarnAttendanceIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <path d="M7 13V9.5C7 8.1 8.1 7 9.5 7H13" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M23 7H26.5C27.9 7 29 8.1 29 9.5V13" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M29 23V26.5C29 27.9 27.9 29 26.5 29H23" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 29H9.5C8.1 29 7 27.9 7 26.5V23" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="10" y1="18" x2="26" y2="18" stroke={fill} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const EarnIdeaIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <path
        d="M18 7C13.8579 7 10.5 10.3579 10.5 14.5C10.5 17.2 11.9 19.5 14 20.8V23.5H22V20.8C24.1 19.5 25.5 17.2 25.5 14.5C25.5 10.3579 22.1421 7 18 7Z"
        stroke="#FFFFFF"
        strokeWidth="1.4"
      />
      <line x1="14.5" y1="27.5" x2="21.5" y2="27.5" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="18" cy="14.5" r="2.3" fill={fill} />
    </svg>
  );
};

const StepShareIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <rect x="7" y="13" width="22" height="16" rx="4" stroke="#FFFFFF" strokeWidth="1.4" />
      <path d="M18 19V7M18 7L14 11M18 7L22 11" stroke={fill} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const StepJoinIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <circle cx="16" cy="13.5" r="4.5" stroke="#FFFFFF" strokeWidth="1.4" />
      <path d="M8 27.5C8 23.3579 11.5817 20 16 20C20.4183 20 24 23.3579 24 27.5" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M26 12V18M23 15H29" stroke={fill} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
};

const StepRewardIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'sm',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <circle cx="18" cy="18" r="11" stroke="#FFFFFF" strokeWidth="1.4" />
      <path
        d="M18 11.5L19.6 16.4L24.5 18L19.6 19.6L18 24.5L16.4 19.6L11.5 18L16.4 16.4L18 11.5Z"
        fill={fill}
      />
    </svg>
  );
};

const BlackCardIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'md',
  accent = 'mono',
}) => {
  const fill = accentFill(accent);
  return (
    <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
      <rect x="4" y="8" width="28" height="20" rx="4.5" stroke="#FFFFFF" strokeWidth="1.4" />
      <rect x="8.5" y="13.5" width="6" height="4.5" rx="1.2" stroke={fill} strokeWidth="1.3" />
      <line x1="8.5" y1="23" x2="19.5" y2="23" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="26.5" cy="22.5" r="2" fill={fill} />
    </svg>
  );
};

const QuotaLockIcon: React.FC<IconIllustrationProps> = ({
  className,
  size = 'md',
}) => (
  <svg viewBox="0 0 36 36" fill="none" className={resolveClass(size, className)} aria-hidden="true">
    <rect x="8" y="16" width="20" height="13" rx="3.5" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.4" />
    <path d="M13 16V12.5C13 9.7 15.2 7.5 18 7.5C20.8 7.5 23 9.7 23 12.5V16" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.4" />
    <circle cx="18" cy="22.5" r="1.8" fill="#FFFFFF" fillOpacity="0.65" />
  </svg>
);

export const Icons = {
  Community: CommunityIcon,
  Catalog: CatalogIcon,
  RewardsStore: RewardsStoreIcon,
  Referral: ReferralIcon,
  FlashDrops: FlashDropsIcon,
  PriorityAccess: PriorityAccessIcon,
  Suggestions: SuggestionsIcon,
  ConcertMemories: ConcertMemoriesIcon,
  SurpriseGift: SurpriseGiftIcon,
  ArtistVote: ArtistVoteIcon,
  EarnTicket: EarnTicketIcon,
  EarnReferral: EarnReferralIcon,
  EarnAttendance: EarnAttendanceIcon,
  EarnIdea: EarnIdeaIcon,
  StepShare: StepShareIcon,
  StepJoin: StepJoinIcon,
  StepReward: StepRewardIcon,
  BlackCard: BlackCardIcon,
  QuotaLock: QuotaLockIcon,
} as const;

export type IllustrationIconName = keyof typeof Icons;

export interface IllustrationIconComponentProps extends IconIllustrationProps {
  name: IllustrationIconName;
}

export const IllustrationIcon: React.FC<IllustrationIconComponentProps> = ({
  name,
  ...props
}) => {
  const Component = Icons[name];
  return <Component {...props} />;
};

export default Icons;
