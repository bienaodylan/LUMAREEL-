import { ConcertEvent } from '../types/index.ts';

/**
 * Délai d'alerte avant le début du concert : 30 minutes en millisecondes.
 */
export const CONCERT_REMINDER_OFFSET_MS = 30 * 60 * 1000;

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export type ConcertReminderStatus =
  | 'past'
  | 'sent'
  | 'imminent'
  | 'scheduled'
  | 'scheduled_inapp'
  | 'paused';

/**
 * Convertit une date ('YYYY-MM-DD' ou autre) et une heure ('HH:mm') de concert
 * en timestamp local (millisecondes Epoch).
 */
export function parseConcertStartTimestamp(dateStr?: string, timeStr?: string): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const trimmedDate = dateStr.trim();
  if (!trimmedDate) return null;

  const rawTime = (timeStr || '20:00').trim();
  const normalizedTime = rawTime.includes(':') ? rawTime : `${rawTime}:00`;
  const [hourStr, minStr] = normalizedTime.split(':');
  const hours = Number.isFinite(Number(hourStr)) ? Number(hourStr) : 20;
  const minutes = Number.isFinite(Number(minStr)) ? Number(minStr) : 0;

  if (trimmedDate.includes('-')) {
    const datePart = trimmedDate.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    if (!year || !month || !day) return null;
    const ts = new Date(year, month - 1, day, hours, minutes, 0, 0).getTime();
    return Number.isNaN(ts) ? null : ts;
  }

  const parsed = new Date(`${trimmedDate} ${normalizedTime}`).getTime();
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Calcule le timestamp exact de déclenchement du rappel (30 minutes avant le début).
 */
export function getConcertReminderTimestamp(
  event: Pick<ConcertEvent, 'date' | 'time'>
): number | null {
  const startTs = parseConcertStartTimestamp(event.date, event.time);
  if (startTs === null) return null;
  return startTs - CONCERT_REMINDER_OFFSET_MS;
}

/**
 * Formate un timestamp en heure locale HH:mm.
 */
export function formatTimeHHmm(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    return window.Notification.permission;
  } catch {
    return 'unsupported';
  }
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'unsupported';
  try {
    const result = await window.Notification.requestPermission();
    return result;
  } catch {
    try {
      return await new Promise<BrowserNotificationPermission>((resolve) => {
        window.Notification.requestPermission((perm) => resolve(perm));
      });
    } catch {
      return getBrowserNotificationPermission();
    }
  }
}

export interface LocalPushPayload {
  title: string;
  body: string;
  tag?: string;
  icon?: string;
  onClick?: () => void;
}

export interface LocalPushResult {
  deliveredViaBrowser: boolean;
  method: 'service-worker' | 'web-notification' | 'in-app-fallback';
}

/**
 * Déclenche une notification push locale via Service Worker (si actif) ou API Notification Web.
 */
export async function dispatchLocalPushNotification(
  payload: LocalPushPayload
): Promise<LocalPushResult> {
  const permission = getBrowserNotificationPermission();
  if (permission !== 'granted') {
    return { deliveredViaBrowser: false, method: 'in-app-fallback' };
  }

  const iconUrl = payload.icon || '/assets/logo-lumareel.png';

  // 1. Tenter via ServiceWorkerRegistration si disponible (plus fiable sur mobile/PWA)
  try {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(payload.title, {
          body: payload.body,
          tag: payload.tag,
          icon: iconUrl,
          badge: iconUrl,
          requireInteraction: false,
        });
        return { deliveredViaBrowser: true, method: 'service-worker' };
      }
    }
  } catch {
    // Repli vers window.Notification ci-dessous
  }

  // 2. Notification navigateur standard
  try {
    const notif = new window.Notification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: iconUrl,
    });

    notif.onclick = () => {
      try {
        window.focus();
        payload.onClick?.();
        notif.close();
      } catch {
        // Ignorer
      }
    };

    return { deliveredViaBrowser: true, method: 'web-notification' };
  } catch {
    return { deliveredViaBrowser: false, method: 'in-app-fallback' };
  }
}

/**
 * Indique si l'alerte de 30 minutes doit être déclenchée immédiatement pour cet événement.
 */
export function shouldTriggerReminderNow(
  event: ConcertEvent,
  now: number,
  notifiedEventIds: string[]
): boolean {
  if (notifiedEventIds.includes(event.id)) return false;

  const startTs = parseConcertStartTimestamp(event.date, event.time);
  if (startTs === null) return false;

  const timeUntilStart = startTs - now;
  // Déclencher dès qu'on est à <= 30 min du début et que le concert n'a pas encore démarré
  return timeUntilStart > 0 && timeUntilStart <= CONCERT_REMINDER_OFFSET_MS;
}

/**
 * Détermine l'état lisible d'un rappel pour un concert favori donné.
 */
export function getConcertReminderInfo(
  event: ConcertEvent,
  notifiedEventIds: string[],
  notificationsEnabled: boolean,
  permission: BrowserNotificationPermission,
  now: number = Date.now()
): {
  status: ConcertReminderStatus;
  startTs: number | null;
  reminderTs: number | null;
  reminderTimeLabel: string;
} {
  const startTs = parseConcertStartTimestamp(event.date, event.time);
  const reminderTs = startTs !== null ? startTs - CONCERT_REMINDER_OFFSET_MS : null;
  const reminderTimeLabel = reminderTs !== null ? formatTimeHHmm(reminderTs) : '--:--';

  if (startTs === null || startTs <= now) {
    return { status: 'past', startTs, reminderTs, reminderTimeLabel };
  }

  if (notifiedEventIds.includes(event.id)) {
    return { status: 'sent', startTs, reminderTs, reminderTimeLabel };
  }

  if (!notificationsEnabled) {
    return { status: 'paused', startTs, reminderTs, reminderTimeLabel };
  }

  if (startTs - now <= CONCERT_REMINDER_OFFSET_MS) {
    return { status: 'imminent', startTs, reminderTs, reminderTimeLabel };
  }

  if (permission === 'granted') {
    return { status: 'scheduled', startTs, reminderTs, reminderTimeLabel };
  }

  return { status: 'scheduled_inapp', startTs, reminderTs, reminderTimeLabel };
}
