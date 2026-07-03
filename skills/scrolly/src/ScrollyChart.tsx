import React, { useMemo } from "react";
import { LineChart } from "../../chart-native/src/LineChart";
import { specToNativeConfig } from "../../chart-native/src/spec-to-config";
import {
  deriveChartStory,
  mapStepToBeat,
} from "../../chart-native/src/chart-story";
import type { NativeSpec } from "../../chart-native/src/spec-to-config";

export type ChartScrollyConfig = NativeSpec & {
  description?: string;
  insight?: string;
  source?: { name: string; url?: string };
};

export const ScrollyChart: React.FC<{
  config: ChartScrollyConfig;
  currentStep: number;
}> = ({ config, currentStep }) => {
  const { native, beats } = useMemo(() => {
    const native = specToNativeConfig(config).config;
    const beats = deriveChartStory(config, config.insight);
    return { native, beats };
  }, [config]);

  const beat = mapStepToBeat(beats, currentStep);
  // establish/takeaway show the whole line; a reveal draws to its progress.
  const progress = beat.kind === "reveal" ? (beat.progress ?? 1) : 1;

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
        interactive={false}
      />
    </div>
  );
};
