import { describe, expect, it } from "vitest";
import { AUTO_LEAF_LIMIT, computePosterLayout } from "@/lib/layout/botanical";
import { smallFamily } from "@/lib/samples/fixtures";
import { naturalFamily } from "@/lib/samples/natural";
import { computeGenerations, parentAssignmentError } from "@/lib/genealogy";
import { generateSampleTree } from "@/lib/sampleData";
import type { MemberDTO, TreeDTO } from "@/lib/types";

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5;

describe("botanical layout", () => {
  const tree = generateSampleTree();

  it("places every lineage member on the trunk, a stub, or the crown", () => {
    const layout = computePosterLayout(tree);
    const males = tree.members.filter((m) => m.gender === "MALE").length;
    const shown = layout.nodes.length + layout.trunkLabels.length + layout.stubs.length + (layout.base ? 1 : 0);
    expect(shown).toBe(males);
    expect(layout.stats.unplaced).toBe(0);
    expect(layout.trunkLabels.map((l) => l.member.name)).toEqual(
      ["قشعم", "سعد", "غزي", "حمود", "فاضل", "كنعان", "فارس", "ثويني"],
    );
    expect(layout.base?.member.name).toBe("نصار");
    expect(layout.stubs.map((s) => s.member.name).sort()).toEqual(["غانم", "قتيبع"].sort());
  });

  it("with leaves chosen: draws every childless crown member as a named leaf", () => {
    const layout = computePosterLayout(tree, { nodeShape: "leaf" });
    // daughters are hidden by default, so only sons make a member a fork
    const withChildren = new Set(tree.members.filter((m) => m.gender === "MALE").map((m) => m.fatherId));
    for (const n of layout.nodes) {
      if (n.depth === 1) expect(n.shape).toBe("medallion");
      else expect(n.shape).toBe(withChildren.has(n.id) ? "pill" : "leaf");
    }
    expect(layout.nodes.filter((n) => n.shape === "leaf").length).toBeGreaterThan(50);
  });

  it("auto shape: upright ovals for a canopy of more than 50 names, leaves for a smaller one", () => {
    const big = computePosterLayout(tree);
    expect(big.nodes.length).toBeGreaterThan(AUTO_LEAF_LIMIT);
    for (const n of big.nodes) {
      expect(n.shape).not.toBe("leaf");
      expect(n.angle).toBe(0);
    }
    expect(big.nodes.some((n) => n.shape === "oval")).toBe(true);
    const few = computePosterLayout(smallFamily(), { nodeShape: "auto" });
    expect(few.nodes.length).toBeLessThanOrEqual(AUTO_LEAF_LIMIT);
    expect(few.nodes.some((n) => n.shape === "leaf")).toBe(true);
  });

  it("auto shape switches exactly above 50 names", () => {
    const at = (people: number) => computePosterLayout(naturalFamily(people), { nodeShape: "auto" });
    const fifty = at(AUTO_LEAF_LIMIT + 1); // the founder and 50 names in his branches
    const fiftyOne = at(AUTO_LEAF_LIMIT + 2);
    expect(fifty.nodes.length).toBe(AUTO_LEAF_LIMIT);
    expect(fifty.nodes.some((n) => n.shape === "leaf")).toBe(true);
    expect(fiftyOne.nodes.length).toBe(AUTO_LEAF_LIMIT + 1);
    expect(fiftyOne.nodes.some((n) => n.shape === "leaf")).toBe(false);
    expect(fiftyOne.nodes.some((n) => n.shape === "oval")).toBe(true);
  });

  it("a trunk without ancestors still stands at least a tenth of the content height", () => {
    const l = computePosterLayout(naturalFamily(350), { nodeShape: "auto" });
    expect(l.trunkLabels).toHaveLength(0);
    const contentH = l.frame.footerY - l.height * 0.095;
    expect(l.groundY - (l.origin.y + l.base!.h / 2)).toBeGreaterThanOrEqual(contentH * 0.1 - 1);
  });

  it("produces no overlapping name tags", () => {
    const layout = computePosterLayout(tree);
    const all = [...layout.nodes, ...(layout.base ? [layout.base] : [])];
    let count = 0;
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) if (overlaps(all[i], all[j])) count++;
    expect(count).toBe(0);
  });

  it("keeps nodes inside the poster and above the ground", () => {
    const layout = computePosterLayout(tree);
    for (const n of layout.nodes) {
      expect(n.x - n.w / 2).toBeGreaterThan(0);
      expect(n.x + n.w / 2).toBeLessThan(layout.width);
      expect(n.y).toBeLessThan(layout.groundY);
      expect(n.y - n.h / 2).toBeGreaterThan(layout.height * 0.06);
    }
  });

  it("is deterministic, and places names by the genealogy alone (not the seed)", () => {
    const a = computePosterLayout(tree, { seed: 3 });
    const b = computePosterLayout(tree, { seed: 3 });
    const c = computePosterLayout(tree, { seed: 4 });
    expect(a.branches).toEqual(b.branches);
    expect(a.nodes.map((n) => n.angle)).toEqual(b.nodes.map((n) => n.angle));
    expect(c.nodes.map((n) => [n.x, n.y])).toEqual(a.nodes.map((n) => [n.x, n.y]));
  });

  it("includes daughters when showFemales is on", () => {
    const layout = computePosterLayout(tree, { showFemales: true });
    expect(layout.stats.placed).toBe(tree.members.length);
  });

  it("keeps small families compact and overlap-free", () => {
    const small = generateSampleTree(5, 40);
    const layout = computePosterLayout(small);
    const all = [...layout.nodes, ...(layout.base ? [layout.base] : [])];
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i], all[j])).toBe(false);
    const highest = Math.min(...layout.nodes.map((n) => n.y));
    expect(highest).toBeGreaterThan(layout.crown.cy - layout.crown.ry);
  });

  it("handles empty and single-member trees", () => {
    const empty: TreeDTO = { ...tree, members: [], rootMemberId: null };
    expect(computePosterLayout(empty).nodes).toHaveLength(0);
    const one: TreeDTO = { ...tree, members: [tree.members[0]], rootMemberId: null };
    const layout = computePosterLayout(one);
    expect(layout.base?.member.name).toBe("قشعم");
  });
});

