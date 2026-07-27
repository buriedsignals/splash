// lib/loop/deliverables.ts
// The production PLAN — issue #1's three stages, as code.
//
// CADRAGE used to ask "where will this visual appear?" as a single choice, before the visual
// concept was settled, and the answer welded three different questions into one `channel`.
// This module is the replacement: a multi-select of destinations (stage 1) becomes a set of
// deliverables carried by the run (stage 2), and the shape question is left to the branch that
// needs it (stage 3, confirmAspect / the confirm-aspect gate in manifest.ts).
//
// Every deliverable is an ELEMENT. That is the load-bearing choice, and it is not an
// accommodation: a deliverable needs its own offer, pinned format, artifact, provenance hash,
// review, delivery and gate state, and RunElement is precisely the record that carries those
// eight things with their invariants already written. A parallel `run.deliverables[]` would
// either duplicate that whole lifecycle or quietly give one of the outputs less of it.
import { fail, ok, type VerbResult } from "../core/verbs/types";
import {
  aspectsFor,
  defaultAspectFor,
  destinationOf,
  aspectOf,
  isFormatAllowed,
  DESTINATION_POLICY,
} from "../core/channel-policy";
import {
  DESTINATIONS,
  type Destination,
  type MediaAspect,
  type VisualFormat,
  type Channel,
} from "../core/vocabulary";
import {
  gateStateOf,
  nextActionsForElement,
  resolvedChannelForElement,
  type GateState,
  type NextAction,
  type RunElement,
  type RunManifest,
} from "./manifest";

/** Stage 1's multi-select, in the journalist's own words. */
export const DELIVERABLE_CHOICES = ["web", "video", "social", "print"] as const;
export type DeliverableChoice = (typeof DELIVERABLE_CHOICES)[number];

export type DeliverableRequest = {
  destination: Destination;
  /** Stage 3's answer, when it is already known. Absent ⇒ asked later, on the branch that
   *  needs it. */
  aspect?: MediaAspect;
  /** A format the choice ITSELF names. "Video" is a format request, not a destination — the
   *  brain applies it as a hard filter (lib/brain/eligibility.ts). */
  requestedFormat?: VisualFormat;
};

// The four choices, each mapped onto the axes it actually determines — and, just as importantly,
// each leaving the axes it does NOT determine alone. `social` names no aspect (that is the whole
// point of stage 3) and no format; `web` names no format at all, because which form serves the
// story is the brain's offer and the journalist's choice, not a side effect of saying "web".
const REQUEST_BY_CHOICE: Record<DeliverableChoice, DeliverableRequest> = {
  web: { destination: "article-web" },
  video: { destination: "article-web", requestedFormat: "video" },
  social: { destination: "social" },
  // Print pins static because a page does not hover and does not play. The policy already
  // refuses anything else (CHANNEL_POLICY["print-page"].allowedFormats); pinning it here means
  // the brain never even offers a form the destination would then reject.
  print: { destination: "print", requestedFormat: "static" },
};

export function deliverableRequestFrom(
  choice: DeliverableChoice,
): DeliverableRequest {
  return { ...REQUEST_BY_CHOICE[choice] };
}

function isChoice(
  v: DeliverableChoice | DeliverableRequest,
): v is DeliverableChoice {
  return typeof v === "string";
}

// Two requests are THE SAME deliverable when all three axes agree. Asking for "social" twice in
// one answer is a journalist listing, not a journalist ordering two posts — "never silently
// duplicate or drop one" cuts both ways.
function requestKey(r: DeliverableRequest): string {
  return `${r.destination}|${r.aspect ?? "-"}|${r.requestedFormat ?? "-"}`;
}

// Production order. Issue #1, stage 2: "if web is among several requested outputs, start with the
// web version as the editorial master". The rank is over DESTINATIONS' own declared order
// (article-web, social, print), with a format-less request ahead of a format-pinned one at the
// same destination so "web + video" starts with the web chart rather than with its video.
function rank(r: DeliverableRequest): number {
  return DESTINATIONS.indexOf(r.destination) * 2 + (r.requestedFormat ? 1 : 0);
}

