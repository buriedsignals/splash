// WHICH (type, basemap, format) TRIPLES THIS ENGINE CAN ACTUALLY JOIN — the two facts that
// decide it, in one home, so the two chains that need them refuse in one wording.
//
// Both were MEASURED on real produce runs (2026-08-07, `bun skills/splash/scripts/produce-all.mjs`
// against a four-region table), not read off the source:
//
// ── FACT A — the static and interactive components PIN the join key to "iso_a3" ────────────────
// `dot-density` reads a module-level `const JOIN_KEY = "iso_a3"` (DotDensityMap.tsx:41);
// `cartogram` never threads a key into computeCartogram (CartogramMap.tsx:194), which falls back
// to its own `data.joinKey ?? "iso_a3"` default (cartogram-geo.ts:62). Neither consults
// `config.geography.joinKey`. A subset of any OTHER basemap carries a different property —
// us-states keeps "postal", natural-earth-admin-1 keeps "name" (lib/geo/ref.ts) — so the join
// matches nothing, and the two types fail differently and both badly:
//   · dot-density → 0 regions, bounds fall back to the whole globe: the delivered
//     interactive.png is a WORLD map with a title, a legend ("1 dot = 10") and not one dot.
//   · cartogram  → computeChoropleth throws "no region matched the data" INSIDE the browser
//     render, so the run dies on a 60 s Playwright `waitForFunction` timeout instead.
// Measured against the produced config.json: joinKey "iso_a3" → 0 regions; joinKey "postal" →
// 4 regions and real US bounds.
//
// VIDEO AND SCROLLY ARE NOT AFFECTED, and this is the reason the refusal below is scoped by
// format rather than blanket. Their components resolve the key through resolveVideoGeometry
// (core/video-geometry.ts), which prefers `config.geography.joinKey`. Proven, not assumed: a
// us-states dot-density video produced clean on the prose chain — status "produced",
// video-verify.json with 0 violations and revealMeanDiff 203.7 against a 0.5 floor. A
// format-blind refusal would delete that.
//
// AND ON THE LOOP CHAIN TOO (2026-08-07), which is what let the loop's own dot-density branch stop
// refusing every format — it was the last site still doing so, and it was deleting the capability
// the line above measured. Driven through lib/loop/produce.ts by
// lib/loop/dot-density-video-e2e.test.ts: four US states by population produced a 27.3 s /
// 819-frame landscape.mp4, video-verify.json 0 violations, revealMeanDiff 198.6. The still is
// looked at, not merely reported — docs/splash/proofs/2026-08-07-dot-density-video-join/ shows all
// four states joined and clipped to their real outlines over US bounds, with Wyoming's 580 000
// people drawn as ~29 dots at the legend's own "1 dot = 20,000". The dot COUNTS encode the values,
// so the join reached the right row for the right polygon.
//
// The SAME measurement now exists for the other type, on the other chain (2026-08-07, driven
// through lib/host/cli.ts): a us-states CARTOGRAM video produced a 27.3 s / 819-frame mp4,
// video-verify.json 0 violations, revealMeanDiff 198.2 — and the still shows all four states
// joined and shaded over correct North-American bounds. Both members of the set are therefore
// measured working in video, on both chains, which is what the format scope protects.
// Symmetrically measured on the failing side, so the scope is not merely permissive: the same
// cartogram built as `static`/`interactive` renders a bare basemap of EUROPE with no data layer,
// and an ADM1 (Swiss cantons) cartogram built `static` dies the same way — both on
// `choropleth: no region matched the data`, thrown inside the browser, after a full build.
//
// ── FACT B — the prose chain has no geography match for these two types ───────────────────────
// The loop chain runs `orient` and threads `featureIdsByValue` (lib/loop/assemble/map-native.ts).
// The prose chain — the one a journalist walks — has no such step; its only match is
// `backfillAdm1FeatureIds` (adm1-backfill.ts), deliberately choropleth-only for exactly Fact A.
// So an admin-1 cartogram/dot-density reaches produce with no resolved ids in ANY format and
// hits lib/geo/resolve-for-produce.ts:351, whose message tells the journalist to "re-run the
// geography match (orient)" — a step their chain does not have.
//
// Every other member of resolve-for-produce's JOINING_TYPES is clear of both facts:
//   · choropleth — ChoroplethMap.tsx reads `config.geography.joinKey` (:265-267), and the
//     backfill supplies the ids. This is the case that already produces.
//   · route — no per-row region join exists to get wrong. computeRoute derives its territories
//     FROM the geometry the line crosses, keyed `iso_a3 ?? name ?? index` (route-geo.ts:162,235)
//     — already tolerant of a missing iso_a3 — and those keys only drive optional label/colour
//     overrides, never a value. resolve-for-produce excludes route from the featureIdsByValue
//     requirement structurally (:351) and scans its id list off the source file, so Fact B
//     cannot fire for it either.
import type { VisualFormat } from "../../../lib/core/vocabulary";

