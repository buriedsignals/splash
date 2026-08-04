// CartogramReveal — Remotion video composition for the cartogram map, simple-reveal format.
// Fixed camera; cells FADE IN over the clip: fill-opacity ramps 0 → 0.85 via the shared
// easedRevealProgress helper. Cell colour is by sequential/diverging bin.
// Ports HexGridReveal, with cartogram deltas:
//   1. computeCartogram(config, worldGeoJson) ONCE on load; build cell FeatureCollection tagged
//      { __color, __id, __value }. Fill layer id `cartogram-cells`.
//   2. Call applyCartogramBasemap(map, dark, layout.variant) on load — grid gets neutral bg,
//      scaled keeps basemap. The video MUST honour this rule.
//   3. Fixed camera revealCameraPlan(layout.bounds); sequential/diverging bin legend + valueLabel;
//      title scene + MapFrame — like HexGridReveal.
// Harness:
//   delayRender at mount → decode config.geometry → build cells + fitBounds → idle → continueRender
//   per-frame: delayRender → setPaintProperty (fill-opacity by progress) → continueWhenMapSettles → continueRender
//
// Geometry arrives through config.geometry (injected by produce, never a bundled world.geojson
// fetch — Task 8, D5). The join key prefers config.geography.joinKey over the world default, via
// the shared resolveVideoGeometry (core/video-geometry.ts, Task 7) — the same helper the
// choropleth video family uses, so all four families read injected geometry identically.

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
import { computeCartogram } from "../cartogram-geo";
import { applyCartogramBasemap } from "../theme/cartogram-basemap";
import { resolveMapStyle } from "../route-geo";
import type { CartogramConfigShape } from "../validate-config";
import { resolveVideoGeometry } from "../core/video-geometry";
import { resolveMapFrame } from "../core/map-format";
import { fmtBin } from "../core/legend-format";
import { MapFrame } from "../core/MapFrame";
import {
  easedRevealProgress,
  revealCameraPlan,
  walkFillOpacity,
} from "../reveal";
import type { MapArcBeat } from "../map-arc";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const CELL_LAYER = "cartogram-cells";
const OUTLINE_LAYER = "cartogram-outline";
const NUM_BINS = 5;

interface CGLegend {
  bins: { min: number; max: number; color: string }[];
  valueLabel: string;
}

export const CartogramReveal: React.FC<{ config: CartogramConfigShape }> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [legendState, setLegendState] = useState<CGLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("cartogram-reveal-init", { timeoutInMilliseconds: 120000 }),
  );

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  // Cell outline: contrasts with fill for legibility.
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

  // fill-opacity ramps 0 → 0.85 (the CartogramMap max opacity).
  // One ramp when nobody wrote a walk (byte-identical to before); the journalist's own order
  // when they did — sub-project ④(b), same shared helper the choropleth reveal paints.
  const fillOpacity = walkFillOpacity(progress, config.arcBeats?.length ?? 0);

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
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);
    mapRef.current = map;

    map.on("load", () => {
      // Geometry arrives through the injected config now (produce.mjs) — never a static
      // bundle fetch. Shared with the choropleth video family (Task 7).
      // No try/catch here: resolveVideoGeometry throws when config.geometry is
      // missing, and that throw is meant to escape — swallowing it produced a blank
      // map in a video that still exited 0. Left uncaught, it fails this render hard
      // via delayRender's own timeout, matching ChoroplethMap.tsx's uncaught-throw
      // behaviour on the interactive path.
      const { world: worldGeoJson, joinKey } = resolveVideoGeometry(
        config,
        "cartogram-reveal",
      );

      // Compute cartogram layout once. joinKey is threaded onto the data object —
      // computeCartogram reads it off `data.joinKey` (never a positional arg), so this
      // is spread rather than passed separately (mirrors its own existing contract,
      // cartogram-geo.ts:62).
      const layout = computeCartogram({ ...config, joinKey }, worldGeoJson);

      // Apply basemap treatment BEFORE adding cells.
      // grid variant: neutral flat canvas (hides all basemap layers).
      // scaled variant: keep basemap, strip symbol clutter.
      applyCartogramBasemap(map, dark, layout.variant);

      // Build FeatureCollection from cells — each carries display props.
      // THE WALK, as a lookup — built once rather than searched per cell (sub-project ④(b)).
      const walkIndexById = new Map<string, number>(
        (config.arcBeats ?? []).map((b, i) => [String(b.region), i]),
      );
      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell) => ({
        type: "Feature",
        properties: {
          __color: cell.color,
          __id: cell.id,
          __value: cell.value,
          // WHERE this cell sits in the journalist's walk, or -1 when unnamed — sub-project
          // ④(b). A cartogram's arcBeat anchors on the region key, which IS `cell.id`.
          __walkIdx: walkIndexById.get(String(cell.id)) ?? -1,
        },
        geometry: cell.feature.geometry,
      }));
      const cellGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: cellFeatures,
      };

      map.addSource("cartogram-cell-src", {
        type: "geojson",
        data: cellGeoJson,
      });

      // Cell fill — coloured by bin; opacity starts at 0 (fades in via per-frame effect).
      map.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "cartogram-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": fillOpacity as never,
        },
      });

      // Thin outline for legibility.
      map.addLayer({
        id: OUTLINE_LAYER,
        type: "line",
        source: "cartogram-cell-src",
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
        valueLabel: layout.valueLabel,
      });

      continueWhenMapSettles(map, () => {
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
    const h = delayRender(`cartogram-reveal-frame-${frame}`);
    map.setPaintProperty(CELL_LAYER, "fill-opacity", fillOpacity as never);
    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapReady, frame, fillOpacity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — sequential/diverging bin scale (swatch + min–max) + valueLabel.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${legendState.valueLabel}
      </div>`;
    const swatches = legendState.bins
      .map(
        (b) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${fmtBin(b.min, { lang: config.lang })}–${fmtBin(b.max, { lang: config.lang })}</span>
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
        source={{ name: config.source?.name ?? "", url: config.source?.url }}
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
