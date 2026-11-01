import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers so AI Studio preview and Vercel domains can sync seamlessly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
    const event = req.body;
    if (!event || !event.id) {
      return res.status(400).json({ success: false, error: 'Données d’événement invalides.' });
    }

    try {
      if (supabase) {
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
        await supabase.from('events').upsert(dbRow, { onConflict: 'id' });
      }
    } catch (e) {
      console.warn('Supabase upsert failed in /api/events:', e);
    }

    return res.status(200).json({ success: true, event });
  }

  return res.status(405).json({ success: false, error: 'Méthode non autorisée.' });
}
