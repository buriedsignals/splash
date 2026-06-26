// Thin pyramid-specific binding over the generic core/InteractiveChart wrapper.
import {
  PopulationPyramidChart,
  type PopulationPyramidConfig,
} from "./PopulationPyramidChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractivePopulationPyramidChartProps {
  config: PopulationPyramidConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractivePopulationPyramidChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractivePopulationPyramidChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <PopulationPyramidChart
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
