import type { RouteRevealLayout, RouteRevealTerritory } from "./route-geo";
import { computeRouteReveal } from "./route-geo";
import { listValidRegions, type MapArcBeat } from "./map-arc";
import { computeChoropleth } from "./choropleth-geo";
import { computeDotDensity } from "./dot-density-geo";
import { deriveLocatorStory } from "./locator-story";
import { deriveMapStory } from "./map-story";
import { deriveSymbolStory } from "./symbol-story";
import { deriveDotDensityStory } from "./dot-density-story";
import { computeHexGrid } from "./hex-grid-geo";
import { deriveHexGridStory } from "./hex-grid-story";
import { computeCartogram } from "./cartogram-geo";
import { deriveCartogramStory } from "./cartogram-story";
import { buildTimeline } from "./story-timeline";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import type { ScrollyStory, ScrollyStep } from "../../scrolly/src/chapters";

// The arc-camera for one crossed territory: its OWN geographic footprint (a bbox over the
// border rings computeRouteReveal already extracted), never the cumulative "route drawn
// through" bbox the geographic-order walk below uses. Mirrors cartogram's frameCell /
// dot-density's regionBounds — an arc beat's camera is the named anchor's own extent, not
// the map's default framing.
export function routeArcCamera(
  territory: RouteRevealTerritory,
): [number, number, number, number] {
  let w = Infinity,
    s = Infinity,
    e = -Infinity,
    n = -Infinity;
  for (const ring of territory.border) {
    for (const [lon, lat] of ring) {
      if (lon < w) w = lon;
      if (lon > e) e = lon;
      if (lat < s) s = lat;
      if (lat > n) n = lat;
    }
  }
  return [w, s, e, n];
}

export interface RouteArcStep {
  territory: RouteRevealTerritory;
  text: string;
  camera: [number, number, number, number];
}

// Turn a journalist-confirmed claim-arc into an ORDERED walk of the territories THIS route
// crosses. Route is the one arc-capable map type whose anchors are COMPUTED, not declared
// (see map-arc.ts's ARC_CAPABLE_MAP_TYPES comment and validateRouteConfig): the gate cannot
// check `region` against a real territory list because that list only exists once
// computeRouteReveal has run against the injected geometry. So — unlike applyMapArc's
// defensive throw in map-story.ts, which is unreachable in practice because mapArcErrors
// already validated every region at the gate — the throw below IS the validation for a
// route's arcBeats. It fires at PRODUCE time, later than every other arc-capable type
// learns of a typo, and it refuses BY NAME, listing the territories this route actually
// crosses (its own way out, same discipline as mapArcErrors's message).
export function resolveRouteArc(
  layout: RouteRevealLayout,
  arcBeats: MapArcBeat[],
): RouteArcStep[] {
  const byKey = new Map(layout.territories.map((t) => [t.key, t]));
  return arcBeats.map((b) => {
    const t = byKey.get(b.region);
    if (!t)
      throw new Error(
        `route arcBeats: territory "${b.region}" is not one this route crosses — ` +
          `it crosses: ${listValidRegions(layout.territories.map((x) => x.key))}`,
      );
    return { territory: t, text: b.text ?? "", camera: routeArcCamera(t) };
  });
}

// Route → ScrollyStory. Step sequence:
//   [0] intro       — flyTo, title card scene, carries the description (ref 0)
//   [1] overview     — flyTo, full route framed, nothing drawn yet, all territories outlined
//                      (sentinel ref = -1)
//   [2..N+1] draw×N  — one drawTo per crossed territory (ref = territory index 0..N-1); prose
//                      is the editorial note if provided, else the territory label
//   [N+2] takeaway   — flyTo, full route fully drawn, all territories filled, full-extent camera
//                      (sentinel ref = territories.length)
// Sentinel refs let the renderer detect the two framing steps: ref === -1 → overview,
// ref === territories.length → takeaway. drawTo refs stay 0..N-1 so the driver reads
// territory.stop from them.
export function routeStoryToChapters(
  layout: RouteRevealLayout,
  meta: {
    title: string;
    description?: string;
    source?: { name: string; url: string };
    insight?: string;
    notes?: Record<string, string>;
    // Journalist-confirmed claim-arc override (S2) — see map-arc.ts / resolveRouteArc's
    // header comment. When present + non-empty, the drawTo steps follow the ARC (order +
    // verbatim `text`, never the note/label fallback) instead of the geographic-order walk
    // below; absent/empty leaves that walk byte-identical.
    arcBeats?: MapArcBeat[];
  },
): ScrollyStory {
  const arc = meta.arcBeats?.length
    ? resolveRouteArc(layout, meta.arcBeats)
    : null;
  const n = arc ? arc.length : layout.territories.length;

  const intro: ScrollyStep = {
    id: "step-0-intro",
    visual: "map",
    action: "flyTo",
    ref: 0,
    prose: meta.description?.trim() ? meta.description : meta.title,
    align: "center",
  };

  const overview: ScrollyStep = {
    id: "step-1-overview",
    visual: "map",
    action: "flyTo",
    ref: -1,
    prose: meta.description?.trim() ? meta.description : meta.title,
    align: "center",
  };

  const drawSteps: ScrollyStep[] = arc
    ? arc.map((a, i) => ({
        id: `step-${i + 2}-draw`,
        visual: "map",
        action: "drawTo",
        ref: i,
        // The journalist's claim, verbatim — never the note/label fallback the
        // geographic-order walk below uses.
        prose: a.text,
        align: "center",
      }))
    : layout.territories.map((t, i) => ({
        id: `step-${i + 2}-draw`,
        visual: "map",
        action: "drawTo",
        ref: i,
        prose: meta.notes?.[t.key]?.trim()
          ? (meta.notes[t.key] as string)
          : t.label,
        align: "center",
      }));

  const takeawayProse = meta.insight?.trim()
    ? meta.insight
    : `${n} territories, ${Math.round(layout.totalLengthKm)} km`;
  const takeaway: ScrollyStep = {
    id: `step-${n + 2}-takeaway`,
    visual: "map",
    action: "flyTo",
    ref: n,
    prose: takeawayProse,
    align: "center",
  };

  return {
    title: meta.title,
    description: meta.description,
    source: meta.source,
    visual: "map",
    steps: [intro, overview, ...drawSteps, takeaway],
  };
}

