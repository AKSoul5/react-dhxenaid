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

/**
 * A test of a full canopy on the real lineage: the trunk from شعلان down
 * four names to عقيل, the canopy from his son فضل, and every generation
 * from there to أحمد بن نوفل filled to 6–7 people: the direct ancestor
 * plus invented brothers, cousins and an occasional daughter (test data).
 */
export function kalaliFilledTree(seed = 17): TreeDTO {
  const tree = kalaliTree();
  const byId = new Map(tree.members.map((m) => [m.id, m]));
  // the direct line from شعلان down to أحمد بن نوفل (the chain runs oldest first)
  const line = tree.members.slice(tree.members.findIndex((m) => m.name === "شعلان"));
  const trunkStart = line[0]; // شعلان
  const crownBase = line[5]; // فضل, son of the fourth name down (عقيل)
  const below = line.slice(6); // the direct line under the crown base, one per generation
  let state = seed >>> 0;
  const rand = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const members = [...tree.members];
  let prevGen: MemberDTO[] = [crownBase];
  let n = 0;
  below.forEach((direct, g) => {
    const size = 6 + Math.floor(rand() * 2); // 6 or 7 in this generation
    const fathers = prevGen.filter((m) => m.gender === "MALE");
    const gen: MemberDTO[] = [direct];
    const used = new Set([direct.name]);
    for (let i = 1; i < size; i++) {
      // sons of the line (and of earlier cousins), with now and then a daughter
      const father = i <= 2 ? byId.get(direct.fatherId!)! : fathers[Math.floor(rand() * fathers.length)];
      const daughter = rand() < 0.18 && i > 1;
      const pool = daughter ? FILL_DAUGHTERS : FILL_SONS;
      let name = pool[Math.floor(rand() * pool.length)];
      for (let k = 0; used.has(`${father.id}:${name}`) && k < pool.length; k++) name = pool[(pool.indexOf(name) + 1) % pool.length];
      used.add(`${father.id}:${name}`);
      const m: MemberDTO = {
        id: `kalali-fill-${g}-${n++}`, name, laqab: null, gender: daughter ? "FEMALE" : "MALE", birthYear: null, deathYear: null,
        isDeceased: false, birthOrder: 0, generation: 0, notes: null, fatherId: father.id, motherId: null,
      };
      gen.push(m);
      members.push(m);
      byId.set(m.id, m);
    }
    prevGen = gen;
  });
  // birth order: the direct ancestor among his brothers, others after
  const kids = new Map<string, MemberDTO[]>();
  for (const m of members) if (m.fatherId) kids.set(m.fatherId, [...(kids.get(m.fatherId) ?? []), m]);
  for (const list of kids.values()) list.forEach((m, i) => (m.birthOrder = i));
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;
  return {
    ...tree,
    id: "kalali-filled",
    subtitle: "من آل عبد كلال — فروع تجريبية للاختبار",
    trunkStartId: trunkStart.id,
    crownBaseId: crownBase.id,
    members,
  };
}
