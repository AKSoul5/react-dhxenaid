import { describe, expect, it } from "vitest";
import { computePosterLayout } from "@/lib/layout/botanical";
import { computeGenerations, parentAssignmentError } from "@/lib/genealogy";
import { layoutOptionsFor, resolveTheme } from "@/lib/theme";
import { nouriFamily } from "@/lib/samples/nouri";
import type { MemberDTO, TreeDTO } from "@/lib/types";

// The Al-Nouri Family — Layout Stress Test, written down independently of
// the fixture: every blood descendant as the path of names from Ibrahim.
const FOUNDER = "Ibrahim Al-Nouri";
const LINES = [
  "Khalid", "Khalid/Abdullah", "Khalid/Abdullah/Faisal", "Khalid/Abdullah/Nasser", "Khalid/Abdullah/Sara",
  "Khalid/Omar", "Khalid/Omar/Khalid", "Khalid/Maryam", "Khalid/Noura", "Khalid/Noura/Ibrahim", "Khalid/Noura/Layan", "Khalid/Zayd",
  "Rashid", "Rashid/Khalid", "Rashid/Khalid/Abdullah", "Rashid/Khalid/Omar", "Rashid/Khalid/Fatimah", "Rashid/Salma",
  "Amina", "Amina/Yusuf", "Amina/Yusuf/Khalid", "Amina/Yusuf/Mariam", "Amina/Rania", "Amina/Hamza", "Amina/Hamza/Abdullah", "Amina/Hamza/Noor",
  "Abdullah", "Abdullah/Yusuf", "Abdullah/Yusuf/Ibrahim", "Abdullah/Maryam", "Abdullah/Abdullah", "Abdullah/Abdullah/Sami", "Abdullah/Abdullah/Layla",
  "Layla", "Layla/Hamza", "Layla/Hamza/Omar", "Layla/Hamza/Rania", "Layla/Rania",
].map((l) => `${FOUNDER}/${l}`);
/** Spouses who married into the family, by their partner's line. */
const SPOUSES: Record<string, string[]> = {
  [FOUNDER]: ["Fatimah bint Hassan", "Mariam bint Saleh"],
  [`${FOUNDER}/Khalid`]: ["Huda"], [`${FOUNDER}/Rashid`]: ["Reem"], [`${FOUNDER}/Amina`]: ["Hassan"],
  [`${FOUNDER}/Abdullah`]: ["Dalia"], [`${FOUNDER}/Layla`]: ["Sami"],
};
const MOTHERS: Record<string, string> = {
  Khalid: "Fatimah bint Hassan", Rashid: "Fatimah bint Hassan", Amina: "Fatimah bint Hassan",
  Abdullah: "Mariam bint Saleh", Layla: "Mariam bint Saleh",
};

const tree = nouriFamily();
const byId = new Map(tree.members.map((m) => [m.id, m]));
const spouseIds = new Set(tree.marriages.flatMap((r) => [r.spouseAId, r.spouseBId]).filter((id) => byId.get(id)!.fatherId === null && byId.get(id)!.motherId === null && byId.get(id)!.name !== FOUNDER));
const blood = tree.members.filter((m) => !spouseIds.has(m.id));
/** The parent through whom a blood descendant descends from Ibrahim. */
const bloodParent = (m: MemberDTO) => [m.fatherId, m.motherId].map((id) => (id ? byId.get(id) : undefined)).find((p) => p && !spouseIds.has(p.id));
const pathOf = (m: MemberDTO): string => {
  const p = bloodParent(m);
  return p ? `${pathOf(p)}/${m.name}` : m.name;
};

