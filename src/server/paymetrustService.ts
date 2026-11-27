import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type PayMeTrustChannel =
  | 'wave'
  | 'orange_money'
  | 'mtn_momo'
  | 'moov_money'
  | 'djamo'
  | 'card';

export type PayMeTrustTransactionKind = 'ticket_order' | 'membership_card' | 'tv_pass';

export type PayMeTrustTransactionStatus =
  | 'INITIATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED';

export interface PayMeTrustTransaction {
  id: string;
  reference: string;
  providerTransactionId?: string;
  kind: PayMeTrustTransactionKind;
  orderId: string;
  amount: number;
  currency: 'XOF';
  channel: PayMeTrustChannel;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: PayMeTrustTransactionStatus;
  paymentUrl?: string;
  environment: 'sandbox' | 'production';
  mode: 'live' | 'awaiting_keys';
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface PayMeTrustInitParams {
  kind: PayMeTrustTransactionKind;
  orderId: string;
  reference: string;
  amount: number;
  description: string;
  channel: PayMeTrustChannel;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  metadata?: Record<string, unknown>;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const TX_FILE = path.join(DATA_DIR, 'paymetrust_transactions.json');

const PAYMETRUST_CHANNEL_MAP: Record<PayMeTrustChannel, string> = {
  wave: 'WAVE_CI',
  orange_money: 'OM_CI',
  mtn_momo: 'MOMO_CI',
  moov_money: 'FLOOZ_CI',
  djamo: 'CARD',
  card: 'CARD',
};

const PAYMETRUST_SUCCESS_CODES = new Set(['100', '200', 'SUCCESS', 'COMPLETED', 'PAID', 'SUCCEEDED']);
const PAYMETRUST_PENDING_CODES = new Set(['2001', '2002', 'INITIATED', 'PENDING', 'PROCESSING']);
const PAYMETRUST_EXPIRED_CODES = new Set(['2003', '2319', 'EXPIRED', 'TIMEOUT']);

class PayMeTrustService {
  private transactions: Map<string, PayMeTrustTransaction> = new Map();
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor() {
    this.loadFromDisk();
  }

  private get environment(): 'sandbox' | 'production' {
    return (process.env.PAYMETRUST_ENV || 'sandbox').toLowerCase() === 'production'
      ? 'production'
      : 'sandbox';
  }

  private get baseUrl(): string {
    const custom = (process.env.PAYMETRUST_BASE_URL || '').trim();
    if (custom) {
      return custom.replace(/\/+$/, '');
    }
    return this.environment === 'production'
      ? 'https://api.paymetrust.net/v1'
      : 'https://api.sandbox.paymetrust.net/v1';
  }

  private get apiKey(): string {
    return (process.env.PAYMETRUST_API_KEY || '').trim();
  }

  private get secretKey(): string {
    return (process.env.PAYMETRUST_SECRET_KEY || '').trim();
  }

  private get merchantId(): string {
    return (process.env.PAYMETRUST_MERCHANT_ID || '').trim();
  }

  private get webhookSecret(): string {
    return (process.env.PAYMETRUST_WEBHOOK_SECRET || process.env.PAYMETRUST_SECRET_KEY || '').trim();
  }

  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.secretKey);
  }

  public getPublicConfig() {
    return {
      provider: 'paymetrust',
      configured: this.isConfigured(),
      environment: this.environment,
      currency: 'XOF',
      channels: [
        { id: 'wave', label: 'Wave', type: 'mobile_money' },
        { id: 'orange_money', label: 'Orange Money', type: 'mobile_money' },
        { id: 'mtn_momo', label: 'MTN MoMo', type: 'mobile_money' },
        { id: 'moov_money', label: 'Moov Money', type: 'mobile_money' },
        { id: 'card', label: 'Visa / Mastercard', type: 'card' },
      ],
    };
  }

