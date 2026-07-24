import type { Channel, VisualFormat } from "../vocabulary";

// The `render` payload — NEUTRAL by contract (invariant I2): it knows nothing of
// AcceptedProposal (the legacy orchestrator) nor RunManifest (the editorial loop). Each
// caller translates into it. Every field is JSON-serializable (invariant I6) and `spec`
// is OPAQUE (invariant I3) — only the engine's own manifest validator understands it.
export type RenderPayload = {
  engine: string; // registry key: "chart-native", "dw-chart", …
  spec: unknown;
  format: VisualFormat;
  channel: Channel; // always resolved — defaulting is the caller's policy
  outDir: string;
  id: string; // slug; checked before any path resolution
};

export type VerbErrorCode =
  | "invalid-request" // verb outside the enum, or a malformed payload
  | "unknown-engine" // no manifest registered under this key
  | "unsupported-format" // the engine does not declare this format
  | "invalid-spec" // the engine's validator returned errors
  | "engine-declined" // the engine refuses THIS spec (chart-native exit 2)
  | "engine-failed" // non-zero execution, or a broken delivery
  | "not-implemented"; // declared verb, no body yet

// Invariant I1: every path returns one of these. A verb NEVER throws — the legacy's
// "drop-proof" discipline generalized, because a non-JS host has no catch.
export type VerbResult<T> =
  { ok: true; value: T } | { ok: false; code: VerbErrorCode; message: string };

export function ok<T>(value: T): VerbResult<T> {
  return { ok: true, value };
}

export function fail(code: VerbErrorCode, message: string): VerbResult<never> {
  return { ok: false, code, message };
}
