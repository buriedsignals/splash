// SymbolReveal — Remotion video composition for the proportional symbol map, simple-reveal format.
// Fixed camera, data animates in: circle radii grow 0 → target over the clip duration via
// the shared easedRevealProgress helper. Mirrors SymbolStory exactly except:
//   1. progress comes from easedRevealProgress() (holds at both ends, eased cubic in-out)
//   2. camera fit goes through revealCameraPlan() (latitude-clamped bounds)
// Harness:
//   delayRender at mount → on load add source/layer + fitBounds → continueWhenMapSettles → continueRender
//   per-frame: delayRender → setPaintProperty → continueWhenMapSettles → continueRender → triggerRepaint

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
import type { SymbolConfig } from "../SymbolMap";
import { resolveMapStyle } from "../route-geo";
import { houseFill } from "../theme/house-ramp";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { labelWithUnit } from "../core/locale";
import { easedRevealProgress, revealCameraPlan } from "../reveal";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

// Single hue — the newsroom house hue (config.brandHue) wins when set, else the CVD-safe default
// (houseFill). Resolved per-render inside the component (config scope).
const SYMBOL_STROKE = "#ffffff";
// MAX_RADIUS_PX imported from ../symbol-geo — shared with the other symbol renderers and
// the produce-time conformance guard.
// Px clearance between a circle's edge and its label — matches labelRadialOffset's
// default `gap`, so the edge-clamp pixel offset equals the ems radial offset MapLibre renders.
const LABEL_GAP = 6;

export const SymbolReveal: React.FC<{ config: SymbolConfig }> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  // mapReady gates the per-frame effect so it only fires after init completes.
  const [mapReady, setMapReady] = useState(false);
  const [handle] = useState(() => delayRender("symbol-reveal-init"));

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
  });

  // Ratio-scaled label size: square/portrait are ≤1080 wide → larger text for legibility.
  const textSize = labelTextSize(width);

  // Eased reveal 0 → 1 with blank holds at both ends. Shifted to start after the title scene.
  const progress = easedRevealProgress(
    frame - TITLE_SCENE_FRAMES,
    durationInFrames - TITLE_SCENE_FRAMES,
  );

  // Scene: title card fades out, furniture fades in over the crossfade window.
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  // Fixed camera plan — latitude-clamped Mercator-safe bounds.
  const plan = revealCameraPlan(geo.bounds);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;
    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;
    const map = new maptilersdk.Map({
      container: containerRef.current,
      style,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive: false,
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.on("load", () => {
      const labels = symbolLabels(geo.symbols, config.lang);
      // Retained so the load `idle` can re-derive each label's in-viewport anchor and
      // setData once (fixed camera → compute-once, like SymbolMap). `anchor` starts at the
      // FT/NYT direct-label default (text to the RIGHT of the point, MapLibre "left").
      const symbolFeatures: GeoJSON.Feature[] = geo.symbols.map((s, i) => ({
        type: "Feature",
        properties: {
          radius: s.radius,
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
      map.addSource("symbols", {
        type: "geojson",
        data: { type: "FeatureCollection", features: symbolFeatures },
      });
      map.addLayer({
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
      // Direct label layer — fades in with the reveal via text-opacity driven by progress.
      map.addLayer({
        id: "symbol-labels",
        type: "symbol",
        source: "symbols",
        layout: {
          "text-field": ["get", "labelText"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": textSize,
          // Per-feature data-driven anchor (NOT variable-anchor, which is blind to the
          // canvas edge and clips an edge label — "Indonésie" → "Indonés"). Re-derived
          // once below from each symbol's projected position so no label runs off-frame.
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
      map.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });
      continueWhenMapSettles(map, () => {
        // INVARIANT: a symbol label never renders outside the map viewport. Fixed camera →
        // compute the in-viewport anchors ONCE here (mirrors SymbolMap) via the shared clamp,
        // then setData so the layer picks them up. The `changed` guard means a no-op pass
        // does not setData (and cannot loop the load `idle`).
        const finish = () => {
          setMapReady(true);
          continueRender(handle);
        };
        const el = containerRef.current;
        if (el && map.getLayer("symbol-labels")) {
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
            // Wait for the setData-driven repaint to settle BEFORE continuing the render,
            // else the still is captured mid-reload and the symbol layer paints blank
            // (mirrors LocatorReveal's nested-idle after its declutter setData).
            continueWhenMapSettles(map, finish);
            return;
          }
        }
        finish();
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per frame: grow radii + fade labels by progress. Only runs once mapReady is true.
  useEffect(() => {
    const map = mapRef.current;
    if (
      !mapReady ||
      !map ||
      !map.isStyleLoaded() ||
      !map.getLayer("symbol-circles")
    )
      return;
    const h = delayRender(`symbol-reveal-frame-${frame}`);
    map.setPaintProperty("symbol-circles", "circle-radius", [
      "*",
      ["get", "radius"],
      progress,
    ]);
    if (map.getLayer("symbol-labels")) {
      map.setPaintProperty("symbol-labels", "text-opacity", progress);
    }
    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapReady, frame, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AbsoluteFill style={{ backgroundColor: dark ? "#0e0f12" : "#f4f4f4" }}>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        geoCredit={config.geoCredit}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
        houseHue={config.brandHue ?? config.brandPalette?.[0]}
        lang={config.lang}
      >
        {/* Map fills the full composition frame */}
        <div
          ref={containerRef}
          style={{ width, height, position: "absolute" }}
        />
      </MapFrame>
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
