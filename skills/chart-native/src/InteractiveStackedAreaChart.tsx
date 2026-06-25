// Thin stacked-area-specific binding over the generic core/InteractiveChart.
import { StackedAreaChart, type StackedAreaConfig } from "./StackedAreaChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveStackedAreaChartProps {
  config: StackedAreaConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveStackedAreaChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveStackedAreaChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <StackedAreaChart
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
