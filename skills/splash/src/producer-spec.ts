// The orchestration contract: what the agent hands the spine, and what it gets back.
import type { Channel } from "./channel";
import type { SourceAnswer } from "./source-guard";

export type Producer =
  | "dw-chart"
  | "chart-native"
  | "map-dw"
  | "map-native"
  | "scrolly"
  | "image-native";
// Canonical definition lives in lib/core/vocabulary.ts (the contract's vocabulary);
// re-exported here so this module's existing importers are unchanged.
import type { VisualFormat } from "../../../lib/core/vocabulary";
export type { VisualFormat };

export interface AcceptedProposal {
  id: string; // stable, unique per run (keys the per-proposal outDir)
  producer: Producer;
  format: VisualFormat;
  spec: unknown; // the producer-specific, already-validated spec
  // Gate 1b (CADRAGE): the takeaway the journalist EXPLICITLY confirmed, recorded
  // VERBATIM. REQUIRED on every proposal — Gate 1b is un-skippable on BOTH branches
  // (asked openly on GUIDED, confirm-backed on DIRECT), so there is no proposal that
  // legitimately lacks one. The spine's validation gate (validate-gate.ts) fails a
  // proposal whose confirmedTakeaway is missing/empty: a title↔takeaway divergence is
  // semantic (render-review's job, Gate 3a), but the PRESENCE of the confirmed claim
  // is mechanical — without it the review has nothing authoritative to quote against.
  confirmedTakeaway: string;
  /**
   * THE NARRATIVE KIND the journalist chose for a VIDEO — `story`, `stepped` or `reveal`.
   *
   * A video is not one thing, and until 2026-08-06 nobody asked: `cameraMode` sat at its default
   * and nothing could honestly depend on it. It has to travel on the PROPOSAL rather than only
   * inside the spec because the walk guard needs it: a `reveal` shows no words, so demanding a
   * storyboard for one makes a journalist write sentences that will never appear — and a
   * `stepped` that carries no walk is a step plan nobody wrote.
   *
   * Map track: translated to the spec's `cameraMode`, the field the engines already read
   * (CAMERA_MODE_FOR_KIND). Chart track: this is the ONLY carrier — the same *Reveal composition
   * renders both kinds, and what tells them apart is the walk.
   *
   * Absent on a video ⇒ an open question, refused by name. That is "no silent default" made
   * mechanical rather than left to the orchestrator's discipline (design spec § 6.1).
   */
  narrativeKind?: "story" | "stepped" | "reveal";
  provenance?: "table" | "prose" | "none";
  confirmedTable?: boolean; // Gate 2b: set true only after the human confirms the prose table
  // CADRAGE Q3's confirmed distribution channel (skills/splash/src/channel.ts). Absent
  // ⇒ produce-all's format guard defaults to "article-web" (the permissive default,
  // matching normalizeChannel), so legacy proposals without a channel are unaffected.
  channel?: Channel;
  // Gate 2c (source attribution): the citation the ARTICLE itself named, captured verbatim by
  // suggest-article (its `sourceHint: { name?, url? }`). Threaded here so the spine's source
  // guards (source-guard.ts, wired in validate-gate.ts) can mechanically catch (B) a named org
  // discarded for the generic "reported in this article" fallback, and (D) a journalist-provided
  // URL silently upgraded to a deeper, unconfirmed path. The orchestrator LLM copies it across at
  // §5b — prose-enforced by necessity (no script transforms the in-context ProposalSet into
  // accepted.json), exactly like `channel`/`confirmedTakeaway`. OPTIONAL: absent ⇒ the article
  // named no source (or the orchestrator dropped it — flagged by the dropped-hint observability
  // warning in validate-gate.ts), so the guards stay dormant and the honest name-only/prose
  // fallback passes.
  sourceHint?: { name?: string; url?: string };
  // D18 (Gate 2c dropped-URL comparison): what the JOURNALIST ANSWERED at CADRAGE Q4/Gate 2c —
  // a DIFFERENT question from sourceHint above, which is what the ARTICLE named. Until this
  // carrier existed the journalist's answer was recomposed by hand into `spec.source` by the
  // orchestrator, and a URL given TWICE could ship name-only with no guard able to see it
  // (sourceUrlFidelityReason compares two URLs and stays dormant the moment one is simply
  // absent). Threaded at §5b like sourceHint/channel/confirmedTakeaway — prose-enforced by
  // necessity, same reasoning as sourceHint above. OPTIONAL: absent ⇒ the guard stays dormant,
  // exactly like sourceHint's absence.
  sourceAnswer?: SourceAnswer;
  // Mechanical sub-skill proof (Spotlight practice A5): which skills the orchestrator
  // actually invoked to build this proposal, emitted at §5b like channel/confirmedTakeaway.
  // First entry declares the branch ("splash:cadrage-guided" | "splash:cadrage-direct").
  // OPTIONAL and legacy-safe: absent ⇒ observability warning only. A PRESENT list that
  // declares guided without "suggest-chart" fails the gate — a guided proposal can only
  // come from suggest-chart's candidates, so its absence means the orchestrator re-decided
  // what the sub-skill owns.
  skillsInvoked?: string[];
  // Placement anchor (suggest-article's `anchor: { paragraphIndex, quote }`) — WHERE in the
  // article this element serves the narrative. READ AT EXPORT: skills/splash/src/placement.ts
  // resolves it and export-code.mjs prints the placement block at hand-over, so the sentence no
  // longer depends on the orchestrator remembering an article read dozens of turns earlier.
  // Advisory by design — the journalist does the final placement in their CMS — but SAYING it is
  // not: once a run has read an article, the export refuses an entry that declares neither
  // `anchor` nor `freeStanding` (undeclaredPlacementRefusal). Of the two grains the QUOTE is
  // authoritative: a paragraph index rots when the article is edited between analysis and
  // delivery. Copied across at §5b like sourceHint/confirmedTakeaway.
  anchor?: { paragraphIndex?: number; quote?: string };
  // The OTHER valid placement declaration: this element is bound to no passage of the article
  // (suggest-article proposed it against no specific quote). Set it explicitly — silence is not a
  // valid hand-over on an article run, because nothing distinguishes "no passage" from "the
  // anchor was dropped at §5b". Meaningless without an article; harmless on a bare-topic run.
  freeStanding?: true;
}

