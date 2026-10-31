/**
 * dateUtils.ts — Utilitaires de formatage de dates en français pour LUMARÉEL
 * Garantit l'affichage textuel complet en français (ex: "19 Décembre 2026").
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

/**
 * Convertit toute chaîne de date (ISO YYYY-MM-DD, timestamp, Date) en format textuel français complet
 * Exemple : "2026-12-19" -> "19 Décembre 2026"
 */
export function formatDateLongFrench(dateInput?: string | number | Date | null): string {
  if (!dateInput) return '';
  
  const str = String(dateInput).trim();
  
  // Si déjà sous forme textuelle avec mois français
  for (const m of FRENCH_MONTHS) {
    if (str.toLowerCase().includes(m.toLowerCase())) {
      return str;
    }
  }

  // Si format ISO direct YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const monthIdx = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} ${FRENCH_MONTHS[monthIdx]} ${year}`;
    }
  }

  // Tenter le parsing via Date
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = parsed.getDate();
    const month = FRENCH_MONTHS[parsed.getMonth()];
    const year = parsed.getFullYear();
    return `${day} ${month} ${year}`;
  }

  return str;
}
