import { z } from "zod";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { canonicalHash } from "./canonical-hash";
import { migrate } from "./migrate";
import { INTENTS } from "../brain/intents";
import {
  VISUAL_FORMATS,
  CHANNELS as CHANNEL_KEYS,
  DESTINATIONS,
  MEDIA_ASPECTS,
  type Channel,
} from "../core/vocabulary";
import {
  channelFor,
  defaultAspectFor,
  isFormatAllowed,
  allowedFormats,
} from "../core/channel-policy";
import { isLoopBuildable, resolveBuilder } from "./buildable";
// --- source policy (lib/source) ---
import { SourceLedgerSchema } from "../source/kinds";
import { assertSourceLedger } from "../source/policy";
import { ReviewSlotSchema } from "../verify/schema";
import { approvalDecision, type ApprovalDecision } from "../verify/approval";
import type { ReviewRecord } from "../verify/types";

const HashRef = z.object({ path: z.string(), sha256: z.string() });
const DataProfileSchema = z.object({
  columns: z.array(z.string()),
  numericColumns: z.array(z.string()),
  rowCount: z.number(),
});
const WhySourceSchema = z.object({
  sheet: z.string(),
  fragments: z.array(z.string()),
  facts: z.record(z.string(), z.string()),
});
const FormOptionSchema = z.object({
  id: z.string(),
  nativeType: z.string(),
  /** Which engine will render it — the brain offers across engines, not just chart-native. */
  engine: z.string().optional(),
  format: z.enum(VISUAL_FORMATS).optional(),
  intent: z.array(z.enum(INTENTS)).optional(),
  why: z.string(),
  /** Where the why came from. Present on anything the brain built (spec §6). */
  whySource: WhySourceSchema.optional(),
  /** Capability ids this form needs — the decor's CAPACITÉ axis. */
  requires: z.array(z.string()).optional(),
  /** Filled when the offer was made with a decor: what stands in the way, if anything. */
  readiness: z
    .object({
      status: z.enum(["ready", "missing", "unverified", "disabled"]),
      reason: z.string(),
    })
    .optional(),
});
const RunEventSchema = z.object({
  at: z.string(),
  kind: z.enum(["failure", "transition"]),
  elementId: z.string().optional(),
  action: z.string(),
  message: z.string(),
});
// WHERE this element lands and WHAT SHAPE it takes — the two axes issue #1 found welded into
// `channel`. Sitting on the ELEMENT rather than on the run is what makes a run multi-deliverable:
// an element already carries its own offer, pinned format, artifact, provenance, review, delivery
// and gate state, so the only thing it lacked in order to BE a deliverable was a destination.
//
// `aspect` is optional on purpose (issue #1, stage 3): it is asked only on the branch that needs
// it, and only after the editorial format is chosen — see nextActionsForElement's confirm-aspect.
const DeliverableSchema = z.object({
  destination: z.enum(DESTINATIONS),
  aspect: z.enum(MEDIA_ASPECTS).optional(),
});

