import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LumareelWalletView } from './LumareelWalletView';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { LumareelCardOrderPage, CardOrderContextData } from './LumareelCardOrderPage';
import { supabase } from '../lib/supabaseClient';
import { MembershipCard } from '../types';
import { loadStoredMemberCard, saveStoredMemberCard } from '../utils/memberCardStorage';
import { SkeletonBlock } from './ui/LumareelKit';

/**
 * Espace Carte LUMARÉEL :
 * - Avant adhésion : page de présentation (Landing Page) puis page dédiée d’acquisition.
 * - Dès que la carte est créée : affiche directement Ta LUMARÉEL Black Card (avec Billets, Invitations, Activités).
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser } = useApp();

  const initialLocalCard = loadStoredMemberCard(currentUser?.email);
  const [membershipStatus, setMembershipStatus] = useState<'loading' | 'none' | 'owned'>(() =>
    initialLocalCard ? 'owned' : 'loading'
  );
  const [activeCardNumber, setActiveCardNumber] = useState<string | undefined>(
    () => initialLocalCard?.cardNumber
  );
  const [ownedCard, setOwnedCard] = useState<MembershipCard | null>(() => initialLocalCard);
  const [viewMode, setViewMode] = useState<'landing' | 'order'>('landing');
  const [orderContext, setOrderContext] = useState<CardOrderContextData | null>(null);

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
    setViewMode('landing');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStartOrder = (context: CardOrderContextData) => {
    setOrderContext(context);
    setViewMode('order');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const handleBackToLanding = () => {
    setViewMode('landing');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white transition-colors duration-200">
      {membershipStatus === 'loading' ? (
        <div className="w-full max-w-2xl mx-auto px-5 sm:px-8 pt-12 pb-24 space-y-6">
          <SkeletonBlock className="max-w-[400px] mx-auto aspect-[85.6/53.98] rounded-[11px]" />
          <SkeletonBlock className="h-10 max-w-sm mx-auto" />
          <SkeletonBlock className="h-28 max-w-lg mx-auto" />
        </div>
      ) : membershipStatus === 'owned' && ownedCard ? (
        <LumareelWalletView embedded initialCard={ownedCard} />
      ) : viewMode === 'order' ? (
        <LumareelCardOrderPage
          orderContext={orderContext}
          onBack={handleBackToLanding}
          onCardIssued={handleCardIssued}
        />
      ) : (
        <LumareelCardLandingPage
          hasActiveCard={false}
          activeCardNumber={activeCardNumber}
          onStartOrder={handleStartOrder}
          onCardIssued={handleCardIssued}
          onGoToWallet={() => {
            const localCard = ownedCard || loadStoredMemberCard(currentUser?.email);
            if (localCard) {
              handleCardIssued(localCard);
            } else {
              loadStatus();
            }
          }}
        />
      )}
    </div>
  );
};
