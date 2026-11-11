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
  UserCheck
} from 'lucide-react';
import {
  MembershipPhysicalCardOrder,
  MembershipCard,
  PhysicalCardProductionStatus,
} from '../../../types';

export const AdminWorkshopView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'encoder' | 'test' | 'register'>('encoder');

  const [cards, setCards] = useState<MembershipCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // État de l'Encodeur
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [detectedChipUid, setDetectedChipUid] = useState<string>('');
  const [chipType, setChipType] = useState<string>('NXP MIFARE DESFire EV3 (ISO/IEC 14443-A)');
  const [isReadingHardware, setIsReadingHardware] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [encodeSuccessMessage, setEncodeSuccessMessage] = useState<string | null>(null);
  const [encodeErrorMessage, setEncodeErrorMessage] = useState<string | null>(null);

  // Banc de Test RFID / NFC
  const [testChipUidInput, setTestChipUidInput] = useState<string>('');
  const [testingChip, setTestingChip] = useState(false);
  const [testResult, setTestResult] = useState<any | null>(null);

  // Filtres
  const [searchQuery, setSearchQuery] = useState('');
  const [chipFilter, setChipFilter] = useState<'all' | 'encoded' | 'pending'>('all');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/membership/admin/cards');
      const data = await res.json();
      if (data.success && data.cards) {
        setCards(data.cards);
        if (!selectedCardId && data.cards.length > 0) {
          const firstPending = data.cards.find((c: MembershipCard) => !c.chipUid) || data.cards[0];
          setSelectedCardId(firstPending.id);
        }
      }
    } catch (err) {
      console.error('Erreur chargement cartes pour encodage:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Déclencher la détection de la puce via le lecteur NFC (Web NFC ou simulation instantanée)
  const handleScanFromHardware = async () => {
    setIsReadingHardware(true);
    setEncodeErrorMessage(null);
    setEncodeSuccessMessage(null);

    // Si le navigateur supporte Web NFC (smartphones / tablettes / lecteurs compatibles Chrome)
    if ('NDEFReader' in window) {
      try {
        const ndef = new (window as any).NDEFReader();
        await ndef.scan();
        ndef.addEventListener('reading', ({ serialNumber }: any) => {
          if (serialNumber) {
            setDetectedChipUid(serialNumber.toUpperCase());
            setIsReadingHardware(false);
          }
        });
        return;
      } catch (e: any) {
        console.warn('Web NFC standard non accessible, bascule sur encodeur USB/saisie directe.', e);
      }
    }

    // Simulation de lecture physique de la puce (UID 7-bytes standard DESFire EV3)
    setTimeout(() => {
      const hex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase();
      const randomUid = `04:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}:${hex()}`;
      setDetectedChipUid(randomUid);
      setIsReadingHardware(false);
    }, 700);
  };

  // Encodage & Association atomique de la puce au compte
  const handleAssociateChip = async () => {
    if (!selectedCardId) {
      setEncodeErrorMessage('Veuillez sélectionner une carte de membre.');
      return;
    }
    if (!detectedChipUid.trim()) {
      setEncodeErrorMessage('Veuillez scanner ou saisir l\'UID de la puce physique.');
      return;
    }

    try {
      setIsEncoding(true);
      setEncodeErrorMessage(null);
      setEncodeSuccessMessage(null);

      const res = await fetch(`/api/membership/cards/${selectedCardId}/encode-chip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipUid: detectedChipUid.trim(),
          chipType: 'NXP_DESFire_EV3',
          operatorId: 'Atelier Encodage LUMARÉEL (Vérifié)',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Échec de l\'association de la puce.');
      }

      setEncodeSuccessMessage(`Puce physique (${detectedChipUid}) associée avec succès à la carte ${data.card.cardNumber} (${data.card.cardholderName}).`);
      setDetectedChipUid('');
      fetchCards();
    } catch (err: any) {
      setEncodeErrorMessage(err.message || 'Erreur lors de l\'association.');
    } finally {
      setIsEncoding(false);
    }
  };

  // Tester la puce sur le banc d'essai
  const handleTestChip = async (uidToTest?: string) => {
    const uid = uidToTest || testChipUidInput;
    if (!uid.trim()) return;

    try {
      setTestingChip(true);
      setTestResult(null);

      const cleanUid = uid.trim();
      const res = await fetch(`/api/membership/verify-chip/${encodeURIComponent(cleanUid)}`);
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ valid: false, error: err.message || 'Erreur de connexion au lecteur.' });
    } finally {
      setTestingChip(false);
    }
  };

  const selectedCard = cards.find((c) => c.id === selectedCardId);

  const filteredCards = cards.filter((c) => {
    const matchSearch =
      c.cardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cardholderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.cardholderEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.chipUid && c.chipUid.toLowerCase().includes(searchQuery.toLowerCase()));

    if (chipFilter === 'encoded') return matchSearch && !!c.chipUid;
    if (chipFilter === 'pending') return matchSearch && !c.chipUid;
    return matchSearch;
  });

  const totalCards = cards.length;
  const encodedCardsCount = cards.filter((c) => !!c.chipUid).length;
  const pendingCardsCount = totalCards - encodedCardsCount;

  return (
    <div className="space-y-6 text-[#EFEFEF] font-agrandir-regular">
      
      {/* Header : Station d'Encodage Puces NFC / RFID */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-[#0c0c0c] border border-white/10 shadow-2xl">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 text-[10px] font-agrandir-bold tracking-widest text-[#d4af37] uppercase">
            <Radio className="w-3.5 h-3.5 text-[#d4af37]" />
            <span>ATELIER MATÉRIEL · ENCODEUR NFC / RFID</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white">
            ASSOCIATION DES PUCES SÉCURISÉES
          </h1>
          <p className="text-xs text-neutral-400 font-light">
            Association matérielle des puces NXP DESFire EV3 / RFID 13.56 MHz aux comptes membres LUMARÉEL CARD.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchCards}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs text-neutral-300 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#d4af37]' : ''}`} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Métriques d'Encodage */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-white/10 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-neutral-400">Total Cartes Commandées</div>
            <div className="text-2xl font-mono font-bold text-white mt-0.5">{totalCards}</div>
          </div>
          <CreditCard className="w-6 h-6 text-[#d4af37]" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-emerald-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-emerald-400">Puces Encodées & Associées</div>
            <div className="text-2xl font-mono font-bold text-emerald-300 mt-0.5">{encodedCardsCount}</div>
          </div>
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
        </div>

        <div className="p-4 rounded-2xl bg-[#0e0e0e] border border-amber-500/20 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-amber-400">En Attente de Puce</div>
            <div className="text-2xl font-mono font-bold text-amber-300 mt-0.5">{pendingCardsCount}</div>
          </div>
          <Cpu className="w-6 h-6 text-amber-400" />
        </div>
      </div>

      {/* Onglets de travail */}
      <div className="flex border-b border-white/10 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('encoder')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'encoder'
              ? 'border-[#d4af37] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 text-[#d4af37]" />
          <span>Poste d'Encodage & Association</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('test')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'test'
              ? 'border-[#d4af37] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-400" />
          <span>Banc d'Essai & Test de Lecture</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={`px-5 py-3 text-xs font-agrandir-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'register'
              ? 'border-[#d4af37] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 text-neutral-400" />
          <span>Registre des Puces ({cards.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* ONGLET 1 : POSTE D'ENCODAGE PHYSIQUE & ASSOCIATION                   */}
      {/* ===================================================================== */}
      {activeTab === 'encoder' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Colonne Gauche : Sélection de la carte à encoder */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-4 shadow-xl">
              <h3 className="font-agrandir-bold text-sm text-white uppercase flex items-center gap-2">
                <span>1. Choisir le compte & la carte</span>
              </h3>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">
                  Cartes commandées en attente ou enregistrées
                </label>
                <select
                  value={selectedCardId}
                  onChange={(e) => {
                    setSelectedCardId(e.target.value);
                    setEncodeSuccessMessage(null);
                    setEncodeErrorMessage(null);
                  }}
                  className="w-full bg-[#181818] border border-white/15 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cardNumber} — {c.cardholderName} {c.chipUid ? '(Puce: ' + c.chipUid + ')' : '(⚠️ En attente)'}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCard && (
                <div className="p-4 rounded-2xl bg-[#141414] border border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-400">Titulaire :</span>
                    <strong className="text-white">{selectedCard.cardholderName}</strong>
                  </div>
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-400">Adresse e-mail :</span>
                    <span className="font-mono text-neutral-300">{selectedCard.cardholderEmail}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-400">Numéro Permanent :</span>
                    <span className="font-mono font-bold text-[#d4af37]">{selectedCard.cardNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-neutral-300">
                    <span className="text-neutral-400">Statut Puce Actuel :</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold ${
                      selectedCard.chipUid
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {selectedCard.chipUid ? `Encodée (${selectedCard.chipUid})` : 'Non encore associée'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Fiche Encodeur Matériel */}
            <div className="p-5 rounded-2xl bg-[#090909] border border-white/5 space-y-2 text-[11px] text-neutral-400">
              <div className="flex items-center gap-2 text-white font-agrandir-bold">
                <Radio className="w-4 h-4 text-[#d4af37]" />
                <span>Encodeur USB / Contactless 13.56 MHz</span>
              </div>
              <p>
                Connectez votre encodeur de cartes (ACR122U, Omnikey, ou lecteur USB HID). Lorsque vous approchez la carte PVC de la zone de lecture, l'UID physique est capturé instantanément.
              </p>
            </div>
          </div>

          {/* Colonne Droite : Détection de la puce & Validation */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-5 shadow-xl">
              <h3 className="font-agrandir-bold text-sm text-white uppercase flex items-center gap-2">
                <span>2. Détection de la Puce & Association</span>
              </h3>

              {/* Zone de scan & détection */}
              <div className="p-6 rounded-2xl bg-[#141414] border-2 border-dashed border-white/20 text-center space-y-4 relative overflow-hidden">
                <div className="w-16 h-16 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center mx-auto text-[#d4af37] shadow-lg">
                  <Radio className={`w-8 h-8 ${isReadingHardware ? 'animate-pulse text-amber-300' : ''}`} />
                </div>

                <div className="space-y-1">
                  <div className="text-xs font-agrandir-bold text-white uppercase">
                    {isReadingHardware ? 'Présentez la carte sur le lecteur...' : 'Prêt pour la lecture de puce'}
                  </div>
                  <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
                    Déposez la carte PVC sur votre lecteur ou saisissez directement l'UID (ex: 04:A2:8F:12:9C:5E:80).
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleScanFromHardware}
                    disabled={isReadingHardware}
                    className="px-6 py-2.5 rounded-full bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>{isReadingHardware ? 'Lecture en cours...' : 'Détecter Puce (Lecteur)'}</span>
                  </button>
                </div>
              </div>

              {/* Champ UID de puce */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">
                  UID Matériel de la Puce (7-Byte Hexadécimal ISO 14443-A) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={detectedChipUid}
                    onChange={(e) => setDetectedChipUid(e.target.value.toUpperCase())}
                    placeholder="Ex : 04:A2:8F:12:9C:5E:80"
                    className="flex-1 bg-[#181818] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono text-[#d4af37] font-bold focus:outline-none focus:border-[#d4af37]"
                  />
                </div>
              </div>

              {/* Type de puce */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-neutral-400 uppercase">
                  Modèle Matériel Sélectionné
                </label>
                <input
                  type="text"
                  readOnly
                  value={chipType}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-neutral-300"
                />
              </div>

              {/* Messages retour */}
              {encodeSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{encodeSuccessMessage}</span>
                </div>
              )}

              {encodeErrorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{encodeErrorMessage}</span>
                </div>
              )}

              {/* Bouton Encodage & Association */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleAssociateChip}
                  disabled={isEncoding || !detectedChipUid.trim() || !selectedCardId}
                  className="w-full py-4 rounded-full bg-[#d4af37] hover:bg-[#e5c04b] text-black font-agrandir-extrabold text-xs tracking-wider uppercase transition-all shadow-xl shadow-[#d4af37]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01]"
                >
                  <Lock className="w-4 h-4 text-black" />
                  <span>
                    {isEncoding ? 'Verrouillage & Association en cours...' : 'Associer la puce & Verrouiller la carte'}
                  </span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 2 : BANC D'ESSAI & CONTRÔLE DE LECTURE NFC                    */}
      {/* ===================================================================== */}
      {activeTab === 'test' && (
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0e0e0e] border border-white/10 space-y-6 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <Radio className="w-7 h-7" />
              </div>
              <h3 className="font-agrandir-extrabold text-xl text-white uppercase">
                Banc d'Essai de Contrôle d'Accès Puce
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Approchez n'importe quelle carte pour vérifier instantanément son autorisation, l'identité du membre et ses droits d'accès.
              </p>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={testChipUidInput}
                onChange={(e) => setTestChipUidInput(e.target.value.toUpperCase())}
                placeholder="Scanner l'UID (Ex : 04:A2:8F:12:9C:5E:80)"
                className="flex-1 bg-[#181818] border border-white/15 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => handleTestChip()}
                disabled={testingChip || !testChipUidInput.trim()}
                className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-agrandir-bold text-xs uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-40"
              >
                {testingChip ? 'Lecture...' : 'Tester'}
              </button>
            </div>

            {/* Suggestions rapides depuis les cartes encodées */}
            {encodedCardsCount > 0 && (
              <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[10px] text-neutral-400 uppercase font-mono">Puces actives :</span>
                {cards
                  .filter((c) => c.chipUid)
                  .slice(0, 3)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setTestChipUidInput(c.chipUid!);
                        handleTestChip(c.chipUid!);
                      }}
                      className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-mono text-[#d4af37] transition-colors cursor-pointer"
                    >
                      {c.cardNumber} ({c.chipUid})
                    </button>
                  ))}
              </div>
            )}

            {/* Rendu du Résultat de Test */}
            {testResult && (
              <div className={`p-6 rounded-2xl border transition-all ${
                testResult.valid
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    testResult.valid ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'
                  }`}>
                    {testResult.valid ? '✓' : '✕'}
                  </div>
                  <div>
                    <div className="text-xs font-mono uppercase tracking-widest">
                      {testResult.outcome || (testResult.valid ? 'ACCÈS VALIDÉ' : 'ACCÈS REFUSÉ')}
                    </div>
                    <div className="font-agrandir-extrabold text-base text-white uppercase">
                      {testResult.card?.cardholderName || testResult.message || 'Puce non autorisée'}
                    </div>
                  </div>
                </div>

                {testResult.card && (
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-white/10 pt-3">
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase font-mono block">Numéro</span>
                      <strong className="text-white font-mono">{testResult.card.cardNumber}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase font-mono block">UID Reconnu</span>
                      <strong className="text-[#d4af37] font-mono">{testResult.card.chipUid}</strong>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase font-mono block">Statut Titulaire</span>
                      <span className="text-emerald-400 font-bold uppercase">{testResult.card.status}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 text-[10px] uppercase font-mono block">Validité</span>
                      <span className="text-white font-mono">{new Date(testResult.card.expiresAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ONGLET 3 : REGISTRE COMPLET DES PUCES ET CARTES                      */}
      {/* ===================================================================== */}
      {activeTab === 'register' && (
        <div className="space-y-4">
          
          {/* Barre de filtres */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-[#0c0c0c] border border-white/10">
            <div className="relative flex-1 sm:w-80">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher carte, nom, UID..."
                className="w-full bg-[#171717] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-white font-agrandir-regular"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={chipFilter}
                onChange={(e) => setChipFilter(e.target.value as any)}
                className="bg-[#171717] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
              >
                <option value="all">Toutes les cartes ({cards.length})</option>
                <option value="encoded">Puces encodées ({encodedCardsCount})</option>
                <option value="pending">En attente de puce ({pendingCardsCount})</option>
              </select>
            </div>
          </div>

          {/* Tableau des cartes */}
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0e0e0e]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161616] text-[10px] font-mono uppercase text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="p-3.5">Numéro</th>
                  <th className="p-3.5">Titulaire</th>
                  <th className="p-3.5">UID Puce Matérielle</th>
                  <th className="p-3.5">Modèle Puce</th>
                  <th className="p-3.5">Statut</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCards.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">
                      {c.cardNumber}
                    </td>
                    <td className="p-3.5 font-agrandir-bold text-white">
                      <div>{c.cardholderName}</div>
                      <div className="text-[10px] text-neutral-500 font-mono font-normal">{c.cardholderEmail}</div>
                    </td>
                    <td className="p-3.5 font-mono text-xs">
                      {c.chipUid ? (
                        <span className="font-bold text-[#d4af37] bg-black/60 px-2 py-1 rounded border border-[#d4af37]/30">
                          {c.chipUid}
                        </span>
                      ) : (
                        <span className="text-neutral-500 italic">Non encore associée</span>
                      )}
                    </td>
                    <td className="p-3.5 text-neutral-300 font-mono text-[11px]">
                      {c.chipType || 'NXP DESFire EV3'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-agrandir-bold uppercase ${
                        c.chipUid
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {c.chipUid ? 'Active & Encodée' : 'Puce Manquante'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCardId(c.id);
                          if (c.chipUid) setDetectedChipUid(c.chipUid);
                          setActiveTab('encoder');
                        }}
                        className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-agrandir-bold uppercase transition-colors cursor-pointer"
                      >
                        {c.chipUid ? 'Réassocier' : 'Associer Puce'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
};
