import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { createMarriage } from "@/lib/data/treeService";
import { createMarriageSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => createMarriage(params.treeId, await parseBody(req, createMarriageSchema), ifMatch(req)), 201);
