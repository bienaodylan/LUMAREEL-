import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  MapPin,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Ticket,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MembershipCard, MembershipPlan } from '../types';
import { saveStoredMemberCard } from '../utils/memberCardStorage';
import { getAuthHeaders } from '../lib/apiClient';
import {
  CARD_BACK_IMG,
  CARD_FRONT_IMG,
  HalftoneField,
  StageBeam,
  VolumetricBlackCard,
} from './LumareelCardLandingPage';

export interface CardOrderContextData {
  frontImageUrl: string;
  backImageUrl: string;
  priceAmount: number;
  currency: string;
  plan: MembershipPlan | null;
  benefits: Array<{ title: string; desc: string }>;
}

interface LumareelCardOrderPageProps {
  orderContext?: CardOrderContextData | null;
  onBack: () => void;
  onCardIssued: (card: MembershipCard) => void;
}

const EASE_CINEMA: [number, number, number, number] = [0.22, 1, 0.36, 1];

const DEFAULT_BENEFITS_FR = [
  { title: 'Place de parking réservée', desc: 'Votre emplacement vous attend à l’arrivée.' },
  { title: 'Accès prioritaire dans la file d’attente', desc: 'Passage dédié aux membres sans attente.' },
  { title: 'Placement VIP aux premiers rangs', desc: 'Au plus près de la scène sur chaque concert.' },
  { title: 'Rafraîchissement offert', desc: 'Une boisson offerte pour savourer la soirée.' },
  { title: 'Accès aux préventes', desc: 'Réservez avant l’ouverture au grand public.' },
  { title: 'Accès aux Meet & Greet', desc: 'Rencontres privilégiées avec les artistes.' },
  { title: 'Réduction chez nos partenaires', desc: 'Tarifs préférentiels chez nos marques partenaires.' },
];

const DEFAULT_BENEFITS_EN = [
  { title: 'Reserved parking spot', desc: 'Your space is already waiting upon arrival.' },
  { title: 'Priority queue access', desc: 'Dedicated member lane without waiting in line.' },
  { title: 'Front-row VIP seating', desc: 'Right up close to the stage at every concert.' },
  { title: 'Complimentary refreshment', desc: 'A drink included to enjoy the evening.' },
  { title: 'Presale access', desc: 'Reserve tickets before general public release.' },
  { title: 'Meet & Greet access', desc: 'Real moments meeting the artists up close.' },
  { title: 'Partner discounts', desc: 'Preferential rates across our partner brands.' },
];