export type ProduceStatus =
  "produced" | "failed" | "needs-fallback" | "needs-confirmation";

// One line of the render-review's probes LEDGER (Gate 3a): every check the review
// actually RAN, with its outcome. "pass" = probed and clean; "concern" = probed and
// failing — MUST also be surfaced in reviewConcerns (advisory to the journalist, but
// never silently dropped); "resolved" = probed, initially failing, then explicitly
// resolved — `note` records HOW (the evidence). The ledger is what makes the review
// record mechanical instead of narrative: review-gate refuses an empty ledger, and a
// failure keyword in the narrative that no non-pass probe reflects.
export type ReviewProbeOutcome = "pass" | "concern" | "resolved";

/** A check the gate RAN and read. `outcome` is derived from `exitCode` and is re-derived at the
 *  gate — recording it is a convenience for readers of the report, never the source of truth. */
export interface MechanicalProbe {
  kind: "mechanical";
  check: string; // what was probed (e.g. "GET dataset.csv on the published chart")
  command: string[]; // argv, run by lib/loop/probe-run.ts — never a shell line
  exitCode: number | null; // null ⇒ nothing ran, which is a concern and never a pass
  outcome: ReviewProbeOutcome;
  note?: string; // required for concern (what failed) and resolved (how, with evidence)
}

/** A judgement — the half no exit code can answer. It carries no command on purpose: demanding
 *  one would produce a fake command, which is the lie this split exists to make expensive. Its
 *  credibility comes from WHO made it (ProposalResult.reviewer), not from a process. */
