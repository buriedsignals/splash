// DotDensityStory — beat-driven guided camera tour for the dot-density map.
// Ports ChoroplethStory/CartogramStory's areal choreography, with a STIPPLE-IN twist:
//   1. beats from beatsForMode(deriveDotDensityStory(computeDotDensity(config, world, "iso_a3"),
//      meta), mode) — title → establish (dropped in sequential) → reveal the DENSEST regions
//      (dots/area, descending) → takeaway.
//   2. same dot-build as DotDensityReveal (uniform circle-radius 2, NEVER value-scaled), but each dot
//      Point is TAGGED with __region = its region key so the story can dim/stipple non-highlighted
//      or not-yet-entered regions. Region polygons (dot-density-region-src) are REAL country
//      geometry — genuine border-draw (trail), pole-of-inaccessibility label anchor.
//   3. the FILL CHANNEL IS THE DOTS THEMSELVES, not a bloom fill layer: addSubjectEmphasisLayers
//      is called with `bloom:false` (trail-only), and each subject's dot circle-opacity is a
//      per-frame data-driven expression built from stagedByKey's fillOpacity (0→overshoot→1
//      stipple-in), computed by buildDotOpacityExpression (dot-density-story.ts, pure/tested).
//      context: highlighted subject's dots stipple in, others held at DIM_OPACITY; title/
//      establish/takeaway → every dot full. sequential: every triggered region shows its own
//      staged fillOpacity (0 while not yet entered), untriggered regions 0.
//   4. camera flies to each beat via buildTimeline/cameraForFrame (AREAL_TIMELINE_OPTS, shared
//      with the other areal story comps); projected CountryLabel (name + value) at the pole of
//      inaccessibility, reveal=labelReveal; CaptionCard(beat.copy) carries the fuller sentence;
//      title scene via resolveScene; legend "1 dot = N" + category swatches (multivariate).
// Harness:
//   delayRender → on load fetch world → build dots(+__region) + regions + beats + entrance
//   layers (trail-only) → jumpTo beat 0 → idle → continueRender
//   per-frame: delayRender → jumpTo → per-subject trail slice → dots opacity expression →
//   project label anchor → caption/label overlay → idle → continueRender

import React, { useEffect, useRef, useState } from "react";
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
import { poleOfInaccessibility } from "../core/label-anchor";
import { mainlandFeature } from "../choropleth-geo";
import {
  computeDotDensity,
  UNIVARIATE_ACCENT,
  type RegionDotSpec,
} from "../dot-density-geo";
import { scatterInPolygon } from "../dot-scatter";
import {
  deriveDotDensityStory,
  buildDotOpacityExpression,
} from "../dot-density-story";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { resolveRevealMode, beatsForMode, type Beat } from "../map-story";
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
import type { DotDensityConfigShape } from "../validate-config";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { formatLocaleNumber } from "../core/locale";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 2; // FIXED — uniform dot size, NEVER value-scaled
const DOT_LAYER = "dot-density-dots";
const OUTLINE_LAYER = "dot-density-outline";
const JOIN_KEY = "iso_a3";
const DIM_OPACITY = 0.25; // non-highlighted regions during a reveal beat (context mode)

interface DDLegend {
  hasCategories: boolean;
  dotValue: number;
  legend: { category: string; color: string }[];
}

interface DotStoryMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
  triggers: Map<string, number>;
  borderByKey: Map<string, DrawEntry>;
  anchorByKey: Map<string, [number, number]>;
  regionByKey: Map<string, RegionDotSpec>;
}

// A region's dominant colour — the single group for a univariate map, else the group with the
// highest dot count (mirrors the "mostly X" dominant-category pick in deriveDotDensityStory).
function dominantColor(region: RegionDotSpec): string {
  if (!region.groups.length) return "#ffffff";
  return region.groups.reduce((best, g) => (g.count > best.count ? g : best))
    .color;
}

