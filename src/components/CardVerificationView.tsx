import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { PublicCardVerificationResult } from '../types';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  QrCode,
  Calendar,
  UserCheck,
  Lock,
  Loader2,
  Sparkles,
  ExternalLink,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';

export const CardVerificationView: React.FC<{ token?: string; onBack?: () => void }> = ({
  token: propToken,
  onBack,
}) => {
  const { goBack, language, t } = useApp();
  const [tokenInput, setTokenInput] = useState(propToken || '');
  const [result, setResult] = useState<PublicCardVerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // Check URL parameters if token is in query
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryToken = params.get('verifyToken') || params.get('token') || propToken;
    if (queryToken) {
      setTokenInput(queryToken);
      verifyToken(queryToken);
    }
  }, [propToken]);

  const verifyToken = async (tokenToVerify: string) => {
    const clean = tokenToVerify.trim();
    if (!clean) return;

    try {
      setLoading(true);
      setSearched(true);
      const res = await fetch(`/api/card/verify/${encodeURIComponent(clean)}`);
      const data: PublicCardVerificationResult = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        valid: false,
        outcome: 'SYSTEM_UNAVAILABLE',
        status: 'NOT_FOUND',
        message: t('verify.unavailable'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      verifyToken(tokenInput.trim());
    }
  };

  return (
    <div className="min-h-screen bg-black text-[#EFEFEF] font-agrandir-regular pb-32 pt-8 sm:pt-14 px-4 sm:px-8">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* En-tête avec bouton croix discret */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-agrandir-bold tracking-widest text-white uppercase">
            <Lock className="w-3.5 h-3.5" />
            <span>{t('verify.officialRegistry')}</span>
          </div>

          <button
            type="button"
            onClick={() => (onBack ? onBack() : goBack())}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-neutral-300 hover:text-white hover:border-white transition-all cursor-pointer active:scale-95 shadow-md group"
            aria-label={t('nav.close')}
            title={t('nav.close')}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-200" />
          </button>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-white/15 border border-white/30 flex items-center justify-center mx-auto text-white shadow-xl">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-agrandir-extrabold uppercase text-white tracking-tight">
            {t('verify.title')}
          </h1>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {t('verify.subtitle')}
          </p>
        </div>

        {/* Formulaire de Recherche Manuelle si pas de jeton pré-rempli */}
        <form onSubmit={handleManualSearch} className="flex gap-2 p-2 rounded-2xl bg-[#0e0e0e] border border-white/10">
          <input
            type="text"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder={t('verify.placeholder')}
            className="flex-1 min-w-0 bg-transparent px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none font-mono"
          />
          <button
            type="submit"
            disabled={loading || !tokenInput.trim()}
            className="px-6 py-2.5 rounded-xl bg-white text-black font-agrandir-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-[#e5c04b] disabled:opacity-50 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : t('verify.submit')}
          </button>
        </form>

        {/* Résultat de la Vérification */}
        {loading && (
          <div className="p-12 text-center space-y-3 rounded-3xl bg-[#0c0c0c] border border-white/10">
            <Loader2 className="w-8 h-8 animate-spin text-white mx-auto" />
            <p className="text-xs text-neutral-400">{t('verify.querying')}</p>
          </div>
        )}

        {!loading && searched && result && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 sm:p-8 rounded-3xl border shadow-2xl space-y-6 ${
              result.valid
                ? 'bg-gradient-to-b from-[#0e1710] to-[#070b08] border-emerald-500/40 shadow-emerald-950/20'
                : 'bg-gradient-to-b from-[#180e0e] to-[#0a0707] border-rose-500/40 shadow-rose-950/20'
            }`}
          >
            {/* Bannière de Statut */}
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                  result.valid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {result.valid ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                ) : (
                  <XCircle className="w-7 h-7 text-rose-400" />
                )}
              </div>

              <div>
                <span
                  className={`text-[10px] font-agrandir-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                    result.valid
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {result.valid ? t('verify.authentic') : `${language === 'en' ? 'STATUS' : 'STATUT'} : ${result.status.toUpperCase()}`}
                </span>
                <h3 className="text-lg sm:text-xl font-agrandir-extrabold uppercase text-white mt-1">
                  {result.message}
                </h3>
              </div>
            </div>

            {/* Détails Publics Sécurisés (Aucune donnée sensible divulguée) */}
            {result.status !== 'NOT_FOUND' && (
              <div className="p-5 rounded-2xl bg-black/60 border border-white/10 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-mono">
                      {t('verify.maskedNum')}
                    </span>
                    <strong className="text-sm font-mono text-white">
                      {result.maskedCardNumber || 'LMR-2026-****'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-mono">
                      {t('verify.edition')}
                    </span>
                    <strong className="text-sm font-agrandir-bold text-white">
                      {result.editionName || 'LUMARÉEL FOUNDERS EDITION'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-mono">
                      {t('verify.initials')}
                    </span>
                    <strong className="text-sm font-agrandir-bold text-white">
                      {result.cardholderInitials || 'D. B.'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block font-mono">
                      {t('verify.validity')}
                    </span>
                    <span className="text-sm font-mono text-neutral-200">
                      {result.expiresAt
                        ? `${t('verify.until')} ${new Date(result.expiresAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR')}`
                        : (language === 'en' ? '12 months' : '12 mois')}
                    </span>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-3 text-[11px] text-neutral-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>{t('verify.cryptoNote')}</span>
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    LUMARÉEL CO. · AREEL GROUPE
                  </span>
                </div>
              </div>
            )}

            {/* Note de protection des données */}
            <div className="text-[11px] text-neutral-400 text-center font-light">
              {t('verify.privacyNote')}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
};
