import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { computeHexGrid } from "./hex-grid-geo";
import { resolveMapStyle } from "./route-geo";
import { makeResetControl, safeSetMaxBounds } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";
import { MapFilterBar } from "./core/MapFilterBar";
import {
  deriveFilterOptions,
  filterStateToExpression,
  type FilterState,
} from "./core/map-filter";
import { fmtBin } from "./core/legend-format";
import { formatLocaleNumber, localizeNumberString } from "./core/locale";
import { legendTheme } from "./theme/legend-theme";
import type { HexGridConfigShape } from "./validate-config";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

interface Props {
  config: HexGridConfigShape;
  progress?: number;
  interactive?: boolean;
}

const CELL_LAYER = "hex-grid-cells";
const OUTLINE_LAYER = "hex-grid-outline";

// The sequential bin scale is always 5 classes; legend has one row per bin + a header row.
const NUM_BINS = 5;

export const HexGridMap: React.FC<Props> = ({
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
            config.points as Record<string, unknown>[],
          )
        : [],
    [config],
  );
  const [filterState, setFilterState] = useState<FilterState>({});
  const [barHeightPx, setBarHeightPx] = useState(0);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const theme = legendTheme(
    dark,
    config.themeBg,
    config.brandHue ?? config.brandPalette?.[0],
  );
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
          safeSetMaxBounds(m, [cw, cs], [ce, cn]);
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
      // Strip symbol / place-label clutter so the cells read cleanly.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      // Geometry IS the computed grid — no world.geojson. Deterministic + computed once.
      const layout = computeHexGrid(config);

      const aggregate = layout.aggregate;
      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell) => {
        const extraProps: Record<string, number> = {};
        for (const f of config.filters ?? []) {
          if (f.kind !== "category") {
            extraProps[f.field] = cell.value;
          }
        }
        return {
          type: "Feature",
          properties: {
            __color: cell.color,
            __count: cell.count,
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

      map.addSource("hex-grid-cell-src", {
        type: "geojson",
        data: cellGeoJson,
      });

      // Cell fill — coloured by bin; opacity ramps with progress only when progress < 1.
      map.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "hex-grid-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": (progress < 1 ? progress * 0.8 : 0.8) as never,
        },
      });

      // Thin cell outline for legibility of the tessellation.
      map.addLayer({
        id: OUTLINE_LAYER,
        type: "line",
        source: "hex-grid-cell-src",
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
          const count = Number(p.__count ?? 0);
          const value = Number(p.__value ?? 0);
          // count → "42 points"; sum/mean → the aggregate value line + point count.
          let html: string;
          const lang = config.lang;
          if (aggregate === "count") {
            html = `<strong>${formatLocaleNumber(count, lang)} points</strong>`;
          } else {
            const label = aggregate === "mean" ? "mean" : "sum";
            const shown =
              aggregate === "mean"
                ? localizeNumberString(value.toFixed(1), lang)
                : formatLocaleNumber(value, lang);
            html = `<strong>${label} ${shown}</strong><br/>${formatLocaleNumber(count, lang)} points`;
          }
          popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
        });

        map.on("mouseleave", CELL_LAYER, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;

      // Legend — sequential bin scale (swatch + min–max) + the aggregate label. Never a size legend.
      if (legendRef.current) {
        const header = `
          <div style="font:600 11px/1.2 sans-serif;color:${theme.ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
            ${layout.aggregateLabel}
          </div>`;
        const swatches = layout.bins
          .map(
            (b) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px ${theme.stroke};flex-shrink:0"></span>
              <span style="font:11px/1.2 sans-serif;color:${theme.sub}">${fmtBin(b.min, { lang: config.lang })}–${fmtBin(b.max, { lang: config.lang })}</span>
            </div>`,
          )
          .join("");
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

  // Drive cell fill-opacity from progress (0→1 reveal). Slice B reuse.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer(CELL_LAYER)) return;
    const o = progress < 1 ? progress * 0.8 : 0.8;
    map.setPaintProperty(CELL_LAYER, "fill-opacity", o);
    map.triggerRepaint();
  }, [progress]);

  // Apply the filter state to the hex-grid-cells layer whenever it changes.
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
    : "Interactive hex-grid map";

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
          background: theme.bg,
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
        themeBg={config.themeBg}
        houseHue={config.brandHue ?? config.brandPalette?.[0]}
        lang={config.lang}
        belowTitle={
          interactive && filterOptions.length ? (
            <MapFilterBar
              options={filterOptions}
              state={filterState}
              onChange={setFilterState}
              onHeight={handleBarHeight}
              dark={dark}
              themeBg={config.themeBg}
              houseHue={config.brandHue ?? config.brandPalette?.[0]}
            />
          ) : undefined
        }
      >
        {inner}
      </MapFrame>
    </div>
  );
};
