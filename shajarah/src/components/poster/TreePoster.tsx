"use client";

import { forwardRef, memo, useMemo, type ReactNode } from "react";
import type { PosterLayout, PosterNode } from "@/lib/layout/botanical";
import { LEAF_TONES, generationColor, generationLabel } from "@/lib/layout/palette";
import { hashString, mulberry32 } from "@/lib/layout/random";
import { textWidth } from "@/lib/layout/botanical";
import { barkStops, metalStops, shade, textOn } from "@/lib/theme";
import { HADITH, VERSE, scallopPath, textInCircle } from "./ornaments";
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
  /**
   * URL of the frame artwork (gold-foil border, corner arabesques and
   * parchment texture, designed in Canva). Drawn full-bleed behind the
   * tree when the theme's frame is on; without it the paper is plain.
   */
  frameSrc?: string | null;
}

const FONT = "Amiri, 'Traditional Arabic', 'Noto Naskh Arabic', 'Times New Roman', serif";
/** Calligraphic face for headings (title, panel captions). */
const RUQAA = "'Aref Ruqaa', Amiri, 'Traditional Arabic', serif";
const GOLD = ["#FFE57F", "#D4AF37", "#AA7C11"] as const;
const PARCHMENT = "#fbf5e6";
/** Flat paper colour under (or instead of) the frame artwork. */
const PAPER = "#f4ecd8";
/** Foliage leaf tones: [light, dark] pairs from yellow-green to deep green. */
const FOLIAGE = [
  ["#b9d36a", "#5d8f2c"],
  ["#8fc057", "#2f6b25"],
  ["#a7c95e", "#4a7d2a"],
  ["#6fa848", "#22561d"],
] as const;

interface Palette {
  ink: string;
  mono: boolean;
  /** Stroke colour of frames and panel borders (a gradient url or flat colour). */
  frame: string;
  frameFlat: string;
  /** Fill (colour or gradient url), flat colour for text contrast, and border colour. */
  fill: (n: PosterNode) => { fill: string; base: string; border: string };
}

function makePalette(theme: PosterTheme, layout: PosterLayout): Palette {
  const mono = theme.background === "white";
  const metal = (gender: string) => (gender === "FEMALE" ? "url(#sh-m-female)" : "url(#sh-m-male)");
  return {
    mono,
    ink: mono ? "#111111" : "#2e1a0a",
    frame: mono ? "#111111" : "url(#sh-gold-line)",
    frameFlat: mono ? "#111111" : "#b8892f",
    fill: (n) => {
      if (mono) {
        return { fill: n.member.gender === "FEMALE" ? theme.female : theme.male, base: "#ffffff", border: "#111111" };
      }
      if (n.shape === "medallion" && n.depth === 1) {
        return { fill: "url(#sh-m-gold)", base: GOLD[1], border: shade(GOLD[2], -0.35) };
      }
      if (theme.colorBy === "gender" || n.terminal) {
        const base = n.member.gender === "FEMALE" ? theme.female : theme.male;
        // Classic leaves vary in tone so the canopy looks natural.
        if (theme.preset === "classic" && n.terminal && n.member.gender !== "FEMALE" && n.shape === "leaf") {
          const tone = LEAF_TONES[hashString(n.id) % LEAF_TONES.length];
          return { fill: tone, base: tone, border: shade(tone, -0.45) };
        }
        return {
          fill: theme.metallic ? metal(n.member.gender) : base,
          base,
          border: n.member.gender === "FEMALE" ? shade(metalStops(base)[2], -0.35) : theme.nodeRim,
        };
      }
      const c = generationColor(n.generation - layout.generationOffset).fill;
      return { fill: c, base: c, border: shade(c, -0.45) };
    },
  };
}

/** Vertical metallic bevel: highlight → body → seam → shadow. */
function MetalGradient({ id, color }: { id: string; color: string }) {
  const [hi, body, lo] = metalStops(color);
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.42" stopColor={body} />
      <stop offset="0.5" stopColor={shade(body, -0.1)} />
      <stop offset="0.78" stopColor={lo} />
      <stop offset="1" stopColor={shade(body, 0.12)} />
    </linearGradient>
  );
}

