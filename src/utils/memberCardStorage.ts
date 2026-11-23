import { MembershipCard } from '../types';

const STORAGE_KEY = 'lumareel_active_black_card_v1';

interface StoredMemberCardRecord {
  card: MembershipCard;
  ownerEmail?: string;
  savedAt: string;
}

export function saveStoredMemberCard(
  card: MembershipCard,
  ownerEmail?: string | null
): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const record: StoredMemberCardRecord = {
      card,
      ownerEmail: (ownerEmail || card.cardholderEmail || '').trim().toLowerCase() || undefined,
      savedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota or private mode errors
  }
}

export function loadStoredMemberCard(userEmail?: string | null): MembershipCard | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredMemberCardRecord | MembershipCard;
    if (!parsed) return null;

    const record: StoredMemberCardRecord =
      'card' in parsed && parsed.card
        ? parsed
        : { card: parsed as MembershipCard, savedAt: '' };

    if (!record.card?.cardNumber) return null;

    const cleanUserEmail = (userEmail || '').trim().toLowerCase();
    if (!cleanUserEmail) {
      return record.card;
    }

    const cardEmail = (record.card.cardholderEmail || '').trim().toLowerCase();
    const ownerEmail = (record.ownerEmail || '').trim().toLowerCase();

    if (
      !ownerEmail ||
      ownerEmail === cleanUserEmail ||
      cardEmail === cleanUserEmail
    ) {
      return record.card;
    }

    return null;
  } catch {
    return null;
  }
}

export function clearStoredMemberCard(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}
