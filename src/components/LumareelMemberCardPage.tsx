import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { MemberCardSection } from './MemberCardSection';
import { LumareelWalletView } from './LumareelWalletView';
import { supabase } from '../lib/supabaseClient';
import { ArrowLeft, CreditCard, LockKeyhole } from 'lucide-react';

/**
 * Dedicated member-card destination. It is intentionally independent from ticket
 * orders; MemberCardSection displays a subscription gate until a card exists.
 */
export const LumareelMemberCardPage: React.FC = () => {
  const { currentUser, setCurrentPage, setIsAuthModalOpen } = useApp();
  const [membershipStatus, setMembershipStatus] = useState<'loading'|'none'|'pending'|'active'>('loading');

  useEffect(() => {
    let alive = true;
    const loadStatus = async () => {
      if (!currentUser) { setMembershipStatus('none'); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setMembershipStatus('none'); return; }
        const response = await fetch('/api/membership/my-card', { headers: { Authorization: `Bearer ${session.access_token}` } });
        const result = await response.json();
        if (!alive) return;
        if (!result.success || !result.hasCard) setMembershipStatus('none');
        else setMembershipStatus(result.card?.card_status === 'active' ? 'active' : 'pending');
      } catch { if (alive) setMembershipStatus('none'); }
    };
    loadStatus();
    return () => { alive = false; };
  }, [currentUser]);

  return (
    <div className="min-h-screen bg-black px-4 pb-32 pt-24 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => setCurrentPage('home')}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-neutral-300 transition hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 text-[#d4af37]" /> Retour à l’accueil
        </button>
        <header className="mb-8 flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#d4af37]">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[.25em] text-[#d4af37]">Espace membre sécurisé</p>
            <h1 className="text-2xl font-agrandir-extrabold sm:text-3xl">MA LUMARÉEL CARD</h1>
          </div>
        </header>
        {!currentUser ? (
          <div className="rounded-3xl border border-white/10 bg-[#0b0b0b] p-8 text-center sm:p-12">
            <LockKeyhole className="mx-auto mb-4 h-10 w-10 text-[#d4af37]" />
            <h2 className="text-xl font-bold">Connexion requise</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-neutral-400">Connectez-vous pour vérifier votre adhésion et accéder à votre carte. Aucun contenu membre n’est accessible sans session.</p>
            <button onClick={() => setIsAuthModalOpen(true)} className="mt-6 rounded-full bg-[#d4af37] px-6 py-3 text-xs font-bold uppercase text-black">Se connecter</button>
          </div>
        ) : membershipStatus === 'active' ? (
          <LumareelWalletView />
        ) : (
          <>
            {membershipStatus === 'pending' && <div className="mb-6 rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/10 px-5 py-4 text-sm text-[#e8d18a">Votre commande est enregistrée. Votre carte reste en préparation jusqu’à confirmation de son activation.</div>}
            <MemberCardSection onOpenSubscribe={() => setCurrentPage('card')} />
          </>
        )}
      </div>
    </div>
  );
};
