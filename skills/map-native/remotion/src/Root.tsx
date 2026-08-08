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
  type ChoroplethStoryConfig,
} from "../../src/components/ChoroplethStory";
import {
  AREAL_TIMELINE_OPTS,
  makeStoryMeta,
} from "../../src/story-choreography";
import { SymbolStory } from "../../src/components/SymbolStory";
import type { SymbolConfig } from "../../src/SymbolMap";
import type {
  LocatorConfigShape,
  DotDensityConfigShape,
  HexGridConfigShape,
  CartogramConfigShape,
} from "../../src/validate-config";
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
import { resolveVideoGeometry } from "../../src/core/video-geometry";
import {
  deriveMapStory,
  beatsForMode,
  resolveRevealMode,
} from "../../src/map-story";
import { deriveSymbolStory } from "../../src/symbol-story";
import {
  deriveLocatorStory,
  locatorBeatsForMode,
} from "../../src/locator-story";
import { buildTimeline } from "../../src/story-timeline";
import sampleConfig from "../../assets/sample-data/choropleth.json";
import sampleSymbol from "../../assets/sample-data/symbol.json";
import sampleRoute from "../../assets/sample-data/route.json";
import sampleLocator from "../../assets/sample-data/locator-many.json";
import sampleDotDensity from "../../assets/sample-data/dot-density-multi.json";
import sampleHexGrid from "../../assets/sample-data/hex-grid-count.json";
import sampleCartogram from "../../assets/sample-data/cartogram-scaled.json";
import world from "../../assets/geo/world.geojson";
import type { Topology, Arc } from "topojson-specification";

// Task 10 amendment: the choropleth/cartogram/dot-density/route video family now resolves
// config.geometry (core/video-geometry.ts, Tasks 7-9) and throws BY NAME when it is absent —
// there is deliberately no bundled world.geojson fallback anymore (D5). None of this skill's
// sample-data fixtures (assets/sample-data/*.json) carry config.geometry: they predate that
// change and still lean on the old "fetch the shipped world file" path the components no
// longer take. Left unpatched, opening Remotion Studio to any of these compositions — or
// rendering them from their default props — throws immediately. `devGeometrySubset` wraps a
// HANDFUL of already-bundled REAL world.geojson features (never the full 241-feature file) into
// a minimal, valid Topology so the Studio default-props preview resolves real geometry the same
// way a produced config would, just smaller.
function devGeometrySubset(
  source: GeoJSON.FeatureCollection,
  joinKey: string,
  ids: string[],
  objectName: string,
): Topology {
  const wanted = new Set(ids);
  const features = source.features.filter((f) =>
    wanted.has(String(f.properties?.[joinKey])),
  ) as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>[];
  const missing = ids.filter(
    (id) => !features.some((f) => String(f.properties?.[joinKey]) === id),
  );
  if (missing.length)
    throw new Error(
      `devGeometrySubset: ${missing.join(", ")} not found in the source FeatureCollection on join key "${joinKey}"`,
    );
  const arcs: Arc[] = [];
  const addRing = (ring: GeoJSON.Position[]): number[] => [arcs.push(ring) - 1];
  const geometries = features.map((f) => {
    const geom = f.geometry;
    if (geom.type === "Polygon")
      return {
        type: "Polygon" as const,
        properties: f.properties ?? {},
        arcs: geom.coordinates.map((ring) => addRing(ring)),
      };
    return {
      type: "MultiPolygon" as const,
      properties: f.properties ?? {},
      arcs: geom.coordinates.map((poly) => poly.map((ring) => addRing(ring))),
    };
  });
  return {
    type: "Topology",
    objects: { [objectName]: { type: "GeometryCollection", geometries } },
    arcs,
  };
}

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

const choroplethDefaultProps = {
  config: {
    ...sampleConfig,
    // A 3-feature real subset (of the 8 rows, joined on "code"/iso_a3) — see
    // devGeometrySubset's own comment above.
    geometry: devGeometrySubset(
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      ["NOR", "DEU", "FRA"],
      "countries",
    ),
  },
};

