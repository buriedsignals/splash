// Thin lorenz-specific binding over the generic core/InteractiveChart wrapper.
import { LorenzChart, type LorenzConfig } from "./LorenzChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveLorenzChartProps {
  config: LorenzConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveLorenzChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 300,
}: InteractiveLorenzChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <LorenzChart
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
