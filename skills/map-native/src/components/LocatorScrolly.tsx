// LocatorScrolly — scrolly-as-video locator / markers composition.
// Ports SymbolScrolly's step timeline (title → reveal x N), pinned ScrollyPanels, and per-step
// camera solutions driven by mapStoryToChapters; renders the glyph/mapStyle/legend/declutter
// treatment of LocatorStory (uniform dot, colour by category, mapStyle-adaptive, category legend).
// Two regimes come from deriveLocatorStory: a reveal per PLACE (few) or per CATEGORY (many).
// Harness pattern: delayRender → jumpTo → setData (step-ref change only) → setPaintProperty → idle → continueRender.

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
import { locatorGeometry } from "../locator-geo";
import { deriveLocatorStory } from "../locator-story";
import {
  placeLabels,
  labelRadialOffset,
  type LabelBox,
} from "../locator-labels";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import type { Beat } from "../map-story";
import type { LocatorConfigShape } from "../validate-config";
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

const DOT_RADIUS_PX = 6; // FIXED — uniform marker size, never value-scaled
const MARKER_STROKE = "#ffffff";
const GLYPH_LAYER = "locator-glyphs";
const LABEL_LAYER = "locator-labels";
const DIM_OPACITY = 0.25; // non-highlighted markers during a reveal beat

interface LocatorScrollyState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
}

