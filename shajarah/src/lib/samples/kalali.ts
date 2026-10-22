import { computeGenerations } from "../genealogy";
import { parseNasab } from "../nasab";
import type { MemberDTO, TreeDTO } from "../types";

// The Al-Kalali nasab as supplied by the family (newest first).
export const KALALI_NASAB =
  "أحمد بن نوفل بن أحمد بن محمد بن سالم بن مبارك بن محمد بن علي بن محمد بن سالم بن عمر بن محمد بن سالم بن عمر بن فضل بن عقيل بن رجب بن فضل بن عقيل بن شعلان بن أحمد بن أسعد بن اسحاق بن أبو بكر بن عبدالله بن عبدالرحمن بن محمد بن ابراهيم بن عبدالله بن محمد بن أسعد بن زكريا بن يحيى بن محمد بن أسعد بن عبدالله بن الحارث بن عبد كلال الأصغر بن نصر بن سهل بن عريب بن عبد كلال الأوسط بن عريب بن فهد بن زيد بن مثوب بن ذي حرث بن الحارث بن مالك بن غيدان بن حجر بن يريم (ذو رعين الأكبر) بن زيد الجمهور بن سهل بن عمرو بن قيس بن معاوية بن جشم بن عبد شمس بن وائل بن الغوث بن قطن بن عريب بن زهير بن أيمن بن الهميسع بن حمير بن سبأ بن يشجب بن يعرب بن قحطان بن عابر بن شالخ بن أرفخشذ بن سام بن نوح بن لامك بن متوشلخ بن أخنوخ بن يرد بن مهلائيل بن قينان بن أنوش بن شيث بن آدم عليه السلام.";

/** The Al-Kalali lineage as a tree (one chain from آدم to أحمد; add descendants in the editor). */
export function kalaliTree(): TreeDTO {
  const { entries } = parseNasab(KALALI_NASAB);
  const members: MemberDTO[] = [];
  let parent: string | null = null;
  for (const [i, e] of entries.entries()) {
    const m: MemberDTO = {
      id: `kalali-${i}`, name: e.name, laqab: e.laqab, gender: "MALE", birthYear: null,
      deathYear: null, isDeceased: false, birthOrder: 0, generation: 0, notes: null,
      fatherId: parent, motherId: null,
    };
    members.push(m);
    parent = m.id;
  }
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  // Three tiers: soil = آدم … نصر, trunk = عبد كلال الأصغر (the family's
  // namesake, hence الكلالي) … سالم,
  // canopy = Sheikh محمد بن سالم بن مبارك and his descendants.
  const byNasab = (...names: string[]) =>
    members.find((m) => {
      let cur: MemberDTO | undefined = m;
      for (const n of names) {
        if (!cur || cur.name !== n) return false;
        cur = members.find((x) => x.id === cur!.fatherId);
      }
      return true;
    })?.id ?? null;
  return {
    id: "kalali", name: "الكلالي", title: "شجرة عائلة الكلالي", subtitle: "من آل عبد كلال",
    lineage: "PATRILINEAL", rootMemberId: members[0].id,
    crownBaseId: byNasab("محمد", "سالم", "مبارك"),
    trunkStartId: byNasab("عبد كلال الأصغر", "نصر"),
    soilText: null,
    settings: { showFemales: true, seed: 7, theme: {} }, members, marriages: [], sources: [], citations: [], media: [],
  };
}

const FILL_SONS = [
  "عبدالله", "عبدالرحمن", "صالح", "ناصر", "سعد", "حمد", "خالد", "عبدالعزيز", "يوسف", "إبراهيم",
  "حسن", "حسين", "عثمان", "سليمان", "منصور", "راشد", "فهد", "سلطان", "ماجد", "عبدالكريم",
];
const FILL_DAUGHTERS = ["فاطمة", "عائشة", "مريم", "نورة", "سارة", "هند", "خديجة", "لطيفة"];

