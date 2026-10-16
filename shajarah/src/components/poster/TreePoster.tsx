"use client";

import { forwardRef, memo, useMemo } from "react";
import type { PosterLayout, PosterNode } from "@/lib/layout/botanical";
import { BARK_DARK, LEAF_TONES, generationColor, generationLabel } from "@/lib/layout/palette";
import { mulberry32 } from "@/lib/layout/random";

export interface PosterMeta {
  title: string | null;
  subtitle: string | null;
  name: string;
}

interface Props {
  layout: PosterLayout;
  meta: PosterMeta;
  selectedId?: string | null;
  /** Ancestors of the selected member, outlined in gold. */
  highlightIds?: Set<string>;
  onSelect?: (memberId: string) => void;
  className?: string;
}

const FONT = "Amiri, 'Noto Naskh Arabic', 'Times New Roman', serif";
const GOLD = "#b8892f";
const INK = "#3b2410";

/**
 * Pure SVG renderer for a computed PosterLayout. Everything is vector and
 * self-contained (no external images), so the same element is what gets
 * serialised for SVG / PNG / PDF export.
 */
export const TreePoster = memo(
  forwardRef<SVGSVGElement, Props>(function TreePoster(
    { layout, meta, selectedId, highlightIds, onSelect, className },
    ref,
  ) {
    const { width: W, height: H, rtl } = layout;
    const grass = useMemo(() => grassBlades(layout), [layout]);

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        className={className}
        fontFamily={FONT}
        role="img"
        aria-label={meta.title ?? meta.name}
      >
        <defs>
          <linearGradient id="sh-parchment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f8f1df" />
            <stop offset="1" stopColor="#ecdcb8" />
          </linearGradient>
          <radialGradient id="sh-vignette" cx="0.5" cy="0.45" r="0.75">
            <stop offset="0.6" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#6b4a1a" stopOpacity="0.22" />
          </radialGradient>
          <pattern id="sh-girih" width="160" height="160" patternUnits="userSpaceOnUse">
            <path
              d="M80 8 L101 59 L152 80 L101 101 L80 152 L59 101 L8 80 L59 59 Z M80 30 L80 130 M30 80 L130 80 M0 0 L160 160 M160 0 L0 160"
              fill="none" stroke="#c9b27a" strokeWidth="1.4" opacity="0.28"
            />
          </pattern>
          <linearGradient id="sh-bark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#3b240f" />
            <stop offset="0.45" stopColor="#6d4524" />
            <stop offset="0.6" stopColor="#5b391b" />
            <stop offset="1" stopColor="#331f0c" />
          </linearGradient>
          <radialGradient id="sh-gold" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fff2bf" />
            <stop offset="0.55" stopColor="#e7bd57" />
            <stop offset="1" stopColor="#a8761f" />
          </radialGradient>
          <radialGradient id="sh-ground" cx="0.5" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#7fb04a" />
            <stop offset="1" stopColor="#3f7a26" />
          </radialGradient>
          {/* Unit leaf pointing along +x; instances are scaled by <use>. */}
          <path id="sh-leaf" d="M0 0C.3-.36.78-.34 1 0 .78.34.3.36 0 0Z" />
          {/* Corner flourish in a 100×100 box, drawn as strokes. */}
          <g id="sh-corner" fill="none" strokeLinecap="round">
            <path d="M0 0H100M0 0V100" strokeWidth="5" />
            <path d="M14 14H64M14 14V64" strokeWidth="2" />
            <path d="M14 14C34 14 44 24 44 44 24 44 14 34 14 14Z" strokeWidth="2.5" />
            <path d="M64 14c10 0 14 8 8 14s-14 0-10-6M14 64c0 10 8 14 14 8s0-14-6-10" strokeWidth="2" />
            <circle cx="30" cy="30" r="4" fill="currentColor" stroke="none" />
          </g>
        </defs>

        {/* Parchment, pattern, vignette */}
        <rect width={W} height={H} fill="url(#sh-parchment)" />
        <rect width={W} height={H} fill="url(#sh-girih)" />
        <rect width={W} height={H} fill="url(#sh-vignette)" />

        {/* Ornamental frame */}
        <rect x={W * 0.018} y={W * 0.018} width={W * 0.964} height={H - W * 0.036} fill="none" stroke={GOLD} strokeWidth={W * 0.004} />
        <rect x={W * 0.028} y={W * 0.028} width={W * 0.944} height={H - W * 0.056} fill="none" stroke={GOLD} strokeWidth={W * 0.0012} />
        {[
          [W * 0.03, W * 0.03, 1, 1],
          [W * 0.97, W * 0.03, -1, 1],
          [W * 0.03, H - W * 0.03, 1, -1],
          [W * 0.97, H - W * 0.03, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <use key={i} href="#sh-corner" transform={`translate(${x} ${y}) scale(${sx * W * 0.0009} ${sy * W * 0.0009})`} stroke={GOLD} color={GOLD} />
        ))}

        {/* Title */}
        {meta.title && (
          <text x={W / 2} y={H * 0.052} textAnchor="middle" fontSize={W * 0.034} fontWeight={700} fill={INK} direction={rtl ? "rtl" : "ltr"}>
            {meta.title}
          </text>
        )}
        {meta.subtitle && (
          <text x={W / 2} y={H * 0.075} textAnchor="middle" fontSize={W * 0.019} fill="#6b4a22" direction={rtl ? "rtl" : "ltr"}>
            {meta.subtitle}
          </text>
        )}

        {/* Ground */}
        <ellipse cx={W / 2} cy={layout.groundY + W * 0.035} rx={W * 0.36} ry={W * 0.04} fill="url(#sh-ground)" />
        <path d={grass} stroke="#4c8a2c" strokeWidth={W * 0.0013} strokeLinecap="round" fill="none" />

        {/* Trunk */}
        <path d={layout.trunkPath} fill="url(#sh-bark)" />
        {layout.barkLines.map((d, i) => (
          <path key={i} d={d} stroke={BARK_DARK} strokeWidth={W * 0.0018} opacity={0.3} fill="none" strokeLinecap="round" />
        ))}

        {/* Crown */}
        <g fill="#5a391c">
          {layout.branches.map((d, i) => <path key={i} d={d} />)}
        </g>
        <g fill="#5e3d1f">
          {layout.twigs.map((d, i) => <path key={i} d={d} />)}
        </g>
        <g>
          {layout.leaves.map((l, i) => (
            <use
              key={i}
              href="#sh-leaf"
              transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(0)}) scale(${l.size.toFixed(1)})`}
              fill={LEAF_TONES[l.tone % LEAF_TONES.length]}
            />
          ))}
        </g>

        {/* Ancestral chain on the trunk */}
        {layout.trunkLabels.map((l) => (
          <text
            key={l.member.id}
            x={l.x}
            y={l.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={l.fontSize}
            fontWeight={700}
            fill="#f3dc9a"
            stroke="#2a1708"
            strokeWidth={l.fontSize * 0.08}
            paintOrder="stroke"
            letterSpacing={rtl ? undefined : "0.05em"}
            style={{ cursor: onSelect ? "pointer" : undefined }}
            onClick={onSelect ? () => onSelect(l.member.id) : undefined}
          >
            {l.member.name}
          </text>
        ))}

        {/* Name tags */}
        {layout.stubs.map((n) => (
          <NameTag key={n.id} node={n} fill="#e9843c" textFill="#fff" selected={selectedId === n.id} onSelect={onSelect} />
        ))}
        {layout.nodes.map((n) => {
          const c = generationColor(n.generation);
          return (
            <NameTag
              key={n.id}
              node={n}
              fill={n.depth === 1 ? "url(#sh-gold)" : c.fill}
              textFill={n.depth === 1 ? INK : c.text}
              selected={selectedId === n.id}
              highlighted={highlightIds?.has(n.id)}
              onSelect={onSelect}
            />
          );
        })}
        {layout.base && (
          <g style={{ cursor: onSelect ? "pointer" : undefined }} onClick={onSelect ? () => onSelect(layout.base!.id) : undefined}>
            <circle cx={layout.base.x} cy={layout.base.y} r={layout.base.w / 2 + W * 0.006} fill={GOLD} />
            <circle
              cx={layout.base.x} cy={layout.base.y} r={layout.base.w / 2}
              fill="url(#sh-gold)" stroke={selectedId === layout.base.id ? "#b3261e" : INK} strokeWidth={W * 0.002}
            />
            <text x={layout.base.x} y={layout.base.y} textAnchor="middle" dominantBaseline="central" fontSize={layout.base.fontSize} fontWeight={700} fill={INK}>
              {layout.base.member.name}
            </text>
          </g>
        )}

        <Legend layout={layout} />
        <Stats layout={layout} />
        <text x={W / 2} y={H - W * 0.045} textAnchor="middle" fontSize={W * 0.011} fill="#7a5a2c">
          {rtl ? `${meta.name} — صُمّمت بواسطة شجرة` : `${meta.name} — made with Shajarah`}
        </text>
      </svg>
    );
  }),
);

function NameTag({
  node, fill, textFill, selected, highlighted, onSelect,
}: {
  node: PosterNode;
  fill: string;
  textFill: string;
  selected?: boolean;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
}) {
  const stroke = selected ? "#b3261e" : highlighted ? "#8a5a00" : "rgba(43,26,12,0.55)";
  const sw = selected || highlighted ? node.fontSize * 0.16 : node.fontSize * 0.06;
  return (
    <g
      transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`}
      style={{ cursor: onSelect ? "pointer" : undefined }}
      onClick={onSelect ? () => onSelect(node.id) : undefined}
    >
      <title>{node.member.name}</title>
      {node.shape === "medallion" ? (
        <circle r={node.w / 2} fill={fill} stroke={selected ? stroke : GOLD} strokeWidth={Math.max(sw, node.w * 0.05)} />
      ) : (
        <rect x={-node.w / 2} y={-node.h / 2} width={node.w} height={node.h} rx={node.h / 2} fill={fill} stroke={stroke} strokeWidth={sw} />
      )}
      <text textAnchor="middle" dominantBaseline="central" fontSize={node.fontSize} fontWeight={node.shape === "medallion" ? 700 : 400} fill={textFill}>
        {node.member.name}
      </text>
    </g>
  );
}

function Legend({ layout }: { layout: PosterLayout }) {
  const { width: W, groundY, rtl, generationsPresent } = layout;
  if (!generationsPresent.length) return null;
  const gens = generationsPresent.slice(0, 20);
  const cols = Math.ceil(gens.length / 5);
  const rows = Math.ceil(gens.length / cols);
  const row = W * 0.017;
  const boxW = W * 0.13 * cols + W * 0.02;
  const boxH = row * rows + W * 0.05;
  const x0 = rtl ? W * 0.05 : W * 0.95 - boxW;
  const y0 = groundY + W * 0.075;
  return (
    <g>
      <rect x={x0} y={y0} width={boxW} height={boxH} rx={W * 0.006} fill="#fbf5e6" stroke={GOLD} strokeWidth={W * 0.0012} />
      <text x={x0 + boxW / 2} y={y0 + W * 0.022} textAnchor="middle" fontSize={W * 0.013} fontWeight={700} fill={INK}>
        {rtl ? "ألوان الأجيال" : "Generations"}
      </text>
      {gens.map((g, i) => {
        const col = Math.floor(i / rows);
        const r = i % rows;
        const cx = x0 + W * 0.01 + col * W * 0.13;
        const cy = y0 + W * 0.04 + r * row;
        return (
          <g key={g}>
            <rect x={rtl ? cx + W * 0.105 : cx} y={cy - row * 0.32} width={W * 0.018} height={row * 0.64} rx={row * 0.3} fill={generationColor(g).fill} stroke="rgba(0,0,0,.35)" strokeWidth={1} />
            <text x={rtl ? cx + W * 0.098 : cx + W * 0.026} y={cy} dominantBaseline="central" textAnchor={rtl ? "end" : "start"} fontSize={W * 0.0105} fill={INK}>
              {generationLabel(g, rtl)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Stats({ layout }: { layout: PosterLayout }) {
  const { width: W, groundY, rtl, stats } = layout;
  const boxW = W * 0.2;
  const x0 = rtl ? W * 0.95 - boxW : W * 0.05;
  const y0 = groundY + W * 0.075;
  const rows: [string, string, number][] = [
    ["الذكور", "Males", stats.males],
    ["الإناث", "Females", stats.females],
    ["المجموع", "Total", stats.total],
  ];
  return (
    <g>
      <rect x={x0} y={y0} width={boxW} height={W * 0.105} rx={W * 0.006} fill="#fbf5e6" stroke={GOLD} strokeWidth={W * 0.0012} />
      <text x={x0 + boxW / 2} y={y0 + W * 0.022} textAnchor="middle" fontSize={W * 0.013} fontWeight={700} fill={INK}>
        {rtl ? "إحصائية أفراد الأسرة" : "Family statistics"}
      </text>
      {rows.map(([ar, en, v], i) => (
        <g key={en}>
          <text x={rtl ? x0 + boxW - W * 0.015 : x0 + W * 0.015} y={y0 + W * (0.047 + i * 0.02)} textAnchor="start" direction={rtl ? "rtl" : "ltr"} fontSize={W * 0.0115} fill={INK}>
            {rtl ? ar : en}
          </text>
          <text x={rtl ? x0 + W * 0.015 : x0 + boxW - W * 0.015} y={y0 + W * (0.047 + i * 0.02)} textAnchor={rtl ? "start" : "end"} fontSize={W * 0.0115} fontWeight={700} fill={INK}>
            {v.toLocaleString(rtl ? "ar-SA" : "en-US")}
          </text>
        </g>
      ))}
    </g>
  );
}

function grassBlades(layout: PosterLayout): string {
  const rand = mulberry32(99);
  const { width: W, groundY } = layout;
  const parts: string[] = [];
  for (let i = 0; i < 260; i++) {
    const t = rand() * 2 - 1;
    const x = W / 2 + t * W * 0.34;
    const y = groundY + W * 0.035 - Math.sqrt(Math.max(0, 1 - t * t)) * W * 0.035 + rand() * W * 0.02;
    const h = W * (0.008 + rand() * 0.014);
    const lean = (rand() - 0.5) * h * 0.8;
    parts.push(`M${x.toFixed(1)} ${y.toFixed(1)}q${(lean / 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${lean.toFixed(1)} ${(-h).toFixed(1)}`);
  }
  return parts.join("");
}
