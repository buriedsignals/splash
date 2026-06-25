// Thin histogram-specific binding over the generic core/InteractiveChart wrapper.
import { HistogramChart, type HistogramConfig } from "./HistogramChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveHistogramChartProps {
  config: HistogramConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveHistogramChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveHistogramChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <HistogramChart
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
