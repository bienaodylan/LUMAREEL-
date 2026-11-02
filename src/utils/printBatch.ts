/**
 * Création fiable d'un lot de billets physiques.
 *
 * Ordre des tentatives :
 *  1. Le serveur Express (/api/tickets/print-batch), avec 3 essais et un délai maximal.
 *     Chaque essai envoie le même `requestId` : si la réponse s'est perdue alors que le lot
 *     a bien été créé, le nouvel essai renvoie CE lot au lieu d'en créer un second.
 *  2. Si le serveur est injoignable (ou hébergé sans Express) : la fonction SQL atomique
 *     `create_print_batch` de Supabase (numéros …-C00001).
 *  3. Si le serveur a créé le lot : copie de sécurité dans Supabase, pour que les billets
 *     restent valides même si le serveur redémarre et perd son disque.
 *
 * Aucun billet n'est jamais imprimé sans avoir été enregistré quelque part de durable.
 */

export interface BatchTicket {
  id: string;
  serialNumber: string;
  token: string;
}

export interface BatchSnapshot {
  eventTitle: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  categoryName: string;
  price: number;
}

export interface BatchRequest {
  eventId: string;
  categoryId: string;
  quantity: number;
  /** Identifiant stable de CE lot : le même pour tous les essais. */
  requestId: string;
  snapshot: BatchSnapshot;
}

export type BatchSource = 'serveur' | 'cloud';
export type MirrorState = 'fait' | 'non_configure' | 'echec' | 'inutile';

export interface BatchResult {
  tickets: BatchTicket[];
  batchRef: string;
  source: BatchSource;
  reused: boolean;
  mirror: MirrorState;
  /** Informations à montrer à l'administrateur (copie cloud échouée, lot rejoué…). */
  notes: string[];
}

export type FailureKind =
  | 'hors_ligne'
  | 'delai'
  | 'reseau'
  | 'page_html'
  | 'route_absente'
  | 'serveur'
  | 'refus';

export class BatchError extends Error {
  kind: FailureKind | 'cloud';
  details: string[];
  constructor(message: string, kind: FailureKind | 'cloud', details: string[] = []) {
    super(message);
    this.name = 'BatchError';
    this.kind = kind;
    this.details = details;
  }
}

/** Accès à Supabase, injectable pour les tests. */
export interface CloudClient {
  createBatch(req: BatchRequest): Promise<{ data: any; error: { message: string; code?: string } | null }>;
  mirror(args: {
    batchId: string;
    batchRef: string;
    request: BatchRequest;
    tickets: BatchTicket[];
  }): Promise<{ error: string | null }>;
  ping(): Promise<{ ok: boolean; message: string }>;
  /** true si la fonction create_print_batch existe dans la base. */
  hasBatchFunction(): Promise<{ ok: boolean; message: string }>;
}

export interface BatchDeps {
  fetch: typeof fetch;
  sleep: (ms: number) => Promise<void>;
  isOnline: () => boolean;
  /** null = Supabase non configuré. */
  cloud: CloudClient | null;
  timeoutMs: number;
  retryDelaysMs: number[];
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);

interface ServerFailure {
  kind: FailureKind;
  message: string;
  status?: number;
}

type ServerAttempt =
  | { ok: true; data: any }
  | { ok: false; failure: ServerFailure; retryable: boolean };

