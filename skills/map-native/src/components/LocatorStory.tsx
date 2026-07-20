// LocatorStory — beat-driven guided camera tour for the locator / markers map.
// Ports SymbolStory, with locator deltas:
//   1. beats from beatsForMode(deriveLocatorStory(config.markers, meta), mode) — per-place
//      (few) / per-category (many)
//   2. uniform dot glyph, colour by category, mapStyle-adaptive (never value-scaled, never size
//      legend) — but EACH marker's own entrance (radius grow + opacity fade + label rise) is its
//      OWN staged-entrance envelope, keyed on a per-marker trigger frame (markTriggerFrames), the
//      SAME point-comp pattern SymbolStory uses. The `__highlight` dim-the-rest tour (recomputed
//      per beat, declutter via placeLabels) stays a SEPARATE multiplier on top of the entrance.
//   3. context: every marker establishes TOGETHER (shared establish trigger) + keeps the
//      dim/highlight tour; sequential: markers appear one-by-one (few-annotated) or
//      category-by-category (categorized) at their own reveal beat's start frame.
//   4. category legend when the config has categories (reuse locatorGeometry.legend)
// Structure mirrors SymbolStory:
//   delayRender → on load build beats/timeline/triggers FIRST → add source/layers → jumpTo beat 0
//     → idle → continueRender
//   per-frame: delayRender → jumpTo → (on beat change) recompute highlight+declutter → per-marker
//     staged entrance (ONE setData) → caption overlay state → idle → continueRender

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
import { continueWhenMapSettles } from "../core/frame-ready";
import { locatorGeometry } from "../locator-geo";
import {
  deriveLocatorStory,
  revealTriggersByLabel,
  markTriggerFrames,
} from "../locator-story";
import {
  placeLabels,
  labelRadialOffset,
  type LabelBox,
} from "../locator-labels";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { resolveRevealMode, beatsForMode, type Beat } from "../map-story";
import {
  AREAL_TIMELINE_OPTS,
  AREAL_BORDER_S,
  AREAL_FILL_S,
  AREAL_FILL_START_S,
  AREAL_LABEL_S,
  AREAL_LABEL_START_S,
} from "../story-choreography";
import { stagedEntrance } from "../core/staged-reveal";
import type { LocatorConfigShape } from "../validate-config";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

const DOT_RADIUS_PX = 6; // FIXED — uniform marker settled size, never value-scaled
const MARKER_STROKE = "#ffffff";
const GLYPH_LAYER = "locator-glyphs";
const LABEL_LAYER = "locator-labels";
const DIM_OPACITY = 0.25; // non-highlighted markers during a reveal beat (context mode)

// Per-feature properties carried on the `locator` GeoJSON source — the declutter-driven
// `__highlight`/`__showLabel` (recomputed per beat) plus the staged-entrance channels this
// comp drives every frame (recomputed per frame, from each marker's own `__triggerFrame`).
interface LocatorFeatureProps {
  key: string;
  label: string;
  color: string;
  category: string;
  labelOffset: number;
  __highlight: boolean;
  __showLabel: boolean;
  __triggerFrame: number;
  __radius: number;
  __opacity: number;
  __strokeOpacity: number;
  __labelOpacity: number;
}

interface LocatorMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
  // Retained so the per-frame effect can mutate each marker's own __highlight/__showLabel
  // (on beat change) and __radius/__opacity/__strokeOpacity/__labelOpacity (every frame) in
  // place — ONE persistent array, ONE setData per frame (mirrors SymbolStory's symbolFeatures).
  markerFeatures: GeoJSON.Feature[];
}

