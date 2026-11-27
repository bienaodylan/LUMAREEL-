import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Plus,
  RefreshCw,
  ShieldCheck,
  Tv,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../../lib/supabaseClient';
import type { TvCardEligibilityClient, TvPassPlanClient, TvSubscriptionStatus } from '../../../utils/tvAccess';

async function getAdminAuthHeaders(withJson = false): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (withJson) headers['Content-Type'] = 'application/json';
  try {
    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) {
        headers.Authorization = `Bearer ${data.session.access_token}`;
      }
    }
  } catch {
    // ignore
  }
  return headers;
}

interface AdminTvSubscriptionRow {
  id: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  status: TvSubscriptionStatus;
  source: 'paymetrust' | 'admin_grant';
  paymentReference?: string;
  amountPaid?: number;
  currency?: string;
  autoRenew: boolean;
  startsAt?: string;
  expiresAt?: string;
  revocationReason?: string;
  createdAt: string;
}

interface MembershipPlanSummary {
  id: string;
  name: string;
  price: number;
  currency: string;
}

interface AdminLumareelTvSubscriptionsPanelProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLumareelTvSubscriptionsPanel: React.FC<
  AdminLumareelTvSubscriptionsPanelProps
> = ({ showToast }) => {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<TvPassPlanClient[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminTvSubscriptionRow[]>([]);
  const [cardEligibility, setCardEligibility] = useState<TvCardEligibilityClient>({
    enabledPlanIds: ['plan_founders_annual'],
    blackCardIncludesVipTier: true,
    cardAccessEnabled: true,
  });
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanSummary[]>([]);
  const [paymentReady, setPaymentReady] = useState(false);

  // Plan editor state
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('3500');
  const [planDescription, setPlanDescription] = useState('');
  const [planRenewalPolicy, setPlanRenewalPolicy] = useState('');
  const [planConditions, setPlanConditions] = useState('');
  const [planStatus, setPlanStatus] = useState<'active' | 'inactive' | 'archived'>('active');
  const [showPlanForm, setShowPlanForm] = useState(false);

  // Manual grant state
  const [grantEmail, setGrantEmail] = useState('');
  const [grantName, setGrantName] = useState('');
  const [grantPlanId, setGrantPlanId] = useState('');
  const [grantDays, setGrantDays] = useState('30');
  const [saving, setSaving] = useState(false);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const headers = await getAdminAuthHeaders(false);
      const res = await fetch('/api/admin/tv/overview', { headers });
      const data = await res.json();
      if (res.ok && data?.success) {
        setPlans(data.plans || []);
        setSubscriptions(data.subscriptions || []);
        if (data.cardEligibility) setCardEligibility(data.cardEligibility);
        setMembershipPlans(data.membershipPlans || []);
        setPaymentReady(Boolean(data.paymentReady));
        if (data.plans?.[0] && !grantPlanId) {
          setGrantPlanId(data.plans[0].id);
        }
      }
    } catch {
      showToast('Impossible de charger la configuration LUMARÉEL TV.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const openEditPlan = (plan?: TvPassPlanClient) => {
    if (plan) {
      setEditingPlanId(plan.id);
      setPlanName(plan.name);
      setPlanPrice(String(plan.price));
      setPlanDescription(plan.description);
      setPlanRenewalPolicy(plan.renewalPolicy);
      setPlanConditions(plan.conditions);
      setPlanStatus(plan.status);
    } else {
      setEditingPlanId(null);
      setPlanName('');
      setPlanPrice('3500');
      setPlanDescription('');
      setPlanRenewalPolicy('Renouvellement manuel à chaque échéance. Aucun prélèvement automatique.');
      setPlanConditions('Accès personnel LUMARÉEL TV sans carte physique.');
      setPlanStatus('active');
    }
    setShowPlanForm(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tv/plans', {
        method: 'POST',
        headers: await getAdminAuthHeaders(true),
        body: JSON.stringify({
          id: editingPlanId || undefined,
          name: planName,
          price: Number(planPrice) || 0,
          currency: 'FCFA',
          durationDays: 30,
          billingCycleLabel: 'Par mois',
          description: planDescription,
          renewalPolicy: planRenewalPolicy,
          conditions: planConditions,
          autoRenew: false,
          status: planStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showToast(data?.error || 'Erreur lors de la sauvegarde.', 'error');
        return;
      }
      setPlans(data.plans || []);
      setShowPlanForm(false);
      showToast('Formule LUMARÉEL TV Pass enregistrée.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCardEligibility = async (patch: Partial<TvCardEligibilityClient>) => {
    const next = { ...cardEligibility, ...patch };
    setCardEligibility(next);
    try {
      const res = await fetch('/api/admin/tv/card-eligibility', {
        method: 'PUT',
        headers: await getAdminAuthHeaders(true),
        body: JSON.stringify(next),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setCardEligibility(data.cardEligibility);
        showToast('Permissions LUMARÉEL Card mises à jour.', 'success');
      }
    } catch {
      showToast('Erreur de sauvegarde des règles carte.', 'error');
    }
  };

  const toggleCardPlan = (planId: string) => {
    const exists = cardEligibility.enabledPlanIds.includes(planId);
    const updated = exists
      ? cardEligibility.enabledPlanIds.filter((id) => id !== planId)
      : [...cardEligibility.enabledPlanIds, planId];
    handleSaveCardEligibility({ enabledPlanIds: updated });
  };

  const handleAdminGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tv/subscriptions/grant', {
        method: 'POST',
        headers: await getAdminAuthHeaders(true),
        body: JSON.stringify({
          userEmail: grantEmail.trim(),
          userName: grantName.trim() || grantEmail.split('@')[0],
          planId: grantPlanId || plans[0]?.id,
          durationDays: Number(grantDays) || 30,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        showToast(data?.error || 'Impossible d’attribuer le TV Pass.', 'error');
        return;
      }
      setSubscriptions(data.subscriptions || []);
      setGrantEmail('');
      setGrantName('');
      showToast('Accès LUMARÉEL TV Pass attribué.', 'success');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubStatus = async (subId: string, status: TvSubscriptionStatus) => {
    try {
      const res = await fetch(`/api/admin/tv/subscriptions/${encodeURIComponent(subId)}/status`, {
        method: 'PATCH',
        headers: await getAdminAuthHeaders(true),
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setSubscriptions(data.subscriptions || []);
        showToast(`Statut mis à jour : ${status}.`, 'info');
      }
    } catch {
      showToast('Erreur lors de la mise à jour du statut.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-8 text-xs text-neutral-400">
        Chargement de la gestion LUMARÉEL TV Pass & permissions…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statut passerelle de paiement réelle */}
      <div
        className={`rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 ${
          paymentReady
            ? 'bg-emerald-500/10 border-emerald-500/25'
            : 'bg-[#161108] border-[#D4AF6A]/35'
        }`}
      >
        <div className="flex items-start gap-3">
          {paymentReady ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#D4AF6A] shrink-0 mt-0.5" />
          )}
          <div className="text-xs">
            <p className="font-agrandir-extrabold text-white">
              {paymentReady
                ? 'Passerelle PayMeTrust active pour LUMARÉEL TV Pass'
                : 'Paiement en ligne PayMeTrust non configuré (zéro simulation active)'}
            </p>
            <p className="text-neutral-300 mt-0.5">
              {paymentReady
                ? 'Les souscriptions au TV Pass sont confirmées uniquement après retour vérifié ou webhook HMAC PayMeTrust.'
                : 'Définissez PAYMETRUST_API_KEY, PAYMETRUST_SECRET_KEY et PAYMETRUST_WEBHOOK_SECRET côté serveur pour activer le paiement en ligne. En attendant, seuls les titulaires de carte éligible ou les attributions administrateur ont accès.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          className="min-h-[34px] px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs text-white inline-flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualiser</span>
        </button>
      </div>

      {/* 1. FORMULES LUMARÉEL TV PASS */}
      <section className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#D4AF6A] font-agrandir-semibold">
              ABONNEMENTS INDÉPENDANTS
            </p>
            <h2 className="font-agrandir-extrabold text-base text-white">
              Formules LUMARÉEL TV Pass
            </h2>
          </div>
          <button
            type="button"
            onClick={() => openEditPlan()}
            className="min-h-[36px] px-4 rounded-full bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouvelle formule</span>
          </button>
        </div>

        {showPlanForm && (
          <form
            onSubmit={handleSavePlan}
            className="rounded-xl border border-white/[0.14] bg-[#111] p-4 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Nom *</label>
                <input
                  type="text"
                  required
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="LUMARÉEL TV Pass · Mensuel"
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Prix (FCFA) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={planPrice}
                  onChange={(e) => setPlanPrice(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white font-mono"
                />
              </div>
              <div className="rounded-lg border border-white/[0.10] bg-[#1A1A1A] px-3 py-2.5">
                <label className="block text-[11px] text-neutral-400 mb-1">Durée fixe</label>
                <p className="text-xs font-mono text-white">30 jours · Mensuel</p>
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Statut</label>
                <select
                  value={planStatus}
                  onChange={(e) => setPlanStatus(e.target.value as any)}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
                >
                  <option value="active">Active (visible)</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archivée</option>
                </select>
              </div>
              <div className="flex items-end pb-2 text-[11px] text-[#D4AF6A]">Renouvellement manuel obligatoire</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Description</label>
                <input
                  type="text"
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Règle de renouvellement</label>
                <input
                  type="text"
                  value={planRenewalPolicy}
                  onChange={(e) => setPlanRenewalPolicy(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-400 mb-1">Conditions</label>
                <input
                  type="text"
                  value={planConditions}
                  onChange={(e) => setPlanConditions(e.target.value)}
                  className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowPlanForm(false)}
                className="min-h-[36px] px-4 rounded-lg text-xs text-neutral-400 hover:text-white cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="min-h-[36px] px-4 rounded-lg bg-[#D4AF6A] text-black text-xs font-agrandir-extrabold cursor-pointer"
              >
                Enregistrer la formule
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-white/[0.1] bg-[#111] p-4 flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Tv className="w-3.5 h-3.5 text-[#D4AF6A] shrink-0" />
                  <p className="text-sm font-agrandir-extrabold text-white truncate">{p.name}</p>
                </div>
                <p className="text-xs text-[#D4AF6A] font-mono">
                  {p.price.toLocaleString('fr-FR')} {p.currency} · {p.durationDays} jours ({p.billingCycleLabel})
                </p>
                <p className="text-[11px] text-neutral-400 line-clamp-2">{p.conditions}</p>
                <p className="text-[10px] uppercase tracking-wider text-neutral-500">
                  Statut : {p.status} · Renouvellement : {p.autoRenew ? 'Oui' : 'Non'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditPlan(p)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] text-[11px] font-agrandir-semibold text-white cursor-pointer shrink-0"
              >
                Modifier
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* 2. RÈGLES D'ÉLIGIBILITÉ LUMARÉEL CARD */}
      <section className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#D4AF6A]" />
          <h2 className="font-agrandir-extrabold text-base text-white">
            Éligibilité LUMARÉEL Card (système central de permissions)
          </h2>
        </div>

        <div className="flex flex-wrap gap-6 text-xs">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cardEligibility.cardAccessEnabled}
              onChange={(e) =>
                handleSaveCardEligibility({ cardAccessEnabled: e.target.checked })
              }
              className="accent-[#D4AF6A]"
            />
            <span>Activer l’accès LUMARÉEL TV inclus via LUMARÉEL Card</span>
          </label>

          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cardEligibility.blackCardIncludesVipTier}
              onChange={(e) =>
                handleSaveCardEligibility({ blackCardIncludesVipTier: e.target.checked })
              }
              className="accent-[#D4AF6A]"
            />
            <span>Inclure le niveau VIP TV pour les cartes actives éligibles</span>
          </label>
        </div>

        {membershipPlans.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-neutral-400">
              Formules de carte donnant automatiquement accès à LUMARÉEL TV (sans imposer de TV Pass) :
            </p>
            <div className="flex flex-wrap gap-2">
              {membershipPlans.map((mp) => {
                const enabled = cardEligibility.enabledPlanIds.includes(mp.id);
                return (
                  <button
                    key={mp.id}
                    type="button"
                    onClick={() => toggleCardPlan(mp.id)}
                    className={`min-h-[34px] px-3.5 rounded-full text-xs border transition-colors cursor-pointer ${
                      enabled
                        ? 'bg-[#D4AF6A]/15 border-[#D4AF6A] text-[#D4AF6A] font-agrandir-extrabold'
                        : 'bg-[#121212] border-white/[0.12] text-neutral-400'
                    }`}
                  >
                    {mp.name} {enabled ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* 3. ABONNEMENTS ACTIFS, EXPIRÉS & RÉVOQUÉS + ATTRIBUTION ADMIN */}
      <section className="rounded-2xl border border-white/[0.1] bg-[#0B0B0B] p-5 space-y-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-agrandir-semibold">
            SUIVI RÉEL DES DROITS
          </p>
          <h2 className="font-agrandir-extrabold text-base text-white">
            Abonnements LUMARÉEL TV Pass ({subscriptions.length})
          </h2>
        </div>

        <form
          onSubmit={handleAdminGrant}
          className="rounded-xl border border-white/[0.1] bg-[#111] p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
        >
          <div className="md:col-span-2">
            <label className="block text-[11px] text-neutral-400 mb-1">
              Attribuer un accès (e-mail membre)
            </label>
            <input
              type="email"
              required
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="membre@exemple.com"
              className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Nom</label>
            <input
              type="text"
              value={grantName}
              onChange={(e) => setGrantName(e.target.value)}
              placeholder="Prénom Nom"
              className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white"
            />
          </div>
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1">Durée (jours)</label>
            <input
              type="number"
              min={1}
              value={grantDays}
              onChange={(e) => setGrantDays(e.target.value)}
              className="w-full min-h-[38px] px-3 rounded-lg bg-[#1A1A1A] border border-white/[0.12] text-xs text-white font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="min-h-[38px] px-4 rounded-lg bg-white hover:bg-neutral-200 text-black text-xs font-agrandir-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Activer</span>
          </button>
        </form>

        {subscriptions.length === 0 ? (
          <p className="text-xs text-neutral-500 py-4 text-center">
            Aucun abonnement TV Pass enregistré pour le moment.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-agrandir-extrabold text-white truncate">
                      {sub.userName} ({sub.userEmail})
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-agrandir-extrabold uppercase ${
                        sub.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : sub.status === 'pending_payment'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      {sub.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-400">
                    {sub.planName} · Source : {sub.source === 'paymetrust' ? 'PayMeTrust' : 'Admin'}
                    {sub.expiresAt
                      ? ` · Expire le ${new Date(sub.expiresAt).toLocaleDateString('fr-FR')}`
                      : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sub.status !== 'active' ? (
                    <button
                      type="button"
                      onClick={() => handleUpdateSubStatus(sub.id, 'active')}
                      className="min-h-[32px] px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-agrandir-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Réactiver</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleUpdateSubStatus(sub.id, 'revoked')}
                      className="min-h-[32px] px-3 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-[11px] font-agrandir-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Révoquer</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
