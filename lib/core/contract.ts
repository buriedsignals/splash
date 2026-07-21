// The in-process produce contract — MINIMAL placeholder (Task 7).
//
// Task 8 (the uniform produce path + contract-validation) fills these in with the real
// shapes and wires each in-process engine's `inProcess(spec, ctx)` to its produce entry
// (produceChart / produceMap). For Task 7 the registry only needs these types to EXIST so
// `ProducerManifest.inProcess` typechecks; no code path constructs or consumes a real
// ProduceContext / DeliveredArtifact yet (in-process dispatch still calls produceChart /
// produceMap directly in adapters.ts, unchanged). Keep this surface small on purpose —
// widening it here would pre-empt Task 8's design.
import type { VisualFormat } from "../../skills/splash/src/producer-spec";

// What the spine hands an in-process producer. Minimal today: the pinned single format
// and the per-proposal output directory are the two things every producer needs. Task 8
// expands this (channel, id, spec-envelope, …) as the uniform path is built.
export interface ProduceContext {
  format: VisualFormat;
  outDir: string;
}

// What an in-process producer returns. Minimal today — mirrors the shape the current
// realDispatch cloud branch already produces (files + optional hosted URL). Task 8
// formalises the delivered-artifact contract (form, report, assertion hooks).
export interface DeliveredArtifact {
  format: VisualFormat;
  form: string;
  files: string[];
  report: Record<string, unknown>;
  publicUrl?: string;
}
