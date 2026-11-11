import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MembershipEdition, MembershipPlan, MembershipCard } from '../types';
import {
  ShieldCheck,
  Sparkles,
  CreditCard,
  QrCode,
  Radio,
  Lock,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
  Flame,
  Award,
  Crown,
  Zap,
  Users,
  Clock,
  Download,
  Share2,
  ExternalLink,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DigitalMembershipCard } from './DigitalMembershipCard';

export const LumareelCardView: React.FC = () => {
  const { currentUser, setCurrentPage, setIsAuthModalOpen, showToast, language, t } = useApp();

  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [userCard, setUserCard] = useState<MembershipCard | null>(null);
  const [cardQrDataUrl, setCardQrDataUrl] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<MembershipCard | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal d'adhésion
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [buyerName, setBuyerName] = useState(currentUser?.name || '');
  const [buyerEmail, setBuyerEmail] = useState(currentUser?.email || '');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state after purchase
  const [issuedCard, setIssuedCard] = useState<{ card: MembershipCard; qrDataUrl: string } | null>(null);

  useEffect(() => {
    fetchEditionAndPlans();
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

      // Check if current user already has a card
      let hasActiveCard = false;
      if (currentUser?.email) {
        const cardRes = await fetch(`/api/membership/my-card?email=${encodeURIComponent(currentUser.email)}`);
        const cardData = await cardRes.json();
        if (cardData.success && cardData.hasCard && cardData.card) {
          setUserCard(cardData.card);
          setCardQrDataUrl(cardData.qrDataUrl || null);
          hasActiveCard = true;
        }
      }

      // If user doesn't have an active card, fetch the official preview card & QR
      if (!hasActiveCard) {
        const previewRes = await fetch('/api/membership/preview-card');
        const previewData = await previewRes.json();
        if (previewData.success) {
          setPreviewCard(previewData.card);
          setCardQrDataUrl(previewData.qrDataUrl);
        }
      }
    } catch (err) {
      console.error('Error fetching membership edition:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCheckout = (plan: MembershipPlan) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast('Veuillez vous connecter pour souscrire à la LUMARÉEL CARD.', 'info');
      return;
    }
    setSelectedPlan(plan);
    setBuyerName(currentUser.name || '');
    setBuyerEmail(currentUser.email || '');
    setIsCheckoutOpen(true);
  };

  const handleConfirmMembershipOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!buyerName.trim() || !buyerEmail.trim()) {
      showToast('Veuillez renseigner votre nom complet et votre e-mail.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/membership/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          customerName: buyerName.trim(),
          customerEmail: buyerEmail.trim(),
          customerPhone: buyerPhone.trim(),
          paymentProvider: 'geniuspay',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de souscription à l’adhésion.');
      }

      setIssuedCard({ card: data.card, qrDataUrl: data.qrDataUrl });
      setUserCard(data.card);
      setIsCheckoutOpen(false);
      showToast(data.message || 'LUMARÉEL CARD activée avec succès !', 'success');
      fetchEditionAndPlans();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la commande.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quota = edition?.quota || 100;
  const allocated = edition?.allocatedCount || 0;
  const remaining = Math.max(0, quota - allocated);
  const isSoldOut = remaining === 0 || edition?.status === 'sold_out';

  return (
    <div className="min-h-screen bg-black text-[#EFEFEF] font-agrandir-regular pb-32 pt-6 sm:pt-10">
      
      {/* Navigation Top Return Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mb-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-agrandir-bold tracking-wider text-white transition-all cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 text-[#d4af37] group-hover:-translate-x-1 transition-transform" />
          <span>RETOUR À L'ACCUEIL</span>
        </button>

        {userCard && (
          <button
            type="button"
            onClick={() => setCurrentPage('client_space')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4af37]/15 hover:bg-[#d4af37]/25 border border-[#d4af37]/40 text-xs font-agrandir-bold text-[#d4af37] transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>ACCÉDER À MON ESPACE MEMBRE</span>
          </button>
        )}
      </div>

      {/* Hero Section : LUMARÉEL CARD */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 pt-4 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* Col Gauche : Texte & Positionnement Prestigieux */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/30 text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              <Crown className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>MEMBERSHIP PRIVILÉGIÉ · ÉDITION 2026-2027</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-agrandir-extrabold uppercase tracking-tight text-white leading-none">
              LUMARÉEL <span className="text-[#d4af37]">CARD</span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-light max-w-xl">
              Plus qu’une adhésion, une identité permanente. Réservée à 100 membres d’élite, la <strong>LUMARÉEL FOUNDERS EDITION</strong> ouvre un accès sans précédent à nos productions immersives, salons VIP, préventes privées et coulisses acoustiques.
            </p>

            {/* Quota Tracker Live */}
            <div className="p-4 sm:p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3 max-w-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="font-agrandir-bold uppercase tracking-wider text-[#888]">
                  Quota Founders Edition
                </span>
                <span className="font-mono font-bold text-[#d4af37] text-sm">
                  {isSoldOut ? 'COMPLET (100 / 100)' : `${allocated} / ${quota} ATTRIBUÉES`}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#d4af37] to-amber-200 rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, (allocated / quota) * 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Série numérotée LMR-2026-0001 à LMR-2026-0100</span>
                </span>
                <span className="font-bold text-white">
                  {remaining} {remaining > 1 ? 'places disponibles' : 'place disponible'}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex flex-wrap items-center gap-4">
              {userCard ? (
                <button
                  type="button"
                  onClick={() => setCurrentPage('client_space')}
                  className="px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Voir ma carte active ({userCard.cardNumber})</span>
                </button>
              ) : isSoldOut ? (
                <button
                  disabled
                  className="px-8 py-3.5 rounded-full bg-neutral-800 text-neutral-500 font-agrandir-extrabold text-xs tracking-wider uppercase cursor-not-allowed border border-white/5"
                >
                  Édition complète · Inscriptions closes
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => plans[0] && handleOpenCheckout(plans[0])}
                  className="px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_25px_rgba(212,175,55,0.35)] transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
                >
                  <span>Rejoindre la Founders Edition</span>
                  <ArrowRight className="w-4 h-4 text-black" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('benefits-section');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-6 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-agrandir-semibold text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                Explorer les privilèges
              </button>
            </div>
          </div>

          {/* Col Droite : Rendu 3D Visuel Haut de Gamme de la Carte (Nouvelle Conception CR-80) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{userCard ? 'Votre Carte Officielle Activée' : 'Nouvelle Conception CR-80 (Format Officiel)'}</span>
            </div>

            <DigitalMembershipCard
              card={
                userCard ||
                previewCard || {
                  id: 'crd_preview_founders',
                  userId: currentUser?.id || 'usr_preview',
                  planId: 'plan_founders_annual',
                  editionId: 'ed_founders_2026',
                  cardNumber: 'LMR-2026-0001',
                  cardSequence: 1,
                  cardholderName: currentUser?.name || 'DYLAN BIENAO',
                  cardholderEmail: currentUser?.email || 'bienaodylan428@gmail.com',
                  cardStatus: 'active',
                  issuedAt: '2026-11-10T14:09:37.496Z',
                  validFrom: '2026-11-10T14:09:37.496Z',
                  expiresAt: '2027-11-11T14:09:37.496Z',
                  physicalCardStatus: 'in_production',
                  chipUid: '04:A2:8F:12:9C:5E:80',
                  chipType: 'NXP_DESFire_EV3',
                  createdAt: '2026-11-10T14:09:37.496Z',
                  updatedAt: '2026-11-10T14:09:37.496Z',
                }
              }
            />

            <div className="mt-4 flex items-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>Format standardisé bancaire CR-80 (85.6 × 53.98 mm) · Puce cryptographique sans contact NXP DESFire EV3</span>
            </div>
          </div>

        </div>
      </section>

      {/* Section 2 : Les 8 Piliers de Privilèges */}
      <section id="benefits-section" className="max-w-7xl mx-auto px-4 sm:px-8 pt-16 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <span className="text-[10px] font-agrandir-bold tracking-[0.25em] text-[#d4af37] uppercase">
            PRIVILÈGES DES MEMBRES
          </span>
          <h2 className="text-3xl sm:text-4xl font-agrandir-extrabold uppercase text-white">
            UN ÉCOSYSTÈME CONÇU POUR L'EXCEPTION
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 font-light">
            Chaque droit est authentifié en temps réel par passage sans contact sur nos terminaux de contrôle aux entrées et salons VIP.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              icon: Zap,
              title: 'Préventes Privées',
              desc: 'Accès exclusif aux billetteries 48 heures avant l’ouverture générale pour garantir vos places aux meilleures catégories.',
            },
            {
              icon: Award,
              title: 'Coupe-File Permanent',
              desc: 'Voie d’accès prioritaire réservée à l’entrée de chaque concert officiel LUMARÉEL pour le membre et son accompagnant.',
            },
            {
              icon: Crown,
              title: 'Accès Salons VIP',
              desc: 'Entrée dédiée dans les espaces réservés, bars privatifs et zones lounge tout au long de la soirée.',
            },
            {
              icon: Sparkles,
              title: 'Expériences Artistes',
              desc: 'Invitations sélectionnées aux balances acoustiques privées, sessions d’écoute en avant-première et rencontres scéniques.',
            },
            {
              icon: CreditCard,
              title: 'Tarif Préférentiel (-15%)',
              desc: 'Réduction appliquée automatiquement sur vos réservations de tickets de concert tout au long de votre année d’adhésion.',
            },
            {
              icon: Radio,
              title: 'Puce Sans Contact Haute Sécurité',
              desc: 'Authentification matérielle instantanée par effleurement sans contact NFC / RFID (13.56 MHz) aux portillons des concerts et salons VIP.',
            },
            {
              icon: Layers,
              title: 'Coffret Physique Collector',
              desc: 'Carte physique noire mate haut de gamme avec microprocesseur doré EMV brossé et antenne d\'induction sans contact intégrée.',
            },
            {
              icon: Users,
              title: 'Surprises & Privilèges Partenaires',
              desc: 'Offres exclusives et invitations surprises chez les partenaires culturels et hôteliers de AREEL GROUPE.',
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#0c0c0c] border border-white/10 hover:border-[#d4af37]/40 transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 group-hover:bg-[#d4af37]/15 group-hover:border-[#d4af37]/40 flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5 text-white group-hover:text-[#d4af37] transition-colors" />
                  </div>
                  <h3 className="font-agrandir-bold text-sm text-white uppercase tracking-wide">
                    {item.title}
                  </h3>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3 : Formule Founders Edition & Souscription */}
      <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-20">
        <div className="p-8 sm:p-10 rounded-3xl bg-gradient-to-b from-[#141414] to-[#080808] border border-[#d4af37]/40 shadow-2xl space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
                FORMULE OFFICIELLE
              </span>
              <h3 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white mt-1">
                LUMARÉEL FOUNDERS CARD
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Durée : 12 mois complets dès activation · Renouvellement prioritaire
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-3xl sm:text-4xl font-mono font-bold text-white tracking-tight">
                {selectedPlan?.price.toLocaleString('fr-FR') || '150 000'} <span className="text-lg text-[#d4af37]">{selectedPlan?.currency || 'FCFA'}</span>
              </div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-widest mt-0.5">
                Facturation annuelle unique
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {[
              'Carte physique PVC noire mate personnalisée incluse',
              'Puce cryptographique matérielle inviolable NXP DESFire EV3',
              'Numéro permanent unique LMR-2026-XXXX garanti',
              'File prioritaire garantie sur tous les événements',
              'Accès Salon VIP & Espaces Membres réservés',
              'Préventes privées 48h avant le public',
              'Réduction permanente de 15% sur les billets',
              'Support dédié et conciergerie billetterie',
            ].map((feat, i) => (
              <div key={i} className="flex items-center gap-2.5 text-neutral-200">
                <CheckCircle2 className="w-4 h-4 text-[#d4af37] shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-neutral-400">
              Paiement sécurisé par Wave, Orange Money, MTN MoMo, Carte bancaire ou Djamo.
            </div>

            {userCard ? (
              <button
                type="button"
                onClick={() => setCurrentPage('client_space')}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer"
              >
                Gérer mon adhésion
              </button>
            ) : isSoldOut ? (
              <button
                disabled
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-neutral-800 text-neutral-500 font-agrandir-extrabold text-xs tracking-wider uppercase cursor-not-allowed"
              >
                Complet (100 / 100)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => plans[0] && handleOpenCheckout(plans[0])}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all cursor-pointer hover:scale-[1.02]"
              >
                <span>Souscrire maintenant</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Modal Tunnel d'Adhésion */}
      <AnimatePresence>
        {isCheckoutOpen && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-lg bg-[#0e0e0e] border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <div className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                    ADHÉSION OFFICIELLE
                  </div>
                  <h3 className="text-xl font-agrandir-extrabold text-white uppercase">
                    LUMARÉEL FOUNDERS CARD
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Récapitulatif commande */}
              <div className="p-4 rounded-2xl bg-[#161616] border border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-center text-neutral-300">
                  <span>Édition :</span>
                  <strong className="text-white">Founders Edition (Limitée à 100)</strong>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span>Validité :</span>
                  <span className="text-white">12 mois complets dès activation</span>
                </div>
                <div className="flex justify-between items-center text-neutral-300">
                  <span>Format :</span>
                  <span className="text-white">Carte physique PVC personnalisée + Digitale</span>
                </div>
                <div className="border-t border-white/10 pt-2 flex justify-between items-center text-sm">
                  <span className="font-agrandir-bold uppercase text-white">Montant Total</span>
                  <span className="font-mono font-bold text-[#d4af37]">
                    {selectedPlan.price.toLocaleString('fr-FR')} {selectedPlan.currency}
                  </span>
                </div>
              </div>

              {/* Formulaire Nominatif */}
              <form onSubmit={handleConfirmMembershipOrder} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                    Nom et Prénom du titulaire (Gravé sur la carte) *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ex : Dylan Bienao"
                    className="w-full bg-[#181818] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                    Adresse e-mail pour l'envoi de la carte numérique *
                  </label>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="nom@exemple.com"
                    className="w-full bg-[#181818] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase text-[#888] mb-1 font-agrandir-semibold">
                    Numéro de téléphone mobile (Pour la livraison de la carte physique)
                  </label>
                  <input
                    type="tel"
                    value={buyerPhone}
                    onChange={(e) => setBuyerPhone(e.target.value)}
                    placeholder="+225 07 00 00 00 00"
                    className="w-full bg-[#181818] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <span>Attribution du numéro en cours...</span>
                    ) : (
                      <span>Confirmer et Activer ma carte</span>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmation Immédiate après Émission */}
      <AnimatePresence>
        {issuedCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0f0f0f] border border-[#d4af37]/40 rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-[#d4af37]" />
              </div>

              <div>
                <span className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                  FÉLICITATIONS
                </span>
                <h3 className="text-2xl font-agrandir-extrabold uppercase text-white mt-1">
                  CARTE OFFICIELLEMENT ÉMISE
                </h3>
                <p className="text-xs text-neutral-300 mt-2">
                  Votre identité permanente est enregistrée dans le registre sécurisé LUMARÉEL.
                </p>
              </div>

              {/* Identité Carte */}
              <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 space-y-3">
                <div className="text-xs text-[#888] uppercase tracking-wider">
                  Numéro Permanent Attribué
                </div>
                <div className="font-mono text-xl sm:text-2xl font-extrabold text-[#d4af37]">
                  {issuedCard.card.cardNumber}
                </div>
                <div className="text-xs text-white font-agrandir-bold">
                  {issuedCard.card.cardholderName}
                </div>

                <div className="pt-2 p-4 rounded-xl bg-black/60 border border-[#d4af37]/30 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-9 rounded-[6px] bg-gradient-to-br from-[#ffd778] via-[#d4af37] to-[#99751e] p-0.5 shadow-md flex items-center justify-center">
                    <div className="w-full h-full border border-black/40 rounded-[3px] grid grid-cols-3 gap-0.5 p-0.5 opacity-80 bg-black/20" />
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 font-bold uppercase">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Puce NXP DESFire EV3 active</span>
                  </div>
                  <div className="text-[9px] text-neutral-400 font-mono">
                    Passage sans contact activé
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIssuedCard(null);
                    setCurrentPage('client_space');
                  }}
                  className="w-full py-3.5 rounded-full bg-[#d4af37] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-lg"
                >
                  Accéder à mon espace membre
                </button>

                <button
                  type="button"
                  onClick={() => setIssuedCard(null)}
                  className="w-full py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white font-agrandir-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
