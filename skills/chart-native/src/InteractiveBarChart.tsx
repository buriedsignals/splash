// Thin bar-specific binding over the generic core/InteractiveChart wrapper.
import { BarChart, type BarConfig } from "./BarChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveBarChartProps {
  config: BarConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveBarChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 420,
  minWidth = 280,
}: InteractiveBarChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <BarChart
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
