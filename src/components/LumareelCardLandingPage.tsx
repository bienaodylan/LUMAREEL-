import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import heroPortraitImg from '../assets/images/black_card_hero_portrait_1794664559137.jpg';
import backstageFriendsImg from '../assets/images/backstage_friends_moment_1794664561231.jpg';
import concertStageImg from '../assets/images/concert_stage_atmosphere_1794664559978.jpg';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe,
  Lock,
  QrCode,
  Quote,
  Radio,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Ticket,
  User,
  Wallet,
  Wifi,
  X,
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
  const { currentUser, setCurrentPage, setIsAuthModalOpen, showToast } = useApp();

  // Édition & formules backend
  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  // Personnalisation en direct de la carte
  const [customName, setCustomName] = useState(currentUser?.name || '');
  const [isEditingCardName, setIsEditingCardName] = useState(false);

  // Modale d'information légale / produit (pour liens du footer)
  const [infoModal, setInfoModal] = useState<{ title: string; body: string } | null>(null);

  // Tunnel de commande / d'admission en plusieurs étapes
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [applicantName, setApplicantName] = useState(currentUser?.name || '');
  const [applicantEmail, setApplicantEmail] = useState(currentUser?.email || '');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantCity, setApplicantCity] = useState('Abidjan');
  const [applicantAddress, setApplicantAddress] = useState('Cocody Danga');
  const [musicInterest, setMusicInterest] = useState('Afrobeats & Live Acoustic');
  const [referralCode, setReferralCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'orange_money' | 'mtn_momo' | 'djamo' | 'card'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [issuedResult, setIssuedResult] = useState<{ card: MembershipCard } | null>(null);

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
    }
  };

  const openAdmissionWizard = (plan?: MembershipPlan) => {
    if (plan) setSelectedPlan(plan);
    setApplicantName((customName.trim() || currentUser?.name || 'ELENA V. MOREAU').toUpperCase());
    setApplicantEmail(currentUser?.email || '');
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleCompleteAdmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName.trim() || !applicantEmail.trim()) {
      showToast('Please enter your full name and email address.', 'error');
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
            street: applicantAddress.trim() || 'Express Delivery',
            city: applicantCity.trim() || 'Abidjan',
            country: 'Global',
          },
          paymentMethod,
          paymentReference: `LMR-BLK-${Date.now()}`,
          userId: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to process your Black Card order.');
      }

      setIssuedResult({ card: data.card });
      setWizardStep(5);
      showToast('Your LUMARÉEL Black Card order is confirmed.', 'success');
      fetchEditionAndPlans();
    } catch (err: any) {
      showToast(err.message || 'Error while processing your order.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quota = edition?.quota || 100;
  const allocated = edition?.allocatedCount || 14;
  const remaining = Math.max(0, quota - allocated);
  const isSoldOut = remaining === 0 || edition?.status === 'sold_out';

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cardDisplayName = (customName.trim() || 'ELENA V. MOREAU').toUpperCase();
  const engravedPlaceholderName = customName.trim() ? customName.trim().toUpperCase() : 'YOUR NAME HERE';

  return (
    <div className="w-full min-h-screen bg-[#050505] text-[#F5F5F5] font-agrandir-regular selection:bg-[#D4B475] selection:text-black">

      {/* ========================================================================= */}
      {/* 1. TOP NAVIGATION BAR (EXACT MATCH TO MOCKUP, DARK MODE)                  */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-30 w-full bg-[#050505]/90 backdrop-blur-md border-b border-white/[0.08]">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-6">

          {/* Brand Zone */}
          <button
            type="button"
            onClick={() => scrollToSection('hero-section')}
            className="flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap"
          >
            <span className="font-agrandir-extrabold text-base sm:text-lg tracking-[0.06em] text-white uppercase">
              LUMARÉEL
            </span>
            <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#D4B475]/30 text-[9px] font-mono tracking-[0.16em] text-[#D4B475] uppercase">
              BLACK
            </span>
          </button>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-[13px] text-[#A3A3A3] font-medium">
            <button
              type="button"
              onClick={() => scrollToSection('hero-section')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              The Card
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              How it Works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('benefits-section')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Benefits
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('get-black-card')}
              className="hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Black Card
            </button>
          </nav>

          {/* Right Action Zone */}
          <div className="flex items-center gap-3 shrink-0">
            {hasActiveCard && onGoToWallet ? (
              <button
                type="button"
                onClick={onGoToWallet}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#D4B475] hover:text-white transition-colors whitespace-nowrap cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Wallet ({activeCardNumber || 'Active'})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => (currentUser ? setCurrentPage('profile') : setIsAuthModalOpen(true))}
                className="hidden sm:inline-block text-xs text-[#CCCCCC] hover:text-white transition-colors whitespace-nowrap cursor-pointer px-2 py-1.5"
              >
                {currentUser ? currentUser.name.split(' ')[0] : 'Sign In'}
              </button>
            )}

            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              disabled={isSoldOut}
              className="px-4 sm:px-5 py-2.5 rounded-full bg-white hover:bg-[#D4B475] text-[#050505] font-agrandir-bold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-40"
            >
              Get Your Black Card
            </button>

            <button
              type="button"
              onClick={() => (currentUser ? setCurrentPage('profile') : setIsAuthModalOpen(true))}
              aria-label="Account"
              className="w-9 h-9 rounded-full bg-[#141414] border border-white/15 hover:border-[#D4B475]/50 flex items-center justify-center text-white transition-colors shrink-0 cursor-pointer"
            >
              <User className="w-4 h-4" />
            </button>
          </div>

        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION — SPLIT 2-COLUMN LAYOUT WITH PHOTO MOSAIC & CARD OVERLAY  */}
      {/* ========================================================================= */}
      <section id="hero-section" className="pt-12 pb-20 sm:pt-16 sm:pb-24">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">

            {/* Left Column */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Top Kicker Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] border border-white/10 text-[10px] font-mono tracking-[0.14em] text-[#D4D4D4] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF3D]" />
                <span>THE PHYSICAL PASS FOR MUSIC LOVERS</span>
              </div>

              {/* Hero Display Title */}
              <h1 className="text-[44px] sm:text-[56px] lg:text-[60px] font-agrandir-extrabold uppercase tracking-tight leading-[0.96] text-white text-balance">
                YOUR DIGITAL <br />
                WORLD. <span className="text-[#D4B475]">IN YOUR</span> <br />
                <span className="text-[#D4B475]">HANDS.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-[14px] sm:text-[15px] text-[#9A9A9A] font-light leading-relaxed max-w-[430px]">
                Your Lumaréel concerts, orders, and digital activities, represented by one beautiful physical card. Pure tactile luxury crafted for the live-stage generation.
              </p>

              {/* CTA Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  disabled={isSoldOut}
                  className="px-6 py-3.5 rounded-full bg-white hover:bg-[#D4B475] text-[#050505] font-agrandir-bold text-xs tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
                >
                  {isSoldOut ? 'Edition Sold Out' : 'Get Your Black Card'}
                </button>

                <button
                  type="button"
                  onClick={() => scrollToSection('benefits-section')}
                  className="px-6 py-3.5 rounded-full bg-[#121212] hover:bg-[#1B1B1B] border border-white/15 text-white font-agrandir-semibold text-xs tracking-wide transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Discover the Benefits
                </button>
              </div>

              {/* 01 02 03 Synchronized Stat Strip */}
              <div className="pt-3 flex items-center gap-3">
                <div className="flex items-center -space-x-1.5">
                  <span className="w-6 h-6 rounded-full bg-[#1F1F1F] border border-[#050505] flex items-center justify-center text-[9px] font-mono font-bold text-[#A3A3A3]">
                    01
                  </span>
                  <span className="w-6 h-6 rounded-full bg-[#E5E5E5] border border-[#050505] flex items-center justify-center text-[9px] font-mono font-bold text-[#050505]">
                    02
                  </span>
                  <span className="w-6 h-6 rounded-full bg-[#D4B475] border border-[#050505] flex items-center justify-center text-[9px] font-mono font-bold text-[#050505]">
                    03
                  </span>
                </div>
                <span className="text-xs text-[#888888]">
                  Synchronized with 42,000+ member concert libraries globally
                </span>
              </div>
            </div>

            {/* Right Column: Bento Photo Collage + Overlapping Black Card */}
            <div className="lg:col-span-6 relative lg:pl-6">
              <div className="relative rounded-[28px] bg-[#111111] border border-white/10 p-2.5 shadow-[0_32px_90px_rgba(0,0,0,0.85)]">

                {/* 3-Photo Mosaic Grid */}
                <div className="grid grid-cols-12 gap-2 h-[340px] sm:h-[400px]">
                  <div className="col-span-5 flex flex-col gap-2">
                    <div className="flex-1 rounded-2xl overflow-hidden bg-[#181818]">
                      <img
                        src={concertStageImg}
                        alt="Live concert lighting"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover brightness-90"
                      />
                    </div>
                    <div className="flex-1 rounded-2xl overflow-hidden bg-[#181818]">
                      <img
                        src={backstageFriendsImg}
                        alt="Members enjoying live venue lounge"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover brightness-90"
                      />
                    </div>
                  </div>

                  <div className="col-span-7 rounded-2xl overflow-hidden bg-[#181818]">
                    <img
                      src={heroPortraitImg}
                      alt="Lumaréel Black Card member evening"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-top brightness-90"
                    />
                  </div>
                </div>

                {/* Bottom Bar Inside Photo Frame */}
                <div className="mt-2 rounded-xl bg-[#181818] border border-white/[0.08] px-4 py-3 flex items-center justify-end">
                  <span className="text-[10px] font-mono tracking-[0.18em] text-[#C8FF3D] uppercase">
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Overlapping Floating Physical Black Card (Bottom-Left) */}
              <div className="relative sm:absolute sm:-left-4 sm:-bottom-4 mt-5 sm:mt-0 w-full max-w-[300px] mx-auto sm:mx-0">
                <div
                  className="w-full rounded-[18px] bg-gradient-to-br from-[#1F1F1D] via-[#0D0D0C] to-[#040404] border border-white/20 p-5 shadow-[0_28px_70px_rgba(0,0,0,0.95)] relative overflow-hidden"
                  style={{ aspectRatio: '85.6 / 53.98' }}
                >
                  {/* Subtle metallic sheen */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.04] to-transparent pointer-events-none" />

                  <div className="relative z-10 h-full flex flex-col justify-between text-left">
                    {/* Card Top Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-agrandir-extrabold text-xs tracking-[0.08em] text-white uppercase">
                          LUMARÉEL
                        </span>
                        <span className="text-[8px] font-mono text-[#D4B475] uppercase tracking-wider">
                          BLACK
                        </span>
                      </div>
                      <div className="w-6 h-6 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                        <Globe className="w-3 h-3 text-[#CCCCCC]" />
                      </div>
                    </div>

                    {/* EMV Gold Chip + Label */}
                    <div className="flex items-center gap-3 my-auto">
                      <div className="w-9 h-7 rounded-[5px] bg-gradient-to-br from-[#F0DB9B] via-[#C8A65C] to-[#8C6D2F] border border-black/40 p-1 grid grid-cols-3 gap-0.5 shadow-inner shrink-0">
                        <div className="border-r border-b border-black/30" />
                        <div className="border-b border-black/30" />
                        <div className="border-l border-b border-black/30" />
                        <div className="border-r border-black/30" />
                        <div className="bg-black/15" />
                        <div className="border-l border-black/30" />
                      </div>
                      <span className="text-[8px] font-mono tracking-[0.18em] text-[#9A9A9A] uppercase">
                        PHYSICAL PASS
                      </span>
                    </div>

                    {/* Card Bottom Row */}
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[7px] font-mono text-[#777777] uppercase tracking-[0.18em]">
                          PASS HOLDER
                        </div>
                        <div className="text-[11px] font-agrandir-bold text-white uppercase tracking-wider truncate mt-0.5">
                          {cardDisplayName}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[7px] font-mono text-[#C8FF3D] uppercase tracking-wider">
                          SYNCED
                        </div>
                        <div className="text-[10px] font-mono text-[#CCCCCC] tabular-nums mt-0.5">
                          #9841-82
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW IT WORKS — "Your digital experiences, made physical."              */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-12 sm:py-16">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8">
          <div className="rounded-[32px] bg-[#0B0B0B] border border-white/[0.08] p-6 sm:p-12 lg:p-14 space-y-10">

            {/* Section Header */}
            <div className="max-w-xl space-y-3 text-left">
              <div className="text-[10px] font-mono tracking-[0.2em] text-[#888888] uppercase">
                HOW IT WORKS
              </div>
              <h2 className="text-3xl sm:text-[38px] font-agrandir-extrabold tracking-tight text-white leading-[1.08]">
                Your digital experiences, <br />
                made physical.
              </h2>
              <p className="text-xs sm:text-sm text-[#9A9A9A] font-light leading-relaxed">
                The Lumaréel Black Card is the physical representation of your digital concert purchases and activities on Lumaréel. It binds your digital ticket purchases, stage orders, and priority check-ins into one piece of tactile craftsmanship.
              </p>
            </div>

            {/* Top Bento Row: Digital Ticket Sync (7 cols) + Laser-Etched Backplate (5 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">

              {/* Left Card: Digital Concert Ticket Sync */}
              <div className="lg:col-span-7 rounded-3xl bg-[#131313] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between space-y-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1C1C1C] border border-white/10 flex items-center justify-center text-[#CCCCCC] shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-agrandir-bold text-white">
                        Digital Concert Ticket Sync
                      </div>
                      <div className="text-[11px] text-[#888888]">
                        Live wallet synchronicity
                      </div>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-[#C8FF3D]/15 border border-[#C8FF3D]/30 text-[9px] font-mono tracking-widest text-[#C8FF3D] uppercase whitespace-nowrap">
                    TAP &amp; GO
                  </span>
                </div>

                {/* Inner Active Concert Order Box */}
                <div className="rounded-2xl bg-[#090909] border border-white/[0.08] p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[9px] font-mono tracking-[0.18em] text-[#777777] uppercase">
                        ACTIVE CONCERT ORDER
                      </div>
                      <div className="text-base sm:text-lg font-agrandir-bold text-white mt-1">
                        The Neon Horizon World Tour
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#161616] border border-white/10 flex items-center justify-center text-[#D4B475] shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] grid grid-cols-3 gap-3">
                    <div>
                      <div className="text-[8px] font-mono text-[#777777] uppercase tracking-wider">
                        GATE
                      </div>
                      <div className="text-xs font-semibold text-white mt-0.5">
                        South Arch 04
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono text-[#777777] uppercase tracking-wider">
                        TIER
                      </div>
                      <div className="text-xs font-semibold text-white mt-0.5">
                        VIP Soundstage
                      </div>
                    </div>
                    <div>
                      <div className="text-[8px] font-mono text-[#777777] uppercase tracking-wider">
                        VERIFIED
                      </div>
                      <div className="text-xs font-semibold text-[#C8FF3D] mt-0.5 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF3D]" />
                        <span>Active</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#888888] font-light leading-relaxed">
                  Purchased a concert pass on your mobile device? The second your reservation confirms, your physical card is updated via our cryptographic cloud registry.
                </p>
              </div>

              {/* Right Card: Laser-Etched Backplate */}
              <div className="lg:col-span-5 rounded-3xl bg-[#070707] border border-white/15 p-6 sm:p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono tracking-[0.18em] text-[#D4B475] uppercase">
                      TACTILE VERIFICATION
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#141414] border border-white/10 text-[9px] font-mono text-[#888888]">
                      1:1
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-agrandir-extrabold text-white tracking-tight">
                    Laser-Etched Backplate
                  </h3>

                  <p className="text-xs sm:text-[13px] text-[#9A9A9A] font-light leading-relaxed">
                    Flip the card to reveal your precision laser-etched dynamic QR tag and integrated high-frequency NFC chip for instant turnstile tap-through.
                  </p>
                </div>

                <div className="rounded-2xl bg-[#131313] border border-white/10 p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white text-[#050505] flex items-center justify-center shrink-0">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-agrandir-bold text-white">
                        Venue Gate Access
                      </div>
                      <div className="text-[10px] text-[#888888]">
                        Zero lag verification
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-mono font-bold text-[#C8FF3D] tabular-nums">
                    0.2s
                  </span>
                </div>
              </div>

            </div>

            {/* Bottom 2-Column Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left">

              <div className="rounded-2xl bg-[#131313] border border-white/[0.08] p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1C1C1C] border border-white/10 flex items-center justify-center text-[#D4B475] shrink-0">
                  <Quote className="w-4 h-4" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-agrandir-bold text-white">
                    Effortless Account Sync
                  </h4>
                  <p className="text-xs text-[#9A9A9A] font-light leading-relaxed">
                    Instantly linked to your Lumaréel account. Every festival, gig, acoustic session, and VIP reservation synchronizes effortlessly without manual activation.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-[#131313] border border-white/[0.08] p-6 flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1C1C1C] border border-white/10 flex items-center justify-center text-[#D4B475] shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-agrandir-bold text-white">
                    Pure Live-Music Pass
                  </h4>
                  <p className="text-xs text-[#9A9A9A] font-light leading-relaxed">
                    Not a credit or debit card. No credit checks, no recurring interest, and no statements. Designed purely to bridge your live music memories and stage access.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SIMPLE PRIVILEGES — "Three ways your card elevates your live music."   */}
      {/* ========================================================================= */}
      <section id="benefits-section" className="py-16 sm:py-24">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-12">

          <div className="text-center max-w-xl mx-auto space-y-3">
            <div className="text-[10px] font-mono tracking-[0.2em] text-[#888888] uppercase">
              SIMPLE PRIVILEGES
            </div>
            <h2 className="text-3xl sm:text-[40px] font-agrandir-extrabold tracking-tight text-white leading-[1.08] text-balance">
              Three ways your card elevates your live music.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">

            {/* Card 01 */}
            <div className="rounded-3xl bg-[#0D0D0D] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5">
                <div className="text-3xl font-agrandir-extrabold text-[#D4B475] tabular-nums">
                  01
                </div>
                <h3 className="text-lg font-agrandir-extrabold uppercase tracking-tight text-white">
                  YOUR CONCERTS
                </h3>
                <p className="text-xs sm:text-[13px] text-[#9A9A9A] font-light leading-relaxed">
                  Keep your concert purchases and digital orders connected to your personal card. Flash it at partner venue bars for order pickups.
                </p>
              </div>

              <div className="rounded-2xl bg-[#141414] border border-white/[0.08] overflow-hidden">
                <div className="h-36 w-full overflow-hidden">
                  <img
                    src={concertStageImg}
                    alt="Main stage concert access"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                    <Ticket className="w-3.5 h-3.5 text-[#D4B475]" />
                    <span>Main Stage Access</span>
                  </span>
                  <span className="text-[#888888]">Instant Tap</span>
                </div>
              </div>
            </div>

            {/* Card 02 */}
            <div className="rounded-3xl bg-[#0D0D0D] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5">
                <div className="text-3xl font-agrandir-extrabold text-white tabular-nums">
                  02
                </div>
                <h3 className="text-lg font-agrandir-extrabold uppercase tracking-tight text-white">
                  ONE PERSONAL CARD
                </h3>
                <p className="text-xs sm:text-[13px] text-[#9A9A9A] font-light leading-relaxed">
                  A physical representation of your digital Lumaréel activities. Anodized matte titanium composite engineered to withstand venue crowds.
                </p>
              </div>

              <div className="rounded-2xl bg-[#141414] border border-white/[0.08] p-4 space-y-3">
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="inline-flex items-center gap-1.5 text-[#D4B475] uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4B475]" />
                    <span>CUSTOM MONOGRAM</span>
                  </span>
                  <span className="text-[#777777] uppercase">LMR-TITAN</span>
                </div>

                <div>
                  <div className="text-[8px] font-mono text-[#777777] uppercase tracking-widest">
                    ENGRAVED EDITION
                  </div>
                  <div className="text-sm font-agrandir-extrabold text-white uppercase tracking-wide mt-0.5 truncate">
                    {cardDisplayName}
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[10px]">
                  <span className="text-[#888888] tabular-nums">Weight: 18.2g</span>
                  <span className="text-[#C8FF3D] font-mono">Haptic Chip Active</span>
                </div>
              </div>
            </div>

            {/* Card 03 */}
            <div className="rounded-3xl bg-[#0D0D0D] border border-white/[0.08] p-6 sm:p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-2.5">
                <div className="text-3xl font-agrandir-extrabold text-[#C8FF3D] tabular-nums">
                  03
                </div>
                <h3 className="text-lg font-agrandir-extrabold uppercase tracking-tight text-white">
                  EXCLUSIVE BENEFITS
                </h3>
                <p className="text-xs sm:text-[13px] text-[#9A9A9A] font-light leading-relaxed">
                  Enjoy additional advantages associated with owning a Lumaréel Black Card. Early soundcheck entrance, private mezzanine access, and partner perks.
                </p>
              </div>

              <div className="rounded-2xl bg-[#141414] border border-white/[0.08] overflow-hidden">
                <div className="h-36 w-full overflow-hidden">
                  <img
                    src={backstageFriendsImg}
                    alt="Companion mezzanine perks"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="px-3.5 py-2.5 flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-white">
                    <Radio className="w-3.5 h-3.5 text-[#D4B475]" />
                    <span>Companion Mezzanine</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#D4B475]/20 text-[#D4B475] text-[9px] font-mono uppercase">
                    PERK
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. OWN THE PIECE — "MAKE IT YOURS."                                      */}
      {/* ========================================================================= */}
      <section id="get-black-card" className="py-12 sm:py-16">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8">
          <div className="rounded-[32px] bg-[#0B0B0B] border border-white/[0.08] p-6 sm:p-12 lg:p-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

              {/* Left Column: Physical Card Preview + Brushed Titanium Note */}
              <div className="lg:col-span-5 flex flex-col items-center space-y-4">
                <div
                  onClick={() => setIsEditingCardName(true)}
                  title="Click to preview your custom engraved name"
                  className="w-full max-w-[360px] rounded-[22px] bg-gradient-to-br from-[#1F1F1D] via-[#0D0D0C] to-[#040404] border border-[#D4B475]/35 p-6 sm:p-7 shadow-[0_30px_80px_rgba(0,0,0,0.95)] relative overflow-hidden cursor-pointer group transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ aspectRatio: '85.6 / 53.98' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.05] to-transparent pointer-events-none" />

                  <div className="relative z-10 h-full flex flex-col justify-between text-left">
                    {/* Top Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-agrandir-extrabold text-sm sm:text-base tracking-[0.08em] text-white uppercase">
                          LUMARÉEL
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#D4B475]/20 border border-[#D4B475]/30 text-[8px] font-mono text-[#D4B475] uppercase tracking-wider">
                          PASS
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full border border-white/15 bg-white/5 flex items-center justify-center">
                        <Wifi className="w-3.5 h-3.5 text-[#D4B475] rotate-90" />
                      </div>
                    </div>

                    {/* EMV Chip + Core Serial */}
                    <div className="flex items-center gap-3.5 my-auto">
                      <div className="w-10 h-8 rounded-[6px] bg-gradient-to-br from-[#F0DB9B] via-[#C8A65C] to-[#8C6D2F] border border-black/40 p-1 grid grid-cols-3 gap-0.5 shadow-inner shrink-0">
                        <div className="border-r border-b border-black/30" />
                        <div className="border-b border-black/30" />
                        <div className="border-l border-b border-black/30" />
                        <div className="border-r border-black/30" />
                        <div className="bg-black/15" />
                        <div className="border-l border-black/30" />
                      </div>
                      <div>
                        <div className="text-[8px] font-mono text-[#888888] uppercase tracking-[0.16em]">
                          ENCRYPTED TACTILE CORE
                        </div>
                        <div className="text-xs font-mono text-white tracking-widest tabular-nums mt-0.5">
                          0042 • 8821 • 9102
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row */}
                    <div className="flex items-end justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[7px] font-mono text-[#777777] uppercase tracking-[0.18em]">
                          PHYSICAL EDITION
                        </div>
                        <div className="text-xs font-agrandir-extrabold text-white uppercase tracking-wider truncate mt-0.5">
                          {engravedPlaceholderName}
                        </div>
                      </div>

                      <div className="w-7 h-7 rounded-full border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#888888]" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live Monogram Editor (toggled on click) */}
                {isEditingCardName && (
                  <div className="w-full max-w-[360px] flex items-center gap-2">
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                      placeholder="TYPE YOUR ENGRAVED NAME"
                      maxLength={24}
                      autoFocus
                      className="flex-1 px-3.5 py-2 rounded-xl bg-[#141414] border border-[#D4B475]/50 text-xs font-mono text-white uppercase tracking-wider outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setIsEditingCardName(false)}
                      className="px-3 py-2 rounded-xl bg-white text-black text-xs font-bold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-5 text-[11px] text-[#888888]">
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D4B475]" />
                    <span>Brushed Titanium</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#D4B475]" />
                    <span>NFC &amp; QR Integrated</span>
                  </span>
                </div>
              </div>

              {/* Right Column: Title, Pricing Card & Primary CTA */}
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="inline-block px-3 py-1 rounded-full bg-[#151515] border border-white/10 text-[9px] font-mono tracking-[0.18em] text-[#D4B475] uppercase">
                  OWN THE PIECE
                </div>

                <h2 className="text-3xl sm:text-[42px] font-agrandir-extrabold uppercase tracking-tight text-white leading-none">
                  MAKE IT YOURS.
                </h2>

                <p className="text-xs sm:text-sm text-[#9A9A9A] font-light leading-relaxed max-w-lg">
                  Get your Lumaréel Black Card and bring your digital concert experiences into the physical world. Crafted from brushed anodized titanium precision meets instant live-stage access.
                </p>

                {/* Pricing Summary Box */}
                <div className="rounded-2xl bg-[#131313] border border-white/[0.08] p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono tracking-[0.14em] text-[#CCCCCC] uppercase">
                      LUMARÉEL BLACK CARD — PHYSICAL EDITION
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-[#C8FF3D]/15 border border-[#C8FF3D]/30 text-[9px] font-mono tracking-wider text-[#C8FF3D] uppercase whitespace-nowrap">
                      READY TO SHIP
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-agrandir-extrabold text-white tabular-nums">
                        $49
                      </span>
                      <span className="text-xs font-mono text-[#888888] uppercase">
                        USD
                      </span>
                    </div>

                    <span className="text-[10px] font-mono tracking-wider text-[#D4D4D4] uppercase">
                      FREE GLOBAL EXPRESS
                    </span>
                  </div>

                  <div className="text-[11px] text-[#777777]">
                    One-time purchase • No recurring subscription or banking fees
                  </div>
                </div>

                {/* Primary CTA Button */}
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  disabled={isSoldOut}
                  className="w-full py-4 px-6 rounded-full bg-white hover:bg-[#D4B475] text-[#050505] font-agrandir-extrabold text-xs tracking-[0.12em] uppercase inline-flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <span>GET YOUR BLACK CARD</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 text-[11px] text-[#777777]">
                  <Lock className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                  <span>
                    Direct checkout. Ships in 2–3 business days. No application or approval process required.
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. FOOTER (EXACT MATCH TO MOCKUP, DARK MODE)                              */}
      {/* ========================================================================= */}
      <footer className="mt-12 border-t border-white/[0.08] bg-[#050505] pt-14 pb-28 md:pb-10 text-left">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8">

            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-agrandir-extrabold text-base tracking-[0.06em] text-white uppercase">
                  LUMARÉEL
                </span>
                <span className="px-2 py-0.5 rounded bg-[#141414] border border-[#D4B475]/30 text-[9px] font-mono tracking-[0.16em] text-[#D4B475] uppercase">
                  BLACK
                </span>
              </div>
              <p className="text-xs text-[#888888] font-light leading-relaxed max-w-xs">
                Physical card for your digital concert world. Pure architectural titanium precision meets instant live-stage access.
              </p>
            </div>

            <div className="lg:col-span-2 space-y-2.5 text-xs">
              <div className="font-semibold text-white">Product</div>
              <button
                type="button"
                onClick={() => scrollToSection('hero-section')}
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                The Card
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('client_space')}
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Concert Orders
              </button>
            </div>

            <div className="lg:col-span-2 space-y-2.5 text-xs">
              <div className="font-semibold text-white">Company</div>
              <button
                type="button"
                onClick={() => setCurrentPage('about')}
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                About
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage('contact')}
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Contact
              </button>
            </div>

            <div className="lg:col-span-3 space-y-2.5 text-xs">
              <div className="font-semibold text-white">Legal &amp; Privacy</div>
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'Terms of Membership',
                    body: 'Your LUMARÉEL Black Card is a physical and digital live-event pass bound to your verified LUMARÉEL account. It carries no credit line, recurring debt, or interest charges.',
                  })
                }
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Terms
              </button>
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'Privacy & Registry Security',
                    body: 'Ticket tokens and NFC identifiers are cryptographically signed and never shared with third-party advertisers. You may revoke or reissue a lost card anytime from your profile.',
                  })
                }
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Privacy
              </button>
              <button
                type="button"
                onClick={() =>
                  setInfoModal({
                    title: 'Concierge & Support',
                    body: 'Need help pairing your physical card or checking shipping status? Contact our dedicated member desk 24/7 via your LUMARÉEL account.',
                  })
                }
                className="block text-[#888888] hover:text-white transition-colors cursor-pointer"
              >
                Help
              </button>
            </div>

          </div>

          <div className="mt-12 pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-4 text-[11px] text-[#666666]">
            <span>© 2025 LUMARÉEL Card Inc. All rights reserved.</span>
            <span className="inline-flex items-center gap-2 text-[#888888]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF3D]" />
              <span>Global Stage Network Active</span>
            </span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 7. ORDER / PERSONALIZATION WIZARD MODAL                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl rounded-[28px] bg-[#0E0E0E] border border-white/15 p-6 sm:p-8 shadow-2xl my-8 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4B475]">
                    BLACK CARD ORDER · STEP {wizardStep} / 5
                  </span>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase mt-0.5">
                    LUMARÉEL Black Card
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-8 h-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      wizardStep >= s ? 'bg-[#D4B475]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Step 1 */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      1. Laser Engraving Monogram
                    </h4>
                    <p className="text-xs text-[#9A9A9A] font-light mt-1">
                      Your full name is laser-etched onto your brushed titanium Black Card.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                      Name to engrave on card *
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
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white font-mono text-sm uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-mono text-[#D4B475] uppercase tracking-wider block">
                        Physical Edition
                      </span>
                      <strong className="text-sm font-agrandir-bold text-white uppercase">
                        {selectedPlan?.name || 'LUMARÉEL Black Card — Titanium'}
                      </strong>
                      <p className="text-[11px] text-[#9A9A9A] font-light">
                        Engraved card + Dynamic QR + NFC chip + Express shipping
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-agrandir-extrabold text-white font-mono tabular-nums">
                        $49 USD
                      </div>
                      <span className="text-[9px] text-[#888888] uppercase">One-time purchase</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!applicantName.trim()}
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#D4B475] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <span>Continue to Shipping</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2 */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      2. Account &amp; Global Express Shipping
                    </h4>
                    <p className="text-xs text-[#9A9A9A] font-light mt-1">
                      Your card automatically links to this account email. Ships free in 2–3 business days.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="you@domain.com"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        City *
                      </label>
                      <input
                        type="text"
                        value={applicantCity}
                        onChange={(e) => setApplicantCity(e.target.value)}
                        placeholder="Abidjan / Paris"
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white text-xs outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Street Address *
                      </label>
                      <input
                        type="text"
                        value={applicantAddress}
                        onChange={(e) => setApplicantAddress(e.target.value)}
                        placeholder="Delivery street & suite"
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="text-xs text-[#9A9A9A] hover:text-white cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      disabled={!applicantEmail.trim() || !applicantPhone.trim()}
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#D4B475] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors"
                    >
                      <span>Sync Preferences</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3 */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      3. Live Stage Preferences
                    </h4>
                    <p className="text-xs text-[#9A9A9A] font-light mt-1">
                      Tailor your priority soundcheck and mezzanine perks.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                      Primary Concert Interest
                    </label>
                    <select
                      value={musicInterest}
                      onChange={(e) => setMusicInterest(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white text-xs outline-none cursor-pointer"
                    >
                      <option value="Afrobeats & Live Acoustic">Afrobeats, Amapiano &amp; Live Acoustic</option>
                      <option value="Jazz, Soul & R&B">Jazz, Soul &amp; Private R&amp;B Sessions</option>
                      <option value="Stadium Tours & Festivals">Stadium Tours &amp; Global Festivals</option>
                      <option value="VIP Mezzanine & Lounges">VIP Mezzanine &amp; Backstage Lounges</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                      Partner / Promo Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="EX: LUMAREEL-2026"
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4B475] text-white font-mono text-xs uppercase tracking-wider outline-none"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-xs text-[#9A9A9A] hover:text-white cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-3 rounded-full bg-white hover:bg-[#D4B475] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <span>Continue to Checkout</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 4 */}
              {wizardStep === 4 && (
                <form onSubmit={handleCompleteAdmission} className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      4. Direct Checkout
                    </h4>
                    <p className="text-xs text-[#9A9A9A] font-light mt-1">
                      Select your payment method to activate instant digital sync and ship your titanium card.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'card', label: 'Card', desc: 'Visa / Mastercard' },
                      { id: 'wave', label: 'Wave', desc: '0% fee' },
                      { id: 'orange_money', label: 'Orange Money', desc: 'Instant' },
                      { id: 'mtn_momo', label: 'MTN MoMo', desc: 'Instant' },
                      { id: 'djamo', label: 'Djamo', desc: 'Virtual / Physical' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-[#D4B475]/15 border-[#D4B475] text-white'
                            : 'bg-white/5 border-white/10 text-[#9A9A9A] hover:border-white/25'
                        }`}
                      >
                        <div className="font-agrandir-bold text-xs text-white uppercase">{m.label}</div>
                        <div className="text-[10px] text-[#888888] font-mono mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-white/15 space-y-2 text-xs">
                    <div className="flex justify-between text-[#9A9A9A]">
                      <span>LUMARÉEL Black Card — Physical Edition</span>
                      <span className="font-mono text-white tabular-nums">$49.00 USD</span>
                    </div>
                    <div className="flex justify-between text-[#9A9A9A]">
                      <span>Free Global Express Shipping</span>
                      <span className="text-[#C8FF3D] font-mono">Included</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between font-agrandir-extrabold text-sm text-white">
                      <span>Total</span>
                      <span className="text-[#D4B475] font-mono tabular-nums">$49.00 USD</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="text-xs text-[#9A9A9A] hover:text-white cursor-pointer"
                    >
                      Back
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3.5 rounded-full bg-white hover:bg-[#D4B475] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin text-black" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span>Confirm Order</span>
                          <Check className="w-4 h-4 text-black" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Step 5 */}
              {wizardStep === 5 && issuedResult && (
                <div className="text-center space-y-5 py-4">
                  <div className="w-14 h-14 rounded-full border border-[#C8FF3D] bg-[#C8FF3D]/15 text-[#C8FF3D] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#C8FF3D] uppercase">
                      ORDER CONFIRMED
                    </span>
                    <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">
                      YOUR BLACK CARD IS SYNCED
                    </h3>
                    <p className="text-xs text-[#9A9A9A] font-light max-w-md mx-auto">
                      Your card ID <strong>{issuedResult.card.cardNumber}</strong> is now synchronized with your concert library and queued for express shipping.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-white/15 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#9A9A9A]">Engraved Name</span>
                      <strong className="text-white uppercase font-mono">{issuedResult.card.cardholderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9A9A9A]">Card Number</span>
                      <strong className="text-[#D4B475] font-mono tabular-nums">{issuedResult.card.cardNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9A9A9A]">Shipping</span>
                      <span className="text-[#C8FF3D] font-mono">2–3 Business Days</span>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsWizardOpen(false);
                        if (onGoToWallet) onGoToWallet();
                        else setCurrentPage('member_card');
                      }}
                      className="px-8 py-3.5 rounded-full bg-white hover:bg-[#D4B475] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors"
                    >
                      Open My Black Card Wallet
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* 8. LEGAL / SUPPORT INFO MODAL                                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {infoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-md rounded-3xl bg-[#0E0E0E] border border-white/15 p-6 space-y-4 text-left"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-agrandir-bold text-white">{infoModal.title}</h3>
                <button
                  type="button"
                  onClick={() => setInfoModal(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-[#9A9A9A] leading-relaxed">{infoModal.body}</p>
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setInfoModal(null)}
                  className="px-5 py-2 rounded-full bg-white text-black text-xs font-bold cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
