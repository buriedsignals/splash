// WHAT A RENDERED FORM CANNOT DO, per (engine, nativeType, format) — and how we know.
//
// The gap this closes: there was NO machine description of render FEATURES anywhere.
// ProducerManifest (lib/core/registry.ts:25-55) carries formats and a flat type list;
// NEWSROOM_CAPABILITIES (lib/newsroom/capabilities.ts:60) describes what the newsroom turned
// ON, never what a type can draw; the KB frontmatter has no `labels:`, no `tooltips:`, no
// `annotations:`. So a promise made mid-dialogue rested entirely on the model reading the
// source — and the sweep measured it reading, then promising the opposite.
//
// ── THIS LIST MUST SHRINK ──────────────────────────────────────────────────────────────────
// A declared limit is a DEBT, not a state. What removes an entry is a RENDER MEASUREMENT that
// comes back green — never an opinion, never a refactor that "should" have fixed it. And what
// ADDS one is equally a measurement: `measuredBy` is required and must be non-empty, because a
// refusal nobody measured is a false in the other direction (decision 2, 2026-07-29).
//
// Registration mirrors registerProducer (lib/core/registry.ts:64): each engine declares its own
// limits from its own manifest, so the fact lives WITH the engine and there is one registration
// idiom in the repo, not two.
import type { VisualFormat } from "./vocabulary";

export type RenderFeature =
  "keyboard" | "hover-values" | "direct-labels" | "annotations";

export type FeatureLimit = {
  feature: RenderFeature;
  /** The sentence a journalist reads. The offer's declaration and any later refusal show THIS
   *  string — one wording, the rule the video quadrant closure established. */
  sentence: string;
  /** WHERE it was established: a `path:line`, or the command that measured it. */
  measuredBy: string;
};

type LimitsFn = (nativeType: string, format: VisualFormat) => FeatureLimit[];

const REGISTRY = new Map<string, LimitsFn>();

export function registerFeatureLimits(engine: string, limits: LimitsFn): void {
  if (REGISTRY.has(engine))
    throw new Error(
      `feature-reach: ${engine} already declared its limits — one declaration per engine, ` +
        "so there is one answer and not two",
    );
  REGISTRY.set(engine, limits);
}

export function featureLimits(
  engine: string,
  nativeType: string,
  format: VisualFormat,
): FeatureLimit[] {
  const fn = REGISTRY.get(engine);
  if (!fn) return [];
  const out = fn(nativeType, format);
  for (const l of out) {
    if (!l.sentence.trim())
      throw new Error(
        `feature-reach: ${engine}/${nativeType}/${format} declares a ${l.feature} limit with ` +
          "no sentence — a mark a journalist cannot read is a silent removal",
      );
    if (!l.measuredBy.trim())
      throw new Error(
        `feature-reach: ${engine}/${nativeType}/${format} declares a ${l.feature} limit with ` +
          "no measuredBy — an unmeasured refusal closes a capability on a suspicion",
      );
  }
  return out;
}

/** Tests only. Production registers once, at import. */
export function clearFeatureLimits(): void {
  REGISTRY.clear();
}

// ── WHY CLEARING IS NOT ENOUGH, and why this pair exists ───────────────────────────────────
// Production registers at IMPORT time (skills/map-native/src/feature-limits.ts:47, top level),
// and an ES module body runs ONCE per process. A test runner puts every file in that one
// process. So a test that clears the registry does not get a clean slate it can hand back —
// it DESTROYS the real declaration for every file that runs after it, and no later import
// re-creates it. Measured 2026-08-04 (registry E15): `feature-reach.test.ts` and
// `lib/brain/offer.test.ts` each pass alone and fail together, in EITHER order —
//   · this file first  ⇒ its fake `map-native` survives, and the real registration then throws
//     "already declared", an import-time error that kills whole files;
//   · this file second ⇒ the real `map-native` is wiped, and every offer/phrase test that reads
//     a declared limit sees an empty registry.
// That accounted for 5 of the 12 red tests in `lib`, all of them green in isolation — the exact
// shape that makes a green suite meaningless.
//
// `clearFeatureLimits` is kept as-is: a test that wants an empty registry is legitimate. What
// was missing is the way BACK. Snapshot before, restore after, and the file is hermetic.
export function snapshotFeatureLimits(): ReadonlyMap<string, LimitsFn> {
  return new Map(REGISTRY);
}

export function restoreFeatureLimits(
  snapshot: ReadonlyMap<string, LimitsFn>,
): void {
  REGISTRY.clear();
  for (const [engine, fn] of snapshot) REGISTRY.set(engine, fn);
}
