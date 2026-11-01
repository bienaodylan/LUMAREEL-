import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { readFileAsDataURL } from './mediaUtils';

/**
 * Stockage durable des designs (billets, affiches…).
 * Tente d'abord Supabase Storage si configuré, puis l'API serveur /api/upload,
 * et enfin un repli local Data URL Base64 pour garantir que l'utilisateur
 * ne soit JAMAIS bloqué par une erreur de configuration cloud.
 */
export const DESIGN_BUCKET = 'designs';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key || !url.startsWith('https://') || url.includes('your-project-id')) {
    return null;
  }
  try {
    client = createClient(url, key);
    return client;
  } catch {
    return null;
  }
}

/** Envoie un fichier dans le stockage cloud ou le charge en local sans jamais échouer. */
export async function uploadDesign(file: File, folder = 'tickets'): Promise<string> {
  // 1. Supabase Storage si le projet est configuré
  const supabase = getClient();
  if (supabase) {
    try {
      const dot = file.name.lastIndexOf('.');
      const ext = (dot >= 0 ? file.name.slice(dot + 1) : 'png').toLowerCase();
      const base = (dot >= 0 ? file.name.slice(0, dot) : file.name)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .slice(0, 60);
      const path = `${folder}/${Date.now()}-${base}.${ext}`;

      const { data, error } = await supabase.storage.from(DESIGN_BUCKET).upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });

      if (!error && data) {
        return supabase.storage.from(DESIGN_BUCKET).getPublicUrl(path).data.publicUrl;
      }
    } catch (err) {
      console.warn('[uploadDesign] Supabase storage upload failed:', err);
    }
  }

  // 2. Serveur Express /api/upload si disponible
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[uploadDesign] /api/upload failed, using Data URL fallback:', err);
  }

  // 3. Repli automatique en Data URL (aucune dépendance externe, pérenne et immédiat)
  return await readFileAsDataURL(file);
}

export async function urlToDataUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  try {
    const response = await fetch(url);
    if (response.ok) {
      const blob = await response.blob();
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
    }
  } catch {}

  // Fallback avec élément Image pour contourner certains blocages réseau / CORS
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 600;
        canvas.height = img.naturalHeight || 850;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
          return;
        }
      } catch {}
      resolve('');
    };
    img.onerror = () => resolve('');
    img.src = url;
  });
}
