import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import type { CardOrderContextData } from './LumareelCardOrderPage';
import { ArrowDown, ArrowRight } from 'lucide-react';
import {
  motion,
  MotionValue,
  useMotionValue,
  useMotionTemplate,
  useSpring,
  useScroll,
  useTransform,
  useReducedMotion,
} from 'framer-motion';

export const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
export const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

/** Garantit que toute mention « Black Card » affiche toujours « LUMARÉEL Black Card ». */
const ensureLumareelBlackCard = (text: string): string =>
  text.replace(/(?<!LUMAR[EÉ]EL\s)(black\s+card)/gi, 'LUMARÉEL Black Card');

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  onCardIssued?: (card: MembershipCard) => void;
  onStartOrder?: (context: CardOrderContextData) => void;
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
    heroCta: 'Découvrir la LUMARÉEL Black Card',
    ctaOrder: 'Obtenir ma LUMARÉEL Black Card',
    ctaViewMyCard: 'Voir ma LUMARÉEL Black Card',
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

    // Scène produit des 7 avantages
    perksKicker: 'Sept privilèges. Une seule carte.',
    hlParking: 'Votre place vous attend.',
    hlQueue: 'Pas de file. Jamais.',
    hlVip: 'Au premier rang.',
    hlDrink: 'Le temps de savourer.',
    hlPresale: 'Avant tout le monde.',
    hlMeet: 'Au plus près des artistes.',
    hlPartner: 'Au-delà du concert.',

    // Le portefeuille
    walletTitle: 'Elle trouve sa place.',
    walletTitleAfter: 'Toujours avec vous.',
    walletSub: 'Glissez-la dans votre portefeuille. À l’entrée, présentez-la. C’est tout.',

    // Climax émotionnel
    climaxTitle: 'La carte. L’entrée. Les premiers rangs.',
    climaxSub: 'Présentez simplement votre LUMARÉEL Black Card et vivez chaque instant.',

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
    heroCta: 'Discover the LUMARÉEL Black Card',
    ctaOrder: 'Get my LUMARÉEL Black Card',
    ctaViewMyCard: 'View my LUMARÉEL Black Card',
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

    perksKicker: 'Seven privileges. One card.',
    hlParking: 'Your spot is waiting.',
    hlQueue: 'No line. Ever.',
    hlVip: 'Front row.',
    hlDrink: 'Time to savor it.',
    hlPresale: 'Before everyone else.',
    hlMeet: 'Closer to the artists.',
    hlPartner: 'Beyond the concert.',

    walletTitle: 'It finds its place.',
    walletTitleAfter: 'Always with you.',
    walletSub: 'Slip it into your wallet. At the door, show it. That’s it.',

    climaxTitle: 'The card. The entrance. The front row.',
    climaxSub: 'Simply present your LUMARÉEL Black Card and step into the night.',

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
export const VolumetricBlackCard: React.FC<VolumetricBlackCardProps> = ({
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

/* ===================================================================== */
/* LUMIÈRE DE SCÈNE — effets 100 % produit (aucune photo)                 */
/* ===================================================================== */

/** Trame de points qui reprend le motif halftone imprimé sur la carte. */
export const HalftoneField: React.FC<{
  x?: MotionValue<number>;
  y?: MotionValue<number>;
  tone?: 'light' | 'dark';
  className?: string;
}> = ({ x, y, tone = 'light', className = '' }) => {
  const fx = useMotionValue(50);
  const fy = useMotionValue(45);
  const mx = x ?? fx;
  const my = y ?? fy;
  const mask = useMotionTemplate`radial-gradient(38% 42% at ${mx}% ${my}%, #000 0%, rgba(0,0,0,0.35) 45%, transparent 75%)`;
  const dot = tone === 'light' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.13)';
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `radial-gradient(circle, ${dot} 1.15px, transparent 1.7px)`,
        backgroundSize: '15px 15px',
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    />
  );
};

