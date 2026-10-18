// Relationship clarity: can a reader reliably trace who descends from whom?
import { describe, expect, it } from "vitest";
import { computePosterLayout, type Edge, type PosterLayout, type PosterNode } from "@/lib/layout/botanical";
import { validateRelationships } from "@/lib/layout/clarity";
import { lineagePath } from "@/lib/genealogy";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliTree } from "@/lib/samples/kalali";
import { denseFamily, marriagesFamily, multiMarriageFamily, namesFamily, smallFamily } from "@/lib/samples/fixtures";
import { LINEAGE_COLORS, contrast, layoutOptionsFor, resolveTheme } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

const layoutOf = (tree: TreeDTO, paper: "A3" | "A2" | "A1" | "A0" | "2A0" = "A2") =>
  computePosterLayout(tree, { ...layoutOptionsFor(resolveTheme(tree.settings), paper), showFemales: tree.settings?.showFemales });

// ── the validator itself, on hand-made drawings ──────────────────────────
const member = (id: string, fatherId: string | null): MemberDTO => ({
  id, name: id, laqab: null, gender: "MALE", birthYear: null, deathYear: null, isDeceased: false,
  birthOrder: 0, generation: 0, notes: null, fatherId, motherId: null,
});
const tree: TreeDTO = {
  id: "t", name: "t", title: null, subtitle: null, lineage: "PATRILINEAL", rootMemberId: "P",
  crownBaseId: null, trunkStartId: null, soilText: null, settings: null, marriages: [], sources: [], citations: [], media: [],
  members: [member("P", null), member("A", "P"), member("B", "P"), member("A1", "A"), member("B1", "B")],
};
const node = (id: string, x: number, y: number, parentId: string | null): PosterNode => ({
  id, member: tree.members.find((m) => m.id === id)!, x, y, depth: 1, generation: 0, w: 60, h: 24, fontSize: 16,
  shape: "pill", label: id, subLabel: null, terminal: false, angle: 0, leafLength: 0, leafWidth: 0, leafCount: 1, parentId,
});
const line = (parentId: string, childId: string, a: { x: number; y: number }, b: { x: number; y: number }): Edge => ({
  parentId, childId, w0: 4, w1: 3,
  points: Array.from({ length: 17 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 16, y: a.y + ((b.y - a.y) * i) / 16 })),
});
const drawing = (nodes: PosterNode[], edges: Edge[]) =>
  ({ nodes, stubs: [], base: null, trunkLabels: [], edges, origin: { x: 500, y: 900 }, trunkWidth: 40 }) as unknown as PosterLayout;

