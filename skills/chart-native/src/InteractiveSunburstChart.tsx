// Thin sunburst-specific binding over the generic core/InteractiveChart wrapper.
import { SunburstChart, type SunburstConfig } from "./SunburstChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveSunburstChartProps {
  config: SunburstConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveSunburstChart({
  config,
  animateOn = "scroll",
  durationMs = 2200,
  height = 480,
  minWidth = 300,
}: InteractiveSunburstChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <SunburstChart
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
