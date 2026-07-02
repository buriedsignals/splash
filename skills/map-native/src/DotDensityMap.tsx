import React, { useCallback, useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
import { computeDotDensity } from "./dot-density-geo";
import { scatterInPolygon } from "./dot-scatter";
import { resolveMapStyle } from "./route-geo";
import { makeResetControl } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";
import type { DotDensityConfigShape } from "./validate-config";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

interface Props {
  config: DotDensityConfigShape;
  progress?: number;
  interactive?: boolean;
}

const DOT_LAYER = "dot-density-dots";
const HIT_LAYER = "dot-density-regions";
const OUTLINE_LAYER = "dot-density-outline";
const JOIN_KEY = "iso_a3";

export const DotDensityMap: React.FC<Props> = ({
  config,
  progress = 1,
  interactive = false,
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const popupRef = useRef<maptilersdk.Popup | null>(null);
  const startedRef = useRef(false);
  const boundsRef = useRef<[number, number, number, number] | null>(null);
  const titleHeightPxRef = useRef(0);
  const fitToDataRef = useRef<(() => void) | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(
    () => ({ w: window.innerWidth, h: window.innerHeight }),
  );
  const [titleHeightPx, setTitleHeightPx] = useState(0);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  // Legend rows: always the "1 dot = N" line; plus one row per category when multivariate.
  const legendRows =
    1 + (config.categories?.length ? config.categories.length : 0);

  // Measure the root element size before map init.
  useEffect(() => {
    if (!outerRef.current) return;
    const { clientWidth: w, clientHeight: h } = outerRef.current;
    if (w > 0 && h > 0) setContainerSize({ w, h });
  }, []);

  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const MERCATOR_MAX_LAT = 85;
    const clampBounds = (
      b: [number, number, number, number],
    ): [number, number, number, number] => [
      b[0],
      Math.max(-MERCATOR_MAX_LAT, b[1]),
      b[2],
      Math.min(MERCATOR_MAX_LAT, b[3]),
    ];

    const FRAME_OPTS = {
      titleLines: 2,
      hasDescription: !!config.description,
      labelOverhang: 24,
      legendHeight: legendRows * 18 + 18,
      get titleHeightPx() {
        return titleHeightPxRef.current;
      },
    };

    function fitToData() {
      const m = mapRef.current;
      const el = containerRef.current;
      const b = boundsRef.current;
      if (!m || !el || !b) return;
      const frame = resolveMapFrame(
        el.clientWidth,
        el.clientHeight,
        FRAME_OPTS,
      );
      m.setMinZoom(0);
      m.setMaxBounds(null);
      m.fitBounds(b, { padding: frame.pad, duration: 0 });
      if (interactive) {
        m.once("idle", () => {
          m.setMinZoom(m.getZoom());
          const viewBounds = m.getBounds();
          const [dw, ds, de, dn] = b;
          const pad = 0.15;
          const dx = (de - dw) * pad,
            dy = (dn - ds) * pad;
          const rawSw: [number, number] = [
            Math.min(dw - dx, viewBounds.getWest()),
            Math.min(ds - dy, viewBounds.getSouth()),
          ];
          const rawNe: [number, number] = [
            Math.max(de + dx, viewBounds.getEast()),
            Math.max(dn + dy, viewBounds.getNorth()),
          ];
          const [cw, cs, ce, cn] = clampBounds([
            rawSw[0],
            rawSw[1],
            rawNe[0],
            rawNe[1],
          ]);
          m.setMaxBounds([
            [cw, cs],
            [ce, cn],
          ]);
        });
      }
    }
    fitToDataRef.current = fitToData;

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;
    // Region outline: faint but visible against the base style.
    const outlineColor = dark ? "#5a5a63" : "#9aa0a6";

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style,
      center: [10, 30] as [number, number],
      zoom: 2,
      interactive,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    } as Parameters<typeof maptilersdk.Map>[0]);

    mapRef.current = map;

    map.on("load", () => {
      // Strip symbol / place-label clutter so dots read cleanly.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      const world = worldGeoJson as GeoJSON.FeatureCollection;
      const layout = computeDotDensity(config, world, JOIN_KEY);

      // Build the DOT GeoJSON once: one Point feature per dot, coloured by group.
      // Deterministic — scatterInPolygon is seeded, so this is frame-stable.
      const dotFeatures: GeoJSON.Feature[] = [];
      for (const region of layout.regions) {
        for (const group of region.groups) {
          const pts = scatterInPolygon(region.feature, group.count, group.seed);
          for (const [lon, lat] of pts) {
            dotFeatures.push({
              type: "Feature",
              properties: { color: group.color },
              geometry: { type: "Point", coordinates: [lon, lat] },
            });
          }
        }
      }
      const dotGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: dotFeatures,
      };

      // Region boundaries carrying name + per-group value(s) for hover/context.
      const regionFeatures: GeoJSON.Feature[] = layout.regions.map((region) => {
        const props: Record<string, unknown> = {
          __name:
            region.feature.properties?.name ??
            region.feature.properties?.[JOIN_KEY] ??
            region.key,
        };
        for (const group of region.groups) {
          const count = group.count * layout.dotValue;
          if (group.category) props[`__cat_${group.category}`] = count;
          else props.__value = count;
        }
        return {
          ...region.feature,
          properties: { ...region.feature.properties, ...props },
        };
      });
      const regionGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: regionFeatures,
      };

      map.addSource("dot-density-region-src", {
        type: "geojson",
        data: regionGeoJson,
      });
      map.addSource("dot-density-dot-src", {
        type: "geojson",
        data: dotGeoJson,
      });

      // Faint region outline for context.
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

      // Transparent region fill — the hover hit target (interactive only, but the
      // layer is always added so region context is uniform across builds).
      map.addLayer({
        id: HIT_LAYER,
        type: "fill",
        source: "dot-density-region-src",
        paint: { "fill-color": "#000000", "fill-opacity": 0 },
      });

      // Dot layer — fixed radius; ramp opacity by progress only when progress < 1.
      map.addLayer({
        id: DOT_LAYER,
        type: "circle",
        source: "dot-density-dot-src",
        paint: {
          "circle-radius": 2,
          "circle-color": ["get", "color"],
          "circle-opacity": progress < 1 ? progress : 1,
          "circle-stroke-width": 0.3,
          "circle-stroke-color": dark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)",
          "circle-stroke-opacity": progress < 1 ? progress : 1,
        },
      });

      const dataBounds = clampBounds(
        layout.bounds as [number, number, number, number],
      );
      boundsRef.current = dataBounds;
      fitToData();

      if (interactive) {
        map.setMaxZoom(14);
        map.addControl(
          new maptilersdk.NavigationControl({ showCompass: false }),
          "top-right",
        );
        map.addControl(makeResetControl(dataBounds, { dark }), "top-right");

        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        popupRef.current = popup;

        const catLabel = new Map<string, string>();
        for (const c of config.categories ?? []) catLabel.set(c.field, c.label);

        map.on("mousemove", HIT_LAYER, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as Record<string, unknown>;
          map.getCanvas().style.cursor = "pointer";
          const name = p.__name ?? "—";
          let body = "";
          if (layout.hasCategories) {
            const parts: string[] = [];
            for (const c of config.categories ?? []) {
              const v = p[`__cat_${c.field}`];
              if (v != null)
                parts.push(`${c.label}: ${Number(v).toLocaleString()}`);
            }
            body = parts.join("<br/>");
          } else if (p.__value != null) {
            body = Number(p.__value).toLocaleString();
          }
          const html = `<strong>${name}</strong>${body ? `<br/>${body}` : ""}`;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });

        map.on("mouseleave", HIT_LAYER, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;

      // Legend — "1 dot = N units" always; category swatches when multivariate.
      if (legendRef.current) {
        const ink = dark ? "#f4f4f5" : "#444";
        const sub = dark ? "#c8c8cf" : "#555";
        const dotN = layout.dotValue.toLocaleString();
        const header = `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:${layout.hasCategories ? 8 : 0}px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dark ? "#e8e8ec" : "#2171b5"};flex-shrink:0"></span>
            <span style="font:600 11px/1.2 sans-serif;color:${ink}">1 dot = ${dotN}</span>
          </div>`;
        const swatches = layout.hasCategories
          ? layout.legend
              .map(
                (l) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
              <span style="font:11px/1.2 sans-serif;color:${sub}">${l.category}</span>
            </div>`,
              )
              .join("")
          : "";
        legendRef.current.innerHTML = header + swatches;
      }
    });

    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      if (!m) return;
      m.resize();
      fitToData();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      startedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Drive dot opacity from progress (0→1 reveal). Slice B reuse.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer(DOT_LAYER)) return;
    const p = progress < 1 ? progress : 1;
    map.setPaintProperty(DOT_LAYER, "circle-opacity", p);
    map.setPaintProperty(DOT_LAYER, "circle-stroke-opacity", p);
    map.triggerRepaint();
  }, [progress]);

  const handleTitleHeight = useCallback((px: number) => {
    if (px === titleHeightPxRef.current) return;
    titleHeightPxRef.current = px;
    setTitleHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  const ariaLabel = config.title
    ? `Interactive map: ${config.title}`
    : "Interactive dot-density map";

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: legendRows * 18 + 18,
    titleHeightPx,
  });

  const DARK_CTRL_CSS = `
    .maplibregl-ctrl-group { background: rgba(28,28,31,0.92) !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.14) !important; }
    .maplibregl-ctrl-group button + button { border-top: 1px solid rgba(255,255,255,0.14) !important; }
    .maplibregl-ctrl button .maplibregl-ctrl-icon { filter: invert(1) brightness(1.1) !important; }
    .maplibregl-popup-content { background: rgba(28,28,31,0.95) !important; color: #f4f4f5 !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.14) !important; }
    .maplibregl-popup-content strong { color: #ffffff !important; }
    .maplibregl-popup-tip { border-top-color: rgba(28,28,31,0.95) !important; border-bottom-color: rgba(28,28,31,0.95) !important; }
  `;

  const inner = (
    <>
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
        .maplibregl-popup-content {
          font: 13px/1.4 sans-serif;
          padding: 8px 10px;
          border-radius: 4px;
        }
        .maplibregl-ctrl button:focus-visible {
          outline: 2px solid #0055cc;
          outline-offset: 2px;
        }
        .maplibregl-ctrl-top-right { z-index: 20 !important; }
        ${dark ? DARK_CTRL_CSS : ""}
      `}</style>

      <div
        ref={containerRef}
        role="region"
        aria-label={ariaLabel}
        style={{ width: "100%", height: "100%" }}
      />

      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 12,
          zIndex: 10,
          background: dark ? "rgba(24,24,27,0.88)" : "rgba(255,255,255,0.92)",
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 120,
          maxWidth: "min(180px, 46vw)",
        }}
      />
    </>
  );

  return (
    <div
      ref={outerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}
    >
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        width={containerSize.w}
        height={containerSize.h}
        responsive
        frame={frame}
        onTitleHeight={handleTitleHeight}
        dark={dark}
      >
        {inner}
      </MapFrame>
    </div>
  );
};
