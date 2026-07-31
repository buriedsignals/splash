// DotDensityReveal — Remotion video composition for the dot-density map, simple-reveal format.
// Fixed camera; the dots FADE IN over the clip: circle-opacity ramps 0 → 1 via the shared
// easedRevealProgress helper. The dot glyph is UNIFORM — circle-radius: 2 fixed, NEVER value-scaled;
// density is encoded by dot COUNT (one Point per dot), exactly as the Slice A DotDensityMap builds it.
// Ports LocatorReveal, with dot-density deltas:
//   1. dot GeoJSON built once on load like DotDensityMap: computeDotDensity → scatterInPolygon per
//      region+group → one Point per dot with { color } (deterministic; scatter is seeded).
//   2. dot layer: circle-radius 2 (fixed), circle-color ["get","color"], opacity ramped by `progress`.
//   3. mapStyle-adaptive via resolveMapStyle; faint region outline; legend "1 dot = N" + category
//      swatches; fixed camera via revealCameraPlan(layout.bounds); title scene + MapFrame furniture.
// Harness:
//   delayRender at mount → decode config.geometry → build dots + region outline + fitBounds → idle → continueRender
//   per-frame: delayRender → setPaintProperty (opacity ramped by progress) → continueWhenMapSettles → continueRender
//
// Geometry arrives through config.geometry (injected by produce, never a bundled world.geojson
// fetch — Task 8, D5). The join key prefers config.geography.joinKey over the world default, via
// resolveDotDensityGeometry (DotDensityStory.tsx) — mirrors ChoroplethMap.tsx's own decode/
// join-key resolution (src/ChoroplethMap.tsx:258-284), the proven shape this file copies rather
// than inventing a second way to do the same thing.

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
import { computeDotDensity, UNIVARIATE_ACCENT } from "../dot-density-geo";
import { scatterInPolygon } from "../dot-scatter";
import { resolveMapStyle } from "../route-geo";
import type { DotDensityConfigShape } from "../validate-config";
import { resolveDotDensityGeometry } from "./DotDensityStory";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { formatLocaleNumber } from "../core/locale";
import { easedRevealProgress, revealCameraPlan } from "../reveal";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 2; // FIXED — uniform dot size, NEVER value-scaled
const DOT_LAYER = "dot-density-dots";
const OUTLINE_LAYER = "dot-density-outline";

interface DDLegend {
  hasCategories: boolean;
  dotValue: number;
  legend: { category: string; color: string }[];
}

export const DotDensityReveal: React.FC<{ config: DotDensityConfigShape }> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [legendState, setLegendState] = useState<DDLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("dot-density-reveal-init", { timeoutInMilliseconds: 120000 }),
  );

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  const outlineColor = dark ? "#5a5a63" : "#9aa0a6";

  const legendRows =
    1 + (config.categories?.length ? config.categories.length : 0);
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: legendRows * 18 + 18,
  });

  // Eased reveal 0 → 1 with blank holds at both ends. Shifted to start after the title scene.
  const progress = easedRevealProgress(
    frame - TITLE_SCENE_FRAMES,
    durationInFrames - TITLE_SCENE_FRAMES,
  );

  // Scene: title card fades out, furniture fades in over the crossfade window.
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
      center: [10, 30] as [number, number],
      zoom: 2,
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
      // Strip symbol / place-label clutter so dots read cleanly.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      try {
        // Geometry arrives through the injected config now (produce.mjs) — never a static
        // bundle fetch. See resolveDotDensityGeometry (DotDensityStory.tsx).
        const { world, joinKey } = resolveDotDensityGeometry(config);
        const layout = computeDotDensity(config, world, joinKey);

        // Build the DOT GeoJSON once: one Point feature per dot, coloured by group.
        // Deterministic — scatterInPolygon is seeded, so this is frame-stable.
        const dotFeatures: GeoJSON.Feature[] = [];
        for (const region of layout.regions) {
          for (const group of region.groups) {
            const pts = scatterInPolygon(
              region.feature,
              group.count,
              group.seed,
            );
            for (const [lon, lat] of pts) {
              dotFeatures.push({
                type: "Feature",
                properties: { color: group.color },
                geometry: { type: "Point", coordinates: [lon, lat] },
              });
            }
          }
        }

        // Faint region outline for context.
        const regionGeoJson: GeoJSON.FeatureCollection = {
          type: "FeatureCollection",
          features: layout.regions.map((r) => r.feature),
        };

        map.addSource("dot-density-region-src", {
          type: "geojson",
          data: regionGeoJson,
        });
        map.addSource("dot-density-dot-src", {
          type: "geojson",
          data: { type: "FeatureCollection", features: dotFeatures },
        });

        map.addLayer({
          id: OUTLINE_LAYER,
          type: "line",
          source: "dot-density-region-src",
          paint: {
            "line-color": outlineColor,
            "line-width": 0.6,
            "line-opacity": 0.5,
          },
        });

        // Dot layer — FIXED radius; opacity ramps 0 → 1 by the reveal `progress`.
        map.addLayer({
          id: DOT_LAYER,
          type: "circle",
          source: "dot-density-dot-src",
          paint: {
            "circle-radius": DOT_RADIUS_PX,
            "circle-color": ["get", "color"],
            "circle-opacity": progress,
            "circle-stroke-width": 0.3,
            "circle-stroke-color": dark
              ? "rgba(0,0,0,0.4)"
              : "rgba(0,0,0,0.15)",
            "circle-stroke-opacity": progress,
          },
        });

        // Fixed camera plan — latitude-clamped Mercator-safe bounds.
        const plan = revealCameraPlan(
          layout.bounds as [number, number, number, number],
        );
        map.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });

        setLegendState({
          hasCategories: layout.hasCategories,
          dotValue: layout.dotValue,
          legend: layout.legend,
        });

        continueWhenMapSettles(map, () => {
          setMapReady(true);
          continueRender(handle);
        });
      } catch (err) {
        console.error("DotDensityReveal: failed to resolve geometry", err);
        continueRender(handle);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per frame: fade dots in by progress. Only runs once mapReady.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.isStyleLoaded() || !map.getLayer(DOT_LAYER))
      return;
    const h = delayRender(`dot-density-reveal-frame-${frame}`);
    map.setPaintProperty(DOT_LAYER, "circle-opacity", progress);
    map.setPaintProperty(DOT_LAYER, "circle-stroke-opacity", progress);
    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapReady, frame, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — "1 dot = N" always; category swatches when multivariate. Mounted after build.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const dotN = formatLocaleNumber(legendState.dotValue, config.lang);
    const header = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${legendState.hasCategories ? 8 : 0}px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${config.brandHue ?? (dark ? "#e8e8ec" : UNIVARIATE_ACCENT.light)};flex-shrink:0"></span>
        <span style="font:600 11px/1.2 sans-serif;color:${ink}">1 dot = ${dotN}</span>
      </div>`;
    const swatches = legendState.hasCategories
      ? legendState.legend
          .map(
            (l) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${l.category}</span>
        </div>`,
          )
          .join("")
      : "";
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
          minWidth: 110,
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
