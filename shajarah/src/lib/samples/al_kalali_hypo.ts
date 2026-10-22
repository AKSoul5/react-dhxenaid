import { computeGenerations } from "../genealogy";
import type { MemberDTO, TreeDTO } from "../types";

export function generateHypotheticalTree(): TreeDTO {
  const members: MemberDTO[] = [];
  let counter = 0;

  const add = (name: string, fatherId: string | null, order: number) => {
    const m: MemberDTO = {
      id: `h-${++counter}`, name, laqab: null, gender: "MALE", birthYear: null, deathYear: null,
      isDeceased: false, birthOrder: order, generation: 0, notes: null, fatherId, motherId: null,
    };
    members.push(m);
    return m;
  };

  // ── 1. The Soil (Ancient Lineage below the trunk start) ──
  let ancient = add("آدم", null, 0);
  const ancients = ["شيث", "أنوش", "قينان", "مهلائيل", "يرد", "أخنوخ", "متوشلخ", "لامك", "نوح", "سام", "أرفخشذ", "شالخ", "عابر", "قحطان", "يعرب", "يشجب", "سبأ", "حمير", "الهميسع", "أيمن", "زهير", "عريب", "قطن", "الغوث", "وائل", "عبد شمس", "جشم", "معاوية", "قيس", "عمرو", "سهل", "زيد الجمهور", "يريم", "حجر", "غيدان", "مالك", "الحارث", "ذي حرث", "مثوب", "زيد", "فهد", "عريب", "عبد كلال", "سهل", "نصر"];
  for (const name of ancients) {
    ancient = add(name, ancient.id, 0);
  }

  // ── 2. The Trunk (From the trunk start down to the root) ──
  // `نصر` is the boundary. Everything above (نصر and older) goes to soil.
  const nassar = ancient;
  const abdKalal = add("عبد كلال", nassar.id, 0); // Trunk Start
  const harith = add("الحارث", abdKalal.id, 0);
  const asad = add("أسعد", harith.id, 0);
  const salem = add("سالم", asad.id, 0); // Root

  // ── 3. The Canopy (Descendants and Side Branches) ──
  // We build a wide tree by giving the root several sons.
  const sonsOfSalem = [
    add("مبارك", salem.id, 0),
    add("عمر", salem.id, 1),
    add("فضل", salem.id, 2),
  ];

  // Branch 1: Mubarak (Large side branch)
  const muhammad1 = add("محمد", sonsOfSalem[0].id, 0);
  const abdullah1 = add("عبدالله", muhammad1.id, 0);
  const abdulrahman = add("عبدالرحمن", abdullah1.id, 0);
  add("محمد", abdulrahman.id, 0);
  add("إبراهيم", abdulrahman.id, 1);
  add("أسعد", abdullah1.id, 1);
  add("زكريا", abdullah1.id, 2);
  add("يحيى", abdullah1.id, 3);

  // Branch 2: Omar (The direct line to you)
  const salem2 = add("سالم", sonsOfSalem[1].id, 0);
  const ahmad1 = add("أحمد", salem2.id, 0);
  const ali = add("علي", ahmad1.id, 0);
  const muhammad2 = add("محمد", ali.id, 0);
  const mubarak2 = add("مبارك", muhammad2.id, 0);
  const salem3 = add("سالم", mubarak2.id, 0);
  const muhammad3 = add("محمد", salem3.id, 0);
  const ahmad2 = add("أحمد", muhammad3.id, 0); // Canopy Base (Great-Grandfather)

  // Your Great-Grandfather's children (You and your cousins)
  const nawfal = add("نوفل", ahmad2.id, 0);
  const saud = add("سعود", ahmad2.id, 1);
  const fahd = add("فهد", ahmad2.id, 2);
  const khaled = add("خالد", ahmad2.id, 3);

  // You and your generation
  add("أحمد", nawfal.id, 0); // YOU
  add("عبدالله", nawfal.id, 1); // Your brother

  // Cousins (Children of Saud, Fahd, Khaled)
  add("محمد", saud.id, 0);
  add("عبدالعزيز", saud.id, 1);
  add("عمر", fahd.id, 0);
  add("سالم", fahd.id, 1);
  add("تركي", khaled.id, 0);
  add("بدر", khaled.id, 1);

  // Branch 3: Fadl (Another large side branch)
  const aqeel = add("عقيل", sonsOfSalem[2].id, 0);
  const rajab = add("رجب", aqeel.id, 0);
  const fadl2 = add("فضل", rajab.id, 0);
  add("عقيل", fadl2.id, 0);
  add("حسن", fadl2.id, 1);
  add("حسين", fadl2.id, 2);

  // Calculate generations
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;

  return {
    id: "al-kalali-hypo",
    name: "عائلة الكلالي",
    title: "شجرة عائلة الكلالي",
    subtitle: "فرع سالم بن أسعد",
    lineage: "PATRILINEAL",
    rootMemberId: null,
    crownBaseId: ahmad2.id, // Canopy starts at your Great-Grandfather
    trunkStartId: abdKalal.id, // Trunk starts at عبد كلال. Everything older goes to soil.
    soilText: null,
    // FIXED: We are using just the names, NOT the father's name, to keep the tree compact.
    settings: { showFemales: false, seed: 7, theme: { labelMode: "name" } },
    members,
    marriages: [],
    sources: [],
    citations: [],
    media: [],
  };
}
