// SymbolStory — Remotion video composition for the proportional symbol map.
// Single-shot eased reveal: circle radii grow 0 → target over the clip duration.
// Harness mirrors ChoroplethStory exactly:
//   delayRender at mount → on load add source/layer + fitBounds → map.once('idle', continueRender)
//   per-frame: delayRender → setPaintProperty → map.once('idle', continueRender) → triggerRepaint

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { symbolGeometry } from "../symbol-geo";
import type { SymbolConfig } from "../SymbolMap";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const SYMBOL_FILL = "#2171b5";
const SYMBOL_STROKE = "#ffffff";
const MAX_RADIUS_PX = 40;

export const SymbolStory: React.FC<{ config: SymbolConfig }> = ({ config }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const [handle] = useState(() => delayRender("symbol-init"));

  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

  // Eased reveal 0 → 1 across the clip.
  const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;
    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive: false,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;
    map.on("load", () => {
      map.addSource("symbols", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geo.symbols.map((s) => ({
            type: "Feature",
            properties: { radius: s.radius },
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          })),
        },
      });
      map.addLayer({
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
      map.fitBounds(geo.bounds, { padding: 64, duration: 0 });
      map.once("idle", () => {
        continueRender(handle);
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per frame: grow radii by progress.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("symbol-circles")) return;
    const h = delayRender(`symbol-frame-${frame}`);
    map.setPaintProperty("symbol-circles", "circle-radius", [
      "*",
      ["get", "radius"],
      progress,
    ]);
    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [frame, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
      {/* Map fills the full composition frame — mirrors ChoroplethStory */}
      <div ref={containerRef} style={{ width, height, position: "absolute" }} />

      {/* Title overlay */}
      <div
        style={{
          position: "absolute",
          top: 40,
          left: 48,
          maxWidth: "70%",
          fontSize: 30,
          fontWeight: 700,
          color: "#1A1A1A",
          textShadow: "0 1px 6px rgba(255,255,255,0.9)",
        }}
      >
        {config.title}
      </div>
    </AbsoluteFill>
  );
};
