import { describe, expect, it } from "vitest";
import { nasab } from "@/lib/genealogy";
import { applyNasabLines, normalizeName, parseNasab, planNasabImport } from "@/lib/nasab";
import { KALALI_NASAB } from "@/lib/samples/kalali";
import type { MemberDTO } from "@/lib/types";

const m = (id: string, name: string, fatherId: string | null = null): MemberDTO => ({
  id, name, laqab: null, gender: "MALE", birthYear: null, deathYear: null, isDeceased: false,
  birthOrder: 0, generation: 0, notes: null, fatherId, motherId: null,
});

describe("parseNasab", () => {
  it("parses the Al-Kalali chain oldest-first with laqabs and honorifics", () => {
    const { entries, gender } = parseNasab(KALALI_NASAB);
    expect(gender).toBe("MALE");
    expect(entries[0]).toEqual({ name: "آدم", laqab: "عليه السلام" });
    expect(entries.at(-1)).toEqual({ name: "أحمد", laqab: null });
    expect(entries.find((e) => e.name === "يريم")?.laqab).toBe("ذو رعين الأكبر");
    expect(entries.map((e) => e.name)).toContain("عبد كلال الأصغر");
    expect(entries.length).toBe(85);
  });

  it("detects a daughter's nasab", () => {
    const { entries, gender } = parseNasab("فاطمة بنت محمد بن سالم");
    expect(gender).toBe("FEMALE");
    expect(entries.map((e) => e.name)).toEqual(["سالم", "محمد", "فاطمة"]);
  });

  it("normalises spelling variants", () => {
    expect(normalizeName("ابراهيم")).toBe(normalizeName("إبراهيم"));
    expect(normalizeName("عبد الله")).toBe(normalizeName("عبدالله"));
  });
});

describe("planNasabImport", () => {
  it("reuses shared ancestors and creates only the new tail", () => {
    const tree = [m("a", "سالم"), m("b", "محمد", "a"), m("c", "علي", "b")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("نوفل بن محمد بن سالم").entries);
    expect(plan.matched.map((x) => x.id)).toEqual(["a", "b"]);
    expect(plan.descendantsToCreate.map((e) => e.name)).toEqual(["نوفل"]);
    expect(plan.ancestorsToCreate).toEqual([]);
  });

  it("adds older ancestors above an existing root", () => {
    const tree = [m("s", "شعلان"), m("k", "عقيل", "s")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("فضل بن عقيل بن شعلان بن أحمد بن أسعد").entries);
    expect(plan.ancestorsToCreate.map((e) => e.name)).toEqual(["أسعد", "أحمد"]);
    expect(plan.adoptedRootId).toBe("s");
    expect(plan.matched.map((x) => x.id)).toEqual(["s", "k"]);
    expect(plan.descendantsToCreate.map((e) => e.name)).toEqual(["فضل"]);
  });

  it("joins a partial nasab that starts mid-tree", () => {
    const tree = [m("r", "آدم"), m("a", "مبارك", "r"), m("b", "سالم", "a"), m("c", "محمد", "b"), m("d", "أحمد", "c")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("سالم بن نوفل بن أحمد بن محمد بن سالم بن مبارك").entries);
    expect(plan.matched.map((x) => x.id)).toEqual(["a", "b", "c", "d"]);
    expect(plan.descendantsToCreate.map((e) => e.name)).toEqual(["نوفل", "سالم"]);
    expect(plan.ancestorsToCreate).toEqual([]);
  });

  it("does not join on a single common name", () => {
    const tree = [m("a", "محمد"), m("b", "علي", "a")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("زيد بن محمد بن خالد").entries);
    expect(plan.matched).toEqual([]);
  });

  it("rejects an anchor whose real ancestors disagree", () => {
    const tree = [m("x", "حسن"), m("a", "محمد", "x"), m("b", "علي", "a")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("علي بن محمد بن خالد").entries);
    expect(plan.matched).toEqual([]);
  });

  it("creates everything when nothing matches", () => {
    const plan = planNasabImport([m("x", "زيد")], "PATRILINEAL", parseNasab("أحمد بن علي").entries);
    expect(plan.matched).toEqual([]);
    expect(plan.descendantsToCreate.length).toBe(2);
  });
});

