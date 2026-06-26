// Thin radar-specific binding over the generic core/InteractiveChart wrapper.
import { RadarChart, type RadarConfig } from "./RadarChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveRadarChartProps {
  config: RadarConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveRadarChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveRadarChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <RadarChart
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
