// ChoroplethStory — narrated Remotion video composition.
// Builds a beat-driven story (title → establish → reveal x N → takeaway) from deriveMapStory,
// drives the map camera deterministically per frame, and renders title card + callout + caption overlays.
// Harness pattern: delayRender → jumpTo → setData (beat change only) → setPaintProperty → idle → continueRender.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import type { Topology } from "topojson-specification";
import { continueWhenMapSettles } from "../core/frame-ready";
import { resolveVideoGeometry } from "../core/video-geometry";
import {
  computeChoropleth,
  mainlandFeature,
  type ChoroplethData,
} from "../choropleth-geo";
import type { GeographyRef } from "../basemaps";
import { NO_DATA_COLOR } from "../theme/colors";
import {
  deriveMapStory,
  resolveRevealMode,
  beatsForMode,
  type Beat,
  type MapArcBeat,
} from "../map-story";
import { poleOfInaccessibility } from "../core/label-anchor";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";
import {
  sweepStops,
  type CarrierKind,
  type SweepStops,
} from "../sweep-carrier";
import { orderRevealBeatsBySweep } from "../story-sweep-order";
import { choroplethSweepMarks } from "../choropleth-sweep";
import { regionCentroids } from "../choropleth-sweep-geo";
import { legendTheme } from "../theme/legend-theme";
import { resolveMapStyle } from "../route-geo";
import { fmtBinRange } from "../core/legend-format";
import { triggerFrameByRegion } from "../story-triggers";
import {
  AREAL_TIMELINE_OPTS,
  stagedByKey,
  addSubjectEmphasisLayers,
} from "../story-choreography";
import {
  buildDraw,
  sliceBorder,
  EMPTY_FEATURE,
  type DrawEntry,
} from "../core/border-slice";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const NUM_BINS = 5;

/** Seconds the closing distribution takes to appear under the takeaway, once the camera has
 *  finished pulling back. One number, like every other pacing knob (story-choreography.ts).
 *  Explainer stories only — see the branch that reads it. */
const EXPLAINER_CLOSE_S = 1.2;

// Enriched GeoJSON world — adds __value, __hasData and __binIdx.
//
// It also used to bake a `__stop` (where the region sits on the sweep) for a per-frame paint
// expression to compare against a sweep clock of its own. Both are gone: the carrier now orders
// the reveal BEATS and the beat timeline lights each subject (story-sweep-order.ts), so nothing
// per-frame needs a stop on a feature.
function enrichWorld(
  worldGeoJson: GeoJSON.FeatureCollection,
  joined: { key: string; value: number | null }[],
  sortedBins: { min: number; max: number; color: string }[],
  beat: Beat,
  joinKey: string,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: worldGeoJson.features.map((f, i) => {
      const j = joined[i];
      const binIdx =
        j.value !== null
          ? sortedBins.findIndex(
              (b, bi) => j.value! < b.max || bi === sortedBins.length - 1,
            )
          : -1;
      return {
        ...f,
        properties: {
          ...f.properties,
          __value: j.value,
          __hasData: j.value !== null,
          __binIdx: binIdx,
        },
      };
    }),
  };
}

interface MapStory {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
  sortedBins: { min: number; max: number; color: string }[];
  anchorByKey: Map<string, [number, number]>;
  worldGeoJson: GeoJSON.FeatureCollection;
  joined: { key: string; value: number | null }[];
  triggers: Map<string, number>;
  borderByRegion: Map<string, DrawEntry>;
  joinKey: string;
}

