import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { computeDotDensity, univariateAccent } from "./dot-density-geo";
import { scatterInPolygon } from "./dot-scatter";
import { resolveMapStyle } from "./route-geo";
import { makeResetControl, safeSetMaxBounds } from "./controls";
import { resolveMapFrame } from "./core/map-format";
import { formatLocaleNumber } from "./core/locale";
import { MapFrame } from "./core/MapFrame";
import { MapFilterBar } from "./core/MapFilterBar";
import {
  deriveFilterOptions,
  filterStateToExpression,
  type FilterState,
} from "./core/map-filter";
import { legendTheme } from "./theme/legend-theme";
import type { DotDensityConfigShape } from "./validate-config";
import { storyCopy } from "../../../lib/core/story-copy";

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
            config.rows as Record<string, unknown>[],
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
    // Region outline: faint but visible against the base style.
    const outlineColor = dark ? "#5a5a63" : "#9aa0a6";

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style,
      center: [10, 30] as [number, number],
      zoom: 2,
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
      // Strip symbol / place-label clutter so dots read cleanly.
      const layers = map.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") map.removeLayer(layer.id);
      }

      // Geometry arrives through the injected config now (produce.mjs, Task 20) — never a
      // static bundle import (D5, mirrors ChoroplethMap.tsx). Loud, named failure instead of a
      // bare TypeError on `undefined.objects` — with the `?raw` import removed there is no
      // bundled fallback geometry anymore, so an absent config.geometry must fail here, not as
      // an unexplained timeout downstream.
      if (!config.geometry)
        throw new Error(
          "dot-density: config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)",
        );
      const topology = config.geometry as Topology;
      const objectName = Object.keys(topology.objects)[0]!;
      const world = topoFeature(
        topology,
        topology.objects[objectName]!,
      ) as unknown as GeoJSON.FeatureCollection;

      const layout = computeDotDensity(config, world, JOIN_KEY, dark);

      // Build the DOT GeoJSON once: one Point feature per dot, coloured by group.
      // Deterministic — scatterInPolygon is seeded, so this is frame-stable.
      const dotFeatures: GeoJSON.Feature[] = [];
      for (const region of layout.regions) {
        for (const group of region.groups) {
          const pts = scatterInPolygon(region.feature, group.count, group.seed);
          for (const [lon, lat] of pts) {
            dotFeatures.push({
              type: "Feature",
              // category field is written so setFilter can use ["get", "category"].
              properties: {
                color: group.color,
                category: group.category ?? "",
              },
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
        map.addControl(makeResetControl(dataBounds, { dark, lang: config.lang }), "top-right");

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
                parts.push(
                  `${c.label}: ${formatLocaleNumber(Number(v), config.lang)}`,
                );
            }
            body = parts.join("<br/>");
          } else if (p.__value != null) {
            body = formatLocaleNumber(Number(p.__value), config.lang);
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
        const dotN = formatLocaleNumber(layout.dotValue, config.lang);
        const header = `
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:${layout.hasCategories ? 8 : 0}px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${univariateAccent(dark, config.brandHue)};flex-shrink:0"></span>
            <span style="font:600 11px/1.2 sans-serif;color:${theme.ink}">${storyCopy(config.lang).dotLegend(dotN)}</span>
          </div>`;
        const swatches = layout.hasCategories
          ? layout.legend
              .map(
                (l) => `
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
              <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.color};box-shadow:0 0 0 1px ${theme.stroke};flex-shrink:0"></span>
              <span style="font:11px/1.2 sans-serif;color:${theme.sub}">${l.category}</span>
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

  // Apply the filter state to the dot-density-dots layer whenever it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!interactive || !filterOptions.length || !map) return;
    if (!map.getLayer(DOT_LAYER)) return;
    map.setFilter(
      DOT_LAYER,
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

  // The graphic's accessible NAME. Localized through the locale table like every other
  // generated word: this was English on a French page (measured 2026-08-08 on the built
  // hex-grid scrolly, aria-label="Map: Ou les accidents..."). The un-titled branch keeps
  // its English noun phrase — validate-config refuses a title under 12 characters, so it is
  // unreachable through the validated path (see storyCopy's mapAria note).
  const ariaLabel = config.title
    ? storyCopy(config.lang).mapAria(config.title)
    : "Interactive dot-density map";

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: legendRows * 18 + 18,
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
        standalone
        title={config.title ?? ""}
        description={config.description}
        source={{ name: config.source?.name ?? "", url: config.source?.url }}
        geoCredit={config.geoCredit}
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
