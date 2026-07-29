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
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { continueWhenMapSettles } from "../core/frame-ready";
import {
  computeChoropleth,
  mainlandFeature,
  type ChoroplethData,
} from "../choropleth-geo";
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

// Enriched GeoJSON world — adds __value, __hasData, __binIdx.
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
}

export type ChoroplethStoryConfig = ChoroplethData & {
  title?: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  insight?: string;
  source?: { name: string; url: string };
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
  const { fps, width, height } = useVideoConfig();
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

      fetch(staticFile("geo/world.geojson"))
        .then((r) => r.json())
        .then((worldGeoJson: GeoJSON.FeatureCollection) => {
          // Compute choropleth layout.
          const layout = computeChoropleth(config, worldGeoJson, "iso_a3", {
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
          const beats = beatsForMode(
            deriveMapStory(layout, worldGeoJson, "iso_a3", meta),
            mode,
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
          const triggers = triggerFrameByRegion(beats, phases);
          const anchorByKey = new Map<string, [number, number]>();
          const borderByRegion = new Map<string, DrawEntry>();
          for (const key of triggers.keys()) {
            const f = worldGeoJson.features.find(
              (ft) => String(ft.properties?.["iso_a3"]) === key,
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
            "iso_a3",
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
          const singleRegionFeature = (
            key: string,
          ): GeoJSON.FeatureCollection => ({
            type: "FeatureCollection",
            features: worldGeoJson.features.filter(
              (f) => String(f.properties?.["iso_a3"]) === key,
            ),
          });

          // A subject region's bin color — same sortedBins lookup as colorExpr/the callout
          // highlight color below, so the bloom always matches what's already painted there.
          const binColorForKey = (key: string): string => {
            const j = layout.joined.find((jj) => jj.key === key);
            if (j?.value === null || j?.value === undefined)
              return NO_DATA_COLOR;
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
            });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("ChoroplethStory: failed to load world GeoJSON", err);
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
        "iso_a3",
      );
      (map.getSource("choropleth-world") as maptilersdk.GeoJSONSource).setData(
        enriched,
      );
    }

    // Base choropleth-fill opacity — branches on revealMode (never both in one frame):
    //  - context: whole distribution visible (Task 8, untouched) — only data-bearing
    //    regions are painted, no-data regions stay unpainted → default basemap.
    //  - sequential: nothing lit from establish — every subject's own bloom layer
    //    (above) carries its full entrance instead.
    if (mode === "sequential") {
      map.setPaintProperty("choropleth-fill", "fill-opacity", 0);
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
        overlay.calloutReveal > 0 && (
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
        beat?.kind !== "reveal" &&
        beat?.copy &&
        overlay.captionReveal > 0 && (
          <CaptionCard text={beat.copy} reveal={overlay.captionReveal} />
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
