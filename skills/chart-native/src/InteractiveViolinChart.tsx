// Thin violin-specific binding over the generic core/InteractiveChart wrapper.
import { ViolinChart, type ViolinConfig } from "./ViolinChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveViolinChartProps {
  config: ViolinConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveViolinChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveViolinChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ViolinChart
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
