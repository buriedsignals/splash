// Thin marimekko-specific binding over the generic core/InteractiveChart wrapper.
import { MarimekkoChart, type MarimekkoConfig } from "./MarimekkoChart";
import { InteractiveChart, type AnimateOn } from "./core/InteractiveChart";

export interface InteractiveMarimekkoChartProps {
  config: MarimekkoConfig;
  animateOn?: AnimateOn;
  durationMs?: number;
  height?: number;
  minWidth?: number;
}

export function InteractiveMarimekkoChart({
  config,
  animateOn = "scroll",
  durationMs = 2000,
  height = 480,
  minWidth = 280,
}: InteractiveMarimekkoChartProps) {
  return (
    <InteractiveChart
      animateOn={animateOn}
      durationMs={durationMs}
      minWidth={minWidth}
      render={(width, progress) => (
        <MarimekkoChart
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
