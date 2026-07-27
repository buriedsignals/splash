// DeliveryMetadata, derived from what the run already holds — never invented.
//
// PURE, and deliberately decoupled from the newsroom profile's own type: the caller reads
// NEWSROOM-PROFILE.md and hands the three facts down. That is what keeps lib/delivery free of
// any dependency on skills/.
import type { DeliveryMetadata } from "../core/publishers";
import { fail, ok, type VerbResult } from "../core/verbs/types";
import type { RunElement } from "../loop/manifest";
// The LEDGER TYPE only, from lib/source — never lib/loop's manifest: that is what keeps this
// module free of the loop while still speaking about the run's declared sources.
import type { SourceLedger } from "../source/kinds";
import { publicSourceView } from "../source/redact";

export type ProfileFacts = { source?: string; credit?: string; lang?: string };
export type DeliverySizing = { width?: number; height?: number | "responsive" };

const NEUTRAL_SOURCE = "Provided by the newsroom";

export function deliveryMetadata(
  el: RunElement,
  profile: ProfileFacts,
  sizing: DeliverySizing,
  /**
   * The run's declared source ledger. When present it is the ONLY thing that answers "where did
   * these figures come from" — `profile.source` was the second fabricated attribution in this
   * codebase (the newsroom's own name, read off NEWSROOM-PROFILE.md, standing in for the origin
   * of the data). A newsroom is the AUTHOR of a visual; that is `credit`.
   *
   * Optional, and its absence keeps the old profile fallback, for the callers that have no run
   * at all (a host composing metadata directly, a unit test). That path is unreachable from the
   * loop: produce() refuses an undeclared run, and provenanceHash covers the ledger, so an
   * artifact built without one is stale and deliver() turns it away before reaching here.
   */
  sources?: SourceLedger,
): VerbResult<DeliveryMetadata> {
  if (!el.angle)
    return fail(
      "invalid-request",
      `metadata: element ${el.id} has no confirmed angle to describe`,
    );
  // The alt text is REQUIRED by DeliveryMetadata for a reason: chart-native refuses to produce
  // without one (WCAG 1.1.1), and that refusal must not be quietly recovered at packaging time.
  if (el.angle.altInsight.trim() === "")
    return fail(
      "invalid-request",
      `metadata: element ${el.id} carries a blank alt text — the accessibility description cannot be empty`,
    );
  // Same reasoning, symmetric field: the schema guarantees confirmedTakeaway EXISTS, not that
  // it says anything. A blank title is as visible to a reader as a blank alt text is to a
  // screen-reader user, so it gets the same pre-construction refusal.
  if (el.angle.confirmedTakeaway.trim() === "")
    return fail(
      "invalid-request",
      `metadata: element ${el.id} carries a blank confirmed takeaway — the title cannot be empty`,
    );
  // The outward projection, built by allow-list — a private internalRef has no path into it
  // (lib/source/redact.ts). It REFUSES rather than redacting silently: publishing a half-valid
  // source is the failure this module exists to remove, and a delivery is the last moment it
  // could still be caught. `attribution`, not `credit`: the packagers write their own label
  // (lib/delivery/adapters/zip.ts: `Source: ${m.source}`), so the prefixed form would double it.
  let source = profile.source?.trim() || NEUTRAL_SOURCE;
  if (sources) {
    const view = publicSourceView(sources, profile.lang?.trim() || "en");
    if (!view.ok)
      return fail("invalid-request", `metadata: ${view.code}: ${view.message}`);
    if (!view.value.data)
      return fail(
        "invalid-request",
        `metadata: source-undeclared: this run declares no source for its data — the newsroom profile names the author, never the origin of the figures`,
      );
    source = view.value.data.attribution;
  }
  return ok({
    title: el.angle.confirmedTakeaway,
    altText: el.angle.altInsight,
    // `||` vs `??` here are deliberately different jobs, not an inconsistency: a blank lang
    // should fall back to English same as an absent one (`||`), but credit's fallback IS the
    // empty string, so an absent credit and a blank credit must land on the same "" either way
    // (`??` reads identically here because the RHS is "" — do not "normalize" this to `||`/`??`
    // uniformly, it would change behaviour for source/lang).
    source,
    credit: profile.credit?.trim() ?? "",
    lang: profile.lang?.trim() || "en",
    ...(sizing.width !== undefined ? { width: sizing.width } : {}),
    ...(sizing.height !== undefined ? { height: sizing.height } : {}),
  });
}
