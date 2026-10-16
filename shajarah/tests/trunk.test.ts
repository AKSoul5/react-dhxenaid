import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout, type PosterNode } from "@/lib/layout/botanical";
import { parseNasab } from "@/lib/nasab";
import { KALALI_NASAB, kalaliTree as kalaliSample } from "@/lib/samples/kalali";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** Builds a tree from the Kalali chain plus a few descendants and a side lineage. */
function kalaliTree(): TreeDTO {
  const { entries } = parseNasab(KALALI_NASAB);
  const members: MemberDTO[] = [];
  const add = (name: string, fatherId: string | null, laqab: string | null = null) => {
    const m: MemberDTO = {
      id: `k${members.length}`, name, laqab, gender: "MALE", birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: members.filter((x) => x.fatherId === fatherId).length,
      generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };
  let parent: MemberDTO | null = null;
  for (const e of entries) parent = add(e.name, parent?.id ?? null, e.laqab);
  // canopy below "Ahmed": a few sons and grandsons
  const ahmed = parent!;
  for (const s of ["محمد", "سالم", "علي"]) {
    const son = add(s, ahmed.id);
    for (const g of ["عمر", "مبارك"]) add(g, son.id);
  }
  // side lineage: a brother of نوفل's father with descendants
  const ahmedSenior = members.find((m) => m.name === "أحمد" && members.some((c) => c.fatherId === m.id && c.name === "نوفل"))!;
  const brother = add("عوض", ahmedSenior.fatherId);
  add("حسين", brother.id);
  add("فرج", brother.id);
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id)!;
  return {
    id: "kalali", name: "الكلالي", title: "شجرة عائلة الكلالي", subtitle: null, lineage: "PATRILINEAL",
    rootMemberId: members[0].id, crownBaseId: ahmed.id, trunkStartId: null, soilText: null,
    settings: null, members, marriages: [],
  };
}

const overlaps = (a: PosterNode, b: PosterNode) =>
  Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.5 && Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 0.5;

describe("trunk, lineage panel and side branches", () => {
  const tree = kalaliTree();

  it("automatic mode: nearest ancestors on the trunk, the rest inscribed in the soil", () => {
    const layout = computePosterLayout(tree);
    expect(layout.base?.member.name).toBe("أحمد");
    expect(layout.trunkLabels.length).toBeGreaterThan(5);
    expect(layout.trunkLabels.length).toBeLessThanOrEqual(12);
    expect(layout.trunkZigzag).toBe(false);
    expect(layout.soil).not.toBeNull();
    expect(layout.soil!.count + layout.trunkLabels.length + 1).toBe(85);
    const text = layout.soil!.lines.map((l) => l.text).join(" ");
    expect(text).toContain("آدم عليه السلام");
    expect(text).toContain("يريم \uFD3Fذو رعين الأكبر\uFD3E");
    // generation numbering starts at the crown base
    expect(layout.generationOffset).toBe(84);
    // the taller base band is used, and the trunk outline matches it
    expect(layout.groundY).toBeCloseTo(layout.height * 0.79);
    expect(layout.trunkPath).toContain(`${(layout.groundY + layout.trunkWidth * 0.18).toFixed(1)}`);
    expect(layout.soil!.fontSize).toBeGreaterThanOrEqual(18);
  });

  it("grows brothers of trunk ancestors with descendants as side branches", () => {
    const layout = computePosterLayout(tree);
    const names = layout.nodes.map((n) => n.member.name);
    expect(names).toEqual(expect.arrayContaining(["عوض", "حسين", "فرج"]));
    expect(layout.stats.unplaced).toBe(0);
  });

  for (const nodeShape of ["leaf", "circle", "oval"] as const) {
    it(`keeps ${nodeShape} nodes overlap-free, including trunk obstacles`, () => {
      const layout = computePosterLayout(tree, { nodeShape, labelMode: "withFather", showYears: true });
      const all = [...layout.nodes, ...layout.stubs, ...(layout.base ? [layout.base] : [])];
      for (let i = 0; i < all.length; i++)
        for (let j = i + 1; j < all.length; j++) expect(overlaps(all[i], all[j])).toBe(false);
      for (const n of layout.nodes) for (const l of layout.trunkLabels) {
        const box = { ...n, x: l.x, y: l.y, w: Math.max(l.w, layout.trunkWidth * 0.9), h: l.h } as PosterNode;
        expect(overlaps(n, box)).toBe(false);
      }
    });
  }

  it("labels with the father's name when asked", () => {
    const layout = computePosterLayout(tree, { labelMode: "withFather" });
    expect(layout.nodes.some((n) => n.label === "عمر بن محمد")).toBe(true);
  });

  it("falls back to automatic when the crown base is cleared", () => {
    const layout = computePosterLayout({ ...tree, crownBaseId: null });
    // automatic mode stops at the first real fork (the side lineage's father)
    expect(layout.base).not.toBeNull();
    expect(layout.nodes.length).toBeGreaterThan(5);
  });
});

describe("three tiers with an explicit trunk start (Al-Kalali)", () => {
  const tree = kalaliSample();

  it("puts عبد كلال الأصغر … سالم on a zigzag trunk and آدم … نصر in the soil", () => {
    const layout = computePosterLayout(tree);
    expect(layout.base?.member.name).toBe("محمد");
    expect(layout.trunkLabels[0].member.name).toBe("عبد كلال الأصغر");
    expect(layout.trunkLabels.at(-1)!.member.name).toBe("سالم");
    expect(layout.trunkLabels.length).toBe(34);
    expect(layout.trunkZigzag).toBe(true);
    expect(layout.trunkLabels[0].fontSize).toBeGreaterThanOrEqual(18);
    const text = layout.soil!.lines.map((l) => l.text).join(" ");
    expect(text.startsWith("عبد كلال الأصغر بن نصر")).toBe(true);
    expect(text.endsWith("آدم عليه السلام")).toBe(true);
    expect(layout.soil!.count).toBe(47);
  });

  it("never overlaps trunk medallions", () => {
    const l = computePosterLayout(tree).trunkLabels;
    for (let i = 0; i < l.length; i++)
      for (let j = i + 1; j < l.length; j++) {
        const overlap = Math.abs(l[i].x - l[j].x) < (l[i].w + l[j].w) / 2 && Math.abs(l[i].y - l[j].y) < (l[i].h + l[j].h) / 2;
        expect(overlap, `${l[i].label} / ${l[j].label}`).toBe(false);
      }
  });

  it("uses a custom soil inscription when provided", () => {
    const layout = computePosterLayout({ ...tree, soilText: "نسب منقول من المشجرة الأصلية" });
    expect(layout.soil!.custom).toBe(true);
    expect(layout.soil!.lines.map((l) => l.text).join(" ")).toBe("نسب منقول من المشجرة الأصلية");
  });
});
