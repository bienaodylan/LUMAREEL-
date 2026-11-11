import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { MembershipCard, MembershipBenefit, MembershipEntitlement, Ticket, Order } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CreditCard,
  QrCode,
  Radio,
  Lock,
  RotateCw,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Flame,
  Award,
  Crown,
  Zap,
  Truck,
  Box,
  Share2,
  RefreshCw,
  Printer,
  X,
  AlertCircle,
  Ticket as TicketIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DigitalMembershipCard } from './DigitalMembershipCard';

interface MemberCardSectionProps {
  onOpenSubscribe?: () => void;
}

export const MemberCardSection: React.FC<MemberCardSectionProps> = ({ onOpenSubscribe }) => {
  const { currentUser, customerOrders, setCurrentPage, showToast, language } = useApp();

  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<MembershipCard | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [benefitsData, setBenefitsData] = useState<Array<{ benefit: MembershipBenefit; entitlement?: MembershipEntitlement }>>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isRotatingToken, setIsRotatingToken] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

  useEffect(() => {
    fetchMyCard();
  }, [currentUser]);

  const fetchMyCard = async () => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setCard(null); return; }
      const res = await fetch('/api/membership/my-card', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      if (data.success && data.hasCard) {
        setCard(data.card);
        setQrDataUrl(data.qrDataUrl);
        setBenefitsData(data.benefits || []);
      } else {
        setCard(null);
      }
    } catch (err) {
      console.error('Error fetching member card:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRotateQrToken = async () => {
    if (!card) return;
    try {
      setIsRotatingToken(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session utilisateur requise.');
      const res = await fetch(`/api/membership/admin/cards/${card.id}/rotate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de rotation du jeton.');
      }
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      showToast('Jeton QR régénéré avec succès. L’ancien jeton a été révoqué.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible de faire pivoter le jeton.', 'error');
    } finally {
      setIsRotatingToken(false);
    }
  };

  const handleRedeemBenefit = async (benefitId: string) => {
    if (!card) return;
    try {
      setIsRedeeming(benefitId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session utilisateur requise.');
      const res = await fetch('/api/membership/redeem-benefit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          cardId: card.id,
          benefitId,
          redeemedBy: currentUser?.name || 'Titulaire Membre',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de consommation du privilège.');
      }
      showToast(`Privilège validé ! Référence : ${data.redemption?.redemptionReference}`, 'success');
      fetchMyCard();
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la consommation.', 'error');
    } finally {
      setIsRedeeming(null);
    }
  };

  // Connected concert tickets
  const connectedTickets: Ticket[] = [];
  customerOrders.forEach((o) => {
    if (o.paymentStatus === 'completed' && o.tickets) {
      connectedTickets.push(...o.tickets);
    }
  });

  if (loading) {
    return (
      <div className="py-16 text-center text-neutral-400 space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#d4af37]" />
        <p className="text-xs">Chargement de votre identité LUMARÉEL CARD...</p>
      </div>
    );
  }

  // Si l'utilisateur n'a pas encore de carte
  if (!card) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-[#121212] via-[#090909] to-[#040404] border border-[#d4af37]/30 p-8 sm:p-12 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[#d4af37] flex items-center justify-center mx-auto shadow-xl">
          <Crown className="w-8 h-8 text-[#d4af37]" />
        </div>

        <div className="max-w-md mx-auto space-y-2">
          <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
            MEMBERSHIP PRIVILÉGIÉ
          </span>
          <h2 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white">
            VOUS N'AVEZ PAS ENCORE DE LUMARÉEL CARD
          </h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed">
            Rejoignez la <strong>Founders Edition</strong> limitée strictement à 100 membres d’élite. Accédez aux files prioritaires, salons VIP, préventes privées et recevez votre carte physique officielle gravée.
          </p>
        </div>

        <div className="pt-2 flex flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => {
              if (onOpenSubscribe) onOpenSubscribe();
              else setCurrentPage('card' as any);
            }}
            className="px-8 py-3.5 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:scale-105"
          >
            Découvrir & Souscrire (100 places max)
          </button>
        </div>
      </div>
    );
  }

  const isExpired = new Date(card.expiresAt).getTime() < Date.now();
  const effectiveStatus = isExpired ? 'expired' : card.cardStatus;

  return (
    <div className="space-y-12">
      
      {/* 1. SECTION CARTE NUMÉRIQUE & IDENTITÉ PERMANENTE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#0a0a0a] border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl">
        
        {/* Rendu 3D Officiel Recto / Verso CR-80 */}
        <div className="lg:col-span-6 flex flex-col items-center">
          <DigitalMembershipCard
            card={card}
            qrDataUrl={qrDataUrl}
            onRotateToken={handleRotateQrToken}
            isRotatingToken={isRotatingToken}
          />
        </div>

        {/* Détails du Membership & Actions Sécurité */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              DOSSIER D'ADHÉSION
            </span>
            <h2 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white mt-1">
              {card.cardNumber}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Édition : <strong>LUMARÉEL FOUNDERS EDITION</strong> (Place #{card.cardSequence} / 100)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-neutral-400 uppercase font-mono block">Date d'émission</span>
              <strong className="text-white font-mono">{new Date(card.issuedAt).toLocaleDateString('fr-FR')}</strong>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-neutral-400 uppercase font-mono block">Date d'expiration</span>
              <strong className="text-[#d4af37] font-mono">{new Date(card.expiresAt).toLocaleDateString('fr-FR')}</strong>
            </div>
          </div>

          {/* Boutons d'actions */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              type="button"
              onClick={() => setIsQrModalOpen(true)}
              className="px-5 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-black" />
              <span>Afficher QR Code d'entrée</span>
            </button>

            <button
              type="button"
              onClick={handleRotateQrToken}
              disabled={isRotatingToken}
              className="px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-neutral-300 hover:text-white font-agrandir-semibold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              title="Génère un nouveau jeton QR si vous suspectez une copie"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRotatingToken ? 'animate-spin text-[#d4af37]' : ''}`} />
              <span>Régénérer jeton de sécurité</span>
            </button>
          </div>
        </div>

      </div>

      {/* 2. SECTION : SUIVI DE MA CARTE PHYSIQUE */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
              <Box className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <h3 className="font-agrandir-extrabold text-base text-white uppercase">
                SUIVI DE LA CARTE PHYSIQUE
              </h3>
              <p className="text-xs text-neutral-400">
                Carte PVC haut de gamme gravée à chaud dans son coffret collector
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-agrandir-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            {card.physicalCardStatus === 'delivered'
              ? 'LIVRÉE'
              : card.physicalCardStatus === 'shipped'
              ? 'EXPÉDIÉE'
              : 'EN FABRICATION'}
          </span>
        </div>

        {/* Étapes du processus physique */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '1. Personnalisation & Impression PVC',
              desc: `Numéro ${card.cardNumber} et QR code haute résolution gravé.`,
              done: true,
            },
            {
              step: '2. Contrôle Qualité & Coffret',
              desc: 'Scan de conformité cryptographique et mise sous étui scellé.',
              done: card.physicalCardStatus === 'shipped' || card.physicalCardStatus === 'delivered',
            },
            {
              step: '3. Remise en Main Propre / Expédition',
              desc: card.physicalCardTrackingNumber
                ? `Suivi coursier : ${card.physicalCardTrackingNumber}`
                : 'Disponible au Guichet VIP ou livraison express Abidjan.',
              done: card.physicalCardStatus === 'delivered',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                item.done
                  ? 'bg-[#d4af37]/5 border-[#d4af37]/30 text-white'
                  : 'bg-white/5 border-white/5 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className={`w-4 h-4 ${item.done ? 'text-[#d4af37]' : 'text-neutral-600'}`} />
                <span className="font-agrandir-bold text-xs uppercase">{item.step}</span>
              </div>
              <p className="text-[11px] font-light leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SECTION : MES AVANTAGES & PRIVILÈGES CONSOMMABLES */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              CATALOGUE OFFICIEL
            </span>
            <h3 className="text-xl sm:text-2xl font-agrandir-extrabold uppercase text-white mt-0.5">
              MES AVANTAGES ACTIFS
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {benefitsData.length} privilèges associés à votre adhésion
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benefitsData.map(({ benefit, entitlement }) => {
            const used = entitlement?.usedQuantity || 0;
            const total = entitlement?.quantity || benefit.perMemberLimit;
            const remaining = Math.max(0, total - used);
            const isAvailable = remaining > 0 && effectiveStatus === 'active';

            return (
              <div
                key={benefit.id}
                className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-agrandir-bold uppercase tracking-widest text-[#d4af37] px-2 py-0.5 rounded-full bg-[#d4af37]/10 border border-[#d4af37]/20">
                      {benefit.benefitType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-[11px] font-mono text-neutral-400">
                      {remaining} / {total} disponible(s)
                    </span>
                  </div>

                  <h4 className="font-agrandir-bold text-sm text-white uppercase">
                    {benefit.name}
                  </h4>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed">
                    {benefit.description}
                  </p>
                </div>

                <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {isAvailable ? 'Prêt à l’emploi' : 'Quota utilisé'}
                  </span>

                  <button
                    type="button"
                    disabled={!isAvailable || isRedeeming === benefit.id}
                    onClick={() => handleRedeemBenefit(benefit.id)}
                    className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-[#d4af37] text-white hover:text-black font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {isRedeeming === benefit.id ? 'Validation...' : 'Réserver'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. SECTION : BILLETS DE CONCERT ASSOCIÉS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              BILLETTERIE SYNCHRONISÉE
            </span>
            <h3 className="text-xl sm:text-2xl font-agrandir-extrabold uppercase text-white mt-0.5">
              MES BILLETS DE CONCERT
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {connectedTickets.length} billet(s) actif(s)
          </span>
        </div>

        {connectedTickets.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0c0c0c] border border-white/10 text-center space-y-3">
            <TicketIcon className="w-8 h-8 text-neutral-500 mx-auto" />
            <p className="text-xs text-neutral-400">
              Vous n'avez pas encore acheté de billet de concert avec cette adresse e-mail.
            </p>
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="px-6 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-neutral-200"
            >
              Voir la programmation
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedTickets.map((t) => (
              <div key={t.id} className="p-4 rounded-2xl bg-[#0c0c0c] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#d4af37] font-mono tracking-wider uppercase">
                    {t.categoryName}
                  </span>
                  <div className="font-agrandir-bold text-sm text-white uppercase">{t.eventTitle}</div>
                  <div className="text-[11px] text-neutral-400 font-mono">{t.serialNumber}</div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[9px] font-agrandir-bold uppercase tracking-wider ${
                  t.status === 'valid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-neutral-400'
                }`}>
                  {t.status === 'valid' ? 'VALIDE' : 'UTILISÉ'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal QR Code Agrandie pour le Contrôle Vigile */}
      <AnimatePresence>
        {isQrModalOpen && qrDataUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white text-black rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 text-black flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>

              <div>
                <div className="text-[10px] font-mono tracking-widest text-[#666] uppercase">
                  LUMARÉEL CARD · IDENTITÉ MEMBRE
                </div>
                <h3 className="font-agrandir-extrabold text-xl uppercase mt-1">
                  {card.cardNumber}
                </h3>
                <div className="text-xs font-agrandir-bold text-neutral-700">
                  {card.cardholderName}
                </div>
              </div>

              <div className="p-3 border-2 border-black rounded-2xl bg-white shadow-inner">
                <img src={qrDataUrl} alt="QR Code Membre" className="w-56 h-56 mx-auto object-contain" />
              </div>

              <p className="text-[10px] text-[#666] leading-tight">
                Présentez ce QR code à l'accueil membre ou au coupe-file pour valider vos droits d'accès.
              </p>

              <div className="flex gap-2">
                <a
                  href={qrDataUrl}
                  download={`LUMAREEL_CARD_${card.cardNumber}.png`}
                  className="flex-1 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-agrandir-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger</span>
                </a>

                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-black text-white text-xs font-agrandir-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors cursor-pointer"
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
