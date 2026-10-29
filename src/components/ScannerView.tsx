import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import {
  Shield,
  Camera,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  KeyRound,
  Sparkles,
  Upload,
  Image as ImageIcon,
  Loader2,
  Clock,
  MapPin,
  Calendar,
  Lock,
  Check
} from 'lucide-react';

interface VerifiedTicket {
  id: string;
  holderName: string;
  categoryName: string;
  eventTitle: string;
  eventVenue?: string;
  eventDate?: string;
  eventTime?: string;
  serialNumber?: string;
  scannedAt: string;
}

interface ScanResultState {
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
  message: string;
  holderName?: string;
  categoryName?: string;
  eventTitle?: string;
  scannedAt?: string;
  ticket?: VerifiedTicket;
}

interface AuthorizedEvent {
  id: string;
  title: string;
  artist: string;
  venue: string;
  date?: string;
  time?: string;
}

/**
 * ScannerView.tsx — Terminal de contrôle d'accès sécurisé par "Lien Magique" (Token URL).
 * Réservé aux vigiles et contrôleurs autorisés par jeton cryptographique URL.
 */
export const ScannerView: React.FC = () => {
  const { currentUser, setCurrentPage } = useApp();

  // 1. États d'autorisation & validation du jeton
  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'denied'>('checking');
  const [deniedReason, setDeniedReason] = useState<string>('');
  const [activeToken, setActiveToken] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [authorizedEvent, setAuthorizedEvent] = useState<AuthorizedEvent | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');

  // 2. États du lecteur optique (Caméra / QR Scanner)
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [resumeCountdown, setResumeCountdown] = useState<number | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResultState[]>([]);
  const [manualTicketInput, setManualTicketInput] = useState('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 3. Synthèse sonore native (Web Audio API) pour bip vigile
  const playSound = (type: 'success' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        // Double carillon aigu cristallin (880Hz -> 1760Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Alerte grave de refus (220Hz -> 130Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.setValueAtTime(130, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (err) {
      console.warn('Audio feedback notification:', err);
    }
  };

  // 4. Fonction de validation du jeton auprès de l'API backend (/api/verify-scanner-token)
  const verifyTokenWithBackend = async (tokenToVerify: string, eventIdToVerify?: string) => {
    if (!tokenToVerify || !tokenToVerify.trim()) {
      setAuthStatus('denied');
      setDeniedReason('Accès Refusé. Ce lien est invalide ou a expiré.');
      return;
    }

    try {
      setAuthStatus('checking');

      // Super admin or gate agent bypass
      if (currentUser?.role === 'super_admin' || currentUser?.role === 'gate_agent') {
        tokenToVerify = tokenToVerify || 'SEC_SESSION_AUTHORIZED';
      }

      let url = `/api/verify-scanner-token?token=${encodeURIComponent(tokenToVerify.trim())}`;
      if (eventIdToVerify) {
        url += `&eventId=${encodeURIComponent(eventIdToVerify.trim())}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.valid) {
        setAuthStatus('authorized');
        setActiveToken(tokenToVerify);
        if (data.event) {
          setAuthorizedEvent(data.event);
          setActiveEventId(data.event.id);
        }
      } else {
        setAuthStatus('denied');
        setDeniedReason(data.error || 'Accès Refusé. Ce lien est invalide ou a expiré.');
      }
    } catch (err: any) {
      setAuthStatus('denied');
      setDeniedReason('Impossible de joindre le serveur de sécurité.');
    }
  };

  // 5. Sécurité à l'ouverture : Lecture des paramètres URL via URLSearchParams dès le montage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    const urlEventId = params.get('eventId');

    if (urlEventId) setActiveEventId(urlEventId);

    if (urlToken && urlToken.trim()) {
      setActiveToken(urlToken.trim());
      verifyTokenWithBackend(urlToken.trim(), urlEventId || undefined);
    } else if (currentUser?.role === 'super_admin' || currentUser?.role === 'gate_agent') {
      // Session agent déjà connectée
      verifyTokenWithBackend('SEC_SESSION_AUTHORIZED', urlEventId || undefined);
    } else {
      // Aucun token présent dans l'URL -> Blocage immédiat
      setAuthStatus('denied');
      setDeniedReason('Accès Refusé. Ce lien est invalide ou a expiré.');
    }
  }, []);

  // 6. Validation d'un billet scanné (POST /api/verify-ticket)
  const handleVerifyTicket = async (ticketCode: string) => {
    if (isProcessingRef.current || authStatus !== 'authorized') return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      const res = await fetch('/api/verify-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: ticketCode.trim(),
          token: ticketCode.trim(),
          scannerToken: activeToken,
          eventId: activeEventId || authorizedEvent?.id,
          gateAgentId: currentUser?.name || 'Vigile LUMARÉEL (Lien Magique)',
        }),
      });

      const data = await res.json();

      if (res.status === 200 && data.valid) {
        // Succès 200 OK : Accès Autorisé
        playSound('success');
        const successState: ScanResultState = {
          status: 'SUCCESS',
          message: 'ACCÈS AUTORISÉ',
          holderName: data.holderName || data.ticket?.holderName,
          categoryName: data.categoryName || data.ticket?.categoryName,
          eventTitle: data.ticket?.eventTitle,
          scannedAt: data.scannedAt,
          ticket: data.ticket,
        };
        setScanResult(successState);
        setRecentScans((prev) => [successState, ...prev.slice(0, 9)]);
      } else if (res.status === 403) {
        // Erreur 403 Forbidden : Billet déjà utilisé
        playSound('error');
        const alreadyUsedState: ScanResultState = {
          status: 'ALREADY_USED',
          message: 'BILLET DÉJÀ UTILISÉ',
          holderName: data.holderName || data.ticket?.holderName,
          categoryName: data.categoryName || data.ticket?.categoryName,
          eventTitle: data.eventTitle || data.ticket?.eventTitle,
          scannedAt: data.scannedAt || data.ticket?.scannedAt,
          ticket: data.ticket,
        };
        setScanResult(alreadyUsedState);
        setRecentScans((prev) => [alreadyUsedState, ...prev.slice(0, 9)]);
      } else {
        // Erreur 404 Not Found : Billet introuvable / signature invalide
        playSound('error');
        const invalidState: ScanResultState = {
          status: 'INVALID',
          message: data.error || 'BILLET INVALIDE OU INTROUVABLE',
        };
        setScanResult(invalidState);
        setRecentScans((prev) => [invalidState, ...prev.slice(0, 9)]);
      }
    } catch (err: any) {
      playSound('error');
      setScanResult({
        status: 'INVALID',
        message: 'ERREUR DE COMMUNICATION AVEC LE SERVEUR',
      });
    } finally {
      // Reprise automatique du scanner après 2 secondes pour le prochain festivalier
      setResumeCountdown(2);
      setTimeout(() => {
        setResumeCountdown(1);
      }, 1000);

      setTimeout(() => {
        setScanResult(null);
        setResumeCountdown(null);
        isProcessingRef.current = false;
        setIsProcessing(false);
      }, 2000);
    }
  };

  // 7. Démarrage de la caméra via html5-qrcode
  const startCamera = async () => {
    if (authStatus !== 'authorized') return;
    setCameraError(null);

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError(
        'Flux vidéo direct restreint dans ce navigateur. Utilisez le sélecteur d’image QR ou la saisie manuelle ci-dessous.'
      );
      setIsCameraActive(false);
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }

      const qrCode = html5QrCodeRef.current;
      if (isScanningRef.current) return;

      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await qrCode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          if (!isProcessingRef.current) {
            handleVerifyTicket(decodedText);
          }
        },
        () => {
          // Frame error (silenced for smooth 60fps operation)
        }
      );

      isScanningRef.current = true;
      setIsCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      console.warn('Camera access unavailable:', err?.name, err?.message);
      setIsCameraActive(false);
      if (err?.name === 'NotAllowedError') {
        setCameraError(
          'Autorisation caméra refusée. Veuillez autoriser l’accès à la caméra ou importer une photo du QR code.'
        );
      } else {
        setCameraError(
          'Caméra indisponible ou déjà utilisée. Utilisez l’import de photo ou la saisie manuelle.'
        );
      }
    }
  };

  // 8. Arrêt de la caméra
  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current && isScanningRef.current) {
        await html5QrCodeRef.current.stop();
        isScanningRef.current = false;
        setIsCameraActive(false);
      }
    } catch (err) {
      console.warn('Error stopping camera:', err);
    }
  };

  // Nettoyage à la fermeture du composant
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && isScanningRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  }, []);

  // Décodage d'un QR code depuis une image / capture d'écran
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || authStatus !== 'authorized') return;

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      if (decodedText) {
        handleVerifyTicket(decodedText);
      }
    } catch {
      playSound('error');
      setScanResult({
        status: 'INVALID',
        message: 'AUCUN QR CODE DÉTECTÉ SUR CETTE IMAGE',
      });
      setTimeout(() => setScanResult(null), 2500);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Saisie manuelle d'un code de déverrouillage
  const handleManualUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTokenInput.trim()) {
      verifyTokenWithBackend(manualTokenInput.trim());
    }
  };

  // --- ÉTAT 1 : VÉRIFICATION EN COURS (LOADER) ---
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center select-none font-agrandir-regular">
        <div className="max-w-sm w-full bg-[#0c0c0c] border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col items-center space-y-5 animate-pulse">
          <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37]">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-agrandir-extrabold text-lg uppercase tracking-tight text-white">
              Vérification de l'accès sécurisé...
            </h2>
            <p className="text-xs text-[#888] leading-relaxed">
              Validation cryptographique du jeton d'accès vigile auprès du serveur central LUMARÉEL CO.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- ÉTAT 2 : ACCÈS REFUSÉ (TOKEN INVALIDE, EXPIRÉ OU ABSENT) ---
  if (authStatus === 'denied') {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none font-agrandir-regular">
        <div className="max-w-md w-full bg-[#0c0c0c] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          
          {/* Badge & Icone d'alerte */}
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto shadow-[0_0_25px_rgba(244,63,94,0.2)]">
            <AlertOctagon className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-agrandir-bold tracking-[0.25em] text-rose-400 uppercase">
              SÉCURITÉ CONTRÔLE D'ACCÈS
            </div>
            <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl uppercase tracking-tight text-white">
              Accès Refusé
            </h1>
            <p className="text-sm font-agrandir-bold text-rose-400 leading-snug">
              {deniedReason || 'Ce lien est invalide ou a expiré.'}
            </p>
            <p className="text-xs text-[#777] pt-2 leading-relaxed max-w-xs mx-auto">
              La caméra est verrouillée. Veuillez demander à l’administrateur ou organisateur de vous renvoyer un lien magique valide par WhatsApp.
            </p>
          </div>

          {/* Déverrouillage manuel de secours */}
          <div className="pt-4 border-t border-white/10 space-y-3 text-left">
            <form onSubmit={handleManualUnlockSubmit} className="space-y-2">
              <label className="text-[10px] text-[#888] uppercase tracking-wider font-agrandir-semibold block">
                Saisir un jeton d'accès manuellement
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="SEC_VGL_..."
                  className="flex-1 bg-[#141414] border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-[#d4af37]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer"
                >
                  Débloquer
                </button>
              </div>
            </form>

            <button
              onClick={() => setCurrentPage('home')}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-[#888] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Retour au site public</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // --- ÉTAT 3 : ACCÈS VALIDÉ (INTERFACE COMPLÈTE DU SCANNER VIGILE) ---
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between pt-6 sm:pt-8 pb-10 px-4 sm:px-6 select-none font-agrandir-regular">
      
      {/* 1. Header Vigile Luxe */}
      <div className="max-w-md w-full mx-auto space-y-3 mb-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="text-[9px] tracking-[0.25em] text-[#d4af37] uppercase font-agrandir-semibold flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#d4af37]" />
              <span>TERMINAL DE CONTRÔLE VIGILE</span>
            </div>
            <h1 className="text-xl font-agrandir-extrabold tracking-tight uppercase text-white">
              LUMARÉEL CO - SCANNER
            </h1>
          </div>

          {/* Indicateur d'état caméra */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121212] border border-white/15">
            <span
              className={`w-2 h-2 rounded-full ${
                isCameraActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-neutral-600'
              }`}
            />
            <span className="text-[9px] uppercase font-agrandir-semibold tracking-wider text-neutral-300">
              {isCameraActive ? 'CAMÉRA ACTIVE' : 'EN VEILLE'}
            </span>
          </div>
        </div>

        {/* Badge de l'événement autorisé */}
        {authorizedEvent && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="text-[9px] font-agrandir-bold tracking-wider text-[#d4af37] uppercase truncate">
                CONCERT : {authorizedEvent.artist}
              </div>
              <div className="text-xs font-agrandir-extrabold text-white truncate">
                {authorizedEvent.title}
              </div>
              <div className="text-[10px] text-[#777] truncate">
                {authorizedEvent.venue} · {authorizedEvent.date || 'Live'}
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-agrandir-bold text-emerald-400 shrink-0">
              TOKEN ACTIF
            </span>
          </div>
        )}
      </div>

      {/* 2. Centre : Zone Caméra / Lecteur QR */}
      <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
        
        <div className="relative aspect-square w-full rounded-3xl overflow-hidden bg-[#0c0c0c] border border-white/15 shadow-2xl flex items-center justify-center">
          
          {/* Point de montage html5-qrcode */}
          <div id="qr-reader" className="w-full h-full object-cover" />

          {/* Écran d'attente si caméra inactive */}
          {!isCameraActive && !scanResult && (
            <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center space-y-4 z-20">
              <div className="w-16 h-16 rounded-full bg-white/5 border border-white/20 flex items-center justify-center text-[#d4af37]">
                <Camera className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <div className="font-agrandir-extrabold text-base uppercase text-white">
                  Contrôle Optique QR
                </div>
                <div className="text-xs text-neutral-400 max-w-xs leading-relaxed">
                  {cameraError || 'Activez la caméra pour valider les billets présentés à l’entrée.'}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 w-full max-w-xs pt-2">
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Camera className="w-4 h-4" />
                  <span>Démarrer la caméra</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white font-agrandir-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Scanner une image QR</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageFileScan}
                />
              </div>
            </div>
          )}

          {/* Viseur optique quand caméra active */}
          {isCameraActive && !scanResult && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-8 z-10">
              <div className="text-[10px] font-agrandir-semibold tracking-widest text-[#d4af37] bg-black/70 px-3 py-1 rounded-full uppercase border border-[#d4af37]/30">
                Pointez vers le QR code
              </div>

              {/* Cadre de visée */}
              <div className="w-56 h-56 border-2 border-white/40 rounded-2xl relative shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#d4af37] rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#d4af37] rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#d4af37] rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#d4af37] rounded-br-lg" />
              </div>

              <div className="text-[10px] text-white/60 bg-black/50 px-3 py-1 rounded-full">
                Vérification instantanée en direct
              </div>
            </div>
          )}

          {/* Overlay Résultat du Scan */}
          {scanResult && (
            <div
              className={`absolute inset-0 z-30 p-6 flex flex-col items-center justify-center text-center animate-fadeIn ${
                scanResult.status === 'SUCCESS'
                  ? 'bg-emerald-950/95 border-2 border-emerald-400'
                  : scanResult.status === 'ALREADY_USED'
                  ? 'bg-amber-950/95 border-2 border-amber-400'
                  : 'bg-rose-950/95 border-2 border-rose-500'
              }`}
            >
              {/* Icône de résultat */}
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-4 shadow-xl">
                {scanResult.status === 'SUCCESS' && (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                )}
                {scanResult.status === 'ALREADY_USED' && (
                  <AlertOctagon className="w-12 h-12 text-amber-400" />
                )}
                {scanResult.status === 'INVALID' && (
                  <XCircle className="w-12 h-12 text-rose-400" />
                )}
              </div>

              {/* Titre & Message */}
              <h2 className="font-agrandir-extrabold text-2xl uppercase tracking-tight text-white mb-1">
                {scanResult.message}
              </h2>

              {/* Détails du titulaire si disponible */}
              {scanResult.holderName && (
                <div className="mt-3 p-3.5 rounded-2xl bg-black/50 border border-white/10 w-full max-w-xs text-left space-y-1">
                  <div className="text-[10px] text-[#aaa] uppercase tracking-wider">
                    TITULAIRE DU BILLET
                  </div>
                  <div className="font-agrandir-extrabold text-sm text-white">
                    {scanResult.holderName}
                  </div>
                  <div className="text-xs text-[#d4af37] font-agrandir-semibold">
                    {scanResult.categoryName}
                  </div>
                  {scanResult.ticket?.serialNumber && (
                    <div className="text-[10px] font-mono text-[#888]">
                      N° Série : {scanResult.ticket.serialNumber}
                    </div>
                  )}
                </div>
              )}

              {/* Compte à rebours avant réarmement */}
              {resumeCountdown !== null && (
                <div className="text-xs text-white/70 mt-4 flex items-center gap-1.5 font-agrandir-semibold">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Prêt pour le suivant dans {resumeCountdown}s...</span>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Boutons d'action sous la caméra */}
        {isCameraActive && (
          <div className="flex gap-2.5 mt-3">
            <button
              type="button"
              onClick={stopCamera}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-neutral-300 transition-colors"
            >
              Mettre en veille
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-neutral-300 transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Image QR</span>
            </button>
          </div>
        )}

        {/* Saisie manuelle de secours pour vigile */}
        <div className="mt-4 p-3 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-2">
          <div className="text-[9px] font-agrandir-semibold uppercase tracking-wider text-[#777]">
            Saisie Manuelle (si caméra endommagée)
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualTicketInput.trim()) {
                handleVerifyTicket(manualTicketInput.trim());
                setManualTicketInput('');
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={manualTicketInput}
              onChange={(e) => setManualTicketInput(e.target.value)}
              placeholder="Ex: TKT_SEC_... ou LMR-2026-..."
              className="flex-1 bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-white"
            />
            <button
              type="submit"
              disabled={!manualTicketInput.trim()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase disabled:opacity-30 cursor-pointer"
            >
              Vérifier
            </button>
          </form>
        </div>

      </div>

      {/* 3. Bas de page : Historique récent des scans */}
      <div className="max-w-md w-full mx-auto mt-4 pt-3 border-t border-white/10">
        <div className="text-[10px] font-agrandir-bold tracking-widest text-[#666] uppercase mb-2">
          DERNIERS CONTRÔLES EFFECTUÉS ({recentScans.length})
        </div>
        {recentScans.length === 0 ? (
          <div className="text-center py-2 text-xs text-[#555]">
            Aucun scan effectué sur cette session.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
            {recentScans.map((scan, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-xl bg-[#0c0c0c] border border-white/5 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      scan.status === 'SUCCESS'
                        ? 'bg-emerald-400'
                        : scan.status === 'ALREADY_USED'
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                  />
                  <span className="font-agrandir-semibold text-white truncate">
                    {scan.holderName || scan.message}
                  </span>
                  {scan.categoryName && (
                    <span className="text-[10px] text-[#888] truncate">
                      ({scan.categoryName})
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[#666] shrink-0">
                  {scan.status === 'SUCCESS' ? 'Validé' : scan.status === 'ALREADY_USED' ? 'Refusé' : 'Invalide'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
