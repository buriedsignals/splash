// Scrolly — sticky-graphic scrollytelling scaffold.
// Layout: one sticky map behind scrolling prose steps. An IntersectionObserver
// (NOT scroll-position math) drives `currentStep`, which ScrollyMap consumes.
//
// Dispatcher generality: v1 has a single `visual:"map"` track. To add
// `chart` or `image`, introduce a switch(story.visual) around the sticky
// graphic slot — the step model (ScrollyStep.visual) already carries the
// per-step visual kind.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { feature as topoFeature } from "topojson-client";
import type { Topology } from "topojson-specification";
import { computeChoropleth } from "../../map-native/src/choropleth-geo";
import { computeHexGrid } from "../../map-native/src/hex-grid-geo";
import { computeDotDensity } from "../../map-native/src/dot-density-geo";
import { computeCartogram } from "../../map-native/src/cartogram-geo";
import { locatorGeometry } from "../../map-native/src/locator-geo";
import { deriveMapStory } from "../../map-native/src/map-story";
import { deriveHexGridStory } from "../../map-native/src/hex-grid-story";
import { deriveSymbolStory } from "../../map-native/src/symbol-story";
import { deriveDotDensityStory } from "../../map-native/src/dot-density-story";
import { deriveLocatorStory } from "../../map-native/src/locator-story";
import { deriveCartogramStory } from "../../map-native/src/cartogram-story";
import { mapStoryToChapters, resolveVisual } from "./chapters";
import { chartStoryToChapters } from "./chart-chapters";
import { imageStoryToChapters } from "../../image-native/src/image-story";
import { ScrollyImage, type ImageScrollyConfig } from "./ScrollyImage";
import { deriveChartStory } from "../../chart-native/src/chart-story";
import { deriveFurniture, bgIsDark } from "../../../lib/core/theme";
import { ScrollyChart, type ChartScrollyConfig } from "./ScrollyChart";
import { ScrollyMap, type ScrollyMapConfig } from "./ScrollyMap";
import { ScrollySymbolMap, type ScrollySymbolConfig } from "./ScrollySymbolMap";
import { ScrollyHexMap, type ScrollyHexConfig } from "./ScrollyHexMap";
import {
  ScrollyDotDensityMap,
  type ScrollyDotDensityConfig,
} from "./ScrollyDotDensityMap";
import {
  ScrollyLocatorMap,
  type ScrollyLocatorConfig,
} from "./ScrollyLocatorMap";
import {
  ScrollyCartogramMap,
  type ScrollyCartogramConfig,
} from "./ScrollyCartogramMap";

import { sourceLabel } from "../../../lib/core/locale";
import { storyCopy } from "../../../lib/core/story-copy";

// Geometry arrives through the injected config now (produce.mjs) — never a static bundle
// import (D5, mirrors ChoroplethMap.tsx/ScrollyMap.tsx's own decode). Loud, named failure
// instead of a bare TypeError on `undefined.objects` — with the `?raw` import removed there is
// no bundled fallback geometry anymore, so an absent config.geometry must fail here, not as an
// unexplained downstream error. `label` identifies WHICH story branch failed (this module has
// three call sites — dot-density/cartogram/choropleth — each needing its own basemap decode for
// the STORY/prose track, independent of the sticky map component's own decode below).
function decodeWorldGeometry(
  geometry: Topology | undefined,
  label: string,
): GeoJSON.FeatureCollection {
  if (!geometry)
    throw new Error(
      `scrolly story (${label}): config.geometry is required (injected by produce; there is no bundled basemap geometry anymore — D5)`,
    );
  const objectName = Object.keys(geometry.objects)[0]!;
  return topoFeature(
    geometry,
    geometry.objects[objectName]!,
  ) as unknown as GeoJSON.FeatureCollection;
}

