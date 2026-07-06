// ChoroplethScrolly — scrolly-as-video choropleth composition.
// Ports ChoroplethStory's map init, enrichWorld, deriveMapStory, camera solutions, and
// fill/stroke layers UNCHANGED; drives the camera per SCROLLY STEP (title → reveal x N) via a
// step timeline built from mapStoryToChapters, and renders pinned ScrollyPanels + a title scene
// instead of the callout/caption overlays.
// Harness pattern: delayRender → jumpTo → setData (step-ref change only) → setPaintProperty → idle → continueRender.

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
import { computeChoropleth, type ChoroplethData } from "../choropleth-geo";
import { NO_DATA_COLOR } from "../theme/colors";
import { deriveMapStory, type Beat } from "../map-story";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
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

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const NUM_BINS = 5;

// Slide value in [0,2] for content step i (i ≥ 1; step 0 is the title scene, no panel).
// enter over the first ENTER of the hold, exit over the last EXIT before the next step.
export function stepSlide(
  frame: number,
  phases: Phase[],
  i: number,
  fps: number,
  totalFrames: number,
): number {
  const EXIT = Math.round(0.4 * fps);
  const a = phases[i].startFrame;
  const pin = phases[i].startFrame + phases[i].moveFrames;
  const end = i + 1 < phases.length ? phases[i + 1].startFrame : totalFrames;
  const outStart = end - EXIT;
  if (frame <= pin)
    return Math.max(0, Math.min(1, (frame - a) / Math.max(1, pin - a)));
  if (frame >= outStart)
    return (
      1 +
      Math.max(0, Math.min(1, (frame - outStart) / Math.max(1, end - outStart)))
    );
  return 1;
}

// Enriched GeoJSON world — adds __highlight, __value, __hasData, __binIdx.
function enrichWorld(
  worldGeoJson: GeoJSON.FeatureCollection,
  joined: { key: string; value: number | null }[],
  sortedBins: { min: number; max: number; color: string }[],
  beat: Beat,
  joinKey: string,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: worldGeoJson.features.map((f, i) => {
      const key = String(f.properties?.[joinKey]);
      const j = joined[i];
      const binIdx =
        j.value !== null
          ? sortedBins.findIndex(
              (b, bi) => j.value! < b.max || bi === sortedBins.length - 1,
            )
          : -1;
      const isHighlight = beat.highlight.includes(key) ? 1 : 0;
      return {
        ...f,
        properties: {
          ...f.properties,
          __value: j.value,
          __hasData: j.value !== null,
          __binIdx: binIdx,
          __highlight: isHighlight,
        },
      };
    }),
  };
}

interface MapStory {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  story: ScrollyStory;
  phases: Phase[];
  stepSolutions: CameraSolution[];
  sortedBins: { min: number; max: number; color: string }[];
  worldGeoJson: GeoJSON.FeatureCollection;
  joined: { key: string; value: number | null }[];
}

