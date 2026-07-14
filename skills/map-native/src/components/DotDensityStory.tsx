// DotDensityStory — beat-driven guided camera tour for the dot-density map.
// Ports LocatorStory, with dot-density deltas:
//   1. beats from deriveDotDensityStory(computeDotDensity(config, world, "iso_a3"), meta) — title →
//      establish → reveal the DENSEST regions (dots/area, descending) → takeaway.
//   2. same dot-build as DotDensityReveal (uniform circle-radius 2, NEVER value-scaled), but each dot
//      Point is TAGGED with __region = its region key so the story can dim non-highlighted regions.
//   3. on a `reveal` beat (highlight = [regionKey]) the dot layer circle-opacity is a data-driven
//      expression: full for __region === highlightKey, dimmed (~0.25) otherwise — synced to the beat.
//      On title/establish/takeaway (empty highlight) all dots are full.
//   4. camera flies to each beat via buildTimeline/cameraForFrame; caption = CaptionCard(beat.copy);
//      title scene via resolveScene; legend "1 dot = N" + category swatches (multivariate).
//   5. NO on-map name callout — the caption carries the region name (locator callout-removal decision).
// Harness:
//   delayRender → on load fetch world → build dots(+__region) + beats + jumpTo beat 0 → idle → continueRender
//   per-frame: delayRender → jumpTo → setPaintProperty(dim by beat) → caption overlay state → idle → continueRender

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
import { computeDotDensity, UNIVARIATE_ACCENT } from "../dot-density-geo";
import { scatterInPolygon } from "../dot-scatter";
import { deriveDotDensityStory } from "../dot-density-story";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import type { Beat } from "../map-story";
import type { DotDensityConfigShape } from "../validate-config";
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
const DIM_OPACITY = 0.25; // non-highlighted regions during a reveal beat

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

  // Per-frame overlay state: the caption reveal ramp for the active beat.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    captionReveal: number;
  } | null>(null);

  const lastBeatIndex = useRef<number>(-1);

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

          // Build beats from the layout — title → establish → densest reveals → takeaway.
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
          const beats = deriveDotDensityStory(layout, meta);

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

          const kinds = beats.map((b) => b.kind);
          const { phases } = buildTimeline(kinds, fps);

          m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

          setLegendState({
            hasCategories: layout.hasCategories,
            dotValue: layout.dotValue,
            legend: layout.legend,
          });

          continueWhenMapSettles(m, () => {
            setMapState({ map: m, beats, phases, solutions });
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
    const { map, beats, phases, solutions } = mapState;

    const h = delayRender(`dot-density-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // On beat change: sync the dot emphasis. On a `reveal` beat (dim + highlight), dim every dot
    // whose __region isn't the highlighted key; otherwise all dots full. Data-driven expression.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      const emphasise = beat.dim && beat.highlight.length > 0;
      if (emphasise) {
        const highlightKey = beat.highlight[0];
        const opacityExpr = [
          "case",
          ["==", ["get", "__region"], highlightKey],
          1,
          DIM_OPACITY,
        ];
        map.setPaintProperty(DOT_LAYER, "circle-opacity", opacityExpr as never);
        map.setPaintProperty(
          DOT_LAYER,
          "circle-stroke-opacity",
          opacityExpr as never,
        );
      } else {
        map.setPaintProperty(DOT_LAYER, "circle-opacity", 1);
        map.setPaintProperty(DOT_LAYER, "circle-stroke-opacity", 1);
      }
    }

    // Caption reveal: ease over first ~0.5s of the beat's hold.
    const holdStart = phase.startFrame + phase.moveFrames;
    const halfSecFrames = Math.max(1, Math.round(fps * 0.5));
    const captionReveal = interpolate(
      frame,
      [holdStart, holdStart + halfSecFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    setOverlay({ beatIndex, captionReveal });

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

      {/* No on-map callout: the caption below carries the region name + value — consistent with the
          locator callout-removal decision, and avoids a projected label overflowing near frame edges. */}

      {/* Caption lower-third — for reveal/takeaway beats with copy */}
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