export interface EditorialProbe {
  kind: "editorial";
  check: string;
  outcome: ReviewProbeOutcome;
  note?: string;
}

export type ReviewProbe = MechanicalProbe | EditorialProbe;

/** WHO conducted the editorial half, and the fingerprint of what it returned. The same
 *  vocabulary lib/verify/review.ts records (`independentSemanticReview`), because it is the same
 *  fact: a review that claims independence must name the actor and produce its output, and the
 *  absence of one is RECORDED rather than converted into a pass. */
export interface ReviewerAttribution {
  name: string;
  version: string;
  outputHash: string;
  independentSemanticReview: "available" | "unavailable" | "declined";
}

export interface ProposalResult {
  id: string;
  producer: Producer; // the producer the accepted proposal COMMITTED to (declared)
  // GUARD 1: the producer that ACTUALLY ran, as reported by the dispatch. Recorded so the
  // report is honest about any switch; produce-all fails a mismatch (except native→dw).
  actualProducer?: Producer;
  format: VisualFormat;
  status: ProduceStatus;
  outputs?: string[]; // file paths (file-based producers)
  publicUrl?: string; // hosted URL (cloud producers)
  reason?: string; // needs-fallback / needs-confirmation explanation
  error?: string; // failed explanation
  warnings?: string[]; // non-blocking validation warnings, surfaced at the render gate
  reviewed?: boolean; // render-review ran (Layer 2); export is refused until it has
  reviewConcerns?: string[]; // advisory editorial concerns from the review, shown at Gate 3
  reviewProbes?: ReviewProbe[]; // the review's probes ledger (Gate 3a), set by review-gate
  reviewer?: ReviewerAttribution; // set by review-gate; absent on reports written before this
  renderApproved: boolean; // Gate 3, default false
  approvedHash?: string; // sha256 of the approved artifact, set by the render gate
  /** sha256 of the artifact as it was SHOWN to the journalist, read from the presentation
   *  receipt beside it (lib/loop/presentation.ts) — never reported by the step asking for the
   *  approval. Equal to approvedHash on every approval this gate writes; recorded separately so
   *  a report says out loud that the two were compared rather than assumed. */
  shownSha256?: string;
  /** verified human editorial sign-offs over approvedHash (S4d); undefined = none */
  editorialSignoffs?: {
    signerId: string;
    signedHash: string;
    signature: string;
  }[];
  // The sanctioned-spec provenance for the export chain check (S1 strict production
  // seam): sha256 of the canonicalized PRE-merge AcceptedProposal.spec accepted for THIS
  // result — NOT the profile-merged spec actually dispatched to the producer. The export
  // stage re-hashes accepted.json on disk (which holds the pre-merge spec), so the two
  // must match. Set on every PRODUCED result only — a failed/needs-fallback/
  // needs-confirmation result has no artifact to trace back to a spec. Optional only for
  // legacy-report back-compat; produceAll always sets it on a produced result.
  acceptedConfigHash?: string;
}

export interface ProduceReport {
  // ISO timestamp stamped by produceAll AFTER every dispatch returned — the produce
  // GENERATION anchor. gate-render's provenance check (render-provenance.ts) compares
  // the approved file's mtime against it: every pipeline-emitted artifact predates it,
  // so a file newer than this stamp was NOT emitted by the produce this report records
  // (hand-planted, or a later produce whose fresh report was never saved). Optional
  // only for legacy reports; produce-all always writes it.
  generatedAt?: string;
  results: ProposalResult[];
  // Menu-level (batch-wide) advisory warnings, surfaced at the render gate — distinct from a
  // result's per-proposal `warnings`. Today's only source: the narrative-consideration signal
  // (Tom #3, skills/splash/src/candidate-provenance.ts `narrativeConsiderationWarning`), attached
  // by the produce-all CLI from the candidates.json menu. Absent ⇒ no menu-level concern.
  warnings?: string[];
}
