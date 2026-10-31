import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Stockage durable des designs (billets, affiches…) dans Supabase Storage.
 * Les fichiers restent après actualisation ET après chaque redéploiement Vercel,
 * contrairement à l'ancien dossier public/uploads (disque temporaire).
 */
export const DESIGN_BUCKET = 'designs';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) {
    throw new Error(
      'Supabase non configuré : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables d’environnement Vercel.'
    );
  }
  client = createClient(url, key);
  return client;
}

/** Envoie un fichier dans le bucket et renvoie son URL publique permanente. */
export async function uploadDesign(file: File, folder = 'tickets'): Promise<string> {
  const supabase = getClient();
  const dot = file.name.lastIndexOf('.');
  const ext = (dot >= 0 ? file.name.slice(dot + 1) : 'png').toLowerCase();
  const base = (dot >= 0 ? file.name.slice(0, dot) : file.name)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 60);
  const path = `${folder}/${Date.now()}-${base}.${ext}`;

  const { error } = await supabase.storage.from(DESIGN_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Upload impossible : ${error.message}`);

  return supabase.storage.from(DESIGN_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Convertit une URL (ou chemin) d'image en Data URL, nécessaire pour jsPDF. */
export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Visuel inaccessible (${response.status}).`);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Lecture du visuel impossible.'));
    reader.readAsDataURL(blob);
  });
}
