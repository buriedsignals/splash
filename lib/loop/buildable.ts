import { producerForFormat } from "../core/registry";
import type { VisualFormat } from "../core/vocabulary";
import { ASSEMBLERS, assemblerFor, declineReason } from "./assemble";

// Which engines the editorial loop can actually BUILD through today — ONE list, read by
// everything that has to know.
//
// Three readers, and they must never disagree:
//   - lib/loop/produce.ts refuses a chosen option whose EFFECTIVE producer is not in this list
//     (rendering a map spec through the chart renderer produces a WRONG artifact silently);
//   - lib/brain/eligibility.ts MARKS such a form in the offer instead of dropping it (spec §8:
//     "jamais silencieusement retirée") — the SAME sentence produce refuses with for most
//     engines, though not for every scrolly candidate: eligibility.ts's `withMarks` pushes the
//     higher-priority article-branch mark first, which masks this one's wording, so the offer
//     reads "this is the whole-article branch…" while produce still refuses with the plain
//     unbuildableEngineReason sentence below. Both name the same dead end, in different words;
//   - lib/loop/manifest.ts's nextActionsForElement routes back to "choose-form" instead of
//     answering "produce" forever on a choice that can never succeed.
// Before this file the list was hard-coded in produce.ts alone and the brain knew nothing of
// it, so the offer could rank an unbuildable form FIRST, unmarked: the journalist chose it,
// produce answered `not-implemented`, and the run had nothing to say for itself. Before
// resolveBuilder existed, manifest.ts checked `chosen.engine` directly (not its EFFECTIVE
// producer), so an option naming a buildable engine in an unbuildable format (chart-native in
// the scrolly format, built by skills/scrolly) looked buildable here while produce() refused
// it every time — the exact dead-end this file exists to prevent, just one level down.
//
// It lives under lib/loop/ because it is a fact about the loop's produce verb (which engines
// it can assemble a spec for), not about the engines themselves — lib/core/registry.ts already
// answers "what does this engine render", and that is a different question. lib/brain reads it
// the way lib/brain/facts.ts already reads lib/loop/manifest, and no cycle is possible: this
// module's only outside import is lib/core/registry's producerForFormat, and lib/core never
// imports lib/loop or lib/brain.
//
// DERIVED, not declared. Before this, the list was a sentence someone had to remember to keep
// true; now a moteur is buildable if and only if an assembler exists for it, which is the
// promise this file's header has always asked for.
export const LOOP_BUILDABLE_ENGINES: readonly string[] =
  Object.keys(ASSEMBLERS);

/** An option with no engine at all (fixtures, hand-authored manifests predating the brain) is
 *  built through the default path, which IS chart-native — so "unset" is buildable.
 *
 *  `nativeType` narrows the answer to what the table can actually compose a spec for: an
 *  engine can be wired while only some of its types are, and offering the rest unmarked would
 *  be the exact dead end this file exists to prevent, just one level down (see the header on
 *  "why type-aware" in the task that added this parameter). Absent `nativeType` answers for
 *  the engine as a whole, matching every caller that does not have a type in hand yet.
 *
 *  `format` narrows it once more, for the same reason one level down: an engine can be wired in
 *  one format and not another. dw-chart WAS the measured case — its static export is a file the
 *  loop records by path, its interactive a hosted embed with no file at all, and the manifest's
 *  artifact slot could only hold the first. That slot now records a hosted delivery as the URL it
 *  is (ArtifactRecordSchema, lib/loop/manifest.ts), so no entry restricts by format today. The
 *  axis stays, because it is the honest question to ask of a table whose entries are per-(type,
 *  format) pairings. Optional, like `nativeType`, so every caller without a format in hand still
 *  answers for the engine, unchanged. */
export function isLoopBuildable(
  engine?: string,
  nativeType?: string,
  format?: VisualFormat,
): boolean {
  if (engine == null) return true; // pre-brain manifests take the default path (chart-native)
  return assemblerFor(engine, nativeType, format) !== undefined;
}

// The one sentence both readers use, so a journalist reads the same refusal in the offer's mark
// and in produce's failure. Written for a journalist, not for a maintainer: it says what cannot
// happen, not which module is missing.
//
// The TABLE's own sentence wins when it has one. An engine can be wired and still decline a
// pairing (dw-chart declines a chart type Datawrapper has no slug for), and the fallback below
// would then say "nothing can build a dw-chart form yet — production is wired for …, dw-chart" —
// a sentence that contradicts itself in its own second half.
export function unbuildableEngineReason(
  engine: string,
  nativeType?: string,
  format?: VisualFormat,
): string {
  return (
    declineReason(engine, nativeType, format) ??
    `nothing can build a ${engine} form yet — production is wired for ${LOOP_BUILDABLE_ENGINES.join(", ")} only`
  );
}

/**
 * WHY THIS FORM IS A DEAD END, or undefined when it is not — the whole sentence, for an option.
 *
 * One writer for it, because three places say it and they are read as one voice: chooseForm's
 * refusal while the journalist is still choosing, nextActionsForElement's routing back to the
 * offer, and the driver's ledger entry when a run stagnates on a choice already recorded. The
 * mark's OWN words win when the option carries them (eligibility.ts pushes the whole-article
 * wording first, and the journalist read that sentence in the offer), so the refusal repeats what
 * was shown rather than substituting a maintainer's version of it.
 *
 * A BLANK mark falls back to the engine sentence rather than being returned. The schema types
 * `readiness.reason` as a plain string, so "" is a manifest anyone could hand-author — and since
 * the whole answer here is "a sentence, or nothing", an empty one would make an unbuildable form
 * read as buildable and dead-end the run in silence. Same trap FormOption.why closed by refusing
 * a blank phrasing.
 */
export function unbuildableFormReason(chosen: {
  id?: string;
  engine?: string;
  format?: VisualFormat;
  nativeType?: string;
  readiness?: { reason?: string };
}): string | undefined {
  const builder = resolveBuilder(chosen);
  if (isLoopBuildable(builder, chosen.nativeType, chosen.format))
    return undefined;
  const marked = chosen.readiness?.reason?.trim();
  return marked
    ? marked
    : unbuildableEngineReason(builder, chosen.nativeType, chosen.format);
}

// The EFFECTIVE producer for a chosen (or offered) option — the one thing all three readers
// above must resolve identically, or they drift. `engine`/`format` are optional because
// FormOption's schema still admits hand-authored options predating the brain (manifest.ts);
// the defaults are the same ones produce.ts always rendered before format threading landed.
// Kept here (not duplicated at each call site) after a fix round found the resolution written
// out twice already and about to become three: one function, three callers.
export function resolveBuilder(chosen: {
  engine?: string;
  format?: VisualFormat;
}): string {
  return producerForFormat(
    chosen.engine ?? "chart-native",
    chosen.format ?? "static",
  );
}
