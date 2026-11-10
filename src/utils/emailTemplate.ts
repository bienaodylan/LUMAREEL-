import { Order, Ticket, TransactionalEmail } from '../types';

export interface EmailEventInfo {
  id?: string;
  title: string;
  artist: string;
  date: string;
  time: string;
  doorsOpen?: string;
  venue: string;
  city?: string;
  officialPoster?: string;
  bannerImage?: string;
  infoline?: string;
}

export interface PersonalizedEmailResult {
  id: string;
  recipient: string;
  subject: string;
  type: 'ticket_confirmation';
  orderRef: string;
  status: 'sent';
  timestamp: string;
  contentPreview: string;
  htmlContent: string;
  customerName: string;
  eventTitle: string;
  artistName: string;
  totalAmount: number;
  currency: string;
  ticketsCount: number;
}

function formatDateFr(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function generatePersonalizedTicketEmail(
  order: Order,
  event: EmailEventInfo,
  tickets: Ticket[]
): PersonalizedEmailResult {
  const formattedDate = formatDateFr(event.date);
  const formattedAmount = `${Number(order.totalAmount || 0).toLocaleString('fr-FR')} ${order.currency || 'FCFA'}`;
  const subject = `Confirmation de commande ${order.reference} — ${event.artist} : ${event.title}`;
  const eventBanner = event.bannerImage || event.officialPoster || '';
  const customerName = order.customerName || 'Client';

  const contentPreview = [
    `Bonjour ${customerName},`,
    ``,
    `Votre commande n° ${order.reference} pour le concert de ${event.artist} (« ${event.title} ») est validée.`,
    `Lieu : ${event.venue}${event.city ? `, ${event.city}` : ''}`,
    `Date : ${formattedDate} à ${event.time} (Ouverture des portes : ${event.doorsOpen || '18:30'})`,
    `Formule : ${order.categoryName || tickets[0]?.categoryName || 'Standard'} (Quantité : ${order.quantity} billet(s))`,
    `Montant réglé : ${formattedAmount}`,
    ``,
    `BILLETS CERTIFIÉS (${tickets.length}) :`,
    ...tickets.map(
      (t, idx) =>
        `• Billet ${idx + 1}/${tickets.length} : ${t.serialNumber} — Titulaire : ${t.holderName} (Code sécurisé : ${t.token})`
    ),
    ``,
    `Présentez vos billets au contrôle d'accès sur votre smartphone ou imprimés au format A4.`,
    `Assistance & Conciergerie LUMARÉEL CO. : ${event.infoline || '+225 01 53 508 210'}.`,
  ].join('\n');

  const htmlContent = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #050505;
      color: #efefef;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
    }
    .wrapper {
      width: 100%;
      max-width: 620px;
      margin: 0 auto;
      padding: 30px 20px;
    }
    .card {
      background: #0d0d0d;
      border: 1px solid rgba(212, 175, 55, 0.25);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
    }
    .header {
      padding: 32px 24px 20px 24px;
      text-align: center;
      background: linear-gradient(180deg, rgba(212, 175, 55, 0.08) 0%, rgba(13, 13, 13, 0) 100%);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .logo {
      height: 26px;
      max-width: 220px;
      object-fit: contain;
      margin-bottom: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: rgba(212, 175, 55, 0.15);
      border: 1px solid rgba(212, 175, 55, 0.4);
      color: #d4af37;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      border-radius: 50px;
    }
    .content {
      padding: 32px 24px;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 10px;
    }
    .intro {
      font-size: 13px;
      color: #a0a0a0;
      margin-bottom: 24px;
    }
    .event-card {
      background: #141414;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      padding: 20px;
      margin-bottom: 24px;
    }
    .event-artist {
      font-size: 11px;
      color: #d4af37;
      font-weight: 700;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .event-title {
      font-size: 18px;
      font-weight: 800;
      color: #ffffff;
      text-transform: uppercase;
      margin-bottom: 14px;
      letter-spacing: -0.01em;
    }
    .event-details {
      display: table;
      width: 100%;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 14px;
      font-size: 12px;
    }
    .event-row {
      display: table-row;
    }
    .event-label {
      display: table-cell;
      color: #777777;
      padding-bottom: 8px;
      width: 40%;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.05em;
    }
    .event-val {
      display: table-cell;
      color: #ffffff;
      font-weight: 600;
      padding-bottom: 8px;
    }
    .order-summary {
      background: #101010;
      border-left: 3px solid #d4af37;
      border-radius: 0 12px 12px 0;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 12px;
    }
    .ticket-list {
      margin-bottom: 24px;
    }
    .ticket-item {
      background: #121212;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 16px;
      margin-bottom: 10px;
    }
    .ticket-serial {
      font-size: 13px;
      font-weight: 800;
      color: #ffffff;
      font-family: monospace;
      letter-spacing: 0.05em;
    }
    .ticket-meta {
      font-size: 11px;
      color: #888888;
      margin-top: 4px;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      background: #ffffff;
      color: #000000;
      text-align: center;
      padding: 14px 20px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      text-decoration: none;
      border-radius: 50px;
      margin-bottom: 12px;
    }
    .security-notice {
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(255, 255, 255, 0.15);
      border-radius: 14px;
      padding: 16px;
      font-size: 11px;
      color: #888888;
      margin-top: 24px;
    }
    .footer {
      text-align: center;
      padding: 24px 20px;
      font-size: 11px;
      color: #555555;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.25em; color: #ffffff; text-transform: uppercase; margin-bottom: 8px;">
          LUMARÉEL <span style="color: #d4af37;">CO.</span>
        </div>
        <div class="badge">Confirmation officielle &amp; Billetterie certifiée</div>
      </div>

      <div class="content">
        <div class="greeting">Bonjour ${customerName},</div>
        <div class="intro">
          Votre commande <strong>${order.reference}</strong> a été enregistrée avec succès. Vos billets d’accès certifiés sont prêts et téléchargeables ci-dessous.
        </div>

        <div class="event-card">
          <div class="event-artist">${event.artist}</div>
          <div class="event-title">${event.title}</div>
          <div class="event-details">
            <div class="event-row">
              <div class="event-label">Date du concert</div>
              <div class="event-val" style="color: #d4af37;">${formattedDate}</div>
            </div>
            <div class="event-row">
              <div class="event-label">Heure du spectacle</div>
              <div class="event-val">${event.time} (Portes : ${event.doorsOpen || '18:30'})</div>
            </div>
            <div class="event-row">
              <div class="event-label">Lieu &amp; Ville</div>
              <div class="event-val">${event.venue}${event.city ? `, ${event.city}` : ''}</div>
            </div>
          </div>
        </div>

        <div class="order-summary">
          <div style="font-weight: 700; color: #d4af37; text-transform: uppercase; font-size: 10px; margin-bottom: 8px; letter-spacing: 0.1em;">
            RÉCAPITULATIF DE LA COMMANDE
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Référence :</span> <strong style="color: #fff; font-family: monospace;">${order.reference}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Formule :</span> <span style="color: #fff;">${order.categoryName || tickets[0]?.categoryName || 'Standard'}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Nombre de billets :</span> <span style="color: #fff;">${order.quantity}</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 6px; margin-top: 6px;">
            <span style="font-weight: 700; color: #fff;">Total réglé :</span>
            <strong style="color: #d4af37; font-size: 14px;">${formattedAmount}</strong>
          </div>
        </div>

        <div class="ticket-list">
          <div style="font-size: 10px; font-weight: 700; color: #777; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 12px;">
            BILLETS INDIVIDUELS ÉMIS (${tickets.length})
          </div>
          ${tickets
            .map(
              (t, idx) => `
            <div class="ticket-item">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="ticket-serial">${t.serialNumber}</div>
                <div style="font-size: 9px; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 20px; text-transform: uppercase;">
                  CERTIFIÉ SÉCURISÉ
                </div>
              </div>
              <div class="ticket-meta">
                Titulaire : <strong style="color: #ddd;">${t.holderName}</strong> · Catégorie : ${t.categoryName}
              </div>
              <div style="font-size: 10px; color: #666; font-family: monospace; margin-top: 4px; word-break: break-all;">
                Jeton : ${t.token}
              </div>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="security-notice">
          <strong style="color: #fff; text-transform: uppercase; display: block; margin-bottom: 4px;">CONSIGNES D'ACCÈS AU CONCERT</strong>
          • Présentez chaque QR code sur votre téléphone avec une luminosité maximale ou imprimé au format A4.<br>
          • Une pièce d’identité peut être requise lors du contrôle d'accès.<br>
          • Chaque billet comporte un QR code officiel certifié à usage unique.
        </div>
      </div>
    </div>

    <div class="footer">
      LUMARÉEL CO. — Agence de AREEL GROUPE, spécialisée dans l’Organisation et la Promotion d’Événements Festifs.<br>
      Abidjan, Côte d'Ivoire · Infoline : ${event.infoline || '+225 01 53 508 210'} · conciergerie@lumareel.co
    </div>
  </div>
</body>
</html>
  `.trim();

  return {
    id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    recipient: order.customerEmail,
    subject,
    type: 'ticket_confirmation',
    orderRef: order.reference,
    status: 'sent',
    timestamp: new Date().toISOString(),
    contentPreview,
    htmlContent,
    customerName,
    eventTitle: event.title,
    artistName: event.artist,
    totalAmount: order.totalAmount,
    currency: order.currency,
    ticketsCount: tickets.length,
  };
}