// Total frames for a scrolly video: step 0 is the full-screen title scene (buildTimeline's
// "title" hold = 75 frames @30fps), each later step is a "reveal"
// (move + hold). Reusing buildTimeline keeps scrolly pacing identical to the storytelling video.
export function scrollyFrames(stepCount: number, fps: number): number {
  const kinds = Array.from({ length: Math.max(1, stepCount) }, (_, i) =>
    i === 0 ? "title" : "reveal",
  );
  return buildTimeline(kinds, fps).totalFrames;
}

// Derive the scrolly step count for a config (used by Root's calculateMetadata to size the
// composition to the real data, not the sample). Mirrors the per-type derivation the
// renderers use.
export function scrollyStepCount(
  config: any,
  world: GeoJSON.FeatureCollection,
): number {
  if (config.type === "route") {
    const layout = computeRouteReveal(config, world);
    // The SIZER must derive the same walk the renderer does (same mirror as every branch
    // below) — a confirmed arc changes the beat COUNT (the journalist's own selection, not
    // the geographic-order walk), so a sizer blind to it sizes the composition for a
    // different story than the one that renders. Reuses resolveRouteArc rather than just
    // `config.arcBeats.length` so an unknown territory throws here too, exactly as it would
    // at render — the sizer and the renderer agree on failure, not just on success.
    const n = config.arcBeats?.length
      ? resolveRouteArc(layout, config.arcBeats).length
      : layout.territories.length;
    return n + 3;
  }
  if (config.type === "locator") {
    const beats = deriveLocatorStory(config.markers, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
      // The SIZER must derive the same walk the renderer does — same mirror as the symbol/
      // choropleth branches below (a confirmed arc changes the beat COUNT, so a sizer blind
      // to it sizes the composition for a different story than the one that renders).
      arcBeats: config.arcBeats,
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: config.markers.length,
    }).steps.length;
  }
  if (config.type === "dot-density") {
    const layout = computeDotDensity(config, world, "iso_a3");
    const beats = deriveDotDensityStory(layout, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
      // The SIZER must derive the same walk the renderer does — same mirror as the locator/
      // symbol/choropleth/cartogram branches above (a confirmed arc changes the beat COUNT,
      // so a sizer blind to it sizes the composition for a different story than the one that
      // renders).
      arcBeats: config.arcBeats,
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: layout.regions.length,
    }).steps.length;
  }
  if (config.type === "hex-grid") {
    const layout = computeHexGrid(config);
    const beats = deriveHexGridStory(layout, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }
  if (config.type === "cartogram") {
    const layout = computeCartogram(config, world);
    const beats = deriveCartogramStory(layout, {
      title: config.title ?? "",
      description: config.description,
      insight: config.insight ?? config.title ?? "",
      // The SIZER must derive the same walk the renderer does — same mirror as the locator/
      // symbol/choropleth branches above (a confirmed arc changes the beat COUNT, so a sizer
      // blind to it sizes the composition for a different story than the one that renders).
      arcBeats: config.arcBeats,
    });
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }
  if (config.type === "symbol") {
    const beats = deriveSymbolStory(
      config.points,
      {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        unit: config.valueUnit ?? "",
        // The SIZER must derive the same walk the renderer does. A confirmed arc changes the
        // beat COUNT (it is the journalist's selection, not the salience cap), so a sizer blind
        // to it sizes the composition for a different story than the one that renders — the
        // mp4 cuts before his payoff, or freezes on a tail. That is worse than either half
        // being wrong alone, which is why this mirror exists at all.
        arcBeats: config.arcBeats,
      },
      { maxReveals: config.maxReveals },
    );
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description,
      source: config.source,
      regionsWithData: config.points.length,
    }).steps.length;
  }
  const layout = computeChoropleth(config, world, "iso_a3", {
    bins: 5,
    scaleType: "sequential",
  });
  const beats = deriveMapStory(layout, world, "iso_a3", {
    title: config.title ?? "",
    insight: config.insight ?? config.title ?? "",
    unit: config.valueUnit ?? "",
    lang: config.lang,
    // Same mirror as the symbol branch above — size the walk that will actually render.
    arcBeats: config.arcBeats,
  });
  return mapStoryToChapters(beats, {
    title: config.title ?? "",
    description: config.description,
    source: config.source,
    regionsWithData: layout.joined.filter((j) => j.value !== null).length,
  }).steps.length;
}
