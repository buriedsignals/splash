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

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

// Minimal inline GeoJSON polygon — Switzerland rough bounding box
const SWITZERLAND_POLYGON = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [
      [
        [5.9, 45.8],
        [10.5, 45.8],
        [10.5, 47.8],
        [5.9, 47.8],
        [5.9, 45.8],
      ],
    ],
  },
};

export const HarnessCheck: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const [map, setMap] = useState<InstanceType<typeof maptilersdk.Map> | null>(
    null,
  );
  const [handle] = useState(() => delayRender("maptiler-harness-init"));

  // Init map once
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;
    const m = new maptilersdk.Map({
      container: ref.current,
      style: maptilersdk.MapStyle.DATAVIZ.DARK,
      center: [8.2, 46.8] as [number, number],
      zoom: 6,
      pitch: 0,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as any);

    m.on("load", () => {
      m.addSource("harness-poly", {
        type: "geojson",
        data: SWITZERLAND_POLYGON,
      });
      m.addLayer({
        id: "harness-fill",
        type: "fill",
        source: "harness-poly",
        paint: { "fill-color": "#4FC3F7", "fill-opacity": 0 },
      });
      m.jumpTo({ center: [8.2, 46.8], zoom: 6 });
      m.once("idle", () => {
        setMap(m);
        continueRender(handle);
      });
    });
  }, [handle]);

  // Per-frame update
  useEffect(() => {
    if (!map) return;
    const h = delayRender(`harness-frame-${frame}`);
    const progress = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    map.setPaintProperty("harness-fill", "fill-opacity", progress);
    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [map, frame, durationInFrames]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0e0f12" }}>
      <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-attrib,.maptiler-logo{display:none!important}`}</style>
      <div ref={ref} style={{ width, height, position: "absolute" }} />
    </AbsoluteFill>
  );
};
