// The DEFAULT half of the genre routing (spec §3.3). It answers "where does this go when the
// journalist did not name a destination" — never "is this destination legal", which is
// lib/loop/deliver.ts's half.
//
// PURE: the ready destination ids are passed in, never read from the environment or from a
// decor (invariant I5). The caller — lib/loop/request-delivery.ts — owns that resolution.
import { deliveryGenreFor } from "../core/publishers";
import type { Destination, VisualFormat } from "../core/vocabulary";

/** The portable package: no key, always ready, therefore always a possible answer. */
export const PORTABLE_PACKAGE = "zip";

/** The hand-over of a deliverable that is ALREADY published: no key, always ready, and the only
 *  answer for an artifact the run owns no bytes of. */
export const HOSTED_EMBED = "embed-hosted";

// A DECLARED order, not the registry's iteration order: a default that depends on which
// adapter file happened to be imported first is a default that moves when an import moves.
//
// Leading with unimplemented ids ("embed-cms", "embed-fly") is safe: this module is pure and
// only picks among `readyIds`, and lib/newsroom/readiness.ts returns "disabled" for any
// capability with `implemented: false` — request-delivery.ts's caller can therefore never put
// an unimplemented id in `readyIds` in the first place. A caller that ignores that and passes
// every known capability id would still get "embed-cms" back and dead-end at
// `unknown-publisher` in deliver(); nothing here defends against that, readiness.ts does.
export const HOSTED_PREFERENCE: readonly string[] = [
  "embed-cms",
  "embed-cloudflare",
  "embed-s3",
  "embed-fly",
];

export type DefaultDestinationOpts = {
  /** The deliverable is ALREADY published — a Datawrapper interactive, live on Datawrapper's own
   *  CDN with no file the run owns (lib/loop/manifest.ts's hosted artifact record). Passed as a
   *  FACT about the artifact rather than read from one, because this module is pure and knows
   *  nothing of a manifest; lib/loop/request-delivery.ts owns that resolution the same way it
   *  owns `readyIds`. */
  alreadyPublished?: boolean;
};

export function defaultDestinationsFor(
  format: VisualFormat,
  readyIds: string[],
  destination?: Destination,
  opts: DefaultDestinationOpts = {},
): string[] {
  // ALREADY LIVE: there is nothing to send anywhere. The hand-over is the address plus the embed
  // code (lib/delivery/adapters/hosted-embed.ts), and re-hosting a copy of a Datawrapper chart at
  // a second address would give the newsroom two embeds that disagree the moment the chart is
  // corrected. Above the print branch on purpose: a published embed cannot be handed to a printer
  // as a file either — the file does not exist — so "print" would name a package nobody can build.
  //
  // EMPTY when the hand-over is not enabled, and that is the one place this function may return
  // nothing. "Needs no key" is not "is enabled": HOSTED_EMBED is always READY (no env to be
  // missing) but a newsroom can still turn it off, and answering with a destination the newsroom
  // disabled would put an id in `delivery.requested` that readiness then refuses on every call.
  // There is no fallback to fall back TO — `zip` and every other destination ship bytes this
  // artifact has none of — so the honest answer is nothing, and lib/loop/request-delivery.ts
  // turns it into a refusal that NAMES the disabled capability rather than an empty request that
  // silently reads as "delivered nowhere".
  if (opts.alreadyPublished)
    return readyIds.includes(HOSTED_EMBED) ? [HOSTED_EMBED] : [];
  // A print deliverable is a FILE — there is no URL on a page. Today this is also true by way
  // of the format (print carries `static` only, and static is of the file genre), so this line
  // changes no current answer. It is written anyway, and above the genre test, because the rule
  // belongs to the DESTINATION: "hosting is a property of the format" is the right model for
  // screen channels, and print is the one destination where it is the wrong question entirely.
  // Leaving it implicit would make the day a printable non-file format appears a silent
  // regression rather than a no-op.
  if (destination === "print") return [PORTABLE_PACKAGE];
  // A file IS the deliverable: the CMS has a native image/video field with its own alt-text
  // field. Hosting a PNG in order to iframe it was the wrong idea from the start (spec §2).
  if (deliveryGenreFor(format) === "file") return [PORTABLE_PACKAGE];
  const hosted = HOSTED_PREFERENCE.find((id) => readyIds.includes(id));
  // Never an empty list: `zip` needs no key (lib/newsroom/capabilities.ts, `env: []`), which
  // is what makes "no host configured" a working path rather than a dead end.
  return hosted ? [hosted] : [PORTABLE_PACKAGE];
}
