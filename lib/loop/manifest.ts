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
  DESTINATION_POLICY,
} from "../core/channel-policy";
import { isLoopBuildable, resolveBuilder } from "./buildable";
import { ARC_ROLES } from "../core/claim-arc";
// --- source policy (lib/source) ---
import { SourceLedgerSchema } from "../source/kinds";
import { assertSourceLedger } from "../source/policy";
import { CaptureSlotSchema, ReviewSlotSchema } from "../verify/schema";
import { approvalDecision, type ApprovalDecision } from "../verify/approval";
import { previewCoversDeliverable } from "../verify/preview";
import type { CaptureSlot, ReviewRecord } from "../verify/types";

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
// THE NARRATIVE PLAN of an article-branch deliverable — the beats a reader is walked through.
//
// It exists because the beats used to be DERIVED and shipped: skills/scrolly/src/Scrolly.tsx
// calls deriveChartStory() and the auto-picked captions appeared under a journalist's byline,
// against the socle's own rule that Splash composes the text the journalist brings and does not
// write the journalism. The plan is now drafted (lib/brain/beats.ts), authored by the journalist
// (lib/loop/beats.ts, behind lib/brain/verify-beats.ts), and only then rendered.
//
// `text: ""` is the DRAFT state and it is legitimate on disk — exactly as propose() persists an
// offer whose every `why` is empty. What is not legitimate is an ARTIFACT standing on one
// (assertInvariants below), and produce() refuses to build one.
//
// `draftText` is kept as STATE rather than discarded after being shown, for the reason the offer
// keeps `excluded`: it survives a resume, and a journalist coming back to a run has to be able
// to see again what was suggested without re-deriving it.
const BeatSourceSchema = z.object({
  facts: z.record(z.string(), z.string()),
  shared: z.record(z.string(), z.string()),
});
const NarrativeBeatSchema = z.object({
  id: z.string(),
  anchor: z.object({ kind: z.enum(["x", "category"]), value: z.string() }),
  role: z.enum(ARC_ROLES),
  text: z.string(),
  draftText: z.string(),
  beatSource: BeatSourceSchema,
});
const NarrativeSchema = z.object({ beats: z.array(NarrativeBeatSchema) });

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
      // WHAT THE JOURNALIST WANTS THE FIGURE TO SHOW — declared, never read out of their prose.
      // The ranking's semantic input used to be guessed from `confirmedTakeaway` by a keyword
      // pass (lib/brain/rank-intent.ts), which answered nothing at all on ordinary French
      // phrasings and mis-fired on others; the offer was then ordered by fit and readiness
      // alone, silently. It is a part of the ANGLE because that is what it is — the point the
      // journalist is making — and because confirm-angle is already the questionnaire with
      // refusals that collects the other parts (lib/loop/angle.ts).
      //
      // OPTIONAL in the schema, REQUIRED by confirmAngle: an angle recorded before this field
      // existed must stay readable (refusing it would fail legitimate runs over a field that did
      // not exist when they were written), while nothing written from now on can omit it.
      intent: z.enum(INTENTS).optional(),
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
  /** The authored beat plan of an article-branch deliverable. Absent for an embeddable element
   *  — a chart in a story has no walk. See NarrativeSchema. */
  narrative: NarrativeSchema.optional(),
  artifact: z
    .object({
      path: z.string(),
      sha256: z.string(),
      provenanceHash: z.string(),
      producedAt: z.string(),
    })
    .optional(),
  // What `capture` measured at the destination's real publication viewport (issue #10).
  // Optional, and its own slot rather than part of `review` — see CaptureSlotSchema.
  capture: CaptureSlotSchema.optional(),
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
  // The desk's turn: write each offered form's `why` in the journalist's language, from that
  // form's own grounding. A human/model turn like confirm-angle and choose-form, so advanceStep's
  // `default:` already treats it as one.
  | "phrase"
  | "choose-form"
  | "confirm-aspect"
  // The article branch's two turns. `draft-beats` is DETERMINISTIC — the driver runs it, like
  // propose — and hands over a walk whose every claim is unwritten. `author-beats` is the
  // journalist's, like phrase: they validate or rewrite each beat, behind verifyBeats.
  | "draft-beats"
  | "author-beats"
  | "produce"
  // The verification chain (lib/verify), on the road between a produced artifact and a
  // published one. `capture`, `review` and `preview` are DETERMINISTIC — advanceStep runs
  // them — while `approve` is a human turn like confirm-angle and choose-form.
  | "capture"
  | "review"
  | "preview"
  | "approve"
  | "show"
  | "deliver";

