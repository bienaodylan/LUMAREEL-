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
/** Rotation du contenu du billet, en degrés, sens anti-horaire. */
export type Rotation = 0 | 90 | 180 | 270;

export interface TicketPlacement {
  x: number;
  y: number;
  /** Dimensions du rectangle occupé sur la feuille. */
  width: number;
  height: number;
  /** true si le billet est pivoté de 90° ou 270° (rectangle 54,8 × 153,6). */
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
  /** Nombre de positions de colonnes / rangées distinctes (information). */
  columns: number;
  rows: number;
  ticketsPerPage: number;
  totalPages: number;
  /** true uniquement si TOUS les billets de la feuille sont pivotés. */
  rotated: boolean;
  rotatedPerPage: number;
  /** Surface de billets / surface de la feuille, en %. */
  fillPercent: number;
  /** Nombre de billets que donnait l'ancienne grille uniforme (comparaison). */
  uniformBaselinePerPage: number;
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

interface PackedRect {
  /** Coordonnées en mm dans la zone utile (origine = coin haut-gauche). */
  x: number;
  y: number;
  rot: boolean;
}

/**
 * Empaquetage "guillotine" optimal (programmation dynamique sur les coupes
 * normales). Les deux orientations du billet sont testées dans chaque zone.
 * Toute disposition retournée se découpe avec des coupes droites de bord à bord.
 *
 * Le score favorise d'abord le nombre de billets, puis le moins de billets pivotés.
 */
function packGuillotine(
  regionW: number,
  regionH: number,
  tw: number,
  th: number,
  gap: number
): { rects: PackedRect[]; score: number } {
  const U = 10; // 0,1 mm
  const A = Math.round((tw + gap) * U);
  const B = Math.round((th + gap) * U);
  const W = Math.round((regionW + gap) * U);
  const H = Math.round((regionH + gap) * U);
  const limit = Math.max(W, H);
  const minSide = Math.min(A, B);

  const values = new Set<number>();
  for (let i = 0; i * A <= limit; i++) {
    for (let j = 0; i * A + j * B <= limit; j++) values.add(i * A + j * B);
  }
  const S = [...values].sort((a, b) => a - b);
  const N = S.length;

  const norm = (v: number): number => {
    let lo = 0;
    let hi = N - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (S[mid] <= v) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  const memo = new Int32Array(N * N).fill(-1);
  const kind = new Int8Array(N * N); // 0 vide, 1 coupe verticale, 2 coupe horizontale, 3 billet, 4 billet pivoté
  const cutAt = new Int32Array(N * N);

  const solve = (iw: number, ih: number): number => {
    const key = iw * N + ih;
    if (memo[key] >= 0) return memo[key];
    const w = S[iw];
    const h = S[ih];
    let best = 0;
    let k = 0;
    let cut = 0;

    if (w >= A && h >= B) {
      best = 1000;
      k = 3;
    } else if (w >= B && h >= A) {
      best = 999;
      k = 4;
    }

    if (w >= 2 * minSide) {
      for (let c = 1; c < iw; c++) {
        const x = S[c];
        if (x < minSide) continue;
        const rest = norm(w - x);
        if (S[rest] < minSide) continue;
        const v = solve(c, ih) + solve(rest, ih);
        if (v > best) {
          best = v;
          k = 1;
          cut = c;
        }
      }
    }
    if (h >= 2 * minSide) {
      for (let c = 1; c < ih; c++) {
        const y = S[c];
        if (y < minSide) continue;
        const rest = norm(h - y);
        if (S[rest] < minSide) continue;
        const v = solve(iw, c) + solve(iw, rest);
        if (v > best) {
          best = v;
          k = 2;
          cut = c;
        }
      }
    }

    memo[key] = best;
    kind[key] = k;
    cutAt[key] = cut;
    return best;
  };

  const rootW = norm(W);
  const rootH = norm(H);
  const score = solve(rootW, rootH);

  const rects: PackedRect[] = [];
  const place = (iw: number, ih: number, ox: number, oy: number) => {
    const key = iw * N + ih;
    switch (kind[key]) {
      case 3:
        rects.push({ x: ox / U, y: oy / U, rot: false });
        break;
      case 4:
        rects.push({ x: ox / U, y: oy / U, rot: true });
        break;
      case 1: {
        const c = cutAt[key];
        place(c, ih, ox, oy);
        place(norm(S[iw] - S[c]), ih, ox + S[c], oy);
        break;
      }
      case 2: {
        const c = cutAt[key];
        place(iw, c, ox, oy);
        place(iw, norm(S[ih] - S[c]), ox, oy + S[c]);
        break;
      }
      default:
        break;
    }
  };
  place(rootW, rootH, 0, 0);

  return { rects, score };
}

/** Ancienne méthode (grille uniforme) conservée uniquement pour comparer. */
function uniformGridCount(pageW: number, pageH: number, margin: number, gap: number): number {
  const uw = pageW - margin * 2;
  const uh = pageH - margin * 2;
  const grid = (tw: number, th: number) =>
    Math.max(0, Math.floor((uw + gap) / (tw + gap))) * Math.max(0, Math.floor((uh + gap) / (th + gap)));
  return Math.max(grid(TICKET_WIDTH_MM, TICKET_HEIGHT_MM), grid(TICKET_HEIGHT_MM, TICKET_WIDTH_MM));
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function mirrorPlacement(
  p: TicketPlacement,
  axis: 'x' | 'y',
  pageW: number,
  pageH: number
): TicketPlacement {
  // Le contenu garde la même arête "haute" physique : voir rotation du contenu.
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
 * Calcule la meilleure composition pour un papier et un nombre de billets :
 *  - teste feuille portrait et paysage ;
 *  - teste les billets à 0° et à 90° dans toute la zone utile (coupes guillotine) ;
 *  - centre la composition ;
 *  - calcule le plan VERSO en miroir selon le retournement de la feuille.
 */
export type TicketOrientationMode = 'auto' | 'horizontal' | 'vertical';

export function createProductionLayout(
  paper: PaperFormat,
  ticketCount: number,
  marginMm = PRINT_SAFE_MARGIN_MM,
  gapMm = TICKET_GAP_MM,
  flip: DuplexFlip = 'long',
  orientationMode: TicketOrientationMode = 'auto'
): ProductionLayout {
  if (!Number.isFinite(paper.widthMm) || !Number.isFinite(paper.heightMm) || paper.widthMm <= 0 || paper.heightMm <= 0) throw new Error('Dimensions du papier invalides.');
  if (!Number.isInteger(ticketCount) || ticketCount < 1) throw new Error('La quantité de billets doit être supérieure à zéro.');
  if (!Number.isFinite(marginMm) || !Number.isFinite(gapMm) || marginMm < 0 || gapMm < 0) throw new Error('Les marges et espacements ne peuvent pas être négatifs.');

  const shortSide = Math.min(paper.widthMm, paper.heightMm);
  const longSide = Math.max(paper.widthMm, paper.heightMm);
  const candidates: Array<{ orientation: 'portrait' | 'landscape'; pageW: number; pageH: number; rotated: boolean; columns: number; rows: number; count: number }> = [];
  for (const orientation of ['portrait', 'landscape'] as const) {
    const pageW = orientation === 'portrait' ? shortSide : longSide;
    const pageH = orientation === 'portrait' ? longSide : shortSide;
    const usableW = pageW - marginMm * 2;
    const usableH = pageH - marginMm * 2;
    const rotations = orientationMode === 'auto' ? [false, true] : [orientationMode === 'vertical'];
    for (const rotated of rotations) {
      const tw = rotated ? TICKET_HEIGHT_MM : TICKET_WIDTH_MM;
      const th = rotated ? TICKET_WIDTH_MM : TICKET_HEIGHT_MM;
      const columns = Math.max(0, Math.floor((usableW + gapMm) / (tw + gapMm)));
      const rows = Math.max(0, Math.floor((usableH + gapMm) / (th + gapMm)));
      if (columns && rows) candidates.push({ orientation, pageW, pageH, rotated, columns, rows, count: columns * rows });
    }
  }
  candidates.sort((a, b) => b.count - a.count || Number(a.rotated) - Number(b.rotated) || (a.orientation === 'portrait' ? -1 : 1));
  const best = candidates[0];
  if (!best) throw new Error(`Aucun billet de ${TICKET_WIDTH_MM} × ${TICKET_HEIGHT_MM} mm ne tient sur ce papier avec une marge de ${marginMm} mm.`);

  const tw = best.rotated ? TICKET_HEIGHT_MM : TICKET_WIDTH_MM;
  const th = best.rotated ? TICKET_WIDTH_MM : TICKET_HEIGHT_MM;
  const occupiedW = best.columns * tw + (best.columns - 1) * gapMm;
  const occupiedH = best.rows * th + (best.rows - 1) * gapMm;
  const offsetX = (best.pageW - occupiedW) / 2;
  const offsetY = (best.pageH - occupiedH) / 2;
  const placements: TicketPlacement[] = [];
  for (let row = 0; row < best.rows; row++) for (let column = 0; column < best.columns; column++) {
    placements.push({ x: round2(offsetX + column * (tw + gapMm)), y: round2(offsetY + row * (th + gapMm)), width: tw, height: th, rotated: best.rotated, rotation: best.rotated ? 90 : 0 });
  }
  const longIsVertical = best.orientation === 'portrait';
  const mirrorAxis: 'x' | 'y' = (flip === 'long') === longIsVertical ? 'x' : 'y';
  const versoPlacements = placements.map((p) => mirrorPlacement(p, mirrorAxis, best.pageW, best.pageH));
  const ticketArea = TICKET_WIDTH_MM * TICKET_HEIGHT_MM * placements.length;
  return {
    paper, pageWidthMm: best.pageW, pageHeightMm: best.pageH, pageOrientation: best.orientation,
    marginMm, gapMm, columns: best.columns, rows: best.rows, ticketsPerPage: placements.length,
    totalPages: Math.ceil(ticketCount / placements.length), rotated: best.rotated,
    rotatedPerPage: best.rotated ? placements.length : 0,
    fillPercent: Math.round((ticketArea / (best.pageW * best.pageH)) * 1000) / 10,
    uniformBaselinePerPage: placements.length,
    summary: `${placements.length} billets ${best.rotated ? 'verticaux (90°)' : 'horizontaux (0°)'} — grille ${best.columns} × ${best.rows}`,
    flip, mirrorAxis, placements, versoPlacements,
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

export async function generateProductionPDF(
  tickets: PrintTicketItem[],
  paper: PaperFormat,
  type: 'recto' | 'verso' | 'duplex',
  sharedLayout?: ProductionLayout
): Promise<jsPDF> {
  if (!tickets.length) throw new Error('Aucun billet à imprimer.');
  const layout = sharedLayout || createProductionLayout(paper, tickets.length);
  const pdf = new jsPDF({ orientation: layout.pageOrientation, unit: 'mm', format: [layout.pageWidthMm, layout.pageHeightMm], compress: true });
  const designs = new Map<string, DesignInfo>();
  if (type !== 'verso') for (const ticket of tickets) {
    if (designs.has(ticket.ticketDesignUrl)) continue;
    try {
      const props = pdf.getImageProperties(ticket.ticketDesignUrl);
      designs.set(ticket.ticketDesignUrl, { alias: `design_${designs.size}`, format: getImageFormat(ticket.ticketDesignUrl), ratio: props.width / props.height });
    } catch (error) { console.error('Visuel recto illisible :', error); }
  }
  const renderFace = async (pageTickets: PrintTicketItem[], face: 'recto' | 'verso') => {
    const positions = face === 'recto' ? layout.placements : layout.versoPlacements;
    for (let i = 0; i < pageTickets.length; i++) {
      const ticket = pageTickets[i];
      const placement = positions[i];
      if (!placement) continue;
      if (face === 'recto') {
        const info = designs.get(ticket.ticketDesignUrl);
        try {
          if (!info) throw new Error('Visuel indisponible');
          addRectoImage(pdf, ticket, placement, info);
        } catch (error) {
          console.error('Erreur lors de l’ajout du visuel recto :', error);
          pdf.setFillColor(25, 25, 25); pdf.rect(placement.x, placement.y, placement.width, placement.height, 'F');
          const pos = localToPage(placement, TICKET_WIDTH_MM / 2, TICKET_HEIGHT_MM / 2);
          pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10);
          pdf.text(ticket.categoryName, pos.x, pos.y, { align: 'center', angle: placement.rotation });
        }
      } else {
        let qrDataUrl: string | undefined;
        try { qrDataUrl = await QRCode.toDataURL(ticket.token, { margin: 1, width: 240, errorCorrectionLevel: 'M' }); }
        catch (error) { console.error('Erreur génération QR code PDF', error); }
        drawVerso(pdf, ticket, placement, qrDataUrl, `qr_${ticket.id}`);
      }
      drawCropMarks(pdf, placement, layout.gapMm);
    }
  };
  let pageNumber = 0;
  for (let sheet = 0; sheet < layout.totalPages; sheet++) {
    const pageTickets = tickets.slice(sheet * layout.ticketsPerPage, (sheet + 1) * layout.ticketsPerPage);
    const faces: Array<'recto' | 'verso'> = type === 'duplex' ? ['recto', 'verso'] : [type];
    for (const face of faces) {
      if (pageNumber > 0) pdf.addPage([layout.pageWidthMm, layout.pageHeightMm], layout.pageOrientation);
      await renderFace(pageTickets, face);
      pageNumber++;
    }
  }
  return pdf;
}
