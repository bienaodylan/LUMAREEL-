import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  COMMUNITY_MEDIA,
  ClaimedFlashOffer,
  loadUserPointsState,
  saveUserPointsState,
} from '../utils/communityStorage';
import { CheckCircle2, Clock, Copy, Gift, Ticket, Zap } from 'lucide-react';

interface FlashOffer {
  id: string;
  titleFr: string;
  titleEn: string;
  descFr: string;
  descEn: string;
  discountLabelFr: string;
  discountLabelEn: string;
  originalPrice: number;
  flashPrice: number;
  remaining: number;
  total: number;
  endsInSeconds: number;
  image: string;
  codePrefix: string;
}

const FLASH_OFFERS: FlashOffer[] = [
  {
    id: 'flash_duo_vip',
    titleFr: 'Pack Duo VIP — Vente Flash 24h',
    titleEn: 'VIP Duo Pack — 24h Flash Sale',
    descFr: 'Deux accès VIP avec entrée prioritaire et accès lounge pour le prochain concert LUMARÉEL.',
    descEn: 'Two VIP passes with priority gate access and lounge entry for the next LUMARÉEL show.',
    discountLabelFr: '-25 % Vente Flash',
    discountLabelEn: '25% Off Flash Drop',
    originalPrice: 60000,
    flashPrice: 45000,
    remaining: 9,
    total: 30,
    endsInSeconds: 5 * 3600 + 42 * 60,
    image: COMMUNITY_MEDIA.flashVipDropImg,
    codePrefix: 'FLASHVIP',
  },
  {
    id: 'flash_early_fosse',
    titleFr: 'Quota Fosse Éclair',
    titleEn: 'Lightning Floor Quota',
    descFr: 'Série limitée de billets standard à tarif préférentiel avant la clôture de la fenêtre flash.',
    descEn: 'Limited drop of standard floor tickets at a reduced rate before the flash window closes.',
    discountLabelFr: '-30 % Éclair',
    discountLabelEn: '30% Off Drop',
    originalPrice: 15000,
    flashPrice: 10500,
    remaining: 14,
    total: 50,
    endsInSeconds: 2 * 3600 + 18 * 60,
    image: COMMUNITY_MEDIA.concertMemoriesCrowdImg,
    codePrefix: 'FLASHSTD',
  },
  {
    id: 'flash_partner_table',
    titleFr: 'Avantage Partenaire — Lounge & Boisson Offerte',
    titleEn: 'Partner Perk — Lounge & Complimentary Drink',
    descFr: 'Bon flash valable chez nos lieux partenaires d’Abidjan avant ou après le concert.',
    descEn: 'Flash voucher redeemable at our Abidjan partner lounges before or after the concert.',
    discountLabelFr: 'Offre Partenaire',
    discountLabelEn: 'Partner Offer',
    originalPrice: 12000,
    flashPrice: 6000,
    remaining: 18,
    total: 40,
    endsInSeconds: 9 * 3600 + 10 * 60,
    image: COMMUNITY_MEDIA.vipMezzanineImg,
    codePrefix: 'FLASHLOUNGE',
  },
];

const SURPRISE_POOL = [
  {
    points: 75,
    titleFr: 'Bonus surprise +75 points fidélité',
    titleEn: 'Surprise bonus +75 loyalty points',
    detailFr: 'Crédités directement sur votre solde LUMARÉEL.',
    detailEn: 'Credited straight to your LUMARÉEL balance.',
  },
  {
    points: 100,
    titleFr: 'Bonus surprise +100 points + Boisson partenaire',
    titleEn: 'Surprise +100 points + Partner drink pass',
    detailFr: 'Code valable au bar partenaire lors de votre prochain concert.',
    detailEn: 'Code redeemable at the partner bar during your next show.',
  },
  {
    points: 50,
    titleFr: 'Code surprise -15 % billetterie + 50 points',
    titleEn: 'Surprise 15% ticket code + 50 points',
    detailFr: 'Utilisable sur votre prochaine commande standard ou VIP.',
    detailEn: 'Valid on your next standard or VIP order.',
  },
];

