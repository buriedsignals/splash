import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
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
}> = ({ config, scrollProgress, currentStep }) => {
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
    const checkpoints = [0, ...revealIndices, lastIndex];
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
          revealTo={scrollToLineProgress(scrollProgress, checkpoints)}
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
        background: "#ffffff",
      }}
    >
      {chart}
    </div>
  );
};