/** Faisceau de projecteur zénithal + halo au sol, piloté par MotionValues. */
export const StageBeam: React.FC<{
  x: MotionValue<number> | number;
  intensity?: MotionValue<number> | number;
  width?: number;
}> = ({ x, intensity = 1, width = 22 }) => {
  const fallback = useMotionValue(typeof x === 'number' ? x : 50);
  const bx = typeof x === 'number' ? fallback : x;
  const cone = useMotionTemplate`conic-gradient(from 180deg at ${bx}% -12%, transparent ${180 - width}deg, rgba(255,255,255,0.2) ${180 - width * 0.35}deg, rgba(255,255,255,0.34) 180deg, rgba(255,255,255,0.2) ${180 + width * 0.35}deg, transparent ${180 + width}deg)`;
  const pool = useMotionTemplate`radial-gradient(34% 10% at ${bx}% 86%, rgba(255,255,255,0.24) 0%, transparent 70%)`;
  const halo = useMotionTemplate`radial-gradient(30% 26% at ${bx}% 50%, rgba(255,255,255,0.07) 0%, transparent 70%)`;
  return (
    <motion.div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ opacity: intensity }}>
      <motion.div className="absolute inset-0 blur-[14px]" style={{ background: cone }} />
      <motion.div className="absolute inset-0" style={{ background: pool }} />
      <motion.div className="absolute inset-0" style={{ background: halo }} />
    </motion.div>
  );
};

/** Poussière lumineuse en suspension dans le faisceau. */
const DUST = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  top: 8 + ((i * 53) % 80),
  size: 1 + ((i * 7) % 3) * 0.6,
  dur: 7 + ((i * 13) % 9),
  delay: (i * 0.7) % 6,
}));

