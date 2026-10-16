"use client";

import { forwardRef, memo, useMemo } from "react";
import type { PosterLayout, PosterNode } from "@/lib/layout/botanical";
import { LEAF_TONES, generationColor, generationLabel } from "@/lib/layout/palette";
import { hashString, mulberry32 } from "@/lib/layout/random";
import { shade, textOn } from "@/lib/theme";
import type { PosterTheme } from "@/lib/types";

export interface PosterMeta {
  title: string | null;
  subtitle: string | null;
  name: string;
}

interface Props {
  layout: PosterLayout;
  meta: PosterMeta;
  theme: PosterTheme;
  selectedId?: string | null;
  /** Ancestors of the selected member, outlined in gold. */
  highlightIds?: Set<string>;
  onSelect?: (memberId: string) => void;
  className?: string;
}

const FONT = "Amiri, 'Noto Naskh Arabic', 'Times New Roman', serif";

interface Palette {
  ink: string;
  frame: string;
  mono: boolean;
  /** Fill (colour or gradient url) and the flat colour used for text contrast. */
  fill: (n: PosterNode) => { fill: string; base: string };
  stroke: string;
}

function makePalette(theme: PosterTheme, layout: PosterLayout): Palette {
  const mono = theme.background === "white";
  const metallic = (gender: string) => (gender === "FEMALE" ? "url(#sh-m-female)" : "url(#sh-m-male)");
  const genderColor = (n: PosterNode) => (n.member.gender === "FEMALE" ? theme.female : theme.male);
  return {
    mono,
    ink: mono ? "#111111" : "#3b2410",
    frame: mono ? "#111111" : "#b8892f",
    stroke: mono ? "#111111" : "rgba(43,26,12,0.55)",
    fill: (n) => {
      if (n.shape === "medallion" && n.depth === 1) {
        return mono ? { fill: "#ffffff", base: "#ffffff" } : { fill: "url(#sh-gold)", base: "#e7bd57" };
      }
      if (theme.colorBy === "gender" || n.terminal) {
        const base = genderColor(n);
        // Classic leaves vary in tone so the canopy looks natural.
        if (theme.preset === "classic" && n.terminal && n.member.gender !== "FEMALE" && n.shape === "leaf") {
          const tone = LEAF_TONES[hashString(n.id) % LEAF_TONES.length];
          return { fill: tone, base: tone };
        }
        return { fill: theme.metallic ? metallic(n.member.gender) : base, base };
      }
      const c = generationColor(n.generation - layout.generationOffset);
      return { fill: c.fill, base: c.fill };
    },
  };
}

/**
 * Pure SVG renderer for a computed PosterLayout and theme. Everything is
 * vector and self-contained, so the same element is serialised for
 * SVG / PNG / PDF export.
 */
