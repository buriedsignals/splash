// ScrollyMap — choropleth map driven by a `currentStep` prop.
// Live-browser sibling of map-native's ChoroplethStory video component.
// Camera is driven by scroll (flyTo), not by Remotion frames.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { centroid } from "@turf/turf";
import {
  computeChoropleth,
  mainlandFeature,
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
  centroidByKey: Map<string, [number, number]>;
  joined: { key: string; value: number | null }[];
  cameras: (CameraPoint | null)[];
}

// ---------------------------------------------------------------------------
// Inline CountryLabel — scrolly variant (no remotion dependency).
// Replicates the visual design of map-native's CountryLabel using plain CSS
// transitions instead of remotion's interpolate/Easing.
// ---------------------------------------------------------------------------
const CountryLabel: React.FC<{
  name: string;
  color: string;
  reveal: number; // 0 hidden, 1 visible
  x: number;
  y: number;
  value?: string;
}> = ({ name, color, reveal, x, y, value }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      transform: `translate(-50%, -50%) translateY(${(1 - reveal) * 16}px)`,
      pointerEvents: "none",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      opacity: reveal,
      transition: "opacity 0.4s ease-out, transform 0.4s ease-out",
    }}
  >
    <div
      style={{
        width: 64,
        height: 3,
        borderRadius: 2,
        background: color,
        transform: `scaleX(${reveal})`,
        boxShadow: `0 0 10px ${color}`,
        transition: "transform 0.4s ease-out",
      }}
    />
    <div
      style={{
        fontFamily: "sans-serif",
        fontWeight: 600,
        fontSize: 22,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: "#F5F2ED",
        textShadow: "0 2px 18px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7)",
        marginTop: 10,
        paddingLeft: "0.18em",
        whiteSpace: "nowrap",
      }}
    >
      {name}
    </div>
    {value && (
      <div
        style={{
          fontFamily: "sans-serif",
          fontWeight: 700,
          fontSize: 26,
          color: "#F5F2ED",
          textShadow: "0 2px 18px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.7)",
          marginTop: 4,
          letterSpacing: "0.02em",
        }}
      >
        {value}
      </div>
    )}
  </div>
);

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
  // Projected callout position (updated on map "move" events during flyTo).
  const [calloutPt, setCalloutPt] = useState<{ x: number; y: number } | null>(
    null,
  );

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
      interactive: false, // scroll drives the camera — no manual pan/zoom
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

      // Precompute mainland centroids for callout projection.
      const centroidByKey = new Map<string, [number, number]>();
      for (const f of world.features) {
        const key = String(f.properties?.["iso_a3"]);
        try {
          const c = centroid(mainlandFeature(f));
          centroidByKey.set(key, [
            c.geometry.coordinates[0],
            c.geometry.coordinates[1],
          ]);
        } catch {
          // Skip features where centroid fails (e.g., null geometry).
        }
      }

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
        centroidByKey,
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
    const { map, beats, joined, cameras, centroidByKey } = mapState;

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

    // Project the callout for this beat and track it during flyTo.
    const updateCallout = () => {
      if (!beat.callout || beat.kind === "title") {
        setCalloutPt(null);
        return;
      }
      const lngLat = centroidByKey.get(beat.callout.region);
      if (!lngLat) {
        setCalloutPt(null);
        return;
      }
      const pt = map.project(lngLat as [number, number]);
      setCalloutPt({ x: pt.x, y: pt.y });
    };

    // Update once immediately, then track during camera animation.
    updateCallout();
    map.on("move", updateCallout);

    // Cleanup — remove the listener on next step change.
    return () => {
      map.off("move", updateCallout);
    };
  }, [currentStep, mapState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Resolve the active beat for overlay rendering.
  // ---------------------------------------------------------------------------
  const beat = mapState
    ? mapState.beats[
        Math.max(0, Math.min(currentStep, mapState.beats.length - 1))
      ]
    : null;

  // Resolve callout color from the highlighted bin.
  const calloutColor = (() => {
    if (!mapState || !beat?.highlight.length) return "#ffffff";
    const { joined, sortedBins } = mapState;
    const hKey = beat.highlight[0];
    const hJoined = joined.find((j) => j.key === hKey);
    if (hJoined?.value === null || hJoined?.value === undefined)
      return "#ffffff";
    const binIdx = sortedBins.findIndex(
      (b, bi) =>
        (hJoined.value as number) < b.max || bi === sortedBins.length - 1,
    );
    return binIdx >= 0 ? sortedBins[binIdx].color : "#ffffff";
  })();

  const showCallout =
    beat?.kind !== "title" && beat?.callout != null && calloutPt != null;

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

      {/* Callout overlay — projected to screen coordinates, tracks during flyTo */}
      {showCallout && beat?.callout && calloutPt && (
        <CountryLabel
          name={beat.callout.name}
          color={calloutColor}
          reveal={1}
          x={calloutPt.x}
          y={calloutPt.y}
          value={beat.callout.value}
        />
      )}
    </div>
  );
};
