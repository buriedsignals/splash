// HexGridReveal — Remotion video composition for the hex-grid map, simple-reveal format.
// Fixed camera; cells FADE IN over the clip: fill-opacity ramps 0 → 0.8 via the shared
// easedRevealProgress helper. Cell colour is by sequential bin ONLY — NEVER colour/scale by size.
// Ports DotDensityReveal, with hex-grid deltas:
//   1. Cell GeoJSON built once on load like HexGridMap (Slice A): computeHexGrid(config) →
//      FeatureCollection of cell polygons carrying { __color, __count, __value }. No world.geojson.
//   2. Cell fill layer: fill-color ["get","__color"]; fill-opacity ramps 0→0.8 by reveal progress.
//      Thin cell outline for tessellation legibility.
//   3. mapStyle-adaptive via resolveMapStyle; fixed camera revealCameraPlan(layout.bounds);
//      sequential bin legend + aggregate label; title scene + MapFrame — like DotDensityReveal.
// Harness:
//   delayRender at mount → build cells + fitBounds → idle → continueRender
//   per-frame: delayRender → setPaintProperty (fill-opacity by progress) → map.once('idle') → continueRender

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
import { computeHexGrid } from "../hex-grid-geo";
import { resolveMapStyle } from "../route-geo";
import type { HexGridConfigShape } from "../validate-config";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { easedRevealProgress, revealCameraPlan } from "../reveal";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const CELL_LAYER = "hex-grid-cells";
const OUTLINE_LAYER = "hex-grid-outline";
const NUM_BINS = 5;

interface HGLegend {
  bins: { min: number; max: number; color: string }[];
  aggregateLabel: string;
}

export const HexGridReveal: React.FC<{ config: HexGridConfigShape }> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [legendState, setLegendState] = useState<HGLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("hex-grid-reveal-init", { timeoutInMilliseconds: 120000 }),
  );

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  // Cell outline: contrasts with fill for tessellation legibility.
  const outlineColor = dark ? "#1c1c1f" : "#ffffff";

  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: NUM_BINS * 18 + 18,
  });

  // Eased reveal 0 → 1 with blank holds at both ends. Shifted to start after the title scene.
  const progress = easedRevealProgress(
    frame - TITLE_SCENE_FRAMES,
    durationInFrames - TITLE_SCENE_FRAMES,
  );

  // fill-opacity ramps 0 → 0.8 (the Slice A max opacity).
  const fillOpacity = progress * 0.8;

  // Scene: title card fades out, furniture fades in.
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

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
      center: [10, 50] as [number, number],
      zoom: 3,
      interactive: false,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    } as Parameters<typeof maptilersdk.Map>[0]);
    mapRef.current = map;

    map.on("load", () => {
      // Strip symbol / place-label clutter so cells read cleanly.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      // Geometry IS the computed grid — no world.geojson. Deterministic + computed once.
      const layout = computeHexGrid(config);

      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell) => ({
        type: "Feature",
        properties: {
          __color: cell.color,
          __count: cell.count,
          __value: cell.value,
        },
        geometry: cell.feature.geometry,
      }));
      const cellGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: cellFeatures,
      };

      map.addSource("hex-grid-cell-src", {
        type: "geojson",
        data: cellGeoJson,
      });

      // Cell fill — coloured by bin; opacity starts at 0 (fades in via per-frame effect).
      map.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "hex-grid-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": fillOpacity,
        },
      });

      // Thin cell outline for tessellation legibility.
      map.addLayer({
        id: OUTLINE_LAYER,
        type: "line",
        source: "hex-grid-cell-src",
        paint: {
          "line-color": outlineColor,
          "line-width": 0.6,
          "line-opacity": 0.5,
        },
      });

      // Fixed camera plan — latitude-clamped Mercator-safe bounds.
      const plan = revealCameraPlan(
        layout.bounds as [number, number, number, number],
      );
      map.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });

      setLegendState({
        bins: layout.bins,
        aggregateLabel: layout.aggregateLabel,
      });

      map.once("idle", () => {
        setMapReady(true);
        continueRender(handle);
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per frame: ramp fill-opacity by progress. Only runs once mapReady.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.isStyleLoaded() || !map.getLayer(CELL_LAYER))
      return;
    const h = delayRender(`hex-grid-reveal-frame-${frame}`);
    map.setPaintProperty(CELL_LAYER, "fill-opacity", fillOpacity);
    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapReady, frame, fillOpacity]); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
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
        {/* Map fills the full composition frame */}
        <div
          ref={containerRef}
          style={{ width, height, position: "absolute" }}
        />
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