export type ChoroplethStoryConfig = ChoroplethData & {
  title?: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  insight?: string;
  source?: { name: string; url: string };
  /** D7's credit for a DECLARED geometry (never a shipped basemap — see policy.ts's
   *  assertGeoCreditPresent). Threaded to MapFrame beside `source`. */
  geoCredit?: { name: string; url?: string };
  /** Legacy shape: the basemap name alone. Superseded by `geography` when present — see
   *  resolveVideoGeometry (Task 7, mirrors ChoroplethMap.tsx's interactive path). */
  basemap?: string;
  /** Which geography (set/scope/joinKey) `geometry` names (GeographyRef, Task 4/9/10). */
  geography?: GeographyRef;
  /** The actual subset TopoJSON for this map, injected by produce (Task 20). There is no
   *  bundled fallback geometry anymore (D5) — required at render time even though the type
   *  stays optional for configs assembled before Task 20 lands. */
  geometry?: Topology;
  scaleType?: "sequential" | "diverging";
  palette?: string | string[];
  /** the topic hint (e.g. "electricity access") → drives the subject-fit ramp guard. */
  subject?: string;
  /** data column holding the region NAME in the deliverable language (beat narration). */
  labelField?: string;
  valueKind?: "temporal" | "magnitude" | "categorical";
  mapStyle?: string;
  /** deliverable language — localizes legend numbers + "Source". Default English. */
  lang?: string;
  /** context (default) blooms the subject over the full distribution; sequential — Task 9. */
  revealMode?: string;
  /** ★ WHAT MAKES THIS STORY ADVANCE (sweep-carrier.ts). Absent ⇒ nothing changes: the beats
   *  drive the reveal exactly as they always did. Present ⇒ every region blooms when the sweep
   *  reaches it, whatever the beat structure — the map-explainer device, with the carrier chosen
   *  for the subject instead of a river the subject may not have. */
  sweepCarrier?: CarrierKind;
  /** The data column holding each region's DATE — a bare year, or an ISO date. What the `time`
   *  carrier advances on. Absent ⇒ `time` is not offered (validate-config refuses it by name),
   *  never guessed from a column that merely looks temporal. */
  timeField?: string;
  /** Newsroom house hue — tints frame/legend furniture toward the house colour. */
  brandHue?: string;
  /** Journalist-confirmed claim-arc (S2) — honoured by deriveMapStory. Dropping it here would render a
   *  validated plan as the salience default, silently: see map-arc.ts. */
  arcBeats?: MapArcBeat[];
  brandPalette?: string[];
};

