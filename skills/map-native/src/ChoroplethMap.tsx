import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
import { computeChoropleth, type ChoroplethData } from "./choropleth-geo";

maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

export interface ChoroplethConfig extends ChoroplethData {
  title?: string;
  unit?: string;
  source?: { name: string; url: string };
}

interface Props {
  config: ChoroplethConfig;
  progress?: number;
  interactive?: boolean;
}

const NO_DATA_COLOR = "#e0e0e0";

export const ChoroplethMap: React.FC<Props> = ({
  config,
  interactive = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const popupRef = useRef<maptilersdk.Popup | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || startedRef.current) return;
    startedRef.current = true;

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [10, 50] as [number, number],
      zoom: 3,
      interactive,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
    } as Parameters<typeof maptilersdk.Map>[0]);

    mapRef.current = map;

    map.on("load", () => {
      // Strip symbol / place-label clutter
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") {
          map.removeLayer(layer.id);
        }
      }

      const world = worldGeoJson as GeoJSON.FeatureCollection;

      const layout = computeChoropleth(config, world, "iso_a3", {
        bins: 5,
        scaleType: "sequential",
      });

      // Build a value→color lookup from bins
      // Build a fill-color expression using match on rounded values per region
      // We'll attach the computed value as a feature property via a data join
      const coloredWorld: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: world.features.map((f, i) => {
          const joined = layout.joined[i];
          return {
            ...f,
            properties: {
              ...f.properties,
              __value: joined.value,
              __hasData: joined.value !== null,
            },
          };
        }),
      };

      map.addSource("choropleth-world", {
        type: "geojson",
        data: coloredWorld,
      });

      // Build a step expression: ["step", ["get", "__value"], noDataColor, t1, c1, t2, c2, ...]
      // But step requires numeric input and fails on null — use case instead
      const colorExpr: unknown[] = [
        "case",
        ["==", ["get", "__hasData"], false],
        NO_DATA_COLOR,
      ];

      // For each bin, add condition: value < bin.max → color
      // sorted ascending, first match wins
      const sorted = [...layout.bins].sort((a, b) => a.min - b.min);
      for (let i = 0; i < sorted.length - 1; i++) {
        colorExpr.push(["<", ["get", "__value"], sorted[i].max]);
        colorExpr.push(sorted[i].color);
      }
      // fallback = last bin color
      colorExpr.push(sorted[sorted.length - 1].color);

      map.addLayer({
        id: "choropleth-fill",
        type: "fill",
        source: "choropleth-world",
        paint: {
          "fill-color": colorExpr as never,
          "fill-opacity": 0.85,
        },
      });

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

      map.fitBounds(layout.bounds as [number, number, number, number], {
        padding: 24,
        duration: 0,
      });

      // Expose map instance for snap-proof idle detection
      (window as unknown as Record<string, unknown>)["__map__"] = map;

      // Legend
      if (legendRef.current) {
        const bins = layout.bins;
        const unit = config.unit ?? "";
        legendRef.current.innerHTML = `
          <div style="font:600 11px/1 sans-serif;color:#444;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
            ${unit}
          </div>
          ${bins
            .map(
              (b) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;flex-shrink:0"></span>
              <span style="font:11px/1 sans-serif;color:#555">${Math.round(b.min)}–${Math.round(b.max)}</span>
            </div>
          `,
            )
            .join("")}
          <div style="display:flex;align-items:center;gap:6px;margin-top:4px">
            <span style="display:inline-block;width:14px;height:14px;background:${NO_DATA_COLOR};border-radius:2px;flex-shrink:0;border:1px solid #ccc"></span>
            <span style="font:11px/1 sans-serif;color:#555">No data</span>
          </div>
        `;
      }

      // Hover popup
      if (interactive) {
        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        popupRef.current = popup;

        map.on("mousemove", "choropleth-fill", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const name = f.properties?.name ?? f.properties?.iso_a3 ?? "—";
          const value = f.properties?.__value;
          const unit = config.unit ?? "";
          const html =
            value !== null && value !== undefined
              ? `<strong>${name}</strong><br>${value}${unit ? " " + unit : ""}`
              : `<strong>${name}</strong><br>No data`;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });

        map.on("mouseleave", "choropleth-fill", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      startedRef.current = false;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maplibregl-ctrl-bottom-right,
        .maplibregl-ctrl-attrib,
        .maptiler-logo { display: none !important; }
        .maplibregl-popup-content {
          font: 13px/1.4 sans-serif;
          padding: 8px 10px;
          border-radius: 4px;
        }
      `}</style>

      {config.title && (
        <div
          style={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 10,
            background: "rgba(255,255,255,0.92)",
            padding: "8px 12px",
            borderRadius: 6,
            maxWidth: 320,
            boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          }}
        >
          <div style={{ font: "600 13px/1.3 sans-serif", color: "#1a1a1a" }}>
            {config.title}
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      <div
        ref={legendRef}
        style={{
          position: "absolute",
          bottom: 16,
          left: 12,
          zIndex: 10,
          background: "rgba(255,255,255,0.92)",
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 120,
        }}
      />

      {config.source && (
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 8,
            zIndex: 10,
            font: "10px/1 sans-serif",
            color: "#888",
          }}
        >
          Source:{" "}
          <a href={config.source.url} style={{ color: "#888" }}>
            {config.source.name}
          </a>
        </div>
      )}
    </div>
  );
};
