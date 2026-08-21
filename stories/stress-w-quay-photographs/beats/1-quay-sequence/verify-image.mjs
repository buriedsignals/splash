// Verifies what an IMAGE BEAT carries, after the render ladder has proved it exists.
//
// This format's artifact is a self-contained SVG: every photograph is embedded as a `data:` URI so
// the file references nothing outside itself (`render-still.mjs`'s `toDataUri`). That is the whole
// point of it, and it is also the one way this format can waste a reader's bandwidth — the same
// photograph embedded twice is bytes nobody benefits from, and a beat that shows one image at two
// sizes, or repeats one in a before/after, gets there by writing exactly what a journalist would
// expect to write.
//
// A COMPANION TO `checkWeight`, NOT A DUPLICATE OF IT. `checkWeight` refuses a beat whose photographs
// are too heavy in total; this refuses weight that is not carrying anything. Both are called by the
// render script rather than by `renderStill`, which is this skill's own established shape — see
// `SKILL.md`, "Files".

/** The guards this script carries, read by `scripts/guards.mjs` and checked against
 *  `doctrine/references/guard-catalogue.json` by `doctrine/test/guard-parity.test.ts`. */
export const GUARDS = ["duplicatedPayload"];

/** Below this many base64 characters a repeated inline asset is an icon or a font scrap, not the
 *  defect: reporting those would bury the 1.33 MB one under a list of nothing. */
const PAYLOAD_FLOOR = 1024;

/** Every data: asset inlined more than once, worst waste first. A weight ceiling would have been
 *  arbitrary — this tree's own image scrolly is legitimately 3 MB — but a second copy of one asset
 *  is bytes no reader benefits from, whatever the beat, and it is the file-side fingerprint of a
 *  visual duplicated into every step frame. */
export function duplicatedPayload(html) {
  const blobs = new Map();
  for (const match of html.matchAll(/data:[a-z/+.-]+;base64,([A-Za-z0-9+/=]+)/gi)) {
    const body = match[1];
    if (body.length < PAYLOAD_FLOOR) continue;
    const seen = blobs.get(body) ?? { copies: 0, bytes: body.length };
    seen.copies += 1;
    blobs.set(body, seen);
  }
  return [...blobs.values()]
    .filter((b) => b.copies > 1)
    .map((b) => ({
      copies: b.copies,
      bytes: b.bytes,
      wastedBytes: (b.copies - 1) * b.bytes,
    }))
    .sort((a, b) => b.wastedBytes - a.wastedBytes);
}
