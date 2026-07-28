// The preview gate (issue #3): approval must be PRECEDED by the actual deliverable having
// been put in front of the journalist.
//
// The failure is documented in the issue: Splash reached Gate 3b and asked for approval
// having shown only a review still, and opened the real interactive only after the
// journalist asked how to see the result. The skill said to show the render — but prose is
// skippable, so it was skipped. What makes it unskippable is a record the approval step
// REQUIRES and can type-check, which is what this module is.
//
// Two refusals, both of them type-level rather than editorial:
//   1. the preview must carry the CURRENT artifact's bytes;
//   2. the file shown must be the pinned format's OWN deliverable — a png cannot preview an
//      interactive, which is the substitution the issue calls out by name.
import { IMAGE_EXTENSIONS, isHostedUrl } from "../core/contract";
import { deliveryGenreFor } from "../core/publishers";
import type { VisualFormat } from "../core/vocabulary";
import type { PreviewRecord } from "./types";

export type PreviewVerdict =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "preview-not-presented"
        | "stale-preview"
        | "not-the-deliverable"
        | "fallback-unexplained";
      detail: string;
    };

/** Does this path look like the deliverable of that format? Extension-level, on purpose:
 *  it is the one property that is true of every engine's output and cannot be argued with.
 *
 *  A PUBLISHED EMBED is the one deliverable with no extension to read, because it has no file:
 *  the address IS the artifact. What makes it checkable all the same is the genre — an embed is
 *  what `interactive` and `scrolly` are handed over as (lib/core/publishers.ts), and a `static` or
 *  `video` element handing over a URL is exactly the substitution this function exists to refuse.
 *  So the URL branch asks the genre the same question the extension branch asks the file. */
export function isDeliverableOf(format: VisualFormat, path: string): boolean {
  if (isHostedUrl(path)) return deliveryGenreFor(format) === "embed";
  const lower = path.toLowerCase();
  if (format === "static")
    return IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (format === "video") return lower.endsWith(".mp4");
  return lower.endsWith(".html");
}

export function previewCoversDeliverable(
  format: VisualFormat,
  preview: PreviewRecord | undefined,
  artifactSha256: string,
): PreviewVerdict {
  if (!preview)
    return {
      ok: false,
      reason: "preview-not-presented",
      detail:
        "no preview of the deliverable was recorded — approval cannot be asked for a visual nobody has been shown",
    };
  if (!isDeliverableOf(format, preview.deliverablePath))
    return {
      ok: false,
      reason: "not-the-deliverable",
      detail: `the preview showed ${preview.deliverablePath}, which is not the deliverable of a "${format}" element`,
    };
  if (preview.deliverableSha256 !== artifactSha256)
    return {
      ok: false,
      reason: "stale-preview",
      detail: `the preview covered ${preview.deliverableSha256.slice(0, 12)}… but the current artifact is ${artifactSha256.slice(0, 12)}…`,
    };
  // The no-GUI case issue #3 asks for ("a clear fallback command when the environment
  // cannot open a viewer") is legitimate — but only when it says WHY it fell back.
  // Otherwise "path-printed" becomes the free square that turns the gate back into prose.
  if (preview.presentedAs === "path-printed" && !preview.fallbackReason?.trim())
    return {
      ok: false,
      reason: "fallback-unexplained",
      detail:
        "a printed path counts as a preview only when it records why no viewer could be opened",
    };
  return { ok: true };
}