const RunElementSchema = z.object({
  id: z.string(),
  /** Where this element goes. Absent ⇒ the run's own `channel` (every manifest written before
   *  issue #1). */
  deliverable: DeliverableSchema.optional(),
  /** The element this one is a second deliverable OF: same confirmed takeaway, another
   *  destination. What tells two DELIVERABLES apart from two unrelated VISUALS. */
  deliverableOf: z.string().optional(),
  // A format the journalist asked for explicitly, at CADRAGE. State, not a remembered
  // instruction: the brain applies it as a HARD filter (lib/brain/eligibility.ts), which is
  // what makes "an explicit format signal WINS" mechanical rather than documentary.
  requestedFormat: z.enum(VISUAL_FORMATS).optional(),
  angle: z
    .object({
      confirmedTakeaway: z.string(),
      emphasis: z.string().optional(),
      altInsight: z.string(),
      unit: z.string(),
    })
    .optional(),
  proposal: z
    .object({
      options: z.array(FormOptionSchema),
      // What the brain refused to offer, and why. State, not a sentence: it survives a resume
      // and the journalist can ask for one back (spec §6).
      excluded: z
        .array(z.object({ id: z.string(), reason: z.string() }))
        .default([]),
      chosenId: z.string().optional(),
      // The brain's own sentence for why a REQUESTED format was refused (lib/brain/
      // eligibility.ts, lib/loop/propose.ts). State, not a message: it survives a resume the
      // same way `excluded` does, so the desk can display it later without re-deriving it —
      // and so `options: []` reads as "refused" rather than being indistinguishable from
      // "nothing to offer".
      refusal: z.string().optional(),
    })
    .optional(),
  artifact: z
    .object({
      path: z.string(),
      sha256: z.string(),
      provenanceHash: z.string(),
      producedAt: z.string(),
    })
    .optional(),
  // The slot the verify layer fills (lib/verify). It kept `findings: unknown[]` while it
  // was dormant; the schema now describes the real record — structured findings with a
  // central severity, the reviewer's attribution, the captures and their checks, the taste
  // risks routed to a human, the overrides and the PREVIEW that must precede approval.
  // Every added field is optional and `findings` still admits an opaque value, so a
  // manifest written while the slot was dormant parses unchanged.
  review: ReviewSlotSchema.optional(),
  delivery: z
    .object({
      /** The publisher ids the JOURNALIST chose. Setting this is what makes `deliver` valid. */
      requested: z.array(z.string()),
      delivered: z.array(
        z.object({
          publisherId: z.string(),
          kind: z.enum(["hosted", "package"]),
          url: z.string().optional(),
          artifact: HashRef.optional(),
          snippet: z.string().optional(),
          publishedAt: z.string(),
          // A delivery NEVER inherits across a provenance change — the same discipline
          // review and approved already follow. This is what makes "published, but no longer
          // what you are looking at" a state the manifest can express.
          deliveredProvenanceHash: z.string(),
        }),
      ),
    })
    .optional(),
  blocked: z.object({ reason: z.string(), at: z.string() }).optional(),
  dropped: z.object({ reason: z.string(), at: z.string() }).optional(),
  approved: z
    .object({ signoffPath: z.string(), approvedProvenanceHash: z.string() })
    .optional(),
});
export const RunManifestSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal(4),
  /** The relationship to the text: an embeddable element, or the visual article itself. */
  route: z.enum(["embed", "article"]).default("embed"),
  /** The run's DEFAULT destination, in render-channel form — what an element that declares no
   *  `deliverable` of its own is produced at. Before issue #1 this was the run's ONE channel;
   *  it keeps that meaning exactly for every manifest already on disk, which is what makes the
   *  extension an identity migration (see migrate.ts's materializeDeliverables). The live
   *  question "what channel is THIS element rendered at" is answered in one place only:
   *  channelForElement(). */
  channel: z.enum(CHANNEL_KEYS).default("article-web"),
  input: z.object({ data: HashRef.optional(), article: HashRef.optional() }),
  // --- source policy (lib/source) ---
  // WHAT each frozen input IS, beside the path+hash of WHICH file it is: the declared source
  // class and the run's mode. Optional, because a run declares its sources when it knows them
  // and every run recorded before this field existed stays readable — but a ledger that IS
  // present is checked at every write (assertInvariants below). The manifest is the PRIVATE
  // ledger: an internalRef belongs here and never leaves through lib/source/redact.ts.
  sources: SourceLedgerSchema.optional(),
  cadrage: z.object({ answers: z.record(z.string(), z.string()) }).optional(),
  orient: z
    .object({
      profile: DataProfileSchema,
      supportsPoint: z.boolean(),
      note: z.string().optional(),
    })
    .optional(),
  elements: z.array(RunElementSchema),
  events: z.array(RunEventSchema),
});

export type DataProfile = z.infer<typeof DataProfileSchema>;
export type FormOption = z.infer<typeof FormOptionSchema>;
export type RunEvent = z.infer<typeof RunEventSchema>;
export type RunElement = z.infer<typeof RunElementSchema>;
export type RunManifest = z.infer<typeof RunManifestSchema>;
export type DeliveryRecord = NonNullable<
  RunElement["delivery"]
>["delivered"][number];

export type NextAction =
  | "orient"
  | "confirm-angle"
  | "propose"
  | "choose-form"
  | "confirm-aspect"
  | "produce"
  | "show"
  | "deliver";

export function parseManifest(raw: unknown): RunManifest {
  return RunManifestSchema.parse(raw);
}

// The option `proposal.chosenId` names, or undefined if nothing is chosen yet. provenanceHash
// below and lib/loop/deliver.ts both need to resolve "the chosen option" from the same
// `chosenId` — kept here once so a caller cannot build a second, subtly different lookup
// (the class of drift this codebase has already been bitten by).
export type Deliverable = z.infer<typeof DeliverableSchema>;