export const LocatorScrolly: React.FC<{ config: LocatorConfigShape }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const geo = locatorGeometry({
    markers: config.markers,
    markerStyle: config.markerStyle,
  });
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const labelInk = dark ? "#f4f4f5" : "#1a1a1a";
  const labelHalo = dark ? "rgba(0,0,0,0.85)" : "#ffffff";
  const bg = dark ? "#0e0f12" : "#f4f4f4";

  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
    legendHeight: geo.hasCategories ? geo.legend.length * 20 + 16 : 0,
  });
  const labelTextSize = width <= 1080 ? 18 : 13;

  const [mapState, setMapState] = useState<LocatorScrollyState | null>(null);
  const [handle] = useState(() =>
    delayRender("locator-scrolly-init", { timeoutInMilliseconds: 120000 }),
  );

  // Ref to track the last rendered step-ref beat index so we avoid setData on every frame.
  const lastRefBeatIndex = useRef<number>(-1);

  // Init map once — same guard pattern as LocatorStory / SymbolScrolly.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
      type: "Feature",
      id: i,
      properties: {
        key: `m${i}`,
        label: mk.label,
        color: mk.color,
        category: mk.category ?? "",
        labelOffset: labelRadialOffset(DOT_RADIUS_PX, labelTextSize),
        __showLabel: true,
        __highlight: true, // establish: all markers full; recomputed per reveal step
      },
      geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
    }));

    const m = new maptilersdk.Map({
      container: ref.current,
      style: dark
        ? maptilersdk.MapStyle.DATAVIZ.DARK
        : maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ] as [number, number],
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
      m.addSource("locator", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      // Uniform dot glyph — FIXED radius, colour by category. Opacity per-feature via __highlight.
      m.addLayer({
        id: GLYPH_LAYER,
        type: "circle",
        source: "locator",
        paint: {
          "circle-radius": DOT_RADIUS_PX,
          "circle-color": ["get", "color"],
          "circle-stroke-color": MARKER_STROKE,
          "circle-stroke-width": 1.5,
          "circle-opacity": [
            "case",
            ["==", ["get", "__highlight"], true],
            0.95,
            DIM_OPACITY,
          ],
          "circle-stroke-opacity": [
            "case",
            ["==", ["get", "__highlight"], true],
            1,
            DIM_OPACITY,
          ],
        },
      });

      // Label layer — visibility per-feature via __showLabel (declutter), synced to the step.
      m.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        filter: ["==", ["get", "__showLabel"], true],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": labelTextSize,
          "text-variable-anchor": ["top", "bottom", "left", "right"],
          "text-radial-offset": ["get", "labelOffset"],
          "text-justify": "auto",
          "text-allow-overlap": true,
          "text-optional": false,
          "text-line-height": 1.3,
          "text-max-width": 9,
        },
        paint: {
          "text-color": labelInk,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.6,
          "text-opacity": [
            "case",
            ["==", ["get", "__highlight"], true],
            1,
            0.35,
          ],
        },
      });

      // Build beats and camera solutions.
      const meta = {
        title: config.title ?? "",
        description: config.description,
        insight:
          ((config as Record<string, unknown>).insight as string) ??
          config.title ??
          "",
      };
      const beats = deriveLocatorStory(config.markers, meta);

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

      // Build the scrolly story and step timeline (step 0 = title, rest = reveal).
      const story = mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source
          ? { name: config.source.name ?? "", url: config.source.url }
          : undefined,
        regionsWithData: config.markers.length,
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

    const h = delayRender(`locator-scrolly-frame-${frame}`);

    const total = scrollyFrames(story.steps.length, fps);

    // Drive the camera on the STEP timeline.
    const { camera, beatIndex } = cameraForFrame(frame, phases, stepSolutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // The step's ref is the beat index for highlight / declutter.
    const refBeatIndex = story.steps[beatIndex].ref as number;
    const refBeat = beats[refBeatIndex];

    // Rebuild source data only when the step's ref beat changes.
    if (refBeatIndex !== lastRefBeatIndex.current) {
      lastRefBeatIndex.current = refBeatIndex;
      const highlightSet = new Set(refBeat.highlight);
      const emphasise = refBeat.dim && highlightSet.size > 0;

      // Highlight flags: on dim (reveal) beats only the beat's markers glow; otherwise all.
      const rebuilt: GeoJSON.Feature[] = geo.markers.map((mk, i) => {
        const highlight = emphasise ? highlightSet.has(mk.label) : true;
        return {
          type: "Feature",
          id: i,
          properties: {
            key: `m${i}`,
            label: mk.label,
            color: mk.color,
            category: mk.category ?? "",
            labelOffset: labelRadialOffset(DOT_RADIUS_PX, labelTextSize),
            __highlight: highlight,
            __showLabel: false, // set by declutter below
          },
          geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
        };
      });

      // Declutter — prioritise highlighted markers on dim beats so their labels win.
      const boxes: LabelBox[] = geo.markers.map((mk, i) => {
        const pt = map.project([mk.lon, mk.lat]);
        const w = Math.max(1, mk.label.length) * (labelTextSize * 0.58);
        const hh = labelTextSize * 1.3;
        const basePriority = mk.priority ?? 0;
        const priority =
          emphasise && highlightSet.has(mk.label)
            ? basePriority + 1000
            : basePriority;
        return {
          key: `m${i}`,
          x: pt.x - w / 2,
          y: pt.y - DOT_RADIUS_PX - hh,
          w,
          h: hh,
          priority,
        };
      });
      const shownSet = new Set(placeLabels(boxes).shown);
      for (let i = 0; i < rebuilt.length; i++) {
        (rebuilt[i].properties as Record<string, unknown>).__showLabel =
          shownSet.has(`m${i}`);
      }
      (map.getSource("locator") as maptilersdk.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: rebuilt,
      });
    }

    // Sync the reveal's data emphasis to its panel slide-in. dataReveal ramps 0→1 across the
    // current step's panel move phase (clamp01 of stepSlide). Establish (OVERVIEW) and takeaway
    // steps carry no highlight, so all markers stay full there; on a reveal step the highlighted
    // markers' stroke grows in exactly as the panel slides in.
    const dataReveal = Math.max(
      0,
      Math.min(1, stepSlide(frame, phases, beatIndex, fps, total)),
    );
    const highlightSet = new Set(refBeat.highlight);
    const emphasise = refBeat.dim && highlightSet.size > 0;
    map.setPaintProperty(GLYPH_LAYER, "circle-stroke-width", [
      "case",
      ["==", ["get", "__highlight"], true],
      emphasise ? 1.5 + 3 * dataReveal : 1.5,
      1.5,
    ] as never);
    map.setPaintProperty(GLYPH_LAYER, "circle-stroke-color", [
      "case",
      ["==", ["get", "__highlight"], true],
      emphasise ? "#1a1a1a" : MARKER_STROKE,
      MARKER_STROKE,
    ] as never);

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category legend — mounted once map state is ready.
  useEffect(() => {
    const el = legendRef.current;
    if (!el) return;
    if (!geo.hasCategories) {
      el.innerHTML = "";
      return;
    }
    const ink = dark ? "#f4f4f5" : "#333";
    el.innerHTML = geo.legend
      .map(
        (e) =>
          `<div style="display:flex;align-items:center;gap:8px;line-height:1.4">` +
          `<span style="width:12px;height:12px;border-radius:50%;background:${e.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex:0 0 auto"></span>` +
          `<span style="font-size:12px;color:${ink}">${e.category}</span></div>`,
      )
      .join("");
  }, [dark, geo.hasCategories, geo.legend]);

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

      {/* Category legend — bottom-right, clear of MapFrame's bottom-left source */}
      {geo.hasCategories && (
        <div
          ref={legendRef}
          data-testid="map-legend"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 10,
            background: dark ? "rgba(24,24,27,0.85)" : "rgba(255,255,255,0.85)",
            padding: "8px 10px",
            borderRadius: 6,
            boxShadow: "0 1px 6px rgba(0,0,0,.12)",
            opacity: scene.furnitureOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Pinned ScrollyPanel per REVEAL step; overview + takeaway render no panel. */}
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
