// 350 people, a natural family: the founder with seven children, a grandson
// with six, most men with 2–4 children early on and 0–2 later, lines
// ending, branches about even. What the poster guarantees at this size, on
// five different families. (Speed: tests/bench, `npm run bench`.)
//
// Measured, not guaranteed: on A1 such a family is at the limit, between
// 0 and about 30 ambiguous connections depending on its shape, and the
// editor says so; on A0 two of these five are fully clear and the others
// have a handful.
import { describe, expect, it } from "vitest";
import { AUTO_LEAF_LIMIT, CLARITY_LIMIT, computePosterLayout } from "@/lib/layout/botanical";
import { naturalFamily } from "@/lib/samples/natural";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";

const SEEDS = [7, 11, 23, 31, 42];
const layoutAt = (tree: ReturnType<typeof naturalFamily>, paper: "A1" | "A0") =>
  computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: true });

describe("a natural family of 350", () => {
  for (const seed of SEEDS) {
    it(`family ${seed}: exactly 350 people in a natural, balanced shape`, () => {
      const tree = naturalFamily(350, seed);
      expect(tree.members).toHaveLength(350);
      const kids = new Map<string, number>();
      for (const m of tree.members) if (m.fatherId) kids.set(m.fatherId, (kids.get(m.fatherId) ?? 0) + 1);
      const counts = [...kids.values()].sort((a, b) => b - a);
      // one or two large families (6–7 children), the rest smaller
      expect(counts[0]).toBe(7);
      expect(counts.filter((c) => c >= 6).length).toBeLessThanOrEqual(2);
      expect(counts.filter((c) => c >= 6).length / counts.length).toBeLessThan(0.05);
      // many lines end: plenty of grown men without children
      const fathers = new Set(kids.keys());
      expect(tree.members.filter((m) => m.gender === "MALE" && !fathers.has(m.id)).length).toBeGreaterThan(100);
    });

    it(`family ${seed}: ovals, no overlapping names and legible text on A1 and A0, not too dense on A0`, () => {
      const tree = naturalFamily(350, seed);
      const a1 = layoutAt(tree, "A1");
      const a0 = layoutAt(tree, "A0");
      expect(a1.nodes.length).toBeGreaterThan(AUTO_LEAF_LIMIT);
      for (const l of [a1, a0]) {
        expect(l.nodes.every((n) => n.shape === "oval" || n.shape === "medallion")).toBe(true);
        expect(l.overlaps).toBe(0);
        expect(l.stats.unplaced).toBe(0);
        expect(l.clarity.issues.filter((i) => i.kind === "missing" || i.kind === "misattached")).toEqual([]);
      }
      expect(a0.legibility.ok).toBe(true);
      expect(a0.clarity.issues.length).toBeLessThanOrEqual(CLARITY_LIMIT + 1);
      // the editor's verdict matches the count it is given
      expect(a1.tooDense).toBe(a1.clarity.issues.length > CLARITY_LIMIT);
    }, 30000);
  }
});
