// The DEFAULT half of the genre routing (spec §3.3). It answers "where does this go when the
// journalist did not name a destination" — never "is this destination legal", which is
// lib/loop/deliver.ts's half.
//
// PURE: the ready destination ids are passed in, never read from the environment or from a
// decor (invariant I5). The caller — lib/loop/request-delivery.ts — owns that resolution.
import { deliveryGenreFor } from "../core/publishers";
import type { VisualFormat } from "../core/vocabulary";

/** The portable package: no key, always ready, therefore always a possible answer. */
export const PORTABLE_PACKAGE = "zip";

// A DECLARED order, not the registry's iteration order: a default that depends on which
// adapter file happened to be imported first is a default that moves when an import moves.
export const HOSTED_PREFERENCE: readonly string[] = [
  "embed-cms",
  "embed-cloudflare",
  "embed-s3",
  "embed-fly",
];

export function defaultDestinationsFor(
  format: VisualFormat,
  readyIds: string[],
): string[] {
  // A file IS the deliverable: the CMS has a native image/video field with its own alt-text
  // field. Hosting a PNG in order to iframe it was the wrong idea from the start (spec §2).
  if (deliveryGenreFor(format) === "file") return [PORTABLE_PACKAGE];
  const hosted = HOSTED_PREFERENCE.find((id) => readyIds.includes(id));
  // Never an empty list: `zip` needs no key (lib/newsroom/capabilities.ts, `env: []`), which
  // is what makes "no host configured" a working path rather than a dead end.
  return hosted ? [hosted] : [PORTABLE_PACKAGE];
}
