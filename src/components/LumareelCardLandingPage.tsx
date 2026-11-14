import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import { DigitalMembershipCard } from './DigitalMembershipCard';
import {
  CreditCard,
  ShieldCheck,
  Zap,
  Sparkles,
  Lock,
  ArrowRight,
  Crown,
  CheckCircle2,
  Box,
  RotateCw,
  Coins,
  Ticket,
  ChevronRight,
  X,
  Star,
  Volume2,
  Bell,
  User,
  Check,
  Radio,
  Flame,
  Award,
  Calendar,
  Compass,
  KeyRound,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const { currentUser, setCurrentPage, showToast } = useApp();

  // Edition & Plans data
  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Live personalization name
  const [customName, setCustomName] = useState(currentUser?.name || 'AURELIA VANCE');

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
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money' | 'mtn_momo' | 'djamo' | 'card'>('wave');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{ card: MembershipCard; qrDataUrl: string } | null>(null);

  // Interactive Vault token rotation animation
  const [isTokenActive, setIsTokenActive] = useState(false);
  const [tokenCounter, setTokenCounter] = useState(84);

  useEffect(() => {
    fetchEditionAndPlans();
  }, []);

  useEffect(() => {
    if (currentUser?.name && !applicantName) {
      setApplicantName(currentUser.name);
      setCustomName(currentUser.name);
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
    setApplicantName(customName.trim() || currentUser?.name || '');
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
      showToast('Félicitations ! Votre admission à la LUMARÉEL Black Card a été confirmée.', 'success');
      fetchEditionAndPlans();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors du traitement de votre admission.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quota = edition?.quota || 100;
  const allocated = edition?.allocatedCount || 14;
  const remaining = Math.max(0, quota - allocated);
  const isSoldOut = remaining === 0 || edition?.status === 'sold_out';

  // Preview card model for 3D card component
  const previewCard: MembershipCard = {
    id: 'crd_black_card_preview',
    userId: currentUser?.id || 'usr_preview',
    planId: selectedPlan?.id || 'plan_founders_annual',
    editionId: edition?.id || 'ed_founders_2026',
    cardNumber: `LMR-2026-00${String(allocated + 1).padStart(2, '0')}`,
    cardSequence: allocated + 1,
    cardholderName: customName.trim() || 'AURELIA VANCE',
    cardholderEmail: applicantEmail || 'aurelia@lumareel.com',
    cardStatus: 'active',
    issuedAt: new Date().toISOString(),
    validFrom: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    physicalCardStatus: 'approved',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#EDEDED] font-agrandir-regular selection:bg-[#d4af37] selection:text-black">
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (LUMARÉEL BLACK CARD · NOTIFICATIONS · AVATAR)              */}
      {/* ========================================================================= */}
      <header className="w-full border-b border-white/5 bg-[#050505]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          
          {/* Brand Wordmark with subtle gold icon */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 flex items-center justify-center rounded-md bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37]">
              <Crown className="w-4 h-4 text-[#d4af37]" />
            </div>
            <div className="leading-none text-left">
              <div className="font-agrandir-extrabold text-sm tracking-wider uppercase text-white">
                LUMARÉEL
              </div>
              <div className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
                BLACK CARD
              </div>
            </div>
          </div>

          {/* Quick status & Actions */}
          <div className="flex items-center gap-3">
            {hasActiveCard && onGoToWallet && (
              <button
                type="button"
                onClick={onGoToWallet}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/35 text-[10px] font-agrandir-bold text-[#d4af37] uppercase tracking-wider transition-all cursor-pointer"
              >
                <span>Mon Pass Actif ({activeCardNumber || 'Membre'})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => showToast('Vous êtes à jour dans vos notifications de membre.', 'info')}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer relative"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4 text-neutral-300" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] absolute top-2 right-2" />
            </button>

            <div className="w-8 h-8 rounded-full overflow-hidden border border-[#d4af37]/40 bg-gradient-to-br from-neutral-800 to-black flex items-center justify-center text-xs font-agrandir-bold text-[#d4af37]">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AV'}
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION — "YOUR WORLD. YOUR ACCESS." (DESIGN EXACT DE L'IMAGE)    */}
      {/* ========================================================================= */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 border-b border-white/5 text-center overflow-hidden">
        {/* Warm golden ambient glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[340px] bg-[#d4af37]/12 blur-[130px] pointer-events-none rounded-full" />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10 space-y-6">
          
          {/* Subtle Tag Indicator */}
          <div className="inline-flex items-center gap-2 text-[10px] font-agrandir-bold tracking-[0.25em] text-[#d4af37] uppercase">
            <span className="w-2 h-2 rounded-full bg-[#d4af37]" />
            <span>PRÉSENTATION DE LA LUMARÉEL BLACK CARD</span>
          </div>

          {/* Headline Monumental */}
          <h1 className="text-4xl sm:text-6xl font-agrandir-extrabold uppercase tracking-tight text-white leading-[1.05]">
            VOTRE MONDE. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] via-[#f5e6b3] to-[#d4af37]">
              VOTRE ACCÈS.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-neutral-300 font-light leading-relaxed max-w-xl mx-auto">
            Bien plus qu’une carte. Votre passerelle exclusive vers des concerts inoubliables, des accès coulisses privilégiés et l'hospitalité privée d'un cercle d'initiés.
          </p>

          {/* Two Prominent Action Buttons (Couleurs Noir, Blanc, Or) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => scrollToSection('section-card-showcase')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-gradient-to-r from-[#d4af37] via-[#e5c04b] to-[#d4af37] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all duration-300 shadow-[0_0_25px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-95 cursor-pointer"
            >
              DÉCOUVRIR LA CARTE
            </button>

            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-agrandir-extrabold text-xs tracking-wider uppercase transition-all duration-300 hover:border-[#d4af37]/60 active:scale-95 cursor-pointer"
            >
              DEMANDER MON ADMISSION
            </button>
          </div>

          {/* 3D Black Card Visual & Label */}
          <div id="section-card-showcase" className="pt-8 sm:pt-10 flex flex-col items-center">
            <div className="w-full max-w-[420px]">
              <DigitalMembershipCard card={previewCard} />
            </div>

            {/* Label caption underneath */}
            <div className="mt-4 inline-flex items-center gap-2 text-[10px] font-mono tracking-widest text-neutral-400 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
              <span>COMPOSITE NOIR PROFOND & OR · 16G</span>
            </div>

            {/* Live Name Input to personalize */}
            <div className="mt-4 flex items-center justify-center gap-2 text-xs">
              <span className="text-[11px] text-neutral-500">Personnaliser votre gravure :</span>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                placeholder="VOTRE NOM"
                maxLength={28}
                className="bg-black/60 border-b border-[#d4af37]/50 text-[#d4af37] text-xs font-mono uppercase px-2 py-0.5 outline-hidden tracking-widest"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION "BACKSTAGE SOCIETY" / "MADE FOR THE MOMENTS THAT MATTER"       */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 border-b border-white/5">
        <div className="space-y-4 mb-8 text-left">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
            CERCLE PRIVÉ & HOSPITALITÉ
          </span>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white leading-tight">
            Façonnée pour les moments qui comptent.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-2xl">
            De la première note au rappel final, vivez l’intensité musicale et l'art de recevoir partagés entre initiés.
          </p>
        </div>

        {/* Atmosphere Photo Showcase with overlay */}
        <div className="relative overflow-hidden border border-white/10 mb-8 aspect-video sm:aspect-21/9 bg-neutral-900">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.30_0f827a3a.jpeg"
            alt="Concert Society LUMARÉEL"
            className="w-full h-full object-cover brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
        </div>

        {/* 3 Interactive Feature Rows (Open layout, non-rounded blocks) */}
        <div className="divide-y divide-white/10 border-t border-b border-white/10 text-left">
          {[
            { label: 'Votre prochain concert inoubliable', sub: 'Accès réservé aux productions majeures & festivals d’élite' },
            { label: 'Des expériences gravées dans les mémoires', sub: 'Salons VIP, dégustations privées et loges réservées' },
            { label: 'Une communauté réunie autour de votre passion', sub: 'Rencontrez des créateurs, artistes et amateurs exigeants' },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => openAdmissionWizard(plans[0])}
              className="py-4 sm:py-5 flex items-center justify-between group hover:bg-white/[0.02] px-2 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
                <div>
                  <div className="text-sm sm:text-base font-agrandir-bold text-white group-hover:text-[#d4af37] transition-colors">
                    {item.label}
                  </div>
                  <div className="text-[11px] text-neutral-400 font-light">
                    {item.sub}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-[#d4af37] group-hover:translate-x-1 transition-all" />
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION "DUAL ARCHITECTURE" / "ONE CARD. A WORLD OF POSSIBILITIES."   */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 border-b border-white/5 text-center">
        <div className="space-y-4 mb-10">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
            EXPÉRIENCE HYBRIDE
          </span>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white leading-tight">
            Une carte. Un monde de possibilités.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-xl mx-auto">
            L'alliance parfaite entre une carte physique d'exception et un pass digital synchronisé en temps réel sur votre smartphone.
          </p>
        </div>

        {/* The Digital Pass Vault (Exactement comme dans la maquette envoyée) */}
        <div className="max-w-md mx-auto text-left border border-white/15 bg-[#0a0a0a] p-6 sm:p-7 shadow-2xl relative overflow-hidden">
          
          {/* Top Pass Status */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-5 text-[10px] font-mono uppercase tracking-widest">
            <span className="flex items-center gap-1.5 text-neutral-400">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
              <span>COFFRE PASS DIGITAL</span>
            </span>
            <span className="text-[#d4af37] font-bold">ACCÈS ACTIF</span>
          </div>

          {/* Pass Holder Identification */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 block">
                TITULAIRE DU PASS VIP
              </span>
              <h3 className="text-lg sm:text-xl font-agrandir-extrabold uppercase text-white tracking-wide">
                {customName.trim() || 'AURELIA VANCE'}
              </h3>
            </div>
            <span className="px-3 py-1 bg-[#d4af37] text-black font-agrandir-bold text-[9px] tracking-wider uppercase">
              MEMBRE FONDATEUR
            </span>
          </div>

          {/* Active Engagement Details */}
          <div className="mb-6 space-y-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500 block">
              PROCHAINE IMMERSION CONFIRMÉE
            </span>
            <div className="font-agrandir-bold text-sm text-[#f5e6b3] uppercase">
              AREEL FESTIVAL · SCÈNE PRINCIPALE VIP
            </div>
            <div className="text-[11px] text-neutral-400 font-light">
              Lounge Soundstage · Tunnel Artistes · Loge Privée
            </div>
          </div>

          {/* Interactive Dynamic Rotating Security Token */}
          <div
            onClick={() => {
              setIsTokenActive(true);
              setTokenCounter((c) => (c + 1) % 99);
              setTimeout(() => setIsTokenActive(false), 2000);
            }}
            className="p-4 bg-black border border-white/10 flex items-center justify-between cursor-pointer group hover:border-[#d4af37]/40 transition-colors mb-6"
          >
            <div className="flex items-center gap-3">
              {/* Dynamic Animated Token Icon */}
              <div className="w-11 h-11 bg-white/5 border border-white/10 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
                <KeyRound className={`w-5 h-5 ${isTokenActive ? 'text-emerald-400 animate-spin' : 'text-[#d4af37]'}`} />
              </div>
              <div>
                <div className="text-xs font-agrandir-bold text-white uppercase tracking-wider">
                  {isTokenActive ? 'JETON VALIDÉ · ACCÈS LIBÉRÉ' : 'TOUCHER POUR PRÉSENTER LE PASS'}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono">
                  Jeton dynamique de sécurité #{tokenCounter} · Synchronisé
                </div>
              </div>
            </div>

            <Volume2 className="w-4 h-4 text-neutral-500 group-hover:text-[#d4af37]" />
          </div>

          {/* 3 Verified Active Perks */}
          <div className="space-y-2.5 pt-1 border-t border-white/10 text-xs">
            <div className="flex items-center gap-2 text-neutral-300">
              <Zap className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Coupe-file immédiat aux entrées</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <Crown className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Bar privé & consommations offertes</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-300">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Accueil personnalisé & vestiaire VIP</span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECTION "EXCLUSIVE PRIVILEGES" / "ARCHITECTED FOR ELITE ACCESS"        */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 border-b border-white/5">
        <div className="space-y-4 mb-10 text-left">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
            PRIVILÈGES D'EXCEPTION
          </span>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white leading-tight">
            Architecturée pour un accès sans compromis.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-xl">
            L'élégance d'un club privé où chaque événement se transforme en moment sur-mesure.
          </p>
        </div>

        {/* Feature Stream (Open editorial layout, non-rounded blocks) */}
        <div className="space-y-6 text-left">
          
          {/* Feature 01 */}
          <div className="p-6 sm:p-8 border border-white/10 bg-[#080808] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">01 · ACCÈS</span>
              <Ticket className="w-4 h-4 text-[#d4af37]" />
            </div>
            <h3 className="text-xl font-agrandir-bold text-white uppercase">Accès Prioritaire Mondial</h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              Débloquez les préventes de billetterie 48 heures avant l'ouverture générale pour tous les concerts et festivals majeurs.
            </p>
            <div className="pt-2">
              <div className="w-full h-1 bg-white/10 overflow-hidden">
                <div className="w-full h-full bg-[#d4af37]" />
              </div>
              <div className="text-[10px] font-mono text-neutral-400 mt-1">100% de placement garanti pour les membres</div>
            </div>
          </div>

          {/* Feature 02 */}
          <div className="p-6 sm:p-8 border border-white/10 bg-[#080808] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">02 · SUR-MESURE</span>
              <Sparkles className="w-4 h-4 text-[#d4af37]" />
            </div>
            <h3 className="text-xl font-agrandir-bold text-white uppercase">Salons & Loges d'Artistes</h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              Accès direct aux balances acoustiques, aux coulisses privées et aux salons VIP réservés avec service de conciergerie sur place.
            </p>
            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="inline-flex items-center gap-2 text-xs font-agrandir-bold text-[#d4af37] hover:underline uppercase pt-1 cursor-pointer"
            >
              <span>Demander l'accès Conciergerie</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Feature 03 */}
          <div className="p-6 sm:p-8 border border-white/10 bg-[#080808] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">03 · RÉPERTOIRE</span>
              <Award className="w-4 h-4 text-[#d4af37]" />
            </div>
            <h3 className="text-xl font-agrandir-bold text-white uppercase">Votre Collection de Concerts</h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              Tous vos pass de concert, accès coulisses et enregistrements exclusifs réunis dans un coffre personnel unique.
            </p>
            <div className="pt-2 flex items-center gap-8 text-xs font-mono">
              <div>
                <strong className="text-lg text-white font-agrandir-bold block">14</strong>
                <span className="text-[10px] text-neutral-500 uppercase">Événements Prévus 2026</span>
              </div>
              <div>
                <strong className="text-lg text-[#d4af37] font-agrandir-bold block">100%</strong>
                <span className="text-[10px] text-neutral-500 uppercase">Privilège Garanti</span>
              </div>
            </div>
          </div>

          {/* Feature 04 & 05 in 2-columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 border border-white/10 bg-[#080808] space-y-2">
              <div className="text-[10px] font-mono text-[#d4af37] uppercase">04 · COFFRE</div>
              <h4 className="font-agrandir-bold text-base text-white uppercase">Portefeuille Sans Contact</h4>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Réglez vos consommations par simple effleurement, rechargez en un instant avec 0% de frais.
              </p>
            </div>

            <div className="p-6 border border-white/10 bg-[#080808] space-y-2">
              <div className="text-[10px] font-mono text-[#d4af37] uppercase">05 · STATUT</div>
              <h4 className="font-agrandir-bold text-base text-white uppercase">Accompagnant Inclus</h4>
              <p className="text-xs text-neutral-400 font-light leading-relaxed">
                Faites profiter un proche de votre coupe-file et de vos accès aux salons VIP lors de chaque soirée.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SECTION "LIVE SONIC CULTURE" / "CLOSER TO THE MUSIC" (FULL BLEED)      */}
      {/* ========================================================================= */}
      <section className="relative py-24 sm:py-32 overflow-hidden border-b border-white/5 text-center">
        {/* Full-bleed background concert image with dark overlay scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/aistudio/10cbcb7f-470c-4343-9740-e8c87192025d_5b981144.jpeg"
            alt="Live Concert LUMARÉEL"
            className="w-full h-full object-cover brightness-[0.45] contrast-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/80" />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
            IMMERSION SCÉNIQUE DIRECTE
          </span>

          <h2 className="text-3xl sm:text-5xl font-agrandir-extrabold uppercase text-white leading-tight">
            Au plus près de la musique. <br />
            Au plus près de l'émotion.
          </h2>

          <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed max-w-lg mx-auto">
            Votre passion pour la scène mérite un point de vue sans compromis. Élevez chaque instant avec un accueil d’exception.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all shadow-xl cursor-pointer hover:scale-105"
            >
              EXPLORER LES EXPÉRIENCES MEMBRES
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SECTION "DOSSIER D'ADMISSION" / "THE BLACK TIER"                       */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 border-b border-white/5 text-center">
        <div className="space-y-4 mb-10">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
            DOSSIER D'ADMISSION
          </span>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white leading-tight">
            Votre nouveau chapitre commence ici.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-xl mx-auto">
            Découvrez la Black Card LUMARÉEL et demandez votre admission à une expérience exclusive alliant musique, prestige et conciergerie privée.
          </p>
        </div>

        {/* The Black Tier Summary Box */}
        <div className="max-w-lg mx-auto border border-white/20 bg-[#090909] p-7 sm:p-8 text-left space-y-6 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="font-agrandir-extrabold text-lg text-white uppercase tracking-wider">
                LE CERCLE BLACK TIER
              </h3>
              <span className="text-[10px] font-mono text-[#d4af37] uppercase tracking-widest">
                SÉLECTION SUR CANDIDATURE
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37]">
              <Crown className="w-5 h-5 text-[#d4af37]" />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-3 text-xs">
            {[
              'Carte physique 16g en composite noir mat et gravure dorée',
              'Conciergerie privée et accueil VIP dédié 24/7',
              'Portefeuille électronique sans contact intégré avec +5 000 FCFA offerts',
              'Accès aux loges privées et salons VIP réservés',
              'Coupe-file permanent pour vous et un accompagnant privilégié',
            ].map((text, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
                <span className="text-neutral-200 font-light leading-relaxed">{text}</span>
              </div>
            ))}
          </div>

          {/* Price & Primary Action */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex items-baseline justify-between mb-4">
              <span className="text-xs text-neutral-400 uppercase">Tarif annuel</span>
              <div className="text-right">
                <span className="text-xl font-agrandir-extrabold text-[#d4af37] font-mono">150 000 FCFA</span>
                <span className="text-[10px] text-neutral-500 block uppercase font-mono">Valable 12 mois</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="w-full py-4 rounded-full bg-[#d4af37] hover:bg-[#e6c14c] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all shadow-[0_0_25px_rgba(212,175,55,0.35)] cursor-pointer hover:scale-[1.02] active:scale-95"
            >
              DEMANDER MON ADMISSION
            </button>

            <div className="text-[10px] text-neutral-500 text-center mt-3 font-mono">
              Admission délivrée après revue du comité · Demandes traitées avec une stricte confidentialité
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SECTION "THREE-STAGE PATHWAY" / "HOW TO JOIN"                          */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 border-b border-white/5 text-left">
        <div className="space-y-4 mb-10">
          <span className="text-[10px] font-mono tracking-[0.25em] text-[#d4af37] uppercase">
            PARCOURS EN 3 ÉTAPES
          </span>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white leading-tight">
            Comment nous rejoindre.
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-xl">
            Un parcours d'admission fluide et confidentiel, conçu pour une intégration immédiate :
          </p>
        </div>

        <div className="space-y-6">
          {[
            {
              num: '01',
              title: 'Découvrir',
              desc: 'Explorez l’écosystème Black Card, les privilèges scéniques et les accès réservés au cercle d’initiés.',
            },
            {
              num: '02',
              title: 'Candidater',
              desc: 'Remplissez votre dossier d’admission confidentiel avec vos préférences de placement et vos coordonnées de remise.',
            },
            {
              num: '03',
              title: 'Recevoir sa Carte',
              desc: 'Débloquez immédiatement votre Pass Digital et recevez votre carte physique gravée sous coffret de prestige scellé.',
            },
          ].map((item, idx) => (
            <div key={idx} className="p-6 border border-white/10 bg-[#080808] flex items-start gap-5">
              <div className="w-12 h-12 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/35 flex items-center justify-center font-agrandir-extrabold text-[#d4af37] text-lg font-mono shrink-0">
                {item.num}
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-agrandir-bold text-white uppercase">{item.title}</h4>
                <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. SECTION "YOUR EXPERIENCE DESERVES AN UPGRADE" (CLOSING STATEMENT)      */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="w-14 h-14 rounded-full bg-white/5 border border-[#d4af37]/40 flex items-center justify-center text-[#d4af37] mx-auto shadow-xl">
          <Star className="w-6 h-6 text-[#d4af37] fill-[#d4af37]" />
        </div>

        <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white leading-tight">
          Votre expérience mérite ce qu'il y a de mieux.
        </h2>

        <p className="text-xs sm:text-sm text-neutral-400 font-light leading-relaxed max-w-lg mx-auto">
          Rejoignez le cercle d'initiés de la LUMARÉEL Black Card et accédez à une dimension où la musique se vit sans contrainte.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => openAdmissionWizard(plans[0])}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e6c14c] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all shadow-xl cursor-pointer hover:scale-105 active:scale-95"
          >
            DEMANDER MON ADMISSION
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-card-showcase')}
            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/20 text-white font-agrandir-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
          >
            EXPLORER L'EXPÉRIENCE
          </button>
        </div>

        <div className="pt-8 text-[10px] font-mono tracking-[0.25em] text-neutral-500 uppercase">
          LUMARÉEL CO. — CLUB PRIVÉ & PRODUCTIONS D'ÉLITE — EST. 2024
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. BOTTOM NAVIGATION BAR (COMME DANS LE DESIGN DE L'IMAGE)               */}
      {/* ========================================================================= */}
      <nav className="border-t border-white/10 bg-[#060606] py-3 px-4 sm:px-6 sticky bottom-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between text-neutral-400 text-[10px] font-agrandir-bold uppercase">
          <button
            type="button"
            onClick={() => scrollToSection('section-card-showcase')}
            className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors cursor-pointer text-[#d4af37]"
          >
            <CreditCard className="w-4 h-4" />
            <span>La Carte</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-card-showcase')}
            className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Expérience</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-card-showcase')}
            className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <Crown className="w-4 h-4" />
            <span>Privilèges</span>
          </button>

          <button
            type="button"
            onClick={() => openAdmissionWizard(plans[0])}
            className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Adhésion</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (hasActiveCard && onGoToWallet) onGoToWallet();
              else openAdmissionWizard(plans[0]);
            }}
            className="flex flex-col items-center gap-1 hover:text-[#d4af37] transition-colors cursor-pointer"
          >
            <Lock className="w-4 h-4" />
            <span>Coffre</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 11. PROCESSUS D'INSCRIPTION FLUIDE EN PLUSIEURS ÉTAPES (MODALE WIZARD)   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              transition={{ duration: 0.22 }}
              className="relative w-full max-w-xl bg-[#0a0a0a] border border-[#d4af37]/40 p-6 sm:p-8 shadow-2xl my-8 text-left"
            >
              {/* Header de la modale */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d4af37]">
                    DOSSIER D'ADMISSION · ÉTAPE {wizardStep} / 5
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

              {/* Step indicator bar */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1 transition-all duration-300 ${
                      wizardStep >= s ? 'bg-[#d4af37]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Étape 1 : Personnalisation de la Gravure */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      1. Personnalisation de votre Gravure
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Votre nom sera gravé au laser doré sur la surface noir mat de votre Black Card physique.
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
                      placeholder="EX : AURELIA VANCE"
                      required
                      className="w-full px-4 py-3 bg-black border border-white/20 focus:border-[#d4af37] text-white font-mono text-sm uppercase tracking-wider outline-hidden"
                    />
                  </div>

                  <div className="p-4 bg-white/5 border border-[#d4af37]/40 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-agrandir-bold text-[#d4af37] uppercase tracking-wider block">
                        Formule Sélectionnée
                      </span>
                      <strong className="text-sm font-agrandir-bold text-white uppercase">
                        {selectedPlan?.name || 'Black Card Annuelle (12 mois)'}
                      </strong>
                      <p className="text-[11px] text-neutral-400 font-light">
                        Carte physique composite noir & or + Pass Digital + Salons VIP + Coupe-file
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-agrandir-extrabold text-[#d4af37] font-mono">
                        150 000 FCFA
                      </div>
                      <span className="text-[9px] text-neutral-400 uppercase">Valable 1 an</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!applicantName.trim()}
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-full bg-[#d4af37] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <span>Continuer vers mes coordonnées</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 2 : Coordonnées & Livraison */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      2. Coordonnées & Expédition
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Votre Pass Digital sera rattaché à cet e-mail. Le coffret physique sera livré à cette adresse.
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
                        className="w-full px-4 py-2.5 bg-black border border-white/20 focus:border-[#d4af37] text-white text-xs outline-hidden"
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
                        className="w-full px-4 py-2.5 bg-black border border-white/20 focus:border-[#d4af37] text-white text-xs outline-hidden"
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
                        className="w-full px-4 py-2.5 bg-black border border-white/20 focus:border-[#d4af37] text-white text-xs outline-hidden"
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
                        className="w-full px-4 py-2.5 bg-black border border-white/20 focus:border-[#d4af37] text-white text-xs outline-hidden"
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
                      className="px-6 py-3 rounded-full bg-[#d4af37] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <span>Préférences Membre</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 3 : Profil & Parrainage */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      3. Préférences Musicales & Parrainage
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Aidez notre conciergerie à vous adresser les invitations qui vous correspondent.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300">
                      Genre musical de prédilection
                    </label>
                    <select
                      value={musicInterest}
                      onChange={(e) => setMusicInterest(e.target.value)}
                      className="w-full px-4 py-2.5 bg-black border border-white/20 focus:border-[#d4af37] text-white text-xs outline-hidden cursor-pointer"
                    >
                      <option value="Afrobeats & Live Acoustic">Afrobeats, Amapiano & Live Acoustique</option>
                      <option value="Jazz, Soul & R&B">Jazz, Soul & Soirées R&B Privées</option>
                      <option value="Grands Concerts & Festivals">Grands Concerts & Événements Festifs</option>
                      <option value="Loges VIP & Dégustations">Loges VIP & Expériences Privées</option>
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
                      className="w-full px-4 py-2.5 bg-black border border-white/20 focus:border-[#d4af37] text-white font-mono text-xs uppercase tracking-wider outline-hidden"
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
                      className="px-6 py-3 rounded-full bg-[#d4af37] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                    >
                      <span>Règlement Sécurisé</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 4 : Règlement Sécurisé */}
              {wizardStep === 4 && (
                <form onSubmit={handleCompleteAdmission} className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      4. Règlement Sécurisé & Activation
                    </h4>
                    <p className="text-xs text-neutral-400 font-light mt-1">
                      Choisissez votre moyen de paiement sécurisé pour finaliser votre adhésion.
                    </p>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'wave', label: 'Wave', desc: '0% de frais', icon: '🌊' },
                      { id: 'orange_money', label: 'Orange Money', desc: 'CI & UEMOA', icon: '🟠' },
                      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instantané', icon: '🟡' },
                      { id: 'djamo', label: 'Djamo', desc: 'Carte / Visa', icon: '💳' },
                      { id: 'card', label: 'Carte Bancaire', desc: 'Visa / Mastercard', icon: '🔒' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-3 border text-left transition-all cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-[#d4af37]/20 border-[#d4af37] text-white'
                            : 'bg-white/5 border-white/10 text-neutral-400 hover:border-white/20'
                        }`}
                      >
                        <div className="text-lg mb-1">{m.icon}</div>
                        <div className="font-agrandir-bold text-xs text-white uppercase">{m.label}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{m.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Summary Box */}
                  <div className="p-4 bg-black border border-white/15 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Adhésion LUMARÉEL Black Card (1 an)</span>
                      <span className="font-mono text-white">150 000 FCFA</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Carte physique 16g composite & or</span>
                      <span className="text-emerald-400 font-mono">Incluse</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Crédit de bienvenue offert</span>
                      <span className="text-[#d4af37] font-mono">+5 000 FCFA offerts</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between font-agrandir-extrabold text-sm text-white">
                      <span>Total</span>
                      <span className="text-[#d4af37] font-mono">150 000 FCFA</span>
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
                      className="px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e6c14c] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-black" />
                          <span>Activation en cours...</span>
                        </>
                      ) : (
                        <>
                          <span>Valider & Rejoindre le Cercle</span>
                          <Check className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Étape 5 : Confirmation */}
              {wizardStep === 5 && issuedResult && (
                <div className="text-center space-y-5 py-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto shadow-2xl">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#d4af37] uppercase">
                      ADMISSION CONFIRMÉE & SCELLÉE
                    </span>
                    <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">
                      BIENVENUE DANS LA BLACK CARD
                    </h3>
                    <p className="text-xs text-neutral-300 font-light max-w-md mx-auto">
                      Votre identifiant permanent officiel est <strong>{issuedResult.card.cardNumber}</strong>. Votre pass numérique est immédiatement disponible et crédité d'un bonus de bienvenue de 5 000 FCFA.
                    </p>
                  </div>

                  <div className="p-4 bg-black border border-[#d4af37]/40 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Titulaire</span>
                      <strong className="text-white uppercase font-mono">{issuedResult.card.cardholderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Numéro de carte</span>
                      <strong className="text-[#d4af37] font-mono">{issuedResult.card.cardNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Coffret physique</span>
                      <span className="text-emerald-400 font-mono">En cours de préparation sous écrin</span>
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
                      className="px-8 py-3.5 rounded-full bg-[#d4af37] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer hover:bg-white transition-all shadow-xl"
                    >
                      Accéder à mon Pass & Portefeuille
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
