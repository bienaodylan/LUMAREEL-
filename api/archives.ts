import type { VercelRequest, VercelResponse } from '@vercel/node';
import { INITIAL_ARCHIVES } from '../src/data/initialData.ts';
import { methodNotAllowed, publicDb, requireRole } from './_lib/supabase.js';

function mapArchive(row: any) {
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    date: row.date || '',
    city: row.city,
    country: row.country,
    venue: row.venue,
    artists: Array.isArray(row.artists) ? row.artists : [],
    coverImage: row.cover_image || row.coverImage || '',
    description: row.description || '',
    youtubeUrl: row.youtube_url || row.youtubeUrl || '',
    youtubeEmbedUrl: row.youtube_embed_url || row.youtubeEmbedUrl || '',
    duration: row.duration || 'Live HD',
    photos: Array.isArray(row.photos) ? row.photos : [],
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    orderIndex: row.order_index ?? row.orderIndex ?? 1,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    try {
      const db = publicDb();
      const { data, error } = await db.from('archives').select('*').order('order_index', { ascending: true });
      if (error) {
        console.error('[api/archives] read failed:', error.message);
        return res.status(200).json({ success: true, archives: INITIAL_ARCHIVES, source: 'fallback' });
      }
      return res.status(200).json({ success: true, archives: (data || []).map(mapArchive) });
    } catch (error) {
      console.warn('[api/archives] Supabase unavailable; serving initial archive data:', error);
      return res.status(200).json({ success: true, archives: INITIAL_ARCHIVES, source: 'fallback' });
    }
  }

  if (req.method === 'POST') {
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

    const archive = req.body;
    if (!archive || typeof archive !== 'object' || Array.isArray(archive)) {
      return res.status(400).json({ success: false, error: 'Données d’archive invalides.' });
    }
    const id = typeof archive.id === 'string' ? archive.id.trim() : '';
    const title = typeof archive.title === 'string' ? archive.title.trim() : '';
    const coverImage = typeof archive.coverImage === 'string' ? archive.coverImage.trim() : '';
    if (!id || id.length > 128 || !title || !coverImage) {
      return res.status(400).json({ success: false, error: 'Identifiant, titre et image de couverture obligatoires.' });
    }

    const row = {
      id, title,
      year: String(archive.year || '2026'),
      date: String(archive.date || ''),
      city: String(archive.city || ''),
      country: String(archive.country || ''),
      venue: String(archive.venue || ''),
      artists: Array.isArray(archive.artists) ? archive.artists : [],
      cover_image: coverImage,
      description: String(archive.description || ''),
      youtube_url: String(archive.youtubeUrl || ''),
      youtube_embed_url: String(archive.youtubeEmbedUrl || ''),
      duration: String(archive.duration || 'Live HD'),
      photos: Array.isArray(archive.photos) ? archive.photos : [],
      is_published: archive.isPublished !== false,
      order_index: Number.isFinite(Number(archive.orderIndex)) ? Number(archive.orderIndex) : 1,
      updated_at: new Date().toISOString(),
    };

    const { error } = await auth.db.from('archives').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[api/archives] write failed:', error.message);
      return res.status(500).json({ success: false, error: 'Enregistrement de l’archive impossible.' });
    }
    return res.status(200).json({ success: true, archive: mapArchive(row) });
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
