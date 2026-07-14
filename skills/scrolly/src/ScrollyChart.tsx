import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { deriveFurniture } from "../../chart-native/src/core/tokens";
import { LineChart } from "../../chart-native/src/LineChart";
import { BarChart } from "../../chart-native/src/BarChart";
import { ScatterChart } from "../../chart-native/src/ScatterChart";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";
import { deriveChartStory } from "../../chart-native/src/chart-story";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";

export type ChartScrollyConfig = NativeSpec & {
  description?: string;
  insight?: string;
  source?: { name: string; url?: string };
};

// Map the continuous scroll fraction (0→1 over the rendered prose cards) to the value the
// LINE reveal should be drawn up to — the checkpoints are the reveal data indices
// [0, d₀ … d_{K-1}, lastIndex], so the head reaches each captioned point when its card
// centres. LineChart converts the returned index to the exact path fraction at its OWN
// responsive width. Pure + testable.
export function scrollToLineProgress(
  scrollProgress: number,
  checkpoints: number[],
): number {
  const s = Math.max(0, Math.min(1, scrollProgress));
  const x = s * (checkpoints.length - 1);
  const i = Math.floor(x);
  if (i >= checkpoints.length - 1) return checkpoints[checkpoints.length - 1];
  const f = x - i;
  return checkpoints[i] + (checkpoints[i + 1] - checkpoints[i]) * f;
}

export const ScrollyChart: React.FC<{
  config: ChartScrollyConfig;
  scrollProgress: number; // continuous — drives the LINE scrub
  currentStep: number; // discrete active beat — drives BAR/SCATTER highlight
  // Per-RENDERED-card reveal targets (data index the line head reaches when card k centres),
  // built by the host which owns the collapsed-card structure that drives scrollProgress.
  // When present it replaces the internal per-reveal checkpoints so the head lands on the
  // captioned point EXACTLY as its card centres (the internal fallback mis-aligns because
  // card-index space ≠ reveal-index space once title/establish/takeaway cards are counted).
  lineCardTargets?: number[];
}> = ({ config, scrollProgress, currentStep, lineCardTargets }) => {
  const { type, native, beats, checkpoints } = useMemo(() => {
    const { type, config: native } = specToNativeConfig(config);
    const beats = deriveChartStory(config, config.insight);
    const revealIndices = beats
      .filter((b) => b.kind === "reveal")
      .map((b) => b.dataIndex ?? 0);
    const lastIndex = Math.max(
      0,
      ((native as { points?: unknown[] }).points?.length ?? 1) - 1,
    );
    // Dedupe adjacent-equal checkpoints: lineNotableIndices ALWAYS includes the first (0)
    // and last (lastIndex) reveal, so [0, ...revealIndices, lastIndex] would duplicate both
    // endpoints — leaving the line empty for the first ~20% of scroll and full for the last
    // ~20% (dead scroll). Collapsing runs keeps the reveal tight across the whole track.
    const checkpoints = [0, ...revealIndices, lastIndex].filter(
      (v, i, a) => i === 0 || v !== a[i - 1],
    );
    return { type, native, beats, checkpoints };
  }, [config]);

  // Responsive: a chart embed must ALWAYS fill its width. Measure the container and hand
  // the width/height to the chart so it shrinks on mobile.
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(280, el.clientWidth));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const height =
    width != null
      ? Math.round(Math.max(320, Math.min(520, width * 0.62)))
      : 480;

  const activeBeat =
    beats[Math.max(0, Math.min(beats.length - 1, currentStep))];

  let chart: React.ReactNode = null;
  if (width != null) {
    if (type === "line") {
      // Continuous scrub — the line draws on with scroll (embedded: static axes, linear
      // reveal, no title/source since the scrolly host shows them).
      chart = (
        <LineChart
          config={native as never}
          width={width}
          height={height}
          revealTo={scrollToLineProgress(
            scrollProgress,
            lineCardTargets && lineCardTargets.length >= 2
              ? lineCardTargets
              : checkpoints,
          )}
          responsive
          embedded
        />
      );
    } else if (type === "bar") {
      // Ranked HIGHLIGHT walk — all bars visible; the active reveal's bar is accented.
      const highlightIndex =
        activeBeat?.kind === "reveal" ? activeBeat.highlightIndex : undefined;
      chart = (
        <BarChart
          config={{ ...(native as object), highlightIndex } as never}
          progress={1}
          width={width}
          height={height}
          responsive
          embedded
        />
      );
    } else if (type === "scatter") {
      // Outlier HIGHLIGHT walk — the active reveal's story point is labelled.
      const annotate =
        activeBeat?.kind === "reveal" && activeBeat.labelKey
          ? [activeBeat.labelKey]
          : undefined;
      chart = (
        <ScatterChart
          config={
            { ...(native as object), annotate, labelPoints: "none" } as never
          }
          progress={1}
          width={width}
          height={height}
          responsive
          embedded
        />
      );
    }
  }

  return (
    <div
      ref={ref}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // Derive the centring box background from the newsroom house ground (config.themeBg) so the
        // area around the chart matches the theme — NOT a hardcoded white that broke the dark theme
        // (a white box behind a themed chart). Light default → deriveFurniture returns #FFFFFF.
        background: deriveFurniture(config.themeBg).bg,
      }}
    >
      {chart}
    </div>
  );
};
