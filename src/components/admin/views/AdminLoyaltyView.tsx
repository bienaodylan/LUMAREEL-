import React, { useEffect, useState } from 'react';
import {
  Gift,
  Users,
  Sliders,
  Sparkles,
  ShieldAlert,
  Loader2,
  Save,
  Plus,
  Ban,
  History,
  Image as ImageIcon,
} from 'lucide-react';
import { apiFetchJson } from '../../../lib/apiClient';
import { MediaPickerModal } from '../MediaPickerModal';

interface LoyaltyRule {
  key: string;
  label: string;
  description: string;
  points: number;
  validationTrigger: string;
  maxPerUser: number | null;
  isActive: boolean;
}

interface LoyaltyCampaign {
  id: string;
  title: string;
  description: string;
  ruleKey: string;
  bonusPoints: number;
  multiplier: number;
  maxClaims: number | null;
  claimsCount: number;
  isActive: boolean;
}

interface LoyaltyReward {
  id: string;
  title: string;
  description: string;
  benefitLabel: string;
  pointsCost: number;
  stockLimit: number | null;
  redeemedCount: number;
  coverUrl: string;
  conditions: string;
  isActive: boolean;
}

interface LoyaltyReferral {
  id: string;
  referrerEmail: string;
  referrerName: string;
  refereeEmail: string;
  refereeName: string;
  referralCode: string;
  status: 'pending' | 'validated' | 'rejected';
  rewardPoints: number;
  refereeBonusPoints: number;
  rejectionReason?: string;
  createdAt: string;
  validatedAt?: string;
}

interface LoyaltyTransaction {
  id: string;
  userEmail: string;
  points: number;
  transactionType: string;
  status: string;
  reason: string;
  source: string;
  createdAt: string;
}

interface MemberBalanceRow {
  userKey: string;
  email: string;
  name: string;
  referralCode: string;
  balance: number;
  totalEarned: number;
  totalSpent: number;
  referralsCount: number;
  validatedReferrals: number;
}

interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
}

