// Point-based scroll/story derivation — the symbol sibling of map-story's
// deriveMapStory. Emits the SAME Beat shape (camera is a [w,s,e,n] bbox) so the
// scrolly's mapStoryToChapters consumes it unchanged. title → establish (points
// bbox) → reveal each city (value desc, callout name+value, camera = a small bbox
// around the city) → takeaway (points bbox).
import type { SymbolPoint } from "./symbol-geo";
import { nameAndValue } from "../../scrolly/src/chapters";
import {
  applyMapArc,
  type Beat,
  type MapArcBeat,
  type RevealMode,
} from "./map-story";
import { formatLocaleNumber, labelWithUnit, type Lang } from "./core/locale";
import { shortWayLongitudeExtent } from "./core/longitude";
import { tourBoxDelta } from "./core/tour-box";

export interface SymbolStoryMeta {
  title: string;
  insight?: string;
  unit?: string;
  /** deliverable language — localizes the callout numbers. Default English. */
  lang?: Lang;
  // Journalist-confirmed claim-arc override (S2) — see map-story.ts mapArcErrors.
  // Anchors on point labels. When present + non-empty, the reveal beats follow the
  // arc (applyMapArc) instead of the sorted-cap salience selection below; absent/empty
  // leaves today's salience path byte-identical.
  arcBeats?: MapArcBeat[];
}

export const DEFAULT_MAX_REVEALS = 5;

export function deriveSymbolStory(
  points: SymbolPoint[],
  meta: SymbolStoryMeta,
  opts: { maxReveals?: number } = {},
): Beat[] {
  const unit = meta.unit ?? "";
  // The callout shows the FULL grouped number (not the direct label's k/M abbreviation),
  // localized per `meta.lang`. It must NOT integer-round — a magnitude 7.4 stays "7,4"
  // (the reported "7magnitude" bug was Math.round + no unit spacing). labelWithUnit adds
  // the locale-aware spacing (a word unit like "magnitude" gets a space; a symbol unit
  // like "$bn" attaches) and normalizes any caller-supplied leading space on `unit`.
  const fmt = (v: number) =>
    labelWithUnit(formatLocaleNumber(v, meta.lang), unit, meta.lang);

  const lons = points.map((p) => p.lon);
  const lats = points.map((p) => p.lat);
  // Antimeridian-aware west/east (see core/longitude.ts): a naive min/max box tears a
  // Pacific-spanning dataset (Alaska −176.6° … Japan +142.4° … Chile −73.2°) into a
  // 343°-wide, Africa-centred view with the data split at both frame edges — which then
  // makes every reveal→reveal camera flight cross the whole globe fetching high-zoom
  // tiles for empty territory (the video-hang trigger) and clips edge labels. `east`
  // may exceed +180 (unwrapped) so cameraForBounds centres on the true Pacific midpoint.
  const { west, east } = shortWayLongitudeExtent(lons);
  const bounds: [number, number, number, number] = [
    west,
    Math.min(...lats),
    east,
    Math.max(...lats),
  ];

  // ★ A STOP'S BOX IS A FRACTION OF THE POINTS' OWN SPREAD, NEVER A CONSTANT.
  //
  // Both reveal paths below (the journalist's confirmed arc, and the salience walk) used to frame
  // a stop at a constant ±1.5°. That is the arithmetic core/tour-box.ts was written to replace:
  // constant box, variable spread, so the TIGHTER the cluster the FLATTER the tour — every stop
  // framed wider than the establishing shot above, the camera zooming OUT from its own opening
  // while only the circles lit up in turn. See that file's header for the measurement.
  //
  // Sized from EVERY point, not from the capped subset a salience walk visits, because `bounds`
  // above frames them all — so a stop is one zoom step IN from the establishing shot, which is
  // the relation the reader reads. (Measured on the rendered mp4 of a four-glacier cluster:
  // establish z=8.48, every stop z≈9.06, so +0.58 — the box halves the set's WIDER axis while
  // the 16:9 frame is bound by the narrower one, which is why it is not a flat one level.
  // Before this, the same stops solved to z≈6.28: the camera zoomed OUT 2.2 levels from its own
  // opening at every beat.) A continental set still hits the cap and is framed byte-identically
  // to before — proven by rendering one either side of this change to the same SHA-256.
  const stopDelta = tourBoxDelta(points);
  const stopBox = (p: SymbolPoint): [number, number, number, number] => [
    p.lon - stopDelta,
    p.lat - stopDelta,
    p.lon + stopDelta,
    p.lat + stopDelta,
  ];

  const beats: Beat[] = [];
  beats.push({
    kind: "title",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.title,
  });
  beats.push({
    kind: "establish",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  });

  if (meta.arcBeats?.length) {
    // Journalist-confirmed claim-arc override — the reveals follow the ARC order, not
    // the sorted-cap salience selection below. mapArcErrors has already validated every
    // arcBeat's region against the point labels, so the lookup here cannot miss
    // (applyMapArc throws defensively if one somehow did).
    const pointByLabel = new Map(points.map((p) => [p.label ?? "", p]));
    beats.push(
      ...applyMapArc(meta.arcBeats, (label) => {
        const p = pointByLabel.get(label);
        return p
          ? {
              camera: stopBox(p),
              highlight: [p.label ?? ""],
              name: p.label ?? "",
              value: fmt(p.value),
            }
          : null;
      }),
    );
  } else {
    const sorted = [...points].sort((a, b) => b.value - a.value);
    const cap = Math.max(
      1,
      Math.min(opts.maxReveals ?? DEFAULT_MAX_REVEALS, sorted.length),
    );
    for (const p of sorted.slice(0, cap)) {
      const name = p.label ?? "";
      const value = fmt(p.value);
      // A symbol point's label is OPTIONAL (symbol-geo.ts, and the loop only sets it when the
      // CSV has a label column), so this composed "— 220 MW" — a caption opening on a dangling
      // separator, measured on a delivered French page. `nameAndValue` joins only the halves
      // that exist; it is the same helper the scrolly caption engine composes with, so the
      // beat's own text and the page's caption cannot disagree about the separator.
      const text = nameAndValue(name, value);
      beats.push({
        kind: "reveal",
        camera: stopBox(p),
        highlight: [name],
        dim: true,
        callout: { region: name, name, value, text },
        copy: text,
      });
    }
  }

  beats.push({
    kind: "takeaway",
    camera: bounds,
    highlight: [],
    dim: false,
    callout: null,
    copy: meta.insight && meta.insight !== meta.title ? meta.insight : "",
  });

  return beats;
}

