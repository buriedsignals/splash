// Thin fan-specific binding over the generic core/InteractiveChart wrapper.
import { FanChart, type FanConfig } from "./FanChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveFanChartProps {
  config: FanConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveFanChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveFanChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <FanChart
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