interface AdminLoyaltyViewProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminLoyaltyView: React.FC<AdminLoyaltyViewProps> = ({ showToast }) => {
  const [tab, setTab] = useState<'overview' | 'rules' | 'rewards' | 'referrals'>('overview');
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const [rules, setRules] = useState<LoyaltyRule[]>([]);
  const [campaigns, setCampaigns] = useState<LoyaltyCampaign[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [referrals, setReferrals] = useState<LoyaltyReferral[]>([]);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [members, setMembers] = useState<MemberBalanceRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // New reward form
  const [rewTitle, setRewTitle] = useState('');
  const [rewBenefit, setRewBenefit] = useState('');
  const [rewCost, setRewCost] = useState(250);
  const [rewStock, setRewStock] = useState('');
  const [rewCover, setRewCover] = useState('');
  const [rewConditions, setRewConditions] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // New campaign form
  const [campTitle, setCampTitle] = useState('');
  const [campRuleKey, setCampRuleKey] = useState('ticket_purchase_vip');
  const [campBonus, setCampBonus] = useState(50);
  const [campMultiplier, setCampMultiplier] = useState(1);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [overview, audit] = await Promise.all([
        apiFetchJson<{
          success: boolean;
          rules: LoyaltyRule[];
          campaigns: LoyaltyCampaign[];
          rewards: LoyaltyReward[];
          referrals: LoyaltyReferral[];
          transactions: LoyaltyTransaction[];
          members: MemberBalanceRow[];
        }>('/api/admin/loyalty/overview'),
        apiFetchJson<{ success: boolean; logs: AuditLogEntry[] }>('/api/admin/audit-logs?limit=60'),
      ]);
      setRules(overview.rules || []);
      setCampaigns(overview.campaigns || []);
      setRewards(overview.rewards || []);
      setReferrals(overview.referrals || []);
      setTransactions(overview.transactions || []);
      setMembers(overview.members || []);
      setAuditLogs(audit.logs || []);
    } catch (err: any) {
      showToast(err.message || 'Impossible de charger le module fidélité.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSaveRule = async (rule: LoyaltyRule) => {
    setSavingKey(rule.key);
    try {
      const res = await apiFetchJson<{ success: boolean; rule: LoyaltyRule }>(
        `/api/admin/loyalty/rules/${rule.key}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            points: rule.points,
            maxPerUser: rule.maxPerUser,
            isActive: rule.isActive,
            description: rule.description,
          }),
        }
      );
      setRules((prev) => prev.map((r) => (r.key === rule.key ? res.rule : r)));
      showToast(`Règle "${rule.label}" enregistrée.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible de mettre à jour cette règle.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewTitle.trim() || rewCost <= 0) return;
    setSavingKey('new_reward');
    try {
      const res = await apiFetchJson<{ success: boolean; reward: LoyaltyReward }>('/api/admin/loyalty/rewards', {
        method: 'POST',
        body: JSON.stringify({
          title: rewTitle.trim(),
          benefitLabel: rewBenefit.trim() || rewTitle.trim(),
          description: rewBenefit.trim(),
          pointsCost: Number(rewCost),
          stockLimit: rewStock.trim() ? Number(rewStock) : null,
          coverUrl: rewCover.trim(),
          conditions: rewConditions.trim(),
          isActive: true,
        }),
      });
      setRewards((prev) => [...prev, res.reward]);
      setRewTitle('');
      setRewBenefit('');
      setRewCost(250);
      setRewStock('');
      setRewCover('');
      setRewConditions('');
      showToast('Récompense publiée dans le catalogue Gift Points.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Création impossible.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleReward = async (reward: LoyaltyReward) => {
    try {
      const res = await apiFetchJson<{ success: boolean; reward: LoyaltyReward }>('/api/admin/loyalty/rewards', {
        method: 'POST',
        body: JSON.stringify({ id: reward.id, isActive: !reward.isActive }),
      });
      setRewards((prev) => prev.map((r) => (r.id === reward.id ? res.reward : r)));
      showToast(res.reward.isActive ? 'Récompense activée.' : 'Récompense désactivée.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim()) return;
    setSavingKey('new_campaign');
    try {
      const res = await apiFetchJson<{ success: boolean; campaign: LoyaltyCampaign }>('/api/admin/loyalty/campaigns', {
        method: 'POST',
        body: JSON.stringify({
          title: campTitle.trim(),
          ruleKey: campRuleKey,
          bonusPoints: Number(campBonus) || 0,
          multiplier: Number(campMultiplier) || 1,
          isActive: true,
        }),
      });
      setCampaigns((prev) => [res.campaign, ...prev]);
      setCampTitle('');
      showToast('Campagne bonus créée et activée.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible de créer la campagne.', 'error');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleCampaign = async (campaign: LoyaltyCampaign) => {
    try {
      const res = await apiFetchJson<{ success: boolean; campaign: LoyaltyCampaign }>('/api/admin/loyalty/campaigns', {
        method: 'POST',
        body: JSON.stringify({ id: campaign.id, isActive: !campaign.isActive }),
      });
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? res.campaign : c)));
      showToast(res.campaign.isActive ? 'Campagne activée.' : 'Campagne mise en pause.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Erreur campagne.', 'error');
    }
  };

  const handleRejectReferral = async (referralId: string) => {
    try {
      const res = await apiFetchJson<{ success: boolean; referral: LoyaltyReferral }>(
        `/api/admin/loyalty/referrals/${referralId}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Rejeté manuellement par l’administration (anti-abus).' }),
        }
      );
      setReferrals((prev) => prev.map((r) => (r.id === referralId ? res.referral : r)));
      showToast('Parrainage en attente rejeté.', 'info');
    } catch (err: any) {
      showToast(err.message || 'Rejet impossible.', 'error');
    }
  };

  const totalDistributed = transactions
    .filter((t) => t.points > 0 && t.status === 'confirmed')
    .reduce((sum, t) => sum + t.points, 0);
  const validatedRefsCount = referrals.filter((r) => r.status === 'validated').length;
  const pendingRefsCount = referrals.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.2em] text-neutral-400">
            Moteur autonome & anti-abus
          </p>
          <h1 className="text-2xl font-agrandir-extrabold text-white mt-1">Gift Points & Parrainage</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-[#111] border border-white/10 p-1 rounded-2xl w-fit">
          {[
            { id: 'overview', label: 'Membres & Ledger', icon: Users },
            { id: 'rules', label: 'Règles auto', icon: Sliders },
            { id: 'rewards', label: 'Récompenses & Bonus', icon: Gift },
            { id: 'referrals', label: 'Parrainages & Audit', icon: ShieldAlert },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-agrandir-bold cursor-pointer transition-colors ${
                  tab === item.id ? 'bg-white text-black' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-neutral-400 text-xs">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement du moteur Gift Points...</span>
        </div>
      ) : (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase text-neutral-400">Points émis (confirmés)</div>
              <div className="text-2xl font-agrandir-extrabold text-white mt-1">
                {totalDistributed.toLocaleString('fr-FR')} pts
              </div>
            </div>
            <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase text-neutral-400">Membres suivis</div>
              <div className="text-2xl font-agrandir-extrabold text-white mt-1">{members.length}</div>
            </div>
            <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase text-neutral-400">Parrainages validés</div>
              <div className="text-2xl font-agrandir-extrabold text-emerald-400 mt-1">{validatedRefsCount}</div>
            </div>
            <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-4">
              <div className="text-[10px] uppercase text-neutral-400">En attente d’achat</div>
              <div className="text-2xl font-agrandir-extrabold text-amber-400 mt-1">{pendingRefsCount}</div>
            </div>
          </div>

          {/* TAB 1: MEMBERS & LEDGER */}
          {tab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4">
                <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                  Soldes membres (lecture seule · calcul serveur)
                </h2>
                {members.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-8 text-center">
                    Aucun membre actif pour le moment. Les soldes apparaîtront automatiquement dès la première inscription ou commande.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {members.map((m) => (
                      <div
                        key={m.userKey}
                        className="p-3 rounded-2xl bg-[#151515] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-agrandir-bold text-white truncate">{m.name}</div>
                          <div className="text-[11px] text-neutral-400 truncate">{m.email}</div>
                          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
                            Code : {m.referralCode} · {m.validatedReferrals} parrainage(s)
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-agrandir-extrabold text-white">{m.balance} pts</div>
                          <div className="text-[10px] text-neutral-500">
                            +{m.totalEarned} / -{m.totalSpent}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4">
                <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                  Journal transactionnel (Ledger)
                </h2>
                {transactions.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-8 text-center">
                    Aucune transaction enregistrée. Les écritures sont créées automatiquement par les achats, activations LUMARÉEL Black Card et parrainages validés.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-2xl bg-[#151515] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-agrandir-bold text-white truncate">{tx.reason}</div>
                          <div className="text-[11px] text-neutral-400 truncate">
                            {tx.userEmail} · {new Date(tx.createdAt).toLocaleString('fr-FR')}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-agrandir-extrabold shrink-0 ${
                            tx.points >= 0 ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {tx.points >= 0 ? `+${tx.points}` : tx.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUTOMATIC RULES */}
          {tab === 'rules' && (
            <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-6 space-y-4">
              <div className="border-b border-white/10 pb-3">
                <h2 className="text-sm font-agrandir-extrabold text-white">Règles d’attribution automatique</h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Les points ne sont jamais saisis manuellement : ils découlent uniquement de ces règles vérifiées côté serveur.
                </p>
              </div>
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.key}
                    className="p-4 rounded-2xl bg-[#141414] border border-white/10 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center"
                  >
                    <div className="lg:col-span-5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-agrandir-bold text-white">{rule.label}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-neutral-400">
                          {rule.key}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-1">{rule.description}</p>
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-[9px] uppercase text-neutral-500 mb-1">Points</label>
                      <input
                        type="number"
                        min={0}
                        value={rule.points}
                        onChange={(e) =>
                          setRules((prev) =>
                            prev.map((r) => (r.key === rule.key ? { ...r, points: Number(e.target.value) } : r))
                          )
                        }
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs font-agrandir-bold text-white"
                      />
                    </div>

                    <div className="lg:col-span-2">
                      <label className="block text-[9px] uppercase text-neutral-500 mb-1">Plafond / membre</label>
                      <input
                        type="number"
                        min={1}
                        placeholder="Illimité"
                        value={rule.maxPerUser ?? ''}
                        onChange={(e) =>
                          setRules((prev) =>
                            prev.map((r) =>
                              r.key === rule.key
                                ? { ...r, maxPerUser: e.target.value === '' ? null : Number(e.target.value) }
                                : r
                            )
                          )
                        }
                        className="w-full bg-black border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>

                    <div className="lg:col-span-3 flex items-center justify-end gap-3">
                      <label className="flex items-center gap-1.5 text-[11px] text-neutral-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rule.isActive}
                          onChange={(e) =>
                            setRules((prev) =>
                              prev.map((r) => (r.key === rule.key ? { ...r, isActive: e.target.checked } : r))
                            )
                          }
                          className="accent-emerald-400"
                        />
                        <span>Actif</span>
                      </label>
                      <button
                        type="button"
                        disabled={savingKey === rule.key}
                        onClick={() => handleSaveRule(rule)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black text-[11px] font-agrandir-extrabold cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Sauver</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: REWARDS & CAMPAIGNS */}
          {tab === 'rewards' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rewards */}
              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-5">
                <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                  Catalogue des récompenses
                </h2>

                <form onSubmit={handleCreateReward} className="p-4 rounded-2xl bg-[#151515] border border-white/10 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      required
                      value={rewTitle}
                      onChange={(e) => setRewTitle(e.target.value)}
                      placeholder="Titre récompense"
                      className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="number"
                      required
                      min={10}
                      value={rewCost}
                      onChange={(e) => setRewCost(Number(e.target.value))}
                      placeholder="Coût en points"
                      className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <input
                    type="text"
                    value={rewBenefit}
                    onChange={(e) => setRewBenefit(e.target.value)}
                    placeholder="Avantage exact (ex: -5 000 FCFA sur un billet)"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      value={rewStock}
                      onChange={(e) => setRewStock(e.target.value)}
                      placeholder="Stock (optionnel)"
                      className="w-36 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="text"
                      value={rewCover}
                      onChange={(e) => setRewCover(e.target.value)}
                      placeholder="Visuel (URL)"
                      className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingKey === 'new_reward'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-agrandir-extrabold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {rewards.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-2xl bg-[#151515] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-agrandir-bold text-white truncate">{r.title}</div>
                        <div className="text-[11px] text-neutral-400 truncate">{r.benefitLabel || r.description}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">
                          {r.pointsCost} pts · {r.redeemedCount} débloquée(s)
                          {r.stockLimit ? ` / ${r.stockLimit}` : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleReward(r)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-agrandir-bold cursor-pointer ${
                          r.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-neutral-400 border border-white/10'
                        }`}
                      >
                        {r.isActive ? 'Actif' : 'Pause'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaigns */}
              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-5">
                <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Campagnes bonus & multiplicateurs
                </h2>

                <form onSubmit={handleCreateCampaign} className="p-4 rounded-2xl bg-[#151515] border border-white/10 space-y-3">
                  <input
                    type="text"
                    required
                    value={campTitle}
                    onChange={(e) => setCampTitle(e.target.value)}
                    placeholder="Nom de la campagne (ex: Week-end Double Points)"
                    className="w-full bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={campRuleKey}
                      onChange={(e) => setCampRuleKey(e.target.value)}
                      className="bg-black border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white"
                    >
                      {rules.map((r) => (
                        <option key={r.key} value={r.key}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={campBonus}
                      onChange={(e) => setCampBonus(Number(e.target.value))}
                      placeholder="Bonus pts"
                      className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                    <input
                      type="number"
                      min={1}
                      step={0.5}
                      value={campMultiplier}
                      onChange={(e) => setCampMultiplier(Number(e.target.value))}
                      placeholder="Multiplicateur"
                      className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={savingKey === 'new_campaign'}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-agrandir-extrabold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Lancer la campagne
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  {campaigns.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-2xl bg-[#151515] border border-white/5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-agrandir-bold text-white truncate">{c.title}</div>
                        <div className="text-[11px] text-neutral-400">
                          Règle : {c.ruleKey} · +{c.bonusPoints} pts · ×{c.multiplier}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCampaign(c)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-agrandir-bold cursor-pointer ${
                          c.isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-neutral-400 border border-white/10'
                        }`}
                      >
                        {c.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REFERRALS & AUDIT LOGS */}
          {tab === 'referrals' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4">
                <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white">
                  Suivi des parrainages (anti-abus)
                </h2>
                {referrals.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-8 text-center">
                    Aucun parrainage enregistré pour l’instant.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {referrals.map((ref) => (
                      <div
                        key={ref.id}
                        className="p-3.5 rounded-2xl bg-[#151515] border border-white/5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-agrandir-bold text-white truncate">
                            {ref.referrerEmail} → {ref.refereeEmail}
                          </div>
                          <div className="text-[11px] text-neutral-400">
                            Code {ref.referralCode} · {new Date(ref.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                          {ref.rejectionReason && (
                            <div className="text-[10px] text-red-400 mt-0.5">{ref.rejectionReason}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-agrandir-bold uppercase ${
                              ref.status === 'validated'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : ref.status === 'rejected'
                                ? 'bg-red-500/15 text-red-300'
                                : 'bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {ref.status === 'validated' ? 'Validé' : ref.status === 'rejected' ? 'Rejeté' : 'En attente'}
                          </span>
                          {ref.status === 'pending' && (
                            <button
                              type="button"
                              onClick={() => handleRejectReferral(ref.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                              title="Rejeter ce parrainage suspect"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#0e0e0e] border border-white/10 rounded-3xl p-5 space-y-4">
                <h2 className="text-xs font-agrandir-extrabold uppercase tracking-wider text-white flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-neutral-400" />
                  Journal d’audit administrateur
                </h2>
                {auditLogs.length === 0 ? (
                  <p className="text-xs text-neutral-500 py-8 text-center">Aucune action d’administration enregistrée.</p>
                ) : (
                  <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 rounded-2xl bg-[#151515] border border-white/5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-agrandir-bold text-white">{log.action}</span>
                          <span className="text-[10px] text-neutral-500">
                            {new Date(log.createdAt).toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {log.actorEmail} · {log.entityType}
                          {log.entityId ? ` (${log.entityId})` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <MediaPickerModal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        defaultFolder="rewards"
        title="Choisir un visuel de récompense"
        onSelect={(url) => setRewCover(url)}
      />
    </div>
  );
};
