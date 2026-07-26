import type { RunElement } from "./manifest";

export type ReviseChange =
  | { kind: "emphasis"; emphasis: string }
  | { kind: "takeaway"; confirmedTakeaway: string; altInsight: string }
  | { kind: "clear-requested-format" };

// A back-edge: the journalist changes the angle after seeing the visual. We update the
// element's angle; its provenance no longer matches the artifact, so stalenessOf() flips
// true and nextActions() routes back to produce. Staleness is derived — we do NOT delete
// the old artifact here.
export function revise(el: RunElement, change: ReviseChange): RunElement {
  // A requested format can be channel-legal and still leave zero buildable candidates
  // (lib/brain/eligibility.ts's refusal for that dead end) — chosenId then names an option
  // nothing can build, and nextActionsForElement routes back to choose-form forever with no
  // NextAction verb to escape it. Clearing the request is the way out, and it follows the
  // SAME invalidation mechanism the angle-changing branches below already use: not by hand-
  // deleting an artifact or inventing a "stale proposal" flag, but by dropping the field the
  // next automatic step is conditioned on and letting an EXISTING rule take it from there.
  // Here that rule is manifest.ts's own "no proposal -> propose" (nextActionsForElement),
  // which sends the run back to a fresh offer built with no requestedFormat constraint —
  // the same offer-overwrite driver.ts's "propose" case already performs on every re-propose
  // (it never carries a stale chosenId forward either). No angle is required: a request can
  // be cleared before CADRAGE ever confirms one, unlike emphasis/takeaway, which revise the
  // angle itself and therefore need one to exist first.
  if (change.kind === "clear-requested-format") {
    const { requestedFormat: _dropped, proposal: _stale, ...rest } = el;
    return rest;
  }
  if (!el.angle)
    throw new Error("revise: nothing to revise before an angle exists");
  const angle =
    change.kind === "emphasis"
      ? { ...el.angle, emphasis: change.emphasis }
      : {
          ...el.angle,
          confirmedTakeaway: change.confirmedTakeaway,
          altInsight: change.altInsight,
        };
  return { ...el, angle };
}
