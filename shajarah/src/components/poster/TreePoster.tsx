"use client";

import { forwardRef, memo, type ReactNode } from "react";
import type { PosterLayout, PosterNode, SpouseHolder } from "@/lib/layout/botanical";
import type { SoilInk } from "@/lib/layout/soil";
import { textWidth } from "@/lib/layout/botanical";
import { LEAF_TONES, generationColor, generationLabel } from "@/lib/layout/palette";
import { hashString } from "@/lib/layout/random";
import { lineageColor, satinStops, shade, textOn } from "@/lib/theme";
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
  /**
   * The selected person's direct line (ancestors and descendants). When set,
   * the rest of the poster is dimmed and this line is traced on top.
   */
  lineageIds?: Set<string>;
  /** Mark the spots the relationship-clarity check flagged (editor only). */
  showIssues?: boolean;
  onSelect?: (memberId: string) => void;
  className?: string;
  /**
   * URL of the frame artwork (gold-foil border, corner arabesques and
   * parchment texture, designed in Canva). Drawn full-bleed behind the
   * tree when the theme's frame is on; otherwise a fine gold rule frames
   * plain ivory paper.
   */
  frameSrc?: string | null;
}

const FONT = "Amiri, 'Traditional Arabic', 'Noto Naskh Arabic', 'Times New Roman', serif";
/** Calligraphic face for headings. */
const RUQAA = "'Aref Ruqaa', Amiri, 'Traditional Arabic', serif";
const PAPER = "#f7f1e3";
const IVORY = "#fcf8ee";
const GOLD = "#b08a2e";
const INK = "#2a1c0c";
/** Spouses' cartouches: a soft rose, apart from the line's own names. */
const SPOUSE_FILL = "#f8ece6";
const SPOUSE_RIM = "#9a6656";
/** Foliage leaf tones: [light, dark] pairs from yellow-green to deep green. */
const FOLIAGE = [
  ["#b9d36a", "#5d8f2c"],
  ["#8fc057", "#2f6b25"],
  ["#a7c95e", "#4a7d2a"],
  ["#6fa848", "#22561d"],
] as const;

interface Palette {
  mono: boolean;
  ink: string;
  /** Fine gold lines (rules, rims). */
  line: string;
  /** Fill, border and text colour of a name. */
  fill: (n: PosterNode) => { fill: string; border: string; text: string };
  /** Colour of a lineage's branches (bark when branch colours are off). */
  branch: (lineage: number | null | undefined) => string;
  /** Rim colour carrying the lineage, or null to keep the role's own rim. */
  rim: (lineage: number | null | undefined) => string | null;
}

function makePalette(theme: PosterTheme, layout: PosterLayout): Palette {
  const mono = theme.background === "white";
  const satin = (gender: string) => (gender === "FEMALE" ? "url(#sh-satin-f)" : "url(#sh-satin-m)");
  const coloured = theme.branchColors && !mono;
  const bark = mono ? "#1a1a1a" : theme.branch;
  return {
    mono,
    branch: (i) => (coloured ? lineageColor(i, bark) : bark),
    rim: (i) => (coloured && i != null ? lineageColor(i, bark) : null),
    ink: mono ? "#111111" : INK,
    line: mono ? "#111111" : GOLD,
    fill: (n) => {
      if (mono) return { fill: "#ffffff", border: "#111111", text: "#111111" };
      const female = n.member.gender === "FEMALE";
      if (theme.colorBy === "generation") {
        const c = generationColor(n.generation - layout.generationOffset);
        return { fill: c.fill, border: shade(c.fill, -0.35), text: c.text };
      }
      // Fathers (members with descendants) are ivory capsules with a gold
      // rim, a step up from the leaves and capsules of childless members.
      if (!n.terminal) return { fill: IVORY, border: GOLD, text: INK };
      if (theme.preset === "classic" && !female && n.shape === "leaf") {
        const tone = LEAF_TONES[hashString(n.id) % LEAF_TONES.length];
        return { fill: tone, border: shade(tone, -0.4), text: "#ffffff" };
      }
      const base = female ? theme.female : theme.male;
      return { fill: theme.metallic ? satin(n.member.gender) : base, border: shade(base, -0.38), text: textOn(base) };
    },
  };
}

/** A restrained satin finish: a soft vertical sheen, no gloss. */
function SatinGradient({ id, color }: { id: string; color: string }) {
  const [hi, body, lo] = satinStops(color);
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.55" stopColor={body} />
      <stop offset="1" stopColor={lo} />
    </linearGradient>
  );
}

/**
 * Pure SVG renderer for a computed PosterLayout and theme. The same element
 * is serialised for SVG / PNG / PDF export; editor-only marks (selection,
 * ancestor highlight) live in a `data-ui` layer that export removes.
 */
