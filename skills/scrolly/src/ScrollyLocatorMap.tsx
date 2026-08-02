// ScrollyLocatorMap — locator map driven by a `currentStep` prop.
// Scroll-driven sibling of ScrollyHexMap/ScrollyDotDensityMap; mirrors their camera/step skeleton:
// interactive:true + navigation disabled, init-once via startedRef, cameraForBounds precompute,
// jumpTo beat 0, flyTo/jumpTo on currentStep.
// Layer build + dim-emphasis mirrors LocatorScrolly: locator-glyphs (circle) + locator-labels (symbol),
// per-step highlight via setPaintProperty on the __highlight property expression.
// NO double text: the prose card is the only caption; no on-map callout duplicates it.
// Camera uses beat cameras from deriveLocatorStory (already zone-framed) — never over-zooms to a single marker.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { flyToBeat } from "./scrolly-camera";
import { locatorGeometry } from "../../map-native/src/locator-geo";
import type { LocatorMarker } from "../../map-native/src/locator-geo";
import { deriveLocatorStory } from "../../map-native/src/locator-story";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import type { Beat, MapArcBeat } from "../../map-native/src/map-story";

// ---------------------------------------------------------------------------
// Key guard — fail fast, never log the key.
// ---------------------------------------------------------------------------
if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// ---------------------------------------------------------------------------
// Layer IDs — kept stable so the smoke gate in Task 4 can target them.
// Mirror LocatorScrolly's exact layer ids.
// ---------------------------------------------------------------------------
const GLYPH_LAYER = "locator-glyphs";
const LABEL_LAYER = "locator-labels";
const DOT_RADIUS_PX = 6; // FIXED — uniform marker size, never value-scaled
const MARKER_STROKE = "#ffffff";
const DIM_OPACITY = 0.25; // non-highlighted markers during a reveal beat

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScrollyLocatorConfig {
  type: "locator";
  markers: LocatorMarker[];
  markerStyle?: string;
  mapStyle?: string;
  basemap?: string;
  title?: string;
  description?: string;
  insight?: string;
  source?: { name: string; url: string };
  /** deliverable language — localizes numbers + "Source". Default English. */
  lang?: string;
  // Newsroom house style (profile merge, skills/splash/src/brand-profile.ts). brandPalette
  // cycles the category marker colours (locatorGeometry consumes it — primary = brandPalette[0]);
  // brandHue is the single-hue fallback. Absent → today's Okabe-Ito path, unchanged.
  brandHue?: string;
  brandPalette?: string[];
  /** Journalist-confirmed claim-arc (S2), anchored on marker labels — validated by
   *  validateLocatorConfig and honoured by deriveLocatorStory. Absent ⇒ the salience walk. */
  arcBeats?: MapArcBeat[];
}

interface CameraPoint {
  center: [number, number];
  zoom: number;
}

interface LocatorMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  cameras: (CameraPoint | null)[];
}

// ---------------------------------------------------------------------------
// ScrollyLocatorMap
// ---------------------------------------------------------------------------

