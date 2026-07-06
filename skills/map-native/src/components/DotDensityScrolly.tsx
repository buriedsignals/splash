// DotDensityScrolly — scrolly-as-video dot-density composition.
// Ports LocatorScrolly's step timeline (title → reveal x N), pinned ScrollyPanels, and per-step
// camera solutions driven by mapStoryToChapters; renders the dot-build + legend treatment of
// DotDensityStory (uniform circle-radius 2 NEVER value-scaled, colour by group, mapStyle-adaptive,
// category legend when multivariate, dots tagged __region). Two regimes come from computeDotDensity:
// univariate (single colour) or multivariate (category colours + legend swatches).
// Per-step dim-emphasis: on a reveal step the dots whose __region isn't the highlighted key dim to
// ~0.25, synced to the panel slide-in (reuse LocatorScrolly's synced approach + __region expression).
// Establish (overview) + takeaway render NO panel and keep all dots full.
// Harness pattern: delayRender → jumpTo → setPaintProperty (dim by step) → idle → continueRender.

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { computeDotDensity } from "../dot-density-geo";
import { scatterInPolygon } from "../dot-scatter";
import { deriveDotDensityStory } from "../dot-density-story";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import type { Beat } from "../map-story";
import type { DotDensityConfigShape } from "../validate-config";
import { TitleCard } from "./StoryCards";
import { ScrollyPanel } from "./ScrollyPanel";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene, TITLE_SCENE_FRAMES } from "../video-scene";
import {
  mapStoryToChapters,
  type ScrollyStory,
} from "../../../scrolly/src/chapters";
import { scrollyFrames } from "../route-story";
import { stepSlide } from "./ChoroplethScrolly";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 2; // FIXED — uniform dot size, NEVER value-scaled
const DOT_LAYER = "dot-density-dots";
const OUTLINE_LAYER = "dot-density-outline";
const JOIN_KEY = "iso_a3";
const DIM_OPACITY = 0.25; // non-highlighted regions during a reveal step

interface DDLegend {
  hasCategories: boolean;
  dotValue: number;
  legend: { category: string; color: string }[];
}

interface DotScrollyState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
}

