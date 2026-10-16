import { handle, parseBody } from "@/lib/data/http";
import { deleteTree, getTree, updateTree } from "@/lib/data/treeService";
import { updateTreeSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

export const dynamic = "force-dynamic";

export const GET = (_req: Request, { params }: Ctx) => handle(() => getTree(params.treeId));

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => updateTree(params.treeId, await parseBody(req, updateTreeSchema)));

export const DELETE = (_req: Request, { params }: Ctx) => handle(() => deleteTree(params.treeId));
