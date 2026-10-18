import { handle, ifMatch, parseBody } from "@/lib/data/http";
import { mergeSources } from "@/lib/data/treeService";
import { mergeSourcesSchema } from "@/lib/validation";

type Ctx = { params: { sourceId: string } };

/** Merges this source into `intoId` (duplicates) and returns the tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => {
    const { intoId } = await parseBody(req, mergeSourcesSchema);
    return mergeSources(params.sourceId, intoId, ifMatch(req));
  });
