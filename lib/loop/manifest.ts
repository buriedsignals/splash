import { z } from "zod";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { canonicalHash } from "./canonical-hash";
import { migrate } from "./migrate";
import { INTENTS } from "../brain/intents";
import { VISUAL_FORMATS, CHANNELS as CHANNEL_KEYS } from "../core/vocabulary";
import { isLoopBuildable } from "./buildable";

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
const RunElementSchema = z.object({
  id: z.string(),
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
  review: z
    .object({
      findings: z.array(z.unknown()),
      reviewedProvenanceHash: z.string(),
    })
    .optional(),
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
          snippet: z.string(),
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
const RunManifestSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal(4),
  /** The relationship to the text: an embeddable element, or the visual article itself. */
  route: z.enum(["embed", "article"]).default("embed"),
  /** Where this run publishes — the SCOPE axis, and what produce renders at. */
  channel: z.enum(CHANNEL_KEYS).default("article-web"),
  input: z.object({ data: HashRef.optional(), article: HashRef.optional() }),
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
  | "produce"
  | "show"
  | "deliver";

export function parseManifest(raw: unknown): RunManifest {
  return RunManifestSchema.parse(raw);
}

// The artifact depends on exactly these. Any change ⇒ the produced artifact is stale.
export function provenanceHash(run: RunManifest, el: RunElement): string {
  return canonicalHash({
    inputData: run.input.data?.sha256 ?? null,
    inputArticle: run.input.article?.sha256 ?? null,
    cadrage: run.cadrage?.answers ?? null,
    angle: el.angle ?? null,
    chosenId: el.proposal?.chosenId ?? null,
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
  const chosen = el.proposal.options.find(
    (o) => o.id === el.proposal!.chosenId,
  );
  if (chosen && !isLoopBuildable(chosen.engine)) return ["choose-form"];
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

// State-driven next actions: run-level gates first (orient + honest off-ramp),
// then the live element's routing. Multi-element aggregation arrives with Task 8;
// the live path drives elements[0].
export function nextActions(run: RunManifest): NextAction[] {
  if (!run.orient) return ["orient"];
  if (!run.orient.supportsPoint) return [];
  return nextActionsForElement(run, run.elements[0]);
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
  for (const el of run.elements) {
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
  }
}
