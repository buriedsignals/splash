// The DECISION that names where an element goes — and the missing producer of
// `delivery.requested`, which until now only tests ever wrote.
//
// Why a decision and not a default inside deliver(): manifest.ts's nextActionsForElement
// locks "deliver is a step a DECISION triggers, never an automatic advance — a fresh artifact
// nobody asked to publish stays on show". An element with no `delivery` slot never routes to
// deliver at all, so a default computed inside deliver() would never run. What becomes
// automatic here is only WHERE it goes, and the answer is written into the manifest rather
// than recomputed later: a default re-derived once Cloudflare is configured would
// retroactively change what had been asked for.
import { fail, ok, type VerbResult } from "../core/verbs/types";
import type { VisualFormat } from "../core/vocabulary";
import { defaultDestinationsFor } from "../delivery/routing";
import { NEWSROOM_CAPABILITIES } from "../newsroom/capabilities";
import { capabilityReadiness } from "../newsroom/readiness";
import { decorEnv, type Decor } from "../newsroom/decor";
import {
  chosenOption,
  stalenessOf,
  type RunElement,
  type RunManifest,
} from "./manifest";

export type RequestDeliveryOpts = {
  /** The journalist's own choice. Absent or empty ⇒ derived from the format's genre. */
  destinations?: string[];
  /** The environment readiness is judged against. Defaults to the decor's (never ambient). */
  env?: Record<string, string | undefined>;
};

export function requestDelivery(
  run: RunManifest,
  el: RunElement,
  decor: Decor,
  opts: RequestDeliveryOpts = {},
): VerbResult<RunElement> {
  if (!el.artifact)
    return fail(
      "invalid-request",
      "request-delivery: nothing produced yet — there is no artifact to send anywhere",
    );
  if (stalenessOf(run, el))
    return fail(
      "invalid-request",
      "request-delivery: the artifact is stale — produce it again before choosing where it goes",
    );
  // The same chosen-option resolution produce.ts and deliver.ts use, never a second lookup.
  const chosen = chosenOption(el);
  if (!chosen)
    return fail(
      "invalid-request",
      `request-delivery: element ${el.id} has an artifact but no resolvable chosen option to read its format from`,
    );
  const format: VisualFormat = chosen.format ?? "static";

  let requested: string[];
  if (opts.destinations && opts.destinations.length > 0) {
    const unknown = opts.destinations.filter(
      (id) => NEWSROOM_CAPABILITIES[id]?.kind !== "delivery",
    );
    if (unknown.length > 0)
      return fail(
        "invalid-request",
        `request-delivery: ${unknown.join(", ")} — not a delivery destination this install knows`,
      );
    requested = opts.destinations;
  } else {
    const env = opts.env ?? decorEnv(decor.root);
    const ready = Object.values(NEWSROOM_CAPABILITIES)
      .filter((cap) => cap.kind === "delivery")
      .filter(
        (cap) =>
          capabilityReadiness(cap, decor.state, { env }).status === "ready",
      )
      .map((cap) => cap.id);
    // The DESTINATION, not just the format: a print deliverable is a file whatever its format
    // (lib/delivery/routing.ts). Absent on every element written before issue #1, and the
    // routing then answers exactly as it did.
    requested = defaultDestinationsFor(format, ready, el.deliverable?.destination);
  }

  // `delivered` is carried forward untouched: a destination that already landed for an older
  // provenance stays on the record, and deliver()'s own pending computation decides what that
  // means. Naming a destination is not a reason to forget what was published.
  return ok({
    ...el,
    delivery: { requested, delivered: el.delivery?.delivered ?? [] },
  });
}