/**
 * Pure SVG renderer for a computed PosterLayout and theme. Everything is
 * vector and self-contained, so the same element is serialised for
 * SVG / PNG / PDF export.
 */
export const TreePoster = memo(
  forwardRef<SVGSVGElement, Props>(function TreePoster(
    { layout, meta, theme, selectedId, highlightIds, onSelect, className, frameSrc },
    ref,
  ) {
    const { width: W, height: H, rtl } = layout;
    const grass = useMemo(() => grassBlades(layout), [layout]);
    const pal = makePalette(theme, layout);
    const [bark0, bark1, bark2] = barkStops(theme.branch);
    const shadow = pal.mono ? undefined : "url(#sh-shadow)";

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${W} ${H}`}
        className={className}
        fontFamily={FONT}
        textRendering="geometricPrecision"
        role="img"
        aria-label={meta.title ?? meta.name}
      >
        <defs>
          {/* Wood */}
          <linearGradient id="sh-bark" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={bark0} />
            <stop offset="0.38" stopColor={bark1} />
            <stop offset="0.62" stopColor={shade(bark1, -0.18)} />
            <stop offset="1" stopColor={bark2} />
          </linearGradient>
          <linearGradient id="sh-soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#6b4a2b" />
            <stop offset="0.5" stopColor="#4e331c" />
            <stop offset="1" stopColor="#2f1d0d" />
          </linearGradient>
          <radialGradient id="sh-ground" cx="0.5" cy="0.3" r="0.7">
            <stop offset="0" stopColor="#7fb04a" />
            <stop offset="1" stopColor="#3f7a26" />
          </radialGradient>

          {/* Metals */}
          <MetalGradient id="sh-m-male" color={theme.male} />
          <MetalGradient id="sh-m-female" color={theme.female} />
          <MetalGradient id="sh-m-gold" color={theme.ancestor} />
          <linearGradient id="sh-gold-line" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={GOLD[0]} />
            <stop offset="0.5" stopColor={GOLD[1]} />
            <stop offset="1" stopColor={GOLD[2]} />
          </linearGradient>
          <linearGradient id="sh-gold-text" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#c99a2e" />
            <stop offset="0.45" stopColor="#8a6114" />
            <stop offset="1" stopColor="#5e400a" />
          </linearGradient>
          <radialGradient id="sh-canopy" cx="0.5" cy="0.45" r="0.55">
            <stop offset="0" stopColor={theme.preset === "classic" ? "#d9e8b8" : "#f6e3a8"} stopOpacity="0.55" />
            <stop offset="0.7" stopColor={theme.preset === "classic" ? "#d9e8b8" : "#f6e3a8"} stopOpacity="0.22" />
            <stop offset="1" stopColor="#f6e3a8" stopOpacity="0" />
          </radialGradient>

          {/* Depth */}
          <filter id="sh-shadow" x="-10%" y="-10%" width="120%" height="125%">
            <feDropShadow dx={W * 0.0012} dy={W * 0.002} stdDeviation={W * 0.0016} floodColor="#1d1006" floodOpacity="0.4" />
          </filter>
          <filter id="sh-node-shadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy={W * 0.0012} stdDeviation={W * 0.001} floodColor="#1d1006" floodOpacity="0.35" />
          </filter>

          {/* Foliage leaves: unit leaf along +x with a gradient, midrib and veins. */}
          {FOLIAGE.map(([light, dark], i) => (
            <linearGradient key={`lg${i}`} id={`sh-leafg-${i}`} x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0" stopColor={light} />
              <stop offset="1" stopColor={dark} />
            </linearGradient>
          ))}
          {FOLIAGE.map((_, i) => (
            <g key={`ls${i}`} id={`sh-fol-${i}`}>
              <path d={leafPath(1, 0.5)} fill={`url(#sh-leafg-${i})`} stroke="#264a16" strokeWidth={0.018} />
              <path d="M-0.5 0Q0 -0.03 0.46 0" stroke="#eef5c8" strokeWidth={0.025} fill="none" opacity={0.55} />
              <path d="M-0.2 -0.02L0 -0.15M0.05 -0.02L0.22 -0.12M-0.2 0.02L0 0.15M0.05 0.02L0.22 0.12" stroke="#eef5c8" strokeWidth={0.014} fill="none" opacity={0.4} />
            </g>
          ))}
          {/* Unit leaf pointing along +x, used by the legend key. */}
          <path id="sh-leaf" d={leafPath(1, 0.45)} transform="translate(0.5 0)" />
        </defs>

        {/* Background: flat paper, then the frame artwork (border, arabesques, texture) */}
        <rect width={W} height={H} fill={pal.mono ? "#ffffff" : PAPER} />
        {theme.frame && frameSrc && (
          <image href={frameSrc} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
        )}

        {/* Header: basmala, title fitted between the corner medallions, gilt divider */}
        <Header layout={layout} meta={meta} theme={theme} pal={pal} />
        {layout.medallions.map((m, i) => {
          // RTL: the verse sits on the right, the hadith on the left
          const isVerse = (m.x > W / 2) === rtl;
          const show = isVerse ? theme.verse : theme.hadith;
          return show ? <TextMedallion key={i} {...m} content={isVerse ? VERSE : HADITH} pal={pal} /> : null;
        })}

        {/* Canopy silhouette */}
        {layout.canopy && !pal.mono && !layout.foliage && <path d={layout.canopy} fill="url(#sh-canopy)" />}
        {layout.canopy && pal.mono && (
          <path d={layout.canopy} fill="none" stroke="#111" strokeWidth={W * 0.0008} strokeDasharray={`${W * 0.004} ${W * 0.004}`} opacity={0.5} />
        )}

        {/* Ground when there is no soil tier */}
        {layout.soil ? null : pal.mono ? (
          <line x1={W * 0.2} x2={W * 0.8} y1={layout.groundY + W * 0.02} y2={layout.groundY + W * 0.02} stroke="#111" strokeWidth={W * 0.002} />
        ) : (
          <>
            <ellipse cx={W / 2} cy={layout.groundY + W * 0.035} rx={W * 0.36} ry={W * 0.04} fill="url(#sh-ground)" />
            <path d={grass} stroke="#4c8a2c" strokeWidth={W * 0.0013} strokeLinecap="round" fill="none" />
          </>
        )}

        {/* Surface roots (lawn); with a soil tier they are drawn on the soil */}
        {!layout.soil && <Roots layout={layout} pal={pal} />}

        {/* Trunk: clean vector body with a soft bark gradient */}
        <g filter={shadow}>
          <path d={layout.trunkPath} fill={pal.mono ? "#ffffff" : "url(#sh-bark)"} stroke={pal.mono ? "#111" : "none"} strokeWidth={W * 0.002} />
        </g>

        {/* Soil over the trunk base: roots and the ancient lineage */}
        {layout.soil && <Soil layout={layout} pal={pal} grass={grass} />}

        {/* Foliage twigs grow out of the real branches, so they go underneath */}
        {layout.foliage && (
          <g stroke={pal.mono ? "#1a1a1a" : shade(bark0, 0.08)} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {layout.foliage.twigs.map((t, i) => <path key={i} d={t.d} strokeWidth={t.w} />)}
          </g>
        )}

        {/* Branches: clean tapered vector lines */}
        <g filter={shadow} fill={pal.mono ? "#1a1a1a" : "url(#sh-bark)"}>
          {layout.branches.map((b, i) => <path key={i} d={b.d} />)}
        </g>

        {/* Leaves (decorative) above the branches, below the names */}
        {layout.foliage && (
          <g filter={pal.mono ? undefined : "url(#sh-node-shadow)"}>
            {layout.foliage.leaves.map((l, i) => (
              <use
                key={i}
                href={`#sh-fol-${l.tone % FOLIAGE.length}`}
                transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(0)}) scale(${l.size.toFixed(1)})`}
              />
            ))}
          </g>
        )}

        {/* Ancestral chain on the trunk */}
        <g filter={theme.trunkStyle === "badges" ? (pal.mono ? undefined : "url(#sh-node-shadow)") : undefined}>
          {layout.trunkLabels.map((l) => (
            <g
              key={l.member.id}
              style={{ cursor: onSelect ? "pointer" : undefined }}
              onClick={onSelect ? () => onSelect(l.member.id) : undefined}
            >
              {theme.trunkStyle === "badges" ? (
                <TrunkMedallion x={l.x} y={l.y} w={l.w} h={l.h} pal={pal} selected={selectedId === l.member.id} />
              ) : null}
              <text
                x={l.x}
                y={l.y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={l.fontSize}
                fontWeight={700}
                {...(theme.trunkStyle === "badges"
                  ? { fill: pal.ink }
                  : { fill: "#f3dc9a", stroke: "#24140b", strokeWidth: l.fontSize * 0.09, paintOrder: "stroke" })}
              >
                {l.label}
              </text>
            </g>
          ))}
        </g>

        {/* People */}
        <g filter={pal.mono ? undefined : "url(#sh-node-shadow)"}>
          {layout.stubs.map((n) => {
            const f = pal.fill({ ...n, depth: 2, terminal: true });
            return (
              <PersonNode key={n.id} node={n} {...f} textFill={pal.mono ? "#111" : textOn(f.base)} pal={pal} selected={selectedId === n.id} onSelect={onSelect} />
            );
          })}
          {layout.nodes.map((n) => {
            const f = pal.fill(n);
            return (
              <PersonNode
                key={n.id}
                node={n}
                {...f}
                textFill={pal.mono ? "#111" : textOn(f.base)}
                pal={pal}
                selected={selectedId === n.id}
                highlighted={highlightIds?.has(n.id)}
                onSelect={onSelect}
              />
            );
          })}
          {layout.base && (
            <g style={{ cursor: onSelect ? "pointer" : undefined }} onClick={onSelect ? () => onSelect(layout.base!.id) : undefined}>
              <OrnateMedallion cx={layout.base.x} cy={layout.base.y} r={layout.base.w / 2} pal={pal} selected={selectedId === layout.base.id} />
              <text x={layout.base.x} y={layout.base.y} textAnchor="middle" dominantBaseline="central" fontSize={layout.base.fontSize} fontWeight={700} fill={pal.ink}>
                {layout.base.label}
              </text>
            </g>
          )}
        </g>

        <Legend layout={layout} theme={theme} pal={pal} />
        <Stats layout={layout} pal={pal} />
        <text x={W / 2} y={layout.frame.footerY} textAnchor="middle" fontSize={W * 0.011} fill={pal.mono ? "#555" : "#7a5a2c"}>
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

/** Gilt rule with a central lozenge, used under the title. */
function Divider({ x, y, w, pal }: { x: number; y: number; w: number; pal: Palette }) {
  const d = w * 0.018;
  return (
    <g stroke={pal.frame} fill="none" strokeWidth={w * 0.004}>
      <path d={`M${x - w / 2} ${y}H${x - d * 2.2}M${x + d * 2.2} ${y}H${x + w / 2}`} />
      <path d={`M${x} ${y - d}L${x + d * 1.6} ${y}L${x} ${y + d}L${x - d * 1.6} ${y}Z`} fill={pal.frame} />
      <circle cx={x - w / 2} cy={y} r={d * 0.45} fill={pal.frame} />
      <circle cx={x + w / 2} cy={y} r={d * 0.45} fill={pal.frame} />
    </g>
  );
}

/** Round gold medallion with a double ring and a beaded inner ring. */
function OrnateMedallion({ cx, cy, r, pal, selected }: { cx: number; cy: number; r: number; pal: Palette; selected?: boolean }) {
  if (pal.mono) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={selected ? "#b3261e" : "#111"} strokeWidth={r * 0.06} />
        <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke="#111" strokeWidth={r * 0.015} strokeDasharray={`${r * 0.02} ${r * 0.05}`} />
      </g>
    );
  }
  return (
    <g>
      <path d={scallopPath(cx, cy, r * 1.06, r * 1.06, 22, 0.035)} fill="url(#sh-m-gold)" stroke={shade(GOLD[2], -0.35)} strokeWidth={r * 0.025} />
      <circle cx={cx} cy={cy} r={r * 0.9} fill={PARCHMENT} stroke={selected ? "#b3261e" : shade(GOLD[2], -0.2)} strokeWidth={selected ? r * 0.08 : r * 0.03} />
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke={GOLD[2]} strokeWidth={r * 0.022} strokeDasharray={`${r * 0.025} ${r * 0.045}`} strokeLinecap="round" />
    </g>
  );
}

/** Golden oval trunk medallion with an inner parchment field and beaded ring. */
function TrunkMedallion({ x, y, w, h, pal, selected }: { x: number; y: number; w: number; h: number; pal: Palette; selected?: boolean }) {
  const t = h * 0.13;
  if (pal.mono) {
    return (
      <g>
        <ellipse cx={x} cy={y} rx={w / 2} ry={h / 2} fill="#fff" stroke={selected ? "#b3261e" : "#111"} strokeWidth={h * 0.05} />
        <ellipse cx={x} cy={y} rx={w / 2 - t * 0.7} ry={h / 2 - t * 0.7} fill="none" stroke="#111" strokeWidth={h * 0.015} />
      </g>
    );
  }
  return (
    <g>
      <path d={scallopPath(x, y, w / 2, h / 2, 16, 0.045)} fill="url(#sh-m-gold)" stroke={shade(GOLD[2], -0.4)} strokeWidth={h * 0.03} />
      <ellipse cx={x} cy={y} rx={w / 2 - t} ry={h / 2 - t} fill={PARCHMENT} stroke={selected ? "#b3261e" : shade(GOLD[2], -0.15)} strokeWidth={selected ? h * 0.08 : h * 0.025} />
      <ellipse cx={x} cy={y} rx={w / 2 - t * 0.5} ry={h / 2 - t * 0.5} fill="none" stroke={GOLD[0]} strokeWidth={h * 0.02} strokeDasharray={`${h * 0.03} ${h * 0.06}`} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

function PersonNode({
  node, fill, border, textFill, pal, selected, highlighted, onSelect,
}: {
  node: PosterNode;
  fill: string;
  base: string;
  border: string;
  textFill: string;
  pal: Palette;
  selected?: boolean;
  highlighted?: boolean;
  onSelect?: (id: string) => void;
}) {
  const fs = node.fontSize;
  const edge = selected ? "#b3261e" : highlighted ? "#8a5a00" : border;
  const sw = selected || highlighted ? fs * 0.16 : fs * 0.055;
  const leaf = node.shape === "leaf";
  // Leaves keep their text upright by flipping when they point leftwards.
  const flip = leaf && (node.angle > 90 || node.angle < -90);
  // a soft specular gloss on the upper half of rounded badges
  const gloss = !pal.mono && !leaf;
  let body: ReactNode;
  switch (node.shape) {
    case "medallion":
      body = pal.mono ? (
        <circle r={node.w / 2} fill="#fff" stroke={edge} strokeWidth={Math.max(sw, node.w * 0.04)} />
      ) : (
        <>
          <path d={scallopPath(0, 0, node.w / 2, node.w / 2, 18, 0.04)} fill={fill} stroke={selected ? edge : border} strokeWidth={Math.max(sw, node.w * 0.025)} />
          <circle r={node.w * 0.42} fill="none" stroke={shade(GOLD[2], -0.1)} strokeWidth={node.w * 0.012} strokeDasharray={`${node.w * 0.015} ${node.w * 0.03}`} strokeLinecap="round" />
        </>
      );
      break;
    case "leaf":
      body = (
        <>
          <path d={leafPath(node.leafLength, node.leafWidth)} fill={fill} stroke={edge} strokeWidth={sw} />
          {!pal.mono && (
            <path
              d={`M${(-node.leafLength / 2).toFixed(1)} 0Q0 ${(-node.leafWidth * 0.06).toFixed(1)} ${(node.leafLength * 0.47).toFixed(1)} 0`}
              stroke={shade(border, 0.25)} strokeWidth={fs * 0.035} fill="none" opacity={0.35}
            />
          )}
        </>
      );
      break;
    case "circle":
      body = (
        <>
          <circle r={node.w / 2} fill={fill} stroke={edge} strokeWidth={Math.max(sw, node.w * 0.045)} />
          {!pal.mono && <circle r={node.w * 0.41} fill="none" stroke={edge} strokeWidth={node.w * 0.012} opacity={0.6} />}
        </>
      );
      break;
    case "oval":
      body = <ellipse rx={node.w / 2} ry={node.h / 2} fill={fill} stroke={edge} strokeWidth={Math.max(sw, fs * 0.07)} />;
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
      {gloss && (
        <ellipse cx={0} cy={-node.h * 0.2} rx={node.w * 0.36} ry={node.h * 0.2} fill="#ffffff" opacity={0.28} />
      )}
      <g transform={flip ? "rotate(180)" : undefined}>
        <text y={node.subLabel ? -fs * 0.32 : 0} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={bold ? 700 : 600} fill={bold ? "#2e1a0a" : textFill}>
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

/** Parchment panel with a gilt double border and corner lozenges. */
function OrnatePanel({ x, y, w, h, pal, W }: { x: number; y: number; w: number; h: number; pal: Palette; W: number }) {
  const inset = W * 0.006;
  const d = W * 0.006;
  const lozenge = (cx: number, cy: number) => (
    <path d={`M${cx} ${cy - d}L${cx + d} ${cy}L${cx} ${cy + d}L${cx - d} ${cy}Z`} fill={pal.frame} />
  );
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={W * 0.008} fill={pal.mono ? "#ffffff" : PARCHMENT} fillOpacity={pal.mono ? 1 : 0.84}
        stroke={pal.frame} strokeWidth={W * 0.0024} filter={pal.mono ? undefined : "url(#sh-node-shadow)"} />
      <rect x={x + inset} y={y + inset} width={w - 2 * inset} height={h - 2 * inset} rx={W * 0.005} fill="none" stroke={pal.frame} strokeWidth={W * 0.0007} />
      {lozenge(x + inset, y + inset)}
      {lozenge(x + w - inset, y + inset)}
      {lozenge(x + inset, y + h - inset)}
      {lozenge(x + w - inset, y + h - inset)}
      {lozenge(x + w / 2, y)}
    </g>
  );
}

/** The soil mound at the foot of the tree, with roots and the ancient lineage in a cartouche. */
function Soil({ layout, pal, grass }: { layout: PosterLayout; pal: Palette; grass: string }) {
  const soil = layout.soil!;
  const { width: W, rtl } = layout;
  const b = soil.box;
  return (
    <g>
      <defs>
        {soil.lines.map((l, i) => <path key={i} id={`sh-soil-${i}`} d={l.path} />)}
      </defs>
      <path d={soil.mound} fill={pal.mono ? "#ffffff" : "url(#sh-soil)"} stroke={pal.mono ? "#111" : "#24140b"} strokeWidth={W * 0.0015}
        filter={pal.mono ? undefined : "url(#sh-shadow)"} />
      <g fill={pal.mono ? "none" : "#24140b"} stroke={pal.mono ? "#111" : "none"} strokeWidth={W * 0.0008} opacity={pal.mono ? 0.6 : 0.6}>
        {soil.roots.map((d, i) => <path key={i} d={d} />)}
      </g>
      {!pal.mono && <path d={grass} stroke="#4c8a2c" strokeWidth={W * 0.0013} strokeLinecap="round" fill="none" />}
      <OrnatePanel x={b.x} y={b.y} w={b.w} h={b.h} pal={pal} W={W} />
      <text fontSize={soil.fontSize} fill={pal.ink} direction={rtl ? "rtl" : "ltr"}>
        {soil.lines.map((l, i) => (
          <textPath key={i} href={`#sh-soil-${i}`} startOffset="50%" textAnchor="middle">
            {l.text}
          </textPath>
        ))}
      </text>
    </g>
  );
}

