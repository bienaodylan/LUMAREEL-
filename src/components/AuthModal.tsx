import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { isValidRealEmail } from './CheckoutModal';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';

const LOCAL_ACCOUNTS_KEY = 'lumareel_effective_accounts_v1';

interface LocalAccountRecord {
  id: string;
  email: string;
  name: string;
  password: string;
  provider?: 'email' | 'google' | 'apple';
  createdAt: string;
}

function loadLocalAccounts(): LocalAccountRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalAccount(account: LocalAccountRecord): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadLocalAccounts().filter(
      (a) => a.email.toLowerCase() !== account.email.toLowerCase()
    );
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify([account, ...existing]));
  } catch {
    // ignore storage errors
  }
}

function findLocalAccount(email: string): LocalAccountRecord | undefined {
  const clean = email.trim().toLowerCase();
  return loadLocalAccounts().find((a) => a.email.toLowerCase() === clean);
}

function buildEffectiveUser(params: {
  id?: string;
  email: string;
  name: string;
  role?: User['role'];
  createdAt?: string;
}): User {
  const cleanEmail = params.email.trim().toLowerCase();
  const isSuperAdmin = cleanEmail === 'bienaodylan428@gmail.com';
  return {
    id: params.id || `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    email: cleanEmail,
    name: params.name.trim() || cleanEmail.split('@')[0] || 'Membre LUMARÉEL',
    role: isSuperAdmin ? 'super_admin' : params.role || 'customer',
    emailVerified: true,
    createdAt: params.createdAt || new Date().toISOString(),
  };
}

const GoogleLogo: React.FC = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3.01h3.88c2.27-2.09 3.54-5.17 3.54-8.88z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3.01c-1.08.72-2.45 1.16-4.06 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.11A12 12 0 0 0 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.28 14.28A7.22 7.22 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.29A12 12 0 0 0 0 12c0 1.94.46 3.77 1.29 5.39l3.99-3.11z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l3.99 3.11c.95-2.85 3.6-4.97 6.72-4.97z"
    />
  </svg>
);

const AppleLogo: React.FC = () => (
  <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.09-2.383 1.37-2.383 4.19 0 3.26 2.854 4.42 2.955 4.45z" />
  </svg>
);

/**
 * Page pleine écran d'inscription & connexion LUMARÉEL (remplace l'ancienne fenêtre modale).
 * Fonctionne en mode effectif avec Supabase et bascule proprement en compte actif si la
 * confirmation e-mail ou le fournisseur OAuth n'est pas encore activé côté serveur.
 */
export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    currentUser,
    setCurrentUser,
    showToast,
    checkoutEvent,
    setCheckoutEvent,
    platformSettings,
    language,
    t,
  } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [socialConfirmProvider, setSocialConfirmProvider] = useState<'google' | 'apple' | null>(null);
  const [socialName, setSocialName] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen || typeof document === 'undefined') return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const isEn = language === 'en';
  const logoSrc = platformSettings?.logoUrl || '/assets/logo-lumareel.png';

  const completeUserLogin = (authenticatedUser: User) => {
    setCurrentUser(authenticatedUser);
    setSocialConfirmProvider(null);
    setOauthLoading(null);
    setIsAuthModalOpen(false);
    showToast(t('auth.welcome').replace('{name}', authenticatedUser.name), 'success');
    if (checkoutEvent) setCheckoutEvent(checkoutEvent);
  };

  const openInlineSocialFlow = (provider: 'google' | 'apple') => {
    setOauthLoading(null);
    setSocialConfirmProvider(provider);
    setSocialName(name.trim() || (provider === 'google' ? 'Membre Google' : 'Membre Apple'));
    setSocialEmail(
      email.trim().toLowerCase() ||
        (provider === 'google' ? 'membre.lumareel@gmail.com' : 'membre.lumareel@icloud.com')
    );
  };

  const handleConfirmSocialEffective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialConfirmProvider) return;
    await handleOAuthSignIn(socialConfirmProvider);
  };

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    if (isLoading || oauthLoading) return;
    setOauthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.href },
      });
      if (error) throw error;
    } catch (err: any) {
      setOauthLoading(null);
      showToast(err?.message || (isEn ? 'Social sign-in is unavailable.' : 'La connexion sociale est indisponible.'), 'error');
    }
  };

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !isValidRealEmail(cleanEmail)) {
      showToast(t('auth.invalidEmailReset'), 'error');
      return;
    }

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showToast(t('auth.resetSent'), 'success');
    } catch (err: any) {
      showToast(err?.message || t('auth.loginFailed'), 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isValidNameInput = (value: string) => {
    const cleaned = value.trim().replace(/\s+/g, ' ');
    return cleaned.length >= 2 && cleaned.length <= 80;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim().replace(/\s+/g, ' ');

    if (!cleanEmail || !isValidRealEmail(cleanEmail)) {
      showToast(t('auth.invalidEmail'), 'error');
      return;
    }

    if (!password || password.length < 6) {
      showToast(
        isEn
          ? 'Password must contain at least 6 characters.'
          : 'Le mot de passe doit contenir au moins 6 caractères.',
        'error'
      );
      return;
    }

    if (mode === 'register' && !isValidNameInput(cleanName)) {
      showToast(
        isEn ? 'Please enter your full name.' : 'Veuillez saisir votre nom complet.',
        'error'
      );
      return;
    }

    setIsLoading(true);
    try {
      let authUser: any = null;
      let authSession: any = null;

      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { name: cleanName, referral_code: new URLSearchParams(window.location.search).get('ref') || null },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        authUser = data.user;
        authSession = data.session;
        if (!authSession) {
          setIsAuthModalOpen(false);
          showToast(
            isEn
              ? 'Account created. Check your email to confirm your address, then sign in.'
              : 'Compte créé. Vérifiez votre e-mail pour confirmer votre adresse, puis connectez-vous.',
            'success'
          );
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        authUser = data.user;
        authSession = data.session;
      }

      if (!authUser?.id || !authSession) {
        throw new Error(isEn ? 'Authentication could not be confirmed.' : 'La connexion n’a pas pu être confirmée.');
      }

      const resolvedEmail = (authUser.email || cleanEmail).toLowerCase();
      const resolvedName = String(authUser.user_metadata?.name || cleanName || resolvedEmail.split('@')[0]);
      const authenticatedUser = buildEffectiveUser({
        id: authUser.id,
        email: resolvedEmail,
        name: resolvedName,
        createdAt: authUser.created_at,
      });

      const referralCode = new URLSearchParams(window.location.search).get('ref');
      if (referralCode) {
        const { error: referralError } = await supabase.rpc('club_apply_referral_code', {
          p_code: referralCode,
        });
        if (referralError && !referralError.message.includes('REFERRAL_ALREADY_APPLIED')) {
          console.info('[Club referral]', referralError.message);
        }
        const url = new URL(window.location.href);
        url.searchParams.delete('ref');
        window.history.replaceState(window.history.state, '', url.toString());
      }

      completeUserLogin(authenticatedUser);
    } catch (err: any) {
      showToast(err?.message || t('auth.loginFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white overflow-y-auto flex flex-col font-agrandir-regular">
      {/* En-tête pleine page avec Retour + Logo */}
      <header
        className="sticky top-0 z-20 bg-black/95 backdrop-blur-xl border-b border-white/[0.08]"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="w-full max-w-lg mx-auto px-5 pb-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              if (socialConfirmProvider) {
                setSocialConfirmProvider(null);
              } else {
                setIsAuthModalOpen(false);
              }
            }}
            className="inline-flex items-center gap-2 min-h-[38px] px-3.5 -ml-1 rounded-full bg-[#121212] hover:bg-[#1B1B1B] border border-white/[0.12] text-xs font-agrandir-semibold text-white transition-colors cursor-pointer lum-press"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.7} />
            <span>{isEn ? 'Back' : 'Retour'}</span>
          </button>

          <img
            src={logoSrc}
            alt="LUMARÉEL"
            className="h-5 sm:h-6 w-auto object-contain"
          />

          <div className="w-[74px]" aria-hidden="true" />
        </div>
      </header>

      {/* Corps centré pleine page */}
      <main
        className="flex-1 w-full max-w-md mx-auto px-5 sm:px-6 py-8 sm:py-12 flex flex-col justify-center"
        style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        {socialConfirmProvider ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#121212] border border-white/[0.12] text-[11px] font-agrandir-semibold text-white">
                {socialConfirmProvider === 'google' ? <GoogleLogo /> : <AppleLogo />}
                <span>
                  {socialConfirmProvider === 'google' ? 'Google' : 'Apple'}
                </span>
              </div>
              <h1 className="font-agrandir-extrabold text-2xl sm:text-3xl text-white uppercase tracking-tight">
                {socialConfirmProvider === 'google'
                  ? isEn
                    ? 'Continue with Google'
                    : 'Continuer avec Google'
                  : isEn
                  ? 'Continue with Apple'
                  : 'Continuer avec Apple'}
              </h1>
              <p className="text-xs sm:text-sm text-[#9A9A9A] leading-relaxed">
                {isEn
                  ? 'Confirm the profile details to link to your LUMARÉEL account.'
                  : 'Confirmez le profil à associer à votre espace LUMARÉEL.'}
              </p>
            </div>

            <form onSubmit={handleConfirmSocialEffective} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#9A9A9A]">
                  {t('auth.fullName')}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={socialName}
                    onChange={(e) => setSocialName(e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="w-full min-h-[48px] bg-[#121212] border border-white/[0.14] focus:border-[#D4AF6A] rounded-2xl pl-11 pr-4 text-sm text-white placeholder:text-[#555] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-agrandir-semibold uppercase tracking-[0.16em] text-[#9A9A9A]">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={socialEmail}
                    onChange={(e) => setSocialEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full min-h-[48px] bg-[#121212] border border-white/[0.14] focus:border-[#D4AF6A] rounded-2xl pl-11 pr-4 text-sm text-white placeholder:text-[#555] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full min-h-[50px] rounded-full bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer lum-press"
              >
                <span>
                  {socialConfirmProvider === 'google'
                    ? isEn
                      ? 'Confirm Google sign-in'
                      : 'Valider avec Google'
                    : isEn
                    ? 'Confirm Apple sign-in'
                    : 'Valider avec Apple'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Titre & Bascule Connexion / Inscription */}
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-agrandir-extrabold uppercase tracking-[0.24em] text-[#D4AF6A] mb-1.5">
                  {t('auth.kicker')}
                </p>
                <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-white uppercase tracking-tight leading-none">
                  {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
                </h1>
                <p className="text-xs sm:text-sm text-[#9A9A9A] mt-2 leading-relaxed">
                  {mode === 'login' ? t('auth.loginSub') : t('auth.registerSub')}
                </p>
              </div>

              {/* Onglets Connexion / Inscription */}
              <div className="grid grid-cols-2 p-1 rounded-full bg-[#121212] border border-white/[0.12]">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`min-h-[40px] rounded-full text-xs transition-colors cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'text-[#9A9A9A] hover:text-white font-agrandir-semibold'
                  }`}
                >
                  {isEn ? 'Sign in' : 'Connexion'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`min-h-[40px] rounded-full text-xs transition-colors cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-black font-agrandir-extrabold'
                      : 'text-[#9A9A9A] hover:text-white font-agrandir-semibold'
                  }`}
                >
                  {isEn ? 'Sign up' : 'Inscription'}
                </button>
              </div>
            </div>

            {/* Connexion rapide Google & Apple */}
            <div className="space-y-2.5">
              <button
                type="button"
                disabled={isLoading || Boolean(oauthLoading)}
                onClick={() => handleOAuthSignIn('google')}
                className="w-full min-h-[48px] px-4 rounded-full bg-[#121212] hover:bg-[#1B1B1B] border border-white/[0.14] hover:border-white/30 text-white font-agrandir-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 lum-press"
              >
                <GoogleLogo />
                <span>
                  {oauthLoading === 'google'
                    ? isEn
                      ? 'Connecting with Google…'
                      : 'Connexion avec Google…'
                    : isEn
                    ? 'Continue with Google'
                    : 'Continuer avec Google'}
                </span>
              </button>

              <button
                type="button"
                disabled={isLoading || Boolean(oauthLoading)}
                onClick={() => handleOAuthSignIn('apple')}
                className="w-full min-h-[48px] px-4 rounded-full bg-[#121212] hover:bg-[#1B1B1B] border border-white/[0.14] hover:border-white/30 text-white font-agrandir-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 lum-press"
              >
                <AppleLogo />
                <span>
                  {oauthLoading === 'apple'
                    ? isEn
                      ? 'Connecting with Apple…'
                      : 'Connexion avec Apple…'
                    : isEn
                    ? 'Continue with Apple'
                    : 'Continuer avec Apple'}
                </span>
              </button>
            </div>

            <div className="relative flex items-center gap-3">
              <div className="h-px flex-1 bg-white/[0.10]" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#777]">
                {isEn ? 'or with email' : 'ou par e-mail'}
              </span>
              <div className="h-px flex-1 bg-white/[0.10]" />
            </div>

            {/* Formulaire Email & Mot de passe */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                    {t('auth.fullName')}
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className="w-full min-h-[48px] bg-[#121212] border border-white/[0.14] rounded-2xl pl-11 pr-4 text-white focus:outline-none focus:border-[#D4AF6A] text-sm placeholder:text-[#555] transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                  {t('auth.email')}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full min-h-[48px] bg-[#121212] border border-white/[0.14] rounded-2xl pl-11 pr-4 text-white focus:outline-none focus:border-[#D4AF6A] text-sm placeholder:text-[#555] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                    {t('auth.password')}
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      disabled={isResettingPassword}
                      className="text-[11px] text-[#9A9A9A] hover:text-white underline cursor-pointer transition-colors"
                    >
                      {isResettingPassword ? t('auth.sending') : t('auth.forgot')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full min-h-[48px] bg-[#121212] border border-white/[0.14] rounded-2xl pl-11 pr-4 text-white focus:outline-none focus:border-[#D4AF6A] text-sm placeholder:text-[#555] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full min-h-[52px] bg-[#D4AF6A] hover:bg-[#DFBE7D] text-black font-agrandir-extrabold uppercase tracking-wider text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg disabled:opacity-50 lum-press"
              >
                {isLoading ? (
                  <span className="animate-pulse">{t('auth.verifying')}</span>
                ) : (
                  <>
                    <span>{mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Bascule secondaire */}
            <div className="pt-4 border-t border-white/[0.10] flex items-center justify-between text-xs text-[#9A9A9A]">
              <span>
                {mode === 'login' ? t('auth.noAccount') : t('auth.alreadyAccount')}
              </span>
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-white hover:text-[#D4AF6A] underline uppercase tracking-wider font-agrandir-extrabold text-[11px] cursor-pointer transition-colors"
              >
                {mode === 'login' ? t('auth.switchRegister') : t('auth.switchLogin')}
              </button>
            </div>

            <div className="text-center text-[11px] text-[#666] flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#777]" />
              <span>{t('auth.secureBadge')}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
