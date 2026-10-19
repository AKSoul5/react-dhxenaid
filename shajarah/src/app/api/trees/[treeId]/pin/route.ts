import { z } from "zod";
import { handle, parseBody } from "@/lib/data/http";
import { setPinned } from "@/lib/data/treeService";

type Ctx = { params: { treeId: string } };

export const dynamic = "force-dynamic";

/** Pins a family to the top of the start page (or unpins it); not an edit of the family. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => setPinned(params.treeId, (await parseBody(req, z.object({ pinned: z.boolean() }))).pinned));
