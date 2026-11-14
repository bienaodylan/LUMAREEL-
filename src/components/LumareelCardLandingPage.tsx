import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import { getAuthHeaders } from '../utils/authSession';
import heroPortraitImg from '../assets/images/black_card_hero_portrait_1794664559137.jpg';
import backstageFriendsImg from '../assets/images/backstage_friends_moment_1794664561231.jpg';
import concertStageImg from '../assets/images/concert_stage_atmosphere_1794664559978.jpg';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  KeyRound,
  Lock,
  Radio,
  RotateCw,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  X,
  Zap,
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

  // Édition & formules
  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);

  // Personnalisation en direct sur la carte
  const [customName, setCustomName] = useState(currentUser?.name || 'AURELIA VANCE');

  // Tunnel d'admission fluide en plusieurs étapes
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
  const [issuedResult, setIssuedResult] = useState<{ card: MembershipCard } | null>(null);

  // Interaction Pass sur maquette smartphone
  const [passActivated, setPassActivated] = useState(false);

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
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/membership/order', {
        method: 'POST',
        credentials: 'include',
        headers,
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
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.order?.id) {
        throw new Error(data.error || 'Impossible de valider votre demande d’admission.');
      }

      const orderToken = String(data.orderAccessToken || '');
      const payHeaders = await getAuthHeaders({
        'Content-Type': 'application/json',
        ...(orderToken ? { 'X-Order-Token': orderToken } : {}),
      });
      const payRes = await fetch(`/api/membership/orders/${encodeURIComponent(data.order.id)}/pay-sandbox`, {
        method: 'POST',
        credentials: 'include',
        headers: payHeaders,
        body: JSON.stringify({ orderAccessToken: orderToken }),
      });

      if (payRes.status === 404) {
        showToast(
          'Demande enregistrée. Veuillez finaliser le règlement auprès de votre passerelle de paiement.',
          'info'
        );
        return;
      }

      const payData = await payRes.json();
      if (!payRes.ok || !payData.success || !payData.card) {
        throw new Error(payData.error || 'La confirmation de votre paiement d’adhésion a échoué.');
      }

      setIssuedResult({ card: payData.card });
      setWizardStep(5);
      showToast('Votre admission à la LUMARÉEL Black Card est confirmée.', 'success');
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const displayName = (customName.trim() || 'AURELIA VANCE').toUpperCase();
  const displayCardNumber = `LMR-2026-00${String(allocated + 1).padStart(2, '0')}`;

  return (
    <div className="w-full min-h-screen bg-[#080807] text-[#F4F3EF] font-agrandir-regular selection:bg-[#D4BD7D] selection:text-black">

      {/* ========================================================================= */}
      {/* 1. HERO SECTION — COPIE EXACTE DU DESIGN DE LA MAQUETTE                   */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-20 sm:pt-16 sm:pb-28">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8">

          {hasActiveCard && onGoToWallet && (
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={onGoToWallet}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4BD7D]/45 bg-[#151513] text-[#D4BD7D] text-[11px] font-agrandir-bold uppercase tracking-wider hover:bg-[#D4BD7D] hover:text-black transition-colors cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Mon Portefeuille ({activeCardNumber || 'Membre Actif'})</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">

            {/* Colonne Gauche : Kicker + Grand Titre + Texte + 2 Pill Boutons */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#151513] border border-white/10 text-[10px] font-mono tracking-[0.18em] text-[#D4BD7D] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4BD7D]" />
                <span>PRÉSENTATION · LUMARÉEL BLACK CARD</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-[62px] font-agrandir-extrabold uppercase tracking-tight leading-[0.96] text-white">
                VOTRE MONDE. <br />
                <span className="text-[#EAE6DC]">VOTRE ACCÈS.</span>
              </h1>

              <p className="text-sm sm:text-[15px] text-[#9A9890] font-light leading-relaxed max-w-md">
                Bien plus qu’une carte. Votre passerelle vers des concerts inoubliables, des expériences en coulisses et les privilèges exclusifs d’un cercle privé.
              </p>

              {/* Boutons exactement comme dans le design */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToSection('privileges-section')}
                  className="px-6 py-3.5 rounded-full bg-[#D4BD7D] hover:bg-[#E2CD92] text-[#0A0A09] font-agrandir-extrabold text-[11px] tracking-[0.12em] uppercase inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shadow-lg"
                >
                  <span>DÉCOUVRIR LA BLACK CARD</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                {isSoldOut ? (
                  <button
                    disabled
                    className="px-6 py-3.5 rounded-full bg-[#151513] border border-white/10 text-neutral-500 font-agrandir-bold text-[11px] tracking-[0.12em] uppercase cursor-not-allowed whitespace-nowrap"
                  >
                    ÉDITION COMPLÈTE
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openAdmissionWizard(plans[0])}
                    className="px-6 py-3.5 rounded-full bg-[#151513] hover:bg-[#1E1E1B] border border-white/15 text-white font-agrandir-extrabold text-[11px] tracking-[0.12em] uppercase transition-colors cursor-pointer whitespace-nowrap"
                  >
                    DEMANDER MON ADMISSION
                  </button>
                )}
              </div>

              {/* Micro-lignes de confiance */}
              <div className="pt-3 flex flex-wrap items-center gap-6 text-[10px] font-mono tracking-[0.16em] text-[#8E8C84] uppercase">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[#D4BD7D]" />
                  <span>ÉDITION LIMITÉE MONDIALE</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-[#D4BD7D]" />
                  <span>AUTHENTICITÉ GARANTIE</span>
                </span>
              </div>
            </div>

            {/* Colonne Droite : Grand Visuel Portrait + Carte Noire Gravée superposée */}
            <div className="lg:col-span-6">
              <div className="relative rounded-[28px] overflow-hidden border border-white/10 bg-[#121210] aspect-[4/4.35] shadow-2xl">
                <img
                  src={heroPortraitImg}
                  alt="LUMARÉEL Black Card — Art de vivre"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover brightness-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent" />

                {/* Badge flottant haut droit */}
                <div className="absolute top-5 right-5 rounded-2xl bg-[#11110F]/90 backdrop-blur-md border border-white/10 px-4 py-2.5 text-left">
                  <div className="flex items-center gap-1.5 text-[8px] font-mono tracking-[0.18em] text-[#D4BD7D] uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4BD7D]" />
                    <span>SUR INVITATION</span>
                  </div>
                  <div className="text-[10px] font-agrandir-bold text-white tracking-wider uppercase mt-0.5">
                    ÉDITION FONDATEURS
                  </div>
                </div>

                {/* Carte LUMARÉEL Noire & Or superposée */}
                <div className="absolute inset-x-5 sm:inset-x-8 bottom-6 sm:bottom-8">
                  <div
                    className="w-full max-w-[390px] mx-auto rounded-[20px] bg-gradient-to-br from-[#24231E] via-[#131311] to-[#090908] border border-[#D4BD7D]/35 p-5 sm:p-6 shadow-[0_30px_70px_rgba(0,0,0,0.9)] relative overflow-hidden"
                    style={{ aspectRatio: '85.6 / 53.98' }}
                  >
                    {/* Lignes courbes subtiles gravées sur la carte comme dans l'image */}
                    <svg
                      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
                      viewBox="0 0 400 250"
                      fill="none"
                    >
                      <path
                        d="M-30 190 C 90 130, 220 220, 430 90"
                        stroke="#D4BD7D"
                        strokeWidth="1"
                      />
                      <path
                        d="M-30 215 C 110 155, 250 245, 430 120"
                        stroke="#D4BD7D"
                        strokeWidth="0.75"
                      />
                      <path
                        d="M120 -20 C 200 110, 310 60, 430 170"
                        stroke="#FFFFFF"
                        strokeWidth="0.6"
                      />
                    </svg>

                    <div className="relative z-10 h-full flex flex-col justify-between text-left">
                      {/* Ligne du haut */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-agrandir-extrabold text-sm sm:text-base tracking-[0.14em] text-white uppercase">
                            LUMARÉEL
                          </span>
                          <span className="text-[9px] font-mono text-[#9A9890] uppercase tracking-widest">
                            NOIRE
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-full border border-[#D4BD7D]/30 bg-black/40 flex items-center justify-center">
                          <Crown className="w-3.5 h-3.5 text-[#D4BD7D]" />
                        </div>
                      </div>

                      {/* Puce dorée + Onde sans contact */}
                      <div className="flex items-center justify-between my-auto">
                        <div className="w-11 h-8 rounded-[6px] bg-gradient-to-br from-[#F2DF9F] via-[#D4BD7D] to-[#8C7032] border border-black/40 p-1 grid grid-cols-3 gap-0.5 shadow-inner">
                          <div className="border-r border-b border-black/30" />
                          <div className="border-b border-black/30" />
                          <div className="border-l border-b border-black/30" />
                          <div className="border-r border-black/30" />
                          <div className="bg-black/15" />
                          <div className="border-l border-black/30" />
                        </div>

                        <Radio className="w-5 h-5 text-[#D4BD7D]" />
                      </div>

                      {/* Bas de carte */}
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-[7px] font-mono text-[#8E8C84] uppercase tracking-[0.2em]">
                            NUMÉRO DE MEMBRE
                          </div>
                          <div className="text-xs font-mono text-white tracking-widest mt-0.5 tabular-nums">
                            •••• •••• •••• {String(allocated + 1).padStart(4, '0')}
                          </div>
                          <div className="text-[11px] font-agrandir-bold text-[#D4BD7D] tracking-wider uppercase mt-0.5 truncate max-w-[190px]">
                            {displayName}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div className="text-[7px] text-[#8E8C84] uppercase tracking-wider">VALIDE</div>
                          <div className="text-xs text-white tabular-nums">11/27</div>
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
      {/* 2. SECTION "FAÇONNÉE POUR LES MOMENTS QUI COMPTENT."                      */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end text-left">
            <div className="lg:col-span-7 space-y-2.5">
              <div className="text-[10px] font-mono tracking-[0.22em] text-[#9E9B90] uppercase">
                SOCIÉTÉ BACKSTAGE & COMMUNAUTÉ
              </div>
              <h2 className="text-3xl sm:text-[42px] font-agrandir-extrabold uppercase text-white leading-[1.04]">
                FAÇONNÉE POUR LES MOMENTS QUI COMPTENT.
              </h2>
            </div>

            <div className="lg:col-span-5">
              <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed">
                De la première note jusqu’au dernier rappel, vivez la culture musicale et une hospitalité d’exception partagées entre initiés.
              </p>
            </div>
          </div>

          {/* Photo ambiance avec 3 barres arrondies superposées en bas */}
          <div className="relative rounded-[28px] overflow-hidden border border-white/10 bg-[#11110F]">
            <div className="h-[340px] sm:h-[440px] w-full">
              <img
                src={backstageFriendsImg}
                alt="Soirée privée membres LUMARÉEL"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

            {/* 3 cartes flottantes à l'intérieur bas de l'image */}
            <div className="relative sm:absolute sm:inset-x-5 sm:bottom-5 p-4 sm:p-0 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                'Votre prochain concert inoubliable.',
                'Des expériences qui restent gravées.',
                'Une communauté qui partage votre passion.',
              ].map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  className="rounded-2xl bg-[#10100E]/90 backdrop-blur-md border border-white/12 px-4 py-3.5 flex items-center gap-3 text-left hover:border-[#D4BD7D]/50 transition-colors cursor-pointer"
                >
                  <span className="w-7 h-7 rounded-lg bg-[#D4BD7D]/15 border border-[#D4BD7D]/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-[#D4BD7D]" />
                  </span>
                  <span className="text-xs font-agrandir-bold text-white leading-snug">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. SECTION "UNE CARTE. UN MONDE DE POSSIBILITÉS."                         */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-10">

          <div className="max-w-2xl mx-auto text-center space-y-3">
            <div className="inline-block px-3.5 py-1 rounded-full bg-[#151513] border border-white/10 text-[9px] font-mono tracking-[0.2em] text-[#D4BD7D] uppercase">
              L’ÉCOSYSTÈME
            </div>
            <h2 className="text-3xl sm:text-[44px] font-agrandir-extrabold uppercase text-white leading-[1.04]">
              UNE CARTE. UN MONDE DE POSSIBILITÉS.
            </h2>
            <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed max-w-lg mx-auto">
              Pensée comme un lien naturel entre une carte physique noire d’exception et votre conciergerie digitale instantanée.
            </p>
          </div>

          {/* Grand panneau arrondi contenant le smartphone à gauche & les 3 lignes à droite */}
          <div className="rounded-[32px] bg-[#10100E] border border-white/10 p-6 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

              {/* Smartphone Mockup à gauche */}
              <div className="lg:col-span-5 flex justify-center">
                <div className="w-full max-w-[290px] rounded-[38px] bg-[#070706] border-[4px] border-[#262522] p-5 shadow-2xl space-y-4 text-left">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <div className="text-[8px] font-mono text-[#8E8C84] uppercase tracking-widest">
                        TITULAIRE MEMBRE
                      </div>
                      <div className="text-sm font-agrandir-extrabold text-white uppercase">
                        {displayName}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D4BD7D] text-black text-[8px] font-agrandir-extrabold uppercase tracking-wider">
                      MEMBRE
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <div className="text-[8px] font-mono text-[#D4BD7D] uppercase tracking-widest">
                      SOIRÉE PRIVÉE CONFIRMÉE
                    </div>
                    <div className="text-base font-agrandir-extrabold text-white leading-tight">
                      Les Sessions Privées
                    </div>
                    <div className="text-[11px] text-[#9A9890]">
                      14 Nov · Salon Principal VIP
                    </div>
                  </div>

                  {/* Sceau interactif tactile sans QR ni termes techniques */}
                  <button
                    type="button"
                    onClick={() => setPassActivated((prev) => !prev)}
                    className="w-full rounded-2xl bg-[#141412] border border-[#D4BD7D]/25 hover:border-[#D4BD7D]/60 p-5 flex flex-col items-center justify-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-black border border-[#D4BD7D]/40 flex items-center justify-center">
                      {passActivated ? (
                        <CheckCircle2 className="w-6 h-6 text-[#D4BD7D]" />
                      ) : (
                        <KeyRound className="w-6 h-6 text-[#D4BD7D]" />
                      )}
                    </div>
                    <div className="text-[10px] font-agrandir-bold uppercase tracking-wider text-white">
                      {passActivated ? 'ACCÈS COUPE-FILE VALIDÉ' : 'EFFLEURER POUR ENTRER'}
                    </div>
                    <div className="text-[9px] font-mono text-[#8E8C84]">
                      PASS ACTIF · {displayCardNumber}
                    </div>
                  </button>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div className="rounded-xl bg-[#141412] border border-white/10 p-2.5">
                      <div className="text-[8px] font-mono text-[#8E8C84] uppercase">SALON</div>
                      <div className="text-[11px] font-bold text-white mt-0.5">Accès VIP</div>
                    </div>
                    <div className="rounded-xl bg-[#141412] border border-white/10 p-2.5">
                      <div className="text-[8px] font-mono text-[#8E8C84] uppercase">SOLDE</div>
                      <div className="text-[11px] font-bold text-[#D4BD7D] mt-0.5 tabular-nums">150 000 F</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Droite : Titre + Texte + 3 blocs arrondis */}
              <div className="lg:col-span-7 space-y-5 text-left">
                <div className="space-y-2.5">
                  <h3 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white leading-tight">
                    CONÇUE POUR UNE ENTRÉE SANS ATTENTE
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed">
                    Chaque interaction est pensée pour vous offrir une fluidité absolue : accédez directement aux entrées réservées, aux salons privés et aux loges artistes.
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    {
                      icon: Wallet,
                      title: 'Pass Portefeuille Instantané',
                      badge: 'INSTANTANÉ',
                      desc: 'Entrez directement par les accès réservés aux membres et réglez vos consommations en un geste.',
                    },
                    {
                      icon: Ticket,
                      title: 'Moteur de Prévente Concerts',
                      badge: 'PRIORITAIRE',
                      desc: 'Réservation prioritaire garantie 48h avant le public sur tous nos concerts et festivals.',
                    },
                    {
                      icon: Crown,
                      title: 'Conciergerie & Clé des Salons',
                      badge: 'SUR-MESURE',
                      desc: 'Hôtes dédiés, tables VIP réservées et accompagnement privé pour vous et votre invité.',
                    },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl bg-[#161614] border border-white/10 p-4 flex items-start gap-4"
                    >
                      <div className="w-9 h-9 rounded-xl bg-[#D4BD7D]/15 border border-[#D4BD7D]/30 flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-[#D4BD7D]" />
                      </div>
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-agrandir-bold text-white">
                            {item.title}
                          </span>
                          <span className="text-[8px] font-mono tracking-widest uppercase px-2 py-0.5 rounded-full bg-[#D4BD7D]/15 text-[#D4BD7D]">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#9A9890] font-light leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. SECTION "PRIVILÈGES INÉGALÉS" — BENTO 2 + 3 EXACT                      */}
      {/* ========================================================================= */}
      <section id="privileges-section" className="py-16 sm:py-24">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end text-left">
            <div className="lg:col-span-7 space-y-2">
              <div className="text-[10px] font-mono tracking-[0.22em] text-[#9E9B90] uppercase">
                DOTATIONS MEMBRES
              </div>
              <h2 className="text-3xl sm:text-[42px] font-agrandir-extrabold uppercase text-white leading-none">
                PRIVILÈGES INÉGALÉS
              </h2>
            </div>

            <div className="lg:col-span-5">
              <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed">
                Un ensemble d’avantages conçus sur-mesure et réservés uniquement aux titulaires de la LUMARÉEL Black Card.
              </p>
            </div>
          </div>

          {/* Rangée du haut : 01 (Noir) + 02 (Blanc ivoire) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-left">

            {/* Card 01 */}
            <div className="lg:col-span-7 rounded-[26px] bg-[#11110F] border border-white/10 p-7 sm:p-8 flex flex-col justify-between space-y-8">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-[#8E8C84]">01</span>
                <span className="px-3 py-1 rounded-full bg-[#D4BD7D]/15 border border-[#D4BD7D]/30 text-[9px] font-mono tracking-widest text-[#D4BD7D] uppercase">
                  PRIORITÉ ABSOLUE
                </span>
              </div>

              <div className="flex items-center justify-between gap-6">
                <div className="space-y-2.5 max-w-md">
                  <h3 className="text-2xl font-agrandir-extrabold text-white uppercase">
                    ACCÈS PRIORITAIRE
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed">
                    Accédez aux billetteries privées 48h avant le grand public pour tous les concerts LUMARÉEL, sans jamais attendre aux entrées.
                  </p>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center w-22 h-26 rounded-2xl bg-[#181815] border border-white/10 shrink-0">
                  <Zap className="w-5 h-5 text-[#D4BD7D] mb-1.5" />
                  <span className="text-xs font-mono font-bold text-white">48H</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-[#8E8C84] uppercase">
                  PLACEMENT GARANTI · ACCÈS DIRECT
                </span>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  className="w-8 h-8 rounded-full bg-[#1C1C19] hover:bg-[#D4BD7D] text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="En savoir plus"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 02 : Blanc ivoire haute couture */}
            <div className="lg:col-span-5 rounded-[26px] bg-[#F4F3EF] text-[#0D0D0C] p-7 sm:p-8 flex flex-col justify-between space-y-8 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-neutral-500">02</span>
                <span className="px-3 py-1 rounded-full bg-[#0D0D0C] text-[#F4F3EF] text-[9px] font-mono tracking-widest uppercase">
                  SUR-MESURE
                </span>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-2xl font-agrandir-extrabold text-[#0D0D0C] uppercase">
                  EXPÉRIENCES EXCLUSIVES
                </h3>
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                  Vivez des moments uniques réservés aux membres : balances privées, salons d’artistes, dîners exclusifs et rencontres en coulisses.
                </p>
              </div>

              <div className="pt-4 border-t border-black/10 flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase">
                  CONCIERGERIE PRIVÉE
                </span>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  className="w-8 h-8 rounded-full bg-[#0D0D0C] hover:bg-[#D4BD7D] text-white hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                  aria-label="Contacter la conciergerie"
                >
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

          {/* Rangée du bas : 3 colonnes égales (03, 04, 05) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-left">

            {/* Card 03 */}
            <div className="rounded-[26px] bg-[#11110F] border border-white/10 p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#8E8C84]">03</span>
                  <Ticket className="w-4 h-4 text-[#D4BD7D]" />
                </div>
                <h3 className="text-xl font-agrandir-extrabold text-white uppercase">
                  COLLECTION CONCERTS
                </h3>
                <p className="text-xs text-[#9A9890] font-light leading-relaxed">
                  Vos billets officiels, invitations et accès spéciaux réunis dans votre coffre personnel.
                </p>
              </div>

              <div className="space-y-2">
                <div className="rounded-xl bg-[#181815] border border-white/10 px-3.5 py-2.5 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-white">Soirée Inaugurale 2026</span>
                  <span className="text-[#D4BD7D]">CONFIRMÉ</span>
                </div>
                <div className="rounded-xl bg-[#181815] border border-white/10 px-3.5 py-2.5 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-white">Session Privée VIP</span>
                  <span className="text-[#D4BD7D]">INCLUS</span>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-widest text-[#8E8C84] uppercase">
                  ESPACE INTERACTIF
                </span>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  className="w-7 h-7 rounded-full bg-[#1C1C19] text-white flex items-center justify-center hover:bg-[#D4BD7D] hover:text-black transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 04 */}
            <div className="rounded-[26px] bg-[#11110F] border border-white/10 p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#8E8C84]">04</span>
                  <div className="w-6 h-6 rounded-md bg-[#D4BD7D] text-black flex items-center justify-center">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                </div>
                <h3 className="text-xl font-agrandir-extrabold text-white uppercase">
                  CARTE NOIRE DIGITALE
                </h3>
                <p className="text-xs text-[#9A9890] font-light leading-relaxed">
                  Votre carte de membre sur votre téléphone pour entrer aux soirées et régler aux bars sans attente.
                </p>
              </div>

              <div className="rounded-xl bg-[#181815] border border-white/10 px-4 py-3 flex items-center justify-between text-xs font-mono">
                <span className="text-white font-bold">PORTEFEUILLE ACTIF</span>
                <span className="text-[#D4BD7D]">+5 000 F</span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-widest text-[#8E8C84] uppercase">
                  PAIEMENT INSTANTANÉ
                </span>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  className="w-7 h-7 rounded-full bg-[#1C1C19] text-white flex items-center justify-center hover:bg-[#D4BD7D] hover:text-black transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Card 05 */}
            <div className="rounded-[26px] bg-[#11110F] border border-white/10 p-7 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-[#8E8C84]">05</span>
                  <Crown className="w-4 h-4 text-[#D4BD7D]" />
                </div>
                <h3 className="text-xl font-agrandir-extrabold text-white uppercase">
                  PRIVILÈGES MEMBRES
                </h3>
                <p className="text-xs text-[#9A9890] font-light leading-relaxed">
                  Avantages réservés : consommations offertes en salon VIP, vestiaire privé et accueil pour votre invité.
                </p>
              </div>

              <div className="rounded-xl bg-[#181815] border border-white/10 px-4 py-3 flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#8E8C84]">PARTENAIRES</span>
                <span className="text-[#D4BD7D] font-bold">SALONS & CLUBS</span>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-[9px] font-mono tracking-widest text-[#8E8C84] uppercase">
                  RÉSEAU EXCLUSIF
                </span>
                <button
                  type="button"
                  onClick={() => openAdmissionWizard(plans[0])}
                  className="w-7 h-7 rounded-full bg-[#1C1C19] text-white flex items-center justify-center hover:bg-[#D4BD7D] hover:text-black transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. BANNIÈRE PLEINE LARGEUR — "AU PLUS PRÈS DE LA MUSIQUE"                 */}
      {/* ========================================================================= */}
      <section className="relative py-28 sm:py-36 overflow-hidden text-center">
        <div className="absolute inset-0 z-0">
          <img
            src={concertStageImg}
            alt="Scène live LUMARÉEL"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover brightness-[0.42]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080807] via-black/45 to-[#080807]" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto px-5 sm:px-8 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/70 border border-white/15 text-[9px] font-mono tracking-[0.2em] text-[#D4BD7D] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#D4BD7D]" />
            <span>CULTURE LIVE</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-agrandir-extrabold uppercase text-white leading-[1.04]">
            AU PLUS PRÈS DE LA MUSIQUE. <br />
            AU PLUS PRÈS DE L’EXPÉRIENCE.
          </h2>

          <p className="text-xs sm:text-sm text-[#C7C4BA] font-light leading-relaxed max-w-lg mx-auto">
            Votre passion pour la scène mérite un cadre extraordinaire. Vivez chaque concert depuis les loges privées et les meilleurs emplacements.
          </p>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="px-7 py-3.5 rounded-full bg-[#D4BD7D] hover:bg-[#E2CD92] text-[#0A0A09] font-agrandir-extrabold text-[11px] tracking-[0.12em] uppercase inline-flex items-center gap-2 transition-colors cursor-pointer shadow-xl"
            >
              <span>EXPLORER LES EXPÉRIENCES MEMBRES</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SECTION "VOTRE NOUVEAU CHAPITRE COMMENCE ICI."                         */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24 text-center">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-8">

          <div className="max-w-xl mx-auto space-y-3">
            <div className="text-[10px] font-mono tracking-[0.22em] text-[#9E9B90] uppercase">
              ADMISSION PRIVÉE
            </div>
            <h2 className="text-3xl sm:text-[44px] font-agrandir-extrabold uppercase text-white leading-[1.04]">
              VOTRE NOUVEAU CHAPITRE COMMENCE ICI.
            </h2>
            <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed">
              Découvrez la LUMARÉEL Black Card et demandez votre admission à une expérience réservée autour de la musique et de l’exception.
            </p>
          </div>

          {/* Carte centrale Black Card Protocol */}
          <div className="max-w-[440px] mx-auto rounded-[24px] bg-gradient-to-br from-[#191916] via-[#10100E] to-[#0B0B0A] border border-white/15 p-7 sm:p-8 text-left space-y-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="font-agrandir-extrabold text-base tracking-wider text-white uppercase">
                  LUMARÉEL
                </span>
                <span className="text-[9px] font-mono text-[#8E8C84] uppercase tracking-widest">
                  SUR INVITATION
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-[#D4BD7D]" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-[8px] font-mono text-[#8E8C84] uppercase tracking-widest">
                  NIVEAU D’ACCÈS
                </div>
                <div className="text-lg font-agrandir-extrabold text-white uppercase mt-0.5">
                  PROTOCOLE BLACK CARD
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#D4BD7D] uppercase tracking-wider">
                OUVERT · ACTIF
              </span>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
              <span className="text-[#9A9890] uppercase">
                COTISATION : <strong className="text-white">150 000 FCFA / AN</strong>
              </span>
              <span className="text-[#D4BD7D] uppercase tabular-nums">
                {remaining} / {quota} PLACES
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="px-9 py-3.5 rounded-full bg-[#D4BD7D] hover:bg-[#E2CD92] text-[#0A0A09] font-agrandir-extrabold text-[11px] tracking-[0.14em] uppercase transition-colors cursor-pointer shadow-lg"
            >
              DEMANDER MON ADMISSION
            </button>
            <div className="text-[9px] font-mono text-[#7C7A72] uppercase tracking-[0.18em]">
              ADMISSION SUR DOSSIER · TRAITEMENT CONFIDENTIEL
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SECTION "ADMISSION EN TROIS ÉTAPES"                                    */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-8 text-left">

          <div className="space-y-2">
            <div className="text-[10px] font-mono tracking-[0.22em] text-[#9E9B90] uppercase">
              LE PARCOURS
            </div>
            <h2 className="text-3xl sm:text-[42px] font-agrandir-extrabold uppercase text-white leading-none">
              ADMISSION EN TROIS ÉTAPES
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                num: '01',
                title: 'DÉCOUVRIR',
                desc: 'Explorez l’univers LUMARÉEL Black Card, les accès prioritaires aux concerts et notre réseau d’hospitalité privé.',
              },
              {
                num: '02',
                title: 'CANDIDATER',
                desc: 'Complétez votre demande d’admission confidentielle en moins de 2 minutes avec vos coordonnées de livraison.',
              },
              {
                num: '03',
                title: 'RECEVOIR VOTRE CARTE',
                desc: 'Activez votre accès membre immédiat et recevez votre carte noire gravée sous écrin par coursier privé.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="rounded-[24px] bg-[#11110F] border border-white/10 p-7 space-y-4"
              >
                <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#D4BD7D]/15 border border-[#D4BD7D]/30 text-[11px] font-mono font-bold text-[#D4BD7D]">
                  {step.num}
                </div>
                <h3 className="text-lg font-agrandir-extrabold text-white uppercase">
                  {step.title}
                </h3>
                <p className="text-xs text-[#9A9890] font-light leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. SECTION FINALE — CARTE INCLINÉE + "VOTRE EXPÉRIENCE MÉRITE..."        */}
      {/* ========================================================================= */}
      <section className="py-20 sm:py-28 text-center">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 space-y-7">

          {/* Miniature inclinée exacte comme sur la maquette */}
          <div className="flex justify-center">
            <div className="w-52 h-32 rounded-[16px] bg-gradient-to-br from-[#24231E] via-[#131311] to-[#080807] border border-[#D4BD7D]/45 p-4 -rotate-12 shadow-[0_25px_60px_rgba(0,0,0,0.9)] flex flex-col justify-between text-left">
              <div className="flex items-center justify-between">
                <span className="font-agrandir-extrabold text-xs tracking-wider text-white uppercase">
                  LUMARÉEL
                </span>
                <Crown className="w-3.5 h-3.5 text-[#D4BD7D]" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-mono text-[#D4BD7D] uppercase">BLACK CARD</span>
                <span className="text-[9px] font-mono text-[#9A9890]">11/27</span>
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <h2 className="text-3xl sm:text-5xl font-agrandir-extrabold uppercase text-white leading-[1.03]">
              VOTRE EXPÉRIENCE <br />
              MÉRITE CE QU’IL Y A DE MIEUX.
            </h2>
            <p className="text-xs sm:text-sm text-[#9A9890] font-light leading-relaxed max-w-md mx-auto">
              Découvrez la LUMARÉEL Black Card. Un accès sans compromis à la scène musicale de notre époque.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => openAdmissionWizard(plans[0])}
              className="px-7 py-3.5 rounded-full bg-[#D4BD7D] hover:bg-[#E2CD92] text-[#0A0A09] font-agrandir-extrabold text-[11px] tracking-[0.12em] uppercase transition-colors cursor-pointer"
            >
              DEMANDER MON ADMISSION
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('privileges-section')}
              className="px-7 py-3.5 rounded-full bg-[#151513] hover:bg-[#1E1E1B] border border-white/15 text-white font-agrandir-bold text-[11px] tracking-[0.12em] uppercase transition-colors cursor-pointer"
            >
              EXPLORER L'EXPÉRIENCE
            </button>
          </div>

          <div className="text-[9px] font-mono text-[#7C7A72] uppercase tracking-[0.18em]">
            ADHÉSION SOUMISE À VALIDATION · SÉRIE LIMITÉE MONDIALE
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. PIED DE PAGE ÉDITORIAL DE LA MAQUETTE                                  */}
      {/* ========================================================================= */}
      <footer className="border-t border-white/10 py-14 bg-[#070706] text-left">
        <div className="max-w-[1140px] mx-auto px-5 sm:px-8 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-[#D4BD7D]" />
                <span className="font-agrandir-extrabold text-sm tracking-widest text-white uppercase">
                  LUMARÉEL BLACK CARD
                </span>
              </div>
              <p className="text-xs text-[#8E8C84] font-light leading-relaxed max-w-xs">
                La carte de membres dédiée à la musique et au divertissement, reliant les cultures, les scènes et l’hospitalité d’exception.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-mono tracking-widest text-white uppercase mb-3">
                À PROPOS
              </div>
              <button type="button" onClick={() => scrollToSection('privileges-section')} className="block text-[#8E8C84] hover:text-white cursor-pointer">
                Privilèges
              </button>
              <button type="button" onClick={() => openAdmissionWizard(plans[0])} className="block text-[#8E8C84] hover:text-white cursor-pointer">
                L’Expérience
              </button>
              <button type="button" onClick={() => setCurrentPage('home')} className="block text-[#8E8C84] hover:text-white cursor-pointer">
                Concerts Live
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-mono tracking-widest text-white uppercase mb-3">
                ADHÉSION
              </div>
              <button type="button" onClick={() => openAdmissionWizard(plans[0])} className="block text-[#8E8C84] hover:text-white cursor-pointer">
                Protocole Black Card
              </button>
              <button type="button" onClick={() => openAdmissionWizard(plans[0])} className="block text-[#8E8C84] hover:text-white cursor-pointer">
                Demande d'Admission
              </button>
              {hasActiveCard && onGoToWallet && (
                <button type="button" onClick={onGoToWallet} className="block text-[#D4BD7D] hover:underline cursor-pointer">
                  Mon Portefeuille
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-mono tracking-widest text-white uppercase mb-3">
                CONCIERGERIE
              </div>
              <div className="text-[#8E8C84]">Accueil VIP 24/7</div>
              <div className="text-[#8E8C84]">Salons & Loges</div>
              <div className="text-[#8E8C84]">Abidjan · Paris</div>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-[9px] font-mono text-[#7C7A72] uppercase tracking-[0.18em]">
            <span>© 2026 LUMARÉEL CO. TOUS DROITS RÉSERVÉS.</span>
            <span className="text-[#D4BD7D]">CERCLE OFFICIEL · MEMBRES FONDATEURS</span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 10. PROCESSUS D'INSCRIPTION FLUIDE EN PLUSIEURS ÉTAPES (MODALE WIZARD)    */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isWizardOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-xl rounded-[28px] bg-[#10100E] border border-[#D4BD7D]/35 p-6 sm:p-8 shadow-2xl my-8 text-left"
            >
              {/* En-tête du dossier */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#D4BD7D]">
                    DOSSIER D'ADMISSION · ÉTAPE {wizardStep} / 5
                  </span>
                  <h3 className="font-agrandir-extrabold text-lg text-white uppercase mt-0.5">
                    LUMARÉEL Black Card
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="w-8 h-8 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Barre de progression */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      wizardStep >= s ? 'bg-[#D4BD7D]' : 'bg-white/10'
                    }`}
                  />
                ))}
              </div>

              {/* Étape 1 : Personnalisation de la gravure */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      1. Personnalisation de votre Gravure
                    </h4>
                    <p className="text-xs text-[#9A9890] font-light mt-1">
                      Votre nom sera gravé en lettres dorées sur votre Black Card physique.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
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
                      className="w-full px-4 py-3 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white font-mono text-sm uppercase tracking-wider outline-hidden"
                    />
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-[#D4BD7D]/35 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-agrandir-bold text-[#D4BD7D] uppercase tracking-wider block">
                        Formule Sélectionnée
                      </span>
                      <strong className="text-sm font-agrandir-bold text-white uppercase">
                        {selectedPlan?.name || 'Founders Edition (12 mois)'}
                      </strong>
                      <p className="text-[11px] text-[#9A9890] font-light">
                        Carte physique gravée + Coupe-file + Salons VIP + Portefeuille
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-lg font-agrandir-extrabold text-[#D4BD7D] font-mono tabular-nums">
                        150 000 FCFA
                      </div>
                      <span className="text-[9px] text-[#8E8C84] uppercase">Valable 1 an</span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={!applicantName.trim()}
                      onClick={() => setWizardStep(2)}
                      className="px-6 py-3 rounded-full bg-[#D4BD7D] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40"
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
                      2. Coordonnées & Livraison du Coffret
                    </h4>
                    <p className="text-xs text-[#9A9890] font-light mt-1">
                      Votre accès digital est rattaché à votre e-mail. Votre coffret physique sera expédié à cette adresse.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Adresse e-mail *
                      </label>
                      <input
                        type="email"
                        value={applicantEmail}
                        onChange={(e) => setApplicantEmail(e.target.value)}
                        placeholder="votre.email@domaine.com"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white text-xs outline-hidden"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Téléphone Mobile *
                      </label>
                      <input
                        type="tel"
                        value={applicantPhone}
                        onChange={(e) => setApplicantPhone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white text-xs outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Ville *
                      </label>
                      <input
                        type="text"
                        value={applicantCity}
                        onChange={(e) => setApplicantCity(e.target.value)}
                        placeholder="Abidjan"
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white text-xs outline-hidden"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                        Quartier / Adresse de remise *
                      </label>
                      <input
                        type="text"
                        value={applicantAddress}
                        onChange={(e) => setApplicantAddress(e.target.value)}
                        placeholder="Cocody, Zone 4, Plateau..."
                        className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white text-xs outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="text-xs text-[#9A9890] hover:text-white cursor-pointer"
                    >
                      Retour
                    </button>

                    <button
                      type="button"
                      disabled={!applicantEmail.trim() || !applicantPhone.trim()}
                      onClick={() => setWizardStep(3)}
                      className="px-6 py-3 rounded-full bg-[#D4BD7D] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <span>Préférences Membre</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 3 : Préférences & Parrainage */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      3. Préférences Musicales & Parrainage
                    </h4>
                    <p className="text-xs text-[#9A9890] font-light mt-1">
                      Permettez à notre conciergerie d’adapter vos invitations privées.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                      Univers musical de prédilection
                    </label>
                    <select
                      value={musicInterest}
                      onChange={(e) => setMusicInterest(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white text-xs outline-hidden cursor-pointer"
                    >
                      <option value="Afrobeats & Live Acoustic">Afrobeats, Amapiano & Live Acoustique</option>
                      <option value="Jazz, Soul & R&B">Jazz, Soul & Soirées R&B Privées</option>
                      <option value="Grands Concerts & Festivals">Grands Concerts & Événements Festifs</option>
                      <option value="Loges VIP & Dégustations">Loges VIP & Expériences Privées</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-mono uppercase tracking-wider text-neutral-300 block">
                      Code d'invitation ou de parrainage (Optionnel)
                    </label>
                    <input
                      type="text"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      placeholder="EX : BLACK-VIP-2026"
                      className="w-full px-4 py-2.5 rounded-xl bg-black border border-white/20 focus:border-[#D4BD7D] text-white font-mono text-xs uppercase tracking-wider outline-hidden"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="text-xs text-[#9A9890] hover:text-white cursor-pointer"
                    >
                      Retour
                    </button>

                    <button
                      type="button"
                      onClick={() => setWizardStep(4)}
                      className="px-6 py-3 rounded-full bg-[#D4BD7D] text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                    >
                      <span>Règlement Sécurisé</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Étape 4 : Règlement */}
              {wizardStep === 4 && (
                <form onSubmit={handleCompleteAdmission} className="space-y-5">
                  <div>
                    <h4 className="text-base font-agrandir-bold text-white uppercase">
                      4. Règlement & Attribution de la Carte
                    </h4>
                    <p className="text-xs text-[#9A9890] font-light mt-1">
                      Sélectionnez votre mode de paiement pour activer immédiatement votre adhésion.
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
                        className={`p-3.5 rounded-2xl border text-left transition-colors cursor-pointer ${
                          paymentMethod === m.id
                            ? 'bg-[#D4BD7D]/15 border-[#D4BD7D] text-white'
                            : 'bg-white/5 border-white/10 text-[#9A9890] hover:border-white/25'
                        }`}
                      >
                        <div className="font-agrandir-bold text-xs text-white uppercase">{m.label}</div>
                        <div className="text-[10px] text-[#8E8C84] font-mono mt-0.5">{m.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-white/15 space-y-2 text-xs">
                    <div className="flex justify-between text-[#9A9890]">
                      <span>Adhésion LUMARÉEL Black Card (1 an)</span>
                      <span className="font-mono text-white tabular-nums">150 000 FCFA</span>
                    </div>
                    <div className="flex justify-between text-[#9A9890]">
                      <span>Carte physique gravée & coffret scellé</span>
                      <span className="text-white font-mono">Inclus</span>
                    </div>
                    <div className="flex justify-between text-[#9A9890]">
                      <span>Crédit de bienvenue sur portefeuille</span>
                      <span className="text-[#D4BD7D] font-mono tabular-nums">+5 000 FCFA offerts</span>
                    </div>
                    <div className="border-t border-white/10 pt-2 flex justify-between font-agrandir-extrabold text-sm text-white">
                      <span>Total à régler</span>
                      <span className="text-[#D4BD7D] font-mono tabular-nums">150 000 FCFA</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(3)}
                      className="text-xs text-[#9A9890] hover:text-white cursor-pointer"
                    >
                      Retour
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3.5 rounded-full bg-[#D4BD7D] hover:bg-[#E2CD92] text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer disabled:opacity-50"
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
                  <div className="w-14 h-14 rounded-full border border-[#D4BD7D] bg-[#D4BD7D]/15 text-[#D4BD7D] flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-mono tracking-widest text-[#D4BD7D] uppercase">
                      ADMISSION CONFIRMÉE
                    </span>
                    <h3 className="text-2xl font-agrandir-extrabold uppercase text-white">
                      BIENVENUE DANS LA BLACK CARD
                    </h3>
                    <p className="text-xs text-[#9A9890] font-light max-w-md mx-auto">
                      Votre identifiant permanent officiel est <strong>{issuedResult.card.cardNumber}</strong>. Votre portefeuille est crédité de 5 000 FCFA de bienvenue.
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-black border border-[#D4BD7D]/40 max-w-md mx-auto text-left space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#9A9890]">Titulaire</span>
                      <strong className="text-white uppercase font-mono">{issuedResult.card.cardholderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9A9890]">Numéro de carte</span>
                      <strong className="text-[#D4BD7D] font-mono tabular-nums">{issuedResult.card.cardNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#9A9890]">Coffret physique</span>
                      <span className="text-[#D4BD7D] font-mono">En préparation sous écrin</span>
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
                      className="px-8 py-3.5 rounded-full bg-[#D4BD7D] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer hover:bg-white transition-colors"
                    >
                      Accéder à mon Portefeuille & Ma Carte
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