export const ScrollyLocatorMap: React.FC<{
  config: ScrollyLocatorConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);
  const [mapState, setMapState] = useState<LocatorMapState | null>(null);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const labelInk = dark ? "#f4f4f5" : "#1a1a1a";
  const labelHalo = dark ? "rgba(0,0,0,0.85)" : "#ffffff";

  // Precompute geometry and beats outside the effect (pure, stable).
  const geo = locatorGeometry({
    markers: config.markers,
    markerStyle: config.markerStyle,
    brandPalette: config.brandPalette,
  });
  const meta = {
    title: config.title ?? "",
    description: config.description,
    insight:
      ((config as unknown as Record<string, unknown>).insight as string) ??
      config.title ??
      "",
    // The confirmed claim-arc drives the camera flight, exactly as it drives the captions in
    // Scrolly.tsx. Both had to forward it: one without the other puts the right words over
    // the wrong region.
    arcBeats: config.arcBeats,
  };
  const beats = deriveLocatorStory(config.markers, meta);

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

    // Expose for the smoke harness.
    (window as unknown as Record<string, unknown>)["__map__"] = map;

    map.on("load", () => {
      // Build marker features — each tagged __highlight:true initially.
      // Opacity is driven by __highlight on per-step reveal via setPaintProperty.
      const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
        type: "Feature",
        id: i,
        properties: {
          key: `m${i}`,
          label: mk.label,
          color: mk.color,
          category: mk.category ?? "",
          __highlight: true,
        },
        geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
      }));

      map.addSource("locator", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      // Uniform dot glyph — FIXED radius, colour by category.
      // Opacity driven by __highlight expression; setPaintProperty overrides per step.
      map.addLayer({
        id: GLYPH_LAYER,
        type: "circle",
        source: "locator",
        paint: {
          "circle-radius": DOT_RADIUS_PX,
          "circle-color": ["get", "color"],
          "circle-stroke-color": MARKER_STROKE,
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.95,
          "circle-stroke-opacity": 1,
        },
      });

      // Label layer — all labels visible; text-opacity driven per-step via setPaintProperty.
      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": 12,
          "text-variable-anchor": ["top", "bottom", "left", "right"],
          "text-radial-offset": 1.0,
          "text-justify": "auto",
          "text-allow-overlap": false,
          "text-optional": true,
          "text-line-height": 1.3,
          "text-max-width": 9,
        },
        paint: {
          "text-color": labelInk,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.6,
          "text-opacity": 1,
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
  // On currentStep change — clamp step, apply dim-emphasis, flyTo/jumpTo.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, cameras } = mapState;

    const step = Math.max(0, Math.min(currentStep, beats.length - 1));

    // Expose current step for the smoke test.
    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = step;

    // Dim-emphasis: on a reveal beat with highlight → dim non-highlighted markers;
    // otherwise restore all to full opacity.
    const beat = beats[step];
    if (beat.dim && beat.highlight.length > 0) {
      const highlightSet = new Set(beat.highlight);
      // Rebuild source data to tag __highlight per feature so the case expression works.
      const source = map.getSource("locator") as maptilersdk.GeoJSONSource;
      const highlighted: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
        type: "Feature",
        id: i,
        properties: {
          key: `m${i}`,
          label: mk.label,
          color: mk.color,
          category: mk.category ?? "",
          __highlight: highlightSet.has(mk.label),
        },
        geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
      }));
      source.setData({ type: "FeatureCollection", features: highlighted });

      // Opacity via case expression on __highlight.
      const opacityExpr = [
        "case",
        ["==", ["get", "__highlight"], true],
        0.95,
        DIM_OPACITY,
      ];
      map.setPaintProperty(GLYPH_LAYER, "circle-opacity", opacityExpr as never);
      map.setPaintProperty(
        GLYPH_LAYER,
        "circle-stroke-opacity",
        opacityExpr as never,
      );
      const textOpacityExpr = [
        "case",
        ["==", ["get", "__highlight"], true],
        1,
        0.35,
      ];
      map.setPaintProperty(
        LABEL_LAYER,
        "text-opacity",
        textOpacityExpr as never,
      );
    } else {
      // Establish / title / takeaway — restore all markers to full.
      const source = map.getSource("locator") as maptilersdk.GeoJSONSource;
      const all: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
        type: "Feature",
        id: i,
        properties: {
          key: `m${i}`,
          label: mk.label,
          color: mk.color,
          category: mk.category ?? "",
          __highlight: true,
        },
        geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
      }));
      source.setData({ type: "FeatureCollection", features: all });
      map.setPaintProperty(GLYPH_LAYER, "circle-opacity", 0.95);
      map.setPaintProperty(GLYPH_LAYER, "circle-stroke-opacity", 1);
      map.setPaintProperty(LABEL_LAYER, "text-opacity", 1);
    }

    // Shared peak-bounded flight (stays tight between reveals).
    // Beats from deriveLocatorStory already frame the zone (never a single-marker over-zoom).
    const cam = cameras[step];
    if (cam) flyToBeat(map, cam);
  }, [currentStep, mapState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Category legend DOM update — shown only when categories are present.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = legendRef.current;
    if (!el) return;
    if (!geo.hasCategories) {
      el.innerHTML = "";
      return;
    }
    const ink = dark ? "#f4f4f5" : "#333";
    el.innerHTML = geo.legend
      .map(
        (e) =>
          `<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;line-height:1.4">` +
          `<span style="width:12px;height:12px;border-radius:50%;background:${e.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex:0 0 auto"></span>` +
          `<span style="font:11px/1.2 sans-serif;color:${ink}">${e.category}</span></div>`,
      )
      .join("");
  }, [dark, geo.hasCategories, geo.legend]);

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="img"
      aria-label={config.title ? `Map: ${config.title}` : "Locator map"}
    >
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
      `}</style>

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Category legend — bottom-right overlay; hidden when uncategorised */}
      {geo.hasCategories && (
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
      )}
    </div>
  );
};
