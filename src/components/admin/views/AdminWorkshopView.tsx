import React, { useState, useEffect } from 'react';
import {
  Printer,
  Package,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Check,
  X,
  QrCode,
  Layers,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  History,
  Box,
  Truck,
  FileText,
  Scan,
  RefreshCw,
  Cpu,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  MembershipPhysicalCardOrder,
  MembershipCardInventory,
  MembershipPrintJob,
  MembershipCardQualityCheck,
  MembershipCard,
  PhysicalCardProductionStatus,
} from '../../../types';
import { CardPrintingStudio } from './CardPrintingStudio';

export const AdminWorkshopView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'studio' | 'queue' | 'batch' | 'qc' | 'inventory' | 'printers' | 'history'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Données de l'Atelier
  const [overview, setOverview] = useState<any>(null);
  const [orders, setOrders] = useState<MembershipPhysicalCardOrder[]>([]);
  const [inventory, setInventory] = useState<MembershipCardInventory[]>([]);
  const [jobs, setJobs] = useState<MembershipPrintJob[]>([]);
  const [cards, setCards] = useState<MembershipCard[]>([]);

  // Filtres
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sélection pour le Studio
  const [selectedCardForStudio, setSelectedCardForStudio] = useState<MembershipCard | undefined>();

  // Sélection pour le Batch
  const [selectedCardIdsForBatch, setSelectedCardIdsForBatch] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchNotice, setBatchNotice] = useState<string | null>(null);

  // Modal de Réimpression
  const [reprintModalOpen, setReprintModalOpen] = useState(false);
  const [reprintTargetCard, setReprintTargetCard] = useState<MembershipCard | null>(null);
  const [reprintReason, setReprintReason] = useState<
    'damaged' | 'lost' | 'defect' | 'data_update' | 'member_request'
  >('damaged');
  const [reprintRotateQr, setReprintRotateQr] = useState(false);
  const [reprintNotes, setReprintNotes] = useState('');
  const [reprintSubmitting, setReprintSubmitting] = useState(false);

  // Station de Contrôle Qualité (QC)
  const [qcSelectedOrderId, setQcSelectedOrderId] = useState<string>('');
  const [qcScannedQrInput, setQcScannedQrInput] = useState('');
  const [qcVisualPassed, setQcVisualPassed] = useState(true);
  const [qcCenteringPassed, setQcCenteringPassed] = useState(true);
  const [qcContrastPassed, setQcContrastPassed] = useState(true);
  const [qcNoScratchesPassed, setQcNoScratchesPassed] = useState(true);
  const [qcOperatorNotes, setQcOperatorNotes] = useState('');
  const [qcSubmitting, setQcSubmitting] = useState(false);
  const [qcResult, setQcResult] = useState<{ success: boolean; message: string } | null>(null);

  // Édition d'Inventaire
  const [editingInventoryItem, setEditingInventoryItem] = useState<MembershipCardInventory | null>(null);
  const [inventoryUpdateQty, setInventoryUpdateQty] = useState<number>(0);

  // Simulateur Atelier Toggle
  const [simulatorModeActive, setSimulatorModeActive] = useState(true);

  const fetchWorkshopData = async () => {
    try {
      setRefreshing(true);
      const [ovRes, ordRes, invRes, jobRes, crdRes] = await Promise.all([
        fetch('/api/membership/workshop/overview'),
        fetch('/api/membership/workshop/orders'),
        fetch('/api/membership/workshop/inventory'),
        fetch('/api/membership/workshop/jobs'),
        fetch('/api/membership/admin/cards'),
      ]);

      const [ovData, ordData, invData, jobData, crdData] = await Promise.all([
        ovRes.json(),
        ordRes.json(),
        invRes.json(),
        jobRes.json(),
        crdRes.json(),
      ]);

      if (ovData.success) setOverview(ovData.overview);
      if (ordData.success) setOrders(ordData.orders);
      if (invData.success) setInventory(invData.inventory);
      if (jobData.success) setJobs(jobData.jobs);
      if (crdData.success) setCards(crdData.cards);

      if (ovData.overview) {
        setSimulatorModeActive(ovData.overview.simulatorModeActive);
      }
    } catch (e) {
      console.error('Erreur chargement données atelier:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkshopData();
  }, []);

  // Action : mise à jour du statut d'une commande
  const handleUpdateOrderStatus = async (orderId: string, status: PhysicalCardProductionStatus) => {
    try {
      const res = await fetch(`/api/membership/workshop/orders/${orderId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          operator: 'Superviseur Atelier',
          note: `Passage manuel au statut ${status}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchWorkshopData();
      } else {
        alert(data.error || 'Erreur mise à jour');
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    }
  };

  // Action : impression unitaire depuis la file d'attente
  const handlePrintSingleCard = async (cardId: string) => {
    try {
      const res = await fetch('/api/membership/workshop/print', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId,
          operatorId: 'Opérateur File Attente',
          duplex: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Impression lancée pour la carte. Job: ${data.job?.jobCode}`);
        fetchWorkshopData();
      } else {
        alert(data.error || 'Erreur impression');
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    }
  };

  // Action : lancement d'un lot d'impression groupé
  const handleExecuteBatchPrint = async () => {
    if (selectedCardIdsForBatch.length === 0) return;
    setBatchProcessing(true);
    setBatchNotice(null);
    try {
      const res = await fetch('/api/membership/workshop/print-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardIds: selectedCardIdsForBatch,
          operatorId: 'Opérateur Batch Atelier',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBatchNotice(
          `Lot ${data.batchId} exécuté avec succès : ${data.jobs?.length || 0} cartes imprimées.`
        );
        setSelectedCardIdsForBatch([]);
        fetchWorkshopData();
      } else {
        alert(data.error || 'Erreur impression groupée');
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setBatchProcessing(false);
    }
  };

  // Action : soumission du contrôle qualité
  const handlePerformQualityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qcSelectedOrderId || !qcScannedQrInput.trim()) {
      alert('Veuillez sélectionner une commande et scanner le QR imprimé.');
      return;
    }

    const order = orders.find((o) => o.id === qcSelectedOrderId);
    if (!order) return;

    setQcSubmitting(true);
    setQcResult(null);

    try {
      const res = await fetch('/api/membership/workshop/quality-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: order.cardId,
          scannedQrToken: qcScannedQrInput.trim(),
          visualCheckPassed: qcVisualPassed,
          centeringPassed: qcCenteringPassed,
          contrastPassed: qcContrastPassed,
          noScratchesPassed: qcNoScratchesPassed,
          operatorId: 'Contrôleur Qualité Atelier',
          operatorNotes: qcOperatorNotes,
        }),
      });

      const data = await res.json();
      setQcResult({
        success: data.success,
        message: data.message,
      });

      if (data.success) {
        setQcScannedQrInput('');
        setQcOperatorNotes('');
      }

      fetchWorkshopData();
    } catch (e: any) {
      alert(`Erreur réseau QC: ${e.message}`);
    } finally {
      setQcSubmitting(false);
    }
  };

  // Action : soumission de réimpression
  const handleExecuteReprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reprintTargetCard) return;

    setReprintSubmitting(true);
    try {
      const res = await fetch('/api/membership/workshop/reprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardId: reprintTargetCard.id,
          reason: reprintReason,
          rotateQr: reprintRotateQr,
          notes: reprintNotes,
          operatorId: 'Superviseur Atelier',
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert(
          `Réimpression ordonnée pour ${reprintTargetCard.cardNumber} (${reprintTargetCard.cardholderName}). Job: ${data.job?.jobCode}`
        );
        setReprintModalOpen(false);
        setReprintTargetCard(null);
        setReprintNotes('');
        fetchWorkshopData();
      } else {
        alert(data.error || 'Erreur lors de la réimpression');
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    } finally {
      setReprintSubmitting(false);
    }
  };

  // Action : mise à jour du stock inventaire
  const handleSaveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInventoryItem) return;

    try {
      const res = await fetch(`/api/membership/workshop/inventory/${editingInventoryItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalQuantity: Number(inventoryUpdateQty),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingInventoryItem(null);
        fetchWorkshopData();
      } else {
        alert(data.error || 'Erreur inventaire');
      }
    } catch (e: any) {
      alert(`Erreur: ${e.message}`);
    }
  };

  // Action : bascule du mode simulateur
  const handleToggleSimulator = async () => {
    try {
      const res = await fetch('/api/membership/workshop/toggle-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !simulatorModeActive }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulatorModeActive(data.simulatorModeActive);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtrage des commandes physiques
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.productionStatus !== orderStatusFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        o.cardNumber.toLowerCase().includes(q) ||
        o.cardholderName.toLowerCase().includes(q) ||
        o.orderNumber.toLowerCase().includes(q) ||
        o.cardholderEmail.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* BANNIÈRE SUPÉRIEURE : LUMARÉEL WORKSHOP & MODE SIMULATEUR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 sm:p-6 rounded-3xl bg-[#080808] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-agrandir-bold tracking-[0.25em] text-[#d4af37] uppercase">
              LUMARÉEL WORKSHOP &amp; PRODUCTION PVC
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-mono">
              Atelier Central Abidjan
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-agrandir-extrabold uppercase text-white mt-1">
            ATELIER D’IMPRESSION &amp; CONTRÔLE QUALITÉ DES CARTES
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Personnalisation des 100 membres Founders, génération des QR haute résolution, file de fabrication et validation optique.
          </p>
        </div>

        {/* Indicateur de mode Machine vs Simulateur */}
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#141414] border border-white/15 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-neutral-300 font-agrandir-semibold">
              {simulatorModeActive ? 'Simulateur Atelier Actif' : 'Pilote Machine Connecté'}
            </span>
            <button
              type="button"
              onClick={handleToggleSimulator}
              className="ml-2 text-[10px] font-mono text-[#d4af37] hover:underline cursor-pointer"
            >
              [Basculer]
            </button>
          </div>

          <button
            type="button"
            onClick={fetchWorkshopData}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-neutral-300 hover:text-white transition-all cursor-pointer"
            title="Actualiser les données de l'atelier"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#d4af37]' : ''}`} />
          </button>
        </div>
      </div>

      {/* NAVIGATION INTERNE PAR ONGLETS */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-2 overflow-x-auto text-xs font-agrandir-bold uppercase tracking-wider scrollbar-none">
        {[
          { id: 'overview', label: 'Vue Globale', icon: Layers },
          { id: 'studio', label: 'Card Printing Studio', icon: Sliders },
          { id: 'queue', label: `File d'Impression (${orders.length})`, icon: Printer },
          { id: 'batch', label: 'Production par Lots', icon: Box },
          { id: 'qc', label: 'Contrôle Qualité (QC)', icon: ShieldCheck },
          { id: 'inventory', label: 'Inventaire Consommables', icon: Package },
          { id: 'printers', label: 'Matériel & Scanners', icon: Cpu },
          { id: 'history', label: 'Historique des Tirages', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#d4af37] text-black font-agrandir-extrabold shadow-md shadow-[#d4af37]/20'
                  : 'bg-[#121212] text-neutral-400 hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* --- ONGLET 1 : VUE GLOBALE & INDICATEURS CLÉS (OVERVIEW) --- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Cartes KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Cartes à Imprimer', val: overview?.approvedCount || 0, color: 'text-amber-400' },
              { label: 'En Production', val: overview?.inProductionCount || 0, color: 'text-sky-400' },
              { label: 'Imprimées (À Contrôler)', val: overview?.printedCount || 0, color: 'text-purple-400' },
              { label: 'Contrôlées QC', val: overview?.qualityCheckedCount || 0, color: 'text-emerald-400' },
              { label: 'Expédiées / Livrées', val: (overview?.shippedCount || 0) + (overview?.deliveredCount || 0), color: 'text-white' },
              { label: 'Stock PVC Vierge', val: overview?.blankPvcAvailable || 0, color: 'text-[#d4af37]' },
            ].map((kpi, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-[#0c0c0c] border border-white/10 flex flex-col justify-between">
                <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider">{kpi.label}</span>
                <span className={`text-2xl font-agrandir-extrabold font-mono mt-2 ${kpi.color}`}>{kpi.val}</span>
              </div>
            ))}
          </div>

          {/* Raccourcis Opérateurs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('studio')}
              className="p-5 rounded-2xl bg-[#121212] hover:bg-[#161616] border border-white/10 hover:border-[#d4af37]/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mb-3 group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5" />
              </div>
              <h3 className="font-agrandir-extrabold text-white text-base uppercase">Ouvrir le Card Printing Studio</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Visualiser le rendu recto/verso, calibrer les marges et tester la netteté du QR code.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('qc')}
              className="p-5 rounded-2xl bg-[#121212] hover:bg-[#161616] border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-agrandir-extrabold text-white text-base uppercase">Station de Contrôle Qualité (QC)</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Scanner physiquement les cartes imprimées pour valider l'association cryptographique avant expédition.
              </p>
            </div>

            <div
              onClick={() => setActiveTab('batch')}
              className="p-5 rounded-2xl bg-[#121212] hover:bg-[#161616] border border-white/10 hover:border-purple-500/40 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-3 group-hover:scale-105 transition-transform">
                <Box className="w-5 h-5" />
              </div>
              <h3 className="font-agrandir-extrabold text-white text-base uppercase">Lancer une Production par Lots</h3>
              <p className="text-xs text-neutral-400 mt-1">
                Imprimer plusieurs cartes Founders simultanément avec réconciliation automatisée.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 2 : CARD PRINTING STUDIO (DESIGNER & GABARIT CR-80) --- */}
      {activeTab === 'studio' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#121212] border border-white/10 text-xs">
            <span className="text-neutral-400">
              Carte actuellement chargée :{' '}
              <strong className="text-white">
                {selectedCardForStudio ? `${selectedCardForStudio.cardNumber} (${selectedCardForStudio.cardholderName})` : 'Exemple Founders LMR-2026-0001'}
              </strong>
            </span>
            {cards.length > 0 && (
              <select
                value={selectedCardForStudio?.id || ''}
                onChange={(e) => {
                  const c = cards.find((x) => x.id === e.target.value);
                  setSelectedCardForStudio(c);
                }}
                className="bg-[#1b1b1b] border border-white/15 rounded-lg px-3 py-1.5 text-xs text-white"
              >
                <option value="">-- Choisir une carte dans l'annuaire --</option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cardNumber} - {c.cardholderName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <CardPrintingStudio
            card={selectedCardForStudio}
            onPrintExecuted={() => fetchWorkshopData()}
          />
        </div>
      )}

      {/* --- ONGLET 3 : FILE D'ATTENTE DE FABRICATION (PRINT QUEUE) --- */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* Filtres de la file */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher carte, nom, commande..."
                  className="w-full bg-[#171717] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-agrandir-regular"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-agrandir-medium"
              >
                <option value="all">Tous les statuts ({orders.length})</option>
                <option value="approved">Approuvées / Prêtes à imprimer</option>
                <option value="in_production">En cours d'impression</option>
                <option value="printed">Imprimées (En attente QC)</option>
                <option value="quality_checked">Contrôlées QC (Prêtes expédition)</option>
                <option value="shipped">Expédiées</option>
                <option value="delivered">Livrées</option>
                <option value="defective">Défectueuses / Rejetées</option>
              </select>
            </div>

            <div className="text-xs text-neutral-400">
              {filteredOrders.length} commande(s) affichée(s)
            </div>
          </div>

          {/* Tableau de la file */}
          <div className="rounded-2xl bg-[#0c0c0c] border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#141414] text-neutral-400 border-b border-white/10 uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="p-4">N° Commande</th>
                    <th className="p-4">N° Carte Membre</th>
                    <th className="p-4">Titulaire</th>
                    <th className="p-4">Statut Atelier</th>
                    <th className="p-4">Réimpressions</th>
                    <th className="p-4 text-right">Actions Atelier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-neutral-500">
                        Aucune commande correspondant aux filtres.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => {
                      const card = cards.find((c) => c.id === ord.cardId);
                      return (
                        <tr key={ord.id} className="hover:bg-white/5 transition-colors">
                          <td className="p-4 font-mono text-white font-bold">{ord.orderNumber}</td>
                          <td className="p-4 font-mono text-[#d4af37] font-bold">{ord.cardNumber}</td>
                          <td className="p-4">
                            <div className="font-agrandir-bold text-white uppercase">{ord.cardholderName}</div>
                            <div className="text-[10px] text-neutral-500">{ord.cardholderEmail}</div>
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold ${
                                ord.productionStatus === 'quality_checked'
                                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                  : ord.productionStatus === 'printed'
                                  ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  : ord.productionStatus === 'in_production'
                                  ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                  : ord.productionStatus === 'defective'
                                  ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                  : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {ord.productionStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-neutral-400">
                            {ord.reprintCount > 0 ? (
                              <span className="text-amber-400 font-bold">
                                {ord.reprintCount} ({ord.reprintReasons?.join(', ')})
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* Bouton Charger dans le Studio */}
                              {card && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCardForStudio(card);
                                    setActiveTab('studio');
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-white text-[11px] font-agrandir-bold cursor-pointer"
                                  title="Ouvrir dans le configurateur visuel"
                                >
                                  Studio
                                </button>
                              )}

                              {/* Bouton Imprimer */}
                              {ord.productionStatus === 'approved' && (
                                <button
                                  type="button"
                                  onClick={() => handlePrintSingleCard(ord.cardId)}
                                  className="px-3 py-1.5 rounded-lg bg-[#d4af37] hover:bg-[#c49f27] text-black font-agrandir-bold text-[11px] cursor-pointer"
                                >
                                  Imprimer
                                </button>
                              )}

                              {/* Bouton Contrôle Qualité */}
                              {ord.productionStatus === 'printed' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQcSelectedOrderId(ord.id);
                                    setActiveTab('qc');
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-agrandir-bold text-[11px] cursor-pointer"
                                >
                                  Scanner QC
                                </button>
                              )}

                              {/* Bouton Réimprimer */}
                              {card && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReprintTargetCard(card);
                                    setReprintModalOpen(true);
                                  }}
                                  className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 text-[11px] cursor-pointer"
                                  title="Demander une réimpression"
                                >
                                  Réimprimer
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 4 : PRODUCTION PAR LOTS (BATCH PRODUCTION) --- */}
      {activeTab === 'batch' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-agrandir-bold tracking-[0.2em] text-purple-400 uppercase">
                PRODUCTION GROUPÉE HAUTE CAPACITÉ
              </div>
              <h3 className="text-lg font-agrandir-extrabold uppercase text-white mt-1">
                TIRAGE PAR LOTS &amp; RÉCONCILIATION AUTOMATIQUE
              </h3>
              <p className="text-xs text-neutral-400">
                Sélectionnez les cartes approuvées pour lancer un spool duplex continu avec génération individuelle des QR codes.
              </p>
            </div>

            <button
              type="button"
              onClick={handleExecuteBatchPrint}
              disabled={selectedCardIdsForBatch.length === 0 || batchProcessing}
              className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 shadow-lg shadow-purple-600/20"
            >
              {batchProcessing ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Traitement du lot...</span>
                </>
              ) : (
                <>
                  <Box className="w-4 h-4" />
                  <span>Imprimer le lot ({selectedCardIdsForBatch.length} cartes)</span>
                </>
              )}
            </button>
          </div>

          {batchNotice && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{batchNotice}</span>
            </div>
          )}

          {/* Liste des cartes sélectionnables */}
          <div className="rounded-2xl bg-[#0c0c0c] border border-white/10 overflow-hidden shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-neutral-400 border-b border-white/10 pb-3">
              <span>Cartes éligibles à l'impression :</span>
              <button
                type="button"
                onClick={() => {
                  const approvedCardIds = orders
                    .filter((o) => o.productionStatus === 'approved')
                    .map((o) => o.cardId);
                  setSelectedCardIdsForBatch(approvedCardIds);
                }}
                className="text-purple-400 hover:underline font-agrandir-semibold cursor-pointer"
              >
                Tout sélectionner
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {orders
                .filter((o) => o.productionStatus === 'approved')
                .map((ord) => {
                  const isChecked = selectedCardIdsForBatch.includes(ord.cardId);
                  return (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedCardIdsForBatch((prev) =>
                          isChecked ? prev.filter((id) => id !== ord.cardId) : [...prev, ord.cardId]
                        );
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isChecked
                          ? 'bg-purple-950/30 border-purple-500 text-white'
                          : 'bg-[#141414] border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="font-mono text-xs font-bold text-[#d4af37]">{ord.cardNumber}</div>
                        <div className="font-agrandir-bold text-sm text-white truncate max-w-[180px]">
                          {ord.cardholderName}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center ${
                          isChecked ? 'bg-purple-600 border-purple-600 text-white' : 'border-white/20'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 5 : STATION DE CONTRÔLE QUALITÉ OBLIGATOIRE (QC) --- */}
      {activeTab === 'qc' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="text-[10px] font-agrandir-bold tracking-[0.2em] text-emerald-400 uppercase">
              CONTRÔLE QUALITÉ OBLIGATOIRE POST-IMPRESSION
            </div>
            <h3 className="text-lg font-agrandir-extrabold uppercase text-white mt-1">
              SCAN RÉEL DU QR IMPRIMÉ &amp; CERTIFICATION CONFORME
            </h3>
            <p className="text-xs text-neutral-400">
              Une carte ne peut être marquée "Contrôlée QC" que si le QR imprimé sur le PVC est physiquement scanné et validé par le registre cryptographique.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Formulaire de contrôle */}
            <form onSubmit={handlePerformQualityCheck} className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-4">
              <div>
                <label className="block text-xs font-agrandir-bold text-neutral-300 mb-1">
                  1. Sélectionner la carte imprimée à contrôler :
                </label>
                <select
                  value={qcSelectedOrderId}
                  onChange={(e) => setQcSelectedOrderId(e.target.value)}
                  required
                  className="w-full bg-[#141414] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="">-- Sélectionner une carte --</option>
                  {orders
                    .filter((o) => o.productionStatus === 'printed' || o.productionStatus === 'in_production')
                    .map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.cardNumber} - {o.cardholderName} ({o.orderNumber})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-agrandir-bold text-neutral-300 mb-1">
                  2. Scanner physiquement le QR imprimé (Douchette 2D USB ou Caméra) :
                </label>
                <div className="relative">
                  <Scan className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={qcScannedQrInput}
                    onChange={(e) => setQcScannedQrInput(e.target.value)}
                    placeholder="Approchez le scanner 2D ou collez le token du QR..."
                    required
                    className="w-full bg-[#141414] border border-emerald-500/50 rounded-xl pl-9 pr-3.5 py-3 text-xs text-white font-mono placeholder-neutral-500 focus:outline-none focus:border-emerald-400 shadow-inner"
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1 block">
                  Exemple attendu : LMR_SEC_... ou numéro permanent LMR-2026-XXXX
                </span>
              </div>

              {/* Checklist Visuelle Obligatoire */}
              <div className="space-y-2 pt-2 border-t border-white/10">
                <span className="text-[11px] font-agrandir-bold text-white uppercase block">
                  3. Inspection optique du support physique PVC :
                </span>

                {[
                  { state: qcVisualPassed, set: setQcVisualPassed, label: 'Impression nette sans bavure' },
                  { state: qcCenteringPassed, set: setQcCenteringPassed, label: 'Centrage correct des marges (3mm)' },
                  { state: qcContrastPassed, set: setQcContrastPassed, label: 'Contraste optique du QR 100% noir/blanc' },
                  { state: qcNoScratchesPassed, set: setQcNoScratchesPassed, label: 'Absence totale de rayures ou bulles' },
                ].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2.5 text-xs text-neutral-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.set(e.target.checked)}
                      className="rounded border-white/20 text-emerald-500 focus:ring-0"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block text-xs font-agrandir-bold text-neutral-300 mb-1">
                  Observations de l'opérateur (Optionnel) :
                </label>
                <input
                  type="text"
                  value={qcOperatorNotes}
                  onChange={(e) => setQcOperatorNotes(e.target.value)}
                  placeholder="Ex : Parfait état, dorure homogène."
                  className="w-full bg-[#141414] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <button
                type="submit"
                disabled={qcSubmitting}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
              >
                {qcSubmitting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Validation cryptographique...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Valider le contrôle qualité &amp; Certifier la carte</span>
                  </>
                )}
              </button>
            </form>

            {/* Résultat et consignes */}
            <div className="space-y-4">
              {qcResult && (
                <div
                  className={`p-5 rounded-2xl border ${
                    qcResult.success
                      ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200'
                      : 'bg-red-950/40 border-red-500 text-red-200'
                  } animate-fadeIn`}
                >
                  <div className="flex items-center gap-2 font-agrandir-extrabold text-sm uppercase">
                    {qcResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                    )}
                    <span>{qcResult.success ? 'CONFORMITÉ CERTIFIÉE' : 'REJET QUALITÉ'}</span>
                  </div>
                  <p className="text-xs mt-2 leading-relaxed">{qcResult.message}</p>
                </div>
              )}

              <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-agrandir-bold text-white uppercase">
                  <Info className="w-4 h-4 text-[#d4af37]" />
                  <span>Protocole Anti-Faux &amp; Règle d'Or de l'Atelier</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Le système interdit formellement de valider une carte par simple clic. Le scan réel du QR code imprimé garantit que le jeton secret stocké en mémoire correspond exactement au support physique remis au membre.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 6 : INVENTAIRE DES CONSOMMABLES (INVENTORY) --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
                GESTION DES STOCKS DE FABRICATION
              </div>
              <h3 className="text-lg font-agrandir-extrabold uppercase text-white mt-1">
                CARTES PVC VIERGES, RUBANS &amp; COFFRETS COLLECTOR
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => {
              const isLow = item.availableQuantity <= item.minThresholdAlert;
              return (
                <div key={item.id} className="p-4 rounded-2xl bg-[#0c0c0c] border border-white/10 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">{item.sku}</span>
                      {isLow && (
                        <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[9px] font-mono font-bold">
                          Stock Bas
                        </span>
                      )}
                    </div>
                    <h4 className="font-agrandir-extrabold text-sm text-white mt-1 uppercase">{item.itemName}</h4>
                    {item.notes && <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">{item.notes}</p>}
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase block">Disponible</span>
                      <span className="text-xl font-mono font-bold text-white">
                        {item.availableQuantity} <span className="text-xs text-neutral-400 font-normal">{item.unit}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingInventoryItem(item);
                        setInventoryUpdateQty(item.totalQuantity);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-agrandir-bold text-white cursor-pointer"
                    >
                      Ajuster Stock
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- ONGLET 7 : MATÉRIEL & LECTEURS SCANNERS 2D (PRINTERS) --- */}
      {activeTab === 'printers' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              ÉQUIPEMENT ATELIER &amp; PONT DE CONNEXION MACHINE
            </div>
            <h3 className="text-lg font-agrandir-extrabold uppercase text-white mt-1">
              IMPRIMANTES PVC RECONNUES &amp; SCANNERS 2D USB
            </h3>
            <p className="text-xs text-neutral-400">
              L'atelier ne nécessite aucun matériel NFC, encodeur ni module SAM AV3. Seuls une imprimante à transfert thermique PVC et un scanner 2D optique sont requis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-agrandir-bold text-white uppercase text-sm">Imprimante PVC Active</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                  Prête
                </span>
              </div>
              <div className="text-xs text-neutral-300">
                Modèle supporté : <strong>Evolis Primacy 2 / Zebra ZC300</strong>
              </div>
              <div className="text-xs text-neutral-400 leading-relaxed">
                Connectée via le pont local HTTP/WebSocket port 9100. Supporte l'impression recto/verso automatique duplex et la lamination protectrice.
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-agrandir-bold text-white uppercase text-sm">Scanner 2D QR (Douchette)</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono text-[10px]">
                  Actif USB
                </span>
              </div>
              <div className="text-xs text-neutral-300">
                Périphérique : <strong>Lecteur Imager 2D USB / Clavier HID</strong>
              </div>
              <div className="text-xs text-neutral-400 leading-relaxed">
                Décode instantanément les QR codes imprimés sur les badges physiques sans latence. Compatible caméras mobiles et webcams HD.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ONGLET 8 : HISTORIQUE DES TIRAGES (HISTORY) --- */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="text-[10px] font-agrandir-bold tracking-[0.2em] text-[#d4af37] uppercase">
              JOURNAL D’AUDIT DES TRAVAUX D’IMPRESSION
            </div>
            <h3 className="text-lg font-agrandir-extrabold uppercase text-white mt-1">
              HISTORIQUE DES JOBS, RÉIMPRESSIONS &amp; OPÉRATEURS
            </h3>
          </div>

          <div className="rounded-2xl bg-[#0c0c0c] border border-white/10 overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#141414] text-neutral-400 border-b border-white/10 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="p-4">Code Job</th>
                  <th className="p-4">Carte</th>
                  <th className="p-4">Titulaire</th>
                  <th className="p-4">Type Tirage</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4">Date &amp; Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-500 font-agrandir-regular">
                      Aucun travail d'impression enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 text-white font-bold">{job.jobCode}</td>
                      <td className="p-4 text-[#d4af37]">{job.cardNumber}</td>
                      <td className="p-4 font-agrandir-bold text-white">{job.cardholderName}</td>
                      <td className="p-4">
                        {job.isReprint ? (
                          <span className="text-amber-400 font-bold">Réimpression ({job.reprintReason})</span>
                        ) : (
                          <span className="text-neutral-300">Tirage Initial</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-emerald-400 font-bold uppercase">{job.status}</span>
                      </td>
                      <td className="p-4 text-neutral-400">
                        {new Date(job.createdAt).toLocaleString('fr-FR')} · {job.operatorId}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL DE RÉIMPRESSION AVEC MOTIF OBLIGATOIRE */}
      {reprintModalOpen && reprintTargetCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#121212] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-agrandir-extrabold text-white text-base uppercase">
                Ordre de Réimpression Physique
              </h3>
              <button
                type="button"
                onClick={() => setReprintModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-1">
              <div>
                Carte : <strong className="text-[#d4af37] font-mono">{reprintTargetCard.cardNumber}</strong>
              </div>
              <div>
                Titulaire : <strong className="text-white">{reprintTargetCard.cardholderName}</strong>
              </div>
              <p className="text-[11px] text-neutral-500">
                Le numéro permanent reste strictement préservé.
              </p>
            </div>

            <form onSubmit={handleExecuteReprint} className="space-y-4">
              <div>
                <label className="block text-xs font-agrandir-bold text-neutral-300 mb-1">
                  Motif obligatoire de la réimpression :
                </label>
                <select
                  value={reprintReason}
                  onChange={(e) => setReprintReason(e.target.value as any)}
                  required
                  className="w-full bg-[#1b1b1b] border border-white/20 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="damaged">Carte physique endommagée / détériorée</option>
                  <option value="lost">Carte perdue ou volée (Rotation QR conseillée)</option>
                  <option value="defect">Défaut de fabrication / impression illisible</option>
                  <option value="data_update">Modification de nom / coordonnées</option>
                  <option value="member_request">Demande express du membre</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reprintRotateQr}
                  onChange={(e) => setReprintRotateQr(e.target.checked)}
                  className="rounded border-white/20 text-[#d4af37]"
                />
                <span>Régénérer et révoquer l'ancien QR code (recommandé si carte perdue)</span>
              </label>

              <div>
                <label className="block text-xs font-agrandir-bold text-neutral-300 mb-1">
                  Notes ou justificatif :
                </label>
                <textarea
                  value={reprintNotes}
                  onChange={(e) => setReprintNotes(e.target.value)}
                  placeholder="Ex : Rayure constatée sur la face verso..."
                  rows={2}
                  className="w-full bg-[#1b1b1b] border border-white/20 rounded-xl p-3 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReprintModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-agrandir-bold text-xs uppercase"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={reprintSubmitting}
                  className="flex-1 py-3 rounded-xl bg-[#d4af37] text-black font-agrandir-extrabold text-xs uppercase disabled:opacity-50"
                >
                  {reprintSubmitting ? 'Traitement...' : 'Confirmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL D'AJUSTEMENT D'INVENTAIRE */}
      {editingInventoryItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-[#121212] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-agrandir-extrabold text-white text-base uppercase">Ajuster Stock</h3>
              <button
                type="button"
                onClick={() => setEditingInventoryItem(null)}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-white font-agrandir-bold uppercase">
              {editingInventoryItem.itemName}
            </div>

            <form onSubmit={handleSaveInventory} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">
                  Quantité totale en stock ({editingInventoryItem.unit}) :
                </label>
                <input
                  type="number"
                  value={inventoryUpdateQty}
                  onChange={(e) => setInventoryUpdateQty(Number(e.target.value))}
                  min={0}
                  className="w-full bg-[#1b1b1b] border border-white/20 rounded-xl px-4 py-2.5 text-base font-mono font-bold text-white"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingInventoryItem(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white text-xs font-agrandir-bold uppercase"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#d4af37] text-black text-xs font-agrandir-extrabold uppercase"
                >
                  Sauvegarder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
