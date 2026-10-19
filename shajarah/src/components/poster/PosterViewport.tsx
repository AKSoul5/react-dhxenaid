"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { select } from "d3-selection";
import { zoom, zoomIdentity, zoomTransform, type ZoomBehavior } from "d3-zoom";

interface Props {
  /** Poster size in layout units, used to fit the poster on screen. */
  width: number;
  height: number;
  children: ReactNode;
}

/**
 * Pan/zoom wrapper powered by d3-zoom. The transform is applied to a wrapper
 * <div>, so the poster <svg> itself stays untransformed and export-ready.
 *
 * As in design and map programs: the mouse wheel (or a two-finger swipe)
 * scrolls the poster, Shift + wheel sideways; Ctrl/⌘ + wheel (or a pinch)
 * zooms at the pointer; dragging pans. The poster stays within half its
 * size of the view, so it cannot be scrolled out of sight.
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
      .translateExtent([[-DISPLAY_W * 0.5, -displayH * 0.5], [DISPLAY_W * 1.5, displayH * 1.5]])
      // (a plain wheel scrolls, below; only Ctrl/⌘ + wheel, or a pinch, zooms)
      .filter((e: MouseEvent | WheelEvent) => (e.type === "wheel" ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.button))
      // (a pinch sends small steps and needs the boost; a mouse wheel's
      // notch with Ctrl zooms about 15%)
      .wheelDelta((e: WheelEvent) => -e.deltaY * (e.deltaMode === 1 ? 0.05 : e.deltaMode ? 1 : 0.002) * (Math.abs(e.deltaY) < 40 ? 10 : 1))
      .on("zoom", (e) => {
        if (inner.current) {
          const t = e.transform;
          inner.current.style.transform = `translate(${t.x}px, ${t.y}px) scale(${t.k})`;
        }
      });
    behavior.current = z;
    select(el).call(z).on("dblclick.zoom", null);
    const scroll = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      let dx = e.deltaX * unit, dy = e.deltaY * unit;
      if (e.shiftKey && !dx) [dx, dy] = [dy, 0];
      const k = zoomTransform(el).k;
      select(el).call(z.translateBy, -dx / k, -dy / k);
    };
    el.addEventListener("wheel", scroll, { passive: false });
    fit();
    const ro = new ResizeObserver(() => fit());
    ro.observe(el);
    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", scroll);
      select(el).on(".zoom", null);
    };
  }, [fit, displayH]);

  const zoomBy = (k: number) => {
    if (outer.current && behavior.current) select(outer.current).call(behavior.current.scaleBy, k);
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#d9ccb0]" ref={outer}>
      <div ref={inner} style={{ width: DISPLAY_W, height: displayH, transformOrigin: "0 0" }} className="shadow-2xl">
        {children}
      </div>
      <div className="absolute bottom-4 end-4 flex flex-col overflow-hidden rounded-md border border-parchment-300 bg-white/90 shadow">
        <button type="button" className="px-3 py-1.5 hover:bg-parchment-100" onClick={() => zoomBy(1.4)} title="Zoom in (or Ctrl + scroll)">＋</button>
        <button type="button" className="px-3 py-1.5 hover:bg-parchment-100" onClick={() => zoomBy(1 / 1.4)} title="Zoom out (or Ctrl + scroll)">－</button>
        <button type="button" className="px-3 py-1.5 text-xs hover:bg-parchment-100" onClick={fit} title="Fit to screen">Fit</button>
      </div>
    </div>
  );
}
