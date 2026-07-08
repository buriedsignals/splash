// ScrollyDotDensityMap — dot-density map driven by a `currentStep` prop.
// Scroll-driven sibling of ScrollyHexMap; mirrors its camera/step skeleton exactly:
// interactive:true + navigation disabled, init-once via startedRef, cameraForBounds
// precompute, jumpTo beat 0, flyTo/jumpTo on currentStep.
// Layer build + dim-emphasis mirrors DotDensityScrolly: region outline + dot circle layer,
// dots tagged __region, per-step case expression for reveal dim/focus.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import {
  computeDotDensity,
  type DotDensityData,
} from "../../map-native/src/dot-density-geo";
import { scatterInPolygon } from "../../map-native/src/dot-scatter";
import { deriveDotDensityStory } from "../../map-native/src/dot-density-story";
import { formatLocaleNumber } from "../../map-native/src/core/locale";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import type { Beat } from "../../map-native/src/map-story";

// ---------------------------------------------------------------------------
// Key guard — fail fast, never log the key.
// ---------------------------------------------------------------------------
if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// ---------------------------------------------------------------------------
// World GeoJSON — same asset as map-native, imported via ?raw.
// ---------------------------------------------------------------------------
import worldRaw from "../../map-native/assets/geo/world.geojson?raw";
const world = JSON.parse(worldRaw) as GeoJSON.FeatureCollection;

