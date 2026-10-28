import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { QrCode, CheckCircle2, XCircle, AlertTriangle, Shield, Smartphone } from 'lucide-react';

interface ScanHistoryItem {
  time: string;
  query: string;
  result: any;
}

export const GateScanner: React.FC = () => {
  const { events, showToast } = useApp();
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || 'event-1');
  const [inputToken, setInputToken] = useState<string>('');
  const [gateAgentName, setGateAgentName] = useState<string>('Porte Principale — Agent A1');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  const handleVerify = async (manualToken?: string) => {
    const tokenToTest = manualToken || inputToken;
    if (!tokenToTest.trim()) {
      showToast('Veuillez renseigner un jeton ou numéro de série.', 'error');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await fetch('/api/tickets/verify-and-burn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenToTest.trim(),
          eventId: selectedEventId,
          gateAgentName,
        }),
      });

      const data = await res.json();
      setLastResult(data);

      const historyItem: ScanHistoryItem = {
        time: new Date().toLocaleTimeString('fr-FR'),
        query: tokenToTest.trim(),
        result: data,
      };
      setScanHistory((prev) => [historyItem, ...prev.slice(0, 19)]);

      if (data.status === 'VALID') {
        showToast('ACCÈS ACCORDÉ : Billet validé avec succès.', 'success');
        if (!manualToken) setInputToken('');
      } else if (data.status === 'ALREADY_USED') {
        showToast('REFUS : Billet déjà scanné (fraude potentielle).', 'error');
      } else if (data.status === 'WRONG_EVENT') {
        showToast('REFUS : Billet pour un autre concert.', 'error');
      } else {
        showToast('REFUS : Billet invalide ou faux jeton.', 'error');
      }
    } catch (err: any) {
      showToast('Erreur de connexion avec le serveur de billetterie.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pt-28 sm:pt-32 pb-16">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-[#222] pb-6">
        <div>
          <div className="text-[10px] font-agrandir-regular tracking-[0.25em] text-[#888] uppercase mb-1">
            CONTRÔLEUR PORTIQUE LUMARÉEL CO.
          </div>
          <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight uppercase flex items-center gap-3">
            <QrCode className="w-7 h-7 text-white" />
            <span>TERMINAL DE CONTRÔLE D’ACCÈS</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-agrandir-semibold px-3 py-1 bg-[#1a1a1a] text-emerald-400 border border-emerald-900/40">
            CONNECTÉ AU SERVEUR SÉCURISÉ
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Control Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Gate & Event Configuration with rounded-3xl */}
          <div className="bg-[#101010] border border-white/10 rounded-3xl p-6 font-agrandir-regular text-xs space-y-4 shadow-xl">
            <div className="text-[11px] font-agrandir-semibold text-white uppercase tracking-wider border-b border-white/10 pb-2">
              PARAMÈTRES DU POSTE DE CONTRÔLE
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">
                  ÉVÉNEMENT ACTUELLEMENT CONTRÔLÉ
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full bg-[#181818] border border-white/15 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-white font-agrandir-regular"
                >
                  {events.map((evt) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.title} ({evt.date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">
                  IDENTIFIANT AGENT / PORTE
                </label>
                <input
                  type="text"
                  value={gateAgentName}
                  onChange={(e) => setGateAgentName(e.target.value)}
                  className="w-full bg-[#181818] border border-white/15 rounded-2xl px-4 py-2.5 text-white focus:outline-none focus:border-white font-agrandir-regular"
                />
              </div>
            </div>
          </div>

          {/* Scanner Input / Barcode reader box with rounded-3xl */}
          <div className="bg-[#101010] border border-white/10 rounded-3xl p-6 sm:p-8 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/15 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="w-8 h-8 text-[#d4af37]" />
            </div>

            <h3 className="font-agrandir-extrabold text-lg text-white mb-1 uppercase">
              SCANNER OU SAISIR LE BILLET
            </h3>
            <p className="text-xs font-agrandir-regular text-[#888] max-w-sm mx-auto mb-6">
              Pointez la douchette optique, la caméra mobile ou tapez le numéro de série / jeton présent sur le billet électronique.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify();
              }}
              className="flex gap-2 max-w-md mx-auto mb-6"
            >
              <input
                type="text"
                value={inputToken}
                onChange={(e) => setInputToken(e.target.value)}
                placeholder="Ex: TKT_SEC_... ou LMR-2026-WAN-4821"
                className="flex-1 bg-[#181818] border border-white/15 rounded-full px-5 py-3 text-xs font-agrandir-regular text-white tracking-widest uppercase focus:outline-none focus:border-white"
                autoFocus
              />
              <button
                type="submit"
                disabled={isVerifying || !inputToken.trim()}
                className="px-7 py-3 bg-white text-black text-xs font-agrandir-semibold tracking-widest uppercase hover:bg-[#eaeaea] rounded-full disabled:opacity-40 transition-colors cursor-pointer shadow-md"
              >
                {isVerifying ? 'VÉRIF...' : 'VALIDER'}
              </button>
            </form>

            {/* Quick Test Bench buttons for rapid validation testing */}
            <div className="pt-5 border-t border-white/10 text-left">
              <div className="text-[10px] font-agrandir-regular tracking-widest uppercase text-[#777] mb-3 text-center">
                JEU D’ESSAI RAPIDE (TESTER TOUS LES CAS DE CONTRÔLE) :
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] font-agrandir-regular">
                <button
                  type="button"
                  onClick={() => handleVerify('TKT_SEC_98A4F1E08C3B127')}
                  className="p-3 border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/40 rounded-2xl text-left transition-colors cursor-pointer"
                >
                  <span className="block font-agrandir-semibold">1. Billet Valide</span>
                  <span className="text-[10px] text-emerald-400/80">TKT_SEC_98A4F1... (LMR-2026-WAN-4821)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVerify('TKT_SEC_B24CD77382EF091')}
                  className="p-3 border border-rose-500/40 bg-rose-950/20 text-rose-300 hover:bg-rose-950/40 rounded-2xl text-left transition-colors cursor-pointer"
                >
                  <span className="block font-agrandir-semibold">2. Billet Déjà Scanné</span>
                  <span className="text-[10px] text-rose-400/80">TKT_SEC_B24CD7... (Doit refuser)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVerify('TKT_SEC_WRONG_EVENT_999')}
                  className="p-3 border border-amber-500/40 bg-amber-950/20 text-amber-300 hover:bg-amber-950/40 rounded-2xl text-left transition-colors cursor-pointer"
                >
                  <span className="block font-agrandir-semibold">3. Mauvais Concert</span>
                  <span className="text-[10px] text-amber-400/80">Concert différent de la salle</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleVerify('FAUX_BILLET_PIRATE')}
                  className="p-3 border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 rounded-2xl text-left transition-colors cursor-pointer"
                >
                  <span className="block font-agrandir-semibold">4. Faux Billet / Inconnu</span>
                  <span className="text-[10px] text-stone-400">Jeton non répertorié</span>
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Right Column: INSTANT VALIDATION OUTCOME FEEDBACK (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-[#101010] border border-white/10 rounded-3xl p-6 sm:p-7 min-h-[340px] flex flex-col justify-between shadow-xl">
            <div>
              <div className="text-[10px] font-agrandir-regular tracking-[0.2em] text-[#777] uppercase mb-4 border-b border-white/10 pb-2 font-agrandir-semibold">
                RÉSULTAT DU CONTRÔLE SERVEUR EN DIRECT
              </div>

              {!lastResult ? (
                <div className="text-center py-12 text-xs font-agrandir-regular text-[#555]">
                  En attente d’un scan...
                </div>
              ) : lastResult.status === 'VALID' ? (
                /* SUCCESS: ACCESS GRANTED */
                <div className="p-6 bg-emerald-950/40 border-2 border-emerald-500 rounded-2xl text-emerald-200 text-center font-agrandir-regular animate-fadeIn shadow-xl">
                  <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
                  <div className="text-lg font-agrandir-extrabold uppercase tracking-wider text-white">
                    ENTRÉE AUTORISÉE
                  </div>
                  <div className="text-xs text-emerald-300 mt-1 mb-4 font-agrandir-regular">
                    {lastResult.message}
                  </div>

                  {lastResult.ticket && (
                    <div className="bg-black/50 p-4 border border-emerald-800/40 rounded-xl text-left text-xs space-y-1.5 mt-2 font-agrandir-regular">
                      <div><span className="text-[#888]">CATÉGORIE :</span> <strong className="text-white font-agrandir-semibold">{lastResult.ticket.categoryName}</strong></div>
                      <div><span className="text-[#888]">TITULAIRE :</span> <strong className="text-white font-agrandir-semibold">{lastResult.ticket.holderName}</strong></div>
                      <div><span className="text-[#888]">NUMÉRO SÉRIE :</span> <strong className="text-white font-agrandir-semibold">{lastResult.ticket.serialNumber}</strong></div>
                      <div><span className="text-[#888]">CONCERT :</span> <span className="text-[#ccc]">{lastResult.ticket.eventTitle}</span></div>
                    </div>
                  )}
                </div>
              ) : lastResult.status === 'ALREADY_USED' ? (
                /* ERROR: ALREADY CHECKED IN (DOUBLE SCAN PREVENTED) */
                <div className="p-6 bg-rose-950/40 border-2 border-rose-500 rounded-2xl text-rose-200 text-center font-agrandir-regular animate-fadeIn shadow-xl">
                  <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-3" />
                  <div className="text-lg font-agrandir-extrabold uppercase tracking-wider text-rose-400">
                    ENTRÉE STRICTEMENT REFUSÉE
                  </div>
                  <div className="text-xs text-rose-300 font-agrandir-semibold mt-1 mb-3">
                    BILLET DÉJÀ VALIDÉ (RISQUE DE DOUBLE PASSAGE)
                  </div>

                  {lastResult.previousCheckIn && (
                    <div className="bg-black/50 p-4 border border-rose-800/40 rounded-xl text-left text-xs space-y-1 mt-2 font-agrandir-regular">
                      <div className="text-white font-agrandir-semibold">DÉJÀ ENREGISTRÉ :</div>
                      <div><span className="text-[#888]">Heure de scan :</span> <strong className="text-white font-agrandir-semibold">{lastResult.previousCheckIn.checkedInAt}</strong></div>
                      <div><span className="text-[#888]">Point de contrôle :</span> <strong className="text-white font-agrandir-semibold">{lastResult.previousCheckIn.checkedInBy}</strong></div>
                    </div>
                  )}
                </div>
              ) : lastResult.status === 'WRONG_EVENT' ? (
                /* ERROR: WRONG EVENT */
                <div className="p-6 bg-amber-950/40 border-2 border-amber-500 rounded-2xl text-amber-200 text-center font-agrandir-regular shadow-xl">
                  <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto mb-3" />
                  <div className="text-lg font-agrandir-extrabold uppercase tracking-wider text-amber-300">
                    MAUVAIS ÉVÉNEMENT
                  </div>
                  <div className="text-xs text-amber-200 mt-2 font-agrandir-regular">
                    {lastResult.message}
                  </div>
                </div>
              ) : (
                /* ERROR: INVALID */
                <div className="p-6 bg-stone-900 border-2 border-stone-600 rounded-2xl text-stone-200 text-center font-agrandir-regular shadow-xl">
                  <XCircle className="w-16 h-16 text-stone-400 mx-auto mb-3" />
                  <div className="text-lg font-agrandir-extrabold uppercase tracking-wider text-white">
                    BILLET NON RECONNU
                  </div>
                  <div className="text-xs text-stone-400 mt-2 font-agrandir-regular">
                    {lastResult.message}
                  </div>
                </div>
              )}
            </div>

            <div className="text-[10px] font-agrandir-regular text-[#555] border-t border-white/10 pt-3 text-center">
              VALIDATION ATOMIQUE CÔTÉ SERVEUR · PRÉVIENT LES FRAUDES ET REPLAYS
            </div>
          </div>

          {/* Recent scan audit log with rounded-3xl */}
          <div className="bg-[#101010] border border-white/10 rounded-3xl p-6 font-agrandir-regular text-xs shadow-xl">
            <div className="flex items-center justify-between text-[10px] uppercase text-[#777] mb-3 pb-2 border-b border-white/10 font-agrandir-semibold">
              <span>JOURNAL DES DERNIERS SCANS</span>
              <span>{scanHistory.length} PASSAGES</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {scanHistory.length === 0 ? (
                <div className="text-[#555] text-center py-4 text-[11px]">
                  Aucun scan récent dans cette session.
                </div>
              ) : (
                scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#141414] border border-[#222] flex items-center justify-between text-[11px] font-agrandir-regular"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.result.status === 'VALID'
                            ? 'bg-emerald-400'
                            : item.result.status === 'ALREADY_USED'
                            ? 'bg-rose-500'
                            : 'bg-amber-400'
                        }`}
                      />
                      <span className="text-[#888]">{item.time}</span>
                      <span className="text-white font-agrandir-semibold">
                        {item.result.status}
                      </span>
                    </div>
                    <span className="text-[#666] truncate max-w-[120px]">
                      {item.query}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
