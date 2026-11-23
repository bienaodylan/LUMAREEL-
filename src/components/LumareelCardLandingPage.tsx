import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import { saveStoredMemberCard } from '../utils/memberCardStorage';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Lock,
  Maximize2,
  Minus,
  RotateCw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import heroBlackCardBannerImg from '../assets/images/dark_card_hero_backdrop_1795099845525.jpg';

const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  onCardIssued?: (card: MembershipCard) => void;
  hasActiveCard?: boolean;
  activeCardNumber?: string;
}

const CARD_COPY = {
  fr: {
    eyebrow: 'LUMARÉEL BLACK CARD',
    heroTitle1: 'VOS CONCERTS',
    heroTitle2: 'ENTRE VOS MAINS.',
    heroSub:
      'Coupe-file, parking réservé, premiers rangs VIP, boisson offerte, préventes, Meet & Greet et réductions partenaires — tout dans une seule carte.',
    ctaPrimary: 'Prendre ma LUMARÉEL Black Card',
    ctaSecondary: 'Voir les 8 avantages',
    syncProof: (q: number) => `${q} cartes dispo · 8 avantages inclus`,
    flipHint: 'Touchez la carte pour la retourner',
    verified: 'CARTE OFFICIELLE',
    // Section 2: Pure editorial photo story (no heavy boxes)
    img1Kicker: 'DÈS VOTRE ARRIVÉE',
    img1Title: 'Parking réservé & coupe-file',
    img1Desc: 'Votre place est gardée près de la salle et vous passez devant la file à l’entrée.',
    img2Kicker: 'DEVANT LA SCÈNE',
    img2Title: 'Premiers rangs, boisson & Meet & Greet',
    img2Desc: 'Les meilleures places VIP, un rafraîchissement offert et les rencontres avec les artistes.',
    // Section 3: Clean open editorial list of all 8 perks
    benefitsKicker: 'VOS 8 AVANTAGES',
    benefitsTitle: 'Tout ce qui est inclus avec la carte.',
    benefitsSub: 'Huit vrais avantages, utilisables dès que votre carte est active.',
    perksList: [
      {
        num: '01',
        title: 'Accès prioritaire dans la file d’attente',
        desc: 'Vous passez devant tout le monde à l’entrée, sans attendre.',
      },
      {
        num: '02',
        title: 'Place de parking réservée',
        desc: 'Une place vous attend déjà tout près de la salle pour arriver tranquille.',
      },
      {
        num: '03',
        title: 'Placement VIP aux premiers rangs',
        desc: 'Les meilleures places, juste devant la scène et au plus près des artistes.',
      },
      {
        num: '04',
        title: 'Rafraîchissement offert',
        desc: 'Une boisson offerte sur place pour profiter à fond de votre soirée.',
      },
      {
        num: '05',
        title: 'Accès aux préventes',
        desc: 'Vous réservez vos billets avant l’ouverture au grand public.',
      },
      {
        num: '06',
        title: 'Accès aux Meet & Greet',
        desc: 'Rencontrez les artistes en privé avant ou après le concert.',
      },
      {
        num: '07',
        title: 'Réduction sur les articles partenaires',
        desc: 'Des prix réduits sur les articles et collections de nos partenaires.',
      },
      {
        num: '08',
        title: 'Réduction chez nos partenaires',
        desc: 'Des remises toute l’année chez nos marques, restos et lieux partenaires.',
      },
    ],
    // Section 4: Order
    ownKicker: 'SÉRIE LIMITÉE',
    ownTitle: 'Prenez la vôtre.',
    ownDesc: 'Votre LUMARÉEL Black Card avec vos 8 avantages actifs tout de suite, valable 3 ans.',
    seeFront: 'Voir devant',
    seeBack: 'Voir derrière',
    flipAria: 'Retourner la carte',
    cardFrontAlt: 'LUMARÉEL Black Card — Face avant',
    cardBackAlt: 'LUMARÉEL Black Card — Face arrière',
    inStock: 'DISPONIBLE',
    waitlist: 'BIENTÔT DISPO',
    perMonth: '1 mois',
    perYear: '1 an',
    perThreeYears: '3 Ans',
    freeShip: 'Livraison gratuite',
    boxMeta: (rem: number, q: number) => `Encore ${rem} dispo sur ${q} · Pass téléphone immédiat`,
    getCardUpper: 'Commander ma LUMARÉEL Black Card',
    shipNote: 'Livrée en moins de 24h · Vos 8 avantages fonctionnent déjà sur téléphone.',
    // Footer
    footTag: 'La carte noire pour vivre tous vos concerts LUMARÉEL en VIP.',
    footProd: 'La Carte',
    footCard: 'Haut de page',
    footOrders: 'Mes commandes',
    footWallet: 'Mon Pass',
    footHouse: 'LUMARÉEL',
    footLineup: 'Concerts',
    footArchives: 'Archives',
    footOrganizers: 'Organisateurs',
    footSec: 'Accès',
    footVerify: 'Vérifier une carte',
    footNews: 'Actualités',
    footApply: 'Commander',
    footRights: '© 2026 LUMARÉEL CO.',
    footLoc: 'Abidjan · Live Network',
    // Wizard (4 steps: Name -> Contact/Delivery -> Payment -> Confirmation)
    wizHeader: (s: number) => `COMMANDE · ÉTAPE ${s} / 4`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Votre nom complet',
    wiz1Sub: 'Pour lier votre LUMARÉEL Black Card à votre compte membre.',
    wiz1Label: 'Nom complet *',
    wiz1Plan: 'Formule choisie',
    wiz1PlanFallback: 'LUMARÉEL Black Card 3 Ans',
    wiz1PlanDesc: 'Carte physique + Pass téléphone + Les 8 avantages inclus',
    wiz1Valid: '3 ans',
    wiz1Next: 'Continuer',
    wiz2Title: '2. Où vous livrer ?',
    wiz2Sub: 'Pour activer votre pass et livrer votre carte en moins de 24h.',
    wiz2Email: 'E-mail *',
    wiz2Phone: 'Téléphone *',
    wiz2City: 'Ville *',
    wiz2Address: 'Quartier / Adresse *',
    wiz2Back: 'Retour',
    wiz2Next: 'Continuer',
    wiz3Title: '3. Paiement rapide',
    wiz3Sub: 'Votre LUMARÉEL Black Card et vos 8 avantages sont prêts dès validation.',
    wiz3Methods: [
      { id: 'wave', label: 'Wave', desc: '0% frais' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Rapide' },
      { id: 'djamo', label: 'Djamo', desc: 'Carte' },
      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / MC' },
    ],
    wiz3Membership: 'LUMARÉEL Black Card 3 Ans (8 avantages)',
    wiz3CardDelivery: 'Livraison (< 24h)',
    wiz3Included: 'Gratuite',
    wiz3Bonus: 'Rafraîchissement & avantages',
    wiz3BonusVal: 'Inclus',
    wiz3Total: 'Total à payer',
    wiz3Submitting: 'Validation...',
    wiz3Submit: 'Valider et payer',
    wiz4Kicker: 'C’EST TOUT BON !',
    wiz4Title: 'BIENVENUE AU CLUB',
    wiz4Desc: (num: string) =>
      `Votre référence membre : ${num}. Votre LUMARÉEL Black Card est déjà active.`,
    wiz4Holder: 'Titulaire',
    wiz4Number: 'Référence',
    wiz4Box: 'Livraison',
    wiz4Prep: 'En moins de 24h',
    wiz4Cta: 'Voir ma LUMARÉEL Black Card',
    wizMinimize: 'Réduire',
    wizResume: 'Reprendre',
    wizCancel: 'Annuler la commande',
    wizMissingName: 'Entrez votre nom complet pour continuer.',
    wizMissingContact: 'Entrez votre e-mail et votre numéro de téléphone.',
    wizInvalidEmail: 'Entrez une adresse e-mail valide.',
    toastMissing: 'Mettez votre nom complet et votre e-mail.',
    toastOrderErr: 'Impossible de valider votre commande pour le moment. Réessayez.',
    toastActivated: 'Votre LUMARÉEL Black Card est prête.',
    toastGenericErr: 'Petit souci lors de la validation. Réessayez dans un instant.',
  },
  en: {
    eyebrow: 'LUMARÉEL BLACK CARD',
    heroTitle1: 'YOUR CONCERTS',
    heroTitle2: 'IN YOUR HANDS.',
    heroSub:
      'Skip the line, reserved parking, front-row VIP seats, free drink, presales, Meet & Greet, and partner discounts — all in one LUMARÉEL Black Card.',
    ctaPrimary: 'Get My LUMARÉEL Black Card',
    ctaSecondary: 'See all 8 perks',
    syncProof: (q: number) => `${q} cards available · 8 perks included`,
    flipHint: 'Tap card to flip',
    verified: 'OFFICIAL PASS',
    // Section 2
    img1Kicker: 'ON ARRIVAL',
    img1Title: 'Reserved parking & fast-track',
    img1Desc: 'Your parking space waits near the venue and you skip the entrance queue.',
    img2Kicker: 'BY THE STAGE',
    img2Title: 'Front row, free drink & Meet & Greet',
    img2Desc: 'Front-row VIP seats, a complimentary refreshment, and private artist Meet & Greets.',
    // Section 3
    benefitsKicker: 'YOUR 8 PERKS',
    benefitsTitle: 'Everything included with the card.',
    benefitsSub: 'Eight real perks ready the moment your card is active.',
    perksList: [
      {
        num: '01',
        title: 'Priority queue access',
        desc: 'Skip the regular line and walk straight in at every venue gate.',
      },
      {
        num: '02',
        title: 'Reserved parking spot',
        desc: 'A dedicated parking space held close to the venue entrance.',
      },
      {
        num: '03',
        title: 'Front-row VIP seating',
        desc: 'The best front-row seats right in front of the stage.',
      },
      {
        num: '04',
        title: 'Complimentary refreshment',
        desc: 'A free drink on the house so you can enjoy the show.',
      },
      {
        num: '05',
        title: 'Early presale access',
        desc: 'Book your concert tickets before public sales open.',
      },
      {
        num: '06',
        title: 'Meet & Greet access',
        desc: 'Meet the artists privately before or after the concert.',
      },
      {
        num: '07',
        title: 'Discounts on partner items',
        desc: 'Member-only prices on partner merch and featured collections.',
      },
      {
        num: '08',
        title: 'Discounts at partner venues',
        desc: 'Year-round savings across our partner brands, spots, and venues.',
      },
    ],
    // Section 4
    ownKicker: 'LIMITED EDITION',
    ownTitle: 'Make it yours.',
    ownDesc: 'Your LUMARÉEL Black Card with all 8 perks active immediately, valid for 3 years.',
    seeFront: 'Show front',
    seeBack: 'Show back',
    flipAria: 'Flip card',
    cardFrontAlt: 'LUMARÉEL Black Card — Front',
    cardBackAlt: 'LUMARÉEL Black Card — Back',
    inStock: 'AVAILABLE',
    waitlist: 'WAITLIST',
    perMonth: '1 month',
    perYear: '1 year',
    perThreeYears: '3 Years',
    freeShip: 'Free delivery',
    boxMeta: (rem: number, q: number) => `${rem} / ${q} remaining · Instant digital pass`,
    getCardUpper: 'Order My LUMARÉEL Black Card',
    shipNote: 'Delivered in under 24h · All 8 perks work right away on your phone.',
    // Footer
    footTag: 'The LUMARÉEL Black Card to experience every concert in VIP.',
    footProd: 'The Card',
    footCard: 'Back to top',
    footOrders: 'My Orders',
    footWallet: 'My Pass',
    footHouse: 'LUMARÉEL',
    footLineup: 'Concerts',
    footArchives: 'Archives',
    footOrganizers: 'Organizers',
    footSec: 'Access',
    footVerify: 'Verify a card',
    footNews: 'News',
    footApply: 'Order now',
    footRights: '© 2026 LUMARÉEL CO.',
    footLoc: 'Abidjan · Live Network',
    // Wizard (4 steps)
    wizHeader: (s: number) => `ORDER · STEP ${s} / 4`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Your Full Name',
    wiz1Sub: 'To link your LUMARÉEL Black Card to your member account.',
    wiz1Label: 'Full name *',
    wiz1Plan: 'Selected Plan',
    wiz1PlanFallback: 'LUMARÉEL Black Card 3 Years',
    wiz1PlanDesc: 'Physical card + Digital pass + All 8 perks included',
    wiz1Valid: '3 years',
    wiz1Next: 'Continue',
    wiz2Title: '2. Contact & Delivery',
    wiz2Sub: 'Used to activate your pass and deliver your card in under 24h.',
    wiz2Email: 'Email *',
    wiz2Phone: 'Mobile Phone *',
    wiz2City: 'City *',
    wiz2Address: 'Delivery Address *',
    wiz2Back: 'Back',
    wiz2Next: 'Continue',
    wiz3Title: '3. Fast Payment',
    wiz3Sub: 'Your LUMARÉEL Black Card activates as soon as you confirm.',
    wiz3Methods: [
      { id: 'wave', label: 'Wave', desc: '0% fee' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instant' },
      { id: 'djamo', label: 'Djamo', desc: 'Card' },
      { id: 'card', label: 'Bank Card', desc: 'Visa / MC' },
    ],
    wiz3Membership: 'LUMARÉEL Black Card 3 Years (8 perks)',
    wiz3CardDelivery: 'Delivery (< 24h)',
    wiz3Included: 'Free',
    wiz3Bonus: 'Drink & VIP perks',
    wiz3BonusVal: 'Included',
    wiz3Total: 'Total',
    wiz3Submitting: 'Activating...',
    wiz3Submit: 'Confirm & Pay',
    wiz4Kicker: 'ALL SET!',
    wiz4Title: 'WELCOME TO THE CLUB',
    wiz4Desc: (num: string) =>
      `Your member reference: ${num}. Your LUMARÉEL Black Card is now active.`,
    wiz4Holder: 'Holder',
    wiz4Number: 'Reference',
    wiz4Box: 'Delivery',
    wiz4Prep: 'Under 24h',
    wiz4Cta: 'Open My LUMARÉEL Black Card',
    wizMinimize: 'Minimize',
    wizResume: 'Resume',
    wizCancel: 'Cancel order',
    wizMissingName: 'Please enter your full name to continue.',
    wizMissingContact: 'Please enter your email and mobile number.',
    wizInvalidEmail: 'Please enter a valid email address.',
    toastMissing: 'Please enter your full name and email address.',
    toastOrderErr: 'Unable to process your card order right now. Please try again.',
    toastActivated: 'Your LUMARÉEL Black Card is ready.',
    toastGenericErr: 'Error processing your order. Please try again.',
  },
} as const;

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
  onCardIssued,
}) => {
  const { currentUser, setCurrentPage, showToast, language } = useApp();
  const c = CARD_COPY[language === 'en' ? 'en' : 'fr'];
  const prefersReducedMotion = useReducedMotion();

  // Edition & Plans data
  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive card flip state
  const [isHeroCardFlipped, setIsHeroCardFlipped] = useState(false);
  const [isShowcaseFlipped, setIsShowcaseFlipped] = useState(false);

  // Image fallback tracking
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Multi-step Order Wizard (4 clean steps: Name -> Contact -> Payment -> Done)
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isWizardMinimized, setIsWizardMinimized] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantCity, setApplicantCity] = useState('Abidjan');
  const [applicantAddress, setApplicantAddress] = useState('Cocody Danga');
  const [paymentMethod, setPaymentMethod] = useState<
    'wave' | 'orange_money' | 'mtn_momo' | 'djamo' | 'card'
  >('wave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    card: MembershipCard;
    qrDataUrl: string;
  } | null>(null);

  const parseJsonSafely = async (res: Response): Promise<any | null> => {
    try {
      const text = await res.text();
      if (!text || !text.trim()) return null;
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  useEffect(() => {
    fetchEditionAndPlans();
  }, []);

  useEffect(() => {
    if (currentUser?.name && !applicantName) {
      setApplicantName(currentUser.name.toUpperCase());
    }
    if (currentUser?.email && !applicantEmail) {
      setApplicantEmail(currentUser.email);
    }
  }, [currentUser]);

  // Freeze background page cleanly while the LUMARÉEL Black Card order modal is expanded
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
          const card = issuedResult.card;
          setIsWizardOpen(false);
          setIsWizardMinimized(false);
          if (onCardIssued) onCardIssued(card);
          else if (onGoToWallet) onGoToWallet();
          else setCurrentPage('member_card');
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

  const fetchEditionAndPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/membership/editions');
      const data = await parseJsonSafely(res);
      if (data?.success) {
        setEdition(data.activeEdition || data.editions?.[0] || null);
        setPlans(data.plans || []);
        if (data.plans?.length > 0) {
          setSelectedPlan(data.plans[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching membership data:', err);
    } finally {
      setLoading(false);
    }
  };

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
    const cleanName = applicantName.trim();
    const cleanEmail = applicantEmail.trim().toLowerCase();
    const cleanPhone = applicantPhone.trim();

    if (!cleanName || !cleanEmail) {
      showToast(c.toastMissing, 'error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast(c.wizInvalidEmail, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const planId = selectedPlan?.id || plans[0]?.id || 'plan_founders_annual';
      const shippingAddress = {
        street: applicantAddress.trim() || 'Abidjan',
        city: applicantCity.trim() || 'Abidjan',
        country: 'Côte d’Ivoire',
        recipientName: cleanName,
      };

      const orderPayload = {
        kind: 'membership_card',
        planId,
        channel: paymentMethod,
        customerName: cleanName,
        customerEmail: cleanEmail,
        customerPhone: cleanPhone,
        shippingAddress,
        userId: currentUser.id,
      };

      // 1. Initier la session de paiement PayMeTrust côté serveur
      const initRes = await fetch('/api/payments/paymetrust/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const initData = await parseJsonSafely(initRes);

      let issuedCard: MembershipCard | null = null;

      if (initRes.ok && initData?.success && initData?.transaction) {
        const tx = initData.transaction;

        // 2a. Mode live PayMeTrust : redirection sécurisée vers la page de paiement officielle
        if (tx.mode === 'live' && typeof tx.paymentUrl === 'string' && /^https?:\/\//i.test(tx.paymentUrl)) {
          window.location.assign(tx.paymentUrl);
          return;
        }

        // 2b. Mode pré-configuration : validation côté serveur
        const confirmRes = await fetch('/api/payments/paymetrust/confirm-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reference: tx.reference,
            previewPayload: orderPayload,
          }),
        });
        const confirmData = await parseJsonSafely(confirmRes);
        if (!confirmRes.ok || !confirmData?.success || !confirmData?.fulfillment?.card) {
          throw new Error(confirmData?.error || c.toastOrderErr);
        }
        issuedCard = confirmData.fulfillment.card;
      } else if (initData?.error) {
        throw new Error(initData.error);
      } else {
        // Fallback sécurisé si la route PayMeTrust n'est pas montée sur cet environnement
        const fallbackRes = await fetch('/api/membership/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: currentUser.id,
            planId,
            fullName: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            paymentMethod,
            shippingAddress,
          }),
        });
        const fallbackData = await parseJsonSafely(fallbackRes);
        if (!fallbackRes.ok || !fallbackData?.success || !fallbackData?.card) {
          throw new Error(fallbackData?.error || c.toastOrderErr);
        }
        issuedCard = fallbackData.card;
      }

      if (!issuedCard) {
        throw new Error(c.toastOrderErr);
      }

      saveStoredMemberCard(issuedCard, currentUser?.email);
      setIssuedResult({ card: issuedCard, qrDataUrl: '' });
      setWizardStep(4);
      showToast(c.toastActivated, 'success');
      fetchEditionAndPlans();
    } catch (err: any) {
      const rawMsg = typeof err?.message === 'string' ? err.message : '';
      const isPatternError = /expected pattern|unexpected token|json/i.test(rawMsg);
      showToast(isPatternError || !rawMsg ? c.toastOrderErr : rawMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const markImageFailed = (key: string) => {
    setFailedImages((prev) => ({ ...prev, [key]: true }));
  };

  const quota = edition?.quota || 100;
  const allocated = edition?.allocatedCount || 14;
  const remaining = Math.max(0, quota - allocated);

  const activePlan = selectedPlan || plans[0] || null;
  const planPrice = activePlan?.price ?? 50000;
  const planCurrency = activePlan?.currency || 'FCFA';
  const formattedPrice = `${Number(planPrice).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')} ${planCurrency}`;
  const durationLabel =
    activePlan?.durationMonths === 1
      ? c.perMonth
      : activePlan?.durationMonths === 12
        ? c.perYear
        : c.perThreeYears;

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#F2F2F2] font-agrandir-regular selection:bg-[#C8B282] selection:text-black">
      {/* =================================================================== */}
      {/* 1. HERO — FULL-BLEED IMAGE + TEXT OVERLAY + ANIMATED 3D BLACK CARD  */}
      {/* =================================================================== */}
      <section id="section-hero" className="w-full sm:max-w-6xl sm:mx-auto sm:px-6 lg:px-8 pt-2 pb-12 sm:pt-6 sm:pb-16">
        <div className="relative sm:rounded-[28px] overflow-hidden border-y sm:border border-white/10 bg-[#080808]">
          {!failedImages['heroBanner'] ? (
            <img
              src={heroBlackCardBannerImg}
              alt="LUMARÉEL Black Card"
              referrerPolicy="no-referrer"
              onError={() => markImageFailed('heroBanner')}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1B1710] via-[#090909] to-[#040404]" />
          )}

          {/* High-contrast dark scrim for clear text legibility on mobile & desktop */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/75 to-black/95 lg:bg-gradient-to-r lg:from-black/95 lg:via-black/78 lg:to-black/50" />

          <div className="relative z-10 px-5 py-8 sm:p-10 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Text directly on image */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left min-w-0">
              <div className="text-[11px] font-mono tracking-[0.16em] text-[#C8B282] uppercase">
                {c.eyebrow}
              </div>

              <h1
                className="text-[2rem] leading-[1.05] sm:text-5xl xl:text-[3.5rem] font-agrandir-extrabold uppercase tracking-tight text-white break-words"
                style={{ textWrap: 'balance' }}
              >
                {c.heroTitle1}
                <br />
                <span className="text-[#C8B282]">{c.heroTitle2}</span>
              </h1>

              <p className="text-sm sm:text-base text-neutral-200 font-light leading-relaxed max-w-lg">
                {c.heroSub}
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(activePlan || undefined)}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black text-xs font-agrandir-extrabold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>{c.ctaPrimary}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('section-benefits')}
                  className="min-h-[48px] px-6 py-3 rounded-full bg-black/55 hover:bg-black/80 border border-white/25 text-white text-xs font-agrandir-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center justify-center"
                >
                  {c.ctaSecondary}
                </button>
              </div>

              <div className="pt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-300">
                <span className="font-mono text-[#B8F249] uppercase tracking-wider">{c.verified}</span>
                <span aria-hidden="true" className="text-white/30">·</span>
                <span>{c.syncProof(quota)}</span>
              </div>
            </div>

            {/* Interactive Animated 3D Black Card */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center w-full">
              <motion.div
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: [0, -7, 0],
                        rotateZ: [-0.5, 0.5, -0.5],
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
                whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
                onClick={() => setIsHeroCardFlipped((prev) => !prev)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setIsHeroCardFlipped((prev) => !prev);
                  }
                }}
                aria-label={c.flipAria}
                className="w-full max-w-[310px] sm:max-w-[360px] cursor-pointer perspective-[1200px]"
                style={{ aspectRatio: '85.6 / 53.98' }}
              >
                <motion.div
                  animate={{ rotateY: isHeroCardFlipped ? 180 : 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Official Card Front Design */}
                  <div
                    className="absolute inset-0 rounded-[16px] sm:rounded-[18px] bg-black border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <img
                      src={CARD_FRONT_IMG}
                      alt={c.cardFrontAlt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    {!prefersReducedMotion && (
                      <motion.div
                        aria-hidden="true"
                        animate={{ x: ['-130%', '220%'] }}
                        transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 2.5, ease: 'easeInOut' }}
                        className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                      />
                    )}
                  </div>

                  {/* Official Card Back Design */}
                  <div
                    className="absolute inset-0 rounded-[16px] sm:rounded-[18px] bg-black border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <img
                      src={CARD_BACK_IMG}
                      alt={c.cardBackAlt}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </motion.div>
              </motion.div>

              <button
                type="button"
                onClick={() => setIsHeroCardFlipped((prev) => !prev)}
                className="mt-2 min-h-[44px] px-3 inline-flex items-center gap-1.5 text-[11px] font-mono text-neutral-300 hover:text-[#C8B282] transition-colors cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{c.flipHint}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. ALL 8 OFFICIAL PERKS — CLEAN OPEN EDITORIAL LIST (ZERO BOXES)    */}
      {/* =================================================================== */}
      <section id="section-benefits" className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pb-16 sm:pb-24">
        <div className="max-w-xl space-y-2 mb-8 sm:mb-10 text-left">
          <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
            {c.benefitsKicker}
          </div>
          <h2
            className="text-2xl sm:text-4xl font-agrandir-extrabold text-white tracking-tight leading-[1.08]"
            style={{ textWrap: 'balance' }}
          >
            {c.benefitsTitle}
          </h2>
          <p className="text-sm text-neutral-400 font-light">{c.benefitsSub}</p>
        </div>

        {/* Clean hairline rows on open black canvas — fast, airy, zero overflow */}
        <ol className="grid grid-cols-1 md:grid-cols-2 md:gap-x-12 border-t border-white/10">
          {c.perksList.map((perk) => (
            <li
              key={perk.num}
              className="flex items-start gap-4 py-4 sm:py-5 border-b border-white/10 text-left"
            >
              <span className="font-mono text-xs font-bold text-[#C8B282] tabular-nums pt-0.5 w-6 shrink-0">
                {perk.num}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-sm sm:text-base font-agrandir-extrabold text-white leading-snug">
                  {perk.title}
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
                  {perk.desc}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* =================================================================== */}
      {/* 4. PERSONALIZE & ORDER — OPEN LAYOUT WITH LIVE CARD PREVIEW         */}
      {/* =================================================================== */}
      <section
        id="section-make-it-yours"
        className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-14 sm:py-20 border-t border-white/10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Interactive Official Black Card */}
          <div className="lg:col-span-5 flex flex-col items-center w-full">
            <div
              onClick={() => setIsShowcaseFlipped((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsShowcaseFlipped((prev) => !prev);
                }
              }}
              aria-label={c.flipAria}
              className="w-full max-w-[310px] sm:max-w-[370px] cursor-pointer perspective-[1200px]"
              style={{ aspectRatio: '85.6 / 53.98' }}
            >
              <motion.div
                animate={{ rotateY: isShowcaseFlipped ? 180 : 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full relative"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Official Card Front */}
                <div
                  className="absolute inset-0 rounded-[16px] sm:rounded-[18px] bg-black border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
                  style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                >
                  <img
                    src={CARD_FRONT_IMG}
                    alt={c.cardFrontAlt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Official Card Back */}
                <div
                  className="absolute inset-0 rounded-[16px] sm:rounded-[18px] bg-black border border-white/20 shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                  }}
                >
                  <img
                    src={CARD_BACK_IMG}
                    alt={c.cardBackAlt}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </div>

            <div className="mt-2 flex items-center justify-center text-[11px] text-neutral-400">
              <button
                type="button"
                onClick={() => setIsShowcaseFlipped((prev) => !prev)}
                className="min-h-[44px] px-2 text-[#C8B282] hover:underline cursor-pointer"
              >
                {isShowcaseFlipped ? c.seeFront : c.seeBack}
              </button>
            </div>
          </div>

          {/* Right/Bottom: Clean Open Pricing & Order CTA */}
          <div className="lg:col-span-7 space-y-6 text-left min-w-0">
            <div className="space-y-2">
              <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
                {c.ownKicker}
              </div>
              <h2 className="text-3xl sm:text-5xl font-agrandir-extrabold text-white tracking-tight leading-none">
                {c.ownTitle}
              </h2>
              <p className="text-sm text-neutral-300 font-light max-w-xl leading-relaxed">
                {c.ownDesc}
              </p>
            </div>

            {plans.length > 1 && (
              <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
                {plans.map((plan) => {
                  const isActive = activePlan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`min-h-[44px] px-4 py-2 rounded-lg text-xs font-agrandir-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        isActive ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      {plan.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Open Price Line (No nested box) */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tabular-nums">
                    {loading ? '...' : formattedPrice}
                  </span>
                  <span className="text-sm font-mono text-[#C8B282] uppercase">
                    {durationLabel}
                  </span>
                </div>
                <span className="text-xs font-mono text-[#B8F249] uppercase tracking-wider">
                  {remaining > 0 ? c.inStock : c.waitlist}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                <span className="text-[#C8B282]">{c.freeShip}</span>
                <span aria-hidden="true">·</span>
                <span>{c.boxMeta(remaining, quota)}</span>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => openAdmissionWizard(activePlan || undefined)}
                className="w-full sm:w-auto sm:min-w-[280px] min-h-[52px] py-3.5 px-7 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <span>{c.getCardUpper}</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>

              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <Lock className="w-3.5 h-3.5 text-[#B8F249] shrink-0" />
                <span>{c.shipNote}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. LOCKED 5-STEP ORDER MODAL (PORTAL + FROZEN BACKDROP + PINNED CTA)*/}
      {/* =================================================================== */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isWizardOpen && isWizardMinimized && (
              <motion.div
                key="black-card-wizard-minimized"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.18 }}
                className="fixed left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] md:bottom-6 z-[90] sm:w-[340px]"
              >
                <div className="flex items-center justify-between gap-2 px-4 py-2.5 rounded-full bg-[#111111]/95 backdrop-blur-xl border border-[#C8B282]/45 shadow-[0_16px_48px_rgba(0,0,0,0.85)]">
                  <button
                    type="button"
                    onClick={() => setIsWizardMinimized(false)}
                    className="flex-1 min-w-0 flex items-center gap-2.5 text-left py-1 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-[#C8B282] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[11px] font-agrandir-extrabold text-white uppercase truncate">
                        {c.wizTitle}
                      </div>
                      <div className="text-[10px] font-mono text-[#C8B282] truncate">
                        {c.wizHeader(wizardStep)} · {c.wizResume}
                      </div>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsWizardMinimized(false)}
                      aria-label={c.wizResume}
                      title={c.wizResume}
                      className="w-9 h-9 rounded-full bg-white text-black hover:bg-[#C8B282] flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={closeAdmissionWizard}
                      aria-label={c.wizCancel}
                      title={c.wizCancel}
                      className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
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
                className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md touch-none overscroll-none"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 24, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-xl max-h-[86dvh] sm:max-h-[84vh] flex flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[#0B0B0B] border-t sm:border border-[#C8B282]/40 shadow-[0_24px_80px_rgba(0,0,0,0.95)] text-left touch-auto"
                >
                  {/* 1. FIXED TOP HEADER (NEVER SCROLLS AWAY) */}
                  <div className="shrink-0 px-5 sm:px-7 pt-3.5 sm:pt-6 pb-4 border-b border-white/10 bg-[#0B0B0B]">
                    <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3 sm:hidden" />

                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#C8B282] block">
                          {c.wizHeader(wizardStep)}
                        </span>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white uppercase mt-0.5 truncate">
                          {c.wizTitle}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsWizardMinimized(true)}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          aria-label={c.wizMinimize}
                          title={c.wizMinimize}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={closeAdmissionWizard}
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/8 hover:bg-white/15 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                          aria-label={c.wizCancel}
                          title={c.wizCancel}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {[1, 2, 3, 4].map((s) => (
                        <div
                          key={s}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            wizardStep >= s ? 'bg-[#C8B282]' : 'bg-white/10'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 2. SCROLLABLE MIDDLE BODY (ONLY THIS MOVES) */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-7 py-5">
                    {wizardStep === 1 && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-base font-agrandir-bold text-white uppercase">{c.wiz1Title}</h4>
                          <p className="text-xs text-neutral-400 font-light mt-1">{c.wiz1Sub}</p>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
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
                            placeholder="VOTRE NOM COMPLET"
                            required
                            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white font-mono text-sm uppercase tracking-wider outline-none"
                          />
                        </div>

                        <div className="py-3.5 border-y border-white/10 flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-[10px] font-agrandir-bold text-[#C8B282] uppercase tracking-wider block">
                              {c.wiz1Plan}
                            </span>
                            <strong className="text-sm font-agrandir-bold text-white uppercase">
                              {activePlan?.name || c.wiz1PlanFallback}
                            </strong>
                            <p className="text-xs text-neutral-400 font-light">{c.wiz1PlanDesc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base sm:text-lg font-agrandir-extrabold text-[#C8B282] font-mono tabular-nums">
                              {formattedPrice}
                            </div>
                            <span className="text-[10px] text-neutral-400 uppercase">{c.wiz1Valid}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-base font-agrandir-bold text-white uppercase">{c.wiz2Title}</h4>
                          <p className="text-xs text-neutral-400 font-light mt-1">{c.wiz2Sub}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                              {c.wiz2Email}
                            </label>
                            <input
                              type="email"
                              value={applicantEmail}
                              onChange={(e) => setApplicantEmail(e.target.value)}
                              placeholder="email@domain.com"
                              required
                              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-sm outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                              {c.wiz2Phone}
                            </label>
                            <input
                              type="tel"
                              value={applicantPhone}
                              onChange={(e) => setApplicantPhone(e.target.value)}
                              placeholder="+225 07 00 00 00 00"
                              required
                              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-sm outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                              {c.wiz2City}
                            </label>
                            <input
                              type="text"
                              value={applicantCity}
                              onChange={(e) => setApplicantCity(e.target.value)}
                              placeholder="Abidjan"
                              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-sm outline-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                              {c.wiz2Address}
                            </label>
                            <input
                              type="text"
                              value={applicantAddress}
                              onChange={(e) => setApplicantAddress(e.target.value)}
                              placeholder="Cocody, Zone 4..."
                              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-sm outline-none"
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
                          <h4 className="text-base font-agrandir-bold text-white uppercase">{c.wiz3Title}</h4>
                          <p className="text-xs text-neutral-400 font-light mt-1">{c.wiz3Sub}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {c.wiz3Methods.map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => setPaymentMethod(m.id as any)}
                              className={`min-h-[64px] p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                                paymentMethod === m.id
                                  ? 'bg-[#C8B282]/15 border-[#C8B282] text-white'
                                  : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                              }`}
                            >
                              <CreditCard className="w-4 h-4 text-[#C8B282] mb-1" />
                              <div className="font-agrandir-bold text-xs text-white uppercase truncate">
                                {m.label}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono">{m.desc}</div>
                            </button>
                          ))}
                        </div>

                        <div className="py-3 border-y border-white/10 space-y-2 text-xs">
                          <div className="flex justify-between gap-2 text-neutral-400">
                            <span>{c.wiz3Membership}</span>
                            <span className="font-mono text-white tabular-nums shrink-0">{formattedPrice}</span>
                          </div>
                          <div className="flex justify-between gap-2 text-neutral-400">
                            <span>{c.wiz3CardDelivery}</span>
                            <span className="text-[#B8F249] font-mono shrink-0">{c.wiz3Included}</span>
                          </div>
                          <div className="flex justify-between gap-2 text-neutral-400">
                            <span>{c.wiz3Bonus}</span>
                            <span className="text-[#C8B282] font-mono shrink-0">{c.wiz3BonusVal}</span>
                          </div>
                          <div className="border-t border-white/10 pt-2 flex justify-between gap-2 font-agrandir-extrabold text-sm text-white">
                            <span>{c.wiz3Total}</span>
                            <span className="text-[#C8B282] font-mono tabular-nums shrink-0">{formattedPrice}</span>
                          </div>
                        </div>
                      </form>
                    )}

                    {wizardStep === 4 && issuedResult && (
                      <div className="text-center space-y-5 py-2">
                        <div className="w-14 h-14 rounded-full bg-[#B8F249]/15 text-[#B8F249] border border-[#B8F249]/40 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-mono tracking-widest text-[#C8B282] uppercase">
                            {c.wiz4Kicker}
                          </span>
                          <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">{c.wiz4Title}</h3>
                          <p className="text-xs text-neutral-300 font-light max-w-md mx-auto">
                            {c.wiz4Desc(issuedResult.card.cardNumber)}
                          </p>
                        </div>

                        <div className="py-3 border-y border-white/10 max-w-md mx-auto text-left space-y-2 text-xs">
                          <div className="flex justify-between gap-2">
                            <span className="text-neutral-400">{c.wiz4Holder}</span>
                            <strong className="text-white uppercase font-mono truncate">
                              {issuedResult.card.cardholderName}
                            </strong>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-neutral-400">{c.wiz4Number}</span>
                            <strong className="text-[#C8B282] font-mono tabular-nums">
                              {issuedResult.card.cardNumber}
                            </strong>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-neutral-400">{c.wiz4Box}</span>
                            <span className="text-[#B8F249] font-mono">{c.wiz4Prep}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. PINNED BOTTOM ACTION BAR — WHITE "CONTINUER" ALWAYS VISIBLE */}
                  <div className="shrink-0 bg-[#0B0B0B] border-t border-white/15 px-5 sm:px-7 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                    {wizardStep === 1 && (
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={handleWizardNextStep1}
                          className="w-full sm:w-auto min-h-[50px] px-7 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(255,255,255,0.22)] cursor-pointer transition-colors"
                        >
                          <span>{c.wiz1Next}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="min-h-[48px] px-4 rounded-full border border-white/15 text-xs font-agrandir-semibold text-neutral-300 hover:text-white hover:border-white/30 cursor-pointer transition-colors shrink-0"
                        >
                          {c.wiz2Back}
                        </button>

                        <button
                          type="button"
                          onClick={handleWizardNextStep2}
                          className="flex-1 sm:flex-none min-h-[50px] px-7 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(255,255,255,0.22)] cursor-pointer transition-colors"
                        >
                          <span>{c.wiz2Next}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" />
                        </button>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="min-h-[48px] px-4 rounded-full border border-white/15 text-xs font-agrandir-semibold text-neutral-300 hover:text-white hover:border-white/30 cursor-pointer transition-colors shrink-0"
                        >
                          {c.wiz2Back}
                        </button>

                        <button
                          type="submit"
                          form="black-card-checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 sm:flex-none min-h-[50px] px-7 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(255,255,255,0.22)] cursor-pointer disabled:opacity-60 transition-colors"
                        >
                          {isSubmitting ? (
                            <>
                              <RotateCw className="w-4 h-4 animate-spin text-black shrink-0" />
                              <span>{c.wiz3Submitting}</span>
                            </>
                          ) : (
                            <>
                              <span>{c.wiz3Submit}</span>
                              <Check className="w-4 h-4 text-black shrink-0" />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {wizardStep === 4 && issuedResult && (
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => finishAndOpenInstalledCard(issuedResult.card)}
                          className="w-full sm:w-auto min-h-[50px] px-8 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider shadow-[0_6px_24px_rgba(255,255,255,0.22)] cursor-pointer transition-colors"
                        >
                          {c.wiz4Cta}
                        </button>
                      </div>
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
