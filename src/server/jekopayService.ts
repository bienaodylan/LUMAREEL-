import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type JekoPayChannel =
  | 'wave'
  | 'orange_money'
  | 'mtn_momo'
  | 'moov_money'
  | 'djamo'
  | 'card';

export type JekoPayTransactionKind = 'ticket_order' | 'membership_card' | 'tv_pass';

export type JekoPayTransactionStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED';

export interface JekoPayTransaction {
  id: string;
  reference: string;
  providerTransactionId?: string;
  kind: JekoPayTransactionKind;
  orderId: string;
  amount: number;
  currency: 'XOF';
  channel: JekoPayChannel;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: JekoPayTransactionStatus;
  paymentUrl?: string;
  environment: 'sandbox' | 'production';
  mode: 'live' | 'awaiting_keys';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface JekoPayInitParams {
  kind: JekoPayTransactionKind;
  orderId: string;
  reference: string;
  amount: number;
  description: string;
  channel: JekoPayChannel;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  metadata?: Record<string, unknown>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TX_FILE = path.join(DATA_DIR, 'jekopay_transactions.json');

const JEKOPAY_METHOD_MAP: Record<JekoPayChannel, string> = {
  wave: 'wave',
  orange_money: 'orange',
  mtn_momo: 'mtn',
  moov_money: 'moov',
  djamo: 'djamo',
  card: 'card',
};

const JEKOPAY_SUCCESS_STATUSES = new Set([
  'SUCCESS',
  'SUCCEEDED',
  'COMPLETED',
  'PAID',
  'OK',
  '200',
  'TRANSACTION_COMPLETED',
]);
const JEKOPAY_PENDING_STATUSES = new Set([
  'INITIATED',
  'PENDING',
  'PROCESSING',
  'CREATED',
  'OPEN',
]);
const JEKOPAY_EXPIRED_STATUSES = new Set(['EXPIRED', 'TIMEOUT']);

class JekoPayService {
  private transactions: Map<string, JekoPayTransaction> = new Map();
  private cachedStoreId: string | null = null;

  private ready: Promise<void>;

  constructor() {
    this.loadFromDisk();
    this.ready = this.loadFromSupabase();
  }

  private get supabaseUrl(): string {
    return (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\\/$/, '');
  }

  private get supabaseServiceKey(): string {
    return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
  }

  private get hasSupabaseStore(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseServiceKey);
  }

  private async loadFromSupabase(): Promise<void> {
    if (!this.hasSupabaseStore) return;
    try {
      const response = await fetch(`${this.supabaseUrl}/rest/v1/jekopay_transactions?select=payload&order=created_at.desc`, {
        headers: { apikey: this.supabaseServiceKey, Authorization: `Bearer ${this.supabaseServiceKey}` },
      });
      if (!response.ok) throw new Error(`Supabase transaction load failed (${response.status})`);
      const rows = await response.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const tx = row?.payload as JekoPayTransaction | undefined;
          if (tx?.reference) this.transactions.set(tx.reference, tx);
        }
      }
    } catch (err) {
      console.error('[JekoPay] Persistent transaction store unavailable:', err);
    }
  }

  private async persistTransaction(tx: JekoPayTransaction): Promise<void> {
    if (!this.hasSupabaseStore) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Stockage de transactions indisponible : configurez SUPABASE_SERVICE_ROLE_KEY.');
      }
      this.saveToDisk();
      return;
    }
    const row = {
      reference: tx.reference,
      provider_transaction_id: tx.providerTransactionId || null,
      status: tx.status,
      kind: tx.kind,
      amount: tx.amount,
      currency: tx.currency,
      environment: tx.environment,
      mode: tx.mode,
      payload: tx,
      created_at: tx.createdAt,
      updated_at: tx.updatedAt,
      paid_at: tx.paidAt || null,
    };
    const response = await fetch(`${this.supabaseUrl}/rest/v1/jekopay_transactions?on_conflict=reference`, {
      method: 'POST',
      headers: {
        apikey: this.supabaseServiceKey,
        Authorization: `Bearer ${this.supabaseServiceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(row),
    });
    if (!response.ok) {
      const safeText = await response.text().catch(() => '');
      console.error('[JekoPay] Transaction persistence failed:', response.status, safeText.slice(0, 300));
      throw new Error('Impossible de sauvegarder la transaction dans Supabase.');
    }
  }

  private get environment(): 'sandbox' | 'production' {
    return (process.env.JEKOPAY_ENV || 'production').toLowerCase() === 'sandbox'
      ? 'sandbox'
      : 'production';
  }

  private get baseUrl(): string {
    const custom = (process.env.JEKOPAY_BASE_URL || '').trim();
    if (custom) {
      return custom.replace(/\/+$/, '');
    }
    return 'https://api.jeko.africa';
  }

  private get apiKeyId(): string {
    return (process.env.JEKOPAY_API_KEY_ID || '').trim();
  }

  private get apiKeySecret(): string {
    return (process.env.JEKOPAY_API_KEY_SECRET || '').trim();
  }

  private get configuredStoreId(): string {
    return (process.env.JEKOPAY_STORE_ID || '').trim();
  }

  private get webhookSecret(): string {
    return (process.env.JEKOPAY_WEBHOOK_SECRET || '').trim();
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKeyId && this.apiKeySecret);
  }

  public hasWebhookSecret(): boolean {
    return Boolean(this.webhookSecret);
  }

  public hasStoreId(): boolean {
    return Boolean(this.configuredStoreId || this.cachedStoreId);
  }

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-API-KEY-ID': this.apiKeyId,
      'X-API-KEY': this.apiKeySecret,
    };
  }

  public getPublicConfig() {
    return {
      provider: 'jekopay',
      configured: this.isConfigured(),
      environment: this.environment,
      currency: 'XOF',
      channels: [
        { id: 'wave', label: 'Wave', type: 'mobile_money' },
        { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
        { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
        { id: 'moov_money', label: 'Moov Money', type: 'mobile_money' },
        { id: 'djamo', label: 'Djamo', type: 'mobile_money' },
        { id: 'card', label: 'Visa / Mastercard', type: 'card' },
      ],
    };
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(TX_FILE)) return;
      const raw = fs.readFileSync(TX_FILE, 'utf-8');
      const list: JekoPayTransaction[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const tx of list) {
          if (tx?.reference) {
            this.transactions.set(tx.reference, tx);
          }
        }
      }
    } catch (err) {
      console.warn('[JekoPay] Unable to load transaction cache:', err);
    }
  }

  private saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const list = Array.from(this.transactions.values());
      fs.writeFileSync(TX_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[JekoPay] Unable to persist transaction cache:', err);
    }
  }

  public getTransaction(referenceOrProviderId: string): JekoPayTransaction | undefined {
    const direct = this.transactions.get(referenceOrProviderId);
    if (direct) return direct;
    for (const tx of this.transactions.values()) {
      if (tx.providerTransactionId && tx.providerTransactionId === referenceOrProviderId) {
        return tx;
      }
    }
    return undefined;
  }

  public getAllTransactions(): JekoPayTransaction[] {
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public normalizeStatus(rawStatus: unknown): JekoPayTransactionStatus {
    const val = String(rawStatus ?? '').trim().toUpperCase();
    if (JEKOPAY_SUCCESS_STATUSES.has(val)) return 'SUCCESS';
    if (JEKOPAY_EXPIRED_STATUSES.has(val)) return 'EXPIRED';
    if (JEKOPAY_PENDING_STATUSES.has(val)) return 'PENDING';
    return 'FAILED';
  }

  /**
   * Resolves the JekoPay Store ID from JEKOPAY_STORE_ID or automatically
   * discovers the merchant's primary store via GET /partner_api/stores.
   */
  private async resolveStoreId(): Promise<string> {
    if (this.configuredStoreId) return this.configuredStoreId;
    if (this.cachedStoreId) return this.cachedStoreId;

    const response = await fetch(`${this.baseUrl}/partner_api/stores`, {
      method: 'GET',
      headers: this.buildHeaders(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Impossible de récupérer le magasin JekoPay (${response.status}).`
      );
    }

    const stores = Array.isArray(data)
      ? data
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.stores)
          ? data.stores
          : [];

    const firstId = stores[0]?.id || stores[0]?.storeId || data?.id || data?.storeId;
    if (!firstId || typeof firstId !== 'string') {
      throw new Error(
        'Aucun storeId JekoPay trouvé. Définissez JEKOPAY_STORE_ID côté serveur.'
      );
    }

    this.cachedStoreId = firstId;
    return firstId;
  }

  /**
   * Initiates a JekoPay payment request via POST /partner_api/payment_requests.
   * - When JEKOPAY_API_KEY_ID & JEKOPAY_API_KEY_SECRET are configured: creates a live JekoPay payment request and returns redirectUrl.
   * - When credentials are not yet configured: records a structured pending transaction (`mode: 'awaiting_keys'`) for non-production preview testing.
   */
  public async initiatePayment(params: JekoPayInitParams): Promise<JekoPayTransaction> {
    await this.ready;
    const now = new Date().toISOString();
    const txId = `jeko_${crypto.randomBytes(8).toString('hex')}`;
    const cleanPhone = (params.customerPhone || '').replace(/\s+/g, '');
    const roundedXof = Math.round(params.amount);

    if (!this.isConfigured() && process.env.NODE_ENV === 'production') {
      throw new Error('Paiement indisponible : les clés JekoPay de production ne sont pas configurées.');
    }

    if (!this.isConfigured()) {
      const awaitingTx: JekoPayTransaction = {
        id: txId,
        reference: params.reference,
        kind: params.kind,
        orderId: params.orderId,
        amount: roundedXof,
        currency: 'XOF',
        channel: params.channel,
        customerName: params.customerName,
        customerEmail: params.customerEmail.toLowerCase(),
        customerPhone: cleanPhone || undefined,
        status: 'INITIATED',
        environment: this.environment,
        mode: 'awaiting_keys',
        metadata: params.metadata,
        createdAt: now,
        updatedAt: now,
      };
      this.transactions.set(awaitingTx.reference, awaitingTx);
      await this.persistTransaction(awaitingTx);
      return awaitingTx;
    }

    const storeId = await this.resolveStoreId();
    const jekoMethod = JEKOPAY_METHOD_MAP[params.channel] || 'wave';

    // JekoPay expects amountCents in centimes (for XOF: 1 FCFA = 100 centimes)
    const amountCents = roundedXof * 100;

    const payload = {
      storeId,
      amountCents,
      currency: 'XOF',
      reference: params.reference,
      paymentDetails: {
        type: 'redirect',
        data: {
          paymentMethod: jekoMethod,
          successUrl: params.returnUrl,
          errorUrl: params.cancelUrl,
        },
      },
    };

    const response = await fetch(`${this.baseUrl}/partner_api/payment_requests`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          `Échec de l’initialisation du paiement JekoPay (${response.status}).`
      );
    }

    const redirectUrl =
      data?.redirectUrl ||
      data?.redirect_url ||
      data?.paymentUrl ||
      data?.payment_url ||
      data?.data?.redirectUrl ||
      undefined;

    const providerTransactionId = data?.id || data?.paymentRequestId || data?.data?.id || undefined;

    const safePaymentUrl =
      typeof redirectUrl === 'string' && /^https:\/\//i.test(redirectUrl)
        ? redirectUrl
        : undefined;

    const tx: JekoPayTransaction = {
      id: txId,
      reference: params.reference,
      providerTransactionId: providerTransactionId ? String(providerTransactionId) : undefined,
      kind: params.kind,
      orderId: params.orderId,
      amount: roundedXof,
      currency: 'XOF',
      channel: params.channel,
      customerName: params.customerName,
      customerEmail: params.customerEmail.toLowerCase(),
      customerPhone: cleanPhone || undefined,
      status: 'PENDING',
      paymentUrl: safePaymentUrl,
      environment: this.environment,
      mode: 'live',
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(tx.reference, tx);
    await this.persistTransaction(tx);
    return tx;
  }

  /**
   * Queries JekoPay server-side (GET /partner_api/payment_requests/{id}) for the authoritative status.
   */
  public async verifyTransactionStatus(reference: string): Promise<JekoPayTransaction | null> {
    const tx = this.getTransaction(reference);
    if (!tx) return null;

    if (tx.status === 'SUCCESS' || tx.mode !== 'live' || !this.isConfigured()) {
      return tx;
    }

    try {
      const lookupId = encodeURIComponent(tx.providerTransactionId || tx.reference);
      const response = await fetch(`${this.baseUrl}/partner_api/payment_requests/${lookupId}`, {
        method: 'GET',
        headers: this.buildHeaders(),
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const remoteStatus =
          data?.status ?? data?.transaction?.status ?? data?.data?.status;
        if (remoteStatus !== undefined) {
          const normalized = this.normalizeStatus(remoteStatus);
          tx.status = normalized;
          tx.updatedAt = new Date().toISOString();
          if (normalized === 'SUCCESS' && !tx.paidAt) {
            tx.paidAt = tx.updatedAt;
          }
          await this.persistTransaction(tx);
        }
      }
    } catch (err) {
      console.warn('[JekoPay] Status poll warning:', err);
    }

    return tx;
  }

  /**
   * Timing-safe HMAC-SHA256 verification for incoming JekoPay webhooks (`Jeko-Signature` header).
   * Always computed over the exact unparsed raw request body.
   */
  public verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    const secret = this.webhookSecret;
    if (!secret) {
      // Fail closed whenever the webhook secret is not configured
      return false;
    }
    if (!signatureHeader || !rawBody) return false;

    const cleanSig = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
    const expected = crypto
      .createHmac('sha256', secret)
      .update(rawBody, 'utf8')
      .digest('hex')
      .toLowerCase();

    const a = Buffer.from(cleanSig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  public async updateTransactionStatus(
    referenceOrProviderId: string,
    status: JekoPayTransactionStatus,
    providerTransactionId?: string
  ): Promise<JekoPayTransaction | null> {
    await this.ready;
    const tx = this.getTransaction(referenceOrProviderId);
    if (!tx) return null;

    // Never downgrade an already confirmed transaction
    if (tx.status === 'SUCCESS') return tx;

    tx.status = status;
    tx.updatedAt = new Date().toISOString();
    if (providerTransactionId) {
      tx.providerTransactionId = providerTransactionId;
    }
    if (status === 'SUCCESS' && !tx.paidAt) {
      tx.paidAt = tx.updatedAt;
    }
    await this.persistTransaction(tx);
    return tx;
  }
}

export const jekopayService = new JekoPayService();
