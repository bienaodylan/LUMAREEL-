/**
 * Stockage durable des designs (billets, affiches…) dans Supabase Storage.
 * Les fichiers restent après actualisation ET après chaque redéploiement Vercel,
 * contrairement à l'ancien dossier public/uploads (disque temporaire).
 */
export const DESIGN_BUCKET = 'designs';

async function getClient() {
  // Client partagé de l'application (prend aussi en compte une configuration saisie dans l'admin).
  const { supabase, isSupabaseConfigured } = await import('../lib/supabaseClient');
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase non configuré : ajoutez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables d’environnement, sinon le visuel ne peut pas être conservé durablement.'
    );
  }
  return supabase;
}

/** Envoie un fichier dans le bucket et renvoie son URL publique permanente. */
export async function uploadDesign(file: File, folder = 'tickets'): Promise<string> {
  const supabase = await getClient();
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
  if (error) {
    throw new Error(
      /bucket.*not found/i.test(error.message)
        ? 'Le dossier de stockage « designs » n’existe pas : exécutez la section 11 de src/lib/supabase-schema.sql dans Supabase.'
        : `Upload impossible : ${error.message}`
    );
  }

  const publicUrl = supabase.storage.from(DESIGN_BUCKET).getPublicUrl(path).data.publicUrl;
  // On ne confirme l'import que si le fichier est réellement relisible depuis son adresse publique.
  try {
    const check = await fetch(publicUrl, { method: 'HEAD', cache: 'no-store' });
    if (!check.ok) throw new Error(String(check.status));
  } catch {
    throw new Error('Le visuel a été envoyé mais son adresse publique n’est pas lisible (le bucket « designs » doit être public).');
  }
  return publicUrl;
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
