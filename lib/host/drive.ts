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
import {
  loadNewsroomProfile,
  type BrandProfile,
} from "../../skills/splash/src/brand-profile";
import { confirmAngle, inheritAngle, type AngleParts } from "../loop/angle";
import { approve, type ApprovalCeremony } from "../loop/approve";
import { applyBeats } from "../loop/beats";
import { ARC_ROLES, type ArcRole } from "../core/claim-arc";
import { type AuthoredBeat } from "../brain/verify-beats";
import { chooseForm } from "../loop/choose";
import { advanceStep } from "../loop/driver";
import { initRun, RunDeclarationSchema } from "../loop/init";
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
import { sourceQuestionCopy } from "../newsroom/ui-copy";
import { sourceQuestion } from "../source/policy";
import { loadRun, readOnlyUiLanguage, type HostResponse } from "./state";
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

/**
 * WHAT THIS DECISION INVALIDATED, said out loud — for every decision that can invalidate anything.
 *
 * Re-confirming an angle and re-choosing a form are both legitimate (revise.ts's back-edge is the
 * first, the offer's own marks invite the second), and both are in provenanceHash — so either one
 * turns a fresh artifact stale and sends the run back through produce. A silently destructive
 * decision has no place on a surface whose every other answer is explicit, and the host cannot
 * work it out for itself: the façade never hands out the hash it would have to compare.
 *
 * ONE rule, not one per command. The parity spec parked this omission for `--element` and it was
 * then written for confirm-angle alone, which is how the asymmetry appeared in the first place.
 *
 * Absent, never `staled: false`, when there was nothing to stale — a marker for an event that did
 * not happen reads as a state the run is in.
 */