export const TreePoster = memo(
  forwardRef<SVGSVGElement, Props>(function TreePoster(
    { layout, meta, theme, selectedId, highlightIds, onSelect, className },
    ref,
  ) {
    const { width: W, height: H, rtl } = layout;
    const grass = useMemo(() => grassBlades(layout), [layout]);
    const pal = makePalette(theme, layout);
    const metal = (id: string, c: string) => (
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={shade(c, 0.6)} />
        <stop offset="0.45" stopColor={c} />
        <stop offset="0.7" stopColor={shade(c, -0.22)} />
        <stop offset="1" stopColor={shade(c, 0.3)} />
      </linearGradient>
    );

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
            <stop offset="0" stopColor={shade(theme.branch, -0.35)} />
            <stop offset="0.45" stopColor={shade(theme.branch, 0.18)} />
            <stop offset="0.6" stopColor={theme.branch} />
            <stop offset="1" stopColor={shade(theme.branch, -0.42)} />
          </linearGradient>
          <radialGradient id="sh-gold" cx="0.4" cy="0.35" r="0.7">
            <stop offset="0" stopColor="#fff2bf" />
            <stop offset="0.55" stopColor="#e7bd57" />
            <stop offset="1" stopColor="#a8761f" />
          </radialGradient>
          {metal("sh-m-male", theme.male)}
          {metal("sh-m-female", theme.female)}
          <linearGradient id="sh-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b4a2b" />
            <stop offset="0.5" stopColor="#4e331c" />
            <stop offset="1" stopColor="#36220f" />
          </linearGradient>
          <radialGradient id="sh-ground" cx="0.5" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#7fb04a" />
            <stop offset="1" stopColor="#3f7a26" />
          </radialGradient>
          {/* Unit leaf pointing along +x, used by the legend key. */}
          <path id="sh-leaf" d={leafPath(1, 0.45)} transform="translate(0.5 0)" />
          {/* Corner flourish in a 100×100 box, drawn as strokes. */}
          <g id="sh-corner" fill="none" strokeLinecap="round">
            <path d="M0 0H100M0 0V100" strokeWidth="5" />
            <path d="M14 14H64M14 14V64" strokeWidth="2" />
            <path d="M14 14C34 14 44 24 44 44 24 44 14 34 14 14Z" strokeWidth="2.5" />
            <path d="M64 14c10 0 14 8 8 14s-14 0-10-6M14 64c0 10 8 14 14 8s0-14-6-10" strokeWidth="2" />
            <circle cx="30" cy="30" r="4" fill="currentColor" stroke="none" />
          </g>
        </defs>

        {/* Background */}
        {pal.mono ? (
          <rect width={W} height={H} fill="#ffffff" />
        ) : (
          <>
            <rect width={W} height={H} fill="url(#sh-parchment)" />
            <rect width={W} height={H} fill="url(#sh-girih)" />
            <rect width={W} height={H} fill="url(#sh-vignette)" />
          </>
        )}

        {/* Ornamental frame */}
        <rect x={W * 0.018} y={W * 0.018} width={W * 0.964} height={H - W * 0.036} fill="none" stroke={pal.frame} strokeWidth={W * 0.004} />
        <rect x={W * 0.028} y={W * 0.028} width={W * 0.944} height={H - W * 0.056} fill="none" stroke={pal.frame} strokeWidth={W * 0.0012} />
        {[
          [W * 0.03, W * 0.03, 1, 1],
          [W * 0.97, W * 0.03, -1, 1],
          [W * 0.03, H - W * 0.03, 1, -1],
          [W * 0.97, H - W * 0.03, -1, -1],
        ].map(([x, y, sx, sy], i) => (
          <use key={i} href="#sh-corner" transform={`translate(${x} ${y}) scale(${sx * W * 0.0009} ${sy * W * 0.0009})`} stroke={pal.frame} color={pal.frame} />
        ))}

        {/* Title */}
        {meta.title && (
          <text x={W / 2} y={H * 0.052} textAnchor="middle" fontSize={W * 0.034} fontWeight={700} fill={pal.ink} direction={rtl ? "rtl" : "ltr"}>
            {meta.title}
          </text>
        )}
        {meta.subtitle && (
          <text x={W / 2} y={H * 0.075} textAnchor="middle" fontSize={W * 0.019} fill={pal.mono ? "#444" : "#6b4a22"} direction={rtl ? "rtl" : "ltr"}>
            {meta.subtitle}
          </text>
        )}

        {/* Ground: soil with the ancient lineage, or a plain lawn */}
        {layout.soil ? null : pal.mono ? (
          <line x1={W * 0.2} x2={W * 0.8} y1={layout.groundY + W * 0.02} y2={layout.groundY + W * 0.02} stroke="#111" strokeWidth={W * 0.002} />
        ) : (
          <>
            <ellipse cx={W / 2} cy={layout.groundY + W * 0.035} rx={W * 0.36} ry={W * 0.04} fill="url(#sh-ground)" />
            <path d={grass} stroke="#4c8a2c" strokeWidth={W * 0.0013} strokeLinecap="round" fill="none" />
          </>
        )}

        {/* Trunk */}
        <path
          d={layout.trunkPath}
          fill={pal.mono ? "#ffffff" : "url(#sh-bark)"}
          stroke={pal.mono ? "#111" : "none"}
          strokeWidth={W * 0.002}
        />
        {!pal.mono && layout.barkLines.map((d, i) => (
          <path key={i} d={d} stroke={shade(theme.branch, -0.5)} strokeWidth={W * 0.0018} opacity={0.3} fill="none" strokeLinecap="round" />
        ))}

        {/* Soil over the trunk base: roots and the ancient lineage */}
        {layout.soil && <Soil layout={layout} pal={pal} grass={grass} />}

        {/* Branches */}
        <g fill={theme.branch}>
          {layout.branches.map((b, i) => <path key={i} d={b.d} />)}
        </g>

        {/* Ancestral chain on the trunk */}
        {layout.trunkLabels.map((l) => (
          <g
            key={l.member.id}
            style={{ cursor: onSelect ? "pointer" : undefined }}
            onClick={onSelect ? () => onSelect(l.member.id) : undefined}
          >
            {theme.trunkStyle === "badges" && (
              <rect
                x={l.x - l.w / 2} y={l.y - l.h / 2}
                width={l.w} height={l.h} rx={l.h / 2}
                fill={pal.mono ? "#ffffff" : "#f6ecd2"}
                stroke={selectedId === l.member.id ? "#b3261e" : theme.ancestor}
                strokeWidth={l.fontSize * 0.12}
              />
            )}
            <text
              x={l.x}
              y={l.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={l.fontSize}
              fontWeight={700}
              {...(theme.trunkStyle === "badges"
                ? { fill: pal.ink }
                : { fill: "#f3dc9a", stroke: "#2a1708", strokeWidth: l.fontSize * 0.08, paintOrder: "stroke" })}
            >
              {l.label}
            </text>
          </g>
        ))}

        {/* Stubs and person nodes */}
        {layout.stubs.map((n) => (
          <PersonNode
            key={n.id}
            node={n}
            fill={theme.colorBy === "gender" ? pal.fill(n).fill : pal.mono ? "#fff" : "#e9843c"}
            textFill={theme.colorBy === "gender" ? textOn(pal.fill(n).base) : pal.mono ? "#111" : "#fff"}
            ring={pal.frame}
            stroke={pal.stroke}
            selected={selectedId === n.id}
            onSelect={onSelect}
          />
        ))}
        {layout.nodes.map((n) => {
          const { fill, base } = pal.fill(n);
          return (
            <PersonNode
              key={n.id}
              node={n}
              fill={fill}
              textFill={textOn(base)}
              ring={pal.frame}
              stroke={pal.stroke}
              selected={selectedId === n.id}
              highlighted={highlightIds?.has(n.id)}
              onSelect={onSelect}
            />
          );
        })}
        {layout.base && (
          <g style={{ cursor: onSelect ? "pointer" : undefined }} onClick={onSelect ? () => onSelect(layout.base!.id) : undefined}>
            <circle cx={layout.base.x} cy={layout.base.y} r={layout.base.w / 2 + W * 0.006} fill={pal.mono ? "#111" : "#b8892f"} />
            <circle
              cx={layout.base.x} cy={layout.base.y} r={layout.base.w / 2}
              fill={pal.mono ? "#fff" : "url(#sh-gold)"} stroke={selectedId === layout.base.id ? "#b3261e" : pal.ink} strokeWidth={W * 0.002}
            />
            <text x={layout.base.x} y={layout.base.y} textAnchor="middle" dominantBaseline="central" fontSize={layout.base.fontSize} fontWeight={700} fill={pal.ink}>
              {layout.base.label}
            </text>
          </g>
        )}

        <Legend layout={layout} theme={theme} pal={pal} />
        <Stats layout={layout} pal={pal} />
        <text x={W / 2} y={H - W * 0.045} textAnchor="middle" fontSize={W * 0.011} fill={pal.mono ? "#555" : "#7a5a2c"}>
          {rtl ? `${meta.name} — صُمّمت بواسطة شجرة` : `${meta.name} — made with Shajarah`}
        </text>
      </svg>
    );
  }),
);