export const LumareelCardOrderPage: React.FC<LumareelCardOrderPageProps> = ({
  orderContext,
  onBack,
  onCardIssued,
}) => {
  const { currentUser, language, showToast, setIsAuthModalOpen } = useApp();
  const isEn = language === 'en';
  const prefersReducedMotion = useReducedMotion();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [cardFlipped, setCardFlipped] = useState(false);
  const [perksOpen, setPerksOpen] = useState(false);

  const [applicantName, setApplicantName] = useState(currentUser?.name?.toUpperCase() || '');
  const [handoverMode, setHandoverMode] = useState<'delivery' | 'concert_pickup'>('delivery');
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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [step]);

  useEffect(() => {
    if (currentUser?.name && !applicantName) {
      setApplicantName(currentUser.name.toUpperCase());
    }
    if (currentUser?.email && !applicantEmail) {
      setApplicantEmail(currentUser.email);
    }
  }, [currentUser]);

  const frontImageUrl = orderContext?.frontImageUrl || CARD_FRONT_IMG;
  const backImageUrl = orderContext?.backImageUrl || CARD_BACK_IMG;
  const priceAmount = orderContext?.priceAmount ?? orderContext?.plan?.price ?? 50000;
  const currency = orderContext?.currency || orderContext?.plan?.currency || 'FCFA';
  const formattedPrice = `${Number(priceAmount).toLocaleString(isEn ? 'en-US' : 'fr-FR')} ${currency}`;
  const benefits =
    orderContext?.benefits && orderContext.benefits.length > 0
      ? orderContext.benefits
      : isEn
        ? DEFAULT_BENEFITS_EN
        : DEFAULT_BENEFITS_FR;

  const paymentMethods = [
    { id: 'wave', label: 'Wave', desc: isEn ? '0% fee' : '0% frais' },
    { id: 'orange_money', label: 'Orange Money', desc: 'Mobile' },
    { id: 'mtn_momo', label: 'MTN MoMo', desc: isEn ? 'Instant' : 'Rapide' },
    { id: 'moov_money', label: 'Moov Money', desc: 'Flooz' },
    { id: 'card', label: isEn ? 'Bank Card' : 'Carte Bancaire', desc: 'Visa / MC' },
  ] as const;

  const stepsMeta = [
    { num: 1 as const, code: '01', label: isEn ? 'Identity' : 'Identité' },
    { num: 2 as const, code: '02', label: isEn ? 'Handover' : 'Remise' },
    { num: 3 as const, code: '03', label: isEn ? 'Payment' : 'Règlement' },
  ];

  const handleNextStep1 = () => {
    if (!applicantName.trim()) {
      showToast(
        isEn ? 'Enter your full name to continue.' : 'Écris ton nom complet pour continuer.',
        'error'
      );
      return;
    }
    setStep(2);
  };

  const handleNextStep2 = () => {
    const cleanEmail = applicantEmail.trim();
    if (!cleanEmail || !applicantPhone.trim()) {
      showToast(
        isEn
          ? 'Enter your email and phone number.'
          : 'Renseigne ton e-mail et ton numéro de téléphone.',
        'error'
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast(
        isEn
          ? 'Check your email address — it does not look valid.'
          : 'Vérifie ton adresse e-mail, elle ne semble pas valide.',
        'error'
      );
      return;
    }
    setStep(3);
  };

  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(
        isEn
          ? 'Sign in or create an account to activate your LUMARÉEL Black Card.'
          : 'Connecte-toi ou crée ton compte pour activer ta LUMARÉEL Black Card.',
        'info'
      );
      return;
    }

    const cleanName = applicantName.trim();
    const cleanEmail = applicantEmail.trim().toLowerCase();
    if (!cleanName || !cleanEmail) {
      showToast(
        isEn
          ? 'Enter your full name and email address.'
          : 'Renseigne ton nom complet et ton e-mail.',
        'error'
      );
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      showToast(
        isEn
          ? 'Check your email address — it does not look valid.'
          : 'Vérifie ton adresse e-mail, elle ne semble pas valide.',
        'error'
      );
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
      const planId = orderContext?.plan?.id || 'plan_founders_annual';
      let issuedCard: MembershipCard | null = null;
      let qrDataUrl = '';

      const handoverAddress =
        handoverMode === 'concert_pickup'
          ? isEn
            ? 'Concert VIP desk pickup'
            : 'Retrait au guichet dédié au prochain concert'
          : applicantAddress.trim() || 'Remise en main propre';

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
              street: handoverAddress,
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
        // Fallback local si backend indisponible
      }

      if (!issuedCard) {
        issuedCard = buildClientFallbackCard(planId);
      }

      saveStoredMemberCard(issuedCard, currentUser?.email);
      setIssuedResult({ card: issuedCard, qrDataUrl });
      setStep(4);
      showToast(
        isEn
          ? 'Awesome! Your LUMARÉEL Black Card is active.'
          : 'Super ! Ta LUMARÉEL Black Card est active.',
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (isEn
            ? 'Could not complete right now. Please try again.'
            : 'Oups, impossible de valider pour le moment. Réessaie.'),
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // ÉTAPE 4 — CONFIRMATION PLEINE PAGE FAÇON STUDIO NOIR LUMARÉEL
  // =========================================================================
  if (step === 4 && issuedResult) {
    return (
      <div className="min-h-[100dvh] w-full bg-black text-white font-agrandir-regular relative overflow-x-clip">
        <StageBeam x={50} width={20} />
        <HalftoneField tone="light" className="opacity-45" />

        <div className="relative z-10 w-full max-w-[780px] mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-28 flex flex-col items-center text-center">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: EASE_CINEMA }}
            className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center mb-6"
          >
            <CheckCircle2 className="w-6 h-6" strokeWidth={1.9} />
          </motion.div>

          <span className="text-[11px] font-agrandir-semibold uppercase tracking-[0.28em] text-white/55">
            LUMARÉEL BLACK CARD
          </span>

          <h1 className="mt-3 font-agrandir-extrabold text-3xl sm:text-5xl leading-[1.03] tracking-[-0.03em] text-white text-balance">
            {isEn ? 'Your LUMARÉEL Black Card is active.' : 'Ta LUMARÉEL Black Card est active.'}
          </h1>

          <p className="mt-3.5 text-sm sm:text-base text-white/60 max-w-md leading-relaxed text-balance">
            {isEn
              ? `Member reference ${issuedResult.card.cardNumber}. Ready to use right now in your app while your physical card is prepared.`
              : `Référence membre ${issuedResult.card.cardNumber}. Elle est déjà prête dans ton application pendant que ta carte physique est préparée.`}
          </p>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24, rotateX: 12 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.95, delay: 0.12, ease: EASE_CINEMA }}
            className="mt-10 w-full max-w-[330px] sm:max-w-[420px]"
          >
            <VolumetricBlackCard
              manualFlipped={cardFlipped}
              onToggleFlip={() => setCardFlipped((prev) => !prev)}
              shadowTone="dark"
              enableFloat
              openingSweep
              frontImageUrl={frontImageUrl}
              backImageUrl={backImageUrl}
              ariaLabel={isEn ? 'Turn the LUMARÉEL Black Card' : 'Retourner la LUMARÉEL Black Card'}
              frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
              backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
            />
          </motion.div>

          <dl className="mt-10 w-full max-w-lg text-left border-y border-white/15 divide-y divide-white/10 text-xs sm:text-sm">
            <div className="py-3.5 flex items-center justify-between gap-4">
              <dt className="text-white/50">{isEn ? 'Cardholder' : 'Titulaire'}</dt>
              <dd className="font-agrandir-extrabold uppercase tracking-wide text-white">
                {issuedResult.card.cardholderName}
              </dd>
            </div>
            <div className="py-3.5 flex items-center justify-between gap-4">
              <dt className="text-white/50">{isEn ? 'Reference' : 'Référence'}</dt>
              <dd className="font-mono text-white tabular-nums">{issuedResult.card.cardNumber}</dd>
            </div>
            <div className="py-3.5 flex items-center justify-between gap-4">
              <dt className="text-white/50">{isEn ? 'Physical card' : 'Carte physique'}</dt>
              <dd className="font-agrandir-semibold text-white">
                {handoverMode === 'concert_pickup'
                  ? isEn
                    ? 'Ready at next concert desk'
                    : 'Retrait au prochain concert'
                  : isEn
                    ? 'Hand-delivery in preparation'
                    : 'Remise en main propre · En préparation'}
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <button
              type="button"
              onClick={() => onCardIssued(issuedResult.card)}
              className="min-h-[54px] px-9 rounded-full bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
            >
              <span>
                {isEn ? 'Open my LUMARÉEL Black Card' : 'Ouvrir ma LUMARÉEL Black Card'}
              </span>
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // PAGE COMPLÈTE D'ACQUISITION — CORRÉLÉE À LA LANDING PAGE (#efebe4 + #000)
  // =========================================================================
  return (
    <div className="min-h-[100dvh] w-full bg-[#efebe4] text-[#111111] font-agrandir-regular">
      {/* Barre éditoriale supérieure de la page */}
      <div className="w-full border-b border-black/10 bg-[#efebe4]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="w-full max-w-[1160px] mx-auto px-5 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 min-h-[40px] pr-3 text-xs sm:text-sm font-agrandir-semibold text-black/70 hover:text-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.8} />
            <span>{isEn ? 'Back to overview' : 'Retour à la présentation'}</span>
          </button>

          <span className="hidden sm:inline text-[11px] font-agrandir-semibold uppercase tracking-[0.26em] text-black/45 whitespace-nowrap">
            LUMARÉEL BLACK CARD
          </span>

          {/* Progression discrète en typographie pure (sans pilules) */}
          <nav
            aria-label={isEn ? 'Order steps' : 'Étapes'}
            className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-agrandir-semibold"
          >
            {stepsMeta.map((item, idx) => {
              const isCurrent = step === item.num;
              const isDone = step > item.num;
              const canJump = item.num < step;
              return (
                <React.Fragment key={item.num}>
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-black/25">
                      ·
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={!canJump}
                    onClick={() => canJump && setStep(item.num)}
                    className={`whitespace-nowrap transition-colors ${
                      isCurrent
                        ? 'text-[#111111] font-agrandir-extrabold'
                        : isDone
                          ? 'text-black/65 hover:text-[#111111] cursor-pointer'
                          : 'text-black/35 cursor-default'
                    }`}
                  >
                    <span className="tabular-nums mr-1">{item.code}</span>
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Corps principal : Split Studio Noir (gauche sticky) + Configurateur Lin Chaud (droite) */}
      <div className="w-full max-w-[1160px] mx-auto px-5 sm:px-8 pt-7 sm:pt-12 pb-28 lg:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* =============================================================== */}
          {/* COLONNE GAUCHE — SCÈNE PRODUIT 3D (Même ADN que la Landing)     */}
          {/* =============================================================== */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24">
            <div className="relative rounded-[26px] bg-[#080808] text-white p-6 sm:p-8 overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.22)]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(68% 52% at 50% 24%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.025) 48%, rgba(0,0,0,0) 78%)',
                }}
              />
              <HalftoneField tone="light" className="opacity-35" />

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-full flex items-center justify-between text-[10px] font-agrandir-semibold uppercase tracking-[0.26em] text-white/45">
                  <span>LUMARÉEL BLACK CARD</span>
                  <button
                    type="button"
                    onClick={() => setCardFlipped((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 text-white/65 hover:text-white transition-colors cursor-pointer tracking-[0.14em]"
                  >
                    <RotateCw className="w-3 h-3" strokeWidth={1.8} />
                    <span>{cardFlipped ? (isEn ? 'Front' : 'Recto') : isEn ? 'Back' : 'Verso'}</span>
                  </button>
                </div>

                {/* Vraie carte 3D interactive */}
                <div className="mt-6 sm:mt-7 w-full max-w-[310px] sm:max-w-[360px]">
                  <VolumetricBlackCard
                    manualFlipped={cardFlipped}
                    onToggleFlip={() => setCardFlipped((prev) => !prev)}
                    shadowTone="dark"
                    openingSweep
                    frontImageUrl={frontImageUrl}
                    backImageUrl={backImageUrl}
                    ariaLabel={
                      isEn ? 'Turn the LUMARÉEL Black Card' : 'Retourner la LUMARÉEL Black Card'
                    }
                    frontAlt={isEn ? 'LUMARÉEL Black Card — Front' : 'LUMARÉEL Black Card — Recto'}
                    backAlt={isEn ? 'LUMARÉEL Black Card — Back' : 'LUMARÉEL Black Card — Verso'}
                  />
                </div>

                {/* Fiche dynamique en direct synchronisée avec la saisie */}
                <dl className="mt-7 w-full border-t border-white/12 divide-y divide-white/10 text-xs">
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-white/45">{isEn ? 'Cardholder' : 'Titulaire'}</dt>
                    <dd className="font-agrandir-extrabold uppercase tracking-wider text-white truncate max-w-[60%] text-right">
                      {applicantName.trim() || (isEn ? 'YOUR NAME' : 'VOTRE NOM')}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-white/45">{isEn ? 'Handover' : 'Remise'}</dt>
                    <dd className="font-agrandir-semibold text-white/85 truncate max-w-[60%] text-right">
                      {handoverMode === 'concert_pickup'
                        ? isEn
                          ? 'Next concert desk'
                          : 'Guichet prochain concert'
                        : `${applicantCity.trim() || 'Abidjan'}${applicantAddress.trim() ? ` · ${applicantAddress.trim()}` : ''}`}
                    </dd>
                  </div>
                  <div className="py-3 flex items-center justify-between gap-4">
                    <dt className="text-white/45">{isEn ? 'Annual membership' : 'Adhésion annuelle'}</dt>
                    <dd className="font-agrandir-extrabold text-sm text-white tabular-nums">
                      {formattedPrice}
                    </dd>
                  </div>
                </dl>

                {/* Rappel discret des 7 privilèges inclus */}
                <div className="mt-3 w-full border-t border-white/12 pt-3">
                  <button
                    type="button"
                    onClick={() => setPerksOpen((o) => !o)}
                    className="w-full min-h-[36px] flex items-center justify-between text-xs font-agrandir-semibold text-white/70 hover:text-white transition-colors cursor-pointer"
                  >
                    <span>
                      {isEn
                        ? '7 privileges included with your card'
                        : 'Les 7 privilèges inclus avec ta carte'}
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform duration-200 ${perksOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {perksOpen && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.24, ease: EASE_CINEMA }}
                        className="overflow-hidden divide-y divide-white/[0.07] mt-2 text-left"
                      >
                        {benefits.map((b) => (
                          <li key={b.title} className="py-2.5">
                            <p className="text-xs font-agrandir-semibold text-white/90">{b.title}</p>
                            <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{b.desc}</p>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </aside>

          {/* =============================================================== */}
          {/* COLONNE DROITE — PARCOURS D'ACQUISITION ÉDITORIAL EN 3 TEMPS    */}
          {/* =============================================================== */}
          <div className="lg:col-span-7">
            <div className="pb-7 border-b border-black/10">
              <p className="text-[11px] font-agrandir-semibold uppercase tracking-[0.24em] text-black/45">
                {step === 1
                  ? isEn
                    ? 'Step 01 · Personalization'
                    : 'Étape 01 · Personnalisation'
                  : step === 2
                    ? isEn
                      ? 'Step 02 · Contact & Handover'
                      : 'Étape 02 · Coordonnées & Remise'
                    : isEn
                      ? 'Step 03 · Confirmation & Payment'
                      : 'Étape 03 · Règlement & Activation'}
              </p>
              <h1 className="mt-2 font-agrandir-extrabold text-3xl sm:text-5xl leading-[1.03] tracking-[-0.03em] text-[#111111] text-balance">
                {step === 1
                  ? isEn
                    ? 'Make the LUMARÉEL Black Card yours.'
                    : 'Obtenir ma LUMARÉEL Black Card.'
                  : step === 2
                    ? isEn
                      ? 'Where should we reach you?'
                      : 'Comment te remettre ta carte ?'
                    : isEn
                      ? 'Choose how you want to pay.'
                      : 'Choisis ton moyen de règlement.'}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-black/60 leading-relaxed max-w-xl">
                {step === 1
                  ? isEn
                    ? 'Active immediately in your LUMARÉEL app, with your personal physical card prepared under your name.'
                    : 'Active immédiatement dans ton application LUMARÉEL, avec ta vraie carte physique préparée à ton nom.'
                  : step === 2
                    ? isEn
                      ? 'We use these details to link your membership and coordinate your physical card handover.'
                      : 'Ces informations servent à activer ta LUMARÉEL Black Card et à organiser la remise de ta carte physique.'
                    : isEn
                      ? 'One annual fee, no hidden charges. Your LUMARÉEL Black Card activates right after confirmation.'
                      : 'Un seul règlement pour 12 mois, sans frais caché. Ta LUMARÉEL Black Card s’active tout de suite après validation.'}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="order-step-1"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE_CINEMA }}
                  className="pt-8 space-y-8"
                >
                  {/* Nom sur la carte */}
                  <div className="space-y-2.5">
                    <label
                      htmlFor="lum-card-holder-name"
                      className="block text-sm font-agrandir-extrabold text-[#111111]"
                    >
                      {isEn ? 'Your full name' : 'Ton nom complet'}
                    </label>
                    <input
                      id="lum-card-holder-name"
                      type="text"
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleNextStep1();
                        }
                      }}
                      placeholder={isEn ? 'YOUR FULL NAME' : 'TON NOM COMPLET'}
                      required
                      className="w-full min-h-[54px] px-4 py-3.5 rounded-[14px] bg-white border border-black/15 focus:border-[#111111] text-[#111111] font-mono text-sm uppercase tracking-wider outline-none transition-colors"
                    />
                    <p className="text-xs text-black/50">
                      {isEn
                        ? 'This name is linked to your LUMARÉEL Black Card and checked at VIP entrances.'
                        : 'C’est le nom lié à ta LUMARÉEL Black Card et vérifié à l’entrée VIP.'}
                    </p>
                  </div>

                  {/* Choix du mode de remise */}
                  <div className="space-y-3">
                    <p className="text-sm font-agrandir-extrabold text-[#111111]">
                      {isEn ? 'How would you like to receive your physical card?' : 'Comment préfères-tu recevoir ta carte physique ?'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setHandoverMode('delivery')}
                        className={`p-4 sm:p-5 rounded-[16px] border text-left transition-all cursor-pointer ${
                          handoverMode === 'delivery'
                            ? 'bg-[#111111] border-[#111111] text-white'
                            : 'bg-white border-black/12 text-[#111111] hover:border-black/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <MapPin className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                          {handoverMode === 'delivery' && (
                            <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                              <Check className="w-3 h-3" strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <p className="mt-3 font-agrandir-extrabold text-sm">
                          {isEn ? 'Hand delivery' : 'Remise en main propre'}
                        </p>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            handoverMode === 'delivery' ? 'text-white/65' : 'text-black/55'
                          }`}
                        >
                          {isEn
                            ? 'Our team contacts you and hands your card directly in Abidjan.'
                            : 'Notre équipe te contacte et te remet ta carte directement à Abidjan.'}
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setHandoverMode('concert_pickup')}
                        className={`p-4 sm:p-5 rounded-[16px] border text-left transition-all cursor-pointer ${
                          handoverMode === 'concert_pickup'
                            ? 'bg-[#111111] border-[#111111] text-white'
                            : 'bg-white border-black/12 text-[#111111] hover:border-black/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <Ticket className="w-4 h-4 shrink-0" strokeWidth={1.8} />
                          {handoverMode === 'concert_pickup' && (
                            <span className="w-5 h-5 rounded-full bg-white text-black flex items-center justify-center">
                              <Check className="w-3 h-3" strokeWidth={2.5} />
                            </span>
                          )}
                        </div>
                        <p className="mt-3 font-agrandir-extrabold text-sm">
                          {isEn ? 'Pickup at next concert' : 'Retrait au prochain concert'}
                        </p>
                        <p
                          className={`mt-1 text-xs leading-relaxed ${
                            handoverMode === 'concert_pickup' ? 'text-white/65' : 'text-black/55'
                          }`}
                        >
                          {isEn
                            ? 'Ready for you at the dedicated LUMARÉEL Black Card welcome desk.'
                            : 'Elle t’attend à l’accueil dédié LUMARÉEL Black Card dès ton arrivée.'}
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Formule unique claire */}
                  <div className="p-5 rounded-[16px] bg-white border border-black/10 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-black/45 block">
                        {isEn ? 'Membership' : 'Formule annuelle'}
                      </span>
                      <p className="mt-1 font-agrandir-extrabold text-base text-[#111111]">
                        LUMARÉEL Black Card
                      </p>
                      <p className="text-xs text-black/55 mt-0.5">
                        {isEn
                          ? '12 months · Physical card + instant app access'
                          : '12 mois · Ta vraie carte physique + accès immédiat dans l’app'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-agrandir-extrabold text-xl sm:text-2xl tabular-nums text-[#111111]">
                        {formattedPrice}
                      </p>
                      <p className="text-[11px] text-black/45">{isEn ? '/ year' : '/ an'}</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleNextStep1}
                      className="w-full sm:w-auto min-h-[54px] px-9 rounded-full bg-[#111111] hover:bg-black/85 text-white font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
                    >
                      <span>{isEn ? 'Continue to contact info' : 'Continuer vers mes coordonnées'}</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="order-step-2"
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE_CINEMA }}
                  className="pt-8 space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-agrandir-extrabold text-[#111111] block">
                        {isEn ? 'Your email *' : 'Ton e-mail *'}
                      </label>
                      <input
                        type="email"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="email@domain.com"
                        required
                        className="w-full min-h-[52px] px-4 py-3 rounded-[14px] bg-white border border-black/15 focus:border-[#111111] text-[#111111] text-sm outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-agrandir-extrabold text-[#111111] block">
                        {isEn ? 'Your phone number *' : 'Ton numéro de téléphone *'}
                      </label>
                      <input
                        type="tel"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        required
                        className="w-full min-h-[52px] px-4 py-3 rounded-[14px] bg-white border border-black/15 focus:border-[#111111] text-[#111111] text-sm outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {handoverMode === 'delivery' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-agrandir-extrabold text-[#111111] block">
                          {isEn ? 'Your city' : 'Ta ville'}
                        </label>
                        <input
                          type="text"
                          value={applicantCity}
                          onChange={(e) => setApplicantCity(e.target.value)}
                          placeholder="Abidjan"
                          className="w-full min-h-[52px] px-4 py-3 rounded-[14px] bg-white border border-black/15 focus:border-[#111111] text-[#111111] text-sm outline-none transition-colors"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-agrandir-extrabold text-[#111111] block">
                          {isEn ? 'Neighborhood / Address' : 'Ton quartier / Adresse'}
                        </label>
                        <input
                          type="text"
                          value={applicantAddress}
                          onChange={(e) => setApplicantAddress(e.target.value)}
                          placeholder="Cocody, Zone 4, Marcory..."
                          className="w-full min-h-[52px] px-4 py-3 rounded-[14px] bg-white border border-black/15 focus:border-[#111111] text-[#111111] text-sm outline-none transition-colors"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-5 rounded-[16px] bg-white border border-black/10 flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-[#111111] shrink-0 mt-0.5" strokeWidth={1.8} />
                      <p className="text-xs sm:text-sm text-black/65 leading-relaxed">
                        {isEn
                          ? 'Your digital LUMARÉEL Black Card is active right away in the app, and your physical card will be waiting under your name at the dedicated welcome desk of your next LUMARÉEL concert.'
                          : 'Ta LUMARÉEL Black Card numérique s’active tout de suite dans l’application, et ta carte physique t’attendra à ton nom à l’accueil dédié lors de ton prochain concert LUMARÉEL.'}
                      </p>
                    </div>
                  )}

                  <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-full sm:w-auto min-h-[52px] px-7 rounded-full border border-black/15 hover:border-black/40 text-[#111111] font-agrandir-semibold text-sm transition-colors cursor-pointer"
                    >
                      {isEn ? 'Back' : 'Retour'}
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep2}
                      className="w-full sm:w-auto min-h-[54px] px-9 rounded-full bg-[#111111] hover:bg-black/85 text-white font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
                    >
                      <span>{isEn ? 'Continue to payment' : 'Continuer vers le règlement'}</span>
                      <ArrowRight className="w-4 h-4" strokeWidth={2} />
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.form
                  key="order-step-3"
                  noValidate
                  onSubmit={handleConfirmOrder}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.25, ease: EASE_CINEMA }}
                  className="pt-8 space-y-7"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {paymentMethods.map((m) => {
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`relative min-h-[84px] p-4 rounded-[15px] border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#111111] border-[#111111] text-white shadow-md'
                              : 'bg-white border-black/12 text-[#111111] hover:border-black/35'
                          }`}
                        >
                          {isSelected && (
                            <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-white text-black flex items-center justify-center">
                              <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                            </span>
                          )}
                          <div className="font-agrandir-extrabold text-sm pr-5">{m.label}</div>
                          <div
                            className={`text-xs mt-1 ${
                              isSelected ? 'text-white/65' : 'text-black/45'
                            }`}
                          >
                            {m.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Récapitulatif net et transparent */}
                  <div className="p-5 sm:p-6 rounded-[18px] bg-white border border-black/10 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-black/60">
                        {isEn
                          ? 'Your LUMARÉEL Black Card (1 year)'
                          : 'Ta LUMARÉEL Black Card (1 an)'}
                      </span>
                      <span className="font-mono font-semibold text-[#111111] tabular-nums">
                        {formattedPrice}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-black/60">
                        {handoverMode === 'concert_pickup'
                          ? isEn
                            ? 'Physical card (concert desk pickup)'
                            : 'Carte physique (retrait au concert)'
                          : isEn
                            ? 'Physical card (hand delivery)'
                            : 'Carte physique (remise en main propre)'}
                      </span>
                      <span className="font-agrandir-semibold text-[#111111]">
                        {isEn ? 'Included' : 'Incluse'}
                      </span>
                    </div>
                    <div className="pt-3.5 border-t border-black/10 flex items-center justify-between gap-4 text-base">
                      <span className="font-agrandir-extrabold text-[#111111]">
                        {isEn ? 'Total to pay' : 'Total à payer'}
                      </span>
                      <span className="font-agrandir-extrabold font-mono text-lg text-[#111111] tabular-nums">
                        {formattedPrice}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-xs text-black/55">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-black/70" strokeWidth={1.75} />
                    <span>
                      {isEn
                        ? 'Instant activation in your LUMARÉEL space upon validation. Not a bank card.'
                        : 'Activation immédiate dans ton espace LUMARÉEL dès validation. Carte membre dédiée (non bancaire).'}
                    </span>
                  </div>

                  <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      disabled={isSubmitting}
                      className="w-full sm:w-auto min-h-[52px] px-7 rounded-full border border-black/15 hover:border-black/40 text-[#111111] font-agrandir-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isEn ? 'Back' : 'Retour'}
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full sm:w-auto min-h-[54px] px-9 rounded-full bg-[#111111] hover:bg-black/85 disabled:opacity-60 text-white font-agrandir-extrabold text-sm sm:text-base inline-flex items-center justify-center gap-2.5 transition-colors cursor-pointer lum-press whitespace-nowrap"
                    >
                      <span>
                        {isSubmitting
                          ? isEn
                            ? 'Activating...'
                            : 'Activation...'
                          : isEn
                            ? 'Confirm & activate my LUMARÉEL Black Card'
                            : 'Valider et activer ma LUMARÉEL Black Card'}
                      </span>
                      {!isSubmitting && <ArrowRight className="w-4 h-4" strokeWidth={2} />}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
