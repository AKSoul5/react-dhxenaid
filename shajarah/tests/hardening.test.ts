// Correctness hardening: lineage modes, the relaxation's final pass, and
// colour adjacency measured on the actual canopy.
import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { computeGenerations, lineagePath } from "@/lib/genealogy";
import { generateSampleTree } from "@/lib/sampleData";
import { denseFamily, marriagesFamily, multiMarriageFamily, namesFamily, smallFamily } from "@/lib/samples/fixtures";
import { kalaliTree } from "@/lib/samples/kalali";
import { LINEAGE_COLORS, layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** A matrilineal family: the line runs through mothers (fathers unrecorded). */
function matrilinealFamily(): TreeDTO {
  const members: MemberDTO[] = [];
  let n = 0;
  const add = (name: string, gender: "MALE" | "FEMALE", motherId: string | null, order = 0): MemberDTO => {
    const m: MemberDTO = {
      id: `ml-${++n}`, name, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false,
      birthOrder: order, generation: 0, notes: null, fatherId: null, motherId,
    };
    members.push(m);
    return m;
  };
  const root = add("خديجة", "FEMALE", null);
  for (const [i, d] of ["فاطمة", "زينب", "مريم"].entries()) {
    const daughter = add(d, "FEMALE", root.id, i);
    add("علي", "MALE", daughter.id, 0);
    const g = add("سارة", "FEMALE", daughter.id, 1);
    add("نورة", "FEMALE", g.id, 0);
  }
  add("حسن", "MALE", root.id, 3);
  const gens = computeGenerations(members, "MATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id)!;
  return {
    id: "matri", name: "matri", title: "matri", subtitle: null, lineage: "MATRILINEAL", rootMemberId: root.id,
    crownBaseId: null, trunkStartId: null, soilText: null, settings: { showFemales: false }, members, marriages: [],
  };
}

describe("lineage modes", () => {
  it("keeps matrilineal children attached when daughters are hidden", () => {
    const tree = matrilinealFamily();
    const layout = computePosterLayout(tree, { showFemales: false });
    expect(layout.stats.unplaced).toBe(0);
    // every member is on the poster: the line runs through the women
    const shown = layout.nodes.length + layout.stubs.length + layout.trunkLabels.length + (layout.base ? 1 : 0);
    expect(shown).toBe(tree.members.length);
    expect(layout.edges.length).toBe(tree.members.length - 1);
    expect(layout.clarity.issues.filter((i) => i.kind === "missing")).toEqual([]);
  });
});

describe("relaxation: the final separation pass respects the constraints", () => {
  const families: [string, TreeDTO][] = [
    ["small", smallFamily()], ["large", generateSampleTree()], ["kalali", kalaliTree()],
    ["marriages", marriagesFamily()], ["names", namesFamily()], ["dense", denseFamily()], ["multi", multiMarriageFamily()],
  ];
  for (const [name, tree] of families) {
    it(`${name}: every name stays on the page, inside the frame margin and above the ground`, () => {
      const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), "A2"), showFemales: tree.settings?.showFemales });
      const margin = l.width * 0.05 - 1;
      for (const n of [...l.nodes, ...l.stubs]) {
        expect(n.x - n.w / 2, n.label).toBeGreaterThanOrEqual(margin);
        expect(n.x + n.w / 2, n.label).toBeLessThanOrEqual(l.width - margin);
        expect(n.y - n.h / 2, n.label).toBeGreaterThanOrEqual(0);
        expect(n.y, n.label).toBeLessThan(l.groundY);
      }
    });
  }
});

describe("lineage colours on the actual canopy", () => {
  for (const [name, tree] of [["several marriages", multiMarriageFamily()], ["dense", denseFamily()], ["large", generateSampleTree()]] as const) {
    it(`${name}: branch heads that are neighbours around the canopy never share a colour`, () => {
      const l = computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), "A1"), showFemales: tree.settings?.showFemales });
      // order by the actual angle around the crown base, not by colour index
      const angle = (n: { x: number; y: number }) => Math.atan2(l.origin.y - n.y, n.x - l.origin.x);
      const heads = l.nodes.filter((n) => n.depth === 1 && n.lineage != null).sort((a, b) => angle(b) - angle(a));
      expect(heads.length).toBeGreaterThan(1);
      const colour = (i: number) => LINEAGE_COLORS[i % LINEAGE_COLORS.length];
      for (let i = 1; i < heads.length; i++) {
        expect(colour(heads[i].lineage!), `${heads[i - 1].label} / ${heads[i].label}`).not.toBe(colour(heads[i - 1].lineage!));
      }
    });
  }
});

