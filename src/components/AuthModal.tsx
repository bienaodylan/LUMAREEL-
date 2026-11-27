import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';
import { isValidRealEmail } from './CheckoutModal';

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

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, currentUser, setCurrentUser, showToast, checkoutEvent, setCheckoutEvent, language, t } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const popupMonitorRef = useRef<number | null>(null);

  useEffect(() => {
    const onOAuthDone = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'LUMAREEL_SUPABASE_OAUTH_CALLBACK') {
        if (popupMonitorRef.current) {
          window.clearInterval(popupMonitorRef.current);
          popupMonitorRef.current = null;
        }
        setOauthLoading(null);
      }
    };
    window.addEventListener('message', onOAuthDone);
    return () => {
      window.removeEventListener('message', onOAuthDone);
      if (popupMonitorRef.current) {
        window.clearInterval(popupMonitorRef.current);
        popupMonitorRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isAuthModalOpen && currentUser && oauthLoading) {
      if (popupMonitorRef.current) {
        window.clearInterval(popupMonitorRef.current);
        popupMonitorRef.current = null;
      }
      setOauthLoading(null);
      setIsAuthModalOpen(false);
    }
  }, [currentUser, isAuthModalOpen, oauthLoading, setIsAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const isEn = language === 'en';

  const handleOAuthSignIn = async (provider: 'google' | 'apple') => {
    if (isLoading || oauthLoading) return;
    if (!isSupabaseConfigured) {
      showToast(
        isEn
          ? 'Authentication service is temporarily unavailable.'
          : "Le service d'authentification est temporairement indisponible.",
        'error'
      );
      return;
    }

    setOauthLoading(provider);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const isEmbeddedIframe = (() => {
        try {
          return window.self !== window.top;
        } catch {
          return true;
        }
      })();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true,
          queryParams:
            provider === 'google'
              ? { access_type: 'offline', prompt: 'select_account' }
              : undefined,
        },
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error(
          isEn
            ? `Unable to initiate ${provider === 'google' ? 'Google' : 'Apple'} sign-in.`
            : `Impossible d'initialiser la connexion ${provider === 'google' ? 'Google' : 'Apple'}.`
        );
      }

      if (isEmbeddedIframe) {
        const width = 520;
        const height = 680;
        const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - width) / 2));
        const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - height) / 2));
        const popup = window.open(
          data.url,
          `lumareel_oauth_${provider}`,
          `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
        );

        if (!popup) {
          setOauthLoading(null);
          showToast(
            isEn
              ? 'Popup blocked by your browser. Please allow popups and try again.'
              : 'Fenêtre bloquée par votre navigateur. Autorisez les popups puis réessayez.',
            'error'
          );
          return;
        }

        if (popupMonitorRef.current) window.clearInterval(popupMonitorRef.current);
        popupMonitorRef.current = window.setInterval(() => {
          if (popup.closed) {
            if (popupMonitorRef.current) {
              window.clearInterval(popupMonitorRef.current);
              popupMonitorRef.current = null;
            }
            setOauthLoading((current) => {
              if (current === provider) {
                showToast(
                  isEn ? 'Sign-in cancelled.' : 'Connexion annulée.',
                  'info'
                );
              }
              return null;
            });
          }
        }, 500);
      } else {
        window.location.assign(data.url);
      }
    } catch (err: any) {
      setOauthLoading(null);
      const rawMsg = String(err?.message || '');
      const providerLabel = provider === 'google' ? 'Google' : 'Apple';
      const friendly =
        /provider is not enabled|unsupported provider/i.test(rawMsg)
          ? isEn
            ? `${providerLabel} sign-in is not yet enabled in Supabase Authentication settings.`
            : `La connexion ${providerLabel} n'est pas encore activée dans les réglages Supabase Auth.`
          : rawMsg ||
            (isEn
              ? `${providerLabel} authentication failed.`
              : `Échec de la connexion avec ${providerLabel}.`);
      showToast(friendly, 'error');
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
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin + '/',
        });
        if (error) throw error;
      }
      showToast(t('auth.resetSent'), 'success');
    } catch (err: any) {
      showToast(err.message || t('auth.resetErr'), 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isValidFullName = (value: string) => {
    const cleaned = value.trim().replace(/\s+/g, ' ');
    if (cleaned.length < 3 || cleaned.length > 80 || cleaned.split(' ').length < 2) return false;
    return cleaned.split(' ').every((part) => /^[\p{L}\p{M}][\p{L}\p{M}'’-]{1,39}$/u.test(part) && !/(.)\1{3,}/i.test(part));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !isValidRealEmail(cleanEmail)) {
      showToast(t('auth.invalidEmail'), 'error');
      return;
    }

    if (!password || password.length < 8) {
      showToast(t('auth.invalidPassword'), 'error');
      return;
    }

    if (mode === 'register' && !isValidFullName(name)) {
      showToast(language === 'en' ? 'Enter your first and last name using valid characters.' : 'Veuillez saisir vos prénom et nom complets avec des caractères valides.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error(language === 'en' ? 'Authentication is temporarily unavailable.' : 'L’authentification est temporairement indisponible.');
      }

      let authenticatedUser: any = null;
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { name: name.trim().replace(/\s+/g, ' ') } },
        });
        if (error) throw error;
        if (!data.user) throw new Error(language === 'en' ? 'Registration failed.' : 'Inscription impossible.');
        if (!data.user.email_confirmed_at || !data.session) {
          showToast(language === 'en'
            ? 'Check your inbox and confirm your email before signing in.'
            : 'Vérifiez votre boîte mail et confirmez votre adresse avant de vous connecter.', 'success');
          setMode('login');
          return;
        }
        authenticatedUser = {
          id: data.user.id,
          email: data.user.email || cleanEmail,
          name: String(data.user.user_metadata?.name || name.trim()),
          role: 'customer',
          emailVerified: true,
          createdAt: data.user.created_at,
        };
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
        if (!data.user || !data.session) throw new Error(language === 'en' ? 'Authentication failed.' : 'Connexion impossible.');
        if (!data.user.email_confirmed_at) {
          await supabase.auth.signOut();
          throw new Error(language === 'en' ? 'Confirm your email before signing in.' : 'Veuillez confirmer votre adresse e-mail avant de vous connecter.');
        }
        const { data: profileByEmail } = await supabase
          .from('users')
          .select('id, name, role')
          .ilike('email', cleanEmail)
          .maybeSingle();
        const profile =
          profileByEmail ||
          (await supabase.from('users').select('id, name, role').eq('id', data.user.id).maybeSingle()).data;
        authenticatedUser = {
          id: profile?.id || data.user.id,
          email: data.user.email || cleanEmail,
          name: String(profile?.name || data.user.user_metadata?.name || cleanEmail.split('@')[0]),
          role: profile?.role || 'customer',
          emailVerified: true,
          createdAt: data.user.created_at,
        };
      }

      setCurrentUser(authenticatedUser);
      setIsAuthModalOpen(false);
      showToast(t('auth.welcome').replace('{name}', authenticatedUser.name), 'success');
      if (checkoutEvent) setCheckoutEvent(checkoutEvent);
    } catch (err: any) {
      showToast(err.message || t('auth.loginFailed'), 'error');
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
          title={t('nav.close')}
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
          <span>{t('auth.kicker')}</span>
          {mode === 'login' && (
            <span className="text-white font-agrandir-bold">{t('auth.secureAccess')}</span>
          )}
        </div>
        <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-2">
          {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
        </h2>
        <p className="text-[#888] text-xs mb-5">
          {mode === 'login' ? t('auth.loginSub') : t('auth.registerSub')}
        </p>

        {/* Authentification Google & Apple (Supabase Auth) */}
        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            disabled={isLoading || Boolean(oauthLoading)}
            onClick={() => handleOAuthSignIn('google')}
            className="w-full min-h-[44px] px-4 rounded-full bg-[#161616] hover:bg-[#1e1e1e] border border-white/15 hover:border-white/30 text-white font-agrandir-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
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
            className="w-full min-h-[44px] px-4 rounded-full bg-[#161616] hover:bg-[#1e1e1e] border border-white/15 hover:border-white/30 text-white font-agrandir-semibold text-xs flex items-center justify-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
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

        <div className="relative flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#666]">
            {isEn ? 'or' : 'ou'}
          </span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Formulaire Authentification */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] text-[#888] uppercase mb-1 font-agrandir-semibold">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.fullNamePlaceholder')}
                  className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-[#888] uppercase mb-1 font-agrandir-semibold">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@domain.com"
                className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-[#888] uppercase font-agrandir-semibold">
                {t('auth.password')}
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="text-[10px] text-[#888] hover:text-white underline cursor-pointer transition-colors"
                >
                  {isResettingPassword ? t('auth.sending') : t('auth.forgot')}
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-white text-black font-agrandir-extrabold uppercase tracking-widest text-xs hover:bg-[#eaeaea] rounded-full transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-lg disabled:opacity-50 active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="animate-pulse">{t('auth.verifying')}</span>
            ) : (
              <>
                <span>{mode === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Bascule Mode Connexion / Inscription */}
        <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#888]">
          <span>
            {mode === 'login' ? t('auth.noAccount') : t('auth.alreadyAccount')}
          </span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            className="text-white hover:text-white underline uppercase tracking-wider font-agrandir-semibold cursor-pointer transition-colors"
          >
            {mode === 'login' ? t('auth.switchRegister') : t('auth.switchLogin')}
          </button>
        </div>

        {/* Badge de réassurance */}
        <div className="mt-4 text-center text-[10px] text-[#555] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-[#777]" />
          <span>{t('auth.secureBadge')}</span>
        </div>

      </div>
    </div>
  );
};
