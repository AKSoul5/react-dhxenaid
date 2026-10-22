// Seeds the database with the sample nasab tree used by /demo.
import { PrismaClient } from "@prisma/client";
import { generateSampleTree } from "../src/lib/sampleData";
import { kalaliTree } from "../src/lib/samples/kalali";
import type { TreeDTO } from "../src/lib/types";

const prisma = new PrismaClient();

async function main() {
  for (const sample of [generateSampleTree(), kalaliTree()]) await seedTree(sample);
}

async function seedTree(sample: TreeDTO) {
  await prisma.familyTree.deleteMany({ where: { name: sample.name } });
  const tree = await prisma.familyTree.create({
    data: {
      name: sample.name, title: sample.title, subtitle: sample.subtitle, lineage: sample.lineage,
      settings: JSON.parse(JSON.stringify(sample.settings ?? {})),
    },
  });
  // Members are inserted in generation order so parents always exist first.
  const idMap = new Map<string, string>();
  const ordered = [...sample.members].sort((a, b) => a.generation - b.generation);
  for (const m of ordered) {
    const created = await prisma.member.create({
      data: {
        treeId: tree.id, name: m.name, laqab: m.laqab, gender: m.gender, birthYear: m.birthYear,
        deathYear: m.deathYear, isDeceased: m.isDeceased, birthOrder: m.birthOrder,
        generation: m.generation, notes: m.notes,
        fatherId: m.fatherId ? idMap.get(m.fatherId) : null,
        motherId: m.motherId ? idMap.get(m.motherId) : null,
      },
    });
    idMap.set(m.id, created.id);
  }
  const mapped = (id: string | null) => (id ? idMap.get(id) ?? null : null);
  await prisma.familyTree.update({
    where: { id: tree.id },
    data: {
      rootMemberId: mapped(sample.rootMemberId),
      crownBaseId: mapped(sample.crownBaseId),
      trunkStartId: mapped(sample.trunkStartId),
      soilText: sample.soilText,
    },
  });
  console.log(`Seeded "${sample.name}" with ${ordered.length} members → /trees/${tree.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