export const TreePoster = memo(
  forwardRef<SVGSVGElement, Props>(function TreePoster(
    { layout, meta, theme, selectedId, lineageIds, showIssues, onSelect, className, frameSrc },
    ref,
  ) {
    const { width: W, height: H, rtl } = layout;
    const pal = makePalette(theme, layout);
    const bark = pal.mono ? "#1a1a1a" : theme.branch;
    const withRim = (n: PosterNode) => {
      const f = pal.fill(n);
      const rim = pal.rim(n.lineage);
      return rim ? { ...f, border: rim } : f;
    };
    const artwork = theme.frame && !!frameSrc && !pal.mono;
    const click = (id: string) => (onSelect ? { onClick: () => onSelect(id), style: { cursor: "pointer" } } : {});
    const tracing = !!selectedId && !!lineageIds && lineageIds.size > 0;
    const onLine = (id: string) => id === selectedId || !!lineageIds?.has(id);

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
          <SatinGradient id="sh-satin-m" color={theme.male} />
          <SatinGradient id="sh-satin-f" color={theme.female} />
          <linearGradient id="sh-trunk" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={shade(bark, -0.1)} />
            <stop offset="0.45" stopColor={shade(bark, 0.1)} />
            <stop offset="1" stopColor={shade(bark, -0.18)} />
          </linearGradient>
          <linearGradient id="sh-gold-text" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#b98d2c" />
            <stop offset="1" stopColor="#6e4f12" />
          </linearGradient>
          {FOLIAGE.map(([light, dark], i) => (
            <linearGradient key={`lg${i}`} id={`sh-leafg-${i}`} x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0" stopColor={light} />
              <stop offset="1" stopColor={dark} />
            </linearGradient>
          ))}
          {FOLIAGE.map((_, i) => (
            <g key={`ls${i}`} id={`sh-fol-${i}`}>
              <path d={leafPath(1, 0.5)} fill={`url(#sh-leafg-${i})`} stroke="#264a16" strokeWidth={0.018} />
              <path d="M-0.5 0Q0 -0.03 0.46 0" stroke="#eef5c8" strokeWidth={0.025} fill="none" opacity={0.5} />
            </g>
          ))}
        </defs>

        {/* Paper, then either the frame artwork or a fine gold rule */}
        <rect width={W} height={H} fill={pal.mono ? "#ffffff" : PAPER} />
        {artwork ? (
          <image href={frameSrc!} x={0} y={0} width={W} height={H} preserveAspectRatio="none" />
        ) : (
          <RuleFrame W={W} H={H} pal={pal} />
        )}

        <Header layout={layout} meta={meta} theme={theme} pal={pal} />
        {layout.medallions.map((m, i) => {
          // RTL: the verse sits on the right, the hadith on the left
          const isVerse = (m.x > W / 2) === rtl;
          const show = isVerse ? theme.verse : theme.hadith;
          return show ? <TextMedallion key={i} {...m} content={isVerse ? VERSE : HADITH} pal={pal} /> : null;
        })}

        {/* A faint wash behind the canopy gives a sparse tree its shape */}
        {layout.canopy && !pal.mono && !layout.foliage && <path d={layout.canopy} fill="#efe3c3" opacity={0.35} />}

        {/* Ground and roots */}
        {layout.soil ? (
          <g>
            {layout.soil.ground && <path d={layout.soil.ground} fill="none" stroke={bark} strokeWidth={W * 0.0012} strokeLinecap="round" opacity={0.7} />}
            <g fill={bark} opacity={0.75}>{layout.soil.roots.map((d, i) => <path key={i} d={d} />)}</g>
          </g>
        ) : (
          <g>
            <path
              d={`M${W * 0.3} ${layout.groundY + W * 0.006}Q${W / 2} ${layout.groundY - W * 0.006} ${W * 0.7} ${layout.groundY + W * 0.006}`}
              fill="none" stroke={bark} strokeWidth={W * 0.0012} strokeLinecap="round" opacity={0.6}
            />
            <g fill={bark}>{layout.surfaceRoots.map((r, i) => <path key={i} d={r.d} />)}</g>
          </g>
        )}

        {/* Trunk and branches: clean tapered vector shapes, no textures */}
        <path d={layout.trunkPath} fill={pal.mono ? "#ffffff" : "url(#sh-trunk)"} stroke={pal.mono ? "#111" : "none"} strokeWidth={W * 0.0015} />
        {layout.foliage && (
          <g stroke={shade(bark, 0.1)} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {layout.foliage.twigs.map((t, i) => <path key={i} d={t.d} strokeWidth={t.w} />)}
          </g>
        )}
        {/* Every branch has a fine paper-coloured edge, so where lines cross
            the upper one visibly passes over the lower (never a shared junction) */}
        <g stroke={pal.mono ? "#ffffff" : PAPER} strokeWidth={W * 0.0018} strokeLinejoin="round" paintOrder="stroke">
          {layout.branches.map((b, i) =>
            b.dotted ? (
              // a family shown through a daughter: round dots along the line
              <path key={i} d={b.d} fill="none" stroke={pal.branch(b.lineage)} strokeWidth={b.w} strokeLinecap="round" strokeDasharray={`0.01 ${(b.w * 2.1).toFixed(1)}`} />
            ) : (
              <path key={i} d={b.d} fill={pal.branch(b.lineage)} />
            ),
          )}
        </g>
        {layout.foliage && (
          <g>
            {layout.foliage.leaves.map((l, i) => (
              <use
                key={i}
                href={`#sh-fol-${l.tone % FOLIAGE.length}`}
                transform={`translate(${l.x.toFixed(1)} ${l.y.toFixed(1)}) rotate(${l.angle.toFixed(0)}) scale(${l.size.toFixed(1)})`}
              />
            ))}
          </g>
        )}

        {/* The ancestral chain on the trunk, eldest at the bottom, joined by a gold
            thread that runs up the middle of the bark to the canopy base */}
        {layout.trunkLabels.length > 0 && (
          <polyline
            points={[...layout.trunkLabels, layout.origin].map((l) => `${l.x.toFixed(1)},${l.y.toFixed(1)}`).join(" ")}
            fill="none" stroke={pal.mono ? "#111" : "#d9b45a"} strokeWidth={layout.trunkLabels[0].fontSize * 0.12} strokeLinejoin="round"
          />
        )}
        {layout.trunkLabels.map((l) => <TrunkBadge key={l.member.id} label={l} pal={pal} onClick={click(l.member.id)} />)}

        {/* Spouses on the branches */}
        {layout.spouses.map((s) => <Cartouche key={s.id} holder={s} pal={pal} onClick={click(s.member.id)} />)}

        {/* People */}
        {layout.stubs.map((n) => (
          <Medallion key={n.id} node={n} pal={pal} onClick={click(n.id)} />
        ))}
        {layout.nodes.map((n) =>
          n.shape === "medallion" ? (
            <Medallion key={n.id} node={n} pal={pal} onClick={click(n.id)} ring={pal.rim(n.lineage)} />
          ) : (
            <PersonNode key={n.id} node={n} {...withRim(n)} pal={pal} onClick={click(n.id)} />
          ),
        )}
        {layout.base && <Medallion node={layout.base} pal={pal} onClick={click(layout.base.id)} strong />}

        {/* Foundation: the ancient lineage */}
        {layout.soil && <Foundation layout={layout} pal={pal} bark={bark} click={click} />}

        <Footer layout={layout} theme={theme} pal={pal} meta={meta} />

        {/* Editor-only marks: removed from every export */}
        {tracing && (
          <LineageTrace layout={layout} pal={pal} ids={lineageIds!} selectedId={selectedId!} W={W} H={H} click={click} />
        )}
        {!tracing && selectedId && (
          <g data-ui="selection" fill="none" pointerEvents="none">
            {[...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])]
              .filter((n) => onLine(n.id))
              .map((n) => (
                <rect key={n.id} x={n.x - n.w / 2 - n.fontSize * 0.3} y={n.y - n.h / 2 - n.fontSize * 0.3}
                  width={n.w + n.fontSize * 0.6} height={n.h + n.fontSize * 0.6} rx={n.fontSize * 0.6}
                  stroke="#c62828" strokeWidth={n.fontSize * 0.18} />
              ))}
          </g>
        )}
        {showIssues && !layout.clarity.ok && !layout.tooDense && (
          <g data-ui="clarity" fill="none" stroke="#d32f2f" pointerEvents="none">
            {layout.clarity.issues.filter((i) => i.at).map((i, k) => (
              <circle key={k} cx={i.at!.x} cy={i.at!.y} r={W * 0.012} strokeWidth={W * 0.0025} strokeDasharray={`${W * 0.004} ${W * 0.003}`} />
            ))}
          </g>
        )}
      </svg>
    );
  }),
);

