import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { ProductionLayout, PaperFormat, PrintTicketItem } from './pdfEngine';

const GRID_MM = 5;
const PX_PER_MM = 96 / 25.4;
const PT_PER_MM = 72 / 25.4;

const EXCEL_PAPER_CODES: Record<string, number> = {
  A1: 67, A2: 66, A3: 8, A4: 9, A5: 11, A6: 70, B4: 12, B5: 13, 'A3+': 63,
};

const safeSheetName = (value: string) => value.replace(/[\\/?*\[\]:]/g, ' ').slice(0, 31);
const mmToGrid = (value: number) => value / GRID_MM;
const mmToPixels = (value: number) => value * PX_PER_MM;

function addText(
  sheet: ExcelJS.Worksheet,
  x: number,
  y: number,
  width: number,
  value: string,
  options: { bold?: boolean; size?: number; wrap?: boolean; align?: 'left' | 'center' } = {},
) {
  const row = Math.max(1, Math.floor(y / GRID_MM) + 1);
  const firstCol = Math.max(1, Math.floor(x / GRID_MM) + 1);
  const lastCol = Math.max(firstCol, Math.ceil((x + width) / GRID_MM));
  if (lastCol > firstCol) sheet.mergeCells(row, firstCol, row, lastCol);
  const cell = sheet.getCell(row, firstCol);
  cell.value = value;
  cell.font = { name: 'Arial', size: options.size ?? 8, bold: options.bold ?? false, color: { argb: 'FF111111' } };
  cell.alignment = {
    vertical: 'middle',
    horizontal: options.align ?? 'left',
    wrapText: options.wrap ?? false,
    shrinkToFit: true,
  };
}

function addBorder(sheet: ExcelJS.Worksheet, x: number, y: number, width: number, height: number) {
  const left = Math.max(1, Math.floor(x / GRID_MM) + 1);
  const right = Math.max(left, Math.ceil((x + width) / GRID_MM));
  const top = Math.max(1, Math.floor(y / GRID_MM) + 1);
  const bottom = Math.max(top, Math.ceil((y + height) / GRID_MM));
  const side = { style: 'thin' as const, color: { argb: 'FF999999' } };
  for (let col = left; col <= right; col++) {
    sheet.getCell(top, col).border = { ...sheet.getCell(top, col).border, top: side };
    sheet.getCell(bottom, col).border = { ...sheet.getCell(bottom, col).border, bottom: side };
  }
  for (let row = top; row <= bottom; row++) {
    sheet.getCell(row, left).border = { ...sheet.getCell(row, left).border, left: side };
    sheet.getCell(row, right).border = { ...sheet.getCell(row, right).border, right: side };
  }
}

