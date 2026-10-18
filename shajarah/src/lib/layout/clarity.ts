/**
 * Relationship-clarity validation.
 *
 * Non-overlapping labels are not enough: a viewer must be able to trace who
 * descends from whom. This check compares the drawn connections with the
 * genealogy data and the geometry of the poster:
 *
 *  1. Completeness — every placed person whose lineage parent is also
 *     placed has exactly one drawn connection from that parent (trunk
 *     ancestors are connected in data order by the trunk itself).
 *  2. Attachment — each connection starts at its parent's label and ends at
 *     its child's label.
 *  3. Occlusion — no connection passes under (behind) a label that is not
 *     its own parent or child, which would make it look attached to it.
 *  4. Crossings — two connections that cross must do so at a clear angle,
 *     away from labels, so the "line over line" reading is unambiguous
 *     (the renderer draws every branch with a paper-coloured edge, so the
 *     upper line visibly passes over the lower one).
 *  5. Merging — two unrelated connections must not run along each other,
 *     where they would read as one branch.
 *  6. False junctions — where a line becomes visible (leaving its parent's
 *     label) or stops (at its child's label) it must not touch an unrelated
 *     line, or it would appear to branch from that line.
 *
 * Passing these checks is necessary, not sufficient: renders must still be
 * inspected at print scale.
 */
import { lineageParentId, posterParentId } from "../genealogy";
import type { TreeDTO } from "../types";
import type { Edge, PosterLayout } from "./botanical";
import type { Vec } from "./geometry";

export interface ClarityIssue {
  kind: "missing" | "misattached" | "occlusion" | "crossing" | "merge" | "junction" | "trunk-order";
  /** The connection concerned, as parent → child member ids. */
  edge?: [string, string];
  /** The other connection (crossing, merge) or the label it touches (occlusion). */
  other?: [string, string] | string;
  at?: Vec;
  detail?: string;
}

export interface ClarityReport {
  ok: boolean;
  expected: number;
  drawn: number;
  /** Crossings drawn with the clear over/under convention (allowed). */
  clearCrossings: number;
  issues: ClarityIssue[];
}

type Box = { id: string; x: number; y: number; w: number; h: number; leaf: boolean };

/** Minimum angle for a crossing to read clearly as one line passing over another. */
export const CLEAR_CROSSING_DEG = 30;