// Mode-aware composition duration. `sequential` drops the establish beat (beatsForMode), so the
// length must be recomputed from the INJECTED config — otherwise the sequential MP4 ends with a
// frozen tail. Mirrors ChoroplethStory's own layout+beats setup so the counts match exactly.
const storyMeta = makeStoryMeta((cfg: ChoroplethStoryConfig) => {
  // Duration must be sized off the SAME geometry the component itself renders — never the
  // bundled world.geojson (Task 10 finding: this precompute still hardcoded world/"iso_a3"
  // after Tasks 7/9 moved the component itself onto resolveVideoGeometry, so a non-world
  // config's own render crashed inside "choropleth: no region matched the data" the moment
  // the refusal that used to catch this earlier stopped running). Mirrors
  // ChoroplethStory.tsx's own resolveVideoGeometry call verbatim.
  const { world: worldGeoJson, joinKey } = resolveVideoGeometry(
    cfg,
    "storyMeta",
  );
  const layout = computeChoropleth(cfg, worldGeoJson, joinKey, {
    bins: 5,
    scaleType: cfg.scaleType ?? "sequential",
    palette: cfg.palette,
    labelField: cfg.labelField,
  });
  const beats = beatsForMode(
    deriveMapStory(layout, worldGeoJson, joinKey, {
      title: cfg.title ?? "",
      insight: cfg.insight ?? cfg.title ?? "",
      unit: cfg.valueUnit ?? "",
      valueField: cfg.valueField,
      narrativePattern: cfg.valueKind,
      lang: cfg.lang,
      // The DURATION must be sized from the walk that renders. A confirmed arc changes the
      // beat count (it is the journalist's selection, not the salience cap), so a sizer blind
      // to it cuts the mp4 before his payoff — or, for an arc shorter than the salience walk,
      // leaves exactly the frozen tail this mirror was written to prevent.
      arcBeats: cfg.arcBeats,
    }),
    resolveRevealMode(cfg),
  );
  return buildTimeline(
    beats.map((b) => b.kind),
    30,
    AREAL_TIMELINE_OPTS,
  ).totalFrames;
});

// Task 10 amendment (the one calculateMetadata it missed): only the geometry-joining types —
// route/dot-density/cartogram, and the choropleth-default fallback — read `world`/`joinKey`
// inside scrollyStepCount; symbol/locator/hex-grid derive their walk from points/markers alone
// and never touch either argument. Resolving the REAL injected geometry (resolveVideoGeometry,
// mirroring storyMeta/dotDensityStoryMeta/cartogramStoryMeta) only for the types that need it
// matters twice over: for a non-`world` config passed via `--props`, the bundled `world` import
// this used to pass unconditionally throws INSIDE calculateMetadata (resolveVideoGeometry throws
// loud instead when a symbol/locator/hex-grid config carries no config.geometry at all, which
// every sample and default-props config for those three still is); and even for `world` itself,
// sizing off the full 241-feature bundled file instead of the actual injected subset mis-sizes
// the composition (measured: 8 matched regions off the full file vs. the 3-feature subset
// `choroplethDefaultProps` actually renders).
const scrollyMeta = ({ props }: { props: { config: any } }) => {
  const cfg = props.config;
  const needsGeometry = !["symbol", "locator", "hex-grid"].includes(cfg?.type);
  const { world: resolvedWorld, joinKey } = needsGeometry
    ? resolveVideoGeometry(cfg, "scrollyMeta")
    : {
        world: world as unknown as GeoJSON.FeatureCollection,
        joinKey: "iso_a3",
      };
  return {
    durationInFrames: scrollyFrames(
      scrollyStepCount(cfg, resolvedWorld, joinKey),
      30,
    ),
  };
};

// The JSON import widens `type` to `string`; assert the sample back to SymbolConfig
// (its `type` is "symbol" at rest) so the composition's `{ config: SymbolConfig }` prop matches.
const symbolDefaultProps = { config: sampleSymbol as SymbolConfig };