const LightDust: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();
  if (prefersReducedMotion) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {DUST.map((d, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.55, 0] }}
          transition={{ duration: d.dur, delay: d.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
};

/** Un avantage = un plan. Fondu calme + léger mouvement vertical. */
const PerkBeat: React.FC<{
  progress: MotionValue<number>;
  index: number;
  total: number;
  headline: string;
  title: string;
  desc: string;
}> = ({ progress, index, total, headline, title, desc }) => {
  const s = index / total;
  const e = (index + 1) / total;
  const f = 0.18 / total;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const opacity = useTransform(
    progress,
    [s, s + f, e - f, e],
    [isFirst ? 1 : 0, 1, 1, isLast ? 1 : 0]
  );
  const y = useTransform(progress, [s, s + f, e - f, e], [isFirst ? 0 : 14, 0, 0, isLast ? 0 : -14]);
  const blur = useTransform(progress, [s, s + f, e - f, e], [isFirst ? 0 : 4, 0, 0, isLast ? 0 : 4]);
  const filter = useMotionTemplate`blur(${blur}px)`;
  return (
    <motion.div style={{ opacity, y, filter }} className="absolute inset-0 flex flex-col items-center text-center">
      <h2 className="font-agrandir-extrabold text-[2.1rem] sm:text-6xl lg:text-[4.4rem] leading-[1.02] tracking-[-0.035em] text-white text-balance">
        {headline}
      </h2>
      <div className="mt-auto max-w-md">
        <h3 className="font-agrandir-semibold text-sm sm:text-base text-white">{title}</h3>
        <p className="mt-1.5 text-xs sm:text-sm text-white/55 leading-relaxed text-balance">{desc}</p>
      </div>
    </motion.div>
  );
};

const PerkDot: React.FC<{ progress: MotionValue<number>; index: number; total: number }> = ({
  progress,
  index,
  total,
}) => {
  const s = index / total;
  const e = (index + 1) / total;
  const width = useTransform(progress, [s - 0.001, s, e, e + 0.001], [6, 22, 22, 6]);
  const opacity = useTransform(progress, [s - 0.001, s, e, e + 0.001], [0.3, 1, 1, 0.3]);
  return <motion.span style={{ width, opacity }} className="block h-[6px] rounded-full bg-white" />;
};

/**
 * Porte-cartes en cuir rendu en CSS, en deux couches :
 * le dos passe derrière la carte, la poche passe devant.
 */
const WalletBack: React.FC = () => (
  <div className="absolute inset-0">
    <div className="absolute -bottom-6 left-[6%] right-[6%] h-10 rounded-[50%] bg-black/35 blur-2xl" />
    <div
      className="absolute inset-0 rounded-[22px] sm:rounded-[26px] overflow-hidden"
      style={{
        background: 'radial-gradient(120% 90% at 30% 10%, #2a2622 0%, #171513 55%, #0d0c0b 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 30px 60px rgba(0,0,0,0.35)',
      }}
    >
      <div className="absolute inset-[10px] rounded-[16px] border border-dashed border-white/[0.09]" />
    </div>
  </div>
);

const WalletPocket: React.FC<{ sheen?: MotionValue<string> }> = ({ sheen }) => (
  <div
    className="absolute left-0 right-0 bottom-0 h-[58%] rounded-b-[22px] sm:rounded-b-[26px] rounded-t-[4px] overflow-hidden"
    style={{
      background: 'linear-gradient(180deg, #221f1c 0%, #161412 60%, #0f0e0d 100%)',
      boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.1), 0 -10px 24px rgba(0,0,0,0.45)',
    }}
  >
    <div
      className="absolute inset-0 opacity-[0.35] mix-blend-overlay"
      style={{
        backgroundImage:
          'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0.6px, transparent 1px), radial-gradient(circle at 70% 60%, rgba(0,0,0,0.5) 0.6px, transparent 1px)',
        backgroundSize: '5px 5px, 7px 7px',
      }}
    />
    <div className="absolute inset-x-[10px] bottom-[10px] top-[12px] rounded-b-[16px] border border-dashed border-white/[0.1] border-t-0" />
    <span className="absolute bottom-[18%] left-1/2 -translate-x-1/2 font-agrandir-semibold text-[9px] sm:text-[11px] tracking-[0.42em] text-white/[0.16] whitespace-nowrap">
      LUMARÉEL
    </span>
    {sheen && <motion.div className="pointer-events-none absolute inset-0" style={{ background: sheen }} />}
  </div>
);

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
  onStartOrder,
  hasActiveCard = false,
}) => {
  const { showToast, language } = useApp();
  const isEn = language === 'en';
  const c = CARD_COPY[isEn ? 'en' : 'fr'];
  const prefersReducedMotion = useReducedMotion();

  // Interactive flip states
  const [cardFlipped, setCardFlipped] = useState(false);

  // Scroll targets
  const journeyRef = useRef<HTMLElement>(null);

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

  const frontAlt = isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto';
  const backAlt = isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso';

  // Ordre narratif d’une soirée : arrivée → entrée → scène → pause → avant/après
  const perkBeats = [
    { headline: c.hlParking, ...bParking },
    { headline: c.hlQueue, ...bQueue },
    { headline: c.hlVip, ...bVip },
    { headline: c.hlDrink, ...bDrink },
    { headline: c.hlPresale, ...bPresale },
    { headline: c.hlMeet, ...bMeet },
    { headline: c.hlPartner, ...bPartner },
  ];

  const heroTitleText = ensureLumareelBlackCard(
    (isEn ? cmsConfig?.heroTitleEn : cmsConfig?.heroTitleFr) || c.heroTitle
  );
  const heroSubText = ensureLumareelBlackCard(
    (isEn ? cmsConfig?.heroSubEn : cmsConfig?.heroSubFr) || c.heroSub
  );
  const ctaOrderText = ensureLumareelBlackCard(
    (isEn ? cmsConfig?.ctaOrderEn : cmsConfig?.ctaOrderFr) || c.ctaOrder
  );

  // =====================================================================
  // UNE SEULE CARTE, UN SEUL PLAN-SÉQUENCE — SCROLL DOUX ET PONDÉRÉ
  // Entrée → retournement (noir → blanc) → 7 avantages → portefeuille.
  // =====================================================================
  const { scrollYProgress: rawJourney } = useScroll({
    target: journeyRef,
    offset: ['start start', 'end end'],
  });
  const jp = useSpring(rawJourney, { stiffness: 62, damping: 28, mass: 0.88 });

  // Repères de phases (piste allongée pour que chaque petit scroll reste calme et maîtrisé)
  const P0 = 0.29; // début des avantages
  const P1 = 0.72; // fin des avantages
  const PERK_TOTAL = 7;
  const perkSpan = (P1 - P0) / PERK_TOTAL;
  const perkCenters = Array.from({ length: PERK_TOTAL }, (_, i) => P0 + (i + 0.5) * perkSpan);

  // Orientation douce et maîtrisée de la carte
  const cardRotY = useTransform(
    jp,
    [0, 0.08, 0.12, 0.18, 0.23, 0.28, ...perkCenters, 0.75, 1],
    [-10, 0, 0, 180, 180, 360, 348, 370, 352, 372, 350, 370, 360, 360, 360]
  );
  const cardRotX = useTransform(
    jp,
    [0, 0.08, 0.28, ...perkCenters, 0.75, 0.86, 0.94, 1],
    [7, 1.5, 0, 6, -4, 5, -3, 4, -4, 1.5, 0, 3, 0, 0]
  );
  const cardRotZ = useTransform(
    jp,
    [0, 0.08, 0.28, ...perkCenters, 0.78, 0.85, 0.93, 1],
    [-1.5, 0, 0, -1.5, 1.5, -1, 1.2, -1.2, 0.8, 0, 0, -4, 0, 0]
  );
  const cardSheen = useTransform(
    jp,
    [0, 0.28, 0.281, P1, P1 + 0.001, 1],
    [-35, 145, -35, 145, -35, 145]
  );

  // Placement de l’ensemble carte + portefeuille dans le cadre
  const rigYv = useTransform(jp, [0, 0.08, 0.12, 0.28, 0.31, P1, 0.78, 1], [-11, -11, -7, -7, 1, 1, -10, -10]);
  const rigY = useMotionTemplate`${rigYv}vh`;
  const rigScale = useTransform(jp, [0, 0.08, 0.12, 0.28, 0.31, P1, 0.78, 1], [1, 1, 1.04, 1.04, 0.96, 0.96, 0.8, 0.8]);

  // La carte se soulève doucement puis glisse directement dans l’étui en cuir
  const cardSlideV = useTransform(jp, [0, 0.76, 0.84, 0.94, 1], [0, 0, -20, 69.5, 69.5]);
  const cardSlide = useMotionTemplate`${cardSlideV}%`;

  // Le portefeuille monte dans le cadre + léger clic tactile à l’insertion
  const walletYv = useTransform(jp, [0.72, 0.81], [70, 0]);
  const walletY = useMotionTemplate`${walletYv}vh`;
  const walletOpacity = useTransform(jp, [0.72, 0.77], [0, 1]);
  const walletClickScale = useTransform(jp, [0.93, 0.946, 0.968], [1, 1.016, 1]);
  const walletSheenX = useTransform(jp, [0.82, 0.98], [-30, 140]);
  const leatherSheen = useMotionTemplate`linear-gradient(105deg, transparent calc(${walletSheenX}% - 20%), rgba(255,255,255,0.09) ${walletSheenX}%, transparent calc(${walletSheenX}% + 20%))`;

  // Environnements
  const heroLayerOpacity = useTransform(jp, [0, 0.045, 0.085], [1, 1, 0]);
  const heroLayerY = useTransform(jp, [0, 0.085], [0, -24]);
  const whiteOpacity = useTransform(jp, [0.09, 0.14, 0.265, 0.3], [0, 1, 1, 0]);
  const perkFxOpacity = useTransform(jp, [0.275, 0.31, 0.7, 0.74], [0, 1, 1, 0]);
  const beigeOpacity = useTransform(jp, [0.71, 0.77], [0, 1]);

  // Les trois temps du retournement
  const beat1Opacity = useTransform(jp, [0.11, 0.135, 0.165, 0.185], [0, 1, 1, 0]);
  const beat2Opacity = useTransform(jp, [0.18, 0.2, 0.225, 0.245], [0, 1, 1, 0]);
  const beat3Opacity = useTransform(jp, [0.24, 0.26, 0.275, 0.295], [0, 1, 1, 0]);

  // Les avantages
  const perksGroupOpacity = useTransform(jp, [0.285, 0.305, 0.71, 0.73], [0, 1, 1, 0]);
  const perkProgress = useTransform(jp, [P0, P1], [0, 1]);
  const beamX = useTransform(jp, [P0, ...perkCenters, P1], [34, 34, 66, 50, 38, 62, 50, 50, 50]);
  const halftoneX = useTransform(jp, [P0, P1], [20, 80]);

  // Le portefeuille
  const walletLine1Opacity = useTransform(jp, [0.74, 0.78, 0.895, 0.92], [0, 1, 1, 0]);
  const walletLine2Opacity = useTransform(jp, [0.925, 0.955, 1], [0, 1, 1]);
  const walletLine2Y = useTransform(jp, [0.925, 0.955], [14, 0]);

  const scrollToJourney = (fraction: number) => {
    const el = journeyRef.current;
    if (!el || typeof window === 'undefined') return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + travel * fraction, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  // Données de formule existantes (conservées intactes)
  const [, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

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
          ? 'New LUMARÉEL Black Card memberships are temporarily paused.'
          : 'Les nouvelles adhésions LUMARÉEL Black Card sont temporairement suspendues.',
        'info'
      );
    } else {
      onStartOrder?.({
        frontImageUrl: cardFrontUrl,
        backImageUrl: cardBackUrl,
        priceAmount: Number(planPrice),
        currency: planCurrency,
        plan: activePlan,
        benefits: perkBeats.map((b) => ({ title: b.title, desc: b.desc })),
      });
    }
  };


  return (
    <div className="w-full overflow-x-clip bg-black text-white font-agrandir-regular">
      {/* =================================================================== */}
      {/* PLAN-SÉQUENCE — UNE SEULE CARTE DU DÉBUT À LA POCHE                 */}
      {/* =================================================================== */}
      {prefersReducedMotion ? (
        <section ref={journeyRef} className="w-full bg-black text-white px-5 sm:px-8 pt-14 pb-24">
          <div className="max-w-[960px] mx-auto flex flex-col items-center text-center">
            <span className="text-[11px] font-agrandir-semibold uppercase tracking-[0.28em] text-white/55">
              {c.brandSignature}
            </span>
            <div className="mt-10 w-full max-w-[420px]">
              <VolumetricBlackCard
                manualFlipped={cardFlipped}
                onToggleFlip={() => setCardFlipped((prev) => !prev)}
                shadowTone="dark"
                frontImageUrl={cardFrontUrl}
                backImageUrl={cardBackUrl}
                ariaLabel={c.flipHint}
                frontAlt={frontAlt}
                backAlt={backAlt}
              />
            </div>
            <h1 className="mt-12 font-agrandir-extrabold text-4xl sm:text-6xl tracking-[-0.03em] text-balance">{heroTitleText}</h1>
            <p className="mt-4 text-base sm:text-lg text-white/60 max-w-xl">{heroSubText}</p>
            <div className="mt-16 w-full divide-y divide-white/10 border-y border-white/10 text-left">
              {perkBeats.map((p) => (
                <div key={p.title} className="py-7 grid sm:grid-cols-2 gap-3">
                  <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-[-0.025em]">{p.headline}</h2>
                  <div>
                    <h3 className="font-agrandir-semibold text-base">{p.title}</h3>
                    <p className="mt-1.5 text-sm text-white/60">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-12 text-base text-white/60">{c.walletSub}</p>
          </div>
        </section>
      ) : (
        <section ref={journeyRef} className="relative w-full h-[960vh] sm:h-[1080vh] bg-black">
          <div className="sticky top-0 h-[100svh] w-full overflow-hidden text-white">
            {/* ---------- Environnements ---------- */}
            <motion.div
              aria-hidden="true"
              style={{ opacity: heroLayerOpacity }}
              className="pointer-events-none absolute inset-0"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.4, ease: EASE_CINEMA }}
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(58% 46% at 50% 36%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.025) 42%, rgba(0,0,0,0) 74%)',
                }}
              />
            </motion.div>

            <motion.div
              aria-hidden="true"
              style={{ opacity: whiteOpacity }}
              className="pointer-events-none absolute inset-0 bg-white"
            >
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(50% 42% at 50% 45%, rgba(0,0,0,0.04) 0%, rgba(255,255,255,0) 70%)' }}
              />
            </motion.div>

            <motion.div aria-hidden="true" style={{ opacity: perkFxOpacity }} className="pointer-events-none absolute inset-0">
              <HalftoneField x={halftoneX} tone="light" className="opacity-60" />
              <StageBeam x={beamX} />
              <LightDust />
            </motion.div>

            <motion.div
              aria-hidden="true"
              style={{ opacity: beigeOpacity }}
              className="pointer-events-none absolute inset-0 bg-[#efebe4]"
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(60% 55% at 28% 18%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%), radial-gradient(70% 50% at 50% 100%, rgba(0,0,0,0.06) 0%, transparent 70%)',
                }}
              />
              <HalftoneField tone="dark" className="opacity-50" />
            </motion.div>

            {/* ---------- Textes ---------- */}
            {/* Entrée */}
            <motion.div
              style={{ opacity: heroLayerOpacity, y: heroLayerY }}
              className="absolute inset-0 z-30 flex flex-col items-center justify-between px-5 sm:px-8 pt-[7vh] pb-[7vh] text-center pointer-events-none"
            >
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE_CINEMA }}
                className="text-[11px] sm:text-xs font-agrandir-semibold uppercase tracking-[0.28em] text-white/55"
              >
                {c.brandSignature}
              </motion.span>

              <div className="flex flex-col items-center">
                <div className="overflow-hidden">
                  <motion.h1
                    initial={{ y: '105%', opacity: 0 }}
                    animate={{ y: '0%', opacity: 1 }}
                    transition={{ duration: 0.9, delay: 0.3, ease: EASE_CINEMA }}
                    className="font-agrandir-extrabold text-[2.15rem] sm:text-5xl lg:text-[3.85rem] leading-[1.03] tracking-[-0.03em] text-white text-balance"
                  >
                    {heroTitleText}
                  </motion.h1>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.85, delay: 0.45, ease: EASE_CINEMA }}
                  className="mt-3 text-sm sm:text-lg text-white/62 leading-relaxed max-w-xl text-balance"
                >
                  {heroSubText}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.58, ease: EASE_CINEMA }}
                  className="mt-6 pointer-events-auto"
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
                      onClick={() => scrollToJourney(0.14)}
                      className="min-h-[50px] px-8 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm sm:text-[15px] inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
                    >
                      <span>{c.heroCta}</span>
                      <ArrowDown className="w-4 h-4" strokeWidth={2} />
                    </button>
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Retournement — trois temps en bas du cadre */}
            {[
              { o: beat1Opacity, t: c.beat1Title, s: c.beat1Sub },
              { o: beat2Opacity, t: c.beat2Title, s: c.beat2Sub },
              { o: beat3Opacity, t: c.beat3Title, s: c.beat3Sub },
            ].map((b) => (
              <motion.div
                key={b.t}
                style={{ opacity: b.o }}
                className="absolute inset-x-0 bottom-[9vh] z-30 px-5 sm:px-8 flex flex-col items-center text-center pointer-events-none"
              >
                <h2 className="font-agrandir-extrabold text-2xl sm:text-4xl tracking-[-0.025em] text-[#111111] text-balance max-w-2xl">
                  {b.t}
                </h2>
                <p className="mt-2.5 text-sm sm:text-base text-black/58 leading-relaxed max-w-md text-balance">{b.s}</p>
              </motion.div>
            ))}

            {/* Avantages — titre en haut, détail en bas */}
            <motion.div
              style={{ opacity: perksGroupOpacity }}
              className="absolute inset-0 z-30 flex flex-col items-center px-5 sm:px-8 pt-[8vh] pb-[5vh] pointer-events-none"
            >
              <span className="text-[10px] sm:text-[11px] font-agrandir-semibold uppercase tracking-[0.3em] text-white/45">
                {c.perksKicker}
              </span>
              <div className="relative mt-4 sm:mt-6 w-full max-w-[1100px] flex-1">
                {perkBeats.map((p, i) => (
                  <PerkBeat
                    key={p.title}
                    progress={perkProgress}
                    index={i}
                    total={PERK_TOTAL}
                    headline={p.headline}
                    title={p.title}
                    desc={p.desc}
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center gap-1.5">
                {perkBeats.map((p, i) => (
                  <PerkDot key={p.title} progress={perkProgress} index={i} total={PERK_TOTAL} />
                ))}
              </div>
            </motion.div>

            {/* Portefeuille */}
            <div className="absolute inset-x-0 top-[9vh] z-30 h-[80px] px-5 text-center text-[#111111] pointer-events-none">
              <motion.h2
                style={{ opacity: walletLine1Opacity }}
                className="absolute inset-x-0 font-agrandir-extrabold text-[2rem] sm:text-6xl leading-[1.02] tracking-[-0.035em] text-balance"
              >
                {c.walletTitle}
              </motion.h2>
              <motion.h2
                style={{ opacity: walletLine2Opacity, y: walletLine2Y }}
                className="absolute inset-x-0 font-agrandir-extrabold text-[2rem] sm:text-6xl leading-[1.02] tracking-[-0.035em] text-balance"
              >
                {c.walletTitleAfter}
              </motion.h2>
            </div>
            <motion.p
              style={{ opacity: walletLine2Opacity }}
              className="absolute inset-x-0 bottom-[8vh] z-30 px-5 text-center text-sm sm:text-lg text-black/55 text-balance pointer-events-none"
            >
              {c.walletSub}
            </motion.p>

            {/* ---------- LA carte (unique) + le portefeuille ---------- */}
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <motion.div
                style={{ y: rigY, scale: rigScale }}
                className="relative w-[min(76vw,440px,66vh)]"
              >
                {/* Dos du portefeuille — derrière la carte */}
                <motion.div
                  aria-hidden="true"
                  className="absolute z-0"
                  style={{
                    top: '60%',
                    left: '-8.14%',
                    width: '116.28%',
                    aspectRatio: '100 / 74',
                    y: walletY,
                    opacity: walletOpacity,
                    scale: walletClickScale,
                  }}
                >
                  <WalletBack />
                </motion.div>

                {/* La carte */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, rotateX: 16 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  transition={{ duration: 1.15, delay: 0.12, ease: EASE_CINEMA }}
                  style={{ y: cardSlide }}
                  className="relative z-10 pointer-events-auto"
                >
                  <VolumetricBlackCard
                    rotateYBase={cardRotY}
                    rotateXBase={cardRotX}
                    rotateZBase={cardRotZ}
                    sheenX={cardSheen}
                    manualFlipped={cardFlipped}
                    onToggleFlip={() => setCardFlipped((prev) => !prev)}
                    shadowTone="dark"
                    openingSweep
                    frontImageUrl={cardFrontUrl}
                    backImageUrl={cardBackUrl}
                    ariaLabel={c.flipHint}
                    frontAlt={frontAlt}
                    backAlt={backAlt}
                  />
                </motion.div>

                {/* Poche du portefeuille — devant la carte */}
                <motion.div
                  aria-hidden="true"
                  className="absolute z-20 pointer-events-none"
                  style={{
                    top: '60%',
                    left: '-8.14%',
                    width: '116.28%',
                    aspectRatio: '100 / 74',
                    y: walletY,
                    opacity: walletOpacity,
                    scale: walletClickScale,
                  }}
                >
                  <WalletPocket sheen={leatherSheen} />
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* =================================================================== */}
      {/* ACQUISITION — CALME, CLAIRE, SANS PRESSION (Galerie Blanche)        */}
      {/* =================================================================== */}
      <section className="w-full bg-[#efebe4] text-[#111111] pt-16 sm:pt-24 pb-28 lg:pb-32 px-5 sm:px-8">
        <div className="w-full max-w-[960px] mx-auto">
          <div className="grid grid-cols-1 gap-10 items-center pb-14 border-b border-black/10">
            <div className="space-y-5 flex flex-col items-center text-center">
              <MaskedReveal>
                <h2 className="font-agrandir-extrabold text-3xl sm:text-5xl leading-[1.04] tracking-[-0.028em] text-[#111111]">
                  {c.offerTitle}
                </h2>
              </MaskedReveal>

              <p className="text-base sm:text-lg text-black/60 leading-relaxed max-w-md mx-auto">
                {c.offerSub}
              </p>

              <div className="pt-2 flex flex-wrap items-baseline justify-center gap-2.5">
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
    </div>
  );
};
