// Thin heatmap-specific binding over the generic core/InteractiveChart wrapper.
import { HeatmapChart, type HeatmapConfig } from "./HeatmapChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveHeatmapChartProps {
  config: HeatmapConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveHeatmapChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveHeatmapChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <HeatmapChart
          config={config}
          progress={progress}
          width={width}
          height={height}
          interactive
          responsive
        />
      )}
    />
  );
}