/** Leaf blade centred on the origin, pointing along +x: round base, pointed tip. */
function leafPath(L: number, w: number): string {
  const f = (n: number) => n.toFixed(2);
  return `M${f(-L / 2)} 0C${f(-L * 0.22)} ${f(-w * 0.78)} ${f(L * 0.28)} ${f(-w * 0.62)} ${f(L / 2)} 0`
    + `C${f(L * 0.28)} ${f(w * 0.62)} ${f(-L * 0.22)} ${f(w * 0.78)} ${f(-L / 2)} 0Z`;
}

function PersonNode({
  node, fill, textFill, ring, stroke, selected, highlighted, onSelect,
}: {
  node: PosterNode;
  fill: string;
  textFill: string;
  ring: string;
  stroke: string;
  selected?: boolean;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
}) {
  const fs = node.fontSize;
  const edge = selected ? "#b3261e" : highlighted ? "#8a5a00" : stroke;
  const sw = selected || highlighted ? fs * 0.16 : fs * 0.06;
  const leaf = node.shape === "leaf";
  // Leaves keep their text upright by flipping when they point leftwards.
  const flip = leaf && (node.angle > 90 || node.angle < -90);
  let body: JSX.Element;
  switch (node.shape) {
    case "medallion":
      body = <circle r={node.w / 2} fill={fill} stroke={selected ? edge : ring} strokeWidth={Math.max(sw, node.w * 0.05)} />;
      break;
    case "leaf":
      body = <path d={leafPath(node.leafLength, node.leafWidth)} fill={fill} stroke={edge} strokeWidth={sw} />;
      break;
    case "circle":
      body = <circle r={node.w / 2} fill={fill} stroke={edge} strokeWidth={Math.max(sw, fs * 0.08)} />;
      break;
    case "oval":
      body = <ellipse rx={node.w / 2} ry={node.h / 2} fill={fill} stroke={edge} strokeWidth={Math.max(sw, fs * 0.08)} />;
      break;
    default:
      body = <rect x={-node.w / 2} y={-node.h / 2} width={node.w} height={node.h} rx={Math.min(node.h, node.w) / 2} fill={fill} stroke={edge} strokeWidth={sw} />;
  }
  const bold = node.shape === "medallion";
  return (
    <g
      transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})${leaf ? ` rotate(${node.angle.toFixed(1)})` : ""}`}
      style={{ cursor: onSelect ? "pointer" : undefined }}
      onClick={onSelect ? () => onSelect(node.id) : undefined}
    >
      <title>{node.label}</title>
      {body}
      <g transform={flip ? "rotate(180)" : undefined}>
        <text y={node.subLabel ? -fs * 0.32 : 0} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={bold ? 700 : 400} fill={textFill}>
          {node.label}
        </text>
        {node.subLabel && (
          <text y={fs * 0.55} textAnchor="middle" dominantBaseline="central" fontSize={fs * 0.7} fill={textFill} opacity={0.85}>
            {node.subLabel}
          </text>
        )}
      </g>
    </g>
  );
}

/** The soil mound at the foot of the tree, with roots and the ancient lineage inscribed in it. */
function Soil({ layout, pal, grass }: { layout: PosterLayout; pal: Palette; grass: string }) {
  const soil = layout.soil!;
  const { width: W, rtl } = layout;
  return (
    <g>
      <defs>
        {soil.lines.map((l, i) => <path key={i} id={`sh-soil-${i}`} d={l.path} />)}
      </defs>
      <path d={soil.mound} fill={pal.mono ? "#ffffff" : "url(#sh-soil)"} stroke={pal.mono ? "#111" : "#2e1c0c"} strokeWidth={W * 0.0015} />
      <g fill={pal.mono ? "none" : "#2a190a"} stroke={pal.mono ? "#111" : "none"} strokeWidth={W * 0.0008} opacity={pal.mono ? 0.6 : 0.55}>
        {soil.roots.map((d, i) => <path key={i} d={d} />)}
      </g>
      {!pal.mono && <path d={grass} stroke="#4c8a2c" strokeWidth={W * 0.0013} strokeLinecap="round" fill="none" />}
      <text fontSize={soil.fontSize} fill={pal.mono ? "#111" : "#f1dfb0"} direction={rtl ? "rtl" : "ltr"}>
        {soil.lines.map((l, i) => (
          <textPath key={i} href={`#sh-soil-${i}`} startOffset="50%" textAnchor="middle">
            {l.text}
          </textPath>
        ))}
      </text>
    </g>
  );
}

