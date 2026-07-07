// SymbolStory — beat-driven guided camera tour for the proportional symbol map.
// Mirrors ChoroplethStory exactly in structure:
//   delayRender → on load add source/layers + build beats + jumpTo beat 0 → idle → continueRender
//   per-frame: delayRender → jumpTo → setPaintProperty → project callout → overlay state → idle → continueRender

import React, { useEffect, useRef, useState } from "react";
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
import { symbolGeometry } from "../symbol-geo";
import { symbolLabels, labelRadialOffset } from "../symbol-labels";
import { deriveSymbolStory } from "../symbol-story";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import type { Beat } from "../map-story";
import type { SymbolConfig } from "../SymbolMap";
import { resolveMapStyle } from "../route-geo";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const SYMBOL_FILL = "#2171b5";
const SYMBOL_STROKE = "#ffffff";
const MAX_RADIUS_PX = 40;

interface SymbolMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
  cityByKey: Map<string, [number, number]>;
}

export const SymbolStory: React.FC<{ config: SymbolConfig }> = ({ config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
  });

  // Ratio-scaled label size: square/portrait are ≤1080 wide → larger text for legibility.
  const textSize = labelTextSize(width);

  const [mapState, setMapState] = useState<SymbolMapState | null>(null);
  const [handle] = useState(() => delayRender("symbol-story-init"));

  // Per-frame overlay state: projected callout position, reveals.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    fillReveal: number;
    calloutPt: { x: number; y: number } | null;
    calloutReveal: number;
    calloutValue: string;
    calloutColor: string;
    captionReveal: number;
  } | null>(null);

  // Ref to avoid redundant setData calls.
  const lastBeatIndex = useRef<number>(-1);

  // Init map once.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

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
      const labels = symbolLabels(geo.symbols);
      m.addSource("symbols", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geo.symbols.map((s, i) => ({
            type: "Feature",
            properties: {
              radius: s.radius,
              label: s.label ?? "",
              labelText: labels[i]?.name
                ? `${labels[i].name}\n${labels[i].valueText}${config.valueUnit ?? ""}`
                : `${labels[i]?.valueText ?? ""}${config.valueUnit ?? ""}`,
              labelOffset: labelRadialOffset(s.radius, textSize),
            },
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          })),
        },
      });

      m.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": 0,
          "circle-color": SYMBOL_FILL,
          "circle-opacity": 0.75,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });

      // Direct label layer — every mark carries its name+value, not just the
      // top-N callouts. Fades in with the establish reveal via text-opacity.
      m.addLayer({
        id: "symbol-labels",
        type: "symbol",
        source: "symbols",
        layout: {
          "text-field": ["get", "labelText"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": textSize,
          "text-variable-anchor": ["left", "right", "top", "bottom"],
          "text-radial-offset": ["get", "labelOffset"],
          "text-justify": "auto",
          "text-allow-overlap": false,
          "text-optional": true,
          "text-line-height": 1.3,
          "text-max-width": 8,
        },
        paint: {
          "text-color": dark ? "#f4f4f5" : "#1a1a1a",
          "text-halo-color": dark ? "rgba(0,0,0,0.85)" : "#ffffff",
          "text-halo-width": 1.6,
          "text-opacity": 0,
        },
      });

      // Build beats and timeline.
      const meta = {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
      };
      const beats = deriveSymbolStory(config.points, meta, {
        maxReveals: config.maxReveals,
      });

      // Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox, padded.
      const solutions: CameraSolution[] = beats.map((b) => {
        const result = m.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          {
            padding: mapFrame.pad,
          },
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

      // City lookup for callout projection: label → [lon, lat].
      const cityByKey = new Map<string, [number, number]>();
      for (const p of config.points) {
        if (p.label) cityByKey.set(p.label, [p.lon, p.lat]);
      }

      m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

      m.once("idle", () => {
        setMapState({ map: m, beats, phases, solutions, cityByKey });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, phases, solutions, cityByKey } = mapState;

    const h = delayRender(`symbol-story-frame-${frame}`);

    const { camera, beatIndex, fillReveal } = cameraForFrame(
      frame,
      phases,
      solutions,
    );

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // Circles ESTABLISH during establish beat (radius 0→target via fillReveal),
    // then stay full for the rest of the tour. No dimming of non-highlighted symbols.
    if (map.getLayer("symbol-circles")) {
      map.setPaintProperty("symbol-circles", "circle-radius", [
        "*",
        ["get", "radius"],
        fillReveal,
      ]);
    }
    // Compute overlay state while we have access to map.project.
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

    // Labels fade in alongside the circles they name — every mark, not just callouts.
    // The city currently under the giant CountryLabel callout (below) has its small
    // persistent label suppressed in lockstep with the callout's own fade-in — the two
    // never collide — while every other symbol keeps its label at the normal fillReveal
    // opacity. Mirrors the ["case", ...] emphasis pattern used in SymbolScrolly.
    if (map.getLayer("symbol-labels")) {
      const highlightLabel = beat.callout?.region ?? "__none__";
      map.setPaintProperty("symbol-labels", "text-opacity", [
        "case",
        ["==", ["get", "label"], highlightLabel],
        fillReveal * (1 - calloutReveal),
        fillReveal,
      ] as never);
    }

    // Callout projection: highlighted city's lon/lat → screen coords.
    let calloutPt: { x: number; y: number } | null = null;
    if (beat.callout) {
      const lngLat = cityByKey.get(beat.callout.region);
      if (lngLat) {
        const pt = map.project(lngLat as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
      }
    }

    // Update beat index ref (no source data to swap for symbol maps — layers are static).
    lastBeatIndex.current = beatIndex;

    setOverlay({
      beatIndex,
      fillReveal,
      calloutPt,
      calloutReveal,
      calloutValue: beat.callout?.value ?? "",
      calloutColor: SYMBOL_FILL,
      captionReveal,
    });

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

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
      {/* MapFrame: shared furniture shell — title band (top) + source band (bottom). */}
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
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Callout overlay — projected to screen coords, uses CountryLabel for city name + value */}
      {overlay &&
        beat?.callout &&
        overlay.calloutPt &&
        overlay.calloutReveal > 0 && (
          <CountryLabel
            name={beat.callout.name}
            color={overlay.calloutColor}
            reveal={overlay.calloutReveal}
            x={overlay.calloutPt.x}
            y={overlay.calloutPt.y}
            value={overlay.calloutValue}
          />
        )}

      {/* Caption lower-third — for takeaway beats */}
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
