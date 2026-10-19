// Every theme sets a family's names at about the same size, with the trunk
// in proportion to the canopy. (A family with a 12-name trunk once had its
// canopy names at a fifth of their size in one theme and two fifths in the
// next, under trunk names two to five times as large.)
import { describe, expect, it } from "vitest";
import { computeGenerations } from "@/lib/genealogy";
import { computePosterLayout } from "@/lib/layout/botanical";
import { mulberry32 } from "@/lib/layout/random";
import { kalaliTree } from "@/lib/samples/kalali";
import { layoutOptionsFor, resolveTheme, THEME_PRESETS } from "@/lib/theme";
import type { MemberDTO, TreeDTO } from "@/lib/types";

/** The Al-Kalali line with its trunk from عقيل (12 names) and ~115 descendants under the canopy base محمد. */
function trunkHeavyFamily(): TreeDTO {
  const base = kalaliTree();
  const members: MemberDTO[] = base.members.slice(0, 82).map((m) => ({ ...m }));
  const rand = mulberry32(4);
  const SONS = ["أحمد", "حامد", "عبدالمعين", "أسعد", "عمر", "باسل", "نوفل", "ظافر", "خالد", "محمد", "عبدالرحمن", "حسام", "طلال", "نايف"];
  const DAUGHTERS = ["منال", "لبنى", "مي", "رواء", "هالة", "نور", "ريم", "دعاء", "هدى", "منى", "سارة", "لولوة"];
  let n = 0;
  const grow = (fatherId: string, d: number) => {
    if (n > 112 || d > 3) return;
    const k = d === 0 ? 6 : d === 1 ? 3 + Math.floor(rand() * 5) : d === 2 ? Math.floor(rand() * 6) : Math.floor(rand() * 3);
    for (let i = 0; i < k && n <= 112; i++) {
      const female = rand() < 0.4;
      const pool = female ? DAUGHTERS : SONS;
      const m: MemberDTO = {
        ...members[0], id: `d${n++}`, name: pool[Math.floor(rand() * pool.length)], gender: female ? "FEMALE" : "MALE",
        fatherId, motherId: null, birthOrder: i, laqab: null,
      };
      members.push(m);
      if (!female) grow(m.id, d + 1);
    }
  };
  grow(members[81].id, 0);
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return { ...base, members, trunkStartId: members[69].id, crownBaseId: members[81].id, settings: { showFemales: true } };
}

describe("names across the themes", () => {
  const tree = trunkHeavyFamily();
  const medians = new Map<string, number>();
  for (const preset of Object.keys(THEME_PRESETS)) {
    it(`${preset}: clean, and the trunk's names in proportion to the canopy's`, () => {
      const settings = { ...tree.settings, theme: { preset } } as TreeDTO["settings"];
      const l = computePosterLayout({ ...tree, settings }, layoutOptionsFor(resolveTheme(settings), "2A0"));
      expect(l.clarity.issues).toEqual([]);
      expect(l.overlaps).toBe(0);
      expect(l.trunkLabels).toHaveLength(12);
      const sizes = l.nodes.map((x) => x.fontSize).sort((a, b) => a - b);
      const median = sizes[Math.floor(sizes.length / 2)];
      medians.set(preset, median);
      expect(Math.max(...l.trunkLabels.map((t) => t.fontSize)) / median).toBeLessThan(1.6);
    }, 60_000);
  }
  it("about the same size in every theme", () => {
    const all = [...medians.values()];
    expect(all).toHaveLength(Object.keys(THEME_PRESETS).length);
    expect(Math.max(...all) / Math.min(...all)).toBeLessThan(1.5);
  });
});
