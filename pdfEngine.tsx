import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface PaperFormat {
  name: string;
  widthMm: number;
  heightMm: number;
}

/** Format physique officiel LUMARÉEL. Ne pas modifier sans décision produit. */
export const TICKET_WIDTH_MM = 153.6;
export const TICKET_HEIGHT_MM = 54.8;

/** Marges de sécurité et espace entre billets, en millimètres. */
export const PRINT_SAFE_MARGIN_MM = 5;
export const TICKET_GAP_MM = 2;

/** Les dimensions sont les dimensions ISO usuelles, en portrait. */
export const SYSTEM_PAPER_FORMATS: Record<string, PaperFormat> = {
  A1: { name: 'A1', widthMm: 594, heightMm: 841 },
  A2: { name: 'A2', widthMm: 420, heightMm: 594 },
  A3: { name: 'A3', widthMm: 297, heightMm: 420 },
  A4: { name: 'A4', widthMm: 210, heightMm: 297 },
  A5: { name: 'A5', widthMm: 148, heightMm: 210 },
  A6: { name: 'A6', widthMm: 105, heightMm: 148 },
  B1: { name: 'B1', widthMm: 707, heightMm: 1000 },
  B2: { name: 'B2', widthMm: 500, heightMm: 707 },
  B3: { name: 'B3', widthMm: 353, heightMm: 500 },
  B4: { name: 'B4', widthMm: 250, heightMm: 353 },
  B5: { name: 'B5', widthMm: 176, heightMm: 250 },
  SRA2: { name: 'SRA2', widthMm: 450, heightMm: 640 },
  SRA3: { name: 'SRA3', widthMm: 320, heightMm: 450 },
  'A3+': { name: 'A3+', widthMm: 329, heightMm: 483 },
};

export interface PrintTicketItem {
  id: string;
  serialNumber: string;
  token: string;
  categoryName: string;
  price: number;
  artist: string;
  venue: string;
  dateStr: string;
  ticketDesignUrl: string;
}

export interface TicketPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

export interface ProductionLayout {
  paper: PaperFormat;
  marginMm: number;
  gapMm: number;
  columns: number;
  rows: number;
  ticketsPerPage: number;
  totalPages: number;
  rotated: boolean;
  placements: TicketPlacement[];
}

interface LayoutCandidate {
  columns: number;
  rows: number;
  count: number;
  rotated: boolean;
  ticketWidth: number;
  ticketHeight: number;
  startX: number;
  startY: number;
}

function buildCandidate(
  paper: PaperFormat,
  rotated: boolean,
  marginMm: number,
  gapMm: number
): LayoutCandidate {
  const ticketWidth = rotated ? TICKET_HEIGHT_MM : TICKET_WIDTH_MM;
  const ticketHeight = rotated ? TICKET_WIDTH_MM : TICKET_HEIGHT_MM;
  const usableWidth = paper.widthMm - marginMm * 2;
  const usableHeight = paper.heightMm - marginMm * 2;

  const columns = Math.max(0, Math.floor((usableWidth + gapMm) / (ticketWidth + gapMm)));
  const rows = Math.max(0, Math.floor((usableHeight + gapMm) / (ticketHeight + gapMm)));
  const count = columns * rows;
  const gridWidth = count ? columns * ticketWidth + (columns - 1) * gapMm : 0;
  const gridHeight = count ? rows * ticketHeight + (rows - 1) * gapMm : 0;

  return {
    columns,
    rows,
    count,
    rotated,
    ticketWidth,
    ticketHeight,
    startX: Math.max(marginMm, (paper.widthMm - gridWidth) / 2),
    startY: Math.max(marginMm, (paper.heightMm - gridHeight) / 2),
  };
}

