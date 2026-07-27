// The zod shape of a review record, so lib/loop/manifest.ts can VALIDATE what lands in its
// dormant `review` slot instead of taking it on trust.
//
// The compatibility rule that governs every line here: the slot has been on disk since it
// was reserved, holding `{ findings: unknown[], reviewedProvenanceHash }`. A run written
// before this file existed must still parse — a tightened schema that refused it would
// strand every manifest already on disk, which is not a trade a verification layer gets to
// make. So `findings` accepts either the structured Finding or an opaque legacy value, and
// every field this layer adds is optional.
import { z } from "zod";
import {
  BREAKPOINTS,
  CRITERIA,
  FINDING_PROVENANCES,
  FINDING_STATUSES,
  FURNITURE_ROLES,
  PREVIEW_PRESENTATIONS,
  REVIEWER_MODES,
  SEVERITIES,
  TASTE_DIMENSIONS,
} from "./types";

const ViewportSchema = z.object({ width: z.number(), height: z.number() });
const BoxSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const FindingSchema = z.object({
  id: z.string(),
  criterion: z.enum(CRITERIA),
  severity: z.enum(SEVERITIES),
  status: z.enum(FINDING_STATUSES),
  summary: z.string(),
  evidence: z.array(z.string()),
  provenance: z.enum(FINDING_PROVENANCES),
  confidence: z.enum(["high", "medium", "low"]).optional(),
});

export const OverrideSchema = z.object({
  findingId: z.string(),
  reason: z.string(),
  actorLabel: z.string(),
  at: z.string(),
  artifactSha256: z.string(),
  provenanceHash: z.string(),
});

export const CaptureRecordSchema = z.object({
  breakpoint: z.enum(BREAKPOINTS),
  path: z.string(),
  sha256: z.string(),
  cssViewport: ViewportSchema,
  deviceScaleFactor: z.number(),
  rootBox: BoxSchema,
  rootSelector: z.string(),
  documentScroll: ViewportSchema,
  artifactSha256: z.string(),
  artifactPath: z.string(),
  destinationId: z.string(),
  channel: z.string(),
  format: z.string(),
  capturedAt: z.string(),
  marks: z.number(),
  markColours: z.array(z.string()),
});

export const CaptureCheckSchema = z.object({
  id: z.string(),
  breakpoint: z.enum(BREAKPOINTS),
  outcome: z.enum(["pass", "fail"]),
  detail: z.string(),
  role: z.enum(FURNITURE_ROLES).optional(),
});

export const PreviewRecordSchema = z.object({
  deliverablePath: z.string(),
  deliverableSha256: z.string(),
  presentedAs: z.enum(PREVIEW_PRESENTATIONS),
  presentedAt: z.string(),
  fallbackReason: z.string().optional(),
});

// No `outcome`, no `severity` — the schema is part of the guard. A taste risk that could be
// persisted with a verdict attached would become a graded axis the moment someone wrote one.
export const TasteRiskSchema = z.object({
  dimension: z.enum(TASTE_DIMENSIONS),
  detector: z.string(),
  evidence: z.array(z.string()),
  routedTo: z.literal("human-signoff"),
});

export const ReviewerAttributionSchema = z.object({
  mode: z.enum(REVIEWER_MODES),
  name: z.string(),
  version: z.string(),
  inputsHash: z.string(),
  outputHash: z.string(),
  independentSemanticReview: z.enum(["available", "unavailable", "declined"]),
});

// What `capture` measured, held on the element in its OWN slot rather than folded into the
// review one. Two verbs produce two facts, and gateStateOf reads `review` to answer
// "reviewed": writing a half-filled review record at capture time would make the manifest
// claim an artifact had been REVIEWED when no finding had been produced yet.
//
// `unsupported` carries the verb's own reason when capture cannot cover this format at all
// (video: frame extraction needs ffmpeg). The slot is then EMPTY and says why — which is what
// lets review emit its blocking `no-capture` finding instead of the run stalling forever on a
// step that can never succeed.
export const CaptureSlotSchema = z.object({
  images: z.array(CaptureRecordSchema),
  checks: z.array(CaptureCheckSchema),
  capturedProvenanceHash: z.string(),
  unsupported: z.string().optional(),
});

// The slot's schema: the legacy two fields required, everything this layer adds optional
// and defaulted, so an old manifest and a new one are both valid values of one type.
export const ReviewSlotSchema = z.object({
  findings: z.array(z.union([FindingSchema, z.unknown()])),
  reviewedProvenanceHash: z.string(),
  reviewer: ReviewerAttributionSchema.optional(),
  captures: z.array(CaptureRecordSchema).optional(),
  checks: z.array(CaptureCheckSchema).optional(),
  tasteRisk: z.array(TasteRiskSchema).optional(),
  overrides: z.array(OverrideSchema).optional(),
  acknowledged: z.array(z.string()).optional(),
  preview: PreviewRecordSchema.optional(),
});
