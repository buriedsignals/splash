// SymbolStory — beat-driven guided camera tour for the proportional symbol map.
// Mirrors ChoroplethStory/DotDensityStory's harness structure, POINT-mark flavour: each
// mark's entrance (radius grow + opacity fade + label rise) is its OWN staged-entrance
// envelope, keyed on a per-mark trigger frame baked into the `symbols` source's features —
// no per-key emphasis layers (points have no rings to border-draw).
//   delayRender → on load add source/layers + build beats + compute per-mark triggers →
//     jumpTo beat 0 → idle → continueRender
//   per-frame: delayRender → jumpTo → per-mark staged entrance + label-anchor declutter
//     (ONE setData) → project callout → overlay state → idle → continueRender

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
import { symbolGeometry } from "../symbol-geo";
import {
  symbolLabels,
  labelRadialOffset,
  assignSymbolLabelAnchors,
  type SymbolAnchorProps,
} from "../symbol-labels";
import { deriveSymbolStory, markTriggerFrames } from "../symbol-story";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { resolveRevealMode, beatsForMode, type Beat } from "../map-story";
import { triggerFrameByRegion } from "../story-triggers";
import {
  AREAL_TIMELINE_OPTS,
  AREAL_BORDER_S,
  AREAL_FILL_S,
  AREAL_FILL_START_S,
  AREAL_LABEL_S,
  AREAL_LABEL_START_S,
} from "../story-choreography";
import { stagedEntrance } from "../core/staged-reveal";
import type { SymbolConfig } from "../SymbolMap";
import { resolveMapStyle } from "../route-geo";
import { houseFill } from "../theme/house-ramp";
import { CountryLabel } from "./CountryLabel";
import { TitleCard, CaptionCard } from "./StoryCards";
import { resolveMapFrame, labelTextSize } from "../core/map-format";
import { MapFrame } from "../core/MapFrame";
import { resolveScene } from "../video-scene";
import { continueWhenMapSettles } from "../core/frame-ready";
import { labelWithUnit } from "../core/locale";

maptilersdk.config.apiKey = process.env.REMOTION_MAPTILER_KEY as string;

// Single hue — the newsroom house hue (config.brandHue) wins when set, else the CVD-safe default
// (houseFill). Resolved per-render inside the component (config scope).
const SYMBOL_STROKE = "#ffffff";
const MAX_RADIUS_PX = 40;
// Px clearance between a circle's edge and its label — matches labelRadialOffset's
// default `gap`, so the edge-clamp pixel offset equals the ems radial offset MapLibre renders.
const LABEL_GAP = 6;
// circle-opacity target once a mark's staged entrance settles (was the paint-time constant).
const SYMBOL_BASE_OPACITY = 0.75;

// Per-feature properties carried on the `symbols` GeoJSON source — extends the label-anchor
// declutter's own shape with the staged-entrance channels this comp drives every frame.
interface SymbolFeatureProps extends SymbolAnchorProps {
  label: string;
  labelOffset: number;
  __triggerFrame: number;
  __radius: number;
  __opacity: number;
  __labelOpacity: number;
}

interface SymbolMapState {
  map: InstanceType<typeof maptilersdk.Map>;
  beats: Beat[];
  phases: Phase[];
  solutions: CameraSolution[];
  cityByKey: Map<string, [number, number]>;
  // Retained so the per-frame effect can re-derive each label's in-viewport anchor after
  // the camera jumpTo settles (the projection changes per frame).
  symbolFeatures: GeoJSON.Feature[];
}

