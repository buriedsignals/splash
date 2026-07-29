// ScrollySymbolMap — proportional symbol map driven by a `currentStep` prop.
// Scroll-driven sibling of ScrollyMap (choropleth); mirrors its camera pattern exactly:
// interactive:false + no nav handlers, init-once via startedRef, cameraForBounds
// precompute, jumpTo beat 0, flyTo on currentStep.
// Layer config mirrors SymbolMap: single-hue circles + variable-anchor labels.
// Circles render at FULL size (no progress reveal — the scroll reveal is the camera flight).

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { flyToBeat } from "./scrolly-camera";
import { symbolGeometry } from "../../map-native/src/symbol-geo";
import {
  symbolLabels,
  labelRadialOffset,
} from "../../map-native/src/symbol-labels";
import { deriveSymbolStory } from "../../map-native/src/symbol-story";
import type { Beat, MapArcBeat } from "../../map-native/src/map-story";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import { houseFill } from "../../../lib/core/house-ramp";

// ---------------------------------------------------------------------------
// Key guard — fail fast, never log the key.
// ---------------------------------------------------------------------------
if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// ---------------------------------------------------------------------------
// Constants — mirror SymbolMap exactly. The single-hue fill default is NOT re-declared here;
// it lives once in lib/core/house-ramp.ts (DEFAULT_MAP_FILL) and is resolved via houseFill so
// the hex can't drift across the symbol renderers.
// ---------------------------------------------------------------------------
const LABEL_TEXT_SIZE = 13;
const SYMBOL_STROKE = "#ffffff";
const MAX_RADIUS_PX = 40;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrollySymbolConfig {
  type: "symbol";
  points: { lon: number; lat: number; value: number; label?: string }[];
  basemap?: string;
  mapStyle?: string;
  title?: string;
  description?: string;
  insight?: string;
  unit?: string;
  valueUnit?: string;
  source?: { name: string; url: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  // Newsroom house hue (set by the profile merge, skills/splash/src/brand-profile.ts). Used
  // as the circle fill when present — an explicit colour on the spec always wins (none exists
  // yet for this single-hue symbol map, so brandHue is the only override path today).
  brandHue?: string;
  brandPalette?: string[];
  /** Journalist-confirmed claim-arc (S2), anchored on the point LABELS — validated by
   *  validateSymbolConfig and honoured by deriveSymbolStory. Absent ⇒ the salience walk. */
  arcBeats?: MapArcBeat[];
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface SymbolMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  cameras: (CameraPoint | null)[];
}

// ---------------------------------------------------------------------------
// ScrollySymbolMap
// ---------------------------------------------------------------------------

export const ScrollySymbolMap: React.FC<{
  config: ScrollySymbolConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [mapState, setMapState] = useState<SymbolMapState | null>(null);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  // House hue wins over the neutral default fill (houseFill = brandHue ?? DEFAULT_MAP_FILL, the
  // one place the default hex lives). An explicit colour on the spec would win over the house
  // value, but none is modelled on this config yet, so brandHue is the only override path today.
  const fillColor = houseFill(config.brandHue);

  // Precompute geometry and labels outside the effect (pure, stable).
  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);
  const labels = symbolLabels(geo.symbols, config.lang);
  const beats = deriveSymbolStory(config.points, {
    title: config.title ?? "",
    insight: config.insight ?? config.title,
    unit: config.valueUnit ?? "",
    lang: config.lang,
    // The confirmed claim-arc drives the camera flight, exactly as it drives the captions in
    // Scrolly.tsx. Both had to forward it: one without the other puts the right words over
    // the wrong region.
    arcBeats: config.arcBeats,
  });

  // ---------------------------------------------------------------------------
  // Init map ONCE — ref guard prevents double-init in React Strict Mode.
  // ---------------------------------------------------------------------------
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

    // Expose for the snap harness.
    (window as unknown as Record<string, unknown>)["__map__"] = map;

    map.on("load", () => {
      // Build the symbols GeoJSON source.
      map.addSource("symbols", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geo.symbols.map((s, i) => ({
            type: "Feature" as const,
            properties: {
              radius: s.radius,
              labelText: labels[i]?.name
                ? `${labels[i].name}\n${labels[i].valueText}`
                : (labels[i]?.valueText ?? ""),
              labelOffset: labelRadialOffset(s.radius, LABEL_TEXT_SIZE),
            },
            geometry: { type: "Point" as const, coordinates: [s.lon, s.lat] },
          })),
        },
      });

      // Circle layer — full size (NO progress multiply; the scroll reveal is the flyTo).
      map.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": ["get", "radius"] as never,
          "circle-color": fillColor,
          "circle-opacity": 0.75,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });

      // Label layer — variable-anchor + radial-offset (exact SymbolMap config).
      map.addLayer({
        id: "symbol-labels",
        type: "symbol",
        source: "symbols",
        layout: {
          "text-field": ["get", "labelText"] as never,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": LABEL_TEXT_SIZE,
          "text-variable-anchor": ["left", "right", "top", "bottom"] as never,
          "text-radial-offset": ["get", "labelOffset"] as never,
          "text-justify": "auto" as never,
          "text-allow-overlap": false as never,
          "text-optional": true as never,
          "text-line-height": 1.3 as never,
          "text-max-width": 8 as never,
        },
        paint: {
          "text-color": dark ? "#f4f4f5" : "#1a1a1a",
          "text-halo-color": dark ? "rgba(0,0,0,0.85)" : "#ffffff",
          "text-halo-width": 1.6,
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
        map.fitBounds(geo.bounds as maptilersdk.LngLatBoundsLike, {
          padding: 48,
          duration: 0,
        });
      }

      setMapState({ map, beats, cameras });
    });

    return () => {
      map.remove();
      startedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // On currentStep change — clamp step and flyTo the precomputed camera.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, cameras } = mapState;

    const step = Math.max(0, Math.min(currentStep, beats.length - 1));

    // Expose current step for the smoke test.
    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = step;

    // Shared peak-bounded flight (stays tight on the city between reveals).
    const cam = cameras[step];
    if (cam) flyToBeat(map, cam);
  }, [currentStep, mapState]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="img"
      aria-label={
        config.title ? `Map: ${config.title}` : "Proportional symbol map"
      }
    >
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
      `}</style>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
