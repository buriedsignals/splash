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
import usStatesGeoJsonRaw from "../assets/geo/us-states.geojson?raw";
import { resolveBasemapMeta } from "./basemaps";
const worldGeoJson = JSON.parse(worldGeoJsonRaw) as GeoJSON.FeatureCollection;
const usStatesGeoJson = JSON.parse(
  usStatesGeoJsonRaw,
) as GeoJSON.FeatureCollection;
// Registry name → the actual bundled geojson. Keep in lockstep with `BASEMAPS`
// (src/basemaps.ts): a name valid there but missing here throws below.
const GEOJSON_BY_BASEMAP: Record<string, GeoJSON.FeatureCollection> = {
  world: worldGeoJson,
  "us-states": usStatesGeoJson,
};
import { computeChoropleth, type ChoroplethData } from "./choropleth-geo";
import { choroplethFillColor, choroplethFillOpacity } from "./choropleth-paint";
import type { CameraMode } from "./camera-mode";
import { makeResetControl, safeSetMaxBounds } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { MapFrame } from "./core/MapFrame";
import { MapFilterBar } from "./core/MapFilterBar";
import {
  deriveFilterOptions,
  filterStateToExpression,
  activeTimeStep,
  type FilterState,
} from "./core/map-filter";
import type { MapFilter } from "./core/map-filter";
import { resolveMapStyle } from "./route-geo";
import { legendTheme } from "./theme/legend-theme";
import { fmtBinRange } from "./core/legend-format";
import { formatLocaleNumber } from "./core/locale";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

export interface ChoroplethConfig extends ChoroplethData {
  basemap?: string;
  mapStyle?: string;
  /** Newsroom house ground — themes the frame + legend furniture. Basemap stays light/dark. */
  themeBg?: string;
  title?: string;
  description?: string;
  unit?: string; // the long legend label, e.g. "share of electricity… (%)"
  valueUnit?: string; // the SHORT value suffix for tooltips, e.g. "%"
  source?: { name: string; url: string };
  cameraMode?: CameraMode;
  scaleType?: "sequential" | "diverging";
  palette?: string | string[];
  // Data column holding each region's display name in the deliverable language — used for
  // the hover popup so a French map shows "Éthiopie", not the basemap's English "Ethiopia".
  labelField?: string;
  filters?: MapFilter[];
  /** deliverable language — localizes legend numbers + "Source". Default English. */
  lang?: string;
}

interface Props {
  config: ChoroplethConfig;
  progress?: number;
  interactive?: boolean;
}

// Number of bins used for choropleth color scale
const NUM_BINS = 5;

