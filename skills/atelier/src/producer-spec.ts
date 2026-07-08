// The orchestration contract: what the agent hands the spine, and what it gets back.
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
}

export type ProduceStatus =
  "produced" | "failed" | "needs-fallback" | "needs-confirmation";

export interface ProposalResult {
  id: string;
  producer: Producer;
  format: VisualFormat;
  status: ProduceStatus;
  outputs?: string[]; // file paths (file-based producers)
  publicUrl?: string; // hosted URL (cloud producers)
  reason?: string; // needs-fallback / needs-confirmation explanation
  error?: string; // failed explanation
  warnings?: string[]; // non-blocking validation warnings, surfaced at the render gate
  renderApproved: boolean; // Gate 3, default false
  approvedHash?: string; // sha256 of the approved artifact, set by the render gate
}

export interface ProduceReport {
  results: ProposalResult[];
}
