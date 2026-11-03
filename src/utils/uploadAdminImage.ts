import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

/** Uploads an image to the existing public Supabase Storage bucket and returns its durable URL. */
export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  if (!isSupabaseConfigured) throw new Error('Supabase doit être connecté pour téléverser une image.');
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Formats acceptés par le stockage : PNG, JPG ou WebP.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Image trop volumineuse : limite de 10 Mo.');
  const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-');
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from('designs').upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Stockage image : ${error.message}`);
  const { data } = supabase.storage.from('designs').getPublicUrl(path);
  if (!data?.publicUrl) throw new Error('Supabase n’a pas retourné l’URL publique de l’image.');
  return data.publicUrl;
}
