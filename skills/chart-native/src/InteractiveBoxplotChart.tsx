// Thin boxplot-specific binding over the generic core/InteractiveChart wrapper.
import { BoxplotChart, type BoxplotConfig } from "./BoxplotChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveBoxplotChartProps {
  config: BoxplotConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveBoxplotChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveBoxplotChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <BoxplotChart
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
