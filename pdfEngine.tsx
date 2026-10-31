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