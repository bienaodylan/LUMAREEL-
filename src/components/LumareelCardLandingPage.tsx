import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import { saveStoredMemberCard } from '../utils/memberCardStorage';
import { getAuthHeaders } from '../lib/apiClient';
import {
  ArrowDown,
  ArrowRight,
  Check,
  CheckCircle2,
  Minus,
  RotateCw,
  X,
} from 'lucide-react';
import {
  motion,
  AnimatePresence,
  MotionValue,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

import arrivalEmptyStageImg from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';
import frontRowConcertImg from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import loungeRefreshmentImg from '../assets/images/black_card_hero_night_tall_1794694902515.jpg';
import presaleBeamsImg from '../assets/images/backstage_stage_beams_1795857146120.jpg';
import meetGreetArtistImg from '../assets/images/backstage_artist_dressing_1795857144421.jpg';
import concertClimaxImg from '../assets/images/concert_memories_crowd_1795735706315.jpg';

const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  onCardIssued?: (card: MembershipCard) => void;
  hasActiveCard?: boolean;
  activeCardNumber?: string;
}

const EASE_CINEMA: [number, number, number, number] = [0.22, 1, 0.36, 1];

const CARD_COPY = {
  fr: {
    brandSignature: 'LUMARÉEL BLACK CARD',
    heroTitle: 'Les concerts. Mais autrement.',
    heroSub:
      'Plus qu’une présence. Une expérience privilégiée dans l’univers LUMARÉEL.',
    heroCta: 'Découvrir la Black Card',
    ctaOrder: 'Obtenir ma Black Card',
    ctaViewMyCard: 'Voir ma carte',
    priceSuffix: '/ an',

    // Sticky 3D scroll beats (sans numéros ni titres de chapitres)
    beat1Title: 'Une vraie carte. Entre vos mains.',
    beat1Sub: 'Pensée pour vous accompagner d’une soirée à l’autre.',
    beat2Title: 'We don’t just do concerts. We create memories.',
    beat2Sub: 'Chaque face porte la signature réelle de la LUMARÉEL Black Card.',
    beat3Title: 'Remise en main propre. Active dès maintenant.',
    beat3Sub:
      'Votre carte physique est préparée à votre nom et disponible immédiatement dans l’application.',
    sideFront: 'Recto',
    sideBack: 'Verso',
    flipHint: 'Retourner la carte',

    // Narration continue des 7 avantages réels (aucun numéro, aucun label technique)
    arrivalStatement: 'Le concert commence avant la première note.',
    perkParkingTitle: 'Place de parking réservée',
    perkParkingDesc:
      'Votre emplacement vous attend déjà à l’arrivée. Plus rien à chercher avant d’entrer.',
    perkQueueTitle: 'Accès prioritaire dans la file d’attente',
    perkQueueDesc:
      'Vous franchissez les portes sans attendre, par le passage dédié aux membres.',

    stageStatement: 'Une autre place. Une autre proximité.',
    perkVipTitle: 'Placement VIP aux premiers rangs',
    perkVipDesc:
      'Au plus près de la scène, là où l’énergie du concert prend toute son intensité.',

    loungeStatement: 'Le temps de savourer la soirée.',
    perkDrinkTitle: 'Rafraîchissement offert',
    perkDrinkDesc:
      'Une boisson vous est offerte pour accompagner le moment en toute simplicité.',

    presaleStatement: 'Avant tout le monde.',
    perkPresaleTitle: 'Accès aux préventes',
    perkPresaleDesc:
      'Vous réservez vos places avant l’ouverture au grand public, dès l’annonce des dates.',

    meetStatement: 'Certaines expériences se vivent au plus près.',
    perkMeetTitle: 'Accès aux Meet & Greet',
    perkMeetDesc:
      'Ce qui se passe hors scène peut aussi vous appartenir : la rencontre réelle avec les artistes.',

    perkPartnerTitle: 'Réduction sur les articles de nos partenaires',
    perkPartnerDesc:
      'L’univers LUMARÉEL se prolonge au-delà du concert, avec des tarifs préférentiels sur les articles de nos marques et boutiques partenaires.',

    // Climax émotionnel
    climaxTitle: 'La carte. L’entrée. Les premiers rangs.',
    climaxSub: 'Présentez simplement votre Black Card et vivez chaque instant.',

    // Finale commerciale posée (aucun faux stock ni compte à rebours)
    offerTitle: 'LUMARÉEL Black Card',
    offerSub: 'Une adhésion simple pour toute une année de concerts.',
    offerTerms: [
      {
        label: 'Validité',
        value: '12 mois',
        detail: 'Un tarif unique pour toute l’année, sans frais caché.',
      },
      {
        label: 'Votre carte',
        value: 'Physique + application',
        detail: 'Remise en main propre par notre équipe et active immédiatement sur votre compte.',
      },
      {
        label: 'Règlement',
        value: 'Mobile Money ou carte',
        detail: 'Wave, Orange Money, MTN MoMo, Moov Money ou Visa / Mastercard.',
      },
      {
        label: 'Nature',
        value: 'Carte de membre',
        detail: 'Dédiée exclusivement à l’univers LUMARÉEL — ce n’est pas une carte bancaire.',
      },
    ],
    footnote: 'Activation immédiate dans votre espace dès validation.',

    // Tunnel d’adhésion en 4 étapes (conservé intact)
    wizHeader: 'LUMARÉEL BLACK CARD',
    wizTitle: 'Ta carte membre',
    wiz1Label: 'Ton nom complet *',
    wiz1Placeholder: 'TON NOM COMPLET',
    wiz1Hint: 'C’est le nom qui sera lié à ta carte.',
    wiz1Plan: 'Formule',
    wiz1PlanFallback: 'LUMARÉEL Black Card',
    wiz1PlanDesc: 'Valable 12 mois · Dans l’app + ta vraie carte',
    wiz1Next: 'Continuer',
    wiz2Title: 'Tes coordonnées',
    wiz2Sub: 'Pour activer ta carte et t’organiser la remise en main propre.',
    wiz2Email: 'Ton e-mail *',
    wiz2Phone: 'Ton numéro *',
    wiz2City: 'Ta ville *',
    wiz2Address: 'Ton quartier / Adresse *',
    wiz2Back: 'Retour',
    wiz2Next: 'Continuer',
    wiz3Title: 'Comment tu veux régler ?',
    wiz3Sub: 'Ta carte s’active tout de suite après validation.',
    wiz3Methods: [
      { id: 'wave', label: 'Wave', desc: '0% frais' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Rapide' },
      { id: 'moov_money', label: 'Moov Money', desc: 'Flooz' },
      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / MC' },
    ],
    wiz3Membership: 'Ta LUMARÉEL Black Card (1 an)',
    wiz3CardDelivery: 'Ta vraie carte personnelle',
    wiz3Included: 'Incluse',
    wiz3Total: 'Total à payer',
    wiz3Submitting: 'Activation...',
    wiz3Submit: 'Valider et activer ma carte',
    wiz4Kicker: 'C’EST TOUT BON !',
    wiz4Title: 'Bienvenue avec ta carte',
    wiz4Desc: (num: string) =>
      `Ta référence est le ${num}. Ta carte est déjà active et prête à être utilisée.`,
    wiz4Holder: 'Ton nom',
    wiz4Number: 'Référence',
    wiz4Physical: 'Ta vraie carte',
    wiz4Prep: 'En préparation',
    wiz4Cta: 'Voir ma carte',
    wizMinimize: 'Réduire',
    wizCancel: 'Fermer',
    wizMissingName: 'Écris ton nom complet pour continuer.',
    wizMissingContact: 'Renseigne ton e-mail et ton numéro de téléphone.',
    wizInvalidEmail: 'Vérifie ton adresse e-mail, elle ne semble pas valide.',
    toastAuth: 'Connecte-toi ou crée ton compte pour prendre ta carte.',
    toastMissing: 'Renseigne ton nom complet et ton e-mail.',
    toastOrderErr: 'Oups, impossible de valider pour le moment. Réessaie.',
    toastActivated: 'Super ! Ta LUMARÉEL Black Card est active.',
  },
  en: {
    brandSignature: 'LUMARÉEL BLACK CARD',
    heroTitle: 'Concerts. Done differently.',
    heroSub: 'More than attendance. A privileged way into the LUMARÉEL universe.',
    heroCta: 'Discover the Black Card',
    ctaOrder: 'Get my Black Card',
    ctaViewMyCard: 'View my card',
    priceSuffix: '/ year',

    beat1Title: 'A real card. In your hands.',
    beat1Sub: 'Designed to stay with you from one live night to the next.',
    beat2Title: 'We don’t just do concerts. We create memories.',
    beat2Sub: 'Every side carries the authentic signature of the LUMARÉEL Black Card.',
    beat3Title: 'Hand-delivered. Active right away.',
    beat3Sub:
      'Your physical card is prepared under your name and ready immediately inside the app.',
    sideFront: 'Front',
    sideBack: 'Back',
    flipHint: 'Turn the card',

    arrivalStatement: 'The concert begins before the first note.',
    perkParkingTitle: 'Reserved parking spot',
    perkParkingDesc:
      'Your space is already waiting when you arrive. Nothing to search for.',
    perkQueueTitle: 'Priority queue access',
    perkQueueDesc:
      'Walk straight in through the dedicated member lane without waiting in line.',

    stageStatement: 'Another seat. Another closeness.',
    perkVipTitle: 'Front-row VIP seating',
    perkVipDesc:
      'Right up close to the stage, where every moment carries its full intensity.',

    loungeStatement: 'Space to savor the evening.',
    perkDrinkTitle: 'Complimentary refreshment',
    perkDrinkDesc:
      'A drink awaits you so you can unwind and take in the atmosphere effortlessly.',

    presaleStatement: 'Before everyone else.',
    perkPresaleTitle: 'Presale access',
    perkPresaleDesc:
      'Reserve your tickets before general public release as soon as new dates drop.',

    meetStatement: 'Some moments are meant to be lived up close.',
    perkMeetTitle: 'Meet & Greet access',
    perkMeetDesc:
      'What happens off stage can belong to you too — meeting the artists in person.',

    perkPartnerTitle: 'Discounts on partner items',
    perkPartnerDesc:
      'The LUMARÉEL universe extends beyond concert night with preferential rates across our partner brands and shops.',

    climaxTitle: 'The card. The entrance. The front row.',
    climaxSub: 'Simply present your Black Card and step into the night.',

    offerTitle: 'LUMARÉEL Black Card',
    offerSub: 'One straightforward membership for a full year of concerts.',
    offerTerms: [
      {
        label: 'Validity',
        value: '12 months',
        detail: 'One annual rate covering the full year, with no hidden fees.',
      },
      {
        label: 'Your card',
        value: 'Physical + app',
        detail: 'Hand-delivered by our team and active immediately in your account.',
      },
      {
        label: 'Payment',
        value: 'Mobile Money or card',
        detail: 'Wave, Orange Money, MTN MoMo, Moov Money, or Visa / Mastercard.',
      },
      {
        label: 'Type',
        value: 'Member card',
        detail: 'Exclusive to the LUMARÉEL universe — not a bank card.',
      },
    ],
    footnote: 'Instant activation in your space upon confirmation.',

    wizHeader: 'LUMARÉEL BLACK CARD',
    wizTitle: 'Your member card',
    wiz1Label: 'Your full name *',
    wiz1Placeholder: 'YOUR FULL NAME',
    wiz1Hint: 'This is the name linked to your card.',
    wiz1Plan: 'Plan',
    wiz1PlanFallback: 'LUMARÉEL Black Card',
    wiz1PlanDesc: 'Valid 12 months · In the app + your real card',
    wiz1Next: 'Continue',
    wiz2Title: 'Your contact info',
    wiz2Sub: 'So we can activate your card and arrange handover.',
    wiz2Email: 'Your email *',
    wiz2Phone: 'Your phone *',
    wiz2City: 'Your city *',
    wiz2Address: 'Neighborhood / Address *',
    wiz2Back: 'Back',
    wiz2Next: 'Continue',
    wiz3Title: 'How do you want to pay?',
    wiz3Sub: 'Your card activates right away once confirmed.',
    wiz3Methods: [
      { id: 'wave', label: 'Wave', desc: '0% fee' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instant' },
      { id: 'moov_money', label: 'Moov Money', desc: 'Flooz' },
      { id: 'card', label: 'Bank Card', desc: 'Visa / MC' },
    ],
    wiz3Membership: 'Your LUMARÉEL Black Card (1 year)',
    wiz3CardDelivery: 'Your personal physical card',
    wiz3Included: 'Included',
    wiz3Total: 'Total to pay',
    wiz3Submitting: 'Activating...',
    wiz3Submit: 'Confirm & activate my card',
    wiz4Kicker: 'YOU’RE ALL SET!',
    wiz4Title: 'Welcome to your card',
    wiz4Desc: (num: string) =>
      `Your reference is ${num}. Your card is now active and ready to use.`,
    wiz4Holder: 'Your name',
    wiz4Number: 'Reference',
    wiz4Physical: 'Your real card',
    wiz4Prep: 'Being prepared',
    wiz4Cta: 'Open my card',
    wizMinimize: 'Minimize',
    wizCancel: 'Close',
    wizMissingName: 'Enter your full name to continue.',
    wizMissingContact: 'Enter your email and phone number.',
    wizInvalidEmail: 'Check your email address — it doesn’t look valid.',
    toastAuth: 'Sign in or create an account to get your card.',
    toastMissing: 'Enter your full name and email address.',
    toastOrderErr: 'Could not complete right now. Please try again.',
    toastActivated: 'Awesome! Your LUMARÉEL Black Card is active.',
  },
} as const;

/**
 * Masked editorial headline reveal — slides up cleanly out of an invisible baseline mask.
 */
const MaskedReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className = '' }) => {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <motion.div
        initial={{ y: '108%', opacity: 0.001 }}
        whileInView={{ y: '0%', opacity: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.85, delay, ease: EASE_CINEMA }}
      >
        {children}
      </motion.div>
    </div>
  );
};

