import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import {
  symbolGeometry,
  nearestSymbolIndex,
  MAX_RADIUS_PX,
  type SymbolData,
} from "./symbol-geo";
import type { CameraMode } from "./camera-mode";
import {
  symbolLabels,
  labelRadialOffset,
  assignSymbolLabelAnchors,
  type SymbolAnchorProps,
} from "./symbol-labels";
import { makeResetControl, safeSetMaxBounds } from "./controls";
import { resolveMapFrame, labelTextSize } from "./core/map-format";
import { endLabelGutterPx } from "../../../lib/core/text-fit";
import { MapFrame } from "./core/MapFrame";
import { MapFilterBar } from "./core/MapFilterBar";
import { resolveMapStyle } from "./route-geo";
import { houseFill } from "./theme/house-ramp";
import { legendTheme } from "./theme/legend-theme";
import { formatLocaleNumber, labelWithUnit } from "./core/locale";
import {
  deriveFilterOptions,
  filterStateToExpression,
  type FilterState,
  type MapFilter,
} from "./core/map-filter";
import type { MapArcBeat } from "./map-arc";

if (!import.meta.env.VITE_MAPTILER_KEY)
  throw new Error("VITE_MAPTILER_KEY missing");
maptilersdk.config.apiKey = import.meta.env.VITE_MAPTILER_KEY as string;

// Single hue — size is the encoding. The newsroom house hue (config.brandHue) wins when set;
// else the CVD-safe default (houseFill). Computed per-render inside the component (config scope).
const SYMBOL_STROKE = "#ffffff"; // white halo separates symbols from the basemap
// MAX_RADIUS_PX now imported from ./symbol-geo — the single source every symbol renderer
// and the produce-time conformance guard share (was 4 independent literal duplicates).
// Px clearance between a circle's edge and its label — matches labelRadialOffset's
// default `gap`, so the pixel offset used for edge-aware placement equals the ems
// radial offset MapLibre actually renders.
const LABEL_GAP = 6;

export interface SymbolConfig extends SymbolData {
  type: "symbol";
  basemap: string;
  mapStyle?: string;
  /** Newsroom house ground — themes the frame + legend furniture. Basemap stays light/dark. */
  themeBg?: string;
  title?: string;
  description?: string;
  valueUnit?: string;
  insight?: string;
  source?: { name: string; url: string };
  /** D7's credit for a DECLARED geometry (never a shipped basemap — see policy.ts's
   *  assertGeoCreditPresent). Threaded to MapFrame beside `source`. */
  geoCredit?: { name: string; url?: string };
  maxReveals?: number;
  cameraMode?: CameraMode;
  /** Reveal camera choreography ("context" default | "sequential"). See map-story.ts
   * resolveRevealMode — unset/unknown falls back to "context". Consumed by SymbolStory. */
  revealMode?: string;
  filters?: MapFilter[];
  /** deliverable language — localizes symbol value labels + "Source". Default English. */
  lang?: string;
  // Newsroom house style (profile merge, skills/splash/src/brand-profile.ts). brandHue is the
  // single symbol fill (size is the encoding); absent → the CVD-safe default. Shared across the
  // interactive map + video (*Reveal/*Story) + scrolly renderers.
  brandHue?: string;
  brandPalette?: string[];
  /** Journalist-confirmed claim-arc (S2) — honoured by deriveSymbolStory. Dropping it here
   *  would render a validated plan as the salience default, silently: see map-arc.ts. */
  arcBeats?: MapArcBeat[];
  brandExplicit?: boolean;
}

interface Props {
  config: SymbolConfig;
  progress?: number;
  interactive?: boolean;
  // Force the direct-label layer even when `interactive` is true. An interactive
  // deliverable's no-JS STATIC a11y fallback has no hover, so it must still carry each
  // symbol's name+value label (tooltip XOR labels applies to the LIVE page only). The
  // snapshot that captures that fallback sets this (via the `?staticLabels` URL flag →
  // mount.tsx); a real reader loading interactive.html never does, so the live page stays
  // hover-only and is never double-labeled.
  staticFallbackLabels?: boolean;
}

