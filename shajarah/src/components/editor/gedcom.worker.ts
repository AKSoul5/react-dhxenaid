// Reads and matches a GEDCOM file off the page's main thread, so a large
// file never freezes the editor.

import { previewGedcom, type PreviewTree } from "./gedcomPreview";

type Request = { id: number; bytes: ArrayBuffer; tree: PreviewTree };

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, bytes, tree } = e.data;
  try {
    self.postMessage({ id, ok: true, preview: previewGedcom(bytes, tree) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
