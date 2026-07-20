// Remotion root for map-native. Registers:
//   HarnessCheck          — Minimal MapTiler-in-Remotion smoke test (no external geo files needed)
//   ChoroplethStory       — Choropleth story landscape 1280×720
//   ChoroplethStorySquare — Choropleth story square 1080×1080
//   ChoroplethStoryPortrait — Choropleth story portrait 1080×1920
//   SymbolStory           — Symbol map story landscape 1280×720
//   SymbolStorySquare     — Symbol map story square 1080×1080
//   SymbolStoryPortrait   — Symbol map story portrait 1080×1920
//   SymbolReveal          — Symbol simple-reveal landscape 1280×720
//   SymbolRevealSquare    — Symbol simple-reveal square 1080×1080
//   SymbolRevealPortrait  — Symbol simple-reveal portrait 1080×1920
//   ChoroplethReveal        — Choropleth simple-reveal landscape 1280×720
//   ChoroplethRevealSquare  — Choropleth simple-reveal square 1080×1080
//   ChoroplethRevealPortrait — Choropleth simple-reveal portrait 1080×1920
//   RouteReveal           — Route draw-on landscape 1280×720
//   RouteRevealSquare     — Route draw-on square 1080×1080
//   RouteRevealPortrait   — Route draw-on portrait 1080×1920
//
// Render HarnessCheck to prove the harness:
//   bunx remotion render remotion/src/index.ts HarnessCheck out/harness-check.mp4 --gl=angle --concurrency=1 --timeout=120000
//
// Render choropleth videos:
//   for C in ChoroplethStory ChoroplethStorySquare ChoroplethStoryPortrait; do
//     bunx remotion render remotion/src/index.ts $C output-proof/choropleth/$C.mp4 --gl=angle --concurrency=1 --timeout=120000
//   done

import React from "react";
import { Composition } from "remotion";
import { HarnessCheck } from "../../src/components/HarnessCheck";
import {
  ChoroplethStory,
  AREAL_TIMELINE_OPTS,
} from "../../src/components/ChoroplethStory";
import { SymbolStory } from "../../src/components/SymbolStory";
import type { SymbolConfig } from "../../src/SymbolMap";
import { SymbolReveal } from "../../src/components/SymbolReveal";
import { ChoroplethReveal } from "../../src/components/ChoroplethReveal";
import { RouteReveal } from "../../src/components/RouteReveal";
import { LocatorReveal } from "../../src/components/LocatorReveal";
import { LocatorStory } from "../../src/components/LocatorStory";
import { DotDensityReveal } from "../../src/components/DotDensityReveal";
import { DotDensityStory } from "../../src/components/DotDensityStory";
import { HexGridReveal } from "../../src/components/HexGridReveal";
import { HexGridStory } from "../../src/components/HexGridStory";
import { CartogramReveal } from "../../src/components/CartogramReveal";
import { CartogramStory } from "../../src/components/CartogramStory";
import { computeDotDensity } from "../../src/dot-density-geo";
import { deriveDotDensityStory } from "../../src/dot-density-story";
import { computeHexGrid } from "../../src/hex-grid-geo";
import { deriveHexGridStory } from "../../src/hex-grid-story";
import { computeCartogram } from "../../src/cartogram-geo";
import { deriveCartogramStory } from "../../src/cartogram-story";
import { MapScrolly } from "../../src/components/MapScrolly";
import { scrollyFrames, scrollyStepCount } from "../../src/route-story";
import { REVEAL_FRAMES } from "../../src/reveal";
import { TITLE_SCENE_FRAMES } from "../../src/video-scene";
import { computeChoropleth } from "../../src/choropleth-geo";
import { computeRouteReveal, routeRevealFrames } from "../../src/route-geo";
import {
  deriveMapStory,
  beatsForMode,
  resolveRevealMode,
} from "../../src/map-story";
import { deriveSymbolStory } from "../../src/symbol-story";
import { deriveLocatorStory } from "../../src/locator-story";
import { buildTimeline } from "../../src/story-timeline";
import sampleConfig from "../../assets/sample-data/choropleth.json";
import sampleSymbol from "../../assets/sample-data/symbol.json";
import sampleRoute from "../../assets/sample-data/route.json";
import sampleLocator from "../../assets/sample-data/locator-many.json";
import sampleDotDensity from "../../assets/sample-data/dot-density-multi.json";
import sampleHexGrid from "../../assets/sample-data/hex-grid-count.json";
import sampleCartogram from "../../assets/sample-data/cartogram-scaled.json";
import world from "../../assets/geo/world.geojson";

