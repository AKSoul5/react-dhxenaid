import { TreeWorkspace } from "@/components/editor/TreeWorkspace";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliTree } from "@/lib/samples/kalali";
import { marriagesFamily, namesFamily, smallFamily } from "@/lib/samples/fixtures";

const SAMPLES = {
  kalali: kalaliTree, small: smallFamily, marriages: marriagesFamily, names: namesFamily,
  // ~500 people with daughters, for checking dense layouts and the size warning
  huge: () => {
    const t = generateSampleTree(5, 5000);
    return { ...t, id: "huge", settings: { ...t.settings, showFemales: true } };
  },
};

export const metadata = { title: "Demo — Shajarah" };

/**
 * Fully working editor backed by an in-memory repository (no database).
 * /demo?sample=kalali loads the Al-Kalali lineage (آدم → أحمد بن نوفل);
 * small, marriages, names and huge load the other validation families.
 */
export default function DemoPage({ searchParams }: { searchParams: { sample?: string } }) {
  const make = SAMPLES[searchParams.sample as keyof typeof SAMPLES];
  const tree = make ? make() : generateSampleTree();
  return <TreeWorkspace key={tree.id} initialTree={tree} mode="local" />;
}
