// ScrollyMap — choropleth map driven by a `currentStep` prop.
// Live-browser sibling of map-native's ChoroplethStory video component.
// Camera is driven by scroll (flyTo), not by Remotion frames.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { flyToBeat } from "./scrolly-camera";
import {
  computeChoropleth,
  type ChoroplethData,
} from "../../map-native/src/choropleth-geo";
import { deriveFurniture, bgIsDark } from "../../../lib/core/theme";
import {
  deriveMapStory,
  type Beat,
  type MapArcBeat,
} from "../../map-native/src/map-story";
import { formatLocaleNumber } from "../../../lib/core/locale";
import { NO_DATA_COLOR } from "../../map-native/src/theme/colors";
import {
  choroplethFillColor,
  choroplethFillOpacity,
} from "../../map-native/src/choropleth-paint";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import { pointOnFeature } from "@turf/turf";

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
  // Optional discriminant: choropleth is the default map when no `type` is set. Declaring it
  // (optional) makes the Scrolly union discriminable so `config.type === "symbol"` etc. narrow.
  type?: "choropleth";
  title?: string;
  description?: string;
  unit?: string;
  valueUnit?: string;
  insight?: string;
  source?: { name: string; url: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  mapStyle?: string;
  /** newsroom house ground (#rrggbb) — the hover popup furniture derives from it (like the map
   *  static/interactive furniture), instead of a fixed dark preset. */
  themeBg?: string;
  // brandHue is already carried by ChoroplethData (drives computeChoropleth's derived house
  // ramp) — brandPalette is added here so the profile merge can set both without a type error.
  brandPalette?: string[];
  scaleType?: "sequential" | "diverging";
  palette?: string | string[];
  /** the topic hint (e.g. "electricity access") — drives the subject-fit ramp choice. */
  subject?: string;
  /** data column holding the region NAME in the deliverable language. When set, beat
   * narration uses the DATA name ("Éthiopie") instead of the basemap's English name. */
  labelField?: string;
  // Narrative pattern hint (② sets it): "temporal" → tell the sequence, never
  // "highest/lowest"; "magnitude" → keep the ranking; "categorical" → fallback.
  valueKind?: "temporal" | "magnitude" | "categorical";
  /** Journalist-confirmed claim-arc (S2), region-anchored on the join key — validated by
   *  validateChoroplethConfig and honoured by deriveMapStory. Absent ⇒ the salience walk. */
  arcBeats?: MapArcBeat[];
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

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";

  // Hover-popup furniture DERIVED from the newsroom house ground (config.themeBg) rather than a fixed
  // dark preset: on a themed dark ground the popup panel is that ground lifted toward white (a raised,
  // harmonised surface) with the ground's derived ink. Falls back to the fixed dark preset only for an
  // un-themed dark basemap (dark mapStyle, no house theme). Light default → no override (default popup).
  const popup = (() => {
    if (!bgIsDark(config.themeBg)) {
      // no house ground → keep the legacy behaviour: fixed dark panel on a dark basemap, else none.
      return dark
        ? { bg: "rgba(28,28,31,0.95)", ink: "#f4f4f5", strong: "#ffffff" }
        : null;
    }
    const f = deriveFurniture(config.themeBg);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(f.bg.slice(i, i + 2), 16));
    const lift = (v: number) => Math.round(v + (255 - v) * 0.1);
    return {
      bg: `rgba(${lift(r)},${lift(g)},${lift(b)},0.95)`,
      ink: f.ink,
      strong: "#ffffff",
    };
  })();

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
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);

    // Expose for smoke test.
    (window as unknown as Record<string, unknown>)["__map__"] = map;

    map.on("load", () => {
      // Strip symbol layers (labels / place names).
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      // Water is left as the plain DATAVIZ basemap default (light or dark, per
      // `dark` above) — no tint. Non-data areas (ocean + no-data land) must stay
      // the default basemap, identical to map-native's ChoroplethMap. Do NOT
      // recolour water.

      // Compute choropleth layout.
      const layout = computeChoropleth(config, world, "iso_a3", {
        bins: 5,
        scaleType: config.scaleType ?? "sequential",
        palette: config.palette,
        labelField: config.labelField,
      });
      const sortedBins = [...layout.bins].sort((a, b) => a.min - b.min);

      // Build beats.
      const meta = {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
        valueField: config.valueField,
        narrativePattern: config.valueKind,
        lang: config.lang,
        // The confirmed claim-arc. The CAMERA track needs it as much as the caption track
        // does: these beats are what each scroll step flies to, so a dropped plan here shows
        // the reader a different region than the caption above it names.
        arcBeats: config.arcBeats,
      };
      const beats = deriveMapStory(layout, world, "iso_a3", meta);

      // Precompute cameras — cameraForBounds + padding per beat.
      const cameras: (CameraPoint | null)[] = beats.map((b) => {
        const result = map.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          { padding: 48 },
        );
        if (!result || !result.center) return null;
        const c = maptilersdk.LngLat.convert(result.center);
        return {
          center: [c.lng, c.lat] as [number, number],
          zoom: result.zoom ?? 2,
        };
      });

      // Add the choropleth source — enriched for beat 0.
      const initialWorld = enrichWorld(world, layout.joined, beats[0]);
      map.addSource("choropleth-world", {
        type: "geojson",
        data: initialWorld,
      });

      // Fill — shared no-data-aware paint (see choropleth-paint.ts). No-data
      // regions get opacity 0 so the default basemap shows through (identical to
      // the ocean); only data-bearing regions are painted by the scale. Scrolly
      // does not animate opacity, so data regions rest at 0.9.
      map.addLayer({
        id: "choropleth-fill",
        type: "fill",
        source: "choropleth-world",
        paint: {
          "fill-color": choroplethFillColor(layout.bins) as never,
          "fill-opacity": choroplethFillOpacity(0.9) as never,
        },
      });

      // No-data / ocean probe — consumed by the smoke harness to assert that
      // no-data land and the sea are NEVER painted a scale/no-data colour (they
      // must match the default basemap). Deterministic: derived from the same
      // layout the layer uses. Each centroid is a turf pointOnFeature — a point
      // GUARANTEED to sit on the country's landmass (never offshore), so the
      // harness samples real no-data LAND, not adjacent water. Filtered to the
      // data bounds so the point is on-screen at beat 0.
      {
        const [minX, minY, maxX, maxY] = layout.bounds;
        const withinBounds = (lng: number, lat: number) =>
          lng >= minX && lng <= maxX && lat >= minY && lat <= maxY;
        const noDataCentroids: [number, number][] = [];
        world.features.forEach((f, i) => {
          if (layout.joined[i].value !== null) return; // has data — skip
          try {
            const p = pointOnFeature(f as never);
            const [lng, lat] = p.geometry.coordinates as [number, number];
            if (withinBounds(lng, lat)) noDataCentroids.push([lng, lat]);
          } catch {
            // Degenerate geometry — skip this feature.
          }
        });
        (window as unknown as Record<string, unknown>)["__choropleth_probe__"] =
          {
            binColors: layout.bins.map((b) => b.color),
            noDataColor: NO_DATA_COLOR,
            // The deliberate tint that MUST NOT appear on the ocean. The sea has
            // to stay the plain DATAVIZ.LIGHT basemap default (same as no-data
            // land and map-native's ChoroplethMap). The smoke gate asserts the
            // ocean pixel is NOT this tint AND matches the no-data-land pixel
            // (both are the untouched basemap).
            forbiddenWaterTint: "#aac9e0",
            noDataCentroids,
          };
      }

      // Stroke — flips to a dark-basemap-safe tone (mirrors ChoroplethMap/ChoroplethScrolly).
      map.addLayer({
        id: "choropleth-stroke",
        type: "line",
        source: "choropleth-world",
        paint: {
          "line-color": dark ? "#1c1c1f" : "#ffffff",
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
          "line-color": dark ? "#f4f4f5" : "#1a1a1a",
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
        const shownValue =
          typeof value === "number"
            ? formatLocaleNumber(value, config.lang)
            : value;
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<strong>${name} — ${shownValue}${valueUnit}</strong>`)
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

    // Move camera — shared peak-bounded flight (stays tight between reveals).
    const cam = cameras[step];
    if (cam) flyToBeat(map, cam);
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
        ${
          popup
            ? `.maplibregl-popup-content { background: ${popup.bg} !important; color: ${popup.ink} !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.14) !important; }
        .maplibregl-popup-content strong { color: ${popup.strong} !important; }
        .maplibregl-popup-tip { border-top-color: ${popup.bg} !important; border-bottom-color: ${popup.bg} !important; }`
            : ""
        }
      `}</style>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
};
