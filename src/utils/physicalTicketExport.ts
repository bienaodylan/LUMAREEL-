import ExcelJS from 'exceljs';
import QRCode from 'qrcode';
import { PrintTicketItem } from './pdfEngine';
import { sanitizeSpreadsheetCell } from './csvSanitizer';

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

/** Un seul onglet : une image QR et son numéro de série sur chaque ligne. */
export async function exportPhysicalTicketsToExcel(tickets: PrintTicketItem[], fileBaseName: string): Promise<void> {
  if (!tickets.length) throw new Error('Aucun billet à exporter.');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LUMARÉEL CO.';
  workbook.subject = 'Registre des QR codes et numéros de série';
  workbook.title = 'Registre QR LUMARÉEL';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Registre');
  sheet.columns = [
    { header: 'Code QR', key: 'qr', width: 22 },
    { header: 'Numéro de série', key: 'serial', width: 30 },
  ];
  sheet.getRow(1).height = 28;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF111111' } };
  sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = 'A1:B1';
  for (let index = 0; index < tickets.length; index++) {
    const ticket = tickets[index];
    const rowNumber = index + 2;
    const row = sheet.getRow(rowNumber);
    row.height = 92;
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell(2).value = sanitizeSpreadsheetCell(ticket.serialNumber);
    row.getCell(2).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF111111' } };
    row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
    const border = { style: 'thin' as const, color: { argb: 'FFCCCCCC' } };
    row.getCell(1).border = { top: border, bottom: border, left: border, right: border };
    row.getCell(2).border = { top: border, bottom: border, left: border, right: border };
    const dataUrl = await QRCode.toDataURL(ticket.token, { margin: 1, width: 360, errorCorrectionLevel: 'M', type: 'image/png' });
    const imageId = workbook.addImage({ base64: dataUrl.split(',')[1], extension: 'png' });
    sheet.addImage(imageId, { tl: { col: 0.22, row: rowNumber - 1 + 0.08 }, ext: { width: 82, height: 82 }, editAs: 'oneCell' });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${fileBaseName}_QR_SERIES.xlsx`);
}
