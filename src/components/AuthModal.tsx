import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, setCurrentUser, showToast, checkoutEvent, setCheckoutEvent } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  if (!isAuthModalOpen) return null;

  const handlePasswordReset = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Saisissez votre e-mail ci-dessus pour réinitialiser le mot de passe.', 'error');
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
      showToast('Si ce compte existe, un e-mail de réinitialisation a été envoyé.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Impossible d’envoyer le lien de réinitialisation.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      showToast('Veuillez saisir une adresse e-mail valide.', 'error');
      return;
    }

    if (!password || password.length < 6) {
      showToast('Le mot de passe doit comporter au moins 6 caractères.', 'error');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      showToast('Veuillez renseigner votre nom complet.', 'error');
      return;
    }

    setIsLoading(true);

    try {
      let authenticatedUser: any = null;

      // 1. TENTATIVE AUTH SUPABASE DIRECTE (Si configuré et accessible)
      if (isSupabaseConfigured) {
        try {
          if (mode === 'register') {
            const { data, error } = await supabase.auth.signUp({
              email: cleanEmail,
              password,
              options: { data: { name: name.trim() } },
            });
            if (error) {
              // Si erreur d'inscription Supabase spécifique (ex: utilisateur déjà existant)
              if (/already registered/i.test(error.message)) {
                throw new Error('Un compte existe déjà avec cette adresse e-mail. Veuillez vous connecter.');
              }
              throw error;
            }
            if (data?.user) {
              authenticatedUser = {
                id: data.user.id,
                email: data.user.email || cleanEmail,
                name: name.trim() || cleanEmail.split('@')[0],
                role: cleanEmail === 'bienaodylan428@gmail.com' ? 'super_admin' : 'customer',
                emailVerified: Boolean(data.user.email_confirmed_at),
                createdAt: data.user.created_at,
              };
            }
          } else {
            const { data, error } = await supabase.auth.signInWithPassword({
              email: cleanEmail,
              password,
            });
            if (error) {
              if (/invalid login credentials/i.test(error.message)) {
                // Mauvais identifiants sur Supabase : tester également le serveur local en cas de compte d'administration
                console.warn('[Supabase Auth] Identifiants Supabase non reconnus, vérification serveur local...');
              } else if (/email not confirmed/i.test(error.message)) {
                throw new Error('Veuillez confirmer votre adresse e-mail avant de vous connecter.');
              } else {
                throw error;
              }
            } else if (data?.user) {
              authenticatedUser = {
                id: data.user.id,
                email: data.user.email || cleanEmail,
                name: String(data.user.user_metadata?.name || cleanEmail.split('@')[0]),
                role: cleanEmail === 'bienaodylan428@gmail.com' ? 'super_admin' : 'customer',
                emailVerified: Boolean(data.user.email_confirmed_at),
                createdAt: data.user.created_at,
              };
            }
          }
        } catch (sbErr: any) {
          console.warn('[Supabase Auth warning]', sbErr?.message || sbErr);
          // Si l'erreur est un blocage explicite de confirmation d'e-mail ou utilisateur déjà existant
          if (sbErr?.message && /confirm.*email|already registered/i.test(sbErr.message)) {
            throw sbErr;
          }
        }
      }

      // 2. REPLI TRANSPARENT SUR LE SERVEUR D'AUTHENTIFICATION LOCAL LUMARÉEL
      if (!authenticatedUser) {
        const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            name: name.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success || !data.user) {
          throw new Error(data.error || 'Identifiants ou connexion invalide.');
        }
        authenticatedUser = data.user;
      }

      // 3. ENREGISTREMENT ET ACTIVATION DE LA SESSION
      setCurrentUser(authenticatedUser);
      setIsAuthModalOpen(false);

      const isSuperAdmin = authenticatedUser.role === 'super_admin' || cleanEmail === 'bienaodylan428@gmail.com';
      showToast(
        isSuperAdmin
          ? `Bienvenue, ${authenticatedUser.name}. Espace Direction & Administration activé.`
          : `Bienvenue, ${authenticatedUser.name}. Connexion réussie.`,
        'success'
      );

      if (checkoutEvent) setCheckoutEvent(checkoutEvent);
    } catch (err: any) {
      showToast(err.message || 'Échec de connexion.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillAdminCredentials = () => {
    setEmail('bienaodylan428@gmail.com');
    setPassword('DylanAdmin2026!');
    setMode('login');
    showToast('Identifiants Fondateur pré-remplis.', 'info');
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
          {mode === 'login' ? 'CONNEXION CLIENT & ADMIN' : 'CRÉER UN COMPTE'}
        </h2>
        <p className="text-[#888] text-xs mb-5">
          {mode === 'login'
            ? 'Accédez à vos billets officiels, commandes passées ou à votre console d’administration.'
            : 'Créez votre compte en quelques secondes pour réserver vos places et recevoir vos billets sécurisés.'}
        </p>

        {/* Raccourci Compte Fondateur (Admin) */}
        <div className="mb-5 p-3 rounded-2xl bg-[#141414] border border-[#d4af37]/25 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <KeyRound className="w-4 h-4 text-[#d4af37] shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] text-[#d4af37] font-agrandir-bold uppercase tracking-wider">
                COMPTE ADMIN FONDATEUR
              </div>
              <div className="text-[11px] text-[#aaa] truncate font-mono">
                bienaodylan428@gmail.com
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFillAdminCredentials}
            className="px-2.5 py-1.5 rounded-full bg-[#d4af37]/15 hover:bg-[#d4af37]/30 border border-[#d4af37]/40 text-[10px] font-agrandir-bold text-[#d4af37] hover:text-white transition-all cursor-pointer whitespace-nowrap active:scale-95"
            title="Pré-remplir les identifiants d'administration"
          >
            Remplir
          </button>
        </div>

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

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[10px] text-[#888] uppercase font-agrandir-semibold">
                MOT DE PASSE
              </label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={isResettingPassword}
                  className="text-[10px] text-[#888] hover:text-[#d4af37] underline cursor-pointer transition-colors"
                >
                  {isResettingPassword ? 'Envoi...' : 'Mot de passe oublié ?'}
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
              <span className="animate-pulse">Vérification en cours...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'SE CONNECTER' : 'CONFIRMER L’INSCRIPTION'}</span>
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