const ROUTE_REVEAL_FRAMES = routeRevealFrames(
  computeRouteReveal(sampleRoute as any, world as any).territories.length,
  30,
);
const routeDefaultProps = {
  config: {
    ...sampleRoute,
    // ALL THREE territories the route geographically crosses (CHN/IND/BGD — computeRouteReveal
    // against the full bundled world confirms this; "IND"/"BGD" alone, the two the sample's own
    // `territories` narration names by hand, used to be the only ones subsetted here). Sizing
    // (ROUTE_REVEAL_FRAMES below) is computed against the SAME full-world crossing count, so a
    // narrower subset silently dropped the CHN leg from the Studio preview while still sizing
    // the composition for it — roughly 1.2s of frozen tail, camera-toured toward a territory
    // whose geometry was never in the preview at all. The narration itself is unaffected: CHN
    // carries no `territories[]` note (the journalist's own choice), same as before.
    geometry: devGeometrySubset(
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      ["CHN", "IND", "BGD"],
      "territories",
    ),
  },
};
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
  AREAL_TIMELINE_OPTS,
).totalFrames;

// Mode-aware composition duration — mirrors `dotDensityStoryMeta`/`cartogramStoryMeta` above
// (single source of truth with SymbolStory.tsx's own beats+beatsForMode setup, so the
// sequential mp4 doesn't end with a frozen tail).
const symbolStoryMeta = makeStoryMeta((cfg: SymbolConfig) => {
  const beats = beatsForMode(
    deriveSymbolStory(
      cfg.points,
      {
        title: cfg.title ?? "",
        insight: cfg.insight ?? cfg.title ?? "",
        unit: cfg.valueUnit ?? "",
        // Same mirror as storyMeta above — size the walk that will actually render.
        arcBeats: cfg.arcBeats,
      },
      { maxReveals: cfg.maxReveals },
    ),
    resolveRevealMode(cfg),
  );
  return buildTimeline(
    beats.map((b) => b.kind),
    30,
    AREAL_TIMELINE_OPTS,
  ).totalFrames;
});

const sampleLocatorBeats = deriveLocatorStory(sampleLocator.markers, {
  title: sampleLocator.title ?? "",
  insight: (sampleLocator as any).insight ?? sampleLocator.title ?? "",
  lang: (sampleLocator as any).lang,
});
const LOCATOR_STORY_FRAMES = buildTimeline(
  sampleLocatorBeats.map((b) => b.kind),
  30,
  AREAL_TIMELINE_OPTS,
).totalFrames;
const locatorDefaultProps = { config: sampleLocator };

// Mode-aware composition duration — mirrors `symbolStoryMeta` above (single source of truth
// with LocatorStory.tsx's own beats+locatorBeatsForMode setup, so the sequential mp4 doesn't end
// with a frozen tail). `locatorBeatsForMode`, NOT the generic `beatsForMode`: an authored locator
// walk keeps its establishing overview in sequential mode (see locator-story.ts), and a duration
// computed from the generic rule would be one beat short of what the component renders.
const locatorStoryMeta = makeStoryMeta(
  (cfg: LocatorConfigShape & { insight?: string }) => {
    const beats = locatorBeatsForMode(
      deriveLocatorStory(cfg.markers, {
        title: cfg.title ?? "",
        description: cfg.description,
        insight: cfg.insight ?? cfg.title ?? "",
        lang: cfg.lang,
        // Same mirror as symbolStoryMeta above — size the walk that will actually render.
        arcBeats: cfg.arcBeats,
      }),
      resolveRevealMode(cfg),
    );
    return buildTimeline(
      beats.map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames;
  },
);

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
  AREAL_TIMELINE_OPTS,
).totalFrames;
const dotDensityDefaultProps = {
  config: {
    ...sampleDotDensity,
    // A 3-feature real subset (of the 9 rows, joined on iso_a3) — see devGeometrySubset's
    // own comment above.
    geometry: devGeometrySubset(
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      ["DEU", "FRA", "GBR"],
      "countries",
    ),
  },
};