/** The map types whose STATIC and INTERACTIVE components pin the join key to "iso_a3" — Fact A.
 *  A type joins this set only by pinning the key; lift a component onto
 *  `config.geography.joinKey` and it leaves, with its own render proof. */
export const ISO_A3_PINNED_JOIN_TYPES: ReadonlySet<string> = new Set([
  "cartogram",
  "dot-density",
]);

/** The basemap whose join key those components happen to pin. A config naming it is the ONE
 *  case Fact A does not bite — not a special case, just the key they hardcoded. */
export const ISO_A3_BASEMAP = "world";

/** The formats rendered by the components that pin the key. Video and scrolly go through
 *  resolveVideoGeometry instead — see the header's measurement. */
export function isoA3PinnedInFormat(format: VisualFormat): boolean {
  return format === "static" || format === "interactive";
}

/**
 * FACT A's refusal — the sentence itself. Every site that refuses this triple says exactly this,
 * and none of them phrases it: the loop's assembler, the prose chain's gate, and (since
 * 2026-08-07) the OFFER, which drops the pairing before a journalist can choose it.
 *
 * Reach it through `isoA3PinnedJoinError` below rather than calling it directly — sharing only the
 * WORDING is what this module used to do, and it was not enough: the loop's two branches shared
 * this string while asking different questions, one scoped by format and one not, and the
 * unscoped one deleted a video that renders. The predicate shares the QUESTION too.
 *
 * The middle clause is the one correction to the sentence the loop originally wrote: its copy said
 * the component "joins against world.geojson unconditionally", which stopped being true when Task
 * 17 moved it onto an injected geometry. Only the "iso_a3" literal survives, and that is what is
 * named here.
 */
export function isoA3PinnedJoinRefusal(
  type: string,
  basemapKey: string,
): string {
  return (
    `${type} only renders against the ${ISO_A3_BASEMAP} basemap today — its static and ` +
    `interactive components pin the join key to "iso_a3", so a "${basemapKey}" join, whose ` +
    `features carry a different key, would render silently wrong rather than merely fail`
  );
}

/**
 * FACT A, ASKED AS ONE QUESTION — the whole triple, not its three parts handed out separately.
 *
 * Three sites need this answer and each used to assemble it themselves: the offer
 * (lib/brain/eligibility.ts), the loop's assembler (lib/loop/assemble/map-native.ts) and the prose
 * chain's gate (skills/splash/src/validate-gate.ts). Assembling it by hand is what let the two
 * chains DISAGREE — the loop asked its cartogram branch about the format and its dot-density
 * branch about nothing, and refused a us-states dot-density video that renders correctly. A
 * predicate cannot be half-remembered.
 *
 * `undefined` basemapKey answers null, and that is a decision rather than a convenience: the OFFER
 * asks this before a build exists, and a run whose geography has not been matched yet has no
 * pairing to refuse. The produce-time guard stays the backstop for exactly that gap — the offer
 * removes the row it can PROVE is unjoinable, and never guesses at one it cannot.
 *
 * Returns the sentence, or null when the components can make this join.
 */
export function isoA3PinnedJoinError(
  type: string,
  basemapKey: string | undefined,
  format: VisualFormat,
): string | null {
  if (!ISO_A3_PINNED_JOIN_TYPES.has(type)) return null;
  if (!basemapKey || basemapKey === ISO_A3_BASEMAP) return null;
  if (!isoA3PinnedInFormat(format)) return null;
  return isoA3PinnedJoinRefusal(type, basemapKey);
}

/**
 * FACT B's refusal. A SECOND wording for a SECOND fact, not a variant of the first: Fact A is
 * about what the components would draw, Fact B is about this chain having nothing to give them.
 * They are separable — lift the components onto `config.geography.joinKey` and Fact A goes away
 * while this one remains until the backfill covers the type.
 *
 * Never mentions `orient`. That is the whole defect it replaces: the resolver's fallback throw
 * sends the journalist to a step the prose chain does not have.
 */
export function adm1UnmatchedTypeRefusal(type: string): string {
  return (
    `an admin-1 map (cantons, départements, states, provinces) needs its regions matched to ` +
    `the basemap before it can be produced, and this flow only matches them for a choropleth — ` +
    `a "${type}" has no matched regions to draw, in any format. Produce this geography as a ` +
    `choropleth, or map it at country level.`
  );
}
