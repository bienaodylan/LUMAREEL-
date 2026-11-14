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

export const LumareelCardLandingPage: React.FC<LumareelCardLandingPageProps> = ({
  onGoToWallet,
  hasActiveCard = false,
  activeCardNumber,
}) => {
  const { currentUser, events, setCurrentPage, setIsAuthModalOpen, showToast } = useApp();

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
      showToast('Veuillez renseigner votre nom complet et votre adresse e-mail.', 'error');
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
            street: applicantAddress.trim() || 'Livraison à domicile',
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
        throw new Error(data.error || 'Impossible de valider votre demande d’admission.');
      }

      setIssuedResult({ card: data.card, qrDataUrl: data.qrDataUrl });
      setWizardStep(5);
      showToast('Félicitations ! Votre LUMARÉEL Black Card est activée.', 'success');
      fetchEditionAndPlans();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du traitement de votre demande.', 'error');
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
  const formattedPrice = `${Number(planPrice).toLocaleString('fr-FR')} ${planCurrency}`;

  const featuredConcert = events[0];
  const syncEventTitle = featuredConcert?.title || 'The Neon Horizon World Tour';
  const syncEventDate = featuredConcert?.date || '19 Déc. 2026';
  const syncEventTier = featuredConcert?.categories?.[1]?.name || 'VIP Soundstage';

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#F2F2F2] font-agrandir-regular selection:bg-[#C8B282] selection:text-black">
      {/* =================================================================== */}
      {/* 2. HERO SECTION — SPLIT COPY + BENTO PHOTO COLLAGE & FLOATING CARD  */}
      {/* =================================================================== */}
      <section id="section-hero" className="max-w-6xl mx-auto px-4 sm:px-8 pt-10 pb-16 sm:pt-14 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Editorial Headline + CTAs + Sync Proof */}
          <div className="lg:col-span-6 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 text-[11px] font-mono tracking-[0.16em] text-neutral-300 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#B8F249]" aria-hidden="true" />
              <span>LE PASS PHYSIQUE DES PASSIONNÉS DE MUSIQUE</span>
            </div>

            <h1 className="text-4xl sm:text-5xl xl:text-[3.65rem] font-agrandir-extrabold uppercase tracking-tight leading-[1.02] text-white max-w-xl">
              VOTRE MONDE <br />
              DIGITAL.{' '}
              <span className="text-[#C8B282]">
                ENTRE <br />
                VOS MAINS.
              </span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-400 font-light leading-relaxed max-w-md">
              Vos concerts LUMARÉEL, vos commandes et vos activités digitales représentés par une carte physique d’exception. Le luxe tactile pensé pour la génération live.
            </p>

            {/* Primary & Secondary Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => openAdmissionWizard(activePlan || undefined)}
                className="px-6 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black text-xs font-agrandir-extrabold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Obtenir votre Black Card
              </button>

              <button
                type="button"
                onClick={() => scrollToSection('section-benefits')}
                className="px-6 py-3.5 rounded-full bg-[#111111] hover:bg-[#1B1B1B] border border-white/15 text-white text-xs font-agrandir-semibold tracking-wide transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Découvrir les avantages
              </button>
            </div>

            {/* Numbered Member Library Sync Row */}
            <div className="pt-3 flex items-center gap-3.5">
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
              <span className="text-xs text-neutral-400">
                Synchronisé avec le réseau live et {quota} membres fondateurs
              </span>
            </div>
          </div>

          {/* Right Column: Bento Lifestyle Collage + Overlapping Black Card */}
          <div className="lg:col-span-6 relative pb-10 sm:pb-12">
            <div className="rounded-[26px] bg-[#0B0B0B] border border-white/10 p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.85)]">
              <div className="grid grid-cols-12 gap-2.5 h-[360px] sm:h-[420px]">
                {/* Left Stacked Column (2 images) */}
                <div className="col-span-6 grid grid-rows-2 gap-2.5 h-full">
                  <div className="relative rounded-2xl overflow-hidden bg-[#141414]">
                    {!failedImages['heroTop'] ? (
                      <img
                        src={heroLoungeTopImg}
                        alt="Membres LUMARÉEL en salon VIP avant concert"
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
                        alt="Expérience soirée privée LUMARÉEL"
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

                {/* Right Tall Portrait */}
                <div className="col-span-6 relative rounded-2xl overflow-hidden bg-[#141414] h-full">
                  {!failedImages['heroTall'] ? (
                    <img
                      src={heroNightTallImg}
                      alt="Bar et loge privée après-concert LUMARÉEL"
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

              {/* Bottom Verification Strip inside Frame */}
              <div className="mt-2.5 rounded-2xl bg-[#111111] border border-white/10 px-4 py-3 flex items-center justify-end">
                <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-[#B8F249]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>VERIFIED</span>
                </div>
              </div>
            </div>

            {/* Overlapping Physical Black Card (Bottom Left) */}
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
                {/* Metallic Gold EMV Chip */}
                <div className="w-8 h-6 rounded-[4px] bg-gradient-to-br from-[#F2DFB2] via-[#C8B282] to-[#7D6638] border border-black/40 p-0.5 grid grid-cols-2 gap-0.5">
                  <div className="border-r border-b border-black/35" />
                  <div className="border-b border-black/35" />
                  <div className="border-r border-black/35" />
                  <div />
                </div>
                <span className="text-[9px] font-mono tracking-[0.2em] text-neutral-400 uppercase">
                  PHYSICAL PASS
                </span>
              </div>

              <div className="flex items-end justify-between gap-2 pt-2 border-t border-white/10">
                <div className="min-w-0">
                  <div className="text-[8px] font-mono tracking-[0.2em] text-neutral-500 uppercase">
                    PASS HOLDER
                  </div>
                  <div className="text-xs font-agrandir-extrabold text-white uppercase truncate">
                    {displayName}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[8px] font-mono font-bold tracking-widest text-[#B8F249] uppercase">
                    SYNCED
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
      {/* 3. HOW IT WORKS — BENTO DIGITAL-TO-PHYSICAL SHOWCASE                */}
      {/* =================================================================== */}
      <section id="section-how-it-works" className="max-w-6xl mx-auto px-4 sm:px-8 pb-20 sm:pb-24">
        <div className="rounded-[28px] bg-[#0B0B0B] border border-white/10 p-6 sm:p-10 lg:p-12">
          {/* Header */}
          <div className="max-w-2xl space-y-3 mb-10 text-left">
            <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
              COMMENT ÇA MARCHE
            </div>
            <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tracking-tight leading-[1.08] text-balance">
              Vos expériences digitales, <br />
              devenues physiques.
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              La LUMARÉEL Black Card est la représentation physique de vos achats de concerts et activités sur LUMARÉEL. Elle réunit vos billets digitaux, commandes VIP et entrées prioritaires en une pièce tactile d’orfèvrerie.
            </p>
          </div>

          {/* Upper 2-Column Bento */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Card: Digital Concert Ticket Sync */}
            <div className="lg:col-span-7 rounded-2xl bg-[#121212] border border-white/10 p-6 flex flex-col justify-between gap-5 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
                    <Smartphone className="w-4 h-4 text-[#C8B282]" />
                  </div>
                  <div>
                    <div className="text-xs font-agrandir-bold text-white">
                      Synchronisation Billet Concert
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Synchronicité wallet en temps réel
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-semibold tracking-wider text-[#B8F249] uppercase">
                  TAP &amp; GO
                </span>
              </div>

              {/* Inner Active Ticket Order Card */}
              <div className="rounded-xl bg-[#080808] border border-white/10 p-4 sm:p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[9px] font-mono tracking-[0.18em] text-neutral-500 uppercase mb-1">
                      COMMANDE CONCERT ACTIVE
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
                      DATE
                    </div>
                    <div className="text-xs font-agrandir-semibold text-neutral-200 tabular-nums">
                      {syncEventDate}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                      CATÉGORIE
                    </div>
                    <div className="text-xs font-agrandir-semibold text-neutral-200 truncate">
                      {syncEventTier}
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">
                      STATUT
                    </div>
                    <div className="text-xs font-agrandir-semibold text-[#B8F249]">
                      • Actif
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Un billet acheté sur mobile ? Dès la confirmation de votre réservation, votre carte physique est mise à jour instantanément via notre registre cryptographique.
              </p>
            </div>

            {/* Right Card: Laser-Etched Backplate (Dark High-Contrast Showcase) */}
            <div className="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#070707] via-[#050505] to-[#11100C] border border-[#C8B282]/30 p-6 flex flex-col justify-between gap-6 text-left">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-[0.2em] text-[#C8B282] uppercase">
                    VÉRIFICATION TACTILE
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsShowcaseFlipped((prev) => !prev)}
                    aria-label="Basculer l'aperçu du verso laser"
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-[#C8B282] transition-colors cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-xl sm:text-2xl font-agrandir-extrabold text-white tracking-tight">
                  Verso Gravé au Laser
                </h3>

                <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
                  Retournez la carte pour révéler votre QR code dynamique gravé au laser haute précision et sa puce NFC haute fréquence pour un passage instantané aux portiques.
                </p>
              </div>

              {/* Interactive Venue Gate Access Tap Bar */}
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
                      {isTokenActive ? 'Accès Portique Autorisé' : 'Accès Portique Scène'}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {isTokenActive ? 'Signature NFC vérifiée' : 'Vérification sans latence'}
                    </div>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-[#B8F249] tabular-nums">
                  {tapLatency}
                </span>
              </button>
            </div>
          </div>

          {/* Lower 2-Column Supporting Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div className="rounded-2xl bg-[#121212] border border-white/10 p-5 sm:p-6 flex items-start gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C8B282] shrink-0">
                <Radio className="w-4 h-4" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-agrandir-bold text-white">
                  Synchronisation Sans Effort
                </h4>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  Instantanément liée à votre compte LUMARÉEL. Chaque festival, concert, session acoustique et réservation VIP se synchronise sans aucune activation manuelle.
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-[#121212] border border-white/10 p-5 sm:p-6 flex items-start gap-4 text-left">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#C8B282] shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-agrandir-bold text-white">
                  Pass 100% Musique Live
                </h4>
                <p className="text-xs text-neutral-400 font-light leading-relaxed">
                  Ni carte de crédit, ni carte bancaire. Aucune vérification de solvabilité, aucun intérêt ni relevé. Pensée exclusivement pour vos souvenirs live et l’accès aux scènes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. THREE WAYS YOUR CARD ELEVATES YOUR LIVE MUSIC                    */}
      {/* =================================================================== */}
      <section id="section-benefits" className="max-w-6xl mx-auto px-4 sm:px-8 pb-20 sm:pb-24">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
            PRIVILÈGES ESSENTIELS
          </div>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tracking-tight leading-[1.08] text-balance">
            Trois façons dont votre carte <br />
            sublime vos concerts.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Card 01: Your Concerts */}
          <div className="rounded-[24px] bg-[#0B0B0B] border border-white/10 p-6 flex flex-col justify-between gap-6 text-left">
            <div className="space-y-3">
              <div className="text-3xl sm:text-4xl font-agrandir-extrabold text-[#C8B282] tabular-nums">
                01
              </div>
              <h3 className="text-base font-agrandir-extrabold uppercase tracking-wide text-white">
                VOS CONCERTS
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Conservez tous vos billets de concerts et commandes digitales reliés à votre carte personnelle. Présentez-la aux bars et comptoirs partenaires.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#141414] border border-white/10">
                {!failedImages['crowd'] ? (
                  <img
                    src={concertsCrowdImg}
                    alt="Foule en concert devant la scène principale"
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
                <span className="text-neutral-200 font-agrandir-semibold">
                  Accès Scène Principale
                </span>
                <span className="text-neutral-500 font-mono">Tap Instantané</span>
              </div>
            </div>
          </div>

          {/* Card 02: One Personal Card */}
          <div className="rounded-[24px] bg-[#0B0B0B] border border-white/10 p-6 flex flex-col justify-between gap-6 text-left">
            <div className="space-y-3">
              <div className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tabular-nums">
                02
              </div>
              <h3 className="text-base font-agrandir-extrabold uppercase tracking-wide text-white">
                UNE CARTE PERSONNELLE
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                L’incarnation physique de vos activités LUMARÉEL. Composite noir mat anodisé haute précision, conçu pour résister à l’effervescence des salles.
              </p>
            </div>

            <div className="rounded-xl bg-[#121212] border border-white/10 p-4 space-y-4">
              <div className="flex items-center justify-between text-[9px] font-mono tracking-wider uppercase text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C8B282]" />
                  <span>MONOGRAMME SUR MESURE</span>
                </span>
                <span className="text-neutral-500">LMR-BLACK</span>
              </div>

              <div>
                <div className="text-[9px] font-mono uppercase tracking-wider text-neutral-500 mb-1">
                  ÉDITION GRAVÉE (PERSONNALISABLE)
                </div>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                  maxLength={28}
                  aria-label="Personnaliser le nom gravé sur votre carte"
                  className="w-full bg-black/70 border border-white/10 focus:border-[#C8B282] rounded-lg px-2.5 py-1.5 text-sm font-agrandir-extrabold uppercase tracking-wide text-white outline-none transition-colors"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono">
                <span className="text-neutral-500">Poids : 16.0g</span>
                <span className="text-[#B8F249] font-semibold">Puce Haptique Active</span>
              </div>
            </div>
          </div>

          {/* Card 03: Exclusive Benefits */}
          <div className="rounded-[24px] bg-[#0B0B0B] border border-white/10 p-6 flex flex-col justify-between gap-6 text-left">
            <div className="space-y-3">
              <div className="text-3xl sm:text-4xl font-agrandir-extrabold text-[#B8F249] tabular-nums">
                03
              </div>
              <h3 className="text-base font-agrandir-extrabold uppercase tracking-wide text-white">
                AVANTAGES EXCLUSIFS
              </h3>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Profitez de privilèges exclusifs liés à votre LUMARÉEL Black Card : entrée anticipée aux balances, accès mezzanine privée et avantages partenaires.
              </p>
            </div>

            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#141414] border border-white/10">
                {!failedImages['vip'] ? (
                  <img
                    src={vipMezzanineImg}
                    alt="Salon mezzanine VIP LUMARÉEL"
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
                <span className="text-neutral-200 font-agrandir-semibold">
                  Mezzanine Accompagnant
                </span>
                <span className="text-[10px] font-mono font-bold text-[#C8B282] uppercase">
                  PRIVILÈGE
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 5. MAKE IT YOURS — PHYSICAL EDITION CONVERSION BLOCK                */}
      {/* =================================================================== */}
      <section id="section-make-it-yours" className="max-w-6xl mx-auto px-4 sm:px-8 pb-20 sm:pb-24">
        <div className="rounded-[28px] bg-[#0B0B0B] border border-white/10 p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: Physical Card Interactive Showcase */}
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
                aria-label="Retourner la Black Card physique"
                className="w-full max-w-[380px] cursor-pointer perspective-[1200px]"
                style={{ aspectRatio: '85.6 / 53.98' }}
              >
                <motion.div
                  animate={{ rotateY: isShowcaseFlipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full h-full relative"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Card Front */}
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
                          PASS
                        </span>
                      </div>
                      <Wifi className="w-4 h-4 text-neutral-400 rotate-90" />
                    </div>

                    <div className="flex items-center gap-3.5 my-auto">
                      {/* Brushed Gold EMV Chip */}
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
                          ENCRYPTED TACTILE CORE
                        </div>
                        <div className="text-xs font-mono tracking-[0.18em] text-neutral-200 tabular-nums">
                          0042 · 8821 · 9102
                        </div>
                      </div>
                    </div>

                    <div className="flex items-end justify-between pt-2 border-t border-white/10">
                      <div className="min-w-0">
                        <div className="text-[8px] font-mono tracking-[0.2em] text-neutral-500 uppercase">
                          PHYSICAL EDITION
                        </div>
                        <div className="text-sm font-agrandir-extrabold text-white uppercase truncate">
                          {displayName}
                        </div>
                      </div>
                      <QrCode className="w-5 h-5 text-[#C8B282] shrink-0" />
                    </div>
                  </div>

                  {/* Card Backplate (Laser-Etched) */}
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
                        GRAVURE LASER · {cardNumber}
                      </span>
                      <span className="text-[9px] font-mono text-[#B8F249] uppercase">
                        NFC 13.56 MHZ
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 my-auto">
                      <div className="space-y-1.5 text-left">
                        <div className="text-xs font-agrandir-bold text-white uppercase">
                          Portique Coupe-File &amp; Loges
                        </div>
                        <p className="text-[10px] text-neutral-400 leading-relaxed">
                          Présentez ce verso laser ou effleurez le lecteur NFC aux points de contrôle officiels LUMARÉEL.
                        </p>
                      </div>
                      <div className="w-16 h-16 rounded-xl bg-white p-2 flex items-center justify-center shrink-0">
                        <QrCode className="w-12 h-12 text-black" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] font-mono text-neutral-500 pt-2 border-t border-white/10">
                      <span>FOUNDERS EDITION · {quota} MAX</span>
                      <span className="text-white">{displaySerial}</span>
                    </div>
                  </div>
                </motion.div>
              </div>

              <div className="mt-4 flex items-center justify-center gap-4 text-[11px] text-neutral-400">
                <span>Composite Noir &amp; Titane</span>
                <span aria-hidden="true">·</span>
                <span>NFC &amp; QR Intégrés</span>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => setIsShowcaseFlipped((prev) => !prev)}
                  className="text-[#C8B282] hover:underline cursor-pointer"
                >
                  {isShowcaseFlipped ? 'Voir le recto' : 'Voir le verso'}
                </button>
              </div>
            </div>

            {/* Right Column: Pricing & Direct Checkout */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="space-y-2.5">
                <div className="text-[10px] font-mono tracking-[0.22em] text-[#C8B282] uppercase">
                  POSSÉDEZ LA PIÈCE
                </div>
                <h2 className="text-3xl sm:text-5xl font-agrandir-extrabold uppercase text-white tracking-tight leading-none">
                  FAITES-EN LA VÔTRE.
                </h2>
                <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-xl">
                  Obtenez votre LUMARÉEL Black Card et transposez vos expériences de concerts digitales dans le monde réel. Façonnée en composite noir anodisé avec puce NFC et QR code dynamique.
                </p>
              </div>

              {/* Plan Switcher if multiple plans exist */}
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

              {/* Pricing Card */}
              <div className="rounded-2xl bg-[#131313] border border-white/10 p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono tracking-[0.16em] text-neutral-400 uppercase">
                    LUMARÉEL BLACK CARD — ÉDITION PHYSIQUE
                  </span>
                  <span className="text-[10px] font-mono font-bold tracking-wider text-[#B8F249] uppercase">
                    {remaining > 0 ? 'PRÊTE À EXPÉDIER' : 'LISTE D’ATTENTE'}
                  </span>
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tabular-nums">
                      {loading ? '...' : formattedPrice}
                    </span>
                    <span className="text-xs font-mono text-neutral-400 uppercase">
                      / {activePlan?.durationMonths === 1 ? 'mois' : 'an'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono tracking-wider text-[#C8B282] uppercase">
                    LIVRAISON EXPRESS OFFERTE
                  </span>
                </div>

                <div className="text-xs text-neutral-400 font-light">
                  Adhésion tout-inclus · Bonus cashless +5 000 FCFA offert · {remaining} places restantes sur {quota}
                </div>
              </div>

              <button
                type="button"
                onClick={() => openAdmissionWizard(activePlan || undefined)}
                className="w-full py-4 px-6 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <span>OBTENIR VOTRE BLACK CARD</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center sm:justify-start gap-2 text-[11px] text-neutral-500">
                <Lock className="w-3.5 h-3.5 text-[#B8F249]" />
                <span>
                  Commande directe sécurisée. Expédition sous 2 à 3 jours ouvrés. Activation digitale immédiate.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 6. CLEAN LANDING FOOTER                                             */}
      {/* =================================================================== */}
      <footer className="border-t border-white/10 bg-[#050505]">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-agrandir-extrabold text-sm tracking-tight text-white uppercase">
                  LUMARÉEL
                </span>
                <span className="px-1.5 py-0.5 rounded bg-[#151515] border border-[#C8B282]/30 text-[9px] font-mono tracking-widest text-[#C8B282] uppercase">
                  BLACK
                </span>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
                La carte physique de votre univers concert digital. Précision architecturale et accès live instantané.
              </p>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-agrandir-bold text-white">Produit</div>
              <div className="flex flex-col gap-2 text-neutral-400">
                <button
                  type="button"
                  onClick={() => scrollToSection('section-hero')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  La Carte
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('client_space')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Commandes Concerts
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (onGoToWallet) onGoToWallet();
                    else setCurrentPage('member_card');
                  }}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Mon Pass &amp; Portefeuille
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-agrandir-bold text-white">Maison</div>
              <div className="flex flex-col gap-2 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage('home')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Programmation
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('archive')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Archives Live
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('organizers')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Organisateurs
                </button>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="font-agrandir-bold text-white">Sécurité &amp; Contrôle</div>
              <div className="flex flex-col gap-2 text-neutral-400">
                <button
                  type="button"
                  onClick={() => setCurrentPage('card_verify')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Vérifier une carte
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage('news')}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Communiqués
                </button>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(activePlan || undefined)}
                  className="text-left hover:text-white transition-colors cursor-pointer"
                >
                  Demander l’admission
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
            <span>© 2026 LUMARÉEL CO. Tous droits réservés.</span>
            <span className="font-mono text-neutral-400">
              Réseau Scénique LUMARÉEL · Abidjan
            </span>
          </div>
        </div>
      </footer>

      {/* =================================================================== */}
      {/* 7. 5-STEP ADMISSION WIZARD MODAL (PRESERVED WORKING FLOW)           */}
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
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#C8B282]">
                    DOSSIER D&apos;ADMISSION · ÉTAPE {wizardStep} / 5
                  </span>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase mt-0.5">
                    LUMARÉEL Black Card
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step progress bar */}
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

              {/* Step 1: Gravure */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      1. Personnalisation de votre Gravure
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Votre nom sera gravé au laser sur la face composite noir mat de votre Black Card physique.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      Nom complet à graver sur la carte *
                    </label>
                    <input
                      type="text"
                      value={applicantName}
                      onChange={(e) => {
                        setApplicantName(e.target.value.toUpperCase());
                        setCustomName(e.target.value.toUpperCase());
                      }}
                      placeholder="EX : ELENA V. MOREAU"
                      required
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white font-mono text-sm uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-[#131313] border border-[#C8B282]/35 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-agrandir-bold text-[#C8B282] uppercase tracking-wider block">
                        Formule Sélectionnée
                      </span>
                      <strong className="text-sm font-agrandir-bold text-white uppercase">
                        {activePlan?.name || 'Black Card Annuelle (12 mois)'}
                      </strong>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Carte physique composite &amp; titane + Pass Digital + Salons VIP
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-agrandir-extrabold text-[#C8B282] font-mono tabular-nums">
                        {formattedPrice}
                      </div>
                      <span className="text-[9px] text-neutral-400 uppercase">Valable 1 an</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!applicantName.trim()}
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <span>Continuer vers mes coordonnées</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Shipping & Contact */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      2. Coordonnées &amp; Expédition
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Votre Pass Digital sera synchronisé avec cet e-mail. Le coffret physique sera livré à cette adresse.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        Adresse e-mail *
                      </label>
                      <input
                        type="email"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="votre.email@domaine.com"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                        Téléphone Mobile *
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
                        Ville *
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
                        Quartier / Adresse de remise *
                      </label>
                      <input
                        type="text"
                        value={applicantAddress}
                        onChange={(e) => setApplicantAddress(e.target.value)}
                        placeholder="Cocody, Zone 4, Plateau..."
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
                      Retour
                    </button>

                    <button
                      type="button"
                      disabled={!applicantEmail.trim() || !applicantPhone.trim()}
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <span>Préférences Membre</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Preferences & Referral */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      3. Préférences Musicales &amp; Parrainage
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Personnalisez les invitations privées associées à votre Black Card.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      Genre musical de prédilection
                    </label>
                    <select
                      value={musicInterest}
                      onChange={(e) => setMusicInterest(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="Afrobeats & Live Acoustic">Afrobeats, Amapiano &amp; Live Acoustique</option>
                      <option value="Jazz, Soul & R&B">Jazz, Soul &amp; Soirées R&amp;B Privées</option>
                      <option value="Grands Concerts & Festivals">Grands Concerts &amp; Événements Festifs</option>
                      <option value="Loges VIP & Dégustations">Loges VIP &amp; Expériences Privées</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      Code de parrainage (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="EX : BLACK-VIP-2026"
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#C8B282] text-white font-mono text-xs uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Retour
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Règlement Sécurisé</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4: Payment */}
              {wizardStep === 4 && (
                <form onSubmit={handleCompleteAdmission} className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      4. Règlement Sécurisé &amp; Activation
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Sélectionnez votre moyen de paiement pour activer immédiatement votre Black Card.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'wave', label: 'Wave', desc: '0% de frais' },
                      { id: 'orange_money', label: 'Orange Money', desc: 'CI & UEMOA' },
                      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instantané' },
                      { id: 'djamo', label: 'Djamo', desc: 'Carte / Visa' },
                      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / Mastercard' },
                    ].map((m) => (
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
                      <span>Adhésion LUMARÉEL Black Card</span>
                      <span className="font-mono text-white tabular-nums">{formattedPrice}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Carte physique gravée &amp; livraison</span>
                      <span className="text-[#B8F249] font-mono">Incluse</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Crédit cashless de bienvenue</span>
                      <span className="text-[#C8B282] font-mono">+5 000 FCFA offerts</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between font-agrandir-extrabold text-sm text-white">
                      <span>Total</span>
                      <span className="text-[#C8B282] font-mono tabular-nums">{formattedPrice}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="text-xs text-neutral-400 hover:text-white cursor-pointer"
                    >
                      Retour
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 py-3.5 rounded-full bg-white hover:bg-[#C8B282] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-black" />
                          <span>Activation en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Valider &amp; Activer</span>
                          <Check className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 5: Confirmation */}
              {wizardStep === 5 && issuedResult && (
                <div className="text-center space-y-5 py-4">
                  <div className="w-16 h-16 rounded-full bg-[#B8F249]/15 text-[#B8F249] border border-[#B8F249]/40 flex items-center justify-center mx-auto shadow-2xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#C8B282] uppercase">
                      ADMISSION CONFIRMÉE &amp; SCELLÉE
                    </span>
                    <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">
                      BIENVENUE DANS LA BLACK CARD
                    </h3>
                    <p className="text-xs text-neutral-300 font-light max-w-md mx-auto">
                      Votre identifiant permanent officiel est <strong>{issuedResult.card.cardNumber}</strong>. Votre pass numérique est immédiatement disponible et crédité d&apos;un bonus de bienvenue de 5 000 FCFA.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-[#C8B282]/40 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Titulaire</span>
                      <strong className="text-white uppercase font-mono">
                        {issuedResult.card.cardholderName}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Numéro de carte</span>
                      <strong className="text-[#C8B282] font-mono">
                        {issuedResult.card.cardNumber}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Coffret physique</span>
                      <span className="text-[#B8F249] font-mono">
                        En préparation sous écrin
                      </span>
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
                      Accéder à mon Pass &amp; Portefeuille
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
