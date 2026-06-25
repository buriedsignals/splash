// Thin grouped-bar-specific binding over the generic core/InteractiveChart.
import { GroupedBarChart, type GroupedConfig } from "./GroupedBarChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveGroupedBarChartProps {
  config: GroupedConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveGroupedBarChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 460,
  minWidth = 280,
}: InteractiveGroupedBarChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <GroupedBarChart
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
