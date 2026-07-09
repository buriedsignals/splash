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
  provenance?: "table" | "prose" | "none";
  confirmedTable?: boolean; // Gate 2b: set true only after the human confirms the prose table
  // CADRAGE Q3's confirmed distribution channel (skills/atelier/src/channel.ts). Absent
  // ⇒ produce-all's format guard defaults to "article-web" (the permissive default,
  // matching normalizeChannel), so legacy proposals without a channel are unaffected.
  channel?: Channel;
}

export type ProduceStatus =
  "produced" | "failed" | "needs-fallback" | "needs-confirmation";

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
  renderApproved: boolean; // Gate 3, default false
  approvedHash?: string; // sha256 of the approved artifact, set by the render gate
}

export interface ProduceReport {
  results: ProposalResult[];
}
