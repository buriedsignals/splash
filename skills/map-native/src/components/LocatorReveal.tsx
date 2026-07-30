// LocatorReveal — Remotion video composition for the locator / markers map, simple-reveal format.
// Fixed camera, markers animate in: a UNIFORM dot grows 0 → 6px over the clip via the shared
// easedRevealProgress helper — never value-scaled. Ports SymbolReveal, with three deltas:
//   1. geometry from locatorGeometry (category → colour, uniform size)
//   2. mapStyle-adaptive (resolveMapStyle → DATAVIZ.DARK/LIGHT + adapted label ink/halo/bg)
//   3. labels via placeLabels (Slice A declutter): project markers, build boxes, set __showLabel,
//      filter the label layer on it — no MapLibre text-optional silent culling.
// Harness:
//   delayRender at mount → on load add source/layers + declutter + fitBounds → continueWhenMapSettles → continueRender
//   per-frame: delayRender → setPaintProperty (radius/opacity ramped by progress) → continueWhenMapSettles → continueRender

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
import { locatorGeometry } from "../locator-geo";
import { placeLabels, labelRadialOffset } from "../locator-labels";
import { locatorLabelPlacement } from "../locator-label-placement";
import { resolveMapStyle } from "../route-geo";
import type { LocatorConfigShape } from "../validate-config";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { easedRevealProgress, revealCameraPlan } from "../reveal";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 6; // FIXED — uniform marker size, never value-scaled
const MARKER_STROKE = "#ffffff";
const GLYPH_LAYER = "locator-glyphs";
const LABEL_LAYER = "locator-labels";

export const LocatorReveal: React.FC<{ config: LocatorConfigShape }> = ({
  config,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [handle] = useState(() =>
    delayRender("locator-reveal-init", { timeoutInMilliseconds: 120000 }),
  );

  const geo = locatorGeometry({
    markers: config.markers,
    markerStyle: config.markerStyle,
    brandPalette: config.brandPalette,
  });

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const labelInk = dark ? "#f4f4f5" : "#1a1a1a";
  const labelHalo = dark ? "rgba(0,0,0,0.85)" : "#ffffff";
  const bg = dark ? "#0e0f12" : "#f4f4f4";

  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
    legendHeight: geo.hasCategories ? geo.legend.length * 20 + 16 : 0,
  });

  // Ratio-scaled label size: square/portrait are ≤1080 wide → larger text for legibility.
  const textSize = labelTextSize(width);

  // Eased reveal 0 → 1 with blank holds at both ends. Shifted to start after the title scene.
  const progress = easedRevealProgress(
    frame - TITLE_SCENE_FRAMES,
    durationInFrames - TITLE_SCENE_FRAMES,
  );

  // Scene: title card fades out, furniture fades in over the crossfade window.
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  // Fixed camera plan — latitude-clamped Mercator-safe bounds.
  const plan = revealCameraPlan(geo.bounds);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
      type: "Feature",
      id: i,
      properties: {
        key: `m${i}`,
        label: mk.label,
        color: mk.color,
        labelOffset: labelRadialOffset(DOT_RADIUS_PX, textSize),
        __showLabel: true, // recomputed by declutter
        // MapLibre text-anchor — recomputed per frame from the projected position so a
        // marker near the frame edge flips instead of running its label off canvas.
        anchor: "left",
      },
      geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
    }));

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: dark
        ? maptilersdk.MapStyle.DATAVIZ.DARK
        : maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive: false,
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("locator", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      // Uniform dot glyph — FIXED radius ramped ONLY by progress; colour by category.
      map.addLayer({
        id: GLYPH_LAYER,
        type: "circle",
        source: "locator",
        paint: {
          "circle-radius": ["*", DOT_RADIUS_PX, progress],
          "circle-color": ["get", "color"],
          "circle-stroke-color": MARKER_STROKE,
          "circle-stroke-width": 1.5,
          "circle-opacity": progress,
          "circle-stroke-opacity": progress,
        },
      });

      // Label layer — visibility driven per-feature by __showLabel (set by declutter),
      // NOT MapLibre text-optional culling. text-opacity ramps with the reveal.
      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        filter: ["==", ["get", "__showLabel"], true],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": textSize,
          // Per-feature anchor (data-driven), NOT text-variable-anchor: variable-anchor
          // only re-anchors on label-to-label collision — it is blind to the viewport
          // edge, so a marker near an edge keeps its default side and its text runs off
          // canvas. Recomputed from the projected screen position (locatorLabelPlacement).
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
          "text-opacity": progress,
        },
      });

      map.fitBounds(plan.bounds, { padding: mapFrame.pad, duration: 0 });

      continueWhenMapSettles(map, () => {
        // Edge-aware placement + deterministic declutter, from ONE call: the anchor keeps
        // each label inside the frame, and the box it returns is the rectangle the priority
        // rule collide-tests (the old box assumed the text always sat above the dot).
        const el = containerRef.current;
        const { anchors, boxes } = locatorLabelPlacement(
          geo.markers,
          geo.markers.map((mk) => map.project([mk.lon, mk.lat])),
          {
            viewport: {
              width: el?.clientWidth ?? width,
              height: el?.clientHeight ?? height,
            },
            textSize,
            radius: DOT_RADIUS_PX,
          },
        );
        const shownSet = new Set(placeLabels(boxes).shown);
        for (let i = 0; i < geo.markers.length; i++) {
          const props = features[i].properties as Record<string, unknown>;
          props.__showLabel = shownSet.has(`m${i}`);
          props.anchor = anchors[i];
        }
        (map.getSource("locator") as maptilersdk.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
        continueWhenMapSettles(map, () => {
          setMapReady(true);
          continueRender(handle);
        });
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per frame: grow radii + fade markers/labels by progress. Only runs once mapReady.
  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || !map.isStyleLoaded() || !map.getLayer(GLYPH_LAYER))
      return;
    const h = delayRender(`locator-reveal-frame-${frame}`);
    map.setPaintProperty(GLYPH_LAYER, "circle-radius", [
      "*",
      DOT_RADIUS_PX,
      progress,
    ]);
    map.setPaintProperty(GLYPH_LAYER, "circle-opacity", progress);
    map.setPaintProperty(GLYPH_LAYER, "circle-stroke-opacity", progress);
    if (map.getLayer(LABEL_LAYER)) {
      map.setPaintProperty(LABEL_LAYER, "text-opacity", progress);
    }
    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapReady, frame, progress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Category legend — swatch + label per entry, mounted after furniture fades in.
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
          `<div style="display:flex;align-items:center;gap:8px;line-height:1.4">` +
          `<span style="width:12px;height:12px;border-radius:50%;background:${e.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex:0 0 auto"></span>` +
          `<span style="font-size:12px;color:${ink}">${e.category}</span></div>`,
      )
      .join("");
  }, [dark, geo.hasCategories, geo.legend]);

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

      {/* Category legend — bottom-right, fades in with the furniture */}
      {geo.hasCategories && (
        <div
          ref={legendRef}
          data-testid="map-legend"
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            zIndex: 10,
            background: dark ? "rgba(24,24,27,0.85)" : "rgba(255,255,255,0.85)",
            padding: "8px 10px",
            borderRadius: 6,
            boxShadow: "0 1px 6px rgba(0,0,0,.12)",
            opacity: scene.furnitureOpacity,
            pointerEvents: "none",
          }}
        />
      )}

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
