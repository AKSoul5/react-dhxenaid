import { handle } from "@/lib/data/http";
import { openProject } from "@/lib/data/treeService";

export const dynamic = "force-dynamic";

/** Opens a project file (.shajarah, sent as its text) as a new family. */
export const POST = (req: Request) => handle(async () => openProject(await req.text()), 201);
