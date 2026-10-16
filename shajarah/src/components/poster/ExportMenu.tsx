"use client";

import { useState, type RefObject } from "react";
import {
  PAPER_SIZES, exportPdf, exportPng, exportSvg, pixelSize, type PaperSize,
} from "@/lib/export/exportPoster";

interface Props {
  svgRef: RefObject<SVGSVGElement>;
  filename: string;
}

export function ExportMenu({ svgRef, filename }: Props) {
  const [open, setOpen] = useState(false);
  const [paper, setPaper] = useState<PaperSize>("A1");
  const [dpi, setDpi] = useState(300);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const px = pixelSize(paper, dpi);

  const run = async (kind: "svg" | "png" | "pdf") => {
    const svg = svgRef.current;
    if (!svg) return;
    setBusy(kind);
    setError(null);
    try {
      if (kind === "svg") await exportSvg(svg, filename, paper);
      if (kind === "png") await exportPng(svg, filename, paper, dpi);
      if (kind === "pdf") await exportPdf(svg, filename, paper, dpi);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative">
      <button type="button" className="btn-primary" onClick={() => setOpen((o) => !o)}>
        Export for print ▾
      </button>
      {open && (
        <div className="absolute end-0 z-30 mt-2 w-80 space-y-3 rounded-lg border border-parchment-300 bg-white p-4 shadow-xl">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-bark-700">
              Paper
              <select className="input mt-1" value={paper} onChange={(e) => setPaper(e.target.value as PaperSize)}>
                {Object.entries(PAPER_SIZES).map(([k, v]) => (
                  <option key={k} value={k}>{k} — {v.w}×{v.h} mm</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-bark-700">
              Resolution
              <select className="input mt-1" value={dpi} onChange={(e) => setDpi(Number(e.target.value))}>
                {[150, 200, 300].map((d) => <option key={d} value={d}>{d} DPI</option>)}
              </select>
            </label>
          </div>
          <p className="text-xs text-gray-500">Raster output: {px.width.toLocaleString()} × {px.height.toLocaleString()} px</p>
          <div className="grid gap-2">
            <button type="button" className="btn-outline justify-between" disabled={!!busy} onClick={() => run("svg")}>
              <span>Vector SVG</span><span className="text-xs text-gray-500">{busy === "svg" ? "Working…" : "infinite resolution"}</span>
            </button>
            <button type="button" className="btn-outline justify-between" disabled={!!busy} onClick={() => run("pdf")}>
              <span>Print PDF</span><span className="text-xs text-gray-500">{busy === "pdf" ? "Rendering…" : `${paper} @ ${dpi} DPI`}</span>
            </button>
            <button type="button" className="btn-outline justify-between" disabled={!!busy} onClick={() => run("png")}>
              <span>PNG image</span><span className="text-xs text-gray-500">{busy === "png" ? "Rendering…" : `${paper} @ ${dpi} DPI`}</span>
            </button>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      )}
    </div>
  );
}
