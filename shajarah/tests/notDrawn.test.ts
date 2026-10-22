// The people a poster leaves out, sorted by what would bring them on.
import { describe, expect, it } from "vitest";
import { explainNotDrawn } from "@/lib/notDrawn";
import type { MemberDTO } from "@/lib/types";

const p = (id: string, gender: MemberDTO["gender"], fatherId: string | null = null, motherId: string | null = null): MemberDTO => ({
  id, name: id, laqab: null, gender, birthYear: null, deathYear: null, isDeceased: false, birthOrder: 0, generation: 0, notes: null, fatherId, motherId,
});

describe("why someone is not on the poster", () => {
  const members = [
    p("root", "MALE"), p("wife", "FEMALE"), p("son", "MALE", "root", "wife"), p("majida", "FEMALE", "root", "wife"),
    p("h1", "MALE"), p("h2", "MALE"), p("k1", "FEMALE", "h1", "majida"), p("k2", "MALE", "h2", "majida"), p("g1", "MALE", "k2"),
    p("lone", "FEMALE", null, "majida"), // a daughter's child with no father recorded
    p("marwan", "MALE"), p("yusuf", "MALE", "marwan", "majida"), // a father by a child together, no marriage recorded
    p("stray", "MALE"), p("inlaw", "MALE"), p("inlawKid", "MALE", "inlaw"),
  ];
  const marriages = [{ id: "m1", spouseAId: "root", spouseBId: "wife", startYear: null, endYear: null }, { id: "m2", spouseAId: "majida", spouseBId: "h1", startYear: null, endYear: null }];
  const tree = { members, marriages, lineage: "PATRILINEAL" as const };
  const ids = ["wife", "h1", "h2", "k1", "k2", "g1", "lone", "marwan", "yusuf", "stray", "inlaw", "inlawKid"];
  const by = Object.fromEntries(explainNotDrawn(tree, ids).map((x) => [x.id, x]));

  it("a daughter's husbands, her children by each and their descendants are her family", () => {
    for (const id of ["h1", "h2", "k1", "k2", "g1", "lone", "marwan", "yusuf"]) {
      expect(by[id].kind, id).toBe("daughter");
      expect(by[id].throughId, id).toBe("majida");
    }
  });
  it("a wife of the line is a spouse; someone linked to no one is a leftover", () => {
    expect(by.wife.kind).toBe("spouse");
    expect(by.wife.partnerIds).toEqual(["root"]);
    expect(by.stray.kind).toBe("unlinked");
    expect(by.inlaw.kind).toBe("other");
    expect(by.inlawKid.kind).toBe("other");
  });
});