export const ChoroplethScrolly: React.FC<{
  config: ChoroplethData & {
    title?: string;
    description?: string;
    unit?: string;
    valueUnit?: string;
    insight?: string;
    source?: { name: string; url: string };
    scaleType?: "sequential" | "diverging";
    palette?: string | string[];
    valueKind?: "temporal" | "magnitude" | "categorical";
  };
}> = ({ config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
  });
  const [mapState, setMapState] = useState<MapStory | null>(null);
  const [handle] = useState(() => delayRender("choropleth-scrolly-init"));

  // Ref to track last rendered step-ref beat index so we avoid setData on every frame.
  const lastBeatIndex = useRef<number>(-1);

  // Init map once — same guard pattern as ChoroplethStory.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const m = new maptilersdk.Map({
      container: ref.current,
      style: maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [10, 20] as [number, number],
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
      // Strip symbol layers (labels).
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") m.removeLayer(layer.id);
      }

      fetch(staticFile("geo/world.geojson"))
        .then((r) => r.json())
        .then((worldGeoJson: GeoJSON.FeatureCollection) => {
          // Compute choropleth layout.
          const layout = computeChoropleth(config, worldGeoJson, "iso_a3", {
            bins: NUM_BINS,
            scaleType: config.scaleType ?? "sequential",
            palette: config.palette,
          });

          const sortedBins = [...layout.bins].sort((a, b) => a.min - b.min);

          // Build meta + beats.
          const meta = {
            title: config.title ?? "",
            insight: config.insight ?? config.title ?? "",
            unit: config.valueUnit ?? "",
            valueField: config.valueField,
            narrativePattern: config.valueKind,
          };
          const beats = deriveMapStory(layout, worldGeoJson, "iso_a3", meta);

          // Precompute camera solutions — cameraForBounds → {center, zoom}.
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

          // Delta 1: build the scrolly story and step timeline.
          const story = mapStoryToChapters(beats, {
            title: config.title ?? "",
            description: config.description,
            source: config.source,
            regionsWithData: layout.joined.filter((j) => j.value !== null)
              .length,
          });
          // Step camera solutions: each step flies to its ref beat's camera.
          const stepKinds = story.steps.map((_, i) =>
            i === 0 ? "title" : "reveal",
          );
          const { phases } = buildTimeline(stepKinds, fps);
          const stepSolutions = story.steps.map(
            (s) => solutions[s.ref as number],
          );

          // Build the initial enriched world for step 0's ref beat.
          const initialWorld = enrichWorld(
            worldGeoJson,
            layout.joined,
            sortedBins,
            beats[story.steps[0].ref as number],
            "iso_a3",
          );

          // Build fill-color expression (static — color per value).
          const colorExpr: unknown[] = [
            "case",
            ["==", ["get", "__hasData"], false],
            NO_DATA_COLOR,
          ];
          for (let i = 0; i < sortedBins.length - 1; i++) {
            colorExpr.push(["<", ["get", "__value"], sortedBins[i].max]);
            colorExpr.push(sortedBins[i].color);
          }
          colorExpr.push(sortedBins[sortedBins.length - 1].color);

          m.addSource("choropleth-world", {
            type: "geojson",
            data: initialWorld,
          });

          m.addLayer({
            id: "choropleth-fill",
            type: "fill",
            source: "choropleth-world",
            paint: {
              "fill-color": colorExpr as never,
              "fill-opacity": 0, // start blank
            },
          });

          m.addLayer({
            id: "choropleth-stroke",
            type: "line",
            source: "choropleth-world",
            paint: {
              "line-color": "#ffffff",
              "line-width": 0.5,
              "line-opacity": 0.6,
            },
          });

          // Highlight stroke — data-driven width means no per-frame setPaintProperty needed.
          m.addLayer({
            id: "choropleth-highlight-stroke",
            type: "line",
            source: "choropleth-world",
            paint: {
              "line-width": [
                "case",
                ["==", ["get", "__highlight"], 1],
                2.5,
                0,
              ] as never,
              "line-color": "#1a1a1a",
              "line-opacity": 0.9,
            },
          });

          // Position to step 0's camera.
          m.jumpTo({
            center: stepSolutions[0].center,
            zoom: stepSolutions[0].zoom,
          });

          m.once("idle", () => {
            setMapState({
              map: m,
              beats,
              story,
              phases,
              stepSolutions,
              sortedBins,
              worldGeoJson,
              joined: layout.joined,
            });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("ChoroplethScrolly: failed to load world GeoJSON", err);
          continueRender(handle);
        });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const {
      map,
      beats,
      story,
      phases,
      stepSolutions,
      sortedBins,
      worldGeoJson,
      joined,
    } = mapState;

    const h = delayRender(`choropleth-scrolly-frame-${frame}`);

    const total = scrollyFrames(story.steps.length, fps);

    // Delta 2: drive the camera on the STEP timeline.
    const { camera, beatIndex, fillReveal } = cameraForFrame(
      frame,
      phases,
      stepSolutions,
    );

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // The step's ref is the beat index for enrichWorld highlight.
    const refBeatIndex = story.steps[beatIndex].ref as number;

    // Update source data only when the step's ref beat changes.
    if (refBeatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = refBeatIndex;
      const enriched = enrichWorld(
        worldGeoJson,
        joined,
        sortedBins,
        beats[refBeatIndex],
        "iso_a3",
      );
      (map.getSource("choropleth-world") as maptilersdk.GeoJSONSource).setData(
        enriched,
      );
    }

    // Only data-bearing regions are painted. No-data regions stay unpainted.
    // The base fill for ALL data regions stays painted (so the OVERVIEW/TAKEAWAY
    // steps show everything).
    map.setPaintProperty("choropleth-fill", "fill-opacity", [
      "case",
      ["==", ["get", "__hasData"], false],
      0,
      fillReveal * 0.9,
    ] as never);

    // Change #3 — sync the reveal's highlight to its panel slide-in.
    // dataReveal ramps 0→1 across the current step's panel move phase (clamp01 of
    // stepSlide, which pins at 1 during hold and exceeds 1 on exit). The establish
    // (OVERVIEW) and takeaway steps carry no highlight (highlight = []), so this only
    // affects the reveal steps; there the highlight stroke fades in exactly as the
    // panel slides in, instead of switching on instantly at the beat change.
    const dataReveal = Math.max(
      0,
      Math.min(1, stepSlide(frame, phases, beatIndex, fps, total)),
    );
    map.setPaintProperty("choropleth-highlight-stroke", "line-width", [
      "case",
      ["==", ["get", "__highlight"], 1],
      2.5 * dataReveal,
      0,
    ] as never);
    map.setPaintProperty(
      "choropleth-highlight-stroke",
      "line-opacity",
      0.9 * dataReveal,
    );

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delta 3: scrolly panels + title scene.
  const total = scrollyFrames(mapState?.story.steps.length ?? 2, fps);
  const scene = resolveScene(frame, { titleSceneEndFrame: TITLE_SCENE_FRAMES });

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={config.source ?? { name: "" }}
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

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
