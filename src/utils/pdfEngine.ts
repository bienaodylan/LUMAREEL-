import jsPDF from 'jspdf';
import QRCode from 'qrcode';

export interface PaperFormat {
  name: string;
  widthMm: number;
  heightMm: number;
}

/** Format physique officiel des billets LUMARÉEL. */
export const TICKET_WIDTH_MM = 153.6;
export const TICKET_HEIGHT_MM = 54.8;

/** Marges et espacement de production. Modifiables selon les capacités de l'imprimeur. */
export const PRINT_SAFE_MARGIN_MM = 5;
export const TICKET_GAP_MM = 2;

/**
 * Écart de ratio (en %) en dessous duquel le visuel est "rempli" (léger recadrage
 * des bords, aucune déformation). Au-delà, le visuel est "contenu" en entier.
 */
const COVER_TOLERANCE = 0.04;

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

/** Retournement de la feuille pour l'impression recto-verso. */
export type DuplexFlip = 'long' | 'short';
/**
 * Sens des billets sur la feuille. Tous les billets d'une feuille ont toujours
 * le même sens, rangés en colonnes et rangées régulières :
 *  - 'horizontal' : billets à plat (153,6 mm en largeur) ;
 *  - 'vertical'   : billets tournés à 90° (54,8 mm en largeur) ;
 *  - 'auto'       : le sens qui donne le plus de billets (à plat en cas d'égalité).
 */
export type TicketOrientationMode = 'auto' | 'horizontal' | 'vertical';
/** Rotation du contenu du billet, en degrés, sens anti-horaire. */
export type Rotation = 0 | 90 | 180 | 270;

export interface TicketPlacement {
  x: number;
  y: number;
  /** Dimensions du rectangle occupé sur la feuille. */
  width: number;
  height: number;
  /** true si le billet est tourné de 90° ou 270° (rectangle 54,8 × 153,6). */
  rotated: boolean;
  /** Rotation du contenu du billet dans ce rectangle. */
  rotation: Rotation;
}

export interface ProductionLayout {
  paper: PaperFormat;
  /** Dimensions effectives de la page PDF après choix portrait/paysage. */
  pageWidthMm: number;
  pageHeightMm: number;
  pageOrientation: 'portrait' | 'landscape';
  marginMm: number;
  gapMm: number;
  /** Nombre de billets alignés sur une même ligne / nombre de lignes. */
  columns: number;
  rows: number;
  ticketsPerPage: number;
  totalPages: number;
  /** true si les billets sont tournés à 90° (sens vertical). */
  rotated: boolean;
  rotatedPerPage: number;
  /** Surface de billets / surface de la feuille, en %. */
  fillPercent: number;
  /** Sens demandé et sens retenu. */
  orientationMode: TicketOrientationMode;
  /** Description lisible de la disposition. */
  summary: string;
  /** Retournement de la feuille pris en compte pour le verso. */
  flip: DuplexFlip;
  /** Axe de symétrie du verso dans le repère de la page. */
  mirrorAxis: 'x' | 'y';
  /** Positions RECTO (billet i de la page = placements[i]). */
  placements: TicketPlacement[];
  /** Positions VERSO : versoPlacements[i] est le dos physique de placements[i]. */
  versoPlacements: TicketPlacement[];
}

/* -------------------------------------------------------------------------- */
/*  Moteur de composition                                                      */
/* -------------------------------------------------------------------------- */

interface GridCandidate {
  orientation: 'portrait' | 'landscape';
  pageW: number;
  pageH: number;
  rotated: boolean;
  columns: number;
  rows: number;
  count: number;
}