const sampleLayout = computeChoropleth(sampleConfig, world as any, "iso_a3", {
  bins: 5,
  scaleType: "sequential",
});
const sampleBeats = deriveMapStory(sampleLayout, world as any, "iso_a3", {
  title: sampleConfig.title,
  insight: (sampleConfig as any).insight ?? sampleConfig.title,
  unit: (sampleConfig as any).valueUnit ?? "",
});
const STORY_FRAMES = buildTimeline(
  sampleBeats.map((b) => b.kind),
  30,
  AREAL_TIMELINE_OPTS,
).totalFrames;

const choroplethDefaultProps = { config: sampleConfig };

// Mode-aware composition duration. `sequential` drops the establish beat (beatsForMode), so the
// length must be recomputed from the INJECTED config — otherwise the sequential MP4 ends with a
// frozen tail. Mirrors ChoroplethStory's own layout+beats setup so the counts match exactly.
const storyMeta = ({ props }: { props: { config: any } }) => {
  const cfg = props.config;
  const layout = computeChoropleth(cfg, world as any, "iso_a3", {
    bins: 5,
    scaleType: cfg.scaleType ?? "sequential",
    palette: cfg.palette,
    labelField: cfg.labelField,
  });
  const beats = beatsForMode(
    deriveMapStory(layout, world as any, "iso_a3", {
      title: cfg.title ?? "",
      insight: cfg.insight ?? cfg.title ?? "",
      unit: cfg.valueUnit ?? "",
      valueField: cfg.valueField,
      narrativePattern: cfg.valueKind,
      lang: cfg.lang,
    }),
    resolveRevealMode(cfg),
  );
  return {
    durationInFrames: buildTimeline(
      beats.map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames,
  };
};

const scrollyMeta = ({ props }: { props: { config: any } }) => ({
  durationInFrames: scrollyFrames(
    scrollyStepCount(props.config, world as any),
    30,
  ),
});

// The JSON import widens `type` to `string`; assert the sample back to SymbolConfig
// (its `type` is "symbol" at rest) so the composition's `{ config: SymbolConfig }` prop matches.
const symbolDefaultProps = { config: sampleSymbol as SymbolConfig };

const ROUTE_REVEAL_FRAMES = routeRevealFrames(
  computeRouteReveal(sampleRoute as any, world as any).territories.length,
  30,
);
const routeDefaultProps = { config: sampleRoute };
const sampleSymbolBeats = deriveSymbolStory(sampleSymbol.points, {
  title: sampleSymbol.title ?? "",
  insight:
    ((sampleSymbol as Record<string, unknown>).insight as string) ??
    sampleSymbol.title ??
    "",
  unit: sampleSymbol.valueUnit ?? "",
});
const SYMBOL_FRAMES = buildTimeline(
  sampleSymbolBeats.map((b) => b.kind),
  30,
).totalFrames;

const sampleLocatorBeats = deriveLocatorStory(sampleLocator.markers, {
  title: sampleLocator.title ?? "",
  insight: (sampleLocator as any).insight ?? sampleLocator.title ?? "",
});
const LOCATOR_STORY_FRAMES = buildTimeline(
  sampleLocatorBeats.map((b) => b.kind),
  30,
).totalFrames;
const locatorDefaultProps = { config: sampleLocator };

const sampleDDLayout = computeDotDensity(
  sampleDotDensity as any,
  world as any,
  "iso_a3",
);
const sampleDDBeats = deriveDotDensityStory(sampleDDLayout, {
  title: sampleDotDensity.title ?? "",
  insight: (sampleDotDensity as any).insight ?? sampleDotDensity.title ?? "",
  unit: (sampleDotDensity as any).valueUnit ?? "",
});
const DOT_DENSITY_STORY_FRAMES = buildTimeline(
  sampleDDBeats.map((b) => b.kind),
  30,
).totalFrames;
const dotDensityDefaultProps = { config: sampleDotDensity };

const sampleHGLayout = computeHexGrid(sampleHexGrid as any);
const sampleHGBeats = deriveHexGridStory(sampleHGLayout, {
  title: sampleHexGrid.title ?? "",
  insight: (sampleHexGrid as any).insight ?? sampleHexGrid.title ?? "",
});
const HEX_GRID_STORY_FRAMES = buildTimeline(
  sampleHGBeats.map((b) => b.kind),
  30,
).totalFrames;
const hexGridDefaultProps = { config: sampleHexGrid };

const sampleCGLayout = computeCartogram(sampleCartogram as any, world as any);
const sampleCGBeats = deriveCartogramStory(sampleCGLayout, {
  title: (sampleCartogram as any).title ?? "",
  insight:
    (sampleCartogram as any).insight ?? (sampleCartogram as any).title ?? "",
});
const CARTOGRAM_STORY_FRAMES = buildTimeline(
  sampleCGBeats.map((b) => b.kind),
  30,
).totalFrames;
const cartogramDefaultProps = { config: sampleCartogram };

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="HarnessCheck"
      component={HarnessCheck}
      durationInFrames={3 * 30}
      fps={30}
      width={1280}
      height={720}
    />
    <Composition
      id="ChoroplethStory"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      calculateMetadata={storyMeta}
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethStorySquare"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      calculateMetadata={storyMeta}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethStoryPortrait"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      calculateMetadata={storyMeta}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="SymbolStory"
      component={SymbolStory}
      durationInFrames={SYMBOL_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolStorySquare"
      component={SymbolStory}
      durationInFrames={SYMBOL_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolStoryPortrait"
      component={SymbolStory}
      durationInFrames={SYMBOL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolReveal"
      component={SymbolReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolRevealSquare"
      component={SymbolReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolRevealPortrait"
      component={SymbolReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="ChoroplethReveal"
      component={ChoroplethReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethRevealSquare"
      component={ChoroplethReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethRevealPortrait"
      component={ChoroplethReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="MapScrolly"
      component={MapScrolly}
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
      calculateMetadata={scrollyMeta}
    />
    <Composition
      id="MapScrollySquare"
      component={MapScrolly}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
      calculateMetadata={scrollyMeta}
    />
    <Composition
      id="MapScrollyPortrait"
      component={MapScrolly}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={choroplethDefaultProps}
      calculateMetadata={scrollyMeta}
    />
    <Composition
      id="RouteReveal"
      component={RouteReveal}
      durationInFrames={ROUTE_REVEAL_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={routeDefaultProps as any}
    />
    <Composition
      id="RouteRevealSquare"
      component={RouteReveal}
      durationInFrames={ROUTE_REVEAL_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={routeDefaultProps as any}
    />
    <Composition
      id="RouteRevealPortrait"
      component={RouteReveal}
      durationInFrames={ROUTE_REVEAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={routeDefaultProps as any}
    />
    <Composition
      id="LocatorReveal"
      component={LocatorReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorRevealSquare"
      component={LocatorReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorRevealPortrait"
      component={LocatorReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorStory"
      component={LocatorStory}
      durationInFrames={LOCATOR_STORY_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorStorySquare"
      component={LocatorStory}
      durationInFrames={LOCATOR_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorStoryPortrait"
      component={LocatorStory}
      durationInFrames={LOCATOR_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="DotDensityReveal"
      component={DotDensityReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityRevealSquare"
      component={DotDensityReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityRevealPortrait"
      component={DotDensityReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityStory"
      component={DotDensityStory}
      durationInFrames={DOT_DENSITY_STORY_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityStorySquare"
      component={DotDensityStory}
      durationInFrames={DOT_DENSITY_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityStoryPortrait"
      component={DotDensityStory}
      durationInFrames={DOT_DENSITY_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="HexGridReveal"
      component={HexGridReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridRevealSquare"
      component={HexGridReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridRevealPortrait"
      component={HexGridReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridStory"
      component={HexGridStory}
      durationInFrames={HEX_GRID_STORY_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridStorySquare"
      component={HexGridStory}
      durationInFrames={HEX_GRID_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridStoryPortrait"
      component={HexGridStory}
      durationInFrames={HEX_GRID_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="CartogramReveal"
      component={CartogramReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramRevealSquare"
      component={CartogramReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramRevealPortrait"
      component={CartogramReveal}
      durationInFrames={REVEAL_FRAMES + TITLE_SCENE_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramStory"
      component={CartogramStory}
      durationInFrames={CARTOGRAM_STORY_FRAMES}
      fps={30}
      width={1280}
      height={720}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramStorySquare"
      component={CartogramStory}
      durationInFrames={CARTOGRAM_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramStoryPortrait"
      component={CartogramStory}
      durationInFrames={CARTOGRAM_STORY_FRAMES}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={cartogramDefaultProps as any}
    />
  </>
);