export const DotDensityStory: React.FC<{ config: DotDensityConfigShape }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const mode = resolveRevealMode(config);
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  const outlineColor = dark ? "#5a5a63" : "#9aa0a6";

  const legendRows =
    1 + (config.categories?.length ? config.categories.length : 0);
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: legendRows * 18 + 18,
  });

  const [mapState, setMapState] = useState<DotStoryMapState | null>(null);
  const [legendState, setLegendState] = useState<DDLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("dot-density-story-init", { timeoutInMilliseconds: 120000 }),
  );

  // Per-frame overlay state: caption reveal ramp + the active subject's projected label state.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    captionReveal: number;
    calloutPt: { x: number; y: number } | null;
    calloutColor: string;
    calloutValue: string;
    labelReveal: number;
  } | null>(null);

  // Init map once.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;

    const m = new maptilersdk.Map({
      container: ref.current,
      style,
      center: [10, 30] as [number, number],
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
      // Strip symbol / place-label clutter so dots read cleanly.
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") m.removeLayer(layer.id);
      }

      fetch(staticFile("geo/world.geojson"))
        .then((r) => r.json())
        .then((world: GeoJSON.FeatureCollection) => {
          const layout = computeDotDensity(config, world, JOIN_KEY);

          // Build the DOT GeoJSON once — one Point per dot, coloured by group, TAGGED with
          // __region = the region key so a reveal beat can dim non-highlighted regions.
          const dotFeatures: GeoJSON.Feature[] = [];
          for (const region of layout.regions) {
            for (const group of region.groups) {
              const pts = scatterInPolygon(
                region.feature,
                group.count,
                group.seed,
              );
              for (const [lon, lat] of pts) {
                dotFeatures.push({
                  type: "Feature",
                  properties: { color: group.color, __region: region.key },
                  geometry: { type: "Point", coordinates: [lon, lat] },
                });
              }
            }
          }

          const regionGeoJson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: layout.regions.map((r) => r.feature),
          };

          m.addSource("dot-density-region-src", {
            type: "geojson",
            data: regionGeoJson,
          });
          m.addSource("dot-density-dot-src", {
            type: "geojson",
            data: { type: "FeatureCollection", features: dotFeatures },
          });

          m.addLayer({
            id: OUTLINE_LAYER,
            type: "line",
            source: "dot-density-region-src",
            paint: {
              "line-color": outlineColor,
              "line-width": 0.6,
              "line-opacity": 0.5,
            },
          });

          // Dot layer — FIXED radius, colour by group. Opacity starts full (establish beat 0).
          m.addLayer({
            id: DOT_LAYER,
            type: "circle",
            source: "dot-density-dot-src",
            paint: {
              "circle-radius": DOT_RADIUS_PX,
              "circle-color": ["get", "color"],
              "circle-opacity": 1,
              "circle-stroke-width": 0.3,
              "circle-stroke-color": dark
                ? "rgba(0,0,0,0.4)"
                : "rgba(0,0,0,0.15)",
              "circle-stroke-opacity": 1,
            },
          });

          // Build beats from the layout — title → establish (dropped in sequential) → densest
          // reveals → takeaway.
          const meta = {
            title: config.title ?? "",
            description: config.description,
            insight:
              ((config as Record<string, unknown>).insight as string) ??
              config.title ??
              "",
            unit:
              ((config as Record<string, unknown>).valueUnit as string) ?? "",
          };
          const beats = beatsForMode(deriveDotDensityStory(layout, meta), mode);

          // Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox, padded.
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

          // Build timeline phases — same fluid interwoven envelope as ChoroplethStory/CartogramStory.
          const kinds = beats.map((b) => b.kind);
          const { phases } = buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS);

          // Precompute, for each subject region a reveal beat actually visits (triggerFrameByRegion
          // keys are exactly the beats' callout.region values) — never the whole region set:
          //  - its border-draw geometry: ALL of the region feature's exterior ring(s) (a
          //    MultiPolygon region, e.g. offshore islands, must draw every part, not just the
          //    largest), staged-drawn on over the beat's own entrance window.
          //  - its callout anchor: the pole of inaccessibility (most-interior point) of the
          //    region's MAINLAND polygon only, not the full feature — the camera bounds
          //    (region.camera, built from regionBounds's mainlandFeature) frame the mainland,
          //    so anchoring on the full feature risks the pole grid-search landing on a large
          //    offshore-islands part that wins the search but sits outside the framed
          //    viewport, projecting off-screen (mirrors ChoroplethStory's guard).
          const regionByKey = new Map(layout.regions.map((r) => [r.key, r]));
          const triggers = triggerFrameByRegion(beats, phases);
          const borderByKey = new Map<string, DrawEntry>();
          const anchorByKey = new Map<string, [number, number]>();
          for (const key of triggers.keys()) {
            const region = regionByKey.get(key);
            if (!region) continue;

            const g = region.feature.geometry;
            let rings: number[][][];
            if (g.type === "Polygon") {
              rings = [g.coordinates[0]];
            } else if (g.type === "MultiPolygon") {
              rings = g.coordinates.map((poly) => poly[0]);
            } else {
              continue;
            }
            if (rings.length > 0) borderByKey.set(key, buildDraw(rings));

            try {
              anchorByKey.set(
                key,
                poleOfInaccessibility(
                  mainlandFeature(region.feature) as GeoJSON.Feature<
                    GeoJSON.Polygon | GeoJSON.MultiPolygon
                  >,
                ),
              );
            } catch {
              // Skip a subject where the pole computation fails (e.g., degenerate geometry).
            }
          }

          // Per-subject emphasis: border trail ONLY (bloom:false) — the fill channel is the
          // dots themselves (stipple-in via circle-opacity, computed per-frame below), not an
          // areal fill layer.
          addSubjectEmphasisLayers(m, [...triggers.keys()], {
            idPrefix: "dotdensity",
            featureFor: (key) => regionByKey.get(key)?.feature ?? EMPTY_FEATURE,
            colorFor: (key) => {
              const region = regionByKey.get(key);
              return region ? dominantColor(region) : "#999999";
            },
            dark,
            bloom: false,
          });

          m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

          setLegendState({
            hasCategories: layout.hasCategories,
            dotValue: layout.dotValue,
            legend: layout.legend,
          });

          continueWhenMapSettles(m, () => {
            setMapState({
              map: m,
              beats,
              phases,
              solutions,
              triggers,
              borderByKey,
              anchorByKey,
              regionByKey,
            });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("DotDensityStory: failed to load world GeoJSON", err);
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
      triggers,
      borderByKey,
      anchorByKey,
      regionByKey,
    } = mapState;

    const h = delayRender(`dot-density-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // Per-subject entrance — each subject region's border trail draws on, staged over the first
    // ~2.5-4.2s since its reveal beat's own trigger frame. fillTarget=1 so a subject's staged
    // fillOpacity feeds the DOT layer's own full opacity (below), not a bloom overshoot.
    const stagedMap = stagedByKey(triggers, frame, fps, 1);
    for (const key of triggers.keys()) {
      const staged = stagedMap.get(key)!;
      const d = borderByKey.get(key);
      if (d) {
        (
          map.getSource(`dotdensity-trail-${key}`) as maptilersdk.GeoJSONSource
        ).setData(
          staged.borderProgress <= 0
            ? EMPTY_FEATURE
            : sliceBorder(d, 0, d.total * staged.borderProgress),
        );
      }
    }

    // Dots STIPPLE IN: the fill channel is the dot layer itself, not a bloom fill — a per-frame
    // data-driven circle-opacity expression built from each subject's own staged fillOpacity
    // (pure helper, unit-tested — see dot-density-story.ts).
    const opacityExpr = buildDotOpacityExpression(
      mode,
      beat,
      stagedMap,
      DIM_OPACITY,
    );
    map.setPaintProperty(DOT_LAYER, "circle-opacity", opacityExpr as never);
    map.setPaintProperty(
      DOT_LAYER,
      "circle-stroke-opacity",
      opacityExpr as never,
    );

    // Caption reveal: ease over first ~0.5s of the beat's hold.
    const holdStart = phase.startFrame + phase.moveFrames;
    const halfSecFrames = Math.max(1, Math.round(fps * 0.5));
    const captionReveal = interpolate(
      frame,
      [holdStart, holdStart + halfSecFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // Projected label overlay — the beat's subject region, staged label-rise driven by the same
    // entrance envelope as its border trail/dot stipple. Falls back to the 0.5s captionReveal
    // ease if this callout's region has no trigger (shouldn't happen: every reveal-beat callout
    // region has one, see triggerFrameByRegion).
    let calloutPt: { x: number; y: number } | null = null;
    let calloutColor = "#ffffff";
    let labelReveal = captionReveal;

    if (beat.callout) {
      const regionKey = beat.callout.region;
      const lngLat = anchorByKey.get(regionKey);
      if (lngLat) {
        const pt = map.project(lngLat as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
      }
      const staged = stagedMap.get(regionKey);
      if (staged) labelReveal = staged.labelReveal;
      const region = regionByKey.get(regionKey);
      if (region) calloutColor = dominantColor(region);
    }

    setOverlay({
      beatIndex,
      captionReveal,
      calloutPt,
      calloutColor,
      calloutValue: beat.callout?.value ?? "",
      labelReveal,
    });

    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — "1 dot = N" always; category swatches when multivariate.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const dotN = formatLocaleNumber(legendState.dotValue, config.lang);
    const header = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${legendState.hasCategories ? 8 : 0}px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${config.brandHue ?? (dark ? "#e8e8ec" : UNIVARIATE_ACCENT.light)};flex-shrink:0"></span>
        <span style="font:600 11px/1.2 sans-serif;color:${ink}">1 dot = ${dotN}</span>
      </div>`;
    const swatches = legendState.hasCategories
      ? legendState.legend
          .map(
            (l) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${l.category}</span>
        </div>`,
          )
          .join("")
      : "";
    el.innerHTML = header + swatches;
  }, [dark, legendState]);

  const beat = mapState && overlay ? mapState.beats[overlay.beatIndex] : null;

  const p0 = mapState?.phases[0];
  const titleSceneEndFrame = p0
    ? p0.startFrame + p0.moveFrames + p0.holdFrames
    : 0;
  const scene = mapState
    ? resolveScene(frame, { titleSceneEndFrame })
    : { titleOpacity: 1, furnitureOpacity: 0 };

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={{ name: config.source?.name ?? "", url: config.source?.url }}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
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
          background: dark ? "rgba(24,24,27,0.88)" : "rgba(255,255,255,0.92)",
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 110,
          opacity: scene.furnitureOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Projected on-map label — the beat's subject region, name + value, staged rise */}
      {overlay &&
        beat?.callout &&
        overlay.calloutPt &&
        overlay.labelReveal > 0 && (
          <CountryLabel
            name={beat.callout.name}
            color={overlay.calloutColor}
            reveal={overlay.labelReveal}
            x={overlay.calloutPt.x}
            y={overlay.calloutPt.y}
            value={overlay.calloutValue}
          />
        )}

      {/* Caption lower-third — carries the fuller sentence (incl. "mostly X" for multivariate) */}
      {overlay &&
        beat?.kind !== "title" &&
        beat?.copy &&
        overlay.captionReveal > 0 && (
          <CaptionCard text={beat.copy} reveal={overlay.captionReveal} />
        )}

      {/* Title card — shown from frame 0, fades out as the map scene begins. */}
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
