// Thin scatter-specific binding over the generic core/InteractiveChart wrapper.
import { ScatterChart, type ScatterConfig } from "./ScatterChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveScatterChartProps {
  config: ScatterConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveScatterChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 460,
  minWidth = 280,
}: InteractiveScatterChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ScatterChart
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
