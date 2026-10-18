import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { undoImport } from "@/lib/data/treeService";
import { undoImportSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Removes what one import added (members, marriages, parent links) and returns the tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => undoImport(params.treeId, await parseBody(req, undoImportSchema), ifMatch(req)));
