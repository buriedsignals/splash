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
import { chooseForm } from "../loop/choose";
import { advanceStep } from "../loop/driver";
import {
  gateStateOf,
  nextActions,
  writeManifest,
  type RunElement,
  type RunManifest,
} from "../loop/manifest";
import { requestDelivery } from "../loop/request-delivery";
import { tryLoadDecor } from "../newsroom/decor";
import { loadRun, type HostResponse } from "./state";
import type { VerbResult } from "../core/verbs/types";

// The live element — the one nextActions() itself drives. Multi-element aggregation is a question
// for the loop (manifest.ts parks it), not one the façade should answer on its own: a command that
// decided about elements[2] would be deciding about something `next` cannot even report on.
function liveElement(run: RunManifest): RunElement | undefined {
  return run.elements[0];
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
// valid; this says who performs it, which is the piece a host cannot derive from the action name
// alone (`choose-form` has a command, `confirm-angle` does not).
function nothingToRun(
  next: ReturnType<typeof nextActions>,
  run: RunManifest,
): string {
  const [action] = next;
  if (action === "choose-form")
    return 'advance: the next act is the journalist\'s — choose a form with "choose-form --run <dir> --option <id>"';
  if (action === "confirm-angle")
    return "advance: the next act is the journalist's — the angle (takeaway, alt text, unit) has to be confirmed, and no façade command records it yet";
  if (action === "show") {
    // "show" covers two very different situations, and telling them apart is the difference
    // between a useful answer and a wrong one: an element that has already been published sits
    // here too (delivery satisfied ⇒ no pending destination ⇒ back to show), and inviting the
    // host to request a delivery it just completed reads as a loop. Found by running the
    // sequence through to the end, not by reading it.
    const el = liveElement(run);
    if (el && gateStateOf(run, el) === "delivered")
      return "advance: the visual is fresh and every destination it asked for has been published — there is nothing left to run";
    return 'advance: the visual is ready and fresh — there is nothing left to run. Decide where it goes with "request-delivery --run <dir>" to make a delivery step valid';
  }
  return "advance: nothing is valid to do on this run — read it with state --run <dir>";
}

/** Record the form the journalist chose, and persist it. */
export function chooseFormIn(runDir: string, optionId: string): HostResponse {
  return decide(runDir, (run, el) => {
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
): HostResponse {
  return decide(runDir, (run, el) => {
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
  decision: (run: RunManifest, el: RunElement) => Decided,
): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  const el = liveElement(loaded.run);
  if (!el)
    return {
      ok: false,
      code: "invalid-request",
      message: "this run holds no element to decide about",
    };

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
  const run: RunManifest = {
    ...loaded.run,
    elements: [result.value, ...loaded.run.elements.slice(1)],
  };
  return persist(runDir, run, report);
}
