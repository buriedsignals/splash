// The producer registry — the single source of truth for dispatch data.
//
// Before this module, "which producer runs how" lived in hard-coded switches and maps
// scattered across skills/splash (isFileBased / SCRIPT / SKILL_DIR / CHANNEL_THREADED_
// PRODUCERS in adapters.ts, plus the realDispatch producer switch). Each engine now
// SELF-REGISTERS one ProducerManifest (skills/<engine>/src/manifest.ts, imported once via
// skills/splash/src/register-producers.ts), and dispatch reads that data instead. Adding
// an engine is one file: its manifest. See docs/superpowers/specs/
// 2026-07-20-shared-core-registry-contracts-design.md.
import type { VisualFormat } from "./vocabulary";
import type { ProduceContext, DeliveredArtifact } from "./contract";

// How a producer is executed. "subprocess" = shell out to the engine's own build/render
// script (chart-native, map-native, scrolly, image-native — the file-based producers).
// "in-process" = import + await the engine's produce fn (dw-chart, map-dw — the hosted-DW
// producers). This is exactly the fork adapters.ts's isFileBased used to hard-code.
export type ExecutionModel = "subprocess" | "in-process";

export interface ProducerManifest {
  name: string; // e.g. "chart-native" — matches AcceptedProposal.producer
  formats: readonly VisualFormat[];
  // Spec-in validation: error strings (empty = valid). Delegates to the engine's EXISTING
  // hand-written validator (no zod — the codebase does not use it). Errors-only by
  // contract; validate-gate.ts keeps its own richer per-producer dispatch (warnings +
  // format context) until Task 8 unifies the two onto this surface.
  validate: (spec: unknown) => string[];
  execution: ExecutionModel;
  // subprocess: the entry script + skill cwd + whether SPLASH_CHANNEL is threaded (the
  // SCRIPT / SKILL_DIR / CHANNEL_THREADED_PRODUCERS data, now colocated with the engine).
  subprocess?: {
    scriptPath: string;
    skillDir: string;
    threadsChannel: boolean;
  };
  // in-process: wired in Task 8 (the uniform produce path). Present as a typed slot now so
  // the registry is complete; adapters.ts still calls produceChart / produceMap directly.
  inProcess?: (
    spec: unknown,
    ctx: ProduceContext,
  ) => Promise<DeliveredArtifact>;
}

const REGISTRY = new Map<string, ProducerManifest>();

// Register one engine's manifest. Throws on a duplicate name — intentional: it catches a
// double-import of register-producers (module caching normally prevents that) rather than
// silently shadowing a producer. Also fails-fast on a manifest whose execution model and
// payload disagree (subprocess without subprocess config, in-process without inProcess),
// so a malformed manifest is caught at registration, never at dispatch.
export function registerProducer(m: ProducerManifest): void {
  if (REGISTRY.has(m.name))
    throw new Error(`producer already registered: ${m.name}`);
  if (m.execution === "subprocess" && !m.subprocess)
    throw new Error(`subprocess producer ${m.name} missing subprocess config`);
  if (m.execution === "in-process" && !m.inProcess)
    throw new Error(`in-process producer ${m.name} missing inProcess fn`);
  REGISTRY.set(m.name, m);
}

export function getProducer(name: string): ProducerManifest | undefined {
  return REGISTRY.get(name);
}

export function allProducers(): ProducerManifest[] {
  return [...REGISTRY.values()];
}
