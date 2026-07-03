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
const world = JSON.parse(worldRaw) as GeoJSON.FeatureCollection;

// ---------------------------------------------------------------------------
// Scrolly
// ---------------------------------------------------------------------------

export const Scrolly: React.FC<{
  config:
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
      scaleType: "sequential",
    });
    const beats = deriveMapStory(layout, world, "iso_a3", {
      title: config.title ?? "",
      insight: config.insight ?? config.title ?? "",
      unit: config.valueUnit ?? "",
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

  // -------------------------------------------------------------------------
  // Ref array for prose step DOM nodes — one slot per step.
  // -------------------------------------------------------------------------
  const stepRefs = useRef<(HTMLElement | null)[]>([]);

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
          {config.type === "symbol" ? (
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
          {story.steps.map((step, i) => (
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
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Source / credit line — always visible, pinned bottom-right          */}
      {/* ------------------------------------------------------------------ */}
      {config.source && (
        <div style={creditStyle}>
          Source:{" "}
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
