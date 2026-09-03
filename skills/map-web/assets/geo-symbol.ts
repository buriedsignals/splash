/**
 * The pure half of the map-web format: no browser, no rasteriser, no DOM. A proportional-symbol
 * beat has no polygon and no data JOIN the way a choropleth does — every point either has a
 * coordinate and a value, or it is not in the study set at all — so the risk this file guards
 * against is different from `map-beat/assets/geo.ts`'s: not a silent no-data miss, but a
 * silently unreadable legend or an unreachable point. Both formats could in principle share one
 * `geo.ts`, but nothing under a skill may import out of it (`splash/test/no-cross-skill-imports.test.ts`
 * fails loud on any specifier that does), so this is this skill's OWN copy of the parts a symbol
 * map actually needs — trimmed to what this format draws, not a mirror of the choropleth's file.
 */

export type SymbolPoint = {
  key: string;
  name: string;
  lon: number;
  lat: number;
  value: number;
  /** The filter dimension (`references/map-web-discipline.md`, "Filters") — OPTIONAL, because the
   *  discipline argues against adding a filter to most beats and SKILL.md documents the ungrouped
   *  beat as the normal case. It was typed as required, which is not what the rest of this file
   *  believed: `groupsOf` tolerated its absence and three other call sites did not. */
  group?: string;
};

/** A point once the bake has projected it into the plate's own pixel space. */
export type ProjectedPoint = SymbolPoint & { px: number; py: number };

/**
 * The radius scale: rooted at zero, radius ∝ √value — an equal-AREA encoding
 * (`map-beat/references/types/proportional-symbol.md`: "don't linear-scale the radius"). A
 * reader compares two circles by their AREA, not their diameter, so a linear radius scale makes
 * the larger value look disproportionately huge.
 
 *  @parity */
export function radiusScale(maxValue: number, maxRadiusPx: number) {
  return (value: number) =>
    maxRadiusPx * Math.sqrt(Math.max(0, value) / maxValue);
}

/** The nice-number ladder — 1, 2, 2.5, 5 × 10ⁿ. The magnitudes a reader already holds. */
const NICE_LADDER = [1, 2, 2.5, 5];

/**
 * THREE ROUND REFERENCE SIZES FOR THE LEGEND.
 *
 * This was named for a nice-number algorithm and implemented none: it returned the max, two thirds
 * of it and one third of it, so a legend over counts read 9 815 · 19 629 · 29 444. A proportional-
 * symbol map has NO AXIS. The size legend is the only thing that tells a reader what an area means,
 * and it works by giving two or three round magnitudes the eye can carry back to the map. 19 629 is
 * not a magnitude anyone holds; it is one datum's arithmetic showing through, and a reader cannot
 * use it to estimate a circle they are looking at, which is the single job the legend has.
 *
 * It was masked by the seed, where population-in-millions at 11 / 7.3 / 3.7 still reads as roughly
 * a-third-and-two-thirds and the numbers are short — and by this function's own test, which
 * asserted the values were decreasing and at most `count` but never that they were ROUND.
 *
 * Two rules, and the second is not in the ladder:
 *
 *   1. Every value is a ladder rung at or below the data maximum.
 *   2. Each is at most HALF the one before it.
 *
 * Rule 2 is what stops 29 444 from yielding 25 000 · 20 000 · 10 000. Those are all round, and the
 * first two draw circles whose radii differ by 12% — a legend with two marks a reader cannot tell
 * apart is the same failure in a tidier hand. Halving keeps every circle visibly distinct, which is
 * the reason the legend has more than one entry at all.
 */
export function niceReferenceValues(maxValue: number, count = 3): number[] {
  if (!Number.isFinite(maxValue) || maxValue <= 0) return [];
  const values: number[] = [];
  // The largest rung at or below `ceiling`, walked down decade by decade. The epsilon absorbs the
  // float error that would otherwise reject 10 as a rung of exactly 10.
  const rungAtOrBelow = (ceiling: number): number | null => {
    if (!(ceiling > 0)) return null;
    for (let e = Math.floor(Math.log10(ceiling)) + 1; e > -13; e--) {
      const decade = Math.pow(10, e);
      for (let i = NICE_LADDER.length - 1; i >= 0; i--) {
        const rung = NICE_LADDER[i]! * decade;
        if (rung <= ceiling * (1 + 1e-9)) return rung;
      }
    }
    return null;
  };
  let ceiling = maxValue;
  while (values.length < count) {
    const rung = rungAtOrBelow(ceiling);
    if (rung === null || rung <= 0) break;
    // Round off the float dust a power of ten leaves behind (2.5 * 1e-3 is 0.0025000000000000005).
    values.push(Number(rung.toPrecision(12)));
    ceiling = rung / 2;
  }
  return values;
}

