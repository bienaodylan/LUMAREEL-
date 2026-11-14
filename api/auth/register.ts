import type { VercelRequest, VercelResponse } from '@vercel/node';
import { publicDb, methodNotAllowed } from '../_lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return methodNotAllowed(res, ['POST']);

  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').normalize('NFKC').replace(/\s+/gu, ' ').trim();
    const password = String(req.body?.password || '');
    const letters = name.match(/\p{L}/gu) || [];
    const words = name.split(/\s+/u).filter(Boolean);
    const compactName = name.replace(/[\s.'’_-]/gu, '').toLocaleLowerCase();
    const repeatedCharacterName = compactName.length >= 2 && new Set(Array.from(compactName)).size === 1;
    const repeatedSingleLetterName = words.length >= 2 &&
      words.every((word) => Array.from(word).length === 1 && word.toLocaleLowerCase() === words[0].toLocaleLowerCase());

    if (
      !email ||
      email.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) ||
      !name ||
      name.length > 120 ||
      letters.length < 2 ||
      repeatedCharacterName ||
      repeatedSingleLetterName ||
      password.length < 10 ||
      password.length > 200
    ) {
      return res.status(400).json({
        success: false,
        error: 'Nom complet crédible, e-mail valide et mot de passe de 10 caractères minimum requis.',
      });
    }

    try {
      const db = publicDb();
      const { data, error } = await db.auth.signUp({ email, password, options: { data: { name } } });
      if (error) return res.status(400).json({ success: false, error: error.message });
      if (!data.user) return res.status(500).json({ success: false, error: 'Inscription impossible.' });
      return res.status(201).json({
        success: true,
        user: {
          id: data.user.id,
          email,
          name,
          // A public signup always starts with the least-privileged role.
          role: 'customer',
          emailVerified: Boolean(data.user.email_confirmed_at),
          createdAt: data.user.created_at,
        },
        session: data.session,
        requiresEmailConfirmation: !data.session,
      });
    } catch (dbErr: any) {
      return res.status(500).json({ success: false, error: dbErr?.message || 'Configuration Supabase indisponible.' });
    }
  } catch (e: any) {
    console.error('[auth/register]', e);
    return res.status(500).json({ success: false, error: 'Inscription indisponible.' });
  }
}