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

// One renderable type of an engine, in the engine's OWN render-key vocabulary (chart-native
// says "slope", dw-chart says "d3-range-plot" for the same KB sheet). `deferred` carries the
// reason a type is declared but not reachable — declaring it is what lets the proposal brain
// say "not offered, and here is why" instead of pretending the type does not exist.
export type EngineType = { id: string; deferred?: string };

export interface ProducerManifest {
  name: string; // e.g. "chart-native" — matches AcceptedProposal.producer
  formats: readonly VisualFormat[];
  /** What this engine can render. Absent/empty ⇒ the engine owns no type of its own. */
  types?: readonly EngineType[];
  // The refusal this engine wants a caller to see when it is asked for a format it does
  // not declare. Optional: without it the contract composes a generic message. It exists
  // so a pre-dispatch gate does not silently replace wording a journalist may already
  // know from the engine's own CLI (image-native's v1 message is the live case).
  unsupportedFormatMessage?: string;
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
  // in-process: the engine's own produce fn, imported and awaited by the render verb
  // (lib/core/verbs/render.ts) — the two hosted-DW engines implement it, and no caller
  // reaches produceChart / produceMap on its own any more.
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

export function engineTypes(name: string): readonly EngineType[] {
  return REGISTRY.get(name)?.types ?? [];
}

// Renderable = declared by that engine AND not deferred. Both halves matter: an undeclared
// type has no mapper, a deferred one has no guard.
export function isRenderable(engine: string, typeId: string): boolean {
  const t = engineTypes(engine).find((e) => e.id === typeId);
  return t != null && t.deferred == null;
}