// ---------------------------------------------------------------------------
// Layer IDs — kept stable so the smoke gate in Task 4 can target them.
// ---------------------------------------------------------------------------
const DOT_LAYER = "dot-density-dots";
const OUTLINE_LAYER = "dot-density-outline";
const JOIN_KEY = "iso_a3";
const DOT_RADIUS_PX = 2; // FIXED — uniform dot size, NEVER value-scaled
const DIM_OPACITY = 0.25; // non-highlighted regions during a reveal step

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrollyDotDensityConfig extends DotDensityData {
  type: "dot-density";
  mapStyle?: string;
  basemap?: string;
  title?: string;
  description?: string;
  insight?: string;
  source?: { name: string; url: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface DotDensityMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  cameras: (CameraPoint | null)[];
}

interface DDLegend {
  hasCategories: boolean;
  dotValue: number;
  legend: { category: string; color: string }[];
}

// ---------------------------------------------------------------------------
// ScrollyDotDensityMap
// ---------------------------------------------------------------------------

export const ScrollyDotDensityMap: React.FC<{
  config: ScrollyDotDensityConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [mapState, setMapState] = useState<DotDensityMapState | null>(null);
  const [legendState, setLegendState] = useState<DDLegend | null>(null);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const outlineColor = dark ? "#5a5a63" : "#9aa0a6";

  // Precompute geometry and beats outside the effect (pure, stable).
  const layout = computeDotDensity(config, world, JOIN_KEY);
  const meta = {
    title: config.title ?? "",
    description: config.description,
    insight:
      ((config as unknown as Record<string, unknown>).insight as string) ??
      config.title ??
      "",
    unit:
      ((config as unknown as Record<string, unknown>).valueUnit as string) ??
      "",
  };
  const beats = deriveDotDensityStory(layout, meta);

  // ---------------------------------------------------------------------------
  // Init map ONCE — ref guard prevents double-init in React Strict Mode.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const style =
      resolveMapStyle(config.mapStyle) === "dataviz-dark"
        ? maptilersdk.MapStyle.DATAVIZ.DARK
        : maptilersdk.MapStyle.DATAVIZ.LIGHT;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style,
      center: [
        (layout.bounds[0] + layout.bounds[2]) / 2,
        (layout.bounds[1] + layout.bounds[3]) / 2,
      ] as [number, number],
      zoom: 3,
      // Keep event system alive for any future hover, but disable ALL navigation
      // so the reader cannot manually pan/zoom/rotate — scroll drives the camera.
      interactive: true,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      dragRotate: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);

    // Expose for the smoke harness.
    (window as unknown as Record<string, unknown>)["__map__"] = map;

    map.on("load", () => {
      // Strip symbol / place-label clutter so dots read cleanly.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      // Build the DOT GeoJSON once — one Point per dot, coloured by group, TAGGED with
      // __region = the region key so a reveal step can dim non-highlighted regions.
      const dotFeatures: GeoJSON.Feature[] = [];
      for (const region of layout.regions) {
        for (const group of region.groups) {
          const pts = scatterInPolygon(region.feature, group.count, group.seed);
          for (const [lon, lat] of pts) {
            dotFeatures.push({
              type: "Feature",
              properties: { color: group.color, __region: region.key },
              geometry: { type: "Point", coordinates: [lon, lat] },
            });
          }
        }
      }

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

      // Region outline for polygon legibility.
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

      // Dot layer — FIXED radius, colour by group. Opacity starts full (establish step).
      map.addLayer({
        id: DOT_LAYER,
        type: "circle",
        source: "dot-density-dot-src",
        paint: {
          "circle-radius": DOT_RADIUS_PX,
          "circle-color": ["get", "color"],
          "circle-opacity": 1,
          "circle-stroke-width": 0.3,
          "circle-stroke-color": dark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)",
          "circle-stroke-opacity": 1,
        },
      });

      // Precompute cameras — cameraForBounds + padding per beat.
      const cameras: (CameraPoint | null)[] = beats.map((b) => {
        const result = map.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          { padding: 64 },
        );
        if (!result || !result.center) return null;
        const c = maptilersdk.LngLat.convert(result.center);
        return {
          center: [c.lng, c.lat] as [number, number],
          zoom: result.zoom ?? 2,
        };
      });

      // Jump to beat 0 camera initially.
      const cam0 = cameras[0];
      if (cam0) {
        map.jumpTo({ center: cam0.center, zoom: cam0.zoom });
      } else {
        map.fitBounds(layout.bounds as maptilersdk.LngLatBoundsLike, {
          padding: 48,
          duration: 0,
        });
      }

      setLegendState({
        hasCategories: layout.hasCategories,
        dotValue: layout.dotValue,
        legend: layout.legend,
      });
      setMapState({ map, beats, cameras });
    });

    return () => {
      map.remove();
      startedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // On currentStep change — clamp step, apply dim-emphasis, flyTo/jumpTo.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, cameras } = mapState;

    const step = Math.max(0, Math.min(currentStep, beats.length - 1));

    // Expose current step for the smoke test.
    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = step;

    // Dim-emphasis: reveal beat with highlight → case expression on __region; otherwise all full.
    const beat = beats[step];
    if (beat.dim && beat.highlight.length > 0) {
      const highlightKey = beat.highlight[0];
      const opacityExpr = [
        "case",
        ["==", ["get", "__region"], highlightKey],
        1,
        DIM_OPACITY,
      ];
      map.setPaintProperty(DOT_LAYER, "circle-opacity", opacityExpr as never);
      map.setPaintProperty(
        DOT_LAYER,
        "circle-stroke-opacity",
        opacityExpr as never,
      );
    } else {
      map.setPaintProperty(DOT_LAYER, "circle-opacity", 1);
      map.setPaintProperty(DOT_LAYER, "circle-stroke-opacity", 1);
    }

    // Camera flight — reduced-motion → jumpTo, else flyTo.
    const cam = cameras[step];
    if (cam) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        map.jumpTo({ center: cam.center, zoom: cam.zoom });
      } else {
        map.flyTo({
          center: cam.center,
          zoom: cam.zoom,
          duration: 1200,
          essential: true,
        });
      }
    }
  }, [currentStep, mapState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Legend DOM update — "1 dot = N" always; category swatches when multivariate.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const dotN = formatLocaleNumber(legendState.dotValue, config.lang);
    const header = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${legendState.hasCategories ? 8 : 0}px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dark ? "#e8e8ec" : "#2171b5"};flex-shrink:0"></span>
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
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="img"
      aria-label={config.title ? `Map: ${config.title}` : "Dot-density map"}
    >
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
      `}</style>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Legend — bottom-right overlay */}
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
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
