// HexGridStory — beat-driven guided camera tour for the hex-grid map.
// Ports CartogramStory, with hex-grid deltas:
//   1. Beats from beatsForMode(deriveHexGridStory(computeHexGrid(config), meta), mode) — title →
//      establish → reveal the HIGHEST cells (by aggregate, descending) → takeaway. `beatsForMode`
//      drops the establish beat in `sequential` (dead air on an empty map).
//   2. Same cell-build as HexGridReveal (fill-color by __color), but each cell feature is TAGGED
//      with __cellIdx = its index (string) so a reveal beat can dim non-highlighted cells via a
//      data-driven expression.
//   3. On a `reveal` beat (highlight = [cellIdx]) the fill-opacity is data-driven: full (0.8) for
//      __cellIdx === highlightKey, dimmed (~0.2) otherwise. On title/establish/takeaway (empty
//      highlight) all cells use full opacity (0.8) — `context` mode only. In `sequential` mode
//      the base cell layer stays at 0 for the whole distribution; each subject's own bloom layer
//      (below) carries its full entrance instead.
//   4. Camera flies per beat via buildTimeline/cameraForFrame (jumpTo, never flyTo). Per-subject
//      entrance — border trail draws on, fill blooms — via the shared areal choreography
//      (story-choreography.ts), same fluid interwoven envelope as ChoroplethStory/CartogramStory.
//      A projected CountryLabel (cell centroid — hex/square grid cells are always convex, so a
//      centroid is safe here, unlike the cartogram's `scaled` variant coastlines) carries the
//      rank descriptor + value (value includes the config's valueUnit when set — never a fake
//      place name, cells are anonymous grid bins); CaptionCard(beat.copy) still carries the
//      fuller rank/value/shape sentence.
//   5. Sequential bin legend; title scene via resolveScene.
// Harness:
//   delayRender → build cells (+__cellIdx) + beats + entrance layers + jumpTo beat 0 → idle →
//   continueRender
//   per-frame: delayRender → jumpTo → per-subject staged entrance → setPaintProperty(dim by
//   beat) → project label anchor → caption/label overlay → idle → continueRender

import React, { useEffect, useRef, useState } from "react";
import {
  AbsoluteFill,
  continueRender,
  delayRender,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import * as maptilersdk from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { centroid } from "@turf/turf";
import { continueWhenMapSettles } from "../core/frame-ready";
import { computeHexGrid, type HexCell } from "../hex-grid-geo";
import { deriveHexGridStory } from "../hex-grid-story";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { resolveRevealMode, beatsForMode, type Beat } from "../map-story";
import type { HexGridConfigShape } from "../validate-config";
import { triggerFrameByRegion } from "../story-triggers";
import {
  AREAL_TIMELINE_OPTS,
  stagedByKey,
  addSubjectEmphasisLayers,
} from "../story-choreography";
import {
  buildDraw,
  sliceBorder,
  EMPTY_FEATURE,
  type DrawEntry,
} from "../core/border-slice";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame } from "../core/map-format";
import { fmtBin } from "../core/legend-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const CELL_LAYER = "hex-grid-cells";
const OUTLINE_LAYER = "hex-grid-outline";
const NUM_BINS = 5;
// Opacity for the un-highlighted cells during a reveal beat.
const DIM_OPACITY = 0.2;
// Full opacity cap for cells — mirrors HexGridReveal.
const FULL_OPACITY = 0.8;

interface HGLegend {
  bins: { min: number; max: number; color: string }[];
  aggregateLabel: string;
}

interface HGStoryMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
  triggers: Map<string, number>;
  borderByKey: Map<string, DrawEntry>;
  anchorByKey: Map<string, [number, number]>;
  cellById: Map<string, HexCell>;
}

