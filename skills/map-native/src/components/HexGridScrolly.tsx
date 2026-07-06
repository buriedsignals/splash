// HexGridScrolly — scrolly-as-video hex-grid composition.
// Ports DotDensityScrolly's step timeline (title → reveal x N), pinned ScrollyPanels, and
// per-step dim-emphasis; renders the cell-build + legend treatment of HexGridStory (cells tagged
// __cellIdx, fill by __color, sequential bin legend). Two regimes: count or mean aggregate.
// Per-step dim-emphasis: on a reveal step the cells whose __cellIdx isn't the highlighted key dim
// to ~0.2 (DIM_OPACITY), synced to the panel slide-in (reuse DotDensityScrolly's synced approach
// + the __cellIdx case expression from HexGridStory).
// Overview (establish) + takeaway render NO panel (visual only) — matching established convention.
// Harness pattern: delayRender → jumpTo → setPaintProperty (dim by step) → idle → continueRender.

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { computeHexGrid } from "../hex-grid-geo";
import { deriveHexGridStory } from "../hex-grid-story";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import type { Beat } from "../map-story";
import type { HexGridConfigShape } from "../validate-config";
import { TitleCard } from "./StoryCards";
import { ScrollyPanel } from "./ScrollyPanel";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import {
  mapStoryToChapters,
  type ScrollyStory,
} from "../../../scrolly/src/chapters";
import { scrollyFrames } from "../route-story";
import { stepSlide } from "./ChoroplethScrolly";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const CELL_LAYER = "hex-grid-cells";
const OUTLINE_LAYER = "hex-grid-outline";
const NUM_BINS = 5;
const DIM_OPACITY = 0.2; // non-highlighted cells during a reveal step
const FULL_OPACITY = 0.8; // full opacity cap for cells

interface HGLegend {
  bins: { min: number; max: number; color: string }[];
  aggregateLabel: string;
}

interface HGScrollyState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
}

export const HexGridScrolly: React.FC<{ config: HexGridConfigShape }> = ({
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

  const [mapState, setMapState] = useState<HGScrollyState | null>(null);
  const [legendState, setLegendState] = useState<HGLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("hex-grid-scrolly-init", { timeoutInMilliseconds: 120000 }),
  );

  // Ref to track the last rendered step-ref beat index so we avoid setPaintProperty every frame.
  const lastRefBeatIndex = useRef<number>(-1);

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
      // Strip symbol / place-label clutter so cells read cleanly.
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") m.removeLayer(layer.id);
      }

      // Build the cell GeoJSON once — same cell-build as HexGridStory. Each feature is tagged
      // with __cellIdx = string index so a reveal step can dim non-highlighted cells via a
      // data-driven expression. No Date.now / Math.random / argless new Date().
      const layout = computeHexGrid(config);

      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell, idx) => ({
        type: "Feature",
        properties: {
          __color: cell.color,
          __count: cell.count,
          __value: cell.value,
          __cellIdx: String(idx),
        },
        geometry: cell.feature.geometry,
      }));
      const cellGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: cellFeatures,
      };

      m.addSource("hex-grid-cell-src", {
        type: "geojson",
        data: cellGeoJson,
      });

      // Cell fill — coloured by bin via __color. Opacity starts full (establish step).
      m.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "hex-grid-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": FULL_OPACITY,
        },
      });

      // Thin cell outline for tessellation legibility.
      m.addLayer({
        id: OUTLINE_LAYER,
        type: "line",
        source: "hex-grid-cell-src",
        paint: {
          "line-color": outlineColor,
          "line-width": 0.6,
          "line-opacity": 0.5,
        },
      });

      // Derive beats — title → establish → highest-cell reveals → takeaway.
      const meta = {
        title: config.title ?? "",
        description: config.description,
        insight:
          ((config as Record<string, unknown>).insight as string) ??
          config.title ??
          "",
      };
      const beats = deriveHexGridStory(layout, meta);

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

      // Build the scrolly story and step timeline (step 0 = title, rest = reveal).
      const story = mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source
          ? { name: config.source.name ?? "", url: config.source.url }
          : undefined,
        regionsWithData: layout.cells.length,
      });
      const stepKinds = story.steps.map((_, i) =>
        i === 0 ? "title" : "reveal",
      );
      const { phases } = buildTimeline(stepKinds, fps);
      const stepSolutions = story.steps.map((s) => solutions[s.ref as number]);

      m.jumpTo({
        center: stepSolutions[0].center,
        zoom: stepSolutions[0].zoom,
      });

      setLegendState({
        bins: layout.bins,
        aggregateLabel: layout.aggregateLabel,
      });

      m.once("idle", () => {
        setMapState({ map: m, beats, story, phases, stepSolutions });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, story, phases, stepSolutions } = mapState;

    const h = delayRender(`hex-grid-scrolly-frame-${frame}`);

    const total = scrollyFrames(story.steps.length, fps);

    // Drive the camera on the STEP timeline.
    const { camera, beatIndex } = cameraForFrame(frame, phases, stepSolutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // The step's ref is the beat index for the dim-emphasis.
    const refBeatIndex = story.steps[beatIndex].ref as number;
    const refBeat = beats[refBeatIndex];
    const emphasise = refBeat.dim && refBeat.highlight.length > 0;

    // Sync the reveal's dim-emphasis to its panel slide-in. dataReveal ramps 0→1 across the
    // current step's panel move phase (clamp01 of stepSlide). Establish (overview) and takeaway
    // steps carry no highlight, so all cells stay full; on a reveal step the non-highlighted
    // cells dim toward DIM_OPACITY exactly as the panel slides in.
    const dataReveal = Math.max(
      0,
      Math.min(1, stepSlide(frame, phases, beatIndex, fps, total)),
    );

    // Rebuild the opacity expression only on step-ref change OR while emphasis is ramping.
    if (emphasise) {
      lastRefBeatIndex.current = refBeatIndex;
      const highlightKey = refBeat.highlight[0];
      // dim = FULL_OPACITY → DIM_OPACITY as the panel slides in; highlighted cell stays full.
      const dimNow = FULL_OPACITY - (FULL_OPACITY - DIM_OPACITY) * dataReveal;
      const opacityExpr = [
        "case",
        ["==", ["get", "__cellIdx"], highlightKey],
        FULL_OPACITY,
        dimNow,
      ];
      map.setPaintProperty(CELL_LAYER, "fill-opacity", opacityExpr as never);
    } else if (refBeatIndex !== lastRefBeatIndex.current) {
      lastRefBeatIndex.current = refBeatIndex;
      map.setPaintProperty(CELL_LAYER, "fill-opacity", FULL_OPACITY);
    }

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — sequential bin scale (swatch + min–max) + aggregate label. Never a size legend.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${legendState.aggregateLabel}
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

  // Scrolly panels + title scene.
  const total = scrollyFrames(mapState?.story.steps.length ?? 2, fps);
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

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

      {/* Pinned ScrollyPanel per REVEAL step; overview (establish) + takeaway render no panel. */}
      {mapState &&
        mapState.story.steps.map((s, i) =>
          mapState.beats[s.ref as number].kind !== "reveal" ? null : (
            <ScrollyPanel
              key={s.id}
              width={width}
              height={height}
              align={s.align}
              slide={stepSlide(frame, mapState.phases, i, fps, total)}
              prose={s.prose}
              dark={dark}
            />
          ),
        )}

      {scene.titleOpacity > 0 && config.title && (
        <TitleCard
          text={config.title}
          description={config.description}
          opacity={scene.titleOpacity}
        />
      )}
    </AbsoluteFill>
  );
};
