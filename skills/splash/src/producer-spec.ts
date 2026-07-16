// The orchestration contract: what the agent hands the spine, and what it gets back.
import type { Channel } from "./channel";

export type Producer =
  "dw-chart" | "chart-native" | "map-dw" | "map-native" | "scrolly";
export type VisualFormat = "static" | "interactive" | "video" | "scrolly";

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
  // Mechanical sub-skill proof (Spotlight practice A5): which skills the orchestrator
  // actually invoked to build this proposal, emitted at §5b like channel/confirmedTakeaway.
  // First entry declares the branch ("splash:cadrage-guided" | "splash:cadrage-direct").
  // OPTIONAL and legacy-safe: absent ⇒ observability warning only. A PRESENT list that
  // declares guided without "suggest-chart" fails the gate — a guided proposal can only
  // come from suggest-chart's candidates, so its absence means the orchestrator re-decided
  // what the sub-skill owns.
  skillsInvoked?: string[];
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
export interface ReviewProbe {
  check: string; // what was probed (e.g. "GET dataset.csv on the published chart")
  outcome: ReviewProbeOutcome;
  note?: string; // required for concern (what failed) and resolved (how, with evidence)
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
  renderApproved: boolean; // Gate 3, default false
  approvedHash?: string; // sha256 of the approved artifact, set by the render gate
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
}