/** Largest first, so later (smaller) circles paint on top and stay hoverable rather than buried
 *  under a bigger neighbour. 
 *  @parity-exempt: sorts the field this beat's own points carry (`.mag` on a quake catalogue, `.value` on the general seed); the invariant is small-on-top, not the field name. */
export function drawOrder<T extends { value: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.value - a.value);
}

/** Every point, largest value first — the order the accessible table and the keyboard's Home/End
 *  both use, so "the first row" means the same thing whichever the reader picks. 
 *  @parity-exempt: each beat reads its own data in its own order — value on a choropleth, population on a dot map, ascending priority on a locator. Four sorts, four beats, not four drifts. */
export function readingOrder<T extends { value: number }>(rows: T[]): T[] {
  return drawOrder(rows);
}

export type LabelPlacement = { side: "left" | "right"; dy: number };

/**
 * Edge-aware label side, computed from the symbol's PROJECTED screen position, not from the data —
 * `references/types/proportional-symbol.md`'s "the one thing that goes wrong": a symbol near the
 * frame edge needs its label flipped inward, and the map's own coordinate can't tell you that, only
 * the projected pixel can.
 
 *  @parity-exempt: the flip margin and the vertical nudge are pixel constants tuned per frame size, and deriving them is W5 task T7's own work — until then this records that they are known to disagree. */
export function labelPlacement(
  px: number,
  py: number,
  frame: { width: number; height: number },
  margin = 90,
): LabelPlacement {
  const side = px > frame.width - margin ? "left" : "right";
  const dy = py < 22 ? 18 : py > frame.height - 18 ? -10 : 4;
  return { side, dy };
}

/** Whether a projected point actually lands inside the frame — the symbol-map converse of
 *  `map-beat/assets/geo.ts`'s `keepRing`: nothing to cull here (a point has no shape to
 *  thin), only to notice and report if the camera missed it. 
 *  @parity */
export function keepPoint(
  point: { px: number; py: number },
  frame: { width: number; height: number },
  margin = 20,
): boolean {
  return (
    point.px >= -margin &&
    point.px <= frame.width + margin &&
    point.py >= -margin &&
    point.py <= frame.height + margin
  );
}

/** The newsroom's readers write a decimal comma — the same rule `map-beat/assets/geo.ts`'s
 *  own `fr` applies, duplicated rather than imported for the reason stated at the top of this file. 
 *  @parity */
export function fr(value: number, decimals = 1): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * The distinct filter groups a study set carries, in a stable order — the one place this is
 * computed, shared by `MapWebSeed.tsx` (which draws the `<fieldset>`) and `render-web.mjs` (which
 * has to generate the matching `:has()` CSS rule per group) so the two never drift out of sync.
 
 *  @parity-exempt: groups by the field this beat's own points carry (`.arc` on a subduction catalogue, `.group` on the general seed). */
export function groupsOf(points: { group?: string }[]): string[] {
  // An ABSENT group is not a filter group, so it does not appear here. It used to: an ungrouped
  // study set reported `[undefined]`, one entry, which read as "one group, so no filter" at the
  // `groups.length > 1` gate and read as a group name everywhere the value itself was used —
  // `assertDistinctSlugs`, `buildCss`'s `:has()` rules and `markLayers` all handed it to `slugOf`,
  // which takes a string and immediately lowercases it. Dropping it here is the same verdict said
  // once instead of four times, and `groupsOf(points).length <= 1` — the condition SKILL.md and
  // the discipline both name for shipping no filter — is still true of the empty list.
  const named = points.map((p) => p.group).filter((g) => g !== undefined && g !== null && g !== "");
  return Array.from(new Set(named)).sort();
}

