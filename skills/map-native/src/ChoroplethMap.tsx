import React, { useEffect, useRef, useState } from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
import { computeChoropleth, type ChoroplethData } from "./choropleth-geo";
import { makeResetControl } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

export interface ChoroplethConfig extends ChoroplethData {
  title?: string;
  description?: string;
  unit?: string; // the long legend label, e.g. "share of electricity… (%)"
  valueUnit?: string; // the SHORT value suffix for tooltips, e.g. "%"
  source?: { name: string; url: string };
}

interface Props {
  config: ChoroplethConfig;
  progress?: number;
  interactive?: boolean;
}

// Number of bins used for choropleth color scale
const NUM_BINS = 5;

// Exported so tests can assert colour distinctness
export { NO_DATA_COLOR, WATER_COLOR } from "./theme/colors";
import { NO_DATA_COLOR, WATER_COLOR } from "./theme/colors";

export const ChoroplethMap: React.FC<Props> = ({
  config,
  progress = 1,
  interactive = false,
}) => {
  const outerRef = useRef<HTMLDivElement>(null); // measures the root container
  const containerRef = useRef<HTMLDivElement>(null); // the MapTiler host
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const popupRef = useRef<maptilersdk.Popup | null>(null);
  const startedRef = useRef(false);
  const frameRef = useRef<ReturnType<typeof resolveMapFrame> | null>(null);
  const boundsRef = useRef<[number, number, number, number] | null>(null);

  // Measured px size — initialised from window dims, refined from DOM in useEffect.
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(
    () => ({ w: window.innerWidth, h: window.innerHeight }),
  );

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

    // Opts passed to resolveMapFrame — same values used at init and every resize.
    const FRAME_OPTS = {
      titleLines: 2,
      hasDescription: !!config.description,
      labelOverhang: 24,
      legendHeight: NUM_BINS * 18 + 36,
    };

    // Fit the data to the CURRENT container size, then pin minZoom to that fit zoom so the
    // full extent is always visible (never cropped) and bounded for free-pan. Called on load
    // AND on every resize, so minZoom always matches the current size (no build-time lock).
    // DATA_BOUNDS is set after computeChoropleth resolves layout.bounds; fitToData reads it
    // via boundsRef so it is always the latest clamped bounds.
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
      // Reset constraints first so previously-pinned values can't block the new fit.
      m.setMinZoom(0);
      m.setMaxBounds(null); // clear stale maxBounds so fitBounds can pan freely
      m.fitBounds(b, { padding: frame.pad, duration: 0 });
      if (interactive) {
        m.once("idle", () => {
          m.setMinZoom(m.getZoom()); // current-size fit zoom — recomputed every fit
          // maxBounds: envelope the data with at least the current viewport extent so
          // setMaxBounds never forces a zoom-in beyond the fit zoom. The user can still
          // not pan outside this envelope, which covers the whole data story.
          const viewBounds = m.getBounds();
          const [dw, ds, de, dn] = b;
          const pad = 0.15;
          const dx = (de - dw) * pad,
            dy = (dn - ds) * pad;
          const sw: [number, number] = [
            Math.min(dw - dx, viewBounds.getWest()),
            Math.min(ds - dy, viewBounds.getSouth()),
          ];
          const ne: [number, number] = [
            Math.max(de + dx, viewBounds.getEast()),
            Math.max(dn + dy, viewBounds.getNorth()),
          ];
          m.setMaxBounds([sw, ne]);
        });
      }
    }

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [10, 50] as [number, number],
      zoom: 3,
      interactive,
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
              /* layer may not support this paint property */
            }
          } else if (layer.type === "background") {
            try {
              map.setPaintProperty(layer.id, "background-color", WATER_COLOR);
            } catch {
              /* not all background layers are water */
            }
          }
        }
      }

      const world = worldGeoJson as GeoJSON.FeatureCollection;

      const layout = computeChoropleth(config, world, "iso_a3", {
        bins: NUM_BINS,
        scaleType: "sequential",
      });

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

      const colorExpr: unknown[] = [
        "case",
        ["==", ["get", "__hasData"], false],
        NO_DATA_COLOR,
      ];

      const sorted = [...layout.bins].sort((a, b) => a.min - b.min);
      for (let i = 0; i < sorted.length - 1; i++) {
        colorExpr.push(["<", ["get", "__value"], sorted[i].max]);
        colorExpr.push(sorted[i].color);
      }
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

        map.addControl(makeResetControl(dataBounds), "top-right");
      }

      // Expose map instance and data bounds for audit + snap-proof
      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;

      // Legend — bottom-right to avoid MapFrame's bottom-left source band
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

      // Hover popup — only for regions WITH data
      if (interactive) {
        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        popupRef.current = popup;

        map.on("mousemove", "choropleth-fill", (e) => {
          const f = e.features?.[0];
          if (!f) return;

          if (f.properties?.__hasData !== true) {
            map.getCanvas().style.cursor = "";
            popup.remove();
            return;
          }

          map.getCanvas().style.cursor = "pointer";
          const name = f.properties?.name ?? f.properties?.iso_a3 ?? "—";
          const value = f.properties?.__value;
          const valueUnit = config.valueUnit ?? "";
          const html = `<strong>${name} — ${value}${valueUnit}</strong>`;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });

        map.on("mouseleave", "choropleth-fill", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }
    });

    // ResizeObserver: re-fit on container resize so data stays centred.
    // Uses fitToData() so minZoom is recomputed for the new size (no build-time lock).
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

  // Legend height: each bin row is 18 px, plus 36 px for header/no-data row.
  // Derived from NUM_BINS to match the actual bin count used in computeChoropleth.
  const CHOROPLETH_LEGEND_HEIGHT = NUM_BINS * 18 + 36;
  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: CHOROPLETH_LEGEND_HEIGHT,
  });
  frameRef.current = frame;

  // Inner content: the map canvas + legend. Stable JSX shape — containerRef never
  // changes DOM position regardless of config or containerSize updates.
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
      `}</style>

      {/* Map canvas — stable DOM node; the map is mounted into this div */}
      <div
        ref={containerRef}
        role="region"
        aria-label={ariaLabel}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Legend — bottom-right so it does not collide with MapFrame's bottom-left source */}
      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 12,
          zIndex: 10,
          background: "rgba(255,255,255,0.92)",
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 120,
          maxWidth: "min(160px, 42vw)",
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