function formatTimer(totalSec: number): string {
  const safe = Math.max(0, totalSec);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const FlashDropsView: React.FC = () => {
  const { currentUser, events, setCheckoutEvent, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';

  const [pointsState, setPointsState] = useState(() => loadUserPointsState(currentUser));
  const [elapsed, setElapsed] = useState(0);
  const [revealedSurprise, setRevealedSurprise] = useState<ClaimedFlashOffer | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const alreadyClaimedToday = pointsState.lastSurpriseClaimDate === todayKey;

  const handleClaimFlash = (offer: FlashOffer) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(isEn ? 'Sign in to reserve a flash offer.' : 'Connectez-vous pour réserver une vente flash.', 'info');
      return;
    }
    const existing = pointsState.claimedFlashOffers.find((c) => c.offerId === offer.id);
    if (existing) {
      showToast(
        isEn ? `Offer already reserved (${existing.code}).` : `Offre déjà réservée (code : ${existing.code}).`,
        'info'
      );
      return;
    }
    const code = `${offer.codePrefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const claimed: ClaimedFlashOffer = {
      id: `fl_${Date.now()}`,
      offerId: offer.id,
      title: isEn ? offer.titleEn : offer.titleFr,
      code,
      claimedAt: new Date().toISOString(),
      type: 'flash_sale',
      detail: `${offer.flashPrice.toLocaleString('fr-FR')} F CFA`,
    };
    const next = {
      ...pointsState,
      claimedFlashOffers: [claimed, ...pointsState.claimedFlashOffers],
    };
    setPointsState(next);
    saveUserPointsState(currentUser, next);
    showToast(
      isEn ? `Flash deal reserved! Code: ${code}` : `Vente flash réservée ! Code : ${code}`,
      'success'
    );
  };

  const handleUnlockSurprise = () => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      showToast(isEn ? 'Sign in to unlock your surprise reward.' : 'Connectez-vous pour débloquer votre récompense surprise.', 'info');
      return;
    }
    if (alreadyClaimedToday) {
      showToast(
        isEn ? 'You already unlocked today’s surprise reward. Come back tomorrow!' : 'Vous avez déjà ouvert votre récompense surprise aujourd’hui. Revenez demain !',
        'info'
      );
      return;
    }
    const pick = SURPRISE_POOL[Math.floor(Math.random() * SURPRISE_POOL.length)];
    const code = `LMR-SURP-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const entry: ClaimedFlashOffer = {
      id: `surp_${Date.now()}`,
      offerId: `surprise_${todayKey}`,
      title: isEn ? pick.titleEn : pick.titleFr,
      code,
      claimedAt: new Date().toISOString(),
      type: 'surprise',
      detail: isEn ? pick.detailEn : pick.detailFr,
    };
    const next = {
      ...pointsState,
      bonusSurprisePoints: pointsState.bonusSurprisePoints + pick.points,
      lastSurpriseClaimDate: todayKey,
      claimedFlashOffers: [entry, ...pointsState.claimedFlashOffers],
    };
    setPointsState(next);
    saveUserPointsState(currentUser, next);
    setRevealedSurprise(entry);
    showToast(
      isEn ? `Surprise unlocked: ${pick.titleEn}` : `Surprise débloquée : ${pick.titleFr}`,
      'success'
    );
  };

  const nextConcert = events.find((e) => e.status === 'published') || events[0] || null;

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-4 sm:pt-10 pb-20 text-white font-agrandir-regular">
      <header className="mb-8 pb-6 border-b border-white/10">
        <p className="text-xs tracking-[0.2em] text-[#D4AF37] uppercase mb-2">
          {isEn ? 'Limited Drops · Surprises' : 'Offres Éphémères · Surprises'}
        </p>
        <h1 className="font-agrandir-extrabold text-3xl sm:text-5xl tracking-tight text-white leading-[1.02] text-balance">
          {isEn ? 'Surprise Rewards & Flash Sales' : 'Récompenses Surprises & Ventes Flash'}
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mt-3 max-w-2xl leading-relaxed">
          {isEn
            ? 'Time-limited ticket quotas, partner flash deals, and daily surprise rewards reserved for active members.'
            : 'Quotas de billets à durée limitée, ventes flash partenaires et récompenses surprises à débloquer directement depuis votre espace.'}
        </p>
      </header>

      {/* Bloc Récompense Surprise du jour */}
      <section className="mb-10 rounded-3xl bg-[#0e0e0e] border border-[#D4AF37]/30 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-8 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-agrandir-bold uppercase tracking-wider">
            <Gift className="w-4 h-4" />
            <span>{isEn ? 'Member Surprise Drop' : 'Récompense Surprise Membre'}</span>
          </div>
          <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white leading-tight">
            {alreadyClaimedToday
              ? (isEn ? 'Today’s surprise has been unlocked.' : 'Votre surprise du jour est débloquée.')
              : (isEn ? 'Open your surprise reward right now.' : 'Débloquez votre récompense surprise du jour.')}
          </h2>
          <p className="text-sm text-neutral-400 max-w-xl leading-relaxed">
            {revealedSurprise
              ? `${revealedSurprise.title} — ${revealedSurprise.detail} (${revealedSurprise.code})`
              : (isEn
                  ? 'Bonus loyalty points, instant ticketing discounts, or partner drink vouchers — revealed in one tap.'
                  : 'Points fidélité bonus, réductions billetterie immédiates ou invitations boisson partenaires révélés en un geste.')}
          </p>
        </div>

        <div className="lg:col-span-4 flex lg:justify-end">
          <button
            type="button"
            onClick={handleUnlockSurprise}
            disabled={alreadyClaimedToday}
            className={`w-full lg:w-auto min-h-[48px] px-7 rounded-2xl font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
              alreadyClaimedToday
                ? 'bg-white/10 text-neutral-400 cursor-not-allowed'
                : 'bg-[#D4AF37] hover:bg-[#e6c252] text-black cursor-pointer'
            }`}
          >
            {alreadyClaimedToday ? <CheckCircle2 className="w-4 h-4" /> : <Gift className="w-4 h-4" />}
            <span>
              {alreadyClaimedToday
                ? (isEn ? 'Unlocked today' : 'Déjà ouverte aujourd’hui')
                : (isEn ? 'Reveal my surprise' : 'Ouvrir ma surprise')}
            </span>
          </button>
        </div>
      </section>

      {/* Grille des Ventes Flash en direct */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-agrandir-extrabold text-xl text-white">
            {isEn ? 'Active flash sales' : 'Ventes flash en cours'}
          </h2>
          <span className="text-xs text-neutral-400">
            {isEn ? 'Limited stock' : 'Stocks limités'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FLASH_OFFERS.map((offer) => {
            const claimed = pointsState.claimedFlashOffers.find((c) => c.offerId === offer.id);
            const secondsLeft = Math.max(0, offer.endsInSeconds - elapsed);
            return (
              <article
                key={offer.id}
                className="rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-[4/3] relative bg-black overflow-hidden">
                    <img
                      src={offer.image}
                      alt={isEn ? offer.titleEn : offer.titleFr}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs">
                      <span className="font-agrandir-bold text-[#D4AF37]">
                        {isEn ? offer.discountLabelEn : offer.discountLabelFr}
                      </span>
                      <span className="font-mono text-white tabular-nums flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        {formatTimer(secondsLeft)}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-agrandir-extrabold text-base text-white leading-snug">
                      {isEn ? offer.titleEn : offer.titleFr}
                    </h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {isEn ? offer.descEn : offer.descFr}
                    </p>
                    <div className="flex items-baseline gap-2.5 pt-1">
                      <span className="text-xl font-agrandir-extrabold text-white tabular-nums">
                        {offer.flashPrice.toLocaleString('fr-FR')} F CFA
                      </span>
                      <span className="text-xs text-neutral-500 line-through tabular-nums">
                        {offer.originalPrice.toLocaleString('fr-FR')} F CFA
                      </span>
                    </div>
                    <div className="text-xs text-neutral-400 tabular-nums">
                      {isEn
                        ? `${offer.remaining} of ${offer.total} remaining`
                        : `${offer.remaining} restants sur ${offer.total}`}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleClaimFlash(offer)}
                    className={`w-full min-h-[44px] rounded-xl text-xs font-agrandir-extrabold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                      claimed
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white hover:bg-neutral-200 text-black'
                    }`}
                  >
                    {claimed ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    <span>
                      {claimed
                        ? `${isEn ? 'Reserved' : 'Réservé'} · ${claimed.code}`
                        : (isEn ? 'Claim flash deal' : 'Profiter de la vente flash')}
                    </span>
                  </button>
                  {claimed && nextConcert && (
                    <button
                      type="button"
                      onClick={() => setCheckoutEvent(nextConcert)}
                      className="w-full min-h-[40px] rounded-xl border border-white/15 hover:border-white/30 text-xs text-neutral-300 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Book concert now' : 'Utiliser sur un concert'}</span>
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Mes codes flash & surprises enregistrés */}
      <section className="rounded-3xl bg-[#0e0e0e] border border-white/10 p-6 sm:p-7">
        <h2 className="font-agrandir-extrabold text-lg text-white mb-4">
          {isEn ? 'Your reserved flash offers & surprises' : 'Vos ventes flash et surprises réservées'}
        </h2>
        {pointsState.claimedFlashOffers.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {isEn
              ? 'Nothing claimed yet. Unlock your daily surprise or reserve a flash offer above.'
              : 'Aucune offre réservée pour le moment. Ouvrez votre récompense surprise ou sélectionnez une vente flash ci-dessus.'}
          </p>
        ) : (
          <div className="divide-y divide-white/8">
            {pointsState.claimedFlashOffers.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-agrandir-bold text-white">{item.title}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{item.detail}</div>
                </div>
                <div className="flex items-center gap-2">
                  <code className="px-3 py-1.5 rounded-lg bg-black border border-[#D4AF37]/30 font-mono text-xs text-[#D4AF37]">
                    {item.code}
                  </code>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard?.writeText(item.code).catch(() => {});
                      showToast(isEn ? 'Code copied.' : 'Code copié.', 'success');
                    }}
                    className="min-h-[40px] min-w-[40px] rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
                    aria-label={isEn ? 'Copy code' : 'Copier le code'}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
