// Remotion root for map-native. Registers:
//   HarnessCheck          — Minimal MapTiler-in-Remotion smoke test (no external geo files needed)
//   ChoroplethStory       — Choropleth story landscape 1280×720
//   ChoroplethStorySquare — Choropleth story square 1080×1080
//   ChoroplethStoryPortrait — Choropleth story portrait 1080×1350
//   SymbolStory           — Symbol map story landscape 1280×720
//   SymbolStorySquare     — Symbol map story square 1080×1080
//   SymbolStoryPortrait   — Symbol map story portrait 1080×1350
//   SymbolReveal          — Symbol simple-reveal landscape 1280×720
//   SymbolRevealSquare    — Symbol simple-reveal square 1080×1080
//   SymbolRevealPortrait  — Symbol simple-reveal portrait 1080×1350
//   ChoroplethReveal        — Choropleth simple-reveal landscape 1280×720
//   ChoroplethRevealSquare  — Choropleth simple-reveal square 1080×1080
//   ChoroplethRevealPortrait — Choropleth simple-reveal portrait 1080×1350
//   RouteReveal           — Route draw-on landscape 1280×720
//   RouteRevealSquare     — Route draw-on square 1080×1080
//   RouteRevealPortrait   — Route draw-on portrait 1080×1350
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
import { ChoroplethStory } from "../../src/components/ChoroplethStory";
import { SymbolStory } from "../../src/components/SymbolStory";
import { SymbolReveal } from "../../src/components/SymbolReveal";
import { ChoroplethReveal } from "../../src/components/ChoroplethReveal";
import { RouteReveal } from "../../src/components/RouteReveal";
import { LocatorReveal } from "../../src/components/LocatorReveal";
import { LocatorStory } from "../../src/components/LocatorStory";
import { MapScrolly } from "../../src/components/MapScrolly";
import { scrollyFrames, scrollyStepCount } from "../../src/route-story";
import { REVEAL_FRAMES } from "../../src/reveal";
import { TITLE_SCENE_FRAMES } from "../../src/video-scene";
import { computeChoropleth } from "../../src/choropleth-geo";
import { computeRouteReveal, routeRevealFrames } from "../../src/route-geo";
import { deriveMapStory } from "../../src/map-story";
import { deriveSymbolStory } from "../../src/symbol-story";
import { deriveLocatorStory } from "../../src/locator-story";
import { buildTimeline } from "../../src/story-timeline";
import sampleConfig from "../../assets/sample-data/choropleth.json";
import sampleSymbol from "../../assets/sample-data/symbol.json";
import sampleRoute from "../../assets/sample-data/route.json";
import sampleLocator from "../../assets/sample-data/locator-many.json";
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
).totalFrames;

const choroplethDefaultProps = { config: sampleConfig };

const scrollyMeta = ({ props }: { props: { config: any } }) => ({
  durationInFrames: scrollyFrames(
    scrollyStepCount(props.config, world as any),
    30,
  ),
});

const symbolDefaultProps = { config: sampleSymbol };

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
      fps={30}
      width={1280}
      height={720}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethStorySquare"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={choroplethDefaultProps}
    />
    <Composition
      id="ChoroplethStoryPortrait"
      component={ChoroplethStory}
      durationInFrames={STORY_FRAMES}
      fps={30}
      width={1080}
      height={1350}
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
      height={1350}
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
      height={1350}
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
      height={1350}
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
      height={1350}
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
      height={1350}
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
      height={1350}
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
      height={1350}
      defaultProps={locatorDefaultProps as any}
    />
  </>
);
