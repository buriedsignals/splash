// LocatorStory — beat-driven guided camera tour for the locator / markers map.
// Ports SymbolStory, with locator deltas:
//   1. beats from deriveLocatorStory(config.markers, meta) — per-place (few) / per-category (many)
//   2. uniform dot glyph, colour by category, mapStyle-adaptive (never value-scaled, never size legend)
//   3. all markers visible; the "reveal" is the camera flying to each beat + highlighted markers
//      emphasised (dim the rest) + the caption showing the beat copy
//   4. category legend when the config has categories (reuse locatorGeometry.legend)
// Structure mirrors SymbolStory exactly:
//   delayRender → on load add source/layers + build beats + jumpTo beat 0 → idle → continueRender
//   per-frame: delayRender → jumpTo → setPaintProperty → caption overlay state → idle → continueRender

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
import { continueWhenMapSettles } from "../core/frame-ready";
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
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 6; // FIXED — uniform marker size, never value-scaled
const MARKER_STROKE = "#ffffff";
const GLYPH_LAYER = "locator-glyphs";
const LABEL_LAYER = "locator-labels";
const DIM_OPACITY = 0.25; // non-highlighted markers during a reveal beat

interface LocatorMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
}

export const LocatorStory: React.FC<{ config: LocatorConfigShape }> = ({
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
  const textSize = labelTextSize(width);

  const [mapState, setMapState] = useState<LocatorMapState | null>(null);
  const [handle] = useState(() =>
    delayRender("locator-story-init", { timeoutInMilliseconds: 120000 }),
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

    const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
      type: "Feature",
      id: i,
      properties: {
        key: `m${i}`,
        label: mk.label,
        color: mk.color,
        category: mk.category ?? "",
        labelOffset: labelRadialOffset(DOT_RADIUS_PX, textSize),
        __showLabel: true,
        __highlight: true, // establish: all markers full; recomputed per beat
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

      // Label layer — visibility per-feature via __showLabel (declutter), synced to the beat.
      m.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        filter: ["==", ["get", "__showLabel"], true],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": textSize,
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

      // Build beats and timeline.
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

      const kinds = beats.map((b) => b.kind);
      const { phases } = buildTimeline(kinds, fps);

      m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

      continueWhenMapSettles(m, () => {
        setMapState({ map: m, beats, phases, solutions });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, phases, solutions } = mapState;

    const h = delayRender(`locator-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // On beat change: recompute per-feature highlight + declutter, push source once.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      const highlightSet = new Set(beat.highlight);
      const emphasise = beat.dim && highlightSet.size > 0;

      // Highlight flags: on dim beats only the beat's markers glow; otherwise all.
      // Rebuild features from geo to stay authoritative (source of truth).
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
            labelOffset: labelRadialOffset(DOT_RADIUS_PX, textSize),
            __highlight: highlight,
            __showLabel: false, // set by declutter below
          },
          geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
        };
      });

      // Declutter — prioritise highlighted markers on dim beats so their labels win.
      const boxes: LabelBox[] = geo.markers.map((mk, i) => {
        const pt = map.project([mk.lon, mk.lat]);
        const w = Math.max(1, mk.label.length) * (textSize * 0.58);
        const hh = textSize * 1.3;
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

      {/* No on-map callout: the markers already carry their own decluttered labels (naming each
          place), so a projected name callout would duplicate them and can overflow the frame near
          the edges. The caption below carries the value-add — the marker's note / the category
          count — which the map does not otherwise show. */}

      {/* Caption lower-third — for reveal/takeaway beats with copy */}
      {overlay &&
        beat?.kind !== "title" &&
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
