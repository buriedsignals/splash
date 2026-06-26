// Thin bump-specific binding over the generic core/InteractiveChart wrapper.
import { BumpChart, type BumpConfig } from "./BumpChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveBumpChartProps {
  config: BumpConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveBumpChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 480,
  minWidth = 280,
}: InteractiveBumpChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <BumpChart
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
