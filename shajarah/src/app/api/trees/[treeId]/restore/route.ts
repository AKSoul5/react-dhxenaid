import { handle, parseBody } from "@/lib/data/http";
import { restoreTree } from "@/lib/data/treeService";
import { restoreTreeSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Puts the tree back to a full snapshot (undo/redo) in one transaction and returns it. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => restoreTree(params.treeId, await parseBody(req, restoreTreeSchema)));
