// Thin stacked-bar-specific binding over the generic core/InteractiveChart.
import { StackedBarChart, type StackedConfig } from "./StackedBarChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveStackedBarChartProps {
  config: StackedConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveStackedBarChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 460,
  minWidth = 280,
}: InteractiveStackedBarChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <StackedBarChart
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
