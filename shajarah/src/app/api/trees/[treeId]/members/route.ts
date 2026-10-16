import { handle, parseBody } from "@/lib/data/http";
import { createMember } from "@/lib/data/treeService";
import { createMemberSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Creates a member and returns the whole updated tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => createMember(params.treeId, await parseBody(req, createMemberSchema)), 201);
