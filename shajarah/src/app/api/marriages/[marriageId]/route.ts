import { handle } from "@/lib/data/http";
import { deleteMarriage } from "@/lib/data/treeService";

type Ctx = { params: { marriageId: string } };

export const DELETE = (_req: Request, { params }: Ctx) => handle(() => deleteMarriage(params.marriageId));
