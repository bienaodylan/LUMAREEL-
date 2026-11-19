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
  Ticket as TicketIcon,
  Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DigitalMembershipCard } from './DigitalMembershipCard';

interface MemberCardSectionProps {
  onOpenSubscribe?: () => void;
}

export const MemberCardSection: React.FC<MemberCardSectionProps> = ({ onOpenSubscribe }) => {
  const { currentUser, customerOrders, setCurrentPage, showToast, language, t } = useApp();
  const isEn = language === 'en';
  const locale = isEn ? 'en-US' : 'fr-FR';

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
      if (!session?.access_token) throw new Error(isEn ? 'User session required.' : 'Session utilisateur requise.');
      const res = await fetch(`/api/membership/admin/cards/${card.id}/rotate-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Failed to rotate token.' : 'Échec de rotation du jeton.'));
      }
      if (data.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      showToast(
        isEn
          ? 'QR token regenerated successfully. Previous token revoked.'
          : 'Jeton QR régénéré avec succès. L’ancien jeton a été révoqué.',
        'success'
      );
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Unable to rotate token.' : 'Impossible de faire pivoter le jeton.'), 'error');
    } finally {
      setIsRotatingToken(false);
    }
  };

  const handleRedeemBenefit = async (benefitId: string) => {
    if (!card) return;
    try {
      setIsRedeeming(benefitId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error(isEn ? 'User session required.' : 'Session utilisateur requise.');
      const res = await fetch('/api/membership/redeem-benefit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          cardId: card.id,
          benefitId,
          redeemedBy: currentUser?.name || (isEn ? 'Member Holder' : 'Titulaire Membre'),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || (isEn ? 'Failed to redeem perk.' : 'Échec de consommation du privilège.'));
      }
      showToast(
        isEn
          ? `Perk validated! Reference: ${data.redemption?.redemptionReference}`
          : `Privilège validé ! Référence : ${data.redemption?.redemptionReference}`,
        'success'
      );
      fetchMyCard();
    } catch (err: any) {
      showToast(err.message || (isEn ? 'Error while redeeming.' : 'Erreur lors de la consommation.'), 'error');
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
        <p className="text-xs">
          {isEn ? 'Loading your LUMARÉEL CARD identity...' : 'Chargement de votre identité LUMARÉEL CARD...'}
        </p>
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
            {isEn ? 'PRIVILEGED MEMBERSHIP' : 'MEMBERSHIP PRIVILÉGIÉ'}
          </span>
          <h2 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white">
            {isEn ? 'YOU DO NOT HAVE A LUMARÉEL CARD YET' : "VOUS N'AVEZ PAS ENCORE DE LUMARÉEL CARD"}
          </h2>
          <p className="text-xs text-neutral-400 font-light leading-relaxed">
            {isEn ? (
              <>
                Join the <strong>Founders Edition</strong> strictly limited to 100 elite members. Access priority lines, VIP lounges, private presales, and receive your engraved physical card.
              </>
            ) : (
              <>
                Rejoignez la <strong>Founders Edition</strong> limitée strictement à 100 membres d’élite. Accédez aux files prioritaires, salons VIP, préventes privées et recevez votre carte physique officielle gravée.
              </>
            )}
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
            {isEn ? 'Discover & Apply (100 seats max)' : 'Découvrir & Souscrire (100 places max)'}
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
          />
        </div>

        {/* Détails du Membership & Actions Sécurité */}
        <div className="lg:col-span-6 space-y-5">
          <div>
            <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              {isEn ? 'MEMBERSHIP DOSSIER' : "DOSSIER D'ADHÉSION"}
            </span>
            <h2 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white mt-1">
              {card.cardNumber}
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              {isEn ? (
                <>
                  Edition: <strong>LUMARÉEL FOUNDERS EDITION</strong> (Seat #{card.cardSequence} / 100)
                </>
              ) : (
                <>
                  Édition : <strong>LUMARÉEL FOUNDERS EDITION</strong> (Place #{card.cardSequence} / 100)
                </>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-neutral-400 uppercase font-mono block">
                {isEn ? 'Issued date' : "Date d'émission"}
              </span>
              <strong className="text-white font-mono">{new Date(card.issuedAt).toLocaleDateString(locale)}</strong>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <span className="text-[10px] text-neutral-400 uppercase font-mono block">
                {isEn ? 'Expiry date' : "Date d'expiration"}
              </span>
              <strong className="text-[#d4af37] font-mono">{new Date(card.expiresAt).toLocaleDateString(locale)}</strong>
            </div>
          </div>

          {/* Badges d'état sans contact */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="px-5 py-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-agrandir-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>{isEn ? 'Contactless Access Enabled' : 'Passage Sans Contact Activé'}</span>
            </div>

            <div className="px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 text-xs font-mono flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>{isEn ? 'Hardware Security Sealed' : 'Sécurité Matérielle Scellée'}</span>
            </div>
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
                {isEn ? 'PHYSICAL CARD TRACKING' : 'SUIVI DE LA CARTE PHYSIQUE'}
              </h3>
              <p className="text-xs text-neutral-400">
                {isEn
                  ? 'Engraved luxury PVC card with NXP DESFire EV3 chip in collector box'
                  : 'Carte PVC haut de gamme gravée avec puce NXP DESFire EV3 sous coffret collector'}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-[10px] font-agrandir-bold uppercase tracking-wider bg-white/10 text-white border border-white/20">
            {card.physicalCardStatus === 'delivered'
              ? isEn ? 'DELIVERED' : 'LIVRÉE'
              : card.physicalCardStatus === 'shipped'
              ? isEn ? 'SHIPPED' : 'EXPÉDIÉE'
              : isEn ? 'IN PRODUCTION' : 'EN FABRICATION'}
          </span>
        </div>

        {/* Étapes du processus physique */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: isEn ? '1. Personalization & Chip Encoding' : '1. Personnalisation & Encodage Puce',
              desc: isEn
                ? `Card ${card.cardNumber} paired with NXP DESFire EV3 contactless chip.`
                : `Numéro ${card.cardNumber} et puce sans contact NXP DESFire EV3 associée.`,
              done: true,
            },
            {
              step: isEn ? '2. Quality Check & Collector Case' : '2. Contrôle Qualité & Coffret',
              desc: isEn
                ? '13.56 MHz RF read test completed and sealed in collector box.'
                : 'Contrôle de lecture radiofréquence 13.56 MHz et mise sous écrin scellé.',
              done: card.physicalCardStatus === 'shipped' || card.physicalCardStatus === 'delivered',
            },
            {
              step: isEn ? '3. Handover / Courier Dispatch' : '3. Remise en Main Propre / Expédition',
              desc: card.physicalCardTrackingNumber
                ? `${isEn ? 'Courier tracking' : 'Suivi coursier'} : ${card.physicalCardTrackingNumber}`
                : isEn
                ? 'Available at VIP Desk or express courier in Abidjan.'
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
              {isEn ? 'OFFICIAL CATALOG' : 'CATALOGUE OFFICIEL'}
            </span>
            <h3 className="text-xl sm:text-2xl font-agrandir-extrabold uppercase text-white mt-0.5">
              {isEn ? 'MY ACTIVE PERKS' : 'MES AVANTAGES ACTIFS'}
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {isEn
              ? `${benefitsData.length} perks linked to your membership`
              : `${benefitsData.length} privilèges associés à votre adhésion`}
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
                      {remaining} / {total} {isEn ? 'available' : 'disponible(s)'}
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
                    {isAvailable
                      ? isEn ? 'Ready to use' : 'Prêt à l’emploi'
                      : isEn ? 'Quota used' : 'Quota utilisé'}
                  </span>

                  <button
                    type="button"
                    disabled={!isAvailable || isRedeeming === benefit.id}
                    onClick={() => handleRedeemBenefit(benefit.id)}
                    className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-[#d4af37] text-white hover:text-black font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {isRedeeming === benefit.id
                      ? isEn ? 'Validating...' : 'Validation...'
                      : isEn ? 'Redeem' : 'Réserver'}
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
              {isEn ? 'SYNCED TICKETING' : 'BILLETTERIE SYNCHRONISÉE'}
            </span>
            <h3 className="text-xl sm:text-2xl font-agrandir-extrabold uppercase text-white mt-0.5">
              {isEn ? 'MY CONCERT TICKETS' : 'MES BILLETS DE CONCERT'}
            </h3>
          </div>
          <span className="text-xs text-neutral-400">
            {isEn
              ? `${connectedTickets.length} active ticket(s)`
              : `${connectedTickets.length} billet(s) actif(s)`}
          </span>
        </div>

        {connectedTickets.length === 0 ? (
          <div className="p-8 rounded-2xl bg-[#0c0c0c] border border-white/10 text-center space-y-3">
            <TicketIcon className="w-8 h-8 text-neutral-500 mx-auto" />
            <p className="text-xs text-neutral-400">
              {isEn
                ? 'You have not purchased any concert tickets with this email address yet.'
                : "Vous n'avez pas encore acheté de billet de concert avec cette adresse e-mail."}
            </p>
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="px-6 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider cursor-pointer hover:bg-neutral-200"
            >
              {isEn ? 'Browse lineup' : 'Voir la programmation'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {connectedTickets.map((tkt) => (
              <div key={tkt.id} className="p-4 rounded-2xl bg-[#0c0c0c] border border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#d4af37] font-mono tracking-wider uppercase">
                    {tkt.categoryName}
                  </span>
                  <div className="font-agrandir-bold text-sm text-white uppercase">{tkt.eventTitle}</div>
                  <div className="text-[11px] text-neutral-400 font-mono">{tkt.serialNumber}</div>
                </div>

                <span className={`px-2.5 py-1 rounded-full text-[9px] font-agrandir-bold uppercase tracking-wider ${
                  tkt.status === 'valid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-neutral-400'
                }`}>
                  {tkt.status === 'valid'
                    ? isEn ? 'VALID' : 'VALIDE'
                    : isEn ? 'USED' : 'UTILISÉ'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