export const LocatorStory: React.FC<{ config: LocatorConfigShape }> = ({
  config,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const geo = locatorGeometry({
    markers: config.markers,
    markerStyle: config.markerStyle,
    brandPalette: config.brandPalette,
  });
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const labelInk = dark ? "#f4f4f5" : "#1a1a1a";
  const labelHalo = dark ? "rgba(0,0,0,0.85)" : "#ffffff";
  const bg = dark ? "#0e0f12" : "#f4f4f4";

  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
    legendHeight: geo.hasCategories ? geo.legend.length * 20 + 16 : 0,
  });
  const textSize = labelTextSize(width);

  const [mapState, setMapState] = useState<LocatorMapState | null>(null);
  const [handle] = useState(() =>
    delayRender("locator-story-init", { timeoutInMilliseconds: 120000 }),
  );

  // Per-frame overlay state: the caption reveal ramp for the active beat, plus the central
  // category/place label's projected position + reveal + colour (reveal-beat only — null
  // callout on title/establish/takeaway beats, mirrors ChoroplethStory/SymbolStory).
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

    const m = new maptilersdk.Map({
      container: ref.current,
      style: dark
        ? maptilersdk.MapStyle.DATAVIZ.DARK
        : maptilersdk.MapStyle.DATAVIZ.LIGHT,
      center: [
        (geo.bounds[0] + geo.bounds[2]) / 2,
        (geo.bounds[1] + geo.bounds[3]) / 2,
      ] as [number, number],
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
      const mode = resolveRevealMode(config);

      // Build beats and timeline FIRST — each marker's own entrance trigger frame (below) is
      // derived from the beat/phase timeline, so it must exist before the marker features are
      // built (mirrors SymbolStory).
      const meta = {
        title: config.title ?? "",
        description: config.description,
        insight:
          ((config as Record<string, unknown>).insight as string) ??
          config.title ??
          "",
      };
      const beats = beatsForMode(
        deriveLocatorStory(config.markers, meta),
        mode,
      );

      const kinds = beats.map((b) => b.kind);
      const { phases } = buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS);

      // EVERY marker's own entrance trigger — context: all together at the establish beat's
      // start; sequential: its own reveal beat's start (a categorized beat's marker labels ALL
      // share that beat's trigger — revealTriggersByLabel, unlike the generic
      // triggerFrameByRegion, keys on every label in highlight[], not just [0]), or never for a
      // marker beyond maxReveals.
      const establishIdx = beats.findIndex((b) => b.kind === "establish");
      const establishStartFrame =
        establishIdx >= 0 ? phases[establishIdx].startFrame : 0;
      const revealTriggers = revealTriggersByLabel(beats, phases);
      const markTriggers = markTriggerFrames(
        config.markers,
        mode,
        establishStartFrame,
        revealTriggers,
      );

      const features: GeoJSON.Feature[] = geo.markers.map((mk, i) => ({
        type: "Feature",
        id: i,
        properties: {
          key: `m${i}`,
          label: mk.label,
          color: mk.color,
          category: mk.category ?? "",
          labelOffset: labelRadialOffset(DOT_RADIUS_PX, textSize),
          __showLabel: true,
          __highlight: true, // establish: all markers full; recomputed per beat
          __triggerFrame:
            markTriggers.get(mk.label) ?? Number.POSITIVE_INFINITY,
          __radius: 0,
          __opacity: 0,
          __strokeOpacity: 0,
          __labelOpacity: 0,
        } satisfies LocatorFeatureProps,
        geometry: { type: "Point", coordinates: [mk.lon, mk.lat] },
      }));

      m.addSource("locator", {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });

      // Uniform dot glyph — FIXED settled radius, colour by category. Radius/opacity per-feature
      // via the staged-entrance channels (grow + fade), driven every frame below.
      m.addLayer({
        id: GLYPH_LAYER,
        type: "circle",
        source: "locator",
        paint: {
          "circle-radius": ["get", "__radius"],
          "circle-color": ["get", "color"],
          "circle-stroke-color": MARKER_STROKE,
          "circle-stroke-width": 1.5,
          "circle-opacity": ["get", "__opacity"],
          "circle-stroke-opacity": ["get", "__strokeOpacity"],
        },
      });

      // Label layer — visibility per-feature via __showLabel (declutter), synced to the beat;
      // text-opacity is the marker's own staged label-rise (× the highlight dim multiplier).
      m.addLayer({
        id: LABEL_LAYER,
        type: "symbol",
        source: "locator",
        filter: ["==", ["get", "__showLabel"], true],
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": textSize,
          "text-variable-anchor": ["top", "bottom", "left", "right"],
          "text-radial-offset": ["get", "labelOffset"],
          "text-justify": "auto",
          "text-allow-overlap": true,
          "text-optional": false,
          "text-line-height": 1.3,
          "text-max-width": 9,
        },
        paint: {
          "text-color": labelInk,
          "text-halo-color": labelHalo,
          "text-halo-width": 1.6,
          "text-opacity": ["get", "__labelOpacity"],
        },
      });

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

      m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

      continueWhenMapSettles(m, () => {
        setMapState({
          map: m,
          beats,
          phases,
          solutions,
          markerFeatures: features,
        });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, phases, solutions, markerFeatures } = mapState;

    const h = delayRender(`locator-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

    const beat = beats[beatIndex];
    const phase = phases[beatIndex];

    let dataChanged = false;

    // On beat change: recompute per-marker __highlight (dim-the-rest) + __showLabel
    // (declutter) — MUTATED in place on the PERSISTENT markerFeatures array (never rebuilt)
    // so the per-marker staged-entrance loop below (which runs every frame, not just on beat
    // change) keeps reading/writing the same feature objects.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
      const highlightSet = new Set(beat.highlight);
      const emphasise = beat.dim && highlightSet.size > 0;

      // Declutter — prioritise highlighted markers on dim beats so their labels win.
      const boxes: LabelBox[] = geo.markers.map((mk, i) => {
        const pt = map.project([mk.lon, mk.lat]);
        const w = Math.max(1, mk.label.length) * (textSize * 0.58);
        const hh = textSize * 1.3;
        const basePriority = mk.priority ?? 0;
        const priority =
          emphasise && highlightSet.has(mk.label)
            ? basePriority + 1000
            : basePriority;
        return {
          key: `m${i}`,
          x: pt.x - w / 2,
          y: pt.y - DOT_RADIUS_PX - hh,
          w,
          h: hh,
          priority,
        };
      });
      const shownSet = new Set(placeLabels(boxes).shown);

      for (let i = 0; i < geo.markers.length; i++) {
        const mk = geo.markers[i];
        const props = markerFeatures[i]
          .properties as unknown as LocatorFeatureProps;
        const highlight = emphasise ? highlightSet.has(mk.label) : true;
        const showLabel = shownSet.has(`m${i}`);
        if (
          props.__highlight !== highlight ||
          props.__showLabel !== showLabel
        ) {
          props.__highlight = highlight;
          props.__showLabel = showLabel;
          dataChanged = true;
        }
      }
    }

    // Per-marker staged entrance — each marker's own trigger (context: the shared establish
    // start, so every marker grows/fades/rises TOGETHER; sequential: its own reveal beat
    // start, markers appearing one-by-one/category-by-category, or never for a marker beyond
    // maxReveals — see markTriggerFrames) drives the SAME tuned areal envelope every other
    // beat-driven story comp uses. The __highlight dim-the-rest state (just recomputed above,
    // or unchanged from a prior beat) stays a SEPARATE multiplier on top: a dimmed marker
    // still stipples in, just to its lower ceiling.
    for (const f of markerFeatures) {
      const props = f.properties as unknown as LocatorFeatureProps;
      const localSeconds = (frame - props.__triggerFrame) / fps;
      const staged = stagedEntrance(localSeconds, {
        fillOpacity: 1,
        borderS: AREAL_BORDER_S,
        fillS: AREAL_FILL_S,
        labelS: AREAL_LABEL_S,
        fillStart: AREAL_FILL_START_S,
        labelStart: AREAL_LABEL_START_S,
      });
      const radius = DOT_RADIUS_PX * staged.borderProgress;
      const opacity =
        (props.__highlight ? 0.95 : DIM_OPACITY) * staged.fillOpacity;
      const strokeOpacity =
        (props.__highlight ? 1 : DIM_OPACITY) * staged.fillOpacity;
      const labelOpacity = (props.__highlight ? 1 : 0.35) * staged.labelReveal;

      if (
        props.__radius !== radius ||
        props.__opacity !== opacity ||
        props.__strokeOpacity !== strokeOpacity ||
        props.__labelOpacity !== labelOpacity
      ) {
        props.__radius = radius;
        props.__opacity = opacity;
        props.__strokeOpacity = strokeOpacity;
        props.__labelOpacity = labelOpacity;
        dataChanged = true;
      }
    }

    if (dataChanged) {
      (map.getSource("locator") as maptilersdk.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: markerFeatures,
      });
    }

    // Central category/place label — the beat's highlighted subject, mirrors the CountryLabel
    // callout every other beat-driven story comp shows (Choropleth/Symbol/Cartogram/HexGrid/
    // DotDensity). Positioned at the simple centroid (average lon/lat) of the beat's
    // highlighted markers, projected to screen coords — a category can span several markers,
    // unlike those single-subject comps. Reveal reuses the SAME per-marker staged-entrance
    // label timing computed just above (every marker in beat.highlight shares one
    // __triggerFrame, so any one of them gives the group's __labelOpacity — already at full
    // strength since a highlighted marker's dim multiplier is 1, see the loop above).
    let calloutPt: { x: number; y: number } | null = null;
    let calloutColor = "#ffffff";
    let labelReveal = 0;
    if (beat.callout && beat.highlight.length > 0) {
      const highlightSet = new Set(beat.highlight);
      const highlighted = geo.markers.filter((mk) =>
        highlightSet.has(mk.label),
      );
      if (highlighted.length > 0) {
        const lon =
          highlighted.reduce((sum, mk) => sum + mk.lon, 0) / highlighted.length;
        const lat =
          highlighted.reduce((sum, mk) => sum + mk.lat, 0) / highlighted.length;
        const pt = map.project([lon, lat] as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
        calloutColor = highlighted[0].color;
        const subjectProps = markerFeatures.find(
          (f) =>
            (f.properties as unknown as LocatorFeatureProps).label ===
            highlighted[0].label,
        )?.properties as unknown as LocatorFeatureProps | undefined;
        labelReveal = subjectProps?.__labelOpacity ?? 0;
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

  // Category legend — mounted once map state is ready.
  useEffect(() => {
    const el = legendRef.current;
    if (!el) return;
    if (!geo.hasCategories) {
      el.innerHTML = "";
      return;
    }
    const ink = dark ? "#f4f4f5" : "#333";
    el.innerHTML = geo.legend
      .map(
        (e) =>
          `<div style="display:flex;align-items:center;gap:8px;line-height:1.4">` +
          `<span style="width:12px;height:12px;border-radius:50%;background:${e.color};box-shadow:0 0 0 1px rgba(0,0,0,.15);flex:0 0 auto"></span>` +
          `<span style="font-size:12px;color:${ink}">${e.category}</span></div>`,
      )
      .join("");
  }, [dark, geo.hasCategories, geo.legend]);

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
        width={width}
        height={height}
        responsive={false}
        frame={mapFrame}
        furnitureOpacity={scene.furnitureOpacity}
        dark={dark}
        lang={config.lang}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Category legend — bottom-right, clear of MapFrame's bottom-left source */}
      {geo.hasCategories && (
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
            opacity: scene.furnitureOpacity,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Central category/place label — the beat's subject (category name in the categorized
          regime, place name in few-annotated), centred on the highlighted markers' centroid.
          Each marker keeps its own small decluttered label too, but the giant projected label
          is the visual narration beat (Tom-style): a reveal shows WHAT you're looking at, not
          just a lower-third sentence. */}
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
          central CountryLabel above; title beat uses the full TitleCard) */}
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
