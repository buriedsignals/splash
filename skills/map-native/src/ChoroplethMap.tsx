import React, { useEffect, useRef } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
import { computeChoropleth, type ChoroplethData } from "./choropleth-geo";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
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

// Exported so tests can assert colour distinctness
export const NO_DATA_COLOR = "#b9b9b9";
export const WATER_COLOR = "#cfe3f1";

/** Minimal IControl that resets the map to the initial data bounds. */
function makeResetControl(
  dataBounds: [number, number, number, number],
): maptilersdk.IControl {
  let _map: maptilersdk.Map | null = null;
  let _btn: HTMLButtonElement | null = null;

  return {
    onAdd(map: maptilersdk.Map): HTMLElement {
      _map = map;
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("aria-label", "Reset map view");
      btn.textContent = "⌂";
      btn.style.cssText =
        "width:29px;height:29px;font-size:16px;cursor:pointer;background:#fff;border:none;border-radius:4px;display:flex;align-items:center;justify-content:center;line-height:1;";
      btn.addEventListener("click", () => {
        _map?.fitBounds(dataBounds, { padding: 48, duration: 600 });
      });
      _btn = btn;

      container.appendChild(btn);
      return container;
    },
    onRemove(): void {
      _btn?.remove();
      _btn = null;
      _map = null;
    },
  };
}

export const ChoroplethMap: React.FC<Props> = ({
  config,
  progress = 1,
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
      // Re-enable compact attribution (licensing must be visible)
      attributionControl: true,
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
        // Paint water/ocean/sea layers with a distinct blue tint
        if (
          /water|ocean|sea/i.test(layer.id) ||
          ("source-layer" in layer &&
            /water|ocean|sea/i.test(
              (layer as { "source-layer"?: string })["source-layer"] ?? "",
            ))
        ) {
          if (layer.type === "fill") {
            try {
              map.setPaintProperty(layer.id, "fill-color", WATER_COLOR);
            } catch {
              // layer may not support this paint property
            }
          } else if (layer.type === "background") {
            try {
              map.setPaintProperty(layer.id, "background-color", WATER_COLOR);
            } catch {
              // not all background layers are water
            }
          }
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

      const dataBounds = layout.bounds as [number, number, number, number];
      map.fitBounds(dataBounds, {
        padding: 48,
        duration: 0,
      });

      // Constrain panning to the data zone so an interactive reader stays on the
      // subject and cannot wander back out to the whole world. Base maxBounds on
      // the FITTED view (which includes the letterbox), not the raw data bbox —
      // otherwise the min-zoom maxBounds implies crops the binding dimension.
      // Interactive only: static has no panning, and the video uses camera moves
      // that maxBounds would fight.
      if (interactive) {
        const fitted = map.getBounds();
        const sw = fitted.getSouthWest();
        const ne = fitted.getNorthEast();
        const mx = (ne.lng - sw.lng) * 0.25 || 1;
        const my = (ne.lat - sw.lat) * 0.25 || 1;
        map.setMaxBounds([
          [sw.lng - mx, sw.lat - my],
          [ne.lng + mx, ne.lat + my],
        ] as maptilersdk.LngLatBoundsLike);

        // Zoom limits: reader can't zoom out past story framing; tile cap at 14
        map.setMinZoom(map.getZoom() - 0.5);
        map.setMaxZoom(14);

        // Navigation controls — zoom +/− (no compass needed for a flat choropleth)
        map.addControl(
          new maptilersdk.NavigationControl({ showCompass: false }),
          "top-right",
        );

        // Reset control — returns to the initial story-framing fitBounds
        map.addControl(makeResetControl(dataBounds), "top-right");
      }

      // Expose map instance and data bounds for audit + snap-proof
      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;

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

      // Hover popup — only for regions WITH data (project decision: suppress no-data hover)
      if (interactive) {
        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        popupRef.current = popup;

        map.on("mousemove", "choropleth-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;

          // Suppress hover on no-data regions — pointer stays default, no popup
          if (f.properties?.__hasData !== true) {
            map.getCanvas().style.cursor = "";
            popup.remove();
            return;
          }

          map.getCanvas().style.cursor = "pointer";
          const name = f.properties?.name ?? f.properties?.iso_a3 ?? "—";
          const value = f.properties?.__value;
          const unit = config.unit ?? "";
          const html = `<strong>${name}</strong><br>${value}${unit ? " " + unit : ""}`;
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

  // Drive fill-opacity from progress (0→1 reveal)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer("choropleth-fill")) return;
    map.setPaintProperty("choropleth-fill", "fill-opacity", progress);
  }, [progress]);

  const ariaLabel = config.title
    ? `Interactive map: ${config.title}`
    : "Interactive choropleth map";

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      role="region"
      aria-label={ariaLabel}
    >
      <style>{`
        .maplibregl-ctrl-bottom-left,
        .maptiler-logo { display: none !important; }
        .maplibregl-popup-content {
          font: 13px/1.4 sans-serif;
          padding: 8px 10px;
          border-radius: 4px;
        }
        /* Visible focus ring on the reset control button */
        .maplibregl-ctrl button:focus-visible {
          outline: 2px solid #0055cc;
          outline-offset: 2px;
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