/** The render channel this element's deliverable resolves to, or undefined while it still owes
 *  an answer (a social deliverable whose aspect has not been confirmed — 9:16 or 1:1 is not a
 *  guess this codebase gets to make). An element with no deliverable at all resolves to the
 *  run's default channel, which is exactly what it meant before issue #1. */
export function resolvedChannelForElement(
  run: RunManifest,
  el: RunElement,
): Channel | undefined {
  if (!el.deliverable) return run.channel;
  const { destination } = el.deliverable;
  const aspect = el.deliverable.aspect ?? defaultAspectFor(destination);
  return aspect ? channelFor(destination, aspect) : undefined;
}

/** The TOTAL form: never undefined, never throws. provenanceHash and every read-only reporter
 *  need an answer for any element in any state; the run's default stands in while an aspect is
 *  still owed. Production does NOT go through this — produce.ts requires the resolved one, so an
 *  unanswered aspect is a refusal there rather than a silently substituted channel. */
export function channelForElement(run: RunManifest, el: RunElement): Channel {
  return resolvedChannelForElement(run, el) ?? run.channel;
}

export function chosenOption(el: RunElement): FormOption | undefined {
  return el.proposal?.chosenId
    ? el.proposal.options.find((o) => o.id === el.proposal!.chosenId)
    : undefined;
}

// The artifact depends on exactly these. Any change ⇒ the produced artifact is stale.
//
// `channel` and the chosen option's `format` are here because produce.ts reads BOTH: it renders
// the pinned format (never a hard-coded static any more) AT the run's channel, which fixes the
// artifact's aspect and size. Without them, moving a run from article-web to social-vertical
// left the existing 1200x675 landscape artifact "fresh" — nextActions said "show" and the run
// shipped a landscape image for a 9:16 channel. `chosenId` alone does not cover the format: the
// same option can be re-offered in another format, and the id would not move.
//
// Widening the hash re-values every hash: an artifact recorded before this change reads STALE
// once and is re-produced. That is the safe direction (never "fresh" for a run whose channel
// the artifact was not built at), and no test or on-disk fixture pins a literal hash value —
// they all recompute it — so there is nothing to migrate, only this note to leave.
export function provenanceHash(run: RunManifest, el: RunElement): string {
  const chosen = chosenOption(el);
  return canonicalHash({
    inputData: run.input.data?.sha256 ?? null,
    inputArticle: run.input.article?.sha256 ?? null,
    cadrage: run.cadrage?.answers ?? null,
    angle: el.angle ?? null,
    chosenId: el.proposal?.chosenId ?? null,
    // The channel of THIS deliverable, not of the run: a run can now carry several, and hashing
    // the run-level default would let a social still and a web still of the same angle share a
    // provenance — the exact "looks fresh at a destination it was never built for" failure the
    // channel was added to this hash to prevent, one level down.
    channel: channelForElement(run, el),
    // The two axes, hashed as themselves. `undefined` (never null) for an element that carries
    // no deliverable: canonicalStringify goes through JSON.stringify, which OMITS undefined
    // values, so a legacy element's canonical string — and therefore its hash — is byte-identical
    // to what it was before issue #1. No artifact already on disk is re-valued by this widening.
    destination: el.deliverable?.destination,
    aspect: el.deliverable?.aspect,
    // An option carrying no `format` at all (fixtures, hand-authored manifests predating the
    // brain) hashes as null rather than as produce's "static" default: what matters is that the
    // value MOVES when the pinned format moves, and a null that never changes is stable.
    format: chosen?.format ?? null,
  });
}

export function stalenessOf(run: RunManifest, el: RunElement): boolean {
  return (
    el.artifact != null &&
    el.artifact.provenanceHash !== provenanceHash(run, el)
  );
}

export function writeManifest(path: string, m: RunManifest): void {
  assertInvariants(m);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  writeFileSync(tmp, JSON.stringify(m, null, 2));
  renameSync(tmp, path); // atomic replace on the same filesystem
}

export function readManifest(
  path: string,
  runDir = dirname(path),
): RunManifest {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  if (
    raw &&
    typeof raw === "object" &&
    (raw as { schemaVersion?: number }).schemaVersion !== 4
  ) {
    return migrate(raw, runDir);
  }
  return parseManifest(raw);
}

// Append a bounded event. Failure events record what went wrong WITHOUT advancing any
// element's progression. Ring-capped so the ledger can never grow unbounded.
export function appendEvent(
  run: RunManifest,
  ev: RunEvent,
  cap = 50,
): RunManifest {
  const events = [...run.events, ev].slice(-cap);
  return { ...run, events };
}