export const SymbolStory: React.FC<{ config: SymbolConfig }> = ({ config }) => {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const dark = resolveMapStyle(config.mapStyle) === "dataviz-dark";
  const mapFrame = resolveMapFrame(width, height, {
    titleLines: 2,
    hasDescription: !!config.description,
    labelOverhang: 80,
  });

  // Ratio-scaled label size: square/portrait are ≤1080 wide → larger text for legibility.
  const textSize = labelTextSize(width);

  const [mapState, setMapState] = useState<SymbolMapState | null>(null);
  const [handle] = useState(() => delayRender("symbol-story-init"));

  // Per-frame overlay state: projected callout position, reveals.
  const [overlay, setOverlay] = useState<{
    beatIndex: number;
    calloutPt: { x: number; y: number } | null;
    calloutReveal: number;
    calloutValue: string;
    calloutColor: string;
    captionReveal: number;
  } | null>(null);

  // Ref to avoid redundant setData calls.
  const lastBeatIndex = useRef<number>(-1);

  // Init map once.
  useEffect(() => {
    if (!ref.current || started.current) return;
    started.current = true;

    const geo = symbolGeometry({ points: config.points }, MAX_RADIUS_PX);

    const style = dark
      ? maptilersdk.MapStyle.DATAVIZ.DARK
      : maptilersdk.MapStyle.DATAVIZ.LIGHT;

    const m = new maptilersdk.Map({
      container: ref.current,
      style,
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
      const mode = resolveRevealMode(config);

      // Build beats and timeline FIRST — each mark's own entrance trigger frame (below)
      // is derived from the beat/phase timeline, so it must exist before the symbol
      // features are built.
      const meta = {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
      };
      const beats = beatsForMode(
        deriveSymbolStory(config.points, meta, {
          maxReveals: config.maxReveals,
        }),
        mode,
      );

      const kinds = beats.map((b) => b.kind);
      const { phases } = buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS);

      // Reveal-beat marks only (the top-N the tour actually visits), keyed by mark
      // label — `deriveSymbolStory` puts each reveal beat's mark name in `highlight[0]`.
      const revealTriggers = triggerFrameByRegion(beats, phases);
      const establishIdx = beats.findIndex((b) => b.kind === "establish");
      const establishStartFrame =
        establishIdx >= 0 ? phases[establishIdx].startFrame : 0;
      // EVERY mark's own entrance trigger — context: all together at the establish
      // beat's start; sequential: each mark's own reveal beat start, or never (stays
      // hidden) for a mark beyond maxReveals.
      const markTriggers = markTriggerFrames(
        config.points,
        mode,
        establishStartFrame,
        revealTriggers,
      );

      const labels = symbolLabels(geo.symbols, config.lang);
      // `anchor` starts at the FT/NYT direct-label default (text to the RIGHT of the point,
      // MapLibre "left") and is re-derived per frame from each symbol's projected position.
      // `__radius`/`__opacity`/`__labelOpacity` carry each mark's own staged-entrance channel
      // values — recomputed per frame (see the frame effect below) and painted via
      // ["get", ...] expressions, so a per-mark grow/fade/rise never needs a MapLibre
      // expression to evaluate stagedEntrance itself.
      const symbolFeatures: GeoJSON.Feature[] = geo.symbols.map((s, i) => ({
        type: "Feature",
        properties: {
          radius: s.radius,
          label: s.label ?? "",
          labelText: labels[i]?.name
            ? `${labels[i].name}\n${labelWithUnit(labels[i].valueText, config.valueUnit, config.lang)}`
            : labelWithUnit(
                labels[i]?.valueText ?? "",
                config.valueUnit,
                config.lang,
              ),
          labelOffset: labelRadialOffset(s.radius, textSize),
          anchor: "left",
          __triggerFrame:
            markTriggers.get(s.label ?? "") ?? Number.POSITIVE_INFINITY,
          __radius: 0,
          __opacity: 0,
          __labelOpacity: 0,
        } satisfies SymbolFeatureProps,
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
      }));
      m.addSource("symbols", {
        type: "geojson",
        data: { type: "FeatureCollection", features: symbolFeatures },
      });

      m.addLayer({
        id: "symbol-circles",
        type: "circle",
        source: "symbols",
        paint: {
          "circle-radius": ["get", "__radius"] as never,
          "circle-color": houseFill(config.brandHue),
          "circle-opacity": ["get", "__opacity"] as never,
          "circle-stroke-color": SYMBOL_STROKE,
          "circle-stroke-width": 1.5,
        },
      });

      // Direct label layer — every mark carries its name+value, not just the
      // top-N callouts. Each mark's own text-opacity is its staged label-rise.
      m.addLayer({
        id: "symbol-labels",
        type: "symbol",
        source: "symbols",
        layout: {
          "text-field": ["get", "labelText"],
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
          "text-size": textSize,
          // Per-feature data-driven anchor (NOT variable-anchor, which is blind to the
          // canvas edge). Re-derived per frame after each jumpTo so no label runs off-frame.
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
          "text-opacity": ["get", "__labelOpacity"] as never,
        },
      });

      // Camera solution per beat — cameraForBounds on the beat's [w,s,e,n] bbox, padded.
      const solutions: CameraSolution[] = beats.map((b) => {
        const result = m.cameraForBounds(
          b.camera as maptilersdk.LngLatBoundsLike,
          {
            padding: mapFrame.pad,
          },
        );
        if (!result || !result.center) return { center: [10, 20], zoom: 2 };
        const c = maptilersdk.LngLat.convert(result.center);
        return {
          center: [c.lng, c.lat],
          zoom: result.zoom ?? 2,
        };
      });

      // City lookup for callout projection: label → [lon, lat].
      const cityByKey = new Map<string, [number, number]>();
      for (const p of config.points) {
        if (p.label) cityByKey.set(p.label, [p.lon, p.lat]);
      }

      m.jumpTo({ center: solutions[0].center, zoom: solutions[0].zoom });

      continueWhenMapSettles(m, () => {
        setMapState({
          map: m,
          beats,
          phases,
          solutions,
          cityByKey,
          symbolFeatures,
        });
        continueRender(handle);
      });
    });
  }, [handle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-frame update — deterministic, driven entirely by `frame`.
  useEffect(() => {
    if (!mapState) return;
    const { map, beats, phases, solutions, cityByKey, symbolFeatures } =
      mapState;

    const h = delayRender(`symbol-story-frame-${frame}`);

    const { camera, beatIndex } = cameraForFrame(frame, phases, solutions);

    // Deterministic jump — never flyTo.
    map.jumpTo({ center: camera.center, zoom: camera.zoom });

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

    // The mark currently carrying the giant CountryLabel callout — its own small
    // persistent label is suppressed in lockstep with the callout's fade-in below, so the
    // two never collide (mirrors the emphasis pattern used in SymbolScrolly).
    const highlightLabel = beat.callout?.region ?? "__none__";

    // INVARIANT: a symbol label never renders outside the map viewport. The camera moves
    // per frame, so re-derive each label's in-viewport anchor from its NEW projected
    // position — jumpTo settles the projection synchronously, so we can project + clamp
    // inline here (before the frame's idle/continueRender) and the captured frame shows the
    // flipped anchors. Folded into the SAME feature rebuild as each mark's staged entrance
    // (radius grow + opacity fade + label rise) below — one setData per frame, not two.
    let dataChanged = false;
    const el = ref.current;
    if (el) {
      const viewport = { width: el.clientWidth, height: el.clientHeight };
      const projected = symbolFeatures.map((f) =>
        map.project(
          (f.geometry as GeoJSON.Point).coordinates as [number, number],
        ),
      );
      const anchorsChanged = assignSymbolLabelAnchors(
        symbolFeatures.map((f) => f.properties as unknown as SymbolAnchorProps),
        projected,
        { viewport, textSize, gap: LABEL_GAP },
      );
      if (anchorsChanged) dataChanged = true;
    }

    // Per-mark staged entrance — each mark's own trigger (context: the shared establish
    // start, so every mark grows/fades/rises TOGETHER; sequential: its own reveal beat
    // start, marks appearing one-by-one, or never for a mark beyond maxReveals — see
    // markTriggerFrames) drives the SAME tuned areal envelope (radius grow → opacity fade →
    // label rise, overlapping) every other beat-driven story comp uses.
    for (const f of symbolFeatures) {
      const props = f.properties as unknown as SymbolFeatureProps;
      const localSeconds = (frame - props.__triggerFrame) / fps;
      const staged = stagedEntrance(localSeconds, {
        fillOpacity: 1,
        borderS: AREAL_BORDER_S,
        fillS: AREAL_FILL_S,
        labelS: AREAL_LABEL_S,
        fillStart: AREAL_FILL_START_S,
        labelStart: AREAL_LABEL_START_S,
      });
      const radius = props.radius * staged.borderProgress;
      const opacity = SYMBOL_BASE_OPACITY * staged.fillOpacity;
      const labelOpacity =
        props.label === highlightLabel
          ? staged.labelReveal * (1 - calloutReveal)
          : staged.labelReveal;

      if (
        props.__radius !== radius ||
        props.__opacity !== opacity ||
        props.__labelOpacity !== labelOpacity
      ) {
        props.__radius = radius;
        props.__opacity = opacity;
        props.__labelOpacity = labelOpacity;
        dataChanged = true;
      }
    }

    if (dataChanged) {
      (map.getSource("symbols") as maptilersdk.GeoJSONSource).setData({
        type: "FeatureCollection",
        features: symbolFeatures,
      });
    }

    // Callout projection: highlighted city's lon/lat → screen coords.
    let calloutPt: { x: number; y: number } | null = null;
    if (beat.callout) {
      const lngLat = cityByKey.get(beat.callout.region);
      if (lngLat) {
        const pt = map.project(lngLat as [number, number]);
        calloutPt = { x: pt.x, y: pt.y };
      }
    }

    // Update beat index ref (kept for parity with the other beat-driven story comps; the
    // symbols source itself now updates per-mark via the staged-entrance loop above, not a
    // beat-change gate).
    lastBeatIndex.current = beatIndex;

    setOverlay({
      beatIndex,
      calloutPt,
      calloutReveal,
      calloutValue: beat.callout?.value ?? "",
      calloutColor: houseFill(config.brandHue),
      captionReveal,
    });

    continueWhenMapSettles(map, () => continueRender(h));
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
    <AbsoluteFill style={{ backgroundColor: dark ? "#0e0f12" : "#f4f4f4" }}>
      {/* MapFrame: shared furniture shell — title band (top) + source band (bottom). */}
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
        lang={config.lang}
      >
        <div ref={ref} style={{ width, height, position: "absolute" }} />
      </MapFrame>

      {/* Callout overlay — projected to screen coords, uses CountryLabel for city name + value */}
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

      {/* Caption lower-third — for takeaway beats */}
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
