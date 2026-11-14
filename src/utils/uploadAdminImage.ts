import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { getAuthHeaders } from './authSession';
import { readFileAsDataURL } from './mediaUtils';

/**
 * Téléverse une image d'administration (affiche, portrait, bannière ou design de billet)
 * vers le serveur Express (/api/upload -> public/uploads/*) pour un stockage durable local,
 * avec synchronisation optionnelle vers Supabase Storage si configuré et joignable,
 * ou repli en Data URL Base64.
 */
export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error('Formats acceptés : PNG, JPG, WebP ou GIF.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image trop volumineuse : limite de 15 Mo.');
  }

  // 1. Upload durable sur le serveur Express /api/upload
  try {
    const formData = new FormData();
    formData.append('file', file);
    const headers = await getAuthHeaders();
    const res = await fetch('/api/upload', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data.url) {
        return data.url;
      }
    }
  } catch (err) {
    console.warn('[uploadAdminImage] /api/upload failed:', err);
  }

  // 2. Supabase Storage si activé
  if (isSupabaseConfigured) {
    try {
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-');
      const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from('designs').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type || 'image/png',
        upsert: false,
      });
      if (!error) {
        const { data } = supabase.storage.from('designs').getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch (err) {
      console.warn('[uploadAdminImage] Supabase storage upload skipped:', err);
    }
  }

  // 3. Repli Data URL
  return await readFileAsDataURL(file);
}