export const DotDensityScrolly: React.FC<{ config: DotDensityConfigShape }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  const outlineColor = dark ? "#5a5a63" : "#9aa0a6";

  const legendRows =
    1 + (config.categories?.length ? config.categories.length : 0);
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: legendRows * 18 + 18,
  });

  const [mapState, setMapState] = useState<DotScrollyState | null>(null);
  const [legendState, setLegendState] = useState<DDLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("dot-density-scrolly-init", { timeoutInMilliseconds: 120000 }),
  );

  // Ref to track the last rendered step-ref beat index so we avoid setPaintProperty every frame.
  const lastRefBeatIndex = useRef<number>(-1);

  // Init map once.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;

    const m = new maptilersdk.Map({
      container: ref.current,
      style,
      center: [10, 30] as [number, number],
      zoom: 2,
      interactive: false,
      attributionControl: false,
      navigationControl: false,
      geolocateControl: false,
      maptilerLogo: false,
      fadeDuration: 0,
      canvasContextAttributes: { preserveDrawingBuffer: true },
    } as ConstructorParameters<typeof maptilersdk.Map>[0] & {
      canvasContextAttributes: unknown;
    });

    m.on("load", () => {
      // Strip symbol / place-label clutter so dots read cleanly.
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") m.removeLayer(layer.id);
      }

      fetch(staticFile("geo/world.geojson"))
        .then((r) => r.json())
        .then((world: GeoJSON.FeatureCollection) => {
          const layout = computeDotDensity(config, world, JOIN_KEY);

          // Build the DOT GeoJSON once — one Point per dot, coloured by group, TAGGED with
          // __region = the region key so a reveal step can dim non-highlighted regions.
          const dotFeatures: GeoJSON.Feature[] = [];
          for (const region of layout.regions) {
            for (const group of region.groups) {
              const pts = scatterInPolygon(
                region.feature,
                group.count,
                group.seed,
              );
              for (const [lon, lat] of pts) {
                dotFeatures.push({
                  type: "Feature",
                  properties: { color: group.color, __region: region.key },
                  geometry: { type: "Point", coordinates: [lon, lat] },
                });
              }
            }
          }

          const regionGeoJson: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: layout.regions.map((r) => r.feature),
          };

          m.addSource("dot-density-region-src", {
            type: "geojson",
            data: regionGeoJson,
          });
          m.addSource("dot-density-dot-src", {
            type: "geojson",
            data: { type: "FeatureCollection", features: dotFeatures },
          });

          m.addLayer({
            id: OUTLINE_LAYER,
            type: "line",
            source: "dot-density-region-src",
            paint: {
              "line-color": outlineColor,
              "line-width": 0.6,
              "line-opacity": 0.5,
            },
          });

          // Dot layer — FIXED radius, colour by group. Opacity starts full (establish step).
          m.addLayer({
            id: DOT_LAYER,
            type: "circle",
            source: "dot-density-dot-src",
            paint: {
              "circle-radius": DOT_RADIUS_PX,
              "circle-color": ["get", "color"],
              "circle-opacity": 1,
              "circle-stroke-width": 0.3,
              "circle-stroke-color": dark
                ? "rgba(0,0,0,0.4)"
                : "rgba(0,0,0,0.15)",
              "circle-stroke-opacity": 1,
            },
          });

          // Build beats from the layout — title → establish → densest reveals → takeaway.
          const meta = {
            title: config.title ?? "",
            description: config.description,
            insight:
              ((config as Record<string, unknown>).insight as string) ??
              config.title ??
              "",
            unit:
              ((config as Record<string, unknown>).valueUnit as string) ?? "",
          };
          const beats = deriveDotDensityStory(layout, meta);

          // Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox, padded.
          const solutions: CameraSolution[] = beats.map((b) => {
            const result = m.cameraForBounds(
              b.camera as maptilersdk.LngLatBoundsLike,
              { padding: mapFrame.pad },
            );
            if (!result || !result.center) return { center: [10, 20], zoom: 2 };
            const c = maptilersdk.LngLat.convert(result.center);
            return {
              center: [c.lng, c.lat],
              zoom: result.zoom ?? 2,
            };
          });

          // Build the scrolly story and step timeline (step 0 = title, rest = reveal).
          const story = mapStoryToChapters(beats, {
            title: config.title ?? "",
            description: config.description,
            source: config.source
          ? { name: config.source.name ?? "", url: config.source.url }
          : undefined,
            regionsWithData: layout.regions.length,
          });
          const stepKinds = story.steps.map((_, i) =>
            i === 0 ? "title" : "reveal",
          );
          const { phases } = buildTimeline(stepKinds, fps);
          const stepSolutions = story.steps.map(
            (s) => solutions[s.ref as number],
          );

          m.jumpTo({
            center: stepSolutions[0].center,
            zoom: stepSolutions[0].zoom,
          });

          setLegendState({
            hasCategories: layout.hasCategories,
            dotValue: layout.dotValue,
            legend: layout.legend,
          });

          m.once("idle", () => {
            setMapState({ map: m, beats, story, phases, stepSolutions });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("DotDensityScrolly: failed to load world GeoJSON", err);
          continueRender(handle);
        });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, story, phases, stepSolutions } = mapState;

    const h = delayRender(`dot-density-scrolly-frame-${frame}`);

    const total = scrollyFrames(story.steps.length, fps);

    // Drive the camera on the STEP timeline.
    const { camera, beatIndex } = cameraForFrame(frame, phases, stepSolutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // The step's ref is the beat index for the dim-emphasis.
    const refBeatIndex = story.steps[beatIndex].ref as number;
    const refBeat = beats[refBeatIndex];
    const emphasise = refBeat.dim && refBeat.highlight.length > 0;

    // Sync the reveal's dim-emphasis to its panel slide-in. dataReveal ramps 0→1 across the
    // current step's panel move phase (clamp01 of stepSlide). Establish (overview) and takeaway
    // steps carry no highlight, so all dots stay full; on a reveal step the non-highlighted
    // regions' dots dim toward DIM_OPACITY exactly as the panel slides in.
    const dataReveal = Math.max(
      0,
      Math.min(1, stepSlide(frame, phases, beatIndex, fps, total)),
    );

    // Rebuild the opacity expression only on step-ref change OR while the emphasis is ramping,
    // so the dim tracks the panel. Off a reveal step, all dots full.
    if (emphasise) {
      lastRefBeatIndex.current = refBeatIndex;
      const highlightKey = refBeat.highlight[0];
      // dim = 1 → DIM_OPACITY as the panel slides in; highlighted region stays full.
      const dimNow = 1 - (1 - DIM_OPACITY) * dataReveal;
      const opacityExpr = [
        "case",
        ["==", ["get", "__region"], highlightKey],
        1,
        dimNow,
      ];
      map.setPaintProperty(DOT_LAYER, "circle-opacity", opacityExpr as never);
      map.setPaintProperty(
        DOT_LAYER,
        "circle-stroke-opacity",
        opacityExpr as never,
      );
    } else if (refBeatIndex !== lastRefBeatIndex.current) {
      lastRefBeatIndex.current = refBeatIndex;
      map.setPaintProperty(DOT_LAYER, "circle-opacity", 1);
      map.setPaintProperty(DOT_LAYER, "circle-stroke-opacity", 1);
    }

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — "1 dot = N" always; category swatches when multivariate.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const dotN = legendState.dotValue.toLocaleString();
    const header = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${legendState.hasCategories ? 8 : 0}px">
        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dark ? "#e8e8ec" : "#2171b5"};flex-shrink:0"></span>
        <span style="font:600 11px/1.2 sans-serif;color:${ink}">1 dot = ${dotN}</span>
      </div>`;
    const swatches = legendState.hasCategories
      ? legendState.legend
          .map(
            (l) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${l.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${l.category}</span>
        </div>`,
          )
          .join("")
      : "";
    el.innerHTML = header + swatches;
  }, [dark, legendState]);

  // Scrolly panels + title scene.
  const total = scrollyFrames(mapState?.story.steps.length ?? 2, fps);
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={{ name: config.source?.name ?? "", url: config.source?.url }}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Legend — bottom-right, fades in with the furniture */}
      <div
        ref={legendRef}
        data-testid="map-legend"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 10,
          background: dark ? "rgba(24,24,27,0.88)" : "rgba(255,255,255,0.92)",
          padding: "10px 12px",
          borderRadius: 6,
          boxShadow: "0 1px 6px rgba(0,0,0,.12)",
          minWidth: 110,
          opacity: scene.furnitureOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Pinned ScrollyPanel per REVEAL step; overview (establish) + takeaway render no panel. */}
      {mapState &&
        mapState.story.steps.map((s, i) =>
          mapState.beats[s.ref as number].kind !== "reveal" ? null : (
            <ScrollyPanel
              key={s.id}
              width={width}
              height={height}
              align={s.align}
              slide={stepSlide(frame, mapState.phases, i, fps, total)}
              prose={s.prose}
              dark={dark}
            />
          ),
        )}

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
