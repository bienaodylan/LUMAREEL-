import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { getAuthHeaders } from '../../../utils/authSession';
import {
  MembershipCard,
  MembershipEdition,
  MembershipPlan,
  MembershipBenefit,
  MembershipReader,
  MembershipScanLog,
  MembershipRedemption,
} from '../../../types';
import {
  Crown,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  CreditCard,
  Radio,
  QrCode,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  Plus,
  ArrowRight,
  TrendingUp,
  Box,
  Truck,
  Eye,
  Lock,
  Layers,
  Settings,
  Activity,
  History,
  FileSpreadsheet
} from 'lucide-react';

type AdminMembershipSubTab = 'overview' | 'members' | 'editions' | 'benefits';

export const AdminMembershipView: React.FC = () => {
  const { showToast } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<AdminMembershipSubTab>('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [stats, setStats] = useState<any>(null);
  const [edition, setEdition] = useState<MembershipEdition | null>(null);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [cards, setCards] = useState<MembershipCard[]>([]);
  const [benefits, setBenefits] = useState<MembershipBenefit[]>([]);
  const [redemptions, setRedemptions] = useState<MembershipRedemption[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Selected card detail modal
  const [selectedCard, setSelectedCard] = useState<MembershipCard | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [physicalTrackingInput, setPhysicalTrackingInput] = useState('');
  const [rotatedQrToken, setRotatedQrToken] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      const [ovRes, cardsRes, plansRes, benefitsRes] = await Promise.all([
        fetch('/api/membership/admin/overview', { credentials: 'include', headers }),
        fetch('/api/membership/admin/cards', { credentials: 'include', headers }),
        fetch('/api/membership/plans', { credentials: 'include', headers }),
        fetch('/api/membership/benefits', { credentials: 'include', headers }),
      ]);

      const [ovData, cardsData, plansData, benefitsData] = await Promise.all([
        ovRes.json(),
        cardsRes.json(),
        plansRes.json(),
        benefitsRes.json(),
      ]);

      if (ovData.success) {
        setStats(ovData.stats);
        setEdition(ovData.activeEdition);
        setRedemptions(ovData.recentRedemptions || []);
      }
      if (cardsData.success) setCards(cardsData.cards || []);
      if (plansData.success) setPlans(plansData.plans || []);
      if (benefitsData.success) setBenefits(benefitsData.benefits || []);
    } catch (err) {
      console.error('Error fetching admin membership data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCardStatus = async (cardId: string, newStatus: 'active' | 'suspended' | 'revoked') => {
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/admin/cards/${cardId}/status`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ status: newStatus, reason: actionReason || 'Décision administrative' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur de mise à jour.');
      showToast(`Statut de la carte mis à jour : ${newStatus.toUpperCase()}`, 'success');
      setSelectedCard(null);
      setActionReason('');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdatePhysicalStatus = async (cardId: string, physicalStatus: 'in_production' | 'shipped' | 'delivered') => {
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/admin/cards/${cardId}/physical-status`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ physicalStatus, trackingNumber: physicalTrackingInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur de mise à jour physique.');
      showToast('Statut de fabrication et livraison mis à jour.', 'success');
      setSelectedCard(null);
      setPhysicalTrackingInput('');
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleRotateQrToken = async (cardId: string) => {
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/admin/cards/${cardId}/rotate-token`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ actorId: 'ADMIN' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur de rotation du jeton.');
      if (!data.token || typeof data.token !== 'string') throw new Error('Le serveur n’a pas retourné le nouveau jeton.');
      setRotatedQrToken(data.token);
      showToast('Nouveau jeton QR généré. L’ancien jeton a été révoqué.', 'success');
      setSelectedCard(null);
      fetchDashboardData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Filtered Cards
  const filteredCards = cards.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.cardStatus === statusFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      c.cardNumber.toLowerCase().includes(q) ||
      c.cardholderName.toLowerCase().includes(q) ||
      c.cardholderEmail.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* Header Central */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              MODULE CENTRAL
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[#d4af37]/10 text-[9px] font-agrandir-bold text-[#d4af37] uppercase border border-[#d4af37]/30">
              IDENTIFIANT QR CRYPTOGRAPHIQUE &amp; CARTE PVC
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white mt-1">
            LUMARÉEL MEMBERSHIP
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Gestion des 100 membres Founders, des jetons QR révocables, des privilèges et des points de contrôle événementiels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition-colors cursor-pointer"
            title="Rafraîchir les données"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div className="flex overflow-x-auto scrollbar-none gap-2 p-1.5 rounded-2xl bg-[#0f0f0f] border border-white/10 text-xs">
        {[
          { id: 'overview' as AdminMembershipSubTab, label: 'Vue d’ensemble', icon: TrendingUp },
          { id: 'members' as AdminMembershipSubTab, label: 'Membres & Cartes', count: cards.length, icon: Users },
          { id: 'editions' as AdminMembershipSubTab, label: 'Éditions & Formules', icon: Layers },
          { id: 'benefits' as AdminMembershipSubTab, label: 'Catalogue Avantages', icon: Crown },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl uppercase tracking-wider font-agrandir-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-black font-agrandir-extrabold shadow-md'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive ? 'bg-black text-white' : 'bg-white/10 text-neutral-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* --- ONGLET 1 : VUE D'ENSEMBLE & KPIS --- */}
      {activeSubTab === 'overview' && (
        <div className="space-y-8 animate-fadeIn">
          
          {/* Grille des 4 KPIs Majeurs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1 : Quota Founders */}
            <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-agrandir-bold uppercase tracking-wider">Quota Attribué</span>
                <Crown className="w-4 h-4 text-[#d4af37]" />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
                {stats?.allocated || 0} <span className="text-base text-neutral-500 font-normal">/ {stats?.quota || 100}</span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Places restantes</span>
                <strong className="text-[#d4af37] font-mono">{stats?.remainingQuota || 100}</strong>
              </div>
            </div>

            {/* KPI 2 : Cartes Actives */}
            <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-agrandir-bold uppercase tracking-wider">Cartes Actives</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {stats?.activeCards || 0}
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Suspendues / Révoquées</span>
                <span className="text-neutral-300 font-mono">
                  {stats?.suspendedCards || 0} / {stats?.revokedCards || 0}
                </span>
              </div>
            </div>

            {/* KPI 3 : Revenus Membership */}
            <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-agrandir-bold uppercase tracking-wider">Chiffre d’affaires</span>
                <CreditCard className="w-4 h-4 text-[#d4af37]" />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
                {(stats?.totalRevenue || 0).toLocaleString('fr-FR')} <span className="text-sm text-[#d4af37]">FCFA</span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Commandes confirmées</span>
                <span className="text-neutral-300 font-mono">{stats?.completedOrders || 0}</span>
              </div>
            </div>

            {/* KPI 4 : Puces Sécurisées Scellées */}
            <div className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span className="font-agrandir-bold uppercase tracking-wider">Puces NXP Scellées</span>
                <Radio className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400">
                {cards.filter(c => c.chipUid).length}
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Sans contact DESFire</span>
                <span className="text-[#d4af37] font-mono font-bold">13.56 MHz</span>
              </div>
            </div>

          </div>

          {/* Deux colonnes : Dernières Adhésions Membres & Dernières consommations de privilèges */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Dernières Adhésions & Activations de Cartes */}
            <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm text-white uppercase">Dernières Adhésions Membres</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('members')}
                  className="text-xs text-[#d4af37] hover:underline cursor-pointer"
                >
                  Voir tous les membres
                </button>
              </div>

              {cards.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">Aucun membre enregistré pour le moment.</p>
              ) : (
                <div className="space-y-2.5">
                  {cards.slice(0, 5).map((card) => (
                    <div key={card.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono font-bold text-white">{card.cardNumber}</div>
                        <div className="text-[10px] text-neutral-400">{card.cardholderName} · {card.cardholderEmail}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          card.cardStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {card.cardStatus === 'active' ? 'Active' : 'En attente'}
                        </span>
                        <div className="text-[9px] text-[#d4af37] font-mono mt-0.5">
                          {card.chipUid || 'Sans puce'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dernières consommations de privilèges */}
            <div className="p-6 rounded-2xl bg-[#0d0d0d] border border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-[#d4af37]" />
                  <h3 className="font-agrandir-bold text-sm text-white uppercase">Consommations de Privilèges</h3>
                </div>
              </div>

              {redemptions.length === 0 ? (
                <p className="text-xs text-neutral-500 py-6 text-center">Aucun avantage consommé récemment.</p>
              ) : (
                <div className="space-y-2.5">
                  {redemptions.slice(0, 5).map((red) => (
                    <div key={red.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-agrandir-bold text-white uppercase">{red.benefitName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{red.cardNumber} · {red.cardholderName}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-[9px] text-[#d4af37]">{red.redemptionReference}</span>
                        <div className="text-[9px] text-neutral-500 font-mono mt-0.5">
                          {new Date(red.redeemedAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* --- ONGLET 2 : MEMBRES & CARTES --- */}
      {activeSubTab === 'members' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Barre de recherche et filtres */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher (LMR-2026-..., nom, email)..."
                className="w-full bg-[#121212] border border-white/15 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {['all', 'active', 'suspended', 'revoked'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs uppercase font-agrandir-semibold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-black font-agrandir-bold'
                      : 'bg-white/5 text-neutral-400 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Toutes' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Tableau des Membres */}
          <div className="rounded-2xl border border-white/10 bg-[#0c0c0c] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5 text-[10px] uppercase font-mono tracking-wider text-neutral-400">
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Numéro Permanent</th>
                    <th className="py-3 px-4">Titulaire</th>
                    <th className="py-3 px-4">Validité</th>
                    <th className="py-3 px-4">Statut Carte</th>
                    <th className="py-3 px-4">Carte Physique</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredCards.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-neutral-500">
                        Aucune carte trouvée pour cette recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredCards.map((c) => (
                      <tr key={c.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-mono text-neutral-500">#{c.cardSequence}</td>
                        <td className="py-3 px-4 font-mono font-bold text-[#d4af37]">{c.cardNumber}</td>
                        <td className="py-3 px-4">
                          <div className="font-agrandir-bold text-white">{c.cardholderName}</div>
                          <div className="text-[10px] text-neutral-400 font-mono">{c.cardholderEmail}</div>
                        </td>
                        <td className="py-3 px-4 font-mono text-neutral-300">
                          {new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-agrandir-bold uppercase tracking-wider ${
                              c.cardStatus === 'active'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : c.cardStatus === 'suspended'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {c.cardStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[10px] text-neutral-300 font-mono uppercase">
                            {c.physicalCardStatus.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedCard(c)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-[#d4af37] hover:text-black font-agrandir-bold text-xs uppercase tracking-wider text-white transition-all cursor-pointer"
                          >
                            Gérer
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- ONGLET 3 : ÉDITIONS & FORMULES --- */}
      {activeSubTab === 'editions' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                  ÉDITION COMMERCIALE EN COURS
                </span>
                <h3 className="text-xl font-agrandir-extrabold uppercase text-white mt-1">
                  {edition?.name || 'LUMARÉEL FOUNDERS EDITION'}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {edition?.status?.toUpperCase() || 'ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-neutral-400 block mb-1">Code Édition</span>
                <strong className="font-mono text-white text-sm">{edition?.editionCode || 'FOUNDERS_2026'}</strong>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-neutral-400 block mb-1">Quota Strict</span>
                <strong className="font-mono text-[#d4af37] text-sm">{edition?.quota || 100} membres max</strong>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <span className="text-neutral-400 block mb-1">Cartes Émises</span>
                <strong className="font-mono text-white text-sm">{edition?.allocatedCount || 0} / {edition?.quota || 100}</strong>
              </div>
            </div>
          </div>

          {/* Formules Tarifaires */}
          <div className="space-y-4">
            <h3 className="text-sm font-agrandir-bold uppercase text-white tracking-wider">
              Formules Tarifaires Associées
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((p) => (
                <div key={p.id} className="p-5 rounded-2xl bg-[#0e0e0e] border border-white/10 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-agrandir-bold text-white uppercase">{p.name}</h4>
                    <span className="font-mono text-sm font-bold text-[#d4af37]">
                      {p.price.toLocaleString('fr-FR')} {p.currency}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-light">{p.description}</p>
                  <div className="border-t border-white/10 pt-2 flex justify-between text-[11px] text-neutral-500 font-mono">
                    <span>Durée : {p.durationMonths} mois</span>
                    <span>Carte physique PVC incluse</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 4 : CATALOGUE DES AVANTAGES --- */}
      {activeSubTab === 'benefits' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((b) => (
              <div key={b.id} className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-agrandir-bold uppercase px-2 py-0.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30">
                      {b.benefitType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Limite : {b.perMemberLimit} / membre
                    </span>
                  </div>
                  <h4 className="font-agrandir-bold text-sm text-white uppercase">{b.name}</h4>
                  <p className="text-xs text-neutral-400 font-light leading-relaxed mt-1">{b.description}</p>
                </div>

                <div className="border-t border-white/10 pt-2 flex justify-between items-center text-[10px] text-neutral-500 font-mono">
                  <span>Consommations globales : {b.currentRedemptions}</span>
                  <span className="text-emerald-400">Actif</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* MODAL GESTION DÉTAILLÉE D'UNE CARTE */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0e0e0e] border border-white/20 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
                  GESTION DE CARTE
                </span>
                <h3 className="text-xl font-agrandir-extrabold text-white uppercase mt-0.5">
                  {selectedCard.cardNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCard(null)}
                className="w-8 h-8 rounded-full bg-white/10 text-white hover:bg-white/20 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Infos Titulaire */}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-neutral-400">Titulaire :</span><strong className="text-white">{selectedCard.cardholderName}</strong></div>
              <div className="flex justify-between"><span className="text-neutral-400">Email :</span><span className="font-mono text-neutral-300">{selectedCard.cardholderEmail}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Statut actuel :</span><span className="font-bold text-[#d4af37] uppercase">{selectedCard.cardStatus}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Statut physique :</span><span className="font-mono text-neutral-300 uppercase">{selectedCard.physicalCardStatus}</span></div>
            </div>

            {/* Changement de statut */}
            <div className="space-y-3">
              <label className="block text-[10px] uppercase font-agrandir-bold text-neutral-400">
                Changer le statut du membership :
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateCardStatus(selectedCard.id, 'active')}
                  className="py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-agrandir-bold text-xs uppercase cursor-pointer"
                >
                  Activer
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCardStatus(selectedCard.id, 'suspended')}
                  className="py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-agrandir-bold text-xs uppercase cursor-pointer"
                >
                  Suspendre
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateCardStatus(selectedCard.id, 'revoked')}
                  className="py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 font-agrandir-bold text-xs uppercase cursor-pointer"
                >
                  Révoquer
                </button>
              </div>
            </div>

            {/* Suivi Carte Physique */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="block text-[10px] uppercase font-agrandir-bold text-neutral-400">
                Mettre à jour la fabrication / expédition physique :
              </label>
              <input
                type="text"
                value={physicalTrackingInput}
                onChange={(e) => setPhysicalTrackingInput(e.target.value)}
                placeholder="Numéro de suivi coursier / transporteur..."
                className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdatePhysicalStatus(selectedCard.id, 'in_production')}
                  className="py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[10px] font-bold uppercase cursor-pointer"
                >
                  En Fabrication
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdatePhysicalStatus(selectedCard.id, 'shipped')}
                  className="py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-[10px] font-bold uppercase cursor-pointer"
                >
                  Expédiée
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdatePhysicalStatus(selectedCard.id, 'delivered')}
                  className="py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase cursor-pointer"
                >
                  Livrée
                </button>
              </div>
            </div>

            {/* Rotation du jeton QR */}
            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
              <span className="text-[11px] text-neutral-400">En cas de compromission :</span>
              <button
                type="button"
                onClick={() => handleRotateQrToken(selectedCard.id)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-agrandir-semibold uppercase cursor-pointer"
              >
                Régénérer jeton QR
              </button>
            </div>
          </div>
        </div>
      )}

      {rotatedQrToken && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="w-full max-w-xl rounded-3xl border border-[#d4af37]/30 bg-[#101010] p-6 sm:p-8 space-y-5">
            <div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#d4af37] font-bold">Sécurité Membership</div>
              <h3 className="text-xl text-white font-agrandir-extrabold mt-1">Nouveau jeton QR</h3>
              <p className="text-xs text-neutral-400 mt-2">Ce jeton est affiché une seule fois. Copiez-le et transmettez-le uniquement au service chargé de réencoder la carte.</p>
            </div>
            <div className="rounded-xl bg-black border border-white/10 p-4 font-mono text-xs text-white break-all select-text">{rotatedQrToken}</div>
            <div className="flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { navigator.clipboard.writeText(rotatedQrToken).then(() => showToast('Jeton copié.', 'success')).catch(() => showToast('Copie impossible sur ce navigateur.', 'error')); }} className="px-4 py-2.5 rounded-xl bg-white text-black text-xs font-bold">Copier le jeton</button>
              <button type="button" onClick={() => setRotatedQrToken(null)} className="px-4 py-2.5 rounded-xl border border-white/20 text-white text-xs font-bold">Fermer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
