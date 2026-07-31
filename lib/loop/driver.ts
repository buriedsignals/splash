import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  appendEvent,
  deadEndReason,
  liveElementFor,
  nextActions,
  type NextAction,
  type RunElement,
  type RunManifest,
} from "./manifest";
import { tryLoadDecor, type Decor } from "../newsroom/decor";
import { draftBeats } from "./beats";
import { deliver } from "./deliver";
import { orient } from "./orient";
import { propose } from "./propose";
import { produce } from "./produce";
import { previewStep } from "./preview";
import { captureStep, reviewStep } from "./verify";

// How much of a refusal the ledger keeps. A manifest is persisted JSON that accumulates events,
// so the message is bounded — but bounded from the END, not the start.
//
// A verb's own refusal is one sentence and fits whole. An ENGINE refusal does not: it arrives as
// a subprocess dump (lib/core/verbs/exec.ts tails 30 lines of stdout and 30 of stderr) whose
// reason is its LAST lines, everything above being the producer's ordinary progress log. This
// used to be `rawMessage.slice(0, 200)` — exactly the uninformative head. A failed
// connected-scatter video render was recorded as "conformance: OK (0 violations)" plus an
// informational render-size line, while the sentence naming the cause (a Remotion browser
// download that never completed) was cut off entirely; the event pointed the reader at the last
// line that FIT rather than the line that failed, and cost an hour of misdirected diagnosis.
export const MAX_EVENT_MESSAGE_CHARS = 2000;
const CUT_MARKER = "…\n";

/** Bound a refusal for the ledger, keeping its END — and saying so when anything was dropped,
 *  so a tail is never read as if it were the whole story. */
export function boundEventMessage(
  raw: string,
  max = MAX_EVENT_MESSAGE_CHARS,
): string {
  if (raw.length <= max) return raw;
  return CUT_MARKER + raw.slice(-(max - CUT_MARKER.length));
}

// What one advance actually did. `advance()` answers with a manifest alone, which cannot
// distinguish a refused step from a completed one — the refusal goes into the ledger as a bounded
// event and the manifest comes back either way. In-process that is fine (the caller can read
// `events`); for a host outside JavaScript looping on "advance until there is nothing left" it is
// a silent infinite loop, because a refused produce leaves nextActions answering ["produce"]
// forever. So the step reports itself.
export type StepOutcome = {
  run: RunManifest;
  /** The deterministic step that ran, or null when the next action is a HUMAN turn
   *  (confirm-angle, choose-form, show) or there is nothing valid to do at all. */
  ran: NextAction | null;
  /** Set when a step was attempted and refused. `message` is the SAME string appended to
   *  run.events — one truth, not a second wording of it. */
  failure?: { action: NextAction; message: string };
};