async function attemptServer(deps: BatchDeps, req: BatchRequest): Promise<ServerAttempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs);
  try {
    const res = await deps.fetch('/api/tickets/print-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    const type = res.headers.get('content-type') || '';
    if (!type.includes('application/json')) {
      if (type.includes('text/html')) {
        return {
          ok: false,
          retryable: false,
          failure: {
            kind: 'page_html',
            status: res.status,
            message:
              'L’adresse du serveur de billets renvoie une page web au lieu d’une réponse : le site est hébergé sans serveur Express (hébergement statique).',
          },
        };
      }
      if (res.status === 404 || res.status === 405) {
        return {
          ok: false,
          retryable: false,
          failure: {
            kind: 'route_absente',
            status: res.status,
            message: 'Le serveur est en ligne mais ne connaît pas la route d’impression : une ancienne version est déployée.',
          },
        };
      }
      return {
        ok: false,
        retryable: RETRYABLE_STATUS.has(res.status),
        failure: { kind: 'serveur', status: res.status, message: `Réponse inattendue du serveur (code ${res.status}).` },
      };
    }
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && Array.isArray(data.tickets)) return { ok: true, data };
    if (res.status === 404 || res.status === 405) {
      return {
        ok: false,
        retryable: false,
        failure: {
          kind: 'route_absente',
          status: res.status,
          message: 'Le serveur est en ligne mais ne connaît pas la route d’impression : une ancienne version est déployée.',
        },
      };
    }
    const message = data?.error || `Le serveur a refusé la demande (code ${res.status}).`;
    if (res.status >= 500) {
      return { ok: false, retryable: RETRYABLE_STATUS.has(res.status), failure: { kind: 'serveur', status: res.status, message } };
    }
    return { ok: false, retryable: false, failure: { kind: 'refus', status: res.status, message } };
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      return {
        ok: false,
        retryable: true,
        failure: { kind: 'delai', message: `Le serveur n’a pas répondu en ${Math.round(deps.timeoutMs / 1000)} secondes.` },
      };
    }
    if (!deps.isOnline()) {
      return { ok: false, retryable: false, failure: { kind: 'hors_ligne', message: 'Cet appareil n’a pas de connexion Internet.' } };
    }
    return {
      ok: false,
      retryable: true,
      failure: {
        kind: 'reseau',
        message: 'Le serveur de billets ne répond pas (arrêté, en cours de redémarrage, ou connexion coupée).',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

function cloudErrorMessage(error: { message: string; code?: string }): string {
  const text = `${error.code || ''} ${error.message || ''}`;
  if (/PGRST202|create_print_batch|schema cache|function .* does not exist/i.test(text) && /create_print_batch|PGRST202|schema cache/i.test(text)) {
    return 'La fonction create_print_batch n’est pas installée dans Supabase : exécutez la section 12 du fichier src/lib/supabase-schema.sql dans l’éditeur SQL.';
  }
  return error.message || 'Erreur inconnue de la base cloud.';
}

export async function createPhysicalBatch(
  req: BatchRequest,
  deps: BatchDeps,
  onProgress: (step: string) => void = () => {}
): Promise<BatchResult> {
  const notes: string[] = [];
  const diagnostics: string[] = [];

  // ---- 1. Serveur Express, avec nouvelles tentatives --------------------------------
  let lastFailure: ServerFailure | null = null;
  const attempts = 1 + deps.retryDelaysMs.length;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    onProgress(attempt === 1 ? 'Enregistrement du lot sur le serveur…' : `Serveur sans réponse, nouvel essai ${attempt}/${attempts}…`);
    const result = await attemptServer(deps, req);
    if (result.ok) {
      const data = result.data;
      const tickets = data.tickets as BatchTicket[];
      if (data.reused) notes.push('Ce lot avait déjà été enregistré : les mêmes billets sont réutilisés (aucun doublon créé).');
      const mirror = await mirrorToCloud(deps, req, data.batchId, data.batchRef, tickets, notes, onProgress);
      return { tickets, batchRef: data.batchRef, source: 'serveur', reused: Boolean(data.reused), mirror, notes };
    }
    lastFailure = result.failure;
    if (!result.retryable || attempt === attempts) break;
    await deps.sleep(deps.retryDelaysMs[attempt - 1]);
  }
  const failure = lastFailure as ServerFailure;
  diagnostics.push(`Serveur de billets : ${failure.message}`);

  // Refus de la demande (quantité, paramètres, concert inconnu…) : un repli ne changerait rien.
  if (failure.kind === 'refus') {
    throw new BatchError(`Aucun billet n’a été créé : ${failure.message}`, 'refus', diagnostics);
  }
  // Cet appareil est hors ligne : Supabase ne répondra pas non plus.
  if (failure.kind === 'hors_ligne') {
    throw new BatchError(
      'Aucun billet n’a été créé : cet appareil n’a pas de connexion Internet. Rétablissez la connexion puis réessayez.',
      'hors_ligne',
      diagnostics
    );
  }

  // ---- 2. Repli : création directe dans la base cloud -------------------------------
  if (!deps.cloud) {
    diagnostics.push('Base cloud : non configurée (variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY absentes).');
    throw new BatchError(
      `Aucun billet n’a été créé : ${failure.message} La base cloud de secours n’est pas configurée.`,
      failure.kind,
      diagnostics
    );
  }

  onProgress('Serveur injoignable : création du lot dans la base cloud…');
  let cloudError: string | null = null;
  try {
    const { data, error } = await deps.cloud.createBatch(req);
    if (error) {
      cloudError = cloudErrorMessage(error);
    } else if (!data?.success || !Array.isArray(data.tickets)) {
      cloudError =
        data?.code === 'CONCERT'
          ? 'Ce concert n’existe pas encore dans la base cloud : enregistrez-le d’abord depuis l’administration.'
          : data?.error || 'Réponse inattendue de la base cloud.';
    } else {
      notes.push(
        `Le serveur étant injoignable, le lot a été créé directement dans la base cloud (numéros …-C00001). Les billets seront reconnus au contrôle d’entrée via le cloud.`
      );
      if (data.reused) notes.push('Ce lot avait déjà été enregistré : les mêmes billets sont réutilisés (aucun doublon créé).');
      return {
        tickets: data.tickets as BatchTicket[],
        batchRef: data.batchRef,
        source: 'cloud',
        reused: Boolean(data.reused),
        mirror: 'inutile',
        notes,
      };
    }
  } catch (error: any) {
    cloudError = `la base cloud ne répond pas (${error?.message || 'erreur réseau'}).`;
  }

  diagnostics.push(`Base cloud : ${cloudError}`);
  throw new BatchError(
    `Aucun billet n’a été créé. ${failure.message} Et la base cloud de secours a échoué : ${cloudError}`,
    failure.kind,
    diagnostics
  );
}

async function mirrorToCloud(
  deps: BatchDeps,
  req: BatchRequest,
  batchId: string | undefined,
  batchRef: string,
  tickets: BatchTicket[],
  notes: string[],
  onProgress: (step: string) => void
): Promise<MirrorState> {
  if (!deps.cloud) {
    notes.push(
      'Base cloud non configurée : le lot n’existe que sur le serveur. S’il redémarre en perdant son disque, ces billets ne seront plus reconnus à l’entrée.'
    );
    return 'non_configure';
  }
  if (!batchId) return 'echec';
  onProgress('Copie de sécurité du lot dans la base cloud…');
  try {
    const { error } = await deps.cloud.mirror({ batchId, batchRef, request: req, tickets });
    if (error) {
      notes.push(`Copie de sécurité cloud non effectuée : ${error}. Le lot est valide sur le serveur uniquement.`);
      return 'echec';
    }
    return 'fait';
  } catch (error: any) {
    notes.push(`Copie de sécurité cloud non effectuée : ${error?.message || 'erreur réseau'}. Le lot est valide sur le serveur uniquement.`);
    return 'echec';
  }
}

/* -------------------------------------------------------------------------- */
/*  Diagnostic de connexion                                                    */
/* -------------------------------------------------------------------------- */

export interface BackendStatus {
  server: { state: 'ok' | 'injoignable' | 'absent'; message: string; ms?: number };
  cloud: { state: 'ok' | 'non_configure' | 'erreur' | 'fonction_absente'; message: string };
}

export async function checkBackend(deps: BatchDeps): Promise<BackendStatus> {
  const status: BackendStatus = {
    server: { state: 'injoignable', message: '' },
    cloud: { state: 'non_configure', message: 'Base cloud Supabase non configurée.' },
  };

  const started = Date.now();
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(deps.timeoutMs, 8000));
    const res = await deps.fetch('/api/health', { cache: 'no-store', signal: controller.signal } as RequestInit);
    clearTimeout(timer);
    const type = res.headers.get('content-type') || '';
    const data = type.includes('application/json') ? await res.json().catch(() => null) : null;
    if (res.ok && data?.ok) {
      status.server = { state: 'ok', message: 'Serveur de billets en ligne.', ms: Date.now() - started };
    } else {
      status.server = {
        state: 'absent',
        message: type.includes('text/html')
          ? 'Pas de serveur Express sur ce site (hébergement statique).'
          : `Le serveur répond mais n’est pas le serveur LUMARÉEL (code ${res.status}).`,
      };
    }
  } catch (error: any) {
    status.server = {
      state: 'injoignable',
      message: deps.isOnline()
        ? error?.name === 'AbortError'
          ? 'Le serveur ne répond pas (délai dépassé).'
          : 'Le serveur est injoignable (arrêté ou en redémarrage).'
        : 'Cet appareil n’a pas de connexion Internet.',
    };
  }

  if (deps.cloud) {
    const ping = await deps.cloud.ping().catch((e: any) => ({ ok: false, message: e?.message || 'erreur réseau' }));
    if (!ping.ok) {
      status.cloud = { state: 'erreur', message: ping.message };
    } else {
      const fn = await deps.cloud.hasBatchFunction().catch((e: any) => ({ ok: false, message: e?.message || 'erreur réseau' }));
      status.cloud = fn.ok
        ? { state: 'ok', message: 'Base cloud connectée, fonction de lot installée.' }
        : { state: 'fonction_absente', message: fn.message };
    }
  }
  return status;
}