function TrunkBadge({ label: l, pal, onClick }: { label: PosterLayout["trunkLabels"][number]; pal: Palette; onClick: object }) {
  return (
    <g {...onClick}>
      <title>{l.label}</title>
      <rect x={l.x - l.w / 2} y={l.y - l.h / 2} width={l.w} height={l.h} rx={l.h / 2}
        fill={pal.mono ? "#fff" : IVORY} stroke={pal.line} strokeWidth={l.fontSize * 0.07} />
      <text x={l.x} y={l.y} textAnchor="middle" dominantBaseline="central" fontSize={l.fontSize} fontWeight={700} fill={pal.ink}>
        {l.label}
      </text>
    </g>
  );
}

/**
 * Traces one person's direct line: the rest of the poster is veiled, and
 * every connection between two people on the line (from the data, not from
 * proximity) is drawn on top in a strong colour, with those people's labels.
 * Editor only (data-ui): never exported.
 */
function LineageTrace({ layout, pal, ids, selectedId, W, H, click }: {
  layout: PosterLayout; pal: Palette; ids: Set<string>; selectedId: string; W: number; H: number;
  click: (id: string) => object;
}) {
  const on = (id: string) => id === selectedId || ids.has(id);
  const TRACE = "#b3261e";
  const edges = layout.edges.filter((e) => on(e.parentId) && on(e.childId));
  const trunk = layout.trunkLabels.filter((l) => on(l.member.id));
  // trunk thread: consecutive ancestors on the line, then up to the crown base
  const chain = [...trunk.map((l) => ({ x: l.x, y: l.y })), ...(layout.base && on(layout.base.id) ? [{ x: layout.base.x, y: layout.base.y }] : [])];
  const people = [...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])].filter((n) => on(n.id));
  const f = (n: number) => n.toFixed(1);
  return (
    <g data-ui="lineage">
      <rect width={W} height={H} fill={pal.mono ? "#ffffff" : PAPER} opacity={0.72} pointerEvents="none" />
      <g fill="none" stroke={TRACE} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
        {edges.map((e) => (
          <polyline key={`${e.parentId}-${e.childId}`} points={e.points.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")}
            strokeWidth={Math.max(W * 0.003, e.w0 * 0.9)} />
        ))}
        {chain.length > 1 && <polyline points={chain.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")} strokeWidth={W * 0.003} />}
      </g>
      {trunk.map((l) => <TrunkBadge key={l.member.id} label={l} pal={pal} onClick={click(l.member.id)} />)}
      {people.map((n) =>
        n.shape === "medallion" ? (
          <Medallion key={n.id} node={n} pal={pal} onClick={click(n.id)} strong={n.id === layout.base?.id} ring={n.id === layout.base?.id ? null : pal.rim(n.lineage)} />
        ) : (
          <PersonNode key={n.id} node={n} {...pal.fill(n)} border={pal.rim(n.lineage) ?? pal.fill(n).border} pal={pal} onClick={click(n.id)} />
        ),
      )}
      {people.filter((n) => n.id === selectedId).map((n) => (
        <rect key="sel" x={n.x - n.w / 2 - n.fontSize * 0.35} y={n.y - n.h / 2 - n.fontSize * 0.35}
          width={n.w + n.fontSize * 0.7} height={n.h + n.fontSize * 0.7} rx={n.fontSize * 0.6}
          fill="none" stroke={TRACE} strokeWidth={n.fontSize * 0.18} pointerEvents="none" />
      ))}
      {trunk.filter((l) => l.member.id === selectedId).map((l) => (
        <rect key="sel-t" x={l.x - l.w / 2 - l.fontSize * 0.3} y={l.y - l.h / 2 - l.fontSize * 0.3}
          width={l.w + l.fontSize * 0.6} height={l.h + l.fontSize * 0.6} rx={l.h / 2}
          fill="none" stroke={TRACE} strokeWidth={l.fontSize * 0.15} pointerEvents="none" />
      ))}
    </g>
  );
}

/** Leaf blade centred on the origin, pointing along +x: round base, pointed tip. */
function leafPath(L: number, w: number): string {
  const f = (n: number) => n.toFixed(2);
  return `M${f(-L / 2)} 0C${f(-L * 0.22)} ${f(-w * 0.78)} ${f(L * 0.28)} ${f(-w * 0.62)} ${f(L / 2)} 0`
    + `C${f(L * 0.28)} ${f(w * 0.62)} ${f(-L * 0.22)} ${f(w * 0.78)} ${f(-L / 2)} 0Z`;
}

/** A fine double gold rule with small corner lozenges. */
function RuleFrame({ W, H, pal }: { W: number; H: number; pal: Palette }) {
  const a = W * 0.025, b = W * 0.033, d = W * 0.007;
  const corners: [number, number][] = [[a, a], [W - a, a], [a, H - a], [W - a, H - a]];
  return (
    <g fill="none" stroke={pal.line}>
      <rect x={a} y={a} width={W - 2 * a} height={H - 2 * a} strokeWidth={W * 0.0022} />
      <rect x={b} y={b} width={W - 2 * b} height={H - 2 * b} strokeWidth={W * 0.0008} />
      {corners.map(([x, y]) => (
        <path key={`${x},${y}`} d={`M${x} ${y - d}L${x + d} ${y}L${x} ${y + d}L${x - d} ${y}Z`} fill={pal.line} stroke="none" />
      ))}
    </g>
  );
}

/** Gilt rule with a central lozenge, used under the title. */
function Divider({ x, y, w, pal }: { x: number; y: number; w: number; pal: Palette }) {
  const d = w * 0.02;
  return (
    <g stroke={pal.line} fill="none" strokeWidth={w * 0.004}>
      <path d={`M${x - w / 2} ${y}H${x - d * 2.2}M${x + d * 2.2} ${y}H${x + w / 2}`} />
      <path d={`M${x} ${y - d}L${x + d * 1.6} ${y}L${x} ${y + d}L${x - d * 1.6} ${y}Z`} fill={pal.line} />
    </g>
  );
}

/** Ivory disc with a fine double gold ring: branch heads, the crown base, stubs. */
/** A round medallion (branch heads), or an oval one (the canopy base) when wider than tall. */
function Medallion({ node, pal, onClick, strong, ring }: { node: PosterNode; pal: Palette; onClick: object; strong?: boolean; ring?: string | null }) {
  const rx = node.w / 2, ry = node.h / 2;
  const fs = node.fontSize;
  const inset = fs * 0.22;
  return (
    <g transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})`} {...onClick}>
      <title>{node.label}</title>
      {pal.mono ? (
        <ellipse rx={rx} ry={ry} fill="#fff" stroke="#111" strokeWidth={fs * 0.09} />
      ) : (
        <>
          {strong && <path d={scallopPath(0, 0, rx + ry * 0.07, ry * 1.07, 28, 0.025)} fill="none" stroke={GOLD} strokeWidth={fs * 0.05} />}
          <ellipse rx={rx} ry={ry} fill={IVORY} stroke={ring ?? GOLD} strokeWidth={fs * (ring ? 0.12 : 0.09)} />
          <ellipse rx={rx - inset} ry={ry - inset} fill="none" stroke={GOLD} strokeWidth={fs * 0.03} />
        </>
      )}
      <text y={nameY(node)} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={700} fill={pal.ink}>
        {node.label}
      </text>
      <SubLines node={node} y={fs * 0.6} fontSize={fs * 0.68} fill={pal.ink} opacity={0.8} />
    </g>
  );
}

/**
 * A cartouche: a name panel with its corners cut in as quarter circles,
 * the classic frame of a name in a manuscript; centred on 0, 0.
 */
function cartouchePath(w: number, h: number): string {
  const x = w / 2, y = h / 2, r = h * 0.3;
  const f = (v: number) => v.toFixed(1);
  return `M${f(-x + r)} ${f(-y)}H${f(x - r)}A${f(r)} ${f(r)} 0 0 0 ${f(x)} ${f(-y + r)}V${f(y - r)}`
    + `A${f(r)} ${f(r)} 0 0 0 ${f(x - r)} ${f(y)}H${f(-x + r)}A${f(r)} ${f(r)} 0 0 0 ${f(-x)} ${f(y - r)}`
    + `V${f(-y + r)}A${f(r)} ${f(r)} 0 0 0 ${f(-x + r)} ${f(-y)}Z`;
}

function Cartouche({ holder: s, pal, onClick }: { holder: SpouseHolder; pal: Palette; onClick: object }) {
  const fs = s.fontSize;
  const inset = fs * 0.2;
  return (
    <g transform={`translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})`} {...onClick}>
      <title>{s.member.name}</title>
      <path d={cartouchePath(s.w, s.h)} fill={pal.mono ? "#fff" : SPOUSE_FILL} stroke={pal.mono ? "#111" : SPOUSE_RIM} strokeWidth={fs * 0.08}
        strokeDasharray={s.dotted ? `${(fs * 0.25).toFixed(1)} ${(fs * 0.18).toFixed(1)}` : undefined} />
      {!pal.mono && <path d={cartouchePath(s.w - inset * 2, s.h - inset * 2)} fill="none" stroke={GOLD} strokeWidth={fs * 0.03} />}
      <text textAnchor="middle" dominantBaseline="central" fontSize={fs} fill={pal.ink}>{s.label}</text>
    </g>
  );
}

/** Where the name sits: higher when there are lines under it. */
function nameY(node: PosterNode) {
  const lines = node.subLabel ? node.subLabel.split("\n").length : 0;
  return lines ? -node.fontSize * (0.32 + (lines - 1) * 0.36) : 0;
}

/** The quieter line(s) under a name, starting at y (moved up for two lines). */
function SubLines({ node, y, fontSize, fill, opacity }: { node: PosterNode; y: number; fontSize: number; fill: string; opacity: number }) {
  if (!node.subLabel) return null;
  const lines = node.subLabel.split("\n");
  const step = fontSize * 1.08;
  const top = y - (lines.length - 1) * node.fontSize * 0.36;
  return (
    <>
      {lines.map((line, i) => (
        <text key={i} y={top + i * step} textAnchor="middle" dominantBaseline="central" fontSize={fontSize} fill={fill} opacity={opacity}>
          {line}
        </text>
      ))}
    </>
  );
}

function PersonNode({
  node, fill, border, text, pal, onClick,
}: {
  node: PosterNode;
  fill: string;
  border: string;
  text: string;
  pal: Palette;
  onClick: object;
}) {
  const fs = node.fontSize;
  const sw = fs * 0.06;
  const leaf = node.shape === "leaf";
  // Leaves keep their text upright by flipping when they point leftwards.
  const flip = leaf && (node.angle > 90 || node.angle < -90);
  let body: ReactNode;
  switch (node.shape) {
    case "leaf":
      body = (
        <>
          <path d={leafPath(node.leafLength, node.leafWidth)} fill={fill} stroke={border} strokeWidth={sw} />
          {!pal.mono && (
            <path
              d={`M${(-node.leafLength / 2).toFixed(1)} 0Q0 ${(-node.leafWidth * 0.05).toFixed(1)} ${(node.leafLength * 0.47).toFixed(1)} 0`}
              stroke={border} strokeWidth={fs * 0.025} fill="none" opacity={0.25}
            />
          )}
        </>
      );
      break;
    case "circle":
      body = <circle r={node.w / 2} fill={fill} stroke={border} strokeWidth={sw * 1.2} />;
      break;
    case "oval":
      body = <ellipse rx={node.w / 2} ry={node.h / 2} fill={fill} stroke={border} strokeWidth={sw} />;
      break;
    default:
      body = <rect x={-node.w / 2} y={-node.h / 2} width={node.w} height={node.h} rx={node.h / 2} fill={fill} stroke={border} strokeWidth={sw} />;
  }
  return (
    <g transform={`translate(${node.x.toFixed(1)} ${node.y.toFixed(1)})${leaf ? ` rotate(${node.angle.toFixed(1)})` : ""}`} {...onClick}>
      <title>{node.label}</title>
      {body}
      <g transform={flip ? "rotate(180)" : undefined}>
        <text y={nameY(node)} textAnchor="middle" dominantBaseline="central" fontSize={fs} fontWeight={node.terminal ? 400 : 700} fill={text}>
          {node.label}
        </text>
        <SubLines node={node} y={fs * 0.55} fontSize={fs * 0.7} fill={text} opacity={0.85} />
      </g>
    </g>
  );
}

/**
 * The foundation, whatever its soil style: the style laid out shapes (in
 * drawing order) and texts (in reading order) with colour roles, and this
 * draws them. A new style needs no change here.
 */
function Foundation({ layout, pal, bark, click }: {
  layout: PosterLayout;
  pal: Palette;
  bark: string;
  click: (id: string) => object;
}) {
  const soil = layout.soil!;
  const colour = (ink: SoilInk | undefined): string | undefined => {
    if (!ink) return undefined;
    if (pal.mono) return ink === "ivory" ? "#ffffff" : ink === "trunk" ? "#ffffff" : "#111111";
    return { ink: pal.ink, gold: GOLD, goldLight: "#d9b45a", muted: "#6b4a22", bark, trunk: "url(#sh-trunk)", ivory: IVORY, line: pal.line }[ink];
  };
  return (
    <g data-soil={soil.style}>
      {soil.shapes.map((s, i) => (
        <path
          key={i}
          d={s.d}
          fill={colour(s.fill) ?? "none"}
          fillOpacity={s.opacity}
          stroke={colour(s.stroke) ?? (pal.mono && s.fill === "trunk" ? "#111111" : undefined)}
          strokeWidth={s.strokeWidth ?? (pal.mono && s.fill === "trunk" ? layout.width * 0.0012 : undefined)}
          strokeLinecap="round"
        />
      ))}
      {soil.texts.map((t, i) => (
        <text
          key={i}
          x={t.x.toFixed(1)}
          y={t.y.toFixed(1)}
          fontSize={t.fontSize.toFixed(2)}
          textAnchor={t.anchor}
          fill={colour(t.ink)}
          fontFamily={t.font === "ruqaa" ? RUQAA : undefined}
          fontWeight={t.weight}
          direction={layout.rtl ? "rtl" : "ltr"}
          {...(t.memberId ? click(t.memberId) : {})}
        >
          {t.text}
        </text>
      ))}
    </g>
  );
}

/** Basmala, the calligraphic title, subtitle and a fine divider. */
function Header({ layout, meta, theme, pal }: { layout: PosterLayout; meta: PosterMeta; theme: PosterTheme; pal: Palette }) {
  const { width: W, height: H, rtl } = layout;
  const hd = layout.frame.header;
  const avail = layout.medallions.length ? Math.min(hd.maxTitleWidth, W * 0.44) : hd.maxTitleWidth;
  // Ruqaa runs a little wider than Amiri, which textWidth is tuned for
  const titleFs = meta.title ? Math.min(W * 0.042, avail / ((textWidth(meta.title, 1) || 1) * 1.1)) : 0;
  // Under the basmala, the title keeps clear of its long lower stroke: the
  // glyph reaches 0.61 em below its baseline and Ruqaa capitals 1.23 em above.
  const basmalaFs = W * 0.024;
  const titleY = theme.bismillah
    ? Math.max(hd.title, hd.basmala + basmalaFs * 0.61 + titleFs * 1.23 + W * 0.012)
    : layout.frame.framed ? hd.title : H * 0.052;
  const subY = titleY + H * 0.024;
  // a branch poster's "فرع …" line takes the subtitle's place
  const subtitle = layout.focus ? null : meta.subtitle;
  const focusY = titleY + H * 0.024;
  const lastY = layout.focus ? focusY : subtitle ? subY : titleY;
  return (
    <g>
      {theme.bismillah && (
        // Amiri draws the basmala (U+FDFD) as one wide calligraphic glyph (~11 em)
        <text x={W / 2} y={hd.basmala} textAnchor="middle" fontSize={basmalaFs} fill={pal.ink}>
          ﷽
        </text>
      )}
      {meta.title && (
        <text x={W / 2} y={titleY} textAnchor="middle" fontFamily={RUQAA} fontSize={titleFs} fontWeight={700}
          fill={pal.mono ? pal.ink : "url(#sh-gold-text)"} direction={rtl ? "rtl" : "ltr"}>
          {meta.title}
        </text>
      )}
      {subtitle && (
        <text x={W / 2} y={subY} textAnchor="middle" fontSize={Math.min(W * 0.017, titleFs * 0.55)} fill={pal.mono ? "#444" : "#6b4a22"} direction={rtl ? "rtl" : "ltr"}>
          {subtitle}
        </text>
      )}
      {layout.focus && (
        // a branch-only poster says whose branch it is
        <text x={W / 2} y={focusY} textAnchor="middle" fontSize={Math.min(W * 0.015, (titleFs || W * 0.03) * 0.48)}
          fill={pal.mono ? "#444" : "#6b4a22"} direction={rtl ? "rtl" : "ltr"}>
          {rtl ? `فرع ${layout.focus.label}` : `Branch of ${layout.focus.label}`}
        </text>
      )}
      <Divider x={W / 2} y={lastY + H * 0.014} w={Math.min(W * 0.26, avail * 0.6)} pal={pal} />
    </g>
  );
}

/** Round medallion carrying a verse or hadith, in fine gold lines. */
function TextMedallion({ x, y, r, content, pal }: { x: number; y: number; r: number; content: typeof VERSE; pal: Palette }) {
  const set = textInCircle(r * 0.8, content.heading, content.body, content.footer);
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={pal.mono ? "#fff" : IVORY} stroke={pal.line} strokeWidth={r * 0.02} />
      <circle cx={x} cy={y} r={r * 0.93} fill="none" stroke={pal.line} strokeWidth={r * 0.007} />
      {set.lines.map((l, i) => (
        <text key={i} x={x} y={y + l.y} textAnchor="middle" dominantBaseline="central" direction="rtl" fontSize={l.size} fontWeight={l.bold ? 700 : 400} fill={pal.ink}>
          {l.text}
        </text>
      ))}
    </g>
  );
}

/**
 * Quiet lines at the foot of the poster: the key (what each shape means),
 * the family counts, and the credit.
 */
function Footer({ layout, theme, pal, meta }: { layout: PosterLayout; theme: PosterTheme; pal: Palette; meta: PosterMeta }) {
  const { width: W, rtl, stats, generationsPresent, generationOffset } = layout;
  const fs = W * 0.012;
  // key, counts, then the credit on footerY
  const y = layout.frame.footerY - fs * 3.4;
  const sw = fs * 1.9; // swatch width
  const satin = theme.metallic && !pal.mono;
  const pill = (x: number, fill: string, stroke: string) => (
    <rect x={x} y={y - fs * 0.45} width={sw} height={fs * 0.9} rx={fs * 0.45} fill={fill} stroke={stroke} strokeWidth={fs * 0.09} />
  );
  type Item = { label: string; swatch: (x: number) => ReactNode };
  const items: Item[] = [];
  const maleFill = pal.mono ? "#fff" : satin ? "url(#sh-satin-m)" : theme.male;
  const femaleFill = pal.mono ? "#fff" : satin ? "url(#sh-satin-f)" : theme.female;
  const rim = (c: string) => (pal.mono ? "#111" : shade(c, -0.38));
  // colouring by generation replaces the son / daughter / father colours
  const byGender = theme.colorBy !== "generation";
  if (byGender) items.push({
    label: rtl ? "ابن" : "Son",
    // (the shape actually drawn: "auto" may have chosen either)
    swatch: (x) => layout.nodes.some((n) => n.shape === "leaf")
      ? <path transform={`translate(${x + sw / 2} ${y}) scale(${sw})`} d={leafPath(1, 0.45)} fill={maleFill} stroke={rim(theme.male)} strokeWidth={0.04} />
      : pill(x, maleFill, rim(theme.male)),
  });
  if (byGender && layout.nodes.some((n) => n.member.gender === "FEMALE")) items.push({ label: rtl ? "بنت" : "Daughter", swatch: (x) => pill(x, femaleFill, rim(theme.female)) });
  if (byGender) items.push({ label: rtl ? "له ذرية" : "Has descendants", swatch: (x) => pill(x, pal.mono ? "#fff" : IVORY, pal.line) });
  if (layout.trunkLabels.length) items.push({ label: rtl ? "سلسلة الآباء" : "Ancestral line", swatch: (x) => pill(x, pal.mono ? "#fff" : IVORY, pal.line) });
  if (theme.branchColors && !pal.mono && new Set(layout.nodes.map((n) => n.lineage).filter((x) => x != null)).size >= 2) {
    items.push({
      label: rtl ? "لكل فرع لونه" : "Each branch its colour",
      swatch: (x) => (
        <g>
          {[0, 1, 2].map((k) => (
            <rect key={k} x={x + (k * sw) / 3} y={y - fs * 0.12} width={sw / 3.4} height={fs * 0.24} rx={fs * 0.1} fill={pal.branch(k)} />
          ))}
        </g>
      ),
    });
  }
  if (layout.branches.some((b) => b.dotted)) {
    items.push({
      label: rtl ? "عن طريق البنات" : "Through a daughter",
      swatch: (x) => (
        <line x1={x + fs * 0.2} y1={y} x2={x + sw - fs * 0.2} y2={y} stroke={pal.branch(null)} strokeWidth={fs * 0.22} strokeLinecap="round" strokeDasharray={`0.01 ${(fs * 0.46).toFixed(1)}`} />
      ),
    });
  }
  if (layout.spouses.length) {
    const kinds = new Set(layout.spouses.map((s) => s.member.gender));
    items.push({
      label: rtl ? (kinds.size > 1 ? "زوج / زوجة" : kinds.has("MALE") ? "زوج" : "زوجة") : "Spouse",
      swatch: (x) => (
        <path transform={`translate(${x + sw / 2} ${y})`} d={cartouchePath(sw, fs * 0.95)}
          fill={pal.mono ? "#fff" : SPOUSE_FILL} stroke={pal.mono ? "#111" : SPOUSE_RIM} strokeWidth={fs * 0.08} />
      ),
    });
  }
  if (theme.colorBy === "generation") {
    for (const g of generationsPresent.slice(0, 8)) {
      const c = generationColor(g - generationOffset).fill;
      items.push({ label: generationLabel(g - generationOffset, rtl), swatch: (x) => pill(x, c, shade(c, -0.35)) });
    }
  }
  const fmt = (n: number) => n.toLocaleString(rtl ? "ar-SA" : "en-US");
  const counts = rtl
    ? `الذكور ${fmt(stats.males)}  ·  الإناث ${fmt(stats.females)}  ·  المجموع ${fmt(stats.total)}`
    : `Males ${fmt(stats.males)}  ·  Females ${fmt(stats.females)}  ·  Total ${fmt(stats.total)}`;
  // lay the key out from the centre; RTL reads right to left
  const gap = fs * 1.8;
  const widths = items.map((it) => sw + fs * 0.5 + textWidth(it.label, fs));
  const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
  let cursor = rtl ? W / 2 + total / 2 : W / 2 - total / 2;
  const placed = items.map((it, i) => {
    const w = widths[i];
    const x0 = rtl ? cursor - w : cursor;
    cursor = rtl ? cursor - w - gap : cursor + w + gap;
    // swatch on the reading-start side of each label
    const swX = rtl ? x0 + w - sw : x0;
    const textX = rtl ? swX - fs * 0.5 : x0 + sw + fs * 0.5;
    return (
      <g key={i}>
        {it.swatch(swX)}
        {/* with direction=rtl, "start" is the right edge of the text */}
        <text x={textX} y={y} dominantBaseline="central" textAnchor="start" direction={rtl ? "rtl" : "ltr"} fontSize={fs} fill={pal.ink}>
          {it.label}
        </text>
      </g>
    );
  });
  return (
    <g>
      {placed}
      <text x={W / 2} y={y + fs * 1.9} dominantBaseline="central" textAnchor="middle" direction={rtl ? "rtl" : "ltr"} fontSize={fs} fill={pal.ink}>
        {counts}
      </text>
      <text x={W / 2} y={y + fs * 3.4} dominantBaseline="central" textAnchor="middle" fontSize={fs * 0.8} fill={pal.mono ? "#666" : "#8a6d40"} direction={rtl ? "rtl" : "ltr"}>
        {rtl ? `${meta.name} — صُمّمت بواسطة شجرة` : `${meta.name} — made with Shajarah`}
      </text>
    </g>
  );
}