/** Roots spreading over the ground from the trunk base. */
function Roots({ layout, pal }: { layout: PosterLayout; pal: Palette }) {
  const W = layout.width;
  return (
    <g fill={pal.mono ? "#fff" : "url(#sh-bark)"} stroke={pal.mono ? "#111" : "none"} strokeWidth={W * 0.001} filter={pal.mono ? undefined : "url(#sh-shadow)"}>
      {layout.surfaceRoots.map((r, i) => <path key={i} d={r.d} />)}
    </g>
  );
}

/** Basmala, the calligraphic title fitted between the medallions, subtitle, divider. */
function Header({ layout, meta, theme, pal }: { layout: PosterLayout; meta: PosterMeta; theme: PosterTheme; pal: Palette }) {
  const { width: W, height: H, rtl } = layout;
  const hd = layout.frame.header;
  const avail = layout.medallions.length ? hd.maxTitleWidth : W * 0.8;
  // Ruqaa runs a little wider than Amiri, which textWidth is tuned for
  const titleFs = meta.title ? Math.min(W * 0.04, avail / ((textWidth(meta.title, 1) || 1) * 1.1)) : 0;
  const titleY = theme.bismillah || layout.frame.framed ? hd.title : H * 0.052;
  const subY = titleY + H * 0.022;
  const ink = pal.mono ? pal.ink : "#3a230c";
  return (
    <g>
      {theme.bismillah && (
        // Amiri draws the basmala (U+FDFD) as one wide calligraphic glyph (~11 em)
        <text x={W / 2} y={hd.basmala} textAnchor="middle" fontSize={W * 0.029} fill={ink}>
          ﷽
        </text>
      )}
      {meta.title && (
        <text x={W / 2} y={titleY} textAnchor="middle" fontFamily={RUQAA} fontSize={titleFs} fontWeight={700}
          fill={pal.mono ? pal.ink : "url(#sh-gold-text)"} stroke={pal.mono ? "none" : "#5a3d0a"} strokeWidth={titleFs * 0.012}
          direction={rtl ? "rtl" : "ltr"}>
          {meta.title}
        </text>
      )}
      {meta.subtitle && (
        <text x={W / 2} y={subY} textAnchor="middle" fontSize={Math.min(W * 0.019, titleFs * 0.6)} fill={pal.mono ? "#444" : "#6b4a22"} direction={rtl ? "rtl" : "ltr"}>
          {meta.subtitle}
        </text>
      )}
      <Divider x={W / 2} y={(meta.subtitle ? subY : titleY) + H * 0.012} w={Math.min(W * 0.3, avail * 0.75)} pal={pal} />
    </g>
  );
}