interface VolumetricBlackCardProps {
  /** Base Y rotation in degrees (can be static number or scroll-driven MotionValue) */
  rotateYBase?: MotionValue<number> | number;
  /** Base X rotation in degrees */
  rotateXBase?: MotionValue<number> | number;
  /** Base Z rotation in degrees */
  rotateZBase?: MotionValue<number> | number;
  /** Optional scroll-driven sheen X percentage (-40 to 140) */
  sheenX?: MotionValue<number>;
  /** Manual flip toggle (adds 180deg cleanly on top of base rotation) */
  manualFlipped: boolean;
  onToggleFlip: () => void;
  /** Visual environment for shadow tuning */
  shadowTone?: 'dark' | 'light' | 'auto';
  /** Gentle idle levitation for hero staging */
  enableFloat?: boolean;
  /** Initial studio light sweep on mount */
  openingSweep?: boolean;
  ariaLabel: string;
  frontAlt: string;
  backAlt: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

/**
 * Volumetric 3D hardware stage for the authentic LUMARÉEL Black Card.
 * Renders real physical depth via stacked preserve-3d core layers, metallic edge highlight,
 * desktop cursor tilt + radial specular highlight, and scroll-synchronized light sweep.
 */
const VolumetricBlackCard: React.FC<VolumetricBlackCardProps> = ({
  rotateYBase = 0,
  rotateXBase = 0,
  rotateZBase = 0,
  sheenX,
  manualFlipped,
  onToggleFlip,
  shadowTone = 'dark',
  enableFloat = false,
  openingSweep = false,
  ariaLabel,
  frontAlt,
  backAlt,
  frontImageUrl = CARD_FRONT_IMG,
  backImageUrl = CARD_BACK_IMG,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  const pointerTiltX = useMotionValue(0);
  const pointerTiltY = useMotionValue(0);
  const glareX = useMotionValue(50);
  const glareY = useMotionValue(30);
  const glareAlpha = useMotionValue(0);

  const smoothTiltX = useSpring(pointerTiltX, { stiffness: 170, damping: 24, mass: 0.65 });
  const smoothTiltY = useSpring(pointerTiltY, { stiffness: 170, damping: 24, mass: 0.65 });
  const smoothGlareX = useSpring(glareX, { stiffness: 180, damping: 26 });
  const smoothGlareY = useSpring(glareY, { stiffness: 180, damping: 26 });
  const smoothGlareAlpha = useSpring(glareAlpha, { stiffness: 180, damping: 28 });

  const fallbackSheenX = useMotionValue(-100);
  const activeSheenX = sheenX ?? fallbackSheenX;
  const cursorSpecular = useMotionTemplate`radial-gradient(520px circle at ${smoothGlareX}% ${smoothGlareY}%, rgba(255,255,255,0.24), rgba(255,255,255,0.06) 36%, transparent 66%)`;
  const scrollSheenGradient = useMotionTemplate`linear-gradient(112deg, transparent calc(${activeSheenX}% - 26%), rgba(255,255,255,0.24) ${activeSheenX}%, transparent calc(${activeSheenX}% + 26%))`;
  const hasScrollSheen = Boolean(sheenX);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || e.pointerType !== 'mouse' || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    pointerTiltY.set((px - 0.5) * 16);
    pointerTiltX.set((0.5 - py) * 12);
    glareX.set(px * 100);
    glareY.set(py * 100);
    glareAlpha.set(1);
  };

  const handlePointerLeave = () => {
    pointerTiltX.set(0);
    pointerTiltY.set(0);
    glareAlpha.set(0);
  };

  const faceShadowClass =
    shadowTone === 'light'
      ? 'ring-1 ring-black/[0.15] shadow-[0_38px_85px_rgba(0,0,0,0.26),0_10px_28px_rgba(0,0,0,0.12)]'
      : 'ring-1 ring-white/[0.18] shadow-[0_42px_95px_rgba(0,0,0,0.92),0_0_0_1px_rgba(255,255,255,0.06)]';

  return (
    <div
      ref={stageRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className="relative w-full select-none"
      style={{ perspective: '1650px' }}
    >
      {/* Sculptural studio ground shadow */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-8 left-[8%] right-[8%] h-10 rounded-full blur-2xl ${
          shadowTone === 'light' ? 'bg-black/[0.24]' : 'bg-white/[0.08]'
        }`}
      />

      {/* Levitation wrapper */}
      <motion.div
        animate={enableFloat && !prefersReducedMotion ? { y: [0, -8, 0] } : undefined}
        transition={
          enableFloat && !prefersReducedMotion
            ? { duration: 6.2, repeat: Infinity, ease: 'easeInOut' }
            : undefined
        }
        style={{
          rotateX: prefersReducedMotion ? 0 : smoothTiltX,
          rotateY: prefersReducedMotion ? 0 : smoothTiltY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Scroll-driven multi-axis orientation wrapper */}
        <motion.div
          style={{
            rotateX: prefersReducedMotion ? 0 : rotateXBase,
            rotateY: prefersReducedMotion ? 0 : rotateYBase,
            rotateZ: prefersReducedMotion ? 0 : rotateZBase,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Interactive tap-to-flip wrapper */}
          <motion.div
            onClick={onToggleFlip}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onToggleFlip();
              }
            }}
            aria-label={ariaLabel}
            className="relative w-full cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-[10px] sm:rounded-[11px]"
            style={{ aspectRatio: '85.6 / 53.98', transformStyle: 'preserve-3d' }}
          >
            <motion.div
              animate={{ rotateY: manualFlipped ? 180 : 0 }}
              transition={{ duration: 0.72, ease: EASE_CINEMA }}
              className="relative w-full h-full"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* True physical edge thickness layers (visible when turning through 90deg) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-gradient-to-r from-[#2c2c2e] via-[#8e8e93] to-[#3a3a3c]"
                style={{ transform: 'translateZ(1.5px)' }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-[#161618]"
                style={{ transform: 'translateZ(0px)' }}
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-gradient-to-r from-[#3a3a3c] via-[#7c7c80] to-[#2c2c2e]"
                style={{ transform: 'translateZ(-1.5px)' }}
              />

              {/* FRONT FACE — RECTO OFFICIEL */}
              <div
                className={`absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-[#050505] overflow-hidden ${faceShadowClass}`}
                style={{
                  transform: 'translateZ(3px)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={frontImageUrl || CARD_FRONT_IMG}
                  alt={frontAlt}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="w-full h-full object-cover"
                />

                {/* Precision chamfer rim light */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[10px] sm:rounded-[11px]"
                  style={{
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -1px 0 rgba(255,255,255,0.08)',
                  }}
                />

                {/* Cinematic opening studio light sweep */}
                {!prefersReducedMotion && openingSweep && (
                  <motion.div
                    aria-hidden="true"
                    initial={{ x: '-140%', opacity: 0 }}
                    animate={{ x: '165%', opacity: [0, 0.42, 0] }}
                    transition={{ duration: 2.1, delay: 0.42, ease: EASE_CINEMA }}
                    className="pointer-events-none absolute inset-y-0 w-[52%] -skew-x-12"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.34) 50%, transparent 100%)',
                    }}
                  />
                )}

                {/* Scroll-driven light reflection */}
                {!prefersReducedMotion && hasScrollSheen && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: scrollSheenGradient }}
                  />
                )}

                {/* Desktop pointer-driven specular reflection */}
                {!prefersReducedMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: cursorSpecular, opacity: smoothGlareAlpha }}
                  />
                )}
              </div>

              {/* BACK FACE — VERSO OFFICIEL */}
              <div
                className={`absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-[#050505] overflow-hidden ${faceShadowClass}`}
                style={{
                  transform: 'rotateY(180deg) translateZ(3px)',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={backImageUrl || CARD_BACK_IMG}
                  alt={backAlt}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="w-full h-full object-cover"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[10px] sm:rounded-[11px]"
                  style={{
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.26), inset 0 -1px 0 rgba(255,255,255,0.08)',
                  }}
                />

                {!prefersReducedMotion && hasScrollSheen && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: scrollSheenGradient }}
                  />
                )}

                {!prefersReducedMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{ background: cursorSpecular, opacity: smoothGlareAlpha }}
                  />
                )}
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

