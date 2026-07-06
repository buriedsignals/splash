import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { locatorGeometry } from "./locator-geo";
import type { LocatorConfigShape } from "./validate-config";
import {
  placeLabels,
  labelRadialOffset,
  type LabelBox,
} from "./locator-labels";
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

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 6; // FIXED — markers are uniform size, never value-scaled
const LABEL_TEXT_SIZE = 13;
const MARKER_STROKE = "#ffffff";
const PIN_ICON = "locator-pin"; // registered SDF glyph name (see addPinImage)

interface Props {
  config: LocatorConfigShape;
  progress?: number;
  interactive?: boolean;
}

// Register a simple teardrop pin as an SDF image so `icon-color` recolours it.
// Always present regardless of the basemap sprite → glyphs never silently vanish.
function addPinImage(map: maptilersdk.Map): void {
  if (map.hasImage(PIN_ICON)) return;
  const s = 48; // hi-dpi source; drawn down via icon-size
  const cvs = document.createElement("canvas");
  cvs.width = s;
  cvs.height = s;
  const ctx = cvs.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  // teardrop: circle body + downward tip
  const cx = s / 2;
  const cy = s * 0.4;
  const r = s * 0.3;
  ctx.arc(cx, cy, r, Math.PI * 0.15, Math.PI * 0.85, true);
  ctx.lineTo(cx, s * 0.92);
  ctx.closePath();
  ctx.fill();
  const img = ctx.getImageData(0, 0, s, s);
  map.addImage(
    PIN_ICON,
    { width: s, height: s, data: img.data },
    { sdf: true },
  );
}

