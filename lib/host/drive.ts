// The half of the façade that ACTS on a run: one deterministic loop step, and the two decisions
// only the journalist can make.
//
// Until this file existed, `next` could answer ["deliver"] and nothing in the façade could carry
// it out — a host outside JavaScript could read the loop but never drive it, and the only carrier
// of a decision was prose telling a model to hand-edit run.json. Each function here is the
// mechanical counterpart of one of those prose instructions.
//
// The discipline is state.ts's, one step further: the run directory is the whole state, a failure
// is a VALUE (never a throw), and the same `loadRun` decides what a readable run is. What changes
// is that these commands WRITE — and only ever into the run.json the caller named, plus the
// artifacts the loop's own steps produce beneath it.
import { join } from "node:path";
import { confirmAngle, type AngleParts } from "../loop/angle";
import { chooseForm } from "../loop/choose";
import { advanceStep } from "../loop/driver";
import { initRun } from "../loop/init";
import {
  gateStateOf,
  liveElementFor,
  nextActions,
  stalenessOf,
  writeManifest,
  type RunElement,
  type RunManifest,
} from "../loop/manifest";
import { applyPhrasing } from "../loop/phrase";
import { requestDelivery } from "../loop/request-delivery";
import { tryLoadDecor } from "../newsroom/decor";
import { loadRun, type HostResponse } from "./state";
import type { VerbResult } from "../core/verbs/types";

// WHICH element a command acts on. Two ways in, and the default is the load-bearing one.
//
// This was `run.elements[0]`, written when a run held one element and the loop parked multi-
// element aggregation. Issue #1 unparked it: a story now carries an article-web master and its
// social/print siblings, `nextActions` aggregates across them, and the driver advances the one it
// ANSWERED ABOUT. The façade kept writing to the first, so `next` could say "choose-form" about
// the second deliverable while every command wrote to the master — deciding about one element
// while reporting about another.
//
// The default is `liveElementFor`, the loop's OWN answer to "which element is next talking
// about", never a positional guess: an implicit first is exactly how this hole was born, and the
// same resolver the driver uses means the façade cannot drift from it again. A caller that needs
// another one names it — the terminal master is unreachable by default precisely because it is
// finished, and re-opening it is a deliberate act.
function selectElement(
  run: RunManifest,
  elementId?: string,
): { el: RunElement } | { fail: { code: "invalid-request"; message: string } } {
  if (elementId === undefined) {
    const live = liveElementFor(run);
    return live
      ? { el: live }
      : {
          fail: {
            code: "invalid-request",
            message: "this run holds no element to decide about",
          },
        };
  }
  const named = run.elements.find((e) => e.id === elementId);
  // Naming one that is not there is a REFUSAL that lists what is, never a silent fall back to
  // the live one: a host that mistypes an id would otherwise decide about the wrong deliverable
  // and be told it succeeded.
  return named
    ? { el: named }
    : {
        fail: {
          code: "invalid-request",
          message: `this run holds no element "${elementId}" — it holds ${run.elements
            .map((e) => `"${e.id}"`)
            .join(", ")}`,
        },
      };
}

// Write the run, then answer with what the command did PLUS what became valid — a host that
// acts always learns the new state in the same breath, without a second `next` call.
function persist(
  runDir: string,
  run: RunManifest,
  did: Record<string, unknown>,
): HostResponse {
  try {
    writeManifest(join(runDir, "run.json"), run);
  } catch (e) {
    // writeManifest asserts the manifest's own invariants before it touches the disk, and the
    // disk can refuse a write for reasons of its own. Either way the run on disk is unchanged,
    // and the answer is a value.
    return {
      ok: false,
      code: "invalid-run",
      message: `the run could not be written: ${(e as Error)?.message ?? String(e)}`,
    };
  }
  return { ok: true, value: { ...did, nextActions: nextActions(run) } };
}

// A decision's refusal is a VerbResult — an `invalid-request` from the loop, not a façade error.
// It is passed through UNCHANGED rather than re-coded as a host error: the codes a host meets are
// declared in two families for exactly this reason (`errorCodes.verb` / `errorCodes.host`), and
// re-labelling would lose which one answered.
function refusedDecision(
  result: VerbResult<unknown> & { ok: false },
): HostResponse {
  return { ok: false, code: result.code, message: result.message };
}

/**
 * CREATE a run from a declaration — the one command that does not load one first.
 *
 * Everything else in this file needs a run to exist; this is the step that had no caller at all.
 * `freezeInput` had exactly one production caller (lib/loop/migrate.ts, converting an OLD
 * manifest), so a host outside JavaScript could read and drive a run it could not begin — and
 * skills/splash/SKILL.md's "never hand-edit run.json" named the only path that existed.
 */
export function initRunIn(runDir: string, declaration: unknown): HostResponse {
  const created = initRun(runDir, declaration);
  if (!created.ok) return refusedDecision(created);
  // Same breath as every acting command: what it did, plus what became valid. The run was just
  // written by initRun itself, so there is nothing to persist here — which is why this is the
  // one acting command that does not go through `persist`.
  return {
    ok: true,
    value: {
      runId: created.value.runId,
      nextActions: nextActions(created.value),
    },
  };
}