// The types each track actually hosts, defined in a leaf module (imports nothing) so they can be
// read without pulling in ScrollyMap.tsx's module-scope VITE_MAPTILER_KEY throw. Re-exported here
// so existing importers of "../src/Scrolly" keep working unchanged.
export { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "./scrolly-types";
import { CHART_SCROLLY_TYPES, MAP_SCROLLY_TYPES } from "./scrolly-types";

// The standard visually-hidden pattern (CSS clip) — NOT display:none, which would remove the node
// from the accessibility tree. Copied deliberately from chart-native's ChartFrame.tsx rather than
// imported: this package's build must not pull chart-native's frame (and its context, tooltip
// clamp and capture markers) into a MAP or IMAGE scrolly that renders no chart at all.
const VISUALLY_HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

// ---------------------------------------------------------------------------
// Scrolly
// ---------------------------------------------------------------------------

export const Scrolly: React.FC<{
  config:
    | ChartScrollyConfig
    | ScrollyMapConfig
    | ScrollySymbolConfig
    | ScrollyHexConfig
    | ScrollyDotDensityConfig
    | ScrollyLocatorConfig
    | ScrollyCartogramConfig
    | ImageScrollyConfig;
}> = ({ config }) => {
  // Themed scaffold surfaces derived from the newsroom house ground (config.themeBg): on a DARK
  // ground the whole scrolly goes dark — the GLOBAL page background, the prose cards and the header
  // all follow the theme, so it is never a white page with a themed chart ISLAND (the exact gap:
  // only the chart graphic was themed). On a light ground the legacy white cards are kept; the light
  // default (themeBg undefined) → deriveFurniture returns the light COLORS, so pageBg = "#FFFFFF" and
  // the scaffold is byte-identical to before.
  const themeBg = (config as { themeBg?: string }).themeBg;
  // Blank-trimmed, exactly as ChartFrame trims it: a whitespace-only field must emit nothing
  // rather than an empty node the accessibility tree would announce.
  const altInsight = (config as { altInsight?: string }).altInsight?.trim();
  const F = deriveFurniture(themeBg);
  const dark = bgIsDark(themeBg);
  const pageBg = F.bg;
  // The prose card / header surface is DERIVED from the EXACT house ground (F.bg), not a binary
  // slate/white that ignored the exact colour: the ground LIFTED toward white — a raised, harmonised
  // surface (a dark navy/charcoal ground → a lighter tint OF that ground; a light ground → a
  // near-white tint of it). ink/muted come straight from deriveFurniture. Light default → F.bg is
  // "#FFFFFF" so the lift stays near-white (byte-identical look to the legacy white card).
  const _rgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const [cr, cg, cb] = _rgb(F.bg).map((v) =>
    Math.round(v + (255 - v) * (dark ? 0.12 : 0.55)),
  );
  const cardBg = `rgba(${cr},${cg},${cb},0.94)`;
  const cardInk = F.ink;
  const cardSub = F.muted;
  const cardBorder = dark
    ? `1px solid rgba(255,255,255,0.14)`
    : "1px solid rgba(0,0,0,0.06)";

  // Theme the GLOBAL page background (the body behind the sticky graphic + prose column) so the
  // whole scrolly is themed, not just the chart. Restores the previous value on unmount.
  useEffect(() => {
    const prev = document.body.style.background;
    document.body.style.background = pageBg;
    return () => {
      document.body.style.background = prev;
    };
  }, [pageBg]);

  // -------------------------------------------------------------------------
  // Build the story once at mount — deterministic from config.
  // Dispatches on type: symbol → hex-grid → dot-density → locator → cartogram,
  // then falls back to choropleth.
  // -------------------------------------------------------------------------
  const story = useMemo(() => {
    // IMAGE config (visual:"image", resolveVisual's image branch) — the story
    // derivation is image-native's pure bridge (captions pass through AS-IS; the
    // journalist gate upstream owns them). The `in` guard narrows the union (only
    // ImageScrollyConfig carries `visual`), mirroring resolveVisual exactly.
    if ("visual" in config) {
      return imageStoryToChapters(config.story);
    }

    // CHART config (chart-native NativeSpec) — has `nativeType`. Build the chart story
    // BEFORE the map branches; a chart needs no geojson.
    if ("nativeType" in config) {
      const nativeType = (config as { nativeType: string }).nativeType;
      // Unsupported chart type → return an empty (but valid) story; the render shows a clear
      // fallback instead of calling deriveChartStory (which throws for these).
      if (!CHART_SCROLLY_TYPES.has(nativeType)) {
        return {
          title: (config as { title?: string }).title ?? "",
          description: (config as { description?: string }).description,
          source: (config as { source?: { name: string; url: string } }).source,
          visual: "chart",
          steps: [],
        } as ReturnType<typeof chartStoryToChapters>;
      }
      const beats = deriveChartStory(
        config as unknown as import("./ScrollyChart").ChartScrollyConfig,
        (config as { insight?: string }).insight,
      );
      return chartStoryToChapters(beats, {
        title: (config as { title?: string }).title ?? "",
        description: (config as { description?: string }).description,
        source: (config as { source?: { name: string; url: string } }).source,
      });
    }

    // Unsupported MAP type → an empty but valid story, mirroring the chart track above. Without
    // this the ternary chain's final `else` renders any unknown type as a choropleth.
    // `config.type` is undefined for the default choropleth config (ScrollyMapConfig's `type` is
    // optional — choropleth is the un-typed default), so it is normalized before the lookup: the
    // omitted-type default is a real supported config, not an unknown one.
    if (!MAP_SCROLLY_TYPES.has(config.type ?? "choropleth")) {
      return {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        visual: "map",
        steps: [],
      } as ReturnType<typeof mapStoryToChapters>;
    }

    if (config.type === "symbol") {
      const beats = deriveSymbolStory(config.points, {
        title: config.title ?? "",
        insight: config.insight ?? config.title,
        unit: config.valueUnit ?? "",
        lang: config.lang,
        // The journalist's CONFIRMED walk. Dropping it here (and in ScrollySymbolMap's own
        // camera computation) let a validated arc collapse back to the salience default —
        // silently, which is the one outcome this seam may not have. The types that cannot
        // honour a plan refuse it by name at validation instead (validate-config.ts).
        arcBeats: config.arcBeats,
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: config.points.length,
        lang: config.lang,
      });
    }

    if (config.type === "hex-grid") {
      const layout = computeHexGrid(config);
      const beats = deriveHexGridStory(layout, {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        lang: config.lang,
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: layout.cells.length,
        lang: config.lang,
      });
    }

    if (config.type === "dot-density") {
      const world = decodeWorldGeometry(config.geometry, "dot-density");
      const layout = computeDotDensity(config, world, "iso_a3");
      const beats = deriveDotDensityStory(layout, {
        title: config.title ?? "",
        description: config.description,
        insight:
          ((config as unknown as Record<string, unknown>).insight as
            string | undefined) ??
          config.title ??
          "",
        unit:
          ((config as unknown as Record<string, unknown>).valueUnit as
            string | undefined) ?? "",
        lang: config.lang,
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: layout.regions.length,
        lang: config.lang,
      });
    }

    if (config.type === "locator") {
      const geo = locatorGeometry({
        markers: config.markers,
        markerStyle: config.markerStyle,
      });
      const beats = deriveLocatorStory(config.markers, {
        title: config.title ?? "",
        description: config.description,
        insight:
          ((config as unknown as Record<string, unknown>).insight as
            string | undefined) ??
          config.title ??
          "",
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: geo.markers.length,
        lang: config.lang,
      });
    }

    if (config.type === "cartogram") {
      const world = decodeWorldGeometry(config.geometry, "cartogram");
      const layout = computeCartogram(config, world);
      const beats = deriveCartogramStory(layout, {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
        lang: config.lang,
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: layout.cells.length,
        lang: config.lang,
      });
    }

    const world = decodeWorldGeometry(
      (config as unknown as Record<string, unknown>).geometry as
        Topology | undefined,
      "choropleth",
    );
    const layout = computeChoropleth(config, world, "iso_a3", {
      bins: 5,
      scaleType:
        ((config as unknown as Record<string, unknown>).scaleType as
          "sequential" | "diverging" | undefined) ?? "sequential",
      palette: (config as unknown as Record<string, unknown>).palette as
        string | string[] | undefined,
      labelField: (config as unknown as Record<string, unknown>).labelField as
        string | undefined,
    });
    const beats = deriveMapStory(layout, world, "iso_a3", {
      title: config.title ?? "",
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
      valueField: config.valueField,
      narrativePattern: (config as unknown as Record<string, unknown>)
        .valueKind as "temporal" | "magnitude" | "categorical" | undefined,
      lang: config.lang,
      // See the symbol branch above: the confirmed arc reaches the deriver, or it is refused.
      arcBeats: config.arcBeats,
    });
    const regionsWithData = layout.joined.filter(
      (j) => j.value !== null,
    ).length;
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description ?? config.unit,
      source: config.source,
      regionsWithData,
      lang: config.lang,
    });
  }, [config]);

  // -------------------------------------------------------------------------
  // Step state — starts at 0, updated by IntersectionObserver.
  // -------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState(0);

  // The active step's BEAT ref — what ScrollyMap flies to. Steps are not 1:1 with
  // beats (establish / empty-takeaway are dropped), so resolve through the chapter.
  const stepRef = story.steps[currentStep]?.ref;
  const currentBeatRef = typeof stepRef === "number" ? stepRef : 0;

  // Image track: the per-frame data the step cards surface (caption already IS the
  // prose; the per-frame photo CREDIT — a different axis from the module source — is
  // rendered under it, spec §10). null on the chart/map tracks.
  const imageFrames = "visual" in config ? config.story.frames : null;
  const photoLabel = storyCopy(config.lang).photoLabel;

  // Graceful degradation flag (pure, not a hook) — set when a chart config carries an
  // unsupported nativeType. The render shows a clear message instead of an empty scaffold.
  const unsupportedChart =
    "nativeType" in config &&
    !CHART_SCROLLY_TYPES.has((config as { nativeType: string }).nativeType)
      ? (config as { nativeType: string }).nativeType
      : null;

  // Same flag for the map track. `config.type` is undefined for the default (un-typed)
  // choropleth config, so it is normalized to "choropleth" before the lookup — mirrors the
  // useMemo guard above, and keeps the omitted-type default out of this flag.
  const unsupportedMapType =
    !("visual" in config) && !("nativeType" in config)
      ? ((config as { type?: string }).type ?? "choropleth")
      : null;
  const unsupportedMap =
    unsupportedMapType !== null && !MAP_SCROLLY_TYPES.has(unsupportedMapType)
      ? unsupportedMapType
      : null;

  // For a LINE chart track: the data index the line head must reach when each RENDERED card
  // centres. Built here (not in ScrollyChart) because the collapse rule below — which drops a
  // card whose prose repeats the previous — defines the exact card set that drives
  // scrollProgress. Aligning the target array 1:1 with those cards makes the head land on the
  // captioned point as its card centres (title/establish → 0, reveal → its dataIndex, takeaway
  // → the last index). Without this the head lags the caption by ~one step.
  const lineCardTargets = useMemo<number[] | undefined>(() => {
    if (
      !("nativeType" in config) ||
      (config as { nativeType: string }).nativeType !== "line"
    )
      return undefined;
    let beats;
    try {
      beats = deriveChartStory(
        config as unknown as import("./ScrollyChart").ChartScrollyConfig,
        (config as { insight?: string }).insight,
      );
    } catch {
      return undefined;
    }
    const lastIndex = Math.max(
      0,
      ...beats.filter((b) => b.kind === "reveal").map((b) => b.dataIndex ?? 0),
    );
    const targets: number[] = [];
    story.steps.forEach((s, i) => {
      if (i > 0 && s.prose === story.steps[i - 1].prose) return; // collapsed — not rendered
      const beat = typeof s.ref === "number" ? beats[s.ref] : undefined;
      if (beat?.kind === "reveal") targets.push(beat.dataIndex ?? 0);
      else if (beat?.kind === "takeaway")
        // Explicit journalist beats set the takeaway's own dataIndex (the FULL
        // line — the last data point); the auto path leaves it unset and closes
        // on the furthest reveal (which IS the last point for auto stories).
        targets.push(beat.dataIndex ?? lastIndex);
      else targets.push(0); // title / establish
    });
    return targets;
  }, [config, story]);

  // Ref array for prose step DOM nodes — one slot per step. Declared before the effects
  // that read it (scroll measurement + IntersectionObserver).
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

  // Continuous scroll fraction (0→1) for a chart track — a line draws on smoothly with
  // scroll instead of jumping between beats. It is measured over the RENDERED prose CARDS
  // (the same DOM the reader sees centred), NOT a raw wrapper fraction: the line must
  // reach a captioned point exactly when THAT card reaches the viewport centre, so the
  // scrub and the caption stay in lock-step. Position = the fractional index of the card
  // at the viewport centre, normalised across the rendered cards.
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const cards = stepRefs.current.filter(Boolean) as HTMLElement[];
      if (cards.length < 2) return;
      const centerY = window.innerHeight / 2;
      const centers = cards.map((el) => {
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      // Fractional index of the card straddling the viewport centre (centres move UP as
      // you scroll down, so they decrease; find the pair centres[i] <= centerY <= [i+1]).
      let pos = centerY <= centers[0] ? 0 : cards.length - 1;
      for (let i = 0; i + 1 < centers.length; i++) {
        if (centers[i] <= centerY && centerY < centers[i + 1]) {
          const span = centers[i + 1] - centers[i] || 1;
          pos = i + (centerY - centers[i]) / span;
          break;
        }
      }
      setScrollProgress(pos / (cards.length - 1));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [story.steps.length]);

  // -------------------------------------------------------------------------
  // IntersectionObserver — fires when a step crosses the viewport midpoint.
  // rootMargin "-50% 0px -50% 0px" shrinks the intersection zone to a
  // horizontal band at the exact vertical centre of the viewport.
  // -------------------------------------------------------------------------
  useEffect(() => {
    stepRefs.current = stepRefs.current.slice(0, story.steps.length);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = Number(
            (entry.target as HTMLElement).dataset["stepIndex"],
          );
          if (!Number.isNaN(idx)) setCurrentStep(idx);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );

    for (const el of stepRefs.current) {
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [story.steps.length]);

  // -------------------------------------------------------------------------
  // Styles (inline — no CSS file dependency).
  // -------------------------------------------------------------------------
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    // The wrapper must be tall enough for all steps so the sticky graphic
    // stays pinned from the first step to the last.
    minHeight: "100vh",
    // The house ground fills the WHOLE scroll area (not just the chart box), so the sticky graphic
    // and every prose card sit on the themed ground — no white margins above/below the chart. The
    // body-background effect above is belt-and-braces for the html/body behind this wrapper.
    background: pageBg,
  };

  const stickyGraphicStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    height: "100vh",
    width: "100%",
    // Stack behind the prose column (z-index 0) so prose cards sit above.
    zIndex: 0,
  };

  const proseColumnStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 1,
    // Pull the prose column UP over the sticky graphic (which occupies the
    // first 100vh). The steps then provide the scroll height while the graphic
    // stays pinned. Putting the negative margin here (not on the graphic) is
    // what keeps the document tall enough to actually scroll.
    marginTop: "-100vh",
    // Pointer events off on the column so the map stays hoverable; each
    // prose card re-enables them.
    pointerEvents: "none",
  };

  const stepBlockStyle: React.CSSProperties = {
    minHeight: "90vh",
    display: "flex",
    alignItems: "center",
    // Horizontal gutters so the card never hugs the screen edges (mobile).
    padding: "0 24px",
    boxSizing: "border-box",
  };

  const cardBase: React.CSSProperties = {
    pointerEvents: "auto",
    background: cardBg,
    backdropFilter: "blur(4px)",
    borderRadius: 8,
    border: cardBorder,
    // Generous internal padding so the text breathes on the sides.
    padding: "1.15rem 1.6rem",
    // Capped at 360px (desktop); on mobile the step gutters (above) bound it.
    maxWidth: 360,
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    // WCAG-contrasting text on the (light or dark) card.
    color: cardInk,
    fontFamily: "sans-serif",
    fontSize: "clamp(14px, 3.6vw, 16px)",
    lineHeight: 1.5,
  };

  const alignCard = (
    align: "left" | "right" | "center" | undefined,
  ): React.CSSProperties => {
    if (align === "right") return { marginLeft: "auto", marginRight: "2rem" };
    if (align === "center") return { margin: "0 auto" };
    // default left
    return { marginLeft: "2rem" };
  };

  // Persistent module header — the insight title (the figure's standalone headline).
  // Shown once here; never repeated as a step caption.
  const headerStyle: React.CSSProperties = {
    position: "fixed",
    top: 16,
    left: 20,
    zIndex: 50,
    // Never overflow a narrow screen: cap at 420px, keep a 20px gutter each side.
    maxWidth: "min(420px, calc(100vw - 40px))",
    background: cardBg,
    backdropFilter: "blur(4px)",
    borderRadius: 8,
    border: cardBorder,
    padding: "11px 16px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
    pointerEvents: "none",
  };

  const creditStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 12,
    right: 16,
    zIndex: 100,
    fontFamily: "sans-serif",
    fontSize: 11,
    color: cardSub,
    background: `rgba(${cr},${cg},${cb},0.72)`,
    borderRadius: 4,
    padding: "2px 6px",
    pointerEvents: "auto",
  };

  // Defense-in-depth: an unsupported chart or map type reached the scrolly. Never crash — show
  // a clear message (the ② routing layer is what should have prevented this).
  if (unsupportedChart ?? unsupportedMap) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 24,
          boxSizing: "border-box",
          fontFamily: "sans-serif",
          background: pageBg,
          color: cardInk,
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          {story.title && (
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {story.title}
            </div>
          )}
          <div style={{ color: cardSub, fontSize: 14, lineHeight: 1.5 }}>
            {unsupportedChart ? (
              <>
                A &ldquo;{unsupportedChart}&rdquo; chart is not supported in a
                scrolly (only line, bar and scatter). Render it as a static
                chart instead.
              </>
            ) : (
              <>
                A &ldquo;{unsupportedMap}&rdquo; map is not supported in a
                scrolly (only symbol, hex-grid, dot-density, locator, cartogram
                and choropleth). Render it as a static or interactive map
                instead.
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // A34 (docs/splash/residuals.md): the scaffold used to return a bare fragment whose
  // first child was the header, so the Verify layer's capture ladder (lib/verify/capture.ts)
  // fell through to its structural guess `#root > div` and measured the 454×63px title
  // banner instead of the page — measured live, not deduced.
  //
  // Two obvious fixes each failed (measured, not assumed):
  //   - a plain wrapping `<div>` adds a box ABOVE the `position: sticky` graphic, which
  //     could move the sticky containing block — proved harmless here by an A/B: the
  //     step-activation scroll positions and the sticky graphic's own box are byte-identical
  //     before/after (docs/splash/residuals.md A34, `bun scripts/produce.mjs` + Playwright).
  //   - `display: contents` avoids the box but returns a zero `getBoundingClientRect()`,
  //     which would break the very crop this fix repairs — never used.
  // `display: block; position: static;` are the browser defaults for a bare `<div>`; spelled
  // out here so the invariant this fix depends on (no new positioning context, no new
  // containing block for the sticky descendant) is not left to an unstated default.
  return (
    <div data-splash-root="" style={{ display: "block", position: "static" }}>
      {/* WCAG 1.1.1 — the fuller accessible DESCRIPTION of the page.
          A chart-track scrolly's config IS a chart-native spec (lib/loop/assemble/scrolly.ts
          composes it through assembleChartNative), so it carries `altInsight`; chart-native
          paints that string from its OWN mount.tsx (AltInsightContext → ChartFrame), which this
          package never mounts. So every chart scrolly shipped WITHOUT the description its own
          config carried, and `capture` filed a blocking `furniture-missing` on every one of them
          at all three breakpoints (measured, lib/loop/scrolly-e2e.test.ts).
          Read off the config the way `themeBg` above is — the union of track configs does not
          declare the field, and a track that never carries it emits nothing at all (absent or
          blank ⇒ no node, so every existing sample/map/image render is byte-identical).
          INSIDE [data-splash-root], because that is the element the capture ladder screenshots
          and searches; out of flow (position:absolute, 1x1, clipped) so it cannot move the
          sticky graphic's containing block — the invariant A34's fix depends on. */}
      {altInsight && <p style={VISUALLY_HIDDEN}>{altInsight}</p>}
      {/* Persistent figure title — the insight, always visible (self-contained module) */}
      {story.title && (
        <div style={headerStyle}>
          <div
            data-splash-title=""
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: "clamp(13px, 3.8vw, 15px)",
              lineHeight: 1.3,
              color: cardInk,
            }}
          >
            {story.title}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Scroll container                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div style={wrapperStyle}>
        {/* Sticky graphic — the map stays pinned while prose steps scroll above */}
        <div style={stickyGraphicStyle} data-testid="scrolly-sticky-graphic">
          {/* Dispatch on config.type: symbol → ScrollySymbolMap, hex-grid → ScrollyHexMap,
              else choropleth → ScrollyMap. */}
          {/* Pass the active step's BEAT ref (not the step index) — steps no longer
              map 1:1 to beats (the establish/empty-takeaway beats are dropped from
              the scroll), so the map must fly to story.steps[currentStep].ref. */}
          {"visual" in config ? (
            <ScrollyImage config={config} currentStep={currentBeatRef} />
          ) : "nativeType" in config ? (
            <ScrollyChart
              config={config as unknown as ChartScrollyConfig}
              scrollProgress={scrollProgress}
              currentStep={currentBeatRef}
              lineCardTargets={lineCardTargets}
            />
          ) : config.type === "symbol" ? (
            <ScrollySymbolMap
              config={config as ScrollySymbolConfig}
              currentStep={currentBeatRef}
            />
          ) : config.type === "hex-grid" ? (
            <ScrollyHexMap
              config={config as ScrollyHexConfig}
              currentStep={currentBeatRef}
            />
          ) : config.type === "dot-density" ? (
            <ScrollyDotDensityMap
              config={config as ScrollyDotDensityConfig}
              currentStep={currentBeatRef}
            />
          ) : config.type === "locator" ? (
            <ScrollyLocatorMap
              config={config as ScrollyLocatorConfig}
              currentStep={currentBeatRef}
            />
          ) : config.type === "cartogram" ? (
            <ScrollyCartogramMap
              config={config as ScrollyCartogramConfig}
              currentStep={currentBeatRef}
            />
          ) : (
            <ScrollyMap
              config={config as ScrollyMapConfig}
              currentStep={currentBeatRef}
            />
          )}
        </div>

        {/* Prose column — scrolls normally over the sticky graphic */}
        <div style={proseColumnStyle}>
          {story.steps.map((step, i) => {
            // Collapse a step whose caption is identical to the previous step's.
            // The title beat and the OVERVIEW (establish) beat both carry the
            // figure's description, so without this the intro caption renders
            // twice in a row. Both frame the full extent, so dropping the second
            // block leaves the camera unchanged — the intro simply shows once.
            if (i > 0 && step.prose === story.steps[i - 1].prose) return null;
            return (
              <div
                key={step.id}
                className="step"
                data-step-index={i}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                style={stepBlockStyle}
              >
                <div
                  style={{
                    ...cardBase,
                    ...alignCard(step.align),
                  }}
                >
                  {step.prose}
                  {/* Image track: the visible frame's photo credit rides in the card
                      (name, url when present) — per-frame attribution, spec §10. */}
                  {imageFrames &&
                    typeof step.ref === "number" &&
                    imageFrames[step.ref] && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: cardSub,
                        }}
                      >
                        {photoLabel}{" "}
                        {imageFrames[step.ref].credit.url ? (
                          <a
                            href={imageFrames[step.ref].credit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "inherit" }}
                          >
                            {imageFrames[step.ref].credit.name}
                          </a>
                        ) : (
                          imageFrames[step.ref].credit.name
                        )}
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Source / credit line — always visible, pinned bottom-right          */}
      {/* ------------------------------------------------------------------ */}
      {config.source && (
        <div style={creditStyle}>
          {sourceLabel(config.lang)}{" "}
          {/* Name-only sources render as PLAIN TEXT — an <a> without a real href is an
              a11y defect (empty link), and an honest prose source often has no URL. */}
          {config.source.url ? (
            <a
              href={config.source.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit" }}
            >
              {config.source.name}
            </a>
          ) : (
            config.source.name
          )}
        </div>
      )}
    </div>
  );
};
