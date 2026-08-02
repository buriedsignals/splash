// Pure map claim-arc validation — deliberately LIGHTWEIGHT. Kept separate from
// map-story.ts (whose static import chain reaches core/staged-reveal.ts →
// remotion) so validate-config.ts / validate-gate.ts can value-import these
// without pulling remotion/react into the validation import closure (see
// splash/tests/validate-closure.test.ts). ArcRole/arcErrors live in
// lib/core/claim-arc (shared by chart-native + map-native — see
// chart-native/src/chart-story.ts for the sibling import).
import { arcErrors, type ArcRole } from "../../../lib/core/claim-arc";

// ---------------------------------------------------------------------------
// Claim-arc — the journalist-confirmed override for map-native (choropleth +
// symbol). Mirrors chart-native's beats: `region` anchors on a value the data
// actually has (a region key for choropleth, a point label for symbol); `role`
// (optional) claims a position in the establish→build→turn→payoff arc; `text`
// is the beat's assertion. Validated by mapArcErrors below.
// ---------------------------------------------------------------------------
// `lon`/`lat` are hex-grid-ONLY (see ARC_CAPABLE_MAP_TYPES comment below and
// hex-grid-story.ts's deriveHexGridStory). Every other arc-capable type anchors on a KEY
// the data already has (a region code, a marker label, a cell id) — hex-grid is the one
// type whose units do not exist until the data is BINNED, so a grid cell has no name to
// give until then. Its anchor is therefore a PLACE: `region` here is the journalist's own
// free-text label for that place (display-only — carried straight through to the beat's
// callout — never looked up against a list, because no list of place names exists), and
// `lon`/`lat` are the coordinates the deriver resolves against the binned grid by
// point-in-polygon. Optional on the shared interface because every other type leaves them
// unset.
export interface MapArcBeat {
  region: string;
  role?: ArcRole;
  text?: string;
  lon?: number;
  lat?: number;
}

// How many valid region values a fail-loud message lists before truncating —
// mirrors chart-native's listValidAnchors (chart-story.ts): enough to spot a
// typo at a glance, bounded so a 1 000-row dataset cannot flood the log.
const ARC_BEAT_REGION_SAMPLE = 20;

// Exported so route-story.ts's produce-time refusal (route cannot validate its arc's
// regions at the gate — see resolveRouteArc's header comment) can format the SAME
// "here's the real list" message shape, rather than growing its own copy.
export function listValidRegions(values: string[]): string {
  const shown = values.slice(0, ARC_BEAT_REGION_SAMPLE);
  const more = values.length - shown.length;
  return shown.join(", ") + (more > 0 ? `, … (+${more} more)` : "");
}

// Validate an explicit arcBeats override against the map's own region values
// (choropleth: the region key column; symbol: point labels). Returns human-
// readable errors ([] = valid). Pure and throw-free — the same fail-loud
// philosophy as chart-native's narrativeBeatErrors: an unknown region must
// never silently drop or shift a confirmed beat.
export function mapArcErrors(
  arcBeats: MapArcBeat[],
  validRegions: string[],
): string[] {
  if (!arcBeats || arcBeats.length === 0) return [];
  const errors: string[] = [];
  arcBeats.forEach((b, i) => {
    if (!validRegions.includes(b.region))
      errors.push(
        `beat ${i + 1}: region "${b.region}" not found in the data — valid regions: ${listValidRegions(validRegions)}`,
      );
  });
  return [...errors, ...arcErrors(arcBeats)];
}

// The map story types whose derivers have a seam for a confirmed arc: deriveMapStory
// (choropleth), deriveSymbolStory (symbol), deriveLocatorStory (locator),
// deriveCartogramStory (cartogram) and deriveDotDensityStory (dot-density) all branch on
// `meta.arcBeats` and walk it through applyMapArc. routeStoryToChapters (route) branches
// the same way but through its own resolveRouteArc, not applyMapArc — its anchors (the
// territories a route crosses) are COMPUTED from the injected geometry at produce time,
// not declared in the config, so its content validation cannot run at the gate (see
// validateRouteConfig / resolveRouteArc). deriveHexGridStory (hex-grid) branches the same
// way too, through its own resolution (not applyMapArc, whose `resolve(region: string)`
// signature has no seam for a coordinate pair) — its anchors (which cell a named place
// lands in) are likewise COMPUTED, from the binned grid, not declared, so it shares
// route's deferred-to-produce-time validation shape (see validateHexGridConfig /
// deriveHexGridStory). This is the LAST of the seven real map types to gain one — every
// type in ARC_CAPABLE_MAP_TYPES below is now every real map type there is (see
// unsupportedArcBeatsErrors's own comment for what that means for its refusal).
export const ARC_CAPABLE_MAP_TYPES = [
  "choropleth",
  "symbol",
  "locator",
  "cartogram",
  "dot-density",
  "route",
  "hex-grid",
] as const;

// Human-readable "a X, a Y, or a Z" listing of the arc-capable types, for the refusal
// message below. Kept separate from a bare `.join` because a naive `" or a "` join
// degrades past two entries ("a choropleth or a symbol or a locator") — this reads as a
// normal English list regardless of how many types ever join ARC_CAPABLE_MAP_TYPES.
function listArcCapableTypes(types: readonly string[]): string {
  if (types.length === 1) return `a ${types[0]}`;
  if (types.length === 2) return `a ${types[0]} or a ${types[1]}`;
  const allButLast = types
    .slice(0, -1)
    .map((t) => `a ${t}`)
    .join(", ");
  return `${allButLast}, or a ${types[types.length - 1]}`;
}