/** Deterministic random numbers for test data (mulberry32). */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * How many children a man has, by his generation below the canopy base
 * (1 = the base's sons), the way real families thin out: 4–6 sons and
 * daughters for the founder, 2–4 for his children, 1–3 for grandchildren,
 * then 0–2, with many lines ending.
 */
const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function childrenAt(d: number, rand: () => number): number {
  const between = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  if (d === 0) return between(4, 6);
  if (d === 1) return between(2, 4);
  if (d === 2) return between(1, 3);
  const r = rand();
  return r < 0.38 ? 0 : r < 0.78 ? 1 : 2;
}

export interface RealisticOptions {
  seed?: number;
  /** Generations below the canopy base. */
  generations?: number;
  /** About how many descendants the canopy base has. */
  size?: number;
  /** Keep the real line under the canopy base (to أحمد بن نوفل), each with invented brothers and cousins. */
  keepLine?: boolean;
}

/**
 * Test data on the real lineage: the trunk from شعلان down four names to
 * عقيل, the canopy from his son فضل, and invented descendants with a
 * natural family's shape (see childrenAt). Daughters (about one child in
 * five) are drawn; their children belong to their husbands' families.
 *
 * Balanced, as families mostly are: each man passes his share of the
 * family's size on to his sons about evenly (±25%), so no one branch
 * explodes into a hundred people while its brothers have two.
 */
export function kalaliRealisticTree({ seed = 1, generations = 7, size = 150, keepLine = false }: RealisticOptions = {}): TreeDTO {
  const tree = kalaliTree();
  // the direct line from شعلان down to أحمد بن نوفل (the chain runs oldest first)
  const line = tree.members.slice(tree.members.findIndex((m) => m.name === "شعلان"));
  const trunkStart = line[0]; // شعلان
  const crownBase = line[5]; // فضل, son of the fourth name down (عقيل)
  const realBelow = line.slice(6);
  const lineIds = new Set(keepLine ? realBelow.map((m) => m.id) : []);
  const members = tree.members.filter((m) => !realBelow.includes(m) || lineIds.has(m.id));
  const rand = seeded(seed);
  let n = 0;
  /** `budget`: about how many descendants this man has. */
  const grow = (father: MemberDTO, d: number, budget: number) => {
    if (d >= generations) return;
    const heir = keepLine ? realBelow[d] : undefined;
    const isLine = !!heir && heir.fatherId === father.id;
    if (budget < 1 && !isLine) return;
    // the family's shape, within what this man's share of the family allows
    const most = Math.max(1, Math.floor(budget));
    const count = clampInt(childrenAt(d, rand), isLine || budget >= 4 ? 1 : 0, most);
    const used = new Set<string>(isLine ? [heir!.name] : []);
    const kids: MemberDTO[] = isLine ? [heir!] : [];
    for (let i = kids.length; i < count; i++) {
      // at least one son while there is a share to pass on
      const daughter = rand() < 0.2 && (i > 0 || budget <= count);
      const pool = daughter ? FILL_DAUGHTERS : FILL_SONS;
      let name = pool[Math.floor(rand() * pool.length)];
      for (let k = 0; used.has(name) && k < pool.length; k++) name = pool[(pool.indexOf(name) + 1) % pool.length];
      used.add(name);
      kids.push({
        id: `kalali-gen-${d}-${n++}`, name, laqab: null, gender: daughter ? "FEMALE" : "MALE", birthYear: null, deathYear: null,
        isDeceased: false, birthOrder: 0, generation: 0, notes: null, fatherId: father.id, motherId: null,
      });
    }
    // the line's heir among his brothers, not always the eldest
    if (isLine && kids.length > 1) kids.splice(Math.floor(rand() * kids.length), 0, kids.shift()!);
    kids.forEach((k, i) => {
      k.birthOrder = i;
      if (!lineIds.has(k.id)) members.push(k);
    });
    // the rest of his share goes to his sons, about evenly
    const sons = kids.filter((k) => k.gender === "MALE");
    const jitter = sons.map(() => 0.75 + rand() * 0.5);
    const sum = jitter.reduce((a, b) => a + b, 0) || 1;
    const rest = Math.max(0, budget - kids.length);
    sons.forEach((k, i) => grow(k, d + 1, (rest * jitter[i]) / sum));
  };
  grow(crownBase, 0, size);
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    ...tree,
    id: keepLine ? "kalali-filled" : "kalali-realistic",
    subtitle: "من آل عبد كلال — فروع تجريبية للاختبار",
    trunkStartId: trunkStart.id,
    crownBaseId: crownBase.id,
    settings: { ...tree.settings, showFemales: true },
    members,
  };
}

/** A natural, balanced family of about 150 under فضل: of the first 100 seeds, the one closest to 150. */
export function kalaliRealistic150(): TreeDTO {
  const canopyOf = (t: TreeDTO) => {
    const base = t.members.find((m) => m.id === t.crownBaseId)!;
    return t.members.filter((m) => m.generation > base.generation).length;
  };
  // (lines end on their own, so a family asked for ~260 has about 150)
  let best: TreeDTO | null = null, bestOff = Infinity;
  for (let seed = 1; seed <= 100 && bestOff > 0; seed++) {
    const t = kalaliRealisticTree({ seed, size: 260 });
    const off = Math.abs(canopyOf(t) - 150);
    if (off < bestOff) [best, bestOff] = [t, off];
  }
  return best!;
}

/** The real line down to أحمد بن نوفل, with invented relatives in a natural family's shape. */
export function kalaliFilledTree(seed = 3): TreeDTO {
  return kalaliRealisticTree({ seed, generations: 14, size: 120, keepLine: true });
}
