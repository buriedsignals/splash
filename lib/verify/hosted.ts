// WHAT A HOSTED DELIVERY IS VERIFIED AGAINST.
//
// A file deliverable has bytes: every record downstream of produce binds to their sha256 — the
// preview re-hashes them, the override names them, the Ed25519 sign-off signs them. A Datawrapper
// interactive has none. It is published on Datawrapper's own CDN and the run holds a URL.
//
// So the question this module answers is the one the whole hosted chain rests on: what does an
// approval of a published embed BIND to, such that it cannot silently cover a chart that has since
// been re-published?
//
// Three candidates, and the answer is the third:
//
//   1. THE URL ALONE — refused. "The address I approved still answers" is not "the thing I
//      approved is still there": nothing in an address says what is served at it.
//
//   2. THE PIXELS ALONE (the sha256 of the still capture took) — refused as the WHOLE binding.
//      They are the strongest statement about what a reader sees, but a screenshot is not
//      reproducible byte-for-byte (font rasterisation, animation timing), so nothing can ever
//      re-derive it: a later reader could only compare the recorded hash with itself.
//
//   3. BOTH, hashed together — what this module builds. The address pins WHICH published thing,
//      the pixels pin what it actually rendered as when a human was shown it.
//
// The address leg is load-bearing because of a MEASURED property of Datawrapper, not an assumption
// (probed live on 2026-07-28, chart XkA4o):
//   · `publish` returns `publicUrl` = https://datawrapper.dwcdn.net/<id>/<publicVersion>/ — the
//     public VERSION is in the path;
//   · publishing the same chart again returns .../2/, a different URL;
//   · and .../1/ keeps serving what it served (fetched after the re-publish: 200, still the old
//     headline).
// A re-publish therefore MOVES the address instead of changing what the recorded one serves, so an
// approval that names .../1/ cannot come to cover .../2/ — and a hand-over of the recorded URL
// hands over exactly the bytes that were approved.
//
// The pixel leg is what carries the guarantee if a future hosted engine ever records an address
// that is NOT version-pinned: the content behind it would change, the next capture would measure
// different pixels, the binding would move, and preview/approval would lapse. It is a re-capture
// that detects that, which is the honest limit of what this layer can promise.
import { sha256 } from "@noble/hashes/sha2.js";
import type { CaptureRecord } from "./types";

/** The versioned label the binding string carries. A digest computed from anything else — a file's
 *  own bytes above all — can never collide with one of these by accident, so a hosted binding and
 *  a file sha256 are never mistaken for one another in a record that holds either. */
export const HOSTED_BINDING_V1 = "splash-hosted-embed:v1";

/**
 * The identity of a published embed, as approved: its address and what it rendered as.
 *
 * `renderedSha256` is the sha256 of the still capture took at the destination's PRIMARY viewport —
 * the container the deliverable actually publishes into, the same breakpoint `renderedTitleOf`
 * reads the title from.
 */
export function hostedBindingDigest(
  url: string,
  renderedSha256: string,
): string {
  const payload = `${HOSTED_BINDING_V1}\nurl=${url}\nrendered=${renderedSha256}`;
  return Buffer.from(sha256(new TextEncoder().encode(payload))).toString("hex");
}

/**
 * The binding these captures measured, or `undefined` when they measured a FILE.
 *
 * Every record of one hosted capture carries the SAME `artifactSha256` — the binding, computed
 * once from the primary still — exactly as every record of a file capture carries the same
 * artifact sha256. So this reads the first record that names an address rather than re-deriving
 * anything: one definition of the binding, written where the measurement happened.
 */
export function hostedBindingOf(
  images: CaptureRecord[],
): { digest: string; url: string } | undefined {
  const rec = images.find((c) => (c.artifactUrl ?? "").length > 0);
  return rec
    ? { digest: rec.artifactSha256, url: rec.artifactUrl! }
    : undefined;
}
