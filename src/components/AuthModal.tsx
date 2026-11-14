import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { isValidRealEmail } from './CheckoutModal';
import { clearLocalAuthToken, getAuthHeaders } from '../utils/authSession';
import { supabase } from '../lib/supabaseClient';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, setCurrentUser, showToast, checkoutEvent, setCheckoutEvent } = useApp();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [requires2fa, setRequires2fa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  if (!isAuthModalOpen) return null;

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !isValidRealEmail(cleanEmail)) {
      showToast('Saisissez une adresse e-mail réelle et valide pour réinitialiser le mot de passe.', 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });
      await fetch('/api/auth/forgot-password', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ email: cleanEmail }),
      }).catch(() => null);
      showToast('Si ce compte existe, un e-mail de réinitialisation a été envoyé.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible d’envoyer le lien de réinitialisation.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const headers = await getAuthHeaders({ 'Content-Type': 'application/json' });

    if (mode === 'reset') {
      if (!resetToken.trim() || password.length < 10) {
        showToast('Renseignez le jeton reçu et un nouveau mot de passe d’au moins 10 caractères.', 'error');
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ token: resetToken.trim(), newPassword: password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Réinitialisation impossible.');
        }
        showToast('Mot de passe mis à jour. Connectez-vous avec vos nouveaux identifiants.', 'success');
        setResetToken('');
        setPassword('');
        setMode('login');
      } catch (err: any) {
        showToast(err.message || 'Jeton invalide ou expiré.', 'error');
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !isValidRealEmail(cleanEmail)) {
      showToast('Veuillez saisir une adresse e-mail réelle et valide (ex : nom@domaine.com).', 'error');
      return;
    }

    const minPwdLen = mode === 'register' ? 10 : 6;
    if (!password || password.length < minPwdLen) {
      showToast(
        mode === 'register'
          ? 'Le mot de passe doit comporter au moins 10 caractères.'
          : 'Veuillez saisir votre mot de passe.',
        'error'
      );
      return;
    }

    if (mode === 'register' && !name.trim()) {
      showToast('Veuillez renseigner votre nom complet.', 'error');
      return;
    }

    setIsLoading(true);
    clearLocalAuthToken();

    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: name.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Inscription impossible.');
        }

        if (data.session?.access_token && data.session?.refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          if (sessionError) throw sessionError;
        }

        const meRes = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: await getAuthHeaders(),
        });
        if (meRes.ok) {
          const meData = await meRes.json().catch(() => null);
          if (meData?.success && meData.user) {
            setCurrentUser(meData.user);
            setIsAuthModalOpen(false);
            showToast(`Bienvenue, ${meData.user.name}. Compte créé et connecté.`, 'success');
            if (checkoutEvent) setCheckoutEvent(checkoutEvent);
            return;
          }
        }

        showToast(data.message || 'Si ce compte peut être créé, votre inscription a bien été enregistrée.', 'info');
        setMode('login');
        return;
      }

      const loginPayload: Record<string, string> = {
        email: cleanEmail,
        password,
      };
      if (requires2fa && totpCode.trim()) {
        loginPayload.totpCode = totpCode.trim();
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(loginPayload),
      });

      const data = await res.json();
      if (res.status === 401 && data?.requires2fa) {
        setRequires2fa(true);
        throw new Error(data.error || 'Code d’authentification à deux facteurs (2FA) requis.');
      }
      if (!res.ok || !data.success || !data.user) {
        throw new Error(data.error || 'Identifiants invalides.');
      }

      if (!data.session?.access_token || !data.session?.refresh_token) {
        throw new Error('La session sécurisée n’a pas été créée. Vérifiez la configuration de l’authentification.');
      }
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
      if (sessionError) throw sessionError;

      setRequires2fa(false);
      setTotpCode('');
      setCurrentUser(data.user);
      setIsAuthModalOpen(false);
      showToast(`Bienvenue, ${data.user.name}. Connexion réussie.`, 'success');

      if (checkoutEvent) setCheckoutEvent(checkoutEvent);
    } catch (err: any) {
      showToast(err.message || 'Échec de connexion.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-6 sm:p-8 text-[#efefef] shadow-2xl font-agrandir-regular text-xs">
        
        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#777] hover:text-white cursor-pointer transition-colors"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo & En-tête */}
        <div className="mb-4">
          <img
            src="/assets/logo-lumareel.png"
            alt="LUMARÉEL CO."
            className="h-6 w-auto object-contain"
          />
        </div>
        <div className="text-[10px] tracking-[0.25em] text-[#888] uppercase mb-1 flex items-center gap-2">
          <span>IDENTIFICATION OFFICIELLE</span>
          {mode === 'login' && (
            <span className="text-[#d4af37] font-agrandir-bold">· ACCÈS SÉCURISÉ</span>
          )}
        </div>
        <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-2">
          {mode === 'login' ? 'CONNEXION' : mode === 'register' ? 'CRÉER UN COMPTE' : 'RÉINITIALISER LE MOT DE PASSE'}
        </h2>
        <p className="text-[#888] text-xs mb-5">
          {mode === 'login'
            ? 'Accédez à vos billets officiels et commandes passées.'
            : mode === 'register'
            ? 'Créez votre compte en quelques secondes pour réserver vos places et recevoir vos billets sécurisés.'
            : 'Saisissez votre jeton de réinitialisation et choisissez un nouveau mot de passe robuste.'}
        </p>

        {/* Formulaire Authentification */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] text-[#888] uppercase mb-1 font-agrandir-semibold">
                NOM COMPLET
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Prénom et Nom"
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
                />
              </div>
            </div>
          )}

          {mode === 'reset' ? (
            <div>
              <label className="block text-[10px] text-[#888] uppercase mb-1 font-agrandir-semibold">
                JETON DE RÉINITIALISATION
              </label>
              <input
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Collez le jeton reçu par e-mail"
                className="w-full bg-[#161616] border border-white/15 rounded-2xl px-4 py-2.5 text-white font-mono focus:outline-none focus:border-white text-xs"
              />
            </div>
          ) : (
            <div>
              <label className="block text-[10px] text-[#888] uppercase mb-1 font-agrandir-semibold">
                ADRESSE E-MAIL
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@domaine.com"
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-[#888] uppercase font-agrandir-semibold">
                {mode === 'reset' ? 'NOUVEAU MOT DE PASSE' : 'MOT DE PASSE'}
              </label>
              {mode === 'login' && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResettingPassword}
                    className="text-[10px] text-[#888] hover:text-[#d4af37] underline cursor-pointer transition-colors"
                  >
                    {isResettingPassword ? 'Envoi...' : 'Mot de passe oublié ?'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('reset')}
                    className="text-[10px] text-[#666] hover:text-white underline cursor-pointer transition-colors"
                  >
                    J’ai un jeton
                  </button>
                </div>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={mode === 'login' ? 6 : 10}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'login' ? '••••••••••••' : '10 caractères minimum'}
                className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
              />
            </div>
          </div>

          {mode === 'login' && requires2fa && (
            <div>
              <label className="block text-[10px] text-[#d4af37] uppercase mb-1 font-agrandir-bold">
                CODE 2FA (6 CHIFFRES)
              </label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-[#d4af37] absolute left-3.5 top-3" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  required
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full bg-[#161616] border border-[#d4af37]/40 rounded-2xl pl-10 pr-4 py-2.5 text-white font-mono tracking-widest focus:outline-none focus:border-[#d4af37] text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-white text-black font-agrandir-extrabold uppercase tracking-widest text-xs hover:bg-[#eaeaea] rounded-full transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-lg disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="animate-pulse">Vérification en cours...</span>
            ) : (
              <>
                <span>
                  {mode === 'login'
                    ? 'SE CONNECTER'
                    : mode === 'register'
                    ? 'CONFIRMER L’INSCRIPTION'
                    : 'VALIDER LE NOUVEAU MOT DE PASSE'}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Bascule Mode Connexion / Inscription */}
        <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#888]">
          <span>
            {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="text-white hover:text-[#d4af37] underline uppercase tracking-wider font-agrandir-semibold cursor-pointer transition-colors"
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </div>

        {/* Badge de réassurance */}
        <div className="mt-4 text-center text-[10px] text-[#555] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-[#777]" />
          <span>AUTHENTIFICATION CHIFFRÉE &amp; SÉCURISÉE</span>
        </div>

      </div>
    </div>
  );
};
