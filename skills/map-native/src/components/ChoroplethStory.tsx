// ChoroplethStory — narrated Remotion video composition.
// Builds a beat-driven story (title → establish → reveal x N → takeaway) from deriveMapStory,
// drives the map camera deterministically per frame, and renders title card + callout + caption overlays.
// Harness pattern: delayRender → jumpTo → setData (beat change only) → setPaintProperty → idle → continueRender.

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { centroid } from "@turf/turf";
import {
  computeChoropleth,
  mainlandFeature,
  type ChoroplethData,
} from "../choropleth-geo";
import { NO_DATA_COLOR } from "../theme/colors";
import { deriveMapStory, type Beat } from "../map-story";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const NUM_BINS = 5;

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
  phases: Phase[];
  solutions: CameraSolution[];
  sortedBins: { min: number; max: number; color: string }[];
  centroidByKey: Map<string, [number, number]>;
  worldGeoJson: GeoJSON.FeatureCollection;
  joined: { key: string; value: number | null }[];
}

export const ChoroplethStory: React.FC<{
  config: ChoroplethData & {
    title?: string;
    description?: string;
    unit?: string;
    valueUnit?: string;
    insight?: string;
    source?: { name: string; url: string };
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
  const [handle] = useState(() => delayRender("choropleth-story-init"));

  // Track per-frame overlay state: projected callout position, highlight color, reveals.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    fillReveal: number;
    calloutPt: { x: number; y: number } | null;
    calloutReveal: number;
    calloutText: string;
    calloutValue: string;
    calloutColor: string;
    captionReveal: number;
  } | null>(null);

  // Ref to track last rendered beat index so we avoid setData on every frame.
  const lastBeatIndex = useRef<number>(-1);

  // Init map once — same guard pattern as ChoroplethReveal.
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
    } as Parameters<typeof maptilersdk.Map>[0] & {
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
            scaleType: "sequential",
          });

          const sortedBins = [...layout.bins].sort((a, b) => a.min - b.min);

          // Build meta + beats.
          const meta = {
            title: config.title ?? "",
            insight: config.insight ?? config.title ?? "",
            unit: config.valueUnit ?? "",
          };
          const beats = deriveMapStory(layout, worldGeoJson, "iso_a3", meta);

          // Precompute camera solutions — cameraForBounds → {center, zoom}.
          // Use mapFrame.pad so the data stays out of the title/source bands.
          const solutions: CameraSolution[] = beats.map((b) => {
            const result = m.cameraForBounds(
              b.camera as maptilersdk.LngLatBoundsLike,
              { padding: mapFrame.pad },
            );
            if (!result) return { center: [10, 20], zoom: 2 };
            return {
              center: [result.center.lng, result.center.lat],
              zoom: result.zoom,
            };
          });

          // Build timeline phases — keyed by beat kind for per-kind hold durations.
          const kinds = beats.map((b) => b.kind);
          const { phases } = buildTimeline(kinds, fps);

          // Precompute mainland centroids for callout projection.
          const centroidByKey = new Map<string, [number, number]>();
          for (const f of worldGeoJson.features) {
            const key = String(f.properties?.["iso_a3"]);
            try {
              const c = centroid(mainlandFeature(f));
              centroidByKey.set(key, [
                c.geometry.coordinates[0],
                c.geometry.coordinates[1],
              ]);
            } catch {
              // Skip features where centroid fails (e.g., null geometry).
            }
          }

          // Build the initial enriched world for beat 0.
          const initialWorld = enrichWorld(
            worldGeoJson,
            layout.joined,
            sortedBins,
            beats[0],
            "iso_a3",
          );

          // Build fill-color expression (static — color per value, same as ChoroplethReveal).
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

          // Position to beat 0 (global establish view).
          m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

          m.once("idle", () => {
            setMapState({
              map: m,
              beats,
              phases,
              solutions,
              sortedBins,
              centroidByKey,
              worldGeoJson,
              joined: layout.joined,
            });
            continueRender(handle);
          });
        })
        .catch((err) => {
          console.error("ChoroplethStory: failed to load world GeoJSON", err);
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
      phases,
      solutions,
      sortedBins,
      centroidByKey,
      worldGeoJson,
      joined,
    } = mapState;

    const h = delayRender(`story-frame-${frame}`);

    const { camera, beatIndex, fillReveal } = cameraForFrame(
      frame,
      phases,
      solutions,
    );

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // Update source data only when the beat changes.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      const enriched = enrichWorld(
        worldGeoJson,
        joined,
        sortedBins,
        beats[beatIndex],
        "iso_a3",
      );
      (map.getSource("choropleth-world") as maptilersdk.GeoJSONSource).setData(
        enriched,
      );
    }

    // Only data-bearing regions are painted. No-data regions stay unpainted
    // (opacity 0) → default MapTiler basemap, like the ocean and the symbol map.
    map.setPaintProperty("choropleth-fill", "fill-opacity", [
      "case",
      ["==", ["get", "__hasData"], false],
      0, // no-data: unpainted → default basemap
      fillReveal * 0.9, // data: driven by the beat reveal
    ] as never);

    // Compute overlay state while we still have access to map.project.
    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // Callout reveal: ease over first ~0.5s of the beat's hold.
    const holdStart = phase.startFrame + phase.moveFrames;
    const halfSecFrames = Math.max(1, Math.round(fps * 0.5));
    const calloutReveal = interpolate(
      frame,
      [holdStart, holdStart + halfSecFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // Caption reveal: same easing.
    const captionReveal = calloutReveal;

    let calloutPt: { x: number; y: number } | null = null;
    let calloutColor = "#ffffff";

    if (beat.callout) {
      const regionKey = beat.callout.region;
      const lngLat = centroidByKey.get(regionKey);
      if (lngLat) {
        const pt = map.project(lngLat as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
      }
      // Resolve the highlighted region's bin color.
      if (beat.highlight.length > 0) {
        const hKey = beat.highlight[0];
        const hJoined = joined.find((j) => j.key === hKey);
        if (hJoined?.value !== null && hJoined?.value !== undefined) {
          const binIdx = sortedBins.findIndex(
            (b, bi) =>
              (hJoined.value as number) < b.max || bi === sortedBins.length - 1,
          );
          if (binIdx >= 0) calloutColor = sortedBins[binIdx].color;
        }
      }
    }

    setOverlay({
      beatIndex,
      fillReveal,
      calloutPt,
      calloutReveal,
      calloutText: beat.callout?.text ?? "",
      calloutValue: beat.callout?.value ?? "",
      calloutColor,
      captionReveal,
    });

    map.once("idle", () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  const beat = mapState && overlay ? mapState.beats[overlay.beatIndex] : null;

  const p0 = mapState?.phases[0];
  const titleSceneEndFrame = p0
    ? p0.startFrame + p0.moveFrames + p0.holdFrames
    : 0;
  const scene = mapState
    ? resolveScene(frame, { titleSceneEndFrame })
    : { titleOpacity: 1, furnitureOpacity: 0 };

  return (
    <AbsoluteFill style={{ backgroundColor: "#f4f4f4" }}>
      {/* MapFrame: shared furniture shell — title band (top) + source band (bottom, always).
          The map div is the child; data is kept out of the bands via mapFrame.pad → cameraForBounds. */}
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

      {/* Callout overlay — projected to screen coords */}
      {overlay &&
        beat?.callout &&
        overlay.calloutPt &&
        overlay.calloutReveal > 0 && (
          <CountryLabel
            name={beat.callout.name}
            color={overlay.calloutColor}
            reveal={overlay.calloutReveal}
            x={overlay.calloutPt.x}
            y={overlay.calloutPt.y}
            value={overlay.calloutValue}
          />
        )}

      {/* Caption lower-third — only for takeaway beats (reveal beats show value via CountryLabel;
          title beat uses the full TitleCard) */}
      {overlay &&
        beat?.kind !== "title" &&
        beat?.kind !== "reveal" &&
        beat?.copy &&
        overlay.captionReveal > 0 && (
          <CaptionCard text={beat.copy} reveal={overlay.captionReveal} />
        )}

      {/* Title card — shown from frame 0, fades out as map scene begins. */}
      {scene.titleOpacity > 0 && mapState && mapState.beats[0].copy && (
        <TitleCard
          text={mapState.beats[0].copy}
          description={config.description}
          opacity={scene.titleOpacity}
        />
      )}
    </AbsoluteFill>
  );
};