describe("focus mode (one branch on its own poster)", () => {
  const tree = generateSampleTree(5, 5000);
  const big = { ...tree, settings: { ...tree.settings, showFemales: true } };
  const full = computePosterLayout(big, { ...layoutOptionsFor(resolveTheme(big.settings), "A1"), showFemales: true });
  const head = full.nodes.filter((n) => n.depth === 1 && !n.terminal).sort((a, b) => b.leafCount - a.leafCount)[0];
  const focused = computePosterLayout(big, { ...layoutOptionsFor(resolveTheme(big.settings), "A1"), showFemales: true, focusId: head.id });
  const { ancestors, descendants } = lineagePath(big.members, big.lineage, head.id);
  const line = new Set([head.id, ...ancestors, ...descendants]);

  it("draws only the person's ancestors and descendants, and all of them", () => {
    const drawn = [...focused.nodes, ...focused.stubs, ...(focused.base ? [focused.base] : []), ...focused.trunkLabels].map((n) => n.member.id);
    for (const id of drawn) expect(line.has(id)).toBe(true);
    for (const id of descendants) expect(focused.nodes.some((n) => n.id === id)).toBe(true);
    expect(focused.stats.total).toBe(line.size);
    expect(focused.stats.unplaced).toBe(0);
  });

  it("starts the canopy at the person and names the branch", () => {
    expect(focused.base?.id).toBe(head.id);
    expect(focused.focus?.id).toBe(head.id);
    expect(focused.focus?.label).toContain(head.member.name);
    expect(full.focus).toBeNull();
  });

  it("is the way out for a family too dense for one clear poster", () => {
    expect(full.clarity.ok && full.legibility.ok).toBe(false);
    expect(focused.clarity.issues.length).toBeLessThan(full.clarity.issues.length);
    // every other branch fits one clear, legible A1 poster on its own
    const opts = { ...layoutOptionsFor(resolveTheme(big.settings), "A1"), showFemales: true };
    for (const h of full.nodes.filter((n) => n.depth === 1 && !n.terminal && n.id !== head.id)) {
      const l = computePosterLayout(big, { ...opts, focusId: h.id });
      expect(l.clarity.ok && l.legibility.ok).toBe(true);
    }
    // the largest one (over half the family) is narrowed once more, to its biggest sub-branch
    const sub = focused.nodes.filter((n) => n.depth === 1 && !n.terminal).sort((a, b) => b.leafCount - a.leafCount)[0];
    const narrowed = computePosterLayout(big, { ...opts, focusId: sub.id });
    expect(narrowed.base?.id).toBe(sub.id);
    expect(narrowed.clarity.ok && narrowed.legibility.ok).toBe(true);
  });

  it("is read from the saved settings, and a stale id falls back to the whole family", () => {
    const viaSettings = computePosterLayout({ ...big, settings: { ...big.settings, focusId: head.id } }, { showFemales: true });
    expect(viaSettings.focus?.id).toBe(head.id);
    const stale = computePosterLayout({ ...big, settings: { ...big.settings, focusId: "gone" } }, { showFemales: true });
    expect(stale.focus).toBeNull();
    expect(stale.stats.total).toBe(big.members.length);
  });

  it("keeps a focused daughter on the poster even when daughters are hidden", () => {
    const daughter = big.members.find((m) => m.gender === "FEMALE" && m.fatherId)!;
    const l = computePosterLayout(big, { showFemales: false, focusId: daughter.id });
    expect(l.base?.id ?? l.nodes.find((n) => n.id === daughter.id)?.id).toBe(daughter.id);
  });
});
