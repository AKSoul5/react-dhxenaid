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

  // ── The Great-Great-Grandfather's Generation ──
  const salem = add("سالم", null, 0);

  // ── Branch 1: Mubarak -> Muhammad -> Abdullah (A large, spreading branch)
  const mubarak = add("مبارك", salem.id, 0);
  const muhammad1 = add("محمد", mubarak.id, 0);

  const abdullah1 = add("عبدالله", muhammad1.id, 0);
  const abdulrahman = add("عبدالرحمن", abdullah1.id, 0);
  add("محمد", abdulrahman.id, 0); // Duplicate: Muhammad
  add("إبراهيم", abdulrahman.id, 1);

  const asad1 = add("أسعد", abdullah1.id, 1);
  add("زكريا", asad1.id, 0);
  add("يحيى", asad1.id, 1);

  // ── Branch 2: Omar -> Salem -> Ahmad (The direct line)
  const omar1 = add("عمر", salem.id, 1);
  const salem2 = add("سالم", omar1.id, 0); // Duplicate: Salem
  const ahmad1 = add("أحمد", salem2.id, 0); // Duplicate: Ahmad

  const ali = add("علي", ahmad1.id, 0);
  const muhammad2 = add("محمد", ali.id, 0); // Duplicate: Muhammad
  const mubarak2 = add("مبارك", muhammad2.id, 0); // Duplicate: Mubarak

  // Your Great-Grandfather and Great-Great-Grandfather
  const salem3 = add("سالم", mubarak2.id, 0); // Duplicate: Salem
  const muhammad3 = add("محمد", salem3.id, 0); // Duplicate: Muhammad
  const ahmad2 = add("أحمد", muhammad3.id, 0); // Duplicate: Ahmad
  const nawfal = add("نوفل", ahmad2.id, 0);

  // YOU
  add("أحمد", nawfal.id, 0); // Duplicate: Ahmad

  // ── Branch 3: Fadl (A side branch)
  const fadl = add("فضل", salem.id, 2);
  const aqeel = add("عقيل", fadl.id, 0);
  const rajab = add("رجب", aqeel.id, 0);

  const fadl2 = add("فضل", rajab.id, 0); // Duplicate: Fadl
  add("عقيل", fadl2.id, 0); // Duplicate: Aqeel

  // Note: Laqab removed from عبد كلال
  const abdKalal = add("عبد كلال", aqeel.id, 1);
  add("نصر", abdKalal.id, 0);

  // Calculate generations
  const gens = computeGenerations(members, "PATRILINEAL");
  for (const m of members) m.generation = gens.get(m.id) ?? 0;

  return {
    id: "al-kalali-hypo",
    name: "عائلة الكلالي",
    title: "شجرة عائلة الكلالي",
    subtitle: "فرع سالم بن مبارك",
    lineage: "PATRILINEAL",
    rootMemberId: salem.id,
    crownBaseId: ahmad2.id, // Canopy starts at your Great-Grandfather
    trunkStartId: abdKalal.id, // The trunk starts way down at عبد كلال
    soilText: null,
    // We turn on "withFather" here to automatically resolve the duplicate names!
    // (labelMode is a poster style setting, so it lives in settings.theme)
    settings: { showFemales: false, seed: 7, theme: { labelMode: "withFather" } },
    members,
    marriages: [],
    sources: [],
    citations: [],
    media: [],
  };
}
