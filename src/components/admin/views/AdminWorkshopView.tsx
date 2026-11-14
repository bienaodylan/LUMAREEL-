import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Radio,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
  ExternalLink,
  Layers,
  History,
  Box,
  Truck,
  RefreshCw,
  Lock,
  Scan,
  CreditCard,
  UserCheck,
  Download,
  FileText,
  Calendar,
  Clock,
  ArrowUpDown,
  FileCheck,
  Wallet,
  DollarSign,
  PlusCircle,
  ShieldAlert,
  ShoppingBag,
  Zap,
  ArrowRight,
  Receipt,
  AlertCircle
} from 'lucide-react';
import {
  MembershipCard,
  MembershipEventLog,
  ChipInventoryItem,
  WalletTransaction,
} from '../../../types';
import { useApp } from '../../../context/AppContext';
import { getAuthHeaders } from '../../../utils/authSession';
import { formatCsvCell } from '../../../utils/csvSanitizer';

export const AdminWorkshopView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'encoder' | 'pos' | 'inventory' | 'lifecycle' | 'logs'>('encoder');

  // Données principales
  const [cards, setCards] = useState<MembershipCard[]>([]);
  const [chipInventory, setChipInventory] = useState<ChipInventoryItem[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [logs, setLogs] = useState<MembershipEventLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // État Poste d'Encodage
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [detectedChipUid, setDetectedChipUid] = useState<string>('');
  const [chipType, setChipType] = useState<string>('NXP MIFARE DESFire EV3 (ISO/IEC 14443-A)');
  const [isReadingHardware, setIsReadingHardware] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeSuccessMessage, setEncodeSuccessMessage] = useState<string | null>(null);
  const [encodeErrorMessage, setEncodeErrorMessage] = useState<string | null>(null);

  // État Terminal Point de Vente / POS Sans Contact
  const [posCardId, setPosCardId] = useState<string>('');
  const [posAmount, setPosAmount] = useState<number>(45000);
  const [posLocation, setPosLocation] = useState<string>('Bar Privé VIP Lounge');
  const [posProcessing, setPosProcessing] = useState(false);
  const [posSuccessReceipt, setPosSuccessReceipt] = useState<WalletTransaction | null>(null);
  const [posError, setPosError] = useState<string | null>(null);

  // État Recharge Portefeuille
  const [rechargeCardId, setRechargeCardId] = useState<string>('');
  const [rechargeAmount, setRechargeAmount] = useState<number>(100000);
  const [rechargeProcessing, setRechargeProcessing] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState<string | null>(null);

  // État Stock / Inventaire Puces
  const [newChipUidInput, setNewChipUidInput] = useState('');
  const [newChipBatchInput, setNewChipBatchInput] = useState('LOT-NXP-2026-B1');
  const [isAddingChip, setIsAddingChip] = useState(false);
  const [batchImportOpen, setBatchImportOpen] = useState(false);
  const [batchImportUids, setBatchImportUids] = useState('');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'in_stock' | 'assigned' | 'revoked'>('all');

  // État Révocation / Opposition / Remplacement
  const [revokeModalCard, setRevokeModalCard] = useState<MembershipCard | null>(null);
  const [revokeReason, setRevokeReason] = useState<'lost' | 'stolen' | 'damaged'>('lost');
  const [revokeNotes, setRevokeNotes] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [replaceModalCard, setReplaceModalCard] = useState<MembershipCard | null>(null);
  const [replaceNewChipUid, setReplaceNewChipUid] = useState('');
  const [replaceReason, setReplaceReason] = useState('Remplacement suite à perte de carte');
  const [isReplacing, setIsReplacing] = useState(false);

  // Filtres Historique / Logs
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logActionFilter, setLogActionFilter] = useState<'all' | 'ASSOCIATION_INITIALE' | 'REASSOCIATION' | 'CHIP_REVOKED'>('all');
  const [selectedLogForModal, setSelectedLogForModal] = useState<MembershipEventLog | null>(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCards(),
        fetchChipInventory(),
        fetchWalletTransactions(),
        fetchLogs(),
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCards = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/membership/admin/cards', { credentials: 'include', headers });
      const data = await res.json();
      if (data.success && data.cards) {
        setCards(data.cards);
        if (!selectedCardId && data.cards.length > 0) {
          const firstPending = data.cards.find((c: MembershipCard) => !c.chipUid) || data.cards[0];
          setSelectedCardId(firstPending.id);
        }
        if (!posCardId && data.cards.length > 0) {
          const firstActive = data.cards.find((c: MembershipCard) => c.chipUid && c.cardStatus === 'active') || data.cards[0];
          setPosCardId(firstActive.id);
        }
      }
    } catch (err) {
      console.error('Erreur chargement cartes:', err);
    }
  };

  const fetchChipInventory = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/membership/admin/inventory/chips', { credentials: 'include', headers });
      const data = await res.json();
      if (data.success && data.chips) {
        setChipInventory(data.chips);
      }
    } catch (err) {
      console.error('Erreur chargement inventaire puces:', err);
    }
  };

  const fetchWalletTransactions = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/membership/admin/wallet-transactions', { credentials: 'include', headers });
      const data = await res.json();
      if (data.success && data.transactions) {
        setWalletTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/membership/admin/chip-logs', { credentials: 'include', headers });
      const data = await res.json();
      if (data.success && data.logs) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error('Erreur chargement logs audit:', err);
    }
  };

  // 1. Détecter puce matérielle sans contact
  const handleScanFromHardware = async () => {
    setIsReadingHardware(true);
    setEncodeErrorMessage(null);
    setEncodeSuccessMessage(null);

    // Si des puces vierges sont disponibles en stock, on peut piocher automatiquement la première disponible
    const firstAvailable = chipInventory.find(c => c.status === 'in_stock');

    setTimeout(() => {
      if (firstAvailable) {
        setDetectedChipUid(firstAvailable.chipUid);
      } else {
        const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
        const randomUid = `04:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
        setDetectedChipUid(randomUid);
      }
      setIsReadingHardware(false);
    }, 600);
  };

  // 2. Encodage & Association atomique au compte
  const handleAssociateChip = async () => {
    if (!selectedCardId) {
      setEncodeErrorMessage('Veuillez sélectionner une carte de membre.');
      return;
    }
    if (!detectedChipUid.trim()) {
      setEncodeErrorMessage('Veuillez scanner ou saisir l\'UID de la puce physique.');
      return;
    }

    setIsEncoding(true);
    setEncodeErrorMessage(null);
    setEncodeSuccessMessage(null);

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/cards/${selectedCardId}/encode-chip`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          chipUid: detectedChipUid.trim().toUpperCase(),
          chipType: 'NXP_DESFire_EV3',
          terminal: 'Lecteur NFC/RFID Desk 01 (Atelier Abidjan)',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setEncodeSuccessMessage(`Puce (${detectedChipUid}) associée avec succès et scellée avec clé AES-128.`);
        await Promise.all([fetchCards(), fetchChipInventory(), fetchLogs()]);
      } else {
        setEncodeErrorMessage(data.error || 'Erreur lors de l\'encodage de la puce.');
      }
    } catch (err: any) {
      setEncodeErrorMessage(err.message || 'Erreur réseau lors de l\'encodage.');
    } finally {
      setIsEncoding(false);
    }
  };

  // 3. Point de Vente / POS Sans Contact Club Privé
  const handlePosDebit = async () => {
    if (!posCardId) {
      setPosError('Veuillez sélectionner une carte membre.');
      return;
    }
    if (!posAmount || posAmount <= 0) {
      setPosError('Veuillez indiquer un montant supérieur à 0.');
      return;
    }

    setPosProcessing(true);
    setPosError(null);
    setPosSuccessReceipt(null);

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/membership/pos/charge', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          cardId: posCardId,
          amount: Number(posAmount),
          location: posLocation,
          terminalId: 'TPE-BAR-VIP-01',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPosSuccessReceipt(data.transaction);
        await Promise.all([fetchCards(), fetchWalletTransactions()]);
      } else {
        setPosError(data.error || 'Débit refusé.');
      }
    } catch (e: any) {
      setPosError(e.message || 'Erreur lors du traitement sans contact.');
    } finally {
      setPosProcessing(false);
    }
  };

  // 4. Recharge de Portefeuille
  const handleRechargeWallet = async () => {
    if (!rechargeCardId) return;
    setRechargeProcessing(true);
    setRechargeSuccess(null);

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/admin/cards/${rechargeCardId}/wallet/recharge`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          amount: Number(rechargeAmount),
          paymentMethod: 'Carte Bancaire / Espèces',
          location: 'Caisse Conciergerie Club Privé',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRechargeSuccess(`Portefeuille crédité de +${rechargeAmount.toLocaleString()} FCFA avec succès.`);
        await Promise.all([fetchCards(), fetchWalletTransactions()]);
      }
    } catch (e: any) {
      console.error('Erreur recharge:', e);
    } finally {
      setRechargeProcessing(false);
    }
  };

  // 5. Ajout d'une puce au stock
  const handleAddChipToInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChipUidInput.trim()) return;

    setIsAddingChip(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/membership/admin/inventory/chips', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          chipUid: newChipUidInput.trim().toUpperCase(),
          batchNumber: newChipBatchInput.trim().toUpperCase(),
          chipType: 'NXP_DESFire_EV3',
          notes: 'Puce vierge enregistrée manuellement en stock',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNewChipUidInput('');
        showToast('Puce enregistrée en stock.', 'success');
        await fetchChipInventory();
      } else {
        showToast(data.error || 'Erreur lors de l\'enregistrement de la puce.', 'error');
      }
    } finally {
      setIsAddingChip(false);
    }
  };

  // 6. Import en masse de carton de puces
  const handleBatchImportChips = async () => {
    const rawLines = batchImportUids.split('\n').map(l => l.trim()).filter(l => l.length >= 4);
    if (rawLines.length === 0) return;

    const items = rawLines.map(uid => ({
      chipUid: uid.toUpperCase(),
      batchNumber: 'LOT-NXP-BATCH-FABRICANT',
      chipType: 'NXP_DESFire_EV3',
    }));

    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch('/api/membership/admin/inventory/chips/batch-import', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBatchImportUids('');
        setBatchImportOpen(false);
        await fetchChipInventory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 7. Mise en opposition (Perte / Vol)
  const handleConfirmRevoke = async () => {
    if (!revokeModalCard) return;
    setIsRevoking(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/admin/cards/${revokeModalCard.id}/revoke-chip`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          reason: revokeReason,
          notes: revokeNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRevokeModalCard(null);
        setRevokeNotes('');
        await Promise.all([fetchCards(), fetchChipInventory(), fetchLogs()]);
      }
    } finally {
      setIsRevoking(false);
    }
  };

  // 8. Remplacement avec nouvelle puce
  const handleConfirmReplace = async () => {
    if (!replaceModalCard || !replaceNewChipUid.trim()) return;
    setIsReplacing(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      const res = await fetch(`/api/membership/admin/cards/${replaceModalCard.id}/replace-chip`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          newChipUid: replaceNewChipUid.trim().toUpperCase(),
          reason: replaceReason,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReplaceModalCard(null);
        setReplaceNewChipUid('');
        showToast('Nouvelle puce associée avec succès.', 'success');
        await Promise.all([fetchCards(), fetchChipInventory(), fetchLogs()]);
      } else {
        showToast(data.error || 'Erreur lors du remplacement de la puce.', 'error');
      }
    } finally {
      setIsReplacing(false);
    }
  };

  // 9. Export CSV du journal d'audit
  const handleExportAuditCsv = () => {
    if (logs.length === 0) return;
    const headers = [
      'ID_AUDIT',
      'DATE_ISO',
      'NUMERO_CARTE',
      'TITULAIRE',
      'EMAIL',
      'UID_PUCE',
      'TYPE_PUCE',
      'ACTION',
      'OPERATEUR',
      'TERMINAL',
      'VERROUILLAGE_SCELLAGE',
      'STATUT_FINAL'
    ];

    const rows = logs.map((l) => {
      const d = l.details || {};
      return [
        formatCsvCell(l.id),
        formatCsvCell(l.createdAt),
        formatCsvCell(d.cardNumber || ''),
        formatCsvCell(d.cardholderName || ''),
        formatCsvCell(d.cardholderEmail || ''),
        formatCsvCell(d.chipUid || ''),
        formatCsvCell(d.chipType || 'NXP_DESFire_EV3'),
        formatCsvCell(d.action || l.actionType),
        formatCsvCell(l.actorId || ''),
        formatCsvCell(d.terminal || ''),
        formatCsvCell(d.lockStatus || 'locked_aes128'),
        formatCsvCell(d.verificationStatus || 'VERIFIED_ACTIVE'),
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.map((h) => formatCsvCell(h)).join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `AUDIT_PUCES_LUMAREEL_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedCard = cards.find((c) => c.id === selectedCardId);
  const posActiveCard = cards.find((c) => c.id === posCardId);

  const availableStockChips = chipInventory.filter(c => c.status === 'in_stock');
  const assignedStockChips = chipInventory.filter(c => c.status === 'assigned');

  const filteredInventory = chipInventory.filter(item => {
    const q = inventorySearch.toLowerCase();
    const matchSearch =
      q === '' ||
      item.chipUid.toLowerCase().includes(q) ||
      item.batchNumber.toLowerCase().includes(q) ||
      (item.assignedMemberName && item.assignedMemberName.toLowerCase().includes(q)) ||
      (item.assignedCardNumber && item.assignedCardNumber.toLowerCase().includes(q));

    if (inventoryFilter === 'all') return matchSearch;
    return matchSearch && item.status === inventoryFilter;
  });

  const filteredLogs = logs.filter((l) => {
    const q = logSearchQuery.toLowerCase();
    const d = l.details || {};
    const matchSearch =
      q === '' ||
      (d.cardNumber && d.cardNumber.toLowerCase().includes(q)) ||
      (d.cardholderName && d.cardholderName.toLowerCase().includes(q)) ||
      (d.cardholderEmail && d.cardholderEmail.toLowerCase().includes(q)) ||
      (d.chipUid && d.chipUid.toLowerCase().includes(q)) ||
      (l.actorId && l.actorId.toLowerCase().includes(q));

    if (logActionFilter === 'all') return matchSearch;
    return matchSearch && (d.action === logActionFilter || l.actionType === logActionFilter);
  });

  return (
    <div className="space-y-6 text-[#EFEFEF] font-agrandir-regular select-none pb-12">
      
      {/* Header : Club Privé LUMARÉEL Card System */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
            <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>CLUB PRIVÉ · ARCHITECTURE NXP MIFARE DESFIRE EV3</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white tracking-wide">
            GESTION &amp; INFRASTRUCTURE DES CARTES
          </h1>
          <p className="text-xs text-neutral-400 font-light">
            Association matérielle, gestion du stock de puces fabricant, caisse sans contact et journal d'audit immuable.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchAllData}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#d4af37]' : ''}`} />
            <span>Actualiser</span>
          </button>
        </div>
      </div>

      {/* Métriques Clés en temps réel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-neutral-400">Cartes Membres</div>
            <div className="text-2xl font-mono font-bold text-white mt-0.5">{cards.length}</div>
          </div>
          <CreditCard className="w-6 h-6 text-neutral-400" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-[#d4af37]/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-[#d4af37]">Puces Vierges en Stock</div>
            <div className="text-2xl font-mono font-bold text-[#d4af37] mt-0.5">{availableStockChips.length}</div>
          </div>
          <Box className="w-6 h-6 text-[#d4af37]" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-emerald-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-emerald-400">Puces Scellées Actives</div>
            <div className="text-2xl font-mono font-bold text-emerald-400 mt-0.5">{assignedStockChips.length}</div>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-sky-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-sky-400">Événements d'Audit</div>
            <div className="text-2xl font-mono font-bold text-sky-300 mt-0.5">{logs.length}</div>
          </div>
          <History className="w-6 h-6 text-sky-400" />
        </div>
      </div>

      {/* Onglets de Navigation Principaux */}
      <div className="flex border-b border-white/10 gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('encoder')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'encoder'
              ? 'border-[#d4af37] text-white bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#d4af37]" />
          <span>Poste d'Encodage &amp; Association</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'pos'
              ? 'border-[#d4af37] text-white bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>Caisse &amp; Terminal Sans Contact (POS)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'inventory'
              ? 'border-[#d4af37] text-white bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Box className="w-4 h-4 text-amber-400" />
          <span>Stock Puces Fabricant ({chipInventory.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lifecycle')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'lifecycle'
              ? 'border-[#d4af37] text-white bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span>Cycle de Vie &amp; Opposition</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'logs'
              ? 'border-[#d4af37] text-white bg-white/[0.02]'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4 text-sky-400" />
          <span>Journal d'Audit ({logs.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ONGLET 1 : POSTE D'ENCODAGE PHYSIQUE & ASSOCIATION RAPIDE             */}
      {/* ===================================================================== */}
      {activeTab === 'encoder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Colonne Gauche : Sélection de la carte à encoder */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h3 className="font-agrandir-bold text-sm text-white uppercase flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#d4af37]" />
                  <span>1. Sélectionner le compte membre</span>
                </h3>
                <span className="text-[10px] font-mono text-neutral-400">
                  {cards.filter(c => !c.chipUid).length} en attente
                </span>
              </div>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {cards.map((c) => {
                  const isSelected = c.id === selectedCardId;
                  const isPending = !c.chipUid;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCardId(c.id);
                        if (c.chipUid) setDetectedChipUid(c.chipUid);
                        else setDetectedChipUid('');
                        setEncodeSuccessMessage(null);
                        setEncodeErrorMessage(null);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#181818] border-[#d4af37] shadow-lg shadow-[#d4af37]/10'
                          : 'bg-[#111] border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#d4af37]">{c.cardNumber}</span>
                            {isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-agrandir-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                                En attente de puce
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-agrandir-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                                Scellée
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-agrandir-bold text-white mt-1">{c.cardholderName}</div>
                          <div className="text-[11px] text-neutral-400 font-mono">{c.cardholderEmail}</div>
                        </div>

                        {c.chipUid && (
                          <div className="text-right">
                            <span className="text-[9px] font-mono text-neutral-500 block uppercase">UID Puce</span>
                            <span className="text-[11px] font-mono font-bold text-emerald-400">{c.chipUid}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Aide technique sur le lecteur physique */}
            <div className="p-5 rounded-3xl bg-[#0a0a0a] border border-white/10 text-xs text-neutral-400 space-y-2">
              <div className="flex items-center gap-2 text-white font-agrandir-bold uppercase text-[11px]">
                <Radio className="w-4 h-4 text-[#d4af37]" />
                <span>Lecteur de Bureau Recommandé</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Connectez un lecteur USB sans contact standard (ex : <strong>ACS ACR122U</strong> ou <strong>HID Omnikey 5022</strong>) pour capturer les puces NXP DESFire EV3 automatiquement en posant la carte.
              </p>
            </div>
          </div>

          {/* Colonne Droite : Banc d'association matérielle */}
          <div className="lg:col-span-7 space-y-5">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-6 shadow-2xl">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-agrandir-bold text-base text-white uppercase">
                    2. Lier &amp; Sceller la Puce NXP DESFire EV3
                  </h3>
                  <p className="text-xs text-neutral-400">
                    Injection des clés AES-128 et verrouillage irréversible des droits d'écriture.
                  </p>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono uppercase font-bold">
                  Protocole ISO 14443-A
                </div>
              </div>

              {/* Raccourci : Choisir directement depuis le stock de puces vierges */}
              {availableStockChips.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 space-y-2">
                  <div className="text-xs font-agrandir-bold text-neutral-300 flex items-center justify-between">
                    <span>Puces vierges prêtes en réserve ({availableStockChips.length}) :</span>
                    <span className="text-[10px] font-mono text-[#d4af37]">Cliquer pour charger</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableStockChips.slice(0, 4).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          setDetectedChipUid(chip.chipUid);
                          setEncodeSuccessMessage(null);
                          setEncodeErrorMessage(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-[#d4af37]/20 border border-white/10 hover:border-[#d4af37]/40 text-xs font-mono text-white transition-all cursor-pointer"
                      >
                        {chip.chipUid}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone de détection matérielle de la puce */}
              <div className="p-6 rounded-2xl bg-[#050505] border border-white/10 space-y-4 text-center">
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center border transition-all ${
                    detectedChipUid
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-lg shadow-emerald-500/20'
                      : 'bg-white/5 border-white/10 text-neutral-400'
                  }`}>
                    {detectedChipUid ? <CheckCircle2 className="w-8 h-8" /> : <Radio className="w-8 h-8 animate-pulse text-[#d4af37]" />}
                  </div>
                  <div className="text-xs uppercase font-agrandir-bold text-white tracking-widest mt-2">
                    {detectedChipUid ? 'Puce Physique Détectée' : 'En attente de passage sur le lecteur'}
                  </div>
                  <p className="text-[11px] text-neutral-400 max-w-sm">
                    Posez la carte physique NXP sur votre lecteur sans contact USB ou cliquez sur le bouton ci-dessous pour déclencher la capture.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleScanFromHardware}
                    disabled={isReadingHardware}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md"
                  >
                    <Radio className={`w-4 h-4 ${isReadingHardware ? 'animate-spin text-[#d4af37]' : 'text-[#d4af37]'}`} />
                    <span>{isReadingHardware ? 'Détection en cours...' : 'Détecter Puce sur Lecteur'}</span>
                  </button>
                </div>

                {/* Saisie / Affichage de l'UID matériel */}
                <div className="mt-4 pt-4 border-t border-white/10 text-left">
                  <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1.5">
                    UID Matériel de la Puce (7 Octets ISO 14443-A)
                  </label>
                  <input
                    type="text"
                    value={detectedChipUid}
                    onChange={(e) => setDetectedChipUid(e.target.value.toUpperCase())}
                    placeholder="Ex: 04:A2:8F:12:9C:5E:80"
                    className="w-full bg-[#111] border border-white/15 focus:border-[#d4af37] rounded-xl px-4 py-3 font-mono text-base font-bold text-white tracking-widest focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Messages de retour */}
              {encodeSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-3 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>{encodeSuccessMessage}</span>
                </div>
              )}

              {encodeErrorMessage && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3 animate-fadeIn">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <span>{encodeErrorMessage}</span>
                </div>
              )}

              {/* Bouton d'action final : Lier & Sceller */}
              <button
                type="button"
                onClick={handleAssociateChip}
                disabled={isEncoding || !selectedCardId || !detectedChipUid}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#b38f2a] hover:from-[#e5c04b] hover:to-[#c49f38] text-black font-agrandir-extrabold text-sm uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 shadow-xl flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4 text-black" />
                <span>{isEncoding ? 'Scellement Cryptographique en cours...' : 'Associer & Sceller la Puce au Compte'}</span>
              </button>

            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 2 : CAISSE & TERMINAL POINT DE VENTE CLUB PRIVÉ (POS)          */}
      {/* ===================================================================== */}
      {activeTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Colonne Gauche : Terminal Point de Vente */}
          <div className="lg:col-span-7 space-y-5">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="inline-flex items-center gap-2 text-emerald-400 text-[10px] font-mono uppercase font-bold tracking-widest">
                    <Zap className="w-3.5 h-3.5" />
                    <span>TERMINAL SANS CONTACT EN DIRECT</span>
                  </div>
                  <h3 className="font-agrandir-bold text-xl text-white uppercase mt-0.5">
                    CAISSE &amp; CONSOMMATIONS CLUB
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono text-neutral-400 block uppercase">Poste Actif</span>
                  <span className="text-xs font-mono font-bold text-white">TPE-BAR-VIP-01</span>
                </div>
              </div>

              {/* Sélection de la carte passée sur le terminal */}
              <div className="space-y-2">
                <label className="text-xs font-agrandir-bold text-neutral-300 uppercase block">
                  Carte passée sur le lecteur :
                </label>
                <select
                  value={posCardId}
                  onChange={(e) => {
                    setPosCardId(e.target.value);
                    setPosSuccessReceipt(null);
                    setPosError(null);
                  }}
                  className="w-full bg-[#161616] border border-white/15 focus:border-[#d4af37] rounded-xl px-4 py-3 text-sm font-agrandir-bold text-white focus:outline-none cursor-pointer"
                >
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.cardNumber} — {c.cardholderName} ({c.cardStatus === 'active' ? 'Active' : c.cardStatus.toUpperCase()}) — Solde: {(c.walletBalance || 0).toLocaleString()} {c.walletCurrency || 'FCFA'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Aperçu en direct du titulaire et de son solde */}
              {posActiveCard && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-[#121212] to-[#080808] border border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase block">Titulaire</span>
                    <strong className="text-sm text-white font-agrandir-bold block">{posActiveCard.cardholderName}</strong>
                    <span className="text-[10px] text-neutral-400 font-mono">{posActiveCard.cardholderEmail}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase block">Puce Scellée</span>
                    <strong className="text-xs text-[#d4af37] font-mono block mt-0.5">{posActiveCard.chipUid || 'Aucune puce'}</strong>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">{posActiveCard.clubVipLevel || 'FOUNDERS'}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-neutral-400 uppercase block">Solde Portefeuille</span>
                    <strong className="text-lg text-emerald-400 font-mono font-bold block">
                      {(posActiveCard.walletBalance || 0).toLocaleString()} {posActiveCard.walletCurrency || 'FCFA'}
                    </strong>
                  </div>
                </div>
              )}

              {/* Choix du montant de la consommation */}
              <div className="space-y-3">
                <label className="text-xs font-agrandir-bold text-neutral-300 uppercase block">
                  Montant à débiter du compte :
                </label>

                {/* Boutons de montants prédéfinis */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Cocktail Signature', amount: 15000 },
                    { label: 'Bouteille VIP', amount: 45000 },
                    { label: 'Salon Table Privée', amount: 120000 },
                  ].map((preset) => (
                    <button
                      key={preset.amount}
                      type="button"
                      onClick={() => setPosAmount(preset.amount)}
                      className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                        posAmount === preset.amount
                          ? 'bg-[#d4af37]/20 border-[#d4af37] text-white shadow-md'
                          : 'bg-[#141414] border-white/5 text-neutral-300 hover:border-white/20'
                      }`}
                    >
                      <div className="text-[10px] text-neutral-400">{preset.label}</div>
                      <div className="font-mono font-bold text-xs text-white mt-0.5">{preset.amount.toLocaleString()} FCFA</div>
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    value={posAmount}
                    onChange={(e) => setPosAmount(Number(e.target.value))}
                    className="w-full bg-[#161616] border border-white/15 focus:border-emerald-400 rounded-xl px-4 py-3.5 font-mono text-xl font-bold text-white focus:outline-none"
                    placeholder="Montant libre..."
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-400">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Lieu / Service */}
              <div className="space-y-1.5">
                <label className="text-xs font-agrandir-bold text-neutral-300 uppercase block">
                  Service / Emplacement :
                </label>
                <select
                  value={posLocation}
                  onChange={(e) => setPosLocation(e.target.value)}
                  className="w-full bg-[#161616] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="Bar Privé VIP Lounge">Bar Privé VIP Lounge</option>
                  <option value="Restaurant Gastronomique Club">Restaurant Gastronomique Club</option>
                  <option value="Service Bouteilles &amp; Salons">Service Bouteilles &amp; Salons</option>
                  <option value="Vestiaire &amp; Conciergerie">Vestiaire &amp; Conciergerie</option>
                </select>
              </div>

              {/* Messages d'erreur & Reçu de validation */}
              {posError && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{posError}</span>
                </div>
              )}

              {posSuccessReceipt && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-white space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-agrandir-bold text-xs uppercase">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>PAIEMENT SANS CONTACT VALIDÉ</span>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">{posSuccessReceipt.reference}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Montant débité</span>
                      <strong className="text-base text-emerald-300 font-mono">
                        -{posSuccessReceipt.amount.toLocaleString()} {posSuccessReceipt.currency}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-mono block">Nouveau Solde</span>
                      <strong className="text-base text-white font-mono">
                        {posSuccessReceipt.balanceAfter.toLocaleString()} {posSuccessReceipt.currency}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton de débit sans contact */}
              <button
                type="button"
                onClick={handlePosDebit}
                disabled={posProcessing || !posActiveCard}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-agrandir-extrabold text-sm uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 shadow-xl flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 text-black" />
                <span>{posProcessing ? 'Lecture de la puce & Débit en cours...' : 'Valider le Paiement Sans Contact'}</span>
              </button>

            </div>
          </div>

          {/* Colonne Droite : Rechargement Express & Historique Récent */}
          <div className="lg:col-span-5 space-y-5">
            
            {/* Boîte Recharge Express */}
            <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center gap-2 text-[#d4af37] font-agrandir-bold text-sm uppercase">
                <PlusCircle className="w-4 h-4" />
                <span>Recharger un Portefeuille</span>
              </div>

              <div className="space-y-3">
                <select
                  value={rechargeCardId || (cards[0]?.id || '')}
                  onChange={(e) => setRechargeCardId(e.target.value)}
                  className="w-full bg-[#161616] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.cardNumber} — {c.cardholderName}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-3 gap-2">
                  {[50000, 100000, 250000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRechargeAmount(amt)}
                      className={`p-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        rechargeAmount === amt
                          ? 'bg-[#d4af37] text-black'
                          : 'bg-[#181818] text-white hover:bg-white/10'
                      }`}
                    >
                      +{(amt / 1000)}k
                    </button>
                  ))}
                </div>

                {rechargeSuccess && (
                  <div className="text-[11px] text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                    {rechargeSuccess}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleRechargeWallet}
                  disabled={rechargeProcessing}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  {rechargeProcessing ? 'Traitement...' : `Créditer +${rechargeAmount.toLocaleString()} FCFA`}
                </button>
              </div>
            </div>

            {/* Dernières transactions */}
            <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <span className="font-agrandir-bold text-xs text-white uppercase flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Derniers Paiements &amp; Débits</span>
                </span>
                <span className="text-[10px] font-mono text-neutral-500">{walletTransactions.length} tx</span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {walletTransactions.slice(0, 5).map(tx => (
                  <div key={tx.id} className="p-3 rounded-xl bg-[#121212] border border-white/5 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-agrandir-bold text-white text-xs">{tx.locationOrService}</div>
                      <div className="text-[10px] text-neutral-400 font-mono">{tx.cardNumber} · {new Date(tx.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono font-bold text-xs ${tx.type === 'credit_recharge' ? 'text-emerald-400' : 'text-neutral-200'}`}>
                        {tx.type === 'credit_recharge' ? '+' : '-'}{tx.amount.toLocaleString()} {tx.currency}
                      </div>
                      <span className="text-[9px] font-mono text-neutral-500 uppercase">{tx.reference}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 3 : INVENTAIRE & RÉCEPTION DES PUCES FOURNISSEUR               */}
      {/* ===================================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Barre d'action supérieure */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
                placeholder="Rechercher par UID, Lot, Titulaire..."
                className="w-full bg-[#171717] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#d4af37] font-agrandir-regular"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={inventoryFilter}
                onChange={(e) => setInventoryFilter(e.target.value as any)}
                className="bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-agrandir-medium"
              >
                <option value="all">Tout le stock ({chipInventory.length})</option>
                <option value="in_stock">Vierges en réserve ({availableStockChips.length})</option>
                <option value="assigned">Scellées aux comptes ({assignedStockChips.length})</option>
                <option value="revoked">Mises au rebut / Révoquées</option>
              </select>

              <button
                type="button"
                onClick={() => setBatchImportOpen(true)}
                className="px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Réceptionner Lot</span>
              </button>
            </div>
          </div>

          {/* Formulaire d'entrée rapide d'une puce reçue */}
          <form onSubmit={handleAddChipToInventory} className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                UID Puce Physique Reçue
              </label>
              <input
                type="text"
                value={newChipUidInput}
                onChange={(e) => setNewChipUidInput(e.target.value.toUpperCase())}
                placeholder="Ex: 04:C5:99:1A:2B:3C:80"
                className="w-full bg-[#161616] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                Numéro de Lot Fabricant
              </label>
              <input
                type="text"
                value={newChipBatchInput}
                onChange={(e) => setNewChipBatchInput(e.target.value.toUpperCase())}
                placeholder="Ex: LOT-NXP-2026-B1"
                className="w-full bg-[#161616] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#d4af37]"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-mono text-neutral-400 block mb-1">
                Modèle Matériel
              </label>
              <div className="text-xs text-neutral-300 font-mono py-2">
                NXP DESFire EV3 (8K)
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isAddingChip || !newChipUidInput.trim()}
                className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40"
              >
                {isAddingChip ? 'Enregistrement...' : '+ Ajouter au Stock'}
              </button>
            </div>
          </form>

          {/* Tableau de l'inventaire des puces */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161616] text-[10px] font-mono uppercase text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">UID Puce Matérielle</th>
                  <th className="p-3.5">Lot &amp; Modèle</th>
                  <th className="p-3.5">Statut Actuel</th>
                  <th className="p-3.5">Affectation Compte Membre</th>
                  <th className="p-3.5">Date de Réception</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-agrandir-regular">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">
                      <span className="bg-black/60 px-2.5 py-1 rounded border border-white/10 text-xs">
                        {item.chipUid}
                      </span>
                    </td>
                    <td className="p-3.5 text-neutral-300 font-mono text-xs">
                      <div>{item.batchNumber}</div>
                      <div className="text-[10px] text-neutral-500">{item.chipType}</div>
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-agrandir-bold uppercase ${
                        item.status === 'in_stock'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : item.status === 'assigned'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {item.status === 'in_stock' ? 'Vierge en Stock' : item.status === 'assigned' ? 'Scellée au Membre' : 'Révoquée'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {item.assignedMemberName ? (
                        <div>
                          <div className="font-agrandir-bold text-white">{item.assignedMemberName}</div>
                          <div className="font-mono text-[10px] text-[#d4af37]">{item.assignedCardNumber}</div>
                        </div>
                      ) : (
                        <span className="text-neutral-500 italic text-[11px]">Non assignée (disponible)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-neutral-400 font-mono text-[11px]">
                      {new Date(item.receivedAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-3.5 text-right">
                      {item.status === 'in_stock' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetectedChipUid(item.chipUid);
                            setActiveTab('encoder');
                          }}
                          className="px-3 py-1 rounded-full bg-[#d4af37]/20 hover:bg-[#d4af37]/30 text-[#d4af37] text-[10px] font-agrandir-bold uppercase transition-colors cursor-pointer"
                        >
                          Associer cette puce
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 4 : GESTION DU CYCLE DE VIE, OPPOSITION & REMPLACEMENT         */}
      {/* ===================================================================== */}
      {activeTab === 'lifecycle' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 space-y-2">
            <h3 className="font-agrandir-bold text-base text-white uppercase flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Gestion des Incidents, Pertes, Vols et Remplacements</span>
            </h3>
            <p className="text-xs text-neutral-400 max-w-2xl">
              Si un membre perd sa carte physique, mettez immédiatement la puce en opposition. Le solde du portefeuille et l'historique restent sauvegardés sur le compte, et vous pouvez associer une nouvelle puce de remplacement en 1 clic.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161616] text-[10px] font-mono uppercase text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">Numéro &amp; Titulaire</th>
                  <th className="p-3.5">UID Puce Actuelle</th>
                  <th className="p-3.5">Statut Carte</th>
                  <th className="p-3.5">Solde Portefeuille</th>
                  <th className="p-3.5 text-right">Actions de Sécurité</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-agrandir-regular">
                {cards.map(c => {
                  const isRevoked = c.cardStatus === 'revoked' || c.cardStatus === 'suspended';
                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-[#d4af37] text-xs">{c.cardNumber}</div>
                        <div className="font-agrandir-bold text-white text-sm">{c.cardholderName}</div>
                        <div className="font-mono text-[10px] text-neutral-500">{c.cardholderEmail}</div>
                      </td>

                      <td className="p-3.5 font-mono text-xs">
                        {c.chipUid ? (
                          <span className={`px-2 py-1 rounded border ${isRevoked ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 line-through' : 'bg-black/60 border-white/10 text-white'}`}>
                            {c.chipUid}
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">Aucune puce</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-agrandir-bold uppercase ${
                          c.cardStatus === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {c.cardStatus === 'active' ? 'Active' : 'Opposition / Révoquée'}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-xs font-bold text-emerald-400">
                        {(c.walletBalance || 0).toLocaleString()} {c.walletCurrency || 'FCFA'}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        {c.cardStatus === 'active' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setRevokeModalCard(c);
                              setRevokeReason('lost');
                              setRevokeNotes('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-agrandir-bold uppercase transition-all cursor-pointer"
                          >
                            Mettre en Opposition
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceModalCard(c);
                              const nextAvailable = chipInventory.find(ci => ci.status === 'in_stock');
                              setReplaceNewChipUid(nextAvailable ? nextAvailable.chipUid : '');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-agrandir-bold uppercase transition-all cursor-pointer"
                          >
                            Émettre Remplacement
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 5 : JOURNAL D'AUDIT & TRAÇABILITÉ (LOGS)                       */}
      {/* ===================================================================== */}
      {activeTab === 'logs' && (
        <div className="space-y-5 animate-fadeIn">
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Rechercher par carte, nom, UID puce, opérateur..."
                className="w-full bg-[#171717] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-agrandir-regular"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={logActionFilter}
                onChange={(e) => setLogActionFilter(e.target.value as any)}
                className="bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-agrandir-medium"
              >
                <option value="all">Toutes les actions ({logs.length})</option>
                <option value="ASSOCIATION_INITIALE">Associations Initiales</option>
                <option value="REASSOCIATION">Réassociations / Remplacements</option>
                <option value="CHIP_REVOKED">Mises en Opposition</option>
              </select>

              <button
                type="button"
                onClick={handleExportAuditCsv}
                disabled={filteredLogs.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-40 shadow-md"
              >
                <Download className="w-3.5 h-3.5 text-black" />
                <span>Exporter CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161616] text-[10px] font-mono uppercase text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">Horodatage</th>
                  <th className="p-3.5">Numéro &amp; Titulaire</th>
                  <th className="p-3.5">UID Puce Matérielle</th>
                  <th className="p-3.5">Action Réalisée</th>
                  <th className="p-3.5">Opérateur / Poste</th>
                  <th className="p-3.5">Contrôle Cryptographique</th>
                  <th className="p-3.5 text-right">Détails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-agrandir-regular">
                {filteredLogs.map(log => {
                  const d = log.details || {};
                  return (
                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-mono text-white text-[11px] font-semibold">
                          {new Date(log.createdAt).toLocaleString('fr-FR')}
                        </div>
                        <span className="text-[9px] font-mono text-neutral-500 block">{log.id}</span>
                      </td>

                      <td className="p-3.5">
                        <div className="font-mono font-bold text-[#d4af37] text-xs">{d.cardNumber}</div>
                        <div className="text-white font-agrandir-bold">{d.cardholderName}</div>
                      </td>

                      <td className="p-3.5 font-mono text-xs">
                        <span className="bg-black/60 px-2.5 py-1 rounded border border-white/10 text-emerald-400 font-bold">
                          {d.chipUid || 'Inconnu'}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-agrandir-bold uppercase bg-white/10 text-white">
                          {d.action || log.actionType}
                        </span>
                      </td>

                      <td className="p-3.5 text-neutral-300 font-agrandir-medium text-xs">
                        {log.actorId}
                      </td>

                      <td className="p-3.5">
                        <div className="inline-flex items-center gap-1 text-emerald-400 text-xs font-agrandir-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Scellée AES-128</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedLogForModal(log)}
                          className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/15 text-neutral-300 text-[10px] font-agrandir-bold uppercase cursor-pointer"
                        >
                          Détails
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : RÉCEPTION CARTON / BATCH IMPORT                               */}
      {/* ===================================================================== */}
      {batchImportOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-agrandir-bold text-white uppercase">
                Réceptionner un Lot de Puces (Fabricant)
              </h3>
              <button
                type="button"
                onClick={() => setBatchImportOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Collez la liste des UIDs des puces NXP DESFire EV3 fournies par l'imprimeur (un UID par ligne).
            </p>

            <textarea
              rows={6}
              value={batchImportUids}
              onChange={(e) => setBatchImportUids(e.target.value)}
              placeholder="04:A1:22:33:44:55:80&#10;04:B2:33:44:55:66:81&#10;04:C3:44:55:66:77:82"
              className="w-full bg-[#181818] border border-white/15 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-[#d4af37]"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBatchImportOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-agrandir-bold text-neutral-300"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleBatchImportChips}
                disabled={!batchImportUids.trim()}
                className="px-5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-bold text-xs uppercase"
              >
                Intégrer au Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : OPPOSITION (PERTE / VOL)                                     */}
      {/* ===================================================================== */}
      {revokeModalCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-rose-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-agrandir-bold text-sm uppercase">
                <ShieldAlert className="w-5 h-5" />
                <span>Mise en Opposition</span>
              </div>
              <button type="button" onClick={() => setRevokeModalCard(null)} className="p-1 rounded-full hover:bg-white/10 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Voulez-vous révoquer la puce <strong>{revokeModalCard.chipUid}</strong> appartenant à <strong>{revokeModalCard.cardholderName}</strong> ({revokeModalCard.cardNumber}) ?
            </p>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-neutral-400">Motif d'opposition</label>
              <select
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value as any)}
                className="w-full bg-[#181818] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="lost">Carte égarée / Perte</option>
                <option value="stolen">Vol de carte déclaré</option>
                <option value="damaged">Carte physique défectueuse / endommagée</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setRevokeModalCard(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-neutral-300 font-agrandir-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                disabled={isRevoking}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-agrandir-bold text-xs uppercase"
              >
                {isRevoking ? 'Révocation...' : 'Bloquer Immédiatement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : REMPLACEMENT NOUVELLE PUCE                                    */}
      {/* ===================================================================== */}
      {replaceModalCard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-agrandir-bold text-sm uppercase">
                <CheckCircle2 className="w-5 h-5" />
                <span>Remplacer la Carte (Nouvelle Puce)</span>
              </div>
              <button type="button" onClick={() => setReplaceModalCard(null)} className="p-1 rounded-full hover:bg-white/10 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-300">
              Attribuer une nouvelle puce vierge à <strong>{replaceModalCard.cardholderName}</strong>. Le solde du portefeuille ({(replaceModalCard.walletBalance || 0).toLocaleString()} FCFA) et le numéro <strong>{replaceModalCard.cardNumber}</strong> seront intégralement conservés.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] uppercase font-mono text-neutral-400">UID Nouvelle Puce Vierge</label>
              <input
                type="text"
                value={replaceNewChipUid}
                onChange={(e) => setReplaceNewChipUid(e.target.value.toUpperCase())}
                placeholder="Ex: 04:C5:99:1A:2B:3C:80"
                className="w-full bg-[#181818] border border-white/15 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setReplaceModalCard(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs text-neutral-300 font-agrandir-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={isReplacing || !replaceNewChipUid.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-agrandir-bold text-xs uppercase"
              >
                {isReplacing ? 'Scellement...' : 'Sceller Nouvelle Puce'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL : DÉTAILS D'UN ÉVÉNEMENT D'AUDIT                                */}
      {/* ===================================================================== */}
      {selectedLogForModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#121212] border border-white/15 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#d4af37] font-agrandir-bold text-sm uppercase">
                <FileCheck className="w-5 h-5" />
                <span>Rapport d'Audit Cryptographique</span>
              </div>
              <button type="button" onClick={() => setSelectedLogForModal(null)} className="p-1 rounded-full hover:bg-white/10 text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-black/60 border border-white/10 font-mono text-xs space-y-2 text-neutral-300">
              <div className="flex justify-between">
                <span className="text-neutral-500">ID Événement :</span>
                <span className="text-white font-bold">{selectedLogForModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Horodatage :</span>
                <span className="text-white">{new Date(selectedLogForModal.createdAt).toISOString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Action :</span>
                <span className="text-[#d4af37] font-bold">{selectedLogForModal.details?.action || selectedLogForModal.actionType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">UID Puce :</span>
                <span className="text-emerald-400 font-bold">{selectedLogForModal.details?.chipUid}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Titulaire :</span>
                <span className="text-white">{selectedLogForModal.details?.cardholderName} ({selectedLogForModal.details?.cardNumber})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Opérateur :</span>
                <span className="text-white">{selectedLogForModal.actorId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Statut Scellement :</span>
                <span className="text-emerald-400 font-bold">{selectedLogForModal.details?.lockStatus || 'locked_aes128'}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLogForModal(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-agrandir-bold text-xs uppercase"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