/** Calcule la grille la plus productive entre billets droits et tournés à 90°. */
export function createProductionLayout(
  paper: PaperFormat,
  ticketCount: number,
  marginMm = PRINT_SAFE_MARGIN_MM,
  gapMm = TICKET_GAP_MM
): ProductionLayout {
  if (!Number.isFinite(paper.widthMm) || !Number.isFinite(paper.heightMm) || paper.widthMm <= 0 || paper.heightMm <= 0) {
    throw new Error('Dimensions du papier invalides.');
  }
  if (ticketCount < 1) throw new Error('La quantité de billets doit être supérieure à zéro.');

  const normal = buildCandidate(paper, false, marginMm, gapMm);
  const rotated = buildCandidate(paper, true, marginMm, gapMm);
  // En cas d'égalité, conserver l'orientation horizontale habituelle du billet.
  const best = rotated.count > normal.count ? rotated : normal;
  if (best.count < 1) {
    throw new Error(`Aucun billet de ${TICKET_WIDTH_MM} × ${TICKET_HEIGHT_MM} mm ne tient sur ce papier avec une marge de ${marginMm} mm.`);
  }

  const placements: TicketPlacement[] = [];
  for (let row = 0; row < best.rows; row++) {
    for (let col = 0; col < best.columns; col++) {
      placements.push({
        x: best.startX + col * (best.ticketWidth + gapMm),
        y: best.startY + row * (best.ticketHeight + gapMm),
        width: best.ticketWidth,
        height: best.ticketHeight,
        rotated: best.rotated,
      });
    }
  }

  return {
    paper,
    marginMm,
    gapMm,
    columns: best.columns,
    rows: best.rows,
    ticketsPerPage: best.count,
    totalPages: Math.ceil(ticketCount / best.count),
    rotated: best.rotated,
    placements,
  };
}

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const header = dataUrl.slice(0, 100).toLowerCase();
  if (header.startsWith('data:image/png')) return 'PNG';
  if (header.startsWith('data:image/webp')) return 'WEBP';
  if (header.startsWith('data:image/jpeg') || header.startsWith('data:image/jpg')) return 'JPEG';
  // Les URL distantes sans extension MIME connue sont souvent des JPEG.
  return 'JPEG';
}

function drawCropMarks(pdf: jsPDF, p: TicketPlacement) {
  const mark = 0.7;
  const offset = 0.3;
  pdf.setDrawColor(95, 95, 95);
  pdf.setLineWidth(0.12);

  const left = p.x;
  const top = p.y;
  const right = p.x + p.width;
  const bottom = p.y + p.height;

  // Petits traits à l'extérieur du billet, sans traverser le visuel.
  pdf.line(left - offset - mark, top, left - offset, top);
  pdf.line(left, top - offset - mark, left, top - offset);
  pdf.line(right + offset, top, right + offset + mark, top);
  pdf.line(right, top - offset - mark, right, top - offset);
  pdf.line(left - offset - mark, bottom, left - offset, bottom);
  pdf.line(left, bottom + offset, left, bottom + offset + mark);
  pdf.line(right + offset, bottom, right + offset + mark, bottom);
  pdf.line(right, bottom + offset, right, bottom + offset + mark);
}

function addRectoImage(pdf: jsPDF, ticket: PrintTicketItem, placement: TicketPlacement) {
  const format = getImageFormat(ticket.ticketDesignUrl);
  // L'image conserve son ratio natif : elle est contenue dans le format du billet.
  // Si son ratio diffère du ratio officiel, le fond blanc reste visible autour.
  const imageProps = pdf.getImageProperties(ticket.ticketDesignUrl);
  const sourceRatio = imageProps.width / imageProps.height;
  const targetRatio = TICKET_WIDTH_MM / TICKET_HEIGHT_MM;
  let imageWidth = TICKET_WIDTH_MM;
  let imageHeight = TICKET_HEIGHT_MM;
  if (sourceRatio > targetRatio) {
    imageHeight = imageWidth / sourceRatio;
  } else {
    imageWidth = imageHeight * sourceRatio;
  }

  const localX = (TICKET_WIDTH_MM - imageWidth) / 2;
  const localY = (TICKET_HEIGHT_MM - imageHeight) / 2;
  pdf.setFillColor(255, 255, 255);

  if (!placement.rotated) {
    pdf.rect(placement.x, placement.y, placement.width, placement.height, 'F');
    pdf.addImage(
      ticket.ticketDesignUrl,
      format,
      placement.x + localX,
      placement.y + localY,
      imageWidth,
      imageHeight,
      undefined,
      'FAST'
    );
  } else {
    // Le visuel est tourné autour de son centre : ses dimensions natives ne sont pas étirées.
    pdf.rect(placement.x, placement.y, placement.width, placement.height, 'F');
    const rotatedBoundsX = placement.x + (TICKET_HEIGHT_MM - localY - imageHeight);
    const rotatedBoundsY = placement.y + localX;
    // jsPDF tourne l'image autour de son centre : on lui passe le coin supérieur
    // gauche du rectangle non tourné ayant exactement le même centre.
    const rotatedX = rotatedBoundsX + (imageHeight - imageWidth) / 2;
    const rotatedY = rotatedBoundsY + (imageWidth - imageHeight) / 2;
    pdf.addImage(
      ticket.ticketDesignUrl,
      format,
      rotatedX,
      rotatedY,
      imageWidth,
      imageHeight,
      undefined,
      'FAST',
      90
    );
  }
}