// Per-element routing, shared by nextActions() (run-level, elements[0]) and
// resume's per-element reporting (Task 7). Assumes the run-level gates (orient +
// honest off-ramp) already passed — callers apply those first.
export function nextActionsForElement(
  run: RunManifest,
  el: RunElement | undefined,
): NextAction[] {
  if (!el || !el.angle) return ["confirm-angle"];
  if (!el.proposal) return ["propose"];
  if (el.proposal.options.length === 0) return [];
  if (!el.proposal.chosenId) return ["choose-form"];
  // A form production cannot build is OFFERED (marked) — so it can be chosen. Choosing one
  // must not strand the run: `produce` would refuse it on every advance, the driver would
  // record the same bounded failure again, and this function would keep answering `produce`.
  // Routing back to the choice is the way back to the offer the marked form promised.
  //
  // Resolved on the EFFECTIVE producer (resolveBuilder), not `chosen.engine` alone — a
  // chart-native option in the scrolly format is actually built by skills/scrolly, and
  // chart-native being in LOOP_BUILDABLE_ENGINES must not make that option look buildable
  // here while produce.ts refuses it every time. The same resolution produce.ts and
  // lib/brain/eligibility.ts use, so the three readers cannot drift.
  const chosen = el.proposal.options.find(
    (o) => o.id === el.proposal!.chosenId,
  );
  if (chosen && !isLoopBuildable(resolveBuilder(chosen)))
    return ["choose-form"];
  // Issue #1, stage 3: "ask aspect ratio only when entering an export that needs it, and after
  // the editorial format is chosen". Both halves of that sentence are this line's POSITION —
  // below choose-form, above produce — rather than a rule written down somewhere for an
  // orchestrator to obey. A destination with one shape (web, print) never reaches it, because
  // resolvedChannelForElement answers from the destination's default.
  if (!resolvedChannelForElement(run, el)) return ["confirm-aspect"];
  if (!el.artifact || stalenessOf(run, el)) return ["produce"];
  // `deliver` is a step a DECISION triggers, never an automatic advance — the symmetric of
  // proposal.chosenId. A fresh artifact nobody asked to publish stays on show.
  if (el.delivery && needsDelivery(run, el)) return ["deliver"];
  return ["show"];
}

function needsDelivery(run: RunManifest, el: RunElement): boolean {
  const current = provenanceHash(run, el);
  return el.delivery!.requested.some(
    (id) =>
      !el.delivery!.delivered.some(
        (d) => d.publisherId === id && d.deliveredProvenanceHash === current,
      ),
  );
}

// "show" is the only TERMINAL action: it means this element is fresh and nobody is waiting on
// it. Everything else is work outstanding — including the human turns, which are work the
// journalist owes. `[]` is the honest off-ramp (an empty offer), also terminal.
function isPending(actions: NextAction[]): boolean {
  return actions.length > 0 && actions[0] !== "show";
}

// An element carrying an explicit verdict is not waiting for anything: it was cut (dropped) or
// it is stuck behind something named (blocked), and gateStateOf reports it as such. Scanning
// over it is what keeps ONE cut deliverable from stalling a whole run.
function isSettled(el: RunElement): boolean {
  return el.dropped != null || el.blocked != null;
}

/**
 * The element `nextActions` is answering ABOUT — the first one with work outstanding.
 *
 * A run carries several deliverables now (issue #1), so "the live element" can no longer be
 * elements[0] by definition: with the first deliverable produced and the second not, elements[0]
 * answers "show" and the run reads as finished having shipped half of what was asked for. That
 * is the acceptance criterion "no requested output is silently dropped", and it is decided here
 * rather than in the schema.
 *
 * Falls back to elements[0] so that a run where nothing is pending keeps answering exactly what
 * it answered before — a single-element run is byte-for-byte unchanged by this function.
 */
export function liveElementFor(run: RunManifest): RunElement | undefined {
  const pending = run.elements.find(
    (el) => !isSettled(el) && isPending(nextActionsForElement(run, el)),
  );
  return pending ?? run.elements[0];
}

// State-driven next actions: run-level gates first (orient + honest off-ramp), then the routing
// of the element that still owes something (liveElementFor).
export function nextActions(run: RunManifest): NextAction[] {
  if (!run.orient) return ["orient"];
  if (!run.orient.supportsPoint) return [];
  return nextActionsForElement(run, liveElementFor(run));
}

