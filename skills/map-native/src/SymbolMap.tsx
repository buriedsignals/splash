import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { symbolGeometry, type SymbolData } from "./symbol-geo";
import { symbolLabels, labelRadialOffset } from "./symbol-labels";
import { makeResetControl } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

const SYMBOL_FILL = "#2171b5"; // single hue — size is the encoding
const LABEL_TEXT_SIZE = 13;
const SYMBOL_STROKE = "#ffffff"; // white halo separates symbols from the basemap
const MAX_RADIUS_PX = 40;

export interface SymbolConfig extends SymbolData {
  type: "symbol";
  basemap: string;
  title?: string;
  description?: string;
  valueUnit?: string;
  source?: { name: string; url: string };
}

interface Props {
  config: SymbolConfig;
  progress?: number;
  interactive?: boolean;
}

export const SymbolMap: React.FC<Props> = ({
  config,
  progress = 1,
  interactive = false,
}) => {
  const outerRef = useRef<HTMLDivElement>(null); // measures the root container
  const containerRef = useRef<HTMLDivElement>(null); // the MapTiler host
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const frameRef = useRef<ReturnType<typeof resolveMapFrame> | null>(null);

  // Measured px size of the viewport container — set once on mount from the DOM.
  // Using a ref-initialised approach: useState initialiser reads window dims as
  // a fallback; the actual outerRef measurement happens in the useEffect below.
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(
    () => ({ w: window.innerWidth, h: window.innerHeight }),
  );

  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

  // Measure the root element size before map init.
  useEffect(() => {
    if (!outerRef.current) return;
    const { clientWidth: w, clientHeight: h } = outerRef.current;
    if (w > 0 && h > 0) setContainerSize({ w, h });
  }, []);

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive,
      attributionControl: true,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;

    map.on("load", () => {
      // Expose map instance for the snap-proof harness
      (window as unknown as Record<string, unknown>)["__map__"] = map;

      // Build label data alongside geometry.
      const labels = symbolLabels(geo.symbols);

      map.addSource("symbols", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: geo.symbols.map((s, i) => ({
            type: "Feature",
            properties: {
              value: s.value,
              label: s.label ?? "",
              radius: s.radius,
              labelText: labels[i]?.name
                ? `${labels[i].name}\n${labels[i].valueText}`
                : (labels[i]?.valueText ?? ""),
              labelOffset: labelRadialOffset(s.radius, LABEL_TEXT_SIZE),
            },
            geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          })),
        },
      });

      map.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": ["*", ["get", "radius"], progress],
          "circle-color": SYMBOL_FILL,
          "circle-opacity": 0.75,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });

      map.addLayer({
        id: "symbol-labels",
        type: "symbol",
        source: "symbols",
        layout: {
          "text-field": ["get", "labelText"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": LABEL_TEXT_SIZE,
          "text-variable-anchor": ["left", "right", "top", "bottom"],
          "text-radial-offset": ["get", "labelOffset"],
          "text-justify": "auto",
          "text-allow-overlap": false,
          "text-optional": true,
          "text-line-height": 1.3,
          "text-max-width": 8,
        },
        paint: {
          "text-color": "#1a1a1a",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      });

      map.fitBounds(geo.bounds, {
        padding: frameRef.current?.pad ?? 40,
        duration: 0,
      });

      if (interactive) {
        map.addControl(new maptilersdk.NavigationControl({}), "top-right");
        map.addControl(makeResetControl(geo.bounds), "top-right");
        const popup = new maptilersdk.Popup({ closeButton: false });
        map.on("mouseenter", "symbol-circles", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { label: string; value: number };
          popup
            .setLngLat(
              (f.geometry as GeoJSON.Point).coordinates as [number, number],
            )
            .setHTML(
              `<strong>${p.label}</strong><br/>${p.value}${config.valueUnit ?? ""}`,
            )
            .addTo(map);
        });
        map.on("mouseleave", "symbol-circles", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      renderLegend();
    });

    return () => {
      map.remove();
      mapRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per frame: scale the radius by progress (the reveal — circles grow 0 → target).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("symbol-circles")) return;
    map.setPaintProperty("symbol-circles", "circle-radius", [
      "*",
      ["get", "radius"],
      progress,
    ]);
    map.triggerRepaint();
  }, [progress]);

  // Sync label opacity with progress so labels fade in as circles grow.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer("symbol-labels")) return;
    map.setPaintProperty("symbol-labels", "text-opacity", progress);
    map.triggerRepaint();
  }, [progress]);

  // Nested-circle legend (largest stop outermost), drawn as inline SVG.
  function renderLegend() {
    const el = legendRef.current;
    if (!el) return;
    const max = geo.legend[0]?.radius ?? MAX_RADIUS_PX;
    const h = max * 2 + 24;
    const rows = geo.legend
      .map(
        (s) =>
          `<circle cx="${max + 2}" cy="${h - s.radius - 2}" r="${s.radius}" fill="none" stroke="#666" />` +
          `<text x="${max * 2 + 10}" y="${h - s.radius * 2 - 2 + 4}" font-size="11" fill="#333">${s.value}${config.valueUnit ?? ""}</text>`,
      )
      .join("");
    el.innerHTML = `<svg width="${max * 2 + 70}" height="${h}">${rows}</svg>`;
  }

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
  });
  frameRef.current = frame;

  // Inner content: the map canvas + legend. This subtree is STABLE — always the
  // same JSX shape so containerRef never moves in the DOM. MapFrame wraps it.
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
      `}</style>

      {/* Map canvas — stable DOM node; the map is mounted into this div */}
      <div
        ref={containerRef}
        role="region"
        aria-label={config.title ?? "map"}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Legend — bottom-right so it does not collide with MapFrame's bottom-left source */}
      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: "rgba(255,255,255,0.85)",
          padding: "8px 10px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
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
      >
        {inner}
      </MapFrame>
    </div>
  );
};