/** Nombre d'éléments de taille `size` séparés de `gap` qui tiennent dans `space`. */
function fitCount(space: number, size: number, gap: number): number {
  // Tolérance de 0,001 mm pour absorber les erreurs d'arrondi flottant.
  return Math.max(0, Math.floor((space + gap + 0.001) / (size + gap)));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Plan du verso : symétrique du recto par rapport à l'axe de retournement.
 * Le haut du billet reste du même côté physique (le billet se retourne comme
 * une page de livre), donc la rotation du contenu est adaptée à l'axe.
 */
function mirrorPlacement(
  p: TicketPlacement,
  axis: 'x' | 'y',
  pageW: number,
  pageH: number
): TicketPlacement {
  const rotation = (axis === 'x' ? (360 - p.rotation) % 360 : (540 - p.rotation) % 360) as Rotation;
  return {
    x: round2(axis === 'x' ? pageW - p.x - p.width : p.x),
    y: round2(axis === 'y' ? pageH - p.y - p.height : p.y),
    width: p.width,
    height: p.height,
    rotated: p.rotated,
    rotation,
  };
}

/**
 * Calcule la meilleure grille régulière pour un papier :
 *  - feuille portrait ou paysage ;
 *  - billets tous à plat ou tous tournés à 90° (selon `orientation`) ;
 *  - colonnes × rangées calculées, jamais fixées à la main ;
 *  - grille centrée, marges techniques respectées ;
 *  - verso en miroir selon le retournement de la feuille.
 */
export function createProductionLayout(
  paper: PaperFormat,
  ticketCount: number,
  marginMm = PRINT_SAFE_MARGIN_MM,
  gapMm = TICKET_GAP_MM,
  flip: DuplexFlip = 'long',
  orientation: TicketOrientationMode = 'auto'
): ProductionLayout {
  if (
    !Number.isFinite(paper.widthMm) ||
    !Number.isFinite(paper.heightMm) ||
    paper.widthMm <= 0 ||
    paper.heightMm <= 0
  ) {
    throw new Error('Dimensions du papier invalides.');
  }
  if (!Number.isFinite(ticketCount) || ticketCount < 1) {
    throw new Error('La quantité de billets doit être supérieure à zéro.');
  }
  if (marginMm < 0 || gapMm < 0) {
    throw new Error('Les marges et espacements ne peuvent pas être négatifs.');
  }

  const shortSide = Math.min(paper.widthMm, paper.heightMm);
  const longSide = Math.max(paper.widthMm, paper.heightMm);

  const candidates: GridCandidate[] = [];
  for (const pageOrientation of ['portrait', 'landscape'] as const) {
    const pageW = pageOrientation === 'portrait' ? shortSide : longSide;
    const pageH = pageOrientation === 'portrait' ? longSide : shortSide;
    for (const rotated of [false, true]) {
      if (orientation === 'horizontal' && rotated) continue;
      if (orientation === 'vertical' && !rotated) continue;
      const tw = rotated ? TICKET_HEIGHT_MM : TICKET_WIDTH_MM;
      const th = rotated ? TICKET_WIDTH_MM : TICKET_HEIGHT_MM;
      const columns = fitCount(pageW - marginMm * 2, tw, gapMm);
      const rows = fitCount(pageH - marginMm * 2, th, gapMm);
      if (columns > 0 && rows > 0) {
        candidates.push({ orientation: pageOrientation, pageW, pageH, rotated, columns, rows, count: columns * rows });
      }
    }
  }

  if (!candidates.length) {
    const sens =
      orientation === 'vertical'
        ? 'tournés à 90°'
        : orientation === 'horizontal'
          ? 'à plat'
          : '';
    throw new Error(
      `Aucun billet de ${TICKET_WIDTH_MM} × ${TICKET_HEIGHT_MM} mm ${sens} ne tient sur ce papier avec une marge de ${marginMm} mm.`.replace('  ', ' ')
    );
  }

  // Plus de billets d'abord ; à égalité : billets à plat, puis feuille paysage
  // (les billets se lisent dans le sens naturel du papier).
  const best = candidates.reduce((a, b) => {
    if (b.count !== a.count) return b.count > a.count ? b : a;
    if (a.rotated !== b.rotated) return a.rotated ? b : a;
    if (a.orientation !== b.orientation) return a.orientation === 'landscape' ? a : b;
    return a;
  });

  const tw = best.rotated ? TICKET_HEIGHT_MM : TICKET_WIDTH_MM;
  const th = best.rotated ? TICKET_WIDTH_MM : TICKET_HEIGHT_MM;
  const gridW = best.columns * tw + (best.columns - 1) * gapMm;
  const gridH = best.rows * th + (best.rows - 1) * gapMm;
  const startX = (best.pageW - gridW) / 2;
  const startY = (best.pageH - gridH) / 2;
  const rotation: Rotation = best.rotated ? 90 : 0;

  // Ordre de lecture : de gauche à droite, rangée par rangée, du haut vers le bas.
  const placements: TicketPlacement[] = [];
  for (let row = 0; row < best.rows; row++) {
    for (let col = 0; col < best.columns; col++) {
      placements.push({
        x: round2(startX + col * (tw + gapMm)),
        y: round2(startY + row * (th + gapMm)),
        width: tw,
        height: th,
        rotated: best.rotated,
        rotation,
      });
    }
  }

  const longIsVertical = best.orientation === 'portrait';
  const mirrorAxis: 'x' | 'y' = (flip === 'long') === longIsVertical ? 'x' : 'y';
  const versoPlacements = placements.map((p) => mirrorPlacement(p, mirrorAxis, best.pageW, best.pageH));

  const ticketArea = TICKET_WIDTH_MM * TICKET_HEIGHT_MM * placements.length;
  const sens = best.rotated ? 'tournés à 90° (verticaux)' : 'à plat (horizontaux)';

  return {
    paper,
    pageWidthMm: best.pageW,
    pageHeightMm: best.pageH,
    pageOrientation: best.orientation,
    marginMm,
    gapMm,
    columns: best.columns,
    rows: best.rows,
    ticketsPerPage: placements.length,
    totalPages: Math.ceil(ticketCount / placements.length),
    rotated: best.rotated,
    rotatedPerPage: best.rotated ? placements.length : 0,
    fillPercent: Math.round((ticketArea / (best.pageW * best.pageH)) * 1000) / 10,
    orientationMode: orientation,
    summary: `${best.columns} billet${best.columns > 1 ? 's' : ''} par ligne × ${best.rows} ligne${best.rows > 1 ? 's' : ''}, ${sens}`,
    flip,
    mirrorAxis,
    placements,
    versoPlacements,
  };
}

/* -------------------------------------------------------------------------- */
/*  Dessin                                                                     */
/* -------------------------------------------------------------------------- */

function getImageFormat(dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' {
  const header = dataUrl.slice(0, 100).toLowerCase();
  if (header.startsWith('data:image/png')) return 'PNG';
  if (header.startsWith('data:image/webp')) return 'WEBP';
  if (header.startsWith('data:image/jpeg') || header.startsWith('data:image/jpg')) return 'JPEG';
  return 'JPEG';
}

/** Formate un nombre avec des espaces ordinaires (l'espace fine de toLocaleString s'affiche mal en PDF). */
function formatAmount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Passage du repère local du billet (origine en haut à gauche du billet non
 * tourné, 153,6 × 54,8 mm) vers la page, pour une rotation anti-horaire donnée.
 */
function localToPage(p: TicketPlacement, lx: number, ly: number): { x: number; y: number } {
  const cx = p.x + p.width / 2;
  const cy = p.y + p.height / 2;
  const dx = lx - TICKET_WIDTH_MM / 2;
  const dy = ly - TICKET_HEIGHT_MM / 2;
  switch (p.rotation) {
    case 90:
      return { x: cx + dy, y: cy - dx };
    case 180:
      return { x: cx - dx, y: cy - dy };
    case 270:
      return { x: cx - dy, y: cy + dx };
    default:
      return { x: cx + dx, y: cy + dy };
  }
}

/**
 * Dessine une image définie dans le repère local du billet.
 * jsPDF pivote l'image autour de son coin BAS-GAUCHE : on calcule donc ce coin
 * à partir du centre voulu.
 */
function addLocalImage(
  pdf: jsPDF,
  data: string,
  format: 'PNG' | 'JPEG' | 'WEBP',
  p: TicketPlacement,
  lx: number,
  ly: number,
  w: number,
  h: number,
  alias: string
) {
  const center = localToPage(p, lx + w / 2, ly + h / 2);
  // Vecteur (w/2, -h/2) du coin bas-gauche vers le centre, après rotation anti-horaire.
  const rel = (() => {
    const dx = w / 2;
    const dy = -h / 2;
    switch (p.rotation) {
      case 90:
        return { x: dy, y: -dx };
      case 180:
        return { x: -dx, y: -dy };
      case 270:
        return { x: -dy, y: dx };
      default:
        return { x: dx, y: dy };
    }
  })();
  const pivotX = center.x - rel.x;
  const pivotY = center.y - rel.y;
  pdf.addImage(data, format, pivotX, pivotY - h, w, h, alias, 'FAST', p.rotation);
}

/** Repères de coupe aux quatre coins du billet, dans l'espacement inter-billets. */
function drawCropMarks(pdf: jsPDF, p: TicketPlacement, gapMm: number) {
  const offset = 0.4;
  const mark = Math.max(0.8, Math.min(1.6, gapMm - offset - 0.2));
  pdf.setDrawColor(90, 90, 90);
  pdf.setLineWidth(0.12);

  const left = p.x;
  const top = p.y;
  const right = p.x + p.width;
  const bottom = p.y + p.height;

  pdf.line(left - offset - mark, top, left - offset, top);
  pdf.line(left, top - offset - mark, left, top - offset);
  pdf.line(right + offset, top, right + offset + mark, top);
  pdf.line(right, top - offset - mark, right, top - offset);
  pdf.line(left - offset - mark, bottom, left - offset, bottom);
  pdf.line(left, bottom + offset, left, bottom + offset + mark);
  pdf.line(right + offset, bottom, right + offset + mark, bottom);
  pdf.line(right, bottom + offset, right, bottom + offset + mark);
}

interface DesignInfo {
  alias: string;
  format: 'PNG' | 'JPEG' | 'WEBP';
  ratio: number;
}

/**
 * Place le visuel recto sans jamais l'étirer :
 *  - ratio proche de 153,6 / 54,8 (±4 %) : le visuel remplit tout le billet,
 *    les bords en excès sont simplement rognés ;
 *  - sinon : le visuel est entièrement visible, centré, sur fond blanc.
 */
function addRectoImage(pdf: jsPDF, ticket: PrintTicketItem, p: TicketPlacement, info: DesignInfo) {
  const targetRatio = TICKET_WIDTH_MM / TICKET_HEIGHT_MM;
  const deviation = Math.abs(info.ratio / targetRatio - 1);
  const cover = deviation <= COVER_TOLERANCE;

  const wider = info.ratio > targetRatio;
  // "fit by height" : hauteur du billet, largeur déduite ; sinon largeur du billet, hauteur déduite.
  const fitByHeight = cover ? wider : !wider;
  const imageHeight = fitByHeight ? TICKET_HEIGHT_MM : TICKET_WIDTH_MM / info.ratio;
  const imageWidth = fitByHeight ? TICKET_HEIGHT_MM * info.ratio : TICKET_WIDTH_MM;

  const localX = (TICKET_WIDTH_MM - imageWidth) / 2;
  const localY = (TICKET_HEIGHT_MM - imageHeight) / 2;

  pdf.saveGraphicsState();
  pdf.setFillColor(255, 255, 255);
  pdf.rect(p.x, p.y, p.width, p.height, 'F');
  // Découpe au rectangle du billet (utile pour le recadrage léger).
  pdf.rect(p.x, p.y, p.width, p.height, null as unknown as string);
  pdf.clip();
  pdf.discardPath();
  addLocalImage(pdf, ticket.ticketDesignUrl, info.format, p, localX, localY, imageWidth, imageHeight, info.alias);
  pdf.restoreGraphicsState();
}

function drawVerso(pdf: jsPDF, ticket: PrintTicketItem, p: TicketPlacement, qrDataUrl: string | undefined, qrAlias: string) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(p.x, p.y, p.width, p.height, 'F');
  pdf.setDrawColor(160, 160, 160);
  pdf.setLineWidth(0.2);
  pdf.rect(p.x, p.y, p.width, p.height, 'S');

  const write = (value: string, lx: number, ly: number, size: number, bold = false) => {
    const pos = localToPage(p, lx, ly);
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(size);
    pdf.text(value, pos.x, pos.y, p.rotation ? { angle: p.rotation } : undefined);
  };

  pdf.setTextColor(0, 0, 0);
  write(`${ticket.artist} EN CONCERT`, 5, 7, 8.5, true);
  write(`CATÉGORIE : ${ticket.categoryName} — ${formatAmount(ticket.price)} FCFA`, 5, 12, 6.5);
  write(`LIEU : ${ticket.venue} · ${ticket.dateStr}`, 5, 16.5, 6.5);
  write('• Billet individuel strict. L’entrée aux portes invalide le jeton.', 5, 42, 5.5);
  write('• Contrôle d’accès officiel et régie : LUMARÉEL CO.', 5, 46, 5.5);

  const serial = localToPage(p, 5, 51);
  pdf.setFont('courier', 'bold');
  pdf.setFontSize(6.5);
  pdf.text(`SÉRIE : ${ticket.serialNumber}`, serial.x, serial.y, p.rotation ? { angle: p.rotation } : undefined);

  if (qrDataUrl) {
    addLocalImage(pdf, qrDataUrl, 'PNG', p, TICKET_WIDTH_MM - 34, 4, 30, 30, qrAlias);
  }
}