function drawVerso(pdf: jsPDF, ticket: PrintTicketItem, placement: TicketPlacement, qrDataUrl?: string) {
  const x = placement.x;
  const y = placement.y;
  const rotated = placement.rotated;

  pdf.setFillColor(255, 255, 255);
  pdf.rect(x, y, placement.width, placement.height, 'F');
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(0.2);
  pdf.rect(x, y, placement.width, placement.height, 'S');

  // Coordonnées locales dans le billet officiel, converties si le billet est tourné.
  const point = (localX: number, localY: number) => rotated
    ? { x: x + TICKET_HEIGHT_MM - localY, y: y + localX }
    : { x: x + localX, y: y + localY };

  const write = (value: string, localX: number, localY: number, size: number, bold = false) => {
    const pos = point(localX, localY);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.text(value, pos.x, pos.y, rotated ? { angle: 90 } : undefined);
  };

  write(`${ticket.artist} EN CONCERT`, 5, 7, 8.5, true);
  write(`CATÉGORIE : ${ticket.categoryName} — ${ticket.price.toLocaleString('fr-FR')} FCFA`, 5, 12, 6.5);
  write(`LIEU : ${ticket.venue} · ${ticket.dateStr}`, 5, 16.5, 6.5);
  write('• Billet individuel strict. L’entrée aux portes invalide le jeton.', 5, 42, 5.5);
  write('• Contrôle d’accès officiel et régie : LUMARÉEL CO.', 5, 46, 5.5);

  const serial = point(5, 51);
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(6.5);
  pdf.text(`SÉRIE : ${ticket.serialNumber}`, serial.x, serial.y, rotated ? { angle: 90 } : undefined);

  const qrLocalX = TICKET_WIDTH_MM - 34;
  const qrLocalY = 4;
  if (qrDataUrl) {
    if (!rotated) {
      pdf.addImage(qrDataUrl, 'PNG', x + qrLocalX, y + qrLocalY, 30, 30);
    } else {
      const qrPos = point(qrLocalX, qrLocalY + 30);
      pdf.addImage(qrDataUrl, 'PNG', qrPos.x, qrPos.y, 30, 30, undefined, 'FAST', 90);
    }
  }
}

export async function generateProductionPDF(
  tickets: PrintTicketItem[],
  paper: PaperFormat,
  type: 'recto' | 'verso',
  sharedLayout?: ProductionLayout
): Promise<jsPDF> {
  if (!tickets.length) throw new Error('Aucun billet à imprimer.');
  const layout = sharedLayout || createProductionLayout(paper, tickets.length);
  const pdf = new jsPDF({
    orientation: paper.widthMm > paper.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
    compress: true,
  });

  for (let pageIdx = 0; pageIdx < layout.totalPages; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage([paper.widthMm, paper.heightMm], paper.widthMm > paper.heightMm ? 'landscape' : 'portrait');
    }

    const pageTickets = tickets.slice(
      pageIdx * layout.ticketsPerPage,
      (pageIdx + 1) * layout.ticketsPerPage
    );

    for (let i = 0; i < pageTickets.length; i++) {
      const ticket = pageTickets[i];
      const placement = layout.placements[i];
      if (!placement) continue;

      if (type === 'recto') {
        try {
          addRectoImage(pdf, ticket, placement);
        } catch (error) {
          console.error('Erreur lors de l’ajout du visuel recto :', error);
          pdf.setFillColor(25, 25, 25);
          pdf.rect(placement.x, placement.y, placement.width, placement.height, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          if (placement.rotated) {
            pdf.text(ticket.categoryName, placement.x + placement.width / 2, placement.y + placement.height / 2, { angle: 90, align: 'center' });
          } else {
            pdf.text(ticket.categoryName, placement.x + 10, placement.y + 20);
          }
        }
      } else {
        pdf.setTextColor(0, 0, 0);
        try {
          const qrDataUrl = await QRCode.toDataURL(ticket.token, { margin: 1, width: 240, errorCorrectionLevel: 'M' });
          drawVerso(pdf, ticket, placement, qrDataUrl);
        } catch (error) {
          console.error('Erreur génération QR code PDF', error);
          drawVerso(pdf, ticket, placement);
        }
      }

      drawCropMarks(pdf, placement);
    }
  }

  return pdf;
}
