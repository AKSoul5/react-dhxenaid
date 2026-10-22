import { handle, ifMatch } from "@/lib/data/http";
import { deleteCitation } from "@/lib/data/treeService";

type Ctx = { params: { citationId: string } };

export const DELETE = (req: Request, { params }: Ctx) => handle(() => deleteCitation(params.citationId, ifMatch(req)));
