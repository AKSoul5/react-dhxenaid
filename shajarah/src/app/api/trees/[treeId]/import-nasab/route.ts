import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { importNasab } from "@/lib/data/treeService";
import { importNasabSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Imports pasted nasab lines and returns the updated tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => importNasab(params.treeId, await parseBody(req, importNasabSchema), ifMatch(req)));
