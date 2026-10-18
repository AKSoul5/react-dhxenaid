import { handle, parseBody } from "@/lib/data/http";
import { importGedcom } from "@/lib/data/treeService";
import { importGedcomSchema } from "@/lib/validation";

type Ctx = { params: { treeId: string } };

/** Imports a GEDCOM file's text in one transaction and returns the updated tree. */
export const POST = (req: Request, { params }: Ctx) =>
  handle(async () => importGedcom(params.treeId, await parseBody(req, importGedcomSchema)));
