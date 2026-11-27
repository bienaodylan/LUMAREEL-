import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import {
  Camera,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Upload,
  Loader2,
  Download,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flashlight,
  SlidersHorizontal,
  X,
  Ticket,
  Crown,
  Radio,
  Clock,
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
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID' | 'ERROR';
  headline: string;
  instruction: string;
  subline: string;
  holderName?: string;
  categoryName?: string;
  eventTitle?: string;
  serialNumber?: string;
  scannedAt?: string;
  ticket?: VerifiedTicket;
  isSimulated?: boolean;
}

export interface ScanActivityRecord {
  id: string;
  timestamp: string;
  formattedTime: string;
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
  message: string;
  holderName: string;
  categoryName: string;
  eventTitle: string;
  serialNumber: string;
  ticketCode: string;
  agentName: string;
  reason?: string;
}

interface AuthorizedEvent {
  id: string;
  title: string;
  artist: string;
  venue: string;
  date?: string;
  time?: string;
}

export const ScannerView: React.FC = () => {
  const { currentUser, events, goBack } = useApp();

  const [authStatus, setAuthStatus] = useState<'checking' | 'authorized' | 'denied'>('checking');
  const [deniedReason, setDeniedReason] = useState<string>('');
  const [activeToken, setActiveToken] = useState<string>('');
  const [activeEventId, setActiveEventId] = useState<string>('');
  const [authorizedEvent, setAuthorizedEvent] = useState<AuthorizedEvent | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResultState | null>(null);
  const [manualTicketInput, setManualTicketInput] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // Mode de contrôle : Billetterie Concert VS LUMARÉEL CARD (Hybride QR + NFC)
  const [scanMode, setScanMode] = useState<'ticket' | 'membership'>('ticket');
  const [membershipZone, setMembershipZone] = useState<
    'priority_lane' | 'vip_lounge' | 'backstage_artists' | 'main_entrance'
  >('priority_lane');

  const [activityLog, setActivityLog] = useState<ScanActivityRecord[]>(() => {
    try {
      const saved = sessionStorage.getItem('lumareel_scanner_log');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem('lumareel_scanner_log', JSON.stringify(activityLog));
    } catch {}
  }, [activityLog]);

  const getAudioContext = (): AudioContext | null => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
      return audioContextRef.current;
    } catch {
      return null;
    }
  };

  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      if (type === 'success') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.5, now);
        osc1.frequency.setValueAtTime(1318.5, now + 0.08);
        osc1.frequency.setValueAtTime(1760.0, now + 0.16);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2093.0, now + 0.16);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.32, now + 0.02);
        gainNode.gain.setValueAtTime(0.32, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.16);
        osc1.stop(now + 0.42);
        osc2.stop(now + 0.42);
      } else {
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(120, now + 0.12);
        osc.frequency.setValueAtTime(85, now + 0.25);

        subOsc.type = 'square';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.setValueAtTime(65, now + 0.2);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.03);
        gainNode.gain.setValueAtTime(0.35, now + 0.25);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gainNode);
        subOsc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.45);
        subOsc.stop(now + 0.45);
      }
    } catch {}
  };

  const verifyTokenWithBackend = async (tokenToVerify: string, eventIdToVerify?: string) => {
    if (!tokenToVerify || !tokenToVerify.trim()) {
      setAuthStatus('denied');
      setDeniedReason('Accès Refusé. Ce lien est invalide ou a expiré.');
      return;
    }

    try {
      setAuthStatus('checking');
      let url = `/api/verify-scanner-token?token=${encodeURIComponent(tokenToVerify.trim())}`;
      if (eventIdToVerify) {
        url += `&eventId=${encodeURIComponent(eventIdToVerify.trim())}`;
      }

      const res = await fetch(url);
      const jsonResponse = await res.json();
      const verified = res.ok && jsonResponse.valid === true;

      if (verified && jsonResponse) {
        setAuthStatus('authorized');
        setActiveToken(tokenToVerify);
        if (jsonResponse.event) {
          setAuthorizedEvent(jsonResponse.event);
          setActiveEventId(jsonResponse.event.id);
        }
      } else {
        setAuthStatus('denied');
        setDeniedReason(jsonResponse?.error || 'Accès Refusé. Ce lien est invalide ou a expiré.');
      }
    } catch {
      setAuthStatus('denied');
      setDeniedReason('Impossible de joindre le serveur de sécurité.');
    }
  };

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
      verifyTokenWithBackend('SEC_SESSION_AUTHORIZED', urlEventId || undefined);
    } else {
      setAuthStatus('denied');
      setDeniedReason('Accès Refusé. Aucun lien magique d’accès vigile détecté.');
    }
  }, []);

  const formatLocalTime = (isoString?: string) => {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const resetForNextScan = () => {
    setScanResult(null);
    isProcessingRef.current = false;
    setIsProcessing(false);
  };

  const handleVerifyTicket = async (ticketCode: string) => {
    if (isProcessingRef.current || authStatus !== 'authorized') return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    const nowIso = new Date().toISOString();
    const formattedNow = formatLocalTime(nowIso);
    const agentName = currentUser?.name || 'Agent LUMARÉEL';

    let responseData: any = null;
    let resStatus = 500;

    try {
      try {
        const res = await fetch('/api/verify-ticket', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticketCode.trim(),
            token: ticketCode.trim(),
            scannerToken: activeToken,
            eventId: activeEventId || authorizedEvent?.id,
            gateAgentId: agentName,
          }),
        });
        resStatus = res.status;
        responseData = await res.json();
      } catch {}

      if (!responseData) {
        throw new Error('Service de vérification momentanément indisponible.');
      }

      if (resStatus === 200 && responseData.valid) {
        playSound('success');
        const holder =
          responseData.holderName || responseData.ticket?.holderName || 'Titulaire officiel';
        const category =
          responseData.categoryName || responseData.ticket?.categoryName || 'Standard';
        const serial =
          responseData.ticket?.serialNumber ||
          responseData.serialNumber ||
          ticketCode.slice(0, 16);

        setScanResult({
          status: 'SUCCESS',
          headline: 'VALIDE',
          instruction: `${category} · 1 personne. Laisser entrer.`,
          subline: `${serial} · ${holder}`,
          holderName: holder,
          categoryName: category,
          eventTitle: responseData.ticket?.eventTitle || authorizedEvent?.title || 'Concert Live',
          serialNumber: serial,
          scannedAt: responseData.scannedAt || nowIso,
          ticket: responseData.ticket,
        });

        setActivityLog((prev) => [
          {
            id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: responseData.scannedAt || nowIso,
            formattedTime: formattedNow,
            status: 'SUCCESS',
            message: 'Billet vérifié avec succès. Entrée validée.',
            holderName: holder,
            categoryName: category,
            eventTitle: responseData.ticket?.eventTitle || authorizedEvent?.title || 'Concert Live',
            serialNumber: serial,
            ticketCode: ticketCode.trim(),
            agentName,
            reason: 'Billet conforme & accès autorisé.',
          },
          ...prev,
        ]);
      } else if (resStatus === 403) {
        playSound('error');
        const holder =
          responseData.holderName || responseData.ticket?.holderName || 'Titulaire identifié';
        const category =
          responseData.categoryName || responseData.ticket?.categoryName || 'Standard';
        const serial =
          responseData.serialNumber ||
          responseData.ticket?.serialNumber ||
          ticketCode.slice(0, 16);
        const scannedTime = formatLocalTime(responseData.scannedAt || responseData.ticket?.scannedAt);
        const firstGate = responseData.gate || responseData.ticket?.gate || 'Entrée A';
        const firstAgent = responseData.scannedBy || responseData.ticket?.scannedBy || agentName;

        setScanResult({
          status: 'ALREADY_USED',
          headline: 'DÉJÀ UTILISÉ',
          instruction: `Déjà scanné à ${scannedTime} · ${firstGate} · Agent ${firstAgent}. Refuser l'entrée.`,
          subline: `${serial} · ${holder}`,
          holderName: holder,
          categoryName: category,
          eventTitle: responseData.eventTitle || responseData.ticket?.eventTitle || authorizedEvent?.title,
          serialNumber: serial,
          scannedAt: responseData.scannedAt || responseData.ticket?.scannedAt || nowIso,
          ticket: responseData.ticket,
        });

        setActivityLog((prev) => [
          {
            id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: nowIso,
            formattedTime: formattedNow,
            status: 'ALREADY_USED',
            message: responseData.message || 'Billet déjà validé précédemment.',
            holderName: holder,
            categoryName: category,
            eventTitle:
              responseData.eventTitle ||
              responseData.ticket?.eventTitle ||
              authorizedEvent?.title ||
              'Concert Live',
            serialNumber: serial,
            ticketCode: ticketCode.trim(),
            agentName,
            reason: `Déjà validé à ${scannedTime}.`,
          },
          ...prev,
        ]);
      } else {
        playSound('error');
        const serial = ticketCode.slice(0, 16);
        setScanResult({
          status: 'INVALID',
          headline: 'INVALIDE',
          instruction: `${responseData.error || 'Billet non reconnu'}. Refuser l'entrée.`,
          subline: `${serial} · Code non enregistré`,
          serialNumber: serial,
        });

        setActivityLog((prev) => [
          {
            id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: nowIso,
            formattedTime: formattedNow,
            status: 'INVALID',
            message: responseData.error || 'Billet inexistant ou signature non reconnue.',
            holderName: 'Inconnu',
            categoryName: 'N/A',
            eventTitle: authorizedEvent?.title || 'Événement',
            serialNumber: ticketCode,
            ticketCode: ticketCode.trim(),
            agentName,
            reason: 'Billet non reconnu dans la base officielle LUMARÉEL.',
          },
          ...prev,
        ]);
      }
    } catch (err: any) {
      playSound('error');
      setScanResult({
        status: 'ERROR',
        headline: 'ERREUR DE LECTURE',
        instruction: err?.message || 'Connexion serveur interrompue. Réessayer.',
        subline: `${ticketCode.slice(0, 16)} · Vérification impossible`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyMembership = async (
    identifier: string,
    scanMethod: 'qr_code' | 'manual_override' | 'chip_read' = 'qr_code'
  ) => {
    if (isProcessingRef.current || authStatus !== 'authorized') return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    const nowIso = new Date().toISOString();
    const formattedNow = formatLocalTime(nowIso);
    const agentName = currentUser?.name || 'Agent LUMARÉEL';

    try {
      const res = await fetch('/api/membership/check-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cardIdentifier: identifier.trim(),
          eventId: activeEventId || authorizedEvent?.id || 'all_events',
          accessPointType: membershipZone,
          operatorId: agentName,
          scannerToken: activeToken,
          scanMethod,
          hasConcertTicket: true,
        }),
      });

      const data = await res.json();
      if (data.authorized) {
        playSound('success');
        setScanResult({
          status: 'SUCCESS',
          headline: 'VALIDE',
          instruction: `Black Card · Accès membre autorisé.`,
          subline: `${data.cardNumber || identifier.slice(0, 14)} · ${data.cardholderName || 'Membre'}`,
        });

        setActivityLog((prev) => [
          {
            id: `scan_mbr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            timestamp: nowIso,
            formattedTime: formattedNow,
            status: 'SUCCESS',
            message: `BLACK CARD : Accès autorisé`,
            holderName: data.cardholderName || 'Membre Black Card',
            categoryName: `Black Card`,
            eventTitle: authorizedEvent?.title || 'Concert Live',
            serialNumber: data.cardNumber || identifier.slice(0, 16),
            ticketCode: identifier.slice(0, 16),
            agentName,
            reason: data.entitlement?.benefitName || 'Accès membre accordé.',
          },
          ...prev,
        ]);
      } else {
        playSound('error');
        setScanResult({
          status: 'INVALID',
          headline: 'INVALIDE',
          instruction: `${data.reason || 'Accès Black Card non autorisé'}.`,
          subline: `${data.cardNumber || identifier.slice(0, 16)} · ${data.cardholderName || 'Non identifié'}`,
        });
      }
    } catch {
      playSound('error');
      setScanResult({
        status: 'ERROR',
        headline: 'ERREUR',
        instruction: 'Erreur réseau lors du contrôle Black Card.',
        subline: `${identifier.slice(0, 16)} · Réessayer`,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Simulation locale visuelle + sonore pour tester les 4 statuts (maquette 06) sans altérer la base
  const handleSimulateState = (kind: 'SUCCESS' | 'ALREADY_USED' | 'INVALID' | 'ERROR') => {
    getAudioContext();
    isProcessingRef.current = true;
    const holder = currentUser?.name || 'Kouassi Yao';
    if (kind === 'SUCCESS') {
      playSound('success');
      setScanResult({
        status: 'SUCCESS',
        headline: 'VALIDE',
        instruction: 'Carré Or · 1 personne. Laisser entrer.',
        subline: `LMR-2026-4812 · ${holder}`,
        isSimulated: true,
      });
    } else if (kind === 'ALREADY_USED') {
      playSound('error');
      setScanResult({
        status: 'ALREADY_USED',
        headline: 'DÉJÀ UTILISÉ',
        instruction: `Déjà scanné à ${formatLocalTime()} · Entrée A · Agent ${currentUser?.name?.split(' ')[0] || 'Contrôle'}. Refuser l'entrée.`,
        subline: `LMR-2026-1094 · ${holder}`,
        isSimulated: true,
      });
    } else if (kind === 'INVALID') {
      playSound('error');
      setScanResult({
        status: 'INVALID',
        headline: 'INVALIDE',
        instruction: "Billet non reconnu ou révoqué. Refuser l'entrée.",
        subline: 'LMR-0000-0000 · Code inconnu',
        isSimulated: true,
      });
    } else {
      playSound('error');
      setScanResult({
        status: 'ERROR',
        headline: 'ERREUR DE LECTURE',
        instruction: 'Lecture interrompue ou réseau faible. Réessayer.',
        subline: 'Connexion contrôle en attente',
        isSimulated: true,
      });
    }
  };

  const handleExportJournalCSV = () => {
    if (activityLog.length === 0) {
      setExportFeedback('Aucun scan enregistré pour le moment.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    try {
      const bom = '\uFEFF';
      const headers = [
        'Date et Heure',
        'Statut Contrôle',
        'Titulaire',
        'Événement',
        'Catégorie',
        'N° Série',
        'Agent',
        'Remarque',
      ];
      const escapeCSV = (val: string | undefined | null) =>
        `"${String(val || '').replace(/"/g, '""').trim()}"`;

      const rows = activityLog.map((item) => {
        const statusLabel =
          item.status === 'SUCCESS'
            ? 'VALIDE'
            : item.status === 'ALREADY_USED'
            ? 'DÉJÀ UTILISÉ'
            : 'INVALIDE';

        return [
          escapeCSV(new Date(item.timestamp).toLocaleString('fr-FR')),
          escapeCSV(statusLabel),
          escapeCSV(item.holderName),
          escapeCSV(item.eventTitle || authorizedEvent?.title || 'LUMARÉEL'),
          escapeCSV(item.categoryName),
          escapeCSV(item.serialNumber || item.ticketCode),
          escapeCSV(item.agentName),
          escapeCSV(item.reason || item.message),
        ].join(';');
      });

      const csvContent = [headers.map((h) => `"${h}"`).join(';'), ...rows].join('\r\n');
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rapport_scans_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportFeedback(`Export CSV réussi (${activityLog.length} scans).`);
      setTimeout(() => setExportFeedback(null), 3000);
    } catch {
      setExportFeedback("Erreur lors de l'export CSV.");
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  const startCamera = async () => {
    if (authStatus !== 'authorized') return;
    setCameraError(null);
    getAudioContext();

    if (!navigator?.mediaDevices?.getUserMedia) {
      setCameraError('Caméra indisponible dans ce navigateur. Utilisez le menu outils.');
      setIsCameraActive(false);
      return;
    }

    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }
      const qrCode = html5QrCodeRef.current;
      if (isScanningRef.current) return;

      await qrCode.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
        (decodedText) => {
          if (!isProcessingRef.current) {
            if (
              scanMode === 'membership' ||
              decodedText.startsWith('LMR_QR_') ||
              decodedText.startsWith('LMR-2026')
            ) {
              handleVerifyMembership(decodedText, 'qr_code');
            } else {
              handleVerifyTicket(decodedText);
            }
          }
        },
        () => {}
      );

      isScanningRef.current = true;
      setIsCameraActive(true);
      setCameraError(null);
    } catch (err: any) {
      setIsCameraActive(false);
      setCameraError(
        err?.name === 'NotAllowedError'
          ? 'Autorisez la caméra pour scanner les billets.'
          : 'Caméra indisponible. Utilisez la saisie manuelle.'
      );
    }
  };

  const toggleTorch = async () => {
    const next = !torchOn;
    setTorchOn(next);
    try {
      if (html5QrCodeRef.current && isScanningRef.current) {
        await (html5QrCodeRef.current as any).applyVideoConstraints?.({
          advanced: [{ torch: next }],
        });
      }
    } catch {
      // Certains navigateurs ne supportent pas le contrôle flash natif
    }
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && isScanningRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
        isScanningRef.current = false;
      }
    };
  }, []);

  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || authStatus !== 'authorized') return;
    getAudioContext();
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader');
      }
      const decodedText = await html5QrCodeRef.current.scanFile(file, true);
      if (decodedText) {
        setIsToolsOpen(false);
        if (
          scanMode === 'membership' ||
          decodedText.startsWith('LMR_QR_') ||
          decodedText.startsWith('LMR-2026')
        ) {
          handleVerifyMembership(decodedText, 'qr_code');
        } else {
          handleVerifyTicket(decodedText);
        }
      }
    } catch {
      playSound('error');
      setScanResult({
        status: 'INVALID',
        headline: 'INVALIDE',
        instruction: 'Aucun QR code détecté sur cette image.',
        subline: 'Essayez une photo plus nette',
      });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTokenInput.trim()) {
      verifyTokenWithBackend(manualTokenInput.trim());
    }
  };

  const validCount = activityLog.filter((s) => s.status === 'SUCCESS').length;
  const displayEventName =
    authorizedEvent?.artist ||
    authorizedEvent?.title ||
    events.find((e) => e.status === 'published')?.artist ||
    'LUMARÉEL';
  const agentDisplayName = currentUser?.name?.split(' ')[0] || 'Contrôle';
  const agentBadgeId = (currentUser?.id || '042').slice(-3).toUpperCase();

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none font-agrandir-regular">
        <div className="max-w-sm w-full bg-[#0E0E0E] border border-white/[0.12] p-8 flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF6A]" />
          <h2 className="font-agrandir-extrabold text-base uppercase tracking-tight text-white">
            Vérification de l'accès agent…
          </h2>
        </div>
      </div>
    );
  }

  if (authStatus === 'denied') {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 sm:p-6 select-none font-agrandir-regular">
        <div className="max-w-md w-full bg-[#0E0E0E] border border-[#B3122B]/60 p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#B3122B]/15 border border-[#B3122B]/40 flex items-center justify-center text-[#F29AA4] mx-auto">
            <AlertOctagon className="w-8 h-8" strokeWidth={1.6} />
          </div>

          <div className="space-y-2">
            <div className="text-[10px] font-agrandir-semibold tracking-[0.24em] text-[#F29AA4] uppercase">
              CONTRÔLE D'ACCÈS AGENT
            </div>
            <h1 className="font-agrandir-extrabold text-2xl uppercase tracking-tight text-white">
              Accès Refusé
            </h1>
            <p className="text-sm text-[#C8C8C8] leading-snug">
              {deniedReason || 'Ce lien est invalide ou a expiré.'}
            </p>
          </div>

          <div className="pt-4 border-t border-white/[0.12] space-y-3 text-left">
            <form onSubmit={handleManualUnlockSubmit} className="space-y-2">
              <label className="text-[10px] text-[#9A9A9A] uppercase tracking-wider font-agrandir-semibold block">
                Saisir un jeton d'accès manuellement
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="SEC_VGL_..."
                  className="flex-1 bg-[#141414] border border-white/[0.16] rounded-[4px] px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-[#D4AF6A]"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-[4px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors lum-press"
                >
                  Débloquer
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={goBack}
              className="w-full py-2.5 rounded-[4px] bg-white/5 hover:bg-white/10 border border-white/[0.12] text-xs font-agrandir-semibold text-[#C8C8C8] hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2 lum-press"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Retour</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Palette plein-cadre exacte de la charte LUMARÉEL (maquette 06)
  const panelStyle = (() => {
    if (!scanResult) {
      return {
        bg: 'bg-[#0E0E0E] border-t border-white/[0.12]',
        text: 'text-white',
        subText: 'text-[#C8C8C8]',
        btnClass: 'bg-white hover:bg-neutral-100 text-black',
        isAmber: false,
      };
    }
    if (scanResult.status === 'SUCCESS') {
      return {
        bg: 'bg-[#0E6B37]',
        text: 'text-white',
        subText: 'text-white/85',
        btnClass: 'bg-white hover:bg-neutral-100 text-[#0E6B37]',
        isAmber: false,
      };
    }
    if (scanResult.status === 'ALREADY_USED') {
      return {
        bg: 'bg-[#F2A23A]',
        text: 'text-black',
        subText: 'text-black/80',
        btnClass: 'bg-black hover:bg-neutral-900 text-white',
        isAmber: true,
      };
    }
    if (scanResult.status === 'INVALID') {
      return {
        bg: 'bg-[#B3122B]',
        text: 'text-white',
        subText: 'text-white/85',
        btnClass: 'bg-white hover:bg-neutral-100 text-[#B3122B]',
        isAmber: false,
      };
    }
    return {
      bg: 'bg-[#262626]',
      text: 'text-white',
      subText: 'text-[#C8C8C8]',
      btnClass: 'bg-white hover:bg-neutral-100 text-black',
      isAmber: false,
    };
  })();

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white flex flex-col select-none font-agrandir-regular">
      {/* ================================================================= */}
      {/* 1. BARRE SUPÉRIEURE COMPACTE : EVENT · Entrée A | [N] VALIDÉS     */}
      {/* ================================================================= */}
      <header className="shrink-0 bg-black px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quitter le scanner"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h1 className="font-agrandir-extrabold text-sm sm:text-base uppercase tracking-tight text-white truncate">
              {displayEventName} · Entrée A
            </h1>
            <p className="text-[11px] sm:text-xs text-neutral-400 truncate">
              Agent {agentDisplayName} · ID {agentBadgeId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              getAudioContext();
              setSoundEnabled((prev) => !prev);
            }}
            aria-label={soundEnabled ? 'Couper le son' : 'Activer le son'}
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
          </button>

          <button
            type="button"
            onClick={() => setIsToolsOpen(true)}
            aria-label="Outils agent & journal"
            className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          <div className="text-right leading-none pl-1">
            <div className="font-agrandir-extrabold text-xl sm:text-2xl text-white tabular-nums">
              {validCount}
            </div>
            <div className="text-[9px] font-agrandir-semibold uppercase tracking-[0.18em] text-neutral-400 mt-0.5">
              VALIDÉS
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* 2. MOITIÉ SUPÉRIEURE : VISEUR CAMÉRA + 4 ÉQUERRES + TORCHE        */}
      {/* ================================================================= */}
      <section className="relative flex-1 min-h-[300px] sm:min-h-[340px] bg-[#080808] overflow-hidden flex items-center justify-center">
        {/* Flux vidéo Html5Qrcode */}
        <div
          id="qr-reader"
          className="absolute inset-0 w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
        />

        {/* Halo subtil lorsque la caméra est en veille */}
        {!isCameraActive && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.09)_0%,rgba(8,8,8,0.96)_62%)]"
          />
        )}

        {/* Libellé CAMÉRA haut-gauche */}
        <span className="absolute top-3.5 left-4 z-10 text-[10px] font-agrandir-semibold uppercase tracking-[0.24em] text-neutral-400">
          CAMÉRA
        </span>

        {/* 4 équerres blanches centrées fidèles à la maquette 06 */}
        <div className="relative z-10 w-52 h-52 sm:w-56 sm:h-56 pointer-events-none flex items-center justify-center">
          <div className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px] border-white" />
          <div className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px] border-white" />
          <div className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px] border-white" />
          <div className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px] border-white" />

          {!isCameraActive && (
            <div className="pointer-events-auto flex flex-col items-center gap-2 text-center px-3">
              <button
                type="button"
                onClick={startCamera}
                className="min-h-[42px] px-4 rounded-full bg-white/12 hover:bg-white/22 border border-white/25 backdrop-blur-md text-xs font-agrandir-extrabold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Activer la caméra</span>
              </button>
              {cameraError && (
                <p className="text-[10px] text-neutral-300 max-w-[190px] leading-snug">
                  {cameraError}
                </p>
              )}
            </div>
          )}

          {isProcessing && (
            <div className="w-10 h-10 rounded-full bg-black/70 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            </div>
          )}
        </div>

        {/* Bouton torche circulaire bas-droite */}
        <button
          type="button"
          onClick={toggleTorch}
          aria-label="Lampe torche"
          className={`absolute bottom-3.5 right-4 z-10 w-11 h-11 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${
            torchOn
              ? 'bg-[#D4AF6A] border-[#D4AF6A] text-black'
              : 'bg-black/75 border-white/[0.16] text-white hover:bg-black'
          }`}
        >
          <Flashlight className="w-4 h-4" strokeWidth={1.6} />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileScan}
        />
      </section>

      {/* ================================================================= */}
      {/* 3. MOITIÉ INFÉRIEURE : PANNEAU STATUT PLEIN CADRE (MAQUETTE 06)   */}
      {/* ================================================================= */}
      <section
        className={`shrink-0 min-h-[48dvh] px-5 sm:px-8 pt-7 pb-6 flex flex-col justify-between transition-colors duration-200 ${panelStyle.bg}`}
      >
        <div className="max-w-lg w-full mx-auto">
          {scanResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3.5">
                {scanResult.status === 'SUCCESS' && (
                  <CheckCircle2 className="w-11 h-11 text-white stroke-[2] shrink-0" />
                )}
                {scanResult.status === 'ALREADY_USED' && (
                  <AlertTriangle className="w-11 h-11 text-black stroke-[2] shrink-0" />
                )}
                {scanResult.status === 'INVALID' && (
                  <XCircle className="w-11 h-11 text-white stroke-[2] shrink-0" />
                )}
                {scanResult.status === 'ERROR' && (
                  <AlertOctagon className="w-11 h-11 text-white stroke-[2] shrink-0" />
                )}
                <h2 className={`font-agrandir-extrabold text-[1.85rem] sm:text-4xl uppercase tracking-tight leading-none ${panelStyle.text}`}>
                  {scanResult.headline}
                </h2>
              </div>

              <div className="space-y-1.5">
                <p className={`font-agrandir-bold text-base sm:text-lg leading-snug ${panelStyle.text}`}>
                  {scanResult.instruction}
                </p>
                <p className={`text-xs sm:text-sm font-mono ${panelStyle.subText}`}>
                  {scanResult.subline}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pt-2">
              <p className="text-[10px] font-agrandir-semibold uppercase tracking-[0.22em] text-[#D4AF6A]">
                {scanMode === 'membership' ? 'CONTRÔLE BLACK CARD' : 'CONTRÔLE BILLETTERIE'}
              </p>
              <h2 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white tracking-tight leading-tight">
                Prêt à scanner
              </h2>
              <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                Pointez la caméra vers le QR code du billet ou utilisez la simulation ci-dessous pour vérifier les 4 statuts.
              </p>
            </div>
          )}
        </div>

        {/* Bouton plein-largeur (4px) + barre "Simuler : Valide | Utilisé | Invalide | Erreur" */}
        <div className="max-w-lg w-full mx-auto mt-7 space-y-4">
          <button
            type="button"
            onClick={() => {
              resetForNextScan();
              if (!isCameraActive) {
                startCamera();
              }
            }}
            className={`w-full min-h-[52px] rounded-[4px] font-agrandir-extrabold text-sm sm:text-base transition-colors cursor-pointer shadow-lg lum-press ${panelStyle.btnClass}`}
          >
            Scanner le suivant
          </button>

          <div className={`flex items-center justify-center flex-wrap gap-2 text-xs ${panelStyle.isAmber ? 'text-black' : 'text-white/85'}`}>
            <span className={panelStyle.isAmber ? 'text-black/75 mr-0.5' : 'text-white/75 mr-0.5'}>Simuler :</span>
            {(
              [
                { id: 'SUCCESS', label: 'Valide' },
                { id: 'ALREADY_USED', label: 'Utilisé' },
                { id: 'INVALID', label: 'Invalide' },
                { id: 'ERROR', label: 'Erreur' },
              ] as const
            ).map((item) => {
              const isSelected = scanResult?.status === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSimulateState(item.id)}
                  className={`min-h-[32px] px-3.5 rounded-full border text-xs font-agrandir-semibold transition-colors cursor-pointer ${
                    panelStyle.isAmber
                      ? isSelected
                        ? 'bg-black/20 border-black text-black'
                        : 'border-black/45 text-black hover:bg-black/10'
                      : isSelected
                      ? 'bg-white/20 border-white text-white'
                      : 'border-white/45 text-white/90 hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* TIROIR OUTILS AGENT (0PX, SAISIE MANUELLE, IMAGE QR, NFC, CSV)    */}
      {/* ================================================================= */}
      {isToolsOpen && (
        <div
          className="fixed inset-0 z-[95] bg-black/82 backdrop-blur-md flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setIsToolsOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[85dvh] overflow-y-auto bg-[#0E0E0E] border-t sm:border border-white/[0.12] p-5 sm:p-6 space-y-5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-agrandir-extrabold text-base uppercase text-white">
                Outils contrôle agent
              </h3>
              <button
                type="button"
                onClick={() => setIsToolsOpen(false)}
                aria-label="Fermer"
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" strokeWidth={1.6} />
              </button>
            </div>

            {exportFeedback && (
              <div className="p-3 bg-[#2A2112] border border-[#D4AF6A]/45 text-xs text-[#D4AF6A]">
                {exportFeedback}
              </div>
            )}

            {/* Mode billet / Black Card */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#141414] border border-white/[0.12]">
              <button
                type="button"
                onClick={() => setScanMode('ticket')}
                className={`min-h-[40px] rounded-[4px] text-xs font-agrandir-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanMode === 'ticket' ? 'bg-[#D4AF6A] text-black' : 'text-[#9A9A9A]'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>Billet Concert</span>
              </button>
              <button
                type="button"
                onClick={() => setScanMode('membership')}
                className={`min-h-[40px] rounded-[4px] text-xs font-agrandir-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  scanMode === 'membership' ? 'bg-[#D4AF6A] text-black' : 'text-[#9A9A9A]'
                }`}
              >
                <Crown className="w-3.5 h-3.5" strokeWidth={1.6} />
                <span>Black Card</span>
              </button>
            </div>

            {scanMode === 'membership' && (
              <div className="space-y-2.5 p-3.5 bg-[#141414] border border-white/[0.12]">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'priority_lane', label: 'Entrée dédiée' },
                    { id: 'vip_lounge', label: 'Salon membre' },
                    { id: 'backstage_artists', label: 'Backstage' },
                    { id: 'main_entrance', label: 'Accueil principal' },
                  ].map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setMembershipZone(z.id as any)}
                      className={`py-2 px-2.5 rounded-[4px] text-[11px] font-agrandir-semibold cursor-pointer ${
                        membershipZone === z.id
                          ? 'bg-white text-black font-agrandir-extrabold'
                          : 'bg-white/5 text-[#9A9A9A]'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsToolsOpen(false);
                    handleVerifyMembership('04:A2:8F:12:9C:5E:80', 'chip_read');
                  }}
                  className="w-full min-h-[42px] rounded-[4px] bg-[#D4AF6A] text-black font-agrandir-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer lum-press"
                >
                  <Radio className="w-4 h-4" strokeWidth={1.6} />
                  <span>Lire carte NFC sans contact</span>
                </button>
              </div>
            )}

            {/* Saisie manuelle + Import photo QR */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualTicketInput.trim()) {
                  getAudioContext();
                  const code = manualTicketInput.trim();
                  setManualTicketInput('');
                  setIsToolsOpen(false);
                  if (scanMode === 'membership') {
                    handleVerifyMembership(code, 'manual_override');
                  } else {
                    handleVerifyTicket(code);
                  }
                }
              }}
              className="space-y-2"
            >
              <label className="text-[10px] uppercase tracking-wider text-[#9A9A9A] font-agrandir-semibold block">
                Saisie manuelle (si QR illisible)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualTicketInput}
                  onChange={(e) => setManualTicketInput(e.target.value)}
                  placeholder="LMR-... ou TKT_SEC_..."
                  className="flex-1 min-h-[42px] bg-[#141414] border border-white/[0.16] rounded-[4px] px-3 text-xs font-mono text-white outline-none focus:border-[#D4AF6A]"
                />
                <button
                  type="submit"
                  disabled={!manualTicketInput.trim()}
                  className="px-4 rounded-[4px] bg-white text-black font-agrandir-extrabold text-xs disabled:opacity-40 cursor-pointer lum-press"
                >
                  Vérifier
                </button>
              </div>
            </form>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[42px] rounded-[4px] border border-white/[0.16] bg-white/[0.04] hover:bg-white/[0.08] text-xs font-agrandir-semibold text-white flex items-center justify-center gap-2 cursor-pointer lum-press"
            >
              <Upload className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span>Scanner une image QR depuis l'appareil</span>
            </button>

            {/* Journal de session + Export CSV */}
            <div className="pt-3 border-t border-white/[0.12] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-agrandir-extrabold uppercase text-white">
                  Journal ({activityLog.length})
                </span>
                <button
                  type="button"
                  onClick={handleExportJournalCSV}
                  disabled={activityLog.length === 0}
                  className="min-h-[34px] px-3 rounded-[4px] bg-[#D4AF6A] disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-agrandir-extrabold text-[11px] flex items-center gap-1.5 cursor-pointer lum-press"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.6} />
                  <span>Exporter CSV</span>
                </button>
              </div>

              {activityLog.length === 0 ? (
                <p className="text-xs text-[#9A9A9A]">Aucun scan enregistré sur cette session.</p>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {activityLog.slice(0, 10).map((scan) => (
                    <div
                      key={scan.id}
                      className="p-2.5 bg-[#141414] border border-white/[0.08] flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-agrandir-extrabold text-white truncate">
                          {scan.holderName}
                        </p>
                        <p className="text-[10px] text-[#9A9A9A] flex items-center gap-1.5">
                          <Clock className="w-3 h-3" strokeWidth={1.6} />
                          <span>{scan.formattedTime}</span>
                          <span>·</span>
                          <span className="truncate">{scan.serialNumber}</span>
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-agrandir-extrabold uppercase shrink-0 ${
                          scan.status === 'SUCCESS'
                            ? 'text-[#7FE0A6]'
                            : scan.status === 'ALREADY_USED'
                            ? 'text-[#F2A23A]'
                            : 'text-[#F29AA4]'
                        }`}
                      >
                        {scan.status === 'SUCCESS'
                          ? 'VALIDE'
                          : scan.status === 'ALREADY_USED'
                          ? 'UTILISÉ'
                          : 'INVALIDE'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
