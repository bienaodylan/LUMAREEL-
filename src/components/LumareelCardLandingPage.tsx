import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Lock,
  RotateCw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

import heroBlackCardBannerImg from '../assets/images/dark_card_hero_backdrop_1795099845525.jpg';
import concertsCrowdImg from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import vipMezzanineImg from '../assets/images/vip_lounge_empty_stage_1795099845090.jpg';

const CARD_FRONT_IMG = '/assets/aistudio/IMG_6112_896cf3ce.png';
const CARD_BACK_IMG = '/assets/aistudio/IMG_6111_952dcd49.png';

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  hasActiveCard?: boolean;
  activeCardNumber?: string;
}

const CARD_COPY = {
  fr: {
    eyebrow: 'LA CARTE NOIRE LUMARÉEL',
    heroTitle1: 'VOS CONCERTS',
    heroTitle2: 'ENTRE VOS MAINS.',
    heroSub:
      'Coupe-file, parking réservé, premiers rangs VIP, boisson offerte, préventes, Meet & Greet et réductions partenaires — tout dans une seule carte.',
    ctaPrimary: 'Prendre ma Black Card',
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
    ownDesc: 'Votre Black Card LUMARÉEL avec vos 8 avantages actifs tout de suite, valable 3 ans.',
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
    getCardUpper: 'Commander ma Black Card',
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
    // Wizard
    wizHeader: (s: number) => `COMMANDE · ÉTAPE ${s} / 5`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Votre nom complet',
    wiz1Sub: 'Pour lier votre Black Card à votre compte membre.',
    wiz1Label: 'Nom complet *',
    wiz1Plan: 'Formule choisie',
    wiz1PlanFallback: 'Black Card 3 Ans',
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
    wiz3Title: '3. Vos goûts musicaux',
    wiz3Sub: 'Pour recevoir les bonnes préventes et invitations Meet & Greet.',
    wiz3Genre: 'Ce que vous aimez écouter',
    wiz3Genres: [
      { value: 'Afrobeats & Live Acoustic', label: 'Afrobeats & Live' },
      { value: 'Jazz, Soul & R&B', label: 'Jazz, Soul & R&B' },
      { value: 'Grands Concerts & Festivals', label: 'Grands Concerts & Festivals' },
      { value: 'Loges VIP & Dégustations', label: 'Soirées VIP & Meet & Greet' },
    ],
    wiz3Ref: 'Code parrain (si vous en avez un)',
    wiz3Next: 'Paiement',
    wiz4Title: '4. Paiement rapide',
    wiz4Sub: 'Votre pass et vos 8 avantages sont prêts dès que c’est validé.',
    wiz4Methods: [
      { id: 'wave', label: 'Wave', desc: '0% frais' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Rapide' },
      { id: 'djamo', label: 'Djamo', desc: 'Carte' },
      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / MC' },
    ],
    wiz4Membership: 'Black Card 3 Ans (8 avantages)',
    wiz4CardDelivery: 'Livraison (< 24h)',
    wiz4Included: 'Gratuite',
    wiz4Bonus: 'Rafraîchissement & avantages',
    wiz4BonusVal: 'Inclus',
    wiz4Total: 'Total à payer',
    wiz4Submitting: 'Validation...',
    wiz4Submit: 'Valider et payer',
    wiz5Kicker: 'C’EST TOUT BON !',
    wiz5Title: 'BIENVENUE AU CLUB',
    wiz5Desc: (num: string) =>
      `Votre référence membre : ${num}. Votre pass et tous vos 8 avantages sont déjà actifs.`,
    wiz5Holder: 'Titulaire',
    wiz5Number: 'Référence',
    wiz5Box: 'Livraison',
    wiz5Prep: 'En moins de 24h',
    wiz5Cta: 'Voir mon Pass',
    toastMissing: 'Mettez votre nom complet et votre e-mail.',
    toastOrderErr: 'Impossible de valider votre commande.',
    toastActivated: 'Votre LUMARÉEL Black Card est prête.',
    toastGenericErr: 'Petit souci lors de la validation.',
  },
  en: {
    eyebrow: 'THE LUMARÉEL BLACK CARD',
    heroTitle1: 'YOUR CONCERTS',
    heroTitle2: 'IN YOUR HANDS.',
    heroSub:
      'Skip the line, reserved parking, front-row VIP seats, free drink, presales, Meet & Greet, and partner discounts — all in one black card.',
    ctaPrimary: 'Get Your Black Card',
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
    getCardUpper: 'Order My Black Card',
    shipNote: 'Delivered in under 24h · All 8 perks work right away on your phone.',
    // Footer
    footTag: 'The black card to experience every LUMARÉEL concert in VIP.',
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
    // Wizard
    wizHeader: (s: number) => `ORDER · STEP ${s} / 5`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Your Full Name',
    wiz1Sub: 'To link your Black Card to your member account.',
    wiz1Label: 'Full name *',
    wiz1Plan: 'Selected Plan',
    wiz1PlanFallback: '3-Year Black Card',
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
    wiz3Title: '3. Music Preferences',
    wiz3Sub: 'So we send you the right presales and Meet & Greet invites.',
    wiz3Genre: 'What you love listening to',
    wiz3Genres: [
      { value: 'Afrobeats & Live Acoustic', label: 'Afrobeats & Live' },
      { value: 'Jazz, Soul & R&B', label: 'Jazz, Soul & R&B' },
      { value: 'Grands Concerts & Festivals', label: 'Concerts & Festivals' },
      { value: 'Loges VIP & Dégustations', label: 'VIP & Meet & Greet' },
    ],
    wiz3Ref: 'Referral code (optional)',
    wiz3Next: 'Payment',
    wiz4Title: '4. Fast Payment',
    wiz4Sub: 'Your pass and all 8 perks activate as soon as you confirm.',
    wiz4Methods: [
      { id: 'wave', label: 'Wave', desc: '0% fee' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instant' },
      { id: 'djamo', label: 'Djamo', desc: 'Card' },
      { id: 'card', label: 'Bank Card', desc: 'Visa / MC' },
    ],
    wiz4Membership: '3-Year Black Card (8 perks)',
    wiz4CardDelivery: 'Delivery (< 24h)',
    wiz4Included: 'Free',
    wiz4Bonus: 'Drink & VIP perks',
    wiz4BonusVal: 'Included',
    wiz4Total: 'Total',
    wiz4Submitting: 'Activating...',
    wiz4Submit: 'Confirm & Pay',
    wiz5Kicker: 'ALL SET!',
    wiz5Title: 'WELCOME TO THE CLUB',
    wiz5Desc: (num: string) =>
      `Your member reference: ${num}. Your digital pass and all 8 perks are already active.`,
    wiz5Holder: 'Holder',
    wiz5Number: 'Reference',
    wiz5Box: 'Delivery',
    wiz5Prep: 'Under 24h',
    wiz5Cta: 'Open My Pass',
    toastMissing: 'Please enter your full name and email address.',
    toastOrderErr: 'Unable to process your card order.',
    toastActivated: 'Your LUMARÉEL Black Card is ready.',
    toastGenericErr: 'Error processing request.',
  },
} as const;

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
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

  // Multi-step Order Wizard
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantCity, setApplicantCity] = useState('Abidjan');
  const [applicantAddress, setApplicantAddress] = useState('Cocody Danga');
  const [musicInterest, setMusicInterest] = useState('Afrobeats & Live Acoustic');
  const [referralCode, setReferralCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'wave' | 'orange_money' | 'mtn_momo' | 'djamo' | 'card'
  >('wave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{
    card: MembershipCard;
    qrDataUrl: string;
  } | null>(null);

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

  const fetchEditionAndPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/membership/editions');
      const data = await res.json();
      if (data.success) {
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
    setIsWizardOpen(true);
  };

  const handleCompleteAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantEmail.trim()) {
      showToast(c.toastMissing, 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/membership/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan?.id || plans[0]?.id || 'plan_founders_annual',
          customerName: applicantName.trim(),
          customerEmail: applicantEmail.trim(),
          customerPhone: applicantPhone.trim(),
          shippingAddress: {
            street: applicantAddress.trim() || 'Abidjan',
            city: applicantCity.trim() || 'Abidjan',
            country: 'Côte d’Ivoire',
          },
          paymentMethod,
          paymentReference: `DEMANDE-ADM-${Date.now()}`,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || c.toastOrderErr);
      }

      setIssuedResult({ card: data.card, qrDataUrl: data.qrDataUrl });
      setWizardStep(5);
      showToast(c.toastActivated, 'success');
      fetchEditionAndPlans();
    } catch (err: any) {
      showToast(err.message || c.toastGenericErr, 'error');
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
    <div className="w-full min-h-screen overflow-x-hidden bg-[#050505] text-[#F2F2F2] font-agrandir-regular selection:bg-[#C8B282] selection:text-black">
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
      {/* 2. PURE EDITORIAL IMAGES — NO NESTED BOX SOUP                       */}
      {/* =================================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-14 sm:pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Visual 1: Arrival & Fast-track */}
          <figure className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] bg-[#0D0D0D]">
            {!failedImages['crowd'] ? (
              <img
                src={concertsCrowdImg}
                alt={c.img1Title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => markImageFailed('crowd')}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1C160E] to-[#070707]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/10" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-left space-y-1.5">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[#C8B282] uppercase">
                {c.img1Kicker}
              </div>
              <h2 className="text-lg sm:text-2xl font-agrandir-extrabold text-white leading-tight">
                {c.img1Title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-200 font-light leading-relaxed max-w-md">
                {c.img1Desc}
              </p>
            </figcaption>
          </figure>

          {/* Visual 2: Front-row VIP, Drink & Meet & Greet */}
          <figure className="relative rounded-2xl sm:rounded-3xl overflow-hidden aspect-[4/3] sm:aspect-[16/10] bg-[#0D0D0D]">
            {!failedImages['vip'] ? (
              <img
                src={vipMezzanineImg}
                alt={c.img2Title}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => markImageFailed('vip')}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#1C1810] to-[#070707]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/45 to-black/10" />
            <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-left space-y-1.5">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[#C8B282] uppercase">
                {c.img2Kicker}
              </div>
              <h2 className="text-lg sm:text-2xl font-agrandir-extrabold text-white leading-tight">
                {c.img2Title}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-200 font-light leading-relaxed max-w-md">
                {c.img2Desc}
              </p>
            </figcaption>
          </figure>
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
      {/* 5. MINIMAL FOOTER                                                   */}
      {/* =================================================================== */}
      <footer className="border-t border-white/10 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            <div className="col-span-2 lg:col-span-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="font-agrandir-extrabold text-sm tracking-tight text-white uppercase">
                  LUMARÉEL
                </span>
                <span className="text-[10px] font-mono tracking-widest text-[#C8B282] uppercase">
                  BLACK
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">{c.footTag}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-agrandir-bold text-white">{c.footProd}</div>
              <div className="flex flex-col gap-2 text-neutral-400">
                <button
                  type="button"
                  onClick={() => scrollToSection('section-hero')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footCard}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('client_space')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footOrders}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onGoToWallet) onGoToWallet();
                    else setCurrentPage('member_card');
                  }}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footWallet}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-agrandir-bold text-white">{c.footHouse}</div>
              <div className="flex flex-col gap-2 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage('home')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footLineup}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('archive')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footArchives}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('organizers')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footOrganizers}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-agrandir-bold text-white">{c.footSec}</div>
              <div className="flex flex-col gap-2 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage('card_verify')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footVerify}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('news')}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footNews}
                </button>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(activePlan || undefined)}
                  className="text-left hover:text-white transition-colors cursor-pointer py-0.5"
                >
                  {c.footApply}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
            <span>{c.footRights}</span>
            <span className="font-mono text-neutral-400">{c.footLoc}</span>
          </div>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* 6. MOBILE-FIRST 5-STEP ORDER SHEET / MODAL                          */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#0B0B0B] border-t sm:border border-[#C8B282]/40 p-5 sm:p-8 shadow-2xl text-left"
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-5">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C8B282]">
                    {c.wizHeader(wizardStep)}
                  </span>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase mt-0.5 truncate">
                    {c.wizTitle}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-11 h-11 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-5 gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      wizardStep >= s ? 'bg-[#C8B282]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">{c.wiz1Title}</h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">{c.wiz1Sub}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      {c.wiz1Label}
                    </label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value.toUpperCase())}
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

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!applicantName.trim()}
                      onClick={() => setWizardStep(2)}
                      className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <span>{c.wiz1Next}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
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
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
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

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="min-h-[44px] px-3 text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {c.wiz2Back}
                    </button>

                    <button
                      type="button"
                      disabled={!applicantEmail.trim() || !applicantPhone.trim()}
                      onClick={() => setWizardStep(3)}
                      className="min-h-[48px] px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <span>{c.wiz2Next}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">{c.wiz3Title}</h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">{c.wiz3Sub}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      {c.wiz3Genre}
                    </label>
                    <select
                      value={musicInterest}
                      onChange={(e) => setMusicInterest(e.target.value)}
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-sm outline-none cursor-pointer"
                    >
                      {c.wiz3Genres.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      {c.wiz3Ref}
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="BLACK-VIP-2026"
                      className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white font-mono text-sm uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="min-h-[44px] px-3 text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {c.wiz2Back}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="min-h-[48px] px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>{c.wiz3Next}</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 4 && (
                <form onSubmit={handleCompleteAdmission} className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">{c.wiz4Title}</h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">{c.wiz4Sub}</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {c.wiz4Methods.map((m) => (
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
                      <span>{c.wiz4Membership}</span>
                      <span className="font-mono text-white tabular-nums shrink-0">{formattedPrice}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-neutral-400">
                      <span>{c.wiz4CardDelivery}</span>
                      <span className="text-[#B8F249] font-mono shrink-0">{c.wiz4Included}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-neutral-400">
                      <span>{c.wiz4Bonus}</span>
                      <span className="text-[#C8B282] font-mono shrink-0">{c.wiz4BonusVal}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between gap-2 font-agrandir-extrabold text-sm text-white">
                      <span>{c.wiz4Total}</span>
                      <span className="text-[#C8B282] font-mono tabular-nums shrink-0">{formattedPrice}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="min-h-[44px] px-3 text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {c.wiz2Back}
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-[48px] px-7 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-black" />
                          <span>{c.wiz4Submitting}</span>
                        </>
                      ) : (
                        <>
                          <span>{c.wiz4Submit}</span>
                          <Check className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {wizardStep === 5 && issuedResult && (
                <div className="text-center space-y-5 py-3">
                  <div className="w-14 h-14 rounded-full bg-[#B8F249]/15 text-[#B8F249] border border-[#B8F249]/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#C8B282] uppercase">
                      {c.wiz5Kicker}
                    </span>
                    <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">{c.wiz5Title}</h3>
                    <p className="text-xs text-neutral-300 font-light max-w-md mx-auto">
                      {c.wiz5Desc(issuedResult.card.cardNumber)}
                    </p>
                  </div>

                  <div className="py-3 border-y border-white/10 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-neutral-400">{c.wiz5Holder}</span>
                      <strong className="text-white uppercase font-mono truncate">
                        {issuedResult.card.cardholderName}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-neutral-400">{c.wiz5Number}</span>
                      <strong className="text-[#C8B282] font-mono tabular-nums">
                        {issuedResult.card.cardNumber}
                      </strong>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-neutral-400">{c.wiz5Box}</span>
                      <span className="text-[#B8F249] font-mono">{c.wiz5Prep}</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWizardOpen(false);
                        if (onGoToWallet) onGoToWallet();
                        else setCurrentPage('member_card');
                      }}
                      className="w-full sm:w-auto min-h-[48px] px-8 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      {c.wiz5Cta}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
