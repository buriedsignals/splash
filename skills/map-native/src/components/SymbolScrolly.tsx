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
import { continueWhenMapSettles } from "../core/frame-ready";
import { symbolGeometry, MAX_RADIUS_PX } from "../symbol-geo";
import {
  symbolLabels,
  labelRadialOffset,
  assignSymbolLabelAnchors,
  type SymbolAnchorProps,
} from "../symbol-labels";
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
import { resolveMapStyle } from "../route-geo";
import { houseFill } from "../theme/house-ramp";
import { labelWithUnit } from "../core/locale";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

// Single hue — the newsroom house hue (config.brandHue) wins when set, else the CVD-safe default
// (houseFill). Resolved per-render inside the component (config scope).
const SYMBOL_STROKE = "#ffffff";
// MAX_RADIUS_PX imported from ../symbol-geo — shared with the other symbol renderers and
// the produce-time conformance guard.
// Px clearance between a circle's edge and its label — matches labelRadialOffset's
// default `gap`, so the edge-clamp pixel offset equals the ems radial offset MapLibre renders.
const LABEL_GAP = 6;

interface SymbolMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
  // Retained so the per-frame effect can re-derive each label's in-viewport anchor after
  // the camera jumpTo settles (the projection changes per step).
  symbolFeatures: GeoJSON.Feature[];
}

export const SymbolScrolly: React.FC<{ config: SymbolConfig }> = ({
  config,
}) => {
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
  const [handle] = useState(() => delayRender("symbol-scrolly-init"));

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
      const labels = symbolLabels(geo.symbols, config.lang);
      // `anchor` starts at the FT/NYT direct-label default (text to the RIGHT of the point,
      // MapLibre "left") and is re-derived per frame from each symbol's projected position.
      const symbolFeatures: GeoJSON.Feature[] = geo.symbols.map((s, i) => ({
        type: "Feature",
        properties: {
          radius: s.radius,
          label: s.label ?? "",
          labelText: labels[i]?.name
            ? `${labels[i].name}\n${labelWithUnit(labels[i].valueText, config.valueUnit, config.lang)}`
            : labelWithUnit(
                labels[i]?.valueText ?? "",
                config.valueUnit,
                config.lang,
              ),
          labelOffset: labelRadialOffset(s.radius, textSize),
          anchor: "left",
        },
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      }));
      m.addSource("symbols", {
        type: "geojson",
        data: { type: "FeatureCollection", features: symbolFeatures },
      });

      m.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": 0,
          "circle-color": houseFill(config.brandHue),
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
          // Per-feature data-driven anchor (NOT variable-anchor, which is blind to the
          // canvas edge). Re-derived per frame after each jumpTo so no label runs off-frame.
          "text-anchor": ["get", "anchor"],
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
        // The confirmed walk reaches the deriver — see map-arc.ts.
        arcBeats: config.arcBeats,
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

      continueWhenMapSettles(m, () => {
        setMapState({
          map: m,
          beats,
          story,
          phases,
          stepSolutions,
          symbolFeatures,
        });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, story, phases, stepSolutions, symbolFeatures } =
      mapState;

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

    // INVARIANT: a symbol label never renders outside the map viewport. The camera moves
    // per step, so re-derive each label's in-viewport anchor from its NEW projected position.
    // jumpTo settles the projection synchronously → project + clamp inline here (before the
    // frame's idle/continueRender) so the captured frame shows the flipped anchors. The shared
    // clamp's `changed` guard means setData only fires when a label actually crossed an edge.
    if (map.getLayer("symbol-labels")) {
      const el = ref.current;
      if (el) {
        const viewport = { width: el.clientWidth, height: el.clientHeight };
        const projected = symbolFeatures.map((f) =>
          map.project(
            (f.geometry as GeoJSON.Point).coordinates as [number, number],
          ),
        );
        const changed = assignSymbolLabelAnchors(
          symbolFeatures.map(
            (f) => f.properties as unknown as SymbolAnchorProps,
          ),
          projected,
          { viewport, textSize, gap: LABEL_GAP },
        );
        if (changed) {
          (map.getSource("symbols") as maptilersdk.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: symbolFeatures,
          });
        }
      }
    }

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
        dark ? "#f4f4f5" : "#1a1a1a",
        SYMBOL_STROKE,
      ] as never);
    }

    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delta 3: scrolly panels + title scene.
  const total = scrollyFrames(mapState?.story.steps.length ?? 2, fps);
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  return (
    <AbsoluteFill style={{ backgroundColor: dark ? "#0e0f12" : "#f4f4f4" }}>
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
        houseHue={config.brandHue ?? config.brandPalette?.[0]}
        lang={config.lang}
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