// State-driven: read the manifest, ask nextActions() what is valid, run the matching
// deterministic step on the live element (elements[0]). Human decisions (confirm-angle,
// choose-form, revise) are supplied by the caller between advances.
// The decor defaults to this install's own (production ergonomics: no caller has to thread
// it), through the never-throwing resolver — a default parameter is evaluated before the
// body, so a decor that threw here would escape `advance` ahead of every bounded-failure
// path it owns, against the loop's never-throw discipline.
export async function advanceStep(
  run: RunManifest,
  runDir: string,
  decor: Decor = tryLoadDecor(),
): Promise<StepOutcome> {
  const [next] = nextActions(run);
  // `elements: []` is valid per RunManifestSchema, so the live element is OPTIONAL here.
  // Every branch below reads it defensively: `orient` runs at run level and only needs the
  // element to attribute a failure event (RunEvent.elementId is itself optional), while the
  // element-driven branches have nothing to act on without one.
  //
  // The element `nextActions` ANSWERED ABOUT, never elements[0]: a run carries several
  // deliverables now (issue #1), so with the first one produced and the second not, nextActions
  // says "produce" about the SECOND. Acting on elements[0] here would re-produce something
  // already fresh — or, worse, refuse — while the action that was reported never runs, and the
  // loop would advance forever without moving.
  const live: RunElement | undefined = liveElementFor(run);
  const liveIndex = live ? run.elements.indexOf(live) : -1;
  // Replace the live element IN PLACE. `[result, ...rest]` moved the acted-on element to the
  // front, which silently reordered the deliverables — and the order is meaningful: it is the
  // production order the plan chose (web first, as the editorial master).
  const withLive = (el: RunElement): RunElement[] =>
    run.elements.map((e, i) => (i === liveIndex ? el : e));
  /**
   * A refusal in the ledger — recorded ONCE, in two senses.
   *
   * The ledger entry and the outcome carry the same already-bounded string, so the two can never
   * tell a caller two different stories. And a refusal IDENTICAL to the ledger's LAST entry is
   * not appended a second time.
   *
   * Why the collapse. Nothing about a refusal makes the state advance: `nextActions` answers the
   * same action, the same step refuses the same way, and an autonomous runner appends the same
   * event on every turn — a destination nobody configured, an input that is not on disk. The
   * ledger is capped at 50 entries and the loop is not, so the cap does not merely bound the
   * noise: it EVICTS the run's real history and leaves fifty copies of one fact where the
   * transitions used to be. Nothing is lost by collapsing them — the reason is a pure function of
   * a state that has not changed, and `StepOutcome.failure` still carries it to the caller on
   * every single turn, which is the signal a runner terminates on.
   *
   * Only against the LAST entry, never a search of the whole ledger: two refusals with something
   * else in between are two things that happened, and the run should say so in order.
   */
  const recordFailure = (
    action: NextAction,
    message: string,
    elementId?: string,
  ): RunManifest => {
    const last = run.events.at(-1);
    const repeat =
      last?.kind === "failure" &&
      last.action === action &&
      last.elementId === elementId &&
      last.message === message;
    return repeat
      ? run
      : appendEvent(run, {
          at: new Date().toISOString(),
          kind: "failure",
          ...(elementId ? { elementId } : {}),
          action,
          message,
        });
  };
  const refused = (
    action: NextAction,
    rawMessage: string,
    elementId?: string,
  ): StepOutcome => {
    const message = boundEventMessage(rawMessage);
    return {
      run: recordFailure(action, message, elementId),
      ran: action,
      failure: { action, message },
    };
  };
  switch (next) {
    case "orient": {
      let data: string;
      try {
        data = readData(run, runDir);
      } catch (e) {
        return refused("orient", (e as Error).message, live?.id);
      }
      return { run: { ...run, orient: orient(data) }, ran: "orient" };
    }
    case "propose": {
      // Unreachable through nextActions (an empty elements array routes to confirm-angle), and
      // still defensive: nothing ran, so it reports nothing ran rather than claiming a step.
      if (!live) return { run, ran: null };
      const { options, excluded, refusal } = propose(run, live, decor);
      return {
        run: {
          ...run,
          elements: withLive({
            ...live,
            // Conditional, not `refusal: refusal` — an element with nothing refused keeps
            // exactly the proposal shape it had before this field existed (no `refusal:
            // undefined` key riding along; nothing here hashes or walks the object's own
            // key set, but the rest of this codebase's discipline is to never introduce a
            // present-but-empty marker where "absent" already says the same thing).
            proposal: { options, excluded, ...(refusal ? { refusal } : {}) },
          }),
        },
        ran: "propose",
      };
    }
    // THE ARTICLE BRANCH's deterministic half. `draft-beats` hands over a walk whose every claim
    // is UNWRITTEN — the brain grounds, the desk writes — so running it here can never put a
    // machine's sentence under a journalist's byline. Its human half, `author-beats`, falls
    // through to the `default:` below with confirm-angle and choose-form, exactly like `approve`.
    //
    // Synchronous, in the shape of `preview`: drafting is a read of the frozen input and a pass
    // over the brain's own salience, never an engine.
    case "draft-beats": {
      if (!live) return { run, ran: null };
      const result = draftBeats(run, live, runDir);
      if (result.ok)
        return {
          run: { ...run, elements: withLive(result.value) },
          ran: "draft-beats",
        };
      return refused("draft-beats", result.message, live.id);
    }
    case "produce": {
      if (!live) return { run, ran: null };
      const result = await produce(run, live, runDir);
      if (result.ok)
        return {
          run: { ...run, elements: withLive(result.value) },
          ran: "produce",
        };
      // A refusal is DATA now, not an exception: the verb never throws, so the driver
      // records the bounded failure event directly.
      return refused("produce", result.message, live.id);
    }
    // The verification chain (lib/verify, wired here). Deterministic, one per advance, exactly
    // like produce: the artifact is measured at its publication container, the measurements
    // become severity-bearing findings, and the deliverable is presented before anyone is
    // asked to approve it. `approve` itself is NOT here — it is a human turn, and it falls
    // through to the `default:` below with confirm-angle and choose-form.
    case "capture": {
      if (!live) return { run, ran: null };
      const result = await captureStep(run, live, runDir);
      if (result.ok)
        return {
          run: { ...run, elements: withLive(result.value) },
          ran: "capture",
        };
      return refused("capture", result.message, live.id);
    }
    case "review": {
      if (!live) return { run, ran: null };
      const result = await reviewStep(run, live, runDir);
      if (result.ok)
        return {
          run: { ...run, elements: withLive(result.value) },
          ran: "review",
        };
      return refused("review", result.message, live.id);
    }
    case "preview": {
      if (!live) return { run, ran: null };
      // Synchronous: presenting is a spawn and a hash, not an engine. Kept in the same shape
      // as its neighbours so the switch reads as one thing.
      const result = previewStep(run, live, runDir);
      if (result.ok)
        return {
          run: { ...run, elements: withLive(result.value) },
          ran: "preview",
        };
      return refused("preview", result.message, live.id);
    }
    case "deliver": {
      if (!live) return { run, ran: null };
      const result = await deliver(run, live, runDir, decor);
      if (result.ok)
        return {
          run: { ...run, elements: withLive(result.value) },
          ran: "deliver",
        };
      return refused("deliver", result.message, live.id);
    }
    default: {
      // confirm-angle / phrase / choose-form / confirm-aspect / author-beats /
      // resolve-geo-join / approve / show / [] are human turns —
      // EXCEPT one, which only looks like one. A chosen form nothing can build routes back to
      // "choose-form", and reported as a plain human turn it is indistinguishable from an offer
      // waiting to be chosen from: a runner looping on advance waits forever on a journalist who
      // has already decided, and a manifest re-read afterwards shows `chosen → choose-form` with
      // no trace of the refusal. The ledger is meant to be the whole story of a run.
      //
      // Through recordFailure, so the once-only rule is the same one every refused step follows.
      // `ran` stays null: no deterministic step was attempted here, which is exactly what makes
      // this different from the branches above.
      const stuck =
        next === "choose-form" && live ? deadEndReason(live) : undefined;
      if (!stuck) return { run, ran: null };
      const message = boundEventMessage(stuck);
      return {
        ran: null,
        failure: { action: next, message },
        run: recordFailure(next, message, live!.id),
      };
    }
  }
}

// The manifest-only shape every existing caller uses. Kept as the wrapper rather than replaced:
// changing advance()'s signature would reach into test files this sub-project does not own, and
// the manifest IS the whole answer for a caller that can read `events` itself.
export async function advance(
  run: RunManifest,
  runDir: string,
  decor: Decor = tryLoadDecor(),
): Promise<RunManifest> {
  return (await advanceStep(run, runDir, decor)).run;
}

function readData(run: RunManifest, runDir: string): string {
  if (!run.input.data)
    throw new Error("advance: no frozen data input to orient");
  return readFileSync(join(runDir, run.input.data.path), "utf8");
}
