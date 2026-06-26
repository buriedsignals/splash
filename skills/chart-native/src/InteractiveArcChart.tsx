// Thin arc-specific binding over the generic core/InteractiveChart wrapper.
import { ArcChart, type ArcConfig } from "./ArcChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveArcChartProps {
  config: ArcConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveArcChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveArcChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <ArcChart
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