export const HexGridStory: React.FC<{ config: HexGridConfigShape }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const mode = resolveRevealMode(config);
  const bg = dark ? "#0e0f12" : "#f4f4f4";
  const outlineColor = dark ? "#1c1c1f" : "#ffffff";

  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 24,
    legendHeight: NUM_BINS * 18 + 18,
  });

  const [mapState, setMapState] = useState<HGStoryMapState | null>(null);
  const [legendState, setLegendState] = useState<HGLegend | null>(null);
  const [handle] = useState(() =>
    delayRender("hex-grid-story-init", { timeoutInMilliseconds: 120000 }),
  );

  // Per-frame overlay: caption reveal ramp + the active subject's projected label state.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    captionReveal: number;
    calloutPt: { x: number; y: number } | null;
    calloutColor: string;
    calloutValue: string;
    labelReveal: number;
  } | null>(null);

  const lastBeatIndex = useRef<number>(-1);

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
      center: [10, 50] as [number, number],
      zoom: 3,
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
      // Strip symbol / place-label clutter so cells read cleanly.
      const layers = m.getStyle()?.layers ?? [];
      for (const layer of layers) {
        if (layer.type === "symbol") m.removeLayer(layer.id);
      }

      // Build the cell GeoJSON once. Each feature is tagged with __cellIdx = string index
      // so a reveal beat can dim non-highlighted cells via a data-driven expression.
      const layout = computeHexGrid(config);

      const cellFeatures: GeoJSON.Feature[] = layout.cells.map((cell, idx) => ({
        type: "Feature",
        properties: {
          __color: cell.color,
          __count: cell.count,
          __value: cell.value,
          __cellIdx: String(idx),
        },
        geometry: cell.feature.geometry,
      }));
      const cellGeoJson: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: cellFeatures,
      };

      m.addSource("hex-grid-cell-src", {
        type: "geojson",
        data: cellGeoJson,
      });

      // Cell fill — coloured by bin. Opacity starts full (establish beat 0).
      m.addLayer({
        id: CELL_LAYER,
        type: "fill",
        source: "hex-grid-cell-src",
        paint: {
          "fill-color": ["get", "__color"] as never,
          "fill-opacity": FULL_OPACITY,
        },
      });

      // Thin cell outline for tessellation legibility.
      m.addLayer({
        id: OUTLINE_LAYER,
        type: "line",
        source: "hex-grid-cell-src",
        paint: {
          "line-color": outlineColor,
          "line-width": 0.6,
          "line-opacity": 0.5,
        },
      });

      // Derive beats — title → establish → highest-cell reveals → takeaway. `beatsForMode`
      // drops the establish beat in `sequential` (dead air on an empty map) — shared rule
      // with Root.tsx's duration calc so the video length matches the animation.
      const meta = {
        title: config.title ?? "",
        description: config.description,
        insight:
          ((config as Record<string, unknown>).insight as string) ??
          config.title ??
          "",
        lang: config.lang,
        arcBeats: config.arcBeats,
      };
      const beats = beatsForMode(deriveHexGridStory(layout, meta), mode);

      // Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox.
      const solutions: CameraSolution[] = beats.map((b) => {
        const result = m.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          { padding: mapFrame.pad },
        );
        if (!result || !result.center) return { center: [10, 50], zoom: 4 };
        const c = maptilersdk.LngLat.convert(result.center);
        return {
          center: [c.lng, c.lat],
          zoom: result.zoom ?? 2,
        };
      });

      // Build timeline phases — same fluid interwoven envelope as ChoroplethStory/CartogramStory.
      const kinds = beats.map((b) => b.kind);
      const { phases } = buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS);

      // Cells are hex/square GRID cells (turf hexGrid/squareGrid) — always convex Polygons,
      // unlike the cartogram's `scaled` variant (a scaled copy of a real, often-concave
      // coastline). A centroid never falls outside a convex hexagon, so no pole-of-
      // inaccessibility is needed here. Only build border/anchor entries for the FEW cells a
      // reveal beat actually visits (triggerFrameByRegion keys are exactly the beats'
      // highlight values), never the whole cell set.
      const triggers = triggerFrameByRegion(beats, phases);
      const cellById = new Map(
        layout.cells.map((cell, idx) => [String(idx), cell]),
      );
      const borderByKey = new Map<string, DrawEntry>();
      const anchorByKey = new Map<string, [number, number]>();
      for (const key of triggers.keys()) {
        const cell = cellById.get(key);
        if (!cell || cell.feature.geometry.type !== "Polygon") continue;
        borderByKey.set(key, buildDraw([cell.feature.geometry.coordinates[0]]));
        try {
          const c = centroid(cell.feature as GeoJSON.Feature<GeoJSON.Polygon>)
            .geometry.coordinates as [number, number];
          anchorByKey.set(key, c);
        } catch {
          // Skip a subject where the centroid computation fails (e.g., degenerate geometry).
        }
      }

      // Per-subject emphasis: border trail (draws on) + fill bloom (brief overshoot on top
      // of the base fill) — one dedicated source+layer pair per reveal-beat cell, staged
      // over the beat's own entrance window (shared areal-story-choreography core).
      addSubjectEmphasisLayers(m, [...triggers.keys()], {
        idPrefix: "hex",
        featureFor: (key) => cellById.get(key)?.feature ?? EMPTY_FEATURE,
        colorFor: (key) => cellById.get(key)?.color ?? "#999999",
        dark,
      });

      m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

      setLegendState({
        bins: layout.bins,
        aggregateLabel: layout.aggregateLabel,
      });

      continueWhenMapSettles(m, () => {
        setMapState({
          map: m,
          beats,
          phases,
          solutions,
          triggers,
          borderByKey,
          anchorByKey,
          cellById,
        });
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
      triggers,
      borderByKey,
      anchorByKey,
      cellById,
    } = mapState;

    const h = delayRender(`hex-grid-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    // Per-subject entrance — each cell's border trail draws on, then its fill blooms with a
    // transient overshoot, over the first ~2.5-4.2s since its reveal beat's own trigger frame.
    // Staged per key once, reused below for the label's rise. fillTarget = FULL_OPACITY so a
    // bloom's overshoot matches the cell's own painted opacity, same as ChoroplethStory.
    const stagedMap = stagedByKey(triggers, frame, fps, FULL_OPACITY);
    for (const key of triggers.keys()) {
      const staged = stagedMap.get(key)!;

      const d = borderByKey.get(key);
      if (d) {
        (
          map.getSource(`hex-trail-${key}`) as maptilersdk.GeoJSONSource
        ).setData(
          staged.borderProgress <= 0
            ? EMPTY_FEATURE
            : sliceBorder(d, 0, d.total * staged.borderProgress),
        );
      }

      if (mode === "context") {
        // Transient overshoot delta only — the base hex-grid-cells opacity below is left
        // untouched (its own dim/highlight expression), so this is a brief brightening on
        // top, never a drop-to-zero. `fillBloom` IS that delta, computed from the raw
        // envelope in the helper (see staged-reveal.ts).
        map.setPaintProperty(
          `hex-bloom-${key}`,
          "fill-opacity",
          staged.fillBloom,
        );
      } else {
        // sequential: the bloom layer carries the FULL entrance (0 → overshoot → FULL_OPACITY,
        // holds) since the base hex-grid-cells layer is pinned to 0 for the whole distribution.
        map.setPaintProperty(
          `hex-bloom-${key}`,
          "fill-opacity",
          staged.fillOpacity,
        );
      }
    }

    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    // Base hex-grid-cells opacity — branches on revealMode (never both in one frame):
    //  - context: on beat change, dim every cell whose __cellIdx isn't the highlighted one via
    //    a data-driven expression (unchanged prior behaviour); otherwise all cells at full
    //    opacity.
    //  - sequential: nothing lit from establish — every subject's own bloom layer (above)
    //    carries its full entrance instead.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      if (mode === "sequential") {
        map.setPaintProperty(CELL_LAYER, "fill-opacity", 0);
      } else {
        const emphasise = beat.dim && beat.highlight.length > 0;
        if (emphasise) {
          const highlightKey = beat.highlight[0];
          const opacityExpr = [
            "case",
            ["==", ["get", "__cellIdx"], highlightKey],
            FULL_OPACITY,
            DIM_OPACITY,
          ];
          map.setPaintProperty(
            CELL_LAYER,
            "fill-opacity",
            opacityExpr as never,
          );
        } else {
          map.setPaintProperty(CELL_LAYER, "fill-opacity", FULL_OPACITY);
        }
      }
    }

    // Caption reveal: ease over first ~0.5s of the beat's hold.
    const holdStart = phase.startFrame + phase.moveFrames;
    const halfSecFrames = Math.max(1, Math.round(fps * 0.5));
    const captionReveal = interpolate(
      frame,
      [holdStart, holdStart + halfSecFrames],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );

    // Projected label overlay — the beat's subject cell, staged label-rise driven by the same
    // entrance envelope as its border/bloom. Falls back to the 0.5s captionReveal ease if this
    // callout's cell has no trigger (shouldn't happen: every reveal-beat callout region has one,
    // see triggerFrameByRegion).
    let calloutPt: { x: number; y: number } | null = null;
    let calloutColor = "#ffffff";
    let labelReveal = captionReveal;

    if (beat.callout) {
      const regionKey = beat.callout.region;
      const lngLat = anchorByKey.get(regionKey);
      if (lngLat) {
        const pt = map.project(lngLat as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
      }
      const staged = stagedMap.get(regionKey);
      if (staged) labelReveal = staged.labelReveal;
      const cell = cellById.get(regionKey);
      if (cell) calloutColor = cell.color;
    }

    setOverlay({
      beatIndex,
      captionReveal,
      calloutPt,
      calloutColor,
      calloutValue: beat.callout?.value ?? "",
      labelReveal,
    });

    continueWhenMapSettles(map, () => continueRender(h));
    map.triggerRepaint();
  }, [mapState, frame]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legend — sequential bin scale (swatch + min–max) + aggregate label. Never a size legend.
  useEffect(() => {
    const el = legendRef.current;
    if (!el || !legendState) return;
    const ink = dark ? "#f4f4f5" : "#444";
    const sub = dark ? "#c8c8cf" : "#555";
    const header = `
      <div style="font:600 11px/1.2 sans-serif;color:${ink};margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em">
        ${legendState.aggregateLabel}
      </div>`;
    const swatches = legendState.bins
      .map(
        (b) => `
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border-radius:2px;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex-shrink:0"></span>
          <span style="font:11px/1.2 sans-serif;color:${sub}">${fmtBin(b.min, { lang: config.lang })}–${fmtBin(b.max, { lang: config.lang })}</span>
        </div>`,
      )
      .join("");
    el.innerHTML = header + swatches;
  }, [dark, legendState]);

  const beat = mapState && overlay ? mapState.beats[overlay.beatIndex] : null;

  const p0 = mapState?.phases[0];
  const titleSceneEndFrame = p0
    ? p0.startFrame + p0.moveFrames + p0.holdFrames
    : 0;
  const scene = mapState
    ? resolveScene(frame, { titleSceneEndFrame })
    : { titleOpacity: 1, furnitureOpacity: 0 };

  return (
    <AbsoluteFill style={{ backgroundColor: bg }}>
      <MapFrame
        title={config.title ?? ""}
        description={config.description}
        source={{ name: config.source?.name ?? "", url: config.source?.url }}
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
          minWidth: 120,
          opacity: scene.furnitureOpacity,
          pointerEvents: "none",
        }}
      />

      {/* Projected on-map label — the beat's subject cell, rank descriptor + value, staged rise.
          Never a fake place name: cells are anonymous grid bins, so `name` is the rank
          descriptor ("the densest", "#3"…), same as the caption below. */}
      {overlay &&
        beat?.callout &&
        overlay.calloutPt &&
        overlay.labelReveal > 0 && (
          <CountryLabel
            name={beat.callout.name}
            color={overlay.calloutColor}
            reveal={overlay.labelReveal}
            x={overlay.calloutPt.x}
            y={overlay.calloutPt.y}
            value={overlay.calloutValue}
          />
        )}

      {/* Caption lower-third — only for takeaway beats (reveal beats show the value via the
          central CountryLabel; title beat uses the full TitleCard) */}
      {overlay &&
        beat?.kind !== "title" &&
        // ★ AN AUTHORED REVEAL SHOWS ITS SENTENCE. A derived reveal's `copy` restates what the
        // map already writes on itself (the region's name and value), so a card would duplicate
        // it — that is why reveals were excluded. But a CONFIRMED walk's copy is the
        // journalist's own claim, and excluding it meant the guided tour demanded nine sentences
        // and displayed none of them. Measured on Rémy's own run, 2026-08-06: "La visite guidée
        // n'affiche pas les phrases que tu as validées." The `authored` flag has existed on the
        // beat since applyMapArc was written, documented at length — and no component read it.
        (beat?.kind !== "reveal" || beat?.authored) &&
        beat?.copy &&
        overlay.captionReveal > 0 && (
          <CaptionCard text={beat.copy} reveal={overlay.captionReveal} />
        )}

      {/* Title card — shown from frame 0, fades out as the map scene begins. */}
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
