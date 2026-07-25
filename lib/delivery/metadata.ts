// DeliveryMetadata, derived from what the run already holds — never invented.
//
// PURE, and deliberately decoupled from the newsroom profile's own type: the caller reads
// NEWSROOM-PROFILE.md and hands the three facts down. That is what keeps lib/delivery free of
// any dependency on skills/.
import type { DeliveryMetadata } from "../core/publishers";
import { fail, ok, type VerbResult } from "../core/verbs/types";
import type { RunElement } from "../loop/manifest";

export type ProfileFacts = { source?: string; credit?: string; lang?: string };
export type DeliverySizing = { width?: number; height?: number | "responsive" };

const NEUTRAL_SOURCE = "Provided by the newsroom";

export function deliveryMetadata(
  el: RunElement,
  profile: ProfileFacts,
  sizing: DeliverySizing,
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
  return ok({
    title: el.angle.confirmedTakeaway,
    altText: el.angle.altInsight,
    source: profile.source?.trim() || NEUTRAL_SOURCE,
    credit: profile.credit?.trim() ?? "",
    lang: profile.lang?.trim() || "en",
    ...(sizing.width !== undefined ? { width: sizing.width } : {}),
    ...(sizing.height !== undefined ? { height: sizing.height } : {}),
  });
}