function Legend({ layout, theme, pal }: { layout: PosterLayout; theme: PosterTheme; pal: Palette }) {
  const { width: W, groundY, rtl, generationsPresent, generationOffset } = layout;
  const row = W * 0.017;
  type Item = { key: string; label: string; swatch: JSX.Element };
  const swatch = (fill: string, kind: "pill" | "leaf" | "badge") =>
    kind === "leaf" ? (
      <use href="#sh-leaf" transform={`translate(0 0) scale(${W * 0.022})`} fill={fill} />
    ) : (
      <rect x={0} y={-row * 0.32} width={W * 0.018} height={row * 0.64} rx={row * 0.3} fill={fill} stroke={kind === "badge" ? theme.ancestor : "rgba(0,0,0,.35)"} strokeWidth={kind === "badge" ? 3 : 1} />
    );
  const items: Item[] = [];
  if (theme.colorBy === "generation") {
    for (const g of generationsPresent.slice(0, 20)) {
      items.push({ key: `g${g}`, label: generationLabel(g - generationOffset, rtl), swatch: swatch(generationColor(g - generationOffset).fill, "pill") });
    }
  }
  const leafKind = theme.nodeShape === "leaf" ? "leaf" : "pill";
  const metal = theme.metallic;
  items.push({ key: "m", label: rtl ? "ذكر" : "Male", swatch: swatch(metal ? "url(#sh-m-male)" : theme.male, leafKind) });
  items.push({ key: "f", label: rtl ? "أنثى" : "Female", swatch: swatch(metal ? "url(#sh-m-female)" : theme.female, leafKind) });
  if (theme.trunkStyle === "badges") items.push({ key: "a", label: rtl ? "الأجداد" : "Ancestors", swatch: swatch(pal.mono ? "#fff" : "#f6ecd2", "badge") });

  const perCol = 6;
  const cols = Math.ceil(items.length / perCol);
  const rows = Math.min(items.length, perCol);
  const colW = W * 0.13;
  const boxW = colW * cols + W * 0.02;
  const boxH = row * rows + W * 0.05;
  const x0 = rtl ? W * 0.05 : W * 0.95 - boxW;
  const y0 = groundY + W * 0.075;
  return (
    <g>
      <rect x={x0} y={y0} width={boxW} height={boxH} rx={W * 0.006} fill={pal.mono ? "#fff" : "#fbf5e6"} stroke={pal.frame} strokeWidth={W * 0.0012} />
      <text x={x0 + boxW / 2} y={y0 + W * 0.022} textAnchor="middle" fontSize={W * 0.013} fontWeight={700} fill={pal.ink}>
        {theme.colorBy === "generation" ? (rtl ? "ألوان الأجيال" : "Generations") : rtl ? "دليل الألوان" : "Key"}
      </text>
      {items.map((it, i) => {
        const col = Math.floor(i / perCol);
        const r = i % perCol;
        const cx = rtl ? x0 + boxW - W * 0.01 - col * colW : x0 + W * 0.01 + col * colW;
        const cy = y0 + W * 0.04 + r * row;
        return (
          <g key={it.key}>
            <g transform={`translate(${rtl ? cx - W * 0.018 : cx} ${cy})`}>{it.swatch}</g>
            <text x={rtl ? cx - W * 0.026 : cx + W * 0.026} y={cy} dominantBaseline="central" textAnchor={rtl ? "end" : "start"} fontSize={W * 0.0105} fill={pal.ink}>
              {it.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Stats({ layout, pal }: { layout: PosterLayout; pal: Palette }) {
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
      <rect x={x0} y={y0} width={boxW} height={W * 0.105} rx={W * 0.006} fill={pal.mono ? "#fff" : "#fbf5e6"} stroke={pal.frame} strokeWidth={W * 0.0012} />
      <text x={x0 + boxW / 2} y={y0 + W * 0.022} textAnchor="middle" fontSize={W * 0.013} fontWeight={700} fill={pal.ink}>
        {rtl ? "إحصائية أفراد الأسرة" : "Family statistics"}
      </text>
      {rows.map(([ar, en, v], i) => (
        <g key={en}>
          <text x={rtl ? x0 + boxW - W * 0.015 : x0 + W * 0.015} y={y0 + W * (0.047 + i * 0.02)} textAnchor="start" direction={rtl ? "rtl" : "ltr"} fontSize={W * 0.0115} fill={pal.ink}>
            {rtl ? ar : en}
          </text>
          <text x={rtl ? x0 + W * 0.015 : x0 + boxW - W * 0.015} y={y0 + W * (0.047 + i * 0.02)} textAnchor={rtl ? "start" : "end"} fontSize={W * 0.0115} fontWeight={700} fill={pal.ink}>
            {v.toLocaleString(rtl ? "ar-SA" : "en-US")}
          </text>
        </g>
      ))}
    </g>
  );
}

function grassBlades(layout: PosterLayout): string {
  const rand = mulberry32(99);
  const { width: W, groundY, soil } = layout;
  const parts: string[] = [];
  for (let i = 0; i < 260; i++) {
    let x: number, y: number;
    if (soil) {
      // along the quadratic top edge of the soil mound
      const t = rand();
      const { x0, x1, y: ey, peak } = soil.top;
      const cy = 2 * peak - ey;
      x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * ((x0 + x1) / 2) + t * t * x1;
      y = (1 - t) * (1 - t) * ey + 2 * (1 - t) * t * cy + t * t * ey + rand() * W * 0.004;
    } else {
      const t = rand() * 2 - 1;
      x = W / 2 + t * W * 0.34;
      y = groundY + W * 0.035 - Math.sqrt(Math.max(0, 1 - t * t)) * W * 0.035 + rand() * W * 0.02;
    }
    const h = W * (0.008 + rand() * 0.014);
    const lean = (rand() - 0.5) * h * 0.8;
    parts.push(`M${x.toFixed(1)} ${y.toFixed(1)}q${(lean / 2).toFixed(1)} ${(-h / 2).toFixed(1)} ${lean.toFixed(1)} ${(-h).toFixed(1)}`);
  }
  return parts.join("");
}
