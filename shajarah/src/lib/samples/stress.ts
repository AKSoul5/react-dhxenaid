// Large, dense families for stress tests: a father's line with many
// daughters, wives recorded as people (some men with two or three), and
// daughters married into other families with children and grandchildren
// of their own: the families a poster can show through them, on dotted
// lines. Some daughters remarried, with children from both husbands.
// Seeded, so a failing case can be rebuilt exactly.

import { computeGenerations } from "../genealogy";
import { mulberry32 } from "../layout/random";
import type { Gender, MarriageDTO, MemberDTO, TreeDTO } from "../types";

const SONS = [
  "محمد", "أحمد", "عبدالله", "عبدالرحمن", "علي", "حسن", "حسين", "عمر", "خالد", "سعد", "فهد", "سلطان", "ناصر", "فيصل",
  "تركي", "بدر", "مشعل", "سليمان", "يوسف", "إبراهيم", "صالح", "منصور", "راشد", "ماجد", "حمد", "عثمان", "عبدالعزيز", "سعود",
];
const DAUGHTERS = ["فاطمة", "عائشة", "مريم", "نورة", "سارة", "هند", "خديجة", "لطيفة", "ريم", "مها", "حصة", "منيرة", "الجوهرة", "العنود", "هيا", "لولوة"];
const FAMILIES = ["العتيبي", "القحطاني", "الدوسري", "الشمري", "المطيري", "الحربي", "الزهراني", "الغامدي", "السبيعي", "العنزي", "الشهري", "آل سعود"];

export interface StressOptions {
  /** People of the father's line (sons and daughters), about. */
  size?: number;
  seed?: number;
  /** Share of children who are daughters. */
  daughters?: number;
  /** Share of married daughters with a family of their own. */
  daughtersWithFamilies?: number;
  /** Share of fathers with two or three wives. */
  severalWives?: number;
  /** Share of daughters with families who remarried (children from two husbands). */
  remarried?: number;
}

export interface StressFamily {
  tree: TreeDTO;
  /** Daughters with children of their own (for settings.familiesThrough). */
  mothers: string[];
}

export function stressFamily(opts: StressOptions = {}): StressFamily {
  const { size = 300, seed = 1, daughters = 0.4, daughtersWithFamilies = 0.6, severalWives = 0.2, remarried = 0.12 } = opts;
  const rand = mulberry32(seed * 7919 + 13);
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];
  const members: MemberDTO[] = [];
  const marriages: MarriageDTO[] = [];
  let n = 0;
  const add = (name: string, gender: Gender, fatherId: string | null, motherId: string | null, order: number) => {
    const m: MemberDTO = {
      id: `st${seed}-${++n}`, name, laqab: null, gender, birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId,
    };
    members.push(m);
    return m;
  };
  const outsider = (gender: Gender) => add(`${pick(gender === "FEMALE" ? DAUGHTERS : SONS)} ${pick(FAMILIES)}`, gender, null, null, 0);
  const marry = (a: MemberDTO, b: MemberDTO) =>
    marriages.push({ id: `st${seed}-mar-${marriages.length + 1}`, spouseAId: a.gender === "MALE" ? a.id : b.id, spouseBId: a.gender === "MALE" ? b.id : a.id, startYear: null, endYear: null });
  const names = (count: number) => {
    const used = new Set<string>();
    return Array.from({ length: count }, (_, i) => {
      const female = i > 0 && rand() < daughters;
      const pool = female ? DAUGHTERS : SONS;
      let name = pick(pool);
      for (let k = 0; used.has(name) && k < pool.length; k++) name = pool[(pool.indexOf(name) + 1) % pool.length];
      used.add(name);
      return { name, gender: (female ? "FEMALE" : "MALE") as Gender };
    });
  };

  // ── the father's line: dense early generations, many lines ending later
  let line = 0;
  const mothers: string[] = [];
  const daughtersToMarry: MemberDTO[] = [];
  const visit = (father: MemberDTO, d: number, share: number) => {
    if (d >= 7 || share < 1 || line >= size) return;
    let count = d === 0 ? 9 : d === 1 ? between(3, 6) : d === 2 ? between(2, 5) : share >= 8 ? between(2, 4) : rand() < 0.3 ? 0 : between(1, 3);
    count = Math.min(count, Math.max(1, Math.floor(share)), size - line);
    if (!count) return;
    const wives = Array.from({ length: rand() < severalWives ? between(2, 3) : 1 }, () => outsider("FEMALE"));
    for (const w of wives) marry(father, w);
    // children by birth order; with several wives, the mothers alternate
    // in runs (a few by one, then the next)
    const run = between(1, 3);
    const kids = names(count).map((k, i) => add(k.name, k.gender, father.id, wives[Math.floor(i / run) % wives.length].id, i));
    line += kids.length;
    for (const k of kids) if (k.gender === "FEMALE") daughtersToMarry.push(k);
    const sons = kids.filter((k) => k.gender === "MALE");
    const jitter = sons.map(() => 0.6 + rand() * 0.8);
    const sum = jitter.reduce((a, b) => a + b, 0) || 1;
    const rest = Math.max(0, share - kids.length);
    sons.forEach((k, i) => visit(k, d + 1, (rest * jitter[i]) / sum));
  };
  const founder = add("عبدالله", "MALE", null, null, 0);
  line = 1;
  visit(founder, 0, size - 1);

  // ── daughters married into other families: children, and grandchildren
  const outsideKids = (father: MemberDTO, mother: MemberDTO, count: number, depth: number) => {
    names(count).forEach((k, i) => {
      const c = add(k.name, k.gender, father.id, mother.id, i);
      if (depth < 2 && k.gender === "MALE" && rand() < 0.45) {
        const wife = outsider("FEMALE");
        marry(c, wife);
        outsideKids(c, wife, between(1, 3), depth + 1);
      }
    });
  };
  for (const d of daughtersToMarry) {
    if (rand() >= daughtersWithFamilies) continue;
    const husband = outsider("MALE");
    marry(husband, d);
    outsideKids(husband, d, between(1, 4), 0);
    if (rand() < remarried) {
      const second = outsider("MALE");
      marry(second, d);
      outsideKids(second, d, between(1, 3), 0);
    }
    mothers.push(d.id);
  }

  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    mothers,
    tree: {
      id: `stress-${size}-${seed}`, name: "آل عبدالله", title: "شجرة آل عبدالله",
      subtitle: `أسرة تجريبية كثيفة (${line} من الذرية)`,
      lineage: "PATRILINEAL", rootMemberId: founder.id, crownBaseId: null, trunkStartId: null, soilText: null,
      settings: { showFemales: true, seed: 7, theme: {} },
      members, marriages, sources: [], citations: [], media: [],
    },
  };
}