// Exported so tests can assert colour distinctness
export { NO_DATA_COLOR } from "./theme/colors";

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
  // Holds the latest measured title height so fitToData can read it without stale closure.
  const titleHeightPxRef = useRef(0);
  // Holds the latest measured filter bar height for the same reason.
  const barHeightPxRef = useRef(0);
  // Stable ref to fitToData so the title-height callback can trigger a re-fit.
  const fitToDataRef = useRef<(() => void) | null>(null);

  // Measured px size — initialised from window dims, refined from DOM in useEffect.
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>(
    () => ({ w: window.innerWidth, h: window.innerHeight }),
  );
  const [titleHeightPx, setTitleHeightPx] = useState(0);

  // Filter controls — only active when interactive and config.filters is set.
  const filterOptions = useMemo(
    () =>
      config.filters ? deriveFilterOptions(config.filters, config.rows) : [],
    [config],
  );
  const [filterState, setFilterState] = useState<FilterState>({});
  const [barHeightPx, setBarHeightPx] = useState(0);

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const theme = legendTheme(dark, config.themeBg);

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
    // titleHeightPx and filterBarHeight are read from refs so they reflect the latest
    // measured values without recreating this closure (avoids stale capture).
    const FRAME_OPTS = {
      titleLines: 2,
      hasDescription: !!config.description,
      labelOverhang: 24,
      legendHeight: NUM_BINS * 18 + 18,
      get titleHeightPx() {
        return titleHeightPxRef.current;
      },
      get filterBarHeight() {
        return interactive && filterOptions.length ? barHeightPxRef.current : 0;
      },
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
          const rawSw: [number, number] = [
            Math.min(dw - dx, viewBounds.getWest()),
            Math.min(ds - dy, viewBounds.getSouth()),
          ];
          const rawNe: [number, number] = [
            Math.max(de + dx, viewBounds.getEast()),
            Math.max(dn + dy, viewBounds.getNorth()),
          ];
          // Clamp latitudes to ±85° (Mercator-safe) before passing to setMaxBounds.
          const [cw, cs, ce, cn] = clampBounds([
            rawSw[0],
            rawSw[1],
            rawNe[0],
            rawNe[1],
          ]);
          const sw: [number, number] = [cw, cs];
          const ne: [number, number] = [ce, cn];
          safeSetMaxBounds(m, sw, ne);
        });
      }
    }
    // Expose so the title-height callback can trigger a re-fit without re-creating the closure.
    fitToDataRef.current = fitToData;

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;
    // Region stroke: faint but visible against the base style (mirrors CartogramMap).
    const strokeColor = dark ? "#1c1c1f" : "#ffffff";

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
      fadeDuration: 0,
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);

    mapRef.current = map;

    map.on("load", () => {
      // Strip symbol / place-label clutter
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") {
          map.removeLayer(layer.id);
        }
      }

      // Select the basemap geojson + its join key from the registry (config.basemap),
      // instead of always using world/iso_a3 — this is what lets a US-state (or any
      // sub-national) choropleth render. Unknown basemap → a loud, listed error.
      const basemapName = config.basemap ?? "world";
      const { joinKey } = resolveBasemapMeta(basemapName);
      const world = GEOJSON_BY_BASEMAP[
        basemapName
      ] as GeoJSON.FeatureCollection;

      const layout = computeChoropleth(config, world, joinKey, {
        bins: NUM_BINS,
        scaleType: config.scaleType ?? "sequential",
        palette: config.palette,
        // Data-supplied display names (keyed by join key) so the hover popup shows the
        // deliverable-language name (e.g. "Éthiopie"), not the basemap's English name.
        labelField: config.labelField,
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
              // Localized data label for the popup (falls back to the basemap name below).
              ...(layout.labels?.[joined.key]
                ? { __label: layout.labels[joined.key] }
                : {}),
              // Write the valueField onto properties so setFilter can use ["get", valueField].
              ...(joined.value !== null
                ? { [config.valueField]: joined.value }
                : {}),
            },
          };
        }),
      };

      map.addSource("choropleth-world", {
        type: "geojson",
        data: coloredWorld,
      });

      map.addLayer({
        id: "choropleth-fill",
        type: "fill",
        source: "choropleth-world",
        paint: {
          // Shared no-data-aware paint (see choropleth-paint.ts). No-data regions
          // are NOT painted (opacity 0) — they show the default basemap, like the
          // ocean and the symbol map. Only data-bearing regions are painted; the
          // reveal effect drives their opacity, 0.85 is their resting opacity.
          "fill-color": choroplethFillColor(layout.bins) as never,
          "fill-opacity": choroplethFillOpacity(0.85) as never,
        },
      });

      map.addLayer({
        id: "choropleth-stroke",
        type: "line",
        source: "choropleth-world",
        paint: {
          "line-color": strokeColor,
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

        map.addControl(makeResetControl(dataBounds, { dark }), "top-right");
      }

      // Expose map instance and data bounds for audit + snap-proof
      (window as unknown as Record<string, unknown>)["__map__"] = map;
      (window as unknown as Record<string, unknown>)["__layout_bounds__"] =
        layout.bounds;

      // Legend — bottom-right to avoid MapFrame's bottom-left source band
      if (legendRef.current) {
        const bins = layout.bins;
        const unit = config.unit ?? "";
        // Bins are evenly spaced (see computeChoropleth) — the width of any one bin IS the
        // gap between adjacent boundaries. Passing it to fmtBin gives fractional data (e.g.
        // 0–2.5) enough decimal precision to print DISTINCT labels instead of `0–0, 0–1…`.
        const minGap = bins.length ? bins[0].max - bins[0].min : undefined;
        legendRef.current.innerHTML = `
          <div style="font:600 11px/1 sans-serif;color:${theme.ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
            ${unit}
          </div>
          ${bins
            .map(
              (b) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px ${theme.stroke};flex-shrink:0"></span>
              <span style="font:11px/1 sans-serif;color:${theme.sub}">${fmtBinRange(b.min, b.max, { unit: config.valueUnit, minGap, lang: config.lang })}</span>
            </div>
          `,
            )
            .join("")}
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
          const name =
            f.properties?.__label ??
            f.properties?.name ??
            f.properties?.iso_a3 ??
            "—";
          const value = f.properties?.__value;
          const valueUnit = config.valueUnit ?? "";
          const shownValue =
            typeof value === "number"
              ? formatLocaleNumber(value, config.lang)
              : value;
          const html = `<strong>${name} — ${shownValue}${valueUnit}</strong>`;
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
    // Only data-bearing regions reveal; no-data stays unpainted (default basemap).
    map.setPaintProperty("choropleth-fill", "fill-opacity", [
      "case",
      ["==", ["get", "__hasData"], false],
      0,
      progress,
    ] as never);
  }, [progress]);

  // Apply the filter state to the choropleth-fill layer whenever it changes.
  // Time filters are not handled here — this dataset has no time dimension
  // (activeTimeStep returns null for range-only configs). If a time filter is
  // present, activeTimeStep(filterState, filterOptions) would return the selected
  // step; re-deriving choropleth values per time step is left for a future task
  // when a time-dimensional dataset is available.
  useEffect(() => {
    const map = mapRef.current;
    if (!interactive || !filterOptions.length || !map) return;
    if (!map.getLayer("choropleth-fill")) return;
    map.setFilter(
      "choropleth-fill",
      filterStateToExpression(filterState, filterOptions) as never,
    );
    // Stroke layer mirrors the fill filter so strokes also disappear for filtered regions.
    if (map.getLayer("choropleth-stroke")) {
      map.setFilter(
        "choropleth-stroke",
        filterStateToExpression(filterState, filterOptions) as never,
      );
    }
    // Time filter: if a time dimension is active, expose the selected step via
    // window.__active_time_step__ for external probes (render-verify / smoke gate).
    const ts = activeTimeStep(filterState, filterOptions);
    if (ts !== null) {
      (window as unknown as Record<string, unknown>)["__active_time_step__"] =
        ts;
    }
  }, [filterState, filterOptions, interactive]);

  // When the measured title height changes, update the ref and re-fit so the map
  // re-computes its top band using the real (wrapped) title height.
  // Guard: only update on a real change to avoid an infinite measure → re-fit loop.
  const handleTitleHeight = useCallback((px: number) => {
    if (px === titleHeightPxRef.current) return;
    titleHeightPxRef.current = px;
    setTitleHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  // When the filter bar height changes, update the ref, state (to trigger re-render
  // of the render-time frame), and trigger a re-fit so the top pad is recalculated.
  const handleBarHeight = useCallback((px: number) => {
    if (px === barHeightPxRef.current) return;
    barHeightPxRef.current = px;
    setBarHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  const ariaLabel = config.title
    ? `Interactive map: ${config.title}`
    : "Interactive choropleth map";

  // Legend height: each bin row is 18 px, plus 18 px for the header row.
  // Derived from NUM_BINS to match the actual bin count used in computeChoropleth.
  const CHOROPLETH_LEGEND_HEIGHT = NUM_BINS * 18 + 18;
  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: CHOROPLETH_LEGEND_HEIGHT,
    titleHeightPx,
    filterBarHeight: interactive && filterOptions.length ? barHeightPx : 0,
  });
  frameRef.current = frame;

  const DARK_CTRL_CSS = `
    .maplibregl-ctrl-group { background: rgba(28,28,31,0.92) !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.14) !important; }
    .maplibregl-ctrl-group button + button { border-top: 1px solid rgba(255,255,255,0.14) !important; }
    .maplibregl-ctrl button .maplibregl-ctrl-icon { filter: invert(1) brightness(1.1) !important; }
    .maplibregl-popup-content { background: rgba(28,28,31,0.95) !important; color: #f4f4f5 !important; box-shadow: 0 0 0 1px rgba(255,255,255,0.14) !important; }
    .maplibregl-popup-content strong { color: #ffffff !important; }
    .maplibregl-popup-tip { border-top-color: rgba(28,28,31,0.95) !important; border-bottom-color: rgba(28,28,31,0.95) !important; }
  `;

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
        /* Interactive controls must render above the furniture overlays (z-index 10).
           In static/video the top-right control area is empty — this rule is inert. */
        .maplibregl-ctrl-top-right { z-index: 20 !important; }
        ${dark ? DARK_CTRL_CSS : ""}
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
          background: theme.bg,
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
        onTitleHeight={handleTitleHeight}
        dark={dark}
        themeBg={config.themeBg}
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
            />
          ) : undefined
        }
      >
        {inner}
      </MapFrame>
    </div>
  );
};
