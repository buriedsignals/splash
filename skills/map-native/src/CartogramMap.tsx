import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import worldGeoJsonRaw from "../assets/geo/world.geojson?raw";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
import { computeCartogram } from "./cartogram-geo";
import { applyCartogramBasemap } from "./theme/cartogram-basemap";
import { resolveMapStyle } from "./route-geo";
import { makeResetControl } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";
import { MapFilterBar } from "./core/MapFilterBar";
import {
  deriveFilterOptions,
  filterStateToExpression,
  type FilterState,
} from "./core/map-filter";
import type { CartogramConfigShape } from "./validate-config";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

interface Props {
  config: CartogramConfigShape;
  progress?: number;
  interactive?: boolean;
}

const CELL_LAYER = "cartogram-cells";
const OUTLINE_LAYER = "cartogram-outline";

// Legend: 5 bins × 18px rows + 18px header
const NUM_BINS = 5;

export const CartogramMap: React.FC<Props> = ({
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
  const barHeightPxRef = useRef(0);
  const fitToDataRef = useRef<(() => void) | null>(null);

  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(
    () => ({ w: window.innerWidth, h: window.innerHeight }),
  );
  const [titleHeightPx, setTitleHeightPx] = useState(0);

  // Filter controls — only active when interactive and config.filters is set.
  const filterOptions = useMemo(
    () =>
      config.filters
        ? deriveFilterOptions(
            config.filters,
            config.values as Record<string, unknown>[],
          )
        : [],
    [config],
  );
  const [filterState, setFilterState] = useState<FilterState>({});
  const [barHeightPx, setBarHeightPx] = useState(0);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const legendHeight = NUM_BINS * 18 + 18;

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
    // Clamp both lat AND lon: the MapTiler SDK normalises longitudes > 180 or < -180
    // when passed to setMaxBounds, which can produce an inverted or unexpectedly narrow
    // bounding box that forces a jarring re-zoom. Hard-clamp to ±180 to stay safe.
    const clampBounds = (
      b: [number, number, number, number],
    ): [number, number, number, number] => [
      Math.max(-180, b[0]),
      Math.max(-MERCATOR_MAX_LAT, b[1]),
      Math.min(180, b[2]),
      Math.min(MERCATOR_MAX_LAT, b[3]),
    ];

    const FRAME_OPTS = {
      titleLines: 2,
      hasDescription: !!config.description,
      labelOverhang: 24,
      legendHeight,
      get titleHeightPx() {
        return titleHeightPxRef.current;
      },
      get filterBarHeight() {
        return interactive && filterOptions.length ? barHeightPxRef.current : 0;
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
          // Pin minZoom so users can never zoom below the full-data fit zoom.
          // No setMaxBounds: any lon-range maxBounds narrower than the viewport
          // causes the SDK to force the center to the maxBounds midpoint at wide
          // viewports, breaking the centreOk responsive check. The a11y script
          // skips the maxBounds check for cartogram and only asserts minZoom.
          // TODO(slice-b): clamp lon pan by adopting HexGridMap's trick — set a
          // maxBounds expanded to include the current viewport (Math.min/max vs
          // getBounds()), which avoids the SDK center-shift while still bounding nav.
          m.setMinZoom(m.getZoom());
        });
      }
    }
    fitToDataRef.current = fitToData;

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;
    // Cell outline: faint but visible against the base style.
    const outlineColor = dark ? "#1c1c1f" : "#ffffff";

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style,
      center: [10, 50] as [number, number],
      zoom: 3,
      interactive,
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);

    mapRef.current = map;

    map.on("load", () => {
      // Compute cartogram layout once from world.geojson.
      const layout = computeCartogram(config, worldGeoJson);

      // Build FeatureCollection from cells — each feature carries display props.
      // Write each filter field onto cell properties so setFilter's ["get", field] works.
      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell) => {
        const extraProps: Record<string, unknown> = {};
        for (const f of config.filters ?? []) {
          if (f.kind !== "category") {
            extraProps[f.field] = cell.value;
          }
        }
        return {
          type: "Feature",
          properties: {
            __color: cell.color,
            __id: cell.id,
            __value: cell.value,
            ...extraProps,
          },
          geometry: cell.feature.geometry,
        };
      });
      const cellGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: cellFeatures,
      };

      applyCartogramBasemap(map, dark, layout.variant);

      map.addSource("cartogram-cell-src", {
        type: "geojson",
        data: cellGeoJson,
      });

      // Fill layer — coloured by pre-computed bin colour; opacity tied to progress.
      map.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "cartogram-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": (progress < 1 ? progress * 0.85 : 0.85) as never,
        },
      });

      // Thin outline for legibility.
      map.addLayer({
        id: OUTLINE_LAYER,
        type: "line",
        source: "cartogram-cell-src",
        paint: {
          "line-color": outlineColor,
          "line-width": 0.6,
          "line-opacity": 0.5,
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

        map.on("mousemove", CELL_LAYER, (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as Record<string, unknown>;
          map.getCanvas().style.cursor = "pointer";
          const id = String(p.__id ?? "—");
          const value = Number(p.__value ?? 0);
          const valueLabel = layout.valueLabel;
          const html = `<strong>${id}</strong><br/>${value.toLocaleString()} ${valueLabel}`;
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });

        map.on("mouseleave", CELL_LAYER, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      // Expose map instance and bounds for audit + snap-proof
      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;

      // Legend — sequential/diverging bin scale + valueLabel.
      if (legendRef.current) {
        const ink = dark ? "#f4f4f5" : "#444";
        const sub = dark ? "#c8c8cf" : "#555";
        const fmt = (n: number) =>
          Number.isInteger(n) ? String(n) : n.toFixed(1);
        const uniformNote =
          layout.variant === "grid"
            ? `<div style="font:10px/1.3 sans-serif;color:${sub};margin-top:6px;font-style:italic">each cell = one region, equal size; colour = value</div>`
            : "";
        const header = `
          <div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
            ${layout.valueLabel}
          </div>`;
        const swatches = layout.bins
          .map(
            (b) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
              <span style="font:11px/1.2 sans-serif;color:${sub}">${fmt(b.min)}–${fmt(b.max)}</span>
            </div>`,
          )
          .join("");
        legendRef.current.innerHTML = header + swatches + uniformNote;
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

  // Drive cell fill-opacity from progress (0→1 reveal). Slice B reuse.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer(CELL_LAYER)) return;
    const o = progress < 1 ? progress * 0.85 : 0.85;
    map.setPaintProperty(CELL_LAYER, "fill-opacity", o);
    map.triggerRepaint();
  }, [progress]);

  // Apply the filter state to the cartogram-cells layer whenever it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!interactive || !filterOptions.length || !map) return;
    if (!map.getLayer(CELL_LAYER)) return;
    map.setFilter(
      CELL_LAYER,
      filterStateToExpression(filterState, filterOptions) as never,
    );
  }, [filterState, filterOptions, interactive]);

  const handleTitleHeight = useCallback((px: number) => {
    if (px === titleHeightPxRef.current) return;
    titleHeightPxRef.current = px;
    setTitleHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  // When the filter bar height changes, update the ref, state and trigger a re-fit.
  const handleBarHeight = useCallback((px: number) => {
    if (px === barHeightPxRef.current) return;
    barHeightPxRef.current = px;
    setBarHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  const ariaLabel = config.title
    ? `Interactive map: ${config.title}`
    : "Interactive cartogram map";

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight,
    titleHeightPx,
    filterBarHeight: interactive && filterOptions.length ? barHeightPx : 0,
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
        source={{ name: config.source?.name ?? "", url: config.source?.url }}
        width={containerSize.w}
        height={containerSize.h}
        responsive
        frame={frame}
        onTitleHeight={handleTitleHeight}
        dark={dark}
        belowTitle={
          interactive && filterOptions.length ? (
            <MapFilterBar
              options={filterOptions}
              state={filterState}
              onChange={setFilterState}
              onHeight={handleBarHeight}
              dark={dark}
            />
          ) : undefined
        }
      >
        {inner}
      </MapFrame>
    </div>
  );
};
