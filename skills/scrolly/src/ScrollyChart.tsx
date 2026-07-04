import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { LineChart } from "../../chart-native/src/LineChart";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";
import { deriveChartStory } from "../../chart-native/src/chart-story";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";

export type ChartScrollyConfig = NativeSpec & {
  description?: string;
  insight?: string;
  source?: { name: string; url?: string };
};

// Map the continuous scroll fraction (0→1 over the rendered prose cards) to a FRACTIONAL
// data-point index the line should be drawn up to, hitting each captioned point exactly
// when its card centres. The visible cards are [intro, reveal₀ … reveal_{K-1}, takeaway] —
// evenly spaced in scroll — so the checkpoints are the data indices
// [0, d₀ … d_{K-1}, lastIndex]. Linearly interpolate at scroll·(len-1). LineChart then
// converts the returned index to the exact path fraction at its OWN responsive width, so
// the head lands on the point at any size. Pure + testable.
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
  scrollProgress: number;
}> = ({ config, scrollProgress }) => {
  const { native, checkpoints } = useMemo(() => {
    const native = specToNativeConfig(config).config as {
      points: unknown[];
    } & Record<string, unknown>;
    const beats = deriveChartStory(config, config.insight);
    const revealIndices = beats
      .filter((b) => b.kind === "reveal")
      .map((b) => b.dataIndex ?? 0);
    const lastIndex = Math.max(0, native.points.length - 1);
    // [intro=first point] + each reveal's data index + [takeaway=last point]
    const checkpoints = [0, ...revealIndices, lastIndex];
    return { native, checkpoints };
  }, [config]);

  // Responsive: measure the sticky container width (ResizeObserver) and hand it to
  // LineChart so the chart fills its width and shrinks on mobile — a chart embed must
  // ALWAYS be responsive. Height keeps a readable aspect, clamped.
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

  const revealTo = scrollToLineProgress(scrollProgress, checkpoints);

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
      {width != null && (
        <LineChart
          config={native as never}
          width={width}
          height={Math.round(Math.max(320, Math.min(520, width * 0.62)))}
          revealTo={revealTo}
          responsive
          embedded
          interactive={false}
        />
      )}
    </div>
  );
};
