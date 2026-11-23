import type { SupabaseClient } from '@supabase/supabase-js';

export interface EmailSendResult {
  sent: boolean;
  provider: 'resend' | 'none';
  id?: string;
  reason?: string;
}

const DEFAULT_FROM = 'LUMARÉEL CO. <billets@lumareel.com>';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isResendConfigured(): boolean {
  return Boolean((process.env.RESEND_API_KEY || '').trim());
}

export function getResendFromAddress(): string {
  const custom = (process.env.RESEND_FROM_EMAIL || '').trim();
  return custom || DEFAULT_FROM;
}

async function logEmailToSupabase(
  db: SupabaseClient | null,
  record: {
    recipient: string;
    subject: string;
    type: string;
    orderRef?: string;
    status: string;
    providerId?: string;
  }
) {
  if (!db) return;
  try {
    await db.from('transactional_emails').insert({
      id: `eml_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipient: record.recipient,
      subject: record.subject,
      type: record.type,
      order_ref: record.orderRef || null,
      status: record.status,
      content_preview: record.providerId ? `Resend ID: ${record.providerId}` : record.subject,
      sent_at: new Date().toISOString(),
    });
  } catch {
    // Non-blocking audit log
  }
}

export async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  type: string;
  orderRef?: string;
  db?: SupabaseClient | null;
}): Promise<EmailSendResult> {
  const recipient = String(params.to || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(recipient)) {
    return { sent: false, provider: 'none', reason: 'Adresse e-mail destinataire invalide.' };
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    return {
      sent: false,
      provider: 'none',
      reason: 'RESEND_API_KEY non configurée dans les variables d’environnement serveur.',
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: getResendFromAddress(),
        to: [recipient],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    const raw = await response.text();
    const data = raw ? JSON.parse(raw) : {};

    if (!response.ok) {
      await logEmailToSupabase(params.db || null, {
        recipient,
        subject: params.subject,
        type: params.type,
        orderRef: params.orderRef,
        status: 'failed',
      });
      return {
        sent: false,
        provider: 'resend',
        reason: data?.message || `Erreur Resend HTTP ${response.status}`,
      };
    }

    await logEmailToSupabase(params.db || null, {
      recipient,
      subject: params.subject,
      type: params.type,
      orderRef: params.orderRef,
      status: 'sent',
      providerId: data?.id,
    });

    return {
      sent: true,
      provider: 'resend',
      id: data?.id,
    };
  } catch (error: any) {
    return {
      sent: false,
      provider: 'resend',
      reason: error?.message || 'Erreur réseau Resend.',
    };
  }
}

function wrapLumareelEmailLayout(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#050505;color:#efefef;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050505;padding:28px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0d0d0d;border:1px solid rgba(212,175,55,0.28);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:28px 24px 18px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:18px;letter-spacing:0.26em;font-weight:800;color:#ffffff;text-transform:uppercase;">LUMARÉEL CO.</div>
              <div style="font-size:11px;letter-spacing:0.2em;color:#d4af37;text-transform:uppercase;margin-top:6px;">Billetterie &amp; Expériences Live</div>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 24px;color:#e5e5e5;font-size:14px;line-height:1.65;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);font-size:11px;color:#888888;">
              LUMARÉEL CO. · Abidjan, Côte d’Ivoire · Infoline : +225 01 53 508 210
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendTicketConfirmationEmail(params: {
  to: string;
  customerName: string;
  orderReference: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  categoryName: string;
  totalAmount: number;
  currency?: string;
  tickets: Array<{ serialNumber: string; holderName: string }>;
  db?: SupabaseClient | null;
}): Promise<EmailSendResult> {
  const currency = params.currency || 'FCFA';
  const amountFormatted = `${Number(params.totalAmount || 0).toLocaleString('fr-FR')} ${currency}`;
  const subject = `Vos billets LUMARÉEL — ${params.eventTitle} (${params.orderReference})`;

  const ticketsHtml = params.tickets
    .map(
      (t, idx) =>
        `<li style="margin:6px 0;padding:10px 12px;background:#141414;border:1px solid rgba(255,255,255,0.1);border-radius:10px;">
          <strong style="color:#d4af37;">Billet ${idx + 1}</strong> ·
          <span style="font-family:monospace;color:#ffffff;">${escapeHtml(t.serialNumber)}</span>
          <div style="font-size:12px;color:#a3a3a3;margin-top:2px;">Titulaire : ${escapeHtml(t.holderName)}</div>
        </li>`
    )
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 14px;">Bonjour <strong>${escapeHtml(params.customerName)}</strong>,</p>
    <p style="margin:0 0 18px;">Votre commande <strong>${escapeHtml(params.orderReference)}</strong> est confirmée. Vos billets officiels sont disponibles dans votre espace <strong>Mes billets</strong> sur l’application LUMARÉEL.</p>
    <div style="background:#121212;border:1px solid rgba(212,175,55,0.22);border-radius:14px;padding:16px;margin:18px 0;">
      <div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:6px;">${escapeHtml(params.eventTitle)}</div>
      <div style="font-size:13px;color:#cccccc;">Date : ${escapeHtml(params.eventDate)}</div>
      <div style="font-size:13px;color:#cccccc;">Lieu : ${escapeHtml(params.eventVenue)}</div>
      <div style="font-size:13px;color:#cccccc;">Catégorie : ${escapeHtml(params.categoryName)}</div>
      <div style="font-size:13px;color:#d4af37;font-weight:700;margin-top:8px;">Montant réglé : ${escapeHtml(amountFormatted)}</div>
    </div>
    <ul style="list-style:none;padding:0;margin:16px 0;">${ticketsHtml}</ul>
    <p style="margin:18px 0 0;font-size:12px;color:#999999;">Présentez le QR code de votre billet directement depuis votre téléphone à l’entrée du concert.</p>
  `;

  const text = [
    `Bonjour ${params.customerName},`,
    ``,
    `Votre commande ${params.orderReference} pour ${params.eventTitle} est confirmée.`,
    `Date : ${params.eventDate}`,
    `Lieu : ${params.eventVenue}`,
    `Catégorie : ${params.categoryName}`,
    `Montant réglé : ${amountFormatted}`,
    ``,
    `Billets :`,
    ...params.tickets.map((t, i) => `- Billet ${i + 1}: ${t.serialNumber} (${t.holderName})`),
    ``,
    `Retrouvez vos QR codes dans l'application LUMARÉEL CO.`,
  ].join('\n');

  return sendResendEmail({
    to: params.to,
    subject,
    html: wrapLumareelEmailLayout(subject, bodyHtml),
    text,
    type: 'ticket_confirmation',
    orderRef: params.orderReference,
    db: params.db,
  });
}

export async function sendBlackCardActivationEmail(params: {
  to: string;
  cardholderName: string;
  cardNumber: string;
  expiresAt: string;
  orderReference?: string;
  db?: SupabaseClient | null;
}): Promise<EmailSendResult> {
  const subject = `Bienvenue au Club — Votre LUMARÉEL Black Card (${params.cardNumber})`;
  const expiresFormatted = (() => {
    try {
      return new Date(params.expiresAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return params.expiresAt;
    }
  })();

  const bodyHtml = `
    <p style="margin:0 0 14px;">Bonjour <strong>${escapeHtml(params.cardholderName)}</strong>,</p>
    <p style="margin:0 0 18px;">Félicitations ! Votre <strong>LUMARÉEL Black Card</strong> est activée. Tous vos accès privilégiés sont disponibles dès maintenant dans votre application.</p>
    <div style="background:linear-gradient(135deg,#171717,#0a0a0a);border:1px solid rgba(212,175,55,0.45);border-radius:16px;padding:18px;margin:18px 0;">
      <div style="font-size:11px;letter-spacing:0.2em;color:#d4af37;text-transform:uppercase;">LUMARÉEL BLACK CARD</div>
      <div style="font-size:20px;font-weight:800;color:#ffffff;font-family:monospace;margin:8px 0;">${escapeHtml(params.cardNumber)}</div>
      <div style="font-size:13px;color:#d4d4d4;">Titulaire : <strong>${escapeHtml(params.cardholderName)}</strong></div>
      <div style="font-size:12px;color:#a3a3a3;margin-top:4px;">Valable jusqu’au ${escapeHtml(expiresFormatted)} (3 ans)</div>
    </div>
    <p style="margin:0;font-size:13px;color:#cccccc;">Votre carte physique noire LUMARÉEL est en cours de préparation et sera livrée en moins de 24h.</p>
  `;

  const text = [
    `Bonjour ${params.cardholderName},`,
    ``,
    `Votre LUMARÉEL Black Card est désormais active !`,
    `Référence membre : ${params.cardNumber}`,
    `Validité : jusqu'au ${expiresFormatted} (3 ans)`,
    `Livraison de votre carte physique : en moins de 24h.`,
    ``,
    `LUMARÉEL CO.`,
  ].join('\n');

  return sendResendEmail({
    to: params.to,
    subject,
    html: wrapLumareelEmailLayout(subject, bodyHtml),
    text,
    type: 'black_card_activation',
    orderRef: params.orderReference || params.cardNumber,
    db: params.db,
  });
}

export async function sendTicketTransferEmail(params: {
  to: string;
  recipientName: string;
  senderName: string;
  eventTitle: string;
  eventDate: string;
  eventVenue: string;
  categoryName: string;
  serialNumber: string;
  db?: SupabaseClient | null;
}): Promise<EmailSendResult> {
  const subject = `${params.senderName} vous a transféré un billet — ${params.eventTitle}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Bonjour <strong>${escapeHtml(params.recipientName)}</strong>,</p>
    <p style="margin:0 0 18px;"><strong>${escapeHtml(params.senderName)}</strong> vient de vous transférer un billet officiel LUMARÉEL. L’ancien billet a été révoqué et un nouveau QR code unique a été émis à votre nom.</p>
    <div style="background:#121212;border:1px solid rgba(212,175,55,0.25);border-radius:14px;padding:16px;margin:18px 0;">
      <div style="font-size:16px;font-weight:700;color:#ffffff;margin-bottom:6px;">${escapeHtml(params.eventTitle)}</div>
      <div style="font-size:13px;color:#cccccc;">Date : ${escapeHtml(params.eventDate)}</div>
      <div style="font-size:13px;color:#cccccc;">Lieu : ${escapeHtml(params.eventVenue)}</div>
      <div style="font-size:13px;color:#cccccc;">Catégorie : ${escapeHtml(params.categoryName)}</div>
      <div style="font-size:13px;color:#d4af37;font-family:monospace;margin-top:8px;">N° de série : ${escapeHtml(params.serialNumber)}</div>
    </div>
    <p style="margin:0;font-size:13px;color:#cccccc;">Connectez-vous sur l’application LUMARÉEL avec cette adresse e-mail pour afficher votre billet et son QR code.</p>
  `;

  const text = [
    `Bonjour ${params.recipientName},`,
    ``,
    `${params.senderName} vous a transféré un billet pour ${params.eventTitle}.`,
    `Date : ${params.eventDate}`,
    `Lieu : ${params.eventVenue}`,
    `Catégorie : ${params.categoryName}`,
    `N° de série : ${params.serialNumber}`,
    ``,
    `Connectez-vous sur LUMARÉEL CO. avec cette adresse e-mail pour accéder à votre billet.`,
  ].join('\n');

  return sendResendEmail({
    to: params.to,
    subject,
    html: wrapLumareelEmailLayout(subject, bodyHtml),
    text,
    type: 'ticket_transfer',
    orderRef: params.serialNumber,
    db: params.db,
  });
}
