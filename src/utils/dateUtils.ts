/**
 * dateUtils.ts — Utilitaires de formatage de dates pour LUMARÉEL (Français et Anglais)
 * Format textuel complet (ex: "19 Décembre 2026" / "December 19, 2026").
 */

const FRENCH_MONTHS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

const ENGLISH_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatDateLong(dateInput?: string | number | Date | null, lang: 'fr' | 'en' = 'fr'): string {
  if (!dateInput) return '';
  
  const str = String(dateInput).trim();
  const months = lang === 'en' ? ENGLISH_MONTHS : FRENCH_MONTHS;
  
  // Format ISO direct YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return lang === 'en' ? `${months[monthIdx]} ${day}, ${year}` : `${day} ${months[monthIdx]} ${year}`;
    }
  }

  // Tenter le parsing via Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    return lang === 'en' ? `${month} ${day}, ${year}` : `${day} ${month} ${year}`;
  }

  return str;
}

export function formatDateLongFrench(dateInput?: string | number | Date | null): string {
  return formatDateLong(dateInput, 'fr');
}