describe("relationship-clarity validator", () => {
  const P = node("P", 500, 800, null);
  const A = node("A", 300, 500, "P"), B = node("B", 700, 500, "P");
  const A1 = node("A1", 250, 200, "A"), B1 = node("B1", 750, 200, "B");
  const good = [line("P", "A", P, A), line("P", "B", P, B), line("A", "A1", A, A1), line("B", "B1", B, B1)];

  it("accepts a clean drawing", () => {
    const r = validateRelationships(drawing([P, A, B, A1, B1], good), tree);
    expect(r.issues).toEqual([]);
    expect(r.ok).toBe(true);
    expect(r.expected).toBe(4);
  });

  it("finds a missing connection and one drawn from the wrong parent", () => {
    const r = validateRelationships(drawing([P, A, B, A1, B1], [good[0], good[1], good[2], line("A", "B1", A, B1)]), tree);
    expect(r.issues.some((i) => i.kind === "missing" && i.edge?.[1] === "B1" && !i.detail)).toBe(true);
    expect(r.issues.some((i) => i.detail === "drawn from the wrong parent")).toBe(true);
  });

  it("finds a line that stops short of its child", () => {
    const short = line("B", "B1", B, { x: 740, y: 300 });
    const r = validateRelationships(drawing([P, A, B, A1, B1], [...good.slice(0, 3), short]), tree);
    expect(r.issues.some((i) => i.kind === "misattached" && i.detail === "end")).toBe(true);
  });

  it("finds a line passing under an unrelated name", () => {
    const inTheWay = node("B1", 500, 350, "B"); // B1 sits on the line A → A1 if A1 is far right
    const r = validateRelationships(drawing([P, A, B, node("A1", 700, 200, "A"), inTheWay],
      [good[0], good[1], line("A", "A1", A, { x: 700, y: 200 }), line("B", "B1", B, inTheWay)]), tree);
    expect(r.issues.some((i) => i.kind === "occlusion" && i.other === "B1")).toBe(true);
  });

  it("allows a clear crossing but flags a shallow one", () => {
    // A → A1 and B → B1 swap sides: they cross steeply in the middle
    const steep = validateRelationships(drawing([P, A, B, node("A1", 750, 200, "A"), node("B1", 250, 200, "B")],
      [good[0], good[1], line("A", "A1", A, { x: 750, y: 200 }), line("B", "B1", B, { x: 250, y: 200 })]), tree);
    expect(steep.clearCrossings).toBe(1);
    expect(steep.issues.filter((i) => i.kind === "crossing")).toEqual([]);
    // nearly parallel lines crossing at a few degrees
    const A2 = node("A", 480, 500, "P"), B2 = node("B", 520, 500, "P");
    const shallow = validateRelationships(drawing([P, A2, B2, node("A1", 540, 100, "A"), node("B1", 460, 100, "B")],
      [line("P", "A", P, A2), line("P", "B", P, B2), line("A", "A1", A2, { x: 540, y: 100 }), line("B", "B1", B2, { x: 460, y: 100 })]), tree);
    expect(shallow.issues.some((i) => i.kind === "crossing")).toBe(true);
  });

  it("finds two lines running together", () => {
    const A3 = node("A", 300, 500, "P"), B3 = node("B", 300, 560, "P");
    const r = validateRelationships(drawing([P, A3, B3, node("A1", 300, 100, "A"), node("B1", 302, 60, "B")],
      [line("P", "A", P, A3), line("P", "B", P, B3), line("A", "A1", { x: 300, y: 500 }, { x: 300, y: 100 }), line("B", "B1", { x: 302, y: 560 }, { x: 302, y: 60 })]), tree);
    expect(r.issues.some((i) => i.kind === "merge" || i.kind === "occlusion")).toBe(true);
  });
});

// ── the real layouts ─────────────────────────────────────────────────────
describe("relationship clarity of the poster layouts", () => {
  const clean: [string, TreeDTO, "A2" | "A1" | "A0"][] = [
    ["dense branches (220)", denseFamily(), "A1"],
    ["small family", smallFamily(), "A2"],
    ["Al-Kalali chain", kalaliTree(), "A2"],
    ["several marriages", marriagesFamily(), "A2"],
    ["names and honorifics", namesFamily(), "A2"],
    ["three wives, interleaved half-siblings", multiMarriageFamily(), "A2"],
    ["large family (195)", generateSampleTree(), "A1"],
  ];
  for (const [name, tree, paper] of clean) {
    it(`${name}: every connection drawn, attached and unambiguous on ${paper}`, () => {
      const l = layoutOf(tree, paper);
      const r = validateRelationships(l, tree);
      expect(r.issues).toEqual([]);
      expect(r.drawn).toBe(r.expected);
      expect(l.clarity.ok).toBe(true);
      expect(l.legibility.ok).toBe(true);
    });
  }

  it("the large family on A2: clean only below the legible size, so A2 is flagged", () => {
    const l = layoutOf(generateSampleTree(), "A2");
    // never both: an ambiguity-free poster that claims legible text it does not have
    expect(l.clarity.ok && l.legibility.ok).toBe(false);
  });

  it("dense branches: ambiguities are reported, located, and fall with a larger poster", () => {
    const tree = denseFamily();
    const a2 = layoutOf(tree, "A2");
    const a0 = layoutOf(tree, "A0");
    for (const l of [a2, a0]) {
      expect(l.clarity.ok).toBe(l.clarity.issues.length === 0);
      for (const i of l.clarity.issues) if (i.kind !== "missing" && i.kind !== "trunk-order") expect(i.at).toBeDefined();
      // every relationship is still drawn, from the right parent, to the right child
      expect(l.clarity.issues.filter((i) => i.kind === "missing" || i.kind === "misattached")).toEqual([]);
    }
    expect(a0.clarity.issues.length).toBeLessThanOrEqual(3);
  });

  it("connections derive from the data: the same family with shuffled member order draws the same edges", () => {
    const tree = multiMarriageFamily();
    const shuffled = { ...tree, members: [...tree.members].reverse() };
    const key = (l: PosterLayout) => l.edges.map((e) => `${e.parentId}>${e.childId}`).sort();
    expect(key(layoutOf(shuffled))).toEqual(key(layoutOf(tree)));
  });
});

