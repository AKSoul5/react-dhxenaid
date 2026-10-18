import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { createSource } from "@/lib/data/treeService";
import { createSourceSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Adds a source (register, book, document) to the tree and returns the tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => createSource(params.treeId, await parseBody(req, createSourceSchema), ifMatch(req)), 201);
