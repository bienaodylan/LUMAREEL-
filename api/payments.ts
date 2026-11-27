import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors } from './_lib/supabase';

export default function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res, 'GET, POST, PUT, PATCH, OPTIONS');
  return res.status(200).json({ success: true, message: 'Safe CORS helper works.' });
}
