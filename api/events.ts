import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { methodNotAllowed, publicDb, requireRole } from './_lib/supabase.js';


import { INITIAL_ARCHIVES } from '../src/data/initialData.ts';

const publicSettingsDefaults = {
  platformName: 'LUMARÉEL', tagline: 'CO.', logoMonogram: 'LR',
  logoUrl: '/assets/logo-lumareel.png', currency: 'FCFA',
  infoline: '+225 01 53 508 210',
  socialLinks: { tiktok: 'https://www.tiktok.com/@lumareelco', instagram: 'https://www.instagram.com/lumareelco/', snapchat: 'https://www.snapchat.com/add/lumareelco', youtube: '', facebook: '' },
};

function mapArchiveRow(row: any) {
  return {
    id: row.id, title: row.title, year: row.year, date: row.date || '',
    city: row.city, country: row.country, venue: row.venue,
    artists: Array.isArray(row.artists) ? row.artists : [],
    coverImage: row.cover_image || row.coverImage || '',
    description: row.description || '', youtubeUrl: row.youtube_url || row.youtubeUrl || '',
    youtubeEmbedUrl: row.youtube_embed_url || row.youtubeEmbedUrl || '',
    duration: row.duration || 'Live HD', photos: Array.isArray(row.photos) ? row.photos : [],
    isPublished: Boolean(row.is_published ?? row.isPublished ?? true),
    orderIndex: row.order_index ?? row.orderIndex ?? 1,
  };
}