export function validateRelationships(layout: PosterLayout, tree: TreeDTO): ClarityReport {
  const issues: ClarityIssue[] = [];
  const byMember = new Map(tree.members.map((m) => [m.id, m]));

  // Every label on the poster (people, stubs, base, trunk ancestors).
  const boxes = new Map<string, Box>();
  for (const n of [...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])]) {
    boxes.set(n.id, { id: n.id, x: n.x, y: n.y, w: n.w, h: n.h, leaf: n.shape === "leaf" });
  }
  for (const t of layout.trunkLabels) {
    boxes.set(t.member.id, { id: t.member.id, x: t.x, y: t.y, w: t.w, h: t.h, leaf: false });
  }

  // ── 1. completeness (data → drawing) ───────────────────────────────────
  const edgeKey = (p: string, c: string) => `${p}→${c}`;
  const drawn = new Map<string, Edge>();
  for (const e of layout.edges) drawn.set(edgeKey(e.parentId, e.childId), e);
  let expected = 0;
  // (children of a daughter whose family is shown are drawn from her)
  const through = new Set(layout.familiesThrough ?? []);
  for (const n of [...layout.nodes, ...layout.stubs]) {
    const parentId = posterParentId(n.member, tree.lineage, through);
    if (!parentId || !boxes.has(parentId)) continue;
    expected++;
    if (!drawn.has(edgeKey(parentId, n.id))) issues.push({ kind: "missing", edge: [parentId, n.id] });
  }
  for (const e of layout.edges) {
    const child = byMember.get(e.childId);
    if (child && posterParentId(child, tree.lineage, through) !== e.parentId) {
      issues.push({ kind: "missing", edge: [e.parentId, e.childId], detail: "drawn from the wrong parent" });
    }
  }
  // trunk: bottom → top must follow the data, father to son, ending at the base
  const chain = [...layout.trunkLabels.map((t) => t.member), ...(layout.base ? [layout.base.member] : [])];
  for (let i = 1; i < chain.length; i++) {
    if (lineageParentId(chain[i], tree.lineage) !== chain[i - 1].id) {
      issues.push({ kind: "trunk-order", edge: [chain[i - 1].id, chain[i].id] });
    }
  }
  for (let i = 1; i < layout.trunkLabels.length; i++) {
    if (!(layout.trunkLabels[i].y < layout.trunkLabels[i - 1].y)) {
      issues.push({ kind: "trunk-order", edge: [layout.trunkLabels[i - 1].member.id, layout.trunkLabels[i].member.id], detail: "not rising" });
    }
  }

  // ── 2. attachment ─────────────────────────────────────────────────────
  const inside = (p: Vec, b: Box, pad: number) => Math.abs(p.x - b.x) <= b.w / 2 + pad && Math.abs(p.y - b.y) <= b.h / 2 + pad;
  const trunkIds = new Set(layout.trunkLabels.map((t) => t.member.id));
  for (const e of layout.edges) {
    const pb = boxes.get(e.parentId);
    const cb = boxes.get(e.childId);
    const start = e.points[0];
    const end = e.points[e.points.length - 1];
    // connections from a trunk ancestor leave the trunk at that ancestor's row
    const startOk = !pb ? false : trunkIds.has(e.parentId)
      ? Math.abs(start.y - pb.y) <= pb.h * 1.3 && Math.abs(start.x - layout.origin.x) <= layout.trunkWidth / 2 + pb.h
      : inside(start, pb, e.w0);
    if (!startOk) issues.push({ kind: "misattached", edge: [e.parentId, e.childId], at: start, detail: "start" });
    if (!cb || !inside(end, cb, e.w1 + 1)) issues.push({ kind: "misattached", edge: [e.parentId, e.childId], at: end, detail: "end" });
  }

  // ── 3. occlusion: a line hidden under an unrelated label ──────────────
  // Only the visible part of each line counts: points under its own parent
  // or child label are skipped.
  const all = [...boxes.values()];
  for (const e of layout.edges) {
    const own = new Set([e.parentId, e.childId]);
    const pb = boxes.get(e.parentId), cb = boxes.get(e.childId);
    const pts = e.points.filter((p) => !(pb && inside(p, pb, 0)) && !(cb && inside(p, cb, 0)));
    if (!pts.length) continue;
    const ex0 = Math.min(...pts.map((p) => p.x)), ex1 = Math.max(...pts.map((p) => p.x));
    const ey0 = Math.min(...pts.map((p) => p.y)), ey1 = Math.max(...pts.map((p) => p.y));
    for (const b of all) {
      if (own.has(b.id)) continue;
      if (b.x + b.w / 2 < ex0 || b.x - b.w / 2 > ex1 || b.y + b.h / 2 < ey0 || b.y - b.h / 2 > ey1) continue;
      // leaves are pointed ellipses inside their box: test the inscribed ellipse
      const hit = pts.find((p) => {
        const dx = (p.x - b.x) / (b.w / 2), dy = (p.y - b.y) / (b.h / 2);
        return b.leaf ? dx * dx + dy * dy < 0.6 : Math.abs(dx) < 0.92 && Math.abs(dy) < 0.85;
      });
      if (hit) issues.push({ kind: "occlusion", edge: [e.parentId, e.childId], other: b.id, at: hit });
    }
  }

  // ── 4/5. crossings and merges between unrelated connections ───────────
  let clearCrossings = 0;
  const endsCache = new Map<Edge, Vec[]>();
  const visibleEnds = (e: Edge) => {
    if (!endsCache.has(e)) endsCache.set(e, visibleEndsOf(e, boxes));
    return endsCache.get(e)!;
  };
  const bb = layout.edges.map((e) => {
    const xs = e.points.map((p) => p.x), ys = e.points.map((p) => p.y);
    const pad = Math.max(e.w0, e.w1);
    return { x0: Math.min(...xs) - pad, x1: Math.max(...xs) + pad, y0: Math.min(...ys) - pad, y1: Math.max(...ys) + pad };
  });
  for (let i = 0; i < layout.edges.length; i++) {
    const a = layout.edges[i];
    for (let j = i + 1; j < layout.edges.length; j++) {
      const b = layout.edges[j];
      // a line and its continuation meet at the person between them by design
      if (a.childId === b.parentId || b.childId === a.parentId) continue;
      if (bb[i].x1 < bb[j].x0 || bb[j].x1 < bb[i].x0 || bb[i].y1 < bb[j].y0 || bb[j].y1 < bb[i].y0) continue;
      // Siblings' lines leave their father together and fan out; in their
      // outer half (towards their names) they must neither cross nor run
      // together, or the reader cannot tell which line ends at which name.
      const siblings = a.parentId === b.parentId;
      const pa = siblings ? a.points.slice(Math.floor(a.points.length / 2)) : a.points;
      const pb = siblings ? b.points.slice(Math.floor(b.points.length / 2)) : b.points;
      const cross = crossingOf(pa, pb);
      if (cross) {
        // hidden under a label: the label is drawn on top, so nothing is seen
        // (a line under an UNRELATED label is reported as an occlusion)
        if (all.some((box) => inside(cross.at, box, 0))) continue;
        const nearLabel = all.some((box) => inside(cross.at, box, Math.max(a.w0, b.w0)));
        if (cross.angle >= CLEAR_CROSSING_DEG && !nearLabel) clearCrossings++;
        else issues.push({
          kind: "crossing", edge: [a.parentId, a.childId], other: [b.parentId, b.childId], at: cross.at,
          detail: nearLabel ? "at a label" : `shallow (${cross.angle.toFixed(0)}°)`,
        });
        continue;
      }
      // a merge needs the two lines within touching distance somewhere
      const touch = (a.w0 + b.w0) / 2 + 2;
      if (bb[i].x1 + touch < bb[j].x0 || bb[j].x1 + touch < bb[i].x0 || bb[i].y1 + touch < bb[j].y0 || bb[j].y1 + touch < bb[i].y0) continue;
      const merge = mergeOf({ ...a, points: pa }, { ...b, points: pb });
      if (merge) {
        issues.push({ kind: "merge", edge: [a.parentId, a.childId], other: [b.parentId, b.childId], at: merge });
        continue;
      }
      for (const [x, y] of (siblings ? [] : [[a, b], [b, a]]) as [Edge, Edge][]) {
        const j = falseJunction(x, y, visibleEnds(x));
        if (j) {
          issues.push({ kind: "junction", edge: [x.parentId, x.childId], other: [y.parentId, y.childId], at: j });
          break;
        }
      }
    }
  }

  return {
    ok: issues.length === 0,
    expected,
    drawn: layout.edges.length,
    clearCrossings,
    issues,
  };
}