/**
 * Full-bleed photographic frame with scroll-driven cinematic scale/parallax.
 */
const CinematicImageFrame: React.FC<{
  src: string;
  alt: string;
  aspectClass?: string;
  className?: string;
  parallaxAmount?: number;
}> = ({ src, alt, aspectClass = 'aspect-[16/10]', className = '', parallaxAmount = 26 }) => {
  const prefersReducedMotion = useReducedMotion();
  const frameRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: frameRef,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [-parallaxAmount, parallaxAmount]
  );
  const scale = useTransform(
    scrollYProgress,
    [0, 0.55, 1],
    prefersReducedMotion ? [1, 1, 1] : [1.1, 1.03, 1.0]
  );

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden bg-[#101012] ${aspectClass} ${className}`}
    >
      <motion.img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        style={{ y, scale }}
        className="w-full h-full object-cover will-change-transform"
      />
    </div>
  );
};

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
  onCardIssued,
  hasActiveCard = false,
}) => {
  const { currentUser, setCurrentPage, showToast, language, setIsAuthModalOpen } = useApp();
  const isEn = language === 'en';
  const c = CARD_COPY[isEn ? 'en' : 'fr'];
  const prefersReducedMotion = useReducedMotion();

  // Interactive flip states
  const [heroFlipped, setHeroFlipped] = useState(false);
  const [stageManualFlip, setStageManualFlip] = useState(false);
  const [offerFlipped, setOfferFlipped] = useState(false);

  // Scroll targets
  const heroRef = useRef<HTMLElement>(null);
  const choreographyRef = useRef<HTMLElement>(null);
  const nightStageRef = useRef<HTMLElement>(null);
  const climaxRef = useRef<HTMLElement>(null);

  // Live CMS state connected to Admin Black Card CMS (/api/cms/public)
  const [cmsConfig, setCmsConfig] = useState<{
    available?: boolean;
    frontImageUrl?: string;
    backImageUrl?: string;
    priceAmount?: number;
    currency?: string;
    heroTitleFr?: string;
    heroSubFr?: string;
    heroTitleEn?: string;
    heroSubEn?: string;
    ctaOrderFr?: string;
    ctaOrderEn?: string;
    climaxTitleFr?: string;
    climaxSubFr?: string;
    climaxTitleEn?: string;
    climaxSubEn?: string;
    benefits?: Array<{ id: string; titleFr: string; descFr: string; titleEn: string; descEn: string }>;
  } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/cms/public')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.blackCard) {
          setCmsConfig(data.blackCard);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const cardFrontUrl = cmsConfig?.frontImageUrl || CARD_FRONT_IMG;
  const cardBackUrl = cmsConfig?.backImageUrl || CARD_BACK_IMG;
  const isCardAvailable = cmsConfig?.available !== false;
  const getBenefit = (id: string, fallbackTitle: string, fallbackDesc: string) => {
    const found = cmsConfig?.benefits?.find((b) => b.id === id);
    if (!found) return { title: fallbackTitle, desc: fallbackDesc };
    return {
      title: (isEn ? found.titleEn : found.titleFr) || fallbackTitle,
      desc: (isEn ? found.descEn : found.descFr) || fallbackDesc,
    };
  };

  const bQueue = getBenefit('priority_queue', c.perkQueueTitle, c.perkQueueDesc);
  const bParking = getBenefit('reserved_parking', c.perkParkingTitle, c.perkParkingDesc);
  const bVip = getBenefit('vip_front_row', c.perkVipTitle, c.perkVipDesc);
  const bDrink = getBenefit('free_refreshment', c.perkDrinkTitle, c.perkDrinkDesc);
  const bPresale = getBenefit('presale_access', c.perkPresaleTitle, c.perkPresaleDesc);
  const bMeet = getBenefit('meet_and_greet', c.perkMeetTitle, c.perkMeetDesc);
  const bPartner = getBenefit('partner_discount', c.perkPartnerTitle, c.perkPartnerDesc);

  const heroTitleText = (isEn ? cmsConfig?.heroTitleEn : cmsConfig?.heroTitleFr) || c.heroTitle;
  const heroSubText = (isEn ? cmsConfig?.heroSubEn : cmsConfig?.heroSubFr) || c.heroSub;
  const climaxTitleText = (isEn ? cmsConfig?.climaxTitleEn : cmsConfig?.climaxTitleFr) || c.climaxTitle;
  const climaxSubText = (isEn ? cmsConfig?.climaxSubEn : cmsConfig?.climaxSubFr) || c.climaxSub;
  const ctaOrderText = (isEn ? cmsConfig?.ctaOrderEn : cmsConfig?.ctaOrderFr) || c.ctaOrder;

  // 1. Hero subtle exit depth on scroll
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroCardScale = useTransform(
    heroProgress,
    [0, 1],
    prefersReducedMotion ? [1, 1] : [1, 0.9]
  );
  const heroCardY = useTransform(
    heroProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [0, -48]
  );
  const heroTextOpacity = useTransform(
    heroProgress,
    [0, 0.55],
    prefersReducedMotion ? [1, 1] : [1, 0]
  );

  // 2. Sticky Scroll-Driven 3D Choreography
  const { scrollYProgress: rawChoreoProgress } = useScroll({
    target: choreographyRef,
    offset: ['start start', 'end end'],
  });
  const choreoProgress = useSpring(rawChoreoProgress, {
    stiffness: 95,
    damping: 26,
    mass: 0.35,
  });

  // Seamless Dark -> Luminous White environment transition
  const lightCanvasOpacity = useTransform(choreoProgress, [0.02, 0.2], [0, 1]);
  const darkTextOpacity = useTransform(choreoProgress, [0.08, 0.22], [1, 0]);
  const lightTextOpacity = useTransform(choreoProgress, [0.14, 0.26], [0, 1]);

  // 3D Multi-axis scroll choreography (Front angle -> Dead-on -> 180° Verso -> Sculptural return)
  const choreoRotateY = useTransform(
    choreoProgress,
    [0, 0.22, 0.38, 0.56, 0.72, 0.92, 1],
    [-22, 0, 14, 180, 186, 354, 360]
  );
  const choreoRotateX = useTransform(
    choreoProgress,
    [0, 0.24, 0.52, 0.78, 1],
    [12, 2, -5, 6, 0]
  );
  const choreoRotateZ = useTransform(
    choreoProgress,
    [0, 0.3, 0.55, 0.82, 1],
    [-2.5, 0, 1.5, -1.2, 0]
  );
  const choreoScale = useTransform(
    choreoProgress,
    [0, 0.25, 0.55, 0.85, 1],
    [0.9, 1.03, 1.1, 1.04, 0.98]
  );
  const choreoSheenX = useTransform(choreoProgress, [0, 1], [-35, 145]);
  const choreoBarScaleX = useTransform(choreoProgress, [0, 1], [0.05, 1]);

  // 3 Crossfading narrative beats below the 3D card during sticky scrub
  const beat1Opacity = useTransform(choreoProgress, [0.04, 0.14, 0.31, 0.39], [0, 1, 1, 0]);
  const beat1Y = useTransform(choreoProgress, [0.04, 0.14, 0.31, 0.39], [16, 0, 0, -14]);

  const beat2Opacity = useTransform(choreoProgress, [0.4, 0.49, 0.68, 0.76], [0, 1, 1, 0]);
  const beat2Y = useTransform(choreoProgress, [0.4, 0.49, 0.68, 0.76], [16, 0, 0, -14]);

  const beat3Opacity = useTransform(choreoProgress, [0.76, 0.84, 0.97, 1], [0, 1, 1, 1]);
  const beat3Y = useTransform(choreoProgress, [0.76, 0.84, 1], [16, 0, 0]);

  // 3. Second Sticky Scroll Stage — La Soirée avec la Black Card (maintains Apple launch craft through all 7 perks)
  const { scrollYProgress: rawNightProgress } = useScroll({
    target: nightStageRef,
    offset: ['start start', 'end end'],
  });
  const nightProgress = useSpring(rawNightProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.35,
  });

  // Living Black Card companion rotating gently as each moment of the evening unfolds
  const nightCardRotateY = useTransform(nightProgress, [0, 0.33, 0.66, 1], [-14, 10, -12, 8]);
  const nightCardRotateX = useTransform(nightProgress, [0, 0.5, 1], [8, -4, 6]);
  const nightCardSheen = useTransform(nightProgress, [0, 1], [-20, 130]);
  const nightProgressBar = useTransform(nightProgress, [0, 1], [0.04, 1]);

  // 4 Seamless photographic crossfades + subtle iris zoom inside sticky viewport
  const act1Opacity = useTransform(nightProgress, [0, 0.04, 0.23, 0.28], [1, 1, 1, 0]);
  const act1Scale = useTransform(nightProgress, [0, 0.28], [1.06, 1.0]);
  const act2Opacity = useTransform(nightProgress, [0.23, 0.29, 0.48, 0.54], [0, 1, 1, 0]);
  const act2Scale = useTransform(nightProgress, [0.23, 0.54], [1.08, 1.0]);
  const act3Opacity = useTransform(nightProgress, [0.49, 0.55, 0.74, 0.8], [0, 1, 1, 0]);
  const act3Scale = useTransform(nightProgress, [0.49, 0.8], [1.08, 1.0]);
  const act4Opacity = useTransform(nightProgress, [0.75, 0.81, 0.98, 1], [0, 1, 1, 1]);
  const act4Scale = useTransform(nightProgress, [0.75, 1], [1.08, 1.0]);

  const act1TextY = useTransform(nightProgress, [0, 0.23, 0.28], [0, 0, -18]);
  const act2TextY = useTransform(nightProgress, [0.23, 0.29, 0.48, 0.54], [18, 0, 0, -18]);
  const act3TextY = useTransform(nightProgress, [0.49, 0.55, 0.74, 0.8], [18, 0, 0, -18]);
  const act4TextY = useTransform(nightProgress, [0.75, 0.81, 1], [18, 0, 0]);

  // 4. Climax image zoom-out + floating card emergence
  const { scrollYProgress: climaxProgress } = useScroll({
    target: climaxRef,
    offset: ['start end', 'end start'],
  });
  const climaxScale = useTransform(
    climaxProgress,
    [0, 1],
    prefersReducedMotion ? [1, 1] : [1.14, 1.0]
  );
  const climaxCardY = useTransform(
    climaxProgress,
    [0, 1],
    prefersReducedMotion ? [0, 0] : [28, -24]
  );

  // Données de formule existantes (conservées intactes)
  const [, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Tunnel de commande en 4 étapes (conservé intact)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isWizardMinimized, setIsWizardMinimized] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantCity, setApplicantCity] = useState('Abidjan');
  const [applicantAddress, setApplicantAddress] = useState('Cocody');
  const [paymentMethod, setPaymentMethod] = useState<
    'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'card'
  >('wave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    card: MembershipCard;
    qrDataUrl: string;
  } | null>(null);

  useEffect(() => {
    const nowIso = new Date().toISOString();
    const defaultEdition: MembershipEdition = {
      id: 'edition_founders_2026',
      name: 'LUMARÉEL Black Card 2026',
      editionCode: 'FOUNDERS_2026',
      description: 'Carte membre LUMARÉEL Black Card.',
      quota: 100,
      allocatedCount: 24,
      startsAt: nowIso,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const defaultPlan: MembershipPlan = {
      id: 'plan_founders_annual',
      editionId: 'edition_founders_2026',
      name: 'LUMARÉEL Black Card — Annuel',
      description: 'Tes 7 avantages LUMARÉEL pendant 12 mois.',
      price: 50000,
      currency: 'FCFA',
      durationMonths: 12,
      physicalCardIncluded: true,
      renewalEnabled: true,
      status: 'active',
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    setEdition(defaultEdition);
    setPlans([defaultPlan]);
    setSelectedPlan((prev) => prev || defaultPlan);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser?.name && !applicantName) {
      setApplicantName(currentUser.name.toUpperCase());
    }
    if (currentUser?.email && !applicantEmail) {
      setApplicantEmail(currentUser.email);
    }
  }, [currentUser]);

  // Gel propre du scroll de fond lorsque la modale est ouverte
  useEffect(() => {
    if (!isWizardOpen || isWizardMinimized || typeof window === 'undefined') return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const html = document.documentElement;
    const body = document.body;
    const isFinePointer = window.matchMedia?.('(pointer: fine)')?.matches ?? false;
    const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);

    const prevHtmlOverflow = html.style.overflow;
    const prevHtmlOverscroll = html.style.overscrollBehavior;
    const prevBodyPosition = body.style.position;
    const prevBodyTop = body.style.top;
    const prevBodyLeft = body.style.left;
    const prevBodyRight = body.style.right;
    const prevBodyWidth = body.style.width;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehavior;
    const prevBodyPaddingRight = body.style.paddingRight;

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.overscrollBehavior = 'none';

    if (isFinePointer) {
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      body.style.position = 'fixed';
      body.style.top = `-${scrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (wizardStep === 4 && issuedResult?.card) {
          finishAndOpenInstalledCard(issuedResult.card);
        } else {
          setIsWizardOpen(false);
          setIsWizardMinimized(false);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      html.style.overflow = prevHtmlOverflow;
      html.style.overscrollBehavior = prevHtmlOverscroll;
      body.style.position = prevBodyPosition;
      body.style.top = prevBodyTop;
      body.style.left = prevBodyLeft;
      body.style.right = prevBodyRight;
      body.style.width = prevBodyWidth;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehavior = prevBodyOverscroll;
      body.style.paddingRight = prevBodyPaddingRight;
      if (!isFinePointer) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [isWizardOpen, isWizardMinimized]);

  const openAdmissionWizard = (plan?: MembershipPlan) => {
    if (plan) setSelectedPlan(plan);
    setApplicantName(currentUser?.name?.toUpperCase() || applicantName || '');
    setApplicantEmail(currentUser?.email || applicantEmail || '');
    setWizardStep(1);
    setIsWizardMinimized(false);
    setIsWizardOpen(true);
  };

  const finishAndOpenInstalledCard = (card?: MembershipCard) => {
    const targetCard = card || issuedResult?.card;
    setIsWizardOpen(false);
    setIsWizardMinimized(false);
    if (targetCard) {
      saveStoredMemberCard(targetCard, currentUser?.email);
      if (onCardIssued) {
        onCardIssued(targetCard);
        return;
      }
    }
    if (onGoToWallet) onGoToWallet();
    else setCurrentPage('member_card');
  };

  const closeAdmissionWizard = () => {
    if (wizardStep === 4 && issuedResult?.card) {
      finishAndOpenInstalledCard(issuedResult.card);
      return;
    }
    setIsWizardOpen(false);
    setIsWizardMinimized(false);
  };

  const handleWizardNextStep1 = () => {
    if (!applicantName.trim()) {
      showToast(c.wizMissingName, 'error');
      return;
    }
    setWizardStep(2);
  };

  const handleWizardNextStep2 = () => {
    const cleanEmail = applicantEmail.trim();
    if (!cleanEmail || !applicantPhone.trim()) {
      showToast(c.wizMissingContact, 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast(c.wizInvalidEmail, 'error');
      return;
    }
    setWizardStep(3);
  };

  const handleCompleteAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(c.toastAuth, 'info');
      return;
    }
    const cleanName = applicantName.trim();
    const cleanEmail = applicantEmail.trim().toLowerCase();

    if (!cleanName || !cleanEmail) {
      showToast(c.toastMissing, 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast(c.wizInvalidEmail, 'error');
      return;
    }

    const buildClientFallbackCard = (planId: string): MembershipCard => {
      const now = new Date();
      const nowIso = now.toISOString();
      const exp = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      const seq = Math.floor(10 + Math.random() * 89);
      const num = `LMR-2026-${String(seq).padStart(4, '0')}`;
      return {
        id: `card_${Date.now().toString(36)}`,
        userId: currentUser.id,
        planId,
        editionId: 'edition_founders_2026',
        cardNumber: num,
        cardSequence: seq,
        cardholderName: cleanName.toUpperCase(),
        cardholderEmail: cleanEmail,
        cardStatus: 'active',
        issuedAt: nowIso,
        validFrom: nowIso,
        expiresAt: exp.toISOString(),
        physicalCardStatus: 'in_production',
        clubVipLevel: 'FOUNDERS_BLACK',
        qrToken: `LMRCARD:${num}:${currentUser.id}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    };

    try {
      setIsSubmitting(true);
      const planId = selectedPlan?.id || plans[0]?.id || 'plan_founders_annual';
      let issuedCard: MembershipCard | null = null;
      let qrDataUrl = '';

      try {
        const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
        const res = await fetch('/api/membership/order', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            planId,
            customerName: cleanName,
            customerEmail: cleanEmail,
            customerPhone: applicantPhone.trim(),
            paymentMethod,
            shippingAddress: {
              street: applicantAddress.trim() || 'Remise en main propre',
              city: applicantCity.trim() || 'Abidjan',
              country: 'Côte d’Ivoire',
            },
          }),
        });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && data?.card) {
          issuedCard = data.card as MembershipCard;
          qrDataUrl = String(data.qrDataUrl || '');
        }
      } catch {
        // Fallback to local card if backend unreachable
      }

      if (!issuedCard) {
        issuedCard = buildClientFallbackCard(planId);
      }

      saveStoredMemberCard(issuedCard, currentUser?.email);
      setIssuedResult({ card: issuedCard, qrDataUrl });
      setWizardStep(4);
      showToast(c.toastActivated, 'success');
    } catch (err: any) {
      showToast(err?.message || c.toastOrderErr, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePlan = selectedPlan || plans[0] || null;
  const planPrice = cmsConfig?.priceAmount ?? activePlan?.price ?? 50000;
  const planCurrency = cmsConfig?.currency || activePlan?.currency || 'FCFA';
  const formattedPrice = `${Number(planPrice).toLocaleString(
    language === 'en' ? 'en-US' : 'fr-FR'
  )} ${planCurrency}`;

  const handleOrderAction = () => {
    if (hasActiveCard) {
      onGoToWallet?.();
    } else if (!isCardAvailable) {
      showToast(
        isEn
          ? 'New Black Card memberships are temporarily paused.'
          : 'Les nouvelles adhésions Black Card sont temporairement suspendues.',
        'info'
      );
    } else {
      openAdmissionWizard(activePlan || undefined);
    }
  };

  const scrollToChoreography = () => {
    choreographyRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <div className="w-full overflow-x-clip bg-black text-white font-agrandir-regular">
      {/* =================================================================== */}
      {/* OUVERTURE CINÉMATOGRAPHIQUE — LA BLACK CARD AU CENTRE               */}
      {/* =================================================================== */}
      <section
        ref={heroRef}
        className="relative w-full min-h-[calc(100svh-4.25rem)] bg-black text-white flex flex-col items-center justify-center px-5 sm:px-8 pt-10 sm:pt-14 pb-16 sm:pb-24 overflow-hidden"
      >
        {/* Faisceau de lumière studio zénithal, discret et maîtrisé */}
        <motion.div
          aria-hidden="true"
          initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, ease: EASE_CINEMA }}
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(58% 46% at 50% 42%, rgba(255,255,255,0.095) 0%, rgba(255,255,255,0.025) 42%, rgba(0,0,0,0) 74%)',
          }}
        />

        <div className="relative z-10 w-full max-w-[960px] mx-auto flex flex-col items-center text-center">
          {/* Signature marque discrète */}
          <motion.span
            initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE_CINEMA }}
            className="text-[11px] sm:text-xs font-agrandir-semibold uppercase tracking-[0.28em] text-white/55"
          >
            {c.brandSignature}
          </motion.span>

          {/* LA CARTE — Pièce maîtresse 3D volumétrique */}
          <motion.div
            initial={
              prefersReducedMotion
                ? false
                : { opacity: 0, y: 42, scale: 0.9, rotateX: 16 }
            }
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ duration: 1.15, delay: 0.12, ease: EASE_CINEMA }}
            style={{ y: heroCardY, scale: heroCardScale }}
            className="mt-8 sm:mt-11 w-full max-w-[330px] sm:max-w-[460px] lg:max-w-[540px]"
          >
            <VolumetricBlackCard
              manualFlipped={heroFlipped}
              onToggleFlip={() => setHeroFlipped((prev) => !prev)}
              shadowTone="dark"
              enableFloat
              openingSweep
              frontImageUrl={cardFrontUrl}
              backImageUrl={cardBackUrl}
              ariaLabel={
                isEn ? 'Turn the LUMARÉEL Black Card' : 'Retourner la LUMARÉEL Black Card'
              }
              frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
              backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
            />
          </motion.div>

          {/* Texte minimal et précis sous la carte */}
          <motion.div
            style={{ opacity: heroTextOpacity }}
            className="mt-10 sm:mt-12 flex flex-col items-center"
          >
            <div className="overflow-hidden">
              <motion.h1
                initial={prefersReducedMotion ? false : { y: '105%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                transition={{ duration: 0.9, delay: 0.3, ease: EASE_CINEMA }}
                className="font-agrandir-extrabold text-[2.15rem] sm:text-5xl lg:text-[3.85rem] leading-[1.03] tracking-[-0.03em] text-white text-balance"
              >
                {heroTitleText}
              </motion.h1>
            </div>

            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.45, ease: EASE_CINEMA }}
              className="mt-4 text-sm sm:text-lg text-white/62 leading-relaxed max-w-xl text-balance"
            >
              {heroSubText}
            </motion.p>

            {/* Un seul point d’action clair */}
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.58, ease: EASE_CINEMA }}
              className="mt-7 sm:mt-8"
            >
              {hasActiveCard ? (
                <button
                  type="button"
                  onClick={() => onGoToWallet?.()}
                  className="min-h-[50px] px-8 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm sm:text-[15px] inline-flex items-center justify-center gap-2 transition-colors cursor-pointer lum-press whitespace-nowrap"
                >
                  <span>{c.ctaViewMyCard}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={scrollToChoreography}
                  className="min-h-[50px] px-8 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm sm:text-[15px] inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
                >
                  <span>{c.heroCta}</span>
                  <ArrowDown className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* CHORÉGRAPHIE 3D AU SCROLL — L’OBJET PHYSIQUE (Sticky Storytelling)  */}
      {/* =================================================================== */}
      {prefersReducedMotion ? (
        /* Version épurée et accessible si prefers-reduced-motion est actif */
        <section
          ref={choreographyRef}
          className="w-full bg-white text-[#111111] py-20 sm:py-28 px-5 sm:px-8"
        >
          <div className="w-full max-w-[960px] mx-auto flex flex-col items-center text-center">
            <h2 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-[-0.025em] text-[#111111] text-balance">
              {c.beat1Title}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-black/60 max-w-xl">{c.beat3Sub}</p>

            <div className="mt-12 w-full max-w-[330px] sm:max-w-[460px]">
              <VolumetricBlackCard
                manualFlipped={stageManualFlip}
                onToggleFlip={() => setStageManualFlip((prev) => !prev)}
                shadowTone="light"
                ariaLabel={c.flipHint}
                frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
              />
            </div>

            <button
              type="button"
              onClick={() => setStageManualFlip((prev) => !prev)}
              className="mt-10 min-h-[44px] px-5 rounded-full border border-black/15 text-xs sm:text-sm font-agrandir-semibold text-[#111111] inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>{stageManualFlip ? c.sideFront : c.sideBack}</span>
            </button>
          </div>
        </section>
      ) : (
        /* Scène sticky pilotée par le scroll : Noir -> Blanc + Rotation 3D Recto -> Verso -> Retour */
        <section
          ref={choreographyRef}
          className="relative w-full h-[230vh] sm:h-[265vh] bg-black"
        >
          <div className="sticky top-0 h-[100svh] w-full overflow-hidden flex flex-col items-center justify-center px-5 sm:px-8">
            {/* Transition lumineuse fluide du noir absolu au blanc galerie */}
            <motion.div
              aria-hidden="true"
              style={{ opacity: lightCanvasOpacity }}
              className="pointer-events-none absolute inset-0 bg-white"
            />

            {/* Halo subtil en arrière-plan pour la profondeur */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: lightCanvasOpacity,
                background:
                  'radial-gradient(50% 42% at 50% 45%, rgba(0,0,0,0.035) 0%, rgba(255,255,255,0) 70%)',
              }}
            />

            <div className="relative z-10 w-full max-w-[960px] mx-auto flex flex-col items-center">
              {/* Carte 3D pilotée en temps réel par la progression du scroll */}
              <motion.div
                style={{ scale: choreoScale }}
                className="w-full max-w-[300px] sm:max-w-[440px] lg:max-w-[500px]"
              >
                <VolumetricBlackCard
                  rotateYBase={choreoRotateY}
                  rotateXBase={choreoRotateX}
                  rotateZBase={choreoRotateZ}
                  sheenX={choreoSheenX}
                  manualFlipped={stageManualFlip}
                  onToggleFlip={() => setStageManualFlip((prev) => !prev)}
                  shadowTone="light"
                  frontImageUrl={cardFrontUrl}
                  backImageUrl={cardBackUrl}
                  ariaLabel={c.flipHint}
                  frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                  backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
                />
              </motion.div>

              {/* 3 temps narratifs qui se succèdent sans jamais casser le cadre */}
              <div className="relative mt-11 sm:mt-14 w-full max-w-2xl h-[108px] sm:h-[116px] text-center">
                {/* Temps 1 */}
                <motion.div
                  style={{ opacity: beat1Opacity, y: beat1Y }}
                  className="absolute inset-0 flex flex-col items-center justify-start"
                >
                  <motion.h2
                    style={{ opacity: darkTextOpacity }}
                    className="absolute top-0 font-agrandir-extrabold text-2xl sm:text-4xl tracking-[-0.025em] text-white text-balance"
                  >
                    {c.beat1Title}
                  </motion.h2>
                  <motion.h2
                    style={{ opacity: lightTextOpacity }}
                    className="font-agrandir-extrabold text-2xl sm:text-4xl tracking-[-0.025em] text-[#111111] text-balance"
                  >
                    {c.beat1Title}
                  </motion.h2>
                  <motion.p
                    style={{ opacity: lightTextOpacity }}
                    className="mt-2.5 text-sm sm:text-base text-black/58 leading-relaxed max-w-md"
                  >
                    {c.beat1Sub}
                  </motion.p>
                </motion.div>

                {/* Temps 2 — Révélation du Verso réel */}
                <motion.div
                  style={{ opacity: beat2Opacity, y: beat2Y }}
                  className="absolute inset-0 flex flex-col items-center justify-start"
                >
                  <h2 className="font-agrandir-extrabold text-xl sm:text-4xl tracking-[-0.025em] text-[#111111] text-balance">
                    {c.beat2Title}
                  </h2>
                  <p className="mt-2.5 text-sm sm:text-base text-black/58 leading-relaxed max-w-md">
                    {c.beat2Sub}
                  </p>
                </motion.div>

                {/* Temps 3 — Remise en main propre + App */}
                <motion.div
                  style={{ opacity: beat3Opacity, y: beat3Y }}
                  className="absolute inset-0 flex flex-col items-center justify-start"
                >
                  <h2 className="font-agrandir-extrabold text-2xl sm:text-4xl tracking-[-0.025em] text-[#111111] text-balance">
                    {c.beat3Title}
                  </h2>
                  <p className="mt-2.5 text-sm sm:text-base text-black/58 leading-relaxed max-w-lg">
                    {c.beat3Sub}
                  </p>
                </motion.div>
              </div>

              {/* Contrôle discret tactile + fil de progression fin */}
              <motion.div
                style={{ opacity: lightTextOpacity }}
                className="mt-4 sm:mt-5 flex flex-col items-center gap-4"
              >
                <button
                  type="button"
                  onClick={() => setStageManualFlip((prev) => !prev)}
                  className="min-h-[40px] px-4 rounded-full text-xs font-agrandir-semibold text-black/55 hover:text-black inline-flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>{c.flipHint}</span>
                </button>

                <div className="w-32 h-[1.5px] bg-black/10 overflow-hidden rounded-full">
                  <motion.div
                    style={{ scaleX: choreoBarScaleX, transformOrigin: 'left center' }}
                    className="h-full w-full bg-[#111111]"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* SCÈNE STICKY IMMERSIVE — UNE SOIRÉE AVEC LA BLACK CARD              */}
      {/* Chorégraphie continue au scroll : la carte guide les 7 expériences  */}
      {/* =================================================================== */}
      {prefersReducedMotion ? (
        <section ref={nightStageRef} className="w-full bg-[#050505] text-white py-24 px-5 sm:px-8 space-y-16">
          <div className="max-w-[1120px] mx-auto space-y-12">
            <h2 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-[-0.028em]">
              {c.arrivalStatement}
            </h2>
            <div className="grid md:grid-cols-2 gap-10 border-t border-white/12 pt-8">
              <div><h3 className="font-agrandir-extrabold text-xl">{bParking.title}</h3><p className="mt-2 text-sm text-white/65">{bParking.desc}</p></div>
              <div><h3 className="font-agrandir-extrabold text-xl">{bQueue.title}</h3><p className="mt-2 text-sm text-white/65">{bQueue.desc}</p></div>
              <div><h3 className="font-agrandir-extrabold text-xl">{bVip.title}</h3><p className="mt-2 text-sm text-white/65">{bVip.desc}</p></div>
              <div><h3 className="font-agrandir-extrabold text-xl">{bDrink.title}</h3><p className="mt-2 text-sm text-white/65">{bDrink.desc}</p></div>
              <div><h3 className="font-agrandir-extrabold text-xl">{bPresale.title}</h3><p className="mt-2 text-sm text-white/65">{bPresale.desc}</p></div>
              <div><h3 className="font-agrandir-extrabold text-xl">{bMeet.title}</h3><p className="mt-2 text-sm text-white/65">{bMeet.desc}</p></div>
              <div className="md:col-span-2"><h3 className="font-agrandir-extrabold text-xl">{bPartner.title}</h3><p className="mt-2 text-sm text-white/65">{bPartner.desc}</p></div>
            </div>
          </div>
        </section>
      ) : (
        <section ref={nightStageRef} className="relative w-full h-[360vh] bg-[#050505] text-white">
          <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-black">
            {/* Crossfading full-bleed photographic scenes driven directly by scroll */}
            <motion.div style={{ opacity: act1Opacity }} className="absolute inset-0">
              <motion.img
                src={arrivalEmptyStageImg}
                alt={bParking.title}
                style={{ scale: act1Scale }}
                className="w-full h-full object-cover will-change-transform"
              />
            </motion.div>
            <motion.div style={{ opacity: act2Opacity }} className="absolute inset-0">
              <motion.img
                src={frontRowConcertImg}
                alt={bVip.title}
                style={{ scale: act2Scale }}
                className="w-full h-full object-cover will-change-transform"
              />
            </motion.div>
            <motion.div style={{ opacity: act3Opacity }} className="absolute inset-0">
              <motion.img
                src={presaleBeamsImg}
                alt={bPresale.title}
                style={{ scale: act3Scale }}
                className="w-full h-full object-cover will-change-transform"
              />
            </motion.div>
            <motion.div style={{ opacity: act4Opacity }} className="absolute inset-0">
              <motion.img
                src={meetGreetArtistImg}
                alt={bMeet.title}
                style={{ scale: act4Scale }}
                className="w-full h-full object-cover will-change-transform"
              />
            </motion.div>

            {/* Studio vignette for crisp editorial typography contrast */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/48 to-black/38"
            />

            {/* Foreground stage: narrative on the left + floating Black Card thread on the right */}
            <div className="relative z-10 h-full w-full max-w-[1180px] mx-auto px-5 sm:px-8 py-12 sm:py-16 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-[11px] font-agrandir-semibold uppercase tracking-[0.28em] text-white/50">
                  {c.brandSignature}
                </span>
                <div className="w-28 sm:w-40 h-[1.5px] bg-white/15 overflow-hidden rounded-full">
                  <motion.div
                    style={{ scaleX: nightProgressBar, transformOrigin: 'left center' }}
                    className="h-full w-full bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-end my-auto">
                {/* Crossfading storytelling copy for all 7 real benefits */}
                <div className="lg:col-span-7 relative min-h-[290px] sm:min-h-[310px]">
                  {/* Act 1: Parking réservé + Accès prioritaire */}
                  <motion.div
                    style={{ opacity: act1Opacity, y: act1TextY }}
                    className="absolute inset-0 flex flex-col justify-end space-y-6"
                  >
                    <h2 className="font-agrandir-extrabold text-[1.95rem] sm:text-5xl leading-[1.03] tracking-[-0.028em] text-white text-balance">
                      {c.arrivalStatement}
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-5 pt-5 border-t border-white/15">
                      <div>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white">{bParking.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">{bParking.desc}</p>
                      </div>
                      <div>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white">{bQueue.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">{bQueue.desc}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Act 2: Placement VIP premiers rangs */}
                  <motion.div
                    style={{ opacity: act2Opacity, y: act2TextY }}
                    className="absolute inset-0 flex flex-col justify-end space-y-6"
                  >
                    <h2 className="font-agrandir-extrabold text-[1.95rem] sm:text-5xl leading-[1.03] tracking-[-0.028em] text-white text-balance">
                      {c.stageStatement}
                    </h2>
                    <div className="pt-5 border-t border-white/15 max-w-xl">
                      <h3 className="font-agrandir-extrabold text-lg sm:text-2xl text-white">{bVip.title}</h3>
                      <p className="mt-2 text-sm sm:text-base text-white/75 leading-relaxed">{bVip.desc}</p>
                    </div>
                  </motion.div>

                  {/* Act 3: Rafraîchissement offert + Accès aux préventes */}
                  <motion.div
                    style={{ opacity: act3Opacity, y: act3TextY }}
                    className="absolute inset-0 flex flex-col justify-end space-y-6"
                  >
                    <h2 className="font-agrandir-extrabold text-[1.95rem] sm:text-5xl leading-[1.03] tracking-[-0.028em] text-white text-balance">
                      {c.presaleStatement}
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-5 pt-5 border-t border-white/15">
                      <div>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white">{bPresale.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">{bPresale.desc}</p>
                      </div>
                      <div>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white">{bDrink.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">{bDrink.desc}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Act 4: Meet & Greet + Réductions partenaires */}
                  <motion.div
                    style={{ opacity: act4Opacity, y: act4TextY }}
                    className="absolute inset-0 flex flex-col justify-end space-y-6"
                  >
                    <h2 className="font-agrandir-extrabold text-[1.95rem] sm:text-5xl leading-[1.03] tracking-[-0.028em] text-white text-balance">
                      {c.meetStatement}
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-5 pt-5 border-t border-white/15">
                      <div>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white">{bMeet.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">{bMeet.desc}</p>
                      </div>
                      <div>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white">{bPartner.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm text-white/70 leading-relaxed">{bPartner.desc}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Living 3D Black Card continuous thread */}
                <div className="hidden lg:flex lg:col-span-5 justify-end">
                  <div className="w-full max-w-[330px]">
                    <VolumetricBlackCard
                      rotateYBase={nightCardRotateY}
                      rotateXBase={nightCardRotateX}
                      sheenX={nightCardSheen}
                      manualFlipped={stageManualFlip}
                      onToggleFlip={() => setStageManualFlip((prev) => !prev)}
                      shadowTone="dark"
                      frontImageUrl={cardFrontUrl}
                      backImageUrl={cardBackUrl}
                      ariaLabel={c.flipHint}
                      frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                      backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
                    />
                  </div>
                </div>
              </div>

              <div className="h-2" />
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* RESPIRATION LOUNGE — LA PAUSE EN BLANC                              */}
      {/* =================================================================== */}
      <section className="w-full bg-white text-[#111111] py-20 sm:py-32 px-5 sm:px-8">
        <div className="w-full max-w-[1120px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          <div className="lg:col-span-6 lg:order-2">
            <CinematicImageFrame
              src={loungeRefreshmentImg}
              alt={bDrink.title}
              aspectClass="aspect-[4/5]"
              className="rounded-[18px] sm:rounded-[22px] max-h-[580px] w-full"
              parallaxAmount={24}
            />
          </div>
          <div className="lg:col-span-6 lg:order-1 space-y-6">
            <MaskedReveal>
              <h2 className="font-agrandir-extrabold text-[2rem] sm:text-5xl leading-[1.05] tracking-[-0.026em] text-[#111111] text-balance">
                {c.loungeStatement}
              </h2>
            </MaskedReveal>
            <p className="text-base sm:text-lg text-black/62 leading-relaxed max-w-md">
              {bDrink.desc}
            </p>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* POINT D’ORGUE VISUEL — LA SCÈNE, LE PUBLIC & LA CARTE               */}
      {/* =================================================================== */}
      <section
        ref={climaxRef}
        className="relative w-full min-h-[68vh] sm:min-h-[82vh] bg-black overflow-hidden flex items-end"
      >
        <motion.img
          src={concertClimaxImg}
          alt={climaxTitleText}
          referrerPolicy="no-referrer"
          style={{ scale: climaxScale }}
          className="absolute inset-0 w-full h-full object-cover will-change-transform"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/92 via-black/38 to-black/18"
        />

        <div className="relative z-10 w-full max-w-[1120px] mx-auto px-5 sm:px-8 py-16 sm:py-24 grid grid-cols-1 md:grid-cols-12 gap-10 items-end">
          <div className="md:col-span-7 space-y-3">
            <MaskedReveal>
              <h2 className="font-agrandir-extrabold text-3xl sm:text-5xl lg:text-[3.6rem] leading-[1.03] tracking-[-0.028em] text-white text-balance">
                {climaxTitleText}
              </h2>
            </MaskedReveal>
            <motion.p
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: 0.14, ease: EASE_CINEMA }}
              className="text-sm sm:text-lg text-white/75 leading-relaxed max-w-lg"
            >
              {climaxSubText}
            </motion.p>
          </div>

          <motion.div
            style={{ y: climaxCardY }}
            className="md:col-span-5 flex md:justify-end"
          >
            <div className="w-full max-w-[260px] sm:max-w-[300px]">
              <VolumetricBlackCard
                manualFlipped={offerFlipped}
                onToggleFlip={() => setOfferFlipped((prev) => !prev)}
                shadowTone="dark"
                frontImageUrl={cardFrontUrl}
                backImageUrl={cardBackUrl}
                ariaLabel={c.flipHint}
                frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* ACQUISITION — CALME, CLAIRE, SANS PRESSION (Galerie Blanche)        */}
      {/* =================================================================== */}
      <section className="w-full bg-white text-[#111111] pt-24 sm:pt-36 pb-28 lg:pb-32 px-5 sm:px-8">
        <div className="w-full max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 items-center pb-14 border-b border-black/10">
            <div className="md:col-span-5">
              <div className="w-full max-w-[290px] sm:max-w-[320px]">
                <VolumetricBlackCard
                  manualFlipped={offerFlipped}
                  onToggleFlip={() => setOfferFlipped((prev) => !prev)}
                  shadowTone="light"
                  frontImageUrl={cardFrontUrl}
                  backImageUrl={cardBackUrl}
                  ariaLabel={c.flipHint}
                  frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                  backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
                />
              </div>
            </div>

            <div className="md:col-span-7 space-y-5">
              <MaskedReveal>
                <h2 className="font-agrandir-extrabold text-3xl sm:text-5xl leading-[1.04] tracking-[-0.028em] text-[#111111]">
                  {c.offerTitle}
                </h2>
              </MaskedReveal>

              <p className="text-base sm:text-lg text-black/60 leading-relaxed max-w-md">
                {c.offerSub}
              </p>

              <div className="pt-2 flex flex-wrap items-baseline gap-2.5">
                <span className="font-agrandir-extrabold text-3xl sm:text-4xl tracking-tight tabular-nums text-[#111111]">
                  {loading ? '...' : formattedPrice}
                </span>
                <span className="text-sm sm:text-base text-black/48">{c.priceSuffix}</span>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleOrderAction}
                  disabled={!hasActiveCard && !isCardAvailable}
                  className="w-full sm:w-auto min-h-[54px] px-9 rounded-full bg-[#111111] hover:bg-black/85 disabled:opacity-45 text-white font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
                >
                  <span>
                    {hasActiveCard
                      ? c.ctaViewMyCard
                      : isCardAvailable
                        ? ctaOrderText
                        : isEn
                          ? 'Temporarily unavailable'
                          : 'Momentanément indisponible'}
                  </span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>

          {/* Conditions réelles, nettes et lisibles */}
          <dl className="divide-y divide-black/10 border-b border-black/10">
            {c.offerTerms.map((term) => (
              <div
                key={term.label}
                className="py-5 sm:py-6 grid grid-cols-1 sm:grid-cols-12 gap-1.5 sm:gap-6 items-baseline"
              >
                <dt className="sm:col-span-3 text-xs font-agrandir-semibold text-black/45">
                  {term.label}
                </dt>
                <dd className="sm:col-span-4 font-agrandir-extrabold text-base text-[#111111]">
                  {term.value}
                </dd>
                <dd className="sm:col-span-5 text-sm text-black/60 leading-relaxed">
                  {term.detail}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 text-xs sm:text-sm text-black/48">{c.footnote}</p>
        </div>
      </section>

      {/* =================================================================== */}
      {/* TUNNEL D’ACTIVATION EN 4 ÉTAPES — Conservé intégralement            */}
      {/* =================================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isWizardOpen && isWizardMinimized && (
              <motion.button
                key="black-card-wizard-pill"
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={() => setIsWizardMinimized(false)}
                className="fixed bottom-24 right-4 z-[90] min-h-[44px] px-5 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold text-xs shadow-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>{c.wizTitle}</span>
              </motion.button>
            )}

            {isWizardOpen && !isWizardMinimized && (
              <motion.div
                key="black-card-wizard-expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                role="dialog"
                aria-modal="true"
                aria-label={c.wizTitle}
                className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/70 dark:bg-black/88 backdrop-blur-md touch-none overscroll-none"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.22, ease: EASE_CINEMA }}
                  className="relative w-full max-w-xl max-h-[90dvh] sm:max-h-[86vh] flex flex-col overflow-hidden bg-white text-[#111111] dark:bg-[#0B0B0B] dark:text-white rounded-t-[24px] sm:rounded-[20px] border-t sm:border border-black/10 dark:border-white/[0.14] shadow-[0_24px_80px_rgba(0,0,0,0.35)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.95)] text-left touch-auto"
                >
                  {/* En-tête */}
                  <div className="shrink-0 px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#0B0B0B]">
                    <div className="w-10 h-1 rounded-full bg-black/15 dark:bg-white/20 mx-auto mb-3 sm:hidden" />

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-black/45 dark:text-white/50 block">
                          {c.wizHeader}
                        </span>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-[#111111] dark:text-white mt-0.5 truncate">
                          {c.wizTitle}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsWizardMinimized(true)}
                          className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/[0.07] dark:hover:bg-white/[0.14] flex items-center justify-center text-black/65 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                          aria-label={c.wizMinimize}
                        >
                          <Minus className="w-4 h-4" strokeWidth={1.6} />
                        </button>
                        <button
                          type="button"
                          onClick={closeAdmissionWizard}
                          className="w-9 h-9 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-white/[0.07] dark:hover:bg-white/[0.14] flex items-center justify-center text-black/65 hover:text-black dark:text-white/70 dark:hover:text-white transition-colors cursor-pointer"
                          aria-label={c.wizCancel}
                        >
                          <X className="w-4 h-4" strokeWidth={1.6} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Corps scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
                    {wizardStep === 1 && (
                      <div className="space-y-5">
                        {/* Aperçu de la vraie carte officielle */}
                        <div className="w-full max-w-[300px] mx-auto">
                          <div
                            className="w-full rounded-[10px] bg-black ring-1 ring-black/15 dark:ring-white/15 shadow-lg overflow-hidden"
                            style={{ aspectRatio: '85.6 / 53.98' }}
                          >
                            <img
                              src={CARD_FRONT_IMG}
                              alt="LUMARÉEL Black Card"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-agrandir-semibold text-black/70 dark:text-white/75 block">
                            {c.wiz1Label}
                          </label>
                          <input
                            type="text"
                            value={applicantName}
                            onChange={(e) => setApplicantName(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleWizardNextStep1();
                              }
                            }}
                            placeholder={c.wiz1Placeholder}
                            required
                            className="w-full min-h-[48px] px-4 py-3 rounded-[10px] bg-[#F5F5F7] dark:bg-black border border-black/15 dark:border-white/[0.16] focus:border-black dark:focus:border-white text-[#111111] dark:text-white font-mono text-sm uppercase tracking-wider outline-none transition-colors"
                          />
                          <p className="text-[11px] text-black/50 dark:text-white/50">
                            {c.wiz1Hint}
                          </p>
                        </div>

                        <div className="p-4 rounded-[12px] bg-[#F5F5F7] dark:bg-[#121212] border border-black/[0.08] dark:border-white/[0.1] flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-[10px] font-agrandir-semibold text-black/50 dark:text-white/50 uppercase tracking-wider block">
                              {c.wiz1Plan}
                            </span>
                            <strong className="text-sm font-agrandir-extrabold text-[#111111] dark:text-white">
                              {activePlan?.name || c.wiz1PlanFallback}
                            </strong>
                            <p className="text-xs text-black/55 dark:text-white/55 mt-0.5">
                              {c.wiz1PlanDesc}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base sm:text-lg font-agrandir-extrabold text-[#111111] dark:text-white font-mono tabular-nums">
                              {formattedPrice}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-base font-agrandir-extrabold text-[#111111] dark:text-white">
                            {c.wiz2Title}
                          </h4>
                          <p className="text-xs text-black/55 dark:text-white/55 mt-1">
                            {c.wiz2Sub}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-agrandir-semibold text-black/70 dark:text-white/75 block">
                              {c.wiz2Email}
                            </label>
                            <input
                              type="email"
                              value={applicantEmail}
                              onChange={(e) => setApplicantEmail(e.target.value)}
                              placeholder="email@domain.com"
                              required
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[10px] bg-[#F5F5F7] dark:bg-black border border-black/15 dark:border-white/[0.16] focus:border-black dark:focus:border-white text-[#111111] dark:text-white text-sm outline-none transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-agrandir-semibold text-black/70 dark:text-white/75 block">
                              {c.wiz2Phone}
                            </label>
                            <input
                              type="tel"
                              value={applicantPhone}
                              onChange={(e) => setApplicantPhone(e.target.value)}
                              placeholder="+225 07 00 00 00 00"
                              required
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[10px] bg-[#F5F5F7] dark:bg-black border border-black/15 dark:border-white/[0.16] focus:border-black dark:focus:border-white text-[#111111] dark:text-white text-sm outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-agrandir-semibold text-black/70 dark:text-white/75 block">
                              {c.wiz2City}
                            </label>
                            <input
                              type="text"
                              value={applicantCity}
                              onChange={(e) => setApplicantCity(e.target.value)}
                              placeholder="Abidjan"
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[10px] bg-[#F5F5F7] dark:bg-black border border-black/15 dark:border-white/[0.16] focus:border-black dark:focus:border-white text-[#111111] dark:text-white text-sm outline-none transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-agrandir-semibold text-black/70 dark:text-white/75 block">
                              {c.wiz2Address}
                            </label>
                            <input
                              type="text"
                              value={applicantAddress}
                              onChange={(e) => setApplicantAddress(e.target.value)}
                              placeholder="Cocody, Zone 4..."
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[10px] bg-[#F5F5F7] dark:bg-black border border-black/15 dark:border-white/[0.16] focus:border-black dark:focus:border-white text-[#111111] dark:text-white text-sm outline-none transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <form
                        id="black-card-checkout-form"
                        noValidate
                        onSubmit={handleCompleteAdmission}
                        className="space-y-5"
                      >
                        <div>
                          <h4 className="text-base font-agrandir-extrabold text-[#111111] dark:text-white">
                            {c.wiz3Title}
                          </h4>
                          <p className="text-xs text-black/55 dark:text-white/55 mt-1">
                            {c.wiz3Sub}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {c.wiz3Methods.map((m) => {
                            const isSelected = paymentMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setPaymentMethod(m.id as any)}
                                className={`relative min-h-[78px] p-3 rounded-[12px] border text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#111111] border-[#111111] text-white dark:bg-white dark:border-white dark:text-black'
                                    : 'bg-[#F5F5F7] border-black/10 text-black/75 hover:border-black/30 dark:bg-[#121212] dark:border-white/[0.12] dark:text-white/75 dark:hover:border-white/30'
                                }`}
                              >
                                {isSelected && (
                                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-white text-black dark:bg-black dark:text-white flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  </span>
                                )}
                                <div className="font-agrandir-extrabold text-xs sm:text-sm pr-5">
                                  {m.label}
                                </div>
                                <div
                                  className={`text-[11px] mt-1 ${
                                    isSelected
                                      ? 'text-white/70 dark:text-black/65'
                                      : 'text-black/45 dark:text-white/45'
                                  }`}
                                >
                                  {m.desc}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-[12px] bg-[#F5F5F7] dark:bg-[#121212] border border-black/[0.08] dark:border-white/[0.1] space-y-2.5 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-black/60 dark:text-white/60">
                              {c.wiz3Membership}
                            </span>
                            <span className="font-mono font-semibold text-[#111111] dark:text-white tabular-nums">
                              {formattedPrice}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-black/60 dark:text-white/60">
                              {c.wiz3CardDelivery}
                            </span>
                            <span className="font-agrandir-semibold text-[#111111] dark:text-white">
                              {c.wiz3Included}
                            </span>
                          </div>
                          <div className="pt-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 text-sm">
                            <span className="font-agrandir-extrabold text-[#111111] dark:text-white">
                              {c.wiz3Total}
                            </span>
                            <span className="font-agrandir-extrabold font-mono text-[#111111] dark:text-white tabular-nums">
                              {formattedPrice}
                            </span>
                          </div>
                        </div>
                      </form>
                    )}

                    {wizardStep === 4 && issuedResult && (
                      <div className="py-4 text-center space-y-5">
                        <div className="w-12 h-12 rounded-full bg-[#111111] text-white dark:bg-white dark:text-black flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" strokeWidth={1.8} />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50 block">
                            {c.wiz4Kicker}
                          </span>
                          <h4 className="font-agrandir-extrabold text-xl text-[#111111] dark:text-white">
                            {c.wiz4Title}
                          </h4>
                          <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 max-w-sm mx-auto leading-relaxed">
                            {c.wiz4Desc(issuedResult.card.cardNumber)}
                          </p>
                        </div>

                        <dl className="text-left rounded-[12px] bg-[#F5F5F7] dark:bg-[#121212] border border-black/[0.08] dark:border-white/[0.1] divide-y divide-black/[0.08] dark:divide-white/[0.1] text-xs px-4">
                          <div className="py-3 flex items-center justify-between gap-4">
                            <dt className="text-black/55 dark:text-white/55">{c.wiz4Holder}</dt>
                            <dd className="font-agrandir-bold text-[#111111] dark:text-white uppercase">
                              {issuedResult.card.cardholderName}
                            </dd>
                          </div>
                          <div className="py-3 flex items-center justify-between gap-4">
                            <dt className="text-black/55 dark:text-white/55">{c.wiz4Number}</dt>
                            <dd className="font-mono text-[#111111] dark:text-white">
                              {issuedResult.card.cardNumber}
                            </dd>
                          </div>
                          <div className="py-3 flex items-center justify-between gap-4">
                            <dt className="text-black/55 dark:text-white/55">{c.wiz4Physical}</dt>
                            <dd className="font-agrandir-semibold text-[#111111] dark:text-white">
                              {c.wiz4Prep}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    )}
                  </div>

                  {/* Pied fixe d’action */}
                  <div className="shrink-0 px-5 sm:px-6 py-4 border-t border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#0B0B0B]">
                    {wizardStep === 1 && (
                      <button
                        type="button"
                        onClick={handleWizardNextStep1}
                        className="w-full min-h-[48px] rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer lum-press"
                      >
                        {c.wiz1Next}
                      </button>
                    )}

                    {wizardStep === 2 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="min-h-[48px] px-5 rounded-full border border-black/15 dark:border-white/20 text-[#111111] dark:text-white font-agrandir-semibold text-sm transition-colors cursor-pointer"
                        >
                          {c.wiz2Back}
                        </button>
                        <button
                          type="button"
                          onClick={handleWizardNextStep2}
                          className="flex-1 min-h-[48px] rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer lum-press"
                        >
                          {c.wiz2Next}
                        </button>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          disabled={isSubmitting}
                          className="min-h-[48px] px-5 rounded-full border border-black/15 dark:border-white/20 text-[#111111] dark:text-white font-agrandir-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {c.wiz2Back}
                        </button>
                        <button
                          type="submit"
                          form="black-card-checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 min-h-[48px] rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer disabled:opacity-60 lum-press"
                        >
                          {isSubmitting ? c.wiz3Submitting : c.wiz3Submit}
                        </button>
                      </div>
                    )}

                    {wizardStep === 4 && (
                      <button
                        type="button"
                        onClick={() => finishAndOpenInstalledCard()}
                        className="w-full min-h-[48px] rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer lum-press"
                      >
                        {c.wiz4Cta}
                      </button>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
};
