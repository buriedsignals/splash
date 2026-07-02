import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  Easing,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import * as turf from "@turf/turf";
import worldGeoJsonImport from "../../assets/geo/world.geojson";
import type {
  RouteConfig,
  RouteRevealTerritory,
  RouteRevealLayout,
} from "../route-geo";
import { computeRouteReveal, resolveMapStyle } from "../route-geo";
import { CountryLabel } from "./CountryLabel";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";
import { MapFrame } from "../core/MapFrame";
import { resolveMapFrame } from "../core/map-format";

// Config-driven generalisation of RiverReveal. Accepts any RouteConfig and derives all
// animation parameters from computeRouteReveal — no hardcoded countries, coordinates, or colours.

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

// ---------------------------------------------------------------------------
// Electric colour sets — mapStyle-adaptive
// ---------------------------------------------------------------------------

const ELECTRIC_DARK = {
  line: "#E8F7FF",
  glow: "#49C6FF",
  head: "#FFFFFF",
  headGlow: "#BEE9FF",
  bg: "#0e0f12",
} as const;

const ELECTRIC_LIGHT = {
  line: "#1A3A5C",
  glow: "#4A90D9",
  head: "#0B2A45",
  headGlow: "#8FC3F0",
  bg: "#f4f4f5",
} as const;

const FILL_OPACITY = 0.55;

// ---------------------------------------------------------------------------
// Darken a hex colour toward black by a factor in [0,1]
// ---------------------------------------------------------------------------