export type GateState =
  | "empty"
  | "oriented"
  | "angled"
  | "proposed"
  | "chosen"
  | "produced"
  | "stale"
  | "reviewed"
  | "approved"
  | "delivered"
  | "blocked"
  | "dropped";

// Pure function of present fields + explicit verdict markers. Priority is descending:
// verdicts first, then the derived lifecycle. Review/approval never inherit across a
// provenance change — they are only honored when their frozen hash still matches.
export function gateStateOf(run: RunManifest, el: RunElement): GateState {
  if (el.dropped) return "dropped";
  if (el.blocked) return "blocked";
  const fresh = el.artifact != null && !stalenessOf(run, el);
  const provenance = fresh ? el.artifact!.provenanceHash : null;
  // "delivered" means EVERY requested destination has landed for the artifact currently
  // fresh — never just "at least one has". `requested.length > 0` is not redundant with the
  // `every()` below: `[].every(...)` is vacuously true, so without this guard an element that
  // requested nothing (but still carries stale `delivered` records from an earlier request)
  // would misreport "delivered" having delivered nothing for the current request. This is
  // what makes gateStateOf's "delivered" the exact complement of needsDelivery() === true —
  // the whole reason the question was parked (Task 7) until this step existed to make the
  // partial-delivery case reachable in practice.
  if (
    el.delivery &&
    provenance &&
    el.delivery.requested.length > 0 &&
    el.delivery.delivered.length > 0 &&
    el.delivery.requested.every((id) =>
      el.delivery!.delivered.some(
        (d) => d.publisherId === id && d.deliveredProvenanceHash === provenance,
      ),
    )
  )
    return "delivered";
  if (
    el.approved &&
    provenance &&
    el.approved.approvedProvenanceHash === provenance
  )
    return "approved";
  if (
    el.review &&
    provenance &&
    el.review.reviewedProvenanceHash === provenance
  )
    return "reviewed";
  if (el.artifact) return fresh ? "produced" : "stale";
  if (el.proposal?.chosenId) return "chosen";
  if (el.proposal) return "proposed";
  if (el.angle) return "angled";
  if (run.orient) return "oriented";
  return "empty";
}

// state ↔ data must not desync. Throws on contradictions the derivation cannot express.
export function assertInvariants(run: RunManifest): void {
  const ids = new Set(run.elements.map((el) => el.id));
  for (const el of run.elements) {
    // --- deliverables (issue #1) ---
    // A sibling names the master whose confirmed takeaway it shares. A name that resolves to
    // nothing — or to itself — makes the whole notion of "the same takeaway, another
    // destination" unverifiable, and deliverablePlan's drift report silently blind.
    if (el.deliverableOf === el.id)
      throw new Error(
        `invariant: element ${el.id} declares itself a deliverable of itself`,
      );
    if (el.deliverableOf && !ids.has(el.deliverableOf))
      throw new Error(
        `invariant: element ${el.id} is a deliverable of '${el.deliverableOf}', which is not in this run`,
      );
    // The mechanical half of "one output cannot inherit an incompatible format from another".
    // Checked at the WRITE, not only at produce: a manifest asserting a printable interactive is
    // already wrong on disk, whether or not anyone tries to build it. Scoped to rows that DECLARE
    // a destination — a legacy element is judged by the run's channel, exactly as before, and
    // this check must not retro-fail a manifest written before the axis existed.
    if (el.deliverable) {
      const channel = resolvedChannelForElement(run, el);
      const format = chosenOption(el)?.format;
      if (channel && format && !isFormatAllowed(channel, format))
        throw new Error(
          `invariant: element ${el.id} pins the "${format}" format on a deliverable rendered at "${channel}", which carries ${allowedFormats(channel).join(", ")}`,
        );
    }
    if (
      el.proposal?.chosenId &&
      !el.proposal.options.some((o) => o.id === el.proposal!.chosenId)
    ) {
      throw new Error(
        `invariant: element ${el.id} chosenId '${el.proposal.chosenId}' not among options`,
      );
    }
    if (el.artifact && !el.angle)
      throw new Error(
        `invariant: element ${el.id} has an artifact without an angle`,
      );
    if (el.approved && !el.artifact)
      throw new Error(
        `invariant: element ${el.id} approved without an artifact`,
      );
    if (el.review && !el.artifact)
      throw new Error(
        `invariant: element ${el.id} reviewed without an artifact`,
      );
    if (el.blocked && el.dropped)
      throw new Error(`invariant: element ${el.id} both blocked and dropped`);
    assertReviewRecordInvariants(el);
  }
  // --- source policy (lib/source) ---
  // A declared source must be valid AT THE RUN'S OWN MODE. This is the one place the policy is
  // enforced rather than merely available, and it is deliberately the earliest: `synthetic` in
  // a run that calls itself reporting is a contradiction in the DECLARATION, so it fails at the
  // write, not later at the publish. The frozen-input flags are passed structurally (never the
  // manifest itself) so lib/source stays free of any dependency on lib/loop.
  if (run.sources)
    assertSourceLedger(run.sources, {
      data: run.input.data != null,
      article: run.input.article != null,
    });
}

