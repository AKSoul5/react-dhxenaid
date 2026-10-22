import type { PaperSize } from "@/lib/paper";
// Composition and legibility across representative families: a small
// three-generation family, a large one, a long ancestral chain, several
// marriages with daughters, and names of very different lengths.
import { describe, expect, it } from "vitest";
import { computePosterLayout, type PosterLayout } from "@/lib/layout/botanical";
import { computeGenerations } from "@/lib/genealogy";
import { paperForScale } from "@/lib/paper";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliTree } from "@/lib/samples/kalali";
import { marriagesFamily, namesFamily, smallFamily } from "@/lib/samples/fixtures";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

const families: Record<string, TreeDTO> = {
  small: smallFamily(),
  large: generateSampleTree(),
  kalali: kalaliTree(),
  marriages: marriagesFamily(),
  names: namesFamily(),
};
const layoutOf = (tree: TreeDTO, paper: PaperSize = "A2") =>
  computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: tree.settings?.showFemales });
const mm = (l: PosterLayout, units: number, paperW = 420) => (units * paperW) / l.width;
const extent = (l: PosterLayout) => {
  const boxes = [...l.nodes, ...l.stubs, ...(l.base ? [l.base] : []), ...l.trunkLabels];
  const top = Math.min(...boxes.map((b) => b.y - b.h / 2));
  const bottom = l.soil ? l.soil.box.y + l.soil.box.h : l.groundY;
  return { top, bottom };
};

describe("composition", () => {
  // the large family is unambiguous only from A1 (on A2 it is flagged)
  const paperFor = (name: string) => (name === "large" ? "A1" : "A2");
  for (const [name, tree] of Object.entries(families)) {
    it(`${name}: every name is legible and the genealogy fills the page (${paperFor(name)})`, () => {
      const l = layoutOf(tree, paperFor(name));
      expect(l.legibility.ok).toBe(true);
      expect(l.overlaps).toBe(0);
      const paperW = paperFor(name) === "A1" ? 594 : 420;
      for (const n of [...l.nodes, ...l.stubs]) expect(mm(l, n.fontSize, paperW)).toBeGreaterThanOrEqual(3.2 * 0.99);
      // the genealogy uses most of the height between header and footer
      const { top, bottom } = extent(l);
      const header = l.height * 0.13;
      const avail = l.frame.footerY - header;
      expect((bottom - top) / avail).toBeGreaterThan(0.7);
      expect(top).toBeGreaterThan(header * 0.95);
      expect(bottom).toBeLessThan(l.frame.footerY);
    });
  }

  it("small families get large names instead of empty paper", () => {
    const l = layoutOf(families.small);
    const sizes = l.nodes.map((n) => mm(l, n.fontSize));
    expect(Math.min(...sizes)).toBeGreaterThan(8);
  });

  it("keeps every leaf close to horizontal so names read easily", () => {
    for (const tree of Object.values(families)) {
      for (const n of layoutOf(tree).nodes.filter((x) => x.shape === "leaf")) {
        const tilt = n.angle > 90 || n.angle < -90 ? 180 - Math.abs(n.angle) : Math.abs(n.angle);
        expect(tilt).toBeLessThanOrEqual(30.5);
      }
    }
  });

  it("uses medallions only for sons who head a branch, never for childless daughters", () => {
    const l = layoutOf(families.marriages);
    for (const n of l.nodes.filter((x) => x.shape === "medallion")) expect(n.terminal).toBe(false);
    const daughters = l.nodes.filter((n) => n.member.gender === "FEMALE");
    expect(daughters.length).toBeGreaterThan(10);
    for (const d of daughters) expect(d.shape).toBe("pill");
  });

  it("gives bigger sub-branches proportionally more of the canopy", () => {
    const l = layoutOf(families.large);
    const limbs = l.nodes.filter((n) => n.depth === 1);
    const spread = (id: string) => {
      const kids = l.nodes.filter((n) => n.parentId === id);
      return kids.length ? Math.max(...kids.map((k) => k.x)) - Math.min(...kids.map((k) => k.x)) : 0;
    };
    const big = limbs.reduce((a, b) => (a.leafCount > b.leafCount ? a : b));
    const small = limbs.reduce((a, b) => (a.leafCount < b.leafCount ? a : b));
    expect(spread(big.id)).toBeGreaterThan(spread(small.id));
  });

  it("shows laqabs and honorifics under the name", () => {
    const l = layoutOf(families.names);
    expect(l.base?.subLabel).toBe("رضي الله عنه");
    const amin = l.nodes.find((n) => n.member.name === "محمد الأمين")!;
    expect(amin.subLabel).toBe("الشيخ");
    // the medallion is wide enough for both lines
    expect(amin.w).toBeGreaterThan(amin.fontSize * 2.7);
  });

  it("keeps half-siblings together, grouped by mother", () => {
    const tree = marriagesFamily();
    const father = tree.members[0];
    const kids = tree.members.filter((m) => m.fatherId === father.id);
    // interleave the mothers by birth order
    kids.forEach((k, i) => { k.birthOrder = i % 2 === 0 ? i : kids.length + i; });
    const l = computePosterLayout(tree, { showFemales: true });
    const order = l.nodes.filter((n) => n.parentId === father.id).sort((a, b) => a.x - b.x).map((n) => n.member.motherId);
    const runs = order.filter((m, i) => i === 0 || m !== order[i - 1]).length;
    expect(runs).toBe(2);
  });
});

