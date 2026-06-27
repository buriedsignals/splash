// Thin radial-bar-specific binding over the generic core/InteractiveChart wrapper.
import { RadialBarChart, type RadialBarConfig } from "./RadialBarChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveRadialBarChartProps {
  config: RadialBarConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveRadialBarChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveRadialBarChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <RadialBarChart
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