// ---------------------------------------------------------------------------------------
// Verify layer (lib/verify) — the review slot's own invariants and the ONE writer of
// `approved`. Grouped at the end on purpose, so this addition stays trivially mergeable.
// ---------------------------------------------------------------------------------------

// Only about shapes that did not exist before. The unconditional rule one would want here —
// "approved implies a preview" — is NOT asserted: three existing lib/loop tests approve an
// element by hand with no review, and this slice may not edit them, so an invariant written
// against them would be a false green dressed as rigour. The gate lives at approveElement
// below, which is the only sanctioned writer; the invariant follows in the slice that wires
// approval into the driver (spec 2026-07-26-verify-layer-design.md section 6.2).
function assertReviewRecordInvariants(el: RunElement): void {
  const review = el.review as ReviewRecord | undefined;
  if (!review) return;
  const ids = new Set(
    (review.findings ?? [])
      .map((f) => (f as { id?: unknown })?.id)
      .filter((id): id is string => typeof id === "string"),
  );
  for (const o of review.overrides ?? [])
    if (!ids.has(o.findingId))
      throw new Error(
        `invariant: element ${el.id} has an override for finding '${o.findingId}', which is not in the review`,
      );
  for (const id of review.acknowledged ?? [])
    if (!ids.has(id))
      throw new Error(
        `invariant: element ${el.id} acknowledged finding '${id}', which is not in the review`,
      );
  // A preview whose bytes are not the recorded artifact's is a contradiction, not a stale
  // record: the approval path already refuses it, and persisting it would leave a manifest
  // asserting that a journalist was shown something the run never produced.
  if (
    review.preview &&
    el.artifact &&
    review.preview.deliverableSha256 !== el.artifact.sha256
  )
    throw new Error(
      `invariant: element ${el.id} records a preview of ${review.preview.deliverableSha256.slice(0, 12)}… while its artifact is ${el.artifact.sha256.slice(0, 12)}…`,
    );
}

export type ApproveOutcome =
  { ok: true; element: RunElement } | { ok: false; decision: ApprovalDecision };

/**
 * Approve an element — the ONLY sanctioned writer of `el.approved`.
 *
 * Issue #3's failure is that approval could be asked for without the deliverable ever
 * having been presented, because "show the render" lived in prose. Arriving before any
 * writer exists is the one window in which the gate can be placed with no legacy path to
 * grandfather: everything that wants to approve has to come through here.
 *
 * Pure — it returns the next element rather than mutating, the way every other step in this
 * module does, and it never throws: a refusal is the DECISION, with all of its reasons.
 */
export function approveElement(
  run: RunManifest,
  el: RunElement,
  approval: { signoffPath: string },
): ApproveOutcome {
  const chosen = chosenOption(el);
  const format = chosen?.format ?? "static";
  const current = provenanceHash(run, el);
  const decision = approvalDecision(el.review as ReviewRecord | undefined, {
    format,
    artifactSha256: el.artifact?.sha256 ?? "",
    provenanceHash: current,
  });
  // An element with no artifact cannot be approved even if a record somehow cleared: the
  // pre-existing invariant refuses to persist it, so refusing here keeps the two in step
  // instead of writing something writeManifest would then reject.
  if (!el.artifact || !decision.approvable)
    return {
      ok: false,
      decision: el.artifact
        ? decision
        : {
            ...decision,
            approvable: false,
            reasons: [
              ...decision.reasons,
              {
                code: "not-reviewed",
                detail: "the element has no produced artifact to approve",
              },
            ],
          },
    };
  return {
    ok: true,
    element: {
      ...el,
      approved: {
        signoffPath: approval.signoffPath,
        approvedProvenanceHash: current,
      },
    },
  };
}