function addTicketText(
  sheet: ExcelJS.Worksheet,
  ticket: PrintTicketItem,
  x: number,
  y: number,
  width: number,
  rotated: boolean,
) {
  if (!rotated) {
    const textWidth = Math.max(25, width - 42);
    addText(sheet, x + 5, y + 5, textWidth, `${ticket.artist} EN CONCERT`, { bold: true, size: 10 });
    addText(sheet, x + 5, y + 10, textWidth, `CATÉGORIE : ${ticket.categoryName} — ${Math.round(ticket.price).toLocaleString('fr-FR')} FCFA`, { size: 8 });
    addText(sheet, x + 5, y + 15, textWidth, `LIEU : ${ticket.venue} · ${ticket.dateStr}`, { size: 8 });
    addText(sheet, x + 5, y + 40, textWidth, 'Billet individuel strict. L’entrée aux portes invalide le jeton.', { size: 7, wrap: true });
    addText(sheet, x + 5, y + 45, textWidth, 'Contrôle d’accès officiel : LUMARÉEL CO.', { size: 7 });
    addText(sheet, x + 5, y + 50, textWidth, `SÉRIE : ${ticket.serialNumber}`, { bold: true, size: 8 });
  } else {
    addText(sheet, x + 2, y + 42, width - 4, `${ticket.artist} EN CONCERT`, { bold: true, size: 8, wrap: true, align: 'center' });
    addText(sheet, x + 2, y + 52, width - 4, `CATÉGORIE : ${ticket.categoryName}`, { size: 7, wrap: true, align: 'center' });
    addText(sheet, x + 2, y + 62, width - 4, `${Math.round(ticket.price).toLocaleString('fr-FR')} FCFA`, { size: 7, align: 'center' });
    addText(sheet, x + 2, y + 72, width - 4, ticket.venue, { size: 7, wrap: true, align: 'center' });
    addText(sheet, x + 2, y + 87, width - 4, ticket.dateStr, { size: 7, align: 'center' });
    addText(sheet, x + 2, y + 102, width - 4, 'Billet individuel strict · Contrôle LUMARÉEL CO.', { size: 6, wrap: true, align: 'center' });
    addText(sheet, x + 2, y + 122, width - 4, `SÉRIE : ${ticket.serialNumber}`, { bold: true, size: 7, wrap: true, align: 'center' });
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function exportPhysicalTicketsToExcel(
  tickets: PrintTicketItem[],
  paper: PaperFormat,
  layout: ProductionLayout,
  fileBaseName: string,
): Promise<void> {
  if (!tickets.length) throw new Error('Aucun billet à exporter.');
  if (!layout.placements.length || layout.placements.length !== layout.ticketsPerPage) {
    throw new Error('La disposition de la planche est incohérente.');
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LUMARÉEL CO.';
  workbook.subject = 'Registre et planches de billets physiques';
  workbook.title = 'Billets physiques LUMARÉEL';
  workbook.created = new Date();

  const register = workbook.addWorksheet('Registre');
  register.columns = [
    { header: 'N° de série', key: 'serial', width: 26 },
    { header: 'Événement', key: 'artist', width: 28 },
    { header: 'Catégorie', key: 'category', width: 22 },
    { header: 'Prix (FCFA)', key: 'price', width: 16 },
    { header: 'Lieu', key: 'venue', width: 32 },
    { header: 'Date', key: 'date', width: 24 },
    { header: 'QR_PAYLOAD (confidentiel)', key: 'token', width: 42, hidden: true },
  ];
  register.addRows(tickets.map(ticket => ({
    serial: ticket.serialNumber, artist: ticket.artist, category: ticket.categoryName,
    price: ticket.price, venue: ticket.venue, date: ticket.dateStr, token: ticket.token,
  })));
  register.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  register.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  register.views = [{ state: 'frozen', ySplit: 1 }];
  register.autoFilter = 'A1:G1';

  const imageIds = new Map<string, number>();
  for (const ticket of tickets) {
    if (imageIds.has(ticket.token)) continue;
    const dataUrl = await QRCode.toDataURL(ticket.token, {
      margin: 1, width: 480, errorCorrectionLevel: 'M', type: 'image/png',
    });
    imageIds.set(ticket.token, workbook.addImage({ base64: dataUrl.split(',')[1], extension: 'png' }));
  }

  const gridColumns = Math.ceil(layout.pageWidthMm / GRID_MM);
  const gridRows = Math.ceil(layout.pageHeightMm / GRID_MM);
  const columnWidth = Math.max(0.1, (mmToPixels(GRID_MM) - 5) / 7);
  const totalPages = Math.ceil(tickets.length / layout.ticketsPerPage);

  for (let pageIndex = 0; pageIndex < totalPages; pageIndex++) {
    const sheet = workbook.addWorksheet(safeSheetName(`Planche ${pageIndex + 1}`));
    sheet.properties.defaultRowHeight = GRID_MM * PT_PER_MM;
    sheet.columns = Array.from({ length: gridColumns }, () => ({ width: columnWidth }));
    for (let row = 1; row <= gridRows; row++) sheet.getRow(row).height = GRID_MM * PT_PER_MM;
    sheet.views = [{ showGridLines: false }];
    sheet.pageSetup = {
      paperSize: EXCEL_PAPER_CODES[paper.name] ?? 256,
      orientation: layout.pageOrientation,
      scale: 100,
      fitToPage: false,
      margins: { left: 0, right: 0, top: 0, bottom: 0, header: 0, footer: 0 },
      horizontalDpi: 300,
      verticalDpi: 300,
    };
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(gridColumns).letter}${gridRows}`;
    sheet.headerFooter = { oddHeader: '', oddFooter: '' };

    const pageTickets = tickets.slice(pageIndex * layout.ticketsPerPage, (pageIndex + 1) * layout.ticketsPerPage);
    for (let i = 0; i < pageTickets.length; i++) {
      const ticket = pageTickets[i];
      const p = layout.placements[i];
      if (!p) continue;
      addBorder(sheet, p.x, p.y, p.width, p.height);
      const rotated = p.rotated || p.width < p.height;
      addTicketText(sheet, ticket, p.x, p.y, p.width, rotated);

      const qrSize = Math.min(30, p.width - 8, p.height - 8);
      const qrX = rotated ? p.x + (p.width - qrSize) / 2 : p.x + p.width - qrSize - 4;
      const qrY = rotated ? p.y + 5 : p.y + 4;
      sheet.addImage(imageIds.get(ticket.token)!, {
        tl: { col: mmToGrid(qrX), row: mmToGrid(qrY) },
        ext: { width: mmToPixels(qrSize), height: mmToPixels(qrSize) },
        editAs: 'oneCell',
      });
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }), `${fileBaseName}.xlsx`);
}

export function exportPhysicalTicketsToCsv(tickets: PrintTicketItem[], fileBaseName: string): void {
  if (!tickets.length) throw new Error('Aucun billet à exporter.');
  const headers = ['SERIE', 'EVENEMENT', 'CATEGORIE', 'PRIX_FCFA', 'LIEU', 'DATE', 'QR_PAYLOAD'];
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const rows = tickets.map(ticket => [
    ticket.serialNumber, ticket.artist, ticket.categoryName, ticket.price,
    ticket.venue, ticket.dateStr, ticket.token,
  ].map(quote).join(';'));
  const csv = '\uFEFF' + [headers.map(quote).join(';'), ...rows].join('\r\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), `${fileBaseName}.csv`);
}
