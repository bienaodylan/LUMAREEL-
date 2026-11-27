import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LumareelWalletView } from './LumareelWalletView';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { RewardsHubView } from './RewardsHubView';
import { supabase } from '../lib/supabaseClient';
import { MembershipCard } from '../types';
import { loadStoredMemberCard, saveStoredMemberCard } from '../utils/memberCardStorage';
import { SkeletonBlock } from './ui/LumareelKit';

type CarteSection = 'card' | 'rewards' | 'referral';

/**
 * 05 — CARTE : Centre de valeur, statut membre et fidélité LUMARÉEL.
 * Regroupe dans un espace unifié et hiérarchisé :
 * - Black Card (statut membre, validité, accès prioritaires — jamais présentée comme carte bancaire)
 * - Avantages (Points de fidélité, Récompenses, Crédits billetterie FCFA, Challenges, Accès privilégiés)
 * - Parrainage (code personnel, suivi des filleuls validés après premier achat, crédit)
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser, language } = useApp();
  const isEn = language === 'en';

  const initialLocalCard = loadStoredMemberCard(currentUser?.email);
  const [membershipStatus, setMembershipStatus] = useState<'loading' | 'none' | 'owned'>(() =>
    initialLocalCard ? 'owned' : 'loading'
  );
  const [activeCardNumber, setActiveCardNumber] = useState<string | undefined>(
    () => initialLocalCard?.cardNumber
  );
  const [ownedCard, setOwnedCard] = useState<MembershipCard | null>(() => initialLocalCard);
  const [activeSection, setActiveSection] = useState<CarteSection>('card');
  const [cardSubView, setCardSubView] = useState<'discover' | 'my_card'>(() =>
    initialLocalCard ? 'my_card' : 'discover'
  );

  const loadStatus = useCallback(async () => {
    const localCard = loadStoredMemberCard(currentUser?.email);

    if (!currentUser?.email) {
      if (localCard) {
        setOwnedCard(localCard);
        setActiveCardNumber(localCard.cardNumber);
        setMembershipStatus('owned');
      } else {
        setOwnedCard(null);
        setMembershipStatus('none');
      }
      return;
    }

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch(
        `/api/membership/my-card?email=${encodeURIComponent(currentUser.email)}`,
        { headers }
      );
      const rawText = await response.text();
      const result = rawText ? JSON.parse(rawText) : null;

      if (result?.success && result?.hasCard && result?.card) {
        saveStoredMemberCard(result.card, currentUser.email);
        setActiveCardNumber(result.card.cardNumber);
        setOwnedCard(result.card);
        setMembershipStatus('owned');
      } else if (localCard) {
        setActiveCardNumber(localCard.cardNumber);
        setOwnedCard(localCard);
        setMembershipStatus('owned');
      } else {
        setOwnedCard(null);
        setMembershipStatus('none');
      }
    } catch {
      if (localCard) {
        setActiveCardNumber(localCard.cardNumber);
        setOwnedCard(localCard);
        setMembershipStatus('owned');
      } else {
        setOwnedCard(null);
        setMembershipStatus('none');
      }
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleCardIssued = (card: MembershipCard) => {
    saveStoredMemberCard(card, currentUser?.email);
    setOwnedCard(card);
    setActiveCardNumber(card.cardNumber);
    setMembershipStatus('owned');
    setActiveSection('card');
    setCardSubView('my_card');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-black text-white pb-16">
      {/* En-tête Carte : navigation secondaire claire Black Card | Avantages | Parrainage */}
      <div
        className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pb-4 space-y-4"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#9A9A9A]">
              {isEn ? 'STATUS · POINTS · BENEFITS' : 'STATUT · POINTS · AVANTAGES'}
            </p>
            <h1 className="mt-0.5 font-agrandir-extrabold text-2xl sm:text-3xl tracking-tight text-white">
              {isEn ? 'Card & Benefits' : 'Carte'}
            </h1>
          </div>

          <div
            role="tablist"
            aria-label={isEn ? 'Card sections' : 'Sections Carte'}
            className="inline-flex items-center p-1 rounded-full bg-[#141414] border border-white/[0.12] max-w-full overflow-x-auto scrollbar-hide"
          >
            {(
              [
                { id: 'card', label: 'Black Card' },
                { id: 'rewards', label: isEn ? 'Benefits' : 'Avantages' },
                { id: 'referral', label: isEn ? 'Referral' : 'Parrainage' },
              ] as Array<{ id: CarteSection; label: string }>
            ).map((tab) => {
              const active = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveSection(tab.id)}
                  className={`min-h-[34px] px-3.5 sm:px-4 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'text-[#9A9A9A] hover:text-white font-agrandir-semibold'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sous-bascule discrète Découvrir / Ma carte uniquement dans l'onglet Black Card */}
        {activeSection === 'card' && membershipStatus !== 'loading' && (
          <div className="flex items-center gap-4 border-b border-white/[0.12] text-xs">
            <button
              type="button"
              onClick={() => setCardSubView('my_card')}
              className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                cardSubView === 'my_card'
                  ? 'border-[#D4AF6A] text-white font-agrandir-extrabold'
                  : 'border-transparent text-[#9A9A9A] hover:text-white font-agrandir-semibold'
              }`}
            >
              {isEn ? 'My card' : 'Ma carte'}
            </button>
            <button
              type="button"
              onClick={() => setCardSubView('discover')}
              className={`pb-2.5 border-b-2 transition-colors cursor-pointer ${
                cardSubView === 'discover'
                  ? 'border-[#D4AF6A] text-white font-agrandir-extrabold'
                  : 'border-transparent text-[#9A9A9A] hover:text-white font-agrandir-semibold'
              }`}
            >
              {isEn ? 'Membership & perks' : 'Adhésion & statut'}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 1 : BLACK CARD */}
      {activeSection === 'card' && (
        membershipStatus === 'loading' ? (
          <div className="w-full max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-10 pt-4 space-y-6">
            <SkeletonBlock className="max-w-[420px] aspect-[1.586/1]" />
            <SkeletonBlock className="h-12 max-w-md" />
            <SkeletonBlock className="h-28 max-w-lg" />
          </div>
        ) : cardSubView === 'my_card' ? (
          membershipStatus === 'owned' && ownedCard ? (
            <LumareelWalletView embedded initialCard={ownedCard} />
          ) : (
            <div className="w-full max-w-xl mx-auto px-5 sm:px-8 pt-6 pb-16 text-center space-y-6">
              <div className="w-full max-w-[360px] mx-auto aspect-[1.586/1] rounded-[20px] border border-[#D4AF6A]/45 bg-gradient-to-br from-[#16120B] via-[#0B0B0B] to-[#060606] p-6 flex flex-col justify-between text-left relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="font-agrandir-extrabold text-xs uppercase tracking-[0.26em] text-white">
                    LUMARÉEL
                  </span>
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="text-[#D4AF6A]"
                  >
                    <path d="M8.5 16.5C10.2 14.8 10.2 9.2 8.5 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M12.2 18.8C15 16 15 8 12.2 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M16 21C19.8 17.2 19.8 6.8 16 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <span className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                      BLACK CARD
                    </span>
                    <span className="block text-sm font-agrandir-extrabold uppercase text-white mt-0.5">
                      {currentUser?.name?.toUpperCase() || (isEn ? 'YOUR NAME' : 'VOTRE NOM')}
                    </span>
                  </div>
                  <span className="text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-[#9A9A9A]">
                    {isEn ? 'MEMBER' : 'MEMBRE'}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="font-agrandir-extrabold text-xl sm:text-2xl text-white">
                  {isEn ? 'No active Black Card yet' : 'Aucune Black Card active'}
                </h2>
                <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed max-w-md mx-auto">
                  {isEn
                    ? 'Your digital membership card appears here as soon as your membership is confirmed. It proves your member status — it is not a payment card.'
                    : "Votre carte de membre numérique s'affiche ici dès validation de votre adhésion. Elle matérialise votre statut — ce n'est pas une carte de paiement."}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCardSubView('discover')}
                  className="min-h-[46px] px-7 rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-sm transition-colors cursor-pointer lum-press"
                >
                  {isEn ? 'Become a member' : 'Devenir membre'}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('rewards')}
                  className="min-h-[46px] px-6 rounded-full border border-white/20 hover:border-white text-white font-agrandir-semibold text-xs transition-colors cursor-pointer"
                >
                  {isEn ? 'View my points & rewards' : 'Voir mes points & avantages'}
                </button>
              </div>
            </div>
          )
        ) : (
          <LumareelCardLandingPage
            hasActiveCard={membershipStatus === 'owned'}
            activeCardNumber={activeCardNumber}
            onCardIssued={handleCardIssued}
            onGoToWallet={() => {
              const localCard = ownedCard || loadStoredMemberCard(currentUser?.email);
              if (localCard) {
                handleCardIssued(localCard);
              } else {
                loadStatus();
                setCardSubView('my_card');
              }
            }}
          />
        )
      )}

      {/* SECTION 2 : AVANTAGES (POINTS, RÉCOMPENSES, CRÉDITS BILLETTERIE, CHALLENGES) */}
      {activeSection === 'rewards' && (
        <RewardsHubView embedded forcedMode="points" />
      )}

      {/* SECTION 3 : PARRAINAGE */}
      {activeSection === 'referral' && (
        <RewardsHubView embedded forcedMode="referral" />
      )}
    </div>
  );
};
