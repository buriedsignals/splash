// Which engines the editorial loop can actually BUILD through today — ONE list, read by
// everything that has to know.
//
// Two readers, and they must never disagree:
//   - lib/loop/produce.ts refuses a chosen option whose engine is not in this list (rendering
//     a map spec through the chart renderer produces a WRONG artifact silently);
//   - lib/brain/eligibility.ts MARKS such a form in the offer instead of dropping it (spec §8:
//     "jamais silencieusement retirée"), with the same sentence produce refuses with.
// Before this file the list was hard-coded in produce.ts alone and the brain knew nothing of
// it, so the offer could rank an unbuildable form FIRST, unmarked: the journalist chose it,
// produce answered `not-implemented`, and the run had nothing to say for itself.
//
// It lives under lib/loop/ because it is a fact about the loop's produce verb (which engines
// it can assemble a spec for), not about the engines themselves — lib/core/registry.ts already
// answers "what does this engine render", and that is a different question. lib/brain reads it
// the way lib/brain/facts.ts already reads lib/loop/manifest: this module imports nothing, so
// no cycle is possible.
//
// Adding an engine here is a promise: produce.ts must be able to assemble that engine's spec.
export const LOOP_BUILDABLE_ENGINES: readonly string[] = ["chart-native"];

/** An option with no engine at all (fixtures, hand-authored manifests predating the brain) is
 *  built through the default path, which IS chart-native — so "unset" is buildable. */
export function isLoopBuildable(engine?: string): boolean {
  return engine == null || LOOP_BUILDABLE_ENGINES.includes(engine);
}

// The one sentence both readers use, so a journalist reads the same refusal in the offer's mark
// and in produce's failure. Written for a journalist, not for a maintainer: it says what cannot
// happen, not which module is missing.
export function unbuildableEngineReason(engine: string): string {
  return `nothing can build a ${engine} form yet — production is wired for ${LOOP_BUILDABLE_ENGINES.join(", ")} only`;
}
