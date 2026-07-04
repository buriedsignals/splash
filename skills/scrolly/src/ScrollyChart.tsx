import React, { useMemo } from "react";
import { LineChart } from "../../chart-native/src/LineChart";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";
import { deriveChartStory } from "../../chart-native/src/chart-story";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";

export type ChartScrollyConfig = NativeSpec & {
  description?: string;
  insight?: string;
  source?: { name: string; url?: string };
};

// Map the continuous scroll fraction (0→1 through the pinned region) to the LINE reveal
// progress, hitting each captioned point exactly when its prose card reaches centre. The
// visible cards are [intro, reveal₀ … reveal_{K-1}, takeaway] — evenly spaced in scroll —
// so the checkpoint array is [0, r₀ … r_{K-1}, 1] (r = each reveal's path-length
// fraction). Linearly interpolate it at scrollProgress·(len-1): the line draws smoothly
// and reaches reveal J's point (r_J) at that card's scroll position. Pure + testable.
export function scrollToLineProgress(
  scrollProgress: number,
  revealProgresses: number[],
): number {
  const checkpoints = [0, ...revealProgresses, 1];
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
  const { native, revealProgresses } = useMemo(() => {
    const native = specToNativeConfig(config).config;
    const beats = deriveChartStory(config, config.insight);
    const revealProgresses = beats
      .filter((b) => b.kind === "reveal")
      .map((b) => b.progress ?? 1);
    return { native, revealProgresses };
  }, [config]);

  // Continuous scrub — the line draws on with the scroll (embedded LineChart: static axes
  // from the start, linear reveal, no title/source since the scrolly host shows them).
  const progress = scrollToLineProgress(scrollProgress, revealProgresses);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <LineChart
        config={native as never}
        progress={progress}
        responsive
        embedded
        interactive={false}
      />
    </div>
  );
};