  private loadFromDisk() {
    try {
      if (!fs.existsSync(TX_FILE)) return;
      const raw = fs.readFileSync(TX_FILE, 'utf-8');
      const list: PayMeTrustTransaction[] = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const tx of list) {
          if (tx?.reference) {
            this.transactions.set(tx.reference, tx);
          }
        }
      }
    } catch (err) {
      console.warn('[PayMeTrust] Unable to load transaction cache:', err);
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
      console.warn('[PayMeTrust] Unable to persist transaction cache:', err);
    }
  }

  public getTransaction(reference: string): PayMeTrustTransaction | undefined {
    return this.transactions.get(reference);
  }

  public getAllTransactions(): PayMeTrustTransaction[] {
    return Array.from(this.transactions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public normalizeStatus(rawStatus: unknown): PayMeTrustTransactionStatus {
    const val = String(rawStatus ?? '').trim().toUpperCase();
    if (PAYMETRUST_SUCCESS_CODES.has(val)) return 'SUCCESS';
    if (PAYMETRUST_EXPIRED_CODES.has(val)) return 'EXPIRED';
    if (PAYMETRUST_PENDING_CODES.has(val)) return 'PENDING';
    return 'FAILED';
  }

  /**
   * Authenticates with PayMeTrust OAuth endpoint (POST /v1/oauth/login)
   * and caches the Bearer access_token in memory until near expiry.
   */
  private async authenticate(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('PayMeTrust API credentials are not configured.');
    }

    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedAccessToken;
    }

    const response = await fetch(`${this.baseUrl}/oauth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        api_password: this.secretKey,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) {
      throw new Error(
        data?.message || data?.error || `PayMeTrust OAuth authentication failed (${response.status}).`
      );
    }

    const ttlSeconds = Number(data.expires_in || 3300);
    this.cachedAccessToken = String(data.access_token);
    this.tokenExpiresAt = Date.now() + Math.max(60, ttlSeconds - 120) * 1000;
    return this.cachedAccessToken;
  }

  /**
   * Initiates a PayMeTrust payment session.
   * - When PAYMETRUST_API_KEY & PAYMETRUST_SECRET_KEY are set: executes the live PayMeTrust OAuth + Web Payment request.
   * - When keys are not yet configured: records a structured pending transaction (`mode: 'awaiting_keys'`) so checkout remains testable until keys are provided.
   */
  public async initiatePayment(params: PayMeTrustInitParams): Promise<PayMeTrustTransaction> {
    const now = new Date().toISOString();
    const txId = `pmt_${crypto.randomBytes(8).toString('hex')}`;
    const cleanPhone = (params.customerPhone || '').replace(/\s+/g, '');

    if (!this.isConfigured()) {
      const awaitingTx: PayMeTrustTransaction = {
        id: txId,
        reference: params.reference,
        kind: params.kind,
        orderId: params.orderId,
        amount: Math.round(params.amount),
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
      this.saveToDisk();
      return awaitingTx;
    }

    const accessToken = await this.authenticate();

    const payload = {
      merchant_id: this.merchantId || undefined,
      reference: params.reference,
      amount: Math.round(params.amount),
      currency: 'XOF',
      description: params.description,
      payment_method: PAYMETRUST_CHANNEL_MAP[params.channel] || 'WAVE_CI',
      client_name: params.customerName,
      client_email: params.customerEmail.toLowerCase(),
      client_phone_number: cleanPhone || undefined,
      notify_url: params.notifyUrl,
      return_url: params.returnUrl,
      cancel_url: params.cancelUrl,
    };

    const response = await fetch(`${this.baseUrl}/payments/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        data?.message || data?.error || `PayMeTrust payment initialization failed (${response.status}).`
      );
    }

    const paymentUrl =
      data?.payment_url ||
      data?.data?.payment_url ||
      data?.checkout_url ||
      data?.redirect_url ||
      undefined;

    const providerTransactionId =
      data?.transaction_id ||
      data?.data?.transaction_id ||
      data?.id ||
      undefined;

    const tx: PayMeTrustTransaction = {
      id: txId,
      reference: params.reference,
      providerTransactionId: providerTransactionId ? String(providerTransactionId) : undefined,
      kind: params.kind,
      orderId: params.orderId,
      amount: Math.round(params.amount),
      currency: 'XOF',
      channel: params.channel,
      customerName: params.customerName,
      customerEmail: params.customerEmail.toLowerCase(),
      customerPhone: cleanPhone || undefined,
      status: 'INITIATED',
      paymentUrl: typeof paymentUrl === 'string' && /^https?:\/\//i.test(paymentUrl) ? paymentUrl : undefined,
      environment: this.environment,
      mode: 'live',
      metadata: params.metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.transactions.set(tx.reference, tx);
    this.saveToDisk();
    return tx;
  }

  /**
   * Queries PayMeTrust server-side for the authoritative status of a live transaction.
   */
  public async verifyTransactionStatus(reference: string): Promise<PayMeTrustTransaction | null> {
    const tx = this.transactions.get(reference);
    if (!tx) return null;

    if (tx.status === 'SUCCESS' || tx.mode !== 'live' || !this.isConfigured()) {
      return tx;
    }

    try {
      const accessToken = await this.authenticate();
      const lookupId = encodeURIComponent(tx.providerTransactionId || tx.reference);
      const response = await fetch(`${this.baseUrl}/payments/${lookupId}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const remoteStatus = data?.status ?? data?.code ?? data?.data?.status;
        if (remoteStatus !== undefined) {
          const normalized = this.normalizeStatus(remoteStatus);
          tx.status = normalized;
          tx.updatedAt = new Date().toISOString();
          if (normalized === 'SUCCESS' && !tx.paidAt) {
            tx.paidAt = tx.updatedAt;
          }
          this.saveToDisk();
        }
      }
    } catch (err) {
      console.warn('[PayMeTrust] Status poll warning:', err);
    }

    return tx;
  }

  /**
   * Timing-safe HMAC-SHA256 verification for incoming PayMeTrust webhooks.
   */
  public verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    const secret = this.webhookSecret;
    if (!secret) {
      // Fail closed in production if no webhook secret is configured
      return this.environment !== 'production';
    }
    if (!signatureHeader || !rawBody) return false;

    const cleanSig = signatureHeader.replace(/^sha256=/i, '').trim();
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    const a = Buffer.from(cleanSig, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  public updateTransactionStatus(
    reference: string,
    status: PayMeTrustTransactionStatus,
    providerTransactionId?: string
  ): PayMeTrustTransaction | null {
    const tx = this.transactions.get(reference);
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
    this.saveToDisk();
    return tx;
  }
}

export const paymetrustService = new PayMeTrustService();