function staleWarning(
  run: RunManifest,
  before: RunElement,
  after: RunElement,
): { staled?: true } {
  const staled =
    before.artifact != null &&
    !stalenessOf(run, before) &&
    stalenessOf(run, after);
  return staled ? { staled: true } : {};
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

// The newsroom's registered signers. `loadNewsroomProfile` reads a file that may not exist and
// parses YAML-ish frontmatter that may be malformed — and a profile problem must not turn a
// façade command into a throw at the process edge. No profile means no signers, which is the
// same thing `decor.profile.requiredSigners` already answers for the other half of the pair.
function tryLoadNewsroomProfile(root: string): BrandProfile | null {
  try {
    return loadNewsroomProfile(root);
  } catch {
    return null;
  }
}

/**
 * WHAT THE DECLARATION STILL OWES ABOUT ITS DATA, phrased as the question to put — or `null`
 * when it owes nothing.
 *
 * A run's source ledger is written exactly once, by `initRun`: no later step can add it, so a
 * run declared without one reaches `produce`, is refused there for an undeclared source, and
 * has no gate left to pass. That refusal therefore has to happen while the declaration is still
 * being composed, which is here — before a run exists to be stuck.
 *
 * `sourceQuestion` decides WHICH question is owed (the kind first, then the first required field
 * still missing, then a URL that points at a site rather than a document); this only chooses the
 * language. It is deliberately the same call the loop's refusal already carries — the façade
 * asks the question, it does not invent a second opinion about what is missing.
 *
 * A declaration the strict schema REJECTS is passed straight through instead: `initRun` names
 * the offending field, and answering "where does this data come from?" to a mistyped `chanel`
 * would replace a precise diagnosis with an unrelated question. Parsing twice costs nothing and
 * writes nothing.
 */
function undeclaredSourceQuestion(declaration: unknown): string | null {
  const parsed = RunDeclarationSchema.safeParse(declaration);
  if (!parsed.success || !parsed.data.input.data) return null;
  return sourceQuestion(
    parsed.data.sources?.data,
    sourceQuestionCopy(readOnlyUiLanguage()),
  );
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
  // THE ONE QUESTION THAT HAS TO BE ASKED BEFORE THE RUN EXISTS, and here it is asked in the
  // newsroom's own language. initRun holds the same rule in English (it is a verb, and this
  // layer has no language); what the façade adds is the wording a journalist reads.
  const owed = undeclaredSourceQuestion(declaration);
  if (owed) return { ok: false, code: "invalid-request", message: owed };

  // The house language, as the LAST resort under the declared article language. tryLoadDecor
  // is already this file's way of reaching the install's own facts (see below).
  const decor = tryLoadDecor();
  const created = initRun(runDir, declaration, {
    profileLang: decor.language.content,
  });
  if (!created.ok) return refusedDecision(created);
  // Same breath as every acting command: what it did, plus what became valid. The run was just
  // written by initRun itself, so there is nothing to persist here — which is why this is the
  // one acting command that does not go through `persist`.
  return {
    ok: true,
    value: {
      runId: created.value.runId,
      // The confirm-back, attached to an exchange that already exists rather than a seventh
      // CADRAGE question (the cap of six is already exceeded — D20): the journalist reads the
      // language the deliverables will be made in alongside what to do next, and vetoes it there.
      lang: created.value.lang ?? "en",
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
  if (action === "author-beats")
    return (
      "advance: the next act is the journalist's — the walk is drafted and its claims are still " +
      'unwritten, so write each beat in their own words with "author-beats --run <dir> < ' +
      "walk.json\" (read the plan, including each beat's draftText and beatSource, from state " +
      "--run <dir>)"
    );
  if (action === "confirm-angle")
    return (
      "advance: the next act is the journalist's — confirm the angle with " +
      '"confirm-angle --run <dir> --takeaway <s> --alt-insight <s> --unit <s>"'
    );
  if (action === "approve")
    return (
      "advance: the next act is the journalist's — the visual has been captured, reviewed and " +
      'presented, and publishing it is a human decision: "approve --run <dir>" (read the ' +
      "findings and what the gate will ask for from state --run <dir>)"
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
    return {
      ok: true,
      value: confirmed.value,
      report: { confirmed: el.id, ...staleWarning(run, el, confirmed.value) },
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

/**
 * WRITE THE WALK's claims, and persist it — the production caller `applyBeats` never had.
 *
 * THE SAME SHAPE AS `phrase`, deliberately, because it is the same kind of turn. The brain drafts
 * the walk as data (ids, an order, anchors, the numbers each claim may cite) with every claim
 * UNWRITTEN; the journalist writes them; `verifyBeats` keeps the turn to authoring. A document on
 * stdin rather than flags for `phrase`'s own reason: the list's length and order are fixed by the
 * plan, one claim per beat, and no set of flags expresses "one value per beat, in the plan's
 * order" — which is exactly what the guard beneath verifies.
 *
 * WHY A COMMAND AND NOT AN `advance`: `draft-beats` is deterministic and the driver runs it;
 * `author-beats` is the journalist's, like `phrase` and `approve`. Splitting them is what the
 * seam is FOR — a beat plan the loop wrote and the loop filled in would be the machine's sentence
 * under a journalist's byline, which `produce` refuses on purpose. Until this command existed the
 * refusal could not even be reached: `next` answered `author-beats` and nothing on this surface
 * could perform it.
 *
 * `role` travels with the text because naming the pivot is part of the authoring: the draft never
 * guesses `turn` (lib/brain/beats.ts), and arcErrors inside the guard keeps the result a
 * well-formed arc.
 */
export function authorBeatsIn(
  runDir: string,
  authored: unknown,
  elementId?: string,
): HostResponse {
  const loaded = loadRun(runDir);
  if ("fail" in loaded) return loaded.fail;
  const selected = selectElement(loaded.run, elementId);
  if ("fail" in selected) return { ok: false, ...selected.fail };

  // Shape first, so the guard is met with the list it expects rather than with a TypeError.
  if (
    !Array.isArray(authored) ||
    authored.some(
      (b) =>
        b == null ||
        typeof b !== "object" ||
        typeof (b as { id?: unknown }).id !== "string" ||
        typeof (b as { text?: unknown }).text !== "string" ||
        !ARC_ROLES.includes((b as { role?: ArcRole }).role!),
    )
  )
    return {
      ok: false,
      code: "invalid-request",
      message:
        "author-beats reads a LIST of authored beats on stdin — one per drafted beat, in the " +
        `plan's order: [{"id": "<drafted id>", "role": "<${ARC_ROLES.join("|")}>", ` +
        '"text": "<the claim, in the journalist\'s words>"}] (read the plan, including each ' +
        "beat's draftText and beatSource, from state --run <dir>)",
    };

  let run: RunManifest;
  try {
    // applyBeats THROWS by design, and so does verifyBeats beneath it — the same contract
    // applyPhrasing has, for the same stated reason. The façade never throws, so the guard's own
    // words become the refusal: it names the precise thing that was wrong with the walk (an id,
    // the order, a blank claim, a number nothing grounds), and re-wording it would lose that.
    run = applyBeats(loaded.run, selected.el.id, authored as AuthoredBeat[]);
  } catch (e) {
    return {
      ok: false,
      code: "invalid-request",
      message: (e as Error)?.message ?? String(e),
    };
  }
  return persist(runDir, run, { authored: selected.el.id });
}

/**
 * APPROVE the produced visual — the human turn the façade could not perform at all.
 *
 * This is the gate the lived journey had no step for: a run went init → … → produce →
 * request-delivery → deliver with nothing having looked at the visual. `approveElement` was
 * built as the only sanctioned writer of `approved` and had no production caller; the
 * verification chain that leads to it (capture → review → preview) had none either.
 *
 * The ceremony arrives as a DOCUMENT rather than as flags, and for the same reason `phrase`
 * does: a list of overrides, each with its own reason, has no shape in flags, and its
 * cardinality comes from the review record rather than from the host. What the host may NOT
 * supply is which bytes an override covers — lib/loop/approve.ts writes that from the run.
 *
 * The signing policy is read from the newsroom's own profile, the same file `deliver`'s
 * `requiredSigners` comes from: with signers declared, no approval is written without a
 * verified Ed25519 signature over the artifact's bytes.
 */
export function approveIn(
  runDir: string,
  ceremony: unknown,
  elementId?: string,
): HostResponse {
  const parsed = parseCeremony(ceremony);
  if ("fail" in parsed) return { ok: false, ...parsed.fail };
  const decor = tryLoadDecor();
  const profile = tryLoadNewsroomProfile(decor.root);
  return decide(runDir, elementId, (run, el) => {
    const result = approve(run, el, runDir, parsed.ceremony, {
      signers: profile?.signers ?? [],
      // From the DECOR, exactly like deliver() reads it — one source, so the gate that writes
      // the approval and the gate that publishes it cannot ask for different signers.
      requiredSigners: decor.profile.requiredSigners ?? [],
    });
    if (!result.ok) return result;
    return { ok: true, value: result.value, report: { approved: el.id } };
  });
}

// The ceremony's shape, checked before the loop is met with a TypeError. An absent body is
// `{}`: approving a visual with nothing open to acknowledge must not require a ceremony.
function parseCeremony(
  raw: unknown,
):
  | { ceremony: ApprovalCeremony }
  | { fail: { code: "invalid-request"; message: string } } {
  const shape = {
    code: "invalid-request" as const,
    message:
      'approve reads an optional ceremony on stdin: {"actorLabel": "<who>", ' +
      '"acknowledged": ["<finding id>"], "overrides": [{"findingId": "<id>", "reason": "<why>"}], ' +
      '"signoff": {"signerId": "<id>", "signature": "<base64>"}}',
  };
  if (raw === undefined || raw === null) return { ceremony: {} };
  if (typeof raw !== "object" || Array.isArray(raw)) return { fail: shape };
  const r = raw as Record<string, unknown>;
  if (r.actorLabel !== undefined && typeof r.actorLabel !== "string")
    return { fail: shape };
  if (
    r.acknowledged !== undefined &&
    (!Array.isArray(r.acknowledged) ||
      r.acknowledged.some((id) => typeof id !== "string"))
  )
    return { fail: shape };
  if (
    r.overrides !== undefined &&
    (!Array.isArray(r.overrides) ||
      r.overrides.some(
        (o) =>
          o == null ||
          typeof o !== "object" ||
          typeof (o as { findingId?: unknown }).findingId !== "string" ||
          typeof (o as { reason?: unknown }).reason !== "string",
      ))
  )
    return { fail: shape };
  if (r.signoff !== undefined) {
    const s = r.signoff as Record<string, unknown>;
    if (
      s == null ||
      typeof s !== "object" ||
      typeof s.signerId !== "string" ||
      typeof s.signature !== "string"
    )
      return { fail: shape };
  }
  return { ceremony: r as ApprovalCeremony };
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
    return {
      ok: true,
      value: chosen.value,
      // Same warning confirm-angle gives, for the same reason: `chosenId` and the chosen option's
      // format are both in provenanceHash, so switching forms annuls a finished artifact exactly
      // the way re-confirming an angle does. Only one of the two commands used to say so.
      report: { chosen: optionId, ...staleWarning(run, el, chosen.value) },
    };
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
  // A confirmed angle reaches the deliverables declared as siblings of this element. `decide`
  // resolves ONE element by design, so without this the master got its takeaway and a sibling
  // declared at `init` got none — measured on a real run, where a second confirm-angle then
  // accepted a contradictory takeaway for the same story. inheritAngle fills a blank and never
  // overrules one a sibling confirmed for itself.
  const spread = (els: RunElement[]): RunElement[] =>
    inheritAngle(els, decided);
  // Replace the decided element IN PLACE. `[result, ...rest]` moved it to the front, silently
  // reordering the deliverables — and the order is the production order the plan chose, web
  // first as the editorial master. The driver already learned this; the façade had not.
  const run: RunManifest = {
    ...loaded.run,
    elements: spread(
      loaded.run.elements.map((e) => (e.id === el.id ? decided : e)),
    ),
  };
  return persist(runDir, run, report);
}
