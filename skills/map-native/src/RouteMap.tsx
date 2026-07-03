import React, { useCallback, useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
import { computeRoute, resolveMapStyle, type RouteConfig } from "./route-geo";
import { makeResetControl } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// Re-export so mount.tsx can import the type from here
export type { RouteConfig };

// ---------------------------------------------------------------------------
// Electric colour sets — same as RouteReveal, mapStyle-adaptive
// ---------------------------------------------------------------------------

const ELECTRIC_DARK = {
  line: "#E8F7FF",
  glow: "#49C6FF",
} as const;

const ELECTRIC_LIGHT = {
  line: "#1A3A5C",
  glow: "#4A90D9",
} as const;

interface Props {
  config: RouteConfig;
  interactive?: boolean;
}

export const RouteMap: React.FC<Props> = ({ config, interactive = false }) => {
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

    // Map style: resolve token → MapTiler style
    const styleToken = resolveMapStyle(config.mapStyle);
    const isDark = styleToken === "dataviz-dark";
    const mapStyle = isDark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;
    const ELECTRIC = isDark ? ELECTRIC_DARK : ELECTRIC_LIGHT;

    // Halo colour for arrows and labels — contrasts with the basemap
    const labelHalo = isDark ? "rgba(0,0,0,0.7)" : "rgba(255,255,255,0.85)";

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [90, 27] as [number, number],
      zoom: 4,
      interactive,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as Parameters<typeof maptilersdk.Map>[0]);

    mapRef.current = map;

    map.on("load", () => {
      // Strip basemap symbol layers (place labels) + inner admin borders
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol" || /other border/i.test(layer.id)) {
          map.removeLayer(layer.id);
        }
      }

      const world = worldGeoJson as GeoJSON.FeatureCollection;
      const layout = computeRoute(config, world);

      // Build a lookup from territory key → territory metadata
      const colorByKey: Record<string, string> = {};
      for (const t of layout.territories) {
        colorByKey[t.key] = t.color;
      }

      // Filter world features to those crossed by the route, tag with colour + key
      const crossedKeys = new Set(layout.territories.map((t) => t.key));
      const crossedFeatures: GeoJSON.Feature[] = world.features
        .filter((f) => {
          const key = String(f.properties?.iso_a3 ?? f.properties?.name ?? "");
          return crossedKeys.has(key);
        })
        .map((f) => {
          const key = String(f.properties?.iso_a3 ?? f.properties?.name ?? "");
          return {
            ...f,
            properties: {
              ...f.properties,
              __color: colorByKey[key] ?? "#888888",
              __key: key,
            },
          };
        });

      const territoriesGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: crossedFeatures,
      };

      map.addSource("route-territories", {
        type: "geojson",
        data: territoriesGeoJson,
      });

      // Territory fill (lighter than the video, since there's no animation bloom)
      map.addLayer({
        id: "route-fill",
        type: "fill",
        source: "route-territories",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": 0.22,
        },
      });

      // Territory border line — drawn over the fill, per-territory colour
      map.addLayer({
        id: "route-territory-border",
        type: "line",
        source: "route-territories",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "__color"] as never,
          "line-width": 2,
          "line-opacity": 0.95,
        },
      });

      // Route line source (full path, no animation)
      const routeGeoJson: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: layout.route,
        },
      };

      map.addSource("route-line-source", {
        type: "geojson",
        data: routeGeoJson,
      });

      // Glow layer: wide, blurred, translucent — electric halo effect
      map.addLayer({
        id: "route-line-glow",
        type: "line",
        source: "route-line-source",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ELECTRIC.glow,
          "line-width": 11,
          "line-opacity": 0.32,
          "line-blur": 6,
        },
      });

      // Core route line
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-line-source",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ELECTRIC.line,
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      // Direction arrows along the route — sparse ▶ repeating every ~120px
      map.addLayer({
        id: "route-arrows",
        type: "symbol",
        source: "route-line-source",
        layout: {
          "symbol-placement": "line",
          "symbol-spacing": 120,
          "text-field": "▶",
          "text-rotation-alignment": "map",
          "text-keep-upright": false,
          "text-size": 12,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        } as never,
        paint: {
          "text-color": ELECTRIC.line,
          "text-halo-color": labelHalo,
          "text-halo-width": 1,
        } as never,
      });

      // Start marker (hollow ring) at first route point
      const startPoint: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: layout.route[0],
        },
      };
      // End marker (filled dot) at last route point
      const endPoint: GeoJSON.Feature = {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Point",
          coordinates: layout.route[layout.route.length - 1],
        },
      };

      map.addSource("route-start-source", {
        type: "geojson",
        data: startPoint,
      });
      map.addSource("route-end-source", {
        type: "geojson",
        data: endPoint,
      });

      // Start: hollow ring — transparent fill, white stroke
      map.addLayer({
        id: "route-start-marker",
        type: "circle",
        source: "route-start-source",
        paint: {
          "circle-radius": 6,
          "circle-color": "transparent",
          "circle-stroke-color": ELECTRIC.line,
          "circle-stroke-width": 2.5,
        },
      });

      // End: filled dot — solid colour matching the route line
      map.addLayer({
        id: "route-end-marker",
        type: "circle",
        source: "route-end-source",
        paint: {
          "circle-radius": 6,
          "circle-color": ELECTRIC.line,
          "circle-stroke-color": isDark ? "#000000" : "#ffffff",
          "circle-stroke-width": 1.5,
        },
      });

      // Territory labels: symbol layer at each territory anchor
      const labelFeatures: GeoJSON.Feature[] = layout.territories.map((t) => ({
        type: "Feature",
        properties: {
          __label: t.label,
          __color: t.color,
        },
        geometry: {
          type: "Point",
          coordinates: t.anchor,
        },
      }));

      const labelsGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: labelFeatures,
      };

      map.addSource("route-labels-source", {
        type: "geojson",
        data: labelsGeoJson,
      });

      map.addLayer({
        id: "route-labels",
        type: "symbol",
        source: "route-labels-source",
        layout: {
          "text-field": ["get", "__label"] as never,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-size": 13,
          "text-anchor": "center",
          "text-allow-overlap": false,
        } as never,
        paint: {
          "text-color": isDark ? "#ffffff" : "#1a1a2e",
          "text-halo-color": labelHalo,
          "text-halo-width": 1.5,
        } as never,
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
        map.addControl(
          makeResetControl(dataBounds, { dark: isDark }),
          "top-right",
        );

        // Hover tooltip: territory name on fill hover
        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        popupRef.current = popup;

        map.on("mousemove", "route-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          // Prefer the human-readable territory label from our computed layout
          const key = String(f.properties?.__key ?? "");
          const terr = layout.territories.find((t) => t.key === key);
          const name = terr?.label ?? f.properties?.name ?? key ?? "—";
          popup
            .setLngLat(e.lngLat)
            .setHTML(`<strong>${name}</strong>`)
            .addTo(map);
        });

        map.on("mouseleave", "route-fill", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      // Territory legend panel — swatch + label per territory (ordered by route traversal)
      if (legendRef.current) {
        const ink = isDark ? "#f4f4f5" : "#444";
        const sub = isDark ? "#c8c8cf" : "#555";
        const swatches = layout.territories
          .map(
            (t) => `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
            <span style="display:inline-block;width:14px;height:14px;background:${t.color};border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
            <span style="font:11px/1.2 sans-serif;color:${sub}">${t.label}</span>
          </div>`,
          )
          .join("");
        const header = `<div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">Territories</div>`;
        legendRef.current.innerHTML = header + swatches;
      }

      // Expose map instance for audit + snap-proof
      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;
    });

    // ResizeObserver: re-fit on container resize
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

  const handleTitleHeight = useCallback((px: number) => {
    if (px === titleHeightPxRef.current) return;
    titleHeightPxRef.current = px;
    setTitleHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  const ariaLabel = config.title
    ? `Interactive map: ${config.title}`
    : "Interactive route map";

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
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

  // Number of territories: determines legend panel height
  const numTerritories = config.territories?.length ?? 2;
  const legendHeight = numTerritories * 20 + 28; // swatch rows + header

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

      {/* Territory legend — swatch + name per territory */}
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
          minWidth: 110,
          maxWidth: "min(160px, 44vw)",
          minHeight: legendHeight,
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
