// Thin beeswarm-specific binding over the generic core/InteractiveChart wrapper.
import { BeeswarmChart, type BeeswarmConfig } from "./BeeswarmChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveBeeswarmChartProps {
  config: BeeswarmConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveBeeswarmChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 480,
  minWidth = 280,
}: InteractiveBeeswarmChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <BeeswarmChart
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
