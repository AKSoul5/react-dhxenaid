import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { deleteMedia, updateMedia } from "@/lib/data/treeService";
import { updateMediaSchema } from "@/lib/validation";

type Ctx = { params: { mediaId: string } };

export const PATCH = (req: Request, { params }: Ctx) =>
  handle(async () => updateMedia(params.mediaId, await parseBody(req, updateMediaSchema), ifMatch(req)));

export const DELETE = (req: Request, { params }: Ctx) => handle(() => deleteMedia(params.mediaId, ifMatch(req)));
