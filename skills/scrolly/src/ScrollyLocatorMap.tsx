// ScrollyLocatorMap — locator map driven by a `currentStep` prop.
// Scroll-driven sibling of ScrollyHexMap/ScrollyDotDensityMap; mirrors their camera/step skeleton:
// interactive:true + navigation disabled, init-once via startedRef, cameraForBounds precompute,
// jumpTo beat 0, flyTo/jumpTo on currentStep.
// Layer build + dim-emphasis mirrors LocatorScrolly: locator-glyphs (circle) + locator-labels (symbol),
// per-step highlight via the __highlight per-feature property the layers' paint reads.
// NO double text: the prose card is the only caption; no on-map callout duplicates it.
// Camera uses beat cameras from deriveLocatorStory (already zone-framed) — never over-zooms to a single marker.
//
// ★ A MARKER THE MAP PLOTS IS A MARKER THE MAP NAMES. This was the FIFTH locator renderer, the
// one a reader actually scrolls, and the only one still asking MapLibre for
// `text-variable-anchor` + `text-allow-overlap: false` + `text-optional: true` — which culls
// silently on collision and is blind to the frame edge. Measured on a delivered page: six
// glaciers, six dots, five names. It now runs the family's shared placement
// (map-native/locator-label-placement) through this package's own sync policy
// (locator-label-sync.ts), which explains the two clocks.

import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { flyToBeat } from "./scrolly-camera";
import { locatorGeometry } from "../../map-native/src/locator-geo";
import type { LocatorMarker } from "../../map-native/src/locator-geo";
import { deriveLocatorStory } from "../../map-native/src/locator-story";
import { resolveMapStyle } from "../../map-native/src/route-geo";
import type { Beat, MapArcBeat } from "../../map-native/src/map-story";
import {
  syncLocatorLabels,
  type LocatorLabelSyncState,
} from "./locator-label-sync";

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
const DIM_TEXT_OPACITY = 0.35; // non-highlighted labels during a reveal beat
// The label layer's `text-size`. Named because the placement measures its collision boxes at
// this size — a constant duplicated between the layer and the placement would let a box be
// computed for text of one size and drawn at another.
const LABEL_TEXT_SIZE = 12;

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
  /** Recompute the label placement against the camera as it stands right now. */
  applyPlacement: () => void;
}

/** What the current step wants of the placement — read by the `move` handler, which outlives
 *  any one render and therefore cannot close over the step. */