/** Where a line becomes visible from under its parent's label and where it disappears under its child's. */
function visibleEndsOf(e: Edge, boxes: Map<string, Box>): Vec[] {
  const inBox = (p: Vec, b?: Box) => !!b && Math.abs(p.x - b.x) <= b.w / 2 && Math.abs(p.y - b.y) <= b.h / 2;
  const pb = boxes.get(e.parentId), cb = boxes.get(e.childId);
  const vis = e.points.filter((p) => !inBox(p, pb) && !inBox(p, cb));
  return vis.length ? [vis[0], vis[vis.length - 1]] : [];
}

/** A visible end of line `a` touching line `b`. */
function falseJunction(a: Edge, b: Edge, ends: Vec[]): Vec | null {
  const touch = (a.w0 + b.w0) / 2 + 2;
  for (const p of ends) {
    for (let j = 1; j < b.points.length; j++) {
      if (distToSegment(p, b.points[j - 1], b.points[j]) < touch) return p;
    }
  }
  return null;
}

/** First intersection of two polylines, with the angle between the segments. */
function crossingOf(a: Vec[], b: Vec[]): { at: Vec; angle: number } | null {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const p = segmentIntersection(a[i - 1], a[i], b[j - 1], b[j]);
      if (!p) continue;
      const ua = { x: a[i].x - a[i - 1].x, y: a[i].y - a[i - 1].y };
      const ub = { x: b[j].x - b[j - 1].x, y: b[j].y - b[j - 1].y };
      const cos = Math.abs(ua.x * ub.x + ua.y * ub.y) / ((Math.hypot(ua.x, ua.y) * Math.hypot(ub.x, ub.y)) || 1);
      return { at: p, angle: (Math.acos(Math.min(1, cos)) * 180) / Math.PI };
    }
  }
  return null;
}

function segmentIntersection(p: Vec, p2: Vec, q: Vec, q2: Vec): Vec | null {
  const r = { x: p2.x - p.x, y: p2.y - p.y };
  const s = { x: q2.x - q.x, y: q2.y - q.y };
  const d = r.x * s.y - r.y * s.x;
  if (Math.abs(d) < 1e-9) return null;
  const t = ((q.x - p.x) * s.y - (q.y - p.y) * s.x) / d;
  const u = ((q.x - p.x) * r.y - (q.y - p.y) * r.x) / d;
  if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
  return { x: p.x + t * r.x, y: p.y + t * r.y };
}

/**
 * Two connections "merge" when one runs within touching distance of the
 * other for a stretch (three consecutive samples), away from their ends.
 */
function mergeOf(a: Edge, b: Edge): Vec | null {
  const touch = (a.w0 + b.w0) / 2 + 2;
  let run = 0;
  const xs = b.points.map((q) => q.x), ys = b.points.map((q) => q.y);
  const x0 = Math.min(...xs) - touch, x1 = Math.max(...xs) + touch, y0 = Math.min(...ys) - touch, y1 = Math.max(...ys) + touch;
  for (let i = 2; i < a.points.length - 2; i++) {
    const p = a.points[i];
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) {
      run = 0;
      continue;
    }
    let dmin = Infinity;
    for (let j = 1; j < b.points.length; j++) dmin = Math.min(dmin, distToSegment(p, b.points[j - 1], b.points[j]));
    run = dmin < touch ? run + 1 : 0;
    if (run >= 3) return p;
  }
  return null;
}

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const vx = b.x - a.x, vy = b.y - a.y;
  const l2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2));
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy);
}
