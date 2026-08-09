/**
 * The pure half of the map-web genre: no browser, no rasteriser, no DOM. A proportional-symbol
 * beat has no polygon and no data JOIN the way a choropleth does — every point either has a
 * coordinate and a value, or it is not in the study set at all — so the risk this file guards
 * against is different from `twin-map-beat/assets/geo.ts`'s: not a silent no-data miss, but a
 * silently unreadable legend or an unreachable point. Both genres could in principle share one
 * `geo.ts`, but nothing under a skill may import out of it (`splash-twin/test/no-cross-skill-imports.test.ts`
 * fails loud on any specifier that does), so this is this skill's OWN copy of the parts a symbol
 * map actually needs — trimmed to what this genre draws, not a mirror of the choropleth's file.
 */

export type SymbolPoint = {
  key: string;
  name: string;
  lon: number;
  lat: number;
  value: number;
  /** The filter dimension (`references/map-web-discipline.md`, "Filters") — every point declares
   *  one, even a beat that never renders a filter UI (`groupsOf` would just report one group). */
  group: string;
};

/** A point once the bake has projected it into the plate's own pixel space. */
export type ProjectedPoint = SymbolPoint & { px: number; py: number };

/**
 * The radius scale: rooted at zero, radius ∝ √value — an equal-AREA encoding
 * (`twin-map-beat/references/types/proportional-symbol.md`: "don't linear-scale the radius"). A
 * reader compares two circles by their AREA, not their diameter, so a linear radius scale makes
 * the larger value look disproportionately huge.
 
 *  @parity */
export function radiusScale(maxValue: number, maxRadiusPx: number) {
  return (value: number) =>
    maxRadiusPx * Math.sqrt(Math.max(0, value) / maxValue);
}

/** Three round reference sizes for the legend, evenly stepped down from the rounded max. */
export function niceReferenceValues(maxValue: number, count = 3): number[] {
  const top = Math.round(maxValue * 2) / 2;
  const step = top / count;
  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    const v = Math.round((top - i * step) * 10) / 10;
    if (v > 0) values.push(v);
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
 *  `twin-map-beat/assets/geo.ts`'s `keepRing`: nothing to cull here (a point has no shape to
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

/** The newsroom's readers write a decimal comma — the same rule `twin-map-beat/assets/geo.ts`'s
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
export function groupsOf(points: { group: string }[]): string[] {
  return Array.from(new Set(points.map((p) => p.group))).sort();
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
      group: slugOf(point.group),
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
