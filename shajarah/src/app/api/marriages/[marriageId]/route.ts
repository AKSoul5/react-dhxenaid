import { handle, ifMatch } from "@/lib/data/http";
import { deleteMarriage } from "@/lib/data/treeService";

type Ctx = { params: { marriageId: string } };

export const DELETE = (req: Request, { params }: Ctx) => handle(() => deleteMarriage(params.marriageId, ifMatch(req)));