export const LocatorMap: React.FC<Props> = ({
  config,
  progress = 1,
  interactive = false,
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const titleHeightPxRef = useRef(0);
  const barHeightPxRef = useRef(0);
  const fitToDataRef = useRef<(() => void) | null>(null);
  const relabelRef = useRef<(() => void) | null>(null);

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
            config.markers as unknown as Record<string, unknown>[],
          )
        : [],
    [config],
  );
  const [filterState, setFilterState] = useState<FilterState>({});
  const [barHeightPx, setBarHeightPx] = useState(0);

  // When the locator source is interactive AND has a category filter, disable clustering.
  // MapLibre clusters at the SOURCE level before any layer filter — category setFilter only
  // affects the un-clustered glyph layer, leaving cluster badges visible. Disabling clustering
  // makes every marker render individually so the glyph filter covers them all.
  const clusteringEnabled =
    interactive && !filterOptions.some((o) => o.kind === "category");

  const geo = locatorGeometry({
    markers: config.markers,
    markerStyle: config.markerStyle,
  });

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const usesSymbolLayer =
    geo.markerStyle === "pin" || geo.markerStyle === "icon";
  const GLYPH_LAYER = "locator-glyphs";
  const LABEL_LAYER = "locator-labels";

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
      labelOverhang: 80,
      legendHeight: geo.hasCategories ? geo.legend.length * 20 + 16 : 0,
      get titleHeightPx() {
        return titleHeightPxRef.current;
      },
      get filterBarHeight() {
        return interactive && filterOptions.length ? barHeightPxRef.current : 0;
      },
    };
    const DATA_BOUNDS = clampBounds(geo.bounds);

    function fitToData() {
      const m = mapRef.current;
      const el = containerRef.current;
      if (!m || !el) return;
      const frame = resolveMapFrame(
        el.clientWidth,
        el.clientHeight,
        FRAME_OPTS,
      );
      m.setMinZoom(0);
      m.setMaxBounds(null);
      m.fitBounds(DATA_BOUNDS, { padding: frame.pad, duration: 0 });
      if (interactive) {
        m.once("idle", () => {
          m.setMinZoom(m.getZoom());
          const viewBounds = m.getBounds();
          const [dw, ds, de, dn] = DATA_BOUNDS;
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

    const map = new maptilersdk.Map({
      container: containerRef.current,
      style,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ],
      zoom: 3,
      interactive,
      attributionControl: {}, // {} = default attribution (maplibre types reject `true`)
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      canvasContextAttributes: { preserveDrawingBuffer: true },
      fadeDuration: 0,
    });
    mapRef.current = map;

    map.on("load", () => {
      (window as unknown as Record<string, unknown>)["__map__"] = map;

      if (usesSymbolLayer) addPinImage(map);

      const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
        type: "Feature",
        id: i,
        properties: {
          key: `m${i}`,
          label: mk.label,
          color: mk.color,
          category: mk.category ?? "",
          note: mk.note ?? "",
          priority: mk.priority ?? 0,
          labelOffset: labelRadialOffset(DOT_RADIUS_PX, LABEL_TEXT_SIZE),
          __showLabel: true, // recomputed by declutter
        },
        geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
      }));

      map.addSource("locator", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
        // Clustering for interactive builds WITHOUT a category filter.
        // Category filters are applied at the layer level (setFilter on locator-glyphs), but
        // MapLibre aggregates points at the source level before any layer filter runs — so
        // cluster badges would survive a category toggle. Disabling clustering when a category
        // filter is present makes every marker pass through the glyph layer filter correctly.
        ...(clusteringEnabled
          ? { cluster: true, clusterRadius: 44, clusterMaxZoom: 6 }
          : {}),
      });

      if (clusteringEnabled) {
        // Cluster bubbles + counts (expand on zoom via click).
        map.addLayer({
          id: "locator-clusters",
          type: "circle",
          source: "locator",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": dark ? "#3b3b42" : "#cbd5e1",
            "circle-radius": [
              "step",
              ["get", "point_count"],
              14,
              10,
              18,
              30,
              24,
            ],
            "circle-stroke-color": MARKER_STROKE,
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.9,
          },
        });
        map.addLayer({
          id: "locator-cluster-count",
          type: "symbol",
          source: "locator",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-size": 12,
          },
          paint: { "text-color": dark ? "#f4f4f5" : "#1a1a1a" },
        });
      }

      // When clustering is active, only the non-cluster features reach the glyph layer.
      // When clustering is disabled (category filter present), no guard is needed.
      const glyphFilter: maptilersdk.FilterSpecification = clusteringEnabled
        ? ["!", ["has", "point_count"]]
        : (["all"] as unknown as maptilersdk.FilterSpecification);

      if (usesSymbolLayer) {
        map.addLayer({
          id: GLYPH_LAYER,
          type: "symbol",
          source: "locator",
          filter: glyphFilter,
          layout: {
            "icon-image": PIN_ICON,
            "icon-size": ["*", 0.5, progress < 1 ? progress : 1],
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
          },
          paint: {
            "icon-color": ["get", "color"],
            "icon-opacity": progress < 1 ? progress : 1,
          },
        });
      } else {
        map.addLayer({
          id: GLYPH_LAYER,
          type: "circle",
          source: "locator",
          filter: glyphFilter,
          paint: {
            "circle-radius": ["*", DOT_RADIUS_PX, progress < 1 ? progress : 1],
            "circle-color": ["get", "color"],
            "circle-stroke-color": MARKER_STROKE,
            "circle-stroke-width": 1.5,
            "circle-opacity": progress < 1 ? progress : 1,
            "circle-stroke-opacity": progress < 1 ? progress : 1,
          },
        });
      }

      // Label layer — visibility is driven per-feature by __showLabel (set by declutter).
      map.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        filter: [
          "all",
          glyphFilter,
          ["==", ["get", "__showLabel"], true],
        ] as maptilersdk.FilterSpecification,
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": LABEL_TEXT_SIZE,
          "text-variable-anchor": ["top", "bottom", "left", "right"],
          "text-radial-offset": ["get", "labelOffset"],
          "text-justify": "auto",
          "text-allow-overlap": true,
          "text-optional": false,
          "text-line-height": 1.3,
          "text-max-width": 9,
        },
        paint: {
          "text-color": dark ? "#f4f4f5" : "#1a1a1a",
          "text-halo-color": dark ? "rgba(0,0,0,0.85)" : "#ffffff",
          "text-halo-width": 1.6,
          "text-opacity": progress < 1 ? progress : 1,
        },
      });

      // Deterministic declutter: project every marker, build LabelBoxes, place by
      // priority, then mark only `shown` features with __showLabel = true.
      function relabel() {
        const m = mapRef.current;
        if (!m) return;
        const boxes: LabelBox[] = geo.markers.map((mk, i) => {
          const pt = m.project([mk.lon, mk.lat]);
          const w = Math.max(1, mk.label.length) * (LABEL_TEXT_SIZE * 0.58);
          const h = LABEL_TEXT_SIZE * 1.3;
          return {
            key: `m${i}`,
            x: pt.x - w / 2,
            y: pt.y - DOT_RADIUS_PX - h,
            w,
            h,
            priority: mk.priority ?? 0,
          };
        });
        const { shown } = placeLabels(boxes);
        const shownSet = new Set(shown);
        let changed = false;
        for (let i = 0; i < geo.markers.length; i++) {
          const showLabel = shownSet.has(`m${i}`);
          const props = features[i].properties as Record<string, unknown>;
          if (props.__showLabel !== showLabel) {
            props.__showLabel = showLabel;
            changed = true;
          }
        }
        // Only re-push when something actually changed — otherwise the resulting
        // `idle` event would re-enter relabel() in an endless loop.
        if (!changed) return;
        (m.getSource("locator") as maptilersdk.GeoJSONSource).setData({
          type: "FeatureCollection",
          features,
        });
      }
      relabelRef.current = relabel;

      fitToData();
      relabel();

      if (interactive) {
        map.addControl(new maptilersdk.NavigationControl({}), "top-right");
        map.addControl(
          makeResetControl(clampBounds(geo.bounds), { dark }),
          "top-right",
        );

        if (clusteringEnabled) {
          // Clicking a cluster zooms into its expansion.
          map.on("click", "locator-clusters", (e) => {
            const f = map.queryRenderedFeatures(e.point, {
              layers: ["locator-clusters"],
            })[0];
            const clusterId = f?.properties?.cluster_id;
            const src = map.getSource("locator") as maptilersdk.GeoJSONSource;
            if (clusterId == null) return;
            src.getClusterExpansionZoom(clusterId).then((zoom) => {
              map.easeTo({
                center: (f.geometry as GeoJSON.Point).coordinates as [
                  number,
                  number,
                ],
                zoom,
              });
            });
          });
          map.on("mouseenter", "locator-clusters", () => {
            map.getCanvas().style.cursor = "pointer";
          });
          map.on("mouseleave", "locator-clusters", () => {
            map.getCanvas().style.cursor = "";
          });
        }

        const popup = new maptilersdk.Popup({
          closeButton: false,
          closeOnClick: false,
        });
        map.on("mouseenter", GLYPH_LAYER, (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as {
            label: string;
            category: string;
            note: string;
          };
          const parts = [`<strong>${p.label}</strong>`];
          if (p.category) parts.push(`<em>${p.category}</em>`);
          if (p.note) parts.push(p.note);
          popup
            .setLngLat(
              (f.geometry as GeoJSON.Point).coordinates as [number, number],
            )
            .setHTML(parts.join("<br/>"))
            .addTo(map);
        });
        map.on("mouseleave", GLYPH_LAYER, () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      renderLegend();
    });

    // Re-declutter on move/zoom so screen-space placement stays correct.
    map.on("idle", () => relabelRef.current?.());

    const ro = new ResizeObserver(() => {
      const m = mapRef.current;
      if (!m) return;
      m.resize();
      fitToData();
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      startedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per frame (Slice B reuse): ramp glyph opacity/scale with progress.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded() || !map.getLayer(GLYPH_LAYER)) return;
    const p = progress < 1 ? progress : 1;
    if (usesSymbolLayer) {
      map.setLayoutProperty(GLYPH_LAYER, "icon-size", ["*", 0.5, p]);
      map.setPaintProperty(GLYPH_LAYER, "icon-opacity", p);
    } else {
      map.setPaintProperty(GLYPH_LAYER, "circle-radius", [
        "*",
        DOT_RADIUS_PX,
        p,
      ]);
      map.setPaintProperty(GLYPH_LAYER, "circle-opacity", p);
      map.setPaintProperty(GLYPH_LAYER, "circle-stroke-opacity", p);
    }
    if (map.getLayer(LABEL_LAYER))
      map.setPaintProperty(LABEL_LAYER, "text-opacity", p);
    map.triggerRepaint();
  }, [progress, usesSymbolLayer]);

  // Apply the filter state to the locator-glyphs layer whenever it changes.
  // When clustering is active the base filter excludes cluster features; when disabled (category
  // filter present) every feature reaches the glyph layer so no guard is needed.
  useEffect(() => {
    const map = mapRef.current;
    if (!interactive || !filterOptions.length || !map) return;
    if (!map.getLayer(GLYPH_LAYER)) return;
    // clusteringEnabled is false when a category filter is present, so no point_count guard.
    const baseFilter: unknown = clusteringEnabled
      ? ["!", ["has", "point_count"]]
      : ["all"];
    const filterExpr = filterStateToExpression(filterState, filterOptions);
    // filterExpr is ["all", ...clauses]. Spread its clauses into ["all", base, ...clauses].
    const clauses = filterExpr.slice(1) as unknown[];
    const combined = ["all", baseFilter, ...clauses];
    map.setFilter(GLYPH_LAYER, combined as never);
    // The label layer carries its own static filter (base + __showLabel). Re-apply the same
    // category clauses so labels never survive a marker they belong to being filtered out.
    if (map.getLayer(LABEL_LAYER)) {
      const labelFilter = [
        "all",
        baseFilter,
        ["==", ["get", "__showLabel"], true],
        ...clauses,
      ];
      map.setFilter(LABEL_LAYER, labelFilter as never);
    }
  }, [filterState, filterOptions, interactive, clusteringEnabled]);

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

  // Category legend — swatch + label per entry. None when there are no categories.
  function renderLegend() {
    const el = legendRef.current;
    if (!el) return;
    if (!geo.hasCategories) {
      el.innerHTML = "";
      el.style.display = "none";
      return;
    }
    const ink = dark ? "#f4f4f5" : "#333";
    const rows = geo.legend
      .map(
        (e) =>
          `<div style="display:flex;align-items:center;gap:8px;line-height:1.4">` +
          `<span style="width:12px;height:12px;border-radius:50%;background:${e.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex:0 0 auto"></span>` +
          `<span style="font-size:12px;color:${ink}">${e.category}</span></div>`,
      )
      .join("");
    el.innerHTML = rows;
  }

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
    legendHeight: geo.hasCategories ? geo.legend.length * 20 + 16 : 0,
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
        .maplibregl-ctrl-top-right { z-index: 20 !important; }
        ${dark ? DARK_CTRL_CSS : ""}
      `}</style>

      <div
        ref={containerRef}
        role="region"
        aria-label={config.title ?? "map"}
        style={{ width: "100%", height: "100%" }}
      />

      {/* Category legend — bottom-right, clear of MapFrame's bottom-left source */}
      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: dark ? "rgba(24,24,27,0.85)" : "rgba(255,255,255,0.85)",
          padding: "8px 10px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          display: geo.hasCategories ? "block" : "none",
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
