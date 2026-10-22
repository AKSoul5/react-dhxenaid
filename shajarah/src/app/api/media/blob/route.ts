import { handle } from "@/lib/data/http";
import { DomainError, MEDIA_MAX_BYTES, saveMediaBlob } from "@/lib/data/treeService";

/**
 * Uploads a file (the raw bytes, with its Content-Type) and returns the URL
 * to attach with POST /api/trees/:treeId/media. The URL is the file's
 * SHA-256, so uploading the same photo twice stores it once.
 */
export const POST = (req: Request) =>
  handle(async () => {
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > MEDIA_MAX_BYTES) throw new DomainError("Files up to 5 MB can be uploaded.", 413);
    const type = (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    return saveMediaBlob(new Uint8Array(await req.arrayBuffer()), type);
  }, 201);