function darkenHex(hex: string, amount: number): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const mix = (v: number) => Math.round(v * (1 - amount));
  return `#${mix(r).toString(16).padStart(2, "0")}${mix(g).toString(16).padStart(2, "0")}${mix(b).toString(16).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// sliceBorder — reveal the portion of a multi-segment border between fromKm and toKm.
// ---------------------------------------------------------------------------

interface DrawEntry {
  segLines: ReturnType<typeof turf.lineString>[];
  segLen: number[];
  cum: number[];
  total: number;
}

const EMPTY_FEATURE = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "MultiLineString" as const,
    coordinates: [] as number[][][],
  },
};

function buildDraw(territory: RouteRevealTerritory): DrawEntry {
  const segLines = territory.border.map((s) => turf.lineString(s));
  const segLen = segLines.map((l) => turf.length(l));
  const cum: number[] = [];
  let acc = 0;
  for (const L of segLen) {
    cum.push(acc);
    acc += L;
  }
  return { segLines, segLen, cum, total: acc };
}

function sliceBorder(d: DrawEntry, fromKm: number, toKm: number) {
  const out: number[][][] = [];
  for (let i = 0; i < d.segLines.length; i++) {
    const start = d.cum[i];
    const end = start + d.segLen[i];
    const a = Math.max(fromKm, start);
    const b = Math.min(toKm, end);
    if (b - a <= 0.0008) continue;
    out.push(
      turf.lineSliceAlong(d.segLines[i], a - start, b - start).geometry
        .coordinates,
    );
  }
  return {
    type: "Feature" as const,
    properties: {},
    geometry: { type: "MultiLineString" as const, coordinates: out },
  };
}

// ---------------------------------------------------------------------------
// Mercator-safe bounds clamp
// ---------------------------------------------------------------------------

const MERCATOR_MAX_LAT = 85;
function clampBounds(
  b: [number, number, number, number],
): [number, number, number, number] {
  return [
    b[0],
    Math.max(-MERCATOR_MAX_LAT, b[1]),
    b[2],
    Math.min(MERCATOR_MAX_LAT, b[3]),
  ];
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

const RIVER_START = 0.3; // seconds before the route line starts drawing
const BORDER_S = 2.5;
const FILL_S = 1.0;
const LABEL_S = 0.7;

// RIVER_END mirrors routeRevealFrames's DRAW_S formula.
function riverEnd(territoryCount: number): number {
  return Math.min(12, 5 + territoryCount * 1.2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RouteReveal: React.FC<{ config: RouteConfig }> = ({ config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const [map, setMap] = useState<InstanceType<typeof maptilersdk.Map> | null>(
    null,
  );
  const [labels, setLabels] = useState<
    Record<string, { x: number; y: number; reveal: number }>
  >({});
  // Generous timeout: the init builds a per-territory layer set + turf geometry, so at
  // square/portrait aspects it can exceed Remotion's default 30s delayRender timeout.
  const [handle] = useState(() =>
    delayRender("route-reveal-init", { timeoutInMilliseconds: 120000 }),
  );

  // Canvas scale: ≤1080-wide → larger labels (square / portrait formats)
  const isNarrow = width <= 1080;
  const labelFontScale = isNarrow ? 1.25 : 1;

  // Map-style adaptive colours
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const ELECTRIC = dark ? ELECTRIC_DARK : ELECTRIC_LIGHT;
  const mapStyle = dark
    ? maptilersdk.MapStyle.DATAVIZ.DARK
    : maptilersdk.MapStyle.DATAVIZ.LIGHT;

  // Derive layout from config (computed once; stable because config is stable per composition)
  const world = worldGeoJsonImport as unknown as GeoJSON.FeatureCollection;
  const layout: RouteRevealLayout = computeRouteReveal(config, world);
  const line = turf.lineString(config.route);
  const lineKm = layout.totalLengthKm;
  const territories = layout.territories;
  const RIVER_END = riverEnd(territories.length);

  // Pre-build draw structures for each territory
  const DRAW: Record<string, DrawEntry> = Object.fromEntries(
    territories.map((t) => [t.key, buildDraw(t)]),
  );

  // Trigger time for each territory (seconds into the clip)
  const trigger = (t: RouteRevealTerritory) =>
    RIVER_START + t.stop * (RIVER_END - RIVER_START);

  // Line width scales for narrow canvases
  const lw = (base: number) => (isNarrow ? base * 1.2 : base);

  // MapFrame furniture
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
  });

  // Scene model
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  // Animation time — shifted past the title scene, clamped ≥ 0
  const t = Math.max(0, (frame - TITLE_SCENE_FRAMES) / fps);

  // Camera lerp progress across the whole clip (0 at frame 0, 1 at last frame)
  const tt = interpolate(frame, [0, durationInFrames - 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // -------------------------------------------------------------------------
  // Init — runs once to set up the map, sources, and layers
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const m = new maptilersdk.Map({
      container: ref.current,
      style: mapStyle,
      center: [
        (layout.bounds[0] + layout.bounds[2]) / 2,
        (layout.bounds[1] + layout.bounds[3]) / 2,
      ],
      zoom: 4,
      pitch: 0,
      bearing: 0,
      interactive: false,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as Parameters<typeof maptilersdk.Map>[0]);

    m.on("load", () => {
      // Strip basemap labels and inner admin borders (keep country + disputed borders)
      for (const l of (m.getStyle().layers ?? []) as {
        id: string;
        type: string;
      }[]) {
        if (l.type === "symbol" || /other border/i.test(l.id))
          m.removeLayer(l.id);
      }

      // Fit the camera to the route bounds so jumpTo can be driven per-frame
      const clamped = clampBounds(layout.bounds);
      const camera = m.cameraForBounds(
        [
          [clamped[0], clamped[1]],
          [clamped[2], clamped[3]],
        ],
        { padding: mapFrame.pad },
      );

      if (camera) {
        m.jumpTo({
          center: camera.center,
          zoom: camera.zoom ?? 4,
          pitch: 0,
          bearing: 0,
        });
      }

      // Fill layer for each territory
      for (const terr of territories) {
        m.addSource(`fill-src-${terr.key}`, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: world.features.filter((f) => {
              const key = String(
                f.properties?.iso_a3 ?? f.properties?.name ?? "",
              );
              return key === terr.key;
            }),
          },
        });
        m.addLayer({
          id: `fill-${terr.key}`,
          type: "fill",
          source: `fill-src-${terr.key}`,
          paint: { "fill-color": terr.color, "fill-opacity": 0 },
        });
      }

      // Border trail layer for each territory
      for (const terr of territories) {
        const trailColor = darkenHex(terr.color, 0.45);
        m.addSource(`trail-${terr.key}`, {
          type: "geojson",
          data: EMPTY_FEATURE,
        });
        m.addLayer({
          id: `trail-${terr.key}`,
          type: "line",
          source: `trail-${terr.key}`,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": trailColor,
            "line-width": lw(2),
            "line-opacity": 0.95,
          },
        });
      }

      // Electric route line sources
      const seed = turf.lineSliceAlong(
        line,
        0,
        Math.max(0.001, lineKm * 0.001),
      );
      m.addSource("river", { type: "geojson", data: seed });
      m.addSource("river-head", { type: "geojson", data: seed });

      // Multi-layer electric effect: glow → core line → headglow → head
      m.addLayer({
        id: "river-glow",
        type: "line",
        source: "river",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ELECTRIC.glow,
          "line-width": lw(11),
          "line-opacity": 0.32,
          "line-blur": 6,
        },
      });
      m.addLayer({
        id: "river-line",
        type: "line",
        source: "river",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": ELECTRIC.line, "line-width": lw(3) },
      });
      m.addLayer({
        id: "river-headglow",
        type: "line",
        source: "river-head",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ELECTRIC.headGlow,
          "line-width": lw(16),
          "line-opacity": 0,
          "line-blur": 9,
        },
      });
      m.addLayer({
        id: "river-head",
        type: "line",
        source: "river-head",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ELECTRIC.head,
          "line-width": lw(4.5),
          "line-opacity": 0,
        },
      });

      m.once("idle", () => {
        setMap(m);
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Per-frame: update draw-on, fills, labels, and camera
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!map) return;
    const h = delayRender(`route-reveal-frame-${frame}`);

    // River draw-on (clamped to t; nothing draws during title scene because t=0 until frame > TITLE_SCENE_FRAMES)
    const reveal = interpolate(t, [RIVER_START, RIVER_END], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.cubic),
    });
    const riverDrawnKm = lineKm * reveal;
    (map.getSource("river") as any)?.setData(
      turf.lineSliceAlong(line, 0, Math.max(0.001, riverDrawnKm)),
    );

    // Electric leading head
    const riverHeadKm = lineKm * 0.03;
    (map.getSource("river-head") as any)?.setData(
      turf.lineSliceAlong(
        line,
        Math.max(0, riverDrawnKm - riverHeadKm),
        Math.max(0.001, riverDrawnKm),
      ),
    );
    let riverHeadFade = 0;
    if (reveal > 0.002 && reveal < 0.999) riverHeadFade = 1;
    else if (reveal >= 0.999)
      riverHeadFade = 1 - clamp01((t - RIVER_END) / 0.5);
    map.setPaintProperty(
      "river-headglow",
      "line-opacity",
      0.85 * riverHeadFade,
    );
    map.setPaintProperty("river-head", "line-opacity", riverHeadFade);

    // Per-territory: border draw-on, fill bloom, label rise
    const pos: Record<string, { x: number; y: number; reveal: number }> = {};
    for (const terr of territories) {
      const d = DRAW[terr.key];
      const lt = t - trigger(terr); // local seconds since this territory triggered

      // 1) Border draws on over BORDER_S
      const bp = interpolate(clamp01(lt / BORDER_S), [0, 1], [0, 1], {
        easing: Easing.inOut(Easing.cubic),
      });
      (map.getSource(`trail-${terr.key}`) as any)?.setData(
        bp <= 0 ? EMPTY_FEATURE : sliceBorder(d, 0, d.total * bp),
      );

      // 2) Fill blooms in after border completes (overshoot then settle)
      const fp = clamp01((lt - BORDER_S) / FILL_S);
      const fo = interpolate(
        fp,
        [0, 0.6, 1],
        [0, FILL_OPACITY * 1.25, FILL_OPACITY],
        {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        },
      );
      map.setPaintProperty(
        `fill-${terr.key}`,
        "fill-opacity",
        fp <= 0 ? 0 : fo,
      );

      // 3) Label rises in after fill
      const lp = clamp01((lt - BORDER_S - FILL_S) / LABEL_S);
      const p = map.project(terr.anchor as [number, number]);
      pos[terr.key] = { x: p.x, y: p.y, reveal: lp };
    }
    setLabels(pos);

    // Camera: lerp from a fit of the bounds (START) to a gentle push-in (END).
    // Derived per-frame from cameraForBounds so no hardcoded coordinates.
    const clamped = clampBounds(layout.bounds);
    const startCamera = map.cameraForBounds(
      [
        [clamped[0], clamped[1]],
        [clamped[2], clamped[3]],
      ],
      { padding: mapFrame.pad },
    );
    if (startCamera) {
      const startCenter = startCamera.center;
      const startZoom = startCamera.zoom ?? 4;
      const endZoom = startZoom + 0.3;
      // Push-in: same center, slightly higher zoom, pitch 8
      map.jumpTo({
        center: startCenter,
        zoom: lerp(startZoom, endZoom, tt),
        pitch: lerp(0, 8, tt),
        bearing: 0,
      });
    }

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [map, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AbsoluteFill style={{ backgroundColor: ELECTRIC.bg }}>
      <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-attrib,.maptiler-logo{display:none!important}`}</style>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>
      {/* Country labels — projected from map coordinates, drawn over everything */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        {territories.map((terr) =>
          labels[terr.key] ? (
            <CountryLabel
              key={terr.key}
              name={terr.label.toUpperCase()}
              color={terr.color}
              reveal={labels[terr.key].reveal}
              x={labels[terr.key].x}
              y={labels[terr.key].y}
            />
          ) : null,
        )}
      </AbsoluteFill>
      {/* Title card — full-screen scene-1 overlay, fades out at the crossfade */}
      {scene.titleOpacity > 0 && config.title && (
        <TitleCard
          text={config.title}
          description={config.description}
          opacity={scene.titleOpacity}
        />
      )}
    </AbsoluteFill>
  );
};
