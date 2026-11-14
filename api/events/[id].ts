import type { VercelRequest, VercelResponse } from '@vercel/node';
import { methodNotAllowed, requireRole } from '../_lib/supabase.js';

function getEventId(req: VercelRequest): string | null {
  const value = req.query.id;
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return id.length > 0 && id.length <= 128 ? id : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return methodNotAllowed(res, ['PUT', 'DELETE']);
  }

  const id = getEventId(req);
  if (!id) return res.status(400).json({ success: false, error: 'Identifiant d’événement invalide.' });

  const auth = await requireRole(req, ['super_admin']);
  if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });

  try {
    if (req.method === 'DELETE') {
      const { error } = await auth.db.from('events').delete().eq('id', id);
      if (error) {
        console.error('[api/events/:id] delete failed:', error.message);
        return res.status(500).json({ success: false, error: 'Suppression de l’événement impossible.' });
      }
      return res.status(200).json({ success: true, id });
    }

    const event = req.body;
    if (!event || typeof event !== 'object' || Array.isArray(event)) {
      return res.status(400).json({ success: false, error: 'Données d’événement invalides.' });
    }

    const title = typeof event.title === 'string' ? event.title.trim() : '';
    const artist = typeof event.artist === 'string' ? event.artist.trim() : '';
    const slug = typeof event.slug === 'string' ? event.slug.trim() : '';
    if (!title || !artist || !slug || !event.date || !event.venue) {
      return res.status(400).json({ success: false, error: 'Titre, artiste, slug, date et lieu sont obligatoires.' });
    }

    const dbRow = {
      id, slug, title,
      subtitle: typeof event.subtitle === 'string' ? event.subtitle : '',
      artist, date: event.date, time: event.time || '',
      doors_open: event.doorsOpen || '', venue: event.venue,
      city: event.city || '', country: event.country || '',
      address: event.address || '', description: event.description || '',
      artist_portrait: event.artistPortrait || '',
      official_poster: event.officialPoster || '',
      banner_image: event.bannerImage || '',
      cover_image: event.coverImage || '',
      status: event.status || 'draft',
      is_featured: Boolean(event.isFeatured),
      organizer_type: event.organizerType || 'lumareel',
      organizer_name: event.organizerName || 'LUMARÉEL CO.',
      organizer_id: event.organizerId || null,
      genre: event.genre || 'Concert Live',
      platform_fee_percent: Number(event.platformFeePercent || 0),
      infoline: event.infoline || '',
      categories: Array.isArray(event.categories) ? event.categories : [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await auth.db.from('events').upsert(dbRow, { onConflict: 'id' });
    if (error) {
      console.error('[api/events/:id] update failed:', error.message);
      return res.status(500).json({ success: false, error: 'Enregistrement de l’événement impossible.' });
    }
    return res.status(200).json({ success: true, event: { ...event, id } });
  } catch (error) {
    console.error('[api/events/:id] unexpected error:', error);
    return res.status(500).json({ success: false, error: 'Service événements temporairement indisponible.' });
  }
}
