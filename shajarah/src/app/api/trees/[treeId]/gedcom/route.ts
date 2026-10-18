import { NextResponse } from "next/server";
import { DomainError, getTree } from "@/lib/data/treeService";
import { exportGedcom } from "@/lib/gedcom";

type Ctx = { params: { treeId: string } };

export const dynamic = "force-dynamic";

/** The tree as a GEDCOM 5.5.1 file, for other genealogy software. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const tree = await getTree(params.treeId);
    return new NextResponse(exportGedcom(tree), {
      headers: {
        "Content-Type": "text/x-gedcom; charset=utf-8",
        "Content-Disposition": `attachment; filename="shajarah-${tree.id}.ged"`,
      },
    });
  } catch (err) {
    if (err instanceof DomainError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