/**
 * A CSS-id-safe slug for a group name ("Western Europe" → "western-europe") — used to build the
 * filter radio's own `id` and the matching `:has(#id:checked)` selector. Shared for the same reason
 * `groupsOf` is: the id `MapWebSeed.tsx` writes and the id `render-web.mjs`'s CSS targets must be
 * the exact same string.
 
 *  @parity */
export function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * THE LIVE MAP'S OWN DRAW PATH, and the reason it lives here beside the SVG one.
 *
 * Ruling R1 (2026-08-10) made map × web a LIVE MapTiler map: a web map a reader cannot move through
 * is a picture. That creates a second way to draw one geometry — a MapLibre circle layer beside the
 * SSR'd SVG circles — and two draw paths for one geometry is a new duplication family. Naming it
 * and putting it under the walk now is cheaper than discovering it in a month, so this is a pure
 * function in the geometry core rather than DOM code in the boot script, and it consumes the SAME
 * `radiusScale` the SVG path consumes. If the two ever disagree about how big a circle is, the swap
 * from fallback to live is visible and the beat is broken.
 *
 * The radius is baked into each feature IN FRAME UNITS, exactly as the SVG draws it, and the boot
 * script multiplies by the container's own scale — so `circle-radius` is the SVG radius seen at the
 * container's size, not a second sizing rule.
 *  @parity */
export function markLayers(
  points: ProjectedPoint[],
  options: {
    maxValue: number;
    maxRadiusFrameUnits: number;
    subjectKey: string;
    accent: string;
    muted: string;
  },
): {
  source: {
    type: "FeatureCollection";
    features: {
      type: "Feature";
      geometry: { type: "Point"; coordinates: [number, number] };
      properties: Record<string, unknown>;
    }[];
  };
  paint: Record<string, unknown>;
} {
  const radiusOf = radiusScale(options.maxValue, options.maxRadiusFrameUnits);
  // Largest first in the SOURCE order, so MapLibre paints the small circles last and a small mark
  // inside a large one stays clickable — the same invariant `drawOrder` states for the SVG path.
  const features = drawOrder(points).map((point) => ({
    type: "Feature" as const,
    geometry: { type: "Point" as const, coordinates: [point.lon, point.lat] as [number, number] },
    properties: {
      key: point.key,
      name: point.name,
      value: point.value,
      // Tolerated the way `groupsOf` tolerates it. A beat with no filter dimension is the
      // documented normal case, and ruling R1 made the live layer mandatory for every map × web
      // beat — so this line crashing on an absent group meant such a beat could not be rendered
      // at all. `null` rather than a made-up slug: no filter exists to match it against, and the
      // seed's own data grouped all thirteen points, which is why no test saw this.
      group: point.group == null ? null : slugOf(point.group),
      subject: point.key === options.subjectKey,
      r: radiusOf(point.value),
    },
  }));
  return {
    source: { type: "FeatureCollection", features },
    paint: {
      "circle-color": ["case", ["get", "subject"], options.accent, options.muted],
      "circle-opacity": ["case", ["get", "subject"], 0.55, 0.38],
      "circle-stroke-color": ["case", ["get", "subject"], options.accent, options.muted],
      "circle-stroke-width": 1,
    },
  };
}

/**
 * How far in a reader may go, derived rather than picked. For a proportional symbol the marks keep
 * their pixel size — a circle encodes a value, not a ground area — so the honest bound is the zoom
 * at which the study set stops filling the frame: past it the reader is looking at basemap with two
 * circles on it, and the claim the title makes is no longer on screen.
 *
 * `frameLonSpan` is the extent the camera ACTUALLY shows (`geometry.frameCorners`, recorded by the
 * bake since 2026-08-10); `studyLonSpan` is the study set's own footprint. Each doubling of zoom
 * halves the visible span, so the number of doublings available is the log2 of their ratio.
 *  @parity */
export function maxZoomForStudySet(minZoom: number, frameLonSpan: number, studyLonSpan: number): number {
  if (!(frameLonSpan > 0) || !(studyLonSpan > 0)) throw new Error("both spans must be positive degrees");
  return Math.round((minZoom + Math.log2(frameLonSpan / Math.max(studyLonSpan, 1e-6))) * 1000) / 1000;
}