/**
 * Run the ONE deterministic step `nextActions` says is valid (orient · propose · produce ·
 * deliver), and persist the result. Human turns are refused, naming the command that performs
 * them — the façade can do what `next` says is valid, or say who can.
 */
export async function advanceRun(runDir: string): Promise<HostResponse> {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  const before = nextActions(loaded.run);

  let outcome;
  try {
    outcome = await advanceStep(loaded.run, runDir, tryLoadDecor());
  } catch (e) {
    // The loop's steps promise never to throw; this catch is the façade refusing to depend on
    // that promise holding for every future step, in a process whose only contract is a JSON
    // document and an exit code.
    return {
      ok: false,
      code: "internal",
      message: `the loop step failed unexpectedly: ${(e as Error)?.message ?? String(e)}`,
    };
  }

  if (outcome.ran === null)
    return {
      ok: false,
      code: "step-refused",
      message: nothingToRun(before, loaded.run),
    };

  if (outcome.failure) {
    // The refusal is persisted before it is reported: the bounded failure event is part of the
    // run's ledger, exactly as it is when the driver runs in-process. Losing it would make a
    // host's run quieter about its own failures than an in-process one.
    const written = persist(runDir, outcome.run, {});
    if (!written.ok) return written;
    return {
      ok: false,
      code: "step-refused",
      message: `${outcome.failure.action}: ${outcome.failure.message}`,
    };
  }

  return persist(runDir, outcome.run, { ran: outcome.ran });
}

// Which human turn is owed, in the host's own vocabulary. `next` already told the host what is
// valid; this says who PERFORMS it, which is the piece a host cannot derive from the action name
// alone. Every human turn now has a command behind it — `confirm-angle` used to end with "and no
// façade command records it yet", which was the honest report of a hard stop at step 2 of 6.
function nothingToRun(
  next: ReturnType<typeof nextActions>,
  run: RunManifest,
): string {
  const [action] = next;
  if (action === "phrase")
    return (
      "advance: the next act is the desk's — the offer is still unwritten, so write each form's " +
      'why from its own grounding with "phrase --run <dir> < phrasing.json" (read the offer, ' +
      "including whySource, from state --run <dir>)"
    );
  if (action === "choose-form")
    return 'advance: the next act is the journalist\'s — choose a form with "choose-form --run <dir> --option <id>"';
  if (action === "confirm-angle")
    return (
      "advance: the next act is the journalist's — confirm the angle with " +
      '"confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s>"'
    );
  if (action === "show") {
    // "show" covers two very different situations, and telling them apart is the difference
    // between a useful answer and a wrong one: an element that has already been published sits
    // here too (delivery satisfied ⇒ no pending destination ⇒ back to show), and inviting the
    // host to request a delivery it just completed reads as a loop. Found by running the
    // sequence through to the end, not by reading it.
    const el = liveElementFor(run);
    if (el && gateStateOf(run, el) === "delivered")
      return "advance: the visual is fresh and every destination it asked for has been published — there is nothing left to run";
    return 'advance: the visual is ready and fresh — there is nothing left to run. Decide where it goes with "request-delivery --run <dir>" to make a delivery step valid';
  }
  return "advance: nothing is valid to do on this run — read it with state --run <dir>";
}

/**
 * Record the CONFIRMED ANGLE, and persist it.
 *
 * The four parts arrive as named flags, never as a document: the host answers one of four known
 * questions and never names a key, which is what keeps this from being the "write arbitrary prose
 * into the manifest" command the decision-surface slice was right to refuse. lib/loop/angle.ts
 * holds the refusals and the reasoning.
 */
export function confirmAngleIn(
  runDir: string,
  parts: AngleParts,
  elementId?: string,
): HostResponse {
  return decide(runDir, elementId, (run, el) => {
    const confirmed = confirmAngle(el, parts);
    if (!confirmed.ok) return confirmed;
    // What this decision INVALIDATED, said out loud. Re-confirming is legitimate (it is
    // lib/loop/revise.ts's back-edge), and the angle is in provenanceHash — so a fresh artifact
    // becomes stale and the run goes back through produce. The parity spec parked exactly this
    // omission for `--element` ("nothing warns the host that its decision cancels finished
    // work"); a silently destructive decision has no place on a surface whose every other
    // answer is explicit. Absent, never `staled: false`, when there was nothing to stale.
    const staled =
      el.artifact != null &&
      !stalenessOf(run, el) &&
      stalenessOf(run, confirmed.value);
    return {
      ok: true,
      value: confirmed.value,
      report: { confirmed: el.id, ...(staled ? { staled: true } : {}) },
    };
  });
}