describe("Al-Nouri family: genealogy", () => {
  it("has every person exactly once, with unique ids that are not names", () => {
    expect(tree.members).toHaveLength(1 + LINES.length + 7);
    expect(new Set(tree.members.map((m) => m.id)).size).toBe(tree.members.length);
    for (const m of tree.members) expect(m.id).not.toBe(m.name);
    expect(blood.map(pathOf).sort()).toEqual([FOUNDER, ...LINES].sort());
  });

  it("keeps repeated names as separate people", () => {
    const count = (name: string) => tree.members.filter((m) => m.name === name).length;
    // generation 2 (1), 3 (2) and 4 (2)
    expect(count("Abdullah")).toBe(5);
    expect(count("Khalid")).toBe(4);
    expect(count("Rania")).toBe(3);
    expect(count("Hamza")).toBe(2);
    expect(count("Yusuf")).toBe(2);
    expect(count("Omar")).toBe(3);
    expect(count("Maryam")).toBe(2);
  });

  it("records spouses as marriages, never as children", () => {
    expect(tree.marriages).toHaveLength(7);
    for (const [line, names] of Object.entries(SPOUSES)) {
      const partner = blood.find((m) => pathOf(m) === line)!;
      const partners = tree.marriages
        .filter((r) => r.spouseAId === partner.id || r.spouseBId === partner.id)
        .map((r) => byId.get(r.spouseAId === partner.id ? r.spouseBId : r.spouseAId)!.name);
      expect(partners.sort(), line).toEqual(names.sort());
    }
    for (const id of spouseIds) {
      const s = byId.get(id)!;
      expect(s.fatherId ?? s.motherId, s.name).toBeNull();
    }
  });

  it("gives each of Ibrahim's children the right mother", () => {
    const ibrahim = blood.find((m) => m.name === FOUNDER)!;
    const kids = tree.members.filter((m) => m.fatherId === ibrahim.id);
    expect(kids.map((k) => k.name)).toEqual(["Khalid", "Rashid", "Amina", "Abdullah", "Layla"]);
    for (const k of kids) expect(byId.get(k.motherId!)!.name, k.name).toBe(MOTHERS[k.name]);
  });

  it("has children of daughters with their husband as father, and no invented parents", () => {
    for (const daughter of ["Amina", "Layla"]) {
      const d = blood.find((m) => pathOf(m) === `${FOUNDER}/${daughter}`)!;
      // through the marriage: a grandson is also called Sami
      const marriage = tree.marriages.find((r) => r.spouseBId === d.id)!;
      const husband = byId.get(marriage.spouseAId)!;
      expect(husband.name).toBe(SPOUSES[`${FOUNDER}/${daughter}`][0]);
      for (const c of tree.members.filter((m) => m.motherId === d.id)) expect(c.fatherId).toBe(husband.id);
    }
    // Noura's husband is not given: her children have no father recorded
    const noura = blood.find((m) => pathOf(m) === `${FOUNDER}/Khalid/Noura`)!;
    for (const c of tree.members.filter((m) => m.motherId === noura.id)) expect(c.fatherId).toBeNull();
    // both parents are known only for Ibrahim's children (by Fatimah or
    // Mariam) and the grandchildren of the five recorded couples
    expect(tree.members.filter((m) => m.fatherId && m.motherId)).toHaveLength(5 + 5 + 2 + 3 + 3 + 2);
    for (const line of ["Khalid", "Rashid", "Abdullah"]) {
      const son = blood.find((m) => pathOf(m) === `${FOUNDER}/${line}`)!;
      const wife = byId.get(tree.marriages.find((r) => r.spouseAId === son.id)!.spouseBId)!;
      expect(wife.name).toBe(SPOUSES[`${FOUNDER}/${line}`][0]);
      for (const c of tree.members.filter((m) => m.fatherId === son.id)) expect(c.motherId, c.name).toBe(wife.id);
    }
  });

  it("has valid parent references and no cycles", () => {
    for (const m of tree.members) {
      if (m.fatherId) expect(parentAssignmentError(tree.members, m.id, m.fatherId, "father"), m.name).toBeNull();
      if (m.motherId) expect(parentAssignmentError(tree.members, m.id, m.motherId, "mother"), m.name).toBeNull();
    }
  });

  it("stores each person's generation by descent (spouses take their partner's)", () => {
    for (const m of blood) expect(m.generation, pathOf(m)).toBe(pathOf(m).split("/").length - 1);
  });

  it("app generations (by patrilineal line) put daughters' children in their fathers' lines", () => {
    // computeGenerations follows the father first, so Amina's and Layla's
    // children count from their fathers (spouses without parents): the
    // app's derived generation differs from the stored, true generation.
    const derived = computeGenerations(tree.members, tree.lineage);
    const differing = blood.filter((m) => derived.get(m.id) !== m.generation).map(pathOf).sort();
    expect(differing).toEqual(LINES.filter((l) => /\/(Amina|Layla)\//.test(l)).sort());
  });
});

// The poster: the botanical style at its defaults, all names shown.
const layout = (t: TreeDTO, paper: "A2" | "A1" | "A0") =>
  computePosterLayout(t, { ...layoutOptionsFor(resolveTheme(t.settings), paper), showFemales: true });

describe("Al-Nouri family: poster", () => {
  const l = layout(tree, "A2");
  const drawn = new Set([l.base, ...l.nodes, ...l.stubs].filter(Boolean).map((n) => n!.member.id));
  for (const t of l.trunkLabels) drawn.add(t.member.id);

  it("accounts for every person: drawn, or counted as not drawn", () => {
    expect(l.stats.total).toBe(tree.members.length);
    expect(l.stats.placed + l.stats.unplaced).toBe(tree.members.length);
    expect(drawn.size).toBe(l.stats.placed);
  });

  it("does not draw daughters' descendants (a patrilineal poster limitation)", () => {
    // Recorded as found, not as desired: Amina's and Layla's children
    // descend from Hassan and Sami, who have no parents in the tree, so the
    // poster (one patrilineal lineage) leaves them and their children out.
    // Spouses are not drawn either, by design.
    const missing = blood.filter((m) => !drawn.has(m.id)).map(pathOf).sort();
    expect(missing).toEqual(LINES.filter((p) => /\/(Amina|Layla)\//.test(p)).sort());
    expect([...spouseIds].filter((id) => drawn.has(id))).toEqual([]);
  });

  it("is clear and legible on A2", () => {
    expect(l.clarity.issues).toEqual([]);
    expect(l.overlaps).toBe(0);
    expect(l.tooDense).toBe(false);
    expect(l.legibility.ok).toBe(true);
  });
});
