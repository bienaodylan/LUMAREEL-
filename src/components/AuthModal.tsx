import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  ArrowRight,
  Gift,
  Lock,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { isValidRealEmail } from './CheckoutModal';
import { User } from '../types';
import { supabase } from '../lib/supabaseClient';
import {
  apiFetchJson,
  captureReferralCodeFromUrl,
  clearStoredPendingReferralCode,
  getStoredPendingReferralCode,
} from '../lib/apiClient';

function buildEffectiveUser(params: {
  id?: string;
  email: string;
  name: string;
  role?: User['role'];
  createdAt?: string;
  emailVerified?: boolean;
}): User {
  const cleanEmail = params.email.trim().toLowerCase();
  const isSuperAdmin = cleanEmail === 'bienaodylan428@gmail.com';
  return {
    id: params.id || '',
    email: cleanEmail,
    name: params.name.trim() || cleanEmail.split('@')[0] || 'Membre LUMARÉEL',
    role: isSuperAdmin ? 'super_admin' : params.role || 'customer',
    emailVerified: Boolean(params.emailVerified),
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

/**
 * Page pleine écran d'inscription & connexion LUMARÉEL.
 * Authentification 100% réelle via Supabase Auth (Email/Mot de passe + Google OAuth).
 * Capture et conserve le code de parrainage (?ref=CODE) y compris lors des redirections Google OAuth.
 */
export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
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
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const captured = captureReferralCodeFromUrl() || getStoredPendingReferralCode();
    if (captured) {
      setReferralCodeInput(captured);
      setMode('register');
    }
    if (typeof document === 'undefined') return;
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
    setOauthLoading(false);
    setIsAuthModalOpen(false);
    showToast(t('auth.welcome').replace('{name}', authenticatedUser.name), 'success');
    if (checkoutEvent) setCheckoutEvent(checkoutEvent);
  };

  const persistReferralBeforeOAuth = () => {
    const clean = referralCodeInput.trim().toUpperCase();
    if (clean.length >= 5) {
      try {
        localStorage.setItem('lumareel_pending_referral_code', clean);
      } catch {
        // ignore storage errors
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (isLoading || oauthLoading) return;
    setOauthLoading(true);
    persistReferralBeforeOAuth();
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const isInIframe = window.self !== window.top;

      if (isInIframe) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            skipBrowserRedirect: true,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (error) throw error;
        if (data?.url) {
          const popup = window.open(data.url, 'lumareel_google_oauth', 'width=520,height=640');
          if (!popup) {
            window.location.href = data.url;
          } else {
            setTimeout(() => setOauthLoading(false), 1800);
          }
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setOauthLoading(false);
      const rawMsg = String(err?.message || '');
      const friendlyMsg = rawMsg.toLowerCase().includes('provider')
        ? isEn
          ? 'Google Sign-In must be enabled in Supabase Authentication → Providers → Google.'
          : 'Active le fournisseur Google dans Supabase (Authentication → Providers → Google) pour finaliser cette connexion.'
        : rawMsg || (isEn ? 'Google sign-in is currently unavailable.' : 'Connexion Google indisponible pour le moment.');
      showToast(friendlyMsg, 'error');
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
    const cleanReferral = referralCodeInput.trim().toUpperCase();

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
        isEn ? 'Please enter your full name.' : 'Écris ton nom complet pour continuer.',
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
            data: {
              name: cleanName,
              full_name: cleanName,
              referral_code: cleanReferral.length >= 5 ? cleanReferral : null,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        authUser = data.user;
        authSession = data.session;
        if (!authSession) {
          if (cleanReferral.length >= 5) persistReferralBeforeOAuth();
          setIsAuthModalOpen(false);
          showToast(
            isEn
              ? 'Account created. Check your email to confirm your address, then sign in.'
              : 'Ton compte est créé ! Vérifie ton e-mail pour confirmer ton adresse, puis connecte-toi.',
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
        throw new Error(
          isEn ? 'Authentication could not be confirmed.' : 'La connexion n’a pas pu être confirmée.'
        );
      }

      const resolvedEmail = (authUser.email || cleanEmail).toLowerCase();
      const resolvedName = String(
        authUser.user_metadata?.full_name ||
          authUser.user_metadata?.name ||
          cleanName ||
          resolvedEmail.split('@')[0]
      );
      const authenticatedUser = buildEffectiveUser({
        id: authUser.id,
        email: resolvedEmail,
        name: resolvedName,
        createdAt: authUser.created_at,
        emailVerified: Boolean(authUser.email_confirmed_at),
      });

      const pendingCode = cleanReferral || getStoredPendingReferralCode() || '';
      if (pendingCode.length >= 5) {
        try {
          await supabase.rpc('club_apply_referral_code', { p_code: pendingCode });
        } catch {
          // ignore if RPC unavailable or already applied
        }
        try {
          await apiFetchJson('/api/member/referrals/apply', {
            method: 'POST',
            body: JSON.stringify({ code: pendingCode }),
          });
        } catch {
          // ignore self-referral or already applied
        }
        clearStoredPendingReferralCode();
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete('ref');
          url.searchParams.delete('referral');
          window.history.replaceState(window.history.state, '', url.toString());
        } catch {
          // ignore
        }
      }

      completeUserLogin(authenticatedUser);
    } catch (err: any) {
      showToast(err?.message || t('auth.loginFailed'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#FBFBFD] text-[#111111] dark:bg-black dark:text-white overflow-y-auto flex flex-col font-agrandir-regular transition-colors duration-200">
      <header
        className="sticky top-0 z-20 bg-[#FBFBFD]/95 dark:bg-black/95 backdrop-blur-xl border-b border-black/[0.08] dark:border-white/[0.08]"
        style={{ paddingTop: 'max(0.85rem, env(safe-area-inset-top, 0px))' }}
      >
        <div className="w-full max-w-lg mx-auto px-5 pb-3.5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(false)}
            className="inline-flex items-center gap-2 min-h-[38px] px-3.5 -ml-1 rounded-full bg-black/[0.05] hover:bg-black/[0.1] dark:bg-[#121212] dark:hover:bg-[#1B1B1B] border border-black/10 dark:border-white/[0.12] text-xs font-agrandir-semibold text-[#111111] dark:text-white transition-colors cursor-pointer lum-press"
          >
            <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.7} />
            <span>{isEn ? 'Back' : 'Retour'}</span>
          </button>

          <img
            src={logoSrc}
            alt="LUMARÉEL"
            className="h-5 sm:h-6 w-auto object-contain invert dark:invert-0"
          />

          <div className="w-[74px]" aria-hidden="true" />
        </div>
      </header>

      <main
        className="flex-1 w-full max-w-md mx-auto px-5 sm:px-6 py-8 sm:py-12 flex flex-col justify-center"
        style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-agrandir-extrabold uppercase tracking-[0.24em] text-black/45 dark:text-white/50 mb-1.5">
                {t('auth.kicker')}
              </p>
              <h1 className="font-agrandir-extrabold text-3xl sm:text-4xl text-[#111111] dark:text-white uppercase tracking-tight leading-none">
                {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-black/55 dark:text-[#9A9A9A] mt-2 leading-relaxed">
                {mode === 'login' ? t('auth.loginSub') : t('auth.registerSub')}
              </p>
            </div>

            <div className="grid grid-cols-2 p-1 rounded-full bg-black/[0.05] dark:bg-[#121212] border border-black/[0.08] dark:border-white/[0.12]">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`min-h-[40px] rounded-full text-xs transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                    : 'text-black/55 hover:text-black dark:text-[#9A9A9A] dark:hover:text-white font-agrandir-semibold'
                }`}
              >
                {isEn ? 'Sign in' : 'Connexion'}
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`min-h-[40px] rounded-full text-xs transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#111111] text-white dark:bg-white dark:text-black font-agrandir-extrabold'
                    : 'text-black/55 hover:text-black dark:text-[#9A9A9A] dark:hover:text-white font-agrandir-semibold'
                }`}
              >
                {isEn ? 'Sign up' : 'Inscription'}
              </button>
            </div>
          </div>

          {/* Connexion réelle Google OAuth via Supabase */}
          <button
            type="button"
            disabled={isLoading || oauthLoading}
            onClick={handleGoogleSignIn}
            className="w-full min-h-[48px] px-4 rounded-full bg-white hover:bg-black/[0.04] dark:bg-[#121212] dark:hover:bg-[#1B1B1B] border border-black/15 dark:border-white/[0.14] text-[#111111] dark:text-white font-agrandir-semibold text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50 lum-press"
          >
            <GoogleLogo />
            <span>
              {oauthLoading
                ? isEn
                  ? 'Connecting with Google…'
                  : 'Connexion avec Google…'
                : isEn
                  ? 'Continue with Google'
                  : 'Continuer avec Google'}
            </span>
          </button>

          <div className="relative flex items-center gap-3">
            <div className="h-px flex-1 bg-black/10 dark:bg-white/[0.10]" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-black/45 dark:text-[#777]">
              {isEn ? 'or with email' : 'ou par e-mail'}
            </span>
            <div className="h-px flex-1 bg-black/10 dark:bg-white/[0.10]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] text-black/55 dark:text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                  {t('auth.fullName')}
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-black/40 dark:text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="w-full min-h-[48px] bg-white dark:bg-[#121212] border border-black/15 dark:border-white/[0.14] rounded-2xl pl-11 pr-4 text-[#111111] dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-sm placeholder:text-black/35 dark:placeholder:text-[#555] transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-[10px] text-black/55 dark:text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-black/40 dark:text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full min-h-[48px] bg-white dark:bg-[#121212] border border-black/15 dark:border-white/[0.14] rounded-2xl pl-11 pr-4 text-[#111111] dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-sm placeholder:text-black/35 dark:placeholder:text-[#555] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] text-black/55 dark:text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                  {t('auth.password')}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isResettingPassword}
                    className="text-[11px] text-black/55 hover:text-black dark:text-[#9A9A9A] dark:hover:text-white underline cursor-pointer transition-colors"
                  >
                    {isResettingPassword ? t('auth.sending') : t('auth.forgot')}
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-black/40 dark:text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full min-h-[48px] bg-white dark:bg-[#121212] border border-black/15 dark:border-white/[0.14] rounded-2xl pl-11 pr-4 text-[#111111] dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-sm placeholder:text-black/35 dark:placeholder:text-[#555] transition-colors"
                />
              </div>
            </div>

            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="block text-[10px] text-black/55 dark:text-[#9A9A9A] uppercase tracking-[0.16em] font-agrandir-semibold">
                  {isEn ? 'Referral code (optional)' : 'Code parrainage (facultatif)'}
                </label>
                <div className="relative">
                  <Gift className="w-4 h-4 text-black/40 dark:text-[#666] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    placeholder="LMR-XXXXXXXX"
                    className="w-full min-h-[48px] bg-white dark:bg-[#121212] border border-black/15 dark:border-white/[0.14] rounded-2xl pl-11 pr-4 text-[#111111] dark:text-white focus:outline-none focus:border-black dark:focus:border-white text-sm font-mono uppercase placeholder:text-black/35 dark:placeholder:text-[#555] transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[52px] bg-[#111111] hover:bg-black/85 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-black font-agrandir-extrabold uppercase tracking-wider text-xs sm:text-sm rounded-full transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-lg disabled:opacity-50 lum-press"
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

          <div className="pt-4 border-t border-black/10 dark:border-white/[0.10] flex items-center justify-between text-xs text-black/55 dark:text-[#9A9A9A]">
            <span>{mode === 'login' ? t('auth.noAccount') : t('auth.alreadyAccount')}</span>
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-[#111111] dark:text-white hover:opacity-75 underline uppercase tracking-wider font-agrandir-extrabold text-[11px] cursor-pointer transition-opacity"
            >
              {mode === 'login' ? t('auth.switchRegister') : t('auth.switchLogin')}
            </button>
          </div>

          <div className="text-center text-[11px] text-black/45 dark:text-[#666] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t('auth.secureBadge')}</span>
          </div>
        </div>
      </main>
    </div>
  );
};
