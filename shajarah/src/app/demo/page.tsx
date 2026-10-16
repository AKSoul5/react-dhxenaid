import { TreeWorkspace } from "@/components/editor/TreeWorkspace";
import { generateSampleTree } from "@/lib/sampleData";

export const metadata = { title: "Demo — Shajarah" };

/** Fully working editor backed by an in-memory repository (no database). */
export default function DemoPage() {
  return <TreeWorkspace initialTree={generateSampleTree()} mode="local" />;
}
