const FORMULA_PREFIX_RE = /^[=+\-@\t\r]/;

/**
 * Neutralizes CSV / Excel formula injection (DDE / CSV Injection) by prefixing
 * values starting with =, +, -, @, tab, or CR with a leading single quote.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (FORMULA_PREFIX_RE.test(raw) || FORMULA_PREFIX_RE.test(raw.trimStart())) {
    return `'${raw}`;
  }
  return raw;
}

export function formatCsvCell(value: unknown): string {
  const safe = sanitizeSpreadsheetCell(value).replace(/"/g, '""').trim();
  return `"${safe}"`;
}
