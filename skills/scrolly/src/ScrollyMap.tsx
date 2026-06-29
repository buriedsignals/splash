// ScrollyMap — choropleth map driven by a `currentStep` prop.
// Live-browser sibling of map-native's ChoroplethStory video component.
// Camera is driven by scroll (flyTo), not by Remotion frames.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import {
  computeChoropleth,
  type ChoroplethData,
} from "../../map-native/src/choropleth-geo";
import { deriveMapStory, type Beat } from "../../map-native/src/map-story";
import { NO_DATA_COLOR, WATER_COLOR } from "../../map-native/src/theme/colors";

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
// Types
// ---------------------------------------------------------------------------

export interface ScrollyMapConfig extends ChoroplethData {
  title?: string;
  unit?: string;
  valueUnit?: string;
  insight?: string;
  source?: { name: string; url: string };
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface MapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  sortedBins: { min: number; max: number; color: string }[];
  joined: { key: string; value: number | null }[];
  cameras: (CameraPoint | null)[];
}

// ---------------------------------------------------------------------------
// Enriched GeoJSON — adds __highlight, __value, __hasData per beat.
// ---------------------------------------------------------------------------
function enrichWorld(
  worldGeoJson: GeoJSON.FeatureCollection,
  joined: { key: string; value: number | null }[],
  beat: Beat,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: worldGeoJson.features.map((f, i) => {
      const key = String(f.properties?.["iso_a3"]);
      const j = joined[i];
      const isHighlight = beat.highlight.includes(key) ? 1 : 0;
      return {
        ...f,
        properties: {
          ...f.properties,
          __value: j.value,
          __hasData: j.value !== null,
          __highlight: isHighlight,
        },
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// ScrollyMap
// ---------------------------------------------------------------------------

export const ScrollyMap: React.FC<{
  config: ScrollyMapConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const popupRef = useRef<maptilersdk.Popup | null>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);

  // ---------------------------------------------------------------------------
  // Init map ONCE — ref guard prevents double-init in React Strict Mode.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [10, 20] as [number, number],
      zoom: 2,
      // Keep the event system alive so hover listeners fire, but disable all
      // navigation handlers so the reader cannot manually pan/zoom/rotate.
      interactive: true,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      dragRotate: false,
      boxZoom: false,
      keyboard: false,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
    } as Parameters<typeof maptilersdk.Map>[0]);

    // Expose for smoke test.
    (window as unknown as Record<string, unknown>)["__map__"] = map;

    map.on("load", () => {
      // Strip symbol layers (labels / place names).
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      // Recolour water to match the interactive map.
      for (const layer of map.getStyle()?.layers ?? []) {
        const sid = layer["source-layer"] as string | undefined;
        if (
          /water|ocean|sea/i.test(layer.id) ||
          (sid && /water|ocean|sea/i.test(sid))
        ) {
          try {
            if (layer.type === "fill") {
              map.setPaintProperty(layer.id, "fill-color", WATER_COLOR);
            } else if (layer.type === "background") {
              map.setPaintProperty(layer.id, "background-color", WATER_COLOR);
            }
          } catch {
            // Layer may not support the property — skip.
          }
        }
      }

      // Compute choropleth layout.
      const layout = computeChoropleth(config, world, "iso_a3", {
        bins: 5,
        scaleType: "sequential",
      });
      const sortedBins = [...layout.bins].sort((a, b) => a.min - b.min);

      // Build beats.
      const meta = {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
      };
      const beats = deriveMapStory(layout, world, "iso_a3", meta);

      // Precompute cameras — cameraForBounds + padding per beat.
      const cameras: (CameraPoint | null)[] = beats.map((b) => {
        const result = map.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          { padding: 48 },
        );
        if (!result) return null;
        return {
          center: [result.center.lng, result.center.lat] as [number, number],
          zoom: result.zoom,
        };
      });

      // Build fill-color expression (data-driven, static — never changes).
      const colorExpr: unknown[] = [
        "case",
        ["==", ["get", "__hasData"], false],
        NO_DATA_COLOR,
      ];
      for (let i = 0; i < sortedBins.length - 1; i++) {
        colorExpr.push(["<", ["get", "__value"], sortedBins[i].max]);
        colorExpr.push(sortedBins[i].color);
      }
      colorExpr.push(sortedBins[sortedBins.length - 1].color);

      // Add the choropleth source — enriched for beat 0.
      const initialWorld = enrichWorld(world, layout.joined, beats[0]);
      map.addSource("choropleth-world", {
        type: "geojson",
        data: initialWorld,
      });

      // Fill — full opacity (scrolly doesn't animate opacity like the video).
      map.addLayer({
        id: "choropleth-fill",
        type: "fill",
        source: "choropleth-world",
        paint: {
          "fill-color": colorExpr as never,
          "fill-opacity": 0.9,
        },
      });

      // White stroke.
      map.addLayer({
        id: "choropleth-stroke",
        type: "line",
        source: "choropleth-world",
        paint: {
          "line-color": "#ffffff",
          "line-width": 0.5,
          "line-opacity": 0.6,
        },
      });

      // Highlight stroke — data-driven width, no per-step setPaintProperty needed.
      map.addLayer({
        id: "choropleth-highlight-stroke",
        type: "line",
        source: "choropleth-world",
        paint: {
          "line-width": [
            "case",
            ["==", ["get", "__highlight"], 1],
            2.5,
            0,
          ] as never,
          "line-color": "#1a1a1a",
          "line-opacity": 0.9,
        },
      });

      // Hover popup — data-only (only __hasData regions).
      const popup = new maptilersdk.Popup({
        closeButton: false,
        closeOnClick: false,
      });
      popupRef.current = popup;

      map.on("mousemove", "choropleth-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (f.properties?.["__hasData"] !== true) {
          map.getCanvas().style.cursor = "";
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name = f.properties?.["name"] ?? f.properties?.["iso_a3"] ?? "—";
        const value = f.properties?.["__value"];
        const valueUnit = config.valueUnit ?? "";
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${name} — ${value}${valueUnit}</strong>`)
          .addTo(map);
      });

      map.on("mouseleave", "choropleth-fill", () => {
        map.getCanvas().style.cursor = "";
        popup.remove();
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

      setMapState({
        map,
        beats,
        sortedBins,
        joined: layout.joined,
        cameras,
      });
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      startedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // On currentStep change — update highlight, move camera, update callout.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, joined, cameras } = mapState;

    const step = Math.max(0, Math.min(currentStep, beats.length - 1));
    const beat = beats[step];

    // Expose current step for the smoke test.
    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = step;

    // Update __highlight on the source — only the highlighted region gets 1.
    const source = map.getSource("choropleth-world") as
      maptilersdk.GeoJSONSource | undefined;
    if (source) {
      source.setData(enrichWorld(world, joined, beat));
    }

    // Move camera.
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

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="img"
      aria-label={config.title ? `Map: ${config.title}` : "Choropleth map"}
    >
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
        .maplibregl-popup-content {
          font: 13px/1.4 sans-serif;
          padding: 8px 10px;
          border-radius: 4px;
        }
      `}</style>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