export const ChoroplethStory: React.FC<{
  config: ChoroplethStoryConfig;
}> = ({ config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const mode = resolveRevealMode(config);

  const houseHue = config.brandHue ?? config.brandPalette?.[0];
  const theme = useMemo(
    () => legendTheme(dark, undefined, houseHue),
    [dark, houseHue],
  );
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: NUM_BINS * 18 + 18,
  });
  const [mapState, setMapState] = useState<MapStory | null>(null);
  const [handle] = useState(() => delayRender("choropleth-story-init"));

  // Track per-frame overlay state: projected callout position, highlight color, reveals.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    fillReveal: number;
    calloutPt: { x: number; y: number } | null;
    calloutReveal: number;
    labelReveal: number;
    calloutText: string;
    calloutValue: string;
    calloutColor: string;
    captionReveal: number;
  } | null>(null);

  // Ref to track last rendered beat index so we avoid setData on every frame.
  const lastBeatIndex = useRef<number>(-1);

  // Init map once — same guard pattern as ChoroplethReveal.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;

    const m = new maptilersdk.Map({
      container: ref.current,
      style,
      center: [10, 20] as [number, number],
      zoom: 2,
      interactive: false,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as ConstructorParameters<typeof maptilersdk.Map>[0] & {
      canvasContextAttributes: unknown;
    });

    m.on("load", () => {
      // Strip symbol layers (labels) + inner admin-1 borders (clutter under our own strokes).
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol" || /other border/i.test(layer.id))
          m.removeLayer(layer.id);
      }

      // Geometry arrives through the injected config now (produce.mjs) — never a static bundle
      // fetch. Mirrors ChoroplethMap.tsx's interactive path (Task 16/20): config.geometry is
      // decoded and config.geography.joinKey preferred over the legacy basemap-derived default.
      // No try/catch here: resolveVideoGeometry throws when config.geometry is
      // missing, and that throw is meant to escape — swallowing it produced a blank
      // map in a video that still exited 0. Left uncaught, it fails this render hard
      // via delayRender's own timeout, matching ChoroplethMap.tsx's uncaught-throw
      // behaviour on the interactive path.
      const { world: worldGeoJson, joinKey } = resolveVideoGeometry(
        config,
        "choropleth-story",
      );

      // ★ THE SWEEP'S STOPS — computed HERE, where the geometry exists, because two of the five
      // carriers need something the rows alone do not carry: `time` needs the declared temporal
      // column parsed onto each mark, and `space` needs each region's position. Building the
      // marks from `{name, value}` alone (as this did) left both carriers written, tested, and
      // unreachable — every mark landed at 1 and the map filled at the close.
      //
      // They are read ONCE, below, to order the reveal beats. Nothing per-frame reads them:
      // the beat timeline is the only clock (story-sweep-order.ts).
      //
      // Guarded on `config.sweepCarrier`: with no carrier declared not even the centroid pass
      // runs, so an un-swept story does exactly the work it did before.
      const rows = (config.rows ?? []) as Record<string, unknown>[];
      const centroids = config.sweepCarrier
        ? regionCentroids(
            worldGeoJson,
            joinKey,
            rows.map((r) => String(r[config.regionKey] ?? "")),
          )
        : new Map<string, [number, number]>();
      const stops: SweepStops = config.sweepCarrier
        ? sweepStops(
            config.sweepCarrier,
            choroplethSweepMarks(
              rows,
              {
                regionKey: config.regionKey,
                valueField: config.valueField,
                timeField: config.timeField,
              },
              (key) => centroids.get(key),
            ),
          )
        : {};

      // Compute choropleth layout.
      const layout = computeChoropleth(config, worldGeoJson, joinKey, {
        bins: NUM_BINS,
        scaleType: config.scaleType ?? "sequential",
        palette: config.palette,
        labelField: config.labelField,
      });

      const sortedBins = [...layout.bins].sort((a, b) => a.min - b.min);

      // Build meta + beats.
      const meta = {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
        valueField: config.valueField,
        narrativePattern: config.valueKind,
        lang: config.lang,
        // The confirmed walk reaches the deriver — see map-arc.ts.
        arcBeats: config.arcBeats,
      };
      // Drop the establish beat in `sequential` (dead air on an empty map) — shared
      // rule with Root.tsx's duration calc so the video length matches the animation.
      //
      // ★ THEN THE CARRIER ORDERS THE REVEALS — and that is the whole of what it does. The beat
      // COUNT is unchanged by the permutation, so Root.tsx's `calculateMetadata` (which does not
      // and need not know a carrier exists) still sizes this composition exactly.
      const beats = orderRevealBeatsBySweep(
        beatsForMode(deriveMapStory(layout, worldGeoJson, joinKey, meta), mode),
        stops,
      );

      // Precompute camera solutions — cameraForBounds → {center, zoom}.
      // Use mapFrame.pad so the data stays out of the title/source bands.
      const solutions: CameraSolution[] = beats.map((b) => {
        const result = m.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          { padding: mapFrame.pad },
        );
        if (!result || !result.center) return { center: [10, 20], zoom: 2 };
        const c = maptilersdk.LngLat.convert(result.center);
        return {
          center: [c.lng, c.lat],
          zoom: result.zoom ?? 2,
        };
      });

      // Build timeline phases — keyed by beat kind for per-kind hold durations.
      const kinds = beats.map((b) => b.kind);
      const { phases } = buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS);

      // Precompute, for each subject region (the FEW regions a reveal beat visits —
      // triggerFrameByRegion keys are exactly the beats' callout.region values):
      //  - its callout anchor: the pole of inaccessibility of its mainland polygon
      //    (most-interior point), not the centroid — a centroid can fall outside a
      //    concave/crescent shape or on the wrong side of an offshore-islands split, the
      //    pole never does. Grid-sample cost is real (~400ms/feature) — scoped to the
      //    handful of subjects, never the whole ~240-feature world (measured ~98s and a
      //    delayRender timeout when it was).
      //  - its border-draw geometry: the exterior ring(s) of the ACTUAL geometry (a
      //    MultiPolygon subject, e.g. a country with offshore islands, must draw ALL of
      //    its parts, not just the largest one — mainlandFeature is for camera framing
      //    and the anchor, not render geometry), staged-drawn on over the beat's first
      //    ~2.5s via the shared border-slice/staged-reveal core.
      // An explainer waits for the camera to land before the place animates in — see
      // triggerFrameByRegion's own header for the two readings of the tuned pacing and why only
      // the carrier path opts in.
      const triggers = triggerFrameByRegion(beats, phases, {
        atHoldStart: !!config.sweepCarrier,
      });
      const anchorByKey = new Map<string, [number, number]>();
      const borderByRegion = new Map<string, DrawEntry>();
      for (const key of triggers.keys()) {
        const f = worldGeoJson.features.find(
          (ft) => String(ft.properties?.[joinKey]) === key,
        );
        if (!f || !f.geometry) continue;

        try {
          const c = poleOfInaccessibility(
            mainlandFeature(f) as GeoJSON.Feature<
              GeoJSON.Polygon | GeoJSON.MultiPolygon
            >,
          ) as [number, number];
          anchorByKey.set(key, c);
        } catch {
          // Skip a subject where the pole computation fails (e.g., degenerate geometry).
        }

        const g = f.geometry;
        let rings: number[][][];
        if (g.type === "Polygon") {
          rings = [g.coordinates[0]];
        } else if (g.type === "MultiPolygon") {
          rings = g.coordinates.map((poly) => poly[0]);
        } else {
          continue;
        }
        if (rings.length === 0) continue;
        borderByRegion.set(key, buildDraw(rings));
      }

      // Build the initial enriched world for beat 0.
      const initialWorld = enrichWorld(
        worldGeoJson,
        layout.joined,
        sortedBins,
        beats[0],
        joinKey,
      );

      // Build fill-color expression (static — color per value, same as ChoroplethReveal).
      const colorExpr: unknown[] = [
        "case",
        ["==", ["get", "__hasData"], false],
        NO_DATA_COLOR,
      ];
      for (let i = 0; i < sortedBins.length - 1; i++) {
        colorExpr.push(["<", ["get", "__value"], sortedBins[i].max]);
        colorExpr.push(sortedBins[i].color);
      }
      colorExpr.push(sortedBins[sortedBins.length - 1].color);

      m.addSource("choropleth-world", {
        type: "geojson",
        data: initialWorld,
      });

      m.addLayer({
        id: "choropleth-fill",
        type: "fill",
        source: "choropleth-world",
        paint: {
          "fill-color": colorExpr as never,
          "fill-opacity": 0, // start blank
        },
      });

      m.addLayer({
        id: "choropleth-stroke",
        type: "line",
        source: "choropleth-world",
        paint: {
          "line-color": dark ? "#1c1c1f" : "#ffffff",
          "line-width": 0.5,
          "line-opacity": 0.6,
        },
      });

      // A subject region's own feature, isolated as a one-feature FeatureCollection —
      // the bloom fill source (filtered so the transient overshoot only ever paints
      // that region, never the rest of the distribution).
      const singleRegionFeature = (key: string): GeoJSON.FeatureCollection => ({
        type: "FeatureCollection",
        features: worldGeoJson.features.filter(
          (f) => String(f.properties?.[joinKey]) === key,
        ),
      });

      // A subject region's bin color — same sortedBins lookup as colorExpr/the callout
      // highlight color below, so the bloom always matches what's already painted there.
      const binColorForKey = (key: string): string => {
        const j = layout.joined.find((jj) => jj.key === key);
        if (j?.value === null || j?.value === undefined) return NO_DATA_COLOR;
        const binIdx = sortedBins.findIndex(
          (b, bi) =>
            (j.value as number) < b.max || bi === sortedBins.length - 1,
        );
        return binIdx >= 0 ? sortedBins[binIdx].color : NO_DATA_COLOR;
      };

      // Per-subject emphasis: border trail (draws on) + fill bloom (brief overshoot on
      // top of the base fill) — one dedicated source+layer pair per reveal-beat region,
      // staged over the beat's first ~2.5-4.2s. Bloom sits above the base fill so its
      // opacity reads as an additive brightening; the trail sits above the bloom so the
      // drawn border stays visible through it.
      addSubjectEmphasisLayers(m, [...triggers.keys()], {
        idPrefix: "choro",
        featureFor: singleRegionFeature,
        colorFor: binColorForKey,
        dark,
        // ★ Map Explainer's border rule (references/architecture.md §5): the drawn border is a
        // DARKER SHADE OF THE REGION'S OWN COLOUR, not a flat neutral. In Tom's map that reads
        // "the electricity is on the river, not here" — the bright colour belongs to the thing
        // that is arriving. In ours it does one more thing: it ties the border to the value the
        // fill is about to bloom to, so the border draw already says which bin this region is in
        // before the fill answers. Only under a carrier, so an un-swept story is untouched.
        trailShade: config.sweepCarrier ? "subject" : "neutral",
      });

      // Position to beat 0 (global establish view).
      m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

      continueWhenMapSettles(m, () => {
        setMapState({
          map: m,
          beats,
          phases,
          solutions,
          sortedBins,
          anchorByKey,
          worldGeoJson,
          joined: layout.joined,
          triggers,
          borderByRegion,
          joinKey,
        });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const {
      map,
      beats,
      phases,
      solutions,
      sortedBins,
      anchorByKey,
      worldGeoJson,
      joined,
      triggers,
      borderByRegion,
      joinKey,
    } = mapState;

    const h = delayRender(`story-frame-${frame}`);

    const { camera, beatIndex, fillReveal } = cameraForFrame(
      frame,
      phases,
      solutions,
    );

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // Per-subject entrance — each region's trail draws on, then (context mode) its fill
    // blooms with a transient overshoot, over the first ~2.5-4.2s since its reveal beat's
    // own trigger frame (constant seconds, never a global fraction). Staged per key once,
    // reused below for the callout's label-rise.
    const BLOOM_BASE = 0.9; // matches the base choropleth-fill target (fillReveal*0.9 at full reveal)
    const stagedMap = stagedByKey(triggers, frame, fps, BLOOM_BASE);
    for (const key of triggers.keys()) {
      const staged = stagedMap.get(key)!;

      const d = borderByRegion.get(key);
      if (d) {
        (
          map.getSource(`choro-trail-${key}`) as maptilersdk.GeoJSONSource
        ).setData(
          staged.borderProgress <= 0
            ? EMPTY_FEATURE
            : sliceBorder(d, 0, d.total * staged.borderProgress),
        );
      }

      if (mode === "context") {
        // Transient overshoot delta only — the base choropleth-fill opacity below is left
        // untouched (fillReveal*0.9 for the whole distribution), so this is a brief
        // brightening on top, never a drop-to-zero. `fillBloom` IS that delta, computed
        // from the raw envelope in the helper (it stays the full 0.225 at peak; reading
        // the clamped `fillOpacity` here would have cut it to the headroom under 1).
        map.setPaintProperty(
          `choro-bloom-${key}`,
          "fill-opacity",
          staged.fillBloom,
        );
      } else {
        // sequential: the bloom layer carries the FULL entrance (0 → overshoot → 0.9, holds)
        // since the base choropleth-fill is pinned to 0 for the whole distribution below.
        map.setPaintProperty(
          `choro-bloom-${key}`,
          "fill-opacity",
          staged.fillOpacity,
        );
      }
    }

    // Update source data only when the beat changes.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      const enriched = enrichWorld(
        worldGeoJson,
        joined,
        sortedBins,
        beats[beatIndex],
        joinKey,
      );
      (map.getSource("choropleth-world") as maptilersdk.GeoJSONSource).setData(
        enriched,
      );
    }

    // Base choropleth-fill opacity — branches on revealMode (never both in one frame):
    //  - context: whole distribution visible (Task 8, untouched) — only data-bearing
    //    regions are painted, no-data regions stay unpainted → default basemap.
    //  - sequential: nothing lit from establish — every subject's own bloom layer
    //    (above) carries its full entrance instead. A declared carrier RESOLVES to this
    //    mode (resolveRevealMode), so the explainer path is this branch and not a third
    //    one: the sweep no longer paints anything at all, it only ordered the beats.
    if (mode === "sequential") {
      // ★ THE CLOSE — carrier only. Everything above is Map Explainer's device faithfully: the
      // subjects the walk visits light up and stay lit, and the rest of the map is basemap. On
      // Tom's map that is right, because a country the river never enters is not part of the
      // claim. On a CHOROPLETH it is a misreading waiting to happen: every region here carries a
      // value, and an uncoloured region on a choropleth reads as "no data", not as "not a
      // subject". Frame 719 of the first render showed it — Britain, France, Spain and Italy
      // grey behind a takeaway about a north–south gradient they are half of.
      //
      // So the takeaway beat brings the distribution the walk sat inside. It rides the SAME
      // clock as everything else (this beat's own hold — the camera pulls back first, then the
      // rest appears), never a second one. The subjects are excluded: their own bloom layers
      // already hold them at full, and washing them again would composite them darker than the
      // scale says they are.
      const closing =
        config.sweepCarrier && beats[beatIndex]!.kind === "takeaway"
          ? interpolate(
              frame,
              [
                phases[beatIndex]!.startFrame + phases[beatIndex]!.moveFrames,
                phases[beatIndex]!.startFrame +
                  phases[beatIndex]!.moveFrames +
                  Math.round(EXPLAINER_CLOSE_S * fps),
              ],
              [0, 0.9],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            )
          : 0;
      const subjectKeys = [...triggers.keys()];
      map.setPaintProperty(
        "choropleth-fill",
        "fill-opacity",
        closing <= 0
          ? 0
          : ([
              "case",
              ["==", ["get", "__hasData"], false],
              0, // no-data: unpainted → default basemap, as everywhere else
              ...(subjectKeys.length
                ? [["match", ["get", joinKey], subjectKeys, true, false], 0]
                : []),
              closing,
            ] as never),
      );
    } else {
      map.setPaintProperty("choropleth-fill", "fill-opacity", [
        "case",
        ["==", ["get", "__hasData"], false],
        0, // no-data: unpainted → default basemap
        fillReveal * 0.9, // data: driven by the beat reveal
      ] as never);
    }

    // Compute overlay state while we still have access to map.project.
    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // Callout reveal: ease over first ~0.5s of the beat's hold.
    const holdStart = phase.startFrame + phase.moveFrames;
    const halfSecFrames = Math.max(1, Math.round(fps * 0.5));
    const calloutReveal = interpolate(
      frame,
      [holdStart, holdStart + halfSecFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // Caption reveal: same easing.
    const captionReveal = calloutReveal;

    let calloutPt: { x: number; y: number } | null = null;
    let calloutColor = "#ffffff";
    // Staged rise for the active subject's label — falls back to the 0.5s calloutReveal
    // ease if this callout's region has no trigger (shouldn't happen: every reveal-beat
    // callout region has one, see triggerFrameByRegion).
    let labelReveal = calloutReveal;

    if (beat.callout) {
      const regionKey = beat.callout.region;
      // invariant: beat.callout.region is always a reveal-beat highlight[0] (see map-story.ts) → always a triggers/anchorByKey/stagedMap key.
      const lngLat = anchorByKey.get(regionKey);
      if (lngLat) {
        const pt = map.project(lngLat as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
      }
      const staged = stagedMap.get(regionKey);
      if (staged) labelReveal = staged.labelReveal;
      // Resolve the highlighted region's bin color.
      if (beat.highlight.length > 0) {
        const hKey = beat.highlight[0];
        const hJoined = joined.find((j) => j.key === hKey);
        if (hJoined?.value !== null && hJoined?.value !== undefined) {
          const binIdx = sortedBins.findIndex(
            (b, bi) =>
              (hJoined.value as number) < b.max || bi === sortedBins.length - 1,
          );
          if (binIdx >= 0) calloutColor = sortedBins[binIdx].color;
        }
      }
    }

    setOverlay({
      beatIndex,
      fillReveal,
      calloutPt,
      calloutReveal,
      labelReveal,
      calloutText: beat.callout?.text ?? "",
      calloutValue: beat.callout?.value ?? "",
      calloutColor,
      captionReveal,
    });

    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — sequential/diverging bin scale (swatch + min–max) + unit label. Populated from
  // the same sortedBins used to build colorExpr, so the key always matches what's painted.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !mapState) return;
    const bins = mapState.sortedBins;
    // Bins are evenly spaced (see computeChoropleth) — the width of any one bin IS the gap
    // between adjacent boundaries, giving fmtBin enough decimal precision for distinct labels.
    const minGap = bins.length ? bins[0].max - bins[0].min : undefined;
    const unit = config.unit ?? "";
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${theme.ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${unit}
      </div>`;
    const swatches = bins
      .map(
        (b) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px ${theme.stroke};flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${theme.sub}">${fmtBinRange(b.min, b.max, { unit: config.valueUnit, minGap, lang: config.lang })}</span>
        </div>`,
      )
      .join("");
    el.innerHTML = header + swatches;
  }, [mapState, theme, config.unit]);

  const beat = mapState && overlay ? mapState.beats[overlay.beatIndex] : null;

  const p0 = mapState?.phases[0];
  const titleSceneEndFrame = p0
    ? p0.startFrame + p0.moveFrames + p0.holdFrames
    : 0;
  const scene = mapState
    ? resolveScene(frame, { titleSceneEndFrame })
    : { titleOpacity: 1, furnitureOpacity: 0 };

  return (
    <AbsoluteFill style={{ backgroundColor: dark ? "#0e0f12" : "#f4f4f4" }}>
      {/* MapFrame: shared furniture shell — title band (top) + source band (bottom, always).
          The map div is the child; data is kept out of the bands via mapFrame.pad → cameraForBounds. */}
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        geoCredit={config.geoCredit}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
        houseHue={houseHue}
        lang={config.lang}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Legend — bottom-right, fades in with the furniture */}
      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: theme.bg,
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 120,
          opacity: scene.furnitureOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Callout overlay — projected to screen coords */}
      {overlay &&
        beat?.callout &&
        overlay.calloutPt &&
        overlay.calloutReveal > 0 &&
        // The centred label is the DERIVED story's caption. An authored step carries its
        // subject on the CaptionCard instead — one text object, one type scale.
        !beat?.authored && (
          <CountryLabel
            name={beat.callout.name}
            color={overlay.calloutColor}
            reveal={overlay.labelReveal}
            x={overlay.calloutPt.x}
            y={overlay.calloutPt.y}
            value={overlay.calloutValue}
          />
        )}

      {/* Caption lower-third — only for takeaway beats (reveal beats show value via CountryLabel;
          title beat uses the full TitleCard) */}
      {overlay &&
        beat?.kind !== "title" &&
        // ★ AN AUTHORED REVEAL SHOWS ITS SENTENCE. A derived reveal's `copy` restates what the
        // map already writes on itself (the region's name and value), so a card would duplicate
        // it — that is why reveals were excluded. But a CONFIRMED walk's copy is the
        // journalist's own claim, and excluding it meant the guided tour demanded nine sentences
        // and displayed none of them. Measured on Rémy's own run, 2026-08-06: "La visite guidée
        // n'affiche pas les phrases que tu as validées." The `authored` flag has existed on the
        // beat since applyMapArc was written, documented at length — and no component read it.
        (beat?.kind !== "reveal" || beat?.authored) &&
        beat?.copy &&
        overlay.captionReveal > 0 && (
          <CaptionCard
            text={beat.copy}
            reveal={overlay.captionReveal}
            {...(beat.authored && beat.callout
              ? { eyebrow: beat.callout.name, value: beat.callout.value }
              : {})}
          />
        )}

      {/* Title card — shown from frame 0, fades out as map scene begins. */}
      {scene.titleOpacity > 0 && mapState && mapState.beats[0].copy && (
        <TitleCard
          text={mapState.beats[0].copy}
          description={config.description}
          opacity={scene.titleOpacity}
        />
      )}
    </AbsoluteFill>
  );
};
