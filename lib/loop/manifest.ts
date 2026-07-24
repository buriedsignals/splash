import { z } from "zod";
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { canonicalHash } from "./canonical-hash";

const HashRef = z.object({ path: z.string(), sha256: z.string() });
const DataProfileSchema = z.object({
  columns: z.array(z.string()),
  numericColumns: z.array(z.string()),
  rowCount: z.number(),
});
const FormOptionSchema = z.object({
  id: z.string(),
  nativeType: z.string(),
  why: z.string(),
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
    .object({ requested: z.array(z.string()), delivered: z.array(HashRef) })
    .optional(),
  blocked: z.object({ reason: z.string(), at: z.string() }).optional(),
  dropped: z.object({ reason: z.string(), at: z.string() }).optional(),
  approved: z
    .object({ signoffPath: z.string(), approvedProvenanceHash: z.string() })
    .optional(),
});
const RunManifestSchema = z.object({
  runId: z.string(),
  schemaVersion: z.literal(2),
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

export type NextAction =
  "orient" | "confirm-angle" | "propose" | "choose-form" | "produce" | "show";

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

export function readManifest(path: string): RunManifest {
  return parseManifest(JSON.parse(readFileSync(path, "utf8")));
}

// State-driven next actions: run-level gates first (orient + honest off-ramp),
// then the live element's routing. Multi-element aggregation arrives with Task 8;
// the live path drives elements[0].
export function nextActions(run: RunManifest): NextAction[] {
  if (!run.orient) return ["orient"];
  if (!run.orient.supportsPoint) return [];
  const el = run.elements[0];
  if (!el || !el.angle) return ["confirm-angle"];
  if (!el.proposal) return ["propose"];
  if (el.proposal.options.length === 0) return [];
  if (!el.proposal.chosenId) return ["choose-form"];
  if (!el.artifact || stalenessOf(run, el)) return ["produce"];
  return ["show"];
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
  if (el.delivery && el.delivery.delivered.length > 0 && fresh)
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
  if (el.artifact) return stalenessOf(run, el) ? "stale" : "produced";
  if (el.proposal?.chosenId) return "chosen";
  if (el.proposal) return "proposed";
  if (el.angle) return "angled";
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
