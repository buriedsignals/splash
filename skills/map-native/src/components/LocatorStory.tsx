// LocatorStory — beat-driven guided camera tour for the locator / markers map.
// Ports SymbolStory, with locator deltas:
//   1. beats from locatorBeatsForMode(deriveLocatorStory(config.markers, meta), mode) — per-place
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
  locatorBeatsForMode,
  revealTriggersByLabel,
  markTriggerFrames,
} from "../locator-story";
import { placeLabels, labelRadialOffset } from "../locator-labels";
import { locatorLabelPlacement } from "../locator-label-placement";
import type { LabelAnchor } from "../symbol-labels";
import { resolveMapStyle } from "../route-geo";
import {
  buildTimeline,
  cameraForFrame,
  type CameraSolution,
  type Phase,
} from "../story-timeline";
import { resolveRevealMode, type Beat } from "../map-story";
import {
  AREAL_TIMELINE_OPTS,
  AREAL_BORDER_S,
  AREAL_FILL_S,
  AREAL_FILL_START_S,
  AREAL_LABEL_S,
  AREAL_LABEL_START_S,
} from "../story-choreography";
import { stagedEntrance, clampOpacity } from "../core/staged-reveal";
import { sweepStops, type SweepMark } from "../sweep-carrier";
import { orderRevealBeatsBySweep } from "../story-sweep-order";
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
const DIM_OPACITY = 0.25; // non-highlighted markers, once appeared — both context and sequential modes

