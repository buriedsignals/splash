// Point-based scroll/story derivation — the symbol sibling of map-story's
// deriveMapStory. Emits the SAME Beat shape (camera is a [w,s,e,n] bbox) so the
// scrolly's mapStoryToChapters consumes it unchanged. title → establish (points
// bbox) → reveal each city (value desc, callout name+value, camera = a small bbox
// around the city) → takeaway (points bbox).
import type { SymbolPoint } from "./symbol-geo";
import {
  applyMapArc,
  type Beat,
  type MapArcBeat,
  type RevealMode,
} from "./map-story";
import { formatLocaleNumber, labelWithUnit, type Lang } from "./core/locale";
import { shortWayLongitudeExtent } from "./core/longitude";
import { establishBox, tourStopBox } from "./core/tour-box";

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
  // Two boxes, and the difference matters exactly once — the same pair deriveLocatorStory
  // keeps, for the same reason. `dataBounds` is what the points themselves span: the thing a
  // tour has to cross, and the thing a stop box is a fraction OF. `bounds` is what the camera
  // FRAMES, identical except for a set with no spread at all (one point, or all coincident),
  // where a zero-area box would solve to zoom 22 — a blank tile. Sizing a stop off the WIDENED
  // box would manufacture a tour out of the padding.
  const dataBounds: [number, number, number, number] = [
    west,
    Math.min(...lats),
    east,
    Math.max(...lats),
  ];
  const bounds = establishBox(dataBounds);

  // ★ A STOP'S BOX IS THE ESTABLISHING SHOT, HALVED — NEVER A CONSTANT.
  //
  // Both reveal paths below (the journalist's confirmed arc, and the salience walk) used to
  // frame a stop at a constant ±1.5°. That is the arithmetic core/tour-box.ts was written to
  // replace: constant box, variable spread, so the TIGHTER the cluster the FLATTER the tour —
  // every stop framed wider than the establishing shot above, the camera zooming OUT from its
  // own opening while only the circles lit up in turn. See that file's header for the three
  // measurements, taken off rendered mp4s.
  //
  // Sized from EVERY point, not from the capped subset a salience walk visits, because
  // `bounds` above frames them all — so a stop is one zoom level IN from the establishing
  // shot, which is the relation the reader reads. A continental set hits the cap, so every
  // one of its camera boxes stays bit-identical to the constant a symbol story has always
  // used — see core/tour-box.ts for how that identity is checked (not by hashing the mp4,
  // which is not byte-deterministic).
  const stopBox = (p: SymbolPoint): [number, number, number, number] =>
    tourStopBox(dataBounds, p) ?? bounds;

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
      const text = `${name} — ${value}`;
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