export function parseManifest(raw: unknown): RunManifest {
  return RunManifestSchema.parse(raw);
}

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

// The option `proposal.chosenId` names, or undefined if nothing is chosen yet. provenanceHash
// below and lib/loop/deliver.ts both need to resolve "the chosen option" from the same
// `chosenId` — kept here once so a caller cannot build a second, subtly different lookup
// (the class of drift this codebase has already been bitten by).
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
    //
    // The destination and the aspect are NOT hashed alongside it, and that is deliberate rather
    // than an omission: a channel IS a (destination, aspect) pair, the mapping is a bijection
    // (channel-policy.test.ts's round-trip holds it that way), so hashing them too would add no
    // discrimination and would cost the one property that makes the migration honest — writing
    // down the destination a run always had (migrate.ts's materializeDeliverables) must not
    // re-value the hash and send every already-produced artifact back through produce. Moving a
    // deliverable's destination or aspect moves its channel, and the hash moves with it.
    channel: channelForElement(run, el),
    // The source ledger is artifact-determining for the same reason the channel is: since
    // produce.ts reads the declared credit instead of a placeholder, the credit is RENDERED
    // INTO the artifact. Without this line, correcting a source label leaves a stale credit on
    // an artifact that reports itself fresh — stalenessOf answers false, nextActions says
    // "show", and the newsroom publishes an attribution it already fixed. (Required by the
    // source-policy design spec's R1, in the same commit as its first consumer.) The WHOLE
    // ledger, not just the label: the class changes what the visual may assert and the mode
    // changes whether it is reporting at all. `null` when a run declares nothing, so the value
    // stays stable rather than moving.
    sources: run.sources ?? null,
    // An option carrying no `format` at all (fixtures, hand-authored manifests predating the
    // brain) hashes as null rather than as produce's "static" default: what matters is that the
    // value MOVES when the pinned format moves, and a null that never changes is stable.
    format: chosen?.format ?? null,
    // The narrative plan is artifact-determining for the same reason the source ledger is: since
    // produce.ts threads the authored beats into the spec, the journalist's own sentences are
    // RENDERED INTO the page. Without this line, rewriting a beat leaves the old prose on a page
    // that reports itself fresh — nextActions answers "show", and the newsroom publishes a
    // sentence it already replaced. `null` for every element that carries no plan, so the value
    // stays stable rather than moving for an embeddable element that never had one.
    narrative: el.narrative ?? null,
  });
}

/** The beats of an element's plan that nobody has written yet. Empty for an authored plan, and
 *  for an element that carries no plan at all — one question, one answer, read by the routing,
 *  the invariant and produce()'s refusal so the three cannot drift. */
