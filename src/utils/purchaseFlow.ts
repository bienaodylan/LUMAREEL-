/**
 * Logique pure du tunnel d'achat (sans React) : stock, prix, code promo, pays et moyens de paiement.
 */

export interface FlowCategory {
  id: string;
  name: string;
  price: number;
  currency?: string;
  quota: number;
  sold: number;
  description?: string;
  perks?: string[];
}

export interface FlowEvent {
  id: string;
  title: string;
  date: string; // AAAA-MM-JJ
  time?: string;
  venue: string;
  city?: string;
  categories: FlowCategory[];
}

export type StockLevel = 'available' | 'low' | 'soldout';

export interface StockInfo {
  level: StockLevel;
  remaining: number;
}

/** Épuisé à 0, "risque de rupture" quand il reste 10 % du quota (au moins 10 billets) ou moins. */
export function getStock(category: Pick<FlowCategory, 'quota' | 'sold'>): StockInfo {
  const remaining = Math.max(0, category.quota - category.sold);
  if (remaining === 0) return { level: 'soldout', remaining };
  const threshold = Math.max(10, Math.ceil(category.quota * 0.1));
  return { level: remaining <= threshold ? 'low' : 'available', remaining };
}

/** Quantité maximale choisissable pour une catégorie. */
export function maxQuantity(category: Pick<FlowCategory, 'quota' | 'sold'>, maxPerCategory = 8): number {
  return Math.min(maxPerCategory, getStock(category).remaining);
}

export type Selection = Record<string, number>;

export interface Totals {
  count: number;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  lines: Array<{ category: FlowCategory; quantity: number; amount: number }>;
}

export function computeTotals(categories: FlowCategory[], selection: Selection, promoPercent = 0): Totals {
  const lines = categories
    .map((category) => {
      const quantity = Math.max(0, Math.min(selection[category.id] || 0, maxQuantity(category, 8)));
      return { category, quantity, amount: quantity * category.price };
    })
    .filter((line) => line.quantity > 0);

  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const percent = Math.min(100, Math.max(0, promoPercent));
  const discount = Math.round((subtotal * percent) / 100);
  return {
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
    currency: categories[0]?.currency || 'FCFA',
    lines,
  };
}

/** Renvoie le pourcentage de réduction, ou null si le code est inconnu. */
export function lookupPromo(code: string, promoCodes: Record<string, number> = {}): number | null {
  const wanted = code.trim().toUpperCase();
  if (!wanted) return null;
  for (const [key, percent] of Object.entries(promoCodes)) {
    if (key.trim().toUpperCase() === wanted && percent > 0 && percent <= 100) return percent;
  }
  return null;
}

/** 20000 → "20 000" (espace ordinaire, lisible partout). */
export function formatAmount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/* -------------------------------------------------------------------------- */
/*  Pays et moyens de paiement                                                 */
/* -------------------------------------------------------------------------- */

export type PaymentKind = 'mobile' | 'card';

export interface PaymentMethod {
  id: string;
  name: string;
  kind: PaymentKind;
  hint: string;
  /** Couleur approximative de la marque, pour l'écran de confirmation. */
  accent: string;
}

export const PAYMENT_METHODS: Record<string, PaymentMethod> = {
  wave: { id: 'wave', name: 'Wave', kind: 'mobile', hint: 'Payez depuis l’application Wave', accent: '#1DC8F2' },
  orange_money: { id: 'orange_money', name: 'Orange Money', kind: 'mobile', hint: 'Mobile Money Orange', accent: '#FF7900' },
  mtn_momo: { id: 'mtn_momo', name: 'MTN Mobile Money', kind: 'mobile', hint: 'Mobile Money MTN', accent: '#FFCC00' },
  moov_money: { id: 'moov_money', name: 'Moov Money', kind: 'mobile', hint: 'Mobile Money Moov', accent: '#0072CE' },
  free_money: { id: 'free_money', name: 'Free Money', kind: 'mobile', hint: 'Mobile Money Free', accent: '#CD1409' },
  tmoney: { id: 'tmoney', name: 'T-Money', kind: 'mobile', hint: 'Mobile Money Togocom', accent: '#E30613' },
  djamo: { id: 'djamo', name: 'Djamo', kind: 'mobile', hint: 'Payez avec votre compte Djamo', accent: '#7C5CFF' },
  card: { id: 'card', name: 'Carte bancaire', kind: 'card', hint: 'Visa ou Mastercard', accent: '#D4AF37' },
};

export interface PaymentCountry {
  code: string;
  name: string;
  dialCode: string;
  methods: string[];
}

/** À adapter selon les moyens de paiement réellement activés chez votre prestataire. */
export const PAYMENT_COUNTRIES: PaymentCountry[] = [
  { code: 'CI', name: 'Côte d’Ivoire', dialCode: '+225', methods: ['wave', 'orange_money', 'mtn_momo', 'moov_money', 'djamo', 'card'] },
  { code: 'SN', name: 'Sénégal', dialCode: '+221', methods: ['wave', 'orange_money', 'free_money', 'djamo', 'card'] },
  { code: 'ML', name: 'Mali', dialCode: '+223', methods: ['wave', 'orange_money', 'moov_money', 'card'] },
  { code: 'BF', name: 'Burkina Faso', dialCode: '+226', methods: ['wave', 'orange_money', 'moov_money', 'card'] },
  { code: 'BJ', name: 'Bénin', dialCode: '+229', methods: ['mtn_momo', 'moov_money', 'card'] },
  { code: 'TG', name: 'Togo', dialCode: '+228', methods: ['tmoney', 'moov_money', 'card'] },
  { code: 'CM', name: 'Cameroun', dialCode: '+237', methods: ['orange_money', 'mtn_momo', 'card'] },
  { code: 'OTHER', name: 'Autre pays', dialCode: '', methods: ['card'] },
];

export function methodsForCountry(countryCode: string): PaymentMethod[] {
  const country = PAYMENT_COUNTRIES.find((c) => c.code === countryCode) || PAYMENT_COUNTRIES[PAYMENT_COUNTRIES.length - 1];
  return country.methods.map((id) => PAYMENT_METHODS[id]).filter(Boolean);
}

/** Numéro mobile : 8 à 10 chiffres une fois les espaces retirés. */
export function isValidMobile(value: string): boolean {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 10;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