/** Round gilt medallion with a scalloped rim carrying a verse or hadith. */
function TextMedallion({ x, y, r, content, pal }: { x: number; y: number; r: number; content: typeof VERSE; pal: Palette }) {
  const set = textInCircle(r * 0.78, content.heading, content.body, content.footer);
  return (
    <g filter={pal.mono ? undefined : "url(#sh-node-shadow)"}>
      <path d={scallopPath(x, y, r, r, 36, 0.025)} fill={pal.mono ? "#fff" : "url(#sh-m-gold)"} stroke={pal.mono ? "#111" : shade(GOLD[2], -0.4)} strokeWidth={r * 0.012} />
      <circle cx={x} cy={y} r={r * 0.9} fill={pal.mono ? "#fff" : PARCHMENT} stroke={pal.mono ? "#111" : GOLD[2]} strokeWidth={r * 0.012} />
      <circle cx={x} cy={y} r={r * 0.86} fill="none" stroke={pal.mono ? "#111" : GOLD[1]} strokeWidth={r * 0.008} strokeDasharray={`${r * 0.012} ${r * 0.025}`} />
      {set.lines.map((l, i) => (
        <text key={i} x={x} y={y + l.y} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={l.size} fontWeight={l.bold ? 700 : 400} fill={pal.ink}>
          {l.text}
        </text>
      ))}
    </g>
  );
}

