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
    settings: { showFemales: true, seed: 7, theme: {} }, members, marriages: [],
  };
}
