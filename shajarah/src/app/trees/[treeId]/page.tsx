import { notFound } from "next/navigation";
import { TreeWorkspace } from "@/components/editor/TreeWorkspace";
import { DomainError, getTree } from "@/lib/data/treeService";

export const dynamic = "force-dynamic";

export default async function TreePage({ params }: { params: { treeId: string } }) {
  try {
    const tree = await getTree(params.treeId);
    return <TreeWorkspace initialTree={tree} mode="api" />;
  } catch (e) {
    if (e instanceof DomainError && e.status === 404) notFound();
    throw e;
  }
}