/**
 * REFUSE a confirmed claim-arc on a map type that cannot honour it.
 *
 * The field used to be accepted here and dropped at the render: only validateChoroplethConfig
 * and validateSymbolConfig ever LOOKED at `arcBeats`, so on the other five types it passed
 * validation untouched and then vanished into a deriver that never reads it. A journalist got
 * a green light on a plan the engine had already decided to ignore.
 *
 * The precedent is the neighbouring rule — a chart `beats` field on a map track is refused by
 * name rather than dropped (scrolly-types.ts's MAP_TRACK_BEATS_REFUSAL, manifest.ts,
 * validate-gate.ts). Same discipline, different sentence, because this is a different fix: the
 * plan is in the right FIELD, it is the TYPE that cannot carry it. So the message names the
 * types that can, which is the actual way out.
 *
 * `type` is passed by the CALLING validator rather than read off the config, so the refusal
 * cannot be dodged by a config that omits its own discriminant — each validator already knows
 * which type it is, and only a dispatch would have to guess.
 *
 * Pure and throw-free; `[]` when the type is arc-capable or no plan was submitted.
 *
 * DECISION (map-storyboard-and-video-geography, Task 5 — hex-grid, the last map type to gain
 * arc support): ARC_CAPABLE_MAP_TYPES is now every real map type there is, so no REAL type
 * string can ever reach the refusal branch below again — every validator that calls this
 * (validateRouteConfig/validateLocatorConfig/validateDotDensityConfig/
 * validateCartogramConfig/validateHexGridConfig) passes a type already in the list. Kept
 * anyway, as DEFENCE-IN-DEPTH rather than deleted, for two concrete reasons: (1) each call
 * site's own comment already frames it as "the single lever a capability regression trips" —
 * drop a type from ARC_CAPABLE_MAP_TYPES (or copy-paste a new validator that forgets to add
 * itself) and this fires again instead of silently letting an ignored plan through validation;
 * (2) a genuinely NEW map type, the 8th, is exactly the case this function exists for, and
 * deleting it would mean re-inventing it the next time one lands. What changes is what the
 * function's own test can prove: it can no longer be exercised with a real map-type string
 * (there is none left that is non-capable), so its test now uses a type string that is
 * deliberately NOT a map type at all — the function guards the BOUNDARY (is this string in
 * the capable list?) rather than a specific list of "the types that still can't" (see
 * tests/arc-beats-threading.test.ts's `unsupportedArcBeatsErrors` block).
 */
export function unsupportedArcBeatsErrors(
  config: unknown,
  type: string,
): string[] {
  const c = config as { arcBeats?: unknown } | null;
  if (c?.arcBeats === undefined) return [];
  if ((ARC_CAPABLE_MAP_TYPES as readonly string[]).includes(type)) return [];
  return [
    `a "${type}" map derives its own walk from the data — it cannot carry a confirmed ` +
      "claim-arc, so `arcBeats` would be ignored here rather than honoured. A region-anchored " +
      `arc is walked by ${listArcCapableTypes(ARC_CAPABLE_MAP_TYPES)} map; bring the same ` +
      "argument as one of those, or drop `arcBeats` and let this map narrate its own data.",
  ];
}

// S2 flagged fallback — mirrors chart-native's narrativeFallbackWarning (chart-story.ts).
// An arc-capable map story (ARC_CAPABLE_MAP_TYPES) with NO confirmed `arcBeats` derives
// its narrative from data salience (each deriver's own ranking), not a journalist-confirmed
// claim-arc — never a hard fail, but never silent either. A type NOT in that list derives its
// own story unconditionally and is REFUSED the field outright (unsupportedArcBeatsErrors
// above), so it never warns here. Reading the SAME list `unsupportedArcBeatsErrors` refuses
// against means a type gaining arc support (like ARC_CAPABLE_MAP_TYPES just did for locator,
// then cartogram, then dot-density) gains this nudge automatically — no second place to
// remember to update.
export function mapNarrativeFallbackWarning(config: unknown): string | null {
  const c = config as { type?: string; arcBeats?: unknown } | null;
  // Mirror the deriver's gate exactly (`meta.arcBeats?.length`): a confirmed, NON-EMPTY
  // arcBeats suppresses the warning. An empty array still renders via the salience path
  // (see deriveMapStory/deriveSymbolStory), so it must still warn like an absent one.
  const ab = c?.arcBeats;
  if (Array.isArray(ab) && ab.length > 0) return null;
  const type = c?.type;
  if (
    type !== undefined &&
    !(ARC_CAPABLE_MAP_TYPES as readonly string[]).includes(type)
  )
    return null;
  return (
    "narrative auto-picked by data salience (no confirmed claim-arc `arcBeats`) — the map " +
    "scrolly walks the most salient regions, not a confirmed argument. If this ships as a " +
    "story, confirm a region-anchored claim-arc at CADRAGE (establish → build → [turn] → payoff)."
  );
}