describe("lineage tracing", () => {
  it("a person's line is their ancestors and descendants only, never half-siblings or cousins", () => {
    const tree = multiMarriageFamily();
    const root = tree.members[0];
    const son = tree.members.find((m) => m.fatherId === root.id && m.gender === "MALE")!;
    const { ancestors, descendants } = lineagePath(tree.members, tree.lineage, son.id);
    expect(ancestors).toEqual([root.id]);
    const isDescendant = (id: string): boolean => {
      const m = tree.members.find((x) => x.id === id)!;
      return m.fatherId === son.id || (!!m.fatherId && isDescendant(m.fatherId));
    };
    expect(descendants.length).toBeGreaterThan(0);
    for (const d of descendants) expect(isDescendant(d)).toBe(true);
    const halfSiblings = tree.members.filter((m) => m.fatherId === root.id && m.id !== son.id).map((m) => m.id);
    for (const h of halfSiblings) expect(descendants).not.toContain(h);
  });

  it("every traced connection exists in the drawing (path is drawn end to end)", () => {
    const tree = multiMarriageFamily();
    const l = layoutOf(tree);
    const leaf = l.nodes.find((n) => n.depth >= 3)!;
    const { ancestors } = lineagePath(tree.members, tree.lineage, leaf.id);
    const onLine = new Set([leaf.id, ...ancestors]);
    const drawn = l.edges.filter((e) => onLine.has(e.parentId) && onLine.has(e.childId));
    // one connection per generation step inside the canopy (base → … → leaf)
    expect(drawn.length).toBe(leaf.depth);
  });
});

describe("lineage colours", () => {
  it("are dark enough to read as lines on the ivory paper, and distinct", () => {
    for (const c of LINEAGE_COLORS) expect(contrast(c, "#f7f1e3")).toBeGreaterThanOrEqual(3);
    expect(new Set(LINEAGE_COLORS).size).toBe(LINEAGE_COLORS.length);
  });

  for (const [name, tree] of [["several marriages", multiMarriageFamily()], ["large", generateSampleTree()], ["dense", denseFamily()]] as const) {
    it(`${name}: colour follows the genealogy (every line and descendant carries its branch head's lineage)`, () => {
      const l = layoutOf(tree, "A1");
      const byId = new Map(l.nodes.map((n) => [n.id, n]));
      for (const e of l.edges) {
        const child = byId.get(e.childId);
        if (child) expect(e.lineage ?? null).toBe(child.lineage ?? null);
      }
      for (const n of l.nodes) {
        // walk up to the branch head (depth 1): same lineage all the way
        let cur = n;
        while (cur.depth > 1 && byId.get(cur.parentId ?? "")) {
          const parent = byId.get(cur.parentId!)!;
          expect(parent.lineage ?? null).toBe(cur.lineage ?? null);
          cur = parent;
        }
      }
      // branch heads next to each other around the canopy never share a colour
      const heads = l.nodes.filter((n) => n.depth === 1 && n.lineage != null)
        .sort((a, b) => (a.lineage ?? 0) - (b.lineage ?? 0));
      for (let i = 1; i < heads.length; i++) {
        expect(LINEAGE_COLORS[heads[i].lineage! % LINEAGE_COLORS.length]).not.toBe(LINEAGE_COLORS[heads[i - 1].lineage! % LINEAGE_COLORS.length]);
      }
    });
  }
});
