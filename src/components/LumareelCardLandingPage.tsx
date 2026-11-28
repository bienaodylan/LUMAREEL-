import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import { saveStoredMemberCard } from '../utils/memberCardStorage';
import {
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  Coffee,
  Crown,
  Minus,
  RotateCw,
  Sparkles,
  Tag,
  Ticket,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  onCardIssued?: (card: MembershipCard) => void;
  hasActiveCard?: boolean;
  activeCardNumber?: string;
}

const PERK_ICONS = [Zap, Car, Crown, Coffee, Ticket, Users, Tag] as const;

const CARD_COPY = {
  fr: {
    // 1. Présentation de la carte (inspiration Monzo : direct, simple, humain)
    eyebrow: 'LUMARÉEL BLACK CARD',
    heroTitle: 'Ta carte pour vivre chaque concert au premier rang.',
    heroSub:
      'Finie l’attente dans la file. Tu arrives, tu passes devant, tu profites de la soirée comme un invité spécial — du parking jusqu’au premier rang.',
    flipHintFront: 'Toucher la carte pour voir l’arrière',
    flipHintBack: 'Toucher la carte pour voir l’avant',
    priceSuffix: '/ an',
    ctaPrimary: 'Prendre ma carte',
    ctaViewMyCard: 'Voir ma carte',
    quickNote: 'Active tout de suite dans l’app · Ta vraie carte remise en main propre',

    // 2. Avantages (les 7 avantages exacts demandés)
    benefitsTitle: 'Tes 7 avantages inclus',
    benefitsSub: 'Tout ce qui change pour toi dès que tu as ta carte.',
    perksList: [
      {
        title: 'Accès prioritaire dans la file d’attente',
        desc: 'Tu entres par le passage rapide, sans faire la queue comme tout le monde.',
      },
      {
        title: 'Place de parking réservée',
        desc: 'Ta place t’attend déjà à ton arrivée. Zéro stress pour te garer.',
      },
      {
        title: 'Placement VIP au premier rang',
        desc: 'Tu es au plus près de la scène pour profiter à fond du spectacle.',
      },
      {
        title: 'Rafraîchissement offert',
        desc: 'Une boisson t’est offerte pour profiter tranquillement de ta soirée.',
      },
      {
        title: 'Accès aux préventes',
        desc: 'Tu peux réserver tes billets avant tout le monde, avant que ça parte.',
      },
      {
        title: 'Accès au meet and greet',
        desc: 'Tu rencontres les artistes de près et tu gardes un vrai souvenir.',
      },
      {
        title: 'Réduction sur des articles de nos partenaires',
        desc: 'Tu profites de prix réduits chez nos marques et boutiques partenaires.',
      },
    ],

    // 3. Détails de la carte (Zéro jargon technique)
    detailsTitle: 'Les détails de ta carte, tout simplement',
    detailsSub: 'Pas de mots compliqués : voici comment ça marche dans la vraie vie.',
    detailsList: [
      {
        title: 'Prête tout de suite sur ton téléphone',
        desc: 'Dès que tu valides, ta carte apparaît ici dans l’application. Tu peux déjà l’utiliser.',
      },
      {
        title: 'Ta vraie carte dans ta main',
        desc: 'En plus de l’app, notre équipe prépare ta carte personnelle et te la remet directement.',
      },
      {
        title: 'Super simple le jour du concert',
        desc: 'Tu la montres juste à ton arrivée pour le parking, l’entrée rapide et ton accès VIP.',
      },
      {
        title: 'Un seul tarif pour 12 mois',
        desc: 'Tu paies une fois pour toute l’année, sans mauvaise surprise. C’est ta carte de membre LUMARÉEL, pas une carte bancaire.',
      },
    ],

    finalTitle: 'Prêt à prendre ta place au premier rang ?',
    finalSub: 'Active ta carte maintenant et retrouve-la aussitôt dans ton espace.',
    footnote: 'Paiement par Mobile Money ou carte · Aucun frais caché',

    // Tunnel d’adhésion (langage simple et familier, zéro jargon)
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
    eyebrow: 'LUMARÉEL BLACK CARD',
    heroTitle: 'Your card to live every show from the front row.',
    heroSub:
      'Skip the lines and enjoy every night like a special guest — from your reserved parking spot right to the front row.',
    flipHintFront: 'Tap the card to see the back',
    flipHintBack: 'Tap the card to see the front',
    priceSuffix: '/ year',
    ctaPrimary: 'Get my card',
    ctaViewMyCard: 'View my card',
    quickNote: 'Active right away in the app · Plus your real card handed to you',

    benefitsTitle: 'Your 7 included perks',
    benefitsSub: 'Everything that changes for you the moment you get your card.',
    perksList: [
      {
        title: 'Priority queue access',
        desc: 'Walk straight through the fast lane without waiting in line.',
      },
      {
        title: 'Reserved parking spot',
        desc: 'Your space is waiting when you arrive. No parking stress.',
      },
      {
        title: 'Front-row VIP seating',
        desc: 'Stay right up close to the stage for the best view in the house.',
      },
      {
        title: 'Complimentary refreshment',
        desc: 'Enjoy a drink on us so you can relax and soak in the night.',
      },
      {
        title: 'Presale access',
        desc: 'Book your tickets before everyone else, before they sell out.',
      },
      {
        title: 'Meet & greet access',
        desc: 'Meet the artists up close and take home an unforgettable moment.',
      },
      {
        title: 'Discounts with our partners',
        desc: 'Save on items and offers from our partner brands and shops.',
      },
    ],

    detailsTitle: 'Card details, kept simple',
    detailsSub: 'No confusing jargon — just how it works in everyday life.',
    detailsList: [
      {
        title: 'Ready right away on your phone',
        desc: 'As soon as you join, your card shows up right here in the app ready to use.',
      },
      {
        title: 'Your real card in your hand',
        desc: 'On top of the app, our team prepares your personal card and hands it to you directly.',
      },
      {
        title: 'Effortless on concert day',
        desc: 'Just show it when you arrive for parking, fast entry, and your VIP seat.',
      },
      {
        title: 'One clear price for 12 months',
        desc: 'Pay once for the whole year with no hidden fees. It is your LUMARÉEL member card, not a bank card.',
      },
    ],

    finalTitle: 'Ready for your spot in the front row?',
    finalSub: 'Activate your card now and find it right here in your space.',
    footnote: 'Pay with Mobile Money or card · No hidden fees',

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

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
  onCardIssued,
  hasActiveCard = false,
}) => {
  const { currentUser, setCurrentPage, showToast, language, setIsAuthModalOpen } = useApp();
  const isEn = language === 'en';
  const c = CARD_COPY[isEn ? 'en' : 'fr'];
  const prefersReducedMotion = useReducedMotion();

  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Données de formule
  const [, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Tunnel de commande en 4 étapes
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
      await new Promise((resolve) => setTimeout(resolve, 480));
      const issuedCard = buildClientFallbackCard(planId);

      saveStoredMemberCard(issuedCard, currentUser?.email);
      setIssuedResult({ card: issuedCard, qrDataUrl: '' });
      setWizardStep(4);
      showToast(c.toastActivated, 'success');
    } catch (err: any) {
      showToast(err?.message || c.toastOrderErr, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activePlan = selectedPlan || plans[0] || null;
  const planPrice = activePlan?.price ?? 50000;
  const planCurrency = activePlan?.currency || 'FCFA';
  const formattedPrice = `${Number(planPrice).toLocaleString(
    language === 'en' ? 'en-US' : 'fr-FR'
  )} ${planCurrency}`;

  return (
    <div className="w-full bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white font-agrandir-regular transition-colors duration-200">
      {/* =================================================================== */}
      {/* 1. PRÉSENTATION DE LA CARTE — Style Monzo (clair, direct, centré)   */}
      {/* =================================================================== */}
      <section className="w-full max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-10 pt-8 sm:pt-14 pb-16 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Visuel officiel de la carte (recto / verso, coins réalistes 10-11px) */}
          <div className="lg:col-span-6 lg:order-2 flex flex-col items-center">
            <div className="relative w-full max-w-[380px] sm:max-w-[430px]">
              {/* Halo neutre très discret */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 rounded-full bg-black/[0.06] dark:bg-white/[0.07] blur-3xl"
              />

              <motion.div
                onClick={() => setIsCardFlipped((prev) => !prev)}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.985 }}
                className="relative z-10 w-full cursor-pointer perspective-[1400px]"
                style={{ aspectRatio: '85.6 / 53.98' }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsCardFlipped((prev) => !prev);
                  }
                }}
                aria-label={isEn ? 'Flip the LUMARÉEL Black Card' : 'Retourner la LUMARÉEL Black Card'}
              >
                <motion.div
                  animate={{ rotateY: isCardFlipped ? 180 : 0 }}
                  transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* RECTO OFFICIEL */}
                  <div
                    className="absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-black ring-1 ring-black/15 dark:ring-white/15 shadow-[0_26px_60px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_70px_rgba(0,0,0,0.92)] overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                    }}
                  >
                    <img
                      src={CARD_FRONT_IMG}
                      alt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* VERSO OFFICIEL */}
                  <div
                    className="absolute inset-0 rounded-[10px] sm:rounded-[11px] bg-black ring-1 ring-black/15 dark:ring-white/15 shadow-[0_26px_60px_rgba(0,0,0,0.22)] dark:shadow-[0_28px_70px_rgba(0,0,0,0.92)] overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <img
                      src={CARD_BACK_IMG}
                      alt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* Indication sobre pour retourner la carte */}
            <button
              type="button"
              onClick={() => setIsCardFlipped((prev) => !prev)}
              className="mt-4 inline-flex items-center gap-2 text-xs text-black/55 hover:text-black dark:text-white/55 dark:hover:text-white transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={1.7} />
              <span>{isCardFlipped ? c.flipHintBack : c.flipHintFront}</span>
            </button>
          </div>

          {/* Accroche & CTA Monzo-style */}
          <div className="lg:col-span-6 lg:order-1 space-y-6 text-center lg:text-left">
            <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-black/50 dark:text-white/50">
              {c.eyebrow}
            </p>

            <h1 className="font-agrandir-extrabold text-[2.25rem] sm:text-5xl lg:text-[3.35rem] leading-[1.03] tracking-tight text-[#111111] dark:text-white">
              {c.heroTitle}
            </h1>

            <p className="text-base sm:text-lg text-black/65 dark:text-white/70 leading-relaxed max-w-xl mx-auto lg:mx-0">
              {c.heroSub}
            </p>

            {/* Tarif + CTA principal Noir & Blanc */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {hasActiveCard ? (
                <button
                  type="button"
                  onClick={() => onGoToWallet?.()}
                  className="w-full sm:w-auto min-h-[54px] px-8 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-all cursor-pointer lum-press"
                >
                  <span>{c.ctaViewMyCard}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(activePlan || undefined)}
                  className="w-full sm:w-auto min-h-[54px] px-8 rounded-full bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-all cursor-pointer lum-press"
                >
                  <span>{c.ctaPrimary}</span>
                  <ArrowRight className="w-4 h-4" strokeWidth={2} />
                </button>
              )}

              <div className="flex items-baseline gap-1.5 text-[#111111] dark:text-white">
                <span className="font-agrandir-extrabold text-xl sm:text-2xl tabular-nums tracking-tight">
                  {loading ? '...' : formattedPrice}
                </span>
                <span className="text-xs sm:text-sm text-black/55 dark:text-white/55">
                  {c.priceSuffix}
                </span>
              </div>
            </div>

            <p className="text-xs text-black/50 dark:text-white/50">{c.quickNote}</p>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. AVANTAGES — Les 7 avantages exacts, clairs et lisibles           */}
      {/* =================================================================== */}
      <section className="w-full border-t border-black/[0.08] dark:border-white/[0.1] bg-[#F3F3F5] dark:bg-[#0A0A0A] transition-colors duration-200">
        <div className="w-full max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-24 space-y-10 sm:space-y-12">
          <div className="max-w-2xl space-y-2.5">
            <h2 className="font-agrandir-extrabold text-2xl sm:text-4xl tracking-tight text-[#111111] dark:text-white">
              {c.benefitsTitle}
            </h2>
            <p className="text-sm sm:text-base text-black/60 dark:text-white/60 leading-relaxed">
              {c.benefitsSub}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {c.perksList.map((perk, idx) => {
              const Icon = PERK_ICONS[idx % PERK_ICONS.length];
              return (
                <div
                  key={perk.title}
                  className="p-6 rounded-[18px] bg-white dark:bg-[#121212] border border-black/[0.07] dark:border-white/[0.08] flex flex-col justify-between gap-4 transition-colors"
                >
                  <div className="w-10 h-10 rounded-[12px] bg-[#111111] text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" strokeWidth={1.8} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="font-agrandir-extrabold text-base sm:text-[17px] text-[#111111] dark:text-white leading-snug">
                      {perk.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-black/60 dark:text-white/60 leading-relaxed">
                      {perk.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. DÉTAILS DE LA CARTE — Zéro terme technique, tout en simplicité   */}
      {/* =================================================================== */}
      <section className="w-full border-t border-black/[0.08] dark:border-white/[0.1] bg-[#FBFBFD] dark:bg-black transition-colors duration-200">
        <div className="w-full max-w-[1120px] mx-auto px-5 sm:px-8 lg:px-10 py-16 sm:py-24 space-y-12">
          <div className="max-w-2xl space-y-2.5">
            <h2 className="font-agrandir-extrabold text-2xl sm:text-4xl tracking-tight text-[#111111] dark:text-white">
              {c.detailsTitle}
            </h2>
            <p className="text-sm sm:text-base text-black/60 dark:text-white/60 leading-relaxed">
              {c.detailsSub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-2 border-t border-black/[0.08] dark:border-white/[0.1]">
            {c.detailsList.map((detail, idx) => (
              <div
                key={detail.title}
                className="py-6 border-b border-black/[0.08] dark:border-white/[0.1] flex items-start gap-4"
              >
                <span className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-[#111111] dark:text-white font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                  {idx + 1}
                </span>
                <div className="space-y-1.5 min-w-0">
                  <h3 className="font-agrandir-extrabold text-base text-[#111111] dark:text-white leading-snug">
                    {detail.title}
                  </h3>
                  <p className="text-sm text-black/60 dark:text-white/60 leading-relaxed">
                    {detail.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bloc final de conversion Monzo-style (contraste inversé Noir / Blanc) */}
          <div className="rounded-[24px] bg-[#111111] text-white dark:bg-[#121212] dark:border dark:border-white/[0.12] px-6 sm:px-10 py-10 sm:py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-[11px] font-agrandir-semibold uppercase tracking-[0.2em] text-white/60">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={1.7} />
                <span>{formattedPrice} {c.priceSuffix}</span>
              </div>
              <h3 className="font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-white">
                {c.finalTitle}
              </h3>
              <p className="text-sm text-white/70 leading-relaxed">{c.finalSub}</p>
            </div>

            <div className="w-full md:w-auto flex flex-col items-stretch md:items-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => openAdmissionWizard(activePlan || undefined)}
                className="w-full md:w-auto min-h-[52px] px-8 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-colors cursor-pointer lum-press"
              >
                <span>{c.ctaPrimary}</span>
                <ArrowRight className="w-4 h-4" strokeWidth={2} />
              </button>
              <span className="text-[11px] text-white/55 text-center md:text-right">
                {c.footnote}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* TUNNEL D’ACTIVATION EN 4 ÉTAPES — Noir & Blanc, Clair / Sombre      */}
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
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
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
