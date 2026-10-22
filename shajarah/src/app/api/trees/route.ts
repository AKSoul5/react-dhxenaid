import { handle, parseBody } from "@/lib/data/http";
import { createTree, listTrees } from "@/lib/data/treeService";
import { createTreeSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const GET = () => handle(listTrees);

export const POST = (req: Request) =>
  handle(async () => createTree(await parseBody(req, createTreeSchema)), 201);
