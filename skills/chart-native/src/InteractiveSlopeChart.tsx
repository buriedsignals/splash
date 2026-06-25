// Thin slope-specific binding over the generic core/InteractiveChart wrapper.
import { SlopeChart, type SlopeConfig } from "./SlopeChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveSlopeChartProps {
  config: SlopeConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveSlopeChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveSlopeChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <SlopeChart
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
