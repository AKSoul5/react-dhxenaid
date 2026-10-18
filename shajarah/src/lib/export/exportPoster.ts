// Client-side print export.
//
// - SVG: the live poster element is cloned, the Amiri webfonts are inlined as
//   base64 @font-face rules, and physical width/height (mm) are set, so the
//   file opens identically in Illustrator/Inkscape or a print shop's RIP.
// - PNG: that SVG is rasterised onto a canvas at the requested DPI.
// - PDF: the raster is placed full-bleed on an ISO page with jsPDF.
//   (Rasterising in the browser guarantees correct Arabic shaping, which
//   PDF text engines often get wrong. For a fully vector PDF, open the SVG
//   in Inkscape and "Save as PDF", or add a headless-Chromium route.)

import { PAPER_SIZES, SHEET_SIZES, type PaperSize, type SheetSize } from "../paper";

export { PAPER_SIZES, type PaperSize };

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";
/** Chrome's canvas area limit is ~268M px; stay well below it. */
const MAX_CANVAS_PIXELS = 180_000_000;

const FONT_FILES: { file: string; weight: number; range: string; family?: string }[] = [
  { family: "Aref Ruqaa", file: "aref-ruqaa-arabic-400-normal.woff2", weight: 400, range: "U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF" },
  { family: "Aref Ruqaa", file: "aref-ruqaa-arabic-700-normal.woff2", weight: 700, range: "U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF" },
  { file: "amiri-arabic-400-normal.woff2", weight: 400, range: "U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF" },
  { file: "amiri-arabic-700-normal.woff2", weight: 700, range: "U+0600-06FF, U+0750-077F, U+FB50-FDFF, U+FE70-FEFF" },
  { file: "amiri-latin-400-normal.woff2", weight: 400, range: "U+0000-00FF, U+2000-206F" },
  { file: "amiri-latin-700-normal.woff2", weight: 700, range: "U+0000-00FF, U+2000-206F" },
];

let fontCssCache: Promise<string> | null = null;

function embeddedFontCss(): Promise<string> {
  fontCssCache ??= Promise.all(
    FONT_FILES.map(async ({ file, weight, range, family = "Amiri" }) => {
      const res = await fetch(`/fonts/${file}`);
      if (!res.ok) return "";
      const b64 = arrayBufferToBase64(await res.arrayBuffer());
      return `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;unicode-range:${range};src:url(data:font/woff2;base64,${b64}) format("woff2");}`;
    }),
  ).then((rules) => rules.join(""));
  return fontCssCache;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/**
 * Removes everything that belongs to the editor rather than the poster:
 * the selection / ancestor-highlight layer, hover tooltips and pointer
 * cursors. Exports always show the finished poster only.
 */
export function stripEditorUi(root: Element) {
  root.querySelectorAll("[data-ui]").forEach((el) => el.remove());
  root.querySelectorAll("title").forEach((el) => el.remove());
  root.querySelectorAll("[style]").forEach((el) => {
    if (el instanceof SVGElement || el instanceof HTMLElement) el.style.removeProperty("cursor");
    if (!el.getAttribute("style")) el.removeAttribute("style");
  });
}

/** Standalone SVG markup with fonts embedded and a physical page size. */
export async function serializePoster(svg: SVGSVGElement, paper: PaperSize = "A1"): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", XLINK_NS);
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  stripEditorUi(clone);
  const { w, h } = PAPER_SIZES[paper];
  clone.setAttribute("width", `${w}mm`);
  clone.setAttribute("height", `${h}mm`);
  // xlink:href for older vector editors that ignore SVG2 `href`
  clone.querySelectorAll("use").forEach((u) => {
    const href = u.getAttribute("href");
    if (href) u.setAttributeNS(XLINK_NS, "xlink:href", href);
  });
  // Inline the frame artwork: an SVG rendered as an image cannot load URLs.
  await Promise.all(
    [...clone.querySelectorAll("image")].map(async (img) => {
      const href = img.getAttribute("href");
      if (!href || href.startsWith("data:")) return;
      const res = await fetch(href);
      if (!res.ok) return;
      const type = res.headers.get("content-type") ?? "image/png";
      img.setAttribute("href", `data:${type};base64,${arrayBufferToBase64(await res.arrayBuffer())}`);
      img.setAttributeNS(XLINK_NS, "xlink:href", img.getAttribute("href")!);
    }),
  );
  const style = document.createElementNS(SVG_NS, "style");
  style.textContent = await embeddedFontCss();
  let defs = clone.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    clone.prepend(defs);
  }
  defs.prepend(style);
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
}

