// ScrollyMap — choropleth map driven by a `currentStep` prop.
// Live-browser sibling of map-native's ChoroplethStory video component.
// Camera is driven by scroll (flyTo), not by Remotion frames.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { flyToBeat } from "./scrolly-camera";
import {
  computeChoropleth,
  applyChoroplethJoin,
  type ChoroplethData,
} from "../../map-native/src/choropleth-geo";
import { deriveFurniture, bgIsDark } from "../../../lib/core/theme";
import {
  deriveMapStory,
  type Beat,
  type MapArcBeat,
} from "../../map-native/src/map-story";
import { regionPopupHtml } from "../../map-native/src/core/region-popup";
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
  /** The actual subset TopoJSON for this map, injected by produce. There is no bundled
   *  fallback geometry anymore (D5) — mirrors ChoroplethConfig's `geometry` field in
   *  map-native. */
  geometry?: Topology;
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface MapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  sortedBins: { min: number; max: number; color: string }[];
  // The join-key values feature-state was set for at load — the second effect (on currentStep
  // change) walks this list to resolve highlight membership in JS and write it to feature-state,
  // never back into the source features' own `properties` (D8's second point, see
  // applyChoroplethJoin's doc comment in choropleth-geo.ts).
  regionKeys: string[];
  cameras: (CameraPoint | null)[];
}

const JOIN_KEY = "iso_a3";

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

      // Geometry arrives through the injected config now (produce.mjs) — never a static
      // bundle import (D5, mirrors ChoroplethMap.tsx in map-native — same deferred-to-"load"
      // timing). Loud, named failure instead of a bare TypeError on `undefined.objects` —
      // with the `?raw` import removed there is no bundled fallback geometry anymore, so an
      // absent config.geometry must fail here, not as an unexplained downstream error. Decoded
      // inside `map.on("load")` (not at top-level render) so an SSR pass over a fixture
      // without `geometry` never trips this throw — in practice unreachable anyway when
      // rendered through Scrolly.tsx (its own story-track decode already guards this before
      // ScrollyMap ever mounts), but this keeps the component safe to render standalone too.
      if (!config.geometry)
        throw new Error(
          "scrolly choropleth: config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)",
        );
      const topology = config.geometry as Topology;
      const objectName = Object.keys(topology.objects)[0]!;
      const world = topoFeature(
        topology,
        topology.objects[objectName]!,
      ) as unknown as GeoJSON.FeatureCollection;

      // Compute choropleth layout.
      const layout = computeChoropleth(config, world, JOIN_KEY, {
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
      const beats = deriveMapStory(layout, world, JOIN_KEY, meta);

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

      // Add the choropleth source — geometry UNCHANGED (D5 + D8's second point: the join
      // stays a table applied via setFeatureState, never merged into the geometry's own
      // properties, so a licensed geometry's "Collective Database" boundary stays intact —
      // same reasoning as ChoroplethMap.tsx / applyChoroplethJoin's own doc comment).
      const { features: sourceFeatures, states } = applyChoroplethJoin(
        world,
        layout,
        JOIN_KEY,
      );
      const regionKeys = Object.keys(states);
      map.addSource("choropleth-world", {
        type: "geojson",
        data: sourceFeatures,
        promoteId: JOIN_KEY, // required for setFeatureState below — MapLibre needs a stable id
      });
      // hasData/value/label (+ the initial highlight membership for beat 0) applied via
      // feature-state — never written back into `properties`.
      const highlightSet0 = new Set(beats[0]?.highlight ?? []);
      for (const [key, state] of Object.entries(states)) {
        map.setFeatureState(
          { source: "choropleth-world", id: key },
          { ...state, highlighted: highlightSet0.has(key) },
        );
      }

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

      // Highlight stroke — data-driven width, no per-step setPaintProperty needed on the
      // LAYER itself (only the per-feature `highlighted` state changes, in the currentStep
      // effect below). Safe-read idiom (["boolean", <feature-state>, false]), not a bare
      // ["get", ...]/["feature-state", ...] read — mirrors choropleth-paint.ts's SAFE_HAS_DATA
      // (Finding 1, Task 16 review): a feature whose join-key property is falsy never gets a
      // feature-state entry promoted by MapLibre's own setFeatureState machinery, and a bare
      // read would misbehave instead of just defaulting to "not highlighted".
      map.addLayer({
        id: "choropleth-highlight-stroke",
        type: "line",
        source: "choropleth-world",
        paint: {
          "line-width": [
            "case",
            ["boolean", ["feature-state", "highlighted"], false],
            2.5,
            0,
          ] as never,
          "line-color": dark ? "#f4f4f5" : "#1a1a1a",
          "line-opacity": 0.9,
        },
      });

      // Hover popup — data-only (only hasData regions). The joined value/label live in
      // feature-state now (D8), never in `properties` — MapLibre's queryRenderedFeatures
      // result carries the live state on `f.state` (mirrors ChoroplethMap.tsx's mousemove
      // handler). `f.properties` still carries the geometry's OWN unmodified properties
      // (name/iso_a3), untouched by the join.
      const popup = new maptilersdk.Popup({
        closeButton: false,
        closeOnClick: false,
      });
      popupRef.current = popup;

      map.on("mousemove", "choropleth-fill", (e) => {
        const f = e.features?.[0];
        if (!f) return;
        if (f.state?.hasData !== true) {
          map.getCanvas().style.cursor = "";
          popup.remove();
          return;
        }
        map.getCanvas().style.cursor = "pointer";
        const name =
          f.state?.label ??
          f.properties?.["name"] ??
          f.properties?.["iso_a3"] ??
          "—";
        // The SAME string map-native's ChoroplethMap hovers — one function, so the two cannot
        // drift again (they had: this one still glued "157détenus / 100 000 hab." after the
        // other was fixed). See skills/map-native/src/core/region-popup.ts.
        popup
          .setLngLat(e.lngLat)
          .setHTML(
            regionPopupHtml(name, f.state?.value, config.valueUnit, config.lang),
          )
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
        regionKeys,
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
    const { map, beats, regionKeys, cameras } = mapState;

    const step = Math.max(0, Math.min(currentStep, beats.length - 1));
    const beat = beats[step];

    // Expose current step for the smoke test.
    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = step;

    // Highlight membership resolved in JS from the beat's region-key list, then written to
    // feature-state per key — never merged back into the source's own `properties` (D8's
    // second point; mirrors the join itself in applyChoroplethJoin). Cheaper than the old
    // approach too: no FeatureCollection rebuild + source.setData() every step, just a
    // feature-state write per region.
    const highlightSet = new Set(beat.highlight);
    for (const key of regionKeys) {
      map.setFeatureState(
        { source: "choropleth-world", id: key },
        { highlighted: highlightSet.has(key) },
      );
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
