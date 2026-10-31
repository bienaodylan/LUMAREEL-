import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { X, Lock, Mail, User as UserIcon, ArrowRight, ShieldCheck } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, setIsAuthModalOpen, setCurrentUser, showToast, checkoutEvent, setCheckoutEvent } = useApp();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      showToast('La connexion sécurisée n’est pas configurée. Contactez l’administration.', 'error');
      return;
    }
    if (!email || !password || password.length < 8) {
      showToast('Saisissez un e-mail et un mot de passe de 8 caractères minimum.', 'error');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      showToast('Veuillez saisir votre nom complet.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { name: name.trim() } },
        });
        if (error) throw error;
        if (!data.session) {
          showToast('Compte créé. Vérifiez votre e-mail pour confirmer votre adresse avant de vous connecter.', 'success');
          setMode('login');
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) throw error;
      }

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.email) throw authError || new Error('Session Supabase introuvable.');
      const normalizedEmail = authData.user.email.toLowerCase();
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id,email,name,role,email_verified')
        .eq('email', normalizedEmail)
        .maybeSingle();
      if (profileError) throw profileError;

      let userProfile = profile;
      if (!userProfile) {
        const { data: created, error: createError } = await supabase
          .from('users')
          .insert({
            email: normalizedEmail,
            name: name.trim() || String(authData.user.user_metadata?.name || normalizedEmail),
            role: 'customer',
            email_verified: Boolean(authData.user.email_confirmed_at),
          })
          .select('id,email,name,role,email_verified')
          .single();
        if (createError) throw createError;
        userProfile = created;
      }

      if (!userProfile.email_verified && userProfile.role !== 'customer') {
        await supabase.auth.signOut();
        throw new Error('Le compte administrateur doit être vérifié par la direction.');
      }

      setCurrentUser({
        id: userProfile.id,
        email: userProfile.email,
        name: userProfile.name,
        role: userProfile.role,
      } as any);
      setIsAuthModalOpen(false);
      showToast(`Bienvenue, ${userProfile.name}. Session sécurisée active.`, 'success');
      if (checkoutEvent) setCheckoutEvent(checkoutEvent);
    } catch (err: any) {
      showToast(err.message || 'Erreur d’authentification.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#0f0f0f] border border-white/15 rounded-3xl p-8 text-[#efefef] shadow-2xl font-agrandir-regular text-xs">
        
        <button
          onClick={() => setIsAuthModalOpen(false)}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#777] hover:text-white cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-[10px] tracking-[0.25em] text-[#888] uppercase mb-1">
          LUMARÉEL CO. · IDENTIFICATION
        </div>
        <h2 className="font-agrandir-extrabold text-2xl text-white uppercase tracking-tight mb-2">
          {mode === 'login' ? 'CONNEXION CLIENT' : 'CRÉER UN COMPTE'}
        </h2>
        <p className="text-[#888] text-xs mb-6">
          Accédez à vos billets officiels, historiques d’achats et accès prioritaires aux prochaines ouvertures.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">NOM COMPLET</label>
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
            <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">ADRESSE E-MAIL</label>
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
            <label className="block text-[10px] text-[#777] uppercase mb-1 font-agrandir-semibold">MOT DE PASSE</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#666] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={8}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                className="w-full bg-[#161616] border border-white/15 rounded-2xl pl-10 pr-4 py-2.5 text-white focus:outline-none focus:border-white text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-white text-black font-agrandir-semibold uppercase tracking-widest text-xs hover:bg-[#eaeaea] rounded-full transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer shadow-lg disabled:opacity-50"
          >
            <span>{mode === 'login' ? 'SE CONNECTER' : 'CONFIRMER L’INSCRIPTION'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-5 mt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-[#777]">
          <span>
            {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà inscrit ?'}
          </span>
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-white hover:underline uppercase tracking-wider font-agrandir-semibold cursor-pointer"
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </div>

        <div className="mt-4 text-center text-[10px] text-[#555] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-[#777]" />
          <span>AUTHENTIFICATION CHIFFRÉE &amp; PROTECTION DES DONNÉES</span>
        </div>

      </div>
    </div>
  );
};