export function unauthoredBeats(el: RunElement): string[] {
  return (el.narrative?.beats ?? [])
    .filter((b) => b.text.trim() === "")
    .map((b) => b.id);
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
  // The offer has to be WRITTEN before it can be chosen from. propose() leaves every `why` empty
  // on purpose — the brain hands over grounding, the desk writes the language (propose.ts) — and
  // an offer nobody phrased would be shown to the journalist blank. Without this step a host is
  // told "choose-form", tries it, and meets assertInvariants' refusal instead: the same "you are
  // told to decide and cannot see the terms" the offer's absence from resumeReport used to cause.
  //
  // POSITION: under the `!chosenId` test, not above it. Once a choice exists, assertInvariants
  // guarantees it was phrased, so the un-phrased-and-chosen state is not writable to disk and
  // nothing needs routing out of it; putting the check above would instead swallow the
  // "chosen form nothing can build ⇒ back to choose-form" dead-end routing just below, which
  // lib/loop/driver.test.ts builds in memory precisely to prove it.
  if (!el.proposal.chosenId)
    return el.proposal.options.some((o) => o.why.trim() === "")
      ? ["phrase"]
      : ["choose-form"];
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
  // THE ARTICLE BRANCH: a narrative page is not built from a plan nobody wrote.
  //
  // POSITION — below the buildability gate, on purpose. Drafting beats for a form nothing can
  // build is work thrown away, and routing out of that state would swallow the stranded-run
  // escape the offer's mark promises ("choose-form" is the way back). scrolly is not in
  // LOOP_BUILDABLE_ENGINES today, so `draft-beats` is NOT reachable through this function yet;
  // it becomes reachable the day the whole-article branch is wired, with nothing here to change.
  // The `author-beats` line below is NOT format-gated for the same honesty: whatever created a
  // plan, an unwritten one must not reach produce.
  if (chosen?.format === "scrolly" && !el.narrative) return ["draft-beats"];
  if (unauthoredBeats(el).length > 0) return ["author-beats"];
  if (!el.artifact || stalenessOf(run, el)) return ["produce"];
  // `deliver` is a step a DECISION triggers, never an automatic advance — the symmetric of
  // proposal.chosenId. A fresh artifact nobody asked to publish stays on show.
  if (el.delivery && needsDelivery(run, el)) return verificationChain(run, el);
  return ["show"];
}

/**
 * The road from a produced artifact to a published one (lib/verify, issues #3/#9/#10/#11).
 *
 * POSITION: inside the delivery branch, never above it. Two reasons, and the first is a
 * measurement rather than a preference — lib/source/wiring-proof.test.ts asserts that a
 * produced element nobody asked to publish answers ["show"], and that file is outside this
 * slice's boundary. An invariant written against a test one may not repair is a false green
 * dressed as rigour, which is exactly the reasoning the verify layer already applied to
 * `approved ⇒ preview`. And editorially, `show` has always meant "fresh, and nobody is waiting
 * on it": with a delivery requested, somebody is.
 *
 * The approval leads, and that is the whole shape: publishing needs ONE thing — an approval
 * covering THESE bytes. Capture, review and preview are the road to it, not separate
 * conditions, so an approval that already covers this provenance short-circuits the walk.
 */
function verificationChain(run: RunManifest, el: RunElement): NextAction[] {
  if (approvalCovers(run, el)) return ["deliver"];
  if (!captureCovers(run, el)) return ["capture"];
  if (!reviewCovers(run, el)) return ["review"];
  if (!previewCovers(el)) return ["preview"];
  return ["approve"];
}

// Freshness, one rule for the three records: a verification claim is about the provenance it
// was made for, and a re-production moves the provenance under it. Nobody has to remember to
// revoke anything — the same mechanism that lapses an override (#11).
export function captureCovers(run: RunManifest, el: RunElement): boolean {
  return (
    el.capture != null &&
    el.capture.capturedProvenanceHash === provenanceHash(run, el)
  );
}

export function reviewCovers(run: RunManifest, el: RunElement): boolean {
  return (
    el.review != null &&
    el.review.reviewedProvenanceHash === provenanceHash(run, el)
  );
}

export function approvalCovers(run: RunManifest, el: RunElement): boolean {
  return (
    el.approved != null &&
    el.approved.approvedProvenanceHash === provenanceHash(run, el)
  );
}