interface BeatLabelState {
  /**
   * The step whose declutter verdict is in force. Promoted from `step` on `moveend`, NOT at
   * the step boundary: the verdict is "which names fit this frame", and at the boundary the
   * frame is still the one the reader is leaving. Judging there would leave the verdict one
   * camera behind for the whole story.
   */
  verdictKey: number;
  /** The step the reader has scrolled to. Drives the dim immediately; the verdict on landing. */
  step: number;
  emphasise: boolean;
  highlight: Set<string>;
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
  // The placement carried from one camera tick to the next: WHERE each label sits (recomputed
  // on every move) and WHICH labels may show (frozen until the camera lands on the next step).
  const syncStateRef = useRef<LocatorLabelSyncState | null>(null);
  const beatLabelRef = useRef<BeatLabelState>({
    verdictKey: 0,
    step: 0,
    emphasise: false,
    highlight: new Set(),
  });

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
    // Same language the captions are composed in (Scrolly.tsx's own call) — this component
    // derives the SAME beats, so a divergence here is a divergence in the walk itself.
    lang: config.lang,
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
      // Seed features. Every per-feature datum the layers read (anchor, labelOffset,
      // __showLabel, __highlight) is OWNED by the placement below and overwritten by the first
      // applyPlacement() call, which happens before the map is ever painted — these values
      // exist only so the source has the right shape.
      const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
        type: "Feature",
        id: i,
        properties: {
          key: `m${i}`,
          label: mk.label,
          color: mk.color,
          category: mk.category ?? "",
          anchor: "left",
          labelOffset: (DOT_RADIUS_PX + 6) / LABEL_TEXT_SIZE,
          __showLabel: true,
          __highlight: true,
        },
        geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
      }));

      map.addSource("locator", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      // Uniform dot glyph — FIXED radius, colour by category. Opacity per-feature via
      // __highlight, which the placement sync rewrites on every step.
      map.addLayer({
        id: GLYPH_LAYER,
        type: "circle",
        source: "locator",
        paint: {
          "circle-radius": DOT_RADIUS_PX,
          "circle-color": ["get", "color"],
          "circle-stroke-color": MARKER_STROKE,
          "circle-stroke-width": 1.5,
          "circle-opacity": [
            "case",
            ["==", ["get", "__highlight"], true],
            0.95,
            DIM_OPACITY,
          ],
          "circle-stroke-opacity": [
            "case",
            ["==", ["get", "__highlight"], true],
            1,
            DIM_OPACITY,
          ],
        },
      });

      // Label layer — the four map-native locator renderers' exact contract.
      //
      // `text-anchor` is a per-feature datum, NOT `text-variable-anchor`: variable-anchor
      // re-anchors only on label↔label collision and is blind to the viewport edge, so a
      // marker near the frame keeps its default side and its text runs off canvas. And it
      // culls on its own — with `text-optional: true` a label that found no free side was
      // simply dropped, which is the "six dots, five names" this renderer shipped. The
      // shared placement is the only thing allowed to move a label, and `placeLabels` the
      // only thing allowed to drop one, so overlap is ALLOWED here and optional is OFF; the
      // declutter's verdict arrives as the `__showLabel` filter below.
      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        filter: ["==", ["get", "__showLabel"], true],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": LABEL_TEXT_SIZE,
          "text-anchor": ["get", "anchor"],
          "text-radial-offset": ["get", "labelOffset"],
          "text-justify": "auto",
          "text-allow-overlap": true,
          "text-optional": false,
          "text-line-height": 1.3,
          "text-max-width": 9,
        },
        paint: {
          "text-color": labelInk,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.6,
          "text-opacity": [
            "case",
            ["==", ["get", "__highlight"], true],
            1,
            DIM_TEXT_OPACITY,
          ],
        },
      });

      // WHERE every label sits, against the camera as it stands right now. Called once here,
      // then on every MapLibre `move` — the scrolly's camera FLIES for ~1200ms between steps,
      // and an anchor chosen at the step boundary is stale for the whole flight, which is
      // exactly when a marker drifts toward the frame edge.
      const applyPlacement = () => {
        const el = containerRef.current;
        const {
          changed,
          state,
          features: placed,
        } = syncLocatorLabels({
          markers: geo.markers,
          project: (mk) => map.project([mk.lon, mk.lat]),
          viewport: {
            width: el?.clientWidth ?? 0,
            height: el?.clientHeight ?? 0,
          },
          textSize: LABEL_TEXT_SIZE,
          radius: DOT_RADIUS_PX,
          stepKey: beatLabelRef.current.verdictKey,
          emphasise: beatLabelRef.current.emphasise,
          highlight: beatLabelRef.current.highlight,
          previous: syncStateRef.current,
        });
        syncStateRef.current = state;
        if (!changed) return;
        (map.getSource("locator") as maptilersdk.GeoJSONSource).setData({
          type: "FeatureCollection",
          features: placed,
        });
      };

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

      // WHERE the labels sit follows the camera continuously; WHICH of them show is retaken
      // only once the camera has LANDED. Both subscriptions are needed and neither substitutes
      // for the other: `move` alone leaves the declutter judging a frame the reader has left,
      // and `moveend` alone lets a label ride off the frame edge for the whole 1200ms flight.
      // `resize` because the placement's viewport is the container's own box — a reader who
      // rotates a phone gets a different frame with the same camera.
      map.on("move", applyPlacement);
      map.on("resize", applyPlacement);
      map.on("moveend", () => {
        beatLabelRef.current.verdictKey = beatLabelRef.current.step;
        applyPlacement();
      });
      // First verdict, taken against beat 0's own camera (jumped to just above, so `project`
      // already reports the frame the reader opens on).
      applyPlacement();

      setMapState({ map, beats, cameras, applyPlacement });
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
    const { map, beats, cameras, applyPlacement } = mapState;

    const step = Math.max(0, Math.min(currentStep, beats.length - 1));

    // Expose current step for the smoke test.
    (window as unknown as Record<string, unknown>)["__scrolly_step__"] = step;

    // Dim-emphasis: on a reveal beat with highlight → dim non-highlighted markers; otherwise
    // every marker is full. This step used to rebuild the source itself and then override the
    // layers' opacity with setPaintProperty. It cannot any more, and that is the point: the
    // features it rebuilt carried no `anchor`, no `labelOffset` and no `__showLabel`, so the
    // first scroll would have thrown away the placement AND — through the label layer's
    // `__showLabel` filter — hidden every name on the map. ONE writer owns the source now, and
    // the dim reaches it as beat state the placement reads on its next tick.
    const beat = beats[step];
    const dimming = beat.dim && beat.highlight.length > 0;
    beatLabelRef.current.step = step;
    beatLabelRef.current.emphasise = dimming;
    beatLabelRef.current.highlight = new Set(dimming ? beat.highlight : []);
    // The dim lands with the prose card, not a flight later — the reader is reading the
    // sentence about this glacier now. The VERDICT is not retaken here (see BeatLabelState).
    applyPlacement();

    // Shared peak-bounded flight (stays tight between reveals).
    // Beats from deriveLocatorStory already frame the zone (never a single-marker over-zoom).
    const cam = cameras[step];
    if (cam) {
      flyToBeat(map, cam);
    } else {
      // No camera for this beat ⇒ no flight ⇒ no `moveend` to promote the verdict on. Take it
      // here instead, otherwise this step would read the previous step's verdict forever.
      beatLabelRef.current.verdictKey = step;
      applyPlacement();
    }
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
