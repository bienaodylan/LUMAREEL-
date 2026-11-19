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
  QrCode,
  Radio,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Ticket,
  User,
  Wifi,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import heroLoungeTopImg from '../assets/images/black_card_hero_lounge_top_1794694901310.jpg';
import heroPortraitLeftImg from '../assets/images/black_card_hero_portrait_left_1794694901752.jpg';
import heroNightTallImg from '../assets/images/black_card_hero_night_tall_1794694902515.jpg';
import concertsCrowdImg from '../assets/images/black_card_concerts_crowd_1794694902084.jpg';
import vipMezzanineImg from '../assets/images/black_card_vip_mezzanine_1794694903429.jpg';

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  hasActiveCard?: boolean;
  activeCardNumber?: string;
}

const CARD_COPY = {
  fr: {
    eyebrow: 'LE PASS LIVE OFFICIEL',
    heroTitle1: 'VOTRE UNIVERS LIVE.',
    heroTitle2: 'EN MAIN.',
    heroSub: 'Billets, salons VIP et coupe-file réunis dans une seule carte physique.',
    ctaPrimary: 'Obtenir la Black Card',
    ctaSecondary: 'Avantages',
    syncProof: (q: number) => `${q} membres fondateurs · Synchro instantanée`,
    verified: 'VÉRIFIÉ',
    physicalPass: 'PASS PHYSIQUE',
    passHolder: 'TITULAIRE',
    synced: 'ACTIF',
    howKicker: 'FONCTIONNEMENT',
    howTitle1: 'Vos billets,',
    howTitle2: 'matérialisés.',
    syncTitle: 'Synchro Billets',
    syncSub: 'Temps réel',
    tapAndGo: 'TAP & GO',
    activeOrder: 'BILLET ACTIF',
    colDate: 'DATE',
    colTier: 'ACCÈS',
    colStatus: 'STATUT',
    statusActive: '• Actif',
    syncNote: 'Chaque billet mobile s’ajoute automatiquement à votre carte.',
    tactileKicker: 'CONTRÔLE TACTILE',
    laserTitle: 'Verso Laser & NFC',
    laserDesc: 'QR dynamique gravé et puce NFC pour passer aux portiques sans attente.',
    flipAria: 'Retourner la carte',
    gateGranted: 'Accès Autorisé',
    gateDefault: 'Accès Portique',
    gateSubGranted: 'NFC vérifié',
    gateSubDefault: 'Sans attente',
    autoSyncTitle: 'Synchro Automatique',
    autoSyncDesc: 'Zéro activation manuelle après achat.',
    livePassTitle: 'Pass 100% Concert',
    livePassDesc: 'Aucune carte bancaire. Uniquement pour le live.',
    benefitsKicker: 'PRIVILÈGES',
    benefitsTitle: 'Trois atouts essentiels.',
    b1Title: 'VOS CONCERTS',
    b1Desc: 'Billets et commandes bars liés à votre carte.',
    b1FootL: 'Scène Principale',
    b1FootR: 'NFC Tap',
    b2Title: 'SUR MESURE',
    b2Desc: 'Composite noir anodisé gravé à votre nom.',
    b2Monogram: 'MONOGRAMME',
    b2Engraved: 'NOM GRAVÉ',
    b2Weight: '16.0g',
    b2Chip: 'NFC Actif',
    b3Title: 'ACCÈS VIP',
    b3Desc: 'Entrée anticipée, mezzanine privée et avantages partenaires.',
    b3FootL: 'Mezzanine VIP',
    b3FootR: 'VIP',
    previewFrontBadge: 'PASS',
    previewCore: 'PUCE CRYPTÉE',
    previewEdition: 'ÉDITION PHYSIQUE',
    previewBackLaser: 'GRAVURE LASER',
    previewBackTitle: 'Coupe-File & VIP',
    previewBackDesc: 'Scannez le QR ou effleurez le lecteur NFC aux portiques officiels.',
    previewFounders: (q: number) => `FOUNDERS · ${q} MAX`,
    specMat: 'Titane & Noir Mat',
    specTech: 'NFC & QR',
    seeFront: 'Voir le recto',
    seeBack: 'Voir le verso',
    ownKicker: 'ÉDITION LIMITÉE',
    ownTitle: 'COMMANDEZ LA VÔTRE.',
    ownDesc: 'Composite noir gravé avec puce NFC et QR dynamique.',
    boxLabel: 'LUMARÉEL BLACK CARD',
    inStock: 'EN STOCK',
    waitlist: 'LISTE D’ATTENTE',
    perMonth: '/ mois',
    perYear: '/ an',
    freeShip: 'LIVRAISON OFFERTE',
    boxMeta: (rem: number, q: number) => `${rem} / ${q} restantes · +5 000 FCFA offerts`,
    getCardUpper: 'OBTENIR LA BLACK CARD',
    shipNote: 'Expédition 2–3 jours · Pass digital immédiat.',
    footTag: 'La carte physique de vos concerts LUMARÉEL.',
    footProd: 'Produit',
    footCard: 'La Carte',
    footOrders: 'Mes commandes',
    footWallet: 'Mon Pass',
    footHouse: 'Maison',
    footLineup: 'Programmation',
    footArchives: 'Archives',
    footOrganizers: 'Organisateurs',
    footSec: 'Contrôle',
    footVerify: 'Vérifier une carte',
    footNews: 'Actualités',
    footApply: 'Commander',
    footRights: '© 2026 LUMARÉEL CO.',
    footLoc: 'Abidjan · Live Network',
    // Wizard
    wizHeader: (s: number) => `ADMISSION · ÉTAPE ${s} / 5`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Gravure de la carte',
    wiz1Sub: 'Nom gravé au laser sur votre carte physique.',
    wiz1Label: 'Nom à graver *',
    wiz1Plan: 'Formule',
    wiz1PlanFallback: 'Black Card Annuelle',
    wiz1PlanDesc: 'Carte physique + Pass Digital + Salons VIP',
    wiz1Valid: '1 an',
    wiz1Next: 'Continuer',
    wiz2Title: '2. Coordonnées & Livraison',
    wiz2Sub: 'Votre pass digital et livraison utiliseront ces infos.',
    wiz2Email: 'E-mail *',
    wiz2Phone: 'Téléphone *',
    wiz2City: 'Ville *',
    wiz2Address: 'Adresse / Quartier *',
    wiz2Back: 'Retour',
    wiz2Next: 'Continuer',
    wiz3Title: '3. Préférences',
    wiz3Sub: 'Pour vos invitations privées.',
    wiz3Genre: 'Style préféré',
    wiz3Genres: [
      { value: 'Afrobeats & Live Acoustic', label: 'Afrobeats & Live Acoustique' },
      { value: 'Jazz, Soul & R&B', label: 'Jazz, Soul & R&B' },
      { value: 'Grands Concerts & Festivals', label: 'Grands Concerts & Festivals' },
      { value: 'Loges VIP & Dégustations', label: 'Salons VIP & Privés' },
    ],
    wiz3Ref: 'Code parrain (optionnel)',
    wiz3Next: 'Paiement',
    wiz4Title: '4. Paiement & Activation',
    wiz4Sub: 'Activation immédiate après validation.',
    wiz4Methods: [
      { id: 'wave', label: 'Wave', desc: '0% frais' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instantané' },
      { id: 'djamo', label: 'Djamo', desc: 'Carte' },
      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / MC' },
    ],
    wiz4Membership: 'Adhésion Black Card',
    wiz4CardDelivery: 'Carte gravée & livraison',
    wiz4Included: 'Incluse',
    wiz4Bonus: 'Crédit cashless offert',
    wiz4BonusVal: '+5 000 FCFA',
    wiz4Total: 'Total',
    wiz4Submitting: 'Activation...',
    wiz4Submit: 'Valider & Activer',
    wiz5Kicker: 'ADMISSION CONFIRMÉE',
    wiz5Title: 'BIENVENUE',
    wiz5Desc: (num: string) => `Identifiant officiel : ${num}. Pass digital actif avec +5 000 FCFA offerts.`,
    wiz5Holder: 'Titulaire',
    wiz5Number: 'Numéro',
    wiz5Box: 'Coffret physique',
    wiz5Prep: 'En préparation',
    wiz5Cta: 'Accéder à mon Pass',
    toastMissing: 'Renseignez votre nom complet et votre e-mail.',
    toastOrderErr: 'Impossible de valider votre demande.',
    toastActivated: 'Votre LUMARÉEL Black Card est activée.',
    toastGenericErr: 'Erreur lors du traitement.',
  },
  en: {
    eyebrow: 'THE OFFICIAL LIVE PASS',
    heroTitle1: 'YOUR LIVE WORLD.',
    heroTitle2: 'IN YOUR HANDS.',
    heroSub: 'Tickets, VIP lounges, and fast-track entry in one physical card.',
    ctaPrimary: 'Get Your Black Card',
    ctaSecondary: 'Benefits',
    syncProof: (q: number) => `${q} founding members · Instant sync`,
    verified: 'VERIFIED',
    physicalPass: 'PHYSICAL PASS',
    passHolder: 'PASS HOLDER',
    synced: 'SYNCED',
    howKicker: 'HOW IT WORKS',
    howTitle1: 'Digital tickets,',
    howTitle2: 'made physical.',
    syncTitle: 'Ticket Sync',
    syncSub: 'Real-time wallet sync',
    tapAndGo: 'TAP & GO',
    activeOrder: 'ACTIVE PASS',
    colDate: 'DATE',
    colTier: 'TIER',
    colStatus: 'STATUS',
    statusActive: '• Active',
    syncNote: 'Every mobile ticket automatically syncs to your physical card.',
    tactileKicker: 'TACTILE CHECK-IN',
    laserTitle: 'Laser & NFC Back',
    laserDesc: 'Etched dynamic QR and NFC chip for zero-wait venue entry.',
    flipAria: 'Flip card',
    gateGranted: 'Gate Cleared',
    gateDefault: 'Venue Gate Access',
    gateSubGranted: 'NFC verified',
    gateSubDefault: 'Zero lag',
    autoSyncTitle: 'Auto Sync',
    autoSyncDesc: 'Zero manual setup required.',
    livePassTitle: 'Live-Only Pass',
    livePassDesc: 'Not a bank card. Built purely for live stage access.',
    benefitsKicker: 'PRIVILEGES',
    benefitsTitle: 'Three core perks.',
    b1Title: 'YOUR CONCERTS',
    b1Desc: 'All tickets and venue bar orders linked to one card.',
    b1FootL: 'Main Stage',
    b1FootR: 'Instant Tap',
    b2Title: 'PERSONALIZED',
    b2Desc: 'Anodized matte black composite engraved with your name.',
    b2Monogram: 'CUSTOM MONOGRAM',
    b2Engraved: 'ENGRAVED NAME',
    b2Weight: '16.0g',
    b2Chip: 'NFC Active',
    b3Title: 'VIP ACCESS',
    b3Desc: 'Early soundcheck entry, private mezzanine, and partner perks.',
    b3FootL: 'VIP Mezzanine',
    b3FootR: 'VIP',
    previewFrontBadge: 'PASS',
    previewCore: 'ENCRYPTED CORE',
    previewEdition: 'PHYSICAL EDITION',
    previewBackLaser: 'LASER ETCHED',
    previewBackTitle: 'Fast-Track & Lounges',
    previewBackDesc: 'Scan the QR or tap NFC at official checkpoints.',
    previewFounders: (q: number) => `FOUNDERS · ${q} MAX`,
    specMat: 'Titanium & Matte',
    specTech: 'NFC & QR',
    seeFront: 'Show front',
    seeBack: 'Show back',
    ownKicker: 'LIMITED EDITION',
    ownTitle: 'MAKE IT YOURS.',
    ownDesc: 'Engraved matte black card with integrated NFC and dynamic QR.',
    boxLabel: 'LUMARÉEL BLACK CARD',
    inStock: 'READY TO SHIP',
    waitlist: 'WAITLIST',
    perMonth: '/ month',
    perYear: '/ year',
    freeShip: 'FREE SHIPPING',
    boxMeta: (rem: number, q: number) => `${rem} / ${q} remaining · +5,000 FCFA bonus`,
    getCardUpper: 'GET YOUR BLACK CARD',
    shipNote: 'Ships in 2–3 days · Instant digital pass activation.',
    footTag: 'Physical card for your LUMARÉEL live universe.',
    footProd: 'Product',
    footCard: 'The Card',
    footOrders: 'Concert Orders',
    footWallet: 'My Pass',
    footHouse: 'House',
    footLineup: 'Lineup',
    footArchives: 'Archives',
    footOrganizers: 'Organizers',
    footSec: 'Security',
    footVerify: 'Verify a card',
    footNews: 'News',
    footApply: 'Order now',
    footRights: '© 2026 LUMARÉEL CO.',
    footLoc: 'Abidjan · Live Network',
    // Wizard
    wizHeader: (s: number) => `ADMISSION · STEP ${s} / 5`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Card Engraving',
    wiz1Sub: 'Your name laser-etched onto your physical card.',
    wiz1Label: 'Name to engrave *',
    wiz1Plan: 'Selected Plan',
    wiz1PlanFallback: 'Annual Black Card',
    wiz1PlanDesc: 'Physical card + Digital pass + VIP Lounges',
    wiz1Valid: '1 year',
    wiz1Next: 'Continue',
    wiz2Title: '2. Contact & Delivery',
    wiz2Sub: 'Used to sync your digital pass and ship your box.',
    wiz2Email: 'Email *',
    wiz2Phone: 'Mobile Phone *',
    wiz2City: 'City *',
    wiz2Address: 'Delivery Address *',
    wiz2Back: 'Back',
    wiz2Next: 'Continue',
    wiz3Title: '3. Preferences',
    wiz3Sub: 'Customize your private event invitations.',
    wiz3Genre: 'Preferred genre',
    wiz3Genres: [
      { value: 'Afrobeats & Live Acoustic', label: 'Afrobeats & Live Acoustic' },
      { value: 'Jazz, Soul & R&B', label: 'Jazz, Soul & R&B' },
      { value: 'Grands Concerts & Festivals', label: 'Concerts & Festivals' },
      { value: 'Loges VIP & Dégustations', label: 'VIP Lounges & Private Events' },
    ],
    wiz3Ref: 'Referral code (optional)',
    wiz3Next: 'Payment',
    wiz4Title: '4. Secure Payment',
    wiz4Sub: 'Instant digital activation upon confirmation.',
    wiz4Methods: [
      { id: 'wave', label: 'Wave', desc: '0% fee' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instant' },
      { id: 'djamo', label: 'Djamo', desc: 'Card' },
      { id: 'card', label: 'Bank Card', desc: 'Visa / MC' },
    ],
    wiz4Membership: 'Black Card Membership',
    wiz4CardDelivery: 'Engraved card & shipping',
    wiz4Included: 'Included',
    wiz4Bonus: 'Welcome cashless bonus',
    wiz4BonusVal: '+5,000 FCFA',
    wiz4Total: 'Total',
    wiz4Submitting: 'Activating...',
    wiz4Submit: 'Confirm & Activate',
    wiz5Kicker: 'ADMISSION CONFIRMED',
    wiz5Title: 'WELCOME',
    wiz5Desc: (num: string) => `Official ID: ${num}. Digital pass active with +5,000 FCFA bonus.`,
    wiz5Holder: 'Holder',
    wiz5Number: 'Card Number',
    wiz5Box: 'Physical Box',
    wiz5Prep: 'Preparing',
    wiz5Cta: 'Open My Pass',
    toastMissing: 'Please enter your full name and email address.',
    toastOrderErr: 'Unable to process your membership request.',
    toastActivated: 'Your LUMARÉEL Black Card is now active.',
    toastGenericErr: 'Error processing request.',
  },
} as const;

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
  activeCardNumber,
}) => {
  const { currentUser, events, setCurrentPage, showToast, language } = useApp();
  const c = CARD_COPY[language === 'en' ? 'en' : 'fr'];

  // Edition & Plans data
  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Live personalization name
  const [customName, setCustomName] = useState(
    currentUser?.name ? currentUser.name.toUpperCase() : 'ELENA V. MOREAU'
  );

  // Interactive card & gate simulator state
  const [isShowcaseFlipped, setIsShowcaseFlipped] = useState(false);
  const [isTokenActive, setIsTokenActive] = useState(false);
  const [tapLatency, setTapLatency] = useState('0.2s');

  // Image load fallback tracking
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Multi-step Admission Wizard
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
    if (currentUser?.name) {
      if (!applicantName) setApplicantName(currentUser.name.toUpperCase());
      setCustomName(currentUser.name.toUpperCase());
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
    setApplicantName(customName.trim() || currentUser?.name?.toUpperCase() || '');
    setApplicantEmail(currentUser?.email || '');
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

  const triggerTapSimulation = () => {
    setIsTokenActive(true);
    setTapLatency('0.18s');
    setTimeout(() => {
      setIsTokenActive(false);
      setTapLatency('0.2s');
    }, 1800);
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
  const displayName = (customName.trim() || 'ELENA V. MOREAU').toUpperCase();
  const displaySerial = `#0041-${String(allocated + 1).padStart(2, '0')}`;
  const cardNumber = activeCardNumber || `LMR-2026-${String(allocated + 1).padStart(4, '0')}`;

  const activePlan = selectedPlan || plans[0] || null;
  const planPrice = activePlan?.price ?? 150000;
  const planCurrency = activePlan?.currency || 'FCFA';
  const formattedPrice = `${Number(planPrice).toLocaleString(language === 'en' ? 'en-US' : 'fr-FR')} ${planCurrency}`;

  const featuredConcert = events[0];
  const syncEventTitle = featuredConcert?.title || 'The Neon Horizon World Tour';
  const syncEventDate = featuredConcert?.date || '19 Déc. 2026';
  const syncEventTier = featuredConcert?.categories?.[1]?.name || 'VIP Soundstage';

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#F2F2F2] font-agrandir-regular selection:bg-[#C8B282] selection:text-black">
      {/* =================================================================== */}
      {/* 1. HERO SECTION                                                     */}
      {/* =================================================================== */}
      <section id="section-hero" className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 pb-14 sm:pt-10 sm:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 space-y-5 text-left">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.16em] text-neutral-300 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F249]" aria-hidden="true" />
              <span>{c.eyebrow}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-[3.5rem] font-agrandir-extrabold uppercase tracking-tight leading-[1.02] text-white max-w-xl">
              {c.heroTitle1} <br />
              <span className="text-[#C8B282]">{c.heroTitle2}</span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-400 font-light leading-relaxed max-w-md">
              {c.heroSub}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => openAdmissionWizard(activePlan || undefined)}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black text-xs font-agrandir-extrabold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {c.ctaPrimary}
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-benefits')}
                className="px-6 py-3.5 rounded-full bg-[#111111] hover:bg-[#1B1B1B] border border-white/15 text-white text-xs font-agrandir-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {c.ctaSecondary}
              </button>
            </div>

            <div className="pt-2 flex items-center gap-3.5">
              <div className="flex items-center -space-x-1.5">
                <span className="w-7 h-7 rounded-lg bg-[#1A1A1A] border border-white/15 flex items-center justify-center text-[10px] font-mono font-semibold text-neutral-300">
                  01
                </span>
                <span className="w-7 h-7 rounded-lg bg-[#C8B282] border border-[#050505] flex items-center justify-center text-[10px] font-mono font-bold text-black">
                  02
                </span>
                <span className="w-7 h-7 rounded-lg bg-white border border-[#050505] flex items-center justify-center text-[10px] font-mono font-bold text-black">
                  03
                </span>
              </div>
              <span className="text-xs text-neutral-400">{c.syncProof(quota)}</span>
            </div>
          </div>

          <div className="lg:col-span-6 relative pb-10 sm:pb-12">
            <div className="rounded-[26px] bg-[#0B0B0B] border border-white/10 p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.85)]">
              <div className="grid grid-cols-12 gap-2.5 h-[340px] sm:h-[400px]">
                <div className="col-span-6 grid grid-rows-2 gap-2.5 h-full">
                  <div className="relative rounded-2xl overflow-hidden bg-[#141414]">
                    {!failedImages['heroTop'] ? (
                      <img
                        src={heroLoungeTopImg}
                        alt="LUMARÉEL VIP Lounge"
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed('heroTop')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1C1810] to-[#080808] flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-[#C8B282]/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>

                  <div className="relative rounded-2xl overflow-hidden bg-[#141414]">
                    {!failedImages['heroPortrait'] ? (
                      <img
                        src={heroPortraitLeftImg}
                        alt="LUMARÉEL Live Night"
                        referrerPolicy="no-referrer"
                        onError={() => markImageFailed('heroPortrait')}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1A1612] to-[#080808] flex items-center justify-center">
                        <User className="w-6 h-6 text-[#C8B282]/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  </div>
                </div>

                <div className="col-span-6 relative rounded-2xl overflow-hidden bg-[#141414] h-full">
                  {!failedImages['heroTall'] ? (
                    <img
                      src={heroNightTallImg}
                      alt="LUMARÉEL Backstage"
                      referrerPolicy="no-referrer"
                      onError={() => markImageFailed('heroTall')}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#18140C] to-[#050505] flex items-center justify-center">
                      <Radio className="w-7 h-7 text-[#C8B282]/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                </div>
              </div>

              <div className="mt-2.5 rounded-2xl bg-[#111111] border border-white/10 px-4 py-3 flex items-center justify-end">
                <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[#B8F249]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{c.verified}</span>
                </div>
              </div>
            </div>

            <div className="absolute left-2 sm:-left-6 bottom-0 w-[260px] sm:w-[295px] rounded-2xl bg-gradient-to-br from-[#171717] via-[#0B0B0B] to-[#030303] border border-[#C8B282]/40 p-4 sm:p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-agrandir-extrabold text-xs tracking-wider text-white uppercase">
                    LUMARÉEL
                  </span>
                  <span className="text-[9px] font-mono tracking-widest text-[#C8B282] uppercase">
                    BLACK
                  </span>
                </div>
                <Wifi className="w-3.5 h-3.5 text-neutral-400 rotate-90" />
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-6 rounded-[4px] bg-gradient-to-br from-[#F2DFB2] via-[#C8B282] to-[#7D6638] border border-black/40 p-0.5 grid grid-cols-2 gap-0.5">
                  <div className="border-r border-b border-black/35" />
                  <div className="border-b border-black/35" />
                  <div className="border-r border-black/35" />
                  <div />
                </div>
                <span className="text-[9px] font-mono tracking-[0.2em] text-neutral-400 uppercase">
                  {c.physicalPass}
                </span>
              </div>

              <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/10">
                <div className="min-w-0">
                  <div className="text-[8px] font-mono tracking-[0.2em] text-neutral-500 uppercase">
                    {c.passHolder}
                  </div>
                  <div className="text-xs font-agrandir-extrabold text-white uppercase truncate">
                    {displayName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[8px] font-mono font-bold tracking-widest text-[#B8F249] uppercase">
                    {c.synced}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-300 tabular-nums">
                    {displaySerial}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 2. HOW IT WORKS                                                     */}
      {/* =================================================================== */}
      <section id="section-how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 sm:pb-20">
        <div className="rounded-[28px] bg-[#0B0B0B] border border-white/10 p-6 sm:p-10">
          <div className="max-w-xl space-y-2 mb-8 text-left">
            <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
              {c.howKicker}
            </div>
            <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tracking-tight leading-[1.08]">
              {c.howTitle1} <br />
              {c.howTitle2}
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-2xl bg-[#121212] border border-white/10 p-6 flex flex-col justify-between gap-5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4 text-[#C8B282]" />
                  </div>
                  <div>
                    <div className="text-xs font-agrandir-bold text-white">{c.syncTitle}</div>
                    <div className="text-[11px] text-neutral-500">{c.syncSub}</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#B8F249] uppercase">
                  {c.tapAndGo}
                </span>
              </div>

              <div className="rounded-xl bg-[#080808] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[9px] font-mono tracking-[0.18em] text-neutral-500 uppercase mb-1">
                      {c.activeOrder}
                    </div>
                    <div className="text-sm sm:text-base font-agrandir-extrabold text-white">
                      {syncEventTitle}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#C8B282] shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10 text-left">
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                      {c.colDate}
                    </div>
                    <div className="text-xs font-agrandir-semibold text-neutral-200 tabular-nums">
                      {syncEventDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                      {c.colTier}
                    </div>
                    <div className="text-xs font-agrandir-semibold text-neutral-200 truncate">
                      {syncEventTier}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                      {c.colStatus}
                    </div>
                    <div className="text-xs font-agrandir-semibold text-[#B8F249]">
                      {c.statusActive}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-400 font-light">{c.syncNote}</p>
            </div>

            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#070707] via-[#050505] to-[#11100C] border border-[#C8B282]/30 p-6 flex flex-col justify-between gap-6 text-left">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-[#C8B282] uppercase">
                    {c.tactileKicker}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsShowcaseFlipped((prev) => !prev)}
                    aria-label={c.flipAria}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-[#C8B282] transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-xl sm:text-2xl font-agrandir-extrabold text-white tracking-tight">
                  {c.laserTitle}
                </h3>

                <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
                  {c.laserDesc}
                </p>
              </div>

              <button
                type="button"
                onClick={triggerTapSimulation}
                className="w-full rounded-xl bg-[#131313] hover:bg-[#191919] border border-white/10 hover:border-[#B8F249]/40 p-3.5 flex items-center justify-between transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white text-black flex items-center justify-center shrink-0">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-agrandir-bold text-white">
                      {isTokenActive ? c.gateGranted : c.gateDefault}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {isTokenActive ? c.gateSubGranted : c.gateSubDefault}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#B8F249] tabular-nums">
                  {tapLatency}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div className="rounded-2xl bg-[#121212] border border-white/10 p-5 flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C8B282] shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-agrandir-bold text-white">{c.autoSyncTitle}</h4>
                <p className="text-xs text-neutral-400 font-light">{c.autoSyncDesc}</p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#121212] border border-white/10 p-5 flex items-center gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C8B282] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-agrandir-bold text-white">{c.livePassTitle}</h4>
                <p className="text-xs text-neutral-400 font-light">{c.livePassDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. THREE CORE PERKS                                                 */}
      {/* =================================================================== */}
      <section id="section-benefits" className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 sm:pb-20">
        <div className="text-center max-w-xl mx-auto space-y-2 mb-10">
          <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
            {c.benefitsKicker}
          </div>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tracking-tight leading-[1.08]">
            {c.benefitsTitle}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="rounded-[24px] bg-[#0B0B0B] border border-white/10 p-6 flex flex-col justify-between gap-5 text-left">
            <div className="space-y-2">
              <div className="text-3xl font-agrandir-extrabold text-[#C8B282] tabular-nums">01</div>
              <h3 className="text-base font-agrandir-extrabold uppercase tracking-wide text-white">
                {c.b1Title}
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">{c.b1Desc}</p>
            </div>

            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#141414] border border-white/10">
                {!failedImages['crowd'] ? (
                  <img
                    src={concertsCrowdImg}
                    alt={c.b1Title}
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed('crowd')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1C160E] to-[#070707] flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-[#C8B282]/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                <span className="text-neutral-200 font-agrandir-semibold">{c.b1FootL}</span>
                <span className="text-neutral-500 font-mono">{c.b1FootR}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#0B0B0B] border border-white/10 p-6 flex flex-col justify-between gap-5 text-left">
            <div className="space-y-2">
              <div className="text-3xl font-agrandir-extrabold text-white tabular-nums">02</div>
              <h3 className="text-base font-agrandir-extrabold uppercase tracking-wide text-white">
                {c.b2Title}
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">{c.b2Desc}</p>
            </div>

            <div className="rounded-xl bg-[#121212] border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between text-[9px] font-mono tracking-wider uppercase text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8B282]" />
                  <span>{c.b2Monogram}</span>
                </span>
                <span className="text-neutral-500">LMR-BLACK</span>
              </div>

              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                  {c.b2Engraved}
                </div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                  maxLength={28}
                  aria-label={c.b2Engraved}
                  className="w-full bg-black/70 border border-white/10 focus:border-[#C8B282] rounded-lg px-2.5 py-1.5 text-sm font-agrandir-extrabold uppercase tracking-wide text-white outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                <span className="text-neutral-500">{c.b2Weight}</span>
                <span className="text-[#B8F249] font-semibold">{c.b2Chip}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-[#0B0B0B] border border-white/10 p-6 flex flex-col justify-between gap-5 text-left">
            <div className="space-y-2">
              <div className="text-3xl font-agrandir-extrabold text-[#B8F249] tabular-nums">03</div>
              <h3 className="text-base font-agrandir-extrabold uppercase tracking-wide text-white">
                {c.b3Title}
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">{c.b3Desc}</p>
            </div>

            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#141414] border border-white/10">
                {!failedImages['vip'] ? (
                  <img
                    src={vipMezzanineImg}
                    alt={c.b3Title}
                    referrerPolicy="no-referrer"
                    onError={() => markImageFailed('vip')}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1C1810] to-[#070707] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#C8B282]/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px]">
                <span className="text-neutral-200 font-agrandir-semibold">{c.b3FootL}</span>
                <span className="text-[10px] font-mono font-bold text-[#C8B282] uppercase">
                  {c.b3FootR}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. MAKE IT YOURS                                                    */}
      {/* =================================================================== */}
      <section id="section-make-it-yours" className="max-w-6xl mx-auto px-4 sm:px-8 pb-16 sm:pb-20">
        <div className="rounded-[28px] bg-[#0B0B0B] border border-white/10 p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 flex flex-col items-center">
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
                className="w-full max-w-[380px] cursor-pointer perspective-[1200px]"
                style={{ aspectRatio: '85.6 / 53.98' }}
              >
                <motion.div
                  animate={{ rotateY: isShowcaseFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="absolute inset-0 rounded-[20px] p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-br from-[#191919] via-[#0B0B0B] to-[#040404] border border-[#C8B282]/40 shadow-[0_28px_70px_rgba(0,0,0,0.95)]"
                    style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-agrandir-extrabold text-sm sm:text-base tracking-tight text-white uppercase">
                          LUMARÉEL
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#C8B282]/15 border border-[#C8B282]/40 text-[9px] font-mono tracking-widest text-[#C8B282] uppercase">
                          {c.previewFrontBadge}
                        </span>
                      </div>
                      <Wifi className="w-4 h-4 text-neutral-400 rotate-90" />
                    </div>

                    <div className="flex items-center gap-3.5 my-auto">
                      <div className="w-11 h-8 rounded-md bg-gradient-to-br from-[#F4E1B6] via-[#C8B282] to-[#7D6638] p-0.5 border border-black/40 grid grid-cols-3 gap-0.5">
                        <div className="border-r border-b border-black/35" />
                        <div className="border-b border-black/35" />
                        <div className="border-l border-b border-black/35" />
                        <div className="border-r border-black/35" />
                        <div className="bg-black/15" />
                        <div className="border-l border-black/35" />
                      </div>
                      <div>
                        <div className="text-[8px] font-mono tracking-[0.2em] text-neutral-500 uppercase">
                          {c.previewCore}
                        </div>
                        <div className="text-xs font-mono tracking-[0.18em] text-neutral-200 tabular-nums">
                          0042 · 8821 · 9102
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-2 border-t border-white/10">
                      <div className="min-w-0">
                        <div className="text-[8px] font-mono tracking-[0.2em] text-neutral-500 uppercase">
                          {c.previewEdition}
                        </div>
                        <div className="text-sm font-agrandir-extrabold text-white uppercase truncate">
                          {displayName}
                        </div>
                      </div>
                      <QrCode className="w-5 h-5 text-[#C8B282] shrink-0" />
                    </div>
                  </div>

                  <div
                    className="absolute inset-0 rounded-[20px] p-5 sm:p-6 flex flex-col justify-between bg-[#060606] border border-white/20 shadow-[0_28px_70px_rgba(0,0,0,0.95)]"
                    style={{
                      backfaceVisibility: 'hidden',
                      WebkitBackfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                      <span className="text-[9px] font-mono tracking-[0.2em] text-[#C8B282] uppercase">
                        {c.previewBackLaser} · {cardNumber}
                      </span>
                      <span className="text-[9px] font-mono text-[#B8F249] uppercase">
                        NFC 13.56 MHZ
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 my-auto">
                      <div className="space-y-1.5 text-left">
                        <div className="text-xs font-agrandir-bold text-white uppercase">
                          {c.previewBackTitle}
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                          {c.previewBackDesc}
                        </p>
                      </div>
                      <div className="w-16 h-16 rounded-xl bg-white p-2 flex items-center justify-center shrink-0">
                        <QrCode className="w-12 h-12 text-black" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 pt-2 border-t border-white/10">
                      <span>{c.previewFounders(quota)}</span>
                      <span className="text-white">{displaySerial}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                <span>{c.specMat}</span>
                <span aria-hidden="true">·</span>
                <span>{c.specTech}</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setIsShowcaseFlipped((prev) => !prev)}
                  className="text-[#C8B282] hover:underline cursor-pointer"
                >
                  {isShowcaseFlipped ? c.seeFront : c.seeBack}
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-5 text-left">
              <div className="space-y-2">
                <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
                  {c.ownKicker}
                </div>
                <h2 className="text-3xl sm:text-5xl font-agrandir-extrabold uppercase text-white tracking-tight leading-none">
                  {c.ownTitle}
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 font-light max-w-xl">
                  {c.ownDesc}
                </p>
              </div>

              {plans.length > 1 && (
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#131313] border border-white/10">
                  {plans.map((plan) => {
                    const isActive = activePlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-agrandir-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          isActive
                            ? 'bg-white text-black'
                            : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        {plan.name}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="rounded-2xl bg-[#131313] border border-white/10 p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono tracking-[0.16em] text-neutral-400 uppercase">
                    {c.boxLabel}
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider text-[#B8F249] uppercase">
                    {remaining > 0 ? c.inStock : c.waitlist}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tabular-nums">
                      {loading ? '...' : formattedPrice}
                    </span>
                    <span className="text-xs font-mono text-neutral-400 uppercase">
                      {activePlan?.durationMonths === 1 ? c.perMonth : c.perYear}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-[#C8B282] uppercase">
                    {c.freeShip}
                  </span>
                </div>

                <div className="text-xs text-neutral-400 font-light">
                  {c.boxMeta(remaining, quota)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openAdmissionWizard(activePlan || undefined)}
                className="w-full py-4 px-6 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <span>{c.getCardUpper}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-neutral-500">
                <Lock className="w-3.5 h-3.5 text-[#B8F249]" />
                <span>{c.shipNote}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. MINIMAL LANDING FOOTER                                           */}
      {/* =================================================================== */}
      <footer className="border-t border-white/10 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            <div className="col-span-2 lg:col-span-1 space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="font-agrandir-extrabold text-sm tracking-tight text-white uppercase">
                  LUMARÉEL
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#151515] border border-[#C8B282]/30 text-[9px] font-mono tracking-widest text-[#C8B282] uppercase">
                  BLACK
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">{c.footTag}</p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-agrandir-bold text-white">{c.footProd}</div>
              <div className="flex flex-col gap-1.5 text-neutral-400">
                <button
                  type="button"
                  onClick={() => scrollToSection('section-hero')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footCard}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('client_space')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footOrders}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onGoToWallet) onGoToWallet();
                    else setCurrentPage('member_card');
                  }}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footWallet}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-agrandir-bold text-white">{c.footHouse}</div>
              <div className="flex flex-col gap-1.5 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage('home')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footLineup}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('archive')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footArchives}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('organizers')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footOrganizers}
                </button>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="font-agrandir-bold text-white">{c.footSec}</div>
              <div className="flex flex-col gap-1.5 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage('card_verify')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footVerify}
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('news')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  {c.footNews}
                </button>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(activePlan || undefined)}
                  className="text-left hover:text-white transition-colors cursor-pointer"
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
      {/* 6. 5-STEP ADMISSION WIZARD MODAL                                    */}
      {/* =================================================================== */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl rounded-3xl bg-[#0B0B0B] border border-[#C8B282]/40 p-6 sm:p-8 shadow-2xl my-8 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C8B282]">
                    {c.wizHeader(wizardStep)}
                  </span>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase mt-0.5">
                    {c.wizTitle}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
                      onChange={(e) => {
                        setApplicantName(e.target.value.toUpperCase());
                        setCustomName(e.target.value.toUpperCase());
                      }}
                      placeholder="ELENA V. MOREAU"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white font-mono text-sm uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131313] border border-[#C8B282]/35 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-agrandir-bold text-[#C8B282] uppercase tracking-wider block">
                        {c.wiz1Plan}
                      </span>
                      <strong className="text-sm font-agrandir-bold text-white uppercase">
                        {activePlan?.name || c.wiz1PlanFallback}
                      </strong>
                      <p className="text-[11px] text-neutral-400 font-light">{c.wiz1PlanDesc}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-agrandir-extrabold text-[#C8B282] font-mono tabular-nums">
                        {formattedPrice}
                      </div>
                      <span className="text-[9px] text-neutral-400 uppercase">{c.wiz1Valid}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!applicantName.trim()}
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none"
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
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {c.wiz2Back}
                    </button>

                    <button
                      type="button"
                      disabled={!applicantEmail.trim() || !applicantPhone.trim()}
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none cursor-pointer"
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
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white font-mono text-xs uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {c.wiz2Back}
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
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
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-[#C8B282]/15 border-[#C8B282] text-white'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <CreditCard className="w-4 h-4 text-[#C8B282] mb-1.5" />
                        <div className="font-agrandir-bold text-xs text-white uppercase">{m.label}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{m.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-white/15 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>{c.wiz4Membership}</span>
                      <span className="font-mono text-white tabular-nums">{formattedPrice}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>{c.wiz4CardDelivery}</span>
                      <span className="text-[#B8F249] font-mono">{c.wiz4Included}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>{c.wiz4Bonus}</span>
                      <span className="text-[#C8B282] font-mono">{c.wiz4BonusVal}</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between font-agrandir-extrabold text-sm text-white">
                      <span>{c.wiz4Total}</span>
                      <span className="text-[#C8B282] font-mono tabular-nums">{formattedPrice}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {c.wiz2Back}
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition-colors"
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
                <div className="text-center space-y-5 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#B8F249]/15 text-[#B8F249] border border-[#B8F249]/40 flex items-center justify-center mx-auto shadow-2xl">
                    <CheckCircle2 className="w-8 h-8" />
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

                  <div className="p-4 rounded-2xl bg-black border border-[#C8B282]/40 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{c.wiz5Holder}</span>
                      <strong className="text-white uppercase font-mono">
                        {issuedResult.card.cardholderName}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{c.wiz5Number}</span>
                      <strong className="text-[#C8B282] font-mono">
                        {issuedResult.card.cardNumber}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">{c.wiz5Box}</span>
                      <span className="text-[#B8F249] font-mono">{c.wiz5Prep}</span>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-wrap justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWizardOpen(false);
                        if (onGoToWallet) onGoToWallet();
                        else setCurrentPage('member_card');
                      }}
                      className="px-8 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors shadow-xl"
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