/**
 * Type de PDF :
 *  - 'recto'  : uniquement les visuels ;
 *  - 'verso'  : uniquement les dos (QR code, série, mentions) ;
 *  - 'duplex' : UN seul PDF qui alterne recto, verso, recto, verso… (feuille 1 recto,
 *               feuille 1 verso, feuille 2 recto…), à imprimer en recto-verso.
 */
export type ProductionPdfType = 'recto' | 'verso' | 'duplex';

export async function generateProductionPDF(
  tickets: PrintTicketItem[],
  paper: PaperFormat,
  type: ProductionPdfType,
  sharedLayout?: ProductionLayout
): Promise<jsPDF> {
  if (!tickets.length) throw new Error('Aucun billet à imprimer.');

  const layout = sharedLayout || createProductionLayout(paper, tickets.length);
  const pdf = new jsPDF({
    orientation: layout.pageOrientation,
    unit: 'mm',
    format: [layout.pageWidthMm, layout.pageHeightMm],
    compress: true,
  });

  const needsRecto = type === 'recto' || type === 'duplex';
  const needsVerso = type === 'verso' || type === 'duplex';

function createFallbackTicketCanvas(ticket: PrintTicketItem): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 548;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 1536, 548);
  grad.addColorStop(0, '#060606');
  grad.addColorStop(0.5, '#121212');
  grad.addColorStop(1, '#050505');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1536, 548);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 4;
  ctx.strokeRect(30, 30, 1476, 488);

  ctx.fillStyle = '#d4af37';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('LUMARÉEL CO. · BILLET OFFICIEL', 70, 95);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 76px sans-serif';
  ctx.fillText((ticket.artist || 'CONCERT LIVE').toUpperCase(), 70, 210);

  ctx.fillStyle = '#e5e5e5';
  ctx.font = 'bold 42px sans-serif';
  ctx.fillText(`${ticket.categoryName.toUpperCase()} — ${formatAmount(ticket.price)} FCFA`, 70, 290);

  ctx.fillStyle = '#aaaaaa';
  ctx.font = '32px sans-serif';
  ctx.fillText(`${ticket.venue} · ${ticket.dateStr}`, 70, 370);

  ctx.fillStyle = '#666666';
  ctx.font = '22px sans-serif';
  ctx.fillText('BILLETTERIE CERTIFIÉE · PROTOCOLE CRYPTOGRAPHIQUE SÉCURISÉ', 70, 450);

  return canvas.toDataURL('image/png');
}

