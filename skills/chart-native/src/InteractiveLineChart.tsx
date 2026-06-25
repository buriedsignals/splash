// Thin line-specific binding over the generic core/InteractiveChart wrapper.
// All the responsive/clock machinery lives in core; this just draws the line.
import { LineChart, type ChartConfig } from "./LineChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export type { AnimateOn };

export interface InteractiveLineChartProps {
  config: ChartConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveLineChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveLineChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <LineChart
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
