import { NextResponse } from "next/server";
import { getMediaBlob } from "@/lib/data/treeService";

type Ctx = { params: { blobId: string } };

export const dynamic = "force-dynamic";

/** An uploaded file. Its URL is its content hash, so it never changes and can be cached for good. */
export async function GET(_req: Request, { params }: Ctx) {
  const blob = await getMediaBlob(params.blobId);
  if (!blob) return NextResponse.json({ error: "File not found" }, { status: 404 });
  return new NextResponse(blob.data, {
    headers: {
      "Content-Type": blob.fileType,
      "Content-Length": String(blob.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      // served as a file, never as a page of this site
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