// Per-feature properties carried on the `locator` GeoJSON source — the declutter-driven
// `__highlight`/`__showLabel` (recomputed per beat) plus the staged-entrance channels this
// comp drives every frame (recomputed per frame, from each marker's own `__triggerFrame`).
interface LocatorFeatureProps {
  key: string;
  label: string;
  color: string;
  category: string;
  labelOffset: number;
  /** MapLibre `text-anchor` — recomputed per frame from the projected screen position so a
   *  marker near the frame edge flips its label inward instead of running it off canvas. */
  anchor: LabelAnchor;
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
  const { fps, width, height, durationInFrames } = useVideoConfig();

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
        // The confirmed walk reaches the deriver — see map-arc.ts.
        arcBeats: config.arcBeats,
      };
      // ★ WHERE EACH MARKER SITS ON THE SWEEP. A locator's markers carry no value, so the
      // carriers this type's data drives are `space` (a line crossing the territory on a
      // bearing) and `order` (the walk itself). Nothing here says so: `sweepStops` reads what
      // the marks carry, and a carrier it cannot read lands every marker at 1, which
      // `orderRevealBeatsBySweep` then leaves in the deriver's own order rather than inventing
      // a rank.
      //
      // These stops are read ONCE, below, to ORDER THE REVEAL BEATS. They used to be turned into
      // a TRIGGER FRAME PER MARKER on a window of their own — a second clock, spanning the whole
      // composition, that had never heard of a beat while the camera flew those very beats. It
      // is gone; see story-sweep-order.ts for the three defects that split produced.
      //
      // Empty without a declared carrier, and `orderRevealBeatsBySweep` then returns the
      // deriver's beats untouched — the invariant that makes a carrier-less render
      // byte-identical.
      const stops = config.sweepCarrier
        ? sweepStops(
            config.sweepCarrier,
            geo.markers.map((mk): SweepMark => ({
              name: mk.label,
              lon: mk.lon,
              lat: mk.lat,
            })),
          )
        : {};

      // ★ THEN THE CARRIER ORDERS THE REVEALS — and that is the whole of what it does. The beat
      // COUNT is unchanged by the permutation, so Root.tsx's `calculateMetadata` (which does not
      // and need not know a carrier exists) still sizes this composition exactly. In the
      // CATEGORIZED regime a reveal beat carries a whole category, and `highlight[0]` — the
      // first marker of that category — is what places the beat: the category's own foothold on
      // the sweep, not a per-marker re-sort that would split a category across the walk.
      const beats = orderRevealBeatsBySweep(
        locatorBeatsForMode(deriveLocatorStory(config.markers, meta), mode),
        stops,
      );

      const kinds = beats.map((b) => b.kind);
      const { phases } = buildTimeline(kinds, fps, AREAL_TIMELINE_OPTS);

      // EVERY marker's own entrance trigger — context: all together at the establish beat's
      // start; sequential: its own reveal beat's start (a categorized beat's marker labels ALL
      // share that beat's trigger — revealTriggersByLabel, unlike the generic
      // triggerFrameByRegion, keys on every label in highlight[], not just [0]), or `closeFrame`
      // for a marker beyond maxReveals.
      const establishIdx = beats.findIndex((b) => b.kind === "establish");
      const establishStartFrame =
        establishIdx >= 0 ? phases[establishIdx].startFrame : 0;
      // An explainer waits for the camera to land before the place animates in — see
      // story-triggers.ts's header for the two readings of the tuned pacing and why only the
      // carrier path opts in.
      const revealTriggers = revealTriggersByLabel(beats, phases, {
        atHoldStart: !!config.sweepCarrier,
      });
      // The close — carrier only: a marker past `maxReveals` enters on the TAKEAWAY beat's own
      // hold instead of never, because a missing pin reads as "nothing happened there", not as
      // "not a subject of this walk" (markTriggerFrames' own header). A frame off this timeline,
      // not a clock.
      const takeawayIdx = beats.findIndex((b) => b.kind === "takeaway");
      const closeFrame =
        config.sweepCarrier && takeawayIdx >= 0
          ? phases[takeawayIdx].startFrame + phases[takeawayIdx].moveFrames
          : Number.POSITIVE_INFINITY;
      const markTriggers = markTriggerFrames(
        config.markers,
        mode,
        establishStartFrame,
        revealTriggers,
        closeFrame,
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
          anchor: "left", // MapLibre text-anchor; recomputed per frame (edge-aware)
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
          // Per-feature anchor (data-driven), NOT text-variable-anchor: variable-anchor
          // only re-anchors on label-to-label collision — it is blind to the viewport
          // edge, so a marker near an edge keeps its default side and its text runs off
          // canvas. Recomputed per frame from the projected screen position.
          "text-anchor": ["get", "anchor"],
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

    const highlightSet = new Set(beat.highlight);
    const emphasise = beat.dim && highlightSet.size > 0;

    // Edge-aware label placement, recomputed EVERY FRAME — the camera glides within a beat,
    // so an anchor chosen once at the beat boundary is stale by the middle of the move and a
    // marker drifting toward the frame edge would take its label off canvas. Same cadence as
    // SymbolStory, which recomputes its anchors per frame after the jumpTo settles. One call
    // returns both the side each label takes and the rectangle it occupies there, so the
    // declutter below collides the box the label really has.
    const el = ref.current;
    const { anchors, boxes, offsets } = locatorLabelPlacement(
      geo.markers.map((mk) => ({
        label: mk.label,
        priority:
          (mk.priority ?? 0) +
          (emphasise && highlightSet.has(mk.label) ? 1000 : 0),
      })),
      geo.markers.map((mk) => map.project([mk.lon, mk.lat])),
      {
        viewport: {
          width: el?.clientWidth ?? width,
          height: el?.clientHeight ?? height,
        },
        textSize,
        radius: DOT_RADIUS_PX,
      },
    );
    for (let i = 0; i < geo.markers.length; i++) {
      const props = markerFeatures[i]
        .properties as unknown as LocatorFeatureProps;
      if (props.anchor !== anchors[i]) {
        props.anchor = anchors[i];
        dataChanged = true;
      }
      // The placement may have widened this label's gap to find it room next to a close
      // neighbour. Keeping the constant here would draw it straight back on top of the label
      // it was just moved away from.
      if (props.labelOffset !== offsets[i]) {
        props.labelOffset = offsets[i];
        dataChanged = true;
      }
    }

    // On beat change: recompute per-marker __highlight (dim-the-rest) + __showLabel
    // (declutter) — MUTATED in place on the PERSISTENT markerFeatures array (never rebuilt)
    // so the per-marker staged-entrance loop below (which runs every frame, not just on beat
    // change) keeps reading/writing the same feature objects. WHICH labels show stays a
    // per-beat editorial decision (a label winking in and out mid-glide would read as a
    // glitch); WHERE a shown label sits is the per-frame geometry above.
    if (beatIndex !== lastBeatIndex.current) {
      lastBeatIndex.current = beatIndex;
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
      // Two channels, two ceilings, one envelope: the raw curve is scaled by each channel's
      // own target and clamped on the way out. A highlighted marker's stroke target is
      // already 1, so its bloom has nowhere to go — that is the channel's limit, not a bug.
      const opacity = clampOpacity(
        (props.__highlight ? 0.95 : DIM_OPACITY) * staged.fillEnvelope,
      );
      const strokeOpacity = clampOpacity(
        (props.__highlight ? 1 : DIM_OPACITY) * staged.fillEnvelope,
      );
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
        overlay.labelReveal > 0 &&
        // The centred label is the DERIVED story's caption. An authored step carries its
        // subject on the CaptionCard instead — one text object, one type scale.
        !beat?.authored && (
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
          <CaptionCard
            text={beat.copy}
            reveal={overlay.captionReveal}
            {...(beat.authored && beat.callout
              ? { eyebrow: beat.callout.name, value: beat.callout.value }
              : {})}
          />
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
