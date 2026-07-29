// The verify layer's vocabulary. Every list below is a const array with its union type
// DERIVED from it — the same discipline lib/core/vocabulary.ts records: a runtime gate needs
// the values, and a hand-written second copy of the list is the drift this shape abolishes.
//
// Nothing here imports lib/loop: lib/loop/manifest.ts imports THIS package (to hold the
// review record in its dormant slot), so the arrow only ever points one way.
import type { Channel, VisualFormat } from "../core/vocabulary";

// ---------------------------------------------------------------------------------------
// Findings (issue #11)
// ---------------------------------------------------------------------------------------

// What a finding is ABOUT. Closed on purpose: a criterion outside this list has no entry in
// the central severity table, and severityFor() answers "warning" for it — visible drift
// rather than a silent informational.
export const CRITERIA = [
  "source", // attribution: fabricated, unverifiable, or absent
  "accessibility", // alt text, contrast, keyboard reach
  "title-fidelity", // the title states something the visual does not show
  "data-fidelity", // a claim the data does not support
  "interaction", // an interaction the format REQUIRES is broken
  "furniture", // required furniture missing, hidden, or out of frame
  "viewport", // the still does not represent the publication container
  "provenance", // stale / unproven artifact
  "craft", // legibility and polish beyond a mechanical threshold
  "colour-semantics", // palette subject-fit, convention, CVD
  "narrative", // framing, arc, beat order
] as const;
export type Criterion = (typeof CRITERIA)[number];

