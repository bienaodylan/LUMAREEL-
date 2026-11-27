import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import { saveStoredMemberCard } from '../utils/memberCardStorage';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  Minus,
  RotateCw,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LumareelCardLandingPageProps {
  onGoToWallet?: () => void;
  onCardIssued?: (card: MembershipCard) => void;
  hasActiveCard?: boolean;
  activeCardNumber?: string;
}

const CARD_COPY = {
  fr: {
    heroTitle1: 'Le cercle',
    heroTitle2: 'LUMARÉEL.',
    heroSub:
      'Une adhésion pour vivre chaque événement autrement : en avance, au plus près, avec ceux qui le font.',
    benefitsKicker: 'AVANTAGES MEMBRES',
    perksList: [
      {
        num: '01',
        title: 'Préventes et Flash Drops réservés',
        desc: "Accès avant l'ouverture publique.",
      },
      {
        num: '02',
        title: 'Entrée dédiée',
        desc: 'File membre aux événements partenaires.',
      },
      {
        num: '03',
        title: 'Souvenirs VIP & invitations',
        desc: 'Contenus exclusifs, rencontres, soirées privées.',
      },
    ],
    digitalPhysicalKicker: 'NUMÉRIQUE + PHYSIQUE',
    digitalPhysicalCopy:
      "Votre carte est active dans l'app dès l'adhésion. La carte physique NFC, à votre nom, est associée à votre compte puis remise par l'équipe. Elle matérialise votre statut — ce n'est pas une carte de paiement.",
    annualLabel: 'Adhésion annuelle',
    ctaBecomeMember: 'Devenir membre',
    ctaViewMyCard: 'Voir ma carte active',
    footnote: "Adhésion ouverte · paiement Mobile Money ou carte · conditions d'adhésion",
    memberLabel: 'MEMBRE',
    yourNamePlaceholder: 'VOTRE NOM',
    // Wizard (4 steps: Name -> Contact/Delivery -> Payment -> Confirmation)
    wizHeader: (s: number) => `ADHÉSION · ÉTAPE ${s} / 4`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Votre nom complet',
    wiz1Sub: 'Gravé sur votre carte physique NFC et lié à votre statut membre.',
    wiz1Label: 'Nom complet *',
    wiz1Plan: 'Formule choisie',
    wiz1PlanFallback: 'LUMARÉEL Black Card',
    wiz1PlanDesc: 'Carte numérique immédiate + carte physique NFC (statut membre, hors paiement)',
    wiz1Valid: 'Adhésion',
    wiz1Next: 'Continuer',
    wiz2Title: '2. Coordonnées & remise',
    wiz2Sub: 'Pour activer votre statut membre et vous remettre votre carte NFC.',
    wiz2Email: 'E-mail *',
    wiz2Phone: 'Téléphone *',
    wiz2City: 'Ville *',
    wiz2Address: 'Quartier / Adresse *',
    wiz2Back: 'Retour',
    wiz2Next: 'Continuer',
    wiz3Title: '3. Règlement de l’adhésion',
    wiz3Sub: 'Votre statut membre et votre carte numérique s’activent dès validation.',
    wiz3Methods: [
      { id: 'wave', label: 'Wave', desc: '0% frais' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Rapide' },
      { id: 'moov_money', label: 'Moov Money', desc: 'Flooz' },
      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / MC' },
    ],
    wiz3Membership: 'Adhésion LUMARÉEL Black Card',
    wiz3CardDelivery: 'Remise carte physique NFC',
    wiz3Included: 'Incluse',
    wiz3Bonus: 'Statut membre & accès dédié',
    wiz3BonusVal: 'Actif',
    wiz3Total: 'Total à régler',
    wiz3Submitting: 'Validation...',
    wiz3Submit: 'Valider mon adhésion',
    wiz4Kicker: 'ADHÉSION CONFIRMÉE',
    wiz4Title: 'BIENVENUE AU CERCLE',
    wiz4Desc: (num: string) =>
      `Votre référence membre : ${num}. Votre Black Card numérique est déjà active.`,
    wiz4Holder: 'Titulaire',
    wiz4Number: 'Référence',
    wiz4Box: 'Carte NFC',
    wiz4Prep: 'Préparation équipe',
    wiz4Cta: 'Accéder à ma carte',
    wizMinimize: 'Réduire',
    wizCancel: 'Fermer',
    wizMissingName: 'Entrez votre nom complet pour continuer.',
    wizMissingContact: 'Entrez votre e-mail et votre numéro de téléphone.',
    wizInvalidEmail: 'Entrez une adresse e-mail valide.',
    toastMissing: 'Renseignez votre nom complet et votre e-mail.',
    toastOrderErr: 'Impossible de valider votre adhésion pour le moment. Réessayez.',
    toastActivated: 'Votre LUMARÉEL Black Card est active.',
  },
  en: {
    heroTitle1: 'The LUMARÉEL',
    heroTitle2: 'circle.',
    heroSub:
      'A membership to experience every event differently: ahead of everyone, closer to the stage, with those who make it happen.',
    benefitsKicker: 'MEMBER BENEFITS',
    perksList: [
      {
        num: '01',
        title: 'Reserved presales & Flash Drops',
        desc: 'Access before public release.',
      },
      {
        num: '02',
        title: 'Dedicated entrance',
        desc: 'Member lane at partner events.',
      },
      {
        num: '03',
        title: 'VIP Memories & invitations',
        desc: 'Exclusive content, artist meetings, private nights.',
      },
    ],
    digitalPhysicalKicker: 'DIGITAL + PHYSICAL',
    digitalPhysicalCopy:
      'Your card is active in the app immediately upon joining. The personalized physical NFC card is linked to your account and handed over by the team. It certifies your member status — it is not a payment card.',
    annualLabel: 'Annual membership',
    ctaBecomeMember: 'Become a member',
    ctaViewMyCard: 'View my active card',
    footnote: 'Open membership · Mobile Money or card payment · membership terms apply',
    memberLabel: 'MEMBER',
    yourNamePlaceholder: 'YOUR NAME',
    wizHeader: (s: number) => `MEMBERSHIP · STEP ${s} / 4`,
    wizTitle: 'LUMARÉEL Black Card',
    wiz1Title: '1. Your Full Name',
    wiz1Sub: 'Linked to your member account and engraved on your physical NFC card.',
    wiz1Label: 'Full name *',
    wiz1Plan: 'Selected Plan',
    wiz1PlanFallback: 'LUMARÉEL Black Card',
    wiz1PlanDesc: 'Instant digital card + physical NFC card (status card, non-payment)',
    wiz1Valid: 'Membership',
    wiz1Next: 'Continue',
    wiz2Title: '2. Contact & Handover',
    wiz2Sub: 'Used to activate your status and coordinate physical NFC card handover.',
    wiz2Email: 'Email *',
    wiz2Phone: 'Mobile Phone *',
    wiz2City: 'City *',
    wiz2Address: 'District / Address *',
    wiz2Back: 'Back',
    wiz2Next: 'Continue',
    wiz3Title: '3. Membership Payment',
    wiz3Sub: 'Your LUMARÉEL Black Card activates immediately upon confirmation.',
    wiz3Methods: [
      { id: 'wave', label: 'Wave', desc: '0% fee' },
      { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instant' },
      { id: 'moov_money', label: 'Moov Money', desc: 'Flooz' },
      { id: 'card', label: 'Bank Card', desc: 'Visa / MC' },
    ],
    wiz3Membership: 'LUMARÉEL Black Card Membership',
    wiz3CardDelivery: 'Physical NFC card handover',
    wiz3Included: 'Included',
    wiz3Bonus: 'Member status & fast-track',
    wiz3BonusVal: 'Active',
    wiz3Total: 'Total',
    wiz3Submitting: 'Activating...',
    wiz3Submit: 'Confirm & Pay',
    wiz4Kicker: 'MEMBERSHIP CONFIRMED',
    wiz4Title: 'WELCOME TO THE CIRCLE',
    wiz4Desc: (num: string) =>
      `Your member reference: ${num}. Your digital Black Card is now active.`,
    wiz4Holder: 'Holder',
    wiz4Number: 'Reference',
    wiz4Box: 'NFC Card',
    wiz4Prep: 'Team preparation',
    wiz4Cta: 'Open My Card',
    wizMinimize: 'Minimize',
    wizCancel: 'Close',
    wizMissingName: 'Please enter your full name to continue.',
    wizMissingContact: 'Please enter your email and mobile number.',
    wizInvalidEmail: 'Please enter a valid email address.',
    toastMissing: 'Please enter your full name and email address.',
    toastOrderErr: 'Unable to process your membership right now. Please try again.',
    toastActivated: 'Your LUMARÉEL Black Card is now active.',
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

  // Données réelles d'édition et de tarifs depuis /api/membership/editions
  const [, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Tunnel de commande en 4 étapes (Nom -> Coordonnées -> Paiement -> Confirmation)
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

  // Gel propre du scroll de fond lorsque la modale de commande est ouverte
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
    if (!currentUser || !currentUser.emailVerified) {
      setIsAuthModalOpen(true);
      showToast(
        language === 'en'
          ? 'Sign in with a verified email to join the Black Card circle.'
          : 'Connectez-vous avec un e-mail vérifié pour adhérer à la Black Card.',
        'error'
      );
      return;
    }
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

      const initRes = await fetch('/api/payments/paymetrust/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });
      const initData = await parseJsonSafely(initRes);

      let issuedCard: MembershipCard | null = null;

      if (initRes.ok && initData?.success && initData?.transaction) {
        const tx = initData.transaction;

        if (
          tx.mode === 'live' &&
          typeof tx.paymentUrl === 'string' &&
          /^https?:\/\//i.test(tx.paymentUrl)
        ) {
          window.location.assign(tx.paymentUrl);
          return;
        }

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

  const activePlan = selectedPlan || plans[0] || null;
  const planPrice = activePlan?.price ?? 50000;
  const planCurrency = activePlan?.currency || 'FCFA';
  const formattedPrice = `${Number(planPrice).toLocaleString(
    language === 'en' ? 'en-US' : 'fr-FR'
  )} ${planCurrency}`;

  const holderDisplayName = (currentUser?.name || c.yourNamePlaceholder).toUpperCase();

  return (
    <div className="w-full bg-black text-white font-agrandir-regular">
      {/* =================================================================== */}
      {/* ÉCRAN 05 — BLACK CARD (FIDÈLE 1:1 À LA MAQUETTE OFFICIELLE)         */}
      {/* =================================================================== */}
      <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-3 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Colonne gauche (mobile: haut) : Carte noire mate NFC + Titre */}
          <div className="lg:col-span-6 space-y-8">
            {/* Carte noire mate avec contour doré fin & ondes NFC (arrondi léger 12px) */}
            <div className="relative w-full max-w-[420px] mx-auto lg:mx-0">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-4 bg-[#D4AF6A]/[0.06] blur-2xl"
              />
              <div className="relative aspect-[1.586/1] w-full rounded-[20px] border border-[#D4AF6A]/45 bg-gradient-to-br from-[#16120B] via-[#0B0B0B] to-[#070707] p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)]">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-12 -right-8 w-44 h-44 rounded-full bg-[#D4AF6A]/12 blur-3xl"
                />

                {/* Haut de carte : LUMARÉEL + icône sans contact dorée */}
                <div className="relative z-10 flex items-center justify-between gap-3">
                  <span className="font-agrandir-extrabold text-sm sm:text-base uppercase tracking-[0.28em] text-white">
                    LUMARÉEL
                  </span>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-label="NFC"
                    className="text-[#D4AF6A] shrink-0"
                  >
                    <path
                      d="M8.5 16.5C10.3 14.7 10.3 9.3 8.5 7.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M12.2 18.8C15.1 15.9 15.1 8.1 12.2 5.2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M16 21C19.8 17.2 19.8 6.8 16 3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Bas de carte : BLACK CARD + Titulaire | MEMBRE */}
                <div className="relative z-10 flex items-end justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#D4AF6A]">
                      BLACK CARD
                    </span>
                    <span className="mt-1 block font-agrandir-extrabold text-sm sm:text-base uppercase tracking-[0.06em] text-white truncate">
                      {holderDisplayName}
                    </span>
                  </div>
                  <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#9A9A9A] shrink-0">
                    {c.memberLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Grand titre éditorial */}
            <div className="space-y-4">
              <h1 className="font-agrandir-extrabold text-[2.45rem] sm:text-5xl xl:text-[3.4rem] leading-[0.98] tracking-tight text-white">
                {c.heroTitle1}
                <br />
                {c.heroTitle2}
              </h1>
              <p className="text-sm sm:text-base text-[#C8C8C8] leading-relaxed max-w-md">
                {c.heroSub}
              </p>
            </div>
          </div>

          {/* Colonne droite (mobile: suite) : Avantages, Statut non bancaire, Tarif & CTA */}
          <div className="lg:col-span-6 space-y-8">
            {/* AVANTAGES MEMBRES (01, 02, 03) */}
            <section className="space-y-3">
              <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                {c.benefitsKicker}
              </p>

              <ol className="divide-y divide-white/[0.12] border-b border-white/[0.12]">
                {c.perksList.map((perk) => (
                  <li key={perk.num} className="py-4 flex items-start gap-4">
                    <span className="text-xs font-mono font-semibold text-[#D4AF6A] tabular-nums pt-0.5 w-6 shrink-0">
                      {perk.num}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="font-agrandir-extrabold text-sm sm:text-base text-white leading-snug">
                        {perk.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                        {perk.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* NUMÉRIQUE + PHYSIQUE — Mention obligatoire (pas une carte de paiement) */}
            <section className="space-y-2.5">
              <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                {c.digitalPhysicalKicker}
              </p>
              <p className="text-sm text-[#C8C8C8] leading-relaxed">
                {c.digitalPhysicalCopy}
              </p>
            </section>

            {/* Sélecteur de formule si plusieurs plans backend existent */}
            {plans.length > 1 && (
              <div className="inline-flex flex-wrap items-center gap-1.5 p-1 rounded-full bg-[#0E0E0E] border border-white/[0.12]">
                {plans.map((plan) => {
                  const isActive = activePlan?.id === plan.id;
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`min-h-[38px] px-4 rounded-full text-xs transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-white text-black font-agrandir-extrabold'
                          : 'text-[#9A9A9A] hover:text-white font-agrandir-semibold'
                      }`}
                    >
                      {plan.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Séparateur doré + Prix réel + CTA plein-largeur */}
            <section className="pt-5 border-t border-white/[0.14] space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#C8C8C8]">{c.annualLabel}</span>
                <span className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tabular-nums tracking-tight">
                  {loading ? '...' : formattedPrice}
                </span>
              </div>

              {hasActiveCard ? (
                <button
                  type="button"
                  onClick={() => onGoToWallet?.()}
                  className="w-full min-h-[52px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm sm:text-base transition-colors cursor-pointer lum-press"
                >
                  {c.ctaViewMyCard}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(activePlan || undefined)}
                  className="w-full min-h-[52px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm sm:text-base transition-colors cursor-pointer lum-press"
                >
                  {c.ctaBecomeMember}
                </button>
              )}

              <p className="text-[11px] text-[#9A9A9A] text-center leading-relaxed">
                {c.footnote}
              </p>
            </section>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* TUNNEL SIGNATURE BLACK CARD EN 4 ÉTAPES (PAYMETRUST / API RÉELLE)   */}
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
                className="fixed bottom-24 right-4 z-[90] min-h-[44px] px-4 rounded-full bg-[#D4AF6A] text-black font-agrandir-extrabold text-xs shadow-2xl flex items-center gap-2 cursor-pointer"
              >
                <span>{c.wizTitle}</span>
                <span className="font-mono">({wizardStep}/4)</span>
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
                className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center sm:p-4 bg-black/90 backdrop-blur-md touch-none overscroll-none"
              >
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="relative w-full max-w-xl max-h-[90dvh] sm:max-h-[86vh] flex flex-col overflow-hidden bg-[#090909] rounded-t-[16px] sm:rounded-[12px] border-t sm:border border-white/[0.14] shadow-[0_24px_80px_rgba(0,0,0,0.95)] text-left touch-auto"
                >
                  {/* En-tête fixe signature */}
                  <div className="shrink-0 px-5 sm:px-6 pt-3 sm:pt-5 pb-4 border-b border-white/[0.1] bg-[#090909]">
                    <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3 sm:hidden" />

                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4AF6A] block">
                          BLACK CARD · 0{wizardStep}/04
                        </span>
                        <h3 className="font-agrandir-extrabold text-base sm:text-lg text-white uppercase mt-0.5 truncate">
                          {c.wizTitle}
                        </h3>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsWizardMinimized(true)}
                          className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] flex items-center justify-center text-[#C8C8C8] hover:text-white transition-colors cursor-pointer"
                          aria-label={c.wizMinimize}
                        >
                          <Minus className="w-4 h-4" strokeWidth={1.6} />
                        </button>
                        <button
                          type="button"
                          onClick={closeAdmissionWizard}
                          className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.12] flex items-center justify-center text-[#C8C8C8] hover:text-white transition-colors cursor-pointer"
                          aria-label={c.wizCancel}
                        >
                          <X className="w-4 h-4" strokeWidth={1.6} />
                        </button>
                      </div>
                    </div>

                    {/* Rail 4 étapes aligné avec le tunnel billetterie */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { num: 1, label: isEn ? 'Identity' : 'Titulaire' },
                        { num: 2, label: isEn ? 'NFC Box' : 'Remise NFC' },
                        { num: 3, label: isEn ? 'Payment' : 'Règlement' },
                        { num: 4, label: isEn ? 'Circle' : 'Cercle' },
                      ].map((s) => {
                        const isActive = wizardStep === s.num;
                        const isDone = wizardStep > s.num;
                        return (
                          <div key={s.num} className="space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-agrandir-semibold uppercase tracking-[0.12em]">
                              <span
                                className={`font-mono ${
                                  isActive
                                    ? 'text-[#D4AF6A]'
                                    : isDone
                                    ? 'text-white'
                                    : 'text-[#666]'
                                }`}
                              >
                                0{s.num}
                              </span>
                              <span
                                className={`hidden sm:inline truncate ${
                                  isActive
                                    ? 'text-white'
                                    : isDone
                                    ? 'text-[#C8C8C8]'
                                    : 'text-[#666]'
                                }`}
                              >
                                {s.label}
                              </span>
                            </div>
                            <div
                              className={`h-[2px] w-full rounded-full transition-colors duration-300 ${
                                isActive
                                  ? 'bg-[#D4AF6A]'
                                  : isDone
                                  ? 'bg-white'
                                  : 'bg-white/[0.12]'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Corps scrollable */}
                  <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-6 py-5">
                    {wizardStep === 1 && (
                      <div className="space-y-5">
                        {/* Aperçu gravure NFC en temps réel (zéro QR code, statut non bancaire) */}
                        <div className="relative rounded-[12px] aspect-[1.85/1] bg-gradient-to-br from-[#1B1A17] via-[#0F0F0F] to-[#060606] border border-white/[0.16] p-5 flex flex-col justify-between overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="font-agrandir-extrabold text-xs tracking-[0.22em] text-white uppercase">
                              LUMARÉEL
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#D4AF6A]">
                              NFC · MEMBRE
                            </span>
                          </div>
                          <div className="flex items-end justify-between gap-4">
                            <div className="min-w-0">
                              <span className="block text-[9px] font-mono uppercase tracking-[0.22em] text-[#9A9A9A]">
                                BLACK CARD
                              </span>
                              <span className="mt-1 block font-agrandir-extrabold text-sm sm:text-base uppercase tracking-[0.08em] text-white truncate">
                                {applicantName.trim() || (isEn ? 'YOUR FULL NAME' : 'VOTRE NOM COMPLET')}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#9A9A9A] shrink-0">
                              {new Date().getFullYear()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8] block">
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
                            className="w-full min-h-[48px] px-4 py-3 rounded-[8px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] text-white font-mono text-sm uppercase tracking-wider outline-none transition-colors"
                          />
                        </div>

                        <div className="p-4 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <span className="text-[10px] font-mono text-[#D4AF6A] uppercase tracking-wider block">
                              {c.wiz1Plan}
                            </span>
                            <strong className="text-sm font-agrandir-extrabold text-white uppercase">
                              {activePlan?.name || c.wiz1PlanFallback}
                            </strong>
                            <p className="text-xs text-[#9A9A9A] mt-0.5">{c.wiz1PlanDesc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base sm:text-lg font-agrandir-extrabold text-white font-mono tabular-nums">
                              {formattedPrice}
                            </div>
                            <span className="text-[10px] text-[#9A9A9A] uppercase">
                              {c.wiz1Valid}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {wizardStep === 2 && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-base font-agrandir-extrabold text-white uppercase">
                            {c.wiz2Title}
                          </h4>
                          <p className="text-xs text-[#9A9A9A] mt-1">{c.wiz2Sub}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8] block">
                              {c.wiz2Email}
                            </label>
                            <input
                              type="email"
                              value={applicantEmail}
                              onChange={(e) => setApplicantEmail(e.target.value)}
                              placeholder="email@domain.com"
                              required
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[8px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] text-white text-sm outline-none transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8] block">
                              {c.wiz2Phone}
                            </label>
                            <input
                              type="tel"
                              value={applicantPhone}
                              onChange={(e) => setApplicantPhone(e.target.value)}
                              placeholder="+225 07 00 00 00 00"
                              required
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[8px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] text-white text-sm outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8] block">
                              {c.wiz2City}
                            </label>
                            <input
                              type="text"
                              value={applicantCity}
                              onChange={(e) => setApplicantCity(e.target.value)}
                              placeholder="Abidjan"
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[8px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] text-white text-sm outline-none transition-colors"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[10px] font-mono uppercase tracking-wider text-[#C8C8C8] block">
                              {c.wiz2Address}
                            </label>
                            <input
                              type="text"
                              value={applicantAddress}
                              onChange={(e) => setApplicantAddress(e.target.value)}
                              placeholder="Cocody, Zone 4..."
                              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-[8px] bg-black border border-white/[0.16] focus:border-[#D4AF6A] text-white text-sm outline-none transition-colors"
                            />
                          </div>
                        </div>

                        <p className="text-[11px] text-[#9A9A9A] p-3 rounded-[8px] bg-[#0E0E0E] border border-white/[0.08] leading-relaxed">
                          {isEn
                            ? 'Membership card only (NFC) — not a bank or reloadable payment card.'
                            : "Carte de statut membre NFC uniquement — il ne s'agit ni d'une carte bancaire ni d'une carte rechargeable."}
                        </p>
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
                          <h4 className="text-base font-agrandir-extrabold text-white uppercase">
                            {c.wiz3Title}
                          </h4>
                          <p className="text-xs text-[#9A9A9A] mt-1">{c.wiz3Sub}</p>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                          {c.wiz3Methods.map((m) => {
                            const isSelected = paymentMethod === m.id;
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => setPaymentMethod(m.id as any)}
                                className={`relative min-h-[80px] p-3 rounded-[10px] border text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#15130E] border-[#D4AF6A] text-white'
                                    : 'bg-[#0E0E0E] border-white/[0.12] text-[#9A9A9A] hover:border-white/25'
                                }`}
                              >
                                {isSelected && (
                                  <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#D4AF6A] text-black flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  </span>
                                )}
                                <div className="h-7 flex items-center justify-start gap-1.5 mb-1.5">
                                  {m.id === 'wave' && (
                                    <img
                                      src="https://arcencielconsultingpro.com/gallery/upscalemedia-transformed%202.jpg"
                                      alt="Wave"
                                      className="h-6 w-auto max-w-[76px] object-contain rounded-[4px]"
                                      loading="eager"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  {m.id === 'orange_money' && (
                                    <img
                                      src="https://cdn.simpleicons.org/orange/FF7900"
                                      alt="Orange Money"
                                      className="h-6 w-auto max-w-[76px] object-contain"
                                      loading="eager"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  {m.id === 'mtn_momo' && (
                                    <img
                                      src="https://cdn.simpleicons.org/mtn/FFCC00"
                                      alt="MTN MoMo"
                                      className="h-6 w-auto max-w-[76px] object-contain"
                                      loading="eager"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  {m.id === 'moov_money' && (
                                    <img
                                      src="https://cdn.simpleicons.org/moov/0065B3"
                                      alt="Moov Money"
                                      className="h-6 w-auto max-w-[76px] object-contain"
                                      loading="eager"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  {m.id === 'card' && (
                                    <>
                                      <img
                                        src="https://cdn.simpleicons.org/visa/1A1F71"
                                        alt="Visa"
                                        className="h-5 w-auto max-w-[42px] object-contain"
                                        loading="eager"
                                      />
                                      <img
                                        src="https://cdn.simpleicons.org/mastercard/EB001B"
                                        alt="Mastercard"
                                        className="h-5 w-auto max-w-[34px] object-contain"
                                        loading="eager"
                                      />
                                    </>
                                  )}
                                </div>
                                <div className="font-agrandir-extrabold text-xs text-white truncate">
                                  {m.label}
                                </div>
                                <div className="text-[10px] text-[#9A9A9A] font-mono">{m.desc}</div>
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-4 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] space-y-2.5 text-xs">
                          <div className="flex justify-between gap-2 text-[#9A9A9A]">
                            <span>{c.wiz3Membership}</span>
                            <span className="font-mono text-white tabular-nums shrink-0">
                              {formattedPrice}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#9A9A9A]">
                            <span>{c.wiz3CardDelivery}</span>
                            <span className="text-[#7FE0A6] font-mono shrink-0">
                              {c.wiz3Included}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2 text-[#9A9A9A]">
                            <span>{c.wiz3Bonus}</span>
                            <span className="text-white font-mono shrink-0">{c.wiz3BonusVal}</span>
                          </div>
                          <div className="border-t border-dashed border-white/[0.16] pt-2.5 flex justify-between gap-2 font-agrandir-extrabold text-sm text-white">
                            <span>{c.wiz3Total}</span>
                            <span className="text-[#D4AF6A] font-mono tabular-nums shrink-0">
                              {formattedPrice}
                            </span>
                          </div>
                        </div>
                      </form>
                    )}

                    {wizardStep === 4 && issuedResult && (
                      <div className="text-center space-y-5 py-2">
                        <div className="w-12 h-12 rounded-full bg-[#0F2A1A] text-[#7FE0A6] border border-[#7FE0A6]/40 flex items-center justify-center mx-auto">
                          <CheckCircle2 className="w-6 h-6" strokeWidth={1.7} />
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono tracking-[0.22em] text-[#D4AF6A] uppercase">
                            {c.wiz4Kicker}
                          </span>
                          <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">
                            {c.wiz4Title}
                          </h3>
                          <p className="text-xs text-[#C8C8C8] max-w-md mx-auto">
                            {c.wiz4Desc(issuedResult.card.cardNumber)}
                          </p>
                        </div>

                        <div className="p-4 rounded-[10px] bg-[#0E0E0E] border border-white/[0.12] max-w-md mx-auto text-left space-y-2.5 text-xs">
                          <div className="flex justify-between gap-2">
                            <span className="text-[#9A9A9A]">{c.wiz4Holder}</span>
                            <strong className="text-white uppercase font-mono truncate">
                              {issuedResult.card.cardholderName}
                            </strong>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-[#9A9A9A]">{c.wiz4Number}</span>
                            <strong className="text-[#D4AF6A] font-mono tabular-nums">
                              {issuedResult.card.cardNumber}
                            </strong>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-[#9A9A9A]">{c.wiz4Box}</span>
                            <span className="text-[#7FE0A6] font-mono">{c.wiz4Prep}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Barre d'action fixe en bas */}
                  <div className="shrink-0 bg-[#090909] border-t border-white/[0.12] px-5 sm:px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                    {wizardStep === 1 && (
                      <button
                        type="button"
                        onClick={handleWizardNextStep1}
                        className="w-full min-h-[50px] px-7 py-3 rounded-[8px] bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors lum-press"
                      >
                        <span>{c.wiz1Next}</span>
                        <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                      </button>
                    )}

                    {wizardStep === 2 && (
                      <div className="flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="min-h-[50px] px-4 rounded-[8px] border border-white/[0.16] text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white hover:border-white/35 cursor-pointer transition-colors shrink-0 lum-press"
                        >
                          {c.wiz2Back}
                        </button>

                        <button
                          type="button"
                          onClick={handleWizardNextStep2}
                          className="flex-1 min-h-[50px] px-7 py-3 rounded-[8px] bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-colors lum-press"
                        >
                          <span>{c.wiz2Next}</span>
                          <ChevronRight className="w-4 h-4 shrink-0" strokeWidth={1.6} />
                        </button>
                      </div>
                    )}

                    {wizardStep === 3 && (
                      <div className="flex items-center justify-between gap-2.5">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="min-h-[50px] px-4 rounded-[8px] border border-white/[0.16] text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white hover:border-white/35 cursor-pointer transition-colors shrink-0 lum-press"
                        >
                          {c.wiz2Back}
                        </button>

                        <button
                          type="submit"
                          form="black-card-checkout-form"
                          disabled={isSubmitting}
                          className="flex-1 min-h-[50px] px-7 py-3 rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-colors lum-press"
                        >
                          {isSubmitting ? (
                            <>
                              <RotateCw className="w-4 h-4 animate-spin text-black shrink-0" />
                              <span>{c.wiz3Submitting}</span>
                            </>
                          ) : (
                            <>
                              <span>{c.wiz3Submit}</span>
                              <Check className="w-4 h-4 text-black shrink-0" strokeWidth={1.8} />
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {wizardStep === 4 && issuedResult && (
                      <button
                        type="button"
                        onClick={() => finishAndOpenInstalledCard(issuedResult.card)}
                        className="w-full min-h-[50px] px-8 py-3.5 rounded-[8px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors lum-press"
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
