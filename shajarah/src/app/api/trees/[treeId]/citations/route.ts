import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { createCitation } from "@/lib/data/treeService";
import { createCitationSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Cites a source for a person (optionally an event and a page) and returns the tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => createCitation(params.treeId, await parseBody(req, createCitationSchema), ifMatch(req)), 201);
