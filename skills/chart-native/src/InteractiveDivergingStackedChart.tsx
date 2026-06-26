// Thin diverging-stacked-specific binding over the generic core/InteractiveChart wrapper.
import {
  DivergingStackedChart,
  type DivergingStackedConfig,
} from "./DivergingStackedChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveDivergingStackedChartProps {
  config: DivergingStackedConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveDivergingStackedChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveDivergingStackedChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <DivergingStackedChart
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
