/**
 * Utility functions for YouTube URL parsing, embedding and image conversion
 */

export function convertToYouTubeEmbed(url: string): string {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Already an embed URL
  if (trimmed.includes('youtube.com/embed/') || trimmed.includes('youtube-nocookie.com/embed/')) {
    return trimmed;
  }

  // Standard watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
  }

  // Shortened youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortMatch[1]}?autoplay=1&rel=0`;
  }

  // YouTube Shorts youtube.com/shorts/VIDEO_ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?autoplay=1&rel=0`;
  }

  // If a raw 11-char ID is passed
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1&rel=0`;
  }

  return trimmed;
}

/**
 * Read a file as Data URL (base64) for instant image preview and offline persistence
 */
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as string'));
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
