// Scrolly — sticky-graphic scrollytelling scaffold.
// Layout: one sticky map behind scrolling prose steps. An IntersectionObserver
// (NOT scroll-position math) drives `currentStep`, which ScrollyMap consumes.
//
// Dispatcher generality: v1 has a single `visual:"map"` track. To add
// `chart` or `image`, introduce a switch(story.visual) around the sticky
// graphic slot — the step model (ScrollyStep.visual) already carries the
// per-step visual kind.

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { mapStoryToChapters } from "./chapters";
import { chartStoryToChapters } from "./chart-chapters";
import { deriveChartStory } from "../../chart-native/src/chart-story";
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

import worldRaw from "../../map-native/assets/geo/world.geojson?raw";
import { sourceLabel } from "../../map-native/src/core/locale";
const world = JSON.parse(worldRaw) as GeoJSON.FeatureCollection;

// The chart types the scrolly can narrate (deriveChartStory dispatches on these). Any other
// nativeType (pie, etc.) has no progressive-reveal / ranked-walk narrative — the routing layer
// (② suggest-chart) must never emit one, and if one slips through we degrade gracefully rather
// than crash the render (deriveChartStory would otherwise throw inside the story useMemo).
const CHART_SCROLLY_TYPES = new Set(["line", "bar", "scatter"]);

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
    | ScrollyCartogramConfig;
}> = ({ config }) => {
  // -------------------------------------------------------------------------
  // Build the story once at mount — deterministic from config.
  // Dispatches on type: symbol → hex-grid → dot-density → locator → cartogram,
  // then falls back to choropleth.
  // -------------------------------------------------------------------------
  const story = useMemo(() => {
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

    if (config.type === "symbol") {
      const beats = deriveSymbolStory(config.points, {
        title: config.title ?? "",
        insight: config.insight ?? config.title,
        unit: config.valueUnit ?? "",
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: config.points.length,
      });
    }

    if (config.type === "hex-grid") {
      const layout = computeHexGrid(config);
      const beats = deriveHexGridStory(layout, {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: layout.cells.length,
      });
    }

    if (config.type === "dot-density") {
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
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: layout.regions.length,
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
      });
    }

    if (config.type === "cartogram") {
      const layout = computeCartogram(config, world);
      const beats = deriveCartogramStory(layout, {
        title: config.title ?? "",
        insight: config.insight ?? config.title ?? "",
      });
      return mapStoryToChapters(beats, {
        title: config.title ?? "",
        description: config.description,
        source: config.source,
        regionsWithData: layout.cells.length,
      });
    }

    const layout = computeChoropleth(config, world, "iso_a3", {
      bins: 5,
      scaleType:
        ((config as unknown as Record<string, unknown>).scaleType as
          "sequential" | "diverging" | undefined) ?? "sequential",
      palette: (config as unknown as Record<string, unknown>).palette as
        string | string[] | undefined,
    });
    const beats = deriveMapStory(layout, world, "iso_a3", {
      title: config.title ?? "",
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
      valueField: config.valueField,
      narrativePattern: (config as unknown as Record<string, unknown>)
        .valueKind as "temporal" | "magnitude" | "categorical" | undefined,
      lang: config.lang,
    });
    const regionsWithData = layout.joined.filter(
      (j) => j.value !== null,
    ).length;
    return mapStoryToChapters(beats, {
      title: config.title ?? "",
      description: config.description ?? config.unit,
      source: config.source,
      regionsWithData,
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

  // Graceful degradation flag (pure, not a hook) — set when a chart config carries an
  // unsupported nativeType. The render shows a clear message instead of an empty scaffold.
  const unsupportedChart =
    "nativeType" in config &&
    !CHART_SCROLLY_TYPES.has((config as { nativeType: string }).nativeType)
      ? (config as { nativeType: string }).nativeType
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
      else if (beat?.kind === "takeaway") targets.push(lastIndex);
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
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(4px)",
    borderRadius: 8,
    // Generous internal padding so the text breathes on the sides.
    padding: "1.15rem 1.6rem",
    // Capped at 360px (desktop); on mobile the step gutters (above) bound it.
    maxWidth: 360,
    boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
    // WCAG-contrasting text on the semi-opaque white card.
    color: "#111111",
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
    background: "rgba(255,255,255,0.9)",
    backdropFilter: "blur(4px)",
    borderRadius: 8,
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
    color: "rgba(0,0,0,0.55)",
    background: "rgba(255,255,255,0.7)",
    borderRadius: 4,
    padding: "2px 6px",
    pointerEvents: "auto",
  };

  // Defense-in-depth: an unsupported chart type reached the scrolly. Never crash — show a
  // clear message (the ② routing layer is what should have prevented this).
  if (unsupportedChart) {
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
          color: "#111",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 420 }}>
          {story.title && (
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {story.title}
            </div>
          )}
          <div style={{ color: "#555", fontSize: 14, lineHeight: 1.5 }}>
            A &ldquo;{unsupportedChart}&rdquo; chart is not supported in a
            scrolly (only line, bar and scatter). Render it as a static chart
            instead.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Persistent figure title — the insight, always visible (self-contained module) */}
      {story.title && (
        <div style={headerStyle}>
          <div
            style={{
              fontFamily: "sans-serif",
              fontWeight: 700,
              fontSize: "clamp(13px, 3.8vw, 15px)",
              lineHeight: 1.3,
              color: "#111",
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
        <div style={stickyGraphicStyle}>
          {/* Dispatch on config.type: symbol → ScrollySymbolMap, hex-grid → ScrollyHexMap,
              else choropleth → ScrollyMap. */}
          {/* Pass the active step's BEAT ref (not the step index) — steps no longer
              map 1:1 to beats (the establish/empty-takeaway beats are dropped from
              the scroll), so the map must fly to story.steps[currentStep].ref. */}
          {"nativeType" in config ? (
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
          <a
            href={config.source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit" }}
          >
            {config.source.name}
          </a>
        </div>
      )}
    </>
  );
};