export function pixelSize(paper: PaperSize, dpi: number) {
  const { w, h } = PAPER_SIZES[paper];
  return { width: Math.round((w / 25.4) * dpi), height: Math.round((h / 25.4) * dpi) };
}

// Every face the poster can use: names (Amiri, regular and bold, Arabic and
// Latin) and headings (Aref Ruqaa, regular and bold).
const PROBE_FACES = [
  { family: "Amiri", weight: 400, text: "أبجد" }, { family: "Amiri", weight: 700, text: "أبجد" },
  { family: "Amiri", weight: 400, text: "Abg" }, { family: "Amiri", weight: 700, text: "Abg" },
  { family: "Aref Ruqaa", weight: 400, text: "أبجد" }, { family: "Aref Ruqaa", weight: 700, text: "أبجد" },
];

/**
 * The poster markup with a strip of probe text added below the page: each
 * face once in its web font and once in the plain default font. An SVG drawn
 * as an image loads its fonts after img.decode() resolves, and until a face
 * has loaded Chrome paints its text invisibly, which silently dropped names
 * from exports. The probe shows, in the very image that is exported, when
 * every face is really in use.
 */
function withFontProbe(markup: string): { markup: string; w: number; h: number; strip: number } {
  const m = markup.match(/viewBox="([-\d.]+)[ ,]+([-\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
  if (!m) throw new Error("The poster has no viewBox.");
  const [x0, y0, w, h] = m.slice(1).map(Number);
  const strip = w / 6;
  const cell = w / PROBE_FACES.length;
  const fs = cell * 0.22;
  const probe = PROBE_FACES.map((f, i) => {
    const x = x0 + (i + 0.5) * cell;
    const y = y0 + h;
    return `<text x="${x}" y="${y + strip * 0.35}" text-anchor="middle" font-family="${f.family}" font-weight="${f.weight}" font-size="${fs}" fill="#000">${f.text}</text>` +
      `<text x="${x}" y="${y + strip * 0.8}" text-anchor="middle" font-family="serif" font-weight="${f.weight}" font-size="${fs}" fill="#000">${f.text}</text>`;
  }).join("");
  return {
    markup: markup
      .replace(m[0], `viewBox="${x0} ${y0} ${w} ${h + strip}"`)
      .replace(/(<svg\b[^>]*?)\swidth="[^"]*"/, `$1 width="${w}"`)
      .replace(/(<svg\b[^>]*?)\sheight="[^"]*"/, `$1 height="${h + strip}"`)
      .replace(/<\/svg>\s*$/, `<g data-font-probe="">${probe}</g></svg>`),
    w, h, strip,
  };
}

/** Whether every probe face paints in its own font (not invisibly, not as the fallback). */
function probeReady(img: HTMLImageElement, w: number, h: number, strip: number): boolean {
  const scale = 1200 / w;
  const cw = 1200, ch = Math.ceil(strip * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, h, w, strip, 0, 0, cw, ch);
  const cell = cw / PROBE_FACES.length;
  return PROBE_FACES.every((_, i) => {
    const x = Math.round(i * cell), wd = Math.floor(cell);
    const top = ctx.getImageData(x, 0, wd, Math.floor(ch / 2)).data;
    const bottom = ctx.getImageData(x, Math.floor(ch / 2), wd, Math.floor(ch / 2)).data;
    let inkTop = 0, inkBottom = 0, differ = 0;
    for (let k = 3; k < Math.min(top.length, bottom.length); k += 4) {
      const a = top[k] > 100, b = bottom[k] > 100;
      if (a) inkTop++;
      if (b) inkBottom++;
      if (a !== b) differ++;
    }
    // painted (not the invisible block period) and unlike the default font
    return inkTop > inkBottom * 0.3 && differ > Math.max(inkTop, inkBottom) * 0.3;
  });
}

async function rasterise(svg: SVGSVGElement, paper: PaperSize, dpi: number): Promise<HTMLCanvasElement> {
  const { width, height } = pixelSize(paper, dpi);
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error(
      `${paper} at ${dpi} DPI is ${width}×${height}px, beyond what browsers can rasterise. Choose a lower DPI or use SVG export.`,
    );
  }
  const probe = withFontProbe(await serializePoster(svg, paper));
  const url = URL.createObjectURL(new Blob([probe.markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    let ready = false;
    for (let attempt = 0; attempt < 400 && !ready; attempt++) {
      ready = probeReady(img, probe.w, probe.h, probe.strip);
      if (!ready) await new Promise((r) => setTimeout(r, 50));
    }
    if (!ready) throw new Error("The poster's fonts did not finish loading, so names would be missing. Please try the export again.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#f4ecd8";
    ctx.fillRect(0, 0, width, height);
    // the page only, without the probe strip below it
    ctx.drawImage(img, 0, 0, probe.w, probe.h, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportSvg(svg: SVGSVGElement, filename: string, paper: PaperSize = "A1") {
  const markup = await serializePoster(svg, paper);
  download(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
}

export async function exportPng(svg: SVGSVGElement, filename: string, paper: PaperSize, dpi: number) {
  const canvas = await rasterise(svg, paper, dpi);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
  if (!blob) throw new Error("PNG encoding failed (image too large?)");
  download(blob, `${filename}-${paper}-${dpi}dpi.png`);
}

export async function exportPdf(svg: SVGSVGElement, filename: string, paper: PaperSize, dpi: number) {
  const [{ jsPDF }, canvas] = await Promise.all([import("jspdf"), rasterise(svg, paper, dpi)]);
  const { w, h } = PAPER_SIZES[paper];
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [w, h], compress: true });
  pdf.setProperties({ title: filename, creator: "Shajarah" });
  // High-quality JPEG keeps A0/A1 files printable without hundreds of MB.
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, w, h, undefined, "FAST");
  download(pdf.output("blob"), `${filename}-${paper}-${dpi}dpi.pdf`);
}

/**
 * The poster split over several A4/A3 sheets for home or copy-shop printing:
 * each page carries a tile with 10 mm overlap, crop marks and its position
 * (row, column), so the sheets can be trimmed and assembled.
 */
export async function exportTiledPdf(svg: SVGSVGElement, filename: string, paper: PaperSize, sheet: SheetSize, dpi: number) {
  const [{ jsPDF }, canvas] = await Promise.all([import("jspdf"), rasterise(svg, paper, dpi)]);
  const P = PAPER_SIZES[paper];
  const S = SHEET_SIZES[sheet];
  const margin = 10, overlap = 10;
  const tileW = S.w - 2 * margin, tileH = S.h - 2 * margin;
  const cols = Math.max(1, Math.ceil((P.w - overlap) / (tileW - overlap)));
  const rows = Math.max(1, Math.ceil((P.h - overlap) / (tileH - overlap)));
  const pxPerMm = canvas.width / P.w;
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [S.w, S.h], compress: true });
  pdf.setProperties({ title: `${filename} (${paper} on ${rows}×${cols} ${sheet} sheets)`, creator: "Shajarah" });
  const tile = document.createElement("canvas");
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (r || c) pdf.addPage([S.w, S.h], "portrait");
      const x = c * (tileW - overlap), y = r * (tileH - overlap);
      const w = Math.min(tileW, P.w - x), h = Math.min(tileH, P.h - y);
      tile.width = Math.round(w * pxPerMm);
      tile.height = Math.round(h * pxPerMm);
      tile.getContext("2d")!.drawImage(canvas, x * pxPerMm, y * pxPerMm, w * pxPerMm, h * pxPerMm, 0, 0, tile.width, tile.height);
      pdf.addImage(tile.toDataURL("image/jpeg", 0.93), "JPEG", margin, margin, w, h, undefined, "FAST");
      // crop marks at the tile corners, and the tile's position
      pdf.setLineWidth(0.15);
      for (const [cx, cy] of [[margin, margin], [margin + w, margin], [margin, margin + h], [margin + w, margin + h]]) {
        pdf.line(cx - 6, cy, cx - 1, cy); pdf.line(cx + 1, cy, cx + 6, cy);
        pdf.line(cx, cy - 6, cx, cy - 1); pdf.line(cx, cy + 1, cx, cy + 6);
      }
      pdf.setFontSize(7);
      pdf.text(`${filename} · ${paper} · row ${r + 1}/${rows}, column ${c + 1}/${cols} · overlap ${overlap} mm`, margin, S.h - 4);
    }
  }
  download(pdf.output("blob"), `${filename}-${paper}-tiled-${sheet}.pdf`);
}
