// ScrollyCartogramMap — cartogram map driven by a `currentStep` prop.
// Scroll-driven sibling of ScrollyHexMap; mirrors its camera/step skeleton exactly:
// interactive:true + navigation disabled, init-once via startedRef, cameraForBounds
// precompute, jumpTo beat 0, flyTo/jumpTo on currentStep.
// Cell-build mirrors CartogramMap: computeCartogram → FeatureCollection {__color,__id,__value};
// fill layer id "cartogram-cells" + outline. applyCartogramBasemap called on load (grid → neutral,
// scaled → basemap). Per-step __id dim-emphasis via setPaintProperty. Bin legend overlay.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { flyToBeat } from "./scrolly-camera";
import { fmtBin } from "../../../lib/core/legend-format";
import { computeCartogram } from "../../map-native/src/cartogram-geo";
import { deriveCartogramStory } from "../../map-native/src/cartogram-story";
import { applyCartogramBasemap } from "../../map-native/src/theme/cartogram-basemap";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import type { Beat, MapArcBeat } from "../../map-native/src/map-story";
import { storyCopy } from "../../../lib/core/story-copy";

// ---------------------------------------------------------------------------
// Key guard — fail fast, never log the key.
// ---------------------------------------------------------------------------
if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// ---------------------------------------------------------------------------
// Layer IDs
// ---------------------------------------------------------------------------
const CELL_LAYER = "cartogram-cells";
const OUTLINE_LAYER = "cartogram-outline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrollyCartogramConfig {
  type: "cartogram";
  variant?: "scaled" | "grid";
  values: { id: string; value: number }[];
  joinKey?: string;
  scaleType?: "sequential" | "diverging";
  bins?: number;
  valueLabel?: string;
  mapStyle?: string;
  title?: string;
  description?: string;
  insight?: string;
  source?: { name: string; url: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  /** The actual subset TopoJSON for this map, injected by produce. There is no bundled
   *  fallback geometry anymore (D5) — mirrors ChoroplethConfig's `geometry` field in
   *  map-native. */
  geometry?: Topology;
  /** Journalist-confirmed claim-arc (S2), anchored on the cell `id` — validated by
   *  validateCartogramConfig and honoured by deriveCartogramStory. Absent ⇒ the salience walk. */
  arcBeats?: MapArcBeat[];
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface CartogramMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  cameras: (CameraPoint | null)[];
}

interface LegendBin {
  min: number;
  max: number;
  color: string;
}

// ---------------------------------------------------------------------------
// ScrollyCartogramMap
// ---------------------------------------------------------------------------

export const ScrollyCartogramMap: React.FC<{
  config: ScrollyCartogramConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [mapState, setMapState] = useState<CartogramMapState | null>(null);
  const [legendBins, setLegendBins] = useState<LegendBin[] | null>(null);
  const [valueLabel, setValueLabel] = useState<string>("");
  const [isGrid, setIsGrid] = useState(false);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const outlineColor = dark ? "#1c1c1f" : "#ffffff";

  // ---------------------------------------------------------------------------
  // Init map ONCE — ref guard prevents double-init in React Strict Mode.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    // Geometry arrives through the injected config now (produce.mjs) — never a static bundle
    // import (D5, mirrors CartogramMap.tsx in map-native). Loud, named failure instead of a
    // bare TypeError on `undefined.objects` — with the `?raw` import removed there is no
    // bundled fallback geometry anymore, so an absent config.geometry must fail here, not as an
    // unexplained downstream error. Decoded inside this mount effect (not at top-level render)
    // so an SSR pass over a fixture without `geometry` never trips this throw — mirrors the
    // client-only mount timing every map-native component uses.
    if (!config.geometry)
      throw new Error(
        "scrolly cartogram: config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)",
      );
    const topology = config.geometry as Topology;
    const objectName = Object.keys(topology.objects)[0]!;
    const worldGeoJson = topoFeature(
      topology,
      topology.objects[objectName]!,
    ) as unknown as GeoJSON.FeatureCollection;

    const layout = computeCartogram(config, worldGeoJson);
    const beats = deriveCartogramStory(layout, {
      title: config.title ?? "",
      insight: config.insight ?? config.title ?? "",
      lang: config.lang,
      // The confirmed claim-arc drives the camera flight, exactly as it drives the captions in
      // Scrolly.tsx. Both had to forward it: one without the other puts the right words over
      // the wrong region.
      arcBeats: config.arcBeats,
    });

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
      // Apply cartogram basemap treatment: grid → neutral canvas, scaled → keep basemap.
      applyCartogramBasemap(map, dark, layout.variant);

      // Build the cell GeoJSON once. Each feature tagged with display props
      // so per-step reveal dim-emphasis can target individual cells by __id.
      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell) => ({
        type: "Feature",
        properties: {
          __color: cell.color,
          __id: cell.id,
          __value: cell.value,
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

      // Cell fill — coloured by bin via __color. Static fill-opacity 0.85 here;
      // per-step emphasis overrides it via setPaintProperty in the second effect.
      map.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "cartogram-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": 0.85,
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

      setLegendBins(layout.bins);
      setValueLabel(layout.valueLabel);
      setIsGrid(layout.variant === "grid");
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

    // Dim-emphasis: reveal beat with highlight → case expression; otherwise all full.
    const beat = beats[step];
    if (beat.dim && beat.highlight.length > 0) {
      const highlightId = beat.highlight[0];
      const opacityExpr = [
        "case",
        ["==", ["get", "__id"], highlightId],
        0.9,
        0.2,
      ];
      map.setPaintProperty(CELL_LAYER, "fill-opacity", opacityExpr as never);
    } else {
      map.setPaintProperty(CELL_LAYER, "fill-opacity", 0.85);
    }

    // Shared peak-bounded flight (stays tight between reveals).
    const cam = cameras[step];
    if (cam) flyToBeat(map, cam);
  }, [currentStep, mapState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Legend DOM update — sequential bin scale (swatch + min–max) + value label.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendBins) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${valueLabel}
      </div>`;
    const swatches = legendBins
      .map(
        (b) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${fmtBin(b.min, { lang: config.lang })}–${fmtBin(b.max, { lang: config.lang })}</span>
        </div>`,
      )
      .join("");
    const uniformNote = isGrid
      ? `<div style="font:10px/1.3 sans-serif;color:${sub};margin-top:6px;font-style:italic">${storyCopy(config.lang).gridCartogramNote}</div>`
      : "";
    el.innerHTML = header + swatches + uniformNote;
  }, [dark, legendBins, valueLabel, isGrid]);

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="img"
      aria-label={
        config.title ? storyCopy(config.lang).mapAria(config.title) : "Cartogram map"
      }
    >
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
      `}</style>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Sequential bin legend — bottom-right overlay */}
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
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
