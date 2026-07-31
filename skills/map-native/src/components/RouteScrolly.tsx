// RouteScrolly — scrolly-as-video route composition (drawTo).
// Ports RouteReveal's map init, electric line layers, per-territory fill/trail layers, and
// camera-from-bounds; replaces the single continuous draw sweep with a per-STEP target: the
// route line draws up to the ACTIVE step's territory `stop`, animated across that step's move
// phase, and each territory's border/fill/label is triggered off the step that reveals it.
// Renders a pinned ScrollyPanel per content step plus the title scene, instead of the continuous
// clock overlays.
// Harness pattern: delayRender → jumpTo/setData → continueWhenMapSettles → continueRender.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { continueWhenMapSettles } from "../core/frame-ready";
import * as turf from "@turf/turf";
import { resolveVideoGeometry } from "../core/video-geometry";
import type {
  RouteConfig,
  RouteRevealTerritory,
  RouteRevealLayout,
} from "../route-geo";
import { computeRouteReveal, resolveMapStyle } from "../route-geo";
import { houseRouteAccent } from "../theme/house-ramp";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import { TitleCard } from "./StoryCards";
import { ScrollyPanel } from "./ScrollyPanel";
import { MapFrame } from "../core/MapFrame";
import { resolveMapFrame } from "../core/map-format";
import { routeStoryToChapters, scrollyFrames } from "../route-story";
import {
  buildTimeline,
  cameraForFrame,
  easeInOutCubic,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { stepSlide } from "./ChoroplethScrolly";
import type { ScrollyStory } from "../../../scrolly/src/chapters";

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
// Overview establishing shot: every crossed territory is faintly tinted + outlined so the
// viewer sees the territories the route passes through, before any route is drawn. Each
// territory then ramps from this faint tint up to FILL_OPACITY on the step that reveals it.
const OVERVIEW_FILL_OPACITY = 0.2;

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

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// Per-step MOVE-phase pacing for a territory's fill bloom (fraction of the move phase).
// The fill ramps (from the faint overview tint up to full) across the same move window the
// panel slides in over (#3), so the river, the territory reveal and its text panel all pin
// together at move end. Borders are already drawn from the overview, so there is no separate
// border draw-on pace here.
// ---------------------------------------------------------------------------

const FILL_MOVE_FRAC = 0.95; // fill reaches full by 95% of the move (just before pin)

// ---------------------------------------------------------------------------
// Init model — captured once, threaded to the per-frame effect
// ---------------------------------------------------------------------------

interface RouteScrollyModel {
  map: InstanceType<typeof maptilersdk.Map>;
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RouteScrolly: React.FC<{ config: RouteConfig }> = ({ config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const [model, setModel] = useState<RouteScrollyModel | null>(null);
  // Generous timeout: the init builds a per-territory layer set + turf geometry, so at
  // square/portrait aspects it can exceed Remotion's default 30s delayRender timeout.
  const [handle] = useState(() =>
    delayRender("route-scrolly-init", { timeoutInMilliseconds: 120000 }),
  );

  // Canvas scale: ≤1080-wide → larger labels + line widths (square / portrait formats)
  const isNarrow = width <= 1080;

  // Map-style adaptive colours
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  // Newsroom house hue → the electric route line + derived glow/head (bg stays neutral); else the
  // hand-tuned pair. Policy b: applied as chosen (a low-contrast line is a review concern).
  const baseElectric = dark ? ELECTRIC_DARK : ELECTRIC_LIGHT;
  const ELECTRIC = config.brandHue
    ? { ...baseElectric, ...houseRouteAccent(config.brandHue, dark) }
    : baseElectric;
  const mapStyle = dark
    ? maptilersdk.MapStyle.DATAVIZ.DARK
    : maptilersdk.MapStyle.DATAVIZ.LIGHT;

  // Geometry arrives through the injected config now (produce.mjs) — never a bundled static
  // import (D5, mirrors RouteMap.tsx / ChoroplethMap.tsx / ChoroplethStory.tsx). Shared with the
  // choropleth video family (Task 7) via resolveVideoGeometry, rather than a route-local copy of
  // the same decode — route reads only `world` off it; `joinKey` is unused here because route
  // never threads a join key (RouteMap.tsx, the interactive sibling, hardcodes `iso_a3 ?? name`
  // inline and `computeRoute`/`computeRouteReveal` derive the key internally — route's own
  // established shape, not something this task changes).
  const { world } = useMemo(
    () => resolveVideoGeometry(config, "route-scrolly"),
    [config],
  );

  // Derive layout + draw structures from config ONCE (heavy turf geometry). Memoised on
  // config, which is stable per composition — so this does NOT re-run every frame.
  const {
    layout,
    story,
    phases,
    totalFrames,
    line,
    lineKm,
    territories,
    DRAW,
  } = useMemo(() => {
    const l: RouteRevealLayout = computeRouteReveal(config, world);
    const notes: Record<string, string> = {};
    for (const t of config.territories ?? []) {
      if (t.note?.trim()) notes[t.key] = t.note;
    }
    const st = routeStoryToChapters(l, {
      title: config.title ?? "",
      description: config.description,
      source: config.source
        ? { name: config.source.name, url: config.source.url ?? "" }
        : { name: "", url: "" },
      insight: (config as { insight?: string }).insight,
      notes,
    });
    const stepKinds = st.steps.map((_, i) => (i === 0 ? "title" : "reveal"));
    const { phases: ph, totalFrames: tf } = buildTimeline(stepKinds, fps);
    return {
      layout: l,
      story: st,
      phases: ph,
      totalFrames: tf,
      line: turf.lineString(config.route),
      lineKm: l.totalLengthKm,
      territories: l.territories,
      DRAW: Object.fromEntries(
        l.territories.map((t) => [t.key, buildDraw(t)]),
      ) as Record<string, DrawEntry>,
    };
  }, [config, fps, world]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // -------------------------------------------------------------------------
  // Init — runs once to set up the map, sources, layers, and per-step camera solutions
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
    } as ConstructorParameters<typeof maptilersdk.Map>[0]);

    m.on("load", () => {
      // Strip basemap labels and inner admin borders (keep country + disputed borders)
      for (const l of (m.getStyle().layers ?? []) as {
        id: string;
        type: string;
      }[]) {
        if (l.type === "symbol" || /other border/i.test(l.id))
          m.removeLayer(l.id);
      }

      // Camera solution helper — fit bounds with the MapFrame pad.
      const solveBounds = (
        b: [number, number, number, number],
      ): CameraSolution => {
        const clamped = clampBounds(b);
        const camera = m.cameraForBounds(
          [
            [clamped[0], clamped[1]],
            [clamped[2], clamped[3]],
          ],
          { padding: mapFrame.pad },
        );
        if (!camera || !camera.center) {
          return {
            center: [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2],
            zoom: 4,
          };
        }
        const c = maptilersdk.LngLat.convert(camera.center);
        return {
          center: [c.lng, c.lat],
          zoom: camera.zoom ?? 4,
        };
      };

      // exitStop for territory index k: the next territory's entry, or 1.0 if k is the last.
      // Mirrors the draw-on driver so the camera follows the DRAWN extent (through territory k),
      // never lagging one territory behind.
      const exitStopOfK = (k: number): number =>
        k + 1 < territories.length ? territories[k + 1].stop : 1.0;

      // Per-step camera solutions (step sequence: 0 title, 1 overview, 2..N+1 draws, N+2 takeaway):
      //   step 0 (title/intro): full route bounds.
      //   step 1 (overview):    full route bounds (nothing drawn yet).
      //   step i in 2..N+1:     bounds of the route drawn THROUGH territory k=i-2 ∪ territory k.
      //   step N+2 (takeaway):  full route bounds (all drawn).
      const stepSolutions: CameraSolution[] = story.steps.map((s, i) => {
        const k = i - 2;
        if (k < 0 || k >= territories.length) return solveBounds(layout.bounds);
        const terr = territories[k];
        const drawnKm = Math.max(0.001, lineKm * exitStopOfK(k));
        const drawn = turf.lineSliceAlong(line, 0, drawnKm);
        const terrFeatures = world.features.filter((f) => {
          const key = String(f.properties?.iso_a3 ?? f.properties?.name ?? "");
          return key === terr.key;
        });
        const extent = turf.featureCollection([
          drawn as GeoJSON.Feature,
          ...(terrFeatures as GeoJSON.Feature[]),
        ]);
        const bb = turf.bbox(extent);
        return solveBounds([bb[0], bb[1], bb[2], bb[3]]);
      });

      // Position to step 0's camera.
      m.jumpTo({
        center: stepSolutions[0].center,
        zoom: stepSolutions[0].zoom,
        pitch: 0,
        bearing: 0,
      });

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

      continueWhenMapSettles(m, () => {
        setModel({ map: m, story, phases, stepSolutions });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Per-frame: update draw-on (per active step), fills, labels, and camera
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!model) return;
    const { map, phases: ph, stepSolutions } = model;
    const h = delayRender(`route-scrolly-frame-${frame}`);

    // Camera on the STEP timeline.
    const { camera, beatIndex: active } = cameraForFrame(
      frame,
      ph,
      stepSolutions,
    );
    map.jumpTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: 0,
      bearing: 0,
    });

    // Step sequence: 0 title, 1 overview, 2..N+1 draws (territory k = active-2), N+2 takeaway.
    // drawTo driver: during a draw step, draw the route THROUGH territory k — from its entry
    // (entryStop) to the next territory's entry (exitStop), or 1.0 for the last. To keep the
    // river, border/fill and the panel arriving TOGETHER (#3), the draw ramps across this step's
    // MOVE phase (the same window the panel slides in over: stepSlide 0→1 across the move), then
    // holds. On the title (0) and overview (1) steps nothing is drawn (reveal 0). On the takeaway
    // step (active === last) the full route is drawn (reveal 1).
    const phase = ph[active];
    const lastStep = ph.length - 1;
    const k = active - 2;
    let reveal: number;
    let drawing = false;
    if (active <= 1) {
      // title + overview: nothing drawn.
      reveal = 0;
    } else if (active === lastStep) {
      // takeaway: full route drawn.
      reveal = 1;
    } else {
      const entryStop = territories[k].stop;
      const exitStop =
        k + 1 < territories.length ? territories[k + 1].stop : 1.0;
      // Ramp across the MOVE phase (panel-enter window), then hold at exitStop.
      const moveProgress = clamp01(
        phase.moveFrames > 0
          ? (frame - phase.startFrame) / phase.moveFrames
          : 1,
      );
      reveal = lerp(entryStop, exitStop, easeInOutCubic(moveProgress));
      drawing = moveProgress > 0.002 && moveProgress < 0.999;
    }
    const riverDrawnKm = lineKm * reveal;
    (map.getSource("river") as any)?.setData(
      turf.lineSliceAlong(line, 0, Math.max(0.001, riverDrawnKm)),
    );

    // Electric leading head — visible while the route is actively drawing.
    const riverHeadKm = lineKm * 0.03;
    (map.getSource("river-head") as any)?.setData(
      turf.lineSliceAlong(
        line,
        Math.max(0, riverDrawnKm - riverHeadKm),
        Math.max(0.001, riverDrawnKm),
      ),
    );
    // Head glows only while the route is actively drawing across a content step.
    const riverHeadFade = drawing && reveal > 0.002 ? 1 : 0;
    map.setPaintProperty(
      "river-headglow",
      "line-opacity",
      0.85 * riverHeadFade,
    );
    map.setPaintProperty("river-head", "line-opacity", riverHeadFade);

    // Per-territory: border draw-on + fill bloom triggered off the step that reveals it.
    // Territory kk is revealed by step kk+2 (0 title, 1 overview, 2 = first territory). To land
    // the border/fill on the SAME frame window as its panel slide-in (#3), the reveal ramps
    // across the reveal step's MOVE phase (the panel-enter window), then holds. On the takeaway
    // step (last), every territory is held at its final filled state.
    for (let kk = 0; kk < territories.length; kk++) {
      const terr = territories[kk];
      const d = DRAW[terr.key];
      const revealStep = kk + 2;

      if (active === 0) {
        // Title scene: nothing tinted yet.
        (map.getSource(`trail-${terr.key}`) as any)?.setData(EMPTY_FEATURE);
        map.setPaintProperty(`fill-${terr.key}`, "fill-opacity", 0);
        continue;
      }

      if (active === 1) {
        // Overview establishing shot: every crossed territory is faintly tinted + fully
        // outlined (route stays undrawn). This is the "see all the territories" beat.
        (map.getSource(`trail-${terr.key}`) as any)?.setData(
          sliceBorder(d, 0, d.total),
        );
        map.setPaintProperty(
          `fill-${terr.key}`,
          "fill-opacity",
          OVERVIEW_FILL_OPACITY,
        );
        continue;
      }

      if (active < revealStep) {
        // Not yet reached this territory's reveal step: hold the faint overview tint + outline
        // (so the ramp to full on its reveal step starts from the tint, never a pop from 0).
        (map.getSource(`trail-${terr.key}`) as any)?.setData(
          sliceBorder(d, 0, d.total),
        );
        map.setPaintProperty(
          `fill-${terr.key}`,
          "fill-opacity",
          OVERVIEW_FILL_OPACITY,
        );
        continue;
      }

      if (active > revealStep) {
        // Already fully revealed on an earlier step (incl. the takeaway) — hold at final state.
        (map.getSource(`trail-${terr.key}`) as any)?.setData(
          sliceBorder(d, 0, d.total),
        );
        map.setPaintProperty(`fill-${terr.key}`, "fill-opacity", FILL_OPACITY);
        continue;
      }

      // active === revealStep: ramp from the faint overview tint up to full over this step's
      // MOVE phase, in lockstep with the panel. The border is already fully drawn from the
      // overview, so there is no border draw-on here — only the fill bloom from tint → full.
      const moveT = clamp01(
        phase.moveFrames > 0
          ? (frame - phase.startFrame) / phase.moveFrames
          : 1,
      );
      (map.getSource(`trail-${terr.key}`) as any)?.setData(
        sliceBorder(d, 0, d.total),
      );
      const fp = easeInOutCubic(clamp01(moveT / FILL_MOVE_FRAC));
      map.setPaintProperty(
        `fill-${terr.key}`,
        "fill-opacity",
        lerp(OVERVIEW_FILL_OPACITY, FILL_OPACITY, fp),
      );
    }

    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [model, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AbsoluteFill style={{ backgroundColor: ELECTRIC.bg }}>
      <style>{`.maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-attrib,.maptiler-logo{display:none!important}`}</style>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        geoCredit={config.geoCredit}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
        houseHue={config.brandHue ?? config.brandPalette?.[0]}
        lang={config.lang}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Scrolly prose panels — one per content step (i ≥ 2). The overview step (i === 1) is
          suppressed: its establishing shot needs no caption (it would duplicate the MapFrame
          furniture subtitle). Panels run on the draw steps (territory notes) + the takeaway. */}
      {story.steps.map((s, i) =>
        i === 0 || i === 1 ? null : (
          <ScrollyPanel
            key={s.id}
            width={width}
            height={height}
            align={s.align}
            slide={stepSlide(frame, phases, i, fps, totalFrames)}
            prose={s.prose}
            dark={dark}
          />
        ),
      )}

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