/** A fresh element id that cannot collide with one the run already uses. */
function nextId(taken: Set<string>, sourceId: string, n: number): string {
  let candidate = `${sourceId}-d${n}`;
  let bump = n;
  while (taken.has(candidate)) candidate = `${sourceId}-d${++bump}`;
  return candidate;
}

export type PlanOpts = {
  /** The element the plan hangs off — the master whose takeaway every deliverable shares.
   *  Defaults to the run's first element. */
  sourceElementId?: string;
};

/**
 * Turn a CADRAGE multi-select into the run's deliverables.
 *
 * The master element takes the first request; every other request becomes a SIBLING element
 * carrying `deliverableOf` and a copy of the master's angle — and nothing else. No proposal, no
 * chosen form, no artifact, no delivery is copied across: each deliverable goes through the
 * brain at its OWN channel, which is what makes "one output cannot inherit an incompatible
 * format from another" true by construction rather than by a check.
 */
export function planDeliverables(
  run: RunManifest,
  requests: DeliverableChoice[] | DeliverableRequest[],
  opts: PlanOpts = {},
): VerbResult<RunManifest> {
  if (requests.length === 0)
    return fail(
      "invalid-request",
      "plan-deliverables: name at least one deliverable — an empty plan produces nothing, and saying so is not the same as saying nothing",
    );

  const source = opts.sourceElementId
    ? run.elements.find((el) => el.id === opts.sourceElementId)
    : run.elements[0];
  if (!source)
    return fail(
      "invalid-request",
      opts.sourceElementId
        ? `plan-deliverables: no element "${opts.sourceElementId}" in this run`
        : "plan-deliverables: the run has no element to hang a plan on",
    );

  const resolved = (requests as (DeliverableChoice | DeliverableRequest)[]).map(
    (r) => (isChoice(r) ? deliverableRequestFrom(r) : r),
  );
  for (const r of resolved) {
    if (r.aspect && !aspectsFor(r.destination).includes(r.aspect))
      return fail(
        "invalid-request",
        `plan-deliverables: the "${r.destination}" destination has no "${r.aspect}" shape (it has ${aspectsFor(r.destination).join(", ")})`,
      );
  }

  const seen = new Set<string>();
  const unique = resolved.filter((r) => {
    const key = requestKey(r);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => rank(a) - rank(b));

  const taken = new Set(run.elements.map((el) => el.id));
  // Everything that is NOT this plan's master stays exactly as it is: a run can hold unrelated
  // visuals (their own angle, their own story), and planning deliverables for one of them is no
  // reason to touch the others.
  const others = run.elements.filter((el) => el.id !== source.id);

  const [first, ...rest] = unique;
  // Destructured OUT, not spread over: a plan REPLACES what the element was asked to be. Keeping
  // an older `requestedFormat` because the new plan happens not to name one would leave a "video
  // only" request standing on an element the journalist has just re-planned as plain web.
  const { requestedFormat: _replaced, ...carried } = source;
  const master: RunElement = {
    ...carried,
    deliverable: {
      destination: first!.destination,
      ...(first!.aspect ? { aspect: first!.aspect } : {}),
    },
    ...(first!.requestedFormat
      ? { requestedFormat: first!.requestedFormat }
      : {}),
  };
  // An offer the NEW destination cannot carry has to go. Not a hypothetical: an element that had
  // chosen an interactive and is then re-planned for print would be a manifest assertInvariants
  // refuses to write — the plan would fail on a perfectly legitimate act. Dropping the stale
  // proposal is the way out revise.ts already established: drop the field the next automatic step
  // is conditioned on, and let manifest.ts's own "no proposal ⇒ propose" take it from there.
  const pinned = master.proposal?.chosenId
    ? master.proposal.options.find((o) => o.id === master.proposal!.chosenId)
        ?.format
    : undefined;
  const carriable =
    pinned == null ||
    DESTINATION_POLICY[first!.destination].channels
      .filter((c) => !first!.aspect || aspectOf(c) === first!.aspect)
      .some((c) => isFormatAllowed(c, pinned));
  if (!carriable) delete master.proposal;

  const siblings = rest.map((r, i) => {
    const id = nextId(taken, source.id, i + 2);
    taken.add(id);
    const el: RunElement = {
      id,
      deliverableOf: source.id,
      deliverable: {
        destination: r.destination,
        ...(r.aspect ? { aspect: r.aspect } : {}),
      },
      // The one thing a sibling inherits: the confirmed takeaway. "Treat each output as an
      // explicit deliverable tied to the same confirmed takeaway" (issue #1).
      ...(source.angle ? { angle: source.angle } : {}),
      ...(r.requestedFormat ? { requestedFormat: r.requestedFormat } : {}),
    };
    return el;
  });

  return ok({ ...run, elements: [master, ...siblings, ...others] });
}

/** Stage 3's writer: record the shape, once the journalist has been asked for it. */
export function confirmAspect(
  el: RunElement,
  aspect: MediaAspect,
): VerbResult<RunElement> {
  if (!el.deliverable)
    return fail(
      "invalid-request",
      `confirm-aspect: element ${el.id} declares no deliverable, so there is no destination to shape`,
    );
  const legal = aspectsFor(el.deliverable.destination);
  if (!legal.includes(aspect))
    return fail(
      "invalid-request",
      `confirm-aspect: "${aspect}" is not a shape the "${el.deliverable.destination}" destination carries — it carries ${legal.join(", ")}`,
    );
  return ok({ ...el, deliverable: { ...el.deliverable, aspect } });
}

export type DeliverableRow = {
  elementId: string;
  destination: Destination;
  /** The shape, once known. Undefined while the branch still owes the answer. */
  aspect?: MediaAspect;
  /** The render channel it resolves to. Undefined for the same reason. */
  channel?: Channel;
  /** The pinned format, once a form is chosen. */
  format?: VisualFormat;
  gateState: GateState;
  nextActions: NextAction[];
  /** false ⇒ this row was READ OFF the run's default channel, not declared by the element
   *  (every manifest written before issue #1). */
  declared: boolean;
  /** The master this deliverable belongs to, when it is a sibling. */
  deliverableOf?: string;
  /** true ⇒ this sibling's takeaway no longer matches its master's. Reported rather than
   *  refused: revising one element's angle is a legitimate act, and a manifest that could not
   *  be written after it would strand the run. */
  takeawayDrift: boolean;
};

/**
 * The final report: one row per deliverable, in production order.
 *
 * "Every requested deliverable appears in the accepted production plan and final report"
 * (issue #1). Derived from the elements themselves — never from a second list that could fall
 * out of step with what the run actually carries.
 */
export function deliverablePlan(run: RunManifest): DeliverableRow[] {
  const byId = new Map(run.elements.map((el) => [el.id, el]));
  return run.elements.map((el) => {
    const declared = el.deliverable != null;
    const destination = declared
      ? el.deliverable!.destination
      : destinationOf(run.channel);
    const channel = resolvedChannelForElement(run, el);
    const aspect = declared
      ? (el.deliverable!.aspect ?? defaultAspectFor(destination))
      : aspectOf(run.channel);
    const master = el.deliverableOf ? byId.get(el.deliverableOf) : undefined;
    const chosen = el.proposal?.chosenId
      ? el.proposal.options.find((o) => o.id === el.proposal!.chosenId)
      : undefined;
    return {
      elementId: el.id,
      destination,
      ...(aspect ? { aspect } : {}),
      ...(channel ? { channel } : {}),
      ...(chosen?.format ? { format: chosen.format } : {}),
      gateState: gateStateOf(run, el),
      nextActions: nextActionsForElement(run, el),
      declared,
      ...(el.deliverableOf ? { deliverableOf: el.deliverableOf } : {}),
      takeawayDrift:
        master != null &&
        master.angle != null &&
        el.angle != null &&
        master.angle.confirmedTakeaway !== el.angle.confirmedTakeaway,
    };
  });
}
