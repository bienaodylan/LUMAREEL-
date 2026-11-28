import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabaseClient';
import { ArrowUpRight, CalendarClock, Check, Copy, Gift, History, Share2, Sparkles, Ticket, Users } from 'lucide-react';

type PointRow = { id: string; points: number; reason: string; source: string; created_at: string };
type ReferralRow = { id: string; status: 'pending' | 'validated' | 'rejected'; reward_points: number; created_at: string; validated_at: string | null };
type OfferRow = { cover_url?: string; id: string; offer_type: 'flash' | 'surprise'; title: string; description: string; cover_path: string | null; benefit_label: string | null; price_amount: number | null; currency: string; conditions: string | null; action_label: string | null; action_url: string | null; starts_at: string | null; ends_at: string | null; status: string };

const money = (value: number) => new Intl.NumberFormat('fr-FR').format(value);

export const RewardsHubView: React.FC<{ initialTab?: 'gifts' | 'points' | 'exchange' | 'referral'; unified?: boolean }> = () => {
  const { currentUser, setIsAuthModalOpen, showToast, language } = useApp();
  const isEn = language === 'en';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [points, setPoints] = useState<PointRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        setReferralCode('');
        setPoints([]);
        setReferrals([]);
        setOffers([]);
        return;
      }
      const userId = authData.user.id;
      let { data: profile, error: profileError } = await supabase
        .from('club_member_profiles').select('referral_code').eq('user_id', userId).maybeSingle();
      if (profileError) throw profileError;
      if (!profile) {
        const created = await supabase.from('club_member_profiles').insert({ user_id: userId }).select('referral_code').single();
        if (created.error && created.error.code !== '23505') throw created.error;
        profile = created.data;
        if (!profile) {
          const retry = await supabase.from('club_member_profiles').select('referral_code').eq('user_id', userId).single();
          if (retry.error) throw retry.error;
          profile = retry.data;
        }
      }
      setReferralCode(profile?.referral_code || '');
      const [pointResult, referralResult, offerResult] = await Promise.all([
        supabase.from('club_point_transactions').select('id,points,reason,source,created_at').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('club_referrals').select('id,status,reward_points,created_at,validated_at').eq('referrer_user_id', userId).order('created_at', { ascending: false }),
        supabase.from('club_offers').select('id,offer_type,title,description,cover_path,benefit_label,price_amount,currency,conditions,action_label,action_url,starts_at,ends_at,status').eq('status', 'published').order('created_at', { ascending: false }),
      ]);
      if (pointResult.error) throw pointResult.error;
      if (referralResult.error) throw referralResult.error;
      if (offerResult.error) throw offerResult.error;
      setPoints(pointResult.data || []);
      setReferrals(referralResult.data || []);
      const offersWithCovers = await Promise.all((offerResult.data || []).map(async (offer: OfferRow) => {
        if (!offer.cover_path) return offer;
        const { data: cover } = await supabase.storage.from('club-media').createSignedUrl(offer.cover_path, 900);
        return { ...offer, cover_url: cover?.signedUrl || '' };
      }));
      setOffers(offersWithCovers);
    } catch (err: any) {
      setError(err?.message || (isEn ? 'Unable to load Club data.' : 'Impossible de charger les données du Club.'));
    } finally {
      setLoading(false);
    }
  }, [isEn]);

  useEffect(() => { void load(); }, [load, currentUser?.id]);

  const balance = useMemo(() => points.reduce((sum, row) => sum + row.points, 0), [points]);
  const earned = useMemo(() => points.reduce((sum, row) => sum + Math.max(row.points, 0), 0), [points]);
  const used = useMemo(() => Math.abs(points.reduce((sum, row) => sum + Math.min(row.points, 0), 0)), [points]);
  const pending = referrals.filter((item) => item.status === 'pending').length;
  const pendingPoints = pending * 500;
  const validated = referrals.filter((item) => item.status === 'validated').length;
  const shareUrl = referralCode && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${encodeURIComponent(referralCode)}` : '';

  const copy = async (value: string, message: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast(message, 'success');
      window.setTimeout(() => setCopied(false), 1800);
    } catch { showToast(isEn ? 'Copy unavailable on this device.' : 'Copie indisponible sur cet appareil.', 'error'); }
  };

  const share = async () => {
    if (!shareUrl) return;
    const payload = { title: 'LUMARÉEL', text: isEn ? 'Join me on LUMARÉEL.' : 'Rejoignez-moi sur LUMARÉEL.', url: shareUrl };
    if (navigator.share) {
      try { await navigator.share(payload); return; } catch { /* user cancelled */ }
    }
    await copy(shareUrl, isEn ? 'Referral link copied.' : 'Lien de parrainage copié.');
  };

  const applyCode = async (event: React.FormEvent) => {
    event.preventDefault();
    const { data } = await supabase.auth.getUser();
    if (!data.user) { setIsAuthModalOpen(true); return; }
    if (!codeInput.trim()) return;
    setApplying(true);
    const { error: rpcError } = await supabase.rpc('club_apply_referral_code', { p_code: codeInput.trim().toUpperCase() });
    setApplying(false);
    if (rpcError) {
      const message = rpcError.message.includes('REFERRAL_ALREADY_APPLIED')
        ? (isEn ? 'A referral code has already been applied to this account.' : 'Un code de parrainage a déjà été appliqué à ce compte.')
        : rpcError.message.includes('SELF_REFERRAL_NOT_ALLOWED')
          ? (isEn ? 'You cannot use your own referral code.' : 'Vous ne pouvez pas utiliser votre propre code.')
          : (isEn ? 'This referral code could not be applied.' : 'Ce code de parrainage ne peut pas être appliqué.');
      showToast(message, 'error');
      return;
    }
    setCodeInput('');
    showToast(isEn ? 'Referral recorded. The reward is credited only after a qualifying purchase.' : 'Parrainage enregistré. La récompense sera créditée après un achat qualifiant.', 'success');
    await load();
  };

  const offerState = (offer: OfferRow) => offer.ends_at && new Date(offer.ends_at).getTime() < Date.now() ? (isEn ? 'Expired' : 'Expiré') : offer.starts_at && new Date(offer.starts_at).getTime() > Date.now() ? (isEn ? 'Coming soon' : 'Bientôt') : (isEn ? 'Available' : 'Disponible');
  const isOfferActionable = (offer: OfferRow) => (!offer.starts_at || new Date(offer.starts_at).getTime() <= Date.now()) && (!offer.ends_at || new Date(offer.ends_at).getTime() >= Date.now());
  const surpriseOffers = offers.filter((offer) => offer.offer_type === 'surprise');
  const flashOffers = offers.filter((offer) => offer.offer_type === 'flash');

  return (
    <div className="min-h-screen w-full max-w-6xl mx-auto px-4 sm:px-8 lg:px-10 pt-5 sm:pt-10 pb-16 text-white">
      <header className="mb-9 sm:mb-12 border-b border-white/15 pb-7">
        <p className="text-[10px] uppercase tracking-[0.24em] text-neutral-500">LUMARÉEL CLUB · FIDÉLITÉ</p>
        <h1 className="mt-3 max-w-3xl text-[clamp(2.1rem,7vw,4.8rem)] font-agrandir-extrabold leading-[0.98] tracking-tight">{isEn ? 'Every invitation can bring something back.' : 'Chaque invitation peut rapporter.'}</h1>
        <p className="mt-4 max-w-2xl text-sm sm:text-base leading-7 text-neutral-400">{isEn ? 'Share LUMARÉEL, enjoy member benefits and discover the surprises waiting for you.' : 'Partagez LUMARÉEL, profitez d’avantages et découvrez les surprises qui vous attendent.'}</p>
      </header>

      {error && <div role="alert" className="mb-6 border border-white/15 bg-white/[0.04] p-4 text-sm text-neutral-300">{error} <button onClick={() => void load()} className="ml-2 underline underline-offset-4">{isEn ? 'Retry' : 'Réessayer'}</button></div>}
      {loading ? <div className="py-16 text-center text-sm text-neutral-500">{isEn ? 'Loading your Club space…' : 'Chargement de votre espace Club…'}</div> : (
        <>
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border-y border-white/10">
            <div className="bg-black py-5 pr-3"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Available balance' : 'Solde disponible'}</p><p className="mt-2 text-3xl sm:text-4xl font-agrandir-extrabold tabular-nums">{money(balance)} <span className="text-xs font-normal text-neutral-500">GP</span></p></div>
            <div className="bg-black py-5 px-3"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Earned' : 'Gagnés'}</p><p className="mt-2 text-2xl sm:text-3xl tabular-nums">{money(earned)}</p></div>
            <div className="bg-black py-5 px-3"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Used' : 'Utilisés'}</p><p className="mt-2 text-2xl sm:text-3xl tabular-nums">{money(used)}</p></div>
            <div className="bg-black py-5 pl-3"><p className="text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'Pending points' : 'Points en attente'}</p><p className="mt-2 text-2xl sm:text-3xl tabular-nums">{money(pendingPoints)}</p></div>
          </section>

          {!referralCode && (
            <div className="my-8 border border-white/15 p-5 sm:p-7">
              <h2 className="text-lg font-agrandir-extrabold">{isEn ? 'Your member account is not connected' : 'Votre compte membre n’est pas connecté'}</h2>
              <p className="mt-2 text-sm text-neutral-400">{isEn ? 'Sign in with your LUMARÉEL account to see your points, referral code and activity.' : 'Connectez-vous avec votre compte LUMARÉEL pour consulter vos points, votre code de parrainage et votre activité.'}</p>
              <button onClick={() => setIsAuthModalOpen(true)} className="mt-5 min-h-11 bg-white px-5 text-xs font-agrandir-extrabold text-black">{isEn ? 'Sign in' : 'Se connecter'}</button>
            </div>
          )}

          {referralCode && (
            <section className="grid lg:grid-cols-12 gap-8 py-9 sm:py-12 border-b border-white/15">
              <div className="lg:col-span-5">
                <p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">01 · PARRAINAGE</p>
                <h2 className="mt-3 text-2xl sm:text-3xl font-agrandir-extrabold">{isEn ? 'Invite your circle.' : 'Invitez votre entourage.'}</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-400">{isEn ? 'You receive 500 Gift Points (FCFA value) once your invited friend completes a qualifying purchase. A sign-up alone does not trigger a reward.' : 'Recevez 500 Gift Points (valeur 500 FCFA) lorsque votre invité réalise un achat qualifiant. Une simple inscription ne déclenche aucune récompense.'}</p>
                <div className="mt-6 flex flex-wrap gap-6 text-xs text-neutral-400"><span><strong className="text-white">{referrals.length}</strong> {isEn ? 'invited' : 'invités'}</span><span><strong className="text-white">{validated}</strong> {isEn ? 'validated' : 'validés'}</span><span><strong className="text-white">{pending}</strong> {isEn ? 'pending' : 'en attente'}</span></div>
              </div>
              <div className="lg:col-span-7 space-y-5">
                <div className="border border-white/15 bg-[#0b0b0b] p-5 sm:p-7">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{isEn ? 'Your personal code' : 'Votre code personnel'}</p>
                  <div className="mt-3 flex items-center justify-between gap-3"><p className="min-w-0 break-all text-2xl sm:text-3xl font-agrandir-extrabold tracking-[0.08em]">{referralCode}</p><button aria-label="Copier le code" onClick={() => void copy(referralCode, isEn ? 'Code copied.' : 'Code copié.')} className="h-11 w-11 shrink-0 border border-white/20 flex items-center justify-center">{copied ? <Check size={17}/> : <Copy size={17}/>}</button></div>
                  <div className="mt-5 flex flex-col sm:flex-row gap-2"><button onClick={() => void copy(shareUrl, isEn ? 'Link copied.' : 'Lien copié.')} className="min-h-11 flex-1 bg-white text-black text-xs font-agrandir-extrabold inline-flex items-center justify-center gap-2"><Copy size={15}/>{isEn ? 'Copy invitation link' : 'Copier le lien'}</button><button onClick={() => void share()} className="min-h-11 border border-white/20 px-5 text-xs inline-flex items-center justify-center gap-2"><Share2 size={15}/>{isEn ? 'Share' : 'Partager'}</button></div>
                </div>
                <form onSubmit={applyCode} className="flex flex-col sm:flex-row gap-2">
                  <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} maxLength={32} placeholder={isEn ? 'Enter a friend’s referral code' : 'Saisir le code d’un ami'} className="min-h-12 min-w-0 flex-1 bg-transparent border border-white/20 px-4 text-sm outline-none focus:border-white"/>
                  <button disabled={applying || !codeInput.trim()} className="min-h-12 px-6 bg-white text-black text-xs font-agrandir-extrabold disabled:opacity-40">{applying ? '…' : (isEn ? 'Apply code' : 'Appliquer')}</button>
                </form>
              </div>
            </section>
          )}

          <section className="py-9 sm:py-12 border-b border-white/15">
            <div className="flex items-end justify-between gap-4 mb-6"><div><p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">02 · CLUB PRIVILÈGES</p><h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">{isEn ? 'Surprises are waiting.' : 'Des surprises vous attendent.'}</h2></div><Sparkles className="text-neutral-500" size={22}/></div>
            {surpriseOffers.length ? <div className="grid sm:grid-cols-2 gap-6">{activeOffers.filter((o) => o.offer_type === 'surprise').map((offer) => <article key={offer.id} className="border-t border-white/20 pt-4">{offer.cover_url && <img src={offer.cover_url} alt={offer.title} loading="lazy" className="mb-4 aspect-[16/9] w-full object-cover"/>}<p className="text-[10px] uppercase tracking-widest text-neutral-500">{offerState(offer)} · {isEn ? 'MEMBER SURPRISE' : 'SURPRISE MEMBRE'}</p><h3 className="mt-2 text-xl font-agrandir-extrabold">{offer.title}</h3><p className="mt-2 text-sm text-neutral-400 leading-6">{offer.description}</p>{offer.benefit_label && <p className="mt-3 text-xs text-white">{offer.benefit_label}</p>}{offer.conditions && <p className="mt-2 text-xs text-neutral-500">{offer.conditions}</p>}{offer.action_url && isOfferActionable(offer) && <a href={offer.action_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs underline underline-offset-4">{offer.action_label || (isEn ? 'Discover' : 'Découvrir')} <ArrowUpRight size={14}/></a>}</article>)}</div> : <p className="py-8 text-sm text-neutral-500">{isEn ? 'No surprise is published at the moment.' : 'Aucune surprise n’est publiée pour le moment.'}</p>}
          </section>

          <section className="py-9 sm:py-12 border-b border-white/15">
            <div className="mb-6"><p className="text-[10px] uppercase tracking-[0.22em] text-neutral-500">03 · OPPORTUNITÉS LIMITÉES</p><h2 className="mt-2 text-2xl sm:text-3xl font-agrandir-extrabold">{isEn ? 'Flash offers' : 'Ventes flash'}</h2></div>
            {flashOffers.length ? <div className="grid sm:grid-cols-2 gap-6">{activeOffers.filter((o) => o.offer_type === 'flash').map((offer) => <article key={offer.id} className="border-t border-white/20 pt-4">{offer.cover_url && <img src={offer.cover_url} alt={offer.title} loading="lazy" className="mb-4 aspect-[16/9] w-full object-cover"/>}<p className="text-[10px] uppercase tracking-widest text-neutral-500">{offerState(offer)} · {isEn ? 'LIMITED OFFER' : 'OFFRE LIMITÉE'}</p><h3 className="mt-2 text-xl font-agrandir-extrabold">{offer.title}</h3><p className="mt-2 text-sm text-neutral-400 leading-6">{offer.description}</p>{offer.benefit_label && <p className="mt-3 text-sm text-white">{offer.benefit_label}</p>}{offer.price_amount !== null && <p className="mt-2 text-xl font-agrandir-extrabold">{money(offer.price_amount)} {offer.currency}</p>}{offer.ends_at && <p className="mt-2 text-xs text-neutral-500 inline-flex items-center gap-2"><CalendarClock size={13}/>{new Date(offer.ends_at).toLocaleString(isEn ? 'en-GB' : 'fr-FR')}</p>}{offer.conditions && <p className="mt-2 text-xs text-neutral-500">{offer.conditions}</p>}{offer.action_url && isOfferActionable(offer) && <a href={offer.action_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-xs underline underline-offset-4">{offer.action_label || (isEn ? 'View offer' : 'Voir l’offre')} <ArrowUpRight size={14}/></a>}</article>)}</div> : <p className="py-8 text-sm text-neutral-500">{isEn ? 'No flash offer is available at the moment.' : 'Aucune vente flash n’est disponible pour le moment.'}</p>}
            
          </section>

          <section className="py-9 sm:py-12">
            <div className="mb-5 flex items-center gap-3"><History size={18} className="text-neutral-500"/><h2 className="text-xl font-agrandir-extrabold">{isEn ? 'Your activity' : 'Votre activité'}</h2></div>
            {points.length ? <div className="divide-y divide-white/10">{points.map((row) => <article key={row.id} className="py-4 flex items-center justify-between gap-4"><div className="min-w-0"><p className="text-sm">{row.reason}</p><p className="mt-1 text-[10px] text-neutral-500">{new Date(row.created_at).toLocaleString(isEn ? 'en-GB' : 'fr-FR')}</p></div><strong className={row.points > 0 ? 'text-white tabular-nums' : 'text-neutral-500 tabular-nums'}>{row.points > 0 ? '+' : ''}{money(row.points)} GP</strong></article>)}</div> : <div className="py-8 border-t border-white/10 text-sm text-neutral-500">{isEn ? 'Your points activity will appear here once you earn or use Gift Points.' : 'Votre historique apparaîtra ici lorsque vous gagnerez ou utiliserez des Gift Points.'}</div>}
            {referrals.length > 0 && <div className="mt-7 border-t border-white/10 pt-5"><p className="mb-3 text-[10px] uppercase tracking-widest text-neutral-500">{isEn ? 'REFERRAL ACTIVITY' : 'ACTIVITÉ DE PARRAINAGE'}</p><div className="divide-y divide-white/10">{referrals.map((referral) => <article key={referral.id} className="py-3 flex items-center justify-between gap-4"><div><p className="text-sm">{referral.status === 'validated' ? (isEn ? 'Referral validated' : 'Parrainage validé') : referral.status === 'rejected' ? (isEn ? 'Referral rejected' : 'Parrainage refusé') : (isEn ? 'Referral awaiting a qualifying purchase' : 'Parrainage en attente d’un achat qualifiant')}</p><p className="mt-1 text-[10px] text-neutral-500">{new Date(referral.created_at).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR')}</p></div><strong className="text-xs tabular-nums">{referral.status === 'validated' ? '+' : ''}{money(referral.reward_points)} GP</strong></article>)}</div></div>}
          </section>
        </>
      )}
    </div>
  );
};
