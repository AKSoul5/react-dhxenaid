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

export const PAPER_SIZES = {
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
} as const;
export type PaperSize = keyof typeof PAPER_SIZES;

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

/** Standalone SVG markup with fonts embedded and a physical page size. */
export async function serializePoster(svg: SVGSVGElement, paper: PaperSize = "A1"): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", SVG_NS);
  clone.setAttribute("xmlns:xlink", XLINK_NS);
  clone.removeAttribute("class");
  clone.removeAttribute("style");
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

let fontsWarm: Promise<void> | null = null;

/**
 * SVG-as-image documents load their embedded web fonts asynchronously, and
 * img.decode() resolves before they are ready — Chrome then paints the text
 * invisibly (font "block" period), so the first export would lose every
 * name. Warm the fonts with a tiny probe image and wait until its text
 * actually paints before rasterising the poster.
 */
function warmUpFonts(): Promise<void> {
  fontsWarm ??= (async () => {
    const css = await embeddedFontCss();
    // One sample per embedded face (Amiri Arabic/Latin × regular/bold, Ruqaa), each in
    // its own quarter of the probe, so every face must have painted.
    const samples = [
      { text: "أبجد", weight: 400, family: "Amiri" }, { text: "أبجد", weight: 700, family: "Amiri" },
      { text: "Abc", weight: 400, family: "Amiri" }, { text: "Abc", weight: 700, family: "Amiri" },
      { text: "أبجد", weight: 400, family: "Aref Ruqaa" },
    ];
    const probe =
      `<svg xmlns="${SVG_NS}" width="${samples.length * 100}" height="60"><style>${css}</style>` +
      samples
        .map((s, i) => `<text x="${i * 100 + 8}" y="42" font-family="${s.family}" font-weight="${s.weight}" font-size="36" fill="#000">${s.text}</text>`)
        .join("") +
      `</svg>`;
    const url = URL.createObjectURL(new Blob([probe], { type: "image/svg+xml;charset=utf-8" }));
    const canvas = document.createElement("canvas");
    canvas.width = samples.length * 100;
    canvas.height = 60;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    try {
      for (let attempt = 0; attempt < 80; attempt++) {
        const img = new Image();
        img.src = url;
        await img.decode();
        ctx.clearRect(0, 0, canvas.width, 60);
        ctx.drawImage(img, 0, 0);
        const painted = samples.every((_, i) => {
          const px = ctx.getImageData(i * 100, 0, 100, 60).data;
          let ink = 0;
          for (let k = 3; k < px.length; k += 4) if (px[k] > 128) ink++;
          return ink > 80;
        });
        if (painted) return;
        await new Promise((r) => setTimeout(r, 50));
      }
    } finally {
      URL.revokeObjectURL(url);
    }
  })();
  return fontsWarm;
}

async function rasterise(svg: SVGSVGElement, paper: PaperSize, dpi: number): Promise<HTMLCanvasElement> {
  const { width, height } = pixelSize(paper, dpi);
  if (width * height > MAX_CANVAS_PIXELS) {
    throw new Error(
      `${paper} at ${dpi} DPI is ${width}×${height}px, beyond what browsers can rasterise. Choose a lower DPI or use SVG export.`,
    );
  }
  const [markup] = await Promise.all([serializePoster(svg, paper), warmUpFonts()]);
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    ctx.fillStyle = "#f4ecd8";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
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
