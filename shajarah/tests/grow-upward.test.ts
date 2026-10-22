import { describe, expect, it } from "vitest";
import { localRepository } from "@/components/editor/repository";
import { computePosterLayout } from "@/lib/layout/botanical";
import { smallFamily } from "@/lib/samples/fixtures";

// Adding a father above the oldest ancestor: the tree grows upward and the
// poster's root moves up with it.
describe("growing the tree upward", () => {
  it("adds a father above the root, which becomes the new root", async () => {
    const start = smallFamily();
    const root = start.members.find((m) => m.id === start.rootMemberId)!;
    const repo = localRepository(start);
    const tree = await repo.createMember({ name: "حمد", gender: "MALE", parentOfId: root.id });
    const father = tree.members.find((m) => m.name === "حمد")!;
    expect(tree.members.find((m) => m.id === root.id)!.fatherId).toBe(father.id);
    expect(tree.rootMemberId).toBe(father.id);
    expect(father.generation).toBe(0);
    expect(tree.members.find((m) => m.id === root.id)!.generation).toBe(1);
    // and the poster now starts from him
    const layout = computePosterLayout(tree);
    const drawn = [layout.base, ...layout.nodes].map((n) => n?.member.id);
    expect([...drawn, ...layout.trunkLabels.map((t) => t.member.id)]).toContain(father.id);
  });

  it("adds a mother without moving a patrilineal root", async () => {
    const start = smallFamily();
    const root = start.members.find((m) => m.id === start.rootMemberId)!;
    const tree = await localRepository(start).createMember({ name: "نورة", gender: "FEMALE", parentOfId: root.id });
    const mother = tree.members.find((m) => m.name === "نورة" && m.id !== root.id && !m.fatherId)!;
    expect(tree.members.find((m) => m.id === root.id)!.motherId).toBe(mother.id);
    expect(tree.rootMemberId).toBe(root.id);
  });

  it("refuses a second father", async () => {
    const start = smallFamily();
    const son = start.members.find((m) => m.fatherId)!;
    await expect(localRepository(start).createMember({ name: "x", gender: "MALE", parentOfId: son.id })).rejects.toThrow("already has a father");
  });
});
