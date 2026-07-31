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
export interface MapArcBeat {
  region: string;
  role?: ArcRole;
  text?: string;
}

// How many valid region values a fail-loud message lists before truncating —
// mirrors chart-native's listValidAnchors (chart-story.ts): enough to spot a
// typo at a glance, bounded so a 1 000-row dataset cannot flood the log.
const ARC_BEAT_REGION_SAMPLE = 20;

function listValidRegions(values: string[]): string {
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
// (choropleth), deriveSymbolStory (symbol) and deriveLocatorStory (locator) all branch on
// `meta.arcBeats` and walk it through applyMapArc. The other four (route, dot-density,
// hex-grid, cartogram) derive their walk from the data unconditionally — there is nowhere
// to put a plan (yet — see the plan this task belongs to for the remaining types).
export const ARC_CAPABLE_MAP_TYPES = [
  "choropleth",
  "symbol",
  "locator",
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
// against means a type gaining arc support (like ARC_CAPABLE_MAP_TYPES just did for locator)
// gains this nudge automatically — no second place to remember to update.
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
