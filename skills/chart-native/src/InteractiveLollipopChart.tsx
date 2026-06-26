// Thin lollipop-specific binding over the generic core/InteractiveChart wrapper.
import { LollipopChart, type LollipopConfig } from "./LollipopChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveLollipopChartProps {
  config: LollipopConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveLollipopChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveLollipopChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <LollipopChart
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