describe("legibility and poster size", () => {
  // ~500 names with daughters: too dense for A3
  const huge = (() => {
    const t = generateSampleTree(5, 5000);
    return { ...t, settings: { ...t.settings, showFemales: true } };
  })();

  it("reports when a family cannot be set legibly, and which paper fits", () => {
    const a3 = layoutOf(huge, "A3");
    expect(a3.legibility.ok).toBe(false);
    expect(a3.legibility.scaleNeeded).toBeGreaterThan(1);
    const next = paperForScale("A3", a3.legibility.scaleNeeded);
    expect(next).not.toBeNull();
    expect(next).not.toBe("A3");
    const larger = layoutOf(huge, next!);
    expect(larger.legibility.ok).toBe(true);
  });

  it("never silently shrinks names below the minimum when it reports success", () => {
    for (const paper of ["A3", "A2", "A1", "A0"] as const) {
      const l = layoutOf(families.large, paper);
      if (!l.legibility.ok) continue;
      expect(l.legibility.smallestTextMm).toBeGreaterThanOrEqual(3.2 * 0.99);
    }
  });

  it("a larger poster carries a denser family at the same printed size", () => {
    const a2 = layoutOf(families.large, "A2");
    const a0 = layoutOf(families.large, "A0");
    const minUnits = (l: PosterLayout) => Math.min(...l.nodes.map((n) => n.fontSize));
    // in poster units the A0 layout may use smaller type, because it prints
    // larger (never larger type: at most the same, within rounding of the
    // size search, when both come out clean near full size)
    expect(minUnits(a0)).toBeLessThanOrEqual(minUnits(a2) * 1.02);
    expect(a0.legibility.smallestTextMm).toBeGreaterThanOrEqual(a2.legibility.smallestTextMm);
    expect(a0.legibility.ok).toBe(true);
  });
});

describe("long ancestral chains", () => {
  it("keeps a 60-ancestor trunk legible instead of compressing it", () => {
    const members: MemberDTO[] = [];
    let parent: string | null = null;
    for (let i = 0; i < 64; i++) {
      const m: MemberDTO = {
        id: `c${i}`, name: i % 3 ? "عبد الرحمن" : "محمد", laqab: null, gender: "MALE", birthYear: null, deathYear: null,
        isDeceased: false, birthOrder: 0, generation: 0, notes: null, fatherId: parent, motherId: null,
      };
      members.push(m);
      parent = m.id;
    }
    for (const s of ["علي", "عمر"]) members.push({ ...members[63], id: `k-${s}`, name: s, fatherId: "c63" });
    const gens = computeGenerations(members, "PATRILINEAL");
    for (const m of members) m.generation = gens.get(m.id)!;
    const tree: TreeDTO = {
      id: "chain", name: "chain", title: "سلسلة", subtitle: null, lineage: "PATRILINEAL", rootMemberId: "c0",
      crownBaseId: "c63", trunkStartId: "c3", soilText: null, settings: null, members, marriages: [], sources: [], citations: [], media: [],
    };
    const l = layoutOf(tree);
    expect(l.trunkLabels.length).toBe(60);
    if (l.legibility.ok) {
      for (const t of l.trunkLabels) expect(mm(l, t.fontSize)).toBeGreaterThanOrEqual(3.2 * 0.99);
    } else {
      // too long for A2: it says so, and names the size that works
      expect(paperForScale("A2", l.legibility.scaleNeeded)).not.toBeNull();
    }
  });
});