/**
 * Per-mark entrance trigger frame for SymbolStory's choreography — every point gets one,
 * not just the top-N reveal-beat subjects `triggerFrameByRegion` returns (that map only
 * covers the marks a reveal beat actually visits, capped by `maxReveals`).
 *  - context: every mark establishes TOGETHER, at the establish beat's own start frame.
 *  - sequential: a mark with its own reveal beat (`revealTriggers`, keyed by name/label,
 *    the SAME key `deriveSymbolStory` puts in a reveal beat's `highlight[0]`) triggers at
 *    that beat's start frame — marks appear one-by-one. A mark with no reveal beat (beyond
 *    `maxReveals`) triggers at `closeFrame`, which defaults to never: it stays hidden
 *    (radius/opacity/label all 0) for the whole story, since sequential's narrative never
 *    visits it.
 *
 * ★ `closeFrame` IS THE CLOSE, and it is a frame off the EXISTING timeline (the takeaway
 * beat's own hold start), never a clock of its own. An EXPLAINER story (a declared
 * sweepCarrier) passes it, because a symbol map's missing circle reads as "no funding in
 * Amsterdam", not as "not a subject of this walk" — the same misreading a grey choropleth
 * region makes, answered the same way. Handing the mark a trigger frame is the whole of it:
 * `stagedEntrance` then runs on it exactly as it runs on every other mark.
 */
export function markTriggerFrames(
  points: SymbolPoint[],
  mode: RevealMode,
  establishStartFrame: number,
  revealTriggers: Map<string, number>,
  closeFrame = Number.POSITIVE_INFINITY,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of points) {
    const key = p.label ?? "";
    out.set(
      key,
      mode === "context"
        ? establishStartFrame
        : (revealTriggers.get(key) ?? closeFrame),
    );
  }
  return out;
}