function Legend({ layout, theme, pal }: { layout: PosterLayout; theme: PosterTheme; pal: Palette }) {
  const { width: W, rtl, generationsPresent, generationOffset } = layout;
  const row = W * 0.018;
  type Item = { key: string; label: string; swatch: ReactNode };
  const swatch = (fill: string, kind: "pill" | "leaf" | "badge") =>
    kind === "leaf" ? (
      <use href="#sh-leaf" transform={`translate(0 0) scale(${W * 0.022})`} fill={fill} stroke="rgba(0,0,0,.35)" strokeWidth={0.04} />
    ) : kind === "badge" ? (
      <g>
        <ellipse cx={W * 0.011} cy={0} rx={W * 0.011} ry={row * 0.36} fill={pal.mono ? "#fff" : "url(#sh-m-gold)"} stroke={pal.mono ? "#111" : shade(GOLD[2], -0.4)} strokeWidth={1.5} />
        <ellipse cx={W * 0.011} cy={0} rx={W * 0.0075} ry={row * 0.2} fill={pal.mono ? "#fff" : PARCHMENT} />
      </g>
    ) : (
      <rect x={0} y={-row * 0.32} width={W * 0.022} height={row * 0.64} rx={row * 0.3} fill={fill} stroke="rgba(0,0,0,.35)" strokeWidth={1} />
    );
  const items: Item[] = [];
  if (theme.colorBy === "generation") {
    for (const g of generationsPresent.slice(0, 20)) {
      items.push({ key: `g${g}`, label: generationLabel(g - generationOffset, rtl), swatch: swatch(generationColor(g - generationOffset).fill, "pill") });
    }
  }
  const kind = theme.nodeShape === "leaf" ? "leaf" : "pill";
  const metal = theme.metallic && !pal.mono;
  items.push({ key: "m", label: rtl ? "ذكر" : "Male", swatch: swatch(metal ? "url(#sh-m-male)" : theme.male, kind) });
  items.push({ key: "f", label: rtl ? "أنثى" : "Female", swatch: swatch(metal ? "url(#sh-m-female)" : theme.female, kind) });
  if (theme.trunkStyle === "badges") items.push({ key: "a", label: rtl ? "الأجداد" : "Ancestors", swatch: swatch("", "badge") });

  const perCol = 6;
  const cols = Math.ceil(items.length / perCol);
  const rows = Math.min(items.length, perCol);
  const colW = W * 0.13;
  const boxW = Math.max(colW * cols + W * 0.03, W * 0.17);
  const boxH = row * rows + W * 0.058;
  const { x: x0, y: y0 } = layout.frame.legend;
  return (
    <g>
      <OrnatePanel x={x0} y={y0} w={boxW} h={boxH} pal={pal} W={W} />
      <text x={x0 + boxW / 2} y={y0 + W * 0.026} textAnchor="middle" fontFamily={RUQAA} fontSize={W * 0.0145} fontWeight={700} fill={pal.ink}>
        {theme.colorBy === "generation" ? (rtl ? "ألوان الأجيال" : "Generations") : rtl ? "دليل الألوان" : "Key"}
      </text>
      {items.map((it, i) => {
        const col = Math.floor(i / perCol);
        const r = i % perCol;
        const cx = rtl ? x0 + boxW - W * 0.016 - col * colW : x0 + W * 0.016 + col * colW;
        const cy = y0 + W * 0.046 + r * row;
        return (
          <g key={it.key}>
            <g transform={`translate(${rtl ? cx - W * 0.022 : cx} ${cy})`}>{it.swatch}</g>
            <text x={rtl ? cx - W * 0.03 : cx + W * 0.03} y={cy} dominantBaseline="central" textAnchor={rtl ? "end" : "start"} fontSize={W * 0.011} fill={pal.ink}>
              {it.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function Stats({ layout, pal }: { layout: PosterLayout; pal: Palette }) {
  const { width: W, rtl, stats } = layout;
  const boxW = W * 0.2;
  const { x: x0, y: y0 } = layout.frame.stats;
  const rows: [string, string, number][] = [
    ["الذكور", "Males", stats.males],
    ["الإناث", "Females", stats.females],
    ["المجموع", "Total", stats.total],
  ];
  return (
    <g>
      <OrnatePanel x={x0} y={y0} w={boxW} h={W * 0.11} pal={pal} W={W} />
      <text x={x0 + boxW / 2} y={y0 + W * 0.026} textAnchor="middle" fontFamily={RUQAA} fontSize={W * 0.0145} fontWeight={700} fill={pal.ink}>
        {rtl ? "إحصائية أفراد الأسرة" : "Family statistics"}
      </text>
      {rows.map(([ar, en, v], i) => (
        <g key={en}>
          <text x={rtl ? x0 + boxW - W * 0.018 : x0 + W * 0.018} y={y0 + W * (0.05 + i * 0.02)} textAnchor="start" direction={rtl ? "rtl" : "ltr"} fontSize={W * 0.0118} fill={pal.ink}>
            {rtl ? ar : en}
          </text>
          <text x={rtl ? x0 + W * 0.018 : x0 + boxW - W * 0.018} y={y0 + W * (0.05 + i * 0.02)} textAnchor={rtl ? "start" : "end"} fontSize={W * 0.0118} fontWeight={700} fill={pal.ink}>
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