// Mode-aware composition duration — mirrors `storyMeta`/`cartogramStoryMeta` above (single
// source of truth with DotDensityStory.tsx's own layout+beats+beatsForMode setup, so the
// sequential mp4 doesn't end with a frozen tail).
const dotDensityStoryMeta = makeStoryMeta(
  (cfg: DotDensityConfigShape & { insight?: string; valueUnit?: string }) => {
    // Same fix as storyMeta above (Task 10 finding) — size off the config's own resolved
    // geometry, never the bundled world.geojson, mirroring DotDensityStory.tsx's own call.
    const { world: worldGeoJson, joinKey } = resolveVideoGeometry(
      cfg,
      "dotDensityStoryMeta",
    );
    const layout = computeDotDensity(cfg, worldGeoJson, joinKey);
    const beats = beatsForMode(
      deriveDotDensityStory(layout, {
        title: cfg.title ?? "",
        description: cfg.description,
        insight: cfg.insight ?? cfg.title ?? "",
        unit: cfg.valueUnit ?? "",
        // Same mirror as symbolStoryMeta/locatorStoryMeta/cartogramStoryMeta above — size
        // the walk that will actually render.
        arcBeats: cfg.arcBeats,
      }),
      resolveRevealMode(cfg),
    );
    return buildTimeline(
      beats.map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames;
  },
);

const sampleHGLayout = computeHexGrid(sampleHexGrid as any);
const sampleHGBeats = deriveHexGridStory(sampleHGLayout, {
  title: sampleHexGrid.title ?? "",
  insight: (sampleHexGrid as any).insight ?? sampleHexGrid.title ?? "",
});
const HEX_GRID_STORY_FRAMES = buildTimeline(
  sampleHGBeats.map((b) => b.kind),
  30,
  AREAL_TIMELINE_OPTS,
).totalFrames;
const hexGridDefaultProps = { config: sampleHexGrid };

// Mode-aware composition duration — mirrors `cartogramStoryMeta` above (single source of truth
// with HexGridStory.tsx's own layout+beats+beatsForMode setup, so the sequential mp4 doesn't end
// with a frozen tail).
const hexGridStoryMeta = makeStoryMeta(
  (cfg: HexGridConfigShape & { insight?: string }) => {
    const layout = computeHexGrid(cfg);
    const beats = beatsForMode(
      deriveHexGridStory(layout, {
        title: cfg.title ?? "",
        description: cfg.description,
        insight: cfg.insight ?? cfg.title ?? "",
        // Same mirror as storyMeta/symbolStoryMeta/locatorStoryMeta/dotDensityStoryMeta/
        // cartogramStoryMeta above — size the walk that will actually render.
        arcBeats: cfg.arcBeats,
      }),
      resolveRevealMode(cfg),
    );
    return buildTimeline(
      beats.map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames;
  },
);

const sampleCGLayout = computeCartogram(sampleCartogram as any, world as any);
const sampleCGBeats = deriveCartogramStory(sampleCGLayout, {
  title: (sampleCartogram as any).title ?? "",
  insight:
    (sampleCartogram as any).insight ?? (sampleCartogram as any).title ?? "",
});
const CARTOGRAM_STORY_FRAMES = buildTimeline(
  sampleCGBeats.map((b) => b.kind),
  30,
  AREAL_TIMELINE_OPTS,
).totalFrames;
const cartogramDefaultProps = {
  config: {
    ...sampleCartogram,
    // A 3-feature real subset (of the 18 values, joined on iso_a3) — see devGeometrySubset's
    // own comment above.
    geometry: devGeometrySubset(
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      ["CHN", "IND", "RUS"],
      "countries",
    ),
  },
};

// Mode-aware composition duration — mirrors `storyMeta` above (single source of truth with
// CartogramStory.tsx's own layout+beats+beatsForMode setup, so the sequential mp4 doesn't end
// with a frozen tail).
const cartogramStoryMeta = makeStoryMeta(
  (cfg: CartogramConfigShape & { insight?: string }) => {
    // Same fix as storyMeta above (Task 10 finding) — size off the config's own resolved
    // geometry, never the bundled world.geojson, mirroring CartogramStory.tsx's own call
    // (computeCartogram reads its join key off `data.joinKey`, so the resolved joinKey is
    // spread onto the config the same way the component itself does).
    const { world: worldGeoJson, joinKey } = resolveVideoGeometry(
      cfg,
      "cartogramStoryMeta",
    );
    const layout = computeCartogram({ ...cfg, joinKey }, worldGeoJson);
    const beats = beatsForMode(
      deriveCartogramStory(layout, {
        title: cfg.title ?? "",
        description: cfg.description,
        insight: cfg.insight ?? cfg.title ?? "",
        // Same mirror as symbolStoryMeta/locatorStoryMeta above — size the walk that will
        // actually render.
        arcBeats: cfg.arcBeats,
      }),
      resolveRevealMode(cfg),
    );
    return buildTimeline(
      beats.map((b) => b.kind),
      30,
      AREAL_TIMELINE_OPTS,
    ).totalFrames;
  },
);

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
      calculateMetadata={symbolStoryMeta}
      fps={30}
      width={1280}
      height={720}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolStorySquare"
      component={SymbolStory}
      durationInFrames={SYMBOL_FRAMES}
      calculateMetadata={symbolStoryMeta}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={symbolDefaultProps}
    />
    <Composition
      id="SymbolStoryPortrait"
      component={SymbolStory}
      durationInFrames={SYMBOL_FRAMES}
      calculateMetadata={symbolStoryMeta}
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
      calculateMetadata={locatorStoryMeta}
      fps={30}
      width={1280}
      height={720}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorStorySquare"
      component={LocatorStory}
      durationInFrames={LOCATOR_STORY_FRAMES}
      calculateMetadata={locatorStoryMeta}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={locatorDefaultProps as any}
    />
    <Composition
      id="LocatorStoryPortrait"
      component={LocatorStory}
      durationInFrames={LOCATOR_STORY_FRAMES}
      calculateMetadata={locatorStoryMeta}
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
      calculateMetadata={dotDensityStoryMeta}
      fps={30}
      width={1280}
      height={720}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityStorySquare"
      component={DotDensityStory}
      durationInFrames={DOT_DENSITY_STORY_FRAMES}
      calculateMetadata={dotDensityStoryMeta}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={dotDensityDefaultProps as any}
    />
    <Composition
      id="DotDensityStoryPortrait"
      component={DotDensityStory}
      durationInFrames={DOT_DENSITY_STORY_FRAMES}
      calculateMetadata={dotDensityStoryMeta}
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
      calculateMetadata={hexGridStoryMeta}
      fps={30}
      width={1280}
      height={720}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridStorySquare"
      component={HexGridStory}
      durationInFrames={HEX_GRID_STORY_FRAMES}
      calculateMetadata={hexGridStoryMeta}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={hexGridDefaultProps as any}
    />
    <Composition
      id="HexGridStoryPortrait"
      component={HexGridStory}
      durationInFrames={HEX_GRID_STORY_FRAMES}
      calculateMetadata={hexGridStoryMeta}
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
      calculateMetadata={cartogramStoryMeta}
      fps={30}
      width={1280}
      height={720}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramStorySquare"
      component={CartogramStory}
      durationInFrames={CARTOGRAM_STORY_FRAMES}
      calculateMetadata={cartogramStoryMeta}
      fps={30}
      width={1080}
      height={1080}
      defaultProps={cartogramDefaultProps as any}
    />
    <Composition
      id="CartogramStoryPortrait"
      component={CartogramStory}
      durationInFrames={CARTOGRAM_STORY_FRAMES}
      calculateMetadata={cartogramStoryMeta}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={cartogramDefaultProps as any}
    />
  </>
);
