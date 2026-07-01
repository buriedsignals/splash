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

interface Props {
  config: RouteConfig;
  interactive?: boolean;
}

export const RouteMap: React.FC<Props> = ({ config, interactive = false }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

    // Map style: resolve the token and map to a MapTiler style (kept here to stay framework-free in route-geo)
    const styleToken = resolveMapStyle(config.mapStyle);
    const isDark = styleToken === "dataviz-dark";
    const mapStyle = isDark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;

    // Route stroke colour depends on base style
    const routeStrokeColor = isDark ? "#E8F7FF" : "#1A3A5C";

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
    } as Parameters<typeof maptilersdk.Map>[0]);

    mapRef.current = map;

    map.on("load", () => {
      // Strip basemap symbol layers + inner admin borders (sub-national dividers)
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol" || /other border/i.test(layer.id)) {
          map.removeLayer(layer.id);
        }
      }

      const world = worldGeoJson as GeoJSON.FeatureCollection;
      const layout = computeRoute(config, world);

      // Build a lookup from territory key → colour
      const colorByKey: Record<string, string> = {};
      for (const t of layout.territories) {
        colorByKey[t.key] = t.color;
      }

      // Filter world features to those crossed by the route, tag with colour
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

      map.addLayer({
        id: "route-fill",
        type: "fill",
        source: "route-territories",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": 0.55,
        },
      });

      // Route LineString source
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

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route-line-source",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": routeStrokeColor,
          "line-width": 3,
          "line-opacity": 0.95,
        },
      });

      // Labels: symbol layer placing each territory name at its anchor
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
          "text-color": "#ffffff",
          "text-halo-color": "rgba(0,0,0,0.6)",
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

        // Hover tooltip: territory name
        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        popupRef.current = popup;

        map.on("mousemove", "route-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;
          map.getCanvas().style.cursor = "pointer";
          const name = f.properties?.name ?? f.properties?.__key ?? "—";
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

  // Derive dark theme at render time (mirrors the useEffect resolution, kept in sync).
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";

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