export const SEVERITIES = ["blocking", "warning", "informational"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const FINDING_STATUSES = [
  "open",
  "resolved",
  "acknowledged",
  "overridden",
] as const;
export type FindingStatus = (typeof FINDING_STATUSES)[number];

// WHAT produced this finding — the label that keeps the three provenances from blending
// into an undifferentiated "reviewed". "mechanical" is code on the rendered artifact,
// "independent" is a critique pass that did not author the proposal, "self-review" is the
// authoring reasoning grading itself (recorded truthfully, never dressed as independent).
export const FINDING_PROVENANCES = [
  "mechanical",
  "independent",
  "self-review",
] as const;
export type FindingProvenance = (typeof FINDING_PROVENANCES)[number];

export type Finding = {
  id: string;
  criterion: Criterion;
  severity: Severity;
  status: FindingStatus;
  summary: string;
  evidence: string[];
  provenance: FindingProvenance;
  confidence?: "high" | "medium" | "low";
};

// A journalist knowingly shipping past a finding. Bound to the exact bytes AND the exact
// provenance: a re-production moves both, so the override lapses mechanically rather than
// by anyone remembering to revoke it (#11).
export type Override = {
  findingId: string;
  reason: string;
  actorLabel: string;
  at: string;
  artifactSha256: string;
  provenanceHash: string;
};

// ---------------------------------------------------------------------------------------
// Capture (issue #10)
// ---------------------------------------------------------------------------------------

export const BREAKPOINTS = ["narrow", "primary", "wide"] as const;
export type Breakpoint = (typeof BREAKPOINTS)[number];

export type Viewport = { width: number; height: number };

export type CaptureTarget = {
  breakpoint: Breakpoint;
  cssViewport: Viewport;
  deviceScaleFactor: number;
};

// The newsroom's REAL embed contract. #10's warning, verbatim: "Avoid assuming one universal
// 'article web' rectangle: the newsroom delivery profile should supply its real embed
// width/height or responsive contract." Absent, resolveTargets falls back to CHANNEL_POLICY
// — a documented default, not a magic number.
export type DestinationProfile = {
  id: string;
  primary: Viewport;
  narrow?: Viewport;
  wide?: Viewport;
  deviceScaleFactor?: number;
};

export const FURNITURE_ROLES = [
  "title",
  "unit",
  "source",
  "credit",
  "alt-text",
] as const;
export type FurnitureRole = (typeof FURNITURE_ROLES)[number];

// Furniture is declared as expected TEXT, never as a selector: it is the only description
// that is true for all six engines at once and asks no engine to annotate its DOM. The
// caller knows which title, unit and source it commissioned; capture proves they are there,
// visible, and inside the captured rectangle.
export type FurnitureExpectation = { role: FurnitureRole; text: string };

export type Box = { x: number; y: number; width: number; height: number };

// How a deliverable's own pixel box relates to the box its destination publishes at.
//
//   "pinned"         — both axes are the destination's. The ordinary case: a chart scaled INTO
//                      its box, and the only shape a size check could express until now.
//   "content-driven" — the WIDTH is the destination's; the HEIGHT belongs to the content. Not a
//                      tolerance and not a laxer mode: it is a different, verifiable statement,
//                      and the width leg is checked exactly as hard as before.
//
// It exists because a real engine really behaves this way. A Datawrapper ROW-DRIVEN export (the
// bar family, dot / arrow / range plots, tables) lays each data row out as its own track, so its
// natural height grows with the row count — and Datawrapper does not SCALE those rows into a
// pinned box, it CROPS the ones that overflow (silent data loss in an owned deliverable). The
// engine therefore exports such a chart width-only, ON PURPOSE, and a 3-row bar chart legitimately
// comes back 1200x600 for a 1200x675 destination.
//
// The caller DECLARES it; nothing here infers it. WHICH types grow with their rows is engine
// knowledge (skills/dw-chart/src/export-aspect.ts ROW_DRIVEN_TYPES), and a list of type names in
// this layer would be that knowledge's second, driftable home — the wrong layer for it, and the
// kind of copy this codebase has already paid for. Absent ⇒ "pinned", so every caller that has
// nothing to declare is unchanged.
export const HEIGHT_POLICIES = ["pinned", "content-driven"] as const;
export type HeightPolicy = (typeof HEIGHT_POLICIES)[number];

export type CaptureRecord = {
  breakpoint: Breakpoint;
  path: string; // the review image
  sha256: string; // of the review image
  cssViewport: Viewport;
  deviceScaleFactor: number;
  rootBox: Box;
  rootSelector: string; // which candidate matched — a wrong root stays READABLE in the proof
  documentScroll: Viewport;
  /** The deliverable these pixels came from. A file's own sha256 — or, for a published embed
   *  that has no bytes at all, the HOSTED BINDING over its address and its primary still
   *  (lib/verify/hosted.ts). One field, because every downstream record binds to one subject. */
  artifactSha256: string;
  /** Set when the deliverable is a FILE this run owns. Exactly one of the two is set. */
  artifactPath?: string;
  /** Set when the deliverable is PUBLISHED and the run owns no file of it: the address the
   *  browser actually landed on, which is what the binding above is computed over. */
  artifactUrl?: string;
  destinationId: string;
  channel: Channel;
  format: VisualFormat;
  capturedAt: string;
  marks: number; // rendered mark elements — density input, not a verdict
  markColours: string[]; // colours actually painted — palette-adjacency input
  /** The title the RENDER itself declares, read off the live DOM — evidence, not a claim an
   *  upstream caller makes about what it commissioned. Absent when the deliverable has no DOM
   *  (a static image) or when no candidate named a title. */
  renderedTitle?: string;
  /** WHICH candidate answered, or "none" / "static-image". Same discipline as `rootSelector`:
   *  a wrong extraction stays readable in the proof instead of silently standing in for the
   *  real headline. */
  titleSource?: string;
  /** The policy this image's SIZE was measured under, recorded only when it is not the default
   *  "pinned". Same discipline as `rootSelector` and `titleSource`: a check that forgave an axis
   *  must say so IN the evidence, so a reader of the record can see why a 1200x600 image passed
   *  against a 1200x675 destination instead of having to re-derive it. */
  heightPolicy?: HeightPolicy;
};

export type CaptureCheckId =
  | "capture:furniture-present"
  | "capture:furniture-in-frame"
  | "capture:fits-viewport"
  | "capture:size-matches-destination"
  // The ceiling a CONTENT-DRIVEN deliverable still has. Its own id, not a reading of the two
  // above: those ask "is this the box?" and the answer for a content-driven height is
  // legitimately no. This asks a different question — "is this still a chart, or has a runaway
  // row count produced something nobody can publish?" — and a journalist must be told which.
  | "capture:height-within-bound";

// A measured FACT, not a verdict. review.ts is the single place that turns facts into
// severity-bearing findings (#11: "define the severity mapping centrally").
export type CaptureCheck = {
  id: CaptureCheckId;
  breakpoint: Breakpoint;
  outcome: "pass" | "fail";
  detail: string;
  role?: FurnitureRole;
};

export type CaptureResult = {
  images: CaptureRecord[];
  checks: CaptureCheck[];
};

// What an element carries once capture has run: the result, pinned to the provenance it was
// taken for, plus the verb's reason when this format cannot be captured at all.
export type CaptureSlot = CaptureResult & {
  capturedProvenanceHash: string;
  unsupported?: string;
};

// ---------------------------------------------------------------------------------------
// Preview (issue #3)
// ---------------------------------------------------------------------------------------

export const PREVIEW_PRESENTATIONS = [
  "opened", // a viewer was launched on the deliverable
  "embedded", // the deliverable was rendered inline where the journalist is reading
  "path-printed", // no GUI available: the absolute path was printed (needs fallbackReason)
] as const;
export type PreviewPresentation = (typeof PREVIEW_PRESENTATIONS)[number];

export type PreviewRecord = {
  deliverablePath: string;
  deliverableSha256: string;
  presentedAs: PreviewPresentation;
  presentedAt: string;
  fallbackReason?: string;
};

// ---------------------------------------------------------------------------------------
// Taste risk — the "needs-human-eye" lane
// ---------------------------------------------------------------------------------------

export const TASTE_DIMENSIONS = [
  "density",
  "whitespace",
  "palette-adjacency",
  "title-takeaway-divergence",
  // D16 (spec §4.2, SIGNAL not block): the title-vs-takeaway divergence detector above measures
  // OVERLAP against a low floor, so it is structurally blind to a title that carries only PART
  // of the confirmed takeaway (overlap stays well above the divergence floor) and to a title
  // that ADDS a claim nobody confirmed (overlap-based measures cannot see additions at all).
  "title-partial-coverage",
  "title-overrun",
] as const;
export type TasteDimension = (typeof TASTE_DIMENSIONS)[number];

// Deliberately verdict-free: no `outcome`, no `severity`, no `pass`. A taste risk is routed
// to the human editor who already signs off, because an LLM agreeing with another LLM
// measures self-consistency, not correctness (the project's own S4c finding). The type is
// the guard: there is no field in which a model could record a grade.
export type TasteRiskSignal = {
  dimension: TasteDimension;
  detector: string;
  evidence: string[];
  routedTo: "human-signoff";
};

// ---------------------------------------------------------------------------------------
// The review record
// ---------------------------------------------------------------------------------------

export const REVIEWER_MODES = [
  "mechanical",
  "independent",
  "self-review",
] as const;
export type ReviewerMode = (typeof REVIEWER_MODES)[number];

export type ReviewerAttribution = {
  mode: ReviewerMode;
  name: string;
  version: string;
  inputsHash: string;
  outputHash: string;
  // Never inferred from the absence of findings. #9: "If the independent reviewer is
  // unavailable, do not silently claim independence."
  independentSemanticReview: "available" | "unavailable" | "declined";
};

export type ReviewRecord = {
  findings: Finding[];
  reviewedProvenanceHash: string;
  reviewer: ReviewerAttribution;
  captures: CaptureRecord[];
  checks: CaptureCheck[];
  tasteRisk: TasteRiskSignal[];
  overrides: Override[];
  acknowledged: string[]; // finding ids a journalist has seen and accepted
  preview?: PreviewRecord;
};

// ---------------------------------------------------------------------------------------
// Reviewer input (issue #9) — what a critique pass is allowed to see
// ---------------------------------------------------------------------------------------

export type EvidenceExtract = { text: string; provenance: string };

export type ReviewerRender = {
  breakpoint: Breakpoint;
  path: string;
  cssViewport: Viewport;
  deviceScaleFactor: number;
  rootBox: Box;
  artifactSha256: string;
};

export type InteractionResult = {
  name: string;
  outcome: "pass" | "fail";
  detail: string;
};

export type ReviewerInput = {
  format: VisualFormat;
  channel: Channel;
  confirmedTakeaway: string;
  unit: string;
  altText: string;
  sourceName: string;
  evidenceExtracts: EvidenceExtract[];
  renders: ReviewerRender[];
  interactionResults: InteractionResult[];
  rubric: string[];
  renderedTitle?: string;
};
