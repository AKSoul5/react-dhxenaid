import { TreeWorkspace } from "@/components/editor/TreeWorkspace";
import { generateSampleTree } from "@/lib/sampleData";
import { kalaliTree } from "@/lib/samples/kalali";

export const metadata = { title: "Demo — Shajarah" };

/**
 * Fully working editor backed by an in-memory repository (no database).
 * /demo?sample=kalali loads the Al-Kalali lineage (آدم → أحمد بن نوفل).
 */
export default function DemoPage({ searchParams }: { searchParams: { sample?: string } }) {
  const tree = searchParams.sample === "kalali" ? kalaliTree() : generateSampleTree();
  return <TreeWorkspace key={tree.id} initialTree={tree} mode="local" />;
}
