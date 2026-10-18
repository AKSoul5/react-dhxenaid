import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { createMedia } from "@/lib/data/treeService";
import { createMediaSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Attaches a photo or document (by URL, after uploading it to /api/media/blob) to a person or source. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => createMedia(params.treeId, await parseBody(req, createMediaSchema), ifMatch(req)), 201);