const fallbackEvents = [
  {
    id: 'evt_jeune_lion',
    slug: 'jeune-lion-en-concert',
    title: 'JEUNE LION EN CONCERT',
    subtitle: 'La grande messe scénique d’Abidjan · Esplanade Palais de la Culture',
    artist: 'JEUNE LION',
    date: '2026-12-19',
    time: '15:00',
    doorsOpen: '13:30',
    venue: 'Esplanade du Palais de la Culture',
    city: 'Abidjan',
    country: 'Côte d’Ivoire',
    address: 'Palais de la Culture Bernard Binlin-Dadié, Treichville, Abidjan',
    description: 'Une communion scénique monumentale. Jeune Lion investit l’Esplanade du Palais de la Culture avec une direction artistique et une scénographie d’ombres et de faisceaux d’exception.',
    artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_15.46.36__3__e428cb5c.jpeg',
    officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
    bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31__2__4a5b834d.jpeg',
    status: 'published',
    isFeatured: true,
    organizerType: 'lumareel',
    organizerName: 'LUMARÉEL CO.',
    genre: 'Concert Live',
    platformFeePercent: 0,
    infoline: '+225 07 03 847 316 / +225 05 05 227 122',
    categories: [
      {
        id: 'cat_jl_gp',
        name: 'PASS GP',
        price: 10000,
        currency: 'FCFA',
        quota: 3500,
        sold: 0,
        description: 'Accès Fosse Générale Esplanade plein-pied au pied de la scène.',
        perks: ['Entrée Fosse GP', 'Accès buvettes & stands'],
      },
      {
        id: 'cat_jl_vip',
        name: 'PASS VIP',
        price: 20000,
        currency: 'FCFA',
        quota: 1000,
        sold: 0,
        description: 'Emplacement privilégié surélevé, vue panoramique et acoustique renforcée.',
        perks: ['Entrée prioritaire VIP', 'Vue centrale surélevée', 'Badge collector'],
      },
      {
        id: 'cat_jl_vvip',
        name: 'PASS VVIP',
        price: 40000,
        currency: 'FCFA',
        quota: 300,
        sold: 0,
        description: 'Salon prestige privatif, cocktail dînatoire & coupe-file officiel.',
        perks: ['Accès salon VIP', 'Cocktail prestige', 'Place premier rang', 'Hôte dédié'],
      },
    ],
  },
  {
    id: 'evt_nocturne_v',
    slug: 'nocturne-v-anomalie-acoustique',
    title: 'NOCTURNE V : ANOMALIE ACOUSTIQUE',
    subtitle: 'Création originale scénique immersive · Parc des Expositions Abidjan',
    artist: 'NOCTURNE V',
    date: '2026-11-14',
    time: '20:30',
    doorsOpen: '19:00',
    venue: 'Parc des Expositions',
    city: 'Abidjan',
    country: 'Côte d’Ivoire',
    address: 'Route de l’Aéroport, Port-Bouët, Abidjan',
    description: 'Une installation sonore et lumineuse à 360 degrés conçue par LUMARÉEL CO.',
    artistPortrait: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg',
    officialPoster: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg',
    bannerImage: '/assets/aistudio/WhatsApp_Image_2026-10-28_at_16.54.31_ef0db41e.jpeg',
    status: 'published',
    isFeatured: true,
    organizerType: 'lumareel',
    organizerName: 'LUMARÉEL CO.',
    genre: 'Concert Live',
    platformFeePercent: 0,
    infoline: '+225 01 53 508 210',
    categories: [
      {
        id: 'cat_noc_standard',
        name: 'EXPÉRIENCE STANDARD',
        price: 15000,
        currency: 'FCFA',
        quota: 2500,
        sold: 0,
        description: 'Accès arène centrale 360°',
        perks: ['Immersion acoustique', 'Bracelet lumineux connecté'],
      },
      {
        id: 'cat_noc_spatial',
        name: 'PASSERELLE SPATIALE VIP',
        price: 35000,
        currency: 'FCFA',
        quota: 500,
        sold: 0,
        description: 'Zone surélevée acoustique haute définition',
        perks: ['Casque spatialisé individuel', 'Bar dédié'],
      },
    ],
  },
];

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // This API is same-origin with the Vercel-hosted frontend. Do not enable
  // wildcard cross-origin access to authenticated administrative operations.
  res.setHeader('Vary', 'Origin');
  res.setHeader('Cache-Control', 'no-store');

  const route = typeof req.query.__route === 'string' ? req.query.__route : '';

  if (route === 'settings') {
    if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
    try {
      const db = publicDb();
      const { data, error } = await db.from('platform_settings')
        .select('platform_name, tagline, logo_monogram, logo_url, currency, infoline, social_links')
        .eq('id', 1).maybeSingle();
      if (error) {
        console.warn('[api/settings] read unavailable:', error.message);
        return res.status(200).json({ success: true, settings: publicSettingsDefaults });
      }
      return res.status(200).json({ success: true, settings: data ? {
        platformName: data.platform_name || publicSettingsDefaults.platformName,
        tagline: data.tagline || publicSettingsDefaults.tagline,
        logoMonogram: data.logo_monogram || publicSettingsDefaults.logoMonogram,
        logoUrl: data.logo_url || publicSettingsDefaults.logoUrl,
        currency: data.currency || publicSettingsDefaults.currency,
        infoline: data.infoline || publicSettingsDefaults.infoline,
        socialLinks: data.social_links || publicSettingsDefaults.socialLinks,
      } : publicSettingsDefaults });
    } catch (error) {
      console.warn('[api/settings] Supabase unavailable:', error);
      return res.status(200).json({ success: true, settings: publicSettingsDefaults });
    }
  }

  if (route === 'admin-settings') {
    if (req.method !== 'PUT') return methodNotAllowed(res, ['PUT']);
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const input = req.body;
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).json({ success: false, error: 'Paramètres invalides.' });
    }
    const textValue = (value: unknown, fallback = '') => typeof value === 'string' ? value.trim().slice(0, 500) : fallback;
    const row = {
      id: 1, platform_name: textValue(input.platformName, 'LUMARÉEL'),
      tagline: textValue(input.tagline, 'CO.'), logo_monogram: textValue(input.logoMonogram, 'LR').slice(0, 12),
      logo_url: textValue(input.logoUrl, '/assets/logo-lumareel.png'),
      currency: textValue(input.currency, 'FCFA').slice(0, 12),
      infoline: textValue(input.infoline, '+225 01 53 508 210'),
      social_links: input.socialLinks && typeof input.socialLinks === 'object' && !Array.isArray(input.socialLinks) ? input.socialLinks : {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await auth.db.from('platform_settings').upsert(row, { onConflict: 'id' });
    if (error) {
      console.error('[api/admin/settings] update failed:', error.message);
      return res.status(500).json({ success: false, error: 'Enregistrement des paramètres impossible.' });
    }
    return res.status(200).json({ success: true, settings: {
      platformName: row.platform_name, tagline: row.tagline, logoMonogram: row.logo_monogram,
      logoUrl: row.logo_url, currency: row.currency, infoline: row.infoline, socialLinks: row.social_links,
    } });
  }

  if (route === 'archives') {
    if (req.method === 'GET') {
      try {
        const db = publicDb();
        const { data, error } = await db.from('archives').select('*').order('order_index', { ascending: true });
        if (error) {
          console.warn('[api/archives] read failed:', error.message);
          return res.status(200).json({ success: true, archives: INITIAL_ARCHIVES, source: 'fallback' });
        }
        return res.status(200).json({ success: true, archives: (data || []).map(mapArchiveRow) });
      } catch (error) {
        console.warn('[api/archives] Supabase unavailable:', error);
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
        id, title, year: String(archive.year || '2026'), date: String(archive.date || ''),
        city: String(archive.city || ''), country: String(archive.country || ''),
        venue: String(archive.venue || ''), artists: Array.isArray(archive.artists) ? archive.artists : [],
        cover_image: coverImage, description: String(archive.description || ''),
        youtube_url: String(archive.youtubeUrl || ''), youtube_embed_url: String(archive.youtubeEmbedUrl || ''),
        duration: String(archive.duration || 'Live HD'), photos: Array.isArray(archive.photos) ? archive.photos : [],
        is_published: archive.isPublished !== false,
        order_index: Number.isFinite(Number(archive.orderIndex)) ? Number(archive.orderIndex) : 1,
        updated_at: new Date().toISOString(),
      };
      const { error } = await auth.db.from('archives').upsert(row, { onConflict: 'id' });
      if (error) {
        console.error('[api/archives] write failed:', error.message);
        return res.status(500).json({ success: false, error: 'Enregistrement de l’archive impossible.' });
      }
      return res.status(200).json({ success: true, archive: mapArchiveRow(row) });
    }
    return methodNotAllowed(res, ['GET', 'POST']);
  }

  if (route === 'archive-item') {
    if (req.method !== 'DELETE') return methodNotAllowed(res, ['DELETE']);
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!id || id.length > 128) return res.status(400).json({ success: false, error: 'Identifiant d’archive invalide.' });
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    const { error } = await auth.db.from('archives').delete().eq('id', id);
    if (error) {
      console.error('[api/archives/:id] delete failed:', error.message);
      return res.status(500).json({ success: false, error: 'Suppression de l’archive impossible.' });
    }
    return res.status(200).json({ success: true, id });
  }

  const itemId = typeof req.query.id === 'string' ? req.query.id.trim() : '';
  if (itemId && (req.method === 'PUT' || req.method === 'DELETE')) {
    if (itemId.length > 128) return res.status(400).json({ success: false, error: 'Identifiant d’événement invalide.' });
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({ success: false, error: auth.error });
    if (req.method === 'DELETE') {
      const { error } = await auth.db.from('events').delete().eq('id', itemId);
      if (error) return res.status(500).json({ success: false, error: 'Suppression de l’événement impossible.' });
      return res.status(200).json({ success: true, id: itemId });
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
      id: itemId, slug, title, subtitle: typeof event.subtitle === 'string' ? event.subtitle : '',
      artist, date: event.date, time: event.time || '', doors_open: event.doorsOpen || '',
      venue: event.venue, city: event.city || '', country: event.country || '',
      address: event.address || '', description: event.description || '',
      artist_portrait: event.artistPortrait || '', official_poster: event.officialPoster || '',
      banner_image: event.bannerImage || '', cover_image: event.coverImage || '',
      status: event.status || 'draft', is_featured: Boolean(event.isFeatured),
      organizer_type: event.organizerType || 'lumareel', organizer_name: event.organizerName || 'LUMARÉEL CO.',
      organizer_id: event.organizerId || null, genre: event.genre || 'Concert Live',
      platform_fee_percent: Number(event.platformFeePercent || 0), infoline: event.infoline || '',
      categories: Array.isArray(event.categories) ? event.categories : [], updated_at: new Date().toISOString(),
    };
    const { error } = await auth.db.from('events').upsert(dbRow, { onConflict: 'id' });
    if (error) return res.status(500).json({ success: false, error: 'Enregistrement de l’événement impossible.' });
    return res.status(200).json({ success: true, event: { ...event, id: itemId } });
  }

  const supabase = getSupabase();

  if (req.method === 'GET') {
    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('date', { ascending: true });

        if (!error && data && data.length > 0) {
          const events = data.map((row: any) => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            subtitle: row.subtitle || '',
            artist: row.artist,
            date: row.date,
            time: row.time,
            doorsOpen: row.doors_open || row.doorsOpen || '',
            venue: row.venue,
            city: row.city,
            country: row.country,
            address: row.address || '',
            description: row.description || '',
            artistPortrait: row.artist_portrait || row.artistPortrait || '',
            officialPoster: row.official_poster || row.officialPoster || '',
            bannerImage: row.banner_image || row.bannerImage || '',
            coverImage: row.cover_image || row.coverImage || '',
            status: row.status || 'published',
            isFeatured: Boolean(row.is_featured ?? row.isFeatured),
            organizerType: row.organizer_type || row.organizerType || 'lumareel',
            organizerName: row.organizer_name || row.organizerName || 'LUMARÉEL CO.',
            genre: row.genre || 'Concert Live',
            platformFeePercent: row.platform_fee_percent ? Number(row.platform_fee_percent) : 0,
            infoline: row.infoline || '+225 01 53 508 210',
            categories: Array.isArray(row.categories) ? row.categories : [],
          }));
          return res.status(200).json({ success: true, events });
        }
      }
    } catch (e) {
      console.warn('Supabase fetch failed in /api/events:', e);
    }
    return res.status(200).json({ success: true, events: fallbackEvents });
  }

  if (req.method === 'POST' || req.method === 'PUT') {
    const auth = await requireRole(req, ['super_admin']);
    if (!auth.ok) return res.status(auth.status).json({success:false,error:auth.error});
    const event = req.body;
    if (!event || !event.id) {
      return res.status(400).json({ success: false, error: 'Données d’événement invalides.' });
    }

    try {
      if (auth.db) {
        const dbRow = {
          id: event.id,
          slug: event.slug,
          title: event.title,
          subtitle: event.subtitle || '',
          artist: event.artist,
          date: event.date,
          time: event.time,
          doors_open: event.doorsOpen,
          venue: event.venue,
          city: event.city,
          country: event.country,
          address: event.address || '',
          description: event.description || '',
          artist_portrait: event.artistPortrait || '',
          official_poster: event.officialPoster || '',
          banner_image: event.bannerImage || '',
          cover_image: event.coverImage || '',
          status: event.status,
          is_featured: event.isFeatured,
          organizer_type: event.organizerType,
          organizer_name: event.organizerName,
          genre: event.genre,
          platform_fee_percent: event.platformFeePercent || 0,
          infoline: event.infoline || '+225 01 53 508 210',
          categories: event.categories || [],
          updated_at: new Date().toISOString(),
        };
        const { error } = await auth.db.from('events').upsert(dbRow, { onConflict: 'id' });
        if (error) {
          console.error('[api/events] event upsert failed:', error.message);
          return res.status(500).json({ success: false, error: 'Enregistrement de l’événement impossible.' });
        }
      } else {
        return res.status(503).json({ success: false, error: 'Base de données indisponible.' });
      }
    } catch (e) {
      console.error('[api/events] Supabase upsert failed:', e);
      return res.status(500).json({ success: false, error: 'Enregistrement de l’événement impossible.' });
    }

    return res.status(200).json({ success: true, event });
  }

  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}
