import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LumareelWalletView } from './LumareelWalletView';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { supabase } from '../lib/supabaseClient';
import { RefreshCw } from 'lucide-react';
import { MembershipCard } from '../types';
import { loadStoredMemberCard, saveStoredMemberCard } from '../utils/memberCardStorage';
import { PageBackBar } from './PageBackBar';

/**
 * Page officielle "LUMARÉEL Black Card" :
 * - Sans carte commandée : présente la page de commande de la LUMARÉEL Black Card.
 * - Dès que la carte est commandée / active : affiche directement la carte installée
 *   (même en mode pré-configuration/simulation avant connexion des clés Live).
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser } = useApp();
  const [membershipStatus, setMembershipStatus] = useState<'loading' | 'none' | 'owned'>(() =>
    loadStoredMemberCard(currentUser?.email) ? 'owned' : 'loading'
  );
  const [activeCardNumber, setActiveCardNumber] = useState<string | undefined>(() =>
    loadStoredMemberCard(currentUser?.email)?.cardNumber
  );
  const [ownedCard, setOwnedCard] = useState<MembershipCard | null>(() =>
    loadStoredMemberCard(currentUser?.email)
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
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        <PageBackBar className="mb-2" />
      </div>

      {membershipStatus === 'loading' ? (
        <div className="min-h-[55vh] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#d4af37]" />
        </div>
      ) : membershipStatus === 'owned' ? (
        <LumareelWalletView embedded initialCard={ownedCard} />
      ) : (
        <LumareelCardLandingPage
          hasActiveCard={false}
          activeCardNumber={activeCardNumber}
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
