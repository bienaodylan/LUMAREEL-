import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { LumareelWalletView } from './LumareelWalletView';
import { LumareelCardLandingPage } from './LumareelCardLandingPage';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { MembershipCard } from '../types';

/**
 * Page officielle "Black Card" :
 * - Sans carte commandée : présente la page de commande de la Black Card.
 * - Dès que la carte est commandée / active : affiche directement la carte installée
 *   et ses avantages sans boutons de bascule superflus.
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser, setCurrentPage, t } = useApp();
  const [membershipStatus, setMembershipStatus] = useState<'loading' | 'none' | 'owned'>('loading');
  const [activeCardNumber, setActiveCardNumber] = useState<string | undefined>(undefined);
  const [ownedCard, setOwnedCard] = useState<MembershipCard | null>(null);

  const loadStatus = useCallback(async () => {
    if (!currentUser?.email) {
      setMembershipStatus('none');
      setOwnedCard(null);
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
        setActiveCardNumber(result.card.cardNumber);
        setOwnedCard(result.card);
        setMembershipStatus('owned');
      } else {
        setOwnedCard(null);
        setMembershipStatus('none');
      }
    } catch {
      setOwnedCard(null);
      setMembershipStatus('none');
    }
  }, [currentUser?.email]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleCardIssued = (card: MembershipCard) => {
    setOwnedCard(card);
    setActiveCardNumber(card.cardNumber);
    setMembershipStatus('owned');
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] text-white pb-12">
      {/* Barre supérieure épurée : bouton Retour uniquement */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 sm:pt-7 pb-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/12 bg-white/[0.04] text-xs font-agrandir-bold tracking-wider text-neutral-300 transition hover:bg-white/10 hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-[#d4af37]" />
          <span>{t('nav.backHome')}</span>
        </button>
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
          onGoToWallet={() => loadStatus()}
        />
      )}
    </div>
  );
};
