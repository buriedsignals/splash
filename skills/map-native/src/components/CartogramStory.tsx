// CartogramStory — beat-driven guided camera tour for the cartogram map.
// Ports HexGridStory, with cartogram deltas:
//   1. Beats from deriveCartogramStory(computeCartogram(config, worldGeoJson), meta) — title →
//      establish → reveal the HIGHEST regions by value (descending) → takeaway.
//   2. Same cell-build as CartogramReveal (fill-color by __color), but each cell feature is
//      TAGGED with __id so a reveal beat can dim non-highlighted cells via a data-driven expression.
//   3. On a `reveal` beat (highlight = [regionId]) the fill-opacity is data-driven: full (0.85)
//      for __id === highlightKey, dimmed (~0.2) otherwise. On title/establish/takeaway (empty
//      highlight) all cells use full opacity (0.85). Call applyCartogramBasemap on load.
//   4. Camera flies per beat via buildTimeline/cameraForFrame (jumpTo, never flyTo).
//      Caption = CaptionCard(beat.copy); title scene via resolveScene; sequential/diverging bin legend.
//   5. NO on-map callout — caption carries the region rank + value + id.
// Harness:
//   delayRender → fetch world.geojson → build cells (+__id) + beats + jumpTo beat 0 → idle → continueRender
//   per-frame: delayRender → jumpTo → setPaintProperty(dim by beat) → caption overlay → idle → continueRender

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
import { computeCartogram } from "../cartogram-geo";
import { deriveCartogramStory } from "../cartogram-story";
import { applyCartogramBasemap } from "../theme/cartogram-basemap";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import type { Beat } from "../map-story";
import type { CartogramConfigShape } from "../validate-config";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const CELL_LAYER = "cartogram-cells";
const OUTLINE_LAYER = "cartogram-outline";
const NUM_BINS = 5;
// Opacity for the un-highlighted cells during a reveal beat.
const DIM_OPACITY = 0.2;
// Full opacity cap for cells — mirrors CartogramMap.
const FULL_OPACITY = 0.85;

interface CGLegend {
  bins: { min: number; max: number; color: string }[];
  valueLabel: string;
}

interface CGStoryMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
}

export const CartogramStory: React.FC<{ config: CartogramConfigShape }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  const outlineColor = dark ? "#1c1c1f" : "#ffffff";

  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: NUM_BINS * 18 + 18,
  });

  const [mapState, setMapState] = useState<CGStoryMapState | null>(null);
  const [legendState, setLegendState] = useState<CGLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("cartogram-story-init", { timeoutInMilliseconds: 120000 }),
  );

  // Per-frame overlay: caption reveal ramp for the active beat.
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
      center: [10, 50] as [number, number],
      zoom: 3,
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
      // Fetch world GeoJSON via Remotion staticFile (served from remotion/public/).
      fetch(staticFile("geo/world.geojson"))
        .then((r) => r.json())
        .then((worldGeoJson: GeoJSON.FeatureCollection) => {
          // Compute cartogram layout once.
          const layout = computeCartogram(config, worldGeoJson);

          // Apply basemap treatment BEFORE adding cells.
          // grid variant: neutral flat canvas (hides all basemap layers).
          // scaled variant: keep basemap, strip symbol clutter.
          applyCartogramBasemap(m, dark, layout.variant);

          // Build cell GeoJSON. Each feature is tagged with __id (the region id string)
          // so a reveal beat can dim non-highlighted cells via a data-driven expression.
          const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell) => ({
            type: "Feature",
            properties: {
              __color: cell.color,
              __id: cell.id,
              __value: cell.value,
            },
            geometry: cell.feature.geometry,
          }));
          const cellGeoJson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: cellFeatures,
          };

          m.addSource("cartogram-cell-src", {
            type: "geojson",
            data: cellGeoJson,
          });

          // Cell fill — coloured by bin. Opacity starts full (establish beat 0).
          m.addLayer({
            id: CELL_LAYER,
            type: "fill",
            source: "cartogram-cell-src",
            paint: {
              "fill-color": ["get", "__color"] as never,
              "fill-opacity": FULL_OPACITY,
            },
          });

          // Thin outline for legibility.
          m.addLayer({
            id: OUTLINE_LAYER,
            type: "line",
            source: "cartogram-cell-src",
            paint: {
              "line-color": outlineColor,
              "line-width": 0.6,
              "line-opacity": 0.5,
            },
          });

          // Derive beats — title → establish → highest-region reveals → takeaway.
          const meta = {
            title: config.title ?? "",
            description: config.description,
            insight:
              ((config as Record<string, unknown>).insight as string) ??
              config.title ??
              "",
          };
          const beats = deriveCartogramStory(layout, meta);

          // Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox.
          const solutions: CameraSolution[] = beats.map((b) => {
            const result = m.cameraForBounds(
              b.camera as maptilersdk.LngLatBoundsLike,
              { padding: mapFrame.pad },
            );
            if (!result || !result.center) return { center: [10, 50], zoom: 4 };
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
            bins: layout.bins,
            valueLabel: layout.valueLabel,
          });

          m.once("idle", () => {
            setMapState({ map: m, beats, phases, solutions });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("CartogramStory: failed to load world GeoJSON", err);
          continueRender(handle);
        });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, phases, solutions } = mapState;

    const h = delayRender(`cartogram-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // On beat change: sync cell emphasis. On a `reveal` beat (dim + highlight), use a
    // data-driven expression to dim every cell whose __id isn't the highlighted one;
    // otherwise all cells are at full opacity.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      const emphasise = beat.dim && beat.highlight.length > 0;
      if (emphasise) {
        const highlightKey = beat.highlight[0];
        const opacityExpr = [
          "case",
          ["==", ["get", "__id"], highlightKey],
          FULL_OPACITY,
          DIM_OPACITY,
        ];
        map.setPaintProperty(CELL_LAYER, "fill-opacity", opacityExpr as never);
      } else {
        map.setPaintProperty(CELL_LAYER, "fill-opacity", FULL_OPACITY);
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

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — sequential/diverging bin scale (swatch + min–max) + valueLabel.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${legendState.valueLabel}
      </div>`;
    const swatches = legendState.bins
      .map(
        (b) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${fmt(b.min)}–${fmt(b.max)}</span>
        </div>`,
      )
      .join("");
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
          minWidth: 120,
          opacity: scene.furnitureOpacity,
          pointerEvents: "none",
        }}
      />

      {/* No on-map callout: caption below carries rank + value + region id. */}

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
