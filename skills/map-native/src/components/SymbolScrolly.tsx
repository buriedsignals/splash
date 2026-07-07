// SymbolScrolly — scrolly-as-video proportional symbol composition.
// Ports SymbolStory's map init, circle/label layers, deriveSymbolStory, and per-beat camera
// solutions UNCHANGED; drives the camera per SCROLLY STEP via a step timeline built from
// mapStoryToChapters, and renders pinned ScrollyPanels + a title scene instead of the
// callout/caption overlays.

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
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
import { TitleCard } from "./StoryCards";
import { ScrollyPanel } from "./ScrollyPanel";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import {
  mapStoryToChapters,
  type ScrollyStory,
} from "../../../scrolly/src/chapters";
import { scrollyFrames } from "../route-story";
import { stepSlide } from "./ChoroplethScrolly";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const SYMBOL_FILL = "#2171b5";
const SYMBOL_STROKE = "#ffffff";
const MAX_RADIUS_PX = 40;

interface SymbolMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
}

export const SymbolScrolly: React.FC<{ config: SymbolConfig }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
  });

  // Ratio-scaled label size: square/portrait are ≤1080 wide → larger text for legibility.
  const textSize = labelTextSize(width);

  const [mapState, setMapState] = useState<SymbolMapState | null>(null);
  const [handle] = useState(() => delayRender("symbol-scrolly-init"));

  // Init map once.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

    const m = new maptilersdk.Map({
      container: ref.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
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
          "text-color": "#1a1a1a",
          "text-halo-color": "#ffffff",
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

      // Delta 1: build the scrolly story and step timeline.
      const story = mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: config.points.length,
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

    const h = delayRender(`symbol-scrolly-frame-${frame}`);

    const total = scrollyFrames(story.steps.length, fps);

    // Delta 2: drive the camera on the STEP timeline.
    const { camera, beatIndex, fillReveal } = cameraForFrame(
      frame,
      phases,
      stepSolutions,
    );

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // Circles ESTABLISH during establish beat (radius 0→target via fillReveal),
    // then stay full for the rest of the tour — so the OVERVIEW/TAKEAWAY steps show
    // ALL the symbols.
    if (map.getLayer("symbol-circles")) {
      map.setPaintProperty("symbol-circles", "circle-radius", [
        "*",
        ["get", "radius"],
        fillReveal,
      ]);

      // Labels fade in alongside the circles they name — every mark, not just callouts.
      if (map.getLayer("symbol-labels")) {
        map.setPaintProperty("symbol-labels", "text-opacity", fillReveal);
      }

      // Change #3 — sync the revealed symbol's emphasis to its panel slide-in.
      // dataReveal ramps 0→1 across the current step's panel move phase (clamp01 of
      // stepSlide). The establish (OVERVIEW) and takeaway steps carry no highlight
      // (highlight = []), so no symbol is emphasised there — all symbols are simply
      // visible. On a reveal step the highlighted symbol's stroke width grows in
      // exactly as its panel slides in.
      const dataReveal = Math.max(
        0,
        Math.min(1, stepSlide(frame, phases, beatIndex, fps, total)),
      );
      const refBeat = beats[story.steps[beatIndex].ref as number];
      const highlightLabel = refBeat.highlight[0] ?? "__none__";
      map.setPaintProperty("symbol-circles", "circle-stroke-width", [
        "case",
        ["==", ["get", "label"], highlightLabel],
        1.5 + 3 * dataReveal,
        1.5,
      ] as never);
      map.setPaintProperty("symbol-circles", "circle-stroke-color", [
        "case",
        ["==", ["get", "label"], highlightLabel],
        "#1a1a1a",
        SYMBOL_STROKE,
      ] as never);
    }

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delta 3: scrolly panels + title scene.
  const total = scrollyFrames(mapState?.story.steps.length ?? 2, fps);
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

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