export const SymbolMap: React.FC<Props> = ({
  config,
  progress = 1,
  interactive = false,
  staticFallbackLabels = false,
}) => {
  const outerRef = useRef<HTMLDivElement>(null); // measures the root container
  const containerRef = useRef<HTMLDivElement>(null); // the MapTiler host
  const legendRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maptilersdk.Map | null>(null);
  const startedRef = useRef(false);
  const frameRef = useRef<ReturnType<typeof resolveMapFrame> | null>(null);
  // Holds the latest measured title height so fitToData (inside the init effect) can
  // read it via ref without recreating the effect closure.
  const titleHeightPxRef = useRef(0);
  // Holds the latest measured filter bar height for the same reason.
  const barHeightPxRef = useRef(0);
  // Stable ref to the fitToData function so the title-height effect can trigger re-fit.
  const fitToDataRef = useRef<(() => void) | null>(null);

  // Measured px size of the viewport container — set once on mount from the DOM.
  // Using a ref-initialised approach: useState initialiser reads window dims as
  // a fallback; the actual outerRef measurement happens in the useEffect below.
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
            config.points as unknown as Record<string, unknown>[],
          )
        : [],
    [config],
  );
  const [filterState, setFilterState] = useState<FilterState>({});
  const [barHeightPx, setBarHeightPx] = useState(0);

  const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

  // The legend gutter is MEASURED on the strings this legend will actually draw, not fixed at
  // 60px. lib/core/text-fit.ts:234-236 names this exact failure mode: "A hardcoded gutter is the
  // recurring failure: it fits the sample's labels, then overflows once the data's are longer."
  // chart-native has used this since the stacked-area clip; map-native never imported it.
  const legendLabels = geo.legend.map((s) =>
    labelWithUnit(
      formatLocaleNumber(s.value, config.lang),
      config.valueUnit,
      config.lang,
    ),
  );
  const legendGutter = endLabelGutterPx(legendLabels, 11, {
    gapPx: 10,
    floorPx: 60, // the historical width — short labels are byte-identical
  });

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const theme = legendTheme(
    dark,
    config.themeBg,
    config.brandHue ?? config.brandPalette?.[0],
  );

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

    // Opts passed to resolveMapFrame — same values used at init and every resize.
    // titleHeightPx is read from ref so it reflects the latest measured value without
    // recreating this closure (avoids stale capture).
    const FRAME_OPTS = {
      titleLines: 2,
      hasDescription: !!config.description,
      labelOverhang: Math.max(80, legendGutter),
      legendHeight: (geo.legend[0]?.radius ?? 0) * 2 + 28,
      get titleHeightPx() {
        return titleHeightPxRef.current;
      },
      get filterBarHeight() {
        return interactive && filterOptions.length ? barHeightPxRef.current : 0;
      },
    };
    const DATA_BOUNDS = clampBounds(geo.bounds);

    // Fit the data to the CURRENT container size, then pin minZoom to that fit zoom so the
    // full extent is always visible (never cropped) and bounded for free-pan. Called on load
    // AND on every resize, so minZoom always matches the current size (no build-time lock).
    function fitToData() {
      const m = mapRef.current;
      const el = containerRef.current;
      if (!m || !el) return;
      const frame = resolveMapFrame(
        el.clientWidth,
        el.clientHeight,
        FRAME_OPTS,
      );
      // Reset constraints first so previously-pinned values can't block the new fit.
      m.setMinZoom(0);
      m.setMaxBounds(null); // clear stale maxBounds so fitBounds can pan freely
      m.fitBounds(DATA_BOUNDS, { padding: frame.pad, duration: 0 });
      if (interactive) {
        m.once("idle", () => {
          m.setMinZoom(m.getZoom()); // current-size fit zoom — recomputed every fit
          // maxBounds: envelope the data with at least the current viewport extent so
          // setMaxBounds never forces a zoom-in beyond the fit zoom. The user can still
          // not pan outside this envelope, which covers the whole data story.
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
    // Expose so the title-height effect can trigger a re-fit without re-creating this closure.
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
      // Expose map instance for the snap-proof harness
      (window as unknown as Record<string, unknown>)["__map__"] = map;

      // Build label data alongside geometry.
      const labels = symbolLabels(geo.symbols, config.lang);

      // Ratio-scaled label size: a narrow/portrait embed (≤1080px) gets the same 18px
      // bump its video sibling (SymbolReveal) already applies — fix #8 (was fixed at 13
      // regardless of the actual render width). Read the ACTUAL current width from the
      // mounted container (not React state, which is captured once at initial render).
      const textSize = labelTextSize(
        containerRef.current?.clientWidth || containerSize.w,
      );

      // Symbol features — shared by the circle AND label layers. `anchor` starts at the
      // FT/NYT direct-label default (label to the RIGHT of the point, MapLibre text-anchor
      // "left") and is re-derived per feature after the camera settles so no label ever
      // renders off the viewport (see updateSymbolLabelAnchors below).
      const symbolFeatures: GeoJSON.Feature[] = geo.symbols.map((s, i) => ({
        type: "Feature",
        properties: {
          value: s.value,
          label: s.label ?? "",
          radius: s.radius,
          labelText: labels[i]?.name
            ? `${labels[i].name}\n${labelWithUnit(labels[i].valueText, config.valueUnit, config.lang)}`
            : labelWithUnit(
                labels[i]?.valueText ?? "",
                config.valueUnit,
                config.lang,
              ),
          labelOffset: labelRadialOffset(s.radius, textSize),
          anchor: "left",
        },
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      }));

      map.addSource("symbols", {
        type: "geojson",
        data: { type: "FeatureCollection", features: symbolFeatures },
      });

      map.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        layout: {
          // Smaller circles draw ON TOP. circle-sort-key sorts ascending (higher key
          // = above), so negate the radius: a small radius → higher key → on top. This
          // is the single supported mechanism for a circle layer's z-order (source-array
          // order does NOT control it), and it is standard proportional-symbol practice
          // — a small circle nested inside a larger one stays visible AND hoverable
          // instead of being occluded by the big circle in front. Base radius is used
          // (not progress-scaled) — every radius scales by the same progress, so the
          // relative order is invariant.
          "circle-sort-key": ["*", -1, ["get", "radius"]],
        },
        paint: {
          "circle-radius": ["*", ["get", "radius"], progress],
          "circle-color": houseFill(config.brandHue),
          "circle-opacity": 0.75,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });

      // Direct labels render for the pure-static map AND for the static a11y fallback of
      // an interactive map (no hover there → the data must be legible without it). The LIVE
      // interactive page (staticFallbackLabels=false) stays hover-only — tooltip XOR labels.
      if (!interactive || staticFallbackLabels) {
        map.addLayer({
          id: "symbol-labels",
          type: "symbol",
          source: "symbols",
          layout: {
            "text-field": ["get", "labelText"],
            "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
            "text-size": textSize,
            // Per-feature anchor (data-driven), NOT text-variable-anchor: variable-anchor
            // only re-anchors on label↔label collision — it is blind to the viewport edge,
            // so a symbol near an edge keeps its default side and its text runs off-canvas
            // (bug: "Indonésie" clipped to "Indonés"). updateSymbolLabelAnchors recomputes
            // `anchor` from each symbol's projected screen position to keep it in-frame.
            // "auto" justify follows the anchor (right-anchored ⇒ right-aligned), so a
            // flipped label's lines still hug the point.
            "text-anchor": ["get", "anchor"],
            "text-radial-offset": ["get", "labelOffset"],
            "text-justify": "auto",
            "text-allow-overlap": false,
            "text-optional": true,
            "text-line-height": 1.3,
            "text-max-width": 8,
          },
          paint: {
            "text-color": dark ? "#f4f4f5" : "#1a1a1a",
            "text-halo-color": dark ? "rgba(0,0,0,0.85)" : "#ffffff",
            "text-halo-width": 1.6,
          },
        });

        // INVARIANT: a symbol label never renders outside the map viewport. MapLibre's
        // anchor is blind to the canvas edge, so after every camera settle we project each
        // symbol, estimate its label box, and let placeSymbolLabel flip (right→left) or
        // clamp the anchor inward. The `changed` guard means the setData-triggered `idle`
        // does not re-enter this in a loop (mirrors LocatorMap's declutter).
        const updateSymbolLabelAnchors = () => {
          const el = containerRef.current;
          if (!el || !map.getLayer("symbol-labels")) return;
          const viewport = { width: el.clientWidth, height: el.clientHeight };
          const projected = geo.symbols.map((s) =>
            map.project([s.lon, s.lat] as [number, number]),
          );
          const changed = assignSymbolLabelAnchors(
            symbolFeatures.map(
              (f) => f.properties as unknown as SymbolAnchorProps,
            ),
            projected,
            { viewport, textSize, gap: LABEL_GAP },
          );
          if (!changed) return;
          (map.getSource("symbols") as maptilersdk.GeoJSONSource).setData({
            type: "FeatureCollection",
            features: symbolFeatures,
          });
        };
        map.on("idle", updateSymbolLabelAnchors);
      }

      fitToData();

      if (interactive) {
        map.addControl(new maptilersdk.NavigationControl({}), "top-right");
        map.addControl(
          makeResetControl(clampBounds(geo.bounds), { dark }),
          "top-right",
        );
        const popup = new maptilersdk.Popup({ closeButton: false });
        // Overlap-robust hover: use `mousemove` (not `mouseenter`, which fires only once
        // on entering the layer and never re-picks as the pointer sweeps between nested
        // circles) and, among ALL symbol features under the pointer, pick the one whose
        // CENTRE is nearest — so a small circle behind a larger one is reachable when the
        // pointer is over its centre, not just the front circle. Fixes the "hover blocked
        // by another in front" bug on tight clusters.
        map.on("mousemove", "symbol-circles", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const feats = e.features;
          if (!feats || feats.length === 0) return;
          const centers = feats.map((f) => {
            const c = (f.geometry as GeoJSON.Point).coordinates as [
              number,
              number,
            ];
            const pt = map.project(c);
            return { x: pt.x, y: pt.y };
          });
          const idx = nearestSymbolIndex(centers, {
            x: e.point.x,
            y: e.point.y,
          });
          const f = feats[idx];
          if (!f) return;
          const p = f.properties as { label: string; value: number };
          popup
            .setLngLat(
              (f.geometry as GeoJSON.Point).coordinates as [number, number],
            )
            .setHTML(
              // Locale-group the hover value, like every sibling map tooltip
              // (Choropleth/Cartogram/HexGrid) — never a bare ${p.value}.
              `<strong>${p.label}</strong><br/>${labelWithUnit(formatLocaleNumber(p.value, config.lang), config.valueUnit, config.lang)}`,
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

  // Apply the filter state to the symbol-circles layer whenever it changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!interactive || !filterOptions.length || !map) return;
    if (!map.getLayer("symbol-circles")) return;
    map.setFilter(
      "symbol-circles",
      filterStateToExpression(filterState, filterOptions) as never,
    );
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

  // When the filter bar height changes, update the ref, state and trigger a re-fit.
  const handleBarHeight = useCallback((px: number) => {
    if (px === barHeightPxRef.current) return;
    barHeightPxRef.current = px;
    setBarHeightPx(px);
    fitToDataRef.current?.();
  }, []);

  // Nested-circle legend (largest stop outermost), drawn as inline SVG.
  // The circle has no fill — its stroke IS the graphic, unlike the swatch-plus-box-shadow
  // pattern used by the ramp legends (Choropleth/Cartogram/HexGrid/DotDensity), where
  // `theme.stroke` is a translucent 1px separator drawn OVER an opaque colour fill. Reused
  // here it would render near-invisible (confirmed on dark: rgba(0,0,0,.15) over a near-black
  // panel). Use `theme.sub` instead — an opaque, theme-aware grey that keeps the circle
  // outline visible in both themes, mirroring the ink/sub weighting used everywhere else
  // (prominent value text = ink, secondary graphic = sub).
  function renderLegend() {
    const el = legendRef.current;
    if (!el) return;
    const max = geo.legend[0]?.radius ?? MAX_RADIUS_PX;
    const h = max * 2 + 24;
    const rows = geo.legend
      .map(
        (s) =>
          `<circle cx="${max + 2}" cy="${h - s.radius - 2}" r="${s.radius}" fill="none" stroke="${theme.sub}" />` +
          // Locale-group the reference value ("17 600" fr / "17,600" en) — an un-formatted
          // interpolation shipped the un-grouped "17600" the other map legends
          // (Choropleth/Cartogram/…) never did. Single-sourced through core/locale.
          `<text x="${max * 2 + 10}" y="${h - s.radius * 2 - 2 + 4}" font-size="11" fill="${theme.ink}">${labelWithUnit(formatLocaleNumber(s.value, config.lang), config.valueUnit, config.lang)}</text>`,
      )
      .join("");
    el.innerHTML = `<svg width="${max * 2 + legendGutter}" height="${h}">${rows}</svg>`;
  }

  const frame = resolveMapFrame(containerSize.w, containerSize.h, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: Math.max(80, legendGutter),
    legendHeight: (geo.legend[0]?.radius ?? 0) * 2 + 28,
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
        /* Interactive controls must render above the furniture overlays (z-index 10).
           In static/video the top-right control area is empty — this rule is inert. */
        .maplibregl-ctrl-top-right { z-index: 20 !important; }
        ${dark ? DARK_CTRL_CSS : ""}
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
          background: theme.bg,
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
        standalone
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
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
