import { describe, expect, it } from "vitest";
import { makeProjectFile, projectFileName, readProjectFile, withNewIds } from "@/lib/project";
import { snapshotError } from "@/lib/restore";
import { nouriFamily } from "@/lib/samples/nouri";
import { generateHypotheticalTree } from "@/lib/samples/al_kalali_hypo";
import type { TreeDTO } from "@/lib/types";

// A family with every kind of record: marriages, a source cited for a person,
// a photo, and a tier pointer.
function richFamily(): TreeDTO {
  const t = nouriFamily();
  const person = t.members[5];
  return {
    ...t,
    crownBaseId: t.members[0].id,
    settings: { ...t.settings, focusId: person.id, posterSize: "A1" },
    sources: [{ id: "s1", title: "Family register", author: null, publication: null, notes: null }],
    citations: [{ id: "c1", sourceId: "s1", memberId: person.id, eventType: "BIRT", page: "p. 4" }],
    media: [{ id: "md1", memberId: person.id, sourceId: null, url: `/api/media/blob/${"a".repeat(64)}`, caption: "Photo", fileType: "image/png" }],
  };
}

/** The family written with names instead of ids, to compare two copies. */
function shape(t: Pick<TreeDTO, "members" | "marriages" | "citations" | "media" | "sources" | "crownBaseId" | "settings">) {
  const name = new Map(t.members.map((m) => [m.id, `${m.name}#${m.birthOrder}#${m.generation}`]));
  const n = (id: string | null) => (id ? name.get(id) ?? "?" : null);
  const src = new Map(t.sources.map((s) => [s.id, s.title]));
  return {
    members: t.members.map((m) => [n(m.id), n(m.fatherId), n(m.motherId), m.gender]).sort(),
    marriages: t.marriages.map((r) => [n(r.spouseAId), n(r.spouseBId)]).sort(),
    citations: t.citations.map((c) => [src.get(c.sourceId), n(c.memberId), c.page]),
    media: t.media.map((x) => [n(x.memberId), x.url]),
    crownBase: n(t.crownBaseId),
    focus: n(t.settings?.focusId ?? null),
  };
}

describe("project files", () => {
  it("round-trips a family through a file", () => {
    const tree = richFamily();
    const text = JSON.stringify(makeProjectFile(tree, { ["a".repeat(64)]: { type: "image/png", data: "iVBORw0KGgo=" } }));
    const file = readProjectFile(text);
    expect(file.tree.name).toBe(tree.name);
    expect(file.files["a".repeat(64)].type).toBe("image/png");
    expect(shape(file.tree)).toEqual(shape(tree));
  });

  it("gives every record a new id when opened, keeping every relationship", () => {
    const tree = richFamily();
    let n = 0;
    const opened = withNewIds(readProjectFile(JSON.stringify(makeProjectFile(tree))).tree, () => `new-${++n}`);
    const oldIds = new Set([...tree.members, ...tree.marriages, ...tree.sources, ...tree.citations, ...tree.media].map((x) => x.id));
    for (const x of [...opened.members, ...opened.marriages, ...opened.sources, ...opened.citations, ...opened.media]) {
      expect(oldIds.has(x.id)).toBe(false);
    }
    expect(shape(opened)).toEqual(shape(tree));
    expect(snapshotError(opened)).toBeNull();
  });

  it("keeps a large family's soil, trunk and canopy pointers", () => {
    const tree = generateHypotheticalTree();
    const opened = withNewIds(makeProjectFile(tree).tree, (() => { let n = 0; return () => `x${++n}`; })());
    const nameOf = (t: { members: { id: string; name: string }[] }, id: string | null) => t.members.find((m) => m.id === id)?.name;
    expect(nameOf(opened, opened.trunkStartId)).toBe(nameOf(tree, tree.trunkStartId));
    expect(nameOf(opened, opened.crownBaseId)).toBe(nameOf(tree, tree.crownBaseId));
    expect(opened.members).toHaveLength(tree.members.length);
  });

  it("refuses other files with a plain message", () => {
    expect(() => readProjectFile("not json")).toThrow("not a Shajarah project file");
    expect(() => readProjectFile(JSON.stringify({ format: "gedcom" }))).toThrow("not a Shajarah project file");
    const newer = { ...makeProjectFile(richFamily()), version: 99 };
    expect(() => readProjectFile(JSON.stringify(newer))).toThrow("newer version");
    const damaged = { ...makeProjectFile(richFamily()), tree: { name: "x" } };
    expect(() => readProjectFile(JSON.stringify(damaged))).toThrow("damaged");
  });

  it("names the file after the family, in plain letters", () => {
    expect(projectFileName("AlKalali")).toBe("shajarah-alkalali.shajarah");
    expect(projectFileName("Al Nouri family")).toBe("shajarah-al-nouri-family.shajarah");
    // an Arabic name has no plain letters to keep
    expect(projectFileName("آل الكلالي")).toBe("shajarah-family.shajarah");
    expect(projectFileName('a/b:c*?"<>|')).toBe("shajarah-abc.shajarah");
  });
});
