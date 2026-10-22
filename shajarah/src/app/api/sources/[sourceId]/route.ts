import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { deleteSource, updateSource } from "@/lib/data/treeService";
import { updateSourceSchema } from "@/lib/validation";

type Ctx = { params: { sourceId: string } };

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => updateSource(params.sourceId, await parseBody(req, updateSourceSchema), ifMatch(req)));

/** Removes the source with its citations and file links; the people stay. */
export const DELETE = (req: Request, { params }: Ctx) => handle(() => deleteSource(params.sourceId, ifMatch(req)));