// The preview is judged on BYTES, not on provenance, because that is what issue #3's gate
// checks: the journalist was shown these exact bytes, in the pinned format's own file genre.
// Delegated to lib/verify so the router and the approval gate cannot disagree about what
// counts as having been shown.
export function previewCovers(el: RunElement): boolean {
  if (!el.artifact) return false;
  const format = chosenOption(el)?.format ?? "static";
  return previewCoversDeliverable(
    format,
    (el.review as ReviewRecord | undefined)?.preview,
    el.artifact.sha256,
  ).ok;
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
  | "captured"
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
  // The rung between produced and reviewed: facts measured at the publication viewport, with
  // nobody having turned them into findings yet. It was missing from a ladder that already
  // named the four others.
  if (
    el.capture &&
    provenance &&
    el.capture.capturedProvenanceHash === provenance
  )
    return "captured";
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
      // An aspect still owed leaves no single channel to judge against — but the answer can
      // already be known: if NO shape of the destination carries the format, no future answer
      // will make it legal. Waiting for the aspect would let a manifest sit on disk asserting a
      // scrolly Instagram Story, which is exactly the state this invariant exists to forbid.
      const { destination } = el.deliverable;
      if (!channel && format) {
        const anywhere = DESTINATION_POLICY[destination].channels.some((c) =>
          isFormatAllowed(c, format),
        );
        if (!anywhere)
          throw new Error(
            `invariant: element ${el.id} pins the "${format}" format on a "${destination}" deliverable, and no shape of that destination carries it`,
          );
      }
    }
    if (
      el.proposal?.chosenId &&
      !el.proposal.options.some((o) => o.id === el.proposal!.chosenId)
    ) {
      throw new Error(
        `invariant: element ${el.id} chosenId '${el.proposal.chosenId}' not among options`,
      );
    }
    // A CHOSEN option must carry a non-empty `why`. An option recorded as chosen on an empty
    // sentence says a journalist chose something nobody showed them.
    //
    // This was PARKED, with its reason, and the reason has been removed rather than overruled
    // (residual sweep 2026-07-27, §3): the rule was right and the codebase could not honour it,
    // because propose() writes every `why` empty on purpose (the brain hands over grounding, the
    // desk writes the language) and NO façade command phrased — so asserting it made lib/host's
    // choose-form structurally unreachable for the very host the façade exists for. The sweep
    // spelled out the order this had to be closed in: "first give applyPhrasing a caller on the
    // host path, then lock the invariant". `phrase --run <dir>` (lib/host/drive.ts's
    // phraseOfferIn) is that caller, and it lands BEFORE this line in the same slice.
    //
    // Scoped to the CHOSEN option, never to the offer: a fresh offer is legitimately unwritten,
    // and persisting one is what every `advance`(propose) does.
    const chosen = chosenOption(el);
    if (chosen && chosen.why.trim() === "")
      throw new Error(
        `invariant: element ${el.id} chose '${chosen.id}', whose why is empty — an option nobody phrased was never shown to anyone`,
      );
    if (el.artifact && !el.angle)
      throw new Error(
        `invariant: element ${el.id} has an artifact without an angle`,
      );
    // The narrative counterpart of the `why` invariant just above, and it says the same thing
    // one layer out: a PAGE recorded as produced while a beat of its walk carries no claim is a
    // page whose prose nobody wrote, shipping under a journalist's byline. Judged on the
    // ARTIFACT, never on the plan alone — a drafted plan with every text empty is the legitimate
    // intermediate state, exactly as a freshly proposed offer is legitimately unphrased.
    const unauthored = el.artifact ? unauthoredBeats(el) : [];
    if (unauthored.length)
      throw new Error(
        `invariant: element ${el.id} produced a page whose ${unauthored.join(", ")} nobody authored`,
      );
    if (el.approved && !el.artifact)
      throw new Error(
        `invariant: element ${el.id} approved without an artifact`,
      );
    if (el.review && !el.artifact)
      throw new Error(
        `invariant: element ${el.id} reviewed without an artifact`,
      );
    // The third member of that family, missing until now (docs/splash/delivery-l1-followups.md):
    // a record saying something was PUBLISHED, on an element that produced nothing. Judged on
    // `delivered`, never on `requested` — asking for a destination before the artifact exists
    // is an ordinary run, and it is the delivered record that makes the claim.
    if (el.delivery && el.delivery.delivered.length > 0 && !el.artifact)
      throw new Error(
        `invariant: element ${el.id} records ${el.delivery.delivered.length} delivered artifact(s) without having produced one`,
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
