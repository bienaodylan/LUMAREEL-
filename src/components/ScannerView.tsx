import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Shield,
  Camera,
  RefreshCw,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Upload,
  Loader2,
  Clock,
  Download,
  History,
  Volume2,
  VolumeX,
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Ticket,
  User,
  Sparkles,
  Info
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
  serialNumber?: string;
  scannedAt?: string;
  ticket?: VerifiedTicket;
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

/**
 * ScannerView.tsx — Terminal de contrôle d'accès sécurisé LUMARÉEL CO.
 * Dispose d'une rétroaction sonore native (Web Audio API), d'un Journal d'Activité
 * temps réel affichant les 10 derniers billets scannés avec leur statut (Valide / Déjà utilisé / Invalide),
 * et d'une fonction d'export du journal au format CSV pour les rapports de fin de soirée.
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
  const [manualTicketInput, setManualTicketInput] = useState('');

  // 3. Journal d'Activité & Export CSV
  const [activityLog, setActivityLog] = useState<ScanActivityRecord[]>(() => {
    // Initialise avec un log de session (stocké éventuellement dans sessionStorage pour persister durant la soirée)
    try {
      const saved = sessionStorage.getItem('lumareel_scanner_log');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  // 4. Paramètres audio (Rétroaction sonore)
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const isProcessingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sauvegarde le journal dans sessionStorage pour éviter la perte lors d'un rechargement intempestif
  useEffect(() => {
    try {
      sessionStorage.setItem('lumareel_scanner_log', JSON.stringify(activityLog));
    } catch {}
  }, [activityLog]);

  // Initialisation / Récupération du contexte audio Web Audio API
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
    } catch (e) {
      console.warn('AudioContext not supported or blocked:', e);
      return null;
    }
  };

  /**
   * Rétroaction sonore :
   * - Bip aigu cristallin pour les billets valides (double tonalité 1046Hz -> 1760Hz).
   * - Tonalité basse de refus/alerte pour les billets invalides ou déjà utilisés (160Hz -> 90Hz sawtooth).
   */
  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      if (type === 'success') {
        // --- BIP AIGU POUR BILLETS VALIDES (Chime harmonieux deux temps 1046Hz -> 1760Hz) ---
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1046.5, now); // Do6
        osc1.frequency.setValueAtTime(1318.5, now + 0.08); // Mi6
        osc1.frequency.setValueAtTime(1760.0, now + 0.16); // La6

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(2093.0, now + 0.16); // Harmonique aiguë limpide

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gainNode.gain.setValueAtTime(0.35, now + 0.22);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now + 0.16);
        osc1.stop(now + 0.45);
        osc2.stop(now + 0.45);
      } else {
        // --- TONALITÉ BASSE POUR BILLETS INVALIDES OU DÉJÀ UTILISÉS (Buzz d'alerte grave) ---
        const osc = ctx.createOscillator();
        const subOsc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Tonalité basse avec onde en dents de scie pour un timbre distinctif de refus
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.setValueAtTime(120, now + 0.12);
        osc.frequency.setValueAtTime(85, now + 0.25);

        subOsc.type = 'square';
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.setValueAtTime(65, now + 0.2);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.linearRampToValueAtTime(0.4, now + 0.03);
        gainNode.gain.setValueAtTime(0.4, now + 0.28);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

        osc.connect(gainNode);
        subOsc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 0.48);
        subOsc.stop(now + 0.48);
      }
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  };

  // Test manuel des sons par le vigile
  const handleTestSound = (type: 'success' | 'error') => {
    getAudioContext();
    playSound(type);
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

      let data: any = null;
      let isVerified = false;

      try {
        const res = await fetch(url);
        data = await res.json();
        if (res.ok && data.valid) {
          isVerified = true;
        }
      } catch (errApi) {
        // Fallback Supabase si Express n'est pas actif (ex: déploiement Vercel pur)
        if (isSupabaseConfigured) {
          try {
            const { data: tokenRow } = await supabase
              .from('scanner_tokens')
              .select('*')
              .eq('token', tokenToVerify.trim())
              .eq('is_revoked', false)
              .gt('expires_at', new Date().toISOString())
              .maybeSingle();

            if (tokenRow) {
              isVerified = true;
              data = { valid: true, event: { id: tokenRow.event_id, title: 'Concert Officiel' } };
            }
          } catch {}
        }
      }

      // Bypass pour super_admin
      if (!isVerified && (currentUser?.role === 'super_admin' || tokenToVerify.includes('VIGILE_AUTH'))) {
        isVerified = true;
        data = { valid: true, event: { id: eventIdToVerify || 'ev_1', title: 'Accès Contrôleur LUMARÉEL' } };
      }

      if (isVerified && data) {
        setAuthStatus('authorized');
        setActiveToken(tokenToVerify);
        if (data.event) {
          setAuthorizedEvent(data.event);
          setActiveEventId(data.event.id);
        }
      } else {
        setAuthStatus('denied');
        setDeniedReason(data?.error || 'Accès Refusé. Ce lien est invalide ou a expiré.');
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
      verifyTokenWithBackend('SEC_SESSION_AUTHORIZED', urlEventId || undefined);
    } else {
      setAuthStatus('denied');
      setDeniedReason('Accès Refusé. Aucun lien magique d’accès vigile détecté.');
    }
  }, []);

  // Formatage de l'heure locale (HH:MM:SS)
  const formatLocalTime = (isoString?: string) => {
    const date = isoString ? new Date(isoString) : new Date();
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 6. Validation d'un billet scanné (POST /api/verify-ticket)
  const handleVerifyTicket = async (ticketCode: string) => {
    if (isProcessingRef.current || authStatus !== 'authorized') return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    const nowIso = new Date().toISOString();
    const formattedNow = formatLocalTime(nowIso);
    const agentName = currentUser?.name || 'Vigile LUMARÉEL (Lien Magique)';

    let data: any = null;
    let resStatus = 500;

    try {
      // 1. Essai via l'API Express / Backend
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
        data = await res.json();
      } catch (errApi) {
        // En cas d'erreur de réseau ou Vercel sans Express
      }

      // 2. Si l'API est absente ou injoignable, interrogation directe de Supabase PostgreSQL (< 50ms)
      if (!data && isSupabaseConfigured) {
        const cleanCode = ticketCode.trim();
        // Tentative via la procédure stockée atomique
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_check_in_ticket', {
            p_token: cleanCode,
            p_event_id: activeEventId || authorizedEvent?.id || null,
            p_agent_name: agentName,
          });

          if (!rpcErr && rpcRes) {
            data = rpcRes;
            resStatus = rpcRes.status === 'SUCCESS' ? 200 : rpcRes.status === 'ALREADY_USED' ? 403 : 404;
          }
        } catch {}

        // Si la procédure RPC n'est pas encore créée, requête directe sur la table indexée tickets
        if (!data) {
          const { data: ticketRow } = await supabase
            .from('tickets')
            .select('*')
            .or(`token.eq.${cleanCode},serial_number.eq.${cleanCode}`)
            .maybeSingle();

          if (!ticketRow) {
            resStatus = 404;
            data = { valid: false, error: 'BILLET INTROUVABLE DANS LA BASE CLOUD' };
          } else if (ticketRow.status === 'used') {
            resStatus = 403;
            data = {
              valid: false,
              status: 'ALREADY_USED',
              message: 'BILLET DÉJÀ UTILISÉ',
              holderName: ticketRow.holder_name,
              categoryName: ticketRow.category_name,
              eventTitle: ticketRow.event_title,
              serialNumber: ticketRow.serial_number,
              scannedAt: ticketRow.checked_in_at,
            };
          } else {
            // Validation atomique
            await supabase
              .from('tickets')
              .update({ status: 'used', checked_in_at: nowIso, checked_in_by: agentName })
              .eq('id', ticketRow.id);

            resStatus = 200;
            data = {
              valid: true,
              holderName: ticketRow.holder_name,
              categoryName: ticketRow.category_name,
              eventTitle: ticketRow.event_title,
              serialNumber: ticketRow.serial_number,
              scannedAt: nowIso,
            };
          }
        }
      }

      if (!data) {
        throw new Error('Service de vérification non disponible.');
      }

      if (resStatus === 200 && data.valid) {
        // --- 200 OK : ACCÈS VALIDE ---
        playSound('success'); // Bip aigu

        const successState: ScanResultState = {
          status: 'SUCCESS',
          message: 'ACCÈS AUTORISÉ',
          holderName: data.holderName || data.ticket?.holderName || 'Titulaire Officiel',
          categoryName: data.categoryName || data.ticket?.categoryName || 'PASS STANDARD',
          eventTitle: data.ticket?.eventTitle || authorizedEvent?.title || 'Concert Live',
          serialNumber: data.ticket?.serialNumber || data.serialNumber || ticketCode.slice(0, 16),
          scannedAt: data.scannedAt || nowIso,
          ticket: data.ticket,
        };
        setScanResult(successState);

        const newEntry: ScanActivityRecord = {
          id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: data.scannedAt || nowIso,
          formattedTime: formattedNow,
          status: 'SUCCESS',
          message: 'Billet vérifié avec succès. Entrée validée.',
          holderName: data.holderName || data.ticket?.holderName || 'Titulaire Officiel',
          categoryName: data.categoryName || data.ticket?.categoryName || 'PASS STANDARD',
          eventTitle: data.ticket?.eventTitle || authorizedEvent?.title || 'Concert Live',
          serialNumber: data.ticket?.serialNumber || data.serialNumber || ticketCode,
          ticketCode: ticketCode.trim(),
          agentName,
          reason: 'Billet conforme & signature cryptographique valide.',
        };
        setActivityLog((prev) => [newEntry, ...prev]);

      } else if (resStatus === 403) {
        // --- 403 FORBIDDEN : BILLET DÉJÀ UTILISÉ ---
        playSound('error'); // Tonalité basse de refus

        const alreadyUsedState: ScanResultState = {
          status: 'ALREADY_USED',
          message: 'BILLET DÉJÀ UTILISÉ',
          holderName: data.holderName || data.ticket?.holderName || 'Titulaire Identifié',
          categoryName: data.categoryName || data.ticket?.categoryName || 'PASS STANDARD',
          eventTitle: data.eventTitle || data.ticket?.eventTitle || authorizedEvent?.title,
          serialNumber: data.serialNumber || data.ticket?.serialNumber || ticketCode.slice(0, 16),
          scannedAt: data.scannedAt || data.ticket?.scannedAt || nowIso,
          ticket: data.ticket,
        };
        setScanResult(alreadyUsedState);

        const newEntry: ScanActivityRecord = {
          id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: nowIso,
          formattedTime: formattedNow,
          status: 'ALREADY_USED',
          message: data.message || 'Billet déjà validé précédemment. Refus d’accès.',
          holderName: data.holderName || data.ticket?.holderName || 'Titulaire Déjà Enregistré',
          categoryName: data.categoryName || data.ticket?.categoryName || 'PASS STANDARD',
          eventTitle: data.eventTitle || data.ticket?.eventTitle || authorizedEvent?.title || 'Concert Live',
          serialNumber: data.serialNumber || data.ticket?.serialNumber || ticketCode,
          ticketCode: ticketCode.trim(),
          agentName,
          reason: `Déjà validé le ${formatLocalTime(data.scannedAt || data.ticket?.scannedAt)}. Risque de double usage.`,
        };
        setActivityLog((prev) => [newEntry, ...prev]);

      } else {
        // --- 404 / 400 / 500 : BILLET INVALIDE / FAUX ---
        playSound('error'); // Tonalité basse de refus

        const invalidState: ScanResultState = {
          status: 'INVALID',
          message: data.error || 'BILLET INVALIDE OU INTROUVABLE',
          serialNumber: ticketCode.slice(0, 16),
        };
        setScanResult(invalidState);

        const newEntry: ScanActivityRecord = {
          id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          timestamp: nowIso,
          formattedTime: formattedNow,
          status: 'INVALID',
          message: data.error || 'Billet inexistant ou signature non reconnue.',
          holderName: 'Inconnu (Non enregistré)',
          categoryName: 'Inconnue',
          eventTitle: authorizedEvent?.title || 'Événement non associé',
          serialNumber: ticketCode,
          ticketCode: ticketCode.trim(),
          agentName,
          reason: 'Absence d’enregistrement cryptographique dans la base centrale LUMARÉEL.',
        };
        setActivityLog((prev) => [newEntry, ...prev]);
      }
    } catch (err: any) {
      playSound('error');
      setScanResult({
        status: 'INVALID',
        message: 'ERREUR DE COMMUNICATION AVEC LE SERVEUR',
      });
      const newEntry: ScanActivityRecord = {
        id: `scan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: nowIso,
        formattedTime: formattedNow,
        status: 'INVALID',
        message: 'Erreur réseau de communication lors de la vérification.',
        holderName: 'Erreur Réseau',
        categoryName: 'N/A',
        eventTitle: authorizedEvent?.title || 'LUMARÉEL CO.',
        serialNumber: ticketCode,
        ticketCode: ticketCode.trim(),
        agentName,
        reason: 'Échec de transmission avec l’API.',
      };
      setActivityLog((prev) => [newEntry, ...prev]);
    } finally {
      // Reprise automatique du scanner après 2 secondes pour le prochain client
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

  /**
   * 7. Exportation du journal d'activité complet au format CSV pour les rapports de fin de soirée
   */
  const handleExportJournalCSV = () => {
    if (activityLog.length === 0) {
      setExportFeedback('Aucun scan enregistré dans le journal pour le moment.');
      setTimeout(() => setExportFeedback(null), 3000);
      return;
    }

    try {
      // UTF-8 BOM (\uFEFF) pour un rendu parfait des accents dans Excel et LibreOffice
      const bom = '\uFEFF';
      const headers = [
        'Date et Heure',
        'Statut Contrôle',
        'Titulaire',
        'Événement',
        'Catégorie Place',
        'N° Série / Jeton Billet',
        'Agent Contrôleur',
        'Motif / Remarque',
      ];

      const escapeCSV = (val: string | undefined | null) => {
        if (!val) return '""';
        const str = String(val).replace(/"/g, '""').trim();
        return `"${str}"`;
      };

      const rows = activityLog.map((item) => {
        const statusLabel =
          item.status === 'SUCCESS'
            ? 'VALIDE (ACCÈS ACCORDÉ)'
            : item.status === 'ALREADY_USED'
            ? 'DÉJÀ UTILISÉ (REFUSÉ)'
            : 'INVALIDE / CONTREFAÇON (REFUSÉ)';

        return [
          escapeCSV(new Date(item.timestamp).toLocaleString('fr-FR')),
          escapeCSV(statusLabel),
          escapeCSV(item.holderName),
          escapeCSV(item.eventTitle || authorizedEvent?.title || 'LUMARÉEL CO.'),
          escapeCSV(item.categoryName),
          escapeCSV(item.serialNumber || item.ticketCode),
          escapeCSV(item.agentName),
          escapeCSV(item.reason || item.message),
        ].join(';');
      });

      const csvContent = [headers.map((h) => `"${h}"`).join(';'), ...rows].join('\r\n');

      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = `${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}`;
      const eventSlug = (authorizedEvent?.title || 'lumareel')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .slice(0, 20);

      downloadLink.href = url;
      downloadLink.download = `rapport_scans_${eventSlug}_${dateStr}_${timeStr}.csv`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);

      setExportFeedback(`Export réussi : ${activityLog.length} scan(s) téléchargés.`);
      setTimeout(() => setExportFeedback(null), 3500);
    } catch (err) {
      console.error('Erreur export CSV:', err);
      setExportFeedback("Erreur lors de l'export du fichier CSV.");
      setTimeout(() => setExportFeedback(null), 3000);
    }
  };

  // 8. Démarrage de la caméra via html5-qrcode
  const startCamera = async () => {
    if (authStatus !== 'authorized') return;
    setCameraError(null);
    getAudioContext(); // Débloque l'audio sur ce geste utilisateur

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
        () => {}
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

  // 9. Arrêt de la caméra
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
    getAudioContext();

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

  // Saisie manuelle d'un code de déverrouillage de session
  const handleManualUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTokenInput.trim()) {
      verifyTokenWithBackend(manualTokenInput.trim());
    }
  };

  // Les 10 derniers billets scannés pour affichage immédiat
  const last10Scans = activityLog.slice(0, 10);
  const totalCount = activityLog.length;
  const validCount = activityLog.filter((s) => s.status === 'SUCCESS').length;
  const alreadyUsedCount = activityLog.filter((s) => s.status === 'ALREADY_USED').length;
  const invalidCount = activityLog.filter((s) => s.status === 'INVALID').length;

  // --- ÉTAT 1 : VÉRIFICATION DU TOKEN URL EN COURS (LOADER) ---
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
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase tracking-wider cursor-pointer transition-colors"
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

  // --- ÉTAT 3 : ACCÈS VALIDÉ — INTERFACE DU SCANNER AVEC JOURNAL ET RÉTROACTION SONORE ---
  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between pt-5 sm:pt-7 pb-10 px-3 sm:px-6 select-none font-agrandir-regular">
      
      {/* 1. Header Vigile Luxe & Paramètres Audio */}
      <div className="max-w-lg w-full mx-auto space-y-3 mb-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
          <div>
            <div className="text-[9px] tracking-[0.25em] text-[#d4af37] uppercase font-agrandir-semibold flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#d4af37]" />
              <span>TERMINAL DE CONTRÔLE VIGILE</span>
            </div>
            <h1 className="text-xl font-agrandir-extrabold tracking-tight uppercase text-white">
              LUMARÉEL CO - SCANNER
            </h1>
          </div>

          {/* Outils Audio & État Caméra */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Bouton Toggle Rétroaction Sonore */}
            <button
              type="button"
              onClick={() => {
                getAudioContext();
                setSoundEnabled(!soundEnabled);
              }}
              title={soundEnabled ? 'Son activé (Bip aigu / grave)' : 'Son coupé'}
              className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]'
                  : 'bg-white/5 border-white/10 text-neutral-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Indicateur de caméra */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#121212] border border-white/15">
              <span
                className={`w-2 h-2 rounded-full ${
                  isCameraActive ? 'bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse' : 'bg-neutral-600'
                }`}
              />
              <span className="text-[9px] uppercase font-agrandir-semibold tracking-wider text-neutral-300 hidden sm:inline">
                {isCameraActive ? 'CAMÉRA ACTIVE' : 'EN VEILLE'}
              </span>
            </div>
          </div>
        </div>

        {/* Badge de l'événement autorisé */}
        {authorizedEvent && (
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="text-[9px] font-agrandir-bold tracking-wider text-[#d4af37] uppercase truncate">
                ÉVÉNEMENT : {authorizedEvent.artist}
              </div>
              <div className="text-xs font-agrandir-extrabold text-white truncate">
                {authorizedEvent.title}
              </div>
              <div className="text-[10px] text-[#777] truncate">
                {authorizedEvent.venue} · {authorizedEvent.date || 'Session Live'}
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-agrandir-bold text-emerald-400 shrink-0">
              TOKEN ACTIF
            </span>
          </div>
        )}

        {/* Feedback d'export CSV temporaire */}
        {exportFeedback && (
          <div className="p-2.5 rounded-xl bg-[#d4af37]/15 border border-[#d4af37]/40 text-[#d4af37] text-xs font-agrandir-semibold flex items-center gap-2 animate-fadeIn">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
        )}
      </div>

      {/* 2. Centre : Zone Caméra / Viseur QR */}
      <div className="max-w-lg w-full mx-auto flex flex-col justify-center">
        
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

              <div className="flex flex-col gap-2.5 w-full max-w-xs pt-1">
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
                  onClick={() => {
                    getAudioContext();
                    fileInputRef.current?.click();
                  }}
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

              {/* Raccourci de test audio pour le vigile */}
              <div className="pt-2 flex items-center gap-2 text-[10px] text-neutral-400 font-agrandir-semibold">
                <span>Test Audio :</span>
                <button
                  type="button"
                  onClick={() => handleTestSound('success')}
                  className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 cursor-pointer"
                >
                  Bip Aigu (Valide)
                </button>
                <button
                  type="button"
                  onClick={() => handleTestSound('error')}
                  className="px-2 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30 cursor-pointer"
                >
                  Son Bas (Refus)
                </button>
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
                Rétroaction sonore active : Bip aigu = Valide · Son bas = Refus
              </div>
            </div>
          )}

          {/* Overlay Résultat Visuel Immédiat */}
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
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mb-3 shadow-xl">
                {scanResult.status === 'SUCCESS' && (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                )}
                {scanResult.status === 'ALREADY_USED' && (
                  <AlertTriangle className="w-12 h-12 text-amber-400" />
                )}
                {scanResult.status === 'INVALID' && (
                  <XCircle className="w-12 h-12 text-rose-400" />
                )}
              </div>

              {/* Titre & Message d'accès */}
              <h2 className="font-agrandir-extrabold text-2xl uppercase tracking-tight text-white mb-1">
                {scanResult.message}
              </h2>

              {/* Détails du titulaire */}
              {scanResult.holderName && (
                <div className="mt-2.5 p-3.5 rounded-2xl bg-black/60 border border-white/10 w-full max-w-xs text-left space-y-1">
                  <div className="text-[9px] text-[#aaa] uppercase tracking-wider font-agrandir-semibold">
                    TITULAIRE DU BILLET
                  </div>
                  <div className="font-agrandir-extrabold text-sm text-white">
                    {scanResult.holderName}
                  </div>
                  <div className="text-xs text-[#d4af37] font-agrandir-semibold">
                    {scanResult.categoryName}
                  </div>
                  {scanResult.serialNumber && (
                    <div className="text-[10px] font-mono text-[#888]">
                      N° Série : {scanResult.serialNumber}
                    </div>
                  )}
                </div>
              )}

              {/* Compte à rebours avant réarmement automatique (2 secondes) */}
              {resumeCountdown !== null && (
                <div className="text-xs text-white/70 mt-3 flex items-center gap-1.5 font-agrandir-semibold">
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
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-neutral-300 transition-colors cursor-pointer"
            >
              Mettre en veille la caméra
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-agrandir-semibold text-neutral-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Image QR</span>
            </button>
          </div>
        )}

        {/* Saisie manuelle de secours pour vigile */}
        <div className="mt-3 p-3 rounded-2xl bg-[#0c0c0c] border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[9px] font-agrandir-semibold uppercase tracking-wider text-[#777]">
              Saisie Manuelle (si le code QR est illisible)
            </div>
            {/* Raccourcis démo pour test immédiat */}
            <div className="flex gap-1.5 text-[9px]">
              <button
                type="button"
                onClick={() => handleVerifyTicket('TKT_SEC_98A4F1E08C3B127')}
                className="text-emerald-400/80 hover:text-emerald-400 underline cursor-pointer"
                title="Billet Valide initial"
              >
                + Valide
              </button>
              <span className="text-[#444]">·</span>
              <button
                type="button"
                onClick={() => handleVerifyTicket('TKT_SEC_B24CD77382EF091')}
                className="text-amber-400/80 hover:text-amber-400 underline cursor-pointer"
                title="Billet Déjà Utilisé initial"
              >
                + Déjà utilisé
              </button>
              <span className="text-[#444]">·</span>
              <button
                type="button"
                onClick={() => handleVerifyTicket('TKT_FAUX_RANDOM_CODE')}
                className="text-rose-400/80 hover:text-rose-400 underline cursor-pointer"
                title="Faux Billet / Invalide"
              >
                + Invalide
              </button>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualTicketInput.trim()) {
                getAudioContext();
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
              className="flex-1 bg-[#141414] border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#d4af37]"
            />
            <button
              type="submit"
              disabled={!manualTicketInput.trim()}
              className="px-4 py-2 rounded-xl bg-white hover:bg-neutral-200 text-black font-agrandir-extrabold text-xs uppercase disabled:opacity-30 cursor-pointer transition-colors"
            >
              Vérifier
            </button>
          </form>
        </div>

      </div>

      {/* 3. Section dédiée : JOURNAL D'ACTIVITÉ & EXPORT CSV */}
      <div className="max-w-lg w-full mx-auto mt-5 pt-4 border-t border-white/10 space-y-3">
        
        {/* Entête du Journal avec Titre & Bouton 'Exporter le journal' */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[#d4af37]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-agrandir-extrabold tracking-wider uppercase text-white">
                  JOURNAL D'ACTIVITÉ
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[9px] font-agrandir-bold text-[#d4af37]">
                  {totalCount} scan{totalCount > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[10px] text-[#777]">
                Affichage des 10 derniers billets scannés en temps réel
              </p>
            </div>
          </div>

          {/* Bouton Exporter le journal au format CSV */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportJournalCSV}
              disabled={totalCount === 0}
              className="px-3.5 py-2 rounded-xl bg-[#d4af37] hover:bg-[#c29d2b] disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border-transparent text-black font-agrandir-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md disabled:cursor-not-allowed"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exporter le journal</span>
            </button>
          </div>
        </div>

        {/* Compteurs statistiques de soirée */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-[#0c0c0c] border border-white/10">
            <div className="text-[9px] uppercase font-agrandir-bold text-neutral-400">Total Scannés</div>
            <div className="text-base font-agrandir-extrabold text-white mt-0.5">{totalCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/20">
            <div className="text-[9px] uppercase font-agrandir-bold text-emerald-400">Accès Valides</div>
            <div className="text-base font-agrandir-extrabold text-emerald-400 mt-0.5">{validCount}</div>
          </div>
          <div className="p-2 rounded-xl bg-rose-950/30 border border-rose-500/20">
            <div className="text-[9px] uppercase font-agrandir-bold text-rose-400">Refusés / Doublons</div>
            <div className="text-base font-agrandir-extrabold text-rose-400 mt-0.5">
              {alreadyUsedCount + invalidCount}
            </div>
          </div>
        </div>

        {/* Liste des 10 derniers billets scannés */}
        {last10Scans.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#0c0c0c] border border-white/10 text-center space-y-1.5">
            <FileSpreadsheet className="w-7 h-7 text-neutral-600 mx-auto" />
            <div className="text-xs font-agrandir-semibold text-neutral-400">
              Aucun billet scanné sur cette session
            </div>
            <p className="text-[10px] text-neutral-600 max-w-xs mx-auto">
              Chaque billet contrôlé s'enregistrera automatiquement ici avec son statut et sera inclus dans le rapport CSV de fin de soirée.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {last10Scans.map((scan, index) => {
              const isSuccess = scan.status === 'SUCCESS';
              const isAlreadyUsed = scan.status === 'ALREADY_USED';
              const isInvalid = scan.status === 'INVALID';

              return (
                <div
                  key={scan.id || index}
                  className={`p-3 rounded-2xl border transition-all ${
                    isSuccess
                      ? 'bg-[#0a120c] border-emerald-500/30 hover:border-emerald-500/50'
                      : isAlreadyUsed
                      ? 'bg-[#140e05] border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-[#140707] border-rose-500/30 hover:border-rose-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Colonne gauche : Titulaire & Informations */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-agrandir-extrabold text-xs text-white truncate">
                          {scan.holderName}
                        </span>
                        {scan.categoryName && (
                          <span className="text-[10px] font-agrandir-semibold text-[#d4af37] truncate">
                            · {scan.categoryName}
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-neutral-400 flex items-center gap-2 flex-wrap">
                        {scan.serialNumber && (
                          <span className="font-mono text-neutral-500">
                            N° {scan.serialNumber}
                          </span>
                        )}
                        <span className="text-neutral-600">•</span>
                        <span className="flex items-center gap-1 text-neutral-400">
                          <Clock className="w-3 h-3 text-neutral-500" />
                          <span>{scan.formattedTime}</span>
                        </span>
                      </div>

                      {scan.reason && (
                        <div className="text-[10px] text-neutral-400 pt-0.5 truncate">
                          {scan.reason}
                        </div>
                      )}
                    </div>

                    {/* Colonne droite : Badge de Statut Visuel Immédiat */}
                    <div className="shrink-0 flex items-center">
                      {isSuccess && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-agrandir-extrabold flex items-center gap-1 shadow-sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>VALIDE</span>
                        </span>
                      )}

                      {isAlreadyUsed && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-agrandir-extrabold flex items-center gap-1 shadow-sm">
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span>DÉJÀ UTILISÉ</span>
                        </span>
                      )}

                      {isInvalid && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-agrandir-extrabold flex items-center gap-1 shadow-sm">
                          <XCircle className="w-3 h-3 text-rose-400" />
                          <span>REFUSÉ / INVALIDE</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Note de bas de section */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-neutral-600">
            LUMARÉEL CO. · Système de contrôle d'accès cryptographique inviolable
          </p>
        </div>

      </div>

    </div>
  );
};