/**
 * Write the OFFER's prose, and persist it — the production caller `applyPhrasing` never had.
 *
 * `lib/loop/phrase.ts` calls itself "the PHRASING SEAM, made real" and is the one path that
 * writes a `why`; it had no caller outside a test, so on every real run the three offered forms
 * carried a filled `whySource` and `why: ""`. The brain's central promise — explain WHY, in the
 * journalist's language — produced nothing anywhere.
 *
 * Why free prose may have a command HERE, when the angle needed four named slots for it (§4.2 of
 * the design): this prose is VERIFIED. verifyOffer checks the ids, the count, the exact order,
 * the discards presented as offered, the structural acknowledgement of every mark — and that
 * every NUMBER in the sentence comes from that option's own grounding. applyPhrasing then adds
 * the one check the guard deliberately skips: a blank `why` is refused. The host is not writing
 * anywhere it likes; it is filling one sentence per offered form, in the offer's own order.
 */
export function phraseOfferIn(
  runDir: string,
  phrased: unknown,
  elementId?: string,
): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  const selected = selectElement(loaded.run, elementId);
  if ("fail" in selected) return { ok: false, ...selected.fail };

  // Shape first, so the guard is met with the list it expects rather than with a TypeError.
  if (
    !Array.isArray(phrased) ||
    phrased.some(
      (p) =>
        p == null ||
        typeof p !== "object" ||
        typeof (p as { id?: unknown }).id !== "string" ||
        typeof (p as { why?: unknown }).why !== "string",
    )
  )
    return {
      ok: false,
      code: "invalid-request",
      message:
        "phrase reads a LIST of phrasings on stdin — one per offered form, in the offer's " +
        'order: [{"id": "<offered id>", "why": "<one sentence>", "markAcknowledged": true}]',
    };

  let run: RunManifest;
  try {
    // applyPhrasing THROWS by design (its header: "a caller that wants to be lenient has to say
    // so out loud"), and so does verifyOffer beneath it. The façade never throws, so the guard's
    // own words become the refusal — never re-worded, because the guard says the precise thing
    // that was wrong with the phrasing.
    run = applyPhrasing(loaded.run, selected.el.id, phrased);
  } catch (e) {
    return {
      ok: false,
      code: "invalid-request",
      message: (e as Error)?.message ?? String(e),
    };
  }
  return persist(runDir, run, { phrased: selected.el.id });
}

/** Record the form the journalist chose, and persist it. */
export function chooseFormIn(
  runDir: string,
  optionId: string,
  elementId?: string,
): HostResponse {
  return decide(runDir, elementId, (run, el) => {
    const chosen = chooseForm(el, optionId);
    if (!chosen.ok) return chosen;
    return { ok: true, value: chosen.value, report: { chosen: optionId } };
  });
}

/**
 * Record WHERE the produced element goes. This does not publish: it writes the decision that
 * makes a `deliver` step valid, so a credentials failure at publish time never erases the choice.
 * With no destinations, the default is derived from the format's genre (a file is handed over as
 * a package, an embed goes to a ready host) — `lib/delivery/routing.ts` owns that policy.
 */
export function requestDeliveryIn(
  runDir: string,
  destinations?: string[],
  elementId?: string,
): HostResponse {
  return decide(runDir, elementId, (run, el) => {
    const asked = requestDelivery(run, el, tryLoadDecor(), {
      ...(destinations && destinations.length > 0 ? { destinations } : {}),
    });
    if (!asked.ok) return asked;
    return {
      ok: true,
      value: asked.value,
      report: { requested: asked.value.delivery!.requested },
    };
  });
}

// The shape both decisions share: load, find the live element, run the decision, persist the new
// element only if it was accepted. A refused decision writes nothing at all — the run on disk is
// byte-identical, which is what makes a refusal safe to retry.
type Decided =
  | { ok: true; value: RunElement; report: Record<string, unknown> }
  | (VerbResult<unknown> & { ok: false });

function decide(
  runDir: string,
  elementId: string | undefined,
  decision: (run: RunManifest, el: RunElement) => Decided,
): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  const selected = selectElement(loaded.run, elementId);
  if ("fail" in selected) return { ok: false, ...selected.fail };
  const el = selected.el;

  let result: Decided;
  try {
    result = decision(loaded.run, el);
  } catch (e) {
    return {
      ok: false,
      code: "internal",
      message: `the decision failed unexpectedly: ${(e as Error)?.message ?? String(e)}`,
    };
  }
  if (!result.ok) return refusedDecision(result);

  const report = result.report;
  // Captured BEFORE the map: `result` is a `let`, and TypeScript's narrowing from the `!result.ok`
  // guard above does not survive into a closure over a mutable binding.
  const decided = result.value;
  // Replace the decided element IN PLACE. `[result, ...rest]` moved it to the front, silently
  // reordering the deliverables — and the order is the production order the plan chose, web
  // first as the editorial master. The driver already learned this; the façade had not.
  const run: RunManifest = {
    ...loaded.run,
    elements: loaded.run.elements.map((e) => (e.id === el.id ? decided : e)),
  };
  return persist(runDir, run, report);
}
