// src/utils/pdfEngine.ts
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface PaperFormat {
  name: string;
  widthMm: number;
  heightMm: number;
  cols: number;
  rows: number;
}

// Dimensions physiques exactes du billet (Ratio 2,803 : 1 strict)
const TICKET_WIDTH_MM = 153.6;
const TICKET_HEIGHT_MM = 54.8;

// Formats de papier avec calcul exact du nombre de billets possibles sans dépassement
export const SYSTEM_PAPER_FORMATS: Record<string, PaperFormat> = {
  A1: { name: 'A1 (594 × 841 mm)', widthMm: 594, heightMm: 841, cols: 3, rows: 14 },
  A2: { name: 'A2 (420 × 594 mm)', widthMm: 420, heightMm: 594, cols: 2, rows: 10 },
  A3: { name: 'A3 (297 × 420 mm)', widthMm: 297, heightMm: 420, cols: 1, rows: 7 },
  A4: { name: 'A4 (210 × 297 mm)', widthMm: 210, heightMm: 297, cols: 1, rows: 5 },
  A5: { name: 'A5 (148 × 210 mm)', widthMm: 148, heightMm: 210, cols: 1, rows: 3 },
  A6: { name: 'A6 (105 × 148 mm)', widthMm: 105, heightMm: 148, cols: 1, rows: 2 },
  B1: { name: 'B1 (707 × 1000 mm)', widthMm: 707, heightMm: 1000, cols: 4, rows: 16 },
  B2: { name: 'B2 (500 × 707 mm)', widthMm: 500, heightMm: 707, cols: 3, rows: 12 },
  B3: { name: 'B3 (353 × 500 mm)', widthMm: 353, heightMm: 500, cols: 2, rows: 8 },
  B4: { name: 'B4 (250 × 353 mm)', widthMm: 250, heightMm: 353, cols: 1, rows: 6 },
  B5: { name: 'B5 (176 × 250 mm)', widthMm: 176, heightMm: 250, cols: 1, rows: 4 },
  SRA2: { name: 'SRA2 (450 × 640 mm)', widthMm: 450, heightMm: 640, cols: 2, rows: 11 },
  SRA3: { name: 'SRA3 (320 × 450 mm)', widthMm: 320, heightMm: 450, cols: 2, rows: 8 },
  'A3+': { name: 'A3+ (329 × 483 mm)', widthMm: 329, heightMm: 483, cols: 2, rows: 8 },
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

export async function generateProductionPDF(
  tickets: PrintTicketItem[],
  paper: PaperFormat,
  type: 'recto' | 'verso'
): Promise<jsPDF> {
  const pdf = new jsPDF({
    orientation: paper.widthMm > paper.heightMm ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [paper.widthMm, paper.heightMm],
  });

  const ticketsPerPage = paper.cols * paper.rows;
  const totalPages = Math.ceil(tickets.length / ticketsPerPage);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage([paper.widthMm, paper.heightMm], paper.widthMm > paper.heightMm ? 'landscape' : 'portrait');
    }

    const startIdx = pageIdx * ticketsPerPage;
    const pageTickets = tickets.slice(startIdx, startIdx + ticketsPerPage);

    // Centrage parfait et sans déformation de la grille de billets sur la page
    const gridTotalWidth = paper.cols * TICKET_WIDTH_MM;
    const gridTotalHeight = paper.rows * TICKET_HEIGHT_MM;
    const startX = Math.max(0, (paper.widthMm - gridTotalWidth) / 2);
    const startY = Math.max(0, (paper.heightMm - gridTotalHeight) / 2);

    for (let i = 0; i < pageTickets.length; i++) {
      const ticket = pageTickets[i];
      const col = i % paper.cols;
      const row = Math.floor(i / paper.cols);

      const x = startX + (col * TICKET_WIDTH_MM);
      const y = startY + (row * TICKET_HEIGHT_MM);

      if (type === 'recto') {
        try {
          // Insertion directe aux dimensions physiques exactes (153.6 x 54.8 mm)
          pdf.addImage(ticket.ticketDesignUrl, 'JPEG', x, y, TICKET_WIDTH_MM, TICKET_HEIGHT_MM);
        } catch {
          pdf.setFillColor(20, 20, 20);
          pdf.rect(x, y, TICKET_WIDTH_MM, TICKET_HEIGHT_MM, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(10);
          pdf.text(ticket.categoryName, x + 10, y + 20);
        }
      } else {
        // Fond blanc propre et encadrement discret pour le verso
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        pdf.rect(x, y, TICKET_WIDTH_MM, TICKET_HEIGHT_MM, 'FD');

        // Informations textuelles du verso positionnées avec précision
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text(`${ticket.artist} EN CONCERT`, x + 5, y + 7);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(6.5);
        pdf.text(`CATÉGORIE : ${ticket.categoryName} — ${ticket.price.toLocaleString()} FCFA`, x + 5, y + 12);
        pdf.text(`LIEU : ${ticket.venue} · ${ticket.dateStr}`, x + 5, y + 16.5);

        pdf.setFontSize(5.5);
        pdf.text('• Billet individuel strict. L’entrée aux portes invalide le jeton.', x + 5, y + 42);
        pdf.text('• Contrôle d’accès officiel et régie : LUMARÉEL CO.', x + 5, y + 46);

        pdf.setFont('courier', 'bold');
        pdf.setFontSize(6.5);
        pdf.text(`SÉRIE : ${ticket.serialNumber}`, x + 5, y + 51);

        // Intégration du QR code unique sécurisé
        try {
          const qrDataUrl = await QRCode.toDataURL(ticket.token, { margin: 1, width: 200 });
          pdf.addImage(qrDataUrl, 'PNG', x + TICKET_WIDTH_MM - 34, y + 4, 30, 30);
        } catch (e) {
          console.error('Erreur génération QR code PDF', e);
        }
      }
    }
  }

  return pdf;
}