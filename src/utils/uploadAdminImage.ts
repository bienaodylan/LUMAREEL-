import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/avif',
]);

const ALLOWED_VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v|ogg)$/i;

function compressImageToDataUrl(file: File, maxDim = 1600, quality = 0.86): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Impossible de lire le fichier image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => resolve(String(reader.result || ''));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Téléverse une image admin (portrait artiste, couverture, galerie).
 * 1. Tente l'API serveur Express (/api/upload)
 * 2. Tente Supabase Storage (bucket designs) si configuré
 * 3. Repli local compressé DataURL pour garantir un fonctionnement fluide hors-ligne/statique.
 */
export async function uploadAdminImage(file: File, folder: string): Promise<string> {
  const mime = (file.type || '').toLowerCase();
  if (mime && !ALLOWED_IMAGE_TYPES.has(mime) && !mime.startsWith('image/')) {
    throw new Error('Formats acceptés : PNG, JPG, WebP ou AVIF.');
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Image trop volumineuse : limite de 15 Mo.');
  }

  // 1. Route backend Express (/api/upload)
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.success && data?.url) {
        return data.url;
      }
    }
  } catch {
    // Continue to Supabase / fallback
  }

  // 2. Supabase Storage si configuré
  if (isSupabaseConfigured) {
    try {
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-');
      const path = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from('designs').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
      if (!error) {
        const { data } = supabase.storage.from('designs').getPublicUrl(path);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Fallback to DataURL
    }
  }

  // 3. Repli local compressé (fonctionne même sans backend actif)
  return compressImageToDataUrl(file);
}

export interface UploadedVideoMetadata {
  durationLabel?: string;
  posterDataUrl?: string;
}

/**
 * Lit la durée (MM:SS) et extrait une miniature image de la vidéo sélectionnée depuis l'ordinateur.
 */
export function extractVideoMetadata(file: File): Promise<UploadedVideoMetadata> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      resolve({});
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let finished = false;
    const finish = (meta: UploadedVideoMetadata) => {
      if (finished) return;
      finished = true;
      URL.revokeObjectURL(objectUrl);
      resolve(meta);
    };

    const timeout = window.setTimeout(() => finish({}), 5000);

    video.onloadedmetadata = () => {
      const totalSeconds = Number.isFinite(video.duration) ? Math.floor(video.duration) : 0;
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const durationLabel =
        totalSeconds > 0
          ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : undefined;

      try {
        video.currentTime = Math.min(1, video.duration > 0 ? video.duration / 4 : 0);
      } catch {
        window.clearTimeout(timeout);
        finish({ durationLabel });
      }
    };

    video.onseeked = () => {
      window.clearTimeout(timeout);
      const totalSeconds = Number.isFinite(video.duration) ? Math.floor(video.duration) : 0;
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      const durationLabel =
        totalSeconds > 0
          ? `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          : undefined;

      try {
        const w = Math.min(960, video.videoWidth || 960);
        const h = Math.round((w * (video.videoHeight || 540)) / (video.videoWidth || 960));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const posterDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          finish({ durationLabel, posterDataUrl });
          return;
        }
      } catch {
        // ignore canvas capture errors
      }
      finish({ durationLabel });
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      finish({});
    };

    video.src = objectUrl;
  });
}

/**
 * Téléverse un fichier vidéo depuis l'ordinateur (MP4, WebM, MOV, M4V) vers le serveur Express
 * avec suivi de progression en temps réel.
 */
export async function uploadAdminVideo(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  const isVideoMime = (file.type || '').toLowerCase().startsWith('video/');
  const isVideoExt = ALLOWED_VIDEO_EXTENSIONS.test(file.name);
  if (!isVideoMime && !isVideoExt) {
    throw new Error('Formats vidéo acceptés : MP4, MOV, WebM ou M4V.');
  }
  if (file.size > 250 * 1024 * 1024) {
    throw new Error('Vidéo trop volumineuse : limite de 250 Mo.');
  }

  // 1. Envoi réel vers /api/upload/video avec suivi de progression XHR
  try {
    const serverUrl = await new Promise<string | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload/video', true);
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
          onProgress(pct);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const parsed = JSON.parse(xhr.responseText);
            if (parsed?.success && parsed?.url) {
              onProgress?.(100);
              resolve(parsed.url);
              return;
            }
          } catch {
            // fallback
          }
        }
        resolve(null);
      };
      xhr.onerror = () => resolve(null);

      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    });

    if (serverUrl) return serverUrl;
  } catch {
    // Continue to Supabase / local fallback
  }

  // 2. Supabase Storage si configuré
  if (isSupabaseConfigured) {
    try {
      const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-');
      const path = `videos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from('designs').upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type || 'video/mp4',
        upsert: false,
      });
      if (!error) {
        const { data } = supabase.storage.from('designs').getPublicUrl(path);
        if (data?.publicUrl) {
          onProgress?.(100);
          return data.publicUrl;
        }
      }
    } catch {
      // Fallback
    }
  }

  // 3. Repli navigateur (prévisualisation immédiate sur hébergement statique)
  onProgress?.(100);
  return URL.createObjectURL(file);
}
