"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";

interface Props {
  /** Poster size in layout units, used to fit the poster on screen. */
  width: number;
  height: number;
  children: ReactNode;
}

/**
 * Pan/zoom wrapper powered by d3-zoom. The transform is applied to a wrapper
 * <div>, so the poster <svg> itself stays untransformed and export-ready.
 */
export function PosterViewport({ width, height, children }: Props) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const behavior = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const DISPLAY_W = 1000; // CSS px width the poster is rendered at, before zoom
  const displayH = (DISPLAY_W * height) / width;

  const fit = useCallback(() => {
    const el = outer.current;
    if (!el || !behavior.current) return;
    const { clientWidth: cw, clientHeight: ch } = el;
    const k = Math.min(cw / DISPLAY_W, ch / displayH) * 0.96;
    select(el).call(
      behavior.current.transform,
      zoomIdentity.translate((cw - DISPLAY_W * k) / 2, (ch - displayH * k) / 2).scale(k),
    );
  }, [displayH]);

  useEffect(() => {
    const el = outer.current;
    if (!el) return;
    const z = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.1, 12])
      .on("zoom", (e) => {
        if (inner.current) {
          const t = e.transform;
          inner.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
        }
      });
    behavior.current = z;
    select(el).call(z).on("dblclick.zoom", null);
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => {
      ro.disconnect();
      select(el).on(".zoom", null);
    };
  }, [fit]);

  const zoomBy = (k: number) => {
    if (outer.current && behavior.current) select(outer.current).call(behavior.current.scaleBy, k);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#d9ccb0]" ref={outer}>
      <div ref={inner} style={{ width: DISPLAY_W, height: displayH, transformOrigin: "0 0" }} className="shadow-2xl">
        {children}
      </div>
      <div className="absolute bottom-4 end-4 flex flex-col overflow-hidden rounded-md border border-parchment-300 bg-white/90 shadow">
        <button type="button" className="px-3 py-1.5 hover:bg-parchment-100" onClick={() => zoomBy(1.4)} title="Zoom in">＋</button>
        <button type="button" className="px-3 py-1.5 hover:bg-parchment-100" onClick={() => zoomBy(1 / 1.4)} title="Zoom out">－</button>
        <button type="button" className="px-3 py-1.5 text-xs hover:bg-parchment-100" onClick={fit} title="Fit to screen">Fit</button>
      </div>
    </div>
  );
}