/* -------------------------------------------------------------------------- */
/*  Dépendances réelles (navigateur + Supabase)                                */
/* -------------------------------------------------------------------------- */

export async function getDefaultDeps(): Promise<BatchDeps> {
  // Import dynamique : le client Supabase lit import.meta.env, disponible seulement sous Vite.
  const { supabase, isSupabaseConfigured } = await import('../lib/supabaseClient');
  const cloud: CloudClient | null = isSupabaseConfigured
    ? {
        async createBatch(req) {
          const { data, error } = await supabase.rpc('create_print_batch', {
            p_request_id: req.requestId,
            p_event_id: req.eventId,
            p_category_id: req.categoryId,
            p_quantity: req.quantity,
          });
          return { data, error: error ? { message: error.message, code: error.code } : null };
        },
        async mirror({ batchId, batchRef, request, tickets }) {
          const snap = request.snapshot;
          const order = {
            id: batchId,
            reference: batchRef,
            customer_id: 'print_batch',
            customer_name: 'Lot physique',
            customer_email: '',
            event_id: request.eventId,
            event_title: snap.eventTitle,
            event_date: snap.date,
            event_venue: snap.venue,
            category_id: request.categoryId,
            category_name: snap.categoryName,
            quantity: tickets.length,
            unit_price: snap.price,
            total_amount: 0,
            currency: 'FCFA',
            payment_status: 'completed',
            payment_provider: 'physical_batch',
            payment_ref: batchRef,
          };
          const { error: orderError } = await supabase
            .from('orders')
            .upsert(order, { onConflict: 'id', ignoreDuplicates: true });
          if (orderError) return { error: orderError.message };
          for (let i = 0; i < tickets.length; i += 500) {
            const rows = tickets.slice(i, i + 500).map((t) => ({
              id: t.id,
              order_id: batchId,
              order_ref: batchRef,
              event_id: request.eventId,
              event_title: snap.eventTitle,
              event_date: snap.date,
              event_time: snap.time,
              event_venue: snap.venue,
              category_id: request.categoryId,
              category_name: snap.categoryName,
              serial_number: t.serialNumber,
              token: t.token,
              holder_name: 'Billet physique',
              holder_email: '',
              status: 'valid',
            }));
            const { error } = await supabase.from('tickets').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
            if (error) return { error: error.message };
          }
          return { error: null };
        },
        async ping() {
          const { error } = await supabase.from('events').select('id').limit(1);
          return error ? { ok: false, message: `Base cloud : ${error.message}` } : { ok: true, message: 'ok' };
        },
        async hasBatchFunction() {
          // Appel volontairement invalide (quantité 0) : la fonction répond « QUANTITE » si elle existe.
          const { data, error } = await supabase.rpc('create_print_batch', {
            p_request_id: 'sonde', p_event_id: '-', p_category_id: '-', p_quantity: 0,
          });
          if (error) return { ok: false, message: cloudErrorMessage({ message: error.message, code: error.code }) };
          return data?.code === 'QUANTITE'
            ? { ok: true, message: 'ok' }
            : { ok: false, message: 'Réponse inattendue de la fonction create_print_batch.' };
        },
      }
    : null;

  return {
    fetch: (input, init) => fetch(input, init),
    sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine !== false),
    cloud,
    timeoutMs: 20000,
    retryDelaysMs: [700, 1800],
  };
}

/** Identifiant de lot : unique et stable pour toute la durée d'une préparation. */
export function newRequestId(): string {
  const c: any = typeof crypto !== 'undefined' ? crypto : null;
  if (c?.randomUUID) return c.randomUUID();
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