describe("genealogy rules", () => {
  const m = (id: string, fatherId: string | null, gender: MemberDTO["gender"] = "MALE"): MemberDTO => ({
    id, name: id, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false,
    birthOrder: 0, generation: 0, notes: null, fatherId, motherId: null,
  });
  const members = [m("a", null), m("b", "a"), m("c", "b"), m("w", null, "FEMALE")];

  it("computes generations from the lineage parent", () => {
    const g = computeGenerations(members, "PATRILINEAL");
    expect([g.get("a"), g.get("b"), g.get("c")]).toEqual([0, 1, 2]);
  });

  it("rejects loops and wrong-gender parents", () => {
    expect(parentAssignmentError(members, "a", "c", "father")).toMatch(/loop/);
    expect(parentAssignmentError(members, "c", "w", "father")).toMatch(/female/);
    expect(parentAssignmentError(members, "c", "a", "father")).toBeNull();
  });
});

describe("framed (Canva frame) mode", () => {
  const tree = generateSampleTree();

  it("keeps the tree and panels clear of the frame artwork's border and corners", () => {
    const layout = computePosterLayout(tree, { framed: true, cornerMedallions: true, headerBand: 0.19 });
    const { width: W, height: H } = layout;
    expect(layout.frame.framed).toBe(true);
    for (const n of layout.nodes) {
      expect(n.x - n.w / 2).toBeGreaterThan(W * 0.09);
      expect(n.x + n.w / 2).toBeLessThan(W * 0.91);
      expect(n.y - n.h / 2).toBeGreaterThan(H * 0.15);
    }
    // header below the top rosette, footer above the bottom one
    expect(layout.frame.header.basmala).toBeGreaterThan(H * 0.083);
    expect(layout.frame.footerY).toBeLessThan(H * 0.92);
    // names stay off the verse / hadith medallions, and the genealogy ends above the footer
    for (const n of layout.nodes) {
      for (const m of layout.medallions) expect(Math.hypot(n.x - m.x, n.y - m.y)).toBeGreaterThan(m.r);
    }
    expect(layout.groundY).toBeLessThan(layout.frame.footerY);
  });

  it("draws daughters as capsules and sons as leaves when femaleCapsule is on", () => {
    const layout = computePosterLayout(tree, { showFemales: true, femaleCapsule: true, nodeShape: "leaf" });
    const females = layout.nodes.filter((n) => n.member.gender === "FEMALE");
    expect(females.length).toBeGreaterThan(0);
    for (const n of females) expect(n.shape).not.toBe("leaf");
    expect(layout.nodes.some((n) => n.member.gender === "MALE" && n.shape === "leaf")).toBe(true);
  });
});
