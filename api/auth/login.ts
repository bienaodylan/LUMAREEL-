import type { VercelRequest, VercelResponse } from '@vercel/node';
import { authenticatedUserDb, publicDb, userDbForToken, methodNotAllowed } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.query.__route === 'me') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    const auth = await authenticatedUserDb(req);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    try {
      const { data: profile, error: profileError } = await auth.db
        .from('users')
        .select('name, role, email_verified')
        .eq('id', auth.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('[api/auth/me] profile lookup failed:', profileError.message);
        return res.status(503).json({ success: false, error: 'Profil utilisateur temporairement indisponible.' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: auth.user.id,
          email: auth.user.email || '',
          name: profile?.name || auth.user.user_metadata?.name || auth.user.email?.split('@')[0] || 'Membre',
          role: profile?.email_verified ? (profile.role || 'customer') : 'customer',
          emailVerified: Boolean(auth.user.email_confirmed_at || profile?.email_verified),
          createdAt: auth.user.created_at,
        },
      });
    } catch (error) {
      console.error('[api/auth/me] unexpected error:', error);
      return res.status(503).json({ success: false, error: 'Service d’authentification temporairement indisponible.' });
    }
  }

  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-mail et mot de passe requis.' });
    }

    try {
      const db = publicDb();
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error || !data.user || !data.session?.access_token) {
        return res.status(401).json({ success: false, error: 'E-mail ou mot de passe incorrect.' });
      }

      let accessToken = data.session.access_token;
      let refreshToken = data.session.refresh_token;
      const sessionDb = userDbForToken(accessToken);

      // Password-only AAL1 is insufficient when the account has a verified MFA factor.
      const { data: assurance, error: assuranceError } = await sessionDb.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assuranceError) {
        console.error('[auth/login] MFA assurance lookup failed:', assuranceError.message);
        return res.status(503).json({ success: false, error: 'Vérification de sécurité indisponible.' });
      }

      if (assurance.nextLevel === 'aal2' && assurance.currentLevel !== 'aal2') {
        const { data: factors, error: factorsError } = await sessionDb.auth.mfa.listFactors();
        if (factorsError) {
          console.error('[auth/login] MFA factors lookup failed:', factorsError.message);
          return res.status(503).json({ success: false, error: 'Vérification du second facteur indisponible.' });
        }

        const factor = factors.totp[0] || factors.phone[0];
        if (!factor) {
          return res.status(403).json({ success: false, error: 'Un second facteur est requis mais aucun facteur vérifié n’est disponible.' });
        }

        const totpCode = String(req.body?.totpCode || '').trim();
        if (!totpCode) {
          return res.status(401).json({
            success: false,
            requires2fa: true,
            error: 'Code de vérification à deux facteurs requis.',
          });
        }

        const { data: challenge, error: challengeError } = await sessionDb.auth.mfa.challenge({ factorId: factor.id });
        if (challengeError || !challenge?.id) {
          console.error('[auth/login] MFA challenge failed:', challengeError?.message);
          return res.status(503).json({ success: false, requires2fa: true, error: 'Impossible de lancer la vérification à deux facteurs.' });
        }

        const { data: verified, error: verifyError } = await sessionDb.auth.mfa.verify({
          factorId: factor.id,
          challengeId: challenge.id,
          code: totpCode,
        });
        if (verifyError || !verified?.access_token || !verified?.refresh_token) {
          return res.status(401).json({
            success: false,
            requires2fa: true,
            error: 'Code de vérification incorrect ou expiré.',
          });
        }

        accessToken = verified.access_token;
        refreshToken = verified.refresh_token;
      }

      const authenticatedDb = userDbForToken(accessToken);
      const { data: profile, error: profileError } = await authenticatedDb
        .from('users')
        .select('name,role,email_verified')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) {
        console.error('[auth/login] profile lookup failed:', profileError.message);
        return res.status(503).json({ success: false, error: 'Profil utilisateur temporairement indisponible.' });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email || email,
          name: profile?.name || data.user.user_metadata?.name || email.split('@')[0],
          role: profile?.email_verified ? (profile.role || 'customer') : 'customer',
          emailVerified: Boolean(data.user.email_confirmed_at || profile?.email_verified),
          createdAt: data.user.created_at,
        },
        session: { ...data.session, access_token: accessToken, refresh_token: refreshToken },
      });
    } catch (dbErr: any) {
      return res.status(500).json({ success: false, error: dbErr?.message || 'Configuration Supabase indisponible.' });
    }
  } catch (e: any) {
    console.error('[auth/login]', e);
    return res.status(500).json({
      success: false,
      error: e?.message || 'Erreur interne authentification',
      code: e?.code || e?.name || 'AUTH_INTERNAL',
    });
  }
}