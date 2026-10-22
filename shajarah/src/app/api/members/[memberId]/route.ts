import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { deleteMember, updateMember } from "@/lib/data/treeService";
import { updateMemberSchema } from "@/lib/validation";

type Ctx = { params: { memberId: string } };

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => updateMember(params.memberId, await parseBody(req, updateMemberSchema), ifMatch(req)));

export const DELETE = (req: Request, { params }: Ctx) => handle(() => deleteMember(params.memberId, ifMatch(req)));