async function ensureRasterDesign(urlOrData: string): Promise<string> {
  if (!urlOrData) return '';
  if (urlOrData.startsWith('data:image/png') || urlOrData.startsWith('data:image/jpeg')) {
    return urlOrData;
  }
  if (typeof document !== 'undefined') {
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 1536;
          canvas.height = img.naturalHeight || 548;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#060606';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch {}
        resolve(urlOrData);
      };
      img.onerror = () => resolve(urlOrData);
      img.src = urlOrData;
    });
  }
  return urlOrData;
}

  // Un seul embarquement par visuel distinct (alias), au lieu d'un par billet.
  const designs = new Map<string, DesignInfo>();
  if (needsRecto) {
    for (const ticket of tickets) {
      if (designs.has(ticket.ticketDesignUrl)) continue;
      try {
        const safeData = await ensureRasterDesign(ticket.ticketDesignUrl);
        ticket.ticketDesignUrl = safeData;
        const props = pdf.getImageProperties(safeData);
        designs.set(ticket.ticketDesignUrl, {
          alias: `design_${designs.size}`,
          format: getImageFormat(safeData),
          ratio: props.width / props.height,
        });
      } catch {
        const fallback = createFallbackTicketCanvas(ticket);
        ticket.ticketDesignUrl = fallback;
        designs.set(fallback, {
          alias: `design_${designs.size}`,
          format: 'PNG',
          ratio: TICKET_WIDTH_MM / TICKET_HEIGHT_MM,
        });
      }
    }
  }

  // Les QR codes sont calculés une seule fois par billet (utile en mode recto-verso).
  const qrCache = new Map<string, string>();
  const qrFor = async (ticket: PrintTicketItem): Promise<string> => {
    const cached = qrCache.get(ticket.token);
    if (cached) return cached;
    try {
      const data = await QRCode.toDataURL(ticket.token, { margin: 1, width: 240, errorCorrectionLevel: 'M' });
      qrCache.set(ticket.token, data);
      return data;
    } catch (error) {
      // Un billet sans QR code ne peut pas être contrôlé à l'entrée : on n'imprime pas.
      throw new Error(`QR code impossible à générer pour le billet ${ticket.serialNumber}.`);
    }
  };

  const drawSheet = async (pageTickets: PrintTicketItem[], side: 'recto' | 'verso') => {
    // Les deux faces lisent le MÊME plan ; le verso utilise les positions miroir.
    const positions = side === 'recto' ? layout.placements : layout.versoPlacements;
    for (let i = 0; i < pageTickets.length; i++) {
      const ticket = pageTickets[i];
      const placement = positions[i];
      if (!placement) continue;

      if (side === 'recto') {
        const info = designs.get(ticket.ticketDesignUrl);
        if (!info) throw new Error('Visuel recto indisponible.');
        addRectoImage(pdf, ticket, placement, info);
      } else {
        pdf.setTextColor(0, 0, 0);
        drawVerso(pdf, ticket, placement, await qrFor(ticket), `qr_${ticket.id}`);
      }
      drawCropMarks(pdf, placement, layout.gapMm);
    }
  };

  let firstPage = true;
  const newPage = () => {
    if (!firstPage) pdf.addPage([layout.pageWidthMm, layout.pageHeightMm], layout.pageOrientation);
    firstPage = false;
  };

  for (let sheet = 0; sheet < layout.totalPages; sheet++) {
    const pageTickets = tickets.slice(sheet * layout.ticketsPerPage, (sheet + 1) * layout.ticketsPerPage);
    if (needsRecto) {
      newPage();
      await drawSheet(pageTickets, 'recto');
    }
    if (needsVerso) {
      newPage();
      await drawSheet(pageTickets, 'verso');
    }
  }

  return pdf;
}