describe("applyNasabLines", () => {
  it("lets later lines build on people created by earlier lines, without false ambiguity", () => {
    const tree = [m("r", "سالم"), m("a", "محمد", "r"), m("b", "أحمد", "a")];
    let n = 0;
    const { members, results } = applyNasabLines(
      tree, "PATRILINEAL",
      "خالد بن نوفل بن أحمد بن محمد بن سالم\nمريم بنت خالد بن نوفل",
      () => `new${n++}`,
    );
    expect(results.map((r) => [r.reused, r.created, r.ambiguous])).toEqual([[3, 2, false], [2, 1, false]]);
    const maryam = members.find((x) => x.name === "مريم")!;
    expect(maryam.gender).toBe("FEMALE");
    expect(members.find((x) => x.id === maryam.fatherId)?.name).toBe("خالد");
  });

  it("joins every son's line that ends in the family's founder to that one founder", () => {
    let n = 0;
    const { members } = applyNasabLines(
      [], "PATRILINEAL",
      "عبدالعزيز بن محمد بن عبدالله\nصالح بن عمر بن عبدالله\nفهد بن سعود بن عبدالله\nعلي بن خالد بن عبدالله",
      () => `p${n++}`,
    );
    const roots = members.filter((x) => !x.fatherId);
    expect(roots.map((x) => x.name)).toEqual(["عبدالله"]);
    expect(members.filter((x) => x.fatherId === roots[0].id).map((x) => x.name)).toEqual(["محمد", "عمر", "سعود", "خالد"]);
  });

  it("does not join on the founder's name when two people without a father share it", () => {
    const tree = [m("r1", "عبدالله"), m("a", "محمد", "r1"), m("r2", "عبدالله"), m("b", "سعد", "r2")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("صالح بن عمر بن عبدالله").entries);
    expect(plan.matched).toEqual([]);
  });

  it("grows the tree upward from its oldest ancestor: a line beginning with him puts the older names above him", () => {
    // the tree starts at عبدكلال (written without a space); the pasted
    // lineage begins «عبد كلال بن نصر …» and reaches آدم عليه السلام
    const tree = [m("root", "عبدكلال"), m("a", "محمد", "root"), m("b", "علي", "a"), m("inlaw", "نصر")];
    const line = "عبد كلال بن نصر بن سهل بن عريب بن عبد كلال بن عريب بن فهد بن زيد بن مثوب بن ذي حرث بن الحارث بن مالك بن غيدان بن حجر بن يريم بن زيد بن سهل بن عمرو بن قيس بن معاوية بن جشم بن عبد شمس بن وائل بن الغوث بن قطن بن عريب بن زهير بن أيمن بن الهميسع بن حمير بن سبأ بن يشجب بن يعرب بن قحطان بن عابر بن شالخ بن أرفخشذ بن سام بن نوح عليه السلام بن لامك بن متوشلخ بن أخنوخ بن يرد بن مهلائيل بن قينان بن أنوش بن شيث بن آدم عليه السلام";
    let n = 0;
    const { members, newRootId } = applyNasabLines(tree, "PATRILINEAL", line, () => `n${n++}`, "root");
    const byId = new Map(members.map((x) => [x.id, x]));
    const up: string[] = [];
    for (let cur = byId.get("root")!; cur.fatherId; ) {
      cur = byId.get(cur.fatherId)!;
      up.push(cur.name);
    }
    expect(up).toHaveLength(47);
    expect(up[0]).toBe("نصر");
    // one new record only for the older عبد كلال (بن عريب), none for him
    expect(members.filter((x) => normalizeName(x.name) === normalizeName("عبد كلال")).map((x) => x.id === "root" || up.includes(x.name))).toEqual([true, true]);
    expect(up.at(-1)).toBe("آدم");
    expect(byId.get(newRootId!)!.name).toBe("آدم");
    expect(byId.get(newRootId!)!.laqab).toBe("عليه السلام");
    expect(members.filter((x) => x.fatherId === "root").map((x) => x.id)).toEqual(["a"]); // his family stays his
    expect(byId.get("inlaw")!.fatherId).toBeNull();
  });

  it("does not grow upward from someone of that name who is not the tree's oldest ancestor", () => {
    const tree = [m("root", "خالد"), m("a", "سعد", "root"), m("inlaw", "محمد")];
    const plan = planNasabImport(tree, "PATRILINEAL", parseNasab("محمد بن عمر").entries, "root");
    expect(plan.adoptedRootId).toBeNull();
    expect(plan.matched).toEqual([]);
  });

  it("flags a genuinely ambiguous line", () => {
    const tree = [m("r", "علي"), m("a", "محمد", "r"), m("b", "سالم", "a"), m("c", "محمد", "r"), m("d", "سالم", "c")];
    const { results } = applyNasabLines(tree, "PATRILINEAL", "عمر بن سالم بن محمد", () => "x");
    expect(results[0].ambiguous).toBe(true);
  });
});

describe("nasab", () => {
  it("names a woman بنت her father, and her fathers بن theirs", () => {
    const tree = [m("a", "أحمد"), m("n", "نوفل", "a"), { ...m("j", "ماجدة", "n"), gender: "FEMALE" as const }, m("s", "سالم", "n")];
    expect(nasab(tree, "j")).toBe("ماجدة بنت نوفل بن أحمد");
    expect(nasab(tree, "s")).toBe("سالم بن نوفل بن أحمد");
  });
});
